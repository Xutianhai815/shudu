# 首页脑力温室 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除首页“今日报告”，把新用户首页改成安静明亮的“脑力温室”入口，并保留简单清晰的开始/继续按钮。

**Architecture:** `minigame/src/menu.js` 只负责首页布局数据，新增 `heroSubtitle`、`heroOrb`、`ambientParticles` 等装饰布局字段，并让 `derustSummary` 在首页永远隐藏。`minigame/src/renderer.js` 负责绘制浅绿暖米色背景、柔和粒子、标题副文案、3×3 数独温室球和按钮。`game.js` 停止向首页传 `dailyReportSummary`，但完成页和进度存储仍保留日报数据。

**Tech Stack:** 微信小游戏 Canvas、CommonJS、Node `node:test`、现有 SVG snapshot 工具。

---

## Scope Boundary

- 本轮不做背景音乐，不新增 BGM 文件、音频开关、自动播放或 `soundManager` 改造。
- 本轮不恢复首页关卡列表，不新增签到、任务、成就或广告式入口。
- 本轮保留完成页的“大脑除锈”反馈和本地进度日报数据，只移除首页报告展示。

## File Structure

- Modify: `minigame/src/menu.js`
  - 移除首页报告依赖，新增首页主视觉和粒子布局数据。
- Modify: `minigame/src/renderer.js`
  - 移除首页报告绘制路径，新增脑力温室背景、粒子、主视觉和副文案绘制。
- Modify: `minigame/game.js`
  - 首页布局不再传 `dailyReportSummary`。
- Modify: `minigame/tools/render-snapshots.js`
  - 菜单快照改为脑力温室，不再注入今日报告。
- Modify: `minigame/test/menu.test.cjs`
  - 更新首页布局测试，覆盖 heroOrb、隐藏报告和按钮安全区。
- Modify: `minigame/test/renderer.test.cjs`
  - 更新首页渲染测试，覆盖无报告文案、有主视觉和副文案。
- Modify: `minigame/test/game-runtime.test.cjs`
  - 覆盖 runtime 首页不传/不渲染今日报告。
- Modify: `minigame/test/visual-snapshots.test.cjs`
  - 覆盖菜单快照包含脑力温室关键视觉。
- Modify: `minigame/README.md`
  - 更新视觉快照描述。

---

### Task 1: Update Menu Layout Tests

**Files:**
- Modify: `minigame/test/menu.test.cjs`

- [ ] **Step 1: Write failing tests for the new homepage layout**

Replace the report-focused menu tests with tests like this:

```js
test('createMenuLayout adds brain greenhouse hero for first-time users', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: [],
  });

  assert.equal(layout.heroSubtitle, '每天打开一局，给大脑做一次轻量热身。');
  assert.equal(layout.heroOrb.cells.length, 9);
  assert.ok(layout.heroOrb.y > layout.title.y + 80);
  assert.ok(layout.heroOrb.y + layout.heroOrb.size < layout.primaryButton.y);
  assert.ok(layout.ambientParticles.length >= 3);
  assert.equal(layout.derustSummary.visible, false);
});

test('createMenuLayout keeps homepage report hidden even after completed levels', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-01', 'lab-02'],
    dailyReportSummary: {
      visible: true,
      label: '今日报告',
      totalText: '今日除锈 0.02%',
      detail: '娱乐指标 · 今日已完成 2 次训练',
      disclaimer: '娱乐数值，不代表医学效果。',
    },
  });

  assert.deepEqual(layout.levelCards, []);
  assert.deepEqual(layout.derustSummary, { visible: false });
});

test('brain greenhouse layout keeps hero and controls inside common portrait viewports', () => {
  [
    [430, 932],
    [390, 844],
    [375, 667],
  ].forEach(([width, height]) => {
    const layout = createMenuLayout(width, height, levels, {
      hasActiveRun: true,
      completedLevelIds: ['lab-01'],
    });

    assert.ok(layout.title.y >= 0);
    assert.ok(layout.heroOrb.y + layout.heroOrb.size < layout.continueButton.y);
    assert.ok(layout.primaryButton.y + layout.primaryButton.height <= height - layout.margin);
    assert.ok(layout.continueButton.y + layout.continueButton.height < layout.primaryButton.y);
  });
});
```

- [ ] **Step 2: Remove or rewrite obsolete report assertions**

Delete or rewrite tests whose expected behavior is now wrong:

```js
test('includes visible derust summary when completed levels exist', ...);
test('createMenuLayout uses provided daily report summary before cumulative fallback', ...);
test('hides derust summary when no completed levels exist', ...);
test('completed levels are summarized without rendering completed level cards', ...);
test('derust summary does not push a hidden level list into the first screen', ...);
```

Keep the hit-test, safe-area, hidden level-card, and button overlap tests.

