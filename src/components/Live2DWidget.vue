<template>
  <div class="live2d-container" ref="containerRef">
    <!-- 角色身后的环境光晕 -->
    <div class="aura" :class="{ talking: isSpeaking }"></div>

    <!-- 对话气泡 -->
    <transition name="bubble">
      <div class="character-bubble" v-if="bubbleText" :key="bubbleText">
        <div class="bubble-content">{{ bubbleText }}</div>
        <div class="bubble-arrow"></div>
      </div>
    </transition>

    <!-- 肖像窗：立绘 + 暗金描边 -->
    <div class="portrait" :class="{ talking: isSpeaking }">
      <!-- 视差层：跟随鼠标，制造伪 3D 转头 -->
      <div class="tilt" ref="tiltRef">
        <!-- 摆动层：长周期不规则左右微摆 -->
        <div class="sway">
          <!-- 呼吸层：上下起伏 -->
          <div class="breathe">
            <!-- 说话层：发声时快速微颤 -->
            <div class="talk" :class="{ on: isSpeaking }">
              <img
                v-if="!imgError"
                src="/character.png"
                alt="小聪"
                class="portrait-img"
                draggable="false"
                @error="imgError = true"
              />
              <div v-else class="portrait-fallback">🧙‍♂️</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 说话时嘴部发声高光（暗示口型在动） -->
      <div class="mouth-glow" :class="{ on: isSpeaking }"></div>
      <!-- 玻璃高光扫过 -->
      <div class="portrait-sheen"></div>
      <!-- 点击热区 -->
      <div class="portrait-hit" @click="onPortraitClick"></div>
    </div>

    <div class="interaction-hint" v-if="!isSpeaking">
      <span>点我互动 ✦</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTTS } from '../composables/useTTS';

const route = useRoute();
const tts = useTTS();

// 课堂页面禁用自动弹出语句
const isClassroom = () => route.path === '/classroom';

const containerRef = ref(null);
const tiltRef = ref(null);
const bubbleText = ref('');
const isSpeaking = ref(false);
const imgError = ref(false);

let speakTimer = null;
let greetTimer = null;

