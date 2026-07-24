<template>
  <div class="dl-scene">
    <!-- 氛围背景：漂浮云朵 + 星光 -->
    <div class="dl-sky" aria-hidden="true">
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
      <span class="twinkle t1">✦</span>
      <span class="twinkle t2">✦</span>
      <span class="twinkle t3">✦</span>
      <span class="twinkle t4">✦</span>
      <span class="twinkle t5">✦</span>
    </div>

    <!-- 品牌角标 -->
    <div class="dl-brand">
      <span class="dl-brand-icon">🎓</span>
      <span class="dl-brand-text">AI费曼小老师</span>
    </div>

    <!-- 引擎型号徽章 -->
    <div class="dl-version">
      <span class="dl-version-dot"></span>
      whisper-small · 离线语音引擎
    </div>

    <!-- 主控制台：左引擎舱 + 右下载面板 -->
    <div class="dl-console">
      <!-- ===== 左：机器人引擎舱 ===== -->
      <div class="dl-left">
        <span class="dl-engine-tag">VOICE&nbsp;ENGINE</span>

        <div class="dl-robot-wrap">
          <div class="dl-robot" :class="robotClass">
            <span class="dl-antenna"><i></i></span>
            <div class="dl-robot-head">
              <span class="dl-eye left"></span>
              <span class="dl-eye right"></span>
              <span class="dl-mouth"></span>
            </div>
            <span class="dl-ring r1"></span>
            <span class="dl-ring r2"></span>
          </div>
        </div>

        <div class="dl-eq" :class="{ live: isActive }" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>

        <p class="dl-left-caption">{{ robotCaption }}</p>
      </div>

      <!-- ===== 右：下载面板 ===== -->
      <div class="dl-right">
        <template v-if="!isError">
          <div class="dl-overline">
            <span class="dl-overline-dot" :class="{ pulse: isActive }"></span>
            MODEL DOWNLOAD · 语音识别模型
            <span class="dl-source" :class="{ live: isActive }" v-if="modelState.source">
              <span class="dl-source-ico">🛰</span>{{ modelState.source }}
            </span>
          </div>

          <h1 class="dl-title">{{ statusTitle }}</h1>

          <!-- 大百分比 + 当前文件 -->
          <div class="dl-percent-row">
            <div class="dl-percent-box">
              <span class="dl-percent">{{ progress }}</span>
              <span class="dl-percent-sign">%</span>
            </div>
            <div class="dl-current-file" v-if="modelState.file && isActive">
              <span class="dl-current-label">当前文件</span>
              <span class="dl-current-name">{{ modelState.file }}</span>
            </div>
          </div>

          <!-- 进度条 + 小火箭 -->
          <div class="dl-track-wrap">
            <div class="dl-track">
              <div class="dl-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <span class="dl-rocket" :style="{ left: progress + '%' }" :class="{ fly: isActive }">🚀</span>
          </div>

          <!-- 文件清单（固定高度 + 常驻占位：文件增多只滚动不撑高，杜绝纵向抖动） -->
          <div class="dl-checklist">
            <div class="dl-check-item done" v-for="f in doneFiles" :key="f">
              <span class="dl-check-ico">✓</span>
              <span class="dl-check-name">{{ f }}</span>
            </div>
            <div class="dl-check-item current" v-if="modelState.file && isActive">
              <span class="dl-check-ico spin">◌</span>
              <span class="dl-check-name">{{ modelState.file }}</span>
            </div>
            <div class="dl-check-empty" v-if="!doneFiles.length && !(modelState.file && isActive)">
              准备下载模型文件…
            </div>
          </div>

          <!-- 轮换提示语：外包固定高 slot，避免 out-in 过渡间隙元素移除导致高度塌缩抖动 -->
          <div class="dl-phrase-slot">
            <transition name="phrase" mode="out-in">
              <p class="dl-phrase" :key="phraseIdx">{{ isReady ? '🎉 下载完成，正在打开应用…' : phrases[phraseIdx] }}</p>
            </transition>
          </div>

          <p class="dl-tip">首次使用需下载语音识别模型（约 250MB），请保持网络畅通<br/>下载完成后会自动缓存，以后打开无需再下载</p>
        </template>

        <!-- 失败面板 -->
        <template v-else>
          <div class="dl-overline danger">
            <span class="dl-overline-dot"></span>
            DOWNLOAD FAILED · 下载失败
          </div>
          <h1 class="dl-title danger">模型下载失败</h1>
          <p class="dl-error-msg">{{ modelState.message }}</p>
          <p class="dl-phrase">别担心，检查一下网络，再试一次就好啦</p>
          <button class="dl-retry" @click="retry">
            <span class="dl-retry-icon">↻</span> 重新下载
          </button>
        </template>
      </div>
    </div>

    <p class="dl-footer">AI费曼小老师 · 让孩子爱上表达</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { modelState, preloadWhisperModel, retryLoadModel } from '@/workers/whisperSingleton';

