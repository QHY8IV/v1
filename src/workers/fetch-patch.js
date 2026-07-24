/**
 * fetch 健壮化补丁
 *
 * 关键背景（读 @huggingface/transformers 源码确认）：
 *  - transformers 下载文件调用的是 `env.fetch(...)`（见 utils/hub.js 的 getFile），
 *    而 **不是** globalThis.fetch。
 *  - env.js 在模块顶层把 globalThis.fetch 绑定后一次性赋给 env.fetch。
 *  - vite/rollup 打包会重排模块初始化顺序，可能让 env.js 在本补丁之前执行，
 *    于是 env.fetch 被绑定为「原始 fetch」；此后再 patch globalThis.fetch
 *    也改不到已赋值的 env.fetch —— 这正是之前重试逻辑被完全旁路、模型下载
 *    一次抖动即失败的根因。
 *
 * 因此本模块做两件事（双保险）：
 *  1) 导出 makeRetryFetch(base) 工厂，供 worker 直接覆盖 env.fetch
 *     （hub.js 每次下载都动态读 env.fetch 属性，覆盖即生效，与加载顺序无关）。
 *  2) 顺手 patch globalThis.fetch，兼顾 onnxruntime 等可能直接用 globalThis.fetch 的库。
 *
 * 额外关键能力：
 *  - 每次 fetch 调用带 AbortController 超时（默认 60 秒），
 *    防止被墙站点 TCP 连上但不返回数据导致 fetch 永远 pending、重试永远不触发。
 */

// 保存真正的原始 fetch（在任何 patch 之前）
const __origFetch = globalThis.fetch.bind(globalThis);

/**
 * 构造带重试 + 超时的 fetch
 * @param {typeof fetch} [base=__origFetch] 底层 fetch 实现
 * @param {object} [opts]
 * @param {number} [opts.maxRetries=6] 最多尝试次数
 * @param {number} [opts.timeoutMs=60000] 单次 fetch 超时（毫秒）
 * @returns {typeof fetch}
 */
export function makeRetryFetch(base = __origFetch, opts = {}) {
  const MAX = opts.maxRetries ?? 6;
  const TIMEOUT_MS = opts.timeoutMs ?? 60000;

  return async (input, init) => {
    let lastErr;
    for (let i = 0; i < MAX; i++) {
      // 每次尝试独立的 AbortController + 超时
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        // 合并 signal：如果调用方已传 signal，同时监听两者
        const mergedInit = { ...init, signal: controller.signal };
        if (init?.signal) {
          // 调用方 signal abort 时也 abort 我们的 controller
          init.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        const res = await base(input, mergedInit);
        clearTimeout(timer);
        // 5xx 服务端错误：重试
        if (res.status >= 500 && i < MAX - 1) {
          console.warn(`[fetch-patch] ${res.status}，第 ${i + 1} 次重试...`, typeof input === 'string' ? input : input?.url);
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        return res;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        const isTimeout = err?.name === 'AbortError';
        if (i < MAX - 1) {
          console.warn(`[fetch-patch] ${isTimeout ? '超时' : '网络异常'}，第 ${i + 1} 次重试...`, err?.message, typeof input === 'string' ? input : input?.url);
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    console.error(`[fetch-patch] ${MAX} 次尝试均失败`, lastErr?.message, typeof input === 'string' ? input : input?.url);
    throw lastErr;
  };
}

// 双保险：patch globalThis.fetch（对直接用 globalThis.fetch 的库有效）
globalThis.fetch = makeRetryFetch(__origFetch);

export { __origFetch };