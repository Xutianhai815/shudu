# 大脑除锈反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 当前目录不是 git 仓库，所以每个任务末尾使用“验证检查点”替代 commit。

**Goal:** 在通关弹层和菜单页加入“大脑除锈”娱乐化正向反馈，让玩家完成关卡后获得强记忆点奖励，同时避免医学承诺。

**Architecture:** 新增 `derust.js` 纯函数模块集中生成除锈文案、娱乐数值和安全边界。`menu.js` 只负责把累计除锈摘要放进菜单布局元数据，`renderer.js` 只消费布局/反馈数据绘制 Canvas，`game.js` 只负责把当前完成进度转成渲染参数。第一版不扩展存档结构，所有累计值由现有 `completedLevelIds` 推导。

**Tech Stack:** 微信小游戏 Canvas 2D、CommonJS JavaScript、Node 内置测试运行器。

---

## 文件结构

- 新建 `minigame/src/derust.js`：纯函数模块，生成通关除锈反馈和菜单累计摘要。
- 新建 `minigame/test/derust.test.cjs`：覆盖数值格式、异常输入、禁用医学表达。
- 修改 `minigame/src/menu.js`：菜单布局增加 `derustSummary`，完成卡片文案从“已完成”升级为“已除锈”。
- 修改 `minigame/test/menu.test.cjs`：覆盖累计除锈摘要和完成卡片标签。
- 修改 `minigame/src/layout.js`：加高胜利弹层，为除锈报告留出空间。
- 修改 `minigame/test/layout.test.cjs`：确认胜利按钮仍可命中。
- 修改 `minigame/src/renderer.js`：绘制“大脑除锈完成”胜利报告、菜单累计摘要和“已除锈”卡片标签。
- 修改 `minigame/test/renderer.test.cjs`：覆盖除锈文案绘制，不出现医学承诺。
- 修改 `minigame/game.js`：生成通关反馈并传给 `renderGame`。

---

### 任务 1：除锈反馈纯函数

**Files:**
- Create: `minigame/src/derust.js`
- Create: `minigame/test/derust.test.cjs`

- [ ] **Step 1: 写失败测试**

创建 `minigame/test/derust.test.cjs`：

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createPuzzleState } = require('../src/puzzle');
const {
  DERUST_DISCLAIMER,
  createCompletionFeedback,
  createDerustSummary,
} = require('../src/derust');

test('createCompletionFeedback returns playful derust copy for completed state', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 1,
  };

  const feedback = createCompletionFeedback(state, ['lab-02']);

  assert.equal(feedback.label, 'LAB RESULT');
  assert.equal(feedback.title, '大脑除锈完成');
  assert.equal(feedback.deltaText, '+0.01%');
  assert.equal(feedback.metricLabel, '今日脑力光泽度');
  assert.equal(feedback.subtitle, '你的前额叶刚刚完成了一次俯卧撑。请继续保持嚣张。');
  assert.equal(feedback.disclaimer, DERUST_DISCLAIMER);
  assert.deepEqual(feedback.stats, [
    { label: '逻辑链路', value: '+1' },
    { label: '错误数', value: '1' },
  ]);
});

test('createCompletionFeedback counts the current completed level once', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };

  assert.equal(createCompletionFeedback(state, []).deltaText, '+0.01%');
  assert.equal(createCompletionFeedback(state, ['lab-02']).deltaText, '+0.01%');
});

test('createDerustSummary formats cumulative derust from completed levels', () => {
  assert.deepEqual(createDerustSummary(['lab-02', 'lab-03']), {
    visible: true,
    label: '今日报告',
    totalText: '累计除锈 0.02%',
    detail: '娱乐指标 · 已完成 2 次训练',
    disclaimer: DERUST_DISCLAIMER,
  });
});

test('createDerustSummary returns hidden default for invalid or empty input', () => {
  assert.deepEqual(createDerustSummary(null), {
    visible: false,
    label: '今日报告',
    totalText: '累计除锈 0.00%',
    detail: '娱乐指标 · 已完成 0 次训练',
    disclaimer: DERUST_DISCLAIMER,
  });
  assert.equal(createDerustSummary([]).visible, false);
});

