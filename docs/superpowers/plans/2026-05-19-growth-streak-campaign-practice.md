# 轻量成长系统、24 关闯关包与自由练习升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加连续练习记录、扩展 24 关闯关包，并把自由练习升级为带推荐和轻微递进的训练路径。

**Architecture:** 先新增独立的成长统计模块，接入 `progress` 和运行时完成记录；再扩展 `levels` 数据和关卡验证；最后把进度、连续练习、自由练习推荐分别接入菜单、练习页和完成弹窗。自由练习完成仍不写入闯关进度，所有统计都只保存在本地存档。

**Tech Stack:** WeChat Mini Game Canvas runtime, CommonJS modules, Node.js built-in `node:test`, local storage through `minigame/src/storage.js`.

---

## File Structure

- Create: `minigame/src/growth-stats.js`
  - 负责连续练习日期计算、成长统计默认值、归一化、完成事件记录。
- Modify: `minigame/src/progress.js`
  - 把 `growthStats` 纳入本地进度结构，并保证旧存档兼容。
- Modify: `minigame/src/game-modes.js`
  - 把自由练习难度从旧的 `intro/easy/normal/hard` 展示升级为 `warmup/steady/standard/advanced` 训练难度，并提供推荐、选题、完成记录函数。
- Modify: `minigame/src/levels.js`
  - 从 `12` 关扩展到 `24` 关，保持经典 9x9 数独和唯一解。
- Modify: `minigame/src/app-runtime.js`
  - 在完成时更新 `growthStats`；首页、练习页、完成弹窗传入进度和推荐上下文；处理自由练习 `下一局/换难度`。
- Modify: `minigame/src/menu.js`
  - 首页卡片展示轻量闯关进度和连续练习摘要。
- Modify: `minigame/src/practice-menu.js`
  - 难度选择页显示推荐难度和训练难度命名。
- Modify: `minigame/src/renderer.js`
  - 绘制首页成长摘要、练习页推荐标识、完成页成长统计。
- Test: `minigame/test/growth-stats.test.cjs`
  - 覆盖连续天数、今日完成、最长连续、旧数据归一化。
- Test: `minigame/test/progress.test.cjs`
  - 覆盖 `growthStats` 存档兼容。
- Test: `minigame/test/game-modes.test.cjs`
  - 覆盖自由练习推荐和下一局递进。
- Test: `minigame/test/levels.test.cjs`
  - 覆盖 24 关数量、ID、难度分布、唯一解。
- Test: `minigame/test/app-runtime.test.cjs`
  - 覆盖完成后成长统计更新、自由练习恢复和推荐。
- Test: `minigame/test/menu.test.cjs`, `minigame/test/practice-menu.test.cjs`, `minigame/test/renderer.test.cjs`
  - 覆盖 UI 布局对象和绘制输出。

---

### Task 1: 新增成长统计数据模型

**Files:**
- Create: `minigame/src/growth-stats.js`
- Modify: `minigame/src/progress.js`
- Test: `minigame/test/growth-stats.test.cjs`
- Test: `minigame/test/progress.test.cjs`

- [ ] **Step 1: Write failing tests for growth stats**

Create `minigame/test/growth-stats.test.cjs`:

```js
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
```

- [ ] **Step 2: Run the growth stats tests and verify failure**

Run:

```bash
node --test minigame/test/growth-stats.test.cjs
```

Expected: FAIL with `Cannot find module '../src/growth-stats'`.

- [ ] **Step 3: Implement `growth-stats.js`**

Create `minigame/src/growth-stats.js`:

