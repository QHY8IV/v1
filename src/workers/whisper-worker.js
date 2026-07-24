/**
 * Whisper 离线语音识别 Web Worker
 * 使用 Transformers.js 在浏览器中运行 Whisper 模型
 *
 * 模型加载方式（纯在线）:
 * 1. 首次启动从 HuggingFace Hub 在线下载（需要网络）
 * 2. 之后使用浏览器缓存，无需再次下载
 */
// ⚠️ 必须在 import transformers 之前执行！
// transformers 模块顶层会缓存 globalThis.fetch 引用，
// 如果 patch 在其后，transformers 内部下载仍用原始 fetch，重试无效。
import { makeRetryFetch, __origFetch } from './fetch-patch.js';

import { pipeline, env } from '@huggingface/transformers';
import * as OpenCC from 'opencc-js';

// 构建标记：每次改动 worker 逻辑后递增，回显到 UI 状态消息。
// 用于肉眼确认浏览器/Electron 实际运行的就是最新脚本——
// 旧 worker 实例的脚本在创建时冻结，若 UI 看不到新标记，说明跑的是旧实例。
const WHISPER_WORKER_BUILD = 'graphopt-basic-v3';

// 繁体 → 简体转换器（whisper 中文常输出繁体，统一转简体）
const t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });

// 纯在线模式：首次启动下载模型，之后使用浏览器缓存
env.allowLocalModels = false;
env.useBrowserCache = true;

// 精确命中 transformers 的下载入口：直接覆盖 env.fetch。
// 读源码确认 transformers 下载文件走 env.fetch（utils/hub.js 的 getFile 每次动态读该属性），
// 而非 globalThis.fetch；而 env.js 顶层一次性把 globalThis.fetch 绑定给 env.fetch，
// 打包后初始化顺序可能让该绑定早于 globalThis 补丁，导致重试被旁路。
// 这里直接覆盖 env.fetch，命中点精确、与加载顺序无关，重试逻辑 100% 生效。
// 默认用 ModelScope 友好的参数（长超时、多重试）。
env.fetch = makeRetryFetch(__origFetch, { maxRetries: 6, timeoutMs: 60000 });

// 模型下载源（按优先级排序，加载时逐源尝试，fetch 失败自动切换下一个）
// 每个源需同时指定 remoteHost 与 remotePathTemplate：
//  Transformers.js 拼接规则 = pathJoin(remoteHost, template替换{model}/{revision}, filename)
// 实测（curl，含浏览器 Origin 校验）：
//  - 魔搭 ModelScope：直连 200(0.36s)，主域与 cdn-lfs 均 Access-Control-Allow-Origin: *，浏览器可用 ✓
//  - hf-mirror：ACAO 写死为 https://hf-mirror.com（非 *），与渲染进程 Origin 不匹配，浏览器必被 CORS 拦 ✗（已移除）
//  - HF 官方：被墙超时，仅作最后兜底
//  ModelScope 在 modelId 前多一层 models/ 前缀，故用 template 适配。
const MODEL_SOURCES = [
  { host: 'https://www.modelscope.cn/', template: 'models/{model}/resolve/{revision}', name: '魔搭 ModelScope' },
  { host: 'https://huggingface.co/',    template: '{model}/resolve/{revision}',         name: 'HF 官方' }
];

let transcriber = null;
let isModelLoaded = false;
let isTranscribing = false; // 识别并发锁
let queuedTranscribe = false; // 识别进行中收到的新请求，待当前完成后补跑
let finalMode = false; // 停止时请求最终结果（降低静音阈值，处理完全部剩余音频）

// 待识别音频缓冲区（仅保存"尚未转写"的片段，转写成功后移除）
let audioChunks = [];

self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'load-model':
      await loadModel(data?.modelId);
      break;
    case 'audio-chunk':
      // 收集音频数据
      audioChunks.push(data);
      break;
    case 'transcribe':
      // 增量识别：只转写新增音频
      transcribePending(false);
      break;
    case 'transcribe-final':
      // 停止时：转写全部剩余音频并返回最终完成信号
      transcribePending(true);
      break;
    case 'reset':
      audioChunks = [];
      queuedTranscribe = false;
      finalMode = false;
      break;
  }
};

