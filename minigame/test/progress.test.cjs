const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { applyDigit, createPuzzleState, selectCell, toggleNoteMode } = require('../src/puzzle');
const {
  EMPTY_PROGRESS,
  createProgressFromState,
  createProgressFromRuns,
  createRunFromState,
  normalizeProgress,
  restoreStateFromProgress,
} = require('../src/progress');

test('createProgressFromState serializes mutable puzzle state', () => {
  const initial = createPuzzleState(levels[0]);
  const filled = applyDigit(selectCell(initial, 0, 3), 6);
  const noted = applyDigit(toggleNoteMode(selectCell(filled, 0, 5)), 7);

  const progress = createProgressFromState(noted, ['lab-03']);

  assert.equal(progress.version, 1);
  assert.equal(progress.activeRun.mode, 'campaign');
  assert.equal(progress.activeRun.levelId, 'lab-01');
  assert.equal(progress.activeRun.difficulty, 'intro');
  assert.deepEqual(progress.activeRun.selected, { row: 0, col: 5 });
  assert.equal(progress.activeRun.noteMode, true);
  assert.equal(progress.activeRun.cells[0][3].value, 6);
  assert.deepEqual(progress.activeRun.cells[0][5].notes, [7]);
  assert.equal(progress.practiceRun, null);
  assert.deepEqual(progress.completedLevelIds, ['lab-03']);
  assert.deepEqual(progress.dailyReport, {
    date: '',
    completionCount: 0,
    completedLevelIds: [],
  });
  assert.deepEqual(progress.practiceStats, {
    totalCompleted: 0,
    lastDifficulty: null,
    recentLevelIdsByDifficulty: {
      intro: null,
      easy: null,
      normal: null,
      hard: null,
    },
  });
});

test('createProgressFromState serializes daily report when provided', () => {
  const state = createPuzzleState(levels[0]);
  const progress = createProgressFromState(state, ['lab-02'], {
    date: '2026-05-14',
    completionCount: 2,
    completedLevelIds: ['lab-02', 'lab-02', 'lab-03'],
  });

  assert.deepEqual(progress.dailyReport, {
    date: '2026-05-14',
    completionCount: 2,
    completedLevelIds: ['lab-02', 'lab-03'],
  });
});

test('restoreStateFromProgress restores selected cell values notes and mistakes', () => {
  const state = applyDigit(
    toggleNoteMode(selectCell(applyDigit(selectCell(createPuzzleState(levels[0]), 0, 3), 6), 0, 5)),
    7,
  );
  const source = createProgressFromState(
    {
      ...state,
      mistakes: 1,
    },
    [],
  );

  const restored = restoreStateFromProgress(source.activeRun, levels);

  assert.equal(restored.level.id, 'lab-01');
  assert.deepEqual(restored.selected, { row: 0, col: 5 });
  assert.equal(restored.cells[0][3].value, 6);
  assert.equal(restored.cells[0][3].fixed, false);
  assert.deepEqual(restored.cells[0][5].notes, [7]);
  assert.equal(restored.cells[0][0].fixed, true);
  assert.equal(restored.mistakes, 1);
  assert.equal(restored.history.length, 0);
});

test('restoreStateFromProgress returns null for invalid saved data', () => {
  const source = createProgressFromState(createPuzzleState(levels[0]), []);

  assert.equal(restoreStateFromProgress(null, levels), null);
  assert.equal(restoreStateFromProgress({ levelId: 'missing-level' }, levels), null);
  assert.equal(
    restoreStateFromProgress({ levelId: 'lab-01', cells: [[{ value: 1, notes: [] }]] }, levels),
    null,
  );
  assert.equal(
    restoreStateFromProgress({ ...source.activeRun, selected: { row: 99, col: 0 } }, levels),
    null,
  );
});

test('EMPTY_PROGRESS is a safe default progress object', () => {
  assert.deepEqual(EMPTY_PROGRESS, {
    version: 1,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: [],
    dailyReport: {
      date: '',
      completionCount: 0,
      completedLevelIds: [],
    },
    practiceStats: {
      totalCompleted: 0,
      lastDifficulty: null,
      recentLevelIdsByDifficulty: {
        intro: null,
        easy: null,
        normal: null,
        hard: null,
      },
    },
  });
  assert.throws(() => EMPTY_PROGRESS.completedLevelIds.push('lab-02'), TypeError);
  assert.throws(() => EMPTY_PROGRESS.dailyReport.completedLevelIds.push('lab-02'), TypeError);
  EMPTY_PROGRESS.practiceStats.recentLevelIdsByDifficulty.hard = 'lab-10';
  assert.equal(Object.isFrozen(EMPTY_PROGRESS.practiceStats), true);
  assert.equal(Object.isFrozen(EMPTY_PROGRESS.practiceStats.recentLevelIdsByDifficulty), true);
  assert.deepEqual(EMPTY_PROGRESS.completedLevelIds, []);
  assert.deepEqual(EMPTY_PROGRESS.dailyReport.completedLevelIds, []);
  assert.deepEqual(EMPTY_PROGRESS.practiceStats.recentLevelIdsByDifficulty, {
    intro: null,
    easy: null,
    normal: null,
    hard: null,
  });
});