- [ ] **Step 3: Run the menu tests to verify red**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: FAIL because `heroSubtitle`, `heroOrb`, `ambientParticles`, and hidden `derustSummary` behavior are not implemented.

---

### Task 2: Implement Brain Greenhouse Menu Layout

**Files:**
- Modify: `minigame/src/menu.js`

- [ ] **Step 1: Remove report dependency from menu layout**

Remove:

```js
const { createDerustSummary } = require('./derust');
```

Inside `createMenuLayout`, stop reading `completedLevelIds` and `dailyReportSummary` for homepage rendering:

```js
const {
  hasActiveRun = false,
  topInset = 0,
} = progressSummary;
```

- [ ] **Step 2: Add deterministic visual constants**

Add near the top of `minigame/src/menu.js`:

```js
const HERO_ORB_CELLS = Object.freeze([
  '#17312b',
  '#f6cf75',
  '#fffaf0',
  '#fffaf0',
  '#16a3a0',
  '#17312b',
  '#f6cf75',
  '#fffaf0',
  '#16a3a0',
]);

const AMBIENT_PARTICLES = Object.freeze([
  { xRatio: 0.16, yRatio: 0.35, radius: 30, color: 'rgba(22, 163, 160, 0.18)' },
  { xRatio: 0.78, yRatio: 0.23, radius: 42, color: 'rgba(255, 200, 97, 0.24)' },
  { xRatio: 0.72, yRatio: 0.58, radius: 24, color: 'rgba(22, 163, 160, 0.12)' },
  { xRatio: 0.26, yRatio: 0.68, radius: 18, color: 'rgba(255, 255, 255, 0.42)' },
]);
```

- [ ] **Step 3: Reposition title, hero, and buttons**

Use a poster layout that works on short screens:

```js
const topY = Math.max(compact ? 42 : 72, normalizeTopInset(topInset, height));
const titleY = topY;
const heroSize = Math.min(width - margin * 3.2, compact ? 176 : 218);
const heroY = titleY + (compact ? 118 : 148);
const buttonHeight = compact ? 54 : 62;
const secondaryButtonGap = hasActiveRun ? 10 : 0;
const primaryButtonY = height - margin - buttonHeight;
const continueButtonY = hasActiveRun
  ? primaryButtonY - secondaryButtonGap - buttonHeight
  : null;
```

If the computed hero overlaps the continue button on short screens, clamp it:

```js
const bottomButtonY = hasActiveRun ? continueButtonY : primaryButtonY;
const safeHeroY = Math.min(heroY, bottomButtonY - heroSize - (compact ? 22 : 34));
```

- [ ] **Step 4: Return the new homepage layout fields**

Return these fields from `createMenuLayout`:

```js
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
  heroSubtitle: '每天打开一局，给大脑做一次轻量热身。',
  heroOrb: {
    x: (width - heroSize) / 2,
    y: safeHeroY,
    size: heroSize,
    cells: HERO_ORB_CELLS.map((color) => ({ color })),
  },
  ambientParticles: AMBIENT_PARTICLES.map((particle) => ({
    x: width * particle.xRatio,
    y: height * particle.yRatio,
    radius: particle.radius,
    color: particle.color,
  })),
  primaryButton,
  continueButton,
  derustSummary: { visible: false },
  levelCards: [],
};
```

Make sure `continueButton.y` uses `continueButtonY` and `primaryButton.y` uses `primaryButtonY`.

- [ ] **Step 5: Run menu tests**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: PASS.

---

### Task 3: Update Renderer Tests

**Files:**
- Modify: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Add tests for the brain greenhouse homepage**

Add or update renderer tests:

```js
test('renderer draws brain greenhouse homepage without report copy', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-01', 'lab-02'],
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /数独实验室/);
  assert.match(text, /每天打开一局，给大脑做一次轻量热身。/);
  assert.match(text, /开始实验/);
  assert.equal(/今日报告|今日除锈|累计除锈|今日第一局/.test(text), false);
});

test('renderer draws the nine-cell greenhouse orb', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels);

  renderMenu(ctx, menuLayout);

  const tealFills = ctx.calls.filter(
    (call) => call.name === 'set:fillStyle' && call.args.includes('#16a3a0'),
  );
  const amberFills = ctx.calls.filter(
    (call) => call.name === 'set:fillStyle' && call.args.includes('#f6cf75'),
  );

  assert.ok(tealFills.length >= 1);
  assert.ok(amberFills.length >= 1);
});
```

- [ ] **Step 2: Remove obsolete report renderer tests**

Remove or rewrite these old expectations:

```js
test('renderer draws menu derust summary without completed card labels', ...);
test('renderer draws menu daily report summary copy', ...);
test('renderer defaults incomplete visible menu derust summary fields', ...);
test('renderer does not draw hidden menu derust summary', ...);
```

