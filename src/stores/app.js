import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAppStore = defineStore('app', () => {
  const isParentMode = ref(false);
  const isLoading = ref(false);
  const notificationList = ref([]);

  const modeLabel = computed(() => isParentMode.value ? '家长模式' : '学生模式');

  return {
    isParentMode,
    isLoading,
    notificationList,
    modeLabel
  };
});
