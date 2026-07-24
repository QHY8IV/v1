<template>
  <div class="parent-dashboard">
    <!-- 概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card" style="background: linear-gradient(135deg, #667eea, #764ba2);">
        <span class="card-icon">📚</span>
        <div>
          <div class="card-value">{{ stats.totalLessons }}</div>
          <div class="card-label">总课程数</div>
        </div>
      </div>
      <div class="overview-card" style="background: linear-gradient(135deg, #f093fb, #f5576c);">
        <span class="card-icon">🔥</span>
        <div>
          <div class="card-value">{{ stats.streakDays }}</div>
          <div class="card-label">连续打卡（天）</div>
        </div>
      </div>
      <div class="overview-card" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
        <span class="card-icon">💰</span>
        <div>
          <div class="card-value">{{ stats.creditBalance }}</div>
          <div class="card-label">课时余额</div>
        </div>
      </div>
      <div class="overview-card" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
        <span class="card-icon">⭐</span>
        <div>
          <div class="card-value">{{ stats.avgScore }}%</div>
          <div class="card-label">平均质量</div>
        </div>
      </div>
    </div>

    <!-- 学习趋势图表 -->
    <div class="chart-section">
      <h3>📈 学习趋势（近7天）</h3>
      <div class="chart-placeholder">
        <canvas ref="trendChart" width="800" height="300"></canvas>
      </div>
    </div>

    <!-- 本周课程安排 -->
    <div class="week-section">
      <h3>📅 本周课程</h3>
      <div class="week-table">
        <table>
          <thead>
            <tr>
              <th>星期</th>
              <th>时间</th>
              <th>知识点</th>
              <th>状态</th>
              <th>质量评分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lesson in weekLessons" :key="lesson.id">
              <td>{{ lesson.day }}</td>
              <td>{{ lesson.time }}</td>
              <td>{{ lesson.topic }}</td>
              <td>
                <span class="badge" :class="lesson.statusClass">{{ lesson.statusText }}</span>
              </td>
              <td>{{ lesson.score }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 最近评价 -->
    <div class="recent-section">
      <h3>💬 最近 AI 评价</h3>
      <div class="comments-list">
        <div v-for="comment in recentComments" :key="comment.id" class="comment-card">
          <div class="comment-date">{{ comment.date }}</div>
          <div class="comment-topic">{{ comment.topic }}</div>
          <div class="comment-text">{{ comment.text }}</div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="actions-section">
      <h3>⚡ 快捷操作</h3>
      <div class="action-buttons">
        <router-link to="/parent/schedule" class="action-btn">
          <span class="action-icon">📅</span>
          <span>调整课表</span>
        </router-link>
        <router-link to="/parent/payment" class="action-btn">
          <span class="action-icon">💳</span>
          <span>课时充值</span>
        </router-link>
        <router-link to="/parent/progress" class="action-btn">
          <span class="action-icon">📊</span>
          <span>学习报告</span>
        </router-link>
        <router-link to="/parent/settings" class="action-btn">
          <span class="action-icon">⚙️</span>
          <span>系统设置</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const stats = ref({
  totalLessons: 23,
  streakDays: 7,
  creditBalance: 50,
  avgScore: 82
});

const weekLessons = ref([
  { id: 1, day: '周一', time: '09:00', topic: '长方形面积', statusText: '已完成', statusClass: 'badge-success', score: 85 },
  { id: 2, day: '周二', time: '14:00', topic: '分数加减', statusText: '已完成', statusClass: 'badge-success', score: 78 },
  { id: 3, day: '周三', time: '10:00', topic: '小数乘法', statusText: '已完成', statusClass: 'badge-success', score: 90 },
  { id: 4, day: '周四', time: '09:00', topic: '周长计算', statusText: '已完成', statusClass: 'badge-success', score: 82 },
  { id: 5, day: '周五', time: '15:00', topic: '认识分数', statusText: '待上课', statusClass: 'badge-warning', score: '-' },
  { id: 6, day: '周六', time: '10:00', topic: '面积单位', statusText: '待上课', statusClass: 'badge-warning', score: '-' }
]);

const recentComments = ref([
  { id: 1, date: '2026-07-22', topic: '长方形面积', text: '讲解非常清晰，步骤完整，单位标注正确。建议下次在开头先写出公式再代入数字。' },
  { id: 2, date: '2026-07-21', topic: '分数加减', text: '思路正确，通分方法掌握得很好。计算环节偶尔有小失误，注意检查。' },
  { id: 3, date: '2026-07-20', topic: '小数乘法', text: '表现优秀！能用自己的话解释计算方法，理解很到位。' }
]);

const trendChart = ref(null);

onMounted(() => {
  nextTick(() => {
    drawTrendChart();
  });
});

function drawTrendChart() {
  if (!trendChart.value) return;
  const ctx = trendChart.value.getContext('2d');
  const w = trendChart.value.width;
  const h = trendChart.value.height;
  
  // 清除
  ctx.clearRect(0, 0, w, h);
  
  // 背景
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, w, h);
  
  // 数据
  const data = [75, 80, 78, 85, 82, 90, 88];
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  
  // Y轴刻度
  ctx.fillStyle = '#999';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH - (i * chartH / 4);
    const val = 60 + i * 10;
    ctx.fillText(val + '', padding.left - 10, y + 4);
    // 网格线
    ctx.strokeStyle = '#EEE';
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }
  
  // 折线
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - 60) / 40) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // 数据点
  ctx.fillStyle = '#4A90D9';
  data.forEach((val, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - 60) / 40) * chartH;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    // 值
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(val + '%', x, y - 12);
    ctx.fillStyle = '#4A90D9';
  });
  
  // X轴标签
  ctx.fillStyle = '#666';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  days.forEach((day, i) => {
    const x = padding.left + (i / (days.length - 1)) * chartW;
    ctx.fillText(day, x, h - 10);
  });
  
  // 标题
  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('讲课质量趋势', padding.left, 18);
}
</script>

<style scoped>
.parent-dashboard {
  max-width: 1000px;
  margin: 0 auto;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  border-radius: var(--radius-md);
  padding: 20px;
  color: white;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-md);
}

.card-icon { font-size: 36px; }
.card-value { font-size: 28px; font-weight: 700; }
.card-label { font-size: 13px; opacity: 0.9; }

.chart-section, .week-section, .recent-section, .actions-section {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

h3 {
  font-size: 16px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.chart-placeholder {
  width: 100%;
  overflow-x: auto;
}

.chart-placeholder canvas {
  max-width: 100%;
  height: auto;
}

.week-table {
  overflow-x: auto;
}

.week-table table {
  width: 100%;
  border-collapse: collapse;
}

.week-table th, .week-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.week-table th {
  background: #F8F9FA;
  font-weight: 600;
  color: var(--text-secondary);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-card {
  padding: 16px;
  background: #F8F9FA;
  border-radius: var(--radius-sm);
}

.comment-date {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.comment-topic {
  font-weight: 600;
  margin-bottom: 6px;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #F8F9FA;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-primary);
  transition: var(--transition);
  font-size: 14px;
}

.action-btn:hover {
  background: #E8F0FE;
  transform: translateY(-2px);
}

.action-icon { font-size: 28px; }
</style>