```js
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
  const empty = createEmptyGrowthStats();

  if (!stats || typeof stats !== 'object') {
    return empty;
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
  const nextStreak = sameDay
    ? normalized.currentStreak || 1
    : previousDay
      ? normalized.currentStreak + 1
      : 1;
  const todayCompletedCount = normalized.todayDate === safeTodayKey
    ? normalized.todayCompletedCount + 1
    : 1;
  const isPractice = mode === 'practice';

  return {
    currentStreak: nextStreak,
    bestStreak: Math.max(normalized.bestStreak, nextStreak),
    lastCompletedDate: safeTodayKey,
    todayDate: safeTodayKey,
    todayCompletedCount,
    totalCompletedCount: normalized.totalCompletedCount + 1,
    campaignCompletedCount: normalized.campaignCompletedCount + (isPractice ? 0 : 1),
    practiceCompletedCount: normalized.practiceCompletedCount + (isPractice ? 1 : 0),
  };
}

function positiveIntegerOrZero(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function normalizeDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function isPreviousLocalDate(previousKey, todayKey) {
  const previous = parseDateKey(previousKey);
  const today = parseDateKey(todayKey);

  if (!previous || !today) {
    return false;
  }

  return today.getTime() - previous.getTime() === DAY_MS;
}

function parseDateKey(value) {
  const safeValue = normalizeDateKey(value);

  if (!safeValue) {
    return null;
  }

  const [year, month, day] = safeValue.split('-').map(Number);
  return new Date(year, month - 1, day);
}

module.exports = {
  createEmptyGrowthStats,
  normalizeGrowthStats,
  recordGrowthCompletion,
};
```

- [ ] **Step 4: Wire `growthStats` into progress**

Modify `minigame/src/progress.js`:

```js
const { createPuzzleStateFromSnapshot } = require('./puzzle');
const { createEmptyPracticeStats, normalizePracticeStats } = require('./game-modes');
const { createEmptyGrowthStats, normalizeGrowthStats } = require('./growth-stats');
```

Add `growthStats` to `createEmptyProgress()`, `EMPTY_PROGRESS`, `createProgressFromRuns()`, `createProgressFromState()`, and `normalizeProgress()`:

```js
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
```

```js
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
```

- [ ] **Step 5: Add progress compatibility tests**

Modify `minigame/test/progress.test.cjs` expected objects so every progress object includes:

```js
growthStats: {
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  todayDate: null,
  todayCompletedCount: 0,
  totalCompletedCount: 0,
  campaignCompletedCount: 0,
  practiceCompletedCount: 0,
},
```

Add one focused compatibility test:

```js
test('normalizeProgress keeps old saves compatible with empty growth stats', () => {
  assert.deepEqual(
    normalizeProgress({
      version: 1,
      activeRun: null,
      completedLevelIds: ['lab-02'],
    }).growthStats,
    {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      todayDate: null,
      todayCompletedCount: 0,
      totalCompletedCount: 0,
      campaignCompletedCount: 0,
      practiceCompletedCount: 0,
    },
  );
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --test minigame/test/growth-stats.test.cjs minigame/test/progress.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add minigame/src/growth-stats.js minigame/src/progress.js minigame/test/growth-stats.test.cjs minigame/test/progress.test.cjs
git commit -m "feat: add local growth streak stats"
```

---

### Task 2: 扩展 24 关闯关包并锁定难度曲线

**Files:**
- Modify: `minigame/src/levels.js`
- Test: `minigame/test/levels.test.cjs`
- Test: `minigame/test/game-modes.test.cjs`

- [ ] **Step 1: Update failing level tests**

Modify `minigame/test/levels.test.cjs`:

