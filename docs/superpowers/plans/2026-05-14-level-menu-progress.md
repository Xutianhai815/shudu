# 关卡菜单与本地进度实现计划

> **给 agentic workers：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项实现。步骤使用 checkbox（`- [ ]`）语法追踪。当前目录不是 git 仓库，所以每个任务末尾使用“验证检查点”替代 commit。

**目标：** 在现有微信小游戏单 Canvas 架构内增加首页菜单、关卡选择、本地进度保存、继续游戏和返回菜单能力。

**架构：** 保持 `game.js` 作为运行时协调器，新增 `progress.js` 负责纯进度序列化/恢复，新增 `storage.js` 负责微信存储包装，新增 `menu.js` 负责菜单布局和命中测试。`renderer.js` 增加菜单绘制，`layout.js` 增加棋盘返回按钮命中区域。

**技术栈：** 微信小游戏运行时、Canvas 2D、CommonJS JavaScript、Node 内置测试运行器。

---

## 文件结构

- 新建 `minigame/src/progress.js`：纯函数模块，负责将 puzzle state 转成可保存对象，并从保存对象恢复 puzzle state。
- 新建 `minigame/src/storage.js`：微信本地存储包装层，接受 `wxLike` 依赖，捕获读写异常。
- 新建 `minigame/src/menu.js`：菜单布局和 hit test，返回 `continue`、`start`、`level` 动作。
- 修改 `minigame/src/puzzle.js`：新增 `createPuzzleStateFromSnapshot(level, snapshot)`，复用现有 `createPuzzleState` 并只恢复可变字段。
- 修改 `minigame/src/layout.js`：在 `createLayout` 中加入 `backButton`，在 `hitTest` 中返回 `{ type: 'nav', action: 'back' }`。
- 修改 `minigame/src/renderer.js`：导出 `renderMenu`，保留 `renderGame`。
- 修改 `minigame/game.js`：引入场景状态、菜单渲染、菜单点击、进度加载与保存。
- 新建 `minigame/test/progress.test.cjs`：覆盖进度序列化、恢复和坏数据保护。
- 新建 `minigame/test/storage.test.cjs`：覆盖存储 key、异常保护和默认值。
- 新建 `minigame/test/menu.test.cjs`：覆盖菜单布局命中测试。
- 修改 `minigame/test/layout.test.cjs`：增加返回按钮命中测试。
- 修改 `minigame/test/renderer.test.cjs`：增加菜单渲染 smoke test。

---

### 任务 1：进度序列化与恢复

**文件：**
- 新建：`minigame/test/progress.test.cjs`
- 新建：`minigame/src/progress.js`
- 修改：`minigame/src/puzzle.js`

- [ ] **步骤 1：写失败测试**

在 `minigame/test/progress.test.cjs` 写入以下测试：

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { applyDigit, createPuzzleState, selectCell, toggleNoteMode } = require('../src/puzzle');
const {
  EMPTY_PROGRESS,
  createProgressFromState,
  restoreStateFromProgress,
} = require('../src/progress');

test('createProgressFromState serializes mutable puzzle state', () => {
  const initial = createPuzzleState(levels[0]);
  const filled = applyDigit(selectCell(initial, 0, 2), 2);
  const noted = applyDigit(toggleNoteMode(selectCell(filled, 0, 3)), 6);

  const progress = createProgressFromState(noted, ['lab-03']);

  assert.equal(progress.version, 1);
  assert.equal(progress.activeRun.levelId, 'lab-02');
  assert.deepEqual(progress.activeRun.selected, { row: 0, col: 3 });
  assert.equal(progress.activeRun.noteMode, true);
  assert.equal(progress.activeRun.cells[0][2].value, 2);
  assert.deepEqual(progress.activeRun.cells[0][3].notes, [6]);
  assert.deepEqual(progress.completedLevelIds, ['lab-03']);
});

