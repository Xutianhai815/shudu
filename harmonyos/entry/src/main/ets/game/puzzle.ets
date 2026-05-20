import { CellPosition, PuzzleSnapshot, PuzzleState, SudokuCell, SudokuLevel } from './types';
import { levels } from './levels';

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function isGridIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < 9;
}

function createPosition(row: number, col: number): CellPosition {
  const position: CellPosition = {
    row: row,
    col: col,
  };
  return position;
}

function cloneNotes(notes: number[]): number[] {
  const nextNotes: number[] = [];
  for (let index = 0; index < notes.length; index += 1) {
    nextNotes.push(notes[index]);
  }
  return nextNotes;
}

function cloneCell(cell: SudokuCell): SudokuCell {
  const nextCell: SudokuCell = {
    row: cell.row,
    col: cell.col,
    value: cell.value,
    fixed: cell.fixed,
    notes: cloneNotes(cell.notes),
  };
  return nextCell;
}

function cloneCells(cells: SudokuCell[][]): SudokuCell[][] {
  const nextRows: SudokuCell[][] = [];
  for (let row = 0; row < cells.length; row += 1) {
    const nextCells: SudokuCell[] = [];
    for (let col = 0; col < cells[row].length; col += 1) {
      nextCells.push(cloneCell(cells[row][col]));
    }
    nextRows.push(nextCells);
  }
  return nextRows;
}

function findInitialSelected(givens: number[][]): CellPosition {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (givens[row][col] === 0) {
        return createPosition(row, col);
      }
    }
  }

  return createPosition(0, 0);
}

function pushHistory(state: PuzzleState): PuzzleSnapshot[] {
  const history: PuzzleSnapshot[] = [];
  const start = Math.max(0, state.history.length - 49);
  for (let index = start; index < state.history.length; index += 1) {
    history.push(state.history[index]);
  }

  const snapshot: PuzzleSnapshot = {
    selected: createPosition(state.selected.row, state.selected.col),
    noteMode: state.noteMode,
    completed: state.completed,
    cells: cloneCells(state.cells),
  };
  history.push(snapshot);
  return history;
}

function getLevelNotes(level: SudokuLevel, row: number, col: number): number[] {
  const key = cellKey(row, col);
  for (let index = 0; index < level.notes.length; index += 1) {
    if (level.notes[index].key === key) {
      return cloneNotes(level.notes[index].notes);
    }
  }
  return [];
}

function createCell(row: number, col: number, value: number, notes: number[]): SudokuCell {
  const cell: SudokuCell = {
    row: row,
    col: col,
    value: value,
    fixed: value !== 0,
    notes: notes,
  };
  return cell;
}

function createCells(level: SudokuLevel): SudokuCell[][] {
  const rows: SudokuCell[][] = [];
  for (let row = 0; row < 9; row += 1) {
    const cells: SudokuCell[] = [];
    for (let col = 0; col < 9; col += 1) {
      const value = level.givens[row][col];
      cells.push(createCell(row, col, value, getLevelNotes(level, row, col)));
    }
    rows.push(cells);
  }
  return rows;
}

function cloneStateWithCells(state: PuzzleState, cells: SudokuCell[][], completed: boolean, includeHistory: boolean): PuzzleState {
  const nextState: PuzzleState = {
    level: state.level,
    solution: state.solution,
    selected: createPosition(state.selected.row, state.selected.col),
    noteMode: state.noteMode,
    completed: completed,
    history: includeHistory ? pushHistory(state) : state.history,
    cells: cells,
  };
  return nextState;
}

function isValidSnapshotCells(cells: SudokuCell[][]): boolean {
  if (!Array.isArray(cells) || cells.length !== 9) {
    return false;
  }

  for (let row = 0; row < 9; row += 1) {
    if (!Array.isArray(cells[row]) || cells[row].length !== 9) {
      return false;
    }
  }

  return true;
}

export function createPuzzleState(level?: SudokuLevel): PuzzleState {
  const activeLevel = level ? level : levels[0];
  const selected = findInitialSelected(activeLevel.givens);

  const state: PuzzleState = {
    level: activeLevel,
    solution: activeLevel.solution,
    selected: selected,
    noteMode: false,
    completed: false,
    history: [],
    cells: createCells(activeLevel),
  };

  return state;
}

export function createPuzzleSnapshot(state: PuzzleState): PuzzleSnapshot {
  const snapshot: PuzzleSnapshot = {
    selected: createPosition(state.selected.row, state.selected.col),
    noteMode: state.noteMode,
    completed: state.completed,
    cells: cloneCells(state.cells),
  };
  return snapshot;
}

export function createPuzzleStateFromSnapshot(level: SudokuLevel, snapshot: PuzzleSnapshot): PuzzleState | null {
  if (!snapshot || !isGridIndex(snapshot.selected.row) || !isGridIndex(snapshot.selected.col) || !isValidSnapshotCells(snapshot.cells)) {
    return null;
  }

  const baseState = createPuzzleState(level);
  const cells = cloneCells(baseState.cells);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const baseCell = cells[row][col];
      const savedCell = snapshot.cells[row][col];

      if (baseCell.fixed) {
        continue;
      }

      if (Number.isInteger(savedCell.value) && savedCell.value >= 0 && savedCell.value <= 9) {
        baseCell.value = savedCell.value;
      }

      if (Array.isArray(savedCell.notes)) {
        const notes: number[] = [];
        for (let index = 0; index < savedCell.notes.length; index += 1) {
          const note = savedCell.notes[index];
          if (Number.isInteger(note) && note >= 1 && note <= 9 && notes.indexOf(note) < 0) {
            notes.push(note);
          }
        }
        notes.sort((left: number, right: number) => left - right);
        baseCell.notes = notes;
      }
    }
  }

  const restoredState: PuzzleState = {
    level: level,
    solution: level.solution,
    selected: createPosition(snapshot.selected.row, snapshot.selected.col),
    noteMode: snapshot.noteMode === true,
    completed: false,
    history: [],
    cells: cells,
  };
  restoredState.completed = isSolved(restoredState);
  return restoredState;
}