// ===== 鼠标视差：让立绘"转头看你" =====
function onMouseMove(e) {
  if (!tiltRef.value) return;
  const nx = (e.clientX / window.innerWidth - 0.5) * 2;  // -1..1
  const ny = (e.clientY / window.innerHeight - 0.5) * 2; // -1..1
  const tx = nx * 5;          // 水平位移 px
  const rot = nx * 2.5;       // 水平转头 deg
  const ty = ny * 2;          // 极小垂直位移（不露边）
  tiltRef.value.style.transform =
    `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
}
function onMouseLeave() {
  if (tiltRef.value) tiltRef.value.style.transform = 'translate3d(0,0,0) rotate(0deg)';
}

onMounted(() => {
  // 定时问候（课堂页面跳过）
  greetTimer = setInterval(() => { if (!isClassroom()) greet(); }, 30000);
  // 监听外部（如课堂 AI 回复）触发说话
  window.addEventListener('live2d-speak', handleExternalSpeak);
  // 视差
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseout', onMouseLeave);
});

onUnmounted(() => {
  window.removeEventListener('live2d-speak', handleExternalSpeak);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseout', onMouseLeave);
  if (speakTimer) clearTimeout(speakTimer);
  if (greetTimer) clearInterval(greetTimer);
});

// 外部派发 window.dispatchEvent(new CustomEvent('live2d-speak', { detail: '文本' })) 即可让角色说话
function handleExternalSpeak(e) {
  if (isClassroom()) return; // 课堂页面不弹出
  const detail = e.detail;
  const text = typeof detail === 'string' ? detail : detail?.text;
  if (!text) return;
  showBubbleAndSpeak(text);
}

// 统一：显示气泡 + TTS 朗读（并行触发，减少延迟）
function showBubbleAndSpeak(text, duration) {
  bubbleText.value = text;
  isSpeaking.value = true;
  if (speakTimer) clearTimeout(speakTimer);
  const dur = duration || Math.min(9000, 3000 + text.length * 150);
  speakTimer = setTimeout(() => {
    bubbleText.value = '';
    isSpeaking.value = false;
  }, dur);
  // 立即触发 TTS（与气泡渲染并行，减少感知延迟）
  tts.speak(text, { rate: 1.05, pitch: 1.2 });
}

function onPortraitClick() {
  const phrases = [
    '今天学了什么呀？',
    '给我讲讲这道题吧！',
    '加油加油！',
    '你真棒！',
    '这道题我会！',
    '让我想想...',
    '好厉害哦！'
  ];
  showBubbleAndSpeak(phrases[Math.floor(Math.random() * phrases.length)], 4000);
}

function greet() {
  const hour = new Date().getHours();
  let greeting = '';
  if (hour < 12) greeting = '早上好！今天也要认真学习哦～';
  else if (hour < 18) greeting = '下午好！继续加油！';
  else greeting = '晚上好！今天辛苦了！';

  showBubbleAndSpeak(greeting, 5000);
}

function speak(text) {
  showBubbleAndSpeak(text, 4000);
}

function hideBubble() {
  bubbleText.value = '';
  isSpeaking.value = false;
}

defineExpose({ speak, hideBubble });
</script>

<style scoped>
.live2d-container {
  position: fixed;
  right: 22px;
  bottom: 18px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}
.live2d-container > * { pointer-events: auto; }

/* ===== 环境光晕 ===== */
.aura {
  position: absolute;
  right: -26px;
  bottom: -10px;
  width: 240px;
  height: 300px;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, rgba(74, 110, 196, 0.45), rgba(74, 110, 196, 0) 70%),
    radial-gradient(closest-side at 60% 40%, rgba(201, 162, 74, 0.28), rgba(201, 162, 74, 0) 65%);
  filter: blur(14px);
  z-index: 0;
  pointer-events: none;
  animation: aura-breathe 6s ease-in-out infinite;
}
.aura.talking { animation: aura-breathe 6s ease-in-out infinite, aura-talk 1.3s ease-in-out infinite; }

@keyframes aura-breathe {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.9;  transform: scale(1.06); }
}
@keyframes aura-talk {
  0%, 100% { filter: blur(14px) brightness(1); }
  50%      { filter: blur(18px) brightness(1.35); }
}

/* ===== 肖像窗 ===== */
.portrait {
  position: relative;
  z-index: 1;
  width: 188px;
  aspect-ratio: 188 / 332;
  border-radius: 96px 96px 18px 18px;
  overflow: hidden;
  background: #0c1230;
  border: 1px solid rgba(201, 162, 74, 0.4);
  box-shadow:
    0 14px 34px rgba(12, 18, 48, 0.5),
    0 2px 0 rgba(255, 255, 255, 0.05) inset,
    0 0 0 4px rgba(12, 18, 48, 0.35);
  cursor: pointer;
  transition: box-shadow 0.35s ease;
  animation: idle-float 6s ease-in-out infinite;
}
.portrait:hover {
  box-shadow:
    0 20px 44px rgba(12, 18, 48, 0.55),
    0 0 22px rgba(201, 162, 74, 0.35),
    0 0 0 4px rgba(12, 18, 48, 0.35);
}

/* 整窗悬浮（与内部 transform 分层，互不覆盖） */
@keyframes idle-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
}

/* 视差层：inline transform 由 JS 写入，平滑跟随鼠标 */
.tilt {
  position: absolute;
  inset: 0;
  transform: translate3d(0, 0, 0) rotate(0deg);
  transition: transform 0.25s ease-out;
  will-change: transform;
}

/* 摆动层：长周期不规则左右微摆，制造生命感 */
.sway {
  position: absolute;
  inset: 0;
  transform-origin: 50% 100%;
  animation: sway 9s ease-in-out infinite;
  will-change: transform;
}
@keyframes sway {
  0%   { transform: rotate(0deg); }
  20%  { transform: rotate(1.3deg); }
  45%  { transform: rotate(-0.9deg); }
  70%  { transform: rotate(0.7deg); }
  100% { transform: rotate(0deg); }
}

/* 呼吸层：胸腔起伏 */
.breathe {
  position: absolute;
  inset: 0;
  transform-origin: 50% 100%;
  animation: breathe 4.2s ease-in-out infinite;
  will-change: transform;
}
@keyframes breathe {
  0%, 100% { transform: scaleY(1) translateY(0); }
  50%      { transform: scaleY(1.012) translateY(-2px); }
}

/* 说话层：发声时多方向大幅抖动，默认静止 */
.talk {
  position: absolute;
  inset: 0;
  transform-origin: 50% 100%;
}
.talk.on { animation: talk 0.34s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
/* 八步交错方向：水平+垂直+旋转+双向挤压，模拟激动讲述 */
@keyframes talk {
  0%   { transform: translate(0, 0)        rotate(0deg)    scale(1, 1); }
  12%  { transform: translate(-2.5px, -3px) rotate(-1.8deg) scale(1.02, 0.985); }
  25%  { transform: translate(2px, 1.5px)   rotate(1.6deg)  scale(0.985, 1.02); }
  37%  { transform: translate(-1.5px, -2px) rotate(-1deg)   scale(1.015, 0.99); }
  50%  { transform: translate(2.5px, 3px)   rotate(2deg)    scale(0.98, 1.025); }
  62%  { transform: translate(-2px, 1px)    rotate(-1.5deg) scale(1.02, 0.985); }
  75%  { transform: translate(1.5px, -2.5px) rotate(1.2deg)  scale(0.99, 1.015); }
  87%  { transform: translate(-1px, 2px)    rotate(-0.8deg) scale(1.01, 0.992); }
  100% { transform: translate(0, 0)        rotate(0deg)    scale(1, 1); }
}

/* 立绘：放大留视差余量，顶部对齐不切帽尖 */
.portrait-img {
  position: absolute;
  top: 0;
  left: -6%;
  width: 112%;
  height: 108%;
  object-fit: cover;
  object-position: top center;
  display: block;
  user-select: none;
  pointer-events: none;
}

.portrait-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 84px;
  background: radial-gradient(circle at 50% 35%, #1b2550, #0c1230);
}

/* 说话时嘴部发声高光，暗示口型在动 */
.mouth-glow {
  position: absolute;
  left: 50%;
  top: 62%;
  width: 34px;
  height: 20px;
  transform: translate(-50%, -50%) scale(0.6);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 244, 214, 0.85), rgba(255, 244, 214, 0) 70%);
  opacity: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  z-index: 2;
}
.mouth-glow.on { animation: mouth 0.32s ease-in-out infinite; }
@keyframes mouth {
  0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(0.7); }
  50%      { opacity: 0.6;  transform: translate(-50%, -50%) scale(1.15); }
}

/* 玻璃高光扫过（悬停触发） */
.portrait-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.14) 50%, transparent 62%);
  transform: translateX(-120%);
  pointer-events: none;
  z-index: 3;
}
.portrait:hover .portrait-sheen { animation: sheen 0.9s ease; }
@keyframes sheen { to { transform: translateX(120%); } }

/* 透明点击热区，盖在最上层 */
.portrait-hit {
  position: absolute;
  inset: 0;
  z-index: 4;
  cursor: pointer;
}

/* ===== 气泡 ===== */
.character-bubble {
  position: absolute;
  bottom: 350px;
  right: 6px;
  background: #fffdf7;
  border: 1px solid rgba(201, 162, 74, 0.35);
  border-radius: 16px;
  padding: 11px 16px;
  box-shadow: 0 10px 26px rgba(12, 18, 48, 0.18);
  max-width: 220px;
  z-index: 2;
}
.bubble-content {
  font-size: 14px;
  color: #2a2f45;
  line-height: 1.55;
  font-family: "Kaiti SC", "KaiTi", "STKaiti", "Songti SC", serif;
  letter-spacing: 0.2px;
}
.bubble-arrow {
  position: absolute;
  bottom: -8px;
  right: 34px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #fffdf7;
  filter: drop-shadow(0 1px 0 rgba(201, 162, 74, 0.35));
}

.bubble-enter-active { animation: bubble-in 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.3); }
.bubble-leave-active { animation: bubble-in 0.2s ease reverse; }
@keyframes bubble-in {
  from { opacity: 0; transform: translateY(8px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ===== 互动提示 ===== */
.interaction-hint {
  position: absolute;
  right: 50%;
  transform: translateX(50%);
  bottom: 6px;
  z-index: 2;
  background: rgba(12, 18, 48, 0.72);
  color: #f3e6c4;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  letter-spacing: 1px;
  pointer-events: none;
  backdrop-filter: blur(4px);
  animation: hint-float 6s ease-in-out infinite;
}
@keyframes hint-float {
  0%, 100% { transform: translateX(50%) translateY(0); opacity: 0.85; }
  50%      { transform: translateX(50%) translateY(-7px); opacity: 1; }
}
</style>