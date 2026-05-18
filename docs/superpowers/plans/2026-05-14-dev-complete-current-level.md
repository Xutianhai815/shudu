# 开发专用快速完成当前关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 当前目录不是 git 仓库，所以每个任务末尾使用“验证检查点”替代 commit。

**Goal:** 增加一个仅开发环境启用的 `DEV 完成` 入口，让微信开发者工具中可以一键触发当前关卡通关和“大脑除锈完成”弹层。

**Architecture:** 新增 `debug.js` 纯函数模块负责环境判断和生成完成态，避免把调试逻辑散进渲染层。`layout.js` 只暴露调试按钮区域和命中结果，`renderer.js` 只绘制按钮，`game.js` 只在运行时接入并复用现有保存与通关反馈链路。正式环境默认关闭，不改存档结构。

**Tech Stack:** 微信小游戏 Canvas 2D、CommonJS JavaScript、Node 内置测试运行器。

---

## 文件结构

- 新建 `minigame/src/debug.js`：纯函数模块，提供 `isDebugToolsEnabled(wxLike)` 和 `completePuzzleForDebug(state)`。
- 新建 `minigame/test/debug.test.cjs`：覆盖环境判断、完成态生成、异常输入和不可变性。
- 修改 `minigame/src/layout.js`：`createLayout(width, height, options)` 支持 `debugToolsEnabled`，提供 `debugCompleteButton`，`hitTest` 返回 debug action。
- 修改 `minigame/test/layout.test.cjs`：覆盖调试按钮命中、禁用隐藏、完成态不可命中。
- 修改 `minigame/src/renderer.js`：绘制 `DEV 完成` 调试按钮，完成态和禁用时不绘制。
- 修改 `minigame/test/renderer.test.cjs`：覆盖调试按钮显示/隐藏。
- 修改 `minigame/game.js`：启动时判断开发环境，布局启用按钮，点击后完成当前关并复用保存/渲染链路。

---

### 任务 1：调试纯函数模块

**Files:**
- Create: `minigame/src/debug.js`
- Create: `minigame/test/debug.test.cjs`

- [ ] **Step 1: 写失败测试**

创建 `minigame/test/debug.test.cjs`：

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createPuzzleState } = require('../src/puzzle');
const { completePuzzleForDebug, isDebugToolsEnabled } = require('../src/debug');

test('isDebugToolsEnabled returns true only for develop envVersion', () => {
  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
    }),
    true,
  );

  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'trial' } }),
    }),
    false,
  );

  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
    }),
    false,
  );
});

test('isDebugToolsEnabled defaults to false when account info is unavailable', () => {
  assert.equal(isDebugToolsEnabled(null), false);
  assert.equal(isDebugToolsEnabled({}), false);
  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => {
        throw new Error('not available');
      },
    }),
    false,
  );
});

test('completePuzzleForDebug fills every cell from the level solution', () => {
  const state = createPuzzleState(levels[0]);
  const completed = completePuzzleForDebug(state);

  assert.equal(completed.completed, true);
  assert.equal(completed.noteMode, false);
  assert.notEqual(completed, state);
  assert.deepEqual(
    completed.cells.map((row) => row.map((cell) => cell.value)),
    levels[0].solution,
  );
  assert.deepEqual(
    completed.cells.flat().map((cell) => cell.notes),
    Array.from({ length: 81 }, () => []),
  );
});

test('completePuzzleForDebug does not mutate the original state', () => {
  const state = createPuzzleState(levels[0]);
  const originalValues = state.cells.map((row) => row.map((cell) => cell.value));

  completePuzzleForDebug(state);

  assert.deepEqual(
    state.cells.map((row) => row.map((cell) => cell.value)),
    originalValues,
  );
  assert.equal(state.completed, false);
});

test('completePuzzleForDebug safely no-ops for invalid or already completed state', () => {
  assert.equal(completePuzzleForDebug(null), null);

  const completedState = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };

  assert.equal(completePuzzleForDebug(completedState), completedState);
  assert.doesNotThrow(() => completePuzzleForDebug({ level: {}, cells: [] }));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/debug.test.cjs
```

Expected: FAIL，错误包含 `Cannot find module '../src/debug'`。

- [ ] **Step 3: 实现 `debug.js`**

创建 `minigame/src/debug.js`：

```js
function isDebugToolsEnabled(wxLike) {
  try {
    if (!wxLike || typeof wxLike.getAccountInfoSync !== 'function') {
      return false;
    }

    const accountInfo = wxLike.getAccountInfoSync();
    return accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion === 'develop';
  } catch (error) {
    return false;
  }
}

function completePuzzleForDebug(state) {
  if (!state || state.completed || !hasValidSolution(state.solution) || !hasValidCells(state.cells)) {
    return state;
  }

  return {
    ...state,
    noteMode: false,
    completed: true,
    cells: state.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: state.solution[rowIndex][colIndex],
        notes: [],
      })),
    ),
  };
}