test('restoreStateFromProgress restores selected cell values notes and mistakes', () => {
  const source = createProgressFromState(
    {
      ...applyDigit(selectCell(createPuzzleState(levels[0]), 0, 2), 2),
      mistakes: 1,
    },
    [],
  );

  const restored = restoreStateFromProgress(source.activeRun, levels);

  assert.equal(restored.level.id, 'lab-02');
  assert.deepEqual(restored.selected, { row: 0, col: 2 });
  assert.equal(restored.cells[0][2].value, 2);
  assert.equal(restored.cells[0][2].fixed, false);
  assert.equal(restored.cells[0][0].fixed, true);
  assert.equal(restored.mistakes, 1);
  assert.equal(restored.history.length, 0);
});

test('restoreStateFromProgress returns null for invalid saved data', () => {
  assert.equal(restoreStateFromProgress(null, levels), null);
  assert.equal(restoreStateFromProgress({ levelId: 'missing-level' }, levels), null);
  assert.equal(
    restoreStateFromProgress({ levelId: 'lab-02', cells: [[{ value: 1, notes: [] }]] }, levels),
    null,
  );
});

test('EMPTY_PROGRESS is a safe default progress object', () => {
  assert.deepEqual(EMPTY_PROGRESS, {
    version: 1,
    activeRun: null,
    completedLevelIds: [],
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test minigame/test/progress.test.cjs
```

预期：失败，错误包含 `Cannot find module '../src/progress'` 或缺少 `createPuzzleStateFromSnapshot`。

- [ ] **步骤 3：在 `puzzle.js` 增加恢复辅助函数**

在 `minigame/src/puzzle.js` 中新增 `createPuzzleStateFromSnapshot`，并导出它。实现要点：

```js
function createPuzzleStateFromSnapshot(level, snapshot) {
  const baseState = createPuzzleState(level);

  return {
    ...baseState,
    selected: isValidSelected(snapshot.selected) ? snapshot.selected : baseState.selected,
    noteMode: snapshot.noteMode === true,
    mistakes: Number.isInteger(snapshot.mistakes) && snapshot.mistakes >= 0 ? snapshot.mistakes : 0,
    completed: snapshot.completed === true,
    history: [],
    cells: baseState.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const savedCell = snapshot.cells[rowIndex][colIndex];

        if (cell.fixed) {
          return cell;
        }

        return {
          ...cell,
          value: isValidDigitOrZero(savedCell.value) ? savedCell.value : 0,
          notes: normalizeNotes(savedCell.notes),
        };
      }),
    ),
  };
}

function isValidSelected(selected) {
  return Boolean(
    selected &&
      Number.isInteger(selected.row) &&
      Number.isInteger(selected.col) &&
      selected.row >= 0 &&
      selected.row < 9 &&
      selected.col >= 0 &&
      selected.col < 9,
  );
}

function isValidDigitOrZero(value) {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

function normalizeNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return Array.from(new Set(notes))
    .filter((note) => Number.isInteger(note) && note >= 1 && note <= 9)
    .sort((left, right) => left - right);
}
```

导出列表加入：

```js
createPuzzleStateFromSnapshot,
```

- [ ] **步骤 4：实现 `progress.js`**

创建 `minigame/src/progress.js`，包含以下接口：

```js
const { createPuzzleStateFromSnapshot } = require('./puzzle');

const PROGRESS_VERSION = 1;
const EMPTY_PROGRESS = Object.freeze({
  version: PROGRESS_VERSION,
  activeRun: null,
  completedLevelIds: [],
});

function createProgressFromState(state, completedLevelIds = []) {
  return {
    version: PROGRESS_VERSION,
    activeRun: serializeState(state),
    completedLevelIds: normalizeCompletedLevelIds(completedLevelIds),
  };
}

function serializeState(state) {
  return {
    levelId: state.level.id,
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

function restoreStateFromProgress(activeRun, levels) {
  if (!isValidActiveRun(activeRun)) {
    return null;
  }

  const level = levels.find((item) => item.id === activeRun.levelId);
  if (!level) {
    return null;
  }

  return createPuzzleStateFromSnapshot(level, activeRun);
}

function normalizeProgress(progress) {
  if (!progress || progress.version !== PROGRESS_VERSION) {
    return { ...EMPTY_PROGRESS };
  }

  return {
    version: PROGRESS_VERSION,
    activeRun: isValidActiveRun(progress.activeRun) ? progress.activeRun : null,
    completedLevelIds: normalizeCompletedLevelIds(progress.completedLevelIds),
  };
}

function normalizeCompletedLevelIds(levelIds) {
  if (!Array.isArray(levelIds)) {
    return [];
  }

  return Array.from(new Set(levelIds.filter((levelId) => typeof levelId === 'string')));
}

function isValidActiveRun(activeRun) {
  return Boolean(
    activeRun &&
      typeof activeRun.levelId === 'string' &&
      activeRun.selected &&
      Array.isArray(activeRun.cells) &&
      activeRun.cells.length === 9 &&
      activeRun.cells.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 9 &&
          row.every((cell) => cell && Number.isInteger(cell.value) && Array.isArray(cell.notes)),
      ),
  );
}

module.exports = {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  createProgressFromState,
  normalizeProgress,
  restoreStateFromProgress,
};
```

- [ ] **步骤 5：运行测试确认通过**

运行：

```bash
node --test minigame/test/progress.test.cjs minigame/test/puzzle.test.cjs
```

预期：两个测试文件全部通过。

- [ ] **步骤 6：验证检查点**

运行：

```bash
node --check minigame/src/puzzle.js
node --check minigame/src/progress.js
```

预期：无输出，退出码为 0。

---

### 任务 2：微信本地存储包装

**文件：**
- 新建：`minigame/test/storage.test.cjs`
- 新建：`minigame/src/storage.js`

- [ ] **步骤 1：写失败测试**

创建 `minigame/test/storage.test.cjs`：

```js
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
    completedLevelIds: ['lab-02'],
  });
});

