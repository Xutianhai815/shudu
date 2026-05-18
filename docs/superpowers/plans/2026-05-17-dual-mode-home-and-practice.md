# 双模式首页与自由训练 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在微信小游戏中加入 `闯关实验` 与 `自由训练` 双模式首页，让玩家既能继续主线通关，也能自主选择难度练习，且两种模式的存档和完成反馈边界清晰。

**Architecture:** 保留现有单 Canvas 渲染和本地存档架构。新增小型模式工具模块和自由训练难度菜单模块；`progress.js` 扩展为同时保存主线 `activeRun` 与练习 `practiceRun`；`game.js` 用 `scene` 和 `currentMode` 分流首页、难度选择、主线游戏和自由训练游戏。渲染层只消费布局数据和按钮标签，不承担业务判断。

**Tech Stack:** WeChat Mini Game Canvas runtime, CommonJS modules, Node `node:test`, existing renderer/layout/progress/puzzle modules.

---

## File Structure

- Create: `minigame/src/game-modes.js`
  - 负责模式常量、难度展示文案、自由训练题目选择、练习统计初始化与归一化。
- Create: `minigame/test/game-modes.test.cjs`
  - 覆盖难度映射、同难度换题、空难度池禁用逻辑。
- Create: `minigame/src/practice-menu.js`
  - 负责自由训练难度选择页布局和 hit test。
- Create: `minigame/test/practice-menu.test.cjs`
  - 覆盖四个难度卡片、返回首页命中、短屏不溢出。
- Modify: `minigame/src/progress.js`
  - 扩展本地存档结构：`practiceRun`、`practiceStats`、run mode 字段、兼容旧存档。
- Modify: `minigame/test/progress.test.cjs`
  - 覆盖主线和练习 run 并存、旧存档兼容、练习完成不污染主线。
- Modify: `minigame/src/menu.js`
  - 首页从单按钮改为 `modeCards`，保留 9×9 hero board，隐藏 12 关列表。
- Modify: `minigame/test/menu.test.cjs`
  - 覆盖 `闯关实验`、`自由训练` 卡片和 hit test。
- Modify: `minigame/src/layout.js`
  - 胜利弹层从两个按钮扩展为三个按钮，并允许按钮 action 由渲染/运行时解释。
- Modify: `minigame/test/layout.test.cjs`
  - 覆盖胜利页 `restart`、`next`、`home` 三个 action。
- Modify: `minigame/src/renderer.js`
  - 渲染双模式首页、自由训练难度页、自由训练顶部标签、模式化胜利按钮文案。
- Modify: `minigame/test/renderer.test.cjs`
  - 覆盖首页双卡片、难度选择页、自由训练完成页文案和安全词。
- Modify: `minigame/game.js`
  - 引入 `practiceDifficulty` scene 和 `currentMode`，实现主线/练习开始、继续、返回、完成动作分流。
- Modify: `minigame/test/game-runtime.test.cjs`
  - 覆盖首页进入自由训练、难度选择、练习完成不写主线、主线继续不受练习影响。
- Modify: `minigame/tools/render-snapshots.js`
  - 增加或更新双模式首页和自由训练难度页快照。
- Modify: `minigame/README.md`
  - 更新运行时验收清单和当前范围。

当前工作目录不是 git 仓库，执行计划时不要伪造 commit。每个任务完成后记录测试结果即可。

---

## Task 1: 数据模型与自由训练题目选择

**Files:**
- Create: `minigame/src/game-modes.js`
- Create: `minigame/test/game-modes.test.cjs`
- Modify: `minigame/src/progress.js`
- Modify: `minigame/test/progress.test.cjs`

- [ ] **Step 1: Write failing tests for mode helpers**

Add `minigame/test/game-modes.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const {
  DIFFICULTY_OPTIONS,
  createEmptyPracticeStats,
  getDifficultyOption,
  choosePracticeLevel,
  normalizePracticeStats,
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
```

- [ ] **Step 2: Run helper tests and verify red**

Run:

```bash
node --test minigame/test/game-modes.test.cjs
```

Expected: FAIL with `Cannot find module '../src/game-modes'`.

- [ ] **Step 3: Implement `game-modes.js`**

Create `minigame/src/game-modes.js`:

```js
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

  if (!DIFFICULTY_KEYS.includes(difficulty)) {
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
```

- [ ] **Step 4: Run helper tests and verify green**

Run:

```bash
node --test minigame/test/game-modes.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Write failing progress tests**

Append to `minigame/test/progress.test.cjs`:

```js
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
```

Update the `EMPTY_PROGRESS is a safe default progress object`, `normalizeProgress returns isolated empty progress for invalid input`, and `normalizeProgress filters completed levels and invalid active runs` expected objects to include:

```js
practiceRun: null,
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
```

- [ ] **Step 6: Run progress tests and verify red**

Run:

```bash
node --test minigame/test/progress.test.cjs
```

Expected: FAIL because `practiceRun` and `practiceStats` are missing.

- [ ] **Step 7: Extend `progress.js`**

Modify `minigame/src/progress.js`:

```js
const { createPuzzleStateFromSnapshot } = require('./puzzle');
const {
  createEmptyPracticeStats,
  normalizePracticeStats,
} = require('./game-modes');
```

Update `createEmptyProgress()`:

```js
function createEmptyProgress() {
  return {
    version: PROGRESS_VERSION,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: [],
    dailyReport: createEmptyDailyReport(),
    practiceStats: createEmptyPracticeStats(),
  };
}
```

Update `EMPTY_PROGRESS` to include frozen practice defaults:

```js
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
const EMPTY_PROGRESS = Object.freeze({
  ...createEmptyProgress(),
  completedLevelIds: Object.freeze([]),
  dailyReport: EMPTY_DAILY_REPORT,
  practiceStats: EMPTY_PRACTICE_STATS,
});
```

Change `createProgressFromState` to preserve optional practice data:

```js
function createProgressFromState(
  state,
  completedLevelIds = [],
  dailyReport = createEmptyDailyReport(),
  extras = {},
) {
  return {
    version: PROGRESS_VERSION,
    activeRun: serializeState(state, 'campaign'),
    practiceRun: isValidActiveRun(extras.practiceRun) ? normalizeActiveRun(extras.practiceRun, 'practice') : null,
    completedLevelIds: normalizeCompletedLevelIds(completedLevelIds),
    dailyReport: normalizeDailyReport(dailyReport),
    practiceStats: normalizePracticeStats(extras.practiceStats),
  };
}
```

Change `serializeState`:

```js
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
```

Change `normalizeProgress`:

```js
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
  };
}
```

Change `normalizeActiveRun`:

```js
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
```

Export `serializeState` as `createRunFromState` for `game.js`:

```js
module.exports = {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  createProgressFromState,
  createRunFromState: serializeState,
  normalizeProgress,
  restoreStateFromProgress,
};
```

- [ ] **Step 8: Run progress tests and helper tests**

Run:

```bash
node --test minigame/test/game-modes.test.cjs minigame/test/progress.test.cjs
```

Expected: PASS.

---

## Task 2: 首页双模式卡片

**Files:**
- Modify: `minigame/src/menu.js`
- Modify: `minigame/test/menu.test.cjs`
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write failing menu layout tests**

Add to `minigame/test/menu.test.cjs`:

```js
test('createMenuLayout exposes campaign and free training mode cards', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    hasPracticeRun: false,
    completedLevelIds: [],
  });

  assert.equal(layout.primaryButton, undefined);
  assert.equal(layout.continueButton, undefined);
  assert.deepEqual(layout.modeCards.map((card) => [card.mode, card.title, card.buttonLabel]), [
    ['campaign', '闯关实验', '开始闯关'],
    ['practice', '自由训练', '选择难度'],
  ]);
  assert.deepEqual(layout.levelCards, []);
});

test('createMenuLayout labels continue states for both modes independently', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    activeRunLevelId: 'lab-04',
    hasPracticeRun: true,
    practiceRunDifficulty: 'hard',
    completedLevelIds: ['lab-01', 'lab-02', 'lab-03'],
  });

  assert.equal(layout.modeCards[0].title, '继续闯关');
  assert.equal(layout.modeCards[0].buttonLabel, '继续闯关');
  assert.match(layout.modeCards[0].subtitle, /LAB-04/);
  assert.equal(layout.modeCards[1].title, '继续训练');
  assert.equal(layout.modeCards[1].buttonLabel, '继续训练');
  assert.match(layout.modeCards[1].subtitle, /挑战/);
});

test('hitTestMenu maps mode cards to campaign and practice actions', () => {
  const layout = createMenuLayout(430, 932, levels);
  const campaign = layout.modeCards[0];
  const practice = layout.modeCards[1];

  assert.deepEqual(hitTestMenu(layout, campaign.x + campaign.width / 2, campaign.y + campaign.height / 2), {
    type: 'menu',
    action: 'campaign',
  });
  assert.deepEqual(hitTestMenu(layout, practice.x + practice.width / 2, practice.y + practice.height / 2), {
    type: 'menu',
    action: 'practice',
  });
});
```

Update older assertions that read `primaryButton` and `continueButton` so they read `modeCards` instead. Keep tests that ensure `levelCards` stays `[]`, `heroBoard` remains 81 cells, and short screens do not overflow.

- [ ] **Step 2: Run menu tests and verify red**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: FAIL because `modeCards` is missing and `primaryButton` still exists.

- [ ] **Step 3: Implement dual-card menu layout**

Modify `minigame/src/menu.js`:

- Keep `heroBoard`, `ambientParticles`, `title`, `heroSubtitle`, and `levelCards: []`.
- Replace `primaryButton`/`continueButton` with `modeCards`.
- Add helpers:

```js
function createModeCards(width, height, margin, heroBoard, progressSummary, levels) {
  const compact = height < 760;
  const cardGap = compact ? 10 : 12;
  const cardHeight = compact ? 94 : 112;
  const cardsTop = Math.min(
    heroBoard.y + heroBoard.size + (compact ? 16 : 22),
    height - margin - cardHeight * 2 - cardGap - 12,
  );
  const cardWidth = width - margin * 2;

  return [
    createCampaignCard(margin, cardsTop, cardWidth, cardHeight, progressSummary, levels),
    createPracticeCard(margin, cardsTop + cardHeight + cardGap, cardWidth, cardHeight, progressSummary),
  ];
}

