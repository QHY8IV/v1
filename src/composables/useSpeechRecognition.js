import { ref, computed, onUnmounted } from 'vue';

/**
 * 语音识别 Composable（Web Speech API）
 * 支持中文普通话识别，适用于 Chrome / Electron 环境
 */
export function useSpeechRecognition(options = {}) {
  const {
    lang = 'zh-CN',           // 识别语言
    continuous = true,         // 持续识别（不自动停止）
    interimResults = true,     // 返回中间结果（实时预览）
    maxAlternatives = 1        // 候选结果数量
  } = options;

  // 状态
  const isListening = ref(false);        // 是否正在监听
  const isSupported = ref(false);        // 浏览器是否支持
  const transcript = ref('');            // 最终识别文本
  const interimTranscript = ref('');     // 中间识别文本（实时）
  const error = ref(null);               // 错误信息
  const volume = ref(0);                 // 模拟音量等级（用于动画）

  let recognition = null;
  let audioContext = null;
  let analyser = null;
  let mediaStream = null;
  let volumeTimer = null;
  let shouldRestart = false;             // 静音超时后是否自动重启

  // 检测浏览器支持
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  isSupported.value = !!SpeechRecognition;

  // 错误信息映射（中文提示）
  const ERROR_MESSAGES = {
    'no-speech': '没有检测到语音，请靠近麦克风说话',
    'audio-capture': '未找到麦克风，请检查设备连接',
    'not-allowed': '麦克风权限被拒绝，请在设置中允许访问',
    'network': '网络错误，语音识别需要联网',
    'aborted': '识别已中止',
    'language-not-supported': '当前语言不受支持'
  };

  /**
   * 初始化识别器
   */
  function initRecognition() {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    rec.maxAlternatives = maxAlternatives;

    // 识别结果回调
    rec.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (final) {
        transcript.value = final;
        // 触发外部回调
        if (onFinalResult) onFinalResult(final);
      }
      interimTranscript.value = interim;
    };

    // 错误回调
    rec.onerror = (event) => {
      console.warn('[STT] 识别错误:', event.error);
      if (event.error === 'no-speech') {
        // 静音超时：自动重启（如果仍在监听状态）
        if (shouldRestart) {
          interimTranscript.value = '';
          restartRecognition();
          return;
        }
      } else if (event.error !== 'aborted') {
        error.value = ERROR_MESSAGES[event.error] || `识别错误: ${event.error}`;
      }
      if (event.error !== 'no-speech') {
        isListening.value = false;
        stopVolumeMonitor();
      }
    };

    // 结束回调（continuous 模式下可能意外结束，需自动重启）
    rec.onend = () => {
      if (shouldRestart && isListening.value) {
        restartRecognition();
      } else {
        isListening.value = false;
        stopVolumeMonitor();
      }
    };

    return rec;
  }

  /**
   * 重启识别（处理 Chrome 静音超时问题）
   */
  function restartRecognition() {
    if (!recognition) return;
    try {
      recognition.stop();
    } catch (e) {
      // 忽略已停止的错误
    }
    setTimeout(() => {
      if (shouldRestart) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[STT] 重启失败:', e.message);
        }
      }
    }, 100);
  }

  /**
   * 音量监测（使用 Web Audio API 获取真实麦克风音量）
   */
  async function startVolumeMonitor() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      volumeTimer = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        // 计算平均音量并归一化到 0-1
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length / 255;
        volume.value = Math.min(1, avg * 3); // 放大系数，让动画更明显
      }, 50);
    } catch (e) {
      console.warn('[STT] 音量监测不可用:', e.message);
      // 降级：使用模拟音量动画
      volumeTimer = setInterval(() => {
        volume.value = isListening.value ? 0.3 + Math.random() * 0.5 : 0;
      }, 150);
    }
  }

  function stopVolumeMonitor() {
    if (volumeTimer) {
      clearInterval(volumeTimer);
      volumeTimer = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
    volume.value = 0;
  }

  // 外部回调（最终识别结果）
  let onFinalResult = null;

  /**
   * 开始监听
   * @param {Function} callback - 每次获得最终识别文本时的回调
   */
  async function startListening(callback) {
    if (!isSupported.value) {
      error.value = '当前浏览器不支持语音识别，请使用 Chrome 或 Electron';
      return false;
    }
    if (isListening.value) return true;

    onFinalResult = callback || null;
    error.value = null;
    transcript.value = '';
    interimTranscript.value = '';
    shouldRestart = true;

    recognition = initRecognition();
    if (!recognition) {
      error.value = '初始化语音识别失败';
      return false;
    }

    try {
      await recognition.start();
      isListening.value = true;
      await startVolumeMonitor();
      return true;
    } catch (e) {
      console.warn('[STT] 启动失败:', e.message);
      error.value = '启动语音识别失败，请重试';
      return false;
    }
  }

  /**
   * 停止监听
   */
  function stopListening() {
    shouldRestart = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // 忽略
      }
      recognition = null;
    }
    isListening.value = false;
    interimTranscript.value = '';
    stopVolumeMonitor();
  }

  /**
   * 切换监听状态
   */
  async function toggleListening(callback) {
    if (isListening.value) {
      stopListening();
      return false;
    }
    return await startListening(callback);
  }

  /**
   * 清空识别文本
   */
  function clearTranscript() {
    transcript.value = '';
    interimTranscript.value = '';
  }

  // 组合文本（最终 + 中间结果）
  const fullTranscript = computed(() => transcript.value + interimTranscript.value);

  // 组件卸载时清理
  onUnmounted(() => {
    stopListening();
  });

  return {
    // 状态
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    fullTranscript,
    error,
    volume,
    // 方法
    startListening,
    stopListening,
    toggleListening,
    clearTranscript
  };
}