const router = useRouter();

const progress = computed(() => modelState.progress || 0);
const isActive = computed(() => modelState.status === 'downloading' || modelState.status === 'loading');
const isError = computed(() => modelState.status === 'error');
const isReady = computed(() => modelState.status === 'ready');

const robotClass = computed(() => ({
  'is-active': isActive.value,
  'is-ready': isReady.value,
  'is-error': isError.value
}));

const robotCaption = computed(() => {
  if (isError.value) return '哎呀，出了点小状况';
  if (isReady.value) return '电量满格，随时出发！';
  if (isActive.value) return '正在努力学习听话…';
  return '准备中…';
});

const statusTitle = computed(() => {
  if (isReady.value) return '语音模型已就绪';
  if (modelState.status === 'downloading') return '正在下载语音模型';
  if (modelState.status === 'loading') return '正在唤醒语音模型';
  return '准备下载语音模型';
});

// 已完成文件清单：file 字段变化时，把上一个文件记为完成
const doneFiles = ref([]);
watch(() => modelState.file, (newFile, oldFile) => {
  if (oldFile && oldFile !== newFile && !doneFiles.value.includes(oldFile)) {
    doneFiles.value.push(oldFile);
  }
});

// 轮换鼓励语
const phrases = [
  '模型正快马加鞭赶来…',
  '下载完成后，离线也能随时用哦~',
  '好等待值得好老师，小老师正在充电',
  '请保持网络畅通，马上就好'
];
const phraseIdx = ref(0);
let phraseTimer = null;

onMounted(() => {
  // 进入下载页即触发下载（仅首次执行）
  preloadWhisperModel();
  phraseTimer = setInterval(() => {
    phraseIdx.value = (phraseIdx.value + 1) % phrases.length;
  }, 3500);
});

onUnmounted(() => {
  if (phraseTimer) clearInterval(phraseTimer);
});

// 下载完成后自动跳转主页
watch(() => modelState.status, (status) => {
  if (status === 'ready') {
    setTimeout(() => router.replace('/'), 1400);
  }
});

function retry() {
  doneFiles.value = [];
  retryLoadModel();
}
</script>

<style scoped>
.dl-scene {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(1200px 600px at 82% -10%, rgba(107, 179, 240, 0.35), transparent 60%),
    radial-gradient(900px 500px at 8% 110%, rgba(255, 140, 66, 0.16), transparent 60%),
    linear-gradient(180deg, #DCEBFF 0%, var(--bg-main) 55%, #E8F1FF 100%);
  font-family: var(--font-family);
}

/* ========== 氛围元素 ========== */
.dl-sky { position: absolute; inset: 0; pointer-events: none; }

.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 100px;
  filter: blur(1px);
}
.cloud::before, .cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
}
.cloud-1 { width: 160px; height: 44px; top: 10%; animation: drift 46s linear infinite; }
.cloud-1::before { width: 66px; height: 66px; top: -30px; left: 26px; }
.cloud-1::after  { width: 46px; height: 46px; top: -18px; left: 82px; }
.cloud-2 { width: 120px; height: 34px; top: 26%; animation: drift 62s linear infinite; animation-delay: -22s; opacity: 0.7; }
.cloud-2::before { width: 50px; height: 50px; top: -22px; left: 20px; }
.cloud-2::after  { width: 34px; height: 34px; top: -12px; left: 62px; }
.cloud-3 { width: 200px; height: 50px; top: 78%; animation: drift 78s linear infinite; animation-delay: -50s; opacity: 0.55; }
.cloud-3::before { width: 80px; height: 80px; top: -36px; left: 34px; }
.cloud-3::after  { width: 54px; height: 54px; top: -20px; left: 104px; }

@keyframes drift {
  from { left: -240px; }
  to   { left: 110%; }
}

