<template>
  <div class="parent-schedule">
    <div class="ps-header">
      <h2>📅 课表管理</h2>
      <button class="btn btn-primary" @click="showAddModal = true">+ 添加课程</button>
    </div>

    <div class="ps-body">
      <div class="week-grid">
        <div
          v-for="day in weekDays"
          :key="day.name"
          class="day-card"
        >
          <div class="day-name">{{ day.name }}</div>
          <div class="day-lessons">
            <div
              v-for="lesson in day.lessons"
              :key="lesson.id"
              class="lesson-item"
              :style="{ borderLeftColor: lesson.color }"
            >
              <div class="lesson-time">{{ lesson.time }}</div>
              <div class="lesson-detail">
                <div class="lesson-title">{{ lesson.title }}</div>
                <div class="lesson-topic">{{ lesson.topic }}</div>
              </div>
              <div class="lesson-edit">
                <button class="mini-btn" @click="editLesson(lesson)">✏️</button>
                <button class="mini-btn danger" @click="removeLesson(lesson.id)">❌</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加课程弹窗 -->
    <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
      <div class="modal">
        <h3>添加课程</h3>
        <div class="form-group">
          <label>知识点</label>
          <input v-model="newLesson.title" class="input" placeholder="例如：长方形面积" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>星期</label>
            <select v-model="newLesson.day" class="input">
              <option value="周一">周一</option>
              <option value="周二">周二</option>
              <option value="周三">周三</option>
              <option value="周四">周四</option>
              <option value="周五">周五</option>
              <option value="周六">周六</option>
              <option value="周日">周日</option>
            </select>
          </div>
          <div class="form-group">
            <label>时间</label>
            <input v-model="newLesson.time" type="time" class="input" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showAddModal = false">取消</button>
          <button class="btn btn-primary" @click="addLesson">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const showAddModal = ref(false);
const newLesson = ref({ title: '', day: '周一', time: '09:00' });

const weekDays = ref([
  { name: '周一', lessons: [
    { id: 1, title: '长方形面积', topic: '三年级', time: '09:00', color: '#4A90D9' }
  ]},
  { name: '周二', lessons: [
    { id: 2, title: '分数加减', topic: '三年级', time: '14:00', color: '#FF8C42' }
  ]},
  { name: '周三', lessons: [] },
  { name: '周四', lessons: [] },
  { name: '周五', lessons: [] },
  { name: '周六', lessons: [] },
  { name: '周日', lessons: [] }
]);

function addLesson() {
  if (!newLesson.value.title) return;
  const dayObj = weekDays.value.find(d => d.name === newLesson.value.day);
  if (dayObj) {
    dayObj.lessons.push({
      id: Date.now(),
      title: newLesson.value.title,
      topic: '自定义',
      time: newLesson.value.time,
      color: '#4A90D9'
    });
  }
  showAddModal.value = false;
  newLesson.value = { title: '', day: '周一', time: '09:00' };
}

function removeLesson(id) {
  weekDays.value.forEach(day => {
    day.lessons = day.lessons.filter(l => l.id !== id);
  });
}

function editLesson(lesson) {
  alert('编辑功能：' + lesson.title);
}
</script>

<style scoped>
.ps-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.ps-body {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
}

.week-grid {
  display: flex;
  gap: 12px;
  min-width: 800px;
}

.day-card {
  flex: 1;
  min-width: 100px;
}

.day-name {
  font-weight: 600;
  text-align: center;
  padding: 8px;
  background: #F0F5FF;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
}

.day-lessons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100px;
}

.lesson-item {
  padding: 8px;
  border-radius: 6px;
  border-left: 3px solid;
  background: #FAFAFA;
  font-size: 12px;
  position: relative;
}

.lesson-time {
  font-weight: 600;
}

.lesson-detail {
  margin-top: 2px;
}

.lesson-title { font-weight: 500; }
.lesson-topic { color: var(--text-secondary); font-size: 11px; }

.lesson-edit {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: var(--transition);
}

.lesson-item:hover .lesson-edit { opacity: 1; }

.mini-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
}

.mini-btn.danger:hover { color: red; }

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group { flex: 1; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
