export type Difficulty = 'intro' | 'easy' | 'normal' | 'hard';
export type TrainingDifficulty = 'warmup' | 'steady' | 'standard' | 'advanced';

export interface CellPosition {
  row: number;
  col: number;
}

export interface SudokuCell {
  row: number;
  col: number;
  value: number;
  fixed: boolean;
  notes: number[];
}

export interface SudokuLevel {
  id: string;
  title: string;
  label: string;
  difficulty: Difficulty;
  givens: number[][];
  solution: number[][];
  hints: number;
  rules: string[];
  notes: Record<string, number[]>;
}

export interface PuzzleState {
  level: SudokuLevel;
  solution: number[][];
  selected: CellPosition;
  noteMode: boolean;
  completed: boolean;
  history: PuzzleSnapshot[];
  cells: SudokuCell[][];
}

export interface PuzzleSnapshot {
  selected: CellPosition;
  noteMode: boolean;
  completed: boolean;
  cells: SudokuCell[][];
}
