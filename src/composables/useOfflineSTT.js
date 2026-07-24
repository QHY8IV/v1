/**
 * 离线语音识别 Composable
 * 基于 Transformers.js + Whisper，完全离线运行
 *
 * 工作流程:
 * 1. 麦克风 → AudioWorklet 采集音频（硬件采样率，常 48kHz）
 * 2. Worklet 内线性插值重采样到 16kHz（Whisper 要求）
 * 3. Worklet 内 VAD 静音检测：连续 5 秒 RMS < 阈值 → 自动停止
 * 4. 16kHz PCM → Web Worker (Whisper 模型)
 * 5. 识别结果 → 回调返回文本
 *
 * 自动分段：每 3 秒触发一次增量识别（只转写新增音频），结果追加到全文，
 * 实现"边说边出字"。增量方式避免整段重转写导致的复读与 O(n²) 性能问题。
 */
import { ref, onUnmounted } from 'vue';
import { getWhisperWorker, subscribeWhisper, preloadWhisperModel } from '../workers/whisperSingleton';

const TARGET_SAMPLE_RATE = 16000;
const AUTO_TRANSCRIBE_INTERVAL_MS = 3000; // 自动识别间隔
const SILENCE_TIMEOUT_MS = 5000;          // 静音超时：5 秒无语音自动停止
const SILENCE_RMS_THRESHOLD = 0.01;       // RMS 能量阈值（低于此值视为静音）

