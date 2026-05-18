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
  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => null,
    }),
    false,
  );
  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => ({}),
    }),
    false,
  );
  assert.equal(
    isDebugToolsEnabled({
      getAccountInfoSync: () => ({ miniProgram: {} }),
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
  const invalidState = { level: {}, cells: [] };
  assert.equal(completePuzzleForDebug(invalidState), invalidState);
});
