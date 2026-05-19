const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createEmptyGrowthStats,
  normalizeGrowthStats,
  recordGrowthCompletion,
} = require('../src/growth-stats');

test('recordGrowthCompletion starts a new streak on first completion', () => {
  assert.deepEqual(recordGrowthCompletion(createEmptyGrowthStats(), 'campaign', '2026-05-19'), {
    currentStreak: 1,
    bestStreak: 1,
    lastCompletedDate: '2026-05-19',
    todayDate: '2026-05-19',
    todayCompletedCount: 1,
    totalCompletedCount: 1,
    campaignCompletedCount: 1,
    practiceCompletedCount: 0,
  });
});

test('recordGrowthCompletion increments today count without double-counting streak', () => {
  const stats = recordGrowthCompletion(createEmptyGrowthStats(), 'campaign', '2026-05-19');
  const next = recordGrowthCompletion(stats, 'practice', '2026-05-19');

  assert.equal(next.currentStreak, 1);
  assert.equal(next.bestStreak, 1);
  assert.equal(next.todayCompletedCount, 2);
  assert.equal(next.totalCompletedCount, 2);
  assert.equal(next.campaignCompletedCount, 1);
  assert.equal(next.practiceCompletedCount, 1);
});

test('recordGrowthCompletion increments and resets streak by local date', () => {
  const day1 = recordGrowthCompletion(createEmptyGrowthStats(), 'campaign', '2026-05-19');
  const day2 = recordGrowthCompletion(day1, 'practice', '2026-05-20');
  const skipped = recordGrowthCompletion(day2, 'campaign', '2026-05-22');

  assert.equal(day2.currentStreak, 2);
  assert.equal(day2.bestStreak, 2);
  assert.equal(day2.todayCompletedCount, 1);
  assert.equal(skipped.currentStreak, 1);
  assert.equal(skipped.bestStreak, 2);
  assert.equal(skipped.todayCompletedCount, 1);
});

test('normalizeGrowthStats derives safe numbers from malformed input', () => {
  assert.deepEqual(
    normalizeGrowthStats({
      currentStreak: -1,
      bestStreak: 4,
      lastCompletedDate: 20260519,
      todayDate: '2026-05-19',
      todayCompletedCount: 3,
      totalCompletedCount: 8,
      campaignCompletedCount: 5,
      practiceCompletedCount: '2',
    }),
    {
      currentStreak: 0,
      bestStreak: 4,
      lastCompletedDate: null,
      todayDate: '2026-05-19',
      todayCompletedCount: 3,
      totalCompletedCount: 8,
      campaignCompletedCount: 5,
      practiceCompletedCount: 0,
    },
  );
});