Keep tests that ensure menu rendering does not throw, state is restored, level cards are hidden, and buttons draw.

- [ ] **Step 3: Run renderer tests to verify red**

Run:

```bash
node --test minigame/test/renderer.test.cjs
```

Expected: FAIL because `renderMenu` does not draw the subtitle/orb yet and still contains report drawing code.

---

### Task 4: Implement Brain Greenhouse Renderer

**Files:**
- Modify: `minigame/src/renderer.js`

- [ ] **Step 1: Remove homepage report drawing from renderMenu**

Change:

```js
drawMenuBackground(ctx, layout);
drawMenuHero(ctx, layout);
drawMenuActions(ctx, layout);
drawDerustSummary(ctx, layout);
```

to:

```js
drawMenuBackground(ctx, layout);
drawMenuAmbientParticles(ctx, layout);
drawMenuHero(ctx, layout);
drawMenuHeroOrb(ctx, layout);
drawMenuActions(ctx, layout);
```

Do not call `drawDerustSummary` from `renderMenu`.

- [ ] **Step 2: Update menu background**

Use a warmer greenhouse background:

```js
function drawMenuBackground(ctx, layout) {
  const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height);
  gradient.addColorStop(0, '#dce9e4');
  gradient.addColorStop(0.48, '#fff4d7');
  gradient.addColorStop(1, '#d5e6df');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);

  roundRect(
    ctx,
    layout.margin / 2,
    8,
    layout.width - layout.margin,
    layout.height - 16,
    34,
    'rgba(255, 255, 255, 0.36)',
  );
}
```

- [ ] **Step 3: Draw ambient particles**

Add:

```js
function drawMenuAmbientParticles(ctx, layout) {
  const particles = Array.isArray(layout.ambientParticles) ? layout.ambientParticles : [];

  particles.forEach((particle) => {
    ctx.beginPath();
    ctx.fillStyle = particle.color || 'rgba(22, 163, 160, 0.12)';
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}
```

- [ ] **Step 4: Draw title and subtitle**

Update `drawMenuHero`:

```js
function drawMenuHero(ctx, layout) {
  ctx.fillStyle = '#18211f';
  ctx.font = layout.compact ? '900 31px sans-serif' : '900 36px sans-serif';
  ctx.fillText(layout.title.subtitle, layout.title.x, layout.title.y);

  ctx.fillStyle = 'rgba(24, 33, 31, 0.58)';
  ctx.font = '800 13px sans-serif';
  ctx.fillText(layout.title.text, layout.title.x, layout.title.y + 28);

  if (layout.heroSubtitle) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.68)';
    ctx.font = layout.compact ? '800 13px sans-serif' : '800 14px sans-serif';
    ctx.fillText(layout.heroSubtitle, layout.title.x, layout.title.y + (layout.compact ? 58 : 64));
  }
}
```

- [ ] **Step 5: Draw the 3×3 greenhouse orb**

Add:

```js
function drawMenuHeroOrb(ctx, layout) {
  const orb = layout.heroOrb;

  if (!orb || !Array.isArray(orb.cells)) {
    return;
  }

  roundRect(ctx, orb.x, orb.y, orb.size, orb.size, orb.size / 2, 'rgba(255, 255, 255, 0.42)');

  ctx.strokeStyle = 'rgba(24, 33, 31, 0.08)';
  ctx.lineWidth = 1.5;
  roundedPath(ctx, orb.x + 1, orb.y + 1, orb.size - 2, orb.size - 2, orb.size / 2);
  ctx.stroke();

  const padding = orb.size * 0.16;
  const gap = orb.size * 0.045;
  const cellSize = (orb.size - padding * 2 - gap * 2) / 3;

  orb.cells.slice(0, 9).forEach((cell, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = orb.x + padding + col * (cellSize + gap);
    const y = orb.y + padding + row * (cellSize + gap);

    roundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.24, cell.color || '#fffaf0');
  });

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(22, 163, 160, 0.24)';
  ctx.lineWidth = 3;
  ctx.arc(orb.x + orb.size * 0.5, orb.y + orb.size * 0.5, orb.size * 0.54, 0.18, Math.PI * 1.46);
  ctx.stroke();
}
```

- [ ] **Step 6: Make menu buttons fit the new poster layout**

Keep `drawMenuButton` unchanged unless tests show visual weight issues. It already draws one or two buttons with clear tap targets.

- [ ] **Step 7: Run renderer tests**

Run:

```bash
node --test minigame/test/renderer.test.cjs
```

Expected: PASS.

---

### Task 5: Runtime and Snapshot Cleanup