export function useOfflineSTT(options = {}) {
  const {
    onResult,        // (text) => void  识别结果回调
    onStatusChange,  // (status, message) => void
    onError,         // (error) => void
    onSilenceStop    // () => void  静音自动停止回调
  } = options;

  const isListening = ref(false);
  const isModelReady = ref(false);
  const modelStatus = ref('idle'); // idle | loading | downloading | ready | error
  const statusMessage = ref('');
  const interimText = ref('');     // 实时中间结果（当前正在识别）
  const finalText = ref('');       // 最终结果（累积全文）

  let worker = null;
  let unsubscribe = null; // 取消订阅函数
  let audioContext = null;
  let mediaStream = null;
  let workletNode = null;
  let sourceNode = null;
  let autoTimer = null; // 自动分段识别定时器
  let pendingFinalResult = false; // 标记：等待停止后的最终识别结果

  // 初始化：复用单例 Worker，订阅消息
  function initWorker() {
    if (worker) return;

    worker = getWhisperWorker();

    // 订阅单例 worker 消息
    unsubscribe = subscribeWhisper((event) => {
      const { type, text, status, message, error } = event.data;

      switch (type) {
        case 'status':
          modelStatus.value = status;
          statusMessage.value = message || '';
          if (status === 'ready') {
            isModelReady.value = true;
          }
          onStatusChange?.(status, message);
          break;

        case 'result': {
          const { segment, final } = event.data;
          interimText.value = '';
          if (error) onError?.(error);
          // 增量追加：每段识别结果拼接到全文（worker 已保证不重复转写同一段）
          if (segment) {
            finalText.value = finalText.value ? finalText.value + segment : segment;
          }
          // 停止后的最终完成信号：提交累积全文
          if (final && pendingFinalResult) {
            pendingFinalResult = false;
            onResult?.(finalText.value);
          }
          break;
        }
      }
    });

    // 确保模型已加载（应用启动时已预加载，此处为兜底）
    preloadWhisperModel();
  }

  /**
   * AudioWorklet 处理器代码（内联，避免额外文件）
   *
   * 功能：
   * 1. 线性插值重采样：硬件采样率 → 16kHz
   * 2. VAD 静音检测：RMS < 阈值持续 5 秒 → 通知主线程自动停止
   */
  const workletCode = `
    class AudioCaptureProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.targetRate = ${TARGET_SAMPLE_RATE};
        // 每积累约 0.5 秒（按目标采样率计）的 16kHz 样本就发送一次
        this.targetChunkSize = this.targetRate * 0.5; // 8000 samples
        this.outBuffer = new Float32Array(this.targetChunkSize);
        this.outIndex = 0;
        // 重采样状态
        this.prevSample = 0;
        this.resamplePhase = 0;
        // 静音检测状态
        this.silenceMs = 0;
        this.silenceThreshold = ${SILENCE_RMS_THRESHOLD};
        this.silenceTimeout = ${SILENCE_TIMEOUT_MS};
      }

      process(inputs) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const channelData = input[0]; // 单声道
        const srcRate = sampleRate;   // AudioWorkletGlobalScope.sampleRate（硬件采样率）
        const step = this.targetRate / srcRate;

        // === VAD 静音检测 ===
        let sumSquares = 0;
        for (let i = 0; i < channelData.length; i++) {
          sumSquares += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sumSquares / channelData.length);
        const blockDurationMs = (channelData.length / srcRate) * 1000;

        if (rms < this.silenceThreshold) {
          this.silenceMs += blockDurationMs;
        } else {
          this.silenceMs = 0;
        }

        // 超过静音超时 → 通知主线程自动停止
        if (this.silenceMs >= this.silenceTimeout) {
          this.port.postMessage({ type: 'silence-timeout' });
          this.silenceMs = 0; // 重置，避免重复触发
        }

        // === 线性插值重采样 ===
        for (let i = 0; i < channelData.length; i++) {
          const current = channelData[i];
          this.resamplePhase += step;
          while (this.resamplePhase >= 1.0) {
            this.resamplePhase -= 1.0;
            const sample = this.prevSample + (current - this.prevSample) * this.resamplePhase;
            this.outBuffer[this.outIndex++] = sample;

            if (this.outIndex >= this.targetChunkSize) {
              this.port.postMessage(new Float32Array(this.outBuffer));
              this.outIndex = 0;
            }
          }
          this.prevSample = current;
        }

        return true;
      }
    }

    registerProcessor('audio-capture-processor', AudioCaptureProcessor);
  `;

  // 开始录音
  async function startListening() {
    if (isListening.value) return;

    try {
      initWorker();

      // 重置文本 & 清空 worker 中上一次会话残留的音频缓冲
      finalText.value = '';
      interimText.value = '';
      worker.postMessage({ type: 'reset' });

      // 获取麦克风（不强制 sampleRate，由 worklet 重采样）
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 创建 AudioContext（使用硬件默认采样率，worklet 内重采样到 16kHz）
      audioContext = new AudioContext();

      // 加载 AudioWorklet
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      // 创建音频处理链
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

      // 接收 worklet 消息：音频数据 / 静音超时信号
      workletNode.port.onmessage = (event) => {
        const data = event.data;

        // 静音超时信号（对象，非 Float32Array）
        if (data && data.type === 'silence-timeout') {
          if (isListening.value) {
            stopListening();
            onSilenceStop?.();
          }
          return;
        }

        // 正常音频数据（Float32Array）→ 发送到 Worker
        if (worker && isListening.value) {
          worker.postMessage({ type: 'audio-chunk', data });
        }
      };

      sourceNode.connect(workletNode);
      workletNode.connect(audioContext.destination);

      isListening.value = true;

      // 启动自动分段识别定时器
      startAutoTranscribe();
    } catch (error) {
      onError?.(error.message || '无法访问麦克风');
      stopListening();
    }
  }

  // 自动分段识别：定时触发，实现"边说边出字"
  function startAutoTranscribe() {
    stopAutoTranscribe();
    autoTimer = setInterval(() => {
      if (worker && isListening.value) {
        interimText.value = '识别中...';
        worker.postMessage({ type: 'transcribe' });
      }
    }, AUTO_TRANSCRIBE_INTERVAL_MS);
  }

  function stopAutoTranscribe() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // 停止录音并获取最终结果
  function stopListening() {
    if (!isListening.value) return;

    isListening.value = false;
    stopAutoTranscribe();

    // 标记：等待最终完成信号，届时提交累积全文
    pendingFinalResult = true;

    // 请求 Worker 转写剩余音频并发送最终完成信号
    if (worker) {
      worker.postMessage({ type: 'transcribe-final' });
    }

    // 清理音频资源
    cleanupAudio();

    // 安全超时：如果 10 秒后仍未收到结果（如 worker 卡死），清除标记
    setTimeout(() => { pendingFinalResult = false; }, 10000);
  }

  // 取消录音（不获取结果）
  function cancelListening() {
    isListening.value = false;
    stopAutoTranscribe();
    if (worker) {
      worker.postMessage({ type: 'reset' });
    }
    cleanupAudio();
  }

  function cleanupAudio() {
    if (workletNode) {
      workletNode.disconnect();
      workletNode = null;
    }
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  }

  // 销毁本实例资源（不销毁单例 worker，其他组件可能复用）
  function destroy() {
    cancelListening();
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    worker = null;
    isModelReady.value = false;
    modelStatus.value = 'idle';
  }

  onUnmounted(() => {
    destroy();
  });

  return {
    isListening,
    isModelReady,
    modelStatus,
    statusMessage,
    interimText,
    finalText,
    startListening,
    stopListening,
    cancelListening,
    destroy
  };
}