.twinkle {
  position: absolute;
  color: var(--accent);
  opacity: 0;
  animation: twinkle 3.2s ease-in-out infinite;
}
.t1 { top: 16%; left: 12%; font-size: 18px; }
.t2 { top: 22%; left: 86%; font-size: 14px; animation-delay: 0.8s; color: var(--primary); }
.t3 { top: 68%; left: 6%;  font-size: 13px; animation-delay: 1.6s; color: var(--primary); }
.t4 { top: 82%; left: 90%; font-size: 20px; animation-delay: 2.2s; }
.t5 { top: 8%;  left: 56%; font-size: 12px; animation-delay: 2.8s; color: var(--primary-light); }

@keyframes twinkle {
  0%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
  50%      { opacity: 0.9; transform: scale(1.15) rotate(20deg); }
}

/* ========== 品牌角标 / 版本徽章 ========== */
.dl-brand {
  position: absolute;
  top: 26px;
  left: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px 8px 12px;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 100px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(6px);
}
.dl-brand-icon { font-size: 24px; }
.dl-brand-text { font-size: 15px; font-weight: 700; color: var(--bg-sidebar); letter-spacing: 1px; }

.dl-version {
  position: absolute;
  top: 30px;
  right: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 7px 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  font-family: Consolas, 'Courier New', monospace;
}
.dl-version-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.7);
}

/* ========== 主控制台 ========== */
.dl-console {
  position: relative;
  z-index: 2;
  display: flex;
  width: 860px;
  max-width: 94vw;
  min-height: 480px;
  background: white;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 30px 70px rgba(26, 43, 74, 0.22), 0 2px 0 rgba(255, 255, 255, 0.9) inset;
  animation: console-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes console-in {
  from { opacity: 0; transform: translateY(30px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ===== 左：引擎舱 ===== */
.dl-left {
  position: relative;
  width: 42%;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 40px 24px;
  background:
    radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1.6px) 0 0 / 20px 20px,
    linear-gradient(165deg, #24395F 0%, var(--bg-sidebar) 55%, #13223C 100%);
}

.dl-engine-tag {
  position: absolute;
  top: 22px;
  left: 24px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.4);
  font-family: Consolas, 'Courier New', monospace;
}

/* 机器人 */
.dl-robot-wrap { animation: bob 3.2s ease-in-out infinite; }

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}

.dl-robot { position: relative; width: 118px; height: 128px; }

.dl-antenna {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 22px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 2px;
}
.dl-antenna i {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent);
  animation: tip-pulse 1.6s ease-in-out infinite;
}
@keyframes tip-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50%      { transform: translateX(-50%) scale(1.35); opacity: 0.65; }
}

.dl-robot-head {
  position: absolute;
  top: 28px;
  left: 0;
  width: 118px;
  height: 100px;
  background: linear-gradient(150deg, var(--primary-light), var(--primary) 55%, var(--primary-dark));
  border-radius: 32px;
  box-shadow: inset 0 -7px 0 rgba(0, 0, 0, 0.16), 0 16px 32px rgba(0, 0, 0, 0.38);
}

/* 眼睛：默认圆形 + 眨眼 */
.dl-eye {
  position: absolute;
  top: 34px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  animation: blink 4.2s infinite;
}
.dl-eye.left  { left: 26px; }
.dl-eye.right { right: 26px; }

@keyframes blink {
  0%, 91%, 100% { transform: scaleY(1); }
  94%           { transform: scaleY(0.12); }
}

/* 就绪：笑眼（∩ 形） */
.dl-robot.is-ready .dl-eye {
  width: 20px;
  height: 10px;
  background: transparent;
  border: 3.5px solid #fff;
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  animation: none;
  top: 36px;
}

/* 出错：X 眼 */
.dl-robot.is-error .dl-eye {
  background: transparent;
  animation: none;
}
.dl-robot.is-error .dl-eye::before,
.dl-robot.is-error .dl-eye::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 3.5px;
  background: #FFB3B3;
  border-radius: 2px;
}
.dl-robot.is-error .dl-eye::before { transform: translate(-50%, -50%) rotate(45deg); }
.dl-robot.is-error .dl-eye::after  { transform: translate(-50%, -50%) rotate(-45deg); }

/* 嘴巴 */
.dl-mouth {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 20px;
  width: 24px;
  height: 9px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 0 0 14px 14px;
  transition: var(--transition);
}
.dl-robot.is-ready .dl-mouth { width: 32px; height: 14px; border-radius: 0 0 18px 18px; }
.dl-robot.is-error .dl-mouth {
  width: 20px;
  height: 7px;
  bottom: 22px;
  border-radius: 14px 14px 0 0;
  background: rgba(255, 179, 179, 0.9);
}

