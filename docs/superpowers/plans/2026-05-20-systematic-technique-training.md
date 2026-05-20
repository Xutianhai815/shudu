# 系统化技巧训练 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在微信小游戏中新增 `技巧训练` 学习系统：从自由练习页进入，展示初阶/进阶 16 个技巧，每个技巧提供 1 个轻量训练单元，并且不记录掌握度、不影响闯关/自由练习/连续练习数据。

**Architecture:** 新增平台无关的技巧定义模块，负责 16 个技巧和轻量训练单元数据；新增技巧目录布局模块，复用现有 Canvas 菜单风格；运行时新增 `techniqueMenu` 和 `techniqueLesson` 两个 scene，技巧训练页复用现有数独盘、数字键盘和输入体验，但完成条件只判断预设目标格与目标数字。渲染器只消费布局和技巧状态，不写业务规则。

**Tech Stack:** WeChat Mini Game Canvas runtime, CommonJS modules, Node.js built-in `node:test`, local storage through existing progress modules.

---

## File Structure

- Create: `minigame/src/technique-training.js`
  - 负责技巧分组、16 个技巧定义、训练单元归一化、根据技巧创建训练状态、判断训练目标是否完成。
- Create: `minigame/src/technique-menu.js`
  - 负责技巧训练目录页布局、技巧卡片、返回按钮、hit test。
- Modify: `minigame/src/practice-menu.js`
  - 在自由练习页增加 `技巧训练` 轻入口，并在 hit test 中返回 `action: 'techniqueTraining'`。
- Modify: `minigame/src/app-runtime.js`
  - 新增 `techniqueMenu`、`techniqueLesson` scene；处理入口、返回、选择技巧、训练输入、训练完成；确保不写入成长/练习/闯关进度。
- Modify: `minigame/src/renderer.js`
  - 新增 `renderTechniqueMenu()` 和 `renderTechniqueLesson()`；复用现有棋盘风格绘制训练盘面、任务提示、提示按钮和完成轻反馈。
- Modify: `minigame/tools/render-snapshots.js`
  - 增加技巧训练目录页和一个技巧训练详情页 SVG 快照。
- Modify: `minigame/README.md`
  - 更新 Runtime Verification Checklist 和 Visual Snapshot Checks。
- Test: `minigame/test/technique-training.test.cjs`
  - 覆盖 16 个技巧、分组、文案安全、训练目标判断。
- Test: `minigame/test/technique-menu.test.cjs`
  - 覆盖目录布局、分组、hit test、无掌握度/进度字段。
- Test: `minigame/test/practice-menu.test.cjs`
  - 覆盖自由练习页的 `技巧训练` 入口。
- Test: `minigame/test/renderer.test.cjs`
  - 覆盖目录和训练页渲染，不出现压力文案。
- Test: `minigame/test/app-runtime.test.cjs`
  - 覆盖从自由练习页进入技巧训练、完成训练不改变进度数据、闯关/自由练习局中不出现技巧学习提示。
- Test: `minigame/test/visual-snapshots.test.cjs`
  - 覆盖新增 SVG 快照文件。

---

### Task 1: 技巧训练静态数据与目标判断

**Files:**
- Create: `minigame/src/technique-training.js`
- Test: `minigame/test/technique-training.test.cjs`

- [ ] **Step 1: Write failing tests for technique definitions**

Create `minigame/test/technique-training.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TECHNIQUE_GROUPS,
  createTechniqueState,
  getTechniqueById,
  getTechniqueGroups,
  getTechniques,
  isTechniqueTargetInput,
  normalizeTechniqueId,
} = require('../src/technique-training');

test('getTechniqueGroups exposes basic and advanced groups without lock or progress fields', () => {
  assert.deepEqual(TECHNIQUE_GROUPS.map((group) => group.id), ['basic', 'advanced']);

  const groups = getTechniqueGroups();
  assert.deepEqual(groups.map((group) => [group.id, group.title]), [
    ['basic', '初阶技巧'],
    ['advanced', '进阶技巧'],
  ]);
  assert.ok(groups.every((group) => group.locked === undefined));
  assert.ok(groups.every((group) => group.progress === undefined));
});

test('getTechniques exposes all sixteen lightweight lessons', () => {
  const techniques = getTechniques();

  assert.deepEqual(
    techniques.map((technique) => [technique.id, technique.group, technique.title]),
    [
      ['board-basics', 'basic', '认识棋盘'],
      ['single-empty', 'basic', '唯一空格'],
      ['single-candidate', 'basic', '唯一候选'],
      ['digit-scan', 'basic', '数字扫描'],
      ['box-elimination', 'basic', '宫内排除'],
      ['line-box-interaction', 'basic', '行列联动'],
      ['notes-cleanup', 'basic', '草稿整理'],
      ['duplicate-check', 'basic', '重复自检'],
      ['naked-pair', 'advanced', '显性数对'],
      ['hidden-pair', 'advanced', '隐性数对'],
      ['pointing-set', 'advanced', '指向数组'],
      ['box-line-reduction', 'advanced', '区块排除'],
      ['x-wing', 'advanced', 'X-Wing'],
      ['swordfish', 'advanced', 'Swordfish / 剑鱼'],
      ['xy-wing', 'advanced', 'XY-Wing'],
      ['unique-rectangle', 'advanced', '唯一矩形'],
    ],
  );

  techniques.forEach((technique) => {
    assert.equal(typeof technique.summary, 'string');
    assert.equal(typeof technique.lesson.prompt, 'string');
    assert.equal(typeof technique.lesson.successText, 'string');
    assert.equal(technique.lesson.board.length, 9);
    assert.equal(technique.lesson.target.row >= 0 && technique.lesson.target.row < 9, true);
    assert.equal(technique.lesson.target.col >= 0 && technique.lesson.target.col < 9, true);
    assert.equal(technique.lesson.target.digit >= 1 && technique.lesson.target.digit <= 9, true);
    assert.equal(technique.mastered, undefined);
    assert.equal(technique.progress, undefined);
    assert.equal(technique.score, undefined);
  });
});

test('technique copy avoids pressure and review-risk wording', () => {
  const unsafe = /已掌握|完成率|正确率|学习失败|等级不足|必须完成|金币|会员|商城|红包|老年痴呆|阿尔茨海默|治疗|预防|降低.*概率/;
  const allText = JSON.stringify(getTechniques());

  assert.equal(unsafe.test(allText), false);
});

test('getTechniqueById and normalizeTechniqueId use safe fallbacks', () => {
  assert.equal(getTechniqueById('x-wing').title, 'X-Wing');
  assert.equal(getTechniqueById('missing'), null);
  assert.equal(normalizeTechniqueId('single-empty'), 'single-empty');
  assert.equal(normalizeTechniqueId('missing'), null);
  assert.equal(normalizeTechniqueId(42), null);
});

test('createTechniqueState builds an isolated lightweight puzzle state', () => {
  const state = createTechniqueState(getTechniqueById('single-empty'));

  assert.equal(state.mode, 'technique');
  assert.equal(state.completed, false);
  assert.equal(state.noteMode, false);
  assert.equal(state.cells.length, 9);
  assert.deepEqual(state.selected, getTechniqueById('single-empty').lesson.target);
  assert.equal(state.level.id, 'technique-single-empty');
  assert.equal(state.level.title, '唯一空格');
});

test('isTechniqueTargetInput only accepts the preset target digit in the preset target cell', () => {
  const technique = getTechniqueById('single-empty');
  const target = technique.lesson.target;

  assert.equal(isTechniqueTargetInput(technique, target.row, target.col, target.digit), true);
  assert.equal(isTechniqueTargetInput(technique, target.row, target.col, target.digit === 9 ? 8 : 9), false);
  assert.equal(isTechniqueTargetInput(technique, target.row, (target.col + 1) % 9, target.digit), false);
  assert.equal(isTechniqueTargetInput(null, target.row, target.col, target.digit), false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test minigame/test/technique-training.test.cjs
```

