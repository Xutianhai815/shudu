const { createPuzzleStateFromSnapshot } = require('./puzzle');
const { createEmptyPracticeStats, normalizePracticeStats } = require('./game-modes');
const { createEmptyGrowthStats, normalizeGrowthStats } = require('./growth-stats');

const PROGRESS_VERSION = 1;
const EMPTY_DAILY_REPORT = Object.freeze({
  date: '',
  completionCount: 0,
  completedLevelIds: Object.freeze([]),
});
const EMPTY_PRACTICE_STATS = Object.freeze({
  totalCompleted: 0,
  lastDifficulty: null,
  recentLevelIdsByDifficulty: Object.freeze({
    intro: null,
    easy: null,
    normal: null,
    hard: null,
  }),
});
const EMPTY_GROWTH_STATS = Object.freeze(createEmptyGrowthStats());
const EMPTY_PROGRESS = Object.freeze({
  ...createEmptyProgress(),
  completedLevelIds: Object.freeze([]),
  dailyReport: EMPTY_DAILY_REPORT,
  practiceStats: EMPTY_PRACTICE_STATS,
  growthStats: EMPTY_GROWTH_STATS,
});

function createEmptyProgress() {
  return {
    version: PROGRESS_VERSION,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: [],
    dailyReport: createEmptyDailyReport(),
    practiceStats: createEmptyPracticeStats(),
    growthStats: createEmptyGrowthStats(),
  };
}

function createEmptyDailyReport() {
  return {
    date: '',
    completionCount: 0,
    completedLevelIds: [],
  };
}

function createProgressFromState(
  state,
  completedLevelIds = [],
  dailyReport = createEmptyDailyReport(),
  extras = {},
) {
  return createProgressFromRuns({
    activeRun: serializeState(state, 'campaign'),
    practiceRun: extras.practiceRun,
    completedLevelIds,
    dailyReport,
    practiceStats: extras.practiceStats,
    growthStats: extras.growthStats,
  });
}

function createProgressFromRuns({
  activeRun = null,
  practiceRun = null,
  completedLevelIds = [],
  dailyReport = createEmptyDailyReport(),
  practiceStats = createEmptyPracticeStats(),
  growthStats = createEmptyGrowthStats(),
} = {}) {
  return {
    version: PROGRESS_VERSION,
    activeRun: isValidActiveRun(activeRun) ? normalizeActiveRun(activeRun, 'campaign') : null,
    practiceRun: isValidActiveRun(practiceRun) ? normalizeActiveRun(practiceRun, 'practice') : null,
    completedLevelIds: normalizeCompletedLevelIds(completedLevelIds),
    dailyReport: normalizeDailyReport(dailyReport),
    practiceStats: normalizePracticeStats(practiceStats),
    growthStats: normalizeGrowthStats(growthStats),
  };
}

function serializeState(state, mode = 'campaign') {
  return {
    mode,
    levelId: state.level.id,
    difficulty: state.level.difficulty,
    selected: { ...state.selected },
    noteMode: state.noteMode,
    mistakes: state.mistakes,
    completed: state.completed,
    cells: state.cells.map((row) =>
      row.map((cell) => ({
        value: cell.value,
        notes: [...cell.notes],
      })),
    ),
  };
}

function restoreStateFromProgress(activeRun, levels) {
  if (!isValidActiveRun(activeRun)) {
    return null;
  }

  const level = levels.find((item) => item.id === activeRun.levelId);
  if (!level) {
    return null;
  }

  return createPuzzleStateFromSnapshot(level, activeRun);
}

function normalizeProgress(progress) {
  if (!progress || progress.version !== PROGRESS_VERSION) {
    return createEmptyProgress();
  }

  return {
    version: PROGRESS_VERSION,
    activeRun: isValidActiveRun(progress.activeRun)
      ? normalizeActiveRun(progress.activeRun, 'campaign')
      : null,
    practiceRun: isValidActiveRun(progress.practiceRun)
      ? normalizeActiveRun(progress.practiceRun, 'practice')
      : null,
    completedLevelIds: normalizeCompletedLevelIds(progress.completedLevelIds),
    dailyReport: normalizeDailyReport(progress.dailyReport),
    practiceStats: normalizePracticeStats(progress.practiceStats),
    growthStats: normalizeGrowthStats(progress.growthStats),
  };
}

function normalizeDailyReport(dailyReport) {
  if (!dailyReport || typeof dailyReport !== 'object') {
    return createEmptyDailyReport();
  }

  return {
    date: typeof dailyReport.date === 'string' ? dailyReport.date : '',
    completionCount:
      Number.isInteger(dailyReport.completionCount) && dailyReport.completionCount > 0
        ? dailyReport.completionCount
        : 0,
    completedLevelIds: normalizeCompletedLevelIds(dailyReport.completedLevelIds),
  };
}

function normalizeActiveRun(activeRun, fallbackMode = 'campaign') {
  return {
    ...activeRun,
    mode: activeRun.mode === 'practice' ? 'practice' : fallbackMode,
    difficulty: typeof activeRun.difficulty === 'string' ? activeRun.difficulty : null,
    selected: { ...activeRun.selected },
    cells: activeRun.cells.map((row) =>
      row.map((cell) => ({
        value: isValidDigitOrZero(cell.value) ? cell.value : 0,
        notes: normalizeNotes(cell.notes),
      })),
    ),
  };
}

function normalizeCompletedLevelIds(levelIds) {
  if (!Array.isArray(levelIds)) {
    return [];
  }

  return Array.from(new Set(levelIds.filter((levelId) => typeof levelId === 'string')));
}

function isValidActiveRun(activeRun) {
  return Boolean(
    activeRun &&
      typeof activeRun.levelId === 'string' &&
      isValidSelected(activeRun.selected) &&
      Array.isArray(activeRun.cells) &&
      activeRun.cells.length === 9 &&
      activeRun.cells.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 9 &&
          row.every((cell) => cell && Object.hasOwn(cell, 'value') && Array.isArray(cell.notes)),
      ),
  );
}

function isValidSelected(selected) {
  return Boolean(
    selected &&
      Number.isInteger(selected.row) &&
      Number.isInteger(selected.col) &&
      selected.row >= 0 &&
      selected.row < 9 &&
      selected.col >= 0 &&
      selected.col < 9,
  );
}

function isValidDigitOrZero(value) {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

function normalizeNotes(notes) {
  return Array.from(new Set(notes))
    .filter((note) => Number.isInteger(note) && note >= 1 && note <= 9)
    .sort((left, right) => left - right);
}

module.exports = {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  createProgressFromState,
  createProgressFromRuns,
  createRunFromState: serializeState,
  normalizeProgress,
  restoreStateFromProgress,
};
