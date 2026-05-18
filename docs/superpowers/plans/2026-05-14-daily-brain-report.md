# 每日脑力报告 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 当前目录不是 git 仓库，所以每个任务末尾使用“验证检查点”替代 commit。

**Goal:** 在现有“大脑除锈完成”反馈基础上，增加本地自然日维度的“每日脑力报告”，让玩家看到今日完成次数和今日除锈值。

**Architecture:** `progress.js` 只负责存档结构兼容和数据净化，`derust.js` 负责日期 key、日报累计和文案摘要，`menu.js` 与 `renderer.js` 继续只消费布局/反馈数据。`game.js` 在通关状态从未完成跃迁到完成时记录一次日报事件，避免后续保存、下一关、重开等动作重复计数。

**Tech Stack:** 微信小游戏 Canvas 2D、CommonJS JavaScript、Node 内置测试运行器。

---

## 文件结构

- 修改 `minigame/src/progress.js`：扩展 `dailyReport` 默认值、归一化、序列化兼容。
- 修改 `minigame/test/progress.test.cjs`：覆盖旧存档兼容、异常日报净化、序列化第三参数。
- 修改 `minigame/src/derust.js`：新增 `getTodayKey`、`createDailyReportSummary`、`createNextDailyReport`，并扩展完成反馈统计。
- 修改 `minigame/test/derust.test.cjs`：覆盖日报摘要、跨日重置、同关重复日内计数、医学宣称边界。
- 修改 `minigame/src/menu.js`：接收 `dailyReportSummary`，菜单布局不直接计算日期或次数。
- 修改 `minigame/test/menu.test.cjs`：覆盖菜单使用传入的今日日报摘要，并保留旧累计摘要 fallback。
- 修改 `minigame/game.js`：在通关跃迁时记录一次日报，渲染菜单和胜利弹层时传入日报数据。
- 修改 `minigame/test/game-runtime.test.cjs`：覆盖 debug 通关只记录一次日报，菜单显示今日报告。
- 修改 `minigame/test/renderer.test.cjs`：覆盖通关弹层绘制今日训练统计。
- 修改 `minigame/test/render-snapshots.js` 和快照图片：让视觉快照反映“今日报告 / 今日训练”。

---

### 任务 1：扩展进度模型支持 `dailyReport`

**Files:**
- Modify: `minigame/src/progress.js`
- Modify: `minigame/test/progress.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/progress.test.cjs` 追加：

```js
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
      completedLevelIds: ['lab-02'],
      dailyReport: {
        date: '',
        completionCount: 0,
        completedLevelIds: [],
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
```

同时更新既有 `EMPTY_PROGRESS` 和 invalid input 断言，把 `dailyReport` 加进去：

```js
{
  version: 1,
  activeRun: null,
  completedLevelIds: [],
  dailyReport: {
    date: '',
    completionCount: 0,
    completedLevelIds: [],
  },
}
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/progress.test.cjs
```

Expected: FAIL，至少包含 `dailyReport` 缺失或 `createProgressFromState` 未序列化第三参数的断言失败。

- [ ] **Step 3: 实现最小进度模型变更**

在 `minigame/src/progress.js` 中替换相关实现：

```js
const PROGRESS_VERSION = 1;
const EMPTY_DAILY_REPORT = Object.freeze({
  date: '',
  completionCount: 0,
  completedLevelIds: Object.freeze([]),
});
const EMPTY_PROGRESS = Object.freeze({
  ...createEmptyProgress(),
  completedLevelIds: Object.freeze([]),
  dailyReport: EMPTY_DAILY_REPORT,
});

function createEmptyProgress() {
  return {
    version: PROGRESS_VERSION,
    activeRun: null,
    completedLevelIds: [],
    dailyReport: createEmptyDailyReport(),
  };
}

function createEmptyDailyReport() {
  return {
    date: '',
    completionCount: 0,
    completedLevelIds: [],
  };
}

function createProgressFromState(state, completedLevelIds = [], dailyReport = createEmptyDailyReport()) {
  return {
    version: PROGRESS_VERSION,
    activeRun: serializeState(state),
    completedLevelIds: normalizeCompletedLevelIds(completedLevelIds),
    dailyReport: normalizeDailyReport(dailyReport),
  };
}

function normalizeProgress(progress) {
  if (!progress || progress.version !== PROGRESS_VERSION) {
    return createEmptyProgress();
  }

  return {
    version: PROGRESS_VERSION,
    activeRun: isValidActiveRun(progress.activeRun) ? normalizeActiveRun(progress.activeRun) : null,
    completedLevelIds: normalizeCompletedLevelIds(progress.completedLevelIds),
    dailyReport: normalizeDailyReport(progress.dailyReport),
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
```

