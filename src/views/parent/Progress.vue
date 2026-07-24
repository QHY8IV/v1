<template>
  <div class="parent-progress">
    <h2>📈 学习进度</h2>
    
    <div class="progress-overview">
      <div class="progress-card">
        <h4>知识点掌握情况</h4>
        <div class="progress-bars">
          <div v-for="item in knowledgePoints" :key="item.name" class="kb-item">
            <span class="kb-name">{{ item.name }}</span>
            <div class="kb-bar">
              <div class="kb-fill" :style="{ width: item.progress + '%', background: item.color }"></div>
            </div>
            <span class="kb-val">{{ item.progress }}%</span>
          </div>
        </div>
      </div>
      
      <div class="progress-card">
        <h4>能力雷达图</h4>
        <canvas ref="radarCanvas" width="300" height="300"></canvas>
      </div>
    </div>

    <div class="history-section">
      <h3>📋 课程历史</h3>
      <div class="history-table">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>知识点</th>
              <th>时长</th>
              <th>清晰度</th>
              <th>逻辑性</th>
              <th>完整性</th>
              <th>奖励</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td>{{ h.date }}</td>
              <td>{{ h.topic }}</td>
              <td>{{ h.duration }}</td>
              <td>{{ h.clearness }}%</td>
              <td>{{ h.logic }}%</td>
              <td>{{ h.completeness }}%</td>
              <td>+{{ h.reward }}元</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const knowledgePoints = ref([
  { name: '数与代数', progress: 75, color: '#4A90D9' },
  { name: '几何图形', progress: 60, color: '#FF8C42' },
  { name: '测量单位', progress: 85, color: '#52C41A' },
  { name: '数据分析', progress: 45, color: '#722ED1' }
]);

const history = ref([
  { id: 1, date: '2026-07-22', topic: '长方形面积', duration: '25min', clearness: 85, logic: 78, completeness: 82, reward: '1.00' },
  { id: 2, date: '2026-07-21', topic: '分数加减', duration: '25min', clearness: 80, logic: 82, completeness: 75, reward: '1.00' },
  { id: 3, date: '2026-07-20', topic: '小数乘法', duration: '25min', clearness: 90, logic: 88, completeness: 85, reward: '1.00' },
  { id: 4, date: '2026-07-19', topic: '认识周长', duration: '25min', clearness: 78, logic: 72, completeness: 80, reward: '1.00' },
  { id: 5, date: '2026-07-18', topic: '面积单位', duration: '25min', clearness: 82, logic: 80, completeness: 78, reward: '1.00' }
]);

const radarCanvas = ref(null);

onMounted(() => {
  nextTick(() => {
    drawRadarChart();
  });
});

function drawRadarChart() {
  if (!radarCanvas.value) return;
  const ctx = radarCanvas.value.getContext('2d');
  const cx = 150, cy = 150, r = 100;
  
  ctx.clearRect(0, 0, 300, 300);
  
  const labels = ['清晰度', '逻辑性', '完整性', '自信心', '主动性'];
  const values = [0.85, 0.78, 0.82, 0.70, 0.65];
  const n = labels.length;
  
  // 绘制网格
  for (let level = 1; level <= 5; level++) {
    const radius = (r / 5) * level;
    ctx.strokeStyle = '#E0E0E0';
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // 绘制轴线
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    ctx.strokeStyle = '#DDD';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.stroke();
    
    // 标签
    const lx = cx + (r + 25) * Math.cos(angle);
    const ly = cy + (r + 25) * Math.sin(angle);
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], lx, ly);
  }
  
  // 绘制数据
  ctx.fillStyle = 'rgba(74, 144, 217, 0.3)';
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = (Math.PI * 2 / n) * idx - Math.PI / 2;
    const val = values[idx] * r;
    const x = cx + val * Math.cos(angle);
    const y = cy + val * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fill();
  ctx.stroke();
  
  // 数据点
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    const val = values[i] * r;
    const x = cx + val * Math.cos(angle);
    const y = cy + val * Math.sin(angle);
    ctx.fillStyle = '#4A90D9';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
</script>

<style scoped>
.parent-progress h2 {
  font-size: 22px;
  margin-bottom: 20px;
}

.progress-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.progress-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.progress-card h4 {
  margin-bottom: 16px;
  font-size: 16px;
}

.kb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 14px;
}

.kb-name { min-width: 80px; }

.kb-bar {
  flex: 1;
  height: 10px;
  background: #F0F0F0;
  border-radius: 5px;
  overflow: hidden;
}

.kb-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.kb-val { min-width: 40px; text-align: right; font-weight: 500; }

.history-section {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.history-section h3 {
  margin-bottom: 16px;
  font-size: 16px;
}

.history-table {
  overflow-x: auto;
}

.history-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.history-table th, .history-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.history-table th {
  background: #F8F9FA;
  font-weight: 600;
  color: var(--text-secondary);
}

.history-table tr:hover { background: #FAFAFA; }
</style>
