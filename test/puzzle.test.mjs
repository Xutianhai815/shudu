import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyDigit,
  cellKey,
  createPuzzleState,
  getCellClasses,
  getPeers,
  selectCell,
} from '../src/puzzle.js';

test('selecting a cell highlights its row column block and same digits', () => {
  const state = selectCell(createPuzzleState(), 0, 0);

  assert.equal(state.selected.row, 0);
  assert.equal(state.selected.col, 0);
  assert.ok(getPeers(0, 0).has(cellKey(0, 8)));
  assert.ok(getPeers(0, 0).has(cellKey(7, 0)));
  assert.ok(getPeers(0, 0).has(cellKey(1, 1)));
  assert.ok(getCellClasses(state, 0, 0).includes('is-selected'));
  assert.ok(getCellClasses(state, 0, 8).includes('is-peer'));
  assert.ok(getCellClasses(state, 5, 2).includes('is-same-value'));
});

test('applyDigit fills empty mutable cells and preserves fixed clues', () => {
  const state = createPuzzleState();

  const filled = applyDigit(selectCell(state, 0, 2), 4);
  const unchanged = applyDigit(selectCell(filled, 0, 0), 9);

  assert.equal(filled.cells[0][2].value, 4);
  assert.equal(filled.cells[0][2].fixed, false);
  assert.equal(unchanged.cells[0][0].value, 8);
  assert.equal(unchanged.cells[0][0].fixed, true);
});