test('derust copy avoids disease or medical claim wording', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };
  const feedback = createCompletionFeedback(state, ['lab-02']);
  const summary = createDerustSummary(['lab-02']);
  const copy = [
    feedback.title,
    feedback.deltaText,
    feedback.metricLabel,
    feedback.subtitle,
    feedback.disclaimer,
    summary.totalText,
    summary.detail,
    summary.disclaimer,
  ].join(' ');

  assert.equal(/老年痴呆|阿尔茨海默|预防|降低.*风险|医学证明|患病概率/.test(copy), false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/derust.test.cjs
```

Expected: FAIL，错误包含 `Cannot find module '../src/derust'`。

- [ ] **Step 3: 实现 `derust.js`**

创建 `minigame/src/derust.js`：

```js
const DERUST_DISCLAIMER = '娱乐数值，不代表医学效果。';
const DERUST_STEP = 0.01;

function createCompletionFeedback(state, completedLevelIds = []) {
  const completedIds = normalizeCompletedLevelIds(completedLevelIds);
  const levelId = state && state.level && state.level.id;
  const completionCount = levelId ? new Set([...completedIds, levelId]).size : completedIds.length;

  return {
    label: 'LAB RESULT',
    title: '大脑除锈完成',
    deltaText: formatSignedPercent(DERUST_STEP),
    metricLabel: '今日脑力光泽度',
    subtitle: '你的前额叶刚刚完成了一次俯卧撑。请继续保持嚣张。',
    disclaimer: DERUST_DISCLAIMER,
    stats: [
      { label: '逻辑链路', value: '+1' },
      { label: '错误数', value: String(Math.max(0, Number.isInteger(state && state.mistakes) ? state.mistakes : 0)) },
    ],
    totalText: `累计除锈 ${formatPercent(completionCount * DERUST_STEP)}`,
  };
}

function createDerustSummary(completedLevelIds = []) {
  const completedIds = normalizeCompletedLevelIds(completedLevelIds);
  const count = completedIds.length;

  return {
    visible: count > 0,
    label: '今日报告',
    totalText: `累计除锈 ${formatPercent(count * DERUST_STEP)}`,
    detail: `娱乐指标 · 已完成 ${count} 次训练`,
    disclaimer: DERUST_DISCLAIMER,
  };
}

function normalizeCompletedLevelIds(levelIds) {
  if (!Array.isArray(levelIds)) {
    return [];
  }

  return Array.from(new Set(levelIds.filter((levelId) => typeof levelId === 'string')));
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value) {
  return `+${formatPercent(value)}`;
}

module.exports = {
  DERUST_DISCLAIMER,
  createCompletionFeedback,
  createDerustSummary,
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
node --test minigame/test/derust.test.cjs minigame/test/progress.test.cjs
```

Expected: PASS，确认新纯函数不影响进度模块。

---

### 任务 2：菜单布局加入累计除锈摘要

**Files:**
- Modify: `minigame/src/menu.js`
- Modify: `minigame/test/menu.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/menu.test.cjs` 追加：

```js
test('createMenuLayout includes visible derust summary when completed levels exist', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-02', 'lab-03'],
  });

  assert.deepEqual(layout.derustSummary, {
    visible: true,
    label: '今日报告',
    totalText: '累计除锈 0.02%',
    detail: '娱乐指标 · 已完成 2 次训练',
    disclaimer: '娱乐数值，不代表医学效果。',
  });
});

test('createMenuLayout hides derust summary when no completed levels exist', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: [],
  });

  assert.equal(layout.derustSummary.visible, false);
});

test('completed level cards use derust completion label', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-02'],
  });

  assert.equal(layout.levelCards[0].completed, true);
  assert.equal(layout.levelCards[0].completedLabel, '已除锈');
  assert.equal(layout.levelCards[1].completedLabel, '');
});

