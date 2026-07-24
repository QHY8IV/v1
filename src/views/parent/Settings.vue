<template>
  <div class="parent-settings">
    <h2>⚙️ 系统设置</h2>
    
    <div class="settings-grid">
      <div class="setting-card">
        <h3>👤 学生信息</h3>
        <div class="form-group">
          <label>学生姓名</label>
          <input v-model="studentName" class="input" />
        </div>
        <div class="form-group">
          <label>年级</label>
          <select v-model="grade" class="input">
            <option value="1">一年级</option>
            <option value="2">二年级</option>
            <option value="3">三年级</option>
            <option value="4">四年级</option>
            <option value="5">五年级</option>
            <option value="6">六年级</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="saveStudentInfo">保存</button>
      </div>
      
      <div class="setting-card">
        <h3>📅 课表设置</h3>
        <div class="form-group">
          <label>每周最少课程数</label>
          <input type="number" v-model.number="minWeekly" class="input" min="1" max="7" />
        </div>
        <div class="form-group">
          <label>每节课时长（分钟）</label>
          <input type="number" v-model.number="lessonDuration" class="input" min="15" max="45" />
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="strictSchedule" /> 严格执行课表
          </label>
        </div>
        <button class="btn btn-primary" @click="saveScheduleSettings">保存</button>
      </div>
      
      <div class="setting-card">
        <h3>🔔 通知设置</h3>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="classReminder" /> 课前15分钟提醒
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="weeklyReport" /> 每周学习报告推送
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="achievementNotif" /> 获得徽章通知
          </label>
        </div>
        <button class="btn btn-primary" @click="saveNotifySettings">保存</button>
      </div>
      
      <div class="setting-card">
        <h3>🔐 账户安全</h3>
        <div class="form-group">
          <label>修改密码</label>
          <input type="password" v-model="newPassword" class="input" placeholder="输入新密码" />
        </div>
        <div class="form-group">
          <label>绑定微信</label>
          <button class="btn btn-outline btn-sm">扫码绑定</button>
        </div>
        <button class="btn btn-primary" @click="saveAccountSettings">保存</button>
      </div>
      
      <div class="setting-card danger-zone">
        <h3>⚠️ 危险操作</h3>
        <div class="danger-actions">
          <button class="btn btn-outline" @click="exportData">📤 导出数据</button>
          <button class="btn btn-danger btn-sm" @click="resetAll">🗑️ 重置所有数据</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const studentName = ref('小明');
const grade = ref('3');
const minWeekly = ref(2);
const lessonDuration = ref(25);
const strictSchedule = ref(true);
const classReminder = ref(true);
const weeklyReport = ref(true);
const achievementNotif = ref(true);
const newPassword = ref('');

function saveStudentInfo() { alert('学生信息已更新'); }
function saveScheduleSettings() { alert('课表设置已保存'); }
function saveNotifySettings() { alert('通知设置已保存'); }
function saveAccountSettings() { alert('账户设置已保存'); }
function exportData() { alert('数据导出功能开发中'); }
function resetAll() {
  if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
    alert('重置功能开发中');
  }
}
</script>

<style scoped>
.parent-settings h2 { font-size: 22px; margin-bottom: 20px; }

.settings-grid {
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

.form-group label { min-width: 140px; font-size: 14px; }

.form-group input[type="checkbox"] { margin-right: 8px; }

.danger-zone {
  border: 2px solid #FFE0E0;
}

.danger-actions {
  display: flex;
  gap: 12px;
}
</style>
