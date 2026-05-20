import { getDuplicateKeys } from '../game/puzzle';
import { PuzzleState, SudokuCell } from '../game/types';

const BOARD_INDEXES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const NOTE_ROWS: number[] = [0, 1, 2];
const NOTE_COLS: number[] = [0, 1, 2];

type SelectCellHandler = (row: number, col: number) => void;

@Component
export struct SudokuBoard {
  @Prop state: PuzzleState;
  onSelect: SelectCellHandler = (row: number, col: number): void => {};

  private cellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private isSelected(row: number, col: number): boolean {
    return this.state.selected.row === row && this.state.selected.col === col;
  }

  private isDuplicate(row: number, col: number): boolean {
    return getDuplicateKeys(this.state).includes(this.cellKey(row, col));
  }

  private getCellBackground(row: number, col: number): string {
    if (this.isDuplicate(row, col)) {
      return this.isSelected(row, col) ? '#F0B85F' : '#F4C873';
    }

    if (this.isSelected(row, col)) {
      return '#F7E2B0';
    }

    return '#FFF9EF';
  }

  private getRightBorderWidth(col: number): number {
    return col === 2 || col === 5 ? 2 : 1;
  }

  private getBottomBorderWidth(row: number): number {
    return row === 2 || row === 5 ? 2 : 1;
  }

  private getDigitColor(cell: SudokuCell): string {
    return cell.fixed ? '#2B2118' : '#7A4E2D';
  }

  private getDigitWeight(cell: SudokuCell): FontWeight {
    return cell.fixed ? FontWeight.Bold : FontWeight.Medium;
  }

  private getNoteDigit(cell: SudokuCell, digit: number): string {
    return cell.notes.includes(digit) ? digit.toString() : '';
  }

  @Builder
  private NoteGrid(cell: SudokuCell) {
    Column() {
      ForEach(NOTE_ROWS, (noteRow: number) => {
        Row() {
          ForEach(NOTE_COLS, (noteCol: number) => {
            Text(this.getNoteDigit(cell, noteRow * 3 + noteCol + 1))
              .width('33.3%')
              .fontSize(10)
              .fontWeight(FontWeight.Medium)
              .fontColor('#9B7A57')
              .textAlign(TextAlign.Center)
          }, (noteCol: number) => noteCol.toString())
        }
        .width('100%')
        .layoutWeight(1)
        .alignItems(VerticalAlign.Center)
      }, (noteRow: number) => noteRow.toString())
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder
  private CellView(row: number, col: number) {
    Stack() {
      if (this.state.cells[row][col].value > 0) {
        Text(this.state.cells[row][col].value.toString())
          .fontSize(24)
          .fontWeight(this.getDigitWeight(this.state.cells[row][col]))
          .fontColor(this.getDigitColor(this.state.cells[row][col]))
          .textAlign(TextAlign.Center)
      } else {
        this.NoteGrid(this.state.cells[row][col])
      }
    }
    .width('11.11%')
    .aspectRatio(1)
    .backgroundColor(this.getCellBackground(row, col))
    .border({
      width: {
        left: col === 0 ? 2 : 0,
        top: row === 0 ? 2 : 0,
        right: this.getRightBorderWidth(col),
        bottom: this.getBottomBorderWidth(row),
      },
      color: '#3A2B1B',
    })
    .onClick(() => {
      this.onSelect(row, col);
    })
  }

  build() {
    Column() {
      ForEach(BOARD_INDEXES, (row: number) => {
        Row() {
          ForEach(BOARD_INDEXES, (col: number) => {
            this.CellView(row, col)
          }, (col: number) => col.toString())
        }
        .width('100%')
      }, (row: number) => row.toString())
    }
    .width('100%')
    .aspectRatio(1)
    .clip(true)
    .borderRadius(18)
    .shadow({
      radius: 18,
      color: '#22000000',
      offsetX: 0,
      offsetY: 8,
    })
  }
}