/* 声波环（工作中扩散） */
.dl-ring {
  position: absolute;
  left: 50%;
  top: 78px;
  width: 118px;
  height: 100px;
  border: 2px solid rgba(107, 179, 240, 0.55);
  border-radius: 32px;
  transform: translate(-50%, -50%);
  opacity: 0;
}
.dl-robot.is-active .dl-ring { animation: ring-out 2.2s ease-out infinite; }
.dl-robot.is-active .dl-ring.r2 { animation-delay: 1.1s; }

@keyframes ring-out {
  from { opacity: 0.85; transform: translate(-50%, -50%) scale(0.94); }
  to   { opacity: 0; transform: translate(-50%, -50%) scale(1.45); }
}

/* 均衡器 */
.dl-eq {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 46px;
}
.dl-eq i {
  width: 8px;
  border-radius: 5px;
  background: linear-gradient(180deg, #9CCBFF, var(--primary-light));
  height: 26%;
  transition: height 0.4s ease;
}
.dl-eq i:nth-child(2n) { background: linear-gradient(180deg, var(--accent-light), var(--accent)); }
.dl-eq.live i { animation: eq-bounce 0.9s ease-in-out infinite; }
.dl-eq i:nth-child(1) { animation-delay: 0s; }
.dl-eq i:nth-child(2) { animation-delay: 0.12s; }
.dl-eq i:nth-child(3) { animation-delay: 0.24s; }
.dl-eq i:nth-child(4) { animation-delay: 0.36s; }
.dl-eq i:nth-child(5) { animation-delay: 0.48s; }
.dl-eq i:nth-child(6) { animation-delay: 0.6s; }
.dl-eq i:nth-child(7) { animation-delay: 0.72s; }

@keyframes eq-bounce {
  0%, 100% { height: 20%; }
  50%      { height: 100%; }
}

.dl-left-caption {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.75);
}

/* ===== 右：下载面板 ===== */
.dl-right {
  flex: 1;
  /* 关键：flex 子项默认 min-width:auto，会被内容最小宽度撑大，
     导致右栏宽度随文件名 nowrap 内容变化 → 进度条(右栏100%宽)跟着伸缩。
     置 0 后宽度纯取 flex 分配值，与内容彻底解耦，进度条恒定。 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 52px;
  background:
    radial-gradient(500px 260px at 100% 0%, rgba(255, 140, 66, 0.07), transparent 70%),
    white;
}

.dl-overline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--primary);
  margin-bottom: 12px;
  font-family: Consolas, 'Courier New', monospace;
}
.dl-overline.danger { color: var(--danger); }

/* 当前镜像源徽章 */
.dl-source {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-secondary);
  background: #F0F5FF;
  border: 1px solid var(--border-color);
  padding: 3px 11px;
  border-radius: 100px;
  font-family: var(--font-family);
  white-space: nowrap;
}
.dl-source-ico { font-size: 12px; }
.dl-source.live .dl-source-ico { animation: sat-blink 1.4s ease-in-out infinite; }
@keyframes sat-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

.dl-overline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}
.dl-overline-dot.pulse { animation: dot-glow 1.4s infinite; }
.dl-overline.danger .dl-overline-dot { background: var(--danger); }

@keyframes dot-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(74, 144, 217, 0); }
}

.dl-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--bg-sidebar);
  letter-spacing: 1px;
  margin-bottom: 26px;
}
.dl-title.danger { color: var(--danger); }

/* 百分比 + 当前文件 */
.dl-percent-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  /* 锁死行高：百分比数字 / 当前文件块增删都不引起行高变化，杜绝纵向抖动 */
  min-height: 76px;
}
.dl-percent-box {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.dl-percent {
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 5px 16px rgba(74, 144, 217, 0.2);
  /* 固定宽度 + 右对齐：9% / 10% / 100% 占位一致，数字向左增长，% 号与右侧内容不位移 */
  min-width: 2em;
  text-align: right;
}
.dl-percent-sign {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-light);
}

