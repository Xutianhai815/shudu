export interface CompletionFeedback {
  title: string;
  subtitle: string;
  primaryStat: string;
  secondaryStat: string;
}

export function createCompletionFeedback(totalCompleted: number, streakDays: number): CompletionFeedback {
  const safeTotal = Math.max(1, totalCompleted);
  const safeStreak = Math.max(0, streakDays);

  return {
    title: '这一局，大脑除锈完成',
    subtitle: '没有追求速度，只是稳稳把线索理顺了。',
    primaryStat: `累计完成 ${safeTotal} 局`,
    secondaryStat: safeStreak > 1 ? `连续练习 ${safeStreak} 天` : '今天已完成一次练习',
  };
}