function hasValidSolution(solution) {
  return (
    Array.isArray(solution) &&
    solution.length === 9 &&
    solution.every((row) => Array.isArray(row) && row.length === 9 && row.every((value) => Number.isInteger(value) && value >= 1 && value <= 9))
  );
}

function hasValidCells(cells) {
  return Array.isArray(cells) && cells.length === 9 && cells.every((row) => Array.isArray(row) && row.length === 9);
}

module.exports = {
  completePuzzleForDebug,
  isDebugToolsEnabled,
};
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test minigame/test/debug.test.cjs
node --check minigame/src/debug.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 5: 验证检查点**

Run:

```bash
node --test minigame/test/debug.test.cjs minigame/test/puzzle.test.cjs
```

Expected: PASS，确认调试完成态不破坏 puzzle 纯逻辑。

---

### 任务 2：布局和命中测试接入调试按钮

**Files:**
- Modify: `minigame/src/layout.js`
- Modify: `minigame/test/layout.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/layout.test.cjs` 追加：

```js
test('createLayout exposes debug complete button only when debug tools are enabled', () => {
  const layout = createLayout(430, 932, { debugToolsEnabled: true });
  const defaultLayout = createLayout(430, 932);

  assert.deepEqual(layout.debugCompleteButton.action, 'complete');
  assert.equal(layout.debugCompleteButton.label, 'DEV 完成');
  assert.equal(defaultLayout.debugCompleteButton, null);
});

test('hitTest maps debug complete button to debug action before completion', () => {
  const layout = createLayout(430, 932, { debugToolsEnabled: true });
  const button = layout.debugCompleteButton;

  assert.deepEqual(hitTest(layout, button.x + button.width / 2, button.y + button.height / 2, false), {
    type: 'debug',
    action: 'complete',
  });
});

test('hitTest ignores debug complete button when disabled or already completed', () => {
  const layout = createLayout(430, 932, { debugToolsEnabled: true });
  const disabledLayout = createLayout(430, 932);
  const button = layout.debugCompleteButton;

  assert.equal(hitTest(layout, button.x + button.width / 2, button.y + button.height / 2, true), null);
  assert.notDeepEqual(hitTest(disabledLayout, button.x + button.width / 2, button.y + button.height / 2, false), {
    type: 'debug',
    action: 'complete',
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/layout.test.cjs
```

Expected: FAIL，`debugCompleteButton` 为 `undefined` 或命中结果不匹配。

- [ ] **Step 3: 修改 `createLayout` 签名和返回值**

在 `minigame/src/layout.js` 中把函数签名改为：

```js
function createLayout(width, height, options = {}) {
  const { debugToolsEnabled = false } = options;
```

在 `topBar` 之后、返回对象之前新增：

```js
  const debugCompleteButton = debugToolsEnabled
    ? {
        x: Math.max(topBar.x + 58, topBar.x + topBar.width - 204),
        y: topBar.y + 5,
        width: 86,
        height: 34,
        action: 'complete',
        label: 'DEV 完成',
      }
    : null;
```

在 `return` 对象中加入：

```js
    debugCompleteButton,
```

- [ ] **Step 4: 修改 `hitTest`**

在 `minigame/src/layout.js` 的 `hitTest` 中，`if (completed)` 之前加入：

```js
  if (!completed && layout.debugCompleteButton && isInside(layout.debugCompleteButton, x, y)) {
    return {
      type: 'debug',
      action: layout.debugCompleteButton.action,
    };
  }
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --test minigame/test/layout.test.cjs
node --check minigame/src/layout.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 6: 验证检查点**

Run:

```bash
node --test minigame/test/layout.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS，确认新增布局字段不影响渲染测试。

---

### 任务 3：渲染调试按钮

**Files:**
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: 写失败测试**

在 `minigame/test/renderer.test.cjs` 追加：

```js
test('renderer draws debug complete button when debug tools are enabled', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932, { debugToolsEnabled: true });

  renderGame(ctx, state, layout);

  assert.match(getDrawnText(ctx), /DEV 完成/);
});

test('renderer hides debug complete button when disabled or completed', () => {
  const disabledCtx = createMockCanvasContext();
  renderGame(disabledCtx, createPuzzleState(levels[0]), createLayout(430, 932));
  assert.equal(getDrawnText(disabledCtx).includes('DEV 完成'), false);

  const completedCtx = createMockCanvasContext();
  renderGame(
    completedCtx,
    {
      ...createPuzzleState(levels[0]),
      completed: true,
    },
    createLayout(430, 932, { debugToolsEnabled: true }),
  );
  assert.equal(getDrawnText(completedCtx).includes('DEV 完成'), false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test minigame/test/renderer.test.cjs
```

