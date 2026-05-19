const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function createEmptyGrowthStats() {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    todayDate: null,
    todayCompletedCount: 0,
    totalCompletedCount: 0,
    campaignCompletedCount: 0,
    practiceCompletedCount: 0,
  };
}

function normalizeGrowthStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return createEmptyGrowthStats();
  }

  return {
    currentStreak: positiveIntegerOrZero(stats.currentStreak),
    bestStreak: positiveIntegerOrZero(stats.bestStreak),
    lastCompletedDate: normalizeDateKey(stats.lastCompletedDate),
    todayDate: normalizeDateKey(stats.todayDate),
    todayCompletedCount: positiveIntegerOrZero(stats.todayCompletedCount),
    totalCompletedCount: positiveIntegerOrZero(stats.totalCompletedCount),
    campaignCompletedCount: positiveIntegerOrZero(stats.campaignCompletedCount),
    practiceCompletedCount: positiveIntegerOrZero(stats.practiceCompletedCount),
  };
}

function recordGrowthCompletion(stats, mode, todayKey) {
  const normalized = normalizeGrowthStats(stats);
  const safeTodayKey = normalizeDateKey(todayKey);

  if (!safeTodayKey) {
    return normalized;
  }

  const sameDay = normalized.lastCompletedDate === safeTodayKey;
  const previousDay = isPreviousLocalDate(normalized.lastCompletedDate, safeTodayKey);
  const currentStreak = sameDay
    ? Math.max(normalized.currentStreak, 1)
    : previousDay
      ? normalized.currentStreak + 1
      : 1;
  const todayCompletedCount =
    normalized.todayDate === safeTodayKey ? normalized.todayCompletedCount + 1 : 1;
  const practiceCompletion = mode === 'practice';

  return {
    currentStreak,
    bestStreak: Math.max(normalized.bestStreak, currentStreak),
    lastCompletedDate: safeTodayKey,
    todayDate: safeTodayKey,
    todayCompletedCount,
    totalCompletedCount: normalized.totalCompletedCount + 1,
    campaignCompletedCount: normalized.campaignCompletedCount + (practiceCompletion ? 0 : 1),
    practiceCompletedCount: normalized.practiceCompletedCount + (practiceCompletion ? 1 : 0),
  };
}

function positiveIntegerOrZero(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function normalizeDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function isPreviousLocalDate(previousKey, todayKey) {
  const previousDate = normalizeDateKey(previousKey);
  const todayDate = normalizeDateKey(todayKey);

  if (!previousDate || !todayDate) {
    return false;
  }

  return Date.parse(`${todayDate}T00:00:00.000Z`) - Date.parse(`${previousDate}T00:00:00.000Z`) === DAY_MS;
}

module.exports = {
  createEmptyGrowthStats,
  normalizeGrowthStats,
  recordGrowthCompletion,
};