```js
test('level data exposes basic sudoku givens solution and notes', () => {
  const level = getLevelById('lab-01');

  assert.equal(levels.length, 24);
  assert.equal(level.id, 'lab-01');
  assert.equal(level.title, '起步热身');
  assert.equal(level.label, 'LAB-01');
  assert.equal(level.hints, 3);
  assert.deepEqual(level.rules, ['classic']);
  assert.equal(level.givens.length, 9);
  assert.equal(typeof level.notes, 'object');
  assert.equal(level.variantClues, undefined);
});

test('level pack progresses through expected ids and difficulty bands', () => {
  assert.deepEqual(
    levels.map((level) => level.id),
    Array.from({ length: 24 }, (_, index) => `lab-${String(index + 1).padStart(2, '0')}`),
  );
  assert.deepEqual(levels.map((level) => level.label), [
    'LAB-01', 'LAB-02', 'LAB-03', 'LAB-04',
    'LAB-05', 'LAB-06', 'LAB-07', 'LAB-08', 'LAB-09', 'LAB-10',
    'LAB-11', 'LAB-12', 'LAB-13', 'LAB-14', 'LAB-15', 'LAB-16', 'LAB-17', 'LAB-18',
    'LAB-19', 'LAB-20', 'LAB-21', 'LAB-22', 'LAB-23', 'LAB-24',
  ]);
  assert.deepEqual(levels.map((level) => level.difficulty), [
    'intro', 'intro', 'intro', 'intro',
    'easy', 'easy', 'easy', 'easy', 'easy', 'easy',
    'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal',
    'hard', 'hard', 'hard', 'hard', 'hard', 'hard',
  ]);
});

test('level pack reduces clue counts across the 24-level difficulty bands', () => {
  const clueCounts = levels.map(countGivens);
  const bandAverages = [
    average(clueCounts.slice(0, 4)),
    average(clueCounts.slice(4, 10)),
    average(clueCounts.slice(10, 18)),
    average(clueCounts.slice(18, 24)),
  ];

  assert.ok(bandAverages[0] > bandAverages[1]);
  assert.ok(bandAverages[1] > bandAverages[2]);
  assert.ok(bandAverages[2] > bandAverages[3]);
});
```

- [ ] **Step 2: Run level tests and verify failure**

Run:

```bash
node --test minigame/test/levels.test.cjs
```

Expected: FAIL because `levels.length` is still `12` and difficulty bands are old.

- [ ] **Step 3: Add 12 new level specs and rebalance old difficulties**

Modify `minigame/src/levels.js`:

- Keep existing IDs `lab-01` to `lab-12`.
- Change `lab-04` difficulty from `easy` to `intro`.
- Change `lab-07`, `lab-08`, `lab-09`, and `lab-10` difficulty to `easy` so `lab-05` to `lab-10` are all `easy`.
- Change `lab-11` and `lab-12` to `normal`.
- Add `lab-13` to `lab-18` as `normal`.
- Add `lab-19` to `lab-24` as `hard`.

Each new level object must use the same shape as existing level specs:

```js
{
  id: 'lab-13',
  title: '多线观察',
  label: 'LAB-13',
  difficulty: 'normal',
  givens: 'valid 81 digit puzzle string that passes countSolutions(givens) === 1',
  solution: 'valid 81 digit solved grid matching every given digit'
}
```

Use only puzzles that pass the existing `countSolutions(level.givens) === 1` test. If a generated or hand-authored puzzle fails uniqueness, replace it before committing.

- [ ] **Step 4: Re-run level and game mode tests**

Run:

```bash
node --test minigame/test/levels.test.cjs minigame/test/game-modes.test.cjs
```

Expected: PASS. If `game-modes.test.cjs` assumptions about `levels[9]` difficulty break after rebalance, update those tests to locate fixtures by difficulty:

```js
const hardLevel = levels.find((level) => level.difficulty === 'hard');
assert.equal(recordPracticeCompletion(createEmptyPracticeStats(), hardLevel).lastDifficulty, 'hard');
```