Expected: FAIL，绘制文本中没有 `DEV 完成`。

- [ ] **Step 3: 在游戏渲染中调用绘制函数**

在 `minigame/src/renderer.js` 的 `renderGame` 中，`drawTopBar(ctx, viewLayout);` 后加入：

```js
  drawDebugCompleteButton(ctx, state, viewLayout);
```

- [ ] **Step 4: 新增 `drawDebugCompleteButton`**

在 `drawTopBar` 后新增：

```js
function drawDebugCompleteButton(ctx, state, layout) {
  const button = layout.debugCompleteButton;
  if (!button || state.completed) {
    return;
  }

  roundRect(ctx, button.x, button.y, button.width, button.height, 13, 'rgba(255, 200, 97, 0.24)');
  ctx.strokeStyle = 'rgba(148, 99, 15, 0.38)';
  ctx.lineWidth = 1.2;
  roundedPath(ctx, button.x, button.y, button.width, button.height, 13);
  ctx.stroke();

  ctx.fillStyle = '#94630f';
  ctx.font = '900 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/layout.test.cjs
node --check minigame/src/renderer.js
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 6: 验证检查点**

Run:

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
```

Expected: PASS，确认绘制入口不破坏全量测试。

---

### 任务 4：运行时接入快速完成动作

**Files:**
- Modify: `minigame/game.js`

- [ ] **Step 1: 导入调试函数**

在 `minigame/game.js` 顶部加入：

```js
const { completePuzzleForDebug, isDebugToolsEnabled } = require('./src/debug');
```

- [ ] **Step 2: 保存调试开关状态**

在运行时状态变量区加入：

```js
let debugToolsEnabled = false;
```

在 `boot()` 的开头读取存档之前加入：

```js
  debugToolsEnabled = isDebugToolsEnabled(wx);
```

- [ ] **Step 3: 布局启用调试按钮**

在 `setupCanvas()` 中把：

```js
  layout = createLayout(width, height);
```

改为：

```js
  layout = createLayout(width, height, { debugToolsEnabled });
```

- [ ] **Step 4: 接入 debug hit**

在 `handleGameTouch(touch)` 中，`if (state.completed) {` 之前加入：

```js
  if (hit.type === 'debug' && hit.action === 'complete') {
    applyStateChange(() => completePuzzleForDebug(state), true);
    return;
  }
```

这会复用现有 `applyStateChange -> persistProgress -> render`，使完成关卡进入 `completedLevelIds`，并让 `renderGame` 收到 `completionFeedback`。

- [ ] **Step 5: 运行语法和回归测试**

Run:

```bash
node --check minigame/game.js
node --test minigame/test/debug.test.cjs minigame/test/layout.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS；`node --check` 无输出。

- [ ] **Step 6: 验证检查点**

Run:

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
node --check minigame/game.js
node --check minigame/src/debug.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
```

Expected: PASS；所有 `node --check` 无输出。

---

### 任务 5：微信开发者工具手动验收

**Files:**
- No code changes.

- [ ] **Step 1: 打开项目**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/tianhai/Documents/微信小游戏/minigame --lang zh
```

Expected: 微信开发者工具打开 `lab-lines-sudoku`，顶部显示“小游戏模式”。

- [ ] **Step 2: 验收开发入口显示**

在模拟器菜单页点击 `继续实验` 或 `开始新实验` 进入游戏页。

Expected:

- 游戏页右上角可见 `DEV 完成`。
- 菜单页不显示 `DEV 完成`。
- 调试入口不会遮挡返回按钮、棋盘或数字键盘。

- [ ] **Step 3: 验收通关弹层**

点击 `DEV 完成`。

Expected:

- 出现 `大脑除锈完成` 弹层。
- 弹层显示 `+0.01%` 和 `娱乐数值，不代表医学效果。`。
- 弹层按钮 `再来一局`、`下一关` 可见。

- [ ] **Step 4: 验收回归流程**

依次测试：

- 点击 `下一关` 后进入下一关，不再显示胜利弹层。
- 点击返回菜单，菜单页能展示累计除锈摘要。
- 已完成关卡卡片显示 `已除锈`。
- 点击 `开始新实验` 后进入游戏页，`DEV 完成` 仍只在游戏页出现。

- [ ] **Step 5: 最终验证命令**

Run:

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
node --check minigame/game.js
node --check minigame/src/debug.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
rg -n "老年痴呆|阿尔茨海默|预防|降低.*风险|医学证明|患病概率" minigame/game.js minigame/src/derust.js minigame/src/renderer.js
```

Expected:

- 测试全部 PASS。
- `node --check` 全部无输出。
- `rg` 对运行时代码无命中，退出码为 1。
