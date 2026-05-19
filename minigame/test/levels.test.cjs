const assert = require('node:assert/strict');
const test = require('node:test');

const { levels, getLevelById } = require('../src/levels');
const { createPuzzleState, solution } = require('../src/puzzle');

test('level data exposes basic sudoku givens solution and notes', () => {
  const level = getLevelById('lab-01');

  assert.equal(levels.length, 24);
  assert.equal(level.id, 'lab-01');
  assert.equal(level.title, '起步热身');
  assert.equal(level.label, 'LAB-01');
  assert.equal(level.hints, 3);
  assert.deepEqual(level.rules, ['classic']);
  assert.equal(level.givens.length, 9);
  assert.equal(typeof level.notes, 'object');
  assert.equal(level.variantClues, undefined);
});

test('createPuzzleState loads its board and clue metadata from a level', () => {
  const state = createPuzzleState(levels[0]);

  assert.equal(state.level.id, 'lab-01');
  assert.equal(state.cells[0][0].value, levels[0].givens[0][0]);
  assert.equal(state.solution[0][2], levels[0].solution[0][2]);
  assert.deepEqual(solution, levels[0].solution);
  assert.equal(state.level.variantClues, undefined);
});

test('level pack progresses through expected ids titles and difficulty bands', () => {
  assert.deepEqual(levels.map((level) => level.id), [
    ...Array.from({ length: 24 }, (_, index) => `lab-${String(index + 1).padStart(2, '0')}`),
  ]);
  assert.deepEqual(levels.map((level) => level.label), [
    ...Array.from({ length: 24 }, (_, index) => `LAB-${String(index + 1).padStart(2, '0')}`),
  ]);
  assert.deepEqual(levels.map((level) => level.title), [
    '起步热身',
    '九宫巡检',
    '行列对齐',
    '轻量推理',
    '草稿练习',
    '稳定发挥',
    '隐藏线索',
    '双区联动',
    '中段加速',
    '深度排除',
    '专注挑战',
    '首轮毕业',
    '宫位接力',
    '斜线排查',
    '候选压缩',
    '链路追踪',
    '节奏校准',
    '整盘统筹',
    '少线突破',
    '双宫锁定',
    '高阶排除',
    '极限专注',
    '终盘试炼',
    '大师复盘',
  ]);
  assert.deepEqual(levels.map((level) => level.difficulty), [
    'intro',
    'intro',
    'intro',
    'intro',
    'easy',
    'easy',
    'easy',
    'easy',
    'easy',
    'easy',
    'normal',
    'normal',
    'normal',
    'normal',
    'normal',
    'normal',
    'normal',
    'normal',
    'hard',
    'hard',
    'hard',
    'hard',
    'hard',
    'hard',
  ]);
});

test('level pack reduces clue counts across difficulty bands', () => {
  const clueCounts = levels.map(countGivens);
  const bandAverages = [
    average(clueCounts.slice(0, 4)),
    average(clueCounts.slice(4, 10)),
    average(clueCounts.slice(10, 18)),
    average(clueCounts.slice(18, 24)),
  ];

  assert.ok(bandAverages[0] > bandAverages[1]);
  assert.ok(bandAverages[1] > bandAverages[2]);
  assert.ok(bandAverages[2] > bandAverages[3]);
});

test('each level has a valid unique solution and distinct solved board', () => {
  const solutionKeys = new Set();

  levels.forEach((level) => {
    assert.deepEqual(level.rules, ['classic']);
    assert.equal(level.variantClues, undefined);
    assert.equal(isValidGrid(level.solution), true);
    assert.equal(givensMatchSolution(level), true);
    assert.equal(countSolutions(level.givens), 1);
    solutionKeys.add(level.solution.flat().join(''));
  });

  assert.equal(solutionKeys.size, levels.length);
});

function countGivens(level) {
  return level.givens.flat().filter((value) => value !== 0).length;
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function givensMatchSolution(level) {
  return level.givens.every((row, rowIndex) =>
    row.every((value, colIndex) => value === 0 || value === level.solution[rowIndex][colIndex]),
  );
}

function isValidGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 9) {
    return false;
  }

  const expected = '123456789';
  const rows = grid;
  const cols = Array.from({ length: 9 }, (_, colIndex) => grid.map((row) => row[colIndex]));
  const boxes = [];

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const values = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          values.push(grid[row][col]);
        }
      }
      boxes.push(values);
    }
  }

  return [...rows, ...cols, ...boxes].every((values) => values.slice().sort().join('') === expected);
}

function countSolutions(givens) {
  const grid = givens.map((row) => [...row]);
  let count = 0;

  function solve() {
    if (count > 1) {
      return;
    }

    const next = findBestEmptyCell(grid);
    if (!next) {
      count += 1;
      return;
    }

    for (const value of next.candidates) {
      grid[next.row][next.col] = value;
      solve();
      grid[next.row][next.col] = 0;
    }
  }

  solve();
  return count;
}

function findBestEmptyCell(grid) {
  let best = null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col] !== 0) {
        continue;
      }

      const candidates = getCandidates(grid, row, col);
      if (candidates.length === 0) {
        return { row, col, candidates };
      }

      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
      }
    }
  }

  return best;
}

function getCandidates(grid, row, col) {
  const used = new Set();
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let index = 0; index < 9; index += 1) {
    used.add(grid[row][index]);
    used.add(grid[index][col]);
  }

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      used.add(grid[r][c]);
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}