- [ ] **Step 5: Run full test suite**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add minigame/src/levels.js minigame/test/levels.test.cjs minigame/test/game-modes.test.cjs
git commit -m "feat: expand campaign to 24 sudoku levels"
```

---

### Task 3: 接入连续练习记录和闯关进度展示

**Files:**
- Modify: `minigame/src/app-runtime.js`
- Modify: `minigame/src/menu.js`
- Modify: `minigame/src/renderer.js`
- Test: `minigame/test/app-runtime.test.cjs`
- Test: `minigame/test/menu.test.cjs`
- Test: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write runtime tests for completion stats**

Add to `minigame/test/app-runtime.test.cjs`:

```js
test('runtime records growth stats when campaign and practice levels complete', () => {
  const platform = createTestPlatform();
  const runtime = createAppRuntime(platform);
  runtime.boot();

  completeRuntimeLevel(runtime);
  let progress = platform.getStoredProgress();
  assert.equal(progress.growthStats.currentStreak, 1);
  assert.equal(progress.growthStats.todayCompletedCount, 1);
  assert.equal(progress.growthStats.campaignCompletedCount, 1);
  assert.equal(progress.growthStats.practiceCompletedCount, 0);

  runtime.startLevelForTest(levels.find((level) => level.difficulty === 'intro'), 'practice');
  completeRuntimeLevel(runtime);
  progress = platform.getStoredProgress();
  assert.equal(progress.growthStats.currentStreak, 1);
  assert.equal(progress.growthStats.todayCompletedCount, 2);
  assert.equal(progress.growthStats.campaignCompletedCount, 1);
  assert.equal(progress.growthStats.practiceCompletedCount, 1);
});
```

Use the existing `minigame/test/app-runtime.test.cjs` helper style for runtime completion. If a helper is missing, add a local helper in that test file that drives the same touch/runtime path already used by the existing completion tests instead of adding production-only testing APIs.

- [ ] **Step 2: Run runtime test and verify failure**

Run:

```bash
node --test minigame/test/app-runtime.test.cjs
```

Expected: FAIL because `recordCompletedLevel()` does not update `growthStats`.

- [ ] **Step 3: Update runtime completion persistence**

Modify imports in `minigame/src/app-runtime.js`:

```js
const { recordGrowthCompletion } = require('./growth-stats');
```

Modify `recordCompletedLevel()`:

```js
function recordCompletedLevel() {
  if (!state || !state.level || !state.level.id) {
    return;
  }

  const levelId = state.level.id;
  const previous = savedProgress || {};
  const todayKey = getTodayKey();
  const nextDailyReport = createNextDailyReport(previous.dailyReport, levelId, todayKey);
  const nextGrowthStats = recordGrowthCompletion(
    previous.growthStats,
    currentMode === 'practice' ? 'practice' : 'campaign',
    todayKey,
  );

  if (currentMode === 'practice') {
    savedProgress = {
      ...previous,
      practiceRun: null,
      completedLevelIds,
      dailyReport: nextDailyReport,
      growthStats: nextGrowthStats,
      practiceStats: recordPracticeCompletion(previous.practiceStats, state.level),
    };
    return;
  }

  completedLevelIds = Array.from(new Set([...completedLevelIds, levelId]));
  savedProgress = {
    ...previous,
    completedLevelIds,
    dailyReport: nextDailyReport,
    growthStats: nextGrowthStats,
  };
}
```

Modify `persistProgress()` to pass `growthStats`:

```js
savedProgress = createProgressFromRuns({
  activeRun,
  practiceRun,
  completedLevelIds,
  dailyReport: previous.dailyReport,
  practiceStats: previous.practiceStats || createEmptyPracticeStats(),
  growthStats: previous.growthStats,
});
```

- [ ] **Step 4: Write menu layout tests for progress summary**

Add or update `minigame/test/menu.test.cjs`:

```js
test('createMenuLayout exposes campaign progress and growth summary without level cards', () => {
  const layout = createMenuLayout(390, 844, levels, {
    completedLevelIds: ['lab-01', 'lab-02', 'lab-03'],
    growthStats: {
      currentStreak: 3,
      bestStreak: 5,
      lastCompletedDate: '2026-05-19',
      todayDate: '2026-05-19',
      todayCompletedCount: 1,
      totalCompletedCount: 8,
      campaignCompletedCount: 3,
      practiceCompletedCount: 5,
    },
  });

  assert.equal(layout.campaignProgress.text, '闯关进度 3/24');
  assert.equal(layout.growthSummary.text, '连续除锈 3 天 · 今日 1 局');
  assert.deepEqual(layout.levelCards, []);
});
```

- [ ] **Step 5: Update `createMenuLayout()`**

Modify `minigame/src/menu.js` to read `growthStats` and expose summary objects:

```js
const {
  growthStats = null,
} = progressSummary;
```

Add to returned layout:

```js
campaignProgress: {
  visible: true,
  text: `闯关进度 ${countKnownCompletedLevels(completedLevelIds, levels)}/${levels.length}`,
},
growthSummary: createGrowthSummary(growthStats),
```

Add helper:

```js
function createGrowthSummary(growthStats) {
  if (!growthStats || growthStats.currentStreak <= 0) {
    return { visible: false, text: '' };
  }

  const todayCount = growthStats.todayCompletedCount || 0;
  return {
    visible: true,
    text: `连续除锈 ${growthStats.currentStreak} 天 · 今日 ${todayCount} 局`,
  };
}
```

Pass `growthStats` from `refreshMenuLayout()` in `app-runtime.js`.

- [ ] **Step 6: Update renderer tests and drawing**

Add to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws homepage growth summary and campaign progress', () => {
  const ctx = createRecordingContext();
  const layout = createMenuLayout(390, 844, levels, {
    completedLevelIds: ['lab-01', 'lab-02'],
    growthStats: {
      currentStreak: 2,
      bestStreak: 2,
      lastCompletedDate: '2026-05-19',
      todayDate: '2026-05-19',
      todayCompletedCount: 1,
      totalCompletedCount: 3,
      campaignCompletedCount: 2,
      practiceCompletedCount: 1,
    },
  });

  renderMenu(ctx, layout);

  assert.ok(ctx.calls.some((call) => call.text === '闯关进度 2/24'));
  assert.ok(ctx.calls.some((call) => call.text === '连续除锈 2 天 · 今日 1 局'));
});
```

