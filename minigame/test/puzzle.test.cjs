const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyDigit,
  createPuzzleState,
  createPuzzleStateFromSnapshot,
  eraseSelected,
  getCellFlags,
  isSolved,
  nextLevel,
  restartLevel,
  retrySameDifficultyLevel,
  selectCell,
  solution,
  toggleNoteMode,
  undo,
} = require('../src/puzzle');
const { levels } = require('../src/levels');

test('selecting a clue marks peers and same values for Canvas rendering', () => {
  const state = selectCell(createPuzzleState(), 0, 0);

  assert.equal(getCellFlags(state, 0, 0).selected, true);
  assert.equal(getCellFlags(state, 0, 1).peer, true);
  assert.equal(getCellFlags(state, 5, 1).sameValue, true);
});

test('digit input updates mutable selected cells only', () => {
  const state = createPuzzleState();
  const filled = applyDigit(selectCell(state, 0, 3), 6);
  const unchanged = applyDigit(selectCell(filled, 0, 0), 9);

  assert.equal(filled.cells[0][3].value, 6);
  assert.equal(unchanged.cells[0][0].value, 4);
});

test('wrong digit without a peer duplicate is not marked as a conflict or mistake', () => {
  const state = createPuzzleState();
  const wrong = applyDigit(selectCell(state, 0, 5), 1);

  assert.equal(getCellFlags(wrong, 0, 5).conflict, false);
  assert.equal(wrong.mistakes, 0);
  assert.equal(isSolved(wrong), false);
});

test('duplicate digit marks the repeated peers without judging answer correctness', () => {
  const state = createPuzzleState();
  const duplicate = applyDigit(selectCell(state, 0, 3), 4);

  assert.equal(getCellFlags(duplicate, 0, 3).conflict, true);
  assert.equal(getCellFlags(duplicate, 0, 0).conflict, true);
  assert.equal(duplicate.mistakes, 0);
  assert.equal(isSolved(duplicate), false);
});

test('solved board is detected after every cell matches the solution', () => {
  const state = createPuzzleState();
  const solved = {
    ...state,
    cells: state.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: solution[rowIndex][colIndex],
        notes: [],
      })),
    ),
  };

  assert.equal(isSolved(solved), true);
});

test('applying the final correct digit sets completed to true', () => {
  const state = createPuzzleState();
  const almostSolved = {
    ...state,
    selected: { row: 0, col: 3 },
    cells: state.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: rowIndex === 0 && colIndex === 3 ? 0 : solution[rowIndex][colIndex],
        fixed: cell.fixed,
        notes: [],
      })),
    ),
  };

  const completed = applyDigit(almostSolved, solution[0][3]);

  assert.equal(completed.completed, true);
  assert.equal(getCellFlags(completed, 0, 3).conflict, false);
});

test('note mode toggles candidates without changing the answer value', () => {
  const state = toggleNoteMode(selectCell(createPuzzleState(), 0, 3));
  const withNote = applyDigit(state, 6);
  const withoutNote = applyDigit(withNote, 6);

  assert.equal(withNote.noteMode, true);
  assert.equal(withNote.cells[0][3].value, 0);
  assert.deepEqual(withNote.cells[0][3].notes, [6]);
  assert.deepEqual(withoutNote.cells[0][3].notes, []);
});

test('createPuzzleState keeps level notes isolated from mutable state', () => {
  const state = createPuzzleState(levels[0]);

  state.cells[0][3].notes.push(9);

  assert.deepEqual(levels[0].notes, {});
});

test('createPuzzleStateFromSnapshot restores selected by value', () => {
  const snapshot = {
    selected: { row: 0, col: 3 },
    noteMode: false,
    mistakes: 0,
    completed: false,
    cells: createPuzzleState(levels[0]).cells.map((row) =>
      row.map((cell) => ({
        value: cell.value,
        notes: [...cell.notes],
      })),
    ),
  };
  const restored = createPuzzleStateFromSnapshot(levels[0], snapshot);

  snapshot.selected.row = 8;

  assert.deepEqual(restored.selected, { row: 0, col: 3 });
});

test('createPuzzleStateFromSnapshot falls back to a fresh state for invalid snapshots', () => {
  const restored = createPuzzleStateFromSnapshot(levels[0], { selected: { row: 0, col: 3 } });

  assert.deepEqual(restored.selected, { row: 0, col: 3 });
  assert.equal(restored.history.length, 0);
  assert.deepEqual(restored.cells[0][3].notes, []);
});

test('erase clears mutable values and notes but leaves fixed clues unchanged', () => {
  const state = createPuzzleState();
  const filled = applyDigit(selectCell(state, 0, 3), 6);
  const erased = eraseSelected(filled);
  const fixedAttempt = eraseSelected(selectCell(erased, 0, 0));

  assert.equal(erased.cells[0][3].value, 0);
  assert.deepEqual(erased.cells[0][3].notes, []);
  assert.equal(fixedAttempt.cells[0][0].value, 4);
});

test('undo restores the previous mutable board state', () => {
  const state = createPuzzleState();
  const filled = applyDigit(selectCell(state, 0, 3), 6);
  const wrong = applyDigit(selectCell(filled, 0, 5), 9);
  const restored = undo(wrong);

  assert.equal(wrong.mistakes, 0);
  assert.equal(restored.cells[0][5].value, 0);
  assert.equal(restored.cells[0][3].value, 6);
  assert.equal(restored.mistakes, 0);
});

test('restartLevel resets the current level and clears progress', () => {
  const state = createPuzzleState(levels[1]);
  const changed = applyDigit(selectCell(state, 0, 0), 9);
  const restarted = restartLevel(changed);

  assert.equal(restarted.level.id, levels[1].id);
  assert.equal(restarted.cells[0][0].value, levels[1].givens[0][0]);
  assert.equal(restarted.mistakes, 0);
  assert.equal(restarted.history.length, 0);
});

test('retrySameDifficultyLevel switches to another puzzle in the same difficulty band', () => {
  const retried = retrySameDifficultyLevel(createPuzzleState(levels[0]));
  const wrapped = retrySameDifficultyLevel(createPuzzleState(levels[2]));

  assert.equal(retried.level.id, 'lab-02');
  assert.equal(retried.level.difficulty, 'intro');
  assert.equal(wrapped.level.id, 'lab-01');
  assert.equal(wrapped.level.difficulty, 'intro');
});

test('nextLevel advances through level data and wraps after the final level', () => {
  const first = createPuzzleState(levels[0]);
  const second = nextLevel(first);
  const wrapped = nextLevel(createPuzzleState(levels[levels.length - 1]));

  assert.equal(second.level.id, levels[1].id);
  assert.equal(wrapped.level.id, levels[0].id);
});