**Files:**
- Modify: `minigame/game.js`
- Modify: `minigame/tools/render-snapshots.js`
- Modify: `minigame/test/game-runtime.test.cjs`
- Modify: `minigame/test/visual-snapshots.test.cjs`
- Modify: `minigame/README.md`

- [ ] **Step 1: Remove daily report summary from homepage layout input**

In `minigame/game.js`, remove `createDailyReportSummary` from the `require('./src/derust')` destructuring.

Change `refreshMenuLayout` from:

```js
menuLayout = createMenuLayout(layout.width, layout.height, levels, {
  hasActiveRun: Boolean(savedProgress && savedProgress.activeRun && !savedProgress.activeRun.completed),
  completedLevelIds,
  dailyReportSummary: createDailyReportSummary(
    savedProgress && savedProgress.dailyReport,
    getTodayKey(),
    completedLevelIds,
  ),
  topInset,
});
```

to:

```js
menuLayout = createMenuLayout(layout.width, layout.height, levels, {
  hasActiveRun: Boolean(savedProgress && savedProgress.activeRun && !savedProgress.activeRun.completed),
  completedLevelIds,
  topInset,
});
```

- [ ] **Step 2: Add runtime assertion that menu no longer renders report copy**

In `minigame/test/game-runtime.test.cjs`, add:

```js
test('runtime homepage hides daily report copy', () => {
  const runtime = bootGameRuntime('develop');

  try {
    assert.equal(/今日报告|今日除锈|累计除锈|今日第一局/.test(runtime.drawnText()), false);
    assert.match(runtime.drawnText(), /数独实验室/);
  } finally {
    runtime.restore();
  }
});
```

- [ ] **Step 3: Update visual snapshot input**

In `minigame/tools/render-snapshots.js`, change the menu layout setup to:

```js
const menuLayout = createMenuLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, levels, {
  hasActiveRun: true,
  completedLevelIds: ['lab-01'],
  topInset: SNAPSHOT_TOP_INSET,
});
```

Do not pass `dailyReportSummary`.

- [ ] **Step 4: Update visual snapshot expectations**

In `minigame/test/visual-snapshots.test.cjs`, assert the menu snapshot contains the greenhouse subtitle and does not contain report copy:

```js
assert.match(snapshots.menu, /数独实验室/);
assert.match(snapshots.menu, /每天打开一局/);
assert.doesNotMatch(snapshots.menu, /今日报告|今日除锈|累计除锈|今日第一局/);
```

- [ ] **Step 5: Update README snapshot description**

Change the menu snapshot bullet in `minigame/README.md` from progress/report wording to:

```md
- `menu.svg`: brain greenhouse home screen with title, hero orb, and start/continue actions.
```

- [ ] **Step 6: Run targeted runtime and snapshot tests**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs minigame/test/visual-snapshots.test.cjs
```

Expected: PASS.

---

### Task 6: Full Verification and Preview

**Files:**
- Generated: `minigame/artifacts/visual/menu.svg`
- Generated: `minigame/artifacts/visual/gameplayDebug.svg`
- Generated: `minigame/artifacts/visual/victory.svg`

- [ ] **Step 1: Run full test suite**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: all tests pass.

- [ ] **Step 2: Refresh visual snapshots**

Run:

```bash
node minigame/tools/render-snapshots.js
```

Expected output includes:

```text
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/menu.svg
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/gameplayDebug.svg
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/victory.svg
```

- [ ] **Step 3: Scan for removed homepage report copy in rendered menu snapshot**

Run:

```bash
rg -n "今日报告|今日除锈|累计除锈|今日第一局" minigame/artifacts/visual/menu.svg
```

Expected: no matches.

- [ ] **Step 4: Confirm brain greenhouse copy is present**

Run:

```bash
rg -n "数独实验室|每天打开一局|开始实验|继续实验" minigame/artifacts/visual/menu.svg
```

Expected: matches for title/subtitle/actions.

- [ ] **Step 5: Generate WeChat preview**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /private/tmp/lab-lines-sudoku-homepage-greenhouse-preview.png --info-output /private/tmp/lab-lines-sudoku-homepage-greenhouse-preview.json
```

Expected: `✔ preview` and package size output.

---

## Plan Self-Review

- Spec coverage: 移除首页今日报告由 Task 1、2、3、4、5 覆盖；脑力温室主视觉由 Task 1、2、3、4 覆盖；不做背景音乐由 Scope Boundary 覆盖；快照和预览由 Task 6 覆盖。
- Placeholder scan: 没有 `TBD`、`TODO` 或未定义的实现步骤；每个代码变更步骤包含目标代码或明确删除内容。
- Type consistency: `heroSubtitle`、`heroOrb`、`ambientParticles`、`derustSummary` 字段在测试、布局和 renderer 中名称一致。
- Repo note: 当前工作目录不是 git 仓库，因此本计划不包含 commit 步骤。
