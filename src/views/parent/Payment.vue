<template>
  <div class="parent-payment">
    <h2>💳 课时充值</h2>
    
    <div class="balance-card">
      <div class="balance-label">当前课时余额</div>
      <div class="balance-amount">{{ userStore.creditBalance }} 元</div>
      <div class="balance-tip">建议充值 50-100 元即可长期使用</div>
    </div>

    <div class="packages">
      <h3>充值套餐</h3>
      <div class="package-grid">
        <div class="package-card" @click="selectPackage(50)">
          <div class="package-amount">50元</div>
          <div class="package-detail">约25节课</div>
          <div class="package-tag">入门体验</div>
        </div>
        <div class="package-card recommended" @click="selectPackage(100)">
          <div class="package-amount">100元</div>
          <div class="package-detail">约50节课</div>
          <div class="package-tag">推荐套餐</div>
        </div>
        <div class="package-card" @click="selectPackage(200)">
          <div class="package-amount">200元</div>
          <div class="package-detail">约100节课</div>
          <div class="package-tag">最长周期</div>
        </div>
      </div>
    </div>

    <div class="transaction-history">
      <h3>交易记录</h3>
      <div class="tx-list">
        <div v-for="tx in transactions" :key="tx.id" class="tx-item">
          <div class="tx-info">
            <div class="tx-title">{{ tx.title }}</div>
            <div class="tx-time">{{ tx.time }}</div>
          </div>
          <div class="tx-amount" :class="tx.positive ? 'positive' : 'negative'">
            {{ tx.positive ? '+' : '-' }}{{ tx.amount }}元
          </div>
        </div>
      </div>
    </div>

    <div class="refund-notice">
      <p>ℹ️ 余额随时可退，无捆绑、无套路、无手续费</p>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user';
const userStore = useUserStore();

const transactions = [
  { id: 1, title: '课时充值', time: '2026-07-15 10:00', amount: '100', positive: true },
  { id: 2, title: '完成课程奖励', time: '2026-07-22 14:30', amount: '1', positive: true },
  { id: 3, title: '课时消耗', time: '2026-07-22 14:30', amount: '2', positive: false },
  { id: 4, title: '课时消耗', time: '2026-07-21 09:15', amount: '2', positive: false }
];

function selectPackage(amount) {
  if (confirm(`确认充值 ${amount} 元？\n（微信支付功能开发中）`)) {
    alert('支付功能开发中，敬请期待！');
  }
}
</script>

<style scoped>
.parent-payment h2 { font-size: 22px; margin-bottom: 20px; }

.balance-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: var(--radius-lg);
  padding: 32px;
  color: white;
  text-align: center;
  margin-bottom: 24px;
}

.balance-label { font-size: 16px; opacity: 0.9; }
.balance-amount { font-size: 48px; font-weight: 700; margin: 12px 0; }
.balance-tip { font-size: 13px; opacity: 0.7; }

.packages h3, .transaction-history h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.package-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: var(--transition);
  border: 2px solid transparent;
}

.package-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary);
}

.package-card.recommended {
  border-color: var(--accent);
  position: relative;
}

.package-amount {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.package-detail {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
}

.package-tag {
  display: inline-block;
  padding: 4px 12px;
  background: #FFF7E8;
  color: #D48806;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tx-list {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
}

.tx-item:last-child { border-bottom: none; }

.tx-title { font-weight: 500; font-size: 14px; }
.tx-time { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

.tx-amount { font-weight: 600; font-size: 15px; }
.tx-amount.positive { color: var(--success); }
.tx-amount.negative { color: var(--text-secondary); }

.refund-notice {
  margin-top: 16px;
  padding: 12px 16px;
  background: #F0F5FF;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--primary);
}
</style>
