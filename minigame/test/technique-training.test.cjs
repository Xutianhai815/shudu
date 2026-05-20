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

const EXPECTED_TECHNIQUES = [
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
];

const UNSAFE_COPY_PATTERN = new RegExp(
  [
    '\u5df2\u638c\u63e1',
    '\u5b8c\u6210\u7387',
    '\u6b63\u786e\u7387',
    '\u5b66\u4e60\u5931\u8d25',
    '\u7b49\u7ea7\u4e0d\u8db3',
    '\u5fc5\u987b\u5b8c\u6210',
    '\u91d1\u5e01',
    '\u4f1a\u5458',
    '\u5546\u57ce',
    '\u7ea2\u5305',
    '\u8001\u5e74\u75f4\u5446',
    '\u963f\u5c14\u8328\u6d77\u9ed8',
    '\u6cbb\u7597',
    '\u9884\u9632',
    '\u964d\u4f4e.*\u6982\u7387',
  ].join('|'),
);

function assertNoPressureFields(value) {
  assert.equal(Object.hasOwn(value, 'mastered'), false);
  assert.equal(Object.hasOwn(value, 'progress'), false);
  assert.equal(Object.hasOwn(value, 'score'), false);
}

test('TECHNIQUE_GROUPS exposes basic and advanced group ids', () => {
  assert.deepEqual(
    TECHNIQUE_GROUPS.map((group) => group.id),
    ['basic', 'advanced'],
  );
  assert.ok(Object.isFrozen(TECHNIQUE_GROUPS));
});

test('getTechniqueGroups returns friendly groups without lock or progress fields', () => {
  const groups = getTechniqueGroups();

  assert.deepEqual(
    groups.map((group) => [group.id, group.title]),
    [
      ['basic', '初阶技巧'],
      ['advanced', '进阶技巧'],
    ],
  );
  groups.forEach((group) => {
    assert.equal(typeof group.subtitle, 'string');
    assert.notEqual(group.subtitle.length, 0);
    assert.equal(Object.hasOwn(group, 'locked'), false);
    assert.equal(Object.hasOwn(group, 'progress'), false);
  });

  groups[0].title = 'mutated';
  assert.equal(getTechniqueGroups()[0].title, '初阶技巧');
});

test('getTechniques returns the 16 planned lesson definitions', () => {
  const techniques = getTechniques();

  assert.equal(techniques.length, 16);
  assert.deepEqual(
    techniques.map((technique) => [technique.id, technique.group, technique.title]),
    EXPECTED_TECHNIQUES,
  );
});

test('technique lesson definitions stay lightweight and copy-safe', () => {
  getTechniques().forEach((technique) => {
    assertNoPressureFields(technique);
    assert.equal(typeof technique.summary, 'string');
    assert.equal(typeof technique.lesson.prompt, 'string');
    assert.equal(typeof technique.lesson.successText, 'string');
    assert.equal(UNSAFE_COPY_PATTERN.test(JSON.stringify(technique)), false);

    assert.equal(technique.lesson.board.length, 9);
    technique.lesson.board.forEach((row) => {
      assert.equal(row.length, 9);
      row.forEach((value) => {
        assert.equal(Number.isInteger(value), true);
        assert.ok(value >= 0 && value <= 9);
      });
    });

    assert.ok(technique.lesson.target.row >= 0 && technique.lesson.target.row <= 8);
    assert.ok(technique.lesson.target.col >= 0 && technique.lesson.target.col <= 8);
    assert.ok(technique.lesson.target.digit >= 1 && technique.lesson.target.digit <= 9);
    assert.equal(technique.lesson.board[technique.lesson.target.row][technique.lesson.target.col], 0);
  });

  const first = getTechniques()[0];
  first.lesson.board[0][0] = 9;
  assert.notEqual(getTechniques()[0].lesson.board[0][0], 9);
});