在 `module.exports` 中导出测试和后续任务会使用的函数：

```js
module.exports = {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  createProgressFromState,
  normalizeProgress,
  restoreStateFromProgress,
};
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/progress.test.cjs minigame/test/storage.test.cjs
node --check minigame/src/progress.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/progress.test.cjs minigame/test/storage.test.cjs
```

Expected: PASS，确认旧存档读取和 storage normalize 仍兼容。

---

### 任务 2：新增日报纯函数和通关反馈统计

**Files:**
- Modify: `minigame/src/derust.js`
- Modify: `minigame/test/derust.test.cjs`

- [ ] **Step 1: 写失败测试**

更新 `minigame/test/derust.test.cjs` 的导入：

```js
const {
  DERUST_DISCLAIMER,
  createCompletionFeedback,
  createDailyReportSummary,
  createDerustSummary,
  createNextDailyReport,
  getTodayKey,
} = require('../src/derust');
```

把 `createCompletionFeedback returns playful derust copy for completed state` 中的 `feedback.stats` 断言改为：

```js
assert.deepEqual(feedback.stats, [
  { label: '今日训练', value: '1 次' },
  { label: '错误数', value: '1' },
]);
```

把 `normalizes negative or invalid mistakes` 和 `handles invalid state` 两个测试中的 stats 断言也改为第一项 `今日训练`。

追加以下测试：

```js
test('getTodayKey formats local calendar date as YYYY-MM-DD', () => {
  assert.equal(getTodayKey(new Date(2026, 4, 14, 23, 59, 0)), '2026-05-14');
  assert.equal(getTodayKey(new Date(2026, 0, 3, 8, 0, 0)), '2026-01-03');
});

test('createNextDailyReport increments same-day completion events including repeated level', () => {
  assert.deepEqual(
    createNextDailyReport(
      {
        date: '2026-05-14',
        completionCount: 1,
        completedLevelIds: ['lab-02'],
      },
      'lab-02',
      '2026-05-14',
    ),
    {
      date: '2026-05-14',
      completionCount: 2,
      completedLevelIds: ['lab-02'],
    },
  );
});

test('createNextDailyReport resets stale daily report to today before counting', () => {
  assert.deepEqual(
    createNextDailyReport(
      {
        date: '2026-05-13',
        completionCount: 9,
        completedLevelIds: ['lab-99'],
      },
      'lab-03',
      '2026-05-14',
    ),
    {
      date: '2026-05-14',
      completionCount: 1,
      completedLevelIds: ['lab-03'],
    },
  );
});

test('createDailyReportSummary shows today count and derust value', () => {
  assert.deepEqual(
    createDailyReportSummary(
      {
        date: '2026-05-14',
        completionCount: 2,
        completedLevelIds: ['lab-02', 'lab-03'],
      },
      '2026-05-14',
      ['lab-02'],
    ),
    {
      visible: true,
      label: '今日报告',
      totalText: '今日除锈 0.02%',
      detail: '娱乐指标 · 今日已完成 2 次训练',
      disclaimer: DERUST_DISCLAIMER,
    },
  );
});

test('createDailyReportSummary shows recall state when history exists but today is empty', () => {
  assert.deepEqual(createDailyReportSummary(null, '2026-05-14', ['lab-02']), {
    visible: true,
    label: '今日报告',
    totalText: '今日除锈 0.00%',
    detail: '完成一局，给大脑做个热身',
    disclaimer: DERUST_DISCLAIMER,
  });
});

test('createDailyReportSummary hides when there is no today or historical completion', () => {
  assert.deepEqual(createDailyReportSummary(null, '2026-05-14', []), {
    visible: false,
    label: '今日报告',
    totalText: '今日除锈 0.00%',
    detail: '完成一局，给大脑做个热身',
    disclaimer: DERUST_DISCLAIMER,
  });
});

test('createCompletionFeedback includes updated today training count', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 0,
  };

  const feedback = createCompletionFeedback(
    state,
    ['lab-02'],
    {
      date: '2026-05-14',
      completionCount: 2,
      completedLevelIds: ['lab-02'],
    },
    '2026-05-14',
  );

  assert.deepEqual(feedback.stats, [
    { label: '今日训练', value: '2 次' },
    { label: '错误数', value: '0' },
  ]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/derust.test.cjs
```

