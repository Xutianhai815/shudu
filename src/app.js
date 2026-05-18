import {
  applyDigit,
  createPuzzleState,
  getCellClasses,
  selectCell,
} from './puzzle.js';

let state = selectCell(createPuzzleState(), 0, 2);

const board = document.querySelector('#board');
const keypad = document.querySelector('#keypad');
const selectedReadout = document.querySelector('#selectedReadout');

function renderBoard() {
  board.replaceChildren();

  state.cells.flat().forEach((cell) => {
    const button = document.createElement('button');
    button.className = ['cell', ...getCellClasses(state, cell.row, cell.col)].join(' ');
    button.type = 'button';
    button.dataset.row = String(cell.row);
    button.dataset.col = String(cell.col);
    button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}`);

    if (cell.value !== 0) {
      const digit = document.createElement('span');
      digit.className = 'digit';
      digit.textContent = String(cell.value);
      button.append(digit);
    } else if (cell.notes.length > 0) {
      button.append(createNotes(cell.notes));
    }

    button.addEventListener('click', () => {
      state = selectCell(state, cell.row, cell.col);
      render();
    });

    board.append(button);
  });
}

function createNotes(values) {
  const notes = document.createElement('div');
  notes.className = 'notes';

  for (let digit = 1; digit <= 9; digit += 1) {
    const marker = document.createElement('span');
    marker.textContent = values.includes(digit) ? String(digit) : '';
    notes.append(marker);
  }

  return notes;
}

function renderKeypad() {
  keypad.replaceChildren();

  for (let digit = 1; digit <= 9; digit += 1) {
    const button = document.createElement('button');
    button.className = 'key';
    button.type = 'button';
    button.textContent = String(digit);
    button.setAttribute('aria-label', `Input ${digit}`);
    button.addEventListener('click', () => {
      state = applyDigit(state, digit);
      render();
    });
    keypad.append(button);
  }
}

function renderStatus() {
  selectedReadout.textContent = `R${state.selected.row + 1} C${state.selected.col + 1}`;
}

function render() {
  renderBoard();
  renderKeypad();
  renderStatus();
}

render();