Expected: FAIL with `Cannot find module '../src/technique-training'`.

- [ ] **Step 3: Implement `technique-training.js`**

Create `minigame/src/technique-training.js`:

```js
const TECHNIQUE_GROUPS = Object.freeze([
  {
    id: 'basic',
    title: '初阶技巧',
    subtitle: '先学会看见线索',
  },
  {
    id: 'advanced',
    title: '进阶技巧',
    subtitle: '给更有兴趣的玩家准备',
  },
]);

const EMPTY_NOTES = Object.freeze({});

const TECHNIQUE_SPECS = Object.freeze([
  basic('board-basics', '认识棋盘', '先认识行、列、宫，知道规则从哪里开始看。', {
    prompt: '看左上角这个 3x3 宫，填出它缺少的数字。',
    successText: '对，行列宫都在限制这个位置。',
    hintText: '先看同一宫里已经出现了哪些数字。',
    target: { row: 0, col: 2, digit: 3 },
    focusCells: boxCells(0, 0),
  }),
  basic('single-empty', '唯一空格', '一行、列或宫只剩一个空格时，缺的数字就只能放在那里。', {
    prompt: '看第 1 行，填出唯一空格。',
    successText: '对，这一行只缺这个数字。',
    hintText: '数一数第 1 行已经有 1、2、3、4、5、6、7、8。',
    target: { row: 0, col: 8, digit: 9 },
    focusCells: rowCells(0),
  }),
  basic('single-candidate', '唯一候选', '当一个格子被同行、同列、同宫限制后，只剩一个可能数字。', {
    prompt: '看高亮格，它只剩一个可能数字。',
    successText: '对，这格的其他数字都被周围排除了。',
    hintText: '同时观察它所在的行、列和宫。',
    target: { row: 4, col: 4, digit: 5 },
    focusCells: peersFor(4, 4),
  }),
  basic('digit-scan', '数字扫描', '围绕一个数字，找它在某个宫里还能放在哪里。', {
    prompt: '扫描数字 7，找出右上宫里 7 的位置。',
    successText: '对，其他位置都被已有的 7 挡住了。',
    hintText: '先看哪些行和列已经有 7。',
    target: { row: 1, col: 7, digit: 7 },
    focusCells: [...boxCells(0, 6), ...rowCells(1), ...colCells(7)],
  }),
  basic('box-elimination', '宫内排除', '用行列限制缩小一个宫里的候选位置。', {
    prompt: '看中间宫，数字 4 还能放在哪里？',
    successText: '对，行列排除后只剩这个位置。',
    hintText: '中间宫里先排除被同行同列挡住的位置。',
    target: { row: 4, col: 3, digit: 4 },
    focusCells: boxCells(3, 3),
  }),
  basic('line-box-interaction', '行列联动', '行列与宫会互相限制，线索常藏在交界处。', {
    prompt: '这一次看第 6 行和右中宫的交界。',
    successText: '对，这就是行列和宫一起给出的线索。',
    hintText: '先看右中宫，再看第 6 行还能放什么。',
    target: { row: 5, col: 8, digit: 2 },
    focusCells: [...rowCells(5), ...boxCells(3, 6)],
  }),
  basic('notes-cleanup', '草稿整理', '候选数变少时，及时清理草稿能让局面更清楚。', {
    prompt: '高亮格的草稿里，哪个数字被排除后只剩正确选择？',
    successText: '对，整理草稿后，这格就清楚了。',
    hintText: '看同列里已经出现的数字。',
    target: { row: 6, col: 1, digit: 8 },
    notes: { '6:1': [2, 5, 8] },
    focusCells: [...colCells(1), { row: 6, col: 1 }],
  }),
  basic('duplicate-check', '重复自检', '重复提醒只告诉你冲突，不直接判断答案对错。', {
    prompt: '看高亮行，选择不会造成重复的数字。',
    successText: '对，这一步避开了同行重复。',
    hintText: '先排除这一行已经有的数字。',
    target: { row: 7, col: 6, digit: 4 },
    focusCells: rowCells(7),
  }),
  advanced('naked-pair', '显性数对', '两个格子只共享同两个候选数时，可以排除同组其他格的这些数字。', {
    prompt: '观察显性数对后，填出被排除后留下的数字。',
    successText: '对，数对占住了两个位置。',
    hintText: '先找到同一行里两个相同候选的格子。',
    target: { row: 2, col: 6, digit: 5 },
    notes: { '2:1': [2, 8], '2:4': [2, 8], '2:6': [2, 5, 8] },
    focusCells: rowCells(2),
  }),
  advanced('hidden-pair', '隐性数对', '两个数字只出现在同两个格子里时，这两个格子可以只保留它们。', {
    prompt: '找到隐性数对后，填出其中一个确定数字。',
    successText: '对，这两个数字被藏在同一对格子里。',
    hintText: '不要只看格子候选，也看数字出现的位置。',
    target: { row: 3, col: 2, digit: 6 },
    notes: { '3:2': [1, 4, 6], '3:5': [1, 4, 6], '3:7': [1, 4] },
    focusCells: rowCells(3),
  }),
  advanced('pointing-set', '指向数组', '宫内某个数字只在同一行或列出现时，会影响外部同线位置。', {
    prompt: '利用指向数组，填出外部被排除后的格子。',
    successText: '对，宫里的候选位置指向了这一行。',
    hintText: '先看左上宫中数字 9 的候选位置。',
    target: { row: 0, col: 5, digit: 9 },
    notes: { '0:0': [9], '0:1': [9], '0:5': [3, 9] },
    focusCells: [...boxCells(0, 0), ...rowCells(0)],
  }),
  advanced('box-line-reduction', '区块排除', '一个区块里的限制可以排除另一个区块里的候选。', {
    prompt: '观察两个相邻宫，填出被区块排除后的数字。',
    successText: '对，区块之间也会互相限制。',
    hintText: '先看第 2 列附近的候选集中在哪里。',
    target: { row: 6, col: 2, digit: 1 },
    notes: { '0:2': [1], '3:2': [1], '6:2': [1, 4] },
    focusCells: colCells(2),
  }),
  advanced('x-wing', 'X-Wing', '两行两列形成候选矩形时，可以排除同列其他候选。', {
    prompt: '观察 X-Wing 矩形，填出被排除后留下的格子。',
    successText: '对，这就是两行两列形成的矩形限制。',
    hintText: '看数字 5 在两行里是否只出现在同两列。',
    target: { row: 4, col: 1, digit: 5 },
    notes: { '1:1': [5], '1:7': [5], '6:1': [5], '6:7': [5], '4:1': [2, 5] },
    focusCells: [...rowCells(1), ...rowCells(6), ...colCells(1), ...colCells(7)],
  }),
  advanced('swordfish', 'Swordfish / 剑鱼', '三行三列形成候选结构时，可以排除同列其他候选。', {
    prompt: '看三行三列的剑鱼形状，填出被排除后的格子。',
    successText: '对，剑鱼是更大的候选结构。',
    hintText: '把它想成 X-Wing 的三行三列版本。',
    target: { row: 5, col: 4, digit: 3 },
    notes: { '0:1': [3], '0:4': [3], '3:1': [3], '3:7': [3], '8:4': [3], '8:7': [3], '5:4': [3, 6] },
    focusCells: [...rowCells(0), ...rowCells(3), ...rowCells(8), ...colCells(1), ...colCells(4), ...colCells(7)],
  }),
  advanced('xy-wing', 'XY-Wing', '三个双候选格形成链条时，可以排除看到两端的候选。', {
    prompt: '观察三个双候选格，填出被链条排除后的数字。',
    successText: '对，XY-Wing 的关键是三个格子的关系。',
    hintText: '先找中间那个同时连接两端的格子。',
    target: { row: 2, col: 2, digit: 4 },
    notes: { '1:1': [2, 4], '1:5': [2, 7], '5:1': [4, 7], '2:2': [4, 7] },
    focusCells: [{ row: 1, col: 1 }, { row: 1, col: 5 }, { row: 5, col: 1 }, { row: 2, col: 2 }],
  }),
  advanced('unique-rectangle', '唯一矩形', '避免形成多解矩形时，可以排除某些候选。', {
    prompt: '观察唯一矩形，填出避免多解后的数字。',
    successText: '对，这一步避免了棋盘出现不唯一的结构。',
    hintText: '看四个角是否几乎只有同一对候选。',
    target: { row: 6, col: 6, digit: 9 },
    notes: { '1:1': [1, 9], '1:6': [1, 9], '6:1': [1, 9], '6:6': [1, 7, 9] },
    focusCells: [{ row: 1, col: 1 }, { row: 1, col: 6 }, { row: 6, col: 1 }, { row: 6, col: 6 }],
  }),
]);

function basic(id, title, summary, lesson) {
  return createTechnique(id, 'basic', '初阶', title, summary, lesson);
}

function advanced(id, title, summary, lesson) {
  return createTechnique(id, 'advanced', '进阶', title, summary, lesson);
}

function createTechnique(id, group, difficultyLabel, title, summary, lesson) {
  return Object.freeze({
    id,
    group,
    title,
    summary,
    difficultyLabel,
    lesson: Object.freeze({
      board: createLessonBoard(lesson.target),
      notes: freezeNotes(lesson.notes || EMPTY_NOTES),
      focusCells: Object.freeze(dedupeCells(lesson.focusCells || [lesson.target])),
      target: Object.freeze({ ...lesson.target }),
      prompt: lesson.prompt,
      successText: lesson.successText,
      hintText: lesson.hintText,
    }),
  });
}

function createLessonBoard(target) {
  const board = [
    [1, 2, 0, 4, 5, 6, 7, 8, 0],
    [4, 5, 6, 1, 2, 3, 0, 0, 9],
    [7, 8, 9, 0, 0, 0, 1, 2, 3],
    [2, 3, 0, 0, 0, 0, 8, 9, 1],
    [5, 6, 7, 0, 0, 0, 2, 3, 4],
    [8, 9, 1, 0, 0, 0, 5, 6, 0],
    [0, 0, 0, 3, 4, 5, 0, 0, 0],
    [3, 4, 5, 6, 7, 8, 0, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
  ];
  board[target.row][target.col] = 0;
  return board.map((row) => Object.freeze([...row]));
}

function freezeNotes(notes) {
  const result = {};
  Object.entries(notes).forEach(([key, values]) => {
    result[key] = Object.freeze([...values]);
  });
  return Object.freeze(result);
}

function rowCells(row) {
  return Array.from({ length: 9 }, (_, col) => ({ row, col }));
}

function colCells(col) {
  return Array.from({ length: 9 }, (_, row) => ({ row, col }));
}

function boxCells(startRow, startCol) {
  const cells = [];
  for (let row = startRow; row < startRow + 3; row += 1) {
    for (let col = startCol; col < startCol + 3; col += 1) {
      cells.push({ row, col });
    }
  }
  return cells;
}

function peersFor(row, col) {
  return dedupeCells([...rowCells(row), ...colCells(col), ...boxCells(Math.floor(row / 3) * 3, Math.floor(col / 3) * 3)]);
}

function dedupeCells(cells) {
  const seen = new Set();
  return cells.filter((cell) => {
    const key = `${cell.row}:${cell.col}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getTechniqueGroups() {
  return TECHNIQUE_GROUPS.map((group) => ({ ...group }));
}