Expected: FAIL，错误包含新增函数未导出或旧 stats 仍为 `逻辑链路`。

- [ ] **Step 3: 实现日报纯函数**

在 `minigame/src/derust.js` 中更新 `DERUST_COPY`：

```js
const DERUST_COPY = {
  completionLabel: 'LAB RESULT',
  completionTitle: '大脑除锈完成',
  metricLabel: '今日脑力光泽度',
  subtitle: '你的前额叶刚刚完成了一次俯卧撑。请继续保持嚣张。',
  summaryLabel: '今日报告',
  todayTrainingStatLabel: '今日训练',
  mistakeStatLabel: '错误数',
  recallDetail: '完成一局，给大脑做个热身',
};
```

替换 `createCompletionFeedback`，并新增日报函数：

```js
function createCompletionFeedback(state, completedLevelIds = [], dailyReport = null, todayKey = getTodayKey()) {
  const completedIds = normalizeCompletedLevelIds(completedLevelIds);
  const levelId = state && state.level && state.level.id;
  const completionCount = levelId ? new Set([...completedIds, levelId]).size : completedIds.length;
  const todayReport = normalizeDailyReportForToday(dailyReport, todayKey);
  const todayCount = todayReport.completionCount > 0 ? todayReport.completionCount : 1;

  return {
    label: DERUST_COPY.completionLabel,
    title: DERUST_COPY.completionTitle,
    deltaText: formatSignedPercent(DERUST_STEP),
    metricLabel: DERUST_COPY.metricLabel,
    subtitle: DERUST_COPY.subtitle,
    disclaimer: DERUST_DISCLAIMER,
    stats: [
      { label: DERUST_COPY.todayTrainingStatLabel, value: `${todayCount} 次` },
      { label: DERUST_COPY.mistakeStatLabel, value: String(normalizeMistakes(state && state.mistakes)) },
    ],
    totalText: `累计除锈 ${formatPercent(completionCount * DERUST_STEP)}`,
  };
}

function getTodayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createDailyReportSummary(dailyReport, todayKey = getTodayKey(), completedLevelIds = []) {
  const todayReport = normalizeDailyReportForToday(dailyReport, todayKey);
  const historicCount = normalizeCompletedLevelIds(completedLevelIds).length;
  const todayCount = todayReport.completionCount;

  return {
    visible: todayCount > 0 || historicCount > 0,
    label: DERUST_COPY.summaryLabel,
    totalText: `今日除锈 ${formatPercent(todayCount * DERUST_STEP)}`,
    detail:
      todayCount > 0
        ? `娱乐指标 · 今日已完成 ${todayCount} 次训练`
        : DERUST_COPY.recallDetail,
    disclaimer: DERUST_DISCLAIMER,
  };
}

function createNextDailyReport(dailyReport, levelId, todayKey = getTodayKey()) {
  const base = normalizeDailyReportForToday(dailyReport, todayKey);
  const nextCompletedLevelIds = levelId
    ? normalizeCompletedLevelIds([...base.completedLevelIds, levelId])
    : base.completedLevelIds;

  return {
    date: todayKey,
    completionCount: base.completionCount + (levelId ? 1 : 0),
    completedLevelIds: nextCompletedLevelIds,
  };
}

function normalizeDailyReportForToday(dailyReport, todayKey) {
  if (!dailyReport || dailyReport.date !== todayKey) {
    return {
      date: todayKey,
      completionCount: 0,
      completedLevelIds: [],
    };
  }

  return {
    date: todayKey,
    completionCount:
      Number.isInteger(dailyReport.completionCount) && dailyReport.completionCount > 0
        ? dailyReport.completionCount
        : 0,
    completedLevelIds: normalizeCompletedLevelIds(dailyReport.completedLevelIds),
  };
}
```