Modify `minigame/src/renderer.js` in `renderMenu()` to draw `layout.campaignProgress.text` and `layout.growthSummary.text` near the mode cards with existing homepage typography colors.

- [ ] **Step 7: Run tests**

Run:

```bash
node --test minigame/test/app-runtime.test.cjs minigame/test/menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add minigame/src/app-runtime.js minigame/src/menu.js minigame/src/renderer.js minigame/test/app-runtime.test.cjs minigame/test/menu.test.cjs minigame/test/renderer.test.cjs
git commit -m "feat: show streak and campaign progress"
```

---

### Task 4: 系统化自由练习推荐与训练难度

**Files:**
- Modify: `minigame/src/game-modes.js`
- Modify: `minigame/src/practice-menu.js`
- Modify: `minigame/src/app-runtime.js`
- Modify: `minigame/src/renderer.js`
- Test: `minigame/test/game-modes.test.cjs`
- Test: `minigame/test/practice-menu.test.cjs`
- Test: `minigame/test/app-runtime.test.cjs`
- Test: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write game mode tests for training difficulties**

Modify `minigame/test/game-modes.test.cjs`:

```js
const {
  TRAINING_OPTIONS,
  choosePracticeLevel,
  createEmptyPracticeStats,
  getRecommendedTrainingDifficulty,
  getTrainingOption,
  recordPracticeCompletion,
} = require('../src/game-modes');

test('training options expose low-pressure free practice labels', () => {
  assert.deepEqual(
    TRAINING_OPTIONS.map((item) => [item.trainingDifficulty, item.label, item.sourceDifficulty]),
    [
      ['warmup', '热身', 'intro'],
      ['steady', '稳定', 'easy'],
      ['standard', '标准', 'normal'],
      ['advanced', '进阶', 'hard'],
    ],
  );
  assert.equal(getTrainingOption('steady').recommendationText, '接近你当前闯关节奏');
});

test('getRecommendedTrainingDifficulty maps campaign progress to training difficulty', () => {
  assert.equal(getRecommendedTrainingDifficulty({ completedLevelIds: [] }), 'warmup');
  assert.equal(getRecommendedTrainingDifficulty({ completedLevelIds: ['lab-01', 'lab-02'] }), 'warmup');
  assert.equal(getRecommendedTrainingDifficulty({ completedLevelIds: ['lab-01', 'lab-02', 'lab-03', 'lab-04'] }), 'steady');
  assert.equal(getRecommendedTrainingDifficulty({ completedLevelIds: Array.from({ length: 10 }, (_, index) => `lab-${String(index + 1).padStart(2, '0')}`) }), 'standard');
  assert.equal(getRecommendedTrainingDifficulty({ completedLevelIds: Array.from({ length: 18 }, (_, index) => `lab-${String(index + 1).padStart(2, '0')}`) }), 'advanced');
});

test('recordPracticeCompletion advances after two completions at the same training difficulty', () => {
  const introLevel = levels.find((level) => level.difficulty === 'intro');
  const first = recordPracticeCompletion(createEmptyPracticeStats(), introLevel, 'warmup');
  const second = recordPracticeCompletion(first, introLevel, 'warmup');

  assert.equal(second.lastTrainingDifficulty, 'warmup');
  assert.equal(second.nextRecommendedTrainingDifficulty, 'steady');
  assert.equal(second.consecutiveCompletedByTrainingDifficulty.warmup, 2);
});
```