function getTechniques(groupId) {
  const techniques = groupId
    ? TECHNIQUE_SPECS.filter((technique) => technique.group === groupId)
    : TECHNIQUE_SPECS;
  return techniques.map(cloneTechnique);
}

function getTechniqueById(id) {
  const technique = TECHNIQUE_SPECS.find((item) => item.id === id);
  return technique ? cloneTechnique(technique) : null;
}

function normalizeTechniqueId(id) {
  return typeof id === 'string' && TECHNIQUE_SPECS.some((item) => item.id === id) ? id : null;
}

function createTechniqueState(technique) {
  if (!technique || !technique.lesson) {
    return null;
  }

  const lesson = technique.lesson;
  return {
    mode: 'technique',
    level: {
      id: `technique-${technique.id}`,
      title: technique.title,
      label: technique.difficultyLabel,
      difficulty: technique.group,
      rules: ['classic'],
      givens: lesson.board,
      solution: lesson.board.map((row, rowIndex) =>
        row.map((value, colIndex) =>
          rowIndex === lesson.target.row && colIndex === lesson.target.col ? lesson.target.digit : value,
        ),
      ),
      notes: lesson.notes,
    },
    selected: { row: lesson.target.row, col: lesson.target.col },
    noteMode: false,
    completed: false,
    cells: lesson.board.map((row, rowIndex) =>
      row.map((value, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        value,
        fixed: value !== 0,
        notes: [...(lesson.notes[`${rowIndex}:${colIndex}`] || [])],
      })),
    ),
  };
}

