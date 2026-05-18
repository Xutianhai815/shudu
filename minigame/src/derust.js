const DERUST_DISCLAIMER = '娱乐数值，不代表医学效果。';
const DERUST_STEP = 0.01;
const DERUST_COPY = {
  completionLabel: 'LAB RESULT',
  completionTitle: '大脑除锈完成',
  metricLabel: '今日脑力光泽度',
  subtitle: '你的前额叶刚刚完成了一次俯卧撑。请继续保持嚣张。',
  summaryLabel: '今日报告',
  todayStatLabel: '今日训练',
  activationStatLabel: '大脑状态',
  activationStatValue: '已激活',
  dailyRecallDetail: '完成一局，给大脑做个热身',
};

function getTodayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createCompletionFeedback(
  state,
  completedLevelIds = [],
  dailyReport = null,
  todayKey = getTodayKey(),
  sessionDurationMs = 0,
) {
  const completedIds = normalizeCompletedLevelIds(completedLevelIds);
  const levelId = state && state.level && state.level.id;
  const completionCount = levelId ? new Set([...completedIds, levelId]).size : completedIds.length;
  const todayCompletionCount = getTodayCompletionCount(dailyReport, todayKey);
  const durationCopy = createDurationCompletionCopy(sessionDurationMs, state && state.level);

  return {
    label: DERUST_COPY.completionLabel,
    title: durationCopy.title,
    deltaText: formatSignedPercent(DERUST_STEP),
    metricLabel: DERUST_COPY.metricLabel,
    subtitle: durationCopy.subtitle,
    disclaimer: DERUST_DISCLAIMER,
    stats: [
      { label: DERUST_COPY.todayStatLabel, value: `${todayCompletionCount} 次` },
      durationCopy.secondStat,
    ],
    totalText: `累计除锈 ${formatPercent(completionCount * DERUST_STEP)}`,
  };
}

function createDurationCompletionCopy(sessionDurationMs, level = null) {
  const frontLevel = level && (level.difficulty === 'intro' || level.difficulty === 'easy');

  if (frontLevel) {
    return createFrontDurationCompletionCopy(sessionDurationMs);
  }

  return createStandardDurationCompletionCopy(sessionDurationMs);
}

function createFrontDurationCompletionCopy(sessionDurationMs) {
  if (sessionDurationMs >= 20 * 60 * 1000) {
    return {
      title: '耐心实验完成',
      subtitle: '慢慢完成，也是一种很扎实的训练。',
      secondStat: { label: '训练类型', value: '热身推理' },
    };
  }

  if (sessionDurationMs >= 12 * 60 * 1000) {
    return {
      title: '入门推理完成',
      subtitle: '你把线索一点点捋清楚了。',
      secondStat: { label: '训练类型', value: '热身推理' },
    };
  }

  if (sessionDurationMs >= 5 * 60 * 1000) {
    return {
      title: '热身除锈完成',
      subtitle: '节奏建立起来了，下一局会更顺。',
      secondStat: { label: '训练类型', value: '热身推理' },
    };
  }

  return {
    title: DERUST_COPY.completionTitle,
    subtitle: '这一局是在给大脑开机。',
    secondStat: { label: DERUST_COPY.activationStatLabel, value: DERUST_COPY.activationStatValue },
  };
}

function createStandardDurationCompletionCopy(sessionDurationMs) {
  if (sessionDurationMs >= 20 * 60 * 1000) {
    return {
      title: '推理马拉松完成',
      subtitle: '这一局值得记一笔，耐心也在发光。',
      secondStat: { label: '训练类型', value: '耐力推理' },
    };
  }

  if (sessionDurationMs >= 12 * 60 * 1000) {
    return {
      title: '深度除锈完成',
      subtitle: '你完成了一场安静的推理马拉松。',
      secondStat: { label: '训练类型', value: '深度推理' },
    };
  }

  if (sessionDurationMs >= 5 * 60 * 1000) {
    return {
      title: '稳定除锈完成',
      subtitle: '这不是快局，这是一次完整脑力拉伸。',
      secondStat: { label: '训练类型', value: '稳定推理' },
    };
  }

  return {
    title: DERUST_COPY.completionTitle,
    subtitle: DERUST_COPY.subtitle,
    secondStat: { label: DERUST_COPY.activationStatLabel, value: DERUST_COPY.activationStatValue },
  };
}

