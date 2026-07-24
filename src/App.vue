<template>
  <!-- 模型下载页：全屏独立渲染，不显示侧边栏布局 -->
  <router-view v-if="isDownloadPage" />

  <div v-else class="app-container" :class="{ 'parent-mode': store.isParentMode }">
    <!-- 侧边导航栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo" v-show="!sidebarCollapsed">
          <span class="logo-icon">🎓</span>
          <span class="logo-text">AI费曼小老师</span>
        </div>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          {{ sidebarCollapsed ? '▶' : '◀' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
          @click="sidebarCollapsed = false"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label" v-show="!sidebarCollapsed">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <div class="mode-toggle">
          <span>👶 学生模式</span>
          <label class="switch">
            <input type="checkbox" v-model="store.isParentMode" />
            <span class="slider"></span>
          </label>
          <span>👨‍👩‍👧 家长模式</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <header class="top-bar">
        <div class="top-bar-left">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
        </div>
        <div class="top-bar-right">
          <!-- 离线语音模型下载状态 -->
          <div
            class="model-status"
            :class="{ downloading: modelDownloading, done: !modelDownloading && modelProgress >= 100 }"
            v-if="modelDownloading || modelStatusText"
          >
            <span class="model-icon" :class="{ spin: modelDownloading }">🧠</span>
            <div class="model-info">
              <span class="model-text">
                {{ modelDownloading ? (modelProgress > 0 ? `语音模型下载中 ${modelProgress}%` : modelStatusText) : modelStatusText }}
              </span>
              <div class="model-bar" v-if="modelDownloading && modelProgress > 0">
                <div class="model-bar-fill" :style="{ width: modelProgress + '%' }"></div>
              </div>
            </div>
          </div>
          <!-- 课时余额 -->
          <div class="credit-display" v-if="!store.isParentMode">
            <span class="credit-icon">💰</span>
            <span class="credit-amount">{{ userStore.creditBalance.toFixed(1) }}</span>
            <span class="credit-unit">课时</span>
          </div>
          <!-- 连续打卡 -->
          <div class="streak-display" v-if="!store.isParentMode">
            <span class="streak-fire">🔥</span>
            <span>{{ userStore.streakDays }}天</span>
          </div>
          <!-- 用户信息 -->
          <div class="user-info">
            <span class="user-avatar">👦</span>
            <span class="user-name">{{ userStore.studentName }}</span>
          </div>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="content-area fade-in">
        <router-view />
      </div>
    </main>

    <!-- Live2D 虚拟形象 -->
    <Live2DWidget v-if="!store.isParentMode" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useUserStore } from '@/stores/user';
import Live2DWidget from '@/components/Live2DWidget.vue';
import { preloadWhisperModel, subscribeWhisper } from '@/workers/whisperSingleton';

const route = useRoute();
const store = useAppStore();
const userStore = useUserStore();
const sidebarCollapsed = ref(false);

// 是否为模型下载页（全屏独立，隐藏侧边栏布局）
const isDownloadPage = computed(() => route.path === '/model-download');

// ===== 离线语音模型：初次打开应用即开始下载 =====
const modelDownloading = ref(false);   // 是否正在下载/加载
const modelProgress = ref(0);          // 下载进度 0-100
const modelStatusText = ref('');       // 状态文本
let unsubscribeModel = null;
let readyHideTimer = null;

onMounted(() => {
  // 订阅模型状态，驱动顶部下载提示
  unsubscribeModel = subscribeWhisper((event) => {
    const { type, status, message, progress } = event.data;
    if (type !== 'status') return;
    if (status === 'downloading') {
      modelDownloading.value = true;
      modelProgress.value = progress ?? 0;
      modelStatusText.value = message || '下载模型中...';
    } else if (status === 'loading') {
      modelDownloading.value = true;
      modelStatusText.value = message || '加载模型中...';
    } else if (status === 'ready') {
      modelDownloading.value = false;
      modelProgress.value = 100;
      modelStatusText.value = '✅ 语音模型已就绪';
      // 2.5 秒后淡出提示
      clearTimeout(readyHideTimer);
      readyHideTimer = setTimeout(() => { modelStatusText.value = ''; }, 2500);
    } else if (status === 'error') {
      modelDownloading.value = false;
      modelStatusText.value = message || '模型加载失败';
    }
  });

  // 立即开始预下载（仅首次执行）
  preloadWhisperModel();
});

onUnmounted(() => {
  if (unsubscribeModel) unsubscribeModel();
  if (readyHideTimer) clearTimeout(readyHideTimer);
});

const navItems = computed(() => {
  if (store.isParentMode) {
    return [
      { key: 'dashboard', label: '数据总览', icon: '📊', path: '/parent/dashboard' },
      { key: 'schedule', label: '课表管理', icon: '📅', path: '/parent/schedule' },
      { key: 'progress', label: '学习进度', icon: '📈', path: '/parent/progress' },
      { key: 'reward', label: '奖励管理', icon: '🏆', path: '/parent/reward' },
      { key: 'payment', label: '课时充值', icon: '💳', path: '/parent/payment' },
      { key: 'settings', label: '系统设置', icon: '⚙️', path: '/parent/settings' },
    ];
  }
  return [
    { key: 'home', label: '首页', icon: '🏠', path: '/' },
    { key: 'schedule', label: '我的课表', icon: '📅', path: '/schedule' },
    { key: 'classroom', label: '课堂', icon: '📖', path: '/classroom' },
    { key: 'whiteboard', label: '板书台', icon: '✏️', path: '/whiteboard' },
    { key: 'reward', label: '奖励中心', icon: '🏆', path: '/reward' },
    { key: 'settings', label: '设置', icon: '⚙️', path: '/settings' },
  ];
});

const currentPageTitle = computed(() => {
  const currentItem = navItems.value.find(item => item.path === route.path);
  return currentItem ? currentItem.label : 'AI费曼小老师';
});
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: var(--bg-main);
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  transition: var(--transition);
  z-index: 100;
}