function isTechniqueTargetInput(technique, row, col, digit) {
  const target = technique && technique.lesson && technique.lesson.target;
  return Boolean(target && target.row === row && target.col === col && target.digit === digit);
}

function cloneTechnique(technique) {
  return {
    ...technique,
    lesson: {
      ...technique.lesson,
      board: technique.lesson.board.map((row) => [...row]),
      notes: Object.fromEntries(Object.entries(technique.lesson.notes).map(([key, values]) => [key, [...values]])),
      focusCells: technique.lesson.focusCells.map((cell) => ({ ...cell })),
      target: { ...technique.lesson.target },
    },
  };
}

module.exports = {
  TECHNIQUE_GROUPS,
  createTechniqueState,
  getTechniqueById,
  getTechniqueGroups,
  getTechniques,
  isTechniqueTargetInput,
  normalizeTechniqueId,
};
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
node --test minigame/test/technique-training.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add minigame/src/technique-training.js minigame/test/technique-training.test.cjs
git commit -m "feat: add technique training definitions"
```

---

### Task 2: 自由练习页增加技巧训练入口

**Files:**
- Modify: `minigame/src/practice-menu.js`
- Modify: `minigame/test/practice-menu.test.cjs`

- [ ] **Step 1: Write failing tests for the free-practice entry**

Append to `minigame/test/practice-menu.test.cjs`:

```js
test('createPracticeMenuLayout adds a lightweight technique training entry', () => {
  const layout = createPracticeMenuLayout(430, 932, levels, {
    recommendedTrainingDifficulty: 'steady',
  });

  assert.deepEqual(layout.techniqueTrainingButton, {
    x: layout.margin,
    y: layout.recommendation.y + 16,
    width: 144,
    height: 30,
    label: '技巧训练',
    helperText: '不会从哪看起？试试技巧训练。',
  });

  assert.equal(layout.difficultyCards[0].y > layout.techniqueTrainingButton.y + layout.techniqueTrainingButton.height, true);
});