function createDailyReportSummary(dailyReport, todayKey = getTodayKey(), completedLevelIds = []) {
  const todayCompletionCount = getValidTodayCompletionCount(dailyReport, todayKey);
  const hasHistory = normalizeCompletedLevelIds(completedLevelIds).length > 0;

  if (todayCompletionCount > 0) {
    return {
      visible: true,
      label: DERUST_COPY.summaryLabel,
      totalText: `今日除锈 ${formatPercent(todayCompletionCount * DERUST_STEP)}`,
      detail: `娱乐指标 · 今日已完成 ${todayCompletionCount} 次训练`,
      disclaimer: DERUST_DISCLAIMER,
    };
  }

  return {
    visible: hasHistory,
    label: DERUST_COPY.summaryLabel,
    totalText: '今日除锈 0.00%',
    detail: DERUST_COPY.dailyRecallDetail,
    disclaimer: DERUST_DISCLAIMER,
  };
}

function createNextDailyReport(dailyReport, levelId, todayKey) {
  const normalizedTodayKey = isDayKey(todayKey) ? todayKey : getTodayKey();
  const report =
    isValidTodayDailyReport(dailyReport, normalizedTodayKey)
      ? normalizeDailyReport(dailyReport, normalizedTodayKey)
      : {
          date: normalizedTodayKey,
          completionCount: 0,
          completedLevelIds: [],
        };

  if (typeof levelId !== 'string' || levelId.length === 0) {
    return report;
  }

  return {
    date: normalizedTodayKey,
    completionCount: report.completionCount + 1,
    completedLevelIds: normalizeCompletedLevelIds([...report.completedLevelIds, levelId]),
  };
}

function createDerustSummary(completedLevelIds = []) {
  const completedIds = normalizeCompletedLevelIds(completedLevelIds);
  const count = completedIds.length;

  return {
    visible: count > 0,
    label: DERUST_COPY.summaryLabel,
    totalText: `累计除锈 ${formatPercent(count * DERUST_STEP)}`,
    detail: `娱乐指标 · 已完成 ${count} 次训练`,
    disclaimer: DERUST_DISCLAIMER,
  };
}

function normalizeCompletedLevelIds(levelIds) {
  if (!Array.isArray(levelIds)) {
    return [];
  }

  return Array.from(new Set(levelIds.filter((levelId) => typeof levelId === 'string')));
}

function normalizeDailyReport(dailyReport, todayKey) {
  return {
    date: todayKey,
    completionCount: normalizeCompletionCount(dailyReport && dailyReport.completionCount),
    completedLevelIds: normalizeCompletedLevelIds(dailyReport && dailyReport.completedLevelIds),
  };
}

function getTodayCompletionCount(dailyReport, todayKey) {
  return getValidTodayCompletionCount(dailyReport, todayKey) || 1;
}

function getValidTodayCompletionCount(dailyReport, todayKey) {
  if (!isValidTodayDailyReport(dailyReport, todayKey)) {
    return 0;
  }

  return normalizeCompletionCount(dailyReport.completionCount);
}

function isValidTodayDailyReport(dailyReport, todayKey) {
  return (
    dailyReport &&
    typeof dailyReport === 'object' &&
    isDayKey(todayKey) &&
    dailyReport.date === todayKey
  );
}

function normalizeCompletionCount(completionCount) {
  return Number.isInteger(completionCount) && completionCount > 0 ? completionCount : 0;
}

function isDayKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value) {
  return `+${formatPercent(value)}`;
}

module.exports = {
  DERUST_DISCLAIMER,
  createCompletionFeedback,
  createDailyReportSummary,
  createDerustSummary,
  createNextDailyReport,
  getTodayKey,
};
