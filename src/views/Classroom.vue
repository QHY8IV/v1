<template>
  <div class="classroom-page">
    <!-- 课堂顶部信息 -->
    <div class="classroom-header">
      <div class="class-info">
        <h2>{{ currentLesson?.title || '数学课堂' }}</h2>
        <p>{{ currentLesson?.topic || '人教版三年级上册' }}</p>
      </div>
      <div class="class-controls">
        <div class="timer" :class="{ urgent: timeRemaining <= 60 }">
          ⏱️ {{ formattedTime }}
        </div>
        <button class="btn btn-danger btn-sm" @click="endClass" v-if="isClassActive">
          结束课程
        </button>
      </div>
    </div>

    <div class="classroom-body">
      <!-- 主体：白板区 -->
      <div class="main-board-area">
        <!-- 知识点提示 -->
        <div class="knowledge-point" v-if="currentKnowledgePoint">
          📌 当前知识点：{{ currentKnowledgePoint }}
        </div>

        <!-- 白板 -->
        <div class="board-card">
          <!-- 工具条 -->
          <div class="board-toolbar">
            <div class="tool-group">
              <span
                v-for="color in penColors"
                :key="color"
                class="color-dot"
                :class="{ active: currentColor === color }"
                :style="{ background: color }"
                @click="currentColor = color"
              ></span>
            </div>
            <div class="tool-group">
              <input type="range" min="2" max="12" v-model.number="penWidth" class="pen-range" />
              <span class="pen-width-label">{{ penWidth }}px</span>
            </div>
            <div class="tool-group tool-actions">
              <button class="tool-btn" @click="undo" title="撤销">↩</button>
              <button class="tool-btn" @click="clearBoard" title="清空">🗑️</button>
              <button class="tool-btn primary" :disabled="thinking" @click="askStudent">
                {{ thinking ? '小聪在看...' : ' 让小聪看板书' }}
              </button>
            </div>
          </div>

          <!-- 画布 -->
          <div class="board-canvas-wrap" ref="boardWrapRef">
            <canvas
              ref="boardCanvasEl"
              class="board-canvas"
              @mousedown="startDraw"
              @mousemove="draw"
              @mouseup="stopDraw"
              @mouseleave="stopDraw"
              @touchstart="handleTouch"
              @touchmove="handleTouch"
              @touchend="stopDraw"
            ></canvas>
            <div class="board-hint" v-if="strokes.length === 0">
              ✍️ 在这里书写或画图，讲给小聪听
            </div>
          </div>
        </div>

        <!-- 语音识别控制（位置不变，底部） -->
        <div class="audio-controls">
          <button
            class="mic-btn"
            :class="{ active: stt.isListening.value, unsupported: isModelLoading }"
            @click="handleMicToggle"
            :disabled="isModelLoading"
            :title="isModelLoading ? '模型加载中...' : '点击开始/停止语音识别'"
          >
            <span class="mic-icon">{{ stt.isListening.value ? '🎤' : '🎙️' }}</span>
            <span v-if="stt.isListening.value" class="mic-volume-ring"></span>
          </button>
          <div class="mic-status">
            <span class="mic-label" :class="{ listening: stt.isListening.value }">
              <template v-if="isModelLoading">{{ stt.statusMessage.value || '模型加载中...' }}</template>
              <template v-else-if="stt.isListening.value">正在聆听...（离线识别）</template>
              <template v-else>点击开始语音输入（离线）</template>
            </span>
            <span v-if="stt.isModelReady.value && !stt.isListening.value" class="mic-ready">✅ 离线模型已就绪</span>
          </div>
        </div>

        <!-- 摄像头画中画（左下角） -->
        <div class="camera-pip" :class="{ collapsed: cameraCollapsed }">
          <div class="pip-header" @click="cameraCollapsed = !cameraCollapsed">
            <span>📹 我</span>
            <span class="pip-toggle">{{ cameraCollapsed ? '＋' : '－' }}</span>
          </div>
          <div class="pip-body" v-show="!cameraCollapsed">
            <video ref="cameraVideoEl" autoplay muted playsinline class="pip-video"></video>
            <div class="pip-placeholder" v-if="cameraError">
              <span>📷</span>
              <small>摄像头未开启</small>
            </div>
          </div>
        </div>

      </div>

      <!-- 右侧：语音识别文本（窄栏） -->
      <div class="right-transcript">
        <div class="rt-header">
          <span class="rt-dot" v-if="stt.isListening.value"></span>
          <span>️ 识别内容</span>
        </div>
        <div class="rt-body">
          <div v-if="stt.isListening.value || stt.finalText.value" class="rt-text">
            <span class="rt-final">{{ stt.finalText.value }}</span>
            <span class="rt-interim">{{ stt.interimText.value }}</span>
            <span class="rt-cursor" v-if="stt.isListening.value">|</span>
          </div>
          <div v-else class="rt-empty">说话内容会显示在这里</div>
          <div class="rt-error" v-if="sttError">⚠️ {{ sttError }}</div>
        </div>
      </div>

      <!-- 左侧可折叠抽屉（AI 学生对话 + 讲课质量） -->
      <transition name="drawer">
        <div class="left-drawer" v-if="leftOpen">
          <div class="drawer-head">
            <span>💬 与小聪对话</span>
            <button class="drawer-close" @click="leftOpen = false">✕</button>
          </div>
          <div class="chat-messages">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              class="message"
              :class="msg.sender"
            >
              <div class="message-bubble">{{ msg.text }}</div>
            </div>
          </div>
          <div class="quality-feedback">
            <div class="feedback-title">📊 讲课质量</div>
            <div class="feedback-item">
              <span>清晰度</span>
              <div class="bar"><div class="bar-fill" :style="{ width: quality.clearness + '%' }"></div></div>
              <span class="bar-value">{{ quality.clearness }}%</span>
            </div>
            <div class="feedback-item">
              <span>逻辑性</span>
              <div class="bar"><div class="bar-fill" :style="{ width: quality.logic + '%' }"></div></div>
              <span class="bar-value">{{ quality.logic }}%</span>
            </div>
            <div class="feedback-item">
              <span>完整性</span>
              <div class="bar"><div class="bar-fill" :style="{ width: quality.completeness + '%' }"></div></div>
              <span class="bar-value">{{ quality.completeness }}%</span>
            </div>
          </div>
        </div>
      </transition>
      <!-- 收起态侧边按钮 -->
      <button class="drawer-tab" v-if="!leftOpen" @click="leftOpen = true" title="展开对话与质量面板">
        <span class="tab-icon">🧒</span>
        <span class="tab-text">小聪</span>
      </button>
    </div>

    <!-- 课程结束弹窗 -->
    <div class="modal-overlay" v-if="showEndModal">
      <div class="modal end-modal">
        <h3>🎉 课程完成！</h3>
        <div class="class-summary">
          <div class="summary-item">
            <span class="summary-label">课程时长</span>
            <span class="summary-value">{{ formattedTime }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">清晰度</span>
            <span class="summary-value">{{ quality.clearness }}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">逻辑性</span>
            <span class="summary-value">{{ quality.logic }}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">完整性</span>
            <span class="summary-value">{{ quality.completeness }}%</span>
          </div>
          <div class="summary-item reward">
            <span class="summary-label">获得奖励</span>
            <span class="summary-value">+¥1.00 课时</span>
          </div>
        </div>
        <div class="ai-comment">
          <p>💬 AI 评语：{{ aiComment }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showEndModal = false">查看详情</button>
          <button class="btn btn-primary" @click="returnHome">返回首页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useOfflineSTT } from '../composables/useOfflineSTT';

const router = useRouter();

// 离线语音识别（Whisper）
const sttError = ref('');
const stt = useOfflineSTT({
  onResult: (text) => {
    if (text.trim()) {
      sendMessage(text, true);
    }
  },
  onStatusChange: (status, message) => {
    if (status === 'error') {
      sttError.value = message;
    } else {
      sttError.value = '';
    }
  },
  onError: (err) => {
    sttError.value = err;
  },
  onSilenceStop: () => {
    sttError.value = '检测到 5 秒无语音输入，已自动停止录音';
    setTimeout(() => { sttError.value = ''; }, 4000);
  }
});

const currentLesson = ref({
  title: '长方形面积计算',
  topic: '人教版三年级上册 - 第五单元'
});

const currentKnowledgePoint = ref('长方形面积 = 长 × 宽');

// 计时器
const isClassActive = ref(false);
const totalSeconds = ref(25 * 60);
const elapsedSeconds = ref(0);
let timerInterval = null;

const timeRemaining = computed(() => totalSeconds.value - elapsedSeconds.value);
const formattedTime = computed(() => {
  const mins = Math.floor(timeRemaining.value / 60);
  const secs = timeRemaining.value % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
});

// 消息
const messages = ref([
  { sender: 'ai', text: '同学你好！我是小聪 🧒 在黑板上写写画画，讲给我听吧～' }
]);
const isAIThinking = ref(false);
const thinking = ref(false);

// 麦克风 / 语音识别状态
const isModelLoading = computed(() =>
  stt.modelStatus.value === 'loading' || stt.modelStatus.value === 'downloading'
);

// 质量评分
const quality = ref({ clearness: 85, logic: 78, completeness: 82 });

// 左侧抽屉
const leftOpen = ref(false);

// 摄像头
const cameraVideoEl = ref(null);
const cameraError = ref(false);
const cameraCollapsed = ref(false);
let cameraStream = null;

// 结束弹窗
const showEndModal = ref(false);
const aiComment = ref('讲解得很清楚，步骤也很完整！如果能再详细说说为什么这样做就更好了。');

// ===== 白板绘制 =====
const boardWrapRef = ref(null);
const boardCanvasEl = ref(null);
let boardCtx = null;
const penColors = ['#333333', '#FF4D4F', '#4A90D9', '#52C41A', '#FAAD14'];
const currentColor = ref('#333333');
const penWidth = ref(4);
const strokes = ref([]); // { points, color, width }
let currentStroke = null;
const isDrawing = ref(false);
const lastX = ref(0);
const lastY = ref(0);

function setupCanvas() {
  const canvas = boardCanvasEl.value;
  const wrap = boardWrapRef.value;
  if (!canvas || !wrap) return;
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  boardCtx = canvas.getContext('2d');
  boardCtx.scale(dpr, dpr);
  boardCtx.lineCap = 'round';
  boardCtx.lineJoin = 'round';
  redrawBoard();
}

function getPos(e) {
  const rect = boardCanvasEl.value.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDraw(e) {
  isDrawing.value = true;
  const pos = getPos(e);
  lastX.value = pos.x;
  lastY.value = pos.y;
  currentStroke = { points: [{ x: pos.x, y: pos.y }], color: currentColor.value, width: penWidth.value };
}

function draw(e) {
  if (!isDrawing.value || !boardCtx) return;
  const pos = getPos(e);
  boardCtx.strokeStyle = currentStroke.color;
  boardCtx.lineWidth = currentStroke.width;
  boardCtx.beginPath();
  boardCtx.moveTo(lastX.value, lastY.value);
  boardCtx.lineTo(pos.x, pos.y);
  boardCtx.stroke();
  currentStroke.points.push({ x: pos.x, y: pos.y });
  lastX.value = pos.x;
  lastY.value = pos.y;
}

function stopDraw() {
  if (isDrawing.value && currentStroke && currentStroke.points.length > 0) {
    strokes.value.push(currentStroke);
  }
  isDrawing.value = false;
  currentStroke = null;
}

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) { stopDraw(); return; }
  const mouseEvent = new MouseEvent(
    e.type === 'touchstart' ? 'mousedown' : 'mousemove',
    { clientX: touch.clientX, clientY: touch.clientY }
  );
  boardCanvasEl.value.dispatchEvent(mouseEvent);
}