test('hitTestPracticeMenu maps the technique training entry', () => {
  const layout = createPracticeMenuLayout(430, 932, levels);
  const button = layout.techniqueTrainingButton;

  assert.deepEqual(hitTestPracticeMenu(layout, button.x + button.width / 2, button.y + button.height / 2), {
    type: 'practiceMenu',
    action: 'techniqueTraining',
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test minigame/test/practice-menu.test.cjs
```

Expected: FAIL because `techniqueTrainingButton` is missing.

- [ ] **Step 3: Update practice menu layout and hit test**

Modify `minigame/src/practice-menu.js`:

```js
  const techniqueTrainingButton = {
    x: margin,
    y: titleY + (compact ? 66 : 72),
    width: compact ? 130 : 144,
    height: compact ? 28 : 30,
    label: '技巧训练',
    helperText: '不会从哪看起？试试技巧训练。',
  };
  const cardStartY = techniqueTrainingButton.y + techniqueTrainingButton.height + (compact ? 16 : 24);
```

Add `techniqueTrainingButton` to the returned layout:

```js
    techniqueTrainingButton,
```

Add this branch near the top of `hitTestPracticeMenu()` after the back button branch:

```js
  if (layout.techniqueTrainingButton && isInside(layout.techniqueTrainingButton, x, y)) {
    return {
      type: 'practiceMenu',
      action: 'techniqueTraining',
    };
  }
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
node --test minigame/test/practice-menu.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add minigame/src/practice-menu.js minigame/test/practice-menu.test.cjs
git commit -m "feat: add technique training entry"
```

---

### Task 3: 技巧训练目录布局与渲染

**Files:**
- Create: `minigame/src/technique-menu.js`
- Modify: `minigame/src/renderer.js`
- Test: `minigame/test/technique-menu.test.cjs`
- Test: `minigame/test/renderer.test.cjs`

- [ ] **Step 1: Write failing layout tests**

Create `minigame/test/technique-menu.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { getTechniqueGroups, getTechniques } = require('../src/technique-training');
const { createTechniqueMenuLayout, hitTestTechniqueMenu } = require('../src/technique-menu');

test('createTechniqueMenuLayout groups all techniques without progress fields', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques(), { topInset: 70 });

  assert.equal(layout.title.text, '技巧训练');
  assert.equal(layout.subtitle.text, '选一个观察方法，练一次关键步骤。');
  assert.equal(layout.backButton.y >= 70, true);
  assert.deepEqual(layout.groups.map((group) => [group.id, group.title]), [
    ['basic', '初阶技巧'],
    ['advanced', '进阶技巧'],
  ]);
  assert.equal(layout.techniqueCards.length, 16);
  assert.equal(layout.techniqueCards.some((card) => card.progress !== undefined || card.mastered !== undefined), false);
});

test('hitTestTechniqueMenu maps back and technique cards', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const back = layout.backButton;
  const xWing = layout.techniqueCards.find((card) => card.id === 'x-wing');

  assert.deepEqual(hitTestTechniqueMenu(layout, back.x + 4, back.y + 4), {
    type: 'techniqueMenu',
    action: 'back',
  });
  assert.deepEqual(hitTestTechniqueMenu(layout, xWing.x + xWing.width / 2, xWing.y + xWing.height / 2), {
    type: 'techniqueMenu',
    action: 'technique',
    techniqueId: 'x-wing',
  });
  assert.equal(hitTestTechniqueMenu(layout, 1, 1), null);
});
```

- [ ] **Step 2: Write failing renderer test**

Append to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws technique training menu without progress pressure copy', () => {
  const ctx = createMockCanvasContext();
  const { getTechniqueGroups, getTechniques } = require('../src/technique-training');
  const { createTechniqueMenuLayout } = require('../src/technique-menu');
  const { renderTechniqueMenu } = require('../src/renderer');
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());

  renderTechniqueMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /技巧训练/);
  assert.match(text, /初阶技巧/);
  assert.match(text, /进阶技巧/);
  assert.match(text, /唯一空格/);
  assert.match(text, /X-Wing/);
  assert.equal(/已掌握|完成率|正确率|学习失败|等级不足/.test(text), false);
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
node --test minigame/test/technique-menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: FAIL because `technique-menu` and `renderTechniqueMenu` are missing.

- [ ] **Step 4: Implement `technique-menu.js`**

Create `minigame/src/technique-menu.js`:

```js
function createTechniqueMenuLayout(width, height, groups, techniques, options = {}) {
  const compact = height < 700;
  const margin = compact ? 18 : 22;
  const topY = Math.max(compact ? 28 : 54, normalizeTopInset(options.topInset, height));
  const backButton = { x: margin, y: topY, width: compact ? 72 : 82, height: compact ? 34 : 38, label: '返回' };
  const titleY = backButton.y + backButton.height + (compact ? 22 : 34);
  const cardHeight = compact ? 52 : 58;
  const cardGap = compact ? 8 : 10;
  const groupGap = compact ? 24 : 30;
  let y = titleY + (compact ? 58 : 72);
  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeTechniques = Array.isArray(techniques) ? techniques : [];
  const layoutGroups = [];
  const techniqueCards = [];

  safeGroups.forEach((group) => {
    const groupTechniques = safeTechniques.filter((technique) => technique.group === group.id);
    const groupY = y;
    layoutGroups.push({
      id: group.id,
      title: group.title,
      subtitle: group.subtitle,
      x: margin,
      y: groupY,
    });
    y += compact ? 28 : 34;

    groupTechniques.forEach((technique) => {
      techniqueCards.push({
        id: technique.id,
        group: technique.group,
        x: margin,
        y,
        width: width - margin * 2,
        height: cardHeight,
        title: technique.title,
        summary: technique.summary,
        difficultyLabel: technique.difficultyLabel,
        buttonLabel: '练一下',
      });
      y += cardHeight + cardGap;
    });

    y += groupGap;
  });

  return {
    width,
    height,
    compact,
    margin,
    backButton,
    title: { x: margin, y: titleY, text: '技巧训练' },
    subtitle: { x: margin, y: titleY + (compact ? 28 : 34), text: '选一个观察方法，练一次关键步骤。' },
    groups: layoutGroups,
    techniqueCards,
  };
}

function hitTestTechniqueMenu(layout, x, y) {
  if (!layout) {
    return null;
  }
  if (layout.backButton && isInside(layout.backButton, x, y)) {
    return { type: 'techniqueMenu', action: 'back' };
  }
  const card = (layout.techniqueCards || []).find((item) => isInside(item, x, y));
  return card ? { type: 'techniqueMenu', action: 'technique', techniqueId: card.id } : null;
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
  createTechniqueMenuLayout,
  hitTestTechniqueMenu,
};
```

- [ ] **Step 5: Implement `renderTechniqueMenu()`**

In `minigame/src/renderer.js`, add:

```js
function renderTechniqueMenu(ctx, layout) {
  ctx.save();
  try {
    clear(ctx, layout.width, layout.height);
    drawMenuBackground(ctx, layout);
    drawTechniqueMenuHeader(ctx, layout);
    drawTechniqueCards(ctx, layout);
  } finally {
    ctx.restore();
  }
}
```

Add helper functions near `drawPracticeDifficultyCards()`:

```js
function drawTechniqueMenuHeader(ctx, layout) {
  const back = layout.backButton;
  roundRect(ctx, back.x, back.y, back.width, back.height, back.height / 2, 'rgba(255, 255, 255, 0.72)');
  ctx.fillStyle = '#18211f';
  setFont(ctx, layout, '900 14px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(back.label || '返回', back.x + back.width / 2, back.y + back.height / 2 + 0.5);

  ctx.fillStyle = '#18211f';
  setFont(ctx, layout, layout.compact ? '950 34px sans-serif' : '950 42px sans-serif');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(layout.title.text, layout.title.x, layout.title.y);

  ctx.fillStyle = 'rgba(24, 33, 31, 0.62)';
  setFont(ctx, layout, layout.compact ? '850 13px sans-serif' : '850 15px sans-serif');
  ctx.fillText(layout.subtitle.text, layout.subtitle.x, layout.subtitle.y);
}

function drawTechniqueCards(ctx, layout) {
  const groups = Array.isArray(layout.groups) ? layout.groups : [];
  const cards = Array.isArray(layout.techniqueCards) ? layout.techniqueCards : [];

  groups.forEach((group) => {
    ctx.fillStyle = group.id === 'basic' ? '#087471' : '#18211f';
    setFont(ctx, layout, '950 16px sans-serif');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(group.title, group.x, group.y);
    ctx.fillStyle = 'rgba(24, 33, 31, 0.5)';
    setFont(ctx, layout, '800 11px sans-serif');
    ctx.fillText(group.subtitle, group.x + 86, group.y);
  });

  cards.forEach((card, index) => {
    const advanced = card.group === 'advanced';
    roundRect(ctx, card.x, card.y, card.width, card.height, 18, advanced ? 'rgba(24, 33, 31, 0.09)' : 'rgba(255, 255, 255, 0.78)');
    ctx.fillStyle = advanced ? '#18211f' : '#087471';
    roundRect(ctx, card.x + 12, card.y + 12, 5, card.height - 24, 3, ctx.fillStyle);
    ctx.fillStyle = '#18211f';
    setFont(ctx, layout, '900 18px sans-serif');
    ctx.fillText(card.title, card.x + 28, card.y + 25);
    ctx.fillStyle = 'rgba(24, 33, 31, 0.58)';
    setFont(ctx, layout, '800 11px sans-serif');
    ctx.fillText(card.summary, card.x + 28, card.y + 43);
    ctx.fillStyle = advanced ? 'rgba(24, 33, 31, 0.62)' : '#087471';
    setFont(ctx, layout, '900 11px sans-serif');
    ctx.textAlign = 'right';
    ctx.fillText(card.buttonLabel, card.x + card.width - 24, card.y + card.height / 2 + 4);
    ctx.textAlign = 'left';
  });
}
```

Export `renderTechniqueMenu`:

```js
module.exports = {
  renderGame,
  renderMenu,
  renderPracticeMenu,
  renderTechniqueMenu,
};
```

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
node --test minigame/test/technique-menu.test.cjs minigame/test/renderer.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add minigame/src/technique-menu.js minigame/src/renderer.js minigame/test/technique-menu.test.cjs minigame/test/renderer.test.cjs
git commit -m "feat: render technique training menu"
```

---

### Task 4: 技巧训练详情页和目标输入交互

**Files:**
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/src/app-runtime.js`
- Test: `minigame/test/renderer.test.cjs`
- Test: `minigame/test/app-runtime.test.cjs`

- [ ] **Step 1: Write failing renderer test for technique lesson**

Append to `minigame/test/renderer.test.cjs`:

```js
test('renderer draws a technique lesson with prompt hint and success copy', () => {
  const ctx = createMockCanvasContext();
  const { createLayout } = require('../src/layout');
  const { createTechniqueState, getTechniqueById } = require('../src/technique-training');
  const { renderTechniqueLesson } = require('../src/renderer');
  const technique = getTechniqueById('single-empty');
  const state = createTechniqueState(technique);
  const layout = createLayout(430, 932);

  renderTechniqueLesson(ctx, state, layout, {
    technique,
    status: 'ready',
  });

  let text = getDrawnText(ctx);
  assert.match(text, /技巧训练/);
  assert.match(text, /唯一空格/);
  assert.match(text, /看第 1 行/);
  assert.match(text, /看提示/);
  assert.equal(/已掌握|完成率|正确率|学习失败/.test(text), false);

  renderTechniqueLesson(ctx, { ...state, completed: true }, layout, {
    technique,
    status: 'success',
  });

  text = getDrawnText(ctx);
  assert.match(text, /对，这一行只缺这个数字/);
});
```

- [ ] **Step 2: Write failing runtime tests for technique lesson flow**

Append to `minigame/test/app-runtime.test.cjs`:

```js
test('app runtime opens technique training from free practice and completes one lightweight lesson', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);

    assert.ok(runtime.latestTechniqueMenuCall());
    assert.match(runtime.drawnText(), /技巧训练/);
    assert.match(runtime.drawnText(), /X-Wing/);

    tapTechniqueCard(runtime, 'single-empty');

    const lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.state.mode, 'technique');
    assert.equal(lesson.options.technique.id, 'single-empty');

    const target = lesson.options.technique.lesson.target;
    tapCell(runtime, lesson.layout, target.row, target.col);
    tapDigit(runtime, lesson.layout, target.digit);

    const completed = runtime.latestTechniqueLessonCall();
    assert.equal(completed.state.completed, true);
    assert.match(runtime.drawnText(), /对，这一行只缺这个数字/);
  } finally {
    runtime.restore();
  }
});