.sidebar.collapsed {
  width: 64px;
  min-width: 64px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-light);
  white-space: nowrap;
}

.collapse-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: var(--transition);
}
.collapse-btn:hover { background: rgba(255,255,255,0.2); }

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: var(--transition);
  cursor: pointer;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.nav-item.active {
  background: var(--primary);
  color: white;
  font-weight: 500;
}

.nav-icon { font-size: 20px; min-width: 24px; text-align: center; }
.nav-label { font-size: 14px; }

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.mode-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.2);
  border-radius: 24px;
  transition: var(--transition);
}

.slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: var(--transition);
}

.switch input:checked + .slider { background: var(--primary); }
.switch input:checked + .slider::before { transform: translateX(20px); }

/* ========== 主内容区 ========== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.credit-display, .streak-display {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, #FFF7E8, #FFEFC2);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: #D48806;
}

.streak-display {
  background: linear-gradient(135deg, #FFF1F0, #FFE0E0);
  color: var(--danger);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
}

.user-avatar { font-size: 24px; }
.user-name { font-size: 14px; color: var(--text-secondary); }

/* ========== 模型下载状态 ========== */
.model-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #F0F5FF, #E6F0FF);
  color: var(--primary);
  border: 1px solid rgba(47, 107, 235, 0.15);
  animation: model-chip-in 0.3s ease-out;
  max-width: 260px;
}

@keyframes model-chip-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.model-icon {
  font-size: 16px;
  line-height: 1;
}

.model-icon.spin {
  animation: model-spin 1.6s linear infinite;
}

@keyframes model-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.model-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-bar {
  width: 120px;
  height: 5px;
  background: rgba(47, 107, 235, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.model-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--primary), var(--primary-light));
  transition: width 0.3s ease;
  position: relative;
}

/* 流光扫过效果 */
.model-bar-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  animation: model-shimmer 1.2s infinite;
}

@keyframes model-shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}

.model-status.done {
  background: linear-gradient(135deg, #F6FFED, #E8FFD6);
  color: #389E0D;
  border-color: rgba(82, 196, 26, 0.2);
}

.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.parent-mode .content-area {
  background: #F6F8FA;
}
</style>