function createCampaignCard(x, y, width, height, progressSummary, levels) {
  if (progressSummary.hasActiveRun) {
    const level = levels.find((item) => item.id === progressSummary.activeRunLevelId);
    return {
      x,
      y,
      width,
      height,
      mode: 'campaign',
      action: 'campaign',
      title: '继续闯关',
      subtitle: `继续 ${level ? level.label : '当前关卡'}，本局进度已保存。`,
      buttonLabel: '继续闯关',
      tone: 'dark',
    };
  }

  const completedCount = Array.isArray(progressSummary.completedLevelIds)
    ? progressSummary.completedLevelIds.length
    : 0;

  return {
    x,
    y,
    width,
    height,
    mode: 'campaign',
    action: 'campaign',
    title: '闯关实验',
    subtitle:
      completedCount > 0
        ? `已完成 ${completedCount}/12 个实验，继续推进下一关。`
        : '从 LAB-01 开始，完成 12 个数独实验。',
    buttonLabel: completedCount > 0 ? '继续下一关' : '开始闯关',
    tone: 'dark',
  };
}

function createPracticeCard(x, y, width, height, progressSummary) {
  if (progressSummary.hasPracticeRun) {
    return {
      x,
      y,
      width,
      height,
      mode: 'practice',
      action: 'practice',
      title: '继续训练',
      subtitle: `继续上次的 ${getPracticeDifficultyLabel(progressSummary.practiceRunDifficulty)} 训练。`,
      buttonLabel: '继续训练',
      tone: 'light',
      difficultyDots: ['入门', '简单', '标准', '挑战'],
    };
  }

  return {
    x,
    y,
    width,
    height,
    mode: 'practice',
    action: 'practice',
    title: '自由训练',
    subtitle: '选一个难度，给大脑做一局轻量热身。',
    buttonLabel: '选择难度',
    tone: 'light',
    difficultyDots: ['入门', '简单', '标准', '挑战'],
  };
}

function getPracticeDifficultyLabel(difficulty) {
  return {
    intro: '入门',
    easy: '简单',
    normal: '标准',
    hard: '挑战',
  }[difficulty] || '自由';
}
```

Update `hitTestMenu`:

```js
function hitTestMenu(layout, x, y) {
  const card = Array.isArray(layout.modeCards)
    ? layout.modeCards.find((item) => isInside(item, x, y))
    : null;

  if (card) {
    return {
      type: 'menu',
      action: card.action,
    };
  }

  return null;
}
```

- [ ] **Step 4: Update menu renderer and tests**

Add renderer test:

```js
test('renderer draws dual mode cards on the home screen', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    hasPracticeRun: false,
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /闯关实验/);
  assert.match(text, /自由训练/);
  assert.match(text, /开始闯关/);
  assert.match(text, /选择难度/);
  assert.equal(/今日报告|累计除锈/.test(text), false);
});
```

Modify `drawMenuActions` in `renderer.js` to draw `layout.modeCards`:

```js
function drawMenuActions(ctx, layout) {
  if (Array.isArray(layout.modeCards)) {
    layout.modeCards.forEach((card) => drawModeCard(ctx, card));
    return;
  }
}
```

Add `drawModeCard`:

```js
function drawModeCard(ctx, card) {
  const dark = card.tone === 'dark';
  roundRect(ctx, card.x, card.y, card.width, card.height, 22, dark ? '#18211f' : 'rgba(255, 255, 255, 0.72)');

  ctx.fillStyle = dark ? '#ffffff' : '#18211f';
  ctx.font = '900 20px sans-serif';
  ctx.fillText(card.title, card.x + 18, card.y + 30);

  ctx.fillStyle = dark ? 'rgba(246, 255, 244, 0.68)' : 'rgba(24, 33, 31, 0.62)';
  ctx.font = '800 12px sans-serif';
  ctx.fillText(card.subtitle, card.x + 18, card.y + 54);

  if (Array.isArray(card.difficultyDots)) {
    card.difficultyDots.forEach((label, index) => {
      chip(
        ctx,
        card.x + 18 + index * 45,
        card.y + card.height - 32,
        38,
        22,
        label,
        'rgba(22, 163, 160, 0.12)',
        dark ? '#f6fff4' : '#087471',
      );
    });
  }

  ctx.fillStyle = dark ? '#ffc861' : '#087471';
  ctx.font = '900 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(card.buttonLabel, card.x + card.width - 18, card.y + card.height - 18);
  ctx.textAlign = 'left';
}
```

- [ ] **Step 5: Run menu and renderer tests**

Run:

```bash
node --test minigame/test/menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

---

## Task 3: 自由训练难度选择页

**Files:**
- Create: `minigame/src/practice-menu.js`
- Create: `minigame/test/practice-menu.test.cjs`
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write failing difficulty menu tests**