- [ ] **Step 2: Run game mode tests and verify failure**

Run:

```bash
node --test minigame/test/game-modes.test.cjs
```

Expected: FAIL because `TRAINING_OPTIONS` and recommendation functions do not exist yet.

- [ ] **Step 3: Implement training options and recommendation helpers**

Modify `minigame/src/game-modes.js`:

```js
const TRAINING_OPTIONS = Object.freeze([
  {
    trainingDifficulty: 'warmup',
    sourceDifficulty: 'intro',
    label: '热身',
    description: '先找确定线索，适合轻量开局。',
    recommendationText: '适合从这里开始',
  },
  {
    trainingDifficulty: 'steady',
    sourceDifficulty: 'easy',
    label: '稳定',
    description: '节奏稳定，适合日常练习。',
    recommendationText: '接近你当前闯关节奏',
  },
  {
    trainingDifficulty: 'standard',
    sourceDifficulty: 'normal',
    label: '标准',
    description: '需要完整推理，慢慢拆线索。',
    recommendationText: '适合完整推理练习',
  },
  {
    trainingDifficulty: 'advanced',
    sourceDifficulty: 'hard',
    label: '进阶',
    description: '长局专注，不急着快。',
    recommendationText: '适合专注长局',
  },
]);
```

Add helpers:

```js
function getTrainingOption(trainingDifficulty) {
  return TRAINING_OPTIONS.find((item) => item.trainingDifficulty === trainingDifficulty) || null;
}

function getTrainingOptionBySourceDifficulty(sourceDifficulty) {
  return TRAINING_OPTIONS.find((item) => item.sourceDifficulty === sourceDifficulty) || null;
}

function getRecommendedTrainingDifficulty({ completedLevelIds = [], practiceStats = null } = {}) {
  const normalizedStats = normalizePracticeStats(practiceStats);

  if (normalizedStats.nextRecommendedTrainingDifficulty) {
    return normalizedStats.nextRecommendedTrainingDifficulty;
  }

  if (normalizedStats.lastTrainingDifficulty) {
    return normalizedStats.lastTrainingDifficulty;
  }

  const completedCount = Array.isArray(completedLevelIds) ? new Set(completedLevelIds).size : 0;

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
```

Update `choosePracticeLevel(levels, trainingDifficulty, stats)` to map training difficulty to `sourceDifficulty` and avoid recent level IDs stored by training difficulty.

- [ ] **Step 4: Update practice menu layout**

Modify `minigame/src/practice-menu.js` to use `TRAINING_OPTIONS` and accept recommended training difficulty:

```js
function createPracticeMenuLayout(width, height, levels, options = {}) {
  const recommendedTrainingDifficulty = options.recommendedTrainingDifficulty || 'warmup';
  // existing layout math
  return {
    // existing fields
    recommendation: {
      visible: true,
      text: `推荐：${getTrainingOption(recommendedTrainingDifficulty).label}`,
      trainingDifficulty: recommendedTrainingDifficulty,
    },
    difficultyCards: TRAINING_OPTIONS.map((option, index) => ({
      // existing card rect
      trainingDifficulty: option.trainingDifficulty,
      sourceDifficulty: option.sourceDifficulty,
      label: option.label,
      description: option.description,
      recommended: option.trainingDifficulty === recommendedTrainingDifficulty,
      enabled,
      statusLabel: option.trainingDifficulty === recommendedTrainingDifficulty ? '推荐' : '可练习',
    })),
  };
}
```

Update `hitTestPracticeMenu()` to return `trainingDifficulty`.

- [ ] **Step 5: Update runtime entry and victory actions**

Modify `refreshPracticeMenuLayout()` in `minigame/src/app-runtime.js`:

```js
practiceMenuLayout = {
  ...createPracticeMenuLayout(layout.width, layout.height, levels, {
    topInset,
    recommendedTrainingDifficulty: getRecommendedTrainingDifficulty({
      completedLevelIds,
      practiceStats: savedProgress && savedProgress.practiceStats,
    }),
  }),
  canvasTextScale: layout.canvasTextScale,
};
```

Modify practice difficulty touch:

```js
if (hit.action === 'difficulty') {
  const level = choosePracticeLevel(
    levels,
    hit.trainingDifficulty,
    savedProgress && savedProgress.practiceStats,
  );

  if (level) {
    startLevel(level, 'practice', { trainingDifficulty: hit.trainingDifficulty });
  }
}
```

Update `startLevel()` to accept metadata and persist `trainingDifficulty` on practice runs through `createRunFromState()` or by extending the returned run object.

Update practice victory actions:

```js
function createVictoryActions() {
  if (currentMode === 'practice') {
    return {
      next: '下一局',
      restart: '换难度',
    };
  }

  return { next: '下一关' };
}
```

```js
function applyPracticeVictoryAction(action) {
  if (action === 'restart') {
    playSound('tool');
    scene = 'practiceDifficulty';
    refreshPracticeMenuLayout();
    render();
    return;
  }

  if (action === 'next') {
    const trainingDifficulty = getRecommendedTrainingDifficulty({
      completedLevelIds,
      practiceStats: savedProgress && savedProgress.practiceStats,
    });
    const level = choosePracticeLevel(levels, trainingDifficulty, savedProgress && savedProgress.practiceStats);
    if (level) {
      playSound('tool');
      startLevel(level, 'practice', { trainingDifficulty });
    }
  }
}
```

- [ ] **Step 6: Update renderer tests and drawing**

Add renderer assertions that practice menu draws `推荐：稳定` and card status `推荐` when layout marks a card as recommended.

Run:

```bash
node --test minigame/test/game-modes.test.cjs minigame/test/practice-menu.test.cjs minigame/test/app-runtime.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add minigame/src/game-modes.js minigame/src/practice-menu.js minigame/src/app-runtime.js minigame/src/renderer.js minigame/test/game-modes.test.cjs minigame/test/practice-menu.test.cjs minigame/test/app-runtime.test.cjs minigame/test/renderer.test.cjs
git commit -m "feat: recommend adaptive practice difficulty"
```

---

### Task 5: 完成页成长反馈与全量验证

**Files:**
- Modify: `minigame/src/app-runtime.js`
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/src/derust.js`
- Test: `minigame/test/derust.test.cjs`
- Test: `minigame/test/renderer.test.cjs`
- Test: `minigame/test/visual-snapshots.test.cjs`

- [ ] **Step 1: Write completion feedback tests**

Add to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws campaign completion growth stats without dense copy', () => {
  const ctx = createRecordingContext();
  const state = createCompletedState(levels[4]);
  const layout = createLayout(390, 844, { topInset: 64 });

  renderGame(ctx, state, layout, {
    modeContext: { mode: 'campaign' },
    victoryActions: { next: '下一关' },
    completionFeedback: {
      variant: 'campaign',
      title: '第 5 关完成',
      subtitle: '大脑已热身，继续挑战下一关。',
      stats: [
        { label: '闯关进度', value: '5/24' },
        { label: '连续除锈', value: '3 天' },
      ],
      progressText: '5 / 24',
    },
  });

  assert.ok(ctx.calls.some((call) => call.text === '闯关进度'));
  assert.ok(ctx.calls.some((call) => call.text === '5/24'));
  assert.ok(ctx.calls.some((call) => call.text === '连续除锈'));
  assert.ok(ctx.calls.some((call) => call.text === '3 天'));
});
```

