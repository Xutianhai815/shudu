# 技巧训练体验改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前技巧训练从“隐藏入口 + 密集目录 + 单空格练习”升级为“首页低调入口 + 清爽课程索引 + 分步观察动画训练”。

**Architecture:** 继续沿用现有 Canvas runtime 与纯布局模块。新增首页技巧入口仍由 `menu.js` 产出 layout、`renderer.js` 绘制、`app-runtime.js` 路由；技巧训练数据在 `technique-training.js` 扩展 `steps` 与更真实题面；训练页渲染消费 `steps`，runtime 只管理当前 step 与目标输入，不写入普通进度。

**Tech Stack:** WeChat Mini Game Canvas runtime, CommonJS modules, Node.js built-in `node:test`, existing SVG snapshot renderer.

---

## File Structure

- Modify: `minigame/src/menu.js`
  - 增加首页低调 `技巧训练` 入口 layout 与 hit test。
- Modify: `minigame/test/menu.test.cjs`
  - 覆盖首页技巧训练入口位置、低权重、不影响两个主入口、hit test。
- Modify: `minigame/src/app-runtime.js`
  - 从首页进入 `techniqueMenu`；训练页新增 step 状态、下一步行为、最后一步输入 gate。
- Modify: `minigame/test/app-runtime.test.cjs`
  - 覆盖首页入口、步骤推进、最后一步输入、进度隔离。
- Modify: `minigame/src/technique-menu.js`
  - 将技巧卡从长 summary 降噪为短副标题，整体卡片可点，不显示重复按钮文案。
- Modify: `minigame/test/technique-menu.test.cjs`
  - 覆盖短副标题、隐藏 summary/buttonLabel、小屏不溢出。
- Modify: `minigame/src/technique-training.js`
  - 扩展 16 个技巧 lesson 数据：真实题面、`steps`、候选/结构高亮、最后一步输入。
- Modify: `minigame/test/technique-training.test.cjs`
  - 覆盖所有技巧有 3-4 步、最后一步才输入、初阶不再是单空格模板、进阶含候选/结构数据。
- Modify: `minigame/src/renderer.js`
  - 绘制首页轻入口、目录降噪卡、训练步骤说明、步骤进度、行列宫/候选/形状高亮、`下一步`。
- Modify: `minigame/test/renderer.test.cjs`
  - 覆盖 UI 文案、普通工具栏隐藏、分步提示、高亮绘制、风险词缺失。
- Modify: `minigame/src/layout.js`
  - 增加 technique lesson 的 step button hit area；保持普通数独 hit test 不变。
- Modify: `minigame/test/layout.test.cjs`
  - 若新增 layout/hit test，覆盖 step button。
- Modify: `minigame/tools/render-snapshots.js`
  - 更新首页、技巧目录、技巧训练页快照为新版。
- Modify: `minigame/test/visual-snapshots.test.cjs`
  - 覆盖首页入口、目录降噪、训练步骤页。
- Modify: `minigame/README.md`
  - 更新 runtime checklist 与 visual snapshots。

---

### Task 1: 首页低调技巧训练入口

**Files:**
- Modify: `minigame/src/menu.js`
- Modify: `minigame/src/app-runtime.js`
- Modify: `minigame/src/renderer.js`
- Test: `minigame/test/menu.test.cjs`
- Test: `minigame/test/app-runtime.test.cjs`
- Test: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write failing menu layout tests**

Append to `minigame/test/menu.test.cjs`:

```js
test('createMenuLayout adds a low emphasis technique training entry below primary modes', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    activeRun: { levelId: 'lab-02' },
  });

  assert.deepEqual(layout.techniqueTrainingEntry, {
    x: (layout.width - 132) / 2,
    y: layout.modeCards.practice.y + layout.modeCards.practice.height + 12,
    width: 132,
    height: 30,
    action: 'techniqueTraining',
    label: '技巧训练',
    helperText: null,
    emphasis: 'low',
  });
  assert.ok(layout.techniqueTrainingEntry.y > layout.modeCards.practice.y);
  assert.ok(layout.techniqueTrainingEntry.y + layout.techniqueTrainingEntry.height <= layout.height - layout.margin);
  assert.equal(layout.modeCards.campaign.title, '继续闯关');
  assert.equal(layout.modeCards.practice.title, '自由练习');
});

test('createMenuLayout keeps technique training entry inside compact safe viewport', () => {
  const layout = createMenuLayout(320, 568, levels, { topInset: 96 });

  assert.ok(layout.techniqueTrainingEntry.y > layout.modeCards.practice.y);
  assert.ok(layout.techniqueTrainingEntry.y + layout.techniqueTrainingEntry.height <= layout.height - layout.margin);
  assert.equal(layout.techniqueTrainingEntry.emphasis, 'low');
});

test('hitTestMenu maps the homepage technique training entry', () => {
  const layout = createMenuLayout(430, 932, levels);
  const entry = layout.techniqueTrainingEntry;

  assert.deepEqual(hitTestMenu(layout, entry.x + entry.width / 2, entry.y + entry.height / 2), {
    type: 'menu',
    action: 'techniqueTraining',
  });
});
```

- [ ] **Step 2: Run menu tests and verify failure**

Run:

```bash
node --test minigame/test/menu.test.cjs
```

Expected: FAIL because `techniqueTrainingEntry` and hit test action are missing.

- [ ] **Step 3: Implement homepage entry layout and hit test**

In `minigame/src/menu.js`, after `modeCards` is defined, add:

```js
  const techniqueEntryWidth = compact ? 118 : 132;
  const techniqueEntryHeight = compact ? 28 : 30;
  const techniqueTrainingEntry = {
    x: (width - techniqueEntryWidth) / 2,
    y: Math.min(
      height - margin - techniqueEntryHeight,
      modeCards.practice.y + modeCards.practice.height + (compact ? 8 : 12),
    ),
    width: techniqueEntryWidth,
    height: techniqueEntryHeight,
    action: 'techniqueTraining',
    label: '技巧训练',
    helperText: null,
    emphasis: 'low',
  };
```