async function loadModel(modelId = 'Xenova/whisper-small') {
  self.postMessage({ type: 'status', status: 'loading', message: `[build:${WHISPER_WORKER_BUILD}] 正在连接模型源...` });
  console.log('[whisper-worker] build =', WHISPER_WORKER_BUILD, '| dtype = q8 | graphOptimizationLevel = basic');

  // ---- 自适应"总进度" ----
  // ModelScope 主域 HEAD 不带 Content-Length，无法预知总字节，故用逐文件累加：
  //  fileLoaded/fileTotal 记录每个文件已下载/总字节，overall = Σloaded / Σtotal。
  //  新文件 total 加入分母时百分比可能瞬时回跳，用 overallPrev 做单调钳制（只升不降）。
  const fileLoaded = {};
  const fileTotal = {};
  let overallPrev = 0;

  // 为某个镜像源构造进度回调，上报"总进度" + 当前文件名 + 源名
  const makeProgressCb = (src) => (progress) => {
    const file = progress.file || '';
    if (progress.status === 'progress' && progress.total) {
      fileLoaded[file] = progress.loaded || 0;
      fileTotal[file] = progress.total;
      const sumLoaded = Object.values(fileLoaded).reduce((a, b) => a + b, 0);
      const sumTotal = Object.values(fileTotal).reduce((a, b) => a + b, 0);
      let overall = sumTotal > 0 ? Math.round((sumLoaded / sumTotal) * 100) : overallPrev;
      if (overall < overallPrev) overall = overallPrev; // 单调钳制
      if (overall > 99) overall = 99; // 留 1% 给"加载/就绪"，避免下载阶段就显示 100
      overallPrev = overall;
      self.postMessage({
        type: 'status',
        status: 'downloading',
        message: `下载模型 [${src.name}]: ${overall}%`,
        progress: overall,
        file,
        source: src.name
      });
    } else if (progress.status === 'done') {
      // 文件完成：把已下载量钉到 total，避免尾差
      if (file && fileTotal[file]) {
        fileLoaded[file] = fileTotal[file];
      }
    } else if (progress.status === 'initiate' || progress.status === 'download') {
      // 新文件开始：刷新当前文件名，进度保持当前总进度（不归零，避免跳变）
      self.postMessage({
        type: 'status',
        status: 'downloading',
        message: `下载模型 [${src.name}]...`,
        progress: overallPrev,
        file,
        source: src.name
      });
    }
  };

  // 按优先级逐源尝试；每个源内部对 pipeline 再做多次重试。
  // 为何要在"源内"重试 pipeline（而非仅靠 fetch 层重试）：
  //  onnx 大文件是流式下载——fetch() 返回时只到了 header，body 在 transformers 的
  //  readResponse() 里逐 chunk 读。断连常发生在 fetch 返回之后的 body 读取阶段，
  //  fetch 层重试包不住它，一次断流就让整个 pipeline 抛错、整源被判失败、回退到被墙的 HF。
  //  而 transformers 开了 useBrowserCache，已成功文件已落进浏览器缓存；pipeline 重试时
  //  这些文件 tryCache 命中、不再下载，只补下断点文件 → 既覆盖流断连，又不浪费流量、进度不乱。
  // 每源独立重试次数：ModelScope 5 次（主源值得多试），HF 1 次（被墙不值得）
  const SOURCE_RETRIES = [5, 1];
  const sourceErrors = [];
  for (let i = 0; i < MODEL_SOURCES.length; i++) {
    const src = MODEL_SOURCES[i];
    const maxRetries = SOURCE_RETRIES[i] ?? 3;
    env.remoteHost = src.host;
    env.remotePathTemplate = src.template;
    // 按源切换 fetch 参数：ModelScope 长超时多重试；HF 被墙，短超时少重试，避免卡死
    if (src.name === 'HF 官方') {
      env.fetch = makeRetryFetch(__origFetch, { maxRetries: 2, timeoutMs: 15000 });
    } else {
      env.fetch = makeRetryFetch(__origFetch, { maxRetries: 6, timeoutMs: 60000 });
    }
    self.postMessage({
      type: 'status',
      status: 'loading',
      message: `连接镜像源 (${i + 1}/${MODEL_SOURCES.length})：${src.name}`,
      source: src.name
    });

    let pipeErr = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        transcriber = await pipeline(
          'automatic-speech-recognition',
          modelId,
          {
            progress_callback: makeProgressCb(src),
            // 指定 q8 量化（int8，比 q4 更省内存且精度更高；ModelScope 上 _quantized 文件已确认存在）
            dtype: 'q8',
            // 关键修复：onnxruntime-web 在 extended/all 优化级别会跑 TransposeDQWeightsForMatMulNBits
            // 这个图优化 pass，对该量化 whisper 的 MatMulNBits 节点缺 scale tensor → 建 session 直接崩
            // （报错 "Missing required scale ... weight_merged_0_scale"，与 q4/q8 选择无关）。
            // 把图优化降到 basic（仅常量折叠等安全优化，不含该量化融合 pass）即可绕过，推理精度不受影响。
            session_options: { graphOptimizationLevel: 'basic' },
          }
        );
        pipeErr = null;
        break; // 成功，跳出重试
      } catch (error) {
        pipeErr = error;
        if (attempt === maxRetries) break; // 重试已耗尽

        // 首次失败后清浏览器缓存：防止之前下载中断留下的损坏文件被 tryCache 命中，
        // 导致 transformers 解析时抛非网络错误、后续重试永远命中同一坏缓存。
        // 清缓存后重试时 transformers 会重新下载所有文件。
        if (attempt === 1) {
          try {
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
              await caches.delete(name);
            }
            console.warn('[whisper-worker] 已清除浏览器缓存，防止污染');
          } catch (e) { /* 清缓存失败不阻塞 */ }
          // 重置进度追踪
          for (const k of Object.keys(fileLoaded)) delete fileLoaded[k];
          for (const k of Object.keys(fileTotal)) delete fileTotal[k];
          overallPrev = 0;
        }

        self.postMessage({
          type: 'status',
          status: 'downloading',
          message: `${src.name} 第 ${attempt} 次失败，重试中（${error?.message?.slice(0, 60) || '未知错误'}）...`,
          progress: overallPrev,
          source: src.name
        });
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!pipeErr) {
      isModelLoaded = true;
      self.postMessage({
        type: 'status',
        status: 'ready',
        message: '语音识别模型已就绪',
        source: src.name
      });
      return; // 成功，结束
    }

    // 该源耗尽重试仍失败：记录真实错误，回退下一源
    sourceErrors.push(`${src.name}: ${pipeErr?.message || '未知错误'}`);
    self.postMessage({
      type: 'status',
      status: 'loading',
      message: `${src.name} 不可用，尝试下一个源...`,
      source: src.name
    });
  }

  // 所有源均失败：列出每个源的真实错误（避免被兜底源的 "Failed to fetch" 掩盖，便于诊断）
  self.postMessage({
    type: 'status',
    status: 'error',
    message: `模型加载失败：${sourceErrors.join(' ｜ ') || '所有镜像源均不可用'}`
  });
}

