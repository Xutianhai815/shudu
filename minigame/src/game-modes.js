const DIFFICULTY_OPTIONS = Object.freeze([
  {
    difficulty: 'intro',
    label: '入门',
    description: '先找确定线索，适合 3 分钟热身。',
  },
  {
    difficulty: 'easy',
    label: '简单',
    description: '节奏稳定，适合日常练习。',
  },
  {
    difficulty: 'normal',
    label: '标准',
    description: '需要完整推理，慢慢拆线索。',
  },
  {
    difficulty: 'hard',
    label: '挑战',
    description: '长局专注，不急着快。',
  },
]);

const DIFFICULTY_KEYS = DIFFICULTY_OPTIONS.map((item) => item.difficulty);
const TRAINING_OPTIONS = Object.freeze([
  {
    trainingDifficulty: 'warmup',
    label: '热身',
    sourceDifficulty: 'intro',
    description: '先找确定线索，适合轻量开局。',
    recommendationText: '适合从这里开始',
  },
  {
    trainingDifficulty: 'steady',
    label: '稳定',
    sourceDifficulty: 'easy',
    description: '节奏稳定，适合日常练习。',
    recommendationText: '接近你当前闯关节奏',
  },
  {
    trainingDifficulty: 'standard',
    label: '标准',
    sourceDifficulty: 'normal',
    description: '需要完整推理，慢慢拆线索。',
    recommendationText: '适合完整推理练习',
  },
  {
    trainingDifficulty: 'advanced',
    label: '进阶',
    sourceDifficulty: 'hard',
    description: '长局专注，不急着快。',
    recommendationText: '适合专注长局',
  },
]);
const TRAINING_KEYS = TRAINING_OPTIONS.map((item) => item.trainingDifficulty);
const TRAINING_BY_SOURCE_DIFFICULTY = TRAINING_OPTIONS.reduce((result, option) => {
  result[option.sourceDifficulty] = option;
  return result;
}, {});
const TRAINING_RECENT_LIMIT = 3;

function getDifficultyOption(difficulty) {
  return DIFFICULTY_OPTIONS.find((item) => item.difficulty === difficulty) || null;
}

function getTrainingOption(trainingDifficulty) {
  return TRAINING_OPTIONS.find((item) => item.trainingDifficulty === trainingDifficulty) || null;
}

function getTrainingOptionBySourceDifficulty(difficulty) {
  return TRAINING_BY_SOURCE_DIFFICULTY[difficulty] || null;
}

function createEmptyPracticeStats() {
  return {
    totalCompleted: 0,
    lastDifficulty: null,
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: null,
      hard: null,
    },
  };
}

function normalizePracticeStats(stats) {
  const empty = createEmptyPracticeStats();

  if (!stats || typeof stats !== 'object') {
    return empty;
  }

  const recentSource = stats.recentLevelIdsByDifficulty || {};
  const hasTrainingFields =
    Object.hasOwn(stats, 'lastTrainingDifficulty') ||
    Object.hasOwn(stats, 'nextRecommendedTrainingDifficulty') ||
    Object.hasOwn(stats, 'recentLevelIdsByTrainingDifficulty') ||
    Object.hasOwn(stats, 'consecutiveCompletedByTrainingDifficulty');

  const normalized = {
    totalCompleted:
      Number.isInteger(stats.totalCompleted) && stats.totalCompleted > 0
        ? stats.totalCompleted
        : 0,
    lastDifficulty: DIFFICULTY_KEYS.includes(stats.lastDifficulty) ? stats.lastDifficulty : null,
    recentLevelIdsByDifficulty: DIFFICULTY_KEYS.reduce((result, difficulty) => {
      result[difficulty] =
        typeof recentSource[difficulty] === 'string' ? recentSource[difficulty] : null;
      return result;
    }, {}),
  };

  if (!hasTrainingFields) {
    return normalized;
  }

  const recentTrainingSource = stats.recentLevelIdsByTrainingDifficulty || {};
  const consecutiveSource = stats.consecutiveCompletedByTrainingDifficulty || {};

  return {
    ...normalized,
    lastTrainingDifficulty: TRAINING_KEYS.includes(stats.lastTrainingDifficulty)
      ? stats.lastTrainingDifficulty
      : null,
    nextRecommendedTrainingDifficulty: TRAINING_KEYS.includes(
      stats.nextRecommendedTrainingDifficulty,
    )
      ? stats.nextRecommendedTrainingDifficulty
      : null,
    recentLevelIdsByTrainingDifficulty: TRAINING_KEYS.reduce((result, trainingDifficulty) => {
      result[trainingDifficulty] = normalizeRecentTrainingLevelIds(
        recentTrainingSource[trainingDifficulty],
      );
      return result;
    }, {}),
    consecutiveCompletedByTrainingDifficulty: TRAINING_KEYS.reduce((result, trainingDifficulty) => {
      result[trainingDifficulty] = positiveIntegerOrZero(consecutiveSource[trainingDifficulty]);
      return result;
    }, {}),
  };
}

