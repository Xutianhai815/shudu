const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const {
  DIFFICULTY_OPTIONS,
  TRAINING_OPTIONS,
  createEmptyPracticeStats,
  getDifficultyOption,
  getRecommendedTrainingDifficulty,
  getTrainingOption,
  choosePracticeLevel,
  normalizePracticeStats,
  recordPracticeCompletion,
} = require('../src/game-modes');

test('training options expose four adaptive practice bands', () => {
  assert.deepEqual(
    TRAINING_OPTIONS.map((item) => [
      item.trainingDifficulty,
      item.label,
      item.sourceDifficulty,
      item.description,
      item.recommendationText,
    ]),
    [
      ['warmup', '热身', 'intro', '先找确定线索，适合轻量开局。', '适合从这里开始'],
      ['steady', '稳定', 'easy', '节奏稳定，适合日常练习。', '接近你当前闯关节奏'],
      ['standard', '标准', 'normal', '需要完整推理，慢慢拆线索。', '适合完整推理练习'],
      ['advanced', '进阶', 'hard', '长局专注，不急着快。', '适合专注长局'],
    ],
  );
  assert.equal(getTrainingOption('standard').sourceDifficulty, 'normal');
});

test('difficulty options expose user-facing free training labels', () => {
  assert.deepEqual(
    DIFFICULTY_OPTIONS.map((item) => [item.difficulty, item.label]),
    [
      ['intro', '入门'],
      ['easy', '简单'],
      ['normal', '标准'],
      ['hard', '挑战'],
    ],
  );
  assert.equal(getDifficultyOption('normal').description, '需要完整推理，慢慢拆线索。');
});

test('getRecommendedTrainingDifficulty maps campaign progress to training bands', () => {
  assert.equal(getRecommendedTrainingDifficulty({ completedLevelIds: [] }), 'warmup');
  assert.equal(
    getRecommendedTrainingDifficulty({ completedLevelIds: ['lab-01', 'lab-02', 'lab-03'] }),
    'warmup',
  );
  assert.equal(
    getRecommendedTrainingDifficulty({
      completedLevelIds: ['lab-01', 'lab-02', 'lab-03', 'lab-04'],
    }),
    'steady',
  );
  assert.equal(
    getRecommendedTrainingDifficulty({
      completedLevelIds: Array.from({ length: 10 }, (_, index) => `lab-${index + 1}`),
    }),
    'standard',
  );
  assert.equal(
    getRecommendedTrainingDifficulty({
      completedLevelIds: Array.from({ length: 18 }, (_, index) => `lab-${index + 1}`),
    }),
    'advanced',
  );
});

test('getRecommendedTrainingDifficulty prefers stored next and last training difficulty', () => {
  assert.equal(
    getRecommendedTrainingDifficulty({
      completedLevelIds: [],
      practiceStats: {
        nextRecommendedTrainingDifficulty: 'standard',
        lastTrainingDifficulty: 'warmup',
      },
    }),
    'standard',
  );
  assert.equal(
    getRecommendedTrainingDifficulty({
      completedLevelIds: [],
      practiceStats: {
        lastTrainingDifficulty: 'steady',
      },
    }),
    'steady',
  );
});

test('getRecommendedTrainingDifficulty maps legacy last source difficulty before campaign fallback', () => {
  assert.equal(
    getRecommendedTrainingDifficulty({
      completedLevelIds: [],
      practiceStats: {
        totalCompleted: 5,
        lastDifficulty: 'hard',
        recentLevelIdsByDifficulty: {
          intro: null,
          easy: null,
          normal: null,
          hard: 'lab-19',
        },
      },
    }),
    'advanced',
  );
});

test('choosePracticeLevel picks a level from the requested difficulty', () => {
  const stats = createEmptyPracticeStats();
  const picked = choosePracticeLevel(levels, 'advanced', stats);

  assert.equal(picked.difficulty, 'hard');
});

test('choosePracticeLevel avoids the most recent training level when possible', () => {
  const hardLevels = levels.filter((level) => level.difficulty === 'hard');
  const picked = choosePracticeLevel(levels, 'hard', {
    ...createEmptyPracticeStats(),
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: null,
      hard: hardLevels[0].id,
    },
    recentLevelIdsByTrainingDifficulty: {
      advanced: [hardLevels[0].id],
    },
  });

  assert.equal(picked.difficulty, 'hard');
  assert.notEqual(picked.id, hardLevels[0].id);
});

test('choosePracticeLevel returns null for an unavailable difficulty', () => {
  assert.equal(choosePracticeLevel(levels, 'expert', createEmptyPracticeStats()), null);
});