- [ ] **Step 2: Update completion feedback creation**

Modify `createCurrentCompletionFeedback()` in `minigame/src/app-runtime.js`:

```js
const growthStats = savedProgress && savedProgress.growthStats;
const streakValue = growthStats && growthStats.currentStreak > 0
  ? `${growthStats.currentStreak} 天`
  : '已开始';
```

For campaign:

```js
stats: [
  { label: '闯关进度', value: `${levelNumber}/${levels.length}` },
  { label: '连续除锈', value: streakValue },
],
```

For practice:

```js
stats: [
  { label: '今日训练', value: `${growthStats ? growthStats.todayCompletedCount : 1} 局` },
  { label: '连续除锈', value: streakValue },
  { label: '当前训练', value: modeContext.title.replace('自由练习 · ', '') },
],
```

- [ ] **Step 3: Ensure renderer supports two or three stat cards**

Modify victory overlay drawing in `minigame/src/renderer.js` so `completionFeedback.stats` is the source of stat cards when provided. Keep existing fallback cards for older feedback objects.

Use this behavior:

```js
const stats = Array.isArray(feedback.stats) && feedback.stats.length > 0
  ? feedback.stats.slice(0, 3)
  : createFallbackCompletionStats(feedback);
```

- [ ] **Step 4: Audit copy safety**

Run:

```bash
rg -n "老年痴呆|阿尔茨海默|预防|降低.*概率|降低.*风险|医学证明|患病概率|治疗|金币|钻石|元宝|会员|VIP|商城|兑换码|红包|提现" minigame/src minigame/game.js minigame/game.json minigame/project.config.json
```

Expected: no output and exit code `1`.

- [ ] **Step 5: Run full tests**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Generate fresh WeChat preview QR**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /Users/tianhai/Documents/微信小游戏/output/minigame-preview-growth-0.2.0.png --info-output /Users/tianhai/Documents/微信小游戏/output/minigame-preview-growth-0.2.0-info.json
```

Expected: `✔ preview` and a fresh QR image at `output/minigame-preview-growth-0.2.0.png`.

- [ ] **Step 7: Commit**

```bash
git add minigame/src/app-runtime.js minigame/src/renderer.js minigame/src/derust.js minigame/test/derust.test.cjs minigame/test/renderer.test.cjs minigame/test/visual-snapshots.test.cjs output/minigame-preview-growth-0.2.0-info.json
git commit -m "feat: upgrade completion growth feedback"
```

Do not commit the QR image unless the project already tracks preview images.

---

## Self-Review Checklist

- Spec coverage:
  - 连续练习记录由 Task 1 和 Task 3 覆盖。
  - 24 关闯关包由 Task 2 覆盖。
  - 闯关进度展示由 Task 3 和 Task 5 覆盖。
  - 自由练习推荐、恢复、下一局轻微递进由 Task 4 覆盖。
  - 完成后成长反馈升级由 Task 5 覆盖。
  - 审核安全关键词扫查由 Task 5 覆盖。
- Scope control:
  - 不做每日一题。
  - 不做云存档、登录、排行榜、商业化系统。
  - 不恢复首页 24 个关卡卡片列表。
- Type consistency:
  - 用户可见训练难度使用 `warmup/steady/standard/advanced`。
  - 题库来源难度继续使用 `intro/easy/normal/hard`。
  - 闯关进度只来自 `completedLevelIds` 和 `levels.length`。
  - 连续练习来自 `growthStats`，不依赖 `dailyReport`。
