import { createRouter, createWebHashHistory } from 'vue-router';
import { modelState } from '@/workers/whisperSingleton';

const routes = [
  {
    path: '/model-download',
    name: 'ModelDownload',
    component: () => import('@/views/ModelDownload.vue'),
    meta: { title: '模型下载', public: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/schedule',
    name: 'StudentSchedule',
    component: () => import('@/views/Schedule.vue'),
    meta: { title: '我的课表' }
  },
  {
    path: '/classroom',
    name: 'Classroom',
    component: () => import('@/views/Classroom.vue'),
    meta: { title: '课堂' }
  },
  {
    path: '/whiteboard',
    name: 'Whiteboard',
    component: () => import('@/views/Whiteboard.vue'),
    meta: { title: '板书台' }
  },
  {
    path: '/reward',
    name: 'RewardCenter',
    component: () => import('@/views/RewardCenter.vue'),
    meta: { title: '奖励中心' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' }
  },
  // 家长端路由
  {
    path: '/parent/dashboard',
    name: 'ParentDashboard',
    component: () => import('@/views/parent/Dashboard.vue'),
    meta: { title: '数据总览' }
  },
  {
    path: '/parent/schedule',
    name: 'ParentSchedule',
    component: () => import('@/views/parent/Schedule.vue'),
    meta: { title: '课表管理' }
  },
  {
    path: '/parent/progress',
    name: 'ParentProgress',
    component: () => import('@/views/parent/Progress.vue'),
    meta: { title: '学习进度' }
  },
  {
    path: '/parent/reward',
    name: 'ParentReward',
    component: () => import('@/views/parent/Reward.vue'),
    meta: { title: '奖励管理' }
  },
  {
    path: '/parent/payment',
    name: 'ParentPayment',
    component: () => import('@/views/parent/Payment.vue'),
    meta: { title: '课时充值' }
  },
  {
    path: '/parent/settings',
    name: 'ParentSettings',
    component: () => import('@/views/parent/Settings.vue'),
    meta: { title: '系统设置' }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 全局守卫：模型未就绪时，拦截所有页面跳转到下载页
router.beforeEach((to) => {
  if (to.meta.public) return true;          // 下载页本身放行
  if (modelState.status === 'ready') return true; // 已就绪放行
  return { path: '/model-download' };       // 否则去下载页
});

export default router;