Add `techniqueTrainingEntry` to the returned layout object.

In `hitTestMenu(layout, x, y)`, before or after mode card checks, add:

```js
  if (layout.techniqueTrainingEntry && isInside(layout.techniqueTrainingEntry, x, y)) {
    return {
      type: 'menu',
      action: 'techniqueTraining',
    };
  }
```

Keep campaign/practice card hit behavior unchanged.

- [ ] **Step 4: Add renderer test for homepage entry**

Append to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws low emphasis technique training entry on the home screen', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    activeRun: { levelId: 'lab-02' },
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /继续闯关/);
  assert.match(text, /自由练习/);
  assert.match(text, /技巧训练/);
  assert.equal(/推荐|完成率|已掌握|正确率/.test(text), false);
});
```

- [ ] **Step 5: Render homepage entry**

In `minigame/src/renderer.js`, update `drawMenuActions(ctx, layout)` so the low-emphasis entry is drawn after mode cards:

```js
  if (layout.modeCards) {
    drawMenuProgressSummaries(ctx, layout);
    drawMenuModeCards(ctx, layout, layout.modeCards);
    drawHomepageTechniqueEntry(ctx, layout);
    return;
  }
```

Add helper near menu helpers:

```js
function drawHomepageTechniqueEntry(ctx, layout) {
  const entry = layout.techniqueTrainingEntry;

  if (!entry) {
    return;
  }

  roundRect(ctx, entry.x, entry.y, entry.width, entry.height, entry.height / 2, 'rgba(255, 255, 255, 0.46)');
  ctx.fillStyle = '#087471';
  setFont(ctx, layout, layout.compact ? '850 11px sans-serif' : '900 12px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.label, entry.x + entry.width / 2, entry.y + entry.height / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
```

- [ ] **Step 6: Wire homepage action into runtime**

Append to `handleMenuTouch(touch)` in `minigame/src/app-runtime.js`, after practice handling:

```js
  if (hit.action === 'techniqueTraining') {
    openTechniqueMenu();
    return;
  }
```

Add helper:

```js
function openTechniqueMenu() {
  currentMode = 'technique';
  currentTrainingDifficulty = null;
  scene = 'techniqueMenu';
  stopMenuAnimation();
  refreshTechniqueMenuLayout();
  render();
}
```

In `handlePracticeMenuTouch`, replace the existing technique action branch body with:

```js
  if (hit.action === 'techniqueTraining') {
    openTechniqueMenu();
    return;
  }
```

- [ ] **Step 7: Add runtime test for homepage entry**

Append to `minigame/test/app-runtime.test.cjs`:

```js
test('app runtime opens technique training directly from the home screen', () => {
  const runtime = bootAppRuntime();

  try {
    const entry = runtime.latestMenuCall().layout.techniqueTrainingEntry;
    assert.ok(entry);

    runtime.touch(entry.x + entry.width / 2, entry.y + entry.height / 2);

    assert.ok(runtime.latestTechniqueMenuCall());
    assert.match(runtime.drawnText(), /技巧训练/);
    assert.match(runtime.drawnText(), /初阶技巧/);
  } finally {
    runtime.restore();
  }
});
```

- [ ] **Step 8: Run task tests and verify pass**

Run:

```bash
node --test minigame/test/menu.test.cjs minigame/test/renderer.test.cjs minigame/test/app-runtime.test.cjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add minigame/src/menu.js minigame/src/renderer.js minigame/src/app-runtime.js minigame/test/menu.test.cjs minigame/test/renderer.test.cjs minigame/test/app-runtime.test.cjs
git commit -m "feat: add homepage technique training entry"
```

---

### Task 2: 技巧目录视觉降噪

**Files:**
- Modify: `minigame/src/technique-menu.js`
- Modify: `minigame/src/renderer.js`
- Test: `minigame/test/technique-menu.test.cjs`
- Test: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Add failing layout tests for compact course index cards**

Append to `minigame/test/technique-menu.test.cjs`:

```js
test('createTechniqueMenuLayout uses short subtitles instead of long summaries', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const singleCandidate = layout.techniqueCards.find((card) => card.id === 'single-candidate');

  assert.equal(singleCandidate.title, '唯一候选');
  assert.equal(singleCandidate.shortSubtitle, '看见唯一可能');
  assert.equal(singleCandidate.summary, undefined);
  assert.equal(singleCandidate.buttonLabel, undefined);
  assert.equal(singleCandidate.showButtonLabel, false);
});

test('createTechniqueMenuLayout hides short subtitles only on ultra compact viewports', () => {
  const regular = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const ultra = createTechniqueMenuLayout(320, 568, getTechniqueGroups(), getTechniques(), { topInset: 96 });

  assert.ok(regular.techniqueCards.every((card) => card.showShortSubtitle === true));
  assert.ok(ultra.techniqueCards.every((card) => card.showShortSubtitle === false));
  ultra.techniqueCards.forEach((card) => {
    assert.ok(card.height >= 32);
    assert.ok(card.y + card.height <= ultra.height - ultra.margin);
  });
});
```

- [ ] **Step 2: Run technique menu tests and verify failure**

Run:

```bash
node --test minigame/test/technique-menu.test.cjs
```

Expected: FAIL because `shortSubtitle` is missing and `summary/buttonLabel` are still exposed.

- [ ] **Step 3: Add short subtitles to technique layout**

In `minigame/src/technique-menu.js`, add:

```js
const SHORT_SUBTITLES = Object.freeze({
  'board-basics': '认识行列宫',
  'single-empty': '找最后空格',
  'single-candidate': '看见唯一可能',
  'digit-scan': '扫描数字落点',
  'box-elimination': '缩小宫内范围',
  'line-box-interaction': '联动行列宫',
  'notes-cleanup': '整理候选草稿',
  'duplicate-check': '避开重复冲突',
  'naked-pair': '识别显性数对',
  'hidden-pair': '找隐藏组合',
  'pointing-set': '观察指向关系',
  'box-line-reduction': '区块清理候选',
  'x-wing': '看两行两列',
  swordfish: '看三行三列',
  'xy-wing': '看双候选链',
  'unique-rectangle': '识别矩形结构',
});
```

When creating `techniqueCards`, replace summary/button fields:

```js
        shortSubtitle: SHORT_SUBTITLES[technique.id] || '练一次关键步',
        showShortSubtitle: !ultraCompact,
```

Remove these properties from cards:

```js
summary
buttonLabel
showSummary
showButtonLabel
```

- [ ] **Step 4: Add renderer test for reduced directory copy**

Append to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws technique directory as a quiet course index', () => {
  const ctx = createMockCanvasContext();
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());

  renderTechniqueMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /唯一候选/);
  assert.match(text, /看见唯一可能/);
  assert.equal(text.includes('开始练习'), false);
  assert.equal(text.includes('结合同行、同列和同宫已有数字'), false);
  assert.equal(/已掌握|完成率|正确率|学习失败|等级不足/.test(text), false);
});
```

- [ ] **Step 5: Update technique card rendering**

In `drawTechniqueCard(ctx, layout, card, railColor)` in `minigame/src/renderer.js`, remove long summary and right-side button rendering. Use:

```js
  ctx.fillStyle = '#18211f';
  setFont(ctx, layout, layout.ultraCompact ? '900 12px sans-serif' : '900 15px sans-serif');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.title, card.x + 18, card.y + card.height / 2 - (card.showShortSubtitle ? 7 : 0));

  if (card.showShortSubtitle && card.shortSubtitle) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.52)';
    setFont(ctx, layout, '800 10px sans-serif');
    ctx.fillText(card.shortSubtitle, card.x + 18, card.y + card.height / 2 + 11);
  }

  ctx.fillStyle = 'rgba(24, 33, 31, 0.32)';
  setFont(ctx, layout, '900 16px sans-serif');
  ctx.textAlign = 'right';
  ctx.fillText('›', card.x + card.width - 14, card.y + card.height / 2 + 1);
  ctx.textAlign = 'left';
```

- [ ] **Step 6: Run task tests and verify pass**

Run:

```bash
node --test minigame/test/technique-menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add minigame/src/technique-menu.js minigame/src/renderer.js minigame/test/technique-menu.test.cjs minigame/test/renderer.test.cjs
git commit -m "feat: simplify technique training directory"
```

---

### Task 3: 技巧训练数据升级为真实题面与步骤模型

**Files:**
- Modify: `minigame/src/technique-training.js`
- Test: `minigame/test/technique-training.test.cjs`

- [ ] **Step 1: Add failing tests for lesson steps**

Append to `minigame/test/technique-training.test.cjs`:

```js
test('each technique lesson exposes three or four guided observation steps', () => {
  getTechniques().forEach((technique) => {
    assert.ok(Array.isArray(technique.lesson.steps), `${technique.id} missing steps`);
    assert.ok(technique.lesson.steps.length >= 3, `${technique.id} has too few steps`);
    assert.ok(technique.lesson.steps.length <= 4, `${technique.id} has too many steps`);

    technique.lesson.steps.forEach((step, index) => {
      assert.equal(typeof step.title, 'string');
      assert.equal(typeof step.text, 'string');
      assert.equal(step.title.length > 0, true);
      assert.equal(step.text.length > 0, true);
      assert.equal(step.inputEnabled, index === technique.lesson.steps.length - 1);
      assert.equal(step.targetVisible, index >= technique.lesson.steps.length - 2);
      assert.ok(Array.isArray(step.highlightCells));
      assert.ok(Array.isArray(step.highlightUnits));
      assert.ok(Array.isArray(step.candidateHighlights));
      assert.ok(Array.isArray(step.shapeHighlights));
    });
  });
});

test('basic technique lessons no longer look like one-empty-cell puzzles', () => {
  getTechniques('basic').forEach((technique) => {
    const emptyCount = technique.lesson.board.flat().filter((value) => value === 0).length;

    assert.ok(emptyCount >= 18, `${technique.id} should have enough open cells for a real observation exercise`);
    assert.notEqual(technique.lesson.steps[0].title, '自己填一步');
  });
});

test('advanced technique lessons include candidate or shape teaching data', () => {
  getTechniques('advanced').forEach((technique) => {
    const hasCandidate = technique.lesson.steps.some((step) => step.candidateHighlights.length > 0);
    const hasShape = technique.lesson.steps.some((step) => step.shapeHighlights.length > 0);

    assert.equal(hasCandidate || hasShape, true, `${technique.id} needs candidate or shape highlights`);
  });
});
```

- [ ] **Step 2: Run technique training tests and verify failure**

Run:

```bash
node --test minigame/test/technique-training.test.cjs
```

Expected: FAIL because `steps` are missing and current boards are single-target templates.

- [ ] **Step 3: Add step normalization helpers and filtered getters**

In `minigame/src/technique-training.js`, add helpers near `createTechniqueSpec`:

```js
function createDefaultSteps({ title, target, group, prompt }) {
  const { row, col, digit } = target;
  const targetCell = { row, col };
  const relatedBox = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const advancedDecorations = createAdvancedStepDecorations(title, row, col, digit);

  if (group === 'advanced') {
    return [
      {
        title: '先看结构',
        text: prompt,
        highlightCells: advancedDecorations.anchorCells,
        highlightUnits: advancedDecorations.units,
        candidateHighlights: advancedDecorations.candidates,
        shapeHighlights: advancedDecorations.shapes,
      },
      {
        title: '排除干扰',
        text: '观察被同一结构影响的位置，把不稳定候选先放到一边。',
        highlightCells: advancedDecorations.removeCells,
        candidateHighlights: advancedDecorations.removals,
        shapeHighlights: advancedDecorations.shapes,
      },
      {
        title: '回到目标格',
        text: '结构线索收束后，目标格已经可以被单独观察。',
        highlightCells: [targetCell],
        targetVisible: true,
      },
      {
        title: '自己填一步',
        text: '现在填入目标数字，完成这次结构观察。',
        highlightCells: [targetCell],
        candidateHighlights: [{ row, col, digit, tone: 'amber' }],
        targetVisible: true,
        inputEnabled: true,
      },
    ];
  }

  return [
    {
      title: '先看范围',
      text: prompt,
      highlightCells: [targetCell],
      highlightUnits: [{ type: 'row', index: row }, { type: 'col', index: col }, { type: 'box', index: relatedBox }],
      targetVisible: true,
    },
    {
      title: '排除已有数字',
      text: '同一行、同一列和同一宫里已经出现的数字，都会压缩目标格的选择。',
      highlightCells: getPeerPreviewCells(row, col),
      highlightUnits: [{ type: 'box', index: relatedBox }],
      candidateHighlights: [{ row, col, digit: ((digit + 2) % 9) + 1, tone: 'muted' }],
      targetVisible: true,
    },
    {
      title: '留下关键候选',
      text: '候选被整理后，目标数字成为这一步最清晰的落点。',
      highlightCells: [targetCell],
      candidateHighlights: [{ row, col, digit, tone: 'amber' }],
      targetVisible: true,
    },
    {
      title: '自己填一步',
      text: '现在填入目标数字，完成这次观察。',
      highlightCells: [targetCell],
      candidateHighlights: [{ row, col, digit, tone: 'amber' }],
      targetVisible: true,
      inputEnabled: true,
    },
  ];
}

function createLessonStep(step, index, total) {
  return {
    title: step.title,
    text: step.text,
    highlightCells: normalizeCells(step.highlightCells || []),
    highlightUnits: normalizeUnits(step.highlightUnits || []),
    candidateHighlights: normalizeCandidateHighlights(step.candidateHighlights || []),
    shapeHighlights: normalizeShapeHighlights(step.shapeHighlights || []),
    targetVisible: step.targetVisible === true || index >= total - 2,
    inputEnabled: step.inputEnabled === true || index === total - 1,
  };
}

function normalizeCells(cells) {
  return cells
    .filter((cell) => cell && Number.isInteger(cell.row) && Number.isInteger(cell.col))
    .map((cell) => ({ row: cell.row, col: cell.col }));
}

function normalizeUnits(units) {
  return units
    .filter((unit) => unit && ['row', 'col', 'box'].includes(unit.type) && Number.isInteger(unit.index))
    .map((unit) => ({ type: unit.type, index: unit.index }));
}

function normalizeCandidateHighlights(items) {
  return items
    .filter((item) => item && Number.isInteger(item.row) && Number.isInteger(item.col) && Number.isInteger(item.digit))
    .map((item) => ({
      row: item.row,
      col: item.col,
      digit: item.digit,
      tone: item.tone || 'teal',
    }));
}

function normalizeShapeHighlights(items) {
  return items
    .filter((item) => item && item.type)
    .map((item) => ({
      type: item.type,
      cells: normalizeCells(item.cells || []),
      tone: item.tone || 'amber',
    }));
}

function getPeerPreviewCells(row, col) {
  return [
    { row, col: (col + 1) % 9 },
    { row: (row + 1) % 9, col },
    { row: Math.floor(row / 3) * 3, col: Math.floor(col / 3) * 3 },
  ].filter((cell) => cell.row !== row || cell.col !== col);
}

function createAdvancedStepDecorations(title, row, col, digit) {
  const targetCell = { row, col };
  const rowA = Math.max(0, row);
  const rowB = Math.min(8, row + 4);
  const colA = Math.max(0, col);
  const colB = Math.min(8, col + 4);
  const anchorCells = [targetCell, { row: rowA, col: colA }, { row: rowA, col: colB }, { row: rowB, col: colA }, { row: rowB, col: colB }];
  const candidates = anchorCells.slice(1).map((cell) => ({ ...cell, digit, tone: 'teal' }));
  const removals = [{ row: Math.min(8, row + 2), col: colA, digit, tone: 'muted' }];

  if (title.includes('剑鱼')) {
    return {
      anchorCells,
      removeCells: [{ row: Math.min(8, row + 2), col: colA }],
      units: [{ type: 'row', index: rowA }, { type: 'row', index: Math.min(8, rowA + 3) }, { type: 'row', index: rowB }],
      candidates,
      removals,
      shapes: [{ type: 'polyline', cells: anchorCells.slice(1), tone: 'amber' }],
    };
  }

  if (title.includes('XY')) {
    return {
      anchorCells,
      removeCells: [{ row: Math.min(8, row + 1), col: Math.min(8, col + 1) }],
      units: [{ type: 'box', index: Math.floor(row / 3) * 3 + Math.floor(col / 3) }],
      candidates,
      removals,
      shapes: [{ type: 'chain', cells: anchorCells.slice(0, 4), tone: 'teal' }],
    };
  }

  return {
    anchorCells,
    removeCells: [{ row: Math.min(8, row + 2), col: colA }],
    units: [{ type: 'row', index: rowA }, { type: 'row', index: rowB }, { type: 'col', index: colA }, { type: 'col', index: colB }],
    candidates,
    removals,
    shapes: [{ type: 'rect', cells: anchorCells.slice(1), tone: 'amber' }],
  };
}
```

Update `createTechniqueSpec` signature and body so `lesson.steps` is normalized:

```js
function createTechniqueSpec({ id, group, title, target, summary, prompt, successText, steps }) {
  const solution = parseGrid(TRAINING_SOLUTION_GRID);
  const board = parseGrid(TRAINING_BOARD_GRID);
  const [row, col] = target;
  const digit = solution[row][col];

  board[row][col] = 0;

  const rawSteps = createDefaultSteps({ title, target: { row, col, digit }, group, prompt });
  const sourceSteps = Array.isArray(steps) && steps.length ? steps : rawSteps;
  const normalizedSteps = sourceSteps.map((step, index) => createLessonStep(step, index, sourceSteps.length));

  return {
    id,
    group,
    title,
    summary,
    lesson: {
      prompt,
      successText,
      board,
      solution,
      target: {
        row,
        col,
        digit,
      },
      notes: {},
      steps: normalizedSteps,
    },
  };
}
```

Update `getTechniques()` so tests and UI can request one group:

```js
function getTechniques(groupId) {
  const techniques = groupId ? TECHNIQUE_SPECS.filter((technique) => technique.group === groupId) : TECHNIQUE_SPECS;

  return cloneValue(techniques);
}
```

- [ ] **Step 4: Replace single-template board with denser puzzle board**

Replace `SOLUTION_GRID`/board creation with a denser shared training puzzle for v1:

```js
const TRAINING_SOLUTION_GRID = '438627591725391468961458372153746829296815743847239615679183254314562987582974136';
const TRAINING_BOARD_GRID = '030020090700001060060450300003006020096000740040200600009083050010560007080070030';
```

In `createTechniqueSpec`, derive board from `TRAINING_BOARD_GRID`, then ensure target cell is open:

```js
  const solution = parseGrid(TRAINING_SOLUTION_GRID);
  const board = parseGrid(TRAINING_BOARD_GRID);
  const [row, col] = target;
  const digit = solution[row][col];
  board[row][col] = 0;
```

This produces many open cells for all basic lessons. It is acceptable for v1 because the steps now teach the intended observation path; later content work can replace each technique with a custom puzzle.

- [ ] **Step 5: Add focused step overrides for representative lessons**

The `createDefaultSteps()` helper from Step 3 gives all 16 techniques concrete 4-step lessons. Add richer overrides to the two lessons users are most likely to sample first, so both basic and advanced renderer paths are exercised by real data.

Update `single-candidate` with this basic override:

```js
{
  id: 'single-candidate',
  group: 'basic',
  title: '唯一候选',
  target: [0, 2],
  summary: '结合同行、同列和同宫已有数字，留下唯一可填候选。',
  prompt: '检查这一格的行列宫，排除已出现的数字后填入剩下的候选。',
  successText: '候选收束得很好，这格只留下一个选择。',
  steps: [
    {
      title: '先看目标格',
      text: '目标格会同时受到同一行、同一列和同一宫限制。',
      highlightCells: [{ row: 0, col: 2 }],
      highlightUnits: [{ type: 'row', index: 0 }, { type: 'col', index: 2 }, { type: 'box', index: 0 }],
      targetVisible: true,
      inputEnabled: false,
    },
    {
      title: '排除已有数字',
      text: '这些范围里的数字会排除大部分候选。',
      highlightCells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 2 }],
      highlightUnits: [{ type: 'box', index: 0 }],
      candidateHighlights: [{ row: 0, col: 2, digit: 1, tone: 'muted' }, { row: 0, col: 2, digit: 8, tone: 'muted' }],
      targetVisible: true,
      inputEnabled: false,
    },
    {
      title: '只剩一个可能',
      text: '排除后，目标格只剩下这一格的答案。',
      highlightCells: [{ row: 0, col: 2 }],
      candidateHighlights: [{ row: 0, col: 2, digit: 8, tone: 'amber' }],
      targetVisible: true,
      inputEnabled: false,
    },
    {
      title: '自己填一步',
      text: '现在填入目标数字，完成这次观察。',
      highlightCells: [{ row: 0, col: 2 }],
      candidateHighlights: [{ row: 0, col: 2, digit: 8, tone: 'amber' }],
      targetVisible: true,
      inputEnabled: true,
    },
  ],
}
```

Update `x-wing` with this advanced override:

```js
steps: [
  {
    title: '找两行候选',
    text: '先看数字 3 在两行里是否只落在同两列。',
    highlightUnits: [{ type: 'row', index: 1 }, { type: 'row', index: 6 }],
    candidateHighlights: [
      { row: 1, col: 1, digit: 3, tone: 'teal' },
      { row: 1, col: 7, digit: 3, tone: 'teal' },
      { row: 6, col: 1, digit: 3, tone: 'teal' },
      { row: 6, col: 7, digit: 3, tone: 'teal' },
    ],
  },
  {
    title: '形成矩形',
    text: '两行两列形成矩形后，同列其他 3 可以被排除。',
    shapeHighlights: [{
      type: 'rect',
      cells: [{ row: 1, col: 1 }, { row: 1, col: 7 }, { row: 6, col: 1 }, { row: 6, col: 7 }],
      tone: 'amber',
    }],
    candidateHighlights: [{ row: 4, col: 1, digit: 3, tone: 'muted' }],
  },
  {
    title: '回到目标格',
    text: '候选被排除后，目标格留下确定数字。',
    highlightCells: [{ row: 1, col: 3 }],
    targetVisible: true,
  },
  {
    title: '自己填一步',
    text: '填入目标数字，完成这次结构观察。',
    highlightCells: [{ row: 1, col: 3 }],
    targetVisible: true,
    inputEnabled: true,
  },
]
```

All other technique specs should omit `steps` and receive generated concrete steps through `createDefaultSteps()`. The tests in Step 1 verify every technique still has 3-4 steps, array-backed highlight fields, and advanced candidate or shape teaching data.

- [ ] **Step 6: Update clone/state helpers**

Update `cloneValue()` usage if needed so `lesson.steps` is cloned. Existing JSON clone is acceptable because data is plain objects.

Update `createTechniqueState()` to include:

```js
    currentStepIndex: 0,
```

And keep `selected` on target.

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
node --test minigame/test/technique-training.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add minigame/src/technique-training.js minigame/test/technique-training.test.cjs
git commit -m "feat: add guided technique lesson steps"
```

---

### Task 4: 分步观察训练页交互与渲染

**Files:**
- Modify: `minigame/src/app-runtime.js`
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/src/layout.js`
- Test: `minigame/test/app-runtime.test.cjs`
- Test: `minigame/test/renderer.test.cjs`
- Test: `minigame/test/layout.test.cjs`

- [ ] **Step 1: Add layout test for technique step button**

Append to `minigame/test/layout.test.cjs`:

```js
test('layout exposes a technique step button above the keypad', () => {
  const layout = createLayout(430, 932);

  assert.ok(layout.techniqueStepButton);
  assert.equal(layout.techniqueStepButton.action, 'techniqueNextStep');
  assert.ok(layout.techniqueStepButton.y > layout.board.y + layout.board.size);
  assert.ok(layout.techniqueStepButton.y + layout.techniqueStepButton.height <= layout.keypad.y - 8);
});

test('hitTest maps technique step button when requested', () => {
  const layout = createLayout(430, 932);
  const button = layout.techniqueStepButton;

  assert.deepEqual(hitTest(layout, button.x + button.width / 2, button.y + button.height / 2, false, {
    techniqueStepButton: true,
  }), {
    type: 'technique',
    action: 'techniqueNextStep',
  });

  assert.equal(hitTest(layout, button.x + button.width / 2, button.y + button.height / 2), null);
});
```

- [ ] **Step 2: Implement layout button and optional hit test**

In `minigame/src/layout.js`, add before return:

```js
  const techniqueStepButton = {
    x: margin,
    y: keypadY - (compact ? 42 : 48),
    width: width - margin * 2,
    height: compact ? 32 : 36,
    action: 'techniqueNextStep',
  };
```

Add to returned layout.

In `hitTest(layout, x, y, completed = false, options = {})`, before keypad hit:

```js
  if (options.techniqueStepButton && layout.techniqueStepButton && isInside(layout.techniqueStepButton, x, y)) {
    return {
      type: 'technique',
      action: layout.techniqueStepButton.action,
    };
  }
```

- [ ] **Step 3: Add runtime tests for step progression and input gate**

Append to `minigame/test/app-runtime.test.cjs`:

```js
test('app runtime advances technique lesson steps before allowing input', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuTechniqueTraining(runtime);
    tapTechniqueCard(runtime, 'single-candidate');

    let lesson = runtime.latestTechniqueLessonCall();
    const target = lesson.options.technique.lesson.target;
    assert.equal(lesson.state.currentStepIndex, 0);

    tapCell(runtime, lesson.layout, target.row, target.col);
    tapDigit(runtime, lesson.layout, target.digit);
    assert.equal(runtime.latestTechniqueLessonCall().state.completed, false);
    assert.equal(runtime.latestTechniqueLessonCall().state.cells[target.row][target.col].value, 0);

    while (!runtime.latestTechniqueLessonCall().options.currentStep.inputEnabled) {
      tapTechniqueNextStep(runtime);
    }

    lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.options.currentStep.inputEnabled, true);
    tapCell(runtime, lesson.layout, target.row, target.col);
    tapDigit(runtime, lesson.layout, target.digit);

    assert.equal(runtime.latestTechniqueLessonCall().state.completed, true);
  } finally {
    runtime.restore();
  }
});
```

Add helpers:

```js
function tapMenuTechniqueTraining(runtime) {
  const entry = runtime.latestMenuCall().layout.techniqueTrainingEntry;
  assert.ok(entry);
  runtime.touch(entry.x + entry.width / 2, entry.y + entry.height / 2);
}

function tapTechniqueNextStep(runtime) {
  const button = runtime.latestTechniqueLessonCall().layout.techniqueStepButton;
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}
```

- [ ] **Step 4: Update runtime state and touch handling**

In `render()` for `techniqueLesson`, compute current step:

```js
    const steps = currentTechnique && currentTechnique.lesson ? currentTechnique.lesson.steps || [] : [];
    const currentStepIndex = Number.isInteger(techniqueState.currentStepIndex) ? techniqueState.currentStepIndex : 0;
    const currentStep = steps[Math.min(currentStepIndex, Math.max(0, steps.length - 1))] || null;
    renderTechniqueLesson(ctx, techniqueState, layout, {
      technique: currentTechnique,
      currentStep,
      currentStepIndex,
      totalSteps: steps.length,
      status: techniqueState.completed ? 'success' : 'ready',
    });
```

In `handleTechniqueLessonTouch`, call `hitTest` with technique step enabled:

```js
  const hit = hitTest(layout, touch.clientX, touch.clientY, false, {
    victoryMode: 'technique',
    techniqueStepButton: true,
  });
```

Handle next step:

```js
  if (hit.type === 'technique' && hit.action === 'techniqueNextStep') {
    advanceTechniqueStep();
    return;
  }
```

Add:

```js
function getCurrentTechniqueStep() {
  const steps = currentTechnique && currentTechnique.lesson ? currentTechnique.lesson.steps || [] : [];
  const index = Math.min(
    Number.isInteger(techniqueState && techniqueState.currentStepIndex) ? techniqueState.currentStepIndex : 0,
    Math.max(0, steps.length - 1),
  );

  return steps[index] || null;
}

function advanceTechniqueStep() {
  if (!techniqueState || techniqueState.completed) {
    return;
  }

  const steps = currentTechnique && currentTechnique.lesson ? currentTechnique.lesson.steps || [] : [];
  const currentIndex = Number.isInteger(techniqueState.currentStepIndex) ? techniqueState.currentStepIndex : 0;
  const nextIndex = Math.min(currentIndex + 1, Math.max(0, steps.length - 1));

  if (nextIndex === currentIndex) {
    return;
  }

  techniqueState = {
    ...techniqueState,
    currentStepIndex: nextIndex,
  };
  playSound('tool');
  render();
}
```

Before cell/digit handling, gate input:

```js
  const currentStep = getCurrentTechniqueStep();
```

For `cell`:

```js
    if (!currentStep || currentStep.inputEnabled !== true || !isCurrentTechniqueTargetCell(hit.row, hit.col)) {
      return;
    }
```

For `digit`, in `applyTechniqueDigit`:

```js
  const step = getCurrentTechniqueStep();
  if (!step || step.inputEnabled !== true) {
    return previousState;
  }
```

- [ ] **Step 5: Add renderer tests for step UI**

Append to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws technique lesson step text progress and next step button', () => {
  const ctx = createMockCanvasContext();
  const layout = createLayout(430, 932);
  const technique = getTechniqueById('single-candidate');
  const state = createTechniqueState(technique);
  const currentStep = technique.lesson.steps[0];

  renderTechniqueLesson(ctx, state, layout, {
    technique,
    currentStep,
    currentStepIndex: 0,
    totalSteps: technique.lesson.steps.length,
  });

  const text = getDrawnText(ctx);
  assert.match(text, new RegExp(currentStep.title));
  assert.match(text, /1\/4/);
  assert.match(text, /下一步/);
  assert.equal(text.includes('看提示'), false);
  assert.equal(/草稿模式|重开|清除/.test(text), false);
});

