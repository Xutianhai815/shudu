import { CellPosition, PuzzleSnapshot, PuzzleState, SudokuCell, SudokuLevel } from './types';
import { levels } from './levels';

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function isGridIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < 9;
}

function cloneCells(cells: SudokuCell[][]): SudokuCell[][] {
  return cells.map((row: SudokuCell[]) =>
    row.map((cell: SudokuCell) => ({
      ...cell,
      notes: [...cell.notes],
    })),
  );
}

function findInitialSelected(givens: number[][]): CellPosition {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (givens[row][col] === 0) {
        return { row, col };
      }
    }
  }

  return { row: 0, col: 0 };
}

function pushHistory(state: PuzzleState): PuzzleSnapshot[] {
  return [
    ...state.history,
    {
      selected: { ...state.selected },
      noteMode: state.noteMode,
      completed: state.completed,
      cells: cloneCells(state.cells),
    },
  ].slice(-50);
}

export function createPuzzleState(level?: SudokuLevel): PuzzleState {
  const activeLevel = level ?? levels[0];
  const selected = findInitialSelected(activeLevel.givens);

  return {
    level: activeLevel,
    solution: activeLevel.solution,
    selected,
    noteMode: false,
    completed: false,
    history: [],
    cells: activeLevel.givens.map((row: number[], rowIndex: number) =>
      row.map((value: number, colIndex: number) => ({
        row: rowIndex,
        col: colIndex,
        value,
        fixed: value !== 0,
        notes: [...(activeLevel.notes[cellKey(rowIndex, colIndex)] ?? [])],
      })),
    ),
  };
}

export function selectCell(state: PuzzleState, row: number, col: number): PuzzleState {
  if (!isGridIndex(row) || !isGridIndex(col)) {
    return state;
  }

  return {
    ...state,
    selected: { row, col },
  };
}

export function toggleNoteMode(state: PuzzleState): PuzzleState {
  if (state.completed) {
    return state;
  }

  return {
    ...state,
    noteMode: !state.noteMode,
  };
}

function toggleNote(state: PuzzleState, row: number, col: number, digit: number): PuzzleState {
  const nextCells = state.cells.map((cellRow: SudokuCell[], rowIndex: number) =>
    cellRow.map((cell: SudokuCell, colIndex: number) => {
      if (rowIndex !== row || colIndex !== col) {
        return cell;
      }

      const nextNotes = cell.notes.includes(digit)
        ? cell.notes.filter((note: number) => note !== digit)
        : [...cell.notes, digit].sort((left: number, right: number) => left - right);

      return {
        ...cell,
        value: 0,
        notes: nextNotes,
      };
    }),
  );

  return {
    ...state,
    completed: false,
    history: pushHistory(state),
    cells: nextCells,
  };
}

export function applyDigit(state: PuzzleState, digit: number): PuzzleState {
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) {
    return state;
  }

  const { row, col } = state.selected;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed || state.completed) {
    return state;
  }

  if (state.noteMode) {
    return toggleNote(state, row, col, digit);
  }

  const nextCells = state.cells.map((cellRow: SudokuCell[], rowIndex: number) =>
    cellRow.map((cell: SudokuCell, colIndex: number) => {
      if (rowIndex !== row || colIndex !== col) {
        return cell;
      }

      return {
        ...cell,
        value: digit,
        notes: [],
      };
    }),
  );

  const nextState: PuzzleState = {
    ...state,
    history: pushHistory(state),
    cells: nextCells,
  };

  return {
    ...nextState,
    completed: isSolved(nextState),
  };
}

export function eraseSelected(state: PuzzleState): PuzzleState {
  const { row, col } = state.selected;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed || state.completed || (selectedCell.value === 0 && selectedCell.notes.length === 0)) {
    return state;
  }

  return {
    ...state,
    completed: false,
    history: pushHistory(state),
    cells: state.cells.map((cellRow: SudokuCell[], rowIndex: number) =>
      cellRow.map((cell: SudokuCell, colIndex: number) => {
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

export function restartLevel(state: PuzzleState): PuzzleState {
  return createPuzzleState(state.level);
}

export function undo(state: PuzzleState): PuzzleState {
  const previous = state.history[state.history.length - 1];

  if (!previous) {
    return state;
  }

  return {
    ...state,
    selected: { ...previous.selected },
    noteMode: previous.noteMode,
    completed: previous.completed,
    cells: cloneCells(previous.cells),
    history: state.history.slice(0, -1),
  };
}

export function getDuplicateKeys(state: PuzzleState): string[] {
  const duplicates: Set<string> = new Set();

  for (let row = 0; row < 9; row += 1) {
    const positions: CellPosition[] = [];
    for (let col = 0; col < 9; col += 1) {
      positions.push({ row, col });
    }
    markDuplicateGroup(state, duplicates, positions);
  }

  for (let col = 0; col < 9; col += 1) {
    const positions: CellPosition[] = [];
    for (let row = 0; row < 9; row += 1) {
      positions.push({ row, col });
    }
    markDuplicateGroup(state, duplicates, positions);
  }

  for (let blockRow = 0; blockRow < 9; blockRow += 3) {
    for (let blockCol = 0; blockCol < 9; blockCol += 3) {
      const positions: CellPosition[] = [];
      for (let row = blockRow; row < blockRow + 3; row += 1) {
        for (let col = blockCol; col < blockCol + 3; col += 1) {
          positions.push({ row, col });
        }
      }
      markDuplicateGroup(state, duplicates, positions);
    }
  }

  return Array.from(duplicates);
}

function markDuplicateGroup(state: PuzzleState, duplicates: Set<string>, positions: CellPosition[]): void {
  const byDigit: Map<number, CellPosition[]> = new Map();

  positions.forEach((position: CellPosition) => {
    const value = state.cells[position.row][position.col].value;
    if (value < 1 || value > 9) {
      return;
    }

    const current = byDigit.get(value) ?? [];
    current.push(position);
    byDigit.set(value, current);
  });

  byDigit.forEach((items: CellPosition[]) => {
    if (items.length < 2) {
      return;
    }

    items.forEach((position: CellPosition) => duplicates.add(cellKey(position.row, position.col)));
  });
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