Add `minigame/test/practice-menu.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createPracticeMenuLayout, hitTestPracticeMenu } = require('../src/practice-menu');

test('createPracticeMenuLayout exposes four difficulty cards', () => {
  const layout = createPracticeMenuLayout(430, 932, levels, { topInset: 92 });

  assert.ok(layout.title.y >= 92);
  assert.deepEqual(layout.difficultyCards.map((card) => [card.difficulty, card.label]), [
    ['intro', '入门'],
    ['easy', '简单'],
    ['normal', '标准'],
    ['hard', '挑战'],
  ]);
  assert.ok(layout.difficultyCards.every((card) => card.enabled));
});

test('hitTestPracticeMenu maps back and difficulty cards', () => {
  const layout = createPracticeMenuLayout(430, 932, levels);
  const intro = layout.difficultyCards[0];

  assert.deepEqual(hitTestPracticeMenu(layout, layout.backButton.x + 10, layout.backButton.y + 10), {
    type: 'practiceMenu',
    action: 'back',
  });
  assert.deepEqual(hitTestPracticeMenu(layout, intro.x + intro.width / 2, intro.y + intro.height / 2), {
    type: 'practiceMenu',
    action: 'difficulty',
    difficulty: 'intro',
  });
});

test('createPracticeMenuLayout disables unavailable difficulty cards', () => {
  const introOnly = levels.filter((level) => level.difficulty === 'intro');
  const layout = createPracticeMenuLayout(430, 932, introOnly);
  const hard = layout.difficultyCards.find((card) => card.difficulty === 'hard');

  assert.equal(hard.enabled, false);
  assert.equal(hard.badge, '暂未开放');
});
```

- [ ] **Step 2: Run difficulty menu tests and verify red**

Run:

```bash
node --test minigame/test/practice-menu.test.cjs
```

Expected: FAIL with `Cannot find module '../src/practice-menu'`.

- [ ] **Step 3: Implement `practice-menu.js`**

Create `minigame/src/practice-menu.js`:

```js
const { DIFFICULTY_OPTIONS } = require('./game-modes');

function createPracticeMenuLayout(width, height, levels, options = {}) {
  const margin = 22;
  const compact = height < 760;
  const topY = Math.max(compact ? 42 : 72, normalizeTopInset(options.topInset, height));
  const cardGap = compact ? 10 : 12;
  const cardHeight = compact ? 76 : 88;
  const cardsTop = topY + (compact ? 88 : 112);
  const cardWidth = width - margin * 2;
  const availableDifficulties = new Set((levels || []).map((level) => level.difficulty));

  return {
    width,
    height,
    margin,
    compact,
    title: {
      x: margin,
      y: topY,
      text: '自由训练',
      subtitle: '选一个难度，今天只练一局也很好。',
    },
    backButton: {
      x: margin,
      y: topY - 8,
      width: 44,
      height: 44,
    },
    difficultyCards: DIFFICULTY_OPTIONS.map((option, index) => {
      const enabled = availableDifficulties.has(option.difficulty);
      return {
        x: margin,
        y: cardsTop + index * (cardHeight + cardGap),
        width: cardWidth,
        height: cardHeight,
        difficulty: option.difficulty,
        label: option.label,
        description: option.description,
        enabled,
        badge: enabled ? '开始' : '暂未开放',
      };
    }),
  };
}

function hitTestPracticeMenu(layout, x, y) {
  if (isInside(layout.backButton, x, y)) {
    return {
      type: 'practiceMenu',
      action: 'back',
    };
  }

  const card = layout.difficultyCards.find((item) => item.enabled && isInside(item, x, y));
  if (card) {
    return {
      type: 'practiceMenu',
      action: 'difficulty',
      difficulty: card.difficulty,
    };
  }

  return null;
}

function normalizeTopInset(topInset, height) {
  if (!Number.isFinite(topInset) || topInset < 0) {
    return 0;
  }

  return Math.min(topInset, Math.max(0, height * 0.22));
}

function isInside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

module.exports = {
  createPracticeMenuLayout,
  hitTestPracticeMenu,
};
```

- [ ] **Step 4: Add renderer support for practice menu**

Add export in `renderer.js`:

```js
function renderPracticeMenu(ctx, layout) {
  ctx.save();
  try {
    clear(ctx, layout.width, layout.height);
    drawMenuBackground(ctx, layout);
    drawPracticeMenuContent(ctx, layout);
  } finally {
    ctx.restore();
  }
}
```

Add drawing helper:

```js
function drawPracticeMenuContent(ctx, layout) {
  drawButton(ctx, layout.backButton.x, layout.backButton.y, 44, 44, '‹', 'rgba(255, 255, 255, 0.68)', '#18211f');

  ctx.fillStyle = '#18211f';
  ctx.font = layout.compact ? '900 31px sans-serif' : '900 36px sans-serif';
  ctx.fillText(layout.title.text, layout.title.x, layout.title.y + 56);

  ctx.fillStyle = 'rgba(24, 33, 31, 0.64)';
  ctx.font = '800 13px sans-serif';
  ctx.fillText(layout.title.subtitle, layout.title.x, layout.title.y + 84);

  layout.difficultyCards.forEach((card) => {
    roundRect(ctx, card.x, card.y, card.width, card.height, 20, card.enabled ? 'rgba(255, 255, 255, 0.76)' : 'rgba(255, 255, 255, 0.42)');
    ctx.fillStyle = card.enabled ? '#18211f' : 'rgba(24, 33, 31, 0.38)';
    ctx.font = '900 20px sans-serif';
    ctx.fillText(card.label, card.x + 18, card.y + 30);
    ctx.fillStyle = card.enabled ? 'rgba(24, 33, 31, 0.62)' : 'rgba(24, 33, 31, 0.34)';
    ctx.font = '800 12px sans-serif';
    ctx.fillText(card.description, card.x + 18, card.y + 54);
    ctx.fillStyle = card.enabled ? '#087471' : 'rgba(24, 33, 31, 0.34)';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(card.badge, card.x + card.width - 18, card.y + card.height / 2 + 4);
    ctx.textAlign = 'left';
  });
}
```

Export `renderPracticeMenu`.

Add renderer test:

```js
test('renderer draws practice difficulty menu', () => {
  const ctx = createMockCanvasContext();
  const { createPracticeMenuLayout } = require('../src/practice-menu');
  const layout = createPracticeMenuLayout(430, 932, levels);

  renderPracticeMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /自由训练/);
  assert.match(text, /入门/);
  assert.match(text, /简单/);
  assert.match(text, /标准/);
  assert.match(text, /挑战/);
});
```

- [ ] **Step 5: Run practice menu and renderer tests**

Run:

```bash
node --test minigame/test/practice-menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

---

## Task 4: 游戏页模式标识与三按钮完成页

**Files:**
- Modify: `minigame/src/layout.js`
- Modify: `minigame/test/layout.test.cjs`
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write failing layout tests for home victory action**

Update `minigame/test/layout.test.cjs`:

```js
test('hitTest maps victory overlay buttons to restart next and home actions', () => {
  const layout = createLayout(430, 932);
  const restartButton = layout.victory.restart;
  const nextButton = layout.victory.next;
  const homeButton = layout.victory.home;

  assert.deepEqual(hitTest(layout, restartButton.x + restartButton.width / 2, restartButton.y + restartButton.height / 2, true), {
    type: 'victory',
    action: 'restart',
  });
  assert.deepEqual(hitTest(layout, nextButton.x + nextButton.width / 2, nextButton.y + nextButton.height / 2, true), {
    type: 'victory',
    action: 'next',
  });
  assert.deepEqual(hitTest(layout, homeButton.x + homeButton.width / 2, homeButton.y + homeButton.height / 2, true), {
    type: 'victory',
    action: 'home',
  });
});
```

- [ ] **Step 2: Run layout tests and verify red**

Run:

```bash
node --test minigame/test/layout.test.cjs
```

Expected: FAIL because `layout.victory.home` is undefined.

- [ ] **Step 3: Add third victory button**

Modify `createVictoryLayout` in `layout.js`:

```js
function createVictoryLayout(width, height) {
  const panelWidth = Math.min(width - 48, 330);
  const panelHeight = 368;
  const x = (width - panelWidth) / 2;
  const y = Math.max(64, (height - panelHeight) / 2);
  const buttonHeight = 38;
  const panelBottomPadding = 16;
  const buttonY = y + panelHeight - panelBottomPadding - buttonHeight;
  const buttonGap = 8;
  const buttonWidth = (panelWidth - 44 - buttonGap * 2) / 3;

  return {
    panel: { x, y, width: panelWidth, height: panelHeight },
    restart: {
      x: x + 22,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      action: 'restart',
    },
    next: {
      x: x + 22 + buttonWidth + buttonGap,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      action: 'next',
    },
    home: {
      x: x + 22 + (buttonWidth + buttonGap) * 2,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      action: 'home',
    },
  };
}
```

Update `hitTestVictory` to include home.

- [ ] **Step 4: Add renderer tests for mode labels and victory labels**

Add to `minigame/test/renderer.test.cjs`:

```js
test('renderer shows free training top bar instead of LAB metadata', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    modeContext: {
      mode: 'practice',
      label: '自由训练',
      title: '自由训练 · 入门',
    },
  });

  const text = getDrawnText(ctx);
  assert.match(text, /自由训练 · 入门/);
  assert.equal(text.includes('LAB-01'), false);
});

test('renderer draws practice victory action labels', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[9]),
    completed: true,
  };
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    victoryActions: {
      restart: '再练一局',
      next: '换个难度',
      home: '回首页',
    },
  });

  const text = getDrawnText(ctx);
  assert.match(text, /再练一局/);
  assert.match(text, /换个难度/);
  assert.match(text, /回首页/);
});
```

- [ ] **Step 5: Implement renderer mode labels and victory labels**

In `renderGame`, pass through options:

```js
modeContext: options.modeContext,
victoryActions: options.victoryActions,
```

Modify `drawTopBar`:

```js
const topLabel = layout.modeContext && layout.modeContext.mode === 'practice'
  ? layout.modeContext.label
  : layout.level.label;