test('normalizeProgress returns isolated empty progress for invalid input', () => {
  const normalized = normalizeProgress(null);

  assert.deepEqual(normalized, {
    version: 1,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: [],
    dailyReport: {
      date: '',
      completionCount: 0,
      completedLevelIds: [],
    },
    practiceStats: {
      totalCompleted: 0,
      lastDifficulty: null,
      recentLevelIdsByDifficulty: {
        intro: null,
        easy: null,
        normal: null,
        hard: null,
      },
    },
  });
  assert.notEqual(normalized.completedLevelIds, EMPTY_PROGRESS.completedLevelIds);
  assert.notEqual(
    normalized.dailyReport.completedLevelIds,
    EMPTY_PROGRESS.dailyReport.completedLevelIds,
  );
  assert.notEqual(normalized.practiceStats, EMPTY_PROGRESS.practiceStats);
  assert.notEqual(
    normalized.practiceStats.recentLevelIdsByDifficulty,
    EMPTY_PROGRESS.practiceStats.recentLevelIdsByDifficulty,
  );

  normalized.completedLevelIds.push('lab-02');
  normalized.dailyReport.completedLevelIds.push('lab-03');
  normalized.practiceStats.recentLevelIdsByDifficulty.hard = 'lab-10';

  assert.deepEqual(normalized.completedLevelIds, ['lab-02']);
  assert.deepEqual(normalized.dailyReport.completedLevelIds, ['lab-03']);
  assert.deepEqual(normalized.practiceStats.recentLevelIdsByDifficulty, {
    intro: null,
    easy: null,
    normal: null,
    hard: 'lab-10',
  });
  assert.deepEqual(EMPTY_PROGRESS.completedLevelIds, []);
  assert.deepEqual(EMPTY_PROGRESS.dailyReport.completedLevelIds, []);
  assert.deepEqual(EMPTY_PROGRESS.practiceStats.recentLevelIdsByDifficulty, {
    intro: null,
    easy: null,
    normal: null,
    hard: null,
  });
  assert.deepEqual(normalizeProgress({ version: 0, completedLevelIds: ['lab-02'] }), {
    version: 1,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: [],
    dailyReport: {
      date: '',
      completionCount: 0,
      completedLevelIds: [],
    },
    practiceStats: {
      totalCompleted: 0,
      lastDifficulty: null,
      recentLevelIdsByDifficulty: {
        intro: null,
        easy: null,
        normal: null,
        hard: null,
      },
    },
  });
});

test('normalizeProgress filters completed levels and invalid active runs', () => {
  const source = createProgressFromState(createPuzzleState(levels[0]), ['lab-02']);

  assert.deepEqual(
    normalizeProgress({
      version: 1,
      activeRun: { ...source.activeRun, selected: { row: 10, col: 0 } },
      completedLevelIds: ['lab-02', 42, 'lab-03', 'lab-02', null],
    }),
    {
      version: 1,
      activeRun: null,
      practiceRun: null,
      completedLevelIds: ['lab-02', 'lab-03'],
      dailyReport: {
        date: '',
        completionCount: 0,
        completedLevelIds: [],
      },
      practiceStats: {
        totalCompleted: 0,
        lastDifficulty: null,
        recentLevelIdsByDifficulty: {
          intro: null,
          easy: null,
          normal: null,
          hard: null,
        },
      },
    },
  );
});

test('normalizeProgress keeps old saves compatible with empty daily report', () => {
  assert.deepEqual(
    normalizeProgress({
      version: 1,
      activeRun: null,
      completedLevelIds: ['lab-02'],
    }),
    {
      version: 1,
      activeRun: null,
      practiceRun: null,
      completedLevelIds: ['lab-02'],
      dailyReport: {
        date: '',
        completionCount: 0,
        completedLevelIds: [],
      },
      practiceStats: {
        totalCompleted: 0,
        lastDifficulty: null,
        recentLevelIdsByDifficulty: {
          intro: null,
          easy: null,
          normal: null,
          hard: null,
        },
      },
    },
  );
});

test('normalizeProgress filters invalid daily report data', () => {
  assert.deepEqual(
    normalizeProgress({
      version: 1,
      activeRun: null,
      completedLevelIds: [],
      dailyReport: {
        date: 20260514,
        completionCount: -2,
        completedLevelIds: ['lab-02', 42, 'lab-02', null, 'lab-03'],
      },
    }).dailyReport,
    {
      date: '',
      completionCount: 0,
      completedLevelIds: ['lab-02', 'lab-03'],
    },
  );
});