test('derust summary reserves vertical space before level cards', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-02'],
  });
  const summaryBottom = layout.primaryButton.y + layout.primaryButton.height + 14 + 72;

  assert.ok(layout.levelCards[0].y > summaryBottom);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: FAIL，错误包含 `derustSummary` 或 `completedLabel` 相关断言失败。

- [ ] **Step 3: 修改菜单布局**

在 `minigame/src/menu.js` 顶部加入：

```js
const { createDerustSummary } = require('./derust');
```

在 `createMenuLayout` 中先把 `completed`、`derustSummary` 和摘要占位高度放到 `cardStartY` 之前。把原来的 `cardStartY` 计算替换为下面这组变量：

```js
  const completed = new Set(completedLevelIds);
  const derustSummary = createDerustSummary(completedLevelIds);
  const summaryHeight = derustSummary.visible ? (compact ? 62 : 72) : 0;
  const summaryGap = derustSummary.visible ? 14 : 0;
  const cardStartY =
    primaryButtonY + buttonHeight + summaryHeight + summaryGap + (compact ? 22 : 34);
```

在 `levelCards` 对象中加入：

```js
    completedLabel: completed.has(level.id) ? '已除锈' : '',
```

在返回对象中加入：

```js
    derustSummary,
```

完整返回对象应包含：