const topTitle = layout.modeContext && layout.modeContext.mode === 'practice'
  ? layout.modeContext.title
  : layout.level.title;
ctx.fillText(topLabel, topBar.x + 58, topBar.y + 14);
ctx.fillText(topTitle, topBar.x + 58, topBar.y + 36);
```

Modify `drawVictoryOverlay` button drawing:

```js
const actionLabels = {
  restart: '再试一次',
  next: '下一关',
  home: '回首页',
  ...(layout.victoryActions || {}),
};

drawVictoryButton(ctx, restart.x, restart.y, restart.width, actionLabels.restart, 'rgba(246, 255, 244, 0.9)', '#0b241d');
drawVictoryButton(ctx, next.x, next.y, next.width, actionLabels.next, '#ffc861', '#0b241d');
drawVictoryButton(ctx, layout.victory.home.x, layout.victory.home.y, layout.victory.home.width, actionLabels.home, 'rgba(246, 255, 244, 0.72)', '#0b241d');
```

- [ ] **Step 6: Run layout and renderer tests**

Run:

```bash
node --test minigame/test/layout.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

---

## Task 5: Runtime mode flow and persistence

**Files:**
- Modify: `minigame/game.js`
- Modify: `minigame/test/game-runtime.test.cjs`

- [ ] **Step 1: Write failing runtime tests**

Add tests to `minigame/test/game-runtime.test.cjs`:

```js
test('runtime enters free training difficulty selection from the home screen', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');

    assert.match(runtime.drawnText(), /自由训练/);
    assert.match(runtime.drawnText(), /入门/);
    assert.match(runtime.drawnText(), /挑战/);
  } finally {
    runtime.restore();
  }
});

test('runtime starts a hard free training puzzle without writing campaign completion', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeDifficulty(runtime, 'hard');

    let game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'hard');
    assert.match(runtime.drawnText(), /自由训练 · 挑战/);

    completePuzzleWithTouchInput(runtime);
    game = runtime.latestGameCall();

    assert.equal(game.state.completed, true);
    assert.match(runtime.drawnText(), /再练一局/);
    assert.match(runtime.drawnText(), /换个难度/);
    assert.match(runtime.drawnText(), /回首页/);
    assert.equal(runtime.completedWrite().completedLevelIds.includes(game.state.level.id), false);
    assert.ok(runtime.completedWrite().dailyReport.completionCount >= 1);
  } finally {
    runtime.restore();
  }
});

test('runtime keeps campaign and free training saves independent', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeDifficulty(runtime, 'intro');
    fillMutableCells(runtime, 1);
    tapBack(runtime);

    tapMenuMode(runtime, 'campaign');
    fillMutableCells(runtime, 1);
    tapBack(runtime);

    const latestSave = runtime.savedWrites.at(-1).value;
    assert.ok(latestSave.activeRun);
    assert.ok(latestSave.practiceRun);
    assert.equal(latestSave.activeRun.mode, 'campaign');
    assert.equal(latestSave.practiceRun.mode, 'practice');
  } finally {
    runtime.restore();
  }
});
```

Add helpers:

```js
function tapMenuMode(runtime, mode) {
  const card = runtime.latestMenuCall().layout.modeCards.find((item) => item.mode === mode);
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapPracticeDifficulty(runtime, difficulty) {
  const call = runtime.latestPracticeMenuCall();
  const card = call.layout.difficultyCards.find((item) => item.difficulty === difficulty);
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapBack(runtime) {
  const game = runtime.latestGameCall();
  runtime.touch(game.layout.backButton.x + game.layout.backButton.width / 2, game.layout.backButton.y + game.layout.backButton.height / 2);
}
```

Patch `bootGameRuntime` renderer hook to capture `renderPracticeMenu`:

```js
renderPracticeMenu(ctxArg, layoutArg) {
  renderCalls.push({
    type: 'practiceMenu',
    layout: layoutArg,
  });
  return actual.renderPracticeMenu(ctxArg, layoutArg);
}
```

Add:

```js
latestPracticeMenuCall() {
  const call = [...renderCalls].reverse().find((item) => item.type === 'practiceMenu');
  assert.ok(call);
  return call;
}
```

- [ ] **Step 2: Run runtime tests and verify red**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: FAIL because runtime has no `practiceDifficulty` scene and no `renderPracticeMenu`.

- [ ] **Step 3: Wire imports and runtime state**

Modify `game.js` imports:

```js
const { createPracticeMenuLayout, hitTestPracticeMenu } = require('./src/practice-menu');
const {
  choosePracticeLevel,
  createEmptyPracticeStats,
  getDifficultyOption,
  recordPracticeCompletion,
} = require('./src/game-modes');
const {
  createProgressFromState,
  createRunFromState,
  restoreStateFromProgress,
} = require('./src/progress');
const { renderGame, renderMenu, renderPracticeMenu } = require('./src/renderer');
```

Add runtime fields:

```js
let currentMode = 'campaign';
let practiceMenuLayout = null;
```