test('loadProgress catches storage read errors', () => {
  const wxLike = {
    getStorageSync: () => {
      throw new Error('storage unavailable');
    },
  };

  assert.deepEqual(loadProgress(wxLike), EMPTY_PROGRESS);
});

test('saveProgress writes with the expected storage key', () => {
  const writes = [];
  const wxLike = {
    setStorageSync: (key, value) => writes.push({ key, value }),
  };

  saveProgress(wxLike, { version: 1, activeRun: null, completedLevelIds: ['lab-03'] });

  assert.deepEqual(writes, [
    {
      key: PROGRESS_STORAGE_KEY,
      value: { version: 1, activeRun: null, completedLevelIds: ['lab-03'] },
    },
  ]);
});

test('clearProgress removes the expected storage key', () => {
  const removed = [];
  const wxLike = {
    removeStorageSync: (key) => removed.push(key),
  };

  clearProgress(wxLike);

  assert.deepEqual(removed, [PROGRESS_STORAGE_KEY]);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test minigame/test/storage.test.cjs
```

预期：失败，错误包含 `Cannot find module '../src/storage'`。

- [ ] **步骤 3：实现 `storage.js`**

创建 `minigame/src/storage.js`：

```js
const { EMPTY_PROGRESS, normalizeProgress } = require('./progress');

const PROGRESS_STORAGE_KEY = 'lab-lines-progress-v1';

function loadProgress(wxLike) {
  try {
    const stored = wxLike.getStorageSync(PROGRESS_STORAGE_KEY);
    return normalizeProgress(stored);
  } catch (error) {
    return { ...EMPTY_PROGRESS };
  }
}

function saveProgress(wxLike, progress) {
  try {
    wxLike.setStorageSync(PROGRESS_STORAGE_KEY, normalizeProgress(progress));
  } catch (error) {
    return false;
  }

  return true;
}

function clearProgress(wxLike) {
  try {
    wxLike.removeStorageSync(PROGRESS_STORAGE_KEY);
  } catch (error) {
    return false;
  }

  return true;
}

module.exports = {
  PROGRESS_STORAGE_KEY,
  clearProgress,
  loadProgress,
  saveProgress,
};
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```bash
node --test minigame/test/storage.test.cjs minigame/test/progress.test.cjs
node --check minigame/src/storage.js
```

预期：测试通过，语法检查无输出。

- [ ] **步骤 5：验证检查点**

运行：

```bash
node --test minigame/test/storage.test.cjs
```

预期：`pass` 数量为 5，`fail` 为 0。

---

### 任务 3：菜单布局与命中测试

**文件：**
- 新建：`minigame/test/menu.test.cjs`
- 新建：`minigame/src/menu.js`

- [ ] **步骤 1：写失败测试**

创建 `minigame/test/menu.test.cjs`：

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createMenuLayout, hitTestMenu } = require('../src/menu');

test('hitTestMenu maps the continue button to continue action', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    completedLevelIds: ['lab-02'],
  });
  const button = layout.continueButton;

  assert.deepEqual(hitTestMenu(layout, button.x + button.width / 2, button.y + button.height / 2), {
    type: 'menu',
    action: 'continue',
  });
});

