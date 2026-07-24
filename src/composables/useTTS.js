import { ref, onUnmounted } from 'vue';

/**
 * 文字转语音（TTS）Composable
 * 优先：后端 Edge TTS（微软神经网络语音）→ 用 Web Audio API 播放
 * 兜底：浏览器 SpeechSynthesis
 *
 * 为什么用 Web Audio：HTMLAudio.play() 受自动播放策略限制，
 * 非用户手势（定时问候、AI 回复事件）或 fetch 异步耗尽手势窗口时会被静默拒绝。
 * AudioContext 在任意一次用户交互时 resume() 解锁后，
 * 之后无论是否手势、无论 fetch 多慢，decode + start 都能出声。
 */

const TTS_API = 'http://localhost:3000/api/tts/synthesize';

// 可选语音列表（与后端对应）
export const TTS_VOICE_OPTIONS = [
  { value: 'xiaoxiao', label: '🎀 晓晓（萝莉音）' },
  { value: 'yunxi', label: '👦 云希（小男孩）' },
];

/** 获取用户选择的语音（localStorage 持久化） */
export function getSelectedVoice() {
  return localStorage.getItem('tts-voice') || 'xiaoxiao';
}

export function setSelectedVoice(voice) {
  localStorage.setItem('tts-voice', voice);
}

// ===== 模块级：共享 AudioContext + 手势解锁 =====
let audioCtx = null;
function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { audioCtx = new AC(); } catch (e) { return null; }
  }
  return audioCtx;
}
// 任意用户交互时解锁 AudioContext；解锁后非手势也能播放
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  window.addEventListener('touchstart', unlock, true);
}

// ===== 模块级：缓存中文语音（speechSynthesis 兜底用） =====
let cachedZhVoice = null;
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    cachedZhVoice =
      voices.find(v => /zh/i.test(v.lang) && /female|女|xiaoxiao|yaoyao/i.test(v.name)) ||
      voices.find(v => /zh/i.test(v.lang)) ||
      null;
  };
  loadVoices();
  // Chrome 异步加载语音列表
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function useTTS() {
  const isSpeaking = ref(false);
  const isSupported = ref(true);

  let currentSource = null; // WebAudio BufferSource
  let sessionId = 0;        // 废弃过期的异步流程，防止"说两遍/串音"

  /** 朗读文本（优先 Edge TTS + WebAudio，降级 SpeechSynthesis） */
  async function speak(text) {
    if (!text || !text.trim()) return;

    stop();
    const mySession = ++sessionId;

    try {
      await speakWithEdgeTTS(text, mySession);
    } catch (err) {
      if (mySession !== sessionId) return; // 已被新请求取代，静默退出
      console.warn('[TTS] Edge/WebAudio 播放失败，降级系统语音:', err && err.message);
      if (mySession === sessionId) speakWithSpeechSynthesis(text);
    }
  }

  /** 后端 Edge TTS → Web Audio 解码播放（绕过自动播放策略） */
  async function speakWithEdgeTTS(text, mySession) {
    const voice = getSelectedVoice();
    const response = await fetch(TTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (mySession !== sessionId) throw new Error('SESSION_EXPIRED');
    if (!response.ok) throw new Error('TTS API ' + response.status);

    const arrayBuf = await response.arrayBuffer();
    if (mySession !== sessionId) throw new Error('SESSION_EXPIRED');
    if (!arrayBuf || arrayBuf.byteLength === 0) throw new Error('EMPTY_AUDIO');

    const ctx = ensureCtx();
    if (!ctx) throw new Error('NO_AUDIO_CTX');
    // 若仍 suspended（用户尚未交互过），尝试 resume；非手势下可能无效，但 start 仍可能出声
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) { /* ignore */ }
    }

    // decodeAudioData 会接管（detach）传入的 buffer，直接传即可
    const audioBuffer = await ctx.decodeAudioData(arrayBuf);
    if (mySession !== sessionId) throw new Error('SESSION_EXPIRED');

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    currentSource = source;
    isSpeaking.value = true;

    source.onended = () => {
      // 仅当仍是当前源时才收尾（stop() 会先把 currentSource 置空）
      if (currentSource === source) {
        currentSource = null;
        isSpeaking.value = false;
      }
    };

    source.start(0);
  }

  /** 兜底：浏览器 SpeechSynthesis（健壮化） */
  function speakWithSpeechSynthesis(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('[TTS] 浏览器不支持 SpeechSynthesis');
      return;
    }
    // 先清空队列，避免 Chrome 卡住
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.pitch = 1.4;
    utterance.volume = 1;
    if (cachedZhVoice) utterance.voice = cachedZhVoice;

    utterance.onstart = () => { isSpeaking.value = true; };
    utterance.onend = () => { isSpeaking.value = false; };
    utterance.onerror = () => { isSpeaking.value = false; };

    window.speechSynthesis.speak(utterance);
    // Chrome 已知 bug：长文本/后台时队列会暂停卡死，resume 兜底
    setTimeout(() => {
      try { window.speechSynthesis.resume(); } catch (e) { /* ignore */ }
    }, 200);
  }

  /** 停止朗读 */
  function stop() {
    const s = currentSource;
    currentSource = null;
    if (s) { try { s.stop(); } catch (e) { /* 已停止则忽略 */ } }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    isSpeaking.value = false;
  }

  onUnmounted(() => { stop(); });

  return { isSpeaking, isSupported, speak, stop };
}