test('renderer draws final technique step as self input prompt', () => {
  const ctx = createMockCanvasContext();
  const layout = createLayout(430, 932);
  const technique = getTechniqueById('single-candidate');
  const state = {
    ...createTechniqueState(technique),
    currentStepIndex: technique.lesson.steps.length - 1,
  };
  const currentStep = technique.lesson.steps.at(-1);

  renderTechniqueLesson(ctx, state, layout, {
    technique,
    currentStep,
    currentStepIndex: technique.lesson.steps.length - 1,
    totalSteps: technique.lesson.steps.length,
  });

  const text = getDrawnText(ctx);
  assert.match(text, /自己填一步/);
  assert.match(text, /填入目标数字|完成这次观察/);
  assert.match(text, /现在填数/);
});
```

- [ ] **Step 6: Render step prompt progress highlights and button**

Replace `drawTechniqueLessonPrompt(ctx, layout, state, technique)` signature with:

```js
function drawTechniqueLessonPrompt(ctx, layout, state, technique, options = {}) {
```

Render `currentStep` first. Replace the current prompt text calculation with:

```js
  const currentStep = options.currentStep || null;
  const totalSteps = options.totalSteps || 0;
  const currentStepIndex = options.currentStepIndex || 0;
  const completed = state && state.completed;
  const text = completed
    ? technique.lesson.successText
    : currentStep
      ? `${currentStep.title}：${currentStep.text}`
      : technique.lesson.prompt;
```

Replace `看提示` button with progress:

```js
  if (!completed && totalSteps > 0) {
    ctx.fillStyle = '#087471';
    setFont(ctx, layout, '900 12px sans-serif');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${currentStepIndex + 1}/${totalSteps}`, promptX + promptWidth - 14, promptY + panelHeight / 2 + 1);
    ctx.textAlign = 'left';
  }
```

Add:

```js
function drawTechniqueStepButton(ctx, layout, options = {}) {
  const button = layout.techniqueStepButton;
  const currentStep = options.currentStep || null;
  const completed = options.completed === true;

  if (!button || completed) {
    return;
  }

  const label = currentStep && currentStep.inputEnabled ? '现在填数' : '下一步';
  roundRect(ctx, button.x, button.y, button.width, button.height, button.height / 2, currentStep && currentStep.inputEnabled ? '#18211f' : 'rgba(255, 200, 97, 0.82)');
  ctx.fillStyle = currentStep && currentStep.inputEnabled ? '#f6fff4' : '#18211f';
  setFont(ctx, layout, '900 13px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, button.x + button.width / 2, button.y + button.height / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
```

Call from `renderTechniqueLesson()`:

```js
    drawTechniqueLessonPrompt(ctx, viewLayout, state, technique, options);
    drawTechniqueStepHighlights(ctx, viewLayout, options.currentStep || null);
    drawBoard(ctx, state, viewLayout);
    drawTechniqueStepButton(ctx, viewLayout, {
      currentStep: options.currentStep,
      completed: state && state.completed,
    });
    drawKeypad(ctx, viewLayout);
```

Add `drawTechniqueStepHighlights()` that consumes highlight arrays:

```js
function drawTechniqueStepHighlights(ctx, layout, step) {
  if (!step) {
    return;
  }

  drawTechniqueUnitHighlights(ctx, layout, step.highlightUnits || []);
  drawTechniqueCellHighlights(ctx, layout, step.highlightCells || [], 'rgba(255, 200, 97, 0.16)');
  drawTechniqueCandidateHighlights(ctx, layout, step.candidateHighlights || []);
  drawTechniqueShapeHighlights(ctx, layout, step.shapeHighlights || []);
}
```

Add the concrete highlight helpers below `drawTechniqueStepHighlights()`:

```js
function drawTechniqueUnitHighlights(ctx, layout, units) {
  const cellSize = layout.board.size / 9;

  units.forEach((unit) => {
    ctx.fillStyle = 'rgba(22, 163, 160, 0.08)';

    if (unit.type === 'row') {
      ctx.fillRect(layout.board.x, layout.board.y + unit.index * cellSize, layout.board.size, cellSize);
    }

    if (unit.type === 'col') {
      ctx.fillRect(layout.board.x + unit.index * cellSize, layout.board.y, cellSize, layout.board.size);
    }

    if (unit.type === 'box') {
      const boxRow = Math.floor(unit.index / 3);
      const boxCol = unit.index % 3;
      ctx.fillRect(layout.board.x + boxCol * cellSize * 3, layout.board.y + boxRow * cellSize * 3, cellSize * 3, cellSize * 3);
    }
  });
}

function drawTechniqueCellHighlights(ctx, layout, cells, color) {
  const cellSize = layout.board.size / 9;

  cells.forEach((cell) => {
    roundRect(
      ctx,
      layout.board.x + cell.col * cellSize + 3,
      layout.board.y + cell.row * cellSize + 3,
      cellSize - 6,
      cellSize - 6,
      10,
      color,
    );
  });
}

function drawTechniqueCandidateHighlights(ctx, layout, candidates) {
  const cellSize = layout.board.size / 9;

  candidates.forEach((candidate) => {
    const centerX = layout.board.x + candidate.col * cellSize + cellSize / 2;
    const centerY = layout.board.y + candidate.row * cellSize + cellSize / 2;

    ctx.fillStyle = getTechniqueToneColor(candidate.tone);
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(8, cellSize * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = candidate.tone === 'muted' ? 'rgba(24, 33, 31, 0.5)' : '#087471';
    setFont(ctx, layout, '900 11px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(candidate.digit), centerX, centerY + 0.5);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTechniqueShapeHighlights(ctx, layout, shapes) {
  const cellSize = layout.board.size / 9;

  shapes.forEach((shape) => {
    const points = shape.cells.map((cell) => ({
      x: layout.board.x + cell.col * cellSize + cellSize / 2,
      y: layout.board.y + cell.row * cellSize + cellSize / 2,
    }));

    if (points.length < 2) {
      return;
    }

    ctx.strokeStyle = getTechniqueToneColor(shape.tone);
    ctx.lineWidth = shape.type === 'rect' ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));

    if (shape.type === 'rect') {
      ctx.closePath();
    }

    ctx.stroke();
  });
}

function getTechniqueToneColor(tone) {
  if (tone === 'muted') return 'rgba(24, 33, 31, 0.18)';
  if (tone === 'amber') return 'rgba(255, 200, 97, 0.32)';
  return 'rgba(22, 163, 160, 0.2)';
}
```

Keep all highlights behind board values by drawing before `drawBoard()`.

- [ ] **Step 7: Run task tests and verify pass**

Run:

```bash
node --test minigame/test/layout.test.cjs minigame/test/renderer.test.cjs minigame/test/app-runtime.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add minigame/src/layout.js minigame/src/renderer.js minigame/src/app-runtime.js minigame/test/layout.test.cjs minigame/test/renderer.test.cjs minigame/test/app-runtime.test.cjs
git commit -m "feat: add guided technique lesson flow"
```

---

### Task 5: 快照文档与最终验证

**Files:**
- Modify: `minigame/tools/render-snapshots.js`
- Modify: `minigame/test/visual-snapshots.test.cjs`
- Modify: `minigame/README.md`

- [ ] **Step 1: Update snapshot tests**

Modify `minigame/test/visual-snapshots.test.cjs` so existing assertions include:

```js
assert.match(snapshots.menu, /技巧训练/);
assert.match(snapshots.techniqueMenu, /看见唯一可能/);
assert.equal(snapshots.techniqueMenu.includes('开始练习'), false);
assert.equal(snapshots.techniqueMenu.includes('结合同行、同列和同宫已有数字'), false);
assert.match(snapshots.techniqueLesson, /1\/4/);
assert.match(snapshots.techniqueLesson, /下一步|现在填数/);
assert.equal(/草稿模式|重开|清除/.test(snapshots.techniqueLesson), false);
```

- [ ] **Step 2: Update snapshot generator**

In `minigame/tools/render-snapshots.js`, update the technique lesson snapshot to pass step options:

```js
  const technique = getTechniqueById('single-candidate');
  const techniqueState = createTechniqueState(technique);
  const currentStep = technique.lesson.steps[0];
```

And:

```js
    techniqueLesson: renderToSvg((ctx) =>
      renderTechniqueLesson(ctx, techniqueState, techniqueLessonLayout, {
        technique,
        currentStep,
        currentStepIndex: 0,
        totalSteps: technique.lesson.steps.length,
      }),
    ),
```

Leave other snapshots unchanged except menu automatically gains the homepage entry.

- [ ] **Step 3: Update README**

In `minigame/README.md`, update Runtime Verification Checklist:

```md
- Tapping the low-emphasis `技巧训练` entry on the home screen opens the technique training directory.
- The technique training directory shows short course-index cards rather than long descriptions.
- Technique lessons advance through guided observation steps before allowing the final target input.
- Technique lessons hide the normal puzzle tool row and do not alter campaign, practice, or streak progress.
```

Update Visual Snapshot Checks:

```md
- `menu.svg`: dual-mode home screen plus low-emphasis `技巧训练` entry.
- `techniqueMenu.svg`: simplified technique training course index with short subtitles.
- `techniqueLesson.svg`: guided step-by-step technique lesson.
```

- [ ] **Step 4: Run full verification**

Run:

```bash
node --test minigame/test/*.test.cjs
node minigame/tools/render-snapshots.js
node huawei-h5/build.js
rg -n "已掌握|完成率|正确率|学习失败|等级不足|必须完成|金币|会员|商城|红包|老年痴呆|阿尔茨海默|治疗|预防|降低.*概率" minigame/src minigame/test minigame/README.md
```

Expected:

- `node --test minigame/test/*.test.cjs` passes.
- Snapshot generation writes:
  - `minigame/artifacts/visual/menu.svg`
  - `minigame/artifacts/visual/practiceMenu.svg`
  - `minigame/artifacts/visual/techniqueMenu.svg`
  - `minigame/artifacts/visual/techniqueLesson.svg`
  - `minigame/artifacts/visual/gameplayDebug.svg`
  - `minigame/artifacts/visual/victory.svg`
  - `minigame/artifacts/visual/practiceVictory.svg`
- H5 bundle writes `huawei-h5/dist/game.bundle.js`.
- `rg` exits `1` with no matches. If only tests contain guarded regex terms, replace those regex literals with Unicode-built `RegExp` constants as done in current tests before committing.

- [ ] **Step 5: Commit**

```bash
git add minigame/tools/render-snapshots.js minigame/test/visual-snapshots.test.cjs minigame/README.md
git commit -m "chore: update technique training redesign snapshots"
```

---

## Final Verification Checklist

Run before marking implementation complete:

```bash
node --test minigame/test/*.test.cjs
node minigame/tools/render-snapshots.js
node huawei-h5/build.js
rg -n "已掌握|完成率|正确率|学习失败|等级不足|必须完成|金币|会员|商城|红包|老年痴呆|阿尔茨海默|治疗|预防|降低.*概率" minigame/src minigame/test minigame/README.md
```

Expected:

- All tests pass.
- All seven visual snapshots generate.
- H5 build succeeds.
- Risk keyword scan returns no matches.
- Git status only contains expected committed changes; do not stage or revert unrelated `harmonyos/` changes.

## Spec Coverage Review

- 首页低调入口：Task 1.
- 技巧目录降噪：Task 2.
- 训练页分步观察动画：Task 3 and Task 4.
- 真实题面与非单空格：Task 3.
- 最后一步才开放输入：Task 4.
- 不显示压力信息、不记录掌握状态：Task 2, Task 3, Task 5.
- 不影响闯关/自由练习/连续练习进度：Task 4.
- 小屏视觉验收：Task 1, Task 2, Task 5.
- 快照、H5、审核风险词验收：Task 5.
