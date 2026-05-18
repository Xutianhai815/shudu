# 首页数独线索盘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页主视觉从 `3×3` 温室球改为更像数独的 `9×9` 漂浮线索盘，并把首页按钮整体上移。

**Architecture:** `menu.js` 将布局字段从 `heroOrb` 调整为 `heroBoard`，提供 81 个棋盘格、按钮上移量和安全区约束。`renderer.js` 删除圆形温室球绘制，新增 9×9 棋盘、粗宫线、少量数字和线索高亮。测试先红后绿，快照用于确认首页不再出现旧主视觉和底部贴边按钮。

**Tech Stack:** 微信小游戏 Canvas、CommonJS、Node `node:test`、现有 SVG snapshot 工具。

---

### Task 1: Update Tests

**Files:**
- Modify: `minigame/test/menu.test.cjs`
- Modify: `minigame/test/renderer.test.cjs`
- Modify: `minigame/test/visual-snapshots.test.cjs`

- [ ] **Step 1: Update menu layout expectations**

Change hero assertions from `heroOrb` to `heroBoard`:

```js
assert.equal(layout.heroBoard.cells.length, 81);
assert.ok(layout.heroBoard.y > layout.title.y + 80);
assert.ok(layout.heroBoard.y + layout.heroBoard.size < layout.primaryButton.y);
assert.ok(layout.primaryButton.y + layout.primaryButton.height <= layout.height - layout.margin - 32);
```

For active-run viewport checks, assert `heroBoard` clears `continueButton` and buttons are lifted above bottom margin.

- [ ] **Step 2: Update renderer expectations**

Rename the renderer test to `renderer draws the nine-by-nine sudoku hero board` and assert:

```js
const tealFills = ctx.calls.filter((call) => call.name === 'set:fillStyle' && call.args.includes('rgba(22, 163, 160, 0.18)'));
const boardLines = ctx.calls.filter((call) => call.name === 'stroke');
assert.ok(tealFills.length >= 1);
assert.ok(boardLines.length >= 8);
```

- [ ] **Step 3: Update visual snapshot expectations**

Assert menu snapshot still contains title/subtitle and no report copy. Add a weak structural check for board cell colors:

```js
assert.match(snapshots.menu, /#16a3a0|rgba\\(22, 163, 160/);
assert.match(snapshots.menu, /#17312b/);
```

- [ ] **Step 4: Verify red**

Run:

```bash
node --test minigame/test/menu.test.cjs minigame/test/renderer.test.cjs minigame/test/visual-snapshots.test.cjs
```

Expected: FAIL because `heroBoard` and board renderer are not implemented.

---

### Task 2: Implement Layout

**Files:**
- Modify: `minigame/src/menu.js`

- [ ] **Step 1: Replace 3×3 orb cells with 9×9 board cells**

Create deterministic 81-cell data with sparse numbers and highlight roles:

```js
const HERO_BOARD_VALUES = Object.freeze([
  5, 0, 0, 0, 0, 9, 0, 0, 0,
  0, 8, 0, 0, 0, 0, 3, 0, 0,
  0, 0, 2, 0, 0, 0, 0, 7, 0,
  0, 0, 6, 0, 0, 0, 0, 0, 1,
  0, 0, 0, 4, 0, 2, 0, 0, 0,
  7, 0, 0, 0, 0, 0, 8, 0, 0,
  0, 3, 0, 0, 0, 0, 6, 0, 0,
  0, 0, 1, 0, 0, 0, 0, 4, 0,
  0, 0, 0, 8, 0, 0, 0, 0, 5,
]);
```

Add highlight indexes for teal and amber. Return `heroBoard` with `cells` containing `{ value, tone }`.

- [ ] **Step 2: Lift buttons**

Add:

```js
const buttonLift = compact ? 34 : 42;
const primaryButtonY = height - margin - buttonHeight - buttonLift;
```

Keep continue button above primary button.

- [ ] **Step 3: Keep short screens safe**

Use existing clamp logic, but target `heroBoard`:

```js
const safeHeroY = Math.max(
  titleY + 104,
  Math.min(heroY, bottomButtonY - heroSize - (compact ? 22 : 34)),
);
```

- [ ] **Step 4: Run menu tests**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: PASS.

---

### Task 3: Implement Renderer

**Files:**
- Modify: `minigame/src/renderer.js`

- [ ] **Step 1: Replace `drawMenuHeroOrb` with `drawMenuHeroBoard`**

Render a rounded square board, 81 cells, sparse numbers, thin grid lines, and heavier 3×3 block lines.

- [ ] **Step 2: Update `renderMenu` call**

Call `drawMenuHeroBoard(ctx, layout)` instead of `drawMenuHeroOrb(ctx, layout)`.

- [ ] **Step 3: Run renderer and snapshot tests**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/visual-snapshots.test.cjs
```

Expected: PASS.

---

### Task 4: Full Verification

**Files:**
- Generated: `minigame/artifacts/visual/menu.svg`

- [ ] **Step 1: Run full test suite**

```bash
node --test minigame/test/*.test.cjs
```

- [ ] **Step 2: Refresh snapshots**

```bash
node minigame/tools/render-snapshots.js
```

- [ ] **Step 3: Generate preview**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /private/tmp/lab-lines-sudoku-board-hero-preview.png --info-output /private/tmp/lab-lines-sudoku-board-hero-preview.json
```

---

## Plan Self-Review

- Scope is limited to homepage visual and button position.
- No background music, report module, or level list changes.
- Tests cover layout, renderer, snapshot, and full runtime safety through existing suite.