更新导出：

```js
module.exports = {
  DERUST_DISCLAIMER,
  createCompletionFeedback,
  createDailyReportSummary,
  createDerustSummary,
  createNextDailyReport,
  getTodayKey,
};
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/derust.test.cjs
node --check minigame/src/derust.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/derust.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS，或仅 renderer 中旧断言因 `今日训练` 文案变化失败；若 renderer 失败，进入任务 4 更新绘制测试。

---

### 任务 3：菜单布局消费今日日报摘要

**Files:**
- Modify: `minigame/src/menu.js`
- Modify: `minigame/test/menu.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/menu.test.cjs` 追加：

```js
test('createMenuLayout uses provided daily report summary before cumulative fallback', () => {
  const dailyReportSummary = {
    visible: true,
    label: '今日报告',
    totalText: '今日除锈 0.02%',
    detail: '娱乐指标 · 今日已完成 2 次训练',
    disclaimer: '娱乐数值，不代表医学效果。',
  };

  const layout = createMenuLayout(430, 932, levels, {
    completedLevelIds: ['lab-02', 'lab-03'],
    dailyReportSummary,
  });

  assert.deepEqual(layout.derustSummary, dailyReportSummary);
});
```

保留既有 `includes visible derust summary when completed levels exist` 测试不变，用于验证没有传入 `dailyReportSummary` 时仍可 fallback 到旧累计摘要。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: FAIL，`layout.derustSummary` 仍来自 `createDerustSummary(completedLevelIds)`。

- [ ] **Step 3: 实现菜单摘要注入**

在 `minigame/src/menu.js` 中替换函数开头：

```js
function createMenuLayout(width, height, levels, progressSummary = {}) {
  const { hasActiveRun = false, completedLevelIds = [], dailyReportSummary = null } = progressSummary;
  const margin = 22;
  const compact = height < 760;
  const derustSummary = dailyReportSummary || createDerustSummary(completedLevelIds);
```

其余布局计算保持不变。

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/menu.test.cjs
node --check minigame/src/menu.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS，确认菜单摘要注入不破坏现有绘制层。

---

### 任务 4：运行时只在通关跃迁时记录一次日报

**Files:**
- Modify: `minigame/game.js`
- Modify: `minigame/test/game-runtime.test.cjs`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/game-runtime.test.cjs` 的第一个测试中，在 debug 通关后追加断言：

```js
const completedWrite = runtime.savedWrites.find(
  (write) => write.value && write.value.activeRun && write.value.activeRun.completed === true,
);

assert.deepEqual(completedWrite.value.dailyReport, {
  date: '2026-05-14',
  completionCount: 1,
  completedLevelIds: ['lab-02'],
});
assert.match(runtime.drawnText(), /今日训练/);
assert.match(runtime.drawnText(), /1 次/);
```

追加一个测试，确保胜利后重复操作不会让日报重复计数：

```js
test('runtime records daily report once for a single completion transition', () => {
  const runtime = bootGameRuntime('develop');

  try {
    runtime.touch(263, 39);
    runtime.touch(215, 737);

    const completedWrites = runtime.savedWrites.filter(
      (write) => write.value && write.value.dailyReport && write.value.dailyReport.completionCount > 0,
    );

    assert.equal(completedWrites[0].value.dailyReport.completionCount, 1);
    assert.equal(completedWrites.at(-1).value.dailyReport.completionCount, 1);
  } finally {
    runtime.restore();
  }
});
```

为了稳定日期，在 `bootGameRuntime` 里加入 fake Date：

```js
const OriginalDate = global.Date;
class FixedDate extends OriginalDate {
  constructor(...args) {
    if (args.length === 0) {
      super(2026, 4, 14, 12, 0, 0);
      return;
    }

    super(...args);
  }

  static now() {
    return new OriginalDate(2026, 4, 14, 12, 0, 0).getTime();
  }
}
global.Date = FixedDate;
```

并在 `restore()` 中恢复：

```js
global.Date = OriginalDate;
```

在 `minigame/test/renderer.test.cjs` 的通关反馈测试中，把旧 `逻辑链路` 断言改为 `今日训练`：

```js
assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args[0] === '今日训练'));
assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args[0] === '1 次'));
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs minigame/test/renderer.test.cjs
```

Expected: FAIL，`dailyReport` 未保存，或胜利弹层未收到今日训练统计。

- [ ] **Step 3: 接入日报运行时逻辑**

更新 `minigame/game.js` 的 derust 导入：

```js
const {
  createCompletionFeedback,
  createDailyReportSummary,
  createNextDailyReport,
  getTodayKey,
} = require('./src/derust');
```

更新 `refreshMenuLayout()`：

```js
function refreshMenuLayout() {
  if (!layout) {
    return;
  }

  menuLayout = createMenuLayout(layout.width, layout.height, levels, {
    hasActiveRun: Boolean(savedProgress && savedProgress.activeRun && !savedProgress.activeRun.completed),
    completedLevelIds,
    dailyReportSummary: createDailyReportSummary(
      savedProgress && savedProgress.dailyReport,
      getTodayKey(),
      completedLevelIds,
    ),
  });
}
```

更新 `render()` 中的完成反馈：

```js
renderGame(ctx, state, layout, {
  completionFeedback: state.completed
    ? createCompletionFeedback(
        state,
        completedLevelIds,
        savedProgress && savedProgress.dailyReport,
        getTodayKey(),
      )
    : null,
});
```

更新 `handleMenuTouch()` 中清空坏 activeRun 的保存逻辑，保留 `dailyReport`：

```js
savedProgress = {
  ...savedProgress,
  activeRun: null,
  completedLevelIds,
};
saveProgress(wx, savedProgress);
```

替换 `applyStateChange()`：

```js
function applyStateChange(updateState, shouldPersist) {
  const previousState = state;
  state = updateState();

  if (state !== previousState && didCompleteLevel(previousState, state)) {
    recordCompletedLevel();
  }

  if (shouldPersist && state !== previousState) {
    persistProgress();
  }

  render();
}
```

新增两个辅助函数，放在 `applyStateChange` 和 `persistProgress` 之间：

```js
function didCompleteLevel(previousState, nextState) {
  return Boolean(
    previousState &&
      nextState &&
      !previousState.completed &&
      nextState.completed &&
      nextState.level &&
      nextState.level.id,
  );
}

function recordCompletedLevel() {
  const levelId = state && state.level && state.level.id;

  if (!levelId) {
    return;
  }

  completedLevelIds = Array.from(new Set([...completedLevelIds, levelId]));
  savedProgress = {
    ...(savedProgress || {}),
    completedLevelIds,
    dailyReport: createNextDailyReport(savedProgress && savedProgress.dailyReport, levelId, getTodayKey()),
  };
}
```

替换 `persistProgress()`，去掉里面的通关计数副作用，只负责保存当前快照：

```js
function persistProgress() {
  if (!state) {
    return;
  }

  savedProgress = createProgressFromState(
    state,
    completedLevelIds,
    savedProgress && savedProgress.dailyReport,
  );
  saveProgress(wx, savedProgress);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs minigame/test/renderer.test.cjs
node --check minigame/game.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs minigame/test/derust.test.cjs minigame/test/progress.test.cjs
```

Expected: PASS，确认运行时、日报文案和存档模型一致。

---

### 任务 5：更新视觉快照和全量验证

**Files:**
- Modify: `minigame/test/render-snapshots.js`
- Modify: `minigame/test/renderer.test.cjs`
- Update: `minigame/test/__snapshots__/*.png`

- [ ] **Step 1: 更新快照生成脚本的数据**

在 `minigame/test/render-snapshots.js` 中，将菜单快照的 `createMenuLayout` 调用改成传入今日日报摘要：

```js
const menuLayout = createMenuLayout(430, 932, levels, {
  hasActiveRun: true,
  completedLevelIds: ['lab-02'],
  dailyReportSummary: {
    visible: true,
    label: '今日报告',
    totalText: '今日除锈 0.01%',
    detail: '娱乐指标 · 今日已完成 1 次训练',
    disclaimer: '娱乐数值，不代表医学效果。',
  },
});
```

将胜利态快照的 `createCompletionFeedback` 调用改为：

```js
const completionFeedback = createCompletionFeedback(
  completedState,
  ['lab-02'],
  {
    date: '2026-05-14',
    completionCount: 1,
    completedLevelIds: ['lab-02'],
  },
  '2026-05-14',
);
```

- [ ] **Step 2: 运行快照生成**

Run:

```bash
node minigame/test/render-snapshots.js
```

Expected: PASS，快照文件重新生成，菜单图包含 `今日除锈 0.01%`，胜利弹层包含 `今日训练`。

- [ ] **Step 3: 更新 renderer 医学宣称测试覆盖**

在 `minigame/test/renderer.test.cjs` 中，找到拼接绘制文案检查医学宣称的测试，确保加入以下允许文案：

```js
assert.equal(/老年痴呆|阿尔茨海默|预防|降低.*风险|医学证明|患病概率/.test(drawnText), false);
assert.match(drawnText, /今日训练|今日报告|娱乐数值/);
```

- [ ] **Step 4: 运行全量测试**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS，测试数量在现有 93 项基础上增加，全部通过。

- [ ] **Step 5: 运行语法检查**

Run:

```bash
node --check minigame/src/progress.js
node --check minigame/src/derust.js
node --check minigame/src/menu.js
node --check minigame/game.js
```

Expected: 全部无输出。

- [ ] **Step 6: 微信开发者工具手动验收**

在微信开发者工具导入的小游戏项目中验证：

```text
1. 打开游戏，首次无历史完成时菜单不显示日报卡。
2. 使用开发环境的 DEV 完成按钮完成一关。
3. 胜利弹层显示“大脑除锈完成”、“今日训练 1 次”、“错误数”和免责声明。
4. 返回菜单后显示“今日报告 / 今日除锈 0.01% / 娱乐指标 · 今日已完成 1 次训练”。
5. 再完成一次同关，菜单显示“今日已完成 2 次训练”，关卡卡片仍只显示一个已完成状态。
6. 手动把 storage 中 `dailyReport.date` 改成昨天，重新进入后菜单展示召回态或下一次完成从 1 次重新开始。
```

Expected: 所有验收项符合规格，且没有出现“降低患病概率”“预防阿尔茨海默”等医学宣称。

- [ ] **Step 7: 验证检查点**

Run:

```bash
node --test minigame/test/*.test.cjs
node minigame/test/render-snapshots.js
```

Expected: PASS。当前目录不是 git 仓库，不执行 commit；记录已修改文件，准备交给用户验收或进入下一轮实现。

---

## 自检记录

- 规格覆盖：计划覆盖通关弹层今日次数、菜单今日报告、`dailyReport` 存档、日期切换、同关重复日内计数、旧 `completedLevelIds` 累计逻辑、免责声明和医学宣称边界。
- 重复计数风险：计划明确把日报累计放在 `didCompleteLevel(previousState, state)` 之后，只在未完成到完成的状态跃迁中执行，不放在 `persistProgress()`。
- 兼容性：没有 `dailyReport` 的旧存档会归一化为空日报；`menu.js` 未收到 `dailyReportSummary` 时继续 fallback 到 `createDerustSummary(completedLevelIds)`。
- 执行约束：当前目录不是 git 仓库，任务末尾均使用验证检查点替代 commit。
