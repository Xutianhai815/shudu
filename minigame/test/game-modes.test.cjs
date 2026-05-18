const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const {
  DIFFICULTY_OPTIONS,
  createEmptyPracticeStats,
  getDifficultyOption,
  choosePracticeLevel,
  normalizePracticeStats,
  recordPracticeCompletion,
} = require('../src/game-modes');

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

test('choosePracticeLevel picks a level from the requested difficulty', () => {
  const stats = createEmptyPracticeStats();
  const picked = choosePracticeLevel(levels, 'hard', stats);

  assert.equal(picked.difficulty, 'hard');
});

test('choosePracticeLevel avoids the most recent level when possible', () => {
  const hardLevels = levels.filter((level) => level.difficulty === 'hard');
  const picked = choosePracticeLevel(levels, 'hard', {
    ...createEmptyPracticeStats(),
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: null,
      hard: hardLevels[0].id,
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
      recentLevelIdsByDifficulty: {
        intro: 'lab-01',
        easy: 42,
        normal: 'lab-07',
        hard: 'lab-10',
        expert: 'lab-99',
      },
    }),
    {
      totalCompleted: 3,
      lastDifficulty: 'hard',
      recentLevelIdsByDifficulty: {
        intro: 'lab-01',
        easy: null,
        normal: 'lab-07',
        hard: 'lab-10',
      },
    },
  );
});

test('recordPracticeCompletion increments stats and remembers the completed level', () => {
  assert.deepEqual(recordPracticeCompletion(createEmptyPracticeStats(), levels[9]), {
    totalCompleted: 1,
    lastDifficulty: 'hard',
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: null,
      hard: 'lab-10',
    },
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
