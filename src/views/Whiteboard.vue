<template>
  <div class="whiteboard-page">
    <div class="wb-header">
      <h2>✏️ 手写板书</h2>
      <div class="wb-controls">
        <div class="control-group">
          <label>笔的颜色：</label>
          <div class="color-options">
            <span
              v-for="color in penColors"
              :key="color"
              class="color-dot"
              :class="{ active: currentColor === color }"
              :style="{ background: color }"
              @click="currentColor = color"
            ></span>
          </div>
        </div>
        <div class="control-group">
          <label>笔粗细：</label>
          <input
            type="range"
            min="1"
            max="10"
            v-model.number="penWidth"
          />
          <span>{{ penWidth }}px</span>
        </div>
        <div class="control-group">
          <button class="btn btn-sm btn-outline" @click="undo">↩ 撤销</button>
          <button class="btn btn-sm btn-outline" @click="clearBoard">🗑️ 清空</button>
          <button class="btn btn-sm btn-primary" @click="submitBoard">📤 提交板书</button>
        </div>
      </div>
    </div>

    <div class="wb-body">
      <!-- 画板 -->
      <div class="canvas-wrapper">
        <canvas
          ref="boardCanvas"
          class="board-canvas"
          @mousedown="startDraw"
          @mousemove="draw"
          @mouseup="stopDraw"
          @mouseleave="stopDraw"
          @touchstart="handleTouch"
          @touchmove="handleTouch"
          @touchend="stopDraw"
        ></canvas>
      </div>

      <!-- 右侧：学生 AI 反馈 -->
      <div class="ocr-panel">
        <div class="panel-header">
          <span>🧒 小聪的反应</span>
          <button class="btn btn-sm" :disabled="thinking" @click="askStudent">
            {{ thinking ? '思考中...' : '提问' }}
          </button>
        </div>
        <div class="ocr-content">
          <div v-if="aiFeedback" class="recognized-text ai-speech">
            <span class="speech-avatar">🧒</span>
            <div class="speech-bubble">{{ aiFeedback }}</div>
          </div>
          <div v-else class="empty-ocr">
            在画板上书写或画图，点击"提问"让小聪看看你写了什么
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const boardCanvas = ref(null);
const ctx = ref(null);
const isDrawing = ref(false);
const lastX = ref(0);
const lastY = ref(0);

const penColors = ['#333333', '#FF4D4F', '#4A90D9', '#52C41A', '#FAAD14'];
const currentColor = ref('#333333');
const penWidth = ref(3);

const aiFeedback = ref('');
const thinking = ref(false);

const strokes = ref([]);
let currentStroke = [];

onMounted(() => {
  nextTick(() => {
    if (boardCanvas.value) {
      const canvas = boardCanvas.value;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      ctx.value = canvas.getContext('2d');
      ctx.value.lineCap = 'round';
      ctx.value.lineJoin = 'round';
    }
  });
});

function getPos(e) {
  const rect = boardCanvas.value.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDraw(e) {
  isDrawing.value = true;
  const pos = getPos(e);
  lastX.value = pos.x;
  lastY.value = pos.y;
  currentStroke = [{ x: pos.x, y: pos.y }];
}

function draw(e) {
  if (!isDrawing.value || !ctx.value) return;
  const pos = getPos(e);
  
  ctx.value.strokeStyle = currentColor.value;
  ctx.value.lineWidth = penWidth.value;
  ctx.value.beginPath();
  ctx.value.moveTo(lastX.value, lastY.value);
  ctx.value.lineTo(pos.x, pos.y);
  ctx.value.stroke();
  
  currentStroke.push({ x: pos.x, y: pos.y });
  lastX.value = pos.x;
  lastY.value = pos.y;
}

function stopDraw() {
  if (isDrawing.value && currentStroke.length > 0) {
    strokes.value.push([...currentStroke]);
  }
  isDrawing.value = false;
  currentStroke = [];
}

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent(
    e.type === 'touchstart' ? 'mousedown' :
    e.type === 'touchmove' ? 'mousemove' : 'mouseup',
    { clientX: touch.clientX, clientY: touch.clientY }
  );
  boardCanvas.value.dispatchEvent(mouseEvent);
}

function undo() {
  if (strokes.value.length > 0) {
    strokes.value.pop();
    redrawBoard();
  }
}

function clearBoard() {
  if (!ctx.value || !boardCanvas.value) return;
  ctx.value.clearRect(0, 0, boardCanvas.value.width, boardCanvas.value.height);
  strokes.value = [];
  aiFeedback.value = '';
}

function redrawBoard() {
  if (!ctx.value || !boardCanvas.value) return;
  ctx.value.clearRect(0, 0, boardCanvas.value.width, boardCanvas.value.height);
  
  strokes.value.forEach(stroke => {
    if (stroke.length < 2) return;
    ctx.value.strokeStyle = currentColor.value;
    ctx.value.lineWidth = penWidth.value;
    ctx.value.beginPath();
    ctx.value.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.value.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.value.stroke();
  });
}

// 将板书图片直接发送给"学生"AI（视觉模型）
async function askStudent() {
  if (!boardCanvas.value || thinking.value) return;
  if (strokes.value.length === 0) {
    aiFeedback.value = '请先在画板上书写或画图哦！';
    return;
  }

  thinking.value = true;
  aiFeedback.value = '';

  try {
    const imageData = boardCanvas.value.toDataURL('image/png');
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData,
        message: '请看看我在黑板上写的内容，像小学生一样回应我',
      }),
    });

    const data = await res.json();
    aiFeedback.value = data.reply || '小聪正在认真看你的板书...';
  } catch (err) {
    aiFeedback.value = `❌ 出错了: ${err.message}`;
  } finally {
    thinking.value = false;
  }
}

function submitBoard() {
  if (strokes.value.length === 0) {
    alert('请先在画板上书写内容');
    return;
  }
  askStudent();
}
</script>

<style scoped>
.whiteboard-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
}

.wb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.wb-header h2 {
  font-size: 20px;
}

.wb-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.color-options {
  display: flex;
  gap: 6px;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: var(--transition);
}

.color-dot.active {
  border-color: #333;
  transform: scale(1.2);
}

.wb-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  min-height: 0;
}

.canvas-wrapper {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.board-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  display: block;
}

.ocr-panel {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
}

.ocr-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.recognized-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.empty-ocr {
  color: var(--text-secondary);
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
}

.ai-speech {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.speech-avatar {
  font-size: 28px;
  flex-shrink: 0;
  animation: bounce-in 0.4s ease;
}

.speech-bubble {
  background: #F0F5FF;
  border-radius: 12px 12px 12px 2px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.7;
  animation: fade-up 0.35s ease;
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
