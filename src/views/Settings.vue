<template>
  <div class="settings-page">
    <div class="settings-section">
      <h3>👤 学生信息</h3>
      <div class="form-group">
        <label>姓名</label>
        <input v-model="userStore.studentName" class="input" />
      </div>
      <div class="form-group">
        <label>年级</label>
        <select v-model="userStore.grade" class="input">
          <option value="1">一年级</option>
          <option value="2">二年级</option>
          <option value="3">三年级</option>
          <option value="4">四年级</option>
          <option value="5">五年级</option>
          <option value="6">六年级</option>
        </select>
      </div>
    </div>

    <div class="settings-section">
      <h3>🎨 外观设置</h3>
      <div class="form-group">
        <label>Live2D 角色大小</label>
        <input type="range" min="0.5" max="2" step="0.1" v-model="characterScale" />
        <span>{{ characterScale }}x</span>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="showHints" /> 显示学习提示
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3>🔊 小聪语音</h3>
      <div class="form-group">
        <label>AI 学生声线</label>
        <div class="voice-options">
          <div
            v-for="v in voiceOptions"
            :key="v.value"
            class="voice-card"
            :class="{ active: selectedVoice === v.value }"
            @click="selectVoice(v.value)"
          >
            <span class="voice-emoji">{{ v.emoji }}</span>
            <span class="voice-name">{{ v.name }}</span>
            <span class="voice-desc">{{ v.desc }}</span>
            <button class="voice-preview" @click.stop="previewVoice(v.value)" :disabled="previewing === v.value">
              {{ previewing === v.value ? '🔊 播放中...' : '▶ 试听' }}
            </button>
          </div>
        </div>
      </div>
      <p class="voice-tip">💡 基于微软 Edge TTS 神经网络语音，自然流畅</p>
    </div>

    <div class="settings-section">
      <h3>🔔 通知设置</h3>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="classRemind" /> 课前15分钟提醒
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="dailyGoal" /> 每日学习目标提醒
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3>📱 关于</h3>
      <div class="about-card">
        <p><strong>AI费曼小老师</strong> v1.0.0</p>
        <p>长沙四大名校优秀学生团队研发</p>
        <p>公益普惠 · 长期可用</p>
      </div>
    </div>

    <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 20px;" @click="saveSettings">
      保存设置
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useTTS, getSelectedVoice, setSelectedVoice } from '@/composables/useTTS';

const userStore = useUserStore();
const characterScale = ref(1);
const showHints = ref(true);
const classRemind = ref(true);
const dailyGoal = ref(true);

// TTS 语音选择
const tts = useTTS();
const selectedVoice = ref(getSelectedVoice());
const previewing = ref(null);

const voiceOptions = [
  { value: 'xiaoxiao', emoji: '🎀', name: '晓晓', desc: '活泼萝莉音' },
  { value: 'yunxi', emoji: '👦', name: '云希', desc: '可爱小男孩' },
];

function selectVoice(voice) {
  selectedVoice.value = voice;
  setSelectedVoice(voice);
}

async function previewVoice(voice) {
  setSelectedVoice(voice);
  previewing.value = voice;
  await tts.speak('你好呀，我是小聪！今天我们一起学数学吧！');
  previewing.value = null;
}

function saveSettings() {
  alert('设置已保存！');
}
</script>

<style scoped>
.settings-page {
  max-width: 600px;
  margin: 0 auto;
}

.settings-section {
  background: white;
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

.settings-section h3 {
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

.form-group label {
  min-width: 120px;
  font-size: 14px;
}

.form-group input[type="checkbox"] {
  margin-right: 8px;
}

.about-card {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 2;
}

.voice-options {
  display: flex;
  gap: 12px;
  flex: 1;
}

.voice-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 12px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.voice-card:hover {
  border-color: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.voice-card.active {
  border-color: var(--primary);
  background: var(--primary-bg);
}

.voice-emoji {
  font-size: 28px;
}

.voice-name {
  font-size: 15px;
  font-weight: 600;
}

.voice-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.voice-preview {
  margin-top: 6px;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--primary);
  color: var(--primary);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.voice-preview:hover:not(:disabled) {
  background: var(--primary);
  color: white;
}

.voice-preview:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.voice-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