test('getTechniqueById and normalizeTechniqueId resolve stable technique ids', () => {
  assert.equal(normalizeTechniqueId('  X-WING  '), 'x-wing');
  assert.equal(normalizeTechniqueId('technique-single-empty'), 'single-empty');
  assert.equal(normalizeTechniqueId({ id: 'Swordfish' }), 'swordfish');
  assert.equal(normalizeTechniqueId(null), null);
  assert.equal(normalizeTechniqueId('missing'), null);
  assert.equal(normalizeTechniqueId('technique-missing'), null);

  const technique = getTechniqueById(' TECHNIQUE-BOARD-BASICS ');
  assert.equal(technique.id, 'board-basics');
  assert.equal(getTechniqueById('unknown-technique'), null);

  technique.title = 'mutated';
  assert.equal(getTechniqueById('board-basics').title, '认识棋盘');
});

test('createTechniqueState builds an isolated Sudoku-like technique state', () => {
  const technique = getTechniqueById('single-empty');
  const state = createTechniqueState(technique);
  const { row, col, digit } = technique.lesson.target;

  assert.equal(state.mode, 'technique');
  assert.equal(state.level.id, 'technique-single-empty');
  assert.equal(state.level.title, technique.title);
  assert.equal(state.level.label, '技巧训练');
  assert.equal(state.level.difficulty, technique.group);
  assert.deepEqual(state.level.rules, ['classic']);
  assert.deepEqual(state.selected, { row, col });
  assert.equal(state.noteMode, false);
  assert.equal(state.currentStepIndex, 0);
  assert.equal(state.completed, false);
  assert.equal(state.cells.length, 9);
  assert.equal(state.cells[0].length, 9);
  assert.equal(state.cells[row][col].value, 0);
  assert.equal(state.cells[row][col].fixed, false);
  assert.deepEqual(state.cells[row][col].notes, []);
  assert.equal(state.level.solution[row][col], digit);

  const fixedCell = state.cells.flat().find((cell) => cell.value > 0);
  assert.equal(fixedCell.fixed, true);
  assert.deepEqual(fixedCell.notes, []);

  state.level.givens[row][col] = digit;
  state.cells[row][col].value = digit;
  const fresh = createTechniqueState(technique);
  assert.equal(fresh.level.givens[row][col], 0);
  assert.equal(fresh.cells[row][col].value, 0);
});

test('isTechniqueTargetInput only accepts the lesson target input', () => {
  const technique = getTechniqueById('x-wing');
  const { row, col, digit } = technique.lesson.target;

  assert.equal(isTechniqueTargetInput(technique, row, col, digit), true);
  assert.equal(isTechniqueTargetInput(technique.id, row, col, digit), true);
  assert.equal(isTechniqueTargetInput(technique, row + 1, col, digit), false);
  assert.equal(isTechniqueTargetInput(technique, row, col + 1, digit), false);
  assert.equal(isTechniqueTargetInput(technique, row, col, digit + 1), false);
  assert.equal(isTechniqueTargetInput('unknown-technique', row, col, digit), false);
});

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
      assert.ok(Array.isArray(step.highlightCells));
      assert.ok(Array.isArray(step.highlightUnits));
      assert.ok(Array.isArray(step.candidateHighlights));
      assert.ok(Array.isArray(step.shapeHighlights));
    });

    const finalStepIndex = technique.lesson.steps.length - 1;
    const inputStepIndexes = technique.lesson.steps
      .map((step, index) => (step.inputEnabled ? index : null))
      .filter((index) => index !== null);

    assert.deepEqual(inputStepIndexes, [finalStepIndex], `${technique.id} should only enable final input`);
    assert.equal(technique.lesson.steps.at(-2).targetVisible, true, `${technique.id} penultimate step shows target`);
    assert.equal(technique.lesson.steps.at(-1).targetVisible, true, `${technique.id} final step shows target`);
  });

  const singleCandidate = getTechniqueById('single-candidate');
  assert.equal(singleCandidate.lesson.steps[0].targetVisible, true);
  assert.equal(singleCandidate.lesson.steps[1].targetVisible, true);
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