- [ ] **Step 4: Layout refresh and render practice menu**

In `setupCanvas`, after `refreshMenuLayout()`:

```js
refreshPracticeMenuLayout();
```

Add:

```js
function refreshPracticeMenuLayout() {
  if (!layout) {
    return;
  }

  practiceMenuLayout = createPracticeMenuLayout(layout.width, layout.height, levels, { topInset });
}
```

Modify `render()`:

```js
if (scene === 'practiceDifficulty' && practiceMenuLayout) {
  renderPracticeMenu(ctx, practiceMenuLayout);
  return;
}
```

In `renderGame` options:

```js
modeContext: createModeContext(),
victoryActions: createVictoryActions(),
```

Add:

```js
function createModeContext() {
  if (currentMode !== 'practice' || !state || !state.level) {
    return { mode: 'campaign' };
  }

  const option = getDifficultyOption(state.level.difficulty);
  return {
    mode: 'practice',
    label: '自由训练',
    title: `自由训练 · ${option ? option.label : '训练'}`,
  };
}

function createVictoryActions() {
  if (currentMode === 'practice') {
    return {
      restart: '再练一局',
      next: '换个难度',
      home: '回首页',
    };
  }

  return {
    restart: '再试一次',
    next: '下一关',
    home: '回首页',
  };
}
```

- [ ] **Step 5: Handle menu and practice menu touches**

Modify touch dispatcher:

```js
if (scene === 'practiceDifficulty') {
  handlePracticeMenuTouch(touch);
  return;
}
```

Modify `handleMenuTouch`:

```js
if (hit.action === 'campaign') {
  startOrContinueCampaign();
  return;
}

if (hit.action === 'practice') {
  startOrContinuePractice();
}
```

Add:

```js
function startOrContinueCampaign() {
  const restored = restoreStateFromProgress(savedProgress && savedProgress.activeRun, levels);

  if (restored) {
    currentMode = 'campaign';
    state = restored;
    scene = 'playing';
    resetCompanionSession(state.level);
    stopMenuAnimation();
    render();
    return;
  }

  startLevel(levels[0], 'campaign');
}

function startOrContinuePractice() {
  const restored = restoreStateFromProgress(savedProgress && savedProgress.practiceRun, levels);

  if (restored) {
    currentMode = 'practice';
    state = restored;
    scene = 'playing';
    resetCompanionSession(state.level);
    stopMenuAnimation();
    render();
    return;
  }

  scene = 'practiceDifficulty';
  stopMenuAnimation();
  refreshPracticeMenuLayout();
  render();
}

function handlePracticeMenuTouch(touch) {
  const hit = practiceMenuLayout && hitTestPracticeMenu(practiceMenuLayout, touch.clientX, touch.clientY);

  if (!hit) {
    return;
  }

  if (hit.action === 'back') {
    scene = 'menu';
    refreshMenuLayout();
    startMenuAnimation();
    render();
    return;
  }

  if (hit.action === 'difficulty') {
    const level = choosePracticeLevel(levels, hit.difficulty, savedProgress && savedProgress.practiceStats);
    if (level) {
      startLevel(level, 'practice');
    }
  }
}
```

Update `startLevel`:

```js
function startLevel(level, mode = 'campaign') {
  currentMode = mode;
  state = createPuzzleState(level);
  resetCompanionSession(level);
  persistProgress();
  scene = 'playing';
  stopMenuAnimation();
  render();
}
```

- [ ] **Step 6: Persist campaign and practice independently**

Replace `persistProgress()` with:

```js
function persistProgress() {
  if (!state) {
    return;
  }

  const previous = savedProgress || {};
  const activeRun = currentMode === 'campaign'
    ? createRunFromState(state, 'campaign')
    : previous.activeRun || null;
  const practiceRun = currentMode === 'practice' && !state.completed
    ? createRunFromState(state, 'practice')
    : previous.practiceRun || null;

  savedProgress = {
    version: 1,
    activeRun,
    practiceRun,
    completedLevelIds,
    dailyReport: previous.dailyReport,
    practiceStats: previous.practiceStats || createEmptyPracticeStats(),
  };
  saveProgress(wx, savedProgress);
  refreshMenuLayout();
}
```

Update `refreshMenuLayout()` progress summary:

```js
hasActiveRun: Boolean(savedProgress && savedProgress.activeRun && !savedProgress.activeRun.completed),
activeRunLevelId: savedProgress && savedProgress.activeRun && savedProgress.activeRun.levelId,
hasPracticeRun: Boolean(savedProgress && savedProgress.practiceRun && !savedProgress.practiceRun.completed),
practiceRunDifficulty: savedProgress && savedProgress.practiceRun && savedProgress.practiceRun.difficulty,
```

- [ ] **Step 7: Record completion by mode**

Modify `recordCompletedLevel()`:

```js
function recordCompletedLevel() {
  if (!state || !state.level || !state.level.id) {
    return;
  }

  const levelId = state.level.id;
  const previous = savedProgress || {};
  const nextDailyReport = createNextDailyReport(
    previous.dailyReport,
    levelId,
    getTodayKey(),
  );

  if (currentMode === 'practice') {
    savedProgress = {
      ...previous,
      practiceRun: null,
      completedLevelIds,
      dailyReport: nextDailyReport,
      practiceStats: recordPracticeCompletion(previous.practiceStats, state.level),
    };
    return;
  }

  completedLevelIds = Array.from(new Set([...completedLevelIds, levelId]));
  savedProgress = {
    ...previous,
    completedLevelIds,
    dailyReport: nextDailyReport,
  };
}
```

- [ ] **Step 8: Handle victory actions by mode**

Modify `applyVictoryAction`:

```js
function applyVictoryAction(action) {
  persistProgress();

  if (action === 'home') {
    playSound('tool');
    scene = 'menu';
    refreshMenuLayout();
    startMenuAnimation();
    return;
  }

  if (currentMode === 'practice') {
    applyPracticeVictoryAction(action);
    return;
  }

  applyCampaignVictoryAction(action);
}
```

Add:

```js
function applyCampaignVictoryAction(action) {
  if (action === 'restart') {
    playSound('tool');
    state = retrySameDifficultyLevel(state);
    resetCompanionSession(state.level);
    persistProgress();
    return;
  }

  if (action === 'next') {
    playSound('tool');
    state = nextLevel(state);
    resetCompanionSession(state.level);
    persistProgress();
  }
}

function applyPracticeVictoryAction(action) {
  if (action === 'restart') {
    playSound('tool');
    const level = choosePracticeLevel(levels, state.level.difficulty, savedProgress && savedProgress.practiceStats);
    state = createPuzzleState(level || state.level);
    resetCompanionSession(state.level);
    persistProgress();
    return;
  }

  if (action === 'next') {
    playSound('tool');
    scene = 'practiceDifficulty';
    refreshPracticeMenuLayout();
  }
}
```

- [ ] **Step 9: Run runtime tests**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: PASS.

---

## Task 6: Documentation, snapshots, and full verification

**Files:**
- Modify: `minigame/README.md`
- Modify: `minigame/tools/render-snapshots.js`
- Test/verify only: all test files

- [ ] **Step 1: Update README scope and checklist**

In `minigame/README.md`, update runtime checklist:

```md
- The home screen shows two mode cards: `闯关实验` and `自由训练`.
- Tapping `闯关实验` starts or continues the campaign flow.
- Tapping `自由训练` opens the difficulty selector with `入门`、`简单`、`标准`、`挑战`.
- Completing a free training puzzle does not mark campaign levels complete.
- Free training completion shows `再练一局`、`换个难度`、`回首页`.
```

Update Current Scope:

```md
- Dual-mode home screen: campaign progression via `闯关实验`, and difficulty-selected practice via `自由训练`.
- Independent local saves for campaign runs and free training runs.
```

- [ ] **Step 2: Update visual snapshots**

Modify `minigame/tools/render-snapshots.js` so it renders:

- `menu.svg`: dual mode home screen.
- `practiceMenu.svg`: free training difficulty selector.
- `gameplayDebug.svg`: campaign gameplay.
- `victory.svg`: campaign victory.
- `practiceVictory.svg`: practice victory state with `再练一局`、`换个难度`、`回首页`.

- [ ] **Step 3: Run focused test suites**

Run:

```bash
node --test minigame/test/game-modes.test.cjs
node --test minigame/test/progress.test.cjs
node --test minigame/test/menu.test.cjs
node --test minigame/test/practice-menu.test.cjs
node --test minigame/test/layout.test.cjs
node --test minigame/test/renderer.test.cjs
node --test minigame/test/game-runtime.test.cjs
```

Expected: each command exits 0.

- [ ] **Step 4: Run full Node verification**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: all tests pass.

- [ ] **Step 5: Generate SVG snapshots**

Run:

```bash
node minigame/tools/render-snapshots.js
```

Expected: SVG files written under `minigame/artifacts/visual/`, including the updated menu and practice menu snapshots.

- [ ] **Step 6: Generate WeChat preview**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /private/tmp/lab-lines-sudoku-dual-mode-preview.png --info-output /private/tmp/lab-lines-sudoku-dual-mode-preview.json
```

Expected: command exits 0 and writes both preview files. Inspect:

```bash
sed -n '1,220p' /private/tmp/lab-lines-sudoku-dual-mode-preview.json
ls -lh /private/tmp/lab-lines-sudoku-dual-mode-preview.png
```

Expected: JSON includes package size and PNG exists.

---

## Self-Review

- Spec coverage: data separation, dual home cards, difficulty selector, mode-specific gameplay labels, mode-specific victory buttons, feedback safety, tests, snapshots, and preview are all covered.
- Placeholder scan: no placeholder markers or open-ended implementation instructions are intentionally left.
- Type consistency: `mode` uses `'campaign' | 'practice'`; difficulty uses existing `intro/easy/normal/hard`; menu actions use `campaign/practice`; practice menu actions use `back/difficulty`; victory actions remain `restart/next/home`.
- Scope control: no cloud saves, no generated Sudoku engine, no leaderboard, no achievements, no background music, no variant Sudoku rules.