function getRecommendedTrainingDifficulty({ completedLevelIds = [], practiceStats } = {}) {
  const normalizedStats = normalizePracticeStats(practiceStats);

  if (TRAINING_KEYS.includes(normalizedStats.nextRecommendedTrainingDifficulty)) {
    return normalizedStats.nextRecommendedTrainingDifficulty;
  }

  if (TRAINING_KEYS.includes(normalizedStats.lastTrainingDifficulty)) {
    return normalizedStats.lastTrainingDifficulty;
  }

  const legacyTrainingOption = getTrainingOptionBySourceDifficulty(normalizedStats.lastDifficulty);

  if (legacyTrainingOption) {
    return legacyTrainingOption.trainingDifficulty;
  }

  const completedCount = Array.isArray(completedLevelIds)
    ? new Set(completedLevelIds.filter((levelId) => typeof levelId === 'string')).size
    : 0;

  if (completedCount >= 18) {
    return 'advanced';
  }

  if (completedCount >= 10) {
    return 'standard';
  }

  if (completedCount >= 4) {
    return 'steady';
  }

  return 'warmup';
}

function choosePracticeLevel(levels, trainingDifficulty, stats = createEmptyPracticeStats()) {
  const trainingOption = resolveTrainingOption(trainingDifficulty);

  if (!trainingOption) {
    return null;
  }

  const sourceDifficulty = trainingOption.sourceDifficulty;
  const candidates = Array.isArray(levels)
    ? levels.filter((level) => level && level.difficulty === sourceDifficulty)
    : [];

  if (candidates.length === 0) {
    return null;
  }

  const normalizedStats = normalizePracticeStats(stats);
  const recentTrainingIds =
    normalizedStats.recentLevelIdsByTrainingDifficulty &&
    normalizedStats.recentLevelIdsByTrainingDifficulty[trainingOption.trainingDifficulty];
  const recentLevelIds = Array.isArray(recentTrainingIds)
    ? recentTrainingIds
    : [normalizedStats.recentLevelIdsByDifficulty[sourceDifficulty]].filter(Boolean);

  return candidates.find((level) => !recentLevelIds.includes(level.id)) || candidates[0];
}

function recordPracticeCompletion(stats, level, trainingDifficulty) {
  const normalizedStats = normalizePracticeStats(stats);
  const difficulty = level && level.difficulty;
  const trainingOption =
    resolveTrainingOption(trainingDifficulty) || getTrainingOptionBySourceDifficulty(difficulty);

  if (!trainingOption || !DIFFICULTY_KEYS.includes(difficulty) || typeof level.id !== 'string') {
    return normalizedStats;
  }

  const normalizedWithTraining = ensureTrainingStats(normalizedStats);
  const completedTrainingDifficulty = trainingOption.trainingDifficulty;
  const consecutiveCompletedByTrainingDifficulty = TRAINING_KEYS.reduce((result, key) => {
    result[key] =
      key === completedTrainingDifficulty
        ? normalizedWithTraining.consecutiveCompletedByTrainingDifficulty[key] + 1
        : 0;
    return result;
  }, {});
  const completedCount =
    consecutiveCompletedByTrainingDifficulty[completedTrainingDifficulty];
  const shouldStepUp = completedCount >= 2;

  return {
    totalCompleted: normalizedWithTraining.totalCompleted + 1,
    lastDifficulty: difficulty,
    lastTrainingDifficulty: completedTrainingDifficulty,
    nextRecommendedTrainingDifficulty: shouldStepUp
      ? getNextTrainingDifficulty(completedTrainingDifficulty)
      : null,
    recentLevelIdsByDifficulty: {
      ...normalizedWithTraining.recentLevelIdsByDifficulty,
      [difficulty]: level.id,
    },
    recentLevelIdsByTrainingDifficulty: {
      ...normalizedWithTraining.recentLevelIdsByTrainingDifficulty,
      [completedTrainingDifficulty]: rememberRecentLevelId(
        normalizedWithTraining.recentLevelIdsByTrainingDifficulty[completedTrainingDifficulty],
        level.id,
      ),
    },
    consecutiveCompletedByTrainingDifficulty,
  };
}

function resolveTrainingOption(trainingDifficulty) {
  return (
    getTrainingOption(trainingDifficulty) ||
    getTrainingOptionBySourceDifficulty(trainingDifficulty)
  );
}

function ensureTrainingStats(stats) {
  const normalized = normalizePracticeStats({
    ...stats,
    lastTrainingDifficulty: stats.lastTrainingDifficulty,
    nextRecommendedTrainingDifficulty: stats.nextRecommendedTrainingDifficulty,
    recentLevelIdsByTrainingDifficulty: stats.recentLevelIdsByTrainingDifficulty || {},
    consecutiveCompletedByTrainingDifficulty:
      stats.consecutiveCompletedByTrainingDifficulty || {},
  });

  return normalized;
}

function normalizeRecentTrainingLevelIds(value) {
  if (typeof value === 'string') {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((levelId) => typeof levelId === 'string'))).slice(
    0,
    TRAINING_RECENT_LIMIT,
  );
}

function rememberRecentLevelId(previousIds, levelId) {
  return [levelId, ...previousIds.filter((item) => item !== levelId)].slice(
    0,
    TRAINING_RECENT_LIMIT,
  );
}

function getNextTrainingDifficulty(trainingDifficulty) {
  const index = TRAINING_KEYS.indexOf(trainingDifficulty);

  if (index === -1) {
    return null;
  }

  return TRAINING_KEYS[Math.min(TRAINING_KEYS.length - 1, index + 1)];
}

function positiveIntegerOrZero(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

module.exports = {
  DIFFICULTY_OPTIONS,
  TRAINING_OPTIONS,
  createEmptyPracticeStats,
  getDifficultyOption,
  getTrainingOption,
  getRecommendedTrainingDifficulty,
  choosePracticeLevel,
  normalizePracticeStats,
  recordPracticeCompletion,
};