function undo() {
  if (strokes.value.length > 0) {
    strokes.value.pop();
    redrawBoard();
  }
}

function clearBoard() {
  strokes.value = [];
  redrawBoard();
}

function redrawBoard() {
  const canvas = boardCanvasEl.value;
  if (!boardCtx || !canvas) return;
  const dpr = window.devicePixelRatio || 1;
  boardCtx.save();
  boardCtx.setTransform(1, 0, 0, 1, 0, 0);
  boardCtx.clearRect(0, 0, canvas.width, canvas.height);
  boardCtx.restore();
  strokes.value.forEach(stroke => {
    if (stroke.points.length < 2) return;
    boardCtx.strokeStyle = stroke.color;
    boardCtx.lineWidth = stroke.width;
    boardCtx.beginPath();
    boardCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      boardCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    boardCtx.stroke();
  });
}

// 把板书发给"学生"AI（视觉模型）
async function askStudent() {
  if (!boardCanvasEl.value || thinking.value) return;
  if (strokes.value.length === 0) {
    pushAi('黑板上还是空的呢，先写点什么再叫我吧～');
    return;
  }
  thinking.value = true;
  isAIThinking.value = true;
  try {
    const imageData = boardCanvasEl.value.toDataURL('image/png');
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData,
        message: '请看看我在黑板上写的内容，像小学生一样回应我',
        knowledgePoint: currentKnowledgePoint.value
      })
    });
    const data = await res.json();
    pushAi(data.reply || '我认真看了你的板书，能再讲讲吗？');
  } catch (err) {
    pushAi('哎呀，我没看清黑板，能再写清楚一点吗？');
  } finally {
    thinking.value = false;
    isAIThinking.value = false;
  }
}

