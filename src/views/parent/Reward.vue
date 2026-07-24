<template>
  <div class="parent-reward">
    <h2>🏆 奖励管理</h2>
    
    <div class="reward-settings">
      <div class="setting-card">
        <h3>奖励规则</h3>
        <div class="form-group">
          <label>每节有效课奖励（元）</label>
          <input type="number" v-model.number="rewardPerLesson" class="input" min="0.5" max="5" step="0.5" />
        </div>
        <div class="form-group">
          <label>连续打卡额外奖励（元/天）</label>
          <input type="number" v-model.number="streakBonus" class="input" min="0" max="5" step="0.5" />
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="autoReward" /> 自动发放奖励
          </label>
        </div>
        <button class="btn btn-primary" @click="saveRewardSettings">保存设置</button>
      </div>
      
      <div class="setting-card">
        <h3>徽章管理</h3>
        <div class="badge-rules">
          <div v-for="badge in badgeRules" :key="badge.id" class="badge-rule">
            <span class="badge-icon">{{ badge.icon }}</span>
            <div>
              <div class="badge-name">{{ badge.name }}</div>
              <div class="badge-condition">{{ badge.condition }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const rewardPerLesson = ref(1);
const streakBonus = ref(0.5);
const autoReward = ref(true);

const badgeRules = ref([
  { id: 1, icon: '🌟', name: '首次讲课', condition: '完成第一节课' },
  { id: 2, icon: '🔥', name: '七日打卡', condition: '连续7天上课' },
  { id: 3, icon: '🏅', name: '十课达人', condition: '完成10节课' },
  { id: 4, icon: '💎', name: '三十日坚持', condition: '连续30天上课' },
  { id: 5, icon: '👑', name: '金牌讲师', condition: '完成50节课' }
]);

function saveRewardSettings() {
  alert('奖励设置已保存！');
}
</script>

<style scoped>
.parent-reward h2 { font-size: 22px; margin-bottom: 20px; }

.reward-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.setting-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.setting-card h3 {
  font-size: 16px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-group label { min-width: 160px; font-size: 14px; }

.badge-rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.badge-rule {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #F8F9FA;
  border-radius: 8px;
}

.badge-icon { font-size: 28px; }

.badge-name { font-weight: 500; font-size: 14px; }
.badge-condition { font-size: 12px; color: var(--text-secondary); }
</style>
