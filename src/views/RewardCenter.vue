<template>
  <div class="reward-page">
    <div class="reward-hero">
      <div class="hero-content">
        <h2>🏆 奖励中心</h2>
        <p>坚持学习，收获满满！</p>
      </div>
      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-number">{{ userStore.totalEarned }}</span>
          <span class="stat-desc">累计获得（元）</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ userStore.creditBalance }}</span>
          <span class="stat-desc">课时余额（元）</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ userStore.streakDays }}</span>
          <span class="stat-desc">连续打卡（天）</span>
        </div>
      </div>
    </div>

    <!-- 成就徽章 -->
    <div class="section">
      <h3 class="section-title">🎖️ 我的徽章</h3>
      <div class="badges-grid">
        <div
          v-for="badge in badges"
          :key="badge.id"
          class="badge-card"
          :class="{ earned: badge.earned, locked: !badge.earned }"
        >
          <div class="badge-icon">{{ badge.earned ? badge.icon : '🔒' }}</div>
          <div class="badge-name">{{ badge.name }}</div>
          <div class="badge-desc">{{ badge.description }}</div>
        </div>
      </div>
    </div>

    <!-- 奖励记录 -->
    <div class="section">
      <h3 class="section-title">📋 奖励记录</h3>
      <div class="records-list">
        <div
          v-for="record in rewardRecords"
          :key="record.id"
          class="record-item"
        >
          <div class="record-icon">{{ record.icon }}</div>
          <div class="record-info">
            <div class="record-title">{{ record.title }}</div>
            <div class="record-time">{{ record.time }}</div>
          </div>
          <div class="record-amount positive">+{{ record.amount }}元</div>
        </div>
      </div>
    </div>

    <!-- 提现 -->
    <div class="section">
      <div class="withdraw-card">
        <h3>💰 课时提现</h3>
        <p>累计奖励可随时提现到微信</p>
        <div class="withdraw-actions">
          <div class="withdraw-amount">
            <span>可提现金额：</span>
            <strong>{{ userStore.totalEarned }} 元</strong>
          </div>
          <button class="btn btn-accent" @click="withdraw">立即提现</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const badges = [
  { id: 1, icon: '🌟', name: '首次讲课', description: '完成第一节课', earned: true },
  { id: 2, icon: '🔥', name: '七日打卡', description: '连续7天上课', earned: true },
  { id: 3, icon: '🏅', name: '十课达人', description: '完成10节课', earned: true },
  { id: 4, icon: '💎', name: '三十日坚持', description: '连续30天上课', earned: false },
  { id: 5, icon: '👑', name: '金牌讲师', description: '完成50节课', earned: false },
  { id: 6, icon: '🎯', name: '满分讲师', description: '单次讲课质量100%', earned: false }
];

const rewardRecords = [
  { id: 1, icon: '📖', title: '完成「长方形面积」课程', time: '2026-07-22 14:30', amount: '1.00' },
  { id: 2, icon: '📖', title: '完成「分数加减法」课程', time: '2026-07-21 09:15', amount: '1.00' },
  { id: 3, icon: '🔥', title: '连续打卡第7天奖励', time: '2026-07-21 09:00', amount: '0.50' },
  { id: 4, icon: '📖', title: '完成「小数乘法」课程', time: '2026-07-20 16:00', amount: '1.00' },
  { id: 5, icon: '📖', title: '完成「认识周长」课程', time: '2026-07-19 10:00', amount: '1.00' }
];

function withdraw() {
  if (userStore.totalEarned <= 0) {
    alert('暂无可提现金额');
    return;
  }
  alert(`提现 ${userStore.totalEarned} 元到微信（功能开发中）`);
}
</script>

<style scoped>
.reward-page {
  max-width: 900px;
  margin: 0 auto;
}

.reward-hero {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border-radius: var(--radius-lg);
  padding: 32px;
  color: white;
  margin-bottom: 24px;
  text-align: center;
}

.hero-content h2 {
  font-size: 28px;
  margin-bottom: 8px;
}

.hero-content p {
  font-size: 16px;
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 24px;
}

.stat-card {
  background: rgba(255,255,255,0.2);
  border-radius: var(--radius-md);
  padding: 16px 24px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.stat-number {
  display: block;
  font-size: 32px;
  font-weight: 700;
}

.stat-desc {
  font-size: 13px;
  opacity: 0.9;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.badge-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.badge-card.earned {
  border: 2px solid #FFD700;
}

.badge-card.locked {
  opacity: 0.5;
}

.badge-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.badge-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.badge-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.badge-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.records-list {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
  transition: var(--transition);
}

.record-item:last-child { border-bottom: none; }
.record-item:hover { background: #FAFAFA; }

.record-icon { font-size: 24px; }

.record-info { flex: 1; }

.record-title {
  font-size: 14px;
  font-weight: 500;
}

.record-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.record-amount {
  font-weight: 600;
  color: var(--success);
  font-size: 15px;
}

.withdraw-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  text-align: center;
}

.withdraw-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.withdraw-card p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.withdraw-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.withdraw-amount {
  font-size: 16px;
}

.withdraw-amount strong {
  color: var(--accent);
  font-size: 24px;
}
</style>