test('app runtime technique training does not change campaign practice or growth progress', () => {
  const initialProgress = {
    version: 1,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: ['lab-01'],
    dailyReport: {
      date: '2026-05-20',
      completionCount: 1,
      completedLevelIds: ['lab-01'],
    },
    practiceStats: {
      totalCompleted: 2,
      lastDifficulty: 'easy',
      lastTrainingDifficulty: 'steady',
      nextRecommendedTrainingDifficulty: 'standard',
      recentLevelIdsByDifficulty: {
        intro: null,
        easy: 'lab-06',
        normal: null,
        hard: null,
      },
      recentLevelIdsByTrainingDifficulty: {
        warmup: null,
        steady: 'lab-06',
        standard: null,
        advanced: null,
      },
      consecutiveCompletedByTrainingDifficulty: {
        warmup: 0,
        steady: 2,
        standard: 0,
        advanced: 0,
      },
    },
    growthStats: {
      currentStreak: 3,
      bestStreak: 3,
      lastCompletedDate: '2026-05-20',
      todayDate: '2026-05-20',
      todayCompletedCount: 1,
      totalCompletedCount: 3,
      campaignCompletedCount: 1,
      practiceCompletedCount: 2,
    },
  };
  const runtime = bootAppRuntime({ initialProgress });

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);
    tapTechniqueCard(runtime, 'single-empty');

    const lesson = runtime.latestTechniqueLessonCall();
    const target = lesson.options.technique.lesson.target;
    tapCell(runtime, lesson.layout, target.row, target.col);
    tapDigit(runtime, lesson.layout, target.digit);

    const save = runtime.latestSave();
    assert.deepEqual(save.completedLevelIds, ['lab-01']);
    assert.equal(save.practiceStats.totalCompleted, 2);
    assert.equal(save.growthStats.todayCompletedCount, 1);
    assert.equal(save.growthStats.totalCompletedCount, 3);
    assert.equal(save.growthStats.currentStreak, 3);
  } finally {
    runtime.restore();
  }
});
```

Add helper methods in `bootAppRuntime()` render patch:

```js
renderTechniqueMenu(ctxArg, layout) {
  renderCalls.push({ type: 'techniqueMenu', layout });
  return actual.renderTechniqueMenu(ctxArg, layout);
},
renderTechniqueLesson(ctxArg, state, layout, renderOptions) {
  renderCalls.push({
    type: 'techniqueLesson',
    state,
    layout,
    options: renderOptions,
  });
  return actual.renderTechniqueLesson(ctxArg, state, layout, renderOptions);
},
```

Add runtime helpers:

```js
latestTechniqueMenuCall() {
  const call = [...renderCalls].reverse().find((item) => item.type === 'techniqueMenu');
  assert.ok(call);
  return call;
},
latestTechniqueLessonCall() {
  const call = [...renderCalls].reverse().find((item) => item.type === 'techniqueLesson');
  assert.ok(call);
  return call;
},
```

Add test helper functions:

```js
function tapPracticeTechniqueTraining(runtime) {
  const button = runtime.latestPracticeMenuCall().layout.techniqueTrainingButton;
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function tapTechniqueCard(runtime, techniqueId) {
  const card = runtime.latestTechniqueMenuCall().layout.techniqueCards.find((item) => item.id === techniqueId);
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/app-runtime.test.cjs
```

Expected: FAIL because `renderTechniqueLesson`, runtime scenes, and test render patches are missing.

- [ ] **Step 4: Implement `renderTechniqueLesson()`**

In `minigame/src/renderer.js`, add:

```js
function renderTechniqueLesson(ctx, state, layout, options = {}) {
  const technique = options.technique || null;
  const lesson = technique && technique.lesson ? technique.lesson : null;
  const viewLayout = {
    ...layout,
    level: state.level,
    stateNoteMode: state.noteMode,
    modeContext: {
      mode: 'technique',
      label: '技巧训练',
      title: technique ? technique.title : '技巧训练',
    },
    victoryActions: normalizeVictoryActions({}),
  };

  clear(ctx, viewLayout.width, viewLayout.height);
  drawBackground(ctx, viewLayout);
  drawTopBar(ctx, viewLayout);
  drawTechniquePrompt(ctx, viewLayout, technique, lesson, state.completed);
  drawTechniqueBoardFocus(ctx, state, viewLayout, lesson);
  drawBoard(ctx, state, viewLayout);
  drawTools(ctx, viewLayout);
  drawKeypad(ctx, viewLayout);
  drawTechniqueFeedback(ctx, viewLayout, technique, state.completed);
}

function drawTechniquePrompt(ctx, layout, technique, lesson, completed) {
  const text = completed
    ? (lesson && lesson.successText) || '这一招练到了。'
    : (lesson && lesson.prompt) || '观察高亮区域，完成关键一步。';
  roundRect(ctx, layout.margin, layout.ruleStrip.y, layout.width - layout.margin * 2, 34, 14, 'rgba(255, 255, 255, 0.72)');
  ctx.fillStyle = completed ? '#087471' : '#18211f';
  setFont(ctx, layout, '850 13px sans-serif');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, layout.margin + 14, layout.ruleStrip.y + 17);
  if (!completed) {
    ctx.fillStyle = '#087471';
    setFont(ctx, layout, '900 12px sans-serif');
    ctx.textAlign = 'right';
    ctx.fillText('看提示', layout.width - layout.margin - 14, layout.ruleStrip.y + 17);
    ctx.textAlign = 'left';
  }
}

function drawTechniqueBoardFocus(ctx, state, layout, lesson) {
  if (!lesson || !Array.isArray(lesson.focusCells)) {
    return;
  }
  const { board } = layout;
  const cellSize = board.size / 9;
  lesson.focusCells.forEach((cell) => {
    ctx.fillStyle = 'rgba(255, 200, 97, 0.14)';
    ctx.fillRect(board.x + cell.col * cellSize, board.y + cell.row * cellSize, cellSize, cellSize);
  });
}

function drawTechniqueFeedback(ctx, layout, technique, completed) {
  if (!completed) {
    return;
  }
  const text = technique && technique.lesson ? technique.lesson.successText : '这一招练到了。';
  const y = layout.keypad.y - 42;
  roundRect(ctx, layout.margin, y, layout.width - layout.margin * 2, 30, 15, 'rgba(8, 116, 113, 0.86)');
  ctx.fillStyle = '#f6fff4';
  setFont(ctx, layout, '850 12px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, layout.width / 2, y + 15);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
```

Export `renderTechniqueLesson`.

- [ ] **Step 5: Wire runtime scenes**

Modify imports in `minigame/src/app-runtime.js`:

```js
const { createTechniqueMenuLayout, hitTestTechniqueMenu } = require('./technique-menu');
const {
  createTechniqueState,
  getTechniqueById,
  getTechniqueGroups,
  getTechniques,
  isTechniqueTargetInput,
} = require('./technique-training');
const {
  renderGame,
  renderMenu,
  renderPracticeMenu,
  renderTechniqueLesson,
  renderTechniqueMenu,
} = require('./renderer');
```

Add state:

```js
let techniqueMenuLayout = null;
let currentTechnique = null;
let techniqueState = null;
```

In `setupCanvas()`, call:

```js
  refreshTechniqueMenuLayout();
```

Add:

```js
function refreshTechniqueMenuLayout() {
  if (!layout) {
    return;
  }

  techniqueMenuLayout = {
    ...createTechniqueMenuLayout(
      layout.width,
      layout.height,
      getTechniqueGroups(),
      getTechniques(),
      { topInset },
    ),
    canvasTextScale: layout.canvasTextScale,
  };
}
```

Extend `render()`:

```js
  if (scene === 'techniqueMenu' && techniqueMenuLayout) {
    renderTechniqueMenu(ctx, techniqueMenuLayout);
    return;
  }

  if (scene === 'techniqueLesson' && techniqueState && layout) {
    renderTechniqueLesson(ctx, techniqueState, layout, {
      technique: currentTechnique,
      status: techniqueState.completed ? 'success' : 'ready',
    });
    return;
  }
```

Extend touch routing in `boot()`:

```js
    if (scene === 'techniqueMenu') {
      handleTechniqueMenuTouch(touch);
      return;
    }

    if (scene === 'techniqueLesson') {
      handleTechniqueLessonTouch(touch);
      return;
    }
```

In `handlePracticeMenuTouch()`, add:

```js
  if (hit.action === 'techniqueTraining') {
    scene = 'techniqueMenu';
    refreshTechniqueMenuLayout();
    render();
    return;
  }
```

Add handlers:

```js
function handleTechniqueMenuTouch(touch) {
  const hit =
    techniqueMenuLayout && hitTestTechniqueMenu(techniqueMenuLayout, touch.clientX, touch.clientY);

  if (!hit) {
    return;
  }

  if (hit.action === 'back') {
    scene = 'practiceDifficulty';
    refreshPracticeMenuLayout();
    render();
    return;
  }

  if (hit.action === 'technique') {
    const technique = getTechniqueById(hit.techniqueId);
    const nextState = createTechniqueState(technique);
    if (!technique || !nextState) {
      return;
    }
    currentTechnique = technique;
    techniqueState = nextState;
    scene = 'techniqueLesson';
    render();
  }
}

function handleTechniqueLessonTouch(touch) {
  if (!layout || !techniqueState) {
    return;
  }

  const hit = hitTest(layout, touch.clientX, touch.clientY, false, { victoryMode: 'technique' });
  if (!hit) {
    return;
  }

  if (hit.type === 'nav' && hit.action === 'back') {
    scene = 'techniqueMenu';
    refreshTechniqueMenuLayout();
    render();
    return;
  }

  if (hit.type === 'cell') {
    techniqueState = {
      ...techniqueState,
      selected: { row: hit.row, col: hit.col },
    };
    render();
    return;
  }

  if (hit.type === 'digit') {
    applyTechniqueDigit(hit.digit);
    render();
  }
}

function applyTechniqueDigit(digit) {
  const selected = techniqueState.selected;
  const completed = isTechniqueTargetInput(currentTechnique, selected.row, selected.col, digit);
  techniqueState = {
    ...techniqueState,
    completed,
    cells: techniqueState.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (rowIndex !== selected.row || colIndex !== selected.col || cell.fixed) {
          return cell;
        }
        return {
          ...cell,
          value: digit,
          notes: [],
        };
      }),
    ),
  };
}
```

- [ ] **Step 6: Ensure technique training does not persist as a game run**

Do not call `persistProgress()` inside `handleTechniqueMenuTouch()`, `handleTechniqueLessonTouch()`, or `applyTechniqueDigit()`.

Add this defensive branch at the top of `persistProgress()`:

```js
  if (scene === 'techniqueMenu' || scene === 'techniqueLesson') {
    return;
  }
