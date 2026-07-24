/**
 * Whisper Worker 单例管理
 *
 * 职责：
 * 1. 全局唯一 Worker 实例（避免重复创建 / 重复下载模型）
 * 2. 应用启动时即可调用 preloadWhisperModel() 预下载模型
 * 3. 事件分发：多个订阅者（预加载状态 UI、useOfflineSTT）共享同一 worker 消息
 */
import { reactive } from 'vue';
import WhisperWorker from './whisper-worker.js?worker';

let worker = null;
const listeners = new Set(); // 消息订阅者集合
let preloadStarted = false;

/**
 * 创建一个全新的 Worker 实例并接线消息分发。
 * 抽出此函数，使"重试"能 terminate 旧实例后重建——
 * 否则旧实例内存里跑的是创建时的脚本快照，源码改动（如 dtype）对其不可见，
 * 表现为点"重新下载"永远复现同一旧错误。
 */
function createWorker() {
  const w = new WhisperWorker();
  w.onmessage = (event) => {
    updateStateFromEvent(event);
    for (const fn of listeners) {
      try { fn(event); } catch (e) { console.error('[whisperSingleton] listener error', e); }
    }
  };
  w.onerror = (err) => {
    console.error('[whisperSingleton] worker error', err);
  };
  return w;
}

/**
 * 全局共享的模型下载状态（响应式）
 * 供下载页 / 路由守卫 / 顶部提示共同使用
 * status: idle | loading | downloading | ready | error
 */
export const modelState = reactive({
  status: 'idle',
  progress: 0,
  message: '',
  file: '',
  source: ''
});

// 内部：根据 worker 消息更新共享状态
function updateStateFromEvent(event) {
  const { type, status, message, progress, file, source } = event.data;
  if (type !== 'status') return;
  if (source) modelState.source = source;
  if (status === 'downloading') {
    modelState.status = 'downloading';
    modelState.progress = progress ?? 0;
    modelState.message = message || '下载模型中...';
    if (file) modelState.file = file;
  } else if (status === 'loading') {
    modelState.status = 'loading';
    modelState.message = message || '加载模型中...';
  } else if (status === 'ready') {
    modelState.status = 'ready';
    modelState.progress = 100;
    modelState.message = '语音模型已就绪';
  } else if (status === 'error') {
    modelState.status = 'error';
    modelState.message = message || '模型加载失败';
  }
}

/**
 * 获取单例 Worker（懒创建）
 */
export function getWhisperWorker() {
  if (!worker) {
    worker = createWorker();
  }
  return worker;
}

/**
 * 订阅 worker 消息
 * @returns {Function} 取消订阅函数
 */
export function subscribeWhisper(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 预加载模型（应用启动时调用，仅执行一次）
 * 创建 worker 并发送 load-model，模型下载/加载到浏览器缓存。
 * 后续 useOfflineSTT 复用同一 worker，无需再次下载。
 */
export function preloadWhisperModel() {
  if (preloadStarted) return;
  preloadStarted = true;

  const w = getWhisperWorker();
  console.log('[whisperSingleton] 预加载 Whisper 模型...');
  w.postMessage({ type: 'load-model' });
}

/**
 * 重试加载模型（下载失败后调用）
 * 重置状态并重新发送 load-model 请求
 */
export function retryLoadModel() {
  modelState.status = 'loading';
  modelState.progress = 0;
  modelState.message = '';
  modelState.file = '';
  modelState.source = '';
  preloadStarted = true;
  // 关键：销毁旧 worker 实例并重建。
  // 旧实例的脚本在创建时已冻结，源码改动（如 dtype:'q8'）对它不可见；
  // 不重建则点"重新下载"永远用旧逻辑，复现同一旧错误。
  if (worker) {
    try { worker.terminate(); } catch (e) { /* ignore */ }
    worker = null;
  }
  getWhisperWorker().postMessage({ type: 'load-model' });
}

/**
 * 销毁单例（一般不需要，应用退出时浏览器自动回收）
 */
export function destroyWhisperWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  listeners.clear();
  preloadStarted = false;
}