function pushAi(text) {
  messages.value.push({ sender: 'ai', text });
  // 让右下角全局拟人角色（Live2DWidget）以气泡说出这句话
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('live2d-speak', { detail: text }));
  }
}

// 定时器
function startTimer() {
  isClassActive.value = true;
  timerInterval = setInterval(() => {
    if (elapsedSeconds.value < totalSeconds.value) {
      elapsedSeconds.value++;
    } else {
      endClass();
    }
  }, 1000);
}

function stopTimer() {
  isClassActive.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function handleMicToggle() {
  if (stt.isListening.value) {
    stt.stopListening();
    return;
  }
  sttError.value = '';
  await stt.startListening();
}

function endClass() {
  stopTimer();
  showEndModal.value = true;
  generateAIComent();
}

function generateAIComent() {
  isAIThinking.value = true;
  setTimeout(() => {
    const comments = [
      '讲解得很清楚，步骤也很完整！如果能再详细说说为什么这样做就更好了。',
      '你的思路很清晰，但在计算环节可以更仔细一些。继续加油！',
      '太棒了！你把这道题讲得非常透彻，小聪已经完全听懂了！',
      '整体表现不错，注意书写规范会更好哦～'
    ];
    aiComment.value = comments[Math.floor(Math.random() * comments.length)];
    isAIThinking.value = false;
  }, 1500);
}

function returnHome() {
  router.push('/');
}

async function sendMessage(text, fromVoice = false) {
  if (!text.trim()) return;
  messages.value.push({ sender: 'student', text: fromVoice ? `🎤 ${text}` : text });

  isAIThinking.value = true;
  try {
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        knowledgePoint: currentKnowledgePoint.value
      })
    });
    const data = await res.json();
    pushAi(data.reply || '嗯嗯，我在听～');
  } catch (err) {
    const fallback = [
      '嗯嗯，我好像明白了！',
      '这一步是怎么得到的呀？',
      '原来是这样！那下一题呢？',
      '我觉得你说的对！',
      '等等，我还是有点不太懂...'
    ];
    pushAi(fallback[Math.floor(Math.random() * fallback.length)]);
  } finally {
    isAIThinking.value = false;
  }
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraError.value = true;
      return;
    }
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (cameraVideoEl.value) {
      cameraVideoEl.value.srcObject = cameraStream;
    }
    cameraError.value = false;
  } catch (err) {
    cameraError.value = true;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

let resizeHandler = null;

onMounted(() => {
  startTimer();
  nextTick(() => {
    setupCanvas();
  });
  resizeHandler = () => setupCanvas();
  window.addEventListener('resize', resizeHandler);
  startCamera();
});

onUnmounted(() => {
  stopTimer();
  stopCamera();
  stt.destroy();
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
});
</script>

<style scoped>
.classroom-page {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.classroom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}

.class-info h2 { font-size: 20px; margin-bottom: 4px; }
.class-info p { color: var(--text-secondary); font-size: 14px; }

.timer {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  padding: 4px 12px;
  background: #F0F5FF;
  border-radius: 8px;
}
.timer.urgent { color: var(--danger); background: #FFF1F0; animation: pulse 1s infinite; }

/* 主体网格：白板区 + 右侧识别窄栏 */
.classroom-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 230px;
  gap: 16px;
  min-height: 0;
  position: relative;
}

/* ===== 白板区 ===== */
.main-board-area {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.knowledge-point {
  background: linear-gradient(135deg, #FFF7E8, #FFEFC2);
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.board-card {
  flex: 1;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.board-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.tool-group { display: flex; align-items: center; gap: 8px; }
.tool-actions { margin-left: auto; }

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: var(--transition);
}
.color-dot.active { border-color: #333; transform: scale(1.2); }

.pen-range { width: 90px; cursor: pointer; }
.pen-width-label { font-size: 12px; color: var(--text-secondary); min-width: 32px; }

.tool-btn {
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: var(--transition);
}
.tool-btn:hover { background: #F0F5FF; }
.tool-btn.primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.tool-btn.primary:hover { background: var(--primary-light, #5a9bff); }
.tool-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.board-canvas-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
  background:
    linear-gradient(#f7f9fc 1px, transparent 1px) 0 0 / 100% 28px,
    #ffffff;
}
.board-canvas { display: block; cursor: crosshair; touch-action: none; }
.board-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 16px;
  pointer-events: none;
  opacity: 0.6;
}

/* 语音控制 */
.audio-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}
.mic-btn {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  font-size: 22px;
  cursor: pointer;
  background: linear-gradient(145deg, #4C8DFF, #2F6BEB);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.25s ease, background 0.25s ease;
  box-shadow: 0 3px 10px rgba(47, 107, 235, 0.3);
  flex-shrink: 0;
}
.mic-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 5px 16px rgba(47, 107, 235, 0.45); }
.mic-btn:active:not(:disabled) { transform: scale(0.96); }
.mic-btn:disabled, .mic-btn.unsupported { background: #C9CED6; cursor: not-allowed; box-shadow: none; }
.mic-btn.active {
  background: linear-gradient(145deg, #FF6B6B, #EE4D4D);
  animation: mic-pulse 1.6s ease-out infinite;
}
@keyframes mic-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(238, 77, 77, 0.45); }
  70%  { box-shadow: 0 0 0 14px rgba(238, 77, 77, 0); }
  100% { box-shadow: 0 0 0 0 rgba(238, 77, 77, 0); }
}
.mic-icon { position: relative; z-index: 2; line-height: 1; }
.mic-volume-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 3px solid rgba(238, 77, 77, 0.7);
  pointer-events: none;
  z-index: 1;
}
.mic-status { display: flex; flex-direction: column; gap: 2px; }
.mic-label { font-size: 14px; font-weight: 600; color: var(--text-secondary); transition: color 0.25s ease; }
.mic-label.listening { color: #EE4D4D; }
.mic-ready { font-size: 12px; color: #52c41a; }

/* ===== 摄像头画中画（左下） ===== */
.camera-pip {
  position: absolute;
  left: 14px;
  bottom: 86px;
  width: 180px;
  background: #1A1A2E;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  z-index: 6;
  border: 2px solid rgba(255,255,255,0.85);
}
.pip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.pip-toggle { font-weight: 700; }
.pip-body { position: relative; aspect-ratio: 4 / 3; background: #000; }
.pip-video { width: 100%; height: 100%; object-fit: cover; display: block; }
.pip-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: rgba(255,255,255,0.6);
}
.pip-placeholder span { font-size: 26px; }
.pip-placeholder small { font-size: 11px; }
.camera-pip.collapsed { width: auto; }
.camera-pip.collapsed .pip-header { padding: 6px 12px; }

/* ===== 右侧识别窄栏 ===== */
.right-transcript {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.rt-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.rt-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #EE4D4D;
  animation: stt-blink 1s ease-in-out infinite;
}
@keyframes stt-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
.rt-body { flex: 1; overflow-y: auto; padding: 12px 14px; }
.rt-text { font-size: 14px; line-height: 1.7; color: var(--text-primary); word-break: break-word; }
.rt-interim { color: var(--text-secondary); opacity: 0.7; }
.rt-cursor { color: #EE4D4D; animation: stt-blink 0.8s step-end infinite; }
.rt-empty { color: var(--text-secondary); font-size: 13px; text-align: center; padding: 30px 0; }
.rt-error {
  margin-top: 10px;
  background: #FFF1F0;
  border: 1px solid #FFCCC7;
  color: #CF1322;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
}

/* ===== 左侧可折叠抽屉 ===== */
.left-drawer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 30px rgba(0,0,0,0.18);
  z-index: 20;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  flex-shrink: 0;
}
.drawer-close {
  border: none;
  background: #F0F0F0;
  width: 26px; height: 26px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}
.drawer-close:hover { background: #E0E0E0; }
.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
}
.message { max-width: 85%; }
.message.ai { align-self: flex-start; }
.message.student { align-self: flex-end; }
.message-bubble { padding: 9px 13px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
.message.ai .message-bubble { background: #F0F5FF; border-bottom-left-radius: 4px; }
.message.student .message-bubble { background: var(--primary); color: white; border-bottom-right-radius: 4px; }
.quality-feedback { border-top: 1px solid var(--border-color); padding: 12px 14px; flex-shrink: 0; }
.feedback-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.feedback-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
.feedback-item span:first-child { min-width: 40px; }
.bar { flex: 1; height: 6px; background: #F0F0F0; border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light, #5a9bff)); border-radius: 3px; transition: width 0.5s ease; }
.bar-value { min-width: 35px; text-align: right; font-weight: 500; }

/* 收起态侧边按钮 */
.drawer-tab {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0 12px 12px 0;
  cursor: pointer;
  box-shadow: 2px 2px 10px rgba(0,0,0,0.15);
  transition: padding 0.2s ease;
}
.drawer-tab:hover { padding-left: 12px; }
.tab-icon { font-size: 22px; }
.tab-text { writing-mode: vertical-rl; font-size: 12px; letter-spacing: 2px; }

/* 抽屉动画 */
.drawer-enter-active, .drawer-leave-active { transition: transform 0.28s ease, opacity 0.28s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(-110%); opacity: 0; }

/* 结束弹窗 */
.end-modal { max-width: 450px; text-align: center; }
.class-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 0;
  padding: 16px;
  background: #F8F9FA;
  border-radius: var(--radius-sm);
}
.summary-item { text-align: center; }
.summary-label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.summary-value { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.summary-item.reward .summary-value { color: var(--accent); }
.ai-comment { padding: 12px; background: #F0F5FF; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 14px; line-height: 1.6; }
</style>