export function selectCell(state: PuzzleState, row: number, col: number): PuzzleState {
  if (!isGridIndex(row) || !isGridIndex(col)) {
    return state;
  }

  const nextState: PuzzleState = {
    level: state.level,
    solution: state.solution,
    selected: createPosition(row, col),
    noteMode: state.noteMode,
    completed: state.completed,
    history: state.history,
    cells: state.cells,
  };
  return nextState;
}

export function toggleNoteMode(state: PuzzleState): PuzzleState {
  if (state.completed) {
    return state;
  }

  const nextState: PuzzleState = {
    level: state.level,
    solution: state.solution,
    selected: state.selected,
    noteMode: !state.noteMode,
    completed: state.completed,
    history: state.history,
    cells: state.cells,
  };
  return nextState;
}

function toggleNote(state: PuzzleState, row: number, col: number, digit: number): PuzzleState {
  const nextCells = cloneCells(state.cells);
  const cell = nextCells[row][col];
  const nextNotes = cloneNotes(cell.notes);
  const existingIndex = nextNotes.indexOf(digit);
  if (existingIndex >= 0) {
    nextNotes.splice(existingIndex, 1);
  } else {
    nextNotes.push(digit);
    nextNotes.sort((left: number, right: number) => left - right);
  }

  cell.value = 0;
  cell.notes = nextNotes;

  return cloneStateWithCells(state, nextCells, false, true);
}

export function applyDigit(state: PuzzleState, digit: number): PuzzleState {
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) {
    return state;
  }

  const row = state.selected.row;
  const col = state.selected.col;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed || state.completed) {
    return state;
  }

  if (state.noteMode) {
    return toggleNote(state, row, col, digit);
  }

  const nextCells = cloneCells(state.cells);
  nextCells[row][col].value = digit;
  nextCells[row][col].notes = [];

  const nextState: PuzzleState = cloneStateWithCells(state, nextCells, false, true);

  nextState.completed = isSolved(nextState);
  return nextState;
}

export function eraseSelected(state: PuzzleState): PuzzleState {
  const row = state.selected.row;
  const col = state.selected.col;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed || state.completed || (selectedCell.value === 0 && selectedCell.notes.length === 0)) {
    return state;
  }

  const nextCells = cloneCells(state.cells);
  nextCells[row][col].value = 0;
  nextCells[row][col].notes = [];
  return cloneStateWithCells(state, nextCells, false, true);
}

export function restartLevel(state: PuzzleState): PuzzleState {
  return createPuzzleState(state.level);
}

export function undo(state: PuzzleState): PuzzleState {
  const previous = state.history[state.history.length - 1];

  if (!previous) {
    return state;
  }

  const history: PuzzleSnapshot[] = [];
  for (let index = 0; index < state.history.length - 1; index += 1) {
    history.push(state.history[index]);
  }

  const nextState: PuzzleState = {
    level: state.level,
    solution: state.solution,
    selected: createPosition(previous.selected.row, previous.selected.col),
    noteMode: previous.noteMode,
    completed: previous.completed,
    cells: cloneCells(previous.cells),
    history: history,
  };
  return nextState;
}

export function getDuplicateKeys(state: PuzzleState): string[] {
  const duplicates: string[] = [];

  for (let row = 0; row < 9; row += 1) {
    const positions: CellPosition[] = [];
    for (let col = 0; col < 9; col += 1) {
      positions.push(createPosition(row, col));
    }
    markDuplicateGroup(state, duplicates, positions);
  }

  for (let col = 0; col < 9; col += 1) {
    const positions: CellPosition[] = [];
    for (let row = 0; row < 9; row += 1) {
      positions.push(createPosition(row, col));
    }
    markDuplicateGroup(state, duplicates, positions);
  }

  for (let blockRow = 0; blockRow < 9; blockRow += 3) {
    for (let blockCol = 0; blockCol < 9; blockCol += 3) {
      const positions: CellPosition[] = [];
      for (let row = blockRow; row < blockRow + 3; row += 1) {
        for (let col = blockCol; col < blockCol + 3; col += 1) {
          positions.push(createPosition(row, col));
        }
      }
      markDuplicateGroup(state, duplicates, positions);
    }
  }

  return duplicates;
}

function addDuplicateKey(duplicates: string[], row: number, col: number): void {
  const key = cellKey(row, col);
  if (duplicates.indexOf(key) < 0) {
    duplicates.push(key);
  }
}

function markDuplicateGroup(state: PuzzleState, duplicates: string[], positions: CellPosition[]): void {
  for (let digit = 1; digit <= 9; digit += 1) {
    let count = 0;
    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index];
      if (state.cells[position.row][position.col].value === digit) {
        count += 1;
      }
    }

    if (count < 2) {
      continue;
    }

    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index];
      if (state.cells[position.row][position.col].value === digit) {
        addDuplicateKey(duplicates, position.row, position.col);
      }
    }
  }
}

export function isSolved(state: PuzzleState): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (state.cells[row][col].value !== state.solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}
