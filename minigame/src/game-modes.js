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

function getDifficultyOption(difficulty) {
  return DIFFICULTY_OPTIONS.find((item) => item.difficulty === difficulty) || null;
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

  return {
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
}

function choosePracticeLevel(levels, difficulty, stats = createEmptyPracticeStats()) {
  const candidates = Array.isArray(levels)
    ? levels.filter((level) => level && level.difficulty === difficulty)
    : [];

  if (candidates.length === 0) {
    return null;
  }

  const normalizedStats = normalizePracticeStats(stats);
  const recentLevelId = normalizedStats.recentLevelIdsByDifficulty[difficulty];

  return candidates.find((level) => level.id !== recentLevelId) || candidates[0];
}

function recordPracticeCompletion(stats, level) {
  const normalizedStats = normalizePracticeStats(stats);
  const difficulty = level && level.difficulty;

  if (!DIFFICULTY_KEYS.includes(difficulty) || typeof level.id !== 'string') {
    return normalizedStats;
  }

  return {
    totalCompleted: normalizedStats.totalCompleted + 1,
    lastDifficulty: difficulty,
    recentLevelIdsByDifficulty: {
      ...normalizedStats.recentLevelIdsByDifficulty,
      [difficulty]: level.id,
    },
  };
}

module.exports = {
  DIFFICULTY_OPTIONS,
  createEmptyPracticeStats,
  getDifficultyOption,
  choosePracticeLevel,
  normalizePracticeStats,
  recordPracticeCompletion,
};
