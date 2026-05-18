const { levels } = require('./levels');

const solution = levels[0].solution;

function cellKey(row, col) {
  return `${row}:${col}`;
}

function createPuzzleState(level = levels[0]) {
  const notes = new Map(Object.entries(level.notes || {}));
  const selected = findInitialSelected(level.givens);

  return {
    level,
    solution: level.solution,
    selected,
    noteMode: false,
    mistakes: 0,
    completed: false,
    history: [],
    cells: level.givens.map((row, rowIndex) =>
      row.map((value, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        value,
        fixed: value !== 0,
        notes: [...(notes.get(cellKey(rowIndex, colIndex)) || [])],
      })),
    ),
  };
}

function findInitialSelected(givens) {
  for (let row = 0; row < givens.length; row += 1) {
    for (let col = 0; col < givens[row].length; col += 1) {
      if (givens[row][col] === 0) {
        return { row, col };
      }
    }
  }

  return { row: 0, col: 0 };
}

function createPuzzleStateFromSnapshot(level, snapshot) {
  const baseState = createPuzzleState(level);

  if (!hasValidSnapshotCells(snapshot)) {
    return baseState;
  }

  return {
    ...baseState,
    selected: isValidSelected(snapshot.selected) ? { ...snapshot.selected } : baseState.selected,
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

function hasValidSnapshotCells(snapshot) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.cells) &&
      snapshot.cells.length === 9 &&
      snapshot.cells.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 9 &&
          row.every((cell) => cell && Number.isInteger(cell.value) && Array.isArray(cell.notes)),
      ),
  );
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

function getPeers(row, col) {
  const peers = new Set();
  const blockRow = Math.floor(row / 3) * 3;
  const blockCol = Math.floor(col / 3) * 3;

  for (let index = 0; index < 9; index += 1) {
    peers.add(cellKey(row, index));
    peers.add(cellKey(index, col));
  }

  for (let r = blockRow; r < blockRow + 3; r += 1) {
    for (let c = blockCol; c < blockCol + 3; c += 1) {
      peers.add(cellKey(r, c));
    }
  }

  peers.delete(cellKey(row, col));
  return peers;
}

function selectCell(state, row, col) {
  return {
    ...state,
    selected: { row, col },
  };
}

function toggleNoteMode(state) {
  if (state.completed) {
    return state;
  }

  return {
    ...state,
    noteMode: !state.noteMode,
  };
}

function applyDigit(state, digit) {
  const { row, col } = state.selected;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed || state.completed) {
    return state;
  }

  if (state.noteMode) {
    return toggleNote(state, row, col, digit);
  }

  const nextState = {
    ...state,
    history: pushHistory(state),
    cells: state.cells.map((cellRow, rowIndex) =>
      cellRow.map((cell, colIndex) => {
        if (rowIndex !== row || colIndex !== col) {
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

  return {
    ...nextState,
    completed: isSolved(nextState),
  };
}

function toggleNote(state, row, col, digit) {
  const nextState = {
    ...state,
    history: pushHistory(state),
    cells: state.cells.map((cellRow, rowIndex) =>
      cellRow.map((cell, colIndex) => {
        if (rowIndex !== row || colIndex !== col) {
          return cell;
        }

        const nextNotes = cell.notes.includes(digit)
          ? cell.notes.filter((note) => note !== digit)
          : [...cell.notes, digit].sort((left, right) => left - right);

        return {
          ...cell,
          value: 0,
          notes: nextNotes,
        };
      }),
    ),
  };

  return {
    ...nextState,
    completed: false,
  };
}

function eraseSelected(state) {
  const { row, col } = state.selected;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed || state.completed || (selectedCell.value === 0 && selectedCell.notes.length === 0)) {
    return state;
  }

  return {
    ...state,
    completed: false,
    history: pushHistory(state),
    cells: state.cells.map((cellRow, rowIndex) =>
      cellRow.map((cell, colIndex) => {
        if (rowIndex !== row || colIndex !== col) {
          return cell;
        }

        return {
          ...cell,
          value: 0,
          notes: [],
        };
      }),
    ),
  };
}

function undo(state) {
  const previous = state.history[state.history.length - 1];

  if (!previous) {
    return state;
  }

  return {
    ...state,
    cells: cloneCells(previous.cells),
    mistakes: previous.mistakes,
    completed: previous.completed,
    history: state.history.slice(0, -1),
  };
}

function restartLevel(state) {
  return createPuzzleState(state.level);
}

function retrySameDifficultyLevel(state) {
  const currentLevel = state && state.level;

  if (!currentLevel) {
    return createPuzzleState(levels[0]);
  }

  const difficultyLevels = levels.filter((level) => level.difficulty === currentLevel.difficulty);
  const currentIndex = difficultyLevels.findIndex((level) => level.id === currentLevel.id);

  if (difficultyLevels.length <= 1 || currentIndex === -1) {
    return createPuzzleState(currentLevel);
  }

  return createPuzzleState(difficultyLevels[(currentIndex + 1) % difficultyLevels.length]);
}

function nextLevel(state) {
  const currentIndex = levels.findIndex((level) => level.id === state.level.id);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % levels.length;

  return createPuzzleState(levels[nextIndex]);
}

function pushHistory(state) {
  return [
    ...state.history,
    {
      cells: cloneCells(state.cells),
      mistakes: state.mistakes,
      completed: state.completed,
    },
  ];
}

function cloneCells(cells) {
  return cells.map((row) =>
    row.map((cell) => ({
      ...cell,
      notes: [...cell.notes],
    })),
  );
}

function isSolved(state) {
  return state.cells.every((row, rowIndex) =>
    row.every((cell, colIndex) => cell.value === state.solution[rowIndex][colIndex]),
  );
}

function getCellFlags(state, row, col) {
  const key = cellKey(row, col);
  const selectedKey = cellKey(state.selected.row, state.selected.col);
  const selectedValue = state.cells[state.selected.row][state.selected.col].value;
  const cell = state.cells[row][col];

  return {
    selected: key === selectedKey,
    peer: getPeers(state.selected.row, state.selected.col).has(key),
    fixed: cell.fixed,
    sameValue: selectedValue !== 0 && cell.value === selectedValue && key !== selectedKey,
    conflict: hasPeerDuplicate(state, row, col),
  };
}

function hasPeerDuplicate(state, row, col) {
  const cell = state.cells[row][col];

  if (cell.value === 0) {
    return false;
  }

  return Array.from(getPeers(row, col)).some((key) => {
    const [peerRow, peerCol] = key.split(':').map(Number);
    return state.cells[peerRow][peerCol].value === cell.value;
  });
}

module.exports = {
  applyDigit,
  cellKey,
  createPuzzleState,
  createPuzzleStateFromSnapshot,
  eraseSelected,
  getCellFlags,
  getPeers,
  isSolved,
  nextLevel,
  restartLevel,
  retrySameDifficultyLevel,
  selectCell,
  solution,
  toggleNoteMode,
  undo,
};