.dl-current-file {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 占满百分比右侧的"恒定剩余空间"：宽度由布局决定、与文件名长短无关，
     文件名变化只触发内部 ellipsis 重排，块本身尺寸不变 → 不抖 */
  flex: 1;
  min-width: 0;
  padding-left: 22px;
  border-left: 3px solid var(--border-color);
}
.dl-current-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-secondary);
}
.dl-current-name {
  font-size: 13px;
  color: var(--text-primary);
  font-family: Consolas, 'Courier New', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 占满父块（父已 flex:1 恒定宽），去掉 max-width 以免短文件名时块收缩 */
  width: 100%;
}

/* 进度条 + 火箭 */
.dl-track-wrap {
  position: relative;
  padding: 16px 0 8px;
  margin-bottom: 20px;
}
.dl-track {
  height: 16px;
  background: #EDF2FA;
  border-radius: 10px;
  box-shadow: inset 0 2px 5px rgba(26, 43, 74, 0.1);
  overflow: hidden;
}
.dl-fill {
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--primary), var(--primary-light) 60%, var(--accent-light));
  transition: width 0.35s ease;
  position: relative;
}
.dl-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
  animation: shimmer 1.3s infinite;
}
@keyframes shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}

.dl-rocket {
  position: absolute;
  top: 0;
  transform: translateX(-55%) rotate(45deg);
  font-size: 26px;
  transition: left 0.35s ease;
  filter: drop-shadow(0 3px 4px rgba(26, 43, 74, 0.25));
}
.dl-rocket.fly { animation: rocket-shake 0.5s ease-in-out infinite; }
@keyframes rocket-shake {
  0%, 100% { margin-top: 0; }
  50%      { margin-top: -3px; }
}

/* 文件清单 */
.dl-checklist {
  display: flex;
  flex-direction: column;
  gap: 7px;
  /* 固定高度（非 max-height）：始终预留空间，文件增多只内部滚动，不撑高、不引起面板重新居中 */
  height: 132px;
  overflow-y: auto;
  /* 预留滚动条槽：完成文件增多、滚动条出现/消失时不改变内容宽度，杜绝横向抖动 */
  scrollbar-gutter: stable;
  padding: 12px 14px;
  background: #F7FAFF;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 18px;
}
.dl-check-item {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-family: Consolas, 'Courier New', monospace;
}
.dl-check-item.done { color: var(--text-secondary); }
.dl-check-item.current { color: var(--primary); font-weight: 700; }
.dl-check-ico { width: 14px; text-align: center; flex-shrink: 0; }
.dl-check-item.done .dl-check-ico { color: var(--success); font-weight: 700; }
.dl-check-ico.spin { animation: spin-slow 1.2s linear infinite; display: inline-block; }
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.dl-check-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dl-check-empty {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.6;
  font-family: Consolas, 'Courier New', monospace;
  letter-spacing: 1px;
}

/* 轮换提示语：slot 常驻占位，过渡元素增删不影响高度 */
.dl-phrase-slot {
  min-height: 22px;
  margin-bottom: 14px;
}
.dl-phrase {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}
.phrase-enter-active, .phrase-leave-active { transition: all 0.35s ease; }
.phrase-enter-from { opacity: 0; transform: translateY(8px); }
.phrase-leave-to   { opacity: 0; transform: translateY(-8px); }

.dl-tip {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.9;
  opacity: 0.8;
}

/* 失败 */
.dl-error-msg {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: Consolas, 'Courier New', monospace;
  background: #FFF1F0;
  border: 1px solid rgba(255, 77, 79, 0.25);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin-bottom: 18px;
  word-break: break-all;
  max-height: 90px;
  overflow-y: auto;
}

.dl-retry {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 38px;
  border: none;
  border-radius: 100px;
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  color: white;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-family);
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(255, 140, 66, 0.4);
  transition: var(--transition);
}
.dl-retry:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(255, 140, 66, 0.5);
}
.dl-retry:active { transform: translateY(0); }
.dl-retry-icon { display: inline-block; font-size: 18px; }
.dl-retry:hover .dl-retry-icon { animation: spin-once 0.5s ease; }
@keyframes spin-once {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}

/* 页脚 */
.dl-footer {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.6;
  letter-spacing: 2px;
}

/* 窄屏：上下堆叠 */
@media (max-width: 760px) {
  .dl-console { flex-direction: column; min-height: 0; }
  .dl-left { width: 100%; min-width: 0; padding: 30px 24px; gap: 16px; }
  .dl-eq { height: 30px; }
  .dl-right { padding: 30px 26px; }
  .dl-percent { font-size: 52px; }
  .dl-version { display: none; }
}
</style>