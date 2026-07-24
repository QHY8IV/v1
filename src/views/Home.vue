<template>
  <div class="home-page">
    <!-- 欢迎卡片 -->
    <div class="welcome-card">
      <div class="welcome-text">
        <h1>你好，{{ userStore.studentName }}！👋</h1>
        <p>今天也要当一回小老师哦～</p>
        <div class="quick-stats">
          <div class="stat-item">
            <span class="stat-value">{{ userStore.streakDays }}</span>
            <span class="stat-label">连续打卡</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStore.totalLessons }}</span>
            <span class="stat-label">已完成课程</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStore.creditBalance }}</span>
            <span class="stat-label">课时余额</span>
          </div>
        </div>
      </div>
      <div class="welcome-illustration">
        <div class="illustration-circle">📚</div>
      </div>
    </div>

    <!-- 今日课表 -->
    <div class="section">
      <div class="section-header">
        <h3>📅 今日课表</h3>
        <router-link to="/schedule" class="view-all">查看全部 ›</router-link>
      </div>
      <div class="today-schedule" v-if="todayLessons.length > 0">
        <div
          v-for="lesson in todayLessons"
          :key="lesson.id"
          class="lesson-card"
          :class="{ upcoming: lesson.status === 'upcoming', completed: lesson.status === 'completed', current: lesson.status === 'current' }"
        >
          <div class="lesson-time">{{ lesson.time }}</div>
          <div class="lesson-info">
            <div class="lesson-title">{{ lesson.title }}</div>
            <div class="lesson-topic">{{ lesson.topic }}</div>
          </div>
          <div class="lesson-status">
            <span v-if="lesson.status === 'completed'" class="badge badge-success">✓ 已完成</span>
            <span v-else-if="lesson.status === 'current'" class="badge badge-primary">● 进行中</span>
            <span v-else class="badge badge-warning">○ 待上课</span>
          </div>
          <button
            v-if="lesson.status === 'upcoming' || lesson.status === 'current'"
            class="btn btn-primary btn-sm"
            @click="enterClassroom(lesson)"
          >
            进入课堂
          </button>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>今天没有安排课程哦～</p>
        <router-link to="/schedule" class="btn btn-outline btn-sm">去设置课表</router-link>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="section">
      <h3 class="section-title">⚡ 快捷入口</h3>
      <div class="quick-actions">
        <router-link to="/classroom" class="action-card">
          <span class="action-icon">📖</span>
          <span class="action-label">开始讲课</span>
        </router-link>
        <router-link to="/whiteboard" class="action-card">
          <span class="action-icon">✏️</span>
          <span class="action-label">手写板书</span>
        </router-link>
        <router-link to="/reward" class="action-card">
          <span class="action-icon">🏆</span>
          <span class="action-label">奖励中心</span>
        </router-link>
        <router-link to="/schedule" class="action-card">
          <span class="action-icon">📅</span>
          <span class="action-label">我的课表</span>
        </router-link>
      </div>
    </div>

    <!-- 学习建议 -->
    <div class="section">
      <h3 class="section-title">💡 学习小贴士</h3>
      <div class="tip-card">
        <p>{{ currentTip }}</p>
        <button class="btn btn-sm" @click="nextTip" style="margin-top: 10px;">换一个 💫</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const tips = [
  '费曼学习法：能把知识讲给别人听，才是真正学会了！',
  '先独立思考，再请教别人，这样记忆更深刻。',
  '每天坚持25分钟，比一次学3小时更有效。',
  '出错不可怕，找出错误原因才能进步哦！',
  '讲题时要用自己的话，不要死记硬背。',
  '草稿纸要整洁，步骤要清晰，这是好习惯。'
];

const currentTip = ref(tips[0]);

const todayLessons = ref([
  { id: 1, time: '09:00', title: '数学课', topic: '分数的加减法', status: 'completed' },
  { id: 2, time: '14:00', title: '数学课', topic: '长方形面积计算', status: 'current' },
  { id: 3, time: '16:00', title: '数学课', topic: '小数乘法', status: 'upcoming' }
]);

function nextTip() {
  const idx = tips.indexOf(currentTip.value);
  currentTip.value = tips[(idx + 1) % tips.length];
}

function enterClassroom(lesson) {
  router.push('/classroom');
}
</script>

<style scoped>
.home-page {
  max-width: 900px;
  margin: 0 auto;
}

.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-lg);
  padding: 32px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
}

.welcome-text h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.welcome-text p {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 20px;
}

.quick-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  opacity: 0.8;
}

.welcome-illustration {
  font-size: 80px;
  animation: float 3s ease-in-out infinite;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.view-all {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
}
.view-all:hover { text-decoration: underline; }

.today-schedule {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lesson-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.lesson-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.lesson-card.current {
  border-left: 4px solid var(--primary);
}

.lesson-card.completed {
  opacity: 0.7;
}

.lesson-time {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
  min-width: 60px;
}

.lesson-info {
  flex: 1;
}

.lesson-title {
  font-size: 16px;
  font-weight: 500;
}

.lesson-topic {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.lesson-status {
  margin-right: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.empty-state p {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  color: var(--text-primary);
  transition: var(--transition);
}

.action-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.action-icon {
  font-size: 36px;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
}

.tip-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