```

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/app-runtime.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add minigame/src/app-runtime.js minigame/src/renderer.js minigame/test/app-runtime.test.cjs minigame/test/renderer.test.cjs
git commit -m "feat: add technique training lesson flow"
```

---

### Task 5: Visual snapshots, documentation, and full verification

**Files:**
- Modify: `minigame/tools/render-snapshots.js`
- Modify: `minigame/test/visual-snapshots.test.cjs`
- Modify: `minigame/README.md`

- [ ] **Step 1: Write failing visual snapshot test**

Modify `minigame/test/visual-snapshots.test.cjs` so expected files include:

```js
const expectedFiles = [
  'menu.svg',
  'practiceMenu.svg',
  'techniqueMenu.svg',
  'techniqueLesson.svg',
  'gameplayDebug.svg',
  'victory.svg',
  'practiceVictory.svg',
];
```

Add content assertions:

```js
const techniqueMenu = readFileSync(join(visualDir, 'techniqueMenu.svg'), 'utf8');
assert.match(techniqueMenu, /技巧训练/);
assert.match(techniqueMenu, /初阶技巧/);
assert.match(techniqueMenu, /进阶技巧/);

const techniqueLesson = readFileSync(join(visualDir, 'techniqueLesson.svg'), 'utf8');
assert.match(techniqueLesson, /唯一空格/);
assert.match(techniqueLesson, /看提示/);
assert.equal(/已掌握|完成率|正确率/.test(techniqueLesson), false);
```

