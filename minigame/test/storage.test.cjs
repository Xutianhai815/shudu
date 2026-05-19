const assert = require('node:assert/strict');
const test = require('node:test');

const { EMPTY_PROGRESS } = require('../src/progress');
const {
  PROGRESS_STORAGE_KEY,
  clearProgress,
  loadProgress,
  saveProgress,
} = require('../src/storage');

test('loadProgress returns empty progress when storage is missing', () => {
  const wxLike = {
    getStorageSync: () => undefined,
  };

  assert.deepEqual(loadProgress(wxLike), EMPTY_PROGRESS);
});

test('loadProgress normalizes stored progress object', () => {
  const wxLike = {
    getStorageSync: (key) => {
      assert.equal(key, PROGRESS_STORAGE_KEY);
      return {
        version: 1,
        activeRun: null,
        completedLevelIds: ['lab-02', 'lab-02'],
      };
    },
  };

  assert.deepEqual(loadProgress(wxLike), {
    version: 1,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: ['lab-02'],
    dailyReport: {
      date: '',
      completionCount: 0,
      completedLevelIds: [],
    },
    practiceStats: EMPTY_PROGRESS.practiceStats,
    growthStats: EMPTY_PROGRESS.growthStats,
  });
});

test('loadProgress catches storage read errors', () => {
  const wxLike = {
    getStorageSync: () => {
      throw new Error('storage unavailable');
    },
  };

  const progress = loadProgress(wxLike);

  assert.deepEqual(progress, EMPTY_PROGRESS);
  assert.notStrictEqual(progress.completedLevelIds, EMPTY_PROGRESS.completedLevelIds);

  progress.completedLevelIds.push('lab-01');
  assert.deepEqual(EMPTY_PROGRESS.completedLevelIds, []);
});

test('saveProgress writes with the expected storage key', () => {
  const writes = [];
  const wxLike = {
    setStorageSync: (key, value) => writes.push({ key, value }),
  };

  const saved = saveProgress(wxLike, {
    version: 1,
    activeRun: null,
    completedLevelIds: ['lab-03'],
  });

  assert.equal(saved, true);
  assert.deepEqual(writes, [
    {
      key: PROGRESS_STORAGE_KEY,
      value: {
        version: 1,
        activeRun: null,
        practiceRun: null,
        completedLevelIds: ['lab-03'],
        dailyReport: {
          date: '',
          completionCount: 0,
          completedLevelIds: [],
        },
        practiceStats: EMPTY_PROGRESS.practiceStats,
        growthStats: EMPTY_PROGRESS.growthStats,
      },
    },
  ]);
});

test('saveProgress returns false when storage write fails', () => {
  const wxLike = {
    setStorageSync: () => {
      throw new Error('storage unavailable');
    },
  };

  assert.equal(
    saveProgress(wxLike, { version: 1, activeRun: null, completedLevelIds: ['lab-03'] }),
    false,
  );
});

test('clearProgress removes the expected storage key', () => {
  const removed = [];
  const wxLike = {
    removeStorageSync: (key) => removed.push(key),
  };

  const cleared = clearProgress(wxLike);

  assert.equal(cleared, true);
  assert.deepEqual(removed, [PROGRESS_STORAGE_KEY]);
});

test('clearProgress returns false when storage removal fails', () => {
  const wxLike = {
    removeStorageSync: () => {
      throw new Error('storage unavailable');
    },
  };

  assert.equal(clearProgress(wxLike), false);
});