/**
 * 增量分段识别
 *
 * 每次只转写"尚未转写"的新增音频（约一个分段间隔的量），成功后从缓冲移除。
 * 相比"整段快照重转写"：
 *  - 每次输入小（~3s）→ 速度快，工作量 O(n) 而非 O(n²)
 *  - 短上下文 → 大幅减少 whisper-tiny 的复读/幻觉
 *
 * @param {boolean} isFinal 是否为停止时的最终识别（降低静音阈值，处理完全部剩余）
 */
function transcribePending(isFinal = false) {
  if (!isModelLoaded || !transcriber) return;
  if (isFinal) finalMode = true;

  // 已有识别在跑：标记补跑，避免请求丢失
  if (isTranscribing) {
    queuedTranscribe = true;
    return;
  }

  isTranscribing = true;

  (async () => {
    try {
      // 循环处理，直到无待处理音频且无排队请求
      // eslint-disable-next-line no-constant-condition
      while (true) {
        queuedTranscribe = false;
        const minSamples = finalMode ? 1600 : 4800; // 最终模式降低阈值(0.1s)，常规0.3s
        const consumed = await transcribeOnce(minSamples);
        if (queuedTranscribe) continue; // 识别期间又来了新请求
        if (!consumed) break;           // 没有足够音频可转写，结束本轮
      }
      // 最终模式：发送完成信号，前端据此提交累积全文
      if (finalMode) {
        finalMode = false;
        self.postMessage({ type: 'result', segment: '', final: true });
      }
    } finally {
      isTranscribing = false;
    }
  })();
}

/**
 * 转写当前待识别缓冲（若达到最小长度）
 * @returns {Promise<boolean>} 是否实际转写了一段（false 表示音频太短/为空，跳过）
 */
async function transcribeOnce(minSamples) {
  if (audioChunks.length === 0) return false;

  const chunks = audioChunks.slice();
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);

  // 音频太短：跳过，等待更多音频累积（减少静音幻觉）
  if (totalLength < minSamples) return false;

  // 合并片段
  const audioData = new Float32Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    audioData.set(c, offset);
    offset += c.length;
  }

  self.postMessage({ type: 'status', status: 'transcribing', message: '识别中...' });

  try {
    const output = await transcriber(audioData, {
      language: 'chinese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
      no_repeat_ngram_size: 5 // 抑制复读
    });

    let segment = output.text ? output.text.trim() : '';
    // 繁体 → 简体（whisper 中文默认倾向繁体）
    if (segment) {
      try { segment = t2sConverter(segment); } catch (e) { /* 转换失败保留原文 */ }
    }
    // 移除已转写片段（保留识别期间新到达的）
    audioChunks = audioChunks.slice(chunks.length);
    self.postMessage({ type: 'result', segment });
    return true;
  } catch (error) {
    // 出错也丢弃该段，避免死循环
    audioChunks = audioChunks.slice(chunks.length);
    self.postMessage({ type: 'result', segment: '', error: error.message });
    return true;
  }
}
