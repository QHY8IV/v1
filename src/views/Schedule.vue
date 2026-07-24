<template>
  <div class="schedule-page">
    <div class="schedule-header">
      <h2>📅 我的课表</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        + 添加课程
      </button>
    </div>

    <!-- 周视图 -->
    <div class="week-view" v-if="!loading">
      <div class="week-days">
        <div
          v-for="(day, index) in weekDays"
          :key="index"
          class="day-column"
          :class="{ today: day.isToday }"
        >
          <div class="day-header">
            <span class="day-name">{{ day.name }}</span>
            <span class="day-date">{{ day.date }}</span>
          </div>
          <div class="day-lessons">
            <div
              v-for="lesson in day.lessons"
              :key="lesson.id"
              class="mini-lesson"
              :style="{ borderColor: lesson.color }"
            >
              <div class="mini-lesson-time">{{ lesson.time }}</div>
              <div class="mini-lesson-title">{{ lesson.title }}</div>
              <div class="mini-lesson-actions">
                <button class="icon-btn" @click="editLesson(lesson)">✏️</button>
                <button class="icon-btn" @click="deleteLesson(lesson.id)">🗑️</button>
              </div>
            </div>
            <div v-if="day.lessons.length === 0" class="no-lessons">
              暂无课程
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-else class="loading-state">
      <p>加载中...</p>
    </div>

    <!-- 添加/编辑课程弹窗 -->
    <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
      <div class="modal">
        <h3>{{ editingLesson ? '编辑课程' : '添加新课程' }}</h3>
        <div class="form-group">
          <label>课程名称</label>
          <input v-model="form.title" class="input" placeholder="例如：分数加减法" />
        </div>
        <div class="form-group">
          <label>知识点</label>
          <input v-model="form.topic" class="input" placeholder="例如：人教版三年级上册" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>星期</label>
            <select v-model="form.dayOfWeek" class="input">
              <option value="1">周一</option>
              <option value="2">周二</option>
              <option value="3">周三</option>
              <option value="4">周四</option>
              <option value="5">周五</option>
              <option value="6">周六</option>
              <option value="0">周日</option>
            </select>
          </div>
          <div class="form-group">
            <label>上课时间</label>
            <input v-model="form.time" type="time" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>颜色标记</label>
          <div class="color-picker">
            <span
              v-for="color in colors"
              :key="color"
              class="color-option"
              :class="{ selected: form.color === color }"
              :style="{ background: color }"
              @click="form.color = color"
            ></span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showAddModal = false">取消</button>
          <button class="btn btn-primary" @click="saveLesson">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';

const loading = ref(true);

const showAddModal = ref(false);
const editingLesson = ref(null);

const scheduleData = ref([
  { id: 1, title: '分数加减法', topic: '三年级', dayOfWeek: 1, time: '09:00', color: '#4A90D9' },
  { id: 2, title: '长方形面积', topic: '三年级', dayOfWeek: 1, time: '14:00', color: '#FF8C42' },
  { id: 3, title: '小数乘法', topic: '三年级', dayOfWeek: 3, time: '10:00', color: '#52C41A' },
  { id: 4, title: '周长计算', topic: '三年级', dayOfWeek: 4, time: '09:00', color: '#722ED1' },
  { id: 5, title: '认识分数', topic: '三年级', dayOfWeek: 5, time: '15:00', color: '#13C2C2' }
]);

const colors = ['#4A90D9', '#FF8C42', '#52C41A', '#722ED1', '#13C2C2', '#EB2F96'];

const form = ref({
  title: '',
  topic: '',
  dayOfWeek: '1',
  time: '09:00',
  color: '#4A90D9'
});

const weekDays = computed(() => {
  const today = dayjs();
  const monday = today.startOf('week');
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = monday.add(i, 'day');
    const isToday = date.isSame(today, 'day');
    
    // 模拟课程数据
    const lessons = scheduleData.filter(l => l.dayOfWeek === i);
    
    return {
      name: names[i],
      date: date.format('MM/DD'),
      isToday,
      lessons
    };
  });
});

onMounted(() => {
  // Simulate data loading
  setTimeout(() => {
    loading.value = false;
  }, 100);
});

function editLesson(lesson) {
  editingLesson.value = lesson;
  form.value = { ...lesson };
  showAddModal.value = true;
}

function deleteLesson(id) {
  if (confirm('确定要删除这节课吗？')) {
    scheduleData.value = scheduleData.value.filter(l => l.id !== id);
  }
}

function saveLesson() {
  if (!form.value.title) {
    alert('请输入课程名称');
    return;
  }
  
  if (editingLesson.value) {
    const idx = scheduleData.value.findIndex(l => l.id === editingLesson.value.id);
    if (idx !== -1) {
      scheduleData.value[idx] = { ...form.value, id: editingLesson.value.id };
    }
    editingLesson.value = null;
  } else {
    scheduleData.value.push({
      ...form.value,
      id: Date.now(),
      dayOfWeek: parseInt(form.value.dayOfWeek)
    });
  }
  
  showAddModal.value = false;
  resetForm();
}

function resetForm() {
  form.value = {
    title: '',
    topic: '',
    dayOfWeek: '1',
    time: '09:00',
    color: '#4A90D9'
  };
}
</script>

<style scoped>
.schedule-page {
  max-width: 1100px;
  margin: 0 auto;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.schedule-header h2 {
  font-size: 22px;
}

.week-view {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
}

.week-days {
  display: flex;
  min-width: 900px;
}

.day-column {
  flex: 1;
  min-width: 120px;
  border-right: 1px solid var(--border-color);
}

.day-column.today {
  background: #F0F5FF;
}

.day-header {
  padding: 12px 8px;
  text-align: center;
  border-bottom: 2px solid var(--border-color);
  font-size: 13px;
}

.day-column.today .day-header {
  border-bottom-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.day-name {
  display: block;
  font-weight: 500;
}

.day-date {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 2px;
}

.day-lessons {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 150px;
}

.mini-lesson {
  padding: 8px;
  border-radius: 6px;
  border-left: 3px solid;
  background: #FAFAFA;
  font-size: 12px;
  position: relative;
}

.mini-lesson-time {
  font-weight: 600;
  color: var(--text-primary);
}

.mini-lesson-title {
  color: var(--text-secondary);
  margin-top: 2px;
}

.mini-lesson-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: var(--transition);
}

.mini-lesson:hover .mini-lesson-actions {
  opacity: 1;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  border-radius: 4px;
}
.icon-btn:hover { background: rgba(0,0,0,0.05); }

.no-lessons {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 20px 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-secondary);
  font-size: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.color-picker {
  display: flex;
  gap: 8px;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: var(--transition);
}

.color-option.selected {
  border-color: #333;
  transform: scale(1.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