- [ ] **Step 2: Run snapshot test and verify failure**

Run:

```bash
node --test minigame/test/visual-snapshots.test.cjs
```

Expected: FAIL because `techniqueMenu.svg` and `techniqueLesson.svg` are not generated.

- [ ] **Step 3: Update `render-snapshots.js`**

In `minigame/tools/render-snapshots.js`, import:

```js
const { createLayout } = require('../src/layout');
const { createTechniqueMenuLayout } = require('../src/technique-menu');
const { createTechniqueState, getTechniqueById, getTechniqueGroups, getTechniques } = require('../src/technique-training');
const { renderTechniqueLesson, renderTechniqueMenu } = require('../src/renderer');
```

Add snapshots:

```js
renderSnapshot('techniqueMenu', (ctx) => {
  const layout = createTechniqueMenuLayout(WIDTH, HEIGHT, getTechniqueGroups(), getTechniques());
  renderTechniqueMenu(ctx, layout);
});

renderSnapshot('techniqueLesson', (ctx) => {
  const technique = getTechniqueById('single-empty');
  const state = createTechniqueState(technique);
  const layout = createLayout(WIDTH, HEIGHT);
  renderTechniqueLesson(ctx, state, layout, {
    technique,
    status: 'ready',
  });
});
```

- [ ] **Step 4: Update README**

Modify `minigame/README.md` Runtime Verification Checklist:

```md
- Tapping `技巧训练` from the free practice page opens the technique training directory.
- The technique training directory shows `初阶技巧` and `进阶技巧` without mastery, score, or progress copy.
- Opening a technique such as `唯一空格` shows a short prompt, a board, `看提示`, and a one-step training goal.
- Completing a technique training unit does not change campaign progress, free practice completion count, or streak count.
```

Modify Visual Snapshot Checks list:

```md
- `techniqueMenu.svg`: technique training directory with basic and advanced groups.
- `techniqueLesson.svg`: one-step technique training lesson.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
node --test minigame/test/*.test.cjs
node minigame/tools/render-snapshots.js
node huawei-h5/build.js
rg -n "已掌握|完成率|正确率|学习失败|等级不足|必须完成|金币|会员|商城|红包|老年痴呆|阿尔茨海默|治疗|预防|降低.*概率" minigame/src minigame/test minigame/README.md
```

Expected:

- Test suite PASS.
- Snapshot generation writes SVG files under `minigame/artifacts/visual/`.
- H5 bundle writes `huawei-h5/dist/game.bundle.js`.
- `rg` exits `1` with no matches.

- [ ] **Step 6: Commit**

```bash
git add minigame/tools/render-snapshots.js minigame/test/visual-snapshots.test.cjs minigame/README.md
git commit -m "chore: add technique training snapshots"
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

- `node --test minigame/test/*.test.cjs` passes.
- `node minigame/tools/render-snapshots.js` succeeds.
- `node huawei-h5/build.js` succeeds.
- `rg` returns no matches.

## Spec Coverage Review

- 自由练习页增加 `技巧训练` 入口：Task 2 and Task 4.
- 16 个初阶/进阶技巧：Task 1.
- 每个技巧 1 个轻量训练单元：Task 1 and Task 4.
- 不显示掌握度、完成率、成绩：Task 1, Task 3, Task 5.
- 不在用户局中提示学习技巧：Task 4 and final keyword/render checks.
- 不改变闯关、自由练习、连续练习数据：Task 4 runtime tests.
- 审核安全文案：Task 1 and Task 5 keyword scans.