test('hitTestMenu maps primary button to start action when no save exists', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: [],
  });
  const button = layout.primaryButton;

  assert.deepEqual(hitTestMenu(layout, button.x + button.width / 2, button.y + button.height / 2), {
    type: 'menu',
    action: 'start',
    levelId: 'lab-02',
  });
});

test('hitTestMenu maps level cards to selected level ids', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-02'],
  });
  const secondCard = layout.levelCards[1];

  assert.deepEqual(hitTestMenu(layout, secondCard.x + secondCard.width / 2, secondCard.y + secondCard.height / 2), {
    type: 'menu',
    action: 'level',
    levelId: 'lab-03',
  });
  assert.equal(layout.levelCards[0].completed, true);
});

test('createMenuLayout keeps cards inside a short viewport', () => {
  const layout = createMenuLayout(375, 667, levels, {
    hasActiveRun: true,
    completedLevelIds: [],
  });
  const lastCard = layout.levelCards.at(-1);

  assert.ok(lastCard.y + lastCard.height <= 667 - layout.margin);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test minigame/test/menu.test.cjs
```

预期：失败，错误包含 `Cannot find module '../src/menu'`。

- [ ] **步骤 3：实现 `menu.js`**

创建 `minigame/src/menu.js`：

```js
function createMenuLayout(width, height, levels, progressSummary) {
  const margin = 22;
  const compact = height < 760;
  const titleY = compact ? 44 : 72;
  const buttonY = compact ? 144 : 188;
  const buttonHeight = compact ? 54 : 62;
  const secondaryButtonGap = progressSummary.hasActiveRun ? 10 : 0;
  const primaryButtonY = progressSummary.hasActiveRun ? buttonY + buttonHeight + secondaryButtonGap : buttonY;
  const cardStartY = primaryButtonY + buttonHeight + (compact ? 22 : 34);
  const cardGap = compact ? 10 : 12;
  const cardHeight = compact ? 76 : 88;
  const completed = new Set(progressSummary.completedLevelIds || []);
  const primaryLevel = levels[0];

  const primaryButton = {
    x: margin,
    y: primaryButtonY,
    width: width - margin * 2,
    height: buttonHeight,
    action: 'start',
    levelId: primaryLevel.id,
    label: progressSummary.hasActiveRun ? '开始新实验' : '开始实验',
  };

  const continueButton = progressSummary.hasActiveRun
    ? {
        x: margin,
        y: buttonY,
        width: width - margin * 2,
        height: buttonHeight,
        action: 'continue',
        label: '继续实验',
      }
    : null;

  const levelCards = levels.map((level, index) => ({
    x: margin,
    y: cardStartY + index * (cardHeight + cardGap),
    width: width - margin * 2,
    height: cardHeight,
    levelId: level.id,
    title: level.title,
    label: level.label,
    rules: level.rules,
    difficulty: level.difficulty,
    completed: completed.has(level.id),
  }));

  return {
    width,
    height,
    margin,
    compact,
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
}

function hitTestMenu(layout, x, y) {
  if (layout.continueButton && isInside(layout.continueButton, x, y)) {
    return {
      type: 'menu',
      action: 'continue',
    };
  }

  if (isInside(layout.primaryButton, x, y)) {
    return {
      type: 'menu',
      action: layout.primaryButton.action,
      levelId: layout.primaryButton.levelId,
    };
  }

  const card = layout.levelCards.find((item) => isInside(item, x, y));
  if (card) {
    return {
      type: 'menu',
      action: 'level',
      levelId: card.levelId,
    };
  }

  return null;
}

function isInside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

module.exports = {
  createMenuLayout,
  hitTestMenu,
};
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```bash
node --test minigame/test/menu.test.cjs
node --check minigame/src/menu.js
```

预期：测试通过，语法检查无输出。

- [ ] **步骤 5：验证检查点**

运行：

```bash
node --test minigame/test/menu.test.cjs minigame/test/levels.test.cjs
```

预期：菜单测试和关卡测试全部通过。

---

### 任务 4：棋盘返回按钮命中测试

**文件：**
- 修改：`minigame/test/layout.test.cjs`
- 修改：`minigame/src/layout.js`

- [ ] **步骤 1：写失败测试**

在 `minigame/test/layout.test.cjs` 末尾追加：

```js
test('hitTest maps top-left puzzle button to back action', () => {
  const layout = createLayout(430, 932);
  const backButton = layout.backButton;

  assert.deepEqual(hitTest(layout, backButton.x + backButton.width / 2, backButton.y + backButton.height / 2), {
    type: 'nav',
    action: 'back',
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test minigame/test/layout.test.cjs
```

预期：失败，原因是 `layout.backButton` 为空或 `hitTest` 未返回 `nav`。

- [ ] **步骤 3：修改 `layout.js`**

在 `createLayout` 的返回对象加入：

```js
backButton: {
  x: topBar.x,
  y: topBar.y,
  width: 44,
  height: 44,
},
```

在 `hitTest` 中，棋盘检测之前加入：

```js
if (isInside(layout.backButton, x, y)) {
  return {
    type: 'nav',
    action: 'back',
  };
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```bash
node --test minigame/test/layout.test.cjs
node --check minigame/src/layout.js
```

预期：布局测试全部通过，语法检查无输出。

- [ ] **步骤 5：验证检查点**

运行：

```bash
node --test minigame/test/layout.test.cjs minigame/test/puzzle.test.cjs
```

预期：返回按钮新增逻辑不影响棋盘、工具、胜利弹层命中测试。

---

### 任务 5：菜单渲染

**文件：**
- 修改：`minigame/test/renderer.test.cjs`
- 修改：`minigame/src/renderer.js`

- [ ] **步骤 1：写失败测试**

修改 `minigame/test/renderer.test.cjs` 的 import：

```js
const { renderGame, renderMenu } = require('../src/renderer');
```

在文件末尾追加：

```js
test('renderer draws the menu without throwing', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = {
    width: 430,
    height: 932,
    margin: 22,
    title: {
      x: 22,
      y: 72,
      text: 'Lab Lines Sudoku',
      subtitle: '数独实验室',
    },
    continueButton: {
      x: 22,
      y: 188,
      width: 386,
      height: 62,
      label: '继续实验',
    },
    primaryButton: {
      x: 22,
      y: 188,
      width: 386,
      height: 62,
      label: '开始新实验',
    },
    levelCards: [
      {
        x: 22,
        y: 284,
        width: 386,
        height: 88,
        levelId: 'lab-02',
        title: '温度线实验',
        label: 'LAB-02',
        rules: ['classic', 'thermo'],
        completed: true,
      },
    ],
  };

  renderMenu(ctx, menuLayout);

  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('数独实验室')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('继续实验')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('温度线实验')));
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test minigame/test/renderer.test.cjs
```

预期：失败，原因是 `renderMenu` 尚未导出。

- [ ] **步骤 3：在 `renderer.js` 增加 `renderMenu`**

新增导出函数。实现应复用现有 `clear`、`drawBackground`、`roundRect`、`chip` 等 helper：

```js
function renderMenu(ctx, layout) {
  clear(ctx, layout.width, layout.height);
  drawMenuBackground(ctx, layout);
  drawMenuHero(ctx, layout);
  drawMenuActions(ctx, layout);
  drawLevelCards(ctx, layout);
}
```

新增绘制 helper 的行为要求：

```js
function drawMenuBackground(ctx, layout) {
  const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height);
  gradient.addColorStop(0, '#e2ebe7');
  gradient.addColorStop(0.52, '#f8f4e8');
  gradient.addColorStop(1, '#d8e6e0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

function drawMenuHero(ctx, layout) {
  ctx.fillStyle = '#18211f';
  ctx.font = '900 34px sans-serif';
  ctx.fillText(layout.title.subtitle, layout.title.x, layout.title.y);
  ctx.fillStyle = 'rgba(24, 33, 31, 0.58)';
  ctx.font = '800 13px sans-serif';
  ctx.fillText(layout.title.text, layout.title.x, layout.title.y + 28);
}
```

`drawMenuActions` 规则：

- 有 `continueButton` 时绘制深色主按钮文字 `继续实验`。
- 无 `continueButton` 时绘制 `primaryButton.label`。
- 有 `continueButton` 时在其下方以浅色按钮绘制 `primaryButton.label`，按钮位置使用 `primaryButton.y`，避免丢失“开始新实验”入口。

`drawLevelCards` 规则：

- 每个卡片绘制 `label`、`title`、规则标签。
- `completed` 为 true 时显示 `已完成`。

导出列表改为：

```js
module.exports = {
  renderGame,
  renderMenu,
};
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```bash
node --test minigame/test/renderer.test.cjs
node --check minigame/src/renderer.js
```

预期：渲染测试全部通过，语法检查无输出。

- [ ] **步骤 5：验证检查点**

运行：

```bash
node --test minigame/test/renderer.test.cjs minigame/test/menu.test.cjs
```

预期：菜单布局数据能被 renderer 消费。

---

### 任务 6：运行时场景协调与自动保存

**文件：**
- 修改：`minigame/game.js`

- [ ] **步骤 1：整理 `game.js` 的新状态变量**

在 `game.js` 顶部引入：

```js
const { levels, getLevelById } = require('./src/levels');
const { createMenuLayout, hitTestMenu } = require('./src/menu');
const { createProgressFromState, restoreStateFromProgress } = require('./src/progress');
const { loadProgress, saveProgress } = require('./src/storage');
```

把 renderer import 改为：

```js
const { renderGame, renderMenu } = require('./src/renderer');
```

新增运行时变量：

```js
let scene = 'menu';
let state = null;
let savedProgress = null;
let completedLevelIds = [];
let menuLayout = null;
```

- [ ] **步骤 2：启动时读取进度**

在 `boot()` 开始处加入：

```js
savedProgress = loadProgress(wx);
completedLevelIds = savedProgress.completedLevelIds;
const restoredOnBoot = restoreStateFromProgress(savedProgress.activeRun, levels);
state = restoredOnBoot || createPuzzleState(levels[0]);
```

保持初始 `scene = 'menu'`。

- [ ] **步骤 3：布局阶段创建菜单布局**

在 `setupCanvas()` 末尾加入：

```js
menuLayout = createMenuLayout(width, height, levels, {
  hasActiveRun: Boolean(savedProgress && savedProgress.activeRun && !savedProgress.activeRun.completed),
  completedLevelIds,
});
```

- [ ] **步骤 4：根据场景渲染**

将 `render()` 改成：

```js
function render() {
  if (scene === 'menu') {
    renderMenu(ctx, menuLayout);
    return;
  }

  renderGame(ctx, state, layout);
}
```

- [ ] **步骤 5：分发触摸输入**

把 `wx.onTouchStart` 内部逻辑拆成：

```js
if (scene === 'menu') {
  handleMenuTouch(touch.clientX, touch.clientY);
  return;
}

handleGameTouch(touch.clientX, touch.clientY);
```

新增 `handleMenuTouch`：

```js
function handleMenuTouch(x, y) {
  const hit = hitTestMenu(menuLayout, x, y);
  if (!hit) {
    return;
  }

  if (hit.action === 'continue') {
    const restored = restoreStateFromProgress(savedProgress.activeRun, levels);
    if (restored) {
      state = restored;
      scene = 'playing';
      render();
    }
    return;
  }

  if (hit.action === 'start' || hit.action === 'level') {
    state = createPuzzleState(getLevelById(hit.levelId));
    persistProgress();
    scene = 'playing';
    render();
  }
}
```

新增 `handleGameTouch`，保留原有 cell/digit/tool/victory 逻辑，并加入：

```js
if (hit.type === 'nav' && hit.action === 'back') {
  scene = 'menu';
  refreshMenuLayout();
  render();
  return;
}
```

- [ ] **步骤 6：状态变化后保存进度**

新增：

```js
function persistProgress() {
  if (!state) {
    return;
  }

  if (state.completed && !completedLevelIds.includes(state.level.id)) {
    completedLevelIds = [...completedLevelIds, state.level.id];
  }

  savedProgress = createProgressFromState(state, completedLevelIds);
  saveProgress(wx, savedProgress);
}

function refreshMenuLayout() {
  menuLayout = createMenuLayout(canvas.width / dpr, canvas.height / dpr, levels, {
    hasActiveRun: Boolean(savedProgress && savedProgress.activeRun && !savedProgress.activeRun.completed),
    completedLevelIds,
  });
}
```

在以下动作后调用 `persistProgress()`：

- `applyDigit`
- `applyToolAction`
- `applyVictoryAction`
- 新开关卡

注意：如果 hit 为 `hint` 且当前未实现，不需要保存。

- [ ] **步骤 7：运行完整回归**

运行：

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
node --check minigame/game.js
```

预期：全部测试通过，`game.js` 语法检查无输出。

- [ ] **步骤 8：验证检查点**

运行：

```bash
node --check minigame/src/progress.js
node --check minigame/src/storage.js
node --check minigame/src/menu.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
```

预期：所有语法检查无输出。

---

### 任务 7：微信开发者工具手动验收

**文件：**
- 读取：`minigame/game.js`
- 读取：`minigame/project.config.json`

- [ ] **步骤 1：打开微信开发者工具项目**

运行：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/tianhai/Documents/微信小游戏/minigame --lang zh
```

预期：开发者工具打开 `lab-lines-sudoku`，顶部显示“小游戏模式”。

- [ ] **步骤 2：验收启动菜单**

在模拟器中确认：

- 首屏显示菜单。
- 有标题 `数独实验室`。
- 有开始按钮。
- 能看到当前两个关卡卡片。

- [ ] **步骤 3：验收关卡进入与返回**

在模拟器中操作：

- 点击 `开始实验` 或第一张关卡卡片。
- 确认进入数独棋盘。
- 点击左上角返回按钮。
- 确认回到菜单。

- [ ] **步骤 4：验收本地进度**

在模拟器中操作：

- 进入第一关。
- 填入一个正确数字或添加一个候选数。
- 返回菜单。
- 点击 `继续实验`。
- 确认刚才的格子值或候选数仍然存在。

- [ ] **步骤 5：验收重新打开后的继续游戏**

关闭并重新打开项目：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli close --project /Users/tianhai/Documents/微信小游戏/minigame --lang zh
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/tianhai/Documents/微信小游戏/minigame --lang zh
```

预期：菜单仍显示 `继续实验`，点击后恢复上一次未完成状态。

---

## 总回归命令

实现完成后运行：

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
node --check minigame/game.js
node --check minigame/src/puzzle.js
node --check minigame/src/progress.js
node --check minigame/src/storage.js
node --check minigame/src/menu.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
```

预期：

- 所有测试 `pass`，`fail` 为 0。
- 所有 `node --check` 命令无输出并返回 0。

## 范围确认

本计划覆盖中文 spec 中的全部验收标准：启动菜单、开始/关卡选择、返回菜单、本地保存、继续游戏、现有交互不回退、测试通过。本计划不包含云能力、排行榜、分享、广告、埋点、远程关卡和新规则。
