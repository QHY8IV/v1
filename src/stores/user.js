import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const studentName = ref('小明');
  const grade = ref('3');
  const creditBalance = ref(50);
  const streakDays = ref(7);
  const totalLessons = ref(23);
  const totalEarned = ref(23);
  const avatar = ref('👦');

  return {
    studentName,
    grade,
    creditBalance,
    streakDays,
    totalLessons,
    totalEarned,
    avatar
  };
});