test('choosePracticeLevel returns the only candidate even when it was recent', () => {
  const fixtureLevels = [{ id: 'solo-hard', difficulty: 'hard' }];
  const picked = choosePracticeLevel(fixtureLevels, 'hard', {
    ...createEmptyPracticeStats(),
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: null,
      hard: 'solo-hard',
    },
  });

  assert.equal(picked, fixtureLevels[0]);
});

test('normalizePracticeStats keeps safe defaults and known difficulty ids only', () => {
  assert.deepEqual(
    normalizePracticeStats({
      totalCompleted: 3,
      lastDifficulty: 'hard',
      lastTrainingDifficulty: 'advanced',
      nextRecommendedTrainingDifficulty: 'expert',
      recentLevelIdsByDifficulty: {
        intro: 'lab-01',
        easy: 42,
        normal: 'lab-07',
        hard: 'lab-10',
        expert: 'lab-99',
      },
      recentLevelIdsByTrainingDifficulty: {
        warmup: ['lab-01', 42],
        advanced: 'lab-19',
      },
      consecutiveCompletedByTrainingDifficulty: {
        warmup: 1,
        steady: -1,
        standard: 2,
        advanced: '3',
      },
    }),
    {
      totalCompleted: 3,
      lastDifficulty: 'hard',
      lastTrainingDifficulty: 'advanced',
      nextRecommendedTrainingDifficulty: null,
      recentLevelIdsByDifficulty: {
        intro: 'lab-01',
        easy: null,
        normal: 'lab-07',
        hard: 'lab-10',
      },
      recentLevelIdsByTrainingDifficulty: {
        warmup: ['lab-01'],
        steady: [],
        standard: [],
        advanced: ['lab-19'],
      },
      consecutiveCompletedByTrainingDifficulty: {
        warmup: 1,
        steady: 0,
        standard: 2,
        advanced: 0,
      },
    },
  );
});

test('recordPracticeCompletion increments training stats and recommends a slight step up after two wins', () => {
  const hardLevel = levels.find((level) => level.difficulty === 'hard');
  const first = recordPracticeCompletion(createEmptyPracticeStats(), hardLevel, 'advanced');
  const second = recordPracticeCompletion(first, hardLevel, 'advanced');

  assert.equal(second.totalCompleted, 2);
  assert.equal(second.lastDifficulty, 'hard');
  assert.equal(second.lastTrainingDifficulty, 'advanced');
  assert.equal(second.nextRecommendedTrainingDifficulty, 'advanced');
  assert.deepEqual(second.recentLevelIdsByTrainingDifficulty.advanced, [hardLevel.id]);
  assert.equal(second.consecutiveCompletedByTrainingDifficulty.advanced, 2);
});

test('recordPracticeCompletion recommends the next training band after two same-band completions', () => {
  const steadyLevel = levels.find((level) => level.difficulty === 'easy');
  const first = recordPracticeCompletion(createEmptyPracticeStats(), steadyLevel, 'steady');
  const second = recordPracticeCompletion(first, steadyLevel, 'steady');

  assert.deepEqual({
    totalCompleted: second.totalCompleted,
    lastDifficulty: second.lastDifficulty,
    lastTrainingDifficulty: second.lastTrainingDifficulty,
    nextRecommendedTrainingDifficulty: second.nextRecommendedTrainingDifficulty,
  }, {
    totalCompleted: 2,
    lastDifficulty: 'easy',
    lastTrainingDifficulty: 'steady',
    nextRecommendedTrainingDifficulty: 'standard',
  });
});

test('recordPracticeCompletion infers training difficulty from legacy source difficulty', () => {
  const hardLevel = levels.find((level) => level.difficulty === 'hard');
  const next = recordPracticeCompletion(createEmptyPracticeStats(), hardLevel);

  assert.equal(next.totalCompleted, 1);
  assert.equal(next.lastDifficulty, 'hard');
  assert.equal(next.lastTrainingDifficulty, 'advanced');
  assert.equal(next.nextRecommendedTrainingDifficulty, null);
  assert.deepEqual(next.recentLevelIdsByDifficulty, {
    intro: null,
    easy: null,
    normal: null,
    hard: hardLevel.id,
  });
});

test('recordPracticeCompletion ignores malformed levels without a string id', () => {
  const stats = {
    totalCompleted: 2,
    lastDifficulty: 'normal',
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: 'lab-08',
      hard: null,
    },
  };

  assert.deepEqual(recordPracticeCompletion(stats, { difficulty: 'hard' }), stats);
  assert.deepEqual(recordPracticeCompletion(stats, { id: 42, difficulty: 'hard' }), stats);
});