```js
  return {
    width,
    height,
    margin,
    compact,
    derustSummary,
    title: {
      x: margin,
      y: titleY,
      text: 'Lab Lines Sudoku',
      subtitle: '数独实验室',
    },
    primaryButton,
    continueButton,
    levelCards,
  };
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/menu.test.cjs minigame/test/derust.test.cjs
node --check minigame/src/menu.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS，确认菜单布局新增字段不会破坏现有渲染测试。

---

### 任务 3：加高胜利弹层布局

**Files:**
- Modify: `minigame/src/layout.js`
- Modify: `minigame/test/layout.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/layout.test.cjs` 追加：

```js
test('victory layout has enough vertical room for derust report', () => {
  const layout = createLayout(390, 844);

  assert.ok(layout.victory.panel.height >= 330);
  assert.ok(layout.victory.restart.y > layout.victory.panel.y + 280);
  assert.ok(layout.victory.next.y > layout.victory.panel.y + 280);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/layout.test.cjs
```

Expected: FAIL，当前 `panel.height` 为 236，不满足新弹层空间。

- [ ] **Step 3: 修改 `createVictoryLayout`**

在 `minigame/src/layout.js` 的 `createVictoryLayout` 中，把固定高度和按钮位置调整为：

```js
function createVictoryLayout(width, height) {
  const panelWidth = Math.min(width - 48, 330);
  const panelHeight = 348;
  const x = (width - panelWidth) / 2;
  const y = Math.max(72, (height - panelHeight) / 2);
  const buttonWidth = (panelWidth - 54) / 2;
  const buttonY = y + panelHeight - 54;

  return {
    panel: { x, y, width: panelWidth, height: panelHeight },
    restart: {
      x: x + 22,
      y: buttonY,
      width: buttonWidth,
      height: 38,
      action: 'restart',
    },
    next: {
      x: x + 32 + buttonWidth,
      y: buttonY,
      width: buttonWidth,
      height: 38,
      action: 'next',
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/layout.test.cjs
node --check minigame/src/layout.js
```

Expected: PASS；原有 victory 按钮 hit test 仍通过。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/layout.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS，确认加高弹层不破坏现有渲染 smoke test。

---

### 任务 4：渲染通关除锈报告

**Files:**
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: 写失败测试**

修改 `minigame/test/renderer.test.cjs` 的 import：

```js
const { createCompletionFeedback } = require('../src/derust');
```

追加测试：

```js
test('renderer draws derust completion feedback on victory overlay', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    cells: createPuzzleState(levels[0]).cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: levels[0].solution[rowIndex][colIndex],
        notes: [],
      })),
    ),
  };
  const layout = createLayout(390, 844);
  const completionFeedback = createCompletionFeedback(state, ['lab-02']);

  renderGame(ctx, state, layout, { completionFeedback });

  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('大脑除锈完成')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('+0.01%')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('娱乐数值，不代表医学效果。')));
  assert.equal(ctx.calls.some((call) => call.name === 'fillText' && /老年痴呆|阿尔茨海默|预防/.test(call.args.join(' '))), false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/renderer.test.cjs
```

Expected: FAIL，当前 `renderGame` 不接受 `completionFeedback`，胜利弹层没有除锈文案。

- [ ] **Step 3: 扩展 `renderGame` 参数**

在 `minigame/src/renderer.js` 中把函数签名改为：

```js
function renderGame(ctx, state, layout, options = {}) {
  const viewLayout = {
    ...layout,
    level: state.level,
    stateCanUndo: state.history.length > 0,
    stateNoteMode: state.noteMode,
    completionFeedback: options.completionFeedback || null,
  };
```

- [ ] **Step 4: 替换胜利弹层绘制内容**

把 `drawVictoryOverlay` 替换为：

```js
function drawVictoryOverlay(ctx, state, layout) {
  const { width, height, colors } = layout;
  const feedback = layout.completionFeedback;
  ctx.fillStyle = 'rgba(24, 33, 31, 0.32)';
  ctx.fillRect(0, 0, width, height);

  const { panel, restart, next } = layout.victory;
  const x = panel.x;
  const y = panel.y;

  roundRect(ctx, panel.x, panel.y, panel.width, panel.height, 28, '#17231f');

  const gradient = ctx.createLinearGradient(x, y, x + panel.width, y + panel.height);
  gradient.addColorStop(0, '#17231f');
  gradient.addColorStop(0.62, '#285248');
  gradient.addColorStop(1, '#d99b2a');
  ctx.fillStyle = gradient;
  roundRect(ctx, x + 1, y + 1, panel.width - 2, panel.height - 2, 27, gradient);

  ctx.fillStyle = '#ffc861';
  ctx.font = '900 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(feedback ? feedback.label : 'LAB RESULT', x + 22, y + 34);

  ctx.fillStyle = colors.white;
  ctx.font = '900 30px sans-serif';
  ctx.fillText(feedback ? feedback.title : '实验完成', x + 22, y + 76);

  ctx.fillStyle = '#ffc861';
  ctx.font = '900 52px sans-serif';
  ctx.fillText(feedback ? feedback.deltaText : '+0.01%', x + 22, y + 132);

  ctx.fillStyle = 'rgba(248, 251, 248, 0.78)';
  ctx.font = '800 13px sans-serif';
  ctx.fillText(feedback ? feedback.metricLabel : '今日脑力光泽度', x + 24, y + 154);

  drawVictoryDerustStats(ctx, feedback, x + 22, y + 174, panel.width - 44, colors);

  roundRect(ctx, x + 22, y + 232, panel.width - 44, 50, 16, 'rgba(255, 255, 255, 0.12)');
  ctx.fillStyle = colors.white;
  ctx.font = '800 12px sans-serif';
  wrapText(
    ctx,
    feedback ? feedback.subtitle : '你的前额叶刚刚完成了一次俯卧撑。请继续保持嚣张。',
    x + 36,
    y + 253,
    panel.width - 72,
    16,
  );

  ctx.fillStyle = 'rgba(248, 251, 248, 0.68)';
  ctx.font = '800 10px sans-serif';
  ctx.fillText(feedback ? feedback.disclaimer : '娱乐数值，不代表医学效果。', x + 24, y + 304);

  drawVictoryButton(ctx, restart.x, restart.y, restart.width, '再来一局', 'rgba(255, 255, 255, 0.16)', colors.white);
  drawVictoryButton(ctx, next.x, next.y, next.width, '下一关', colors.white, colors.ink);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
```

在 `drawVictoryMetric` 附近新增：

```js
function drawVictoryDerustStats(ctx, feedback, x, y, width, colors) {
  const stats = feedback && feedback.stats ? feedback.stats : [];
  const first = stats[0] || { label: '逻辑链路', value: '+1' };
  const second = stats[1] || { label: '错误数', value: '0' };
  const gap = 10;
  const itemWidth = (width - gap) / 2;

  drawVictoryStat(ctx, x, y, itemWidth, first, colors);
  drawVictoryStat(ctx, x + itemWidth + gap, y, itemWidth, second, colors);
}

function drawVictoryStat(ctx, x, y, width, stat, colors) {
  roundRect(ctx, x, y, width, 44, 14, 'rgba(255, 255, 255, 0.13)');
  ctx.fillStyle = colors.white;
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(stat.value, x + width / 2, y + 24);
  ctx.fillStyle = 'rgba(248, 251, 248, 0.72)';
  ctx.font = '800 10px sans-serif';
  ctx.fillText(stat.label, x + width / 2, y + 38);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = '';
  let lineY = y;

  chars.forEach((char) => {
    const nextLine = line + char;
    if (ctx.measureText && ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = char;
      lineY += lineHeight;
      return;
    }

    line = nextLine;
  });

  if (line) {
    ctx.fillText(line, x, lineY);
  }
}
```

- [ ] **Step 5: 补 mock context 的 `measureText`**

在 `minigame/test/renderer.test.cjs` 的 `createMockCanvasContext` 返回对象中加入：

```js
    measureText: (text) => ({ width: String(text).length * 12 }),
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/layout.test.cjs minigame/test/derust.test.cjs
node --check minigame/src/renderer.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 7: 验证检查点**

Run:

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
```

Expected: PASS，确认胜利弹层改版不破坏全量测试。

---

### 任务 5：渲染菜单累计除锈摘要与卡片标签

**Files:**
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/renderer.test.cjs` 追加：

```js
test('renderer draws derust summary on menu when completed levels exist', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-02', 'lab-03'],
  });

  renderMenu(ctx, menuLayout);

  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('今日报告')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('累计除锈 0.02%')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('娱乐指标 · 已完成 2 次训练')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('已除锈')));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/renderer.test.cjs
```

Expected: FAIL，当前菜单不会绘制除锈摘要，完成标签仍是 `已完成`。

- [ ] **Step 3: 调整菜单渲染顺序**

在 `renderMenu` 中把：

```js
    drawMenuActions(ctx, layout);
    drawLevelCards(ctx, layout);
```

改为：

```js
    drawMenuActions(ctx, layout);
    drawDerustSummary(ctx, layout);
    drawLevelCards(ctx, layout);
```

- [ ] **Step 4: 新增 `drawDerustSummary`**

在 `drawMenuActions` 后新增：

```js
function drawDerustSummary(ctx, layout) {
  const summary = layout.derustSummary;
  if (!summary || !summary.visible) {
    return;
  }

  const x = layout.margin;
  const y = layout.primaryButton.y + layout.primaryButton.height + 14;
  const width = layout.width - layout.margin * 2;
  const height = layout.compact ? 62 : 72;

  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, '#17231f');
  gradient.addColorStop(1, '#285248');
  roundRect(ctx, x, y, width, height, 20, gradient);

  ctx.fillStyle = '#ffc861';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(summary.label, x + 18, y + 24);

  ctx.fillStyle = '#f8fbf8';
  ctx.font = '900 21px sans-serif';
  ctx.fillText(summary.totalText, x + 18, y + 50);

  ctx.fillStyle = 'rgba(248, 251, 248, 0.72)';
  ctx.font = '800 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(summary.detail, x + width - 18, y + 50);
  ctx.textAlign = 'left';
}
```

- [ ] **Step 5: 更新完成卡片标签**

在 `drawLevelCards` 中把：

```js
      chip(ctx, card.x + card.width - 80, card.y + 18, 58, 24, '已完成', 'rgba(133, 185, 77, 0.18)', '#4d7d1f');
```

改为：

```js
      chip(ctx, card.x + card.width - 80, card.y + 18, 58, 24, card.completedLabel || '已除锈', 'rgba(255, 200, 97, 0.22)', '#8a5a07');
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/menu.test.cjs
node --check minigame/src/renderer.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 7: 视觉风险检查**

运行微信开发者工具或本地模拟时确认：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/tianhai/Documents/微信小游戏/minigame --lang zh
```

Expected: 菜单摘要不遮挡继续/开始按钮和关卡卡片；这由任务 2 的 `derust summary reserves vertical space before level cards` 测试兜底。

---

### 任务 6：运行时接入除锈反馈

**Files:**
- Modify: `minigame/game.js`

- [ ] **Step 1: 写失败检查脚本**

先运行当前检查，确认还没接入 `createCompletionFeedback`：

```bash
rg -n "createCompletionFeedback|completionFeedback" minigame/game.js
```

Expected: 无输出或没有 `createCompletionFeedback` import。

- [ ] **Step 2: 导入除锈反馈函数**

在 `minigame/game.js` imports 中加入：

```js
const { createCompletionFeedback } = require('./src/derust');
```

- [ ] **Step 3: 修改 `render()` 的 playing 分支**

把：

```js
  if (scene === 'playing' && state && layout) {
    renderGame(ctx, state, layout);
  }
```

改为：

```js
  if (scene === 'playing' && state && layout) {
    renderGame(ctx, state, layout, {
      completionFeedback: state.completed ? createCompletionFeedback(state, completedLevelIds) : null,
    });
  }
```

- [ ] **Step 4: 运行语法与回归测试**

Run:

```bash
node --check minigame/game.js
node --test test/puzzle.test.mjs minigame/test/*.cjs
```

Expected: PASS；全量测试通过。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --check minigame/src/derust.js
node --check minigame/src/menu.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
```

Expected: 全部无输出。

---

### 任务 7：微信开发者工具手动验收

**Files:**
- No code changes.

- [ ] **Step 1: 打开项目**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/tianhai/Documents/微信小游戏/minigame --lang zh
```

Expected: 微信开发者工具打开 `lab-lines-sudoku`，顶部显示“小游戏模式”。

- [ ] **Step 2: 验收菜单页**

手动操作：

```text
1. 首屏应显示数独实验室菜单。
2. 如果已有完成关卡，菜单应显示“累计除锈 xx%”。
3. 已完成关卡卡片应显示“已除锈”。
4. 不应出现“老年痴呆”“阿尔茨海默”“预防”“降低风险”等医学词。
```

Expected: 菜单视觉不重叠，按钮可点击。

- [ ] **Step 3: 验收通关弹层**

手动操作：

```text
1. 进入任一关卡。
2. 完成关卡，或在开发调试中临时使用测试状态触发 completed。
3. 观察胜利弹层。
```

Expected:

```text
显示“大脑除锈完成”
显示“+0.01%”
显示“今日脑力光泽度”
显示“你的前额叶刚刚完成了一次俯卧撑。请继续保持嚣张。”
显示“娱乐数值，不代表医学效果。”
“再来一局”和“下一关”仍可点击
```

- [ ] **Step 4: 验收回归流程**

手动操作：

```text
1. 从棋盘左上角返回菜单。
2. 点击继续实验恢复棋盘。
3. 点击下一关进入下一关。
4. 点击再来一局重置当前关。
```

Expected: 现有开始、选关、继续、返回菜单、下一关、重开流程不退化。

- [ ] **Step 5: 最终验证命令**

Run:

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
node --check minigame/game.js
node --check minigame/src/derust.js
node --check minigame/src/progress.js
node --check minigame/src/storage.js
node --check minigame/src/menu.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
```

Expected: 所有测试通过，所有 `node --check` 无输出。

---

## 实施注意事项

- 不要写入任何疾病名称、疾病风险、预防或医学承诺到运行时代码文案中。
- `docs/superpowers/specs/2026-05-14-brain-derust-feedback-design.md` 中的“禁止文案示例”只允许存在于文档，不允许进入小游戏 UI。
- 第一版只用 `completedLevelIds` 推导累计值，不新增存档字段。
- 如果菜单摘要导致短屏幕卡片重叠，优先调整 `menu.js` 的布局计算，不要在 renderer 中硬编码移动卡片。
- 当前目录不是 git repo，不要要求 commit；每个任务用测试和手动验收作为完成证据。