test('normalizeProgress clones active run selected and notes', () => {
  const source = createProgressFromState(createPuzzleState(levels[0]), []);
  source.activeRun.cells[0][3].notes = [6];

  const normalized = normalizeProgress(source);

  source.activeRun.selected.row = 8;
  source.activeRun.cells[0][3].notes.push(7);

  assert.notEqual(normalized.activeRun, source.activeRun);
  assert.notEqual(normalized.activeRun.selected, source.activeRun.selected);
  assert.notEqual(normalized.activeRun.cells, source.activeRun.cells);
  assert.notEqual(normalized.activeRun.cells[0], source.activeRun.cells[0]);
  assert.notEqual(normalized.activeRun.cells[0][3].notes, source.activeRun.cells[0][3].notes);
  assert.deepEqual(normalized.activeRun.selected, { row: 0, col: 3 });
  assert.deepEqual(normalized.activeRun.cells[0][3].notes, [6]);
});

test('normalizeProgress normalizes active run cell values and notes', () => {
  const source = createProgressFromState(createPuzzleState(levels[0]), []);
  source.activeRun.cells[0][3] = {
    value: 12,
    notes: [9, 3, 3, '4', 0, 10, 1],
  };

  const normalized = normalizeProgress(source);

  assert.equal(normalized.activeRun.cells[0][3].value, 0);
  assert.deepEqual(normalized.activeRun.cells[0][3].notes, [1, 3, 9]);
});

test('createRunFromState serializes mode and difficulty for reusable runs', () => {
  const state = createPuzzleState(levels[9]);
  const run = createRunFromState(state, 'practice');

  assert.equal(run.mode, 'practice');
  assert.equal(run.levelId, 'lab-10');
  assert.equal(run.difficulty, 'hard');
});

test('createProgressFromRuns saves campaign and practice runs without state-mode ambiguity', () => {
  const activeRun = createRunFromState(createPuzzleState(levels[0]), 'campaign');
  const practiceRun = createRunFromState(createPuzzleState(levels[9]), 'practice');
  const progress = createProgressFromRuns({
    activeRun,
    practiceRun,
    completedLevelIds: ['lab-01', 'lab-01', 'lab-02'],
    dailyReport: {
      date: '2026-05-17',
      completionCount: 1,
      completedLevelIds: ['lab-01'],
    },
    practiceStats: {
      totalCompleted: 4,
      lastDifficulty: 'hard',
      recentLevelIdsByDifficulty: {
        intro: null,
        easy: null,
        normal: null,
        hard: 'lab-10',
      },
    },
  });

  assert.equal(progress.activeRun.mode, 'campaign');
  assert.equal(progress.practiceRun.mode, 'practice');
  assert.equal(progress.activeRun.levelId, 'lab-01');
  assert.equal(progress.practiceRun.levelId, 'lab-10');
  assert.deepEqual(progress.completedLevelIds, ['lab-01', 'lab-02']);
  assert.deepEqual(progress.dailyReport.completedLevelIds, ['lab-01']);
  assert.equal(progress.practiceStats.totalCompleted, 4);
});

test('normalizeProgress keeps campaign and practice runs isolated', () => {
  const campaign = createProgressFromState(createPuzzleState(levels[0]), ['lab-01']);
  const practiceState = createPuzzleState(levels[9]);
  const progress = normalizeProgress({
    ...campaign,
    practiceRun: {
      ...campaign.activeRun,
      mode: 'practice',
      levelId: practiceState.level.id,
      difficulty: practiceState.level.difficulty,
    },
    practiceStats: {
      totalCompleted: 2,
      lastDifficulty: 'hard',
      recentLevelIdsByDifficulty: {
        intro: 'lab-01',
        easy: null,
        normal: null,
        hard: 'lab-10',
      },
    },
  });

  assert.equal(progress.activeRun.mode, 'campaign');
  assert.equal(progress.practiceRun.mode, 'practice');
  assert.equal(progress.practiceRun.levelId, 'lab-10');
  assert.deepEqual(progress.completedLevelIds, ['lab-01']);
  assert.equal(progress.practiceStats.totalCompleted, 2);
});

test('normalizeProgress keeps old saves compatible with empty practice fields', () => {
  assert.deepEqual(
    normalizeProgress({
      version: 1,
      activeRun: null,
      completedLevelIds: ['lab-02'],
      dailyReport: {
        date: '2026-05-17',
        completionCount: 1,
        completedLevelIds: ['lab-02'],
      },
    }),
    {
      version: 1,
      activeRun: null,
      practiceRun: null,
      completedLevelIds: ['lab-02'],
      dailyReport: {
        date: '2026-05-17',
        completionCount: 1,
        completedLevelIds: ['lab-02'],
      },
      practiceStats: {
        totalCompleted: 0,
        lastDifficulty: null,
        recentLevelIdsByDifficulty: {
          intro: null,
          easy: null,
          normal: null,
          hard: null,
        },
      },
    },
  );
});
