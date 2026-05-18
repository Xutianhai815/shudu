const givens = [
  [8, 0, 0, 0, 0, 0, 0, 4, 0],
  [0, 0, 7, 0, 4, 0, 2, 0, 0],
  [0, 5, 0, 1, 0, 8, 0, 0, 9],
  [0, 7, 0, 0, 0, 2, 8, 0, 0],
  [6, 0, 2, 0, 8, 0, 1, 0, 5],
  [0, 0, 8, 7, 0, 0, 0, 2, 0],
  [3, 0, 0, 8, 0, 4, 0, 7, 0],
  [0, 0, 5, 0, 9, 0, 4, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 0, 6],
];

const notes = new Map([
  ['0:1', [1, 3, 6]],
  ['0:2', [1, 3, 6, 9]],
  ['1:0', [1, 9]],
  ['2:4', [2, 3, 6]],
  ['3:3', [3, 4, 5]],
  ['4:1', [3, 4, 9]],
  ['5:4', [1, 3, 6]],
  ['6:6', [5, 9]],
  ['7:7', [1, 3, 8]],
]);

export function cellKey(row, col) {
  return `${row}:${col}`;
}

export function createPuzzleState() {
  return {
    selected: { row: 0, col: 0 },
    cells: givens.map((row, rowIndex) =>
      row.map((value, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        value,
        fixed: value !== 0,
        notes: notes.get(cellKey(rowIndex, colIndex)) ?? [],
      })),
    ),
  };
}

export function getPeers(row, col) {
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

export function selectCell(state, row, col) {
  return {
    ...state,
    selected: { row, col },
  };
}

export function applyDigit(state, digit) {
  const { row, col } = state.selected;
  const selectedCell = state.cells[row][col];

  if (selectedCell.fixed) {
    return state;
  }

  return {
    ...state,
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
}

export function getCellClasses(state, row, col) {
  const classes = [];
  const key = cellKey(row, col);
  const selectedKey = cellKey(state.selected.row, state.selected.col);
  const selectedValue = state.cells[state.selected.row][state.selected.col].value;
  const cell = state.cells[row][col];

  if (key === selectedKey) {
    classes.push('is-selected');
  }

  if (getPeers(state.selected.row, state.selected.col).has(key)) {
    classes.push('is-peer');
  }

  if (cell.fixed) {
    classes.push('is-fixed');
  }

  if (selectedValue !== 0 && cell.value === selectedValue && key !== selectedKey) {
    classes.push('is-same-value');
  }

  return classes;
}
