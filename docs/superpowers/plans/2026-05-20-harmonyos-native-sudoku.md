# HarmonyOS Native Sudoku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first playable HarmonyOS native Sudoku app with ArkTS/ArkUI while reusing the current Sudoku product rules, level data, campaign/practice modes, local progress model, and review-safe feedback copy.

**Architecture:** Create a separate `harmonyos/` DevEco Studio application so the WeChat minigame and paused H5 Quick Game remain untouched. Port pure game rules into small ArkTS modules under `entry/src/main/ets/game/`, build native ArkUI pages/components around those modules, and keep persistence/system APIs behind `services/`.

**Tech Stack:** HarmonyOS native Application, DevEco Studio, ArkTS, ArkUI, Preferences/local storage, Git, existing Node tests for migration parity.

---

## Source Spec

- Design spec: `docs/superpowers/specs/2026-05-19-harmonyos-native-sudoku-design.md`
- Existing logic references:
  - `minigame/src/puzzle.js`
  - `minigame/src/levels.js`
  - `minigame/src/game-modes.js`
  - `minigame/src/companion-feedback.js`
  - `minigame/src/derust.js`
  - `minigame/src/growth-stats.js`

## File Structure

Create this DevEco Studio project structure:

```text
harmonyos/
  AppScope/
  entry/
    src/main/ets/
      entryability/EntryAbility.ets
      pages/Index.ets
      pages/GamePage.ets
      pages/PracticePage.ets
      pages/VictoryPage.ets
      components/SudokuBoard.ets
      components/DigitPad.ets
      components/ToolBar.ets
      components/FeedbackToast.ets
      game/types.ets
      game/levels.ets
      game/puzzle.ets
      game/modes.ets
      game/feedback.ets
      game/progress.ets
      services/storage.ets
      services/sound.ets
      services/localEvents.ets
    src/main/resources/base/element/string.json
    src/main/resources/base/media/app_icon.png
  oh-package.json5
```

Responsibilities:

- `game/`: pure ArkTS rules and state transitions. No ArkUI, no storage, no device APIs.
- `components/`: reusable ArkUI UI pieces. They receive state and callback props only.
- `pages/`: screen-level composition and navigation.
- `services/`: HarmonyOS APIs and side effects. First version stores data locally and does not collect or upload user data.

## Commit Policy

- Commit after each task.
- Do not add `output/` preview files.
- Do not modify `minigame/` unless the task explicitly says to add parity notes or run tests.
- Do not continue `huawei-h5/`; it remains paused.
- Hvigor does not accept the current repository path because it contains the Chinese directory name `微信小游戏`. DevEco build, preview, device run, and release packaging must use an ASCII/English-path worktree or copy, such as `/private/tmp/LabLinesSudoku`.

---

### Task 1: DevEco Project Scaffold

**Files:**
- Create: `harmonyos/`
- Create: `harmonyos/README.md`
- Create: DevEco-generated app files under `harmonyos/AppScope/` and `harmonyos/entry/`
- Modify: `.gitignore`

- [ ] **Step 1: Verify current branch and dirty state**

Run:

```bash
git branch --show-current
git status --short
```

Expected:

```text
feature/harmonyos-native-app
```

`output/` may be untracked. Do not stage it.

- [ ] **Step 2: Create the HarmonyOS project in DevEco Studio**

Use DevEco Studio:

```text
Create Project
Template: Application / Empty Ability
Language: ArkTS
UI: ArkUI
Project name: LabLinesSudoku
Save location: /Users/tianhai/Documents/微信小游戏/harmonyos
Bundle name: com.lablines.sudoku
Compatible SDK: use the installed default SDK for the target HarmonyOS release
Device type: Phone
```

Expected result: DevEco Studio creates a buildable `harmonyos/` project.

- [ ] **Step 3: Add HarmonyOS README**

Create `harmonyos/README.md`:

```markdown
# Lab Lines Sudoku HarmonyOS

HarmonyOS 原生数独应用工程。

当前目标：

- 使用 ArkTS 和 ArkUI 开发原生应用。
- 复用现有数独核心规则、关卡、模式和正反馈方向。
- 第一版保持离线可玩，不接入广告、支付、登录、排行榜或云同步。
- 华为 H5 快游戏方向已暂停，`huawei-h5/` 仅保留历史验证结果。

开发入口：

- DevEco Studio 打开本目录。
- 手机竖屏优先。
- 第一阶段先完成首页、闯关、练习、数独盘、输入、草稿、清除、重新开始、完成反馈和本地恢复。
```

- [ ] **Step 4: Update `.gitignore`**

Add these entries if missing:

```gitignore
# HarmonyOS / DevEco Studio generated local files
harmonyos/.idea/
harmonyos/.hvigor/
harmonyos/build/
harmonyos/**/build/
harmonyos/**/.preview/
harmonyos/**/generated/
```

- [ ] **Step 5: Build through DevEco Studio**

Use DevEco Studio `Build > Make Project`.

Expected: project builds without compile errors.

- [ ] **Step 6: Commit**

```bash
git add .gitignore harmonyos
git commit -m "chore: scaffold harmonyos native app"
```

---

### Task 2: Port Core Types and Level Data

**Files:**
- Create: `harmonyos/entry/src/main/ets/game/types.ets`
- Create: `harmonyos/entry/src/main/ets/game/levels.ets`
- Test: DevEco project test/build target

- [ ] **Step 1: Add game types**

Create `harmonyos/entry/src/main/ets/game/types.ets`:

```ts
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
```

- [ ] **Step 2: Add level parser and first 24 levels**

Create `harmonyos/entry/src/main/ets/game/levels.ets` with the same 24 level ids, titles, labels, difficulty bands, `givens`, and `solution` strings from `minigame/src/levels.js`.

Use this parser exactly:

```ts
import { SudokuLevel } from './types';

interface LevelSpec {
  id: string;
  title: string;
  label: string;
  difficulty: SudokuLevel['difficulty'];
  givens: string;
  solution: string;
}

const LEVEL_SPECS: LevelSpec[] = [
  { id: 'lab-01', title: '起步热身', label: 'LAB-01', difficulty: 'intro', givens: '438020500005000000001458370100740029200815743047030615670103000314060000502974136', solution: '438627591725391468961458372153746829296815743847239615679183254314562987582974136' },
  { id: 'lab-02', title: '九宫巡检', label: 'LAB-02', difficulty: 'intro', givens: '490053108073984562800610040700000000014020007320049600940172030607095001000408059', solution: '496253178173984562852617943769531284514826397328749615945172836687395421231468759' },
  { id: 'lab-03', title: '行列对齐', label: 'LAB-03', difficulty: 'intro', givens: '082315090030006810000009300503204068204180900090007030300572000009460023720030041', solution: '682315497935746812417829356573294168264183975198657234341572689859461723726938541' },
  { id: 'lab-04', title: '轻量推理', label: 'LAB-04', difficulty: 'intro', givens: '040518007759036108130090040090050703571080094423000000000900070200060480000840000', solution: '642518937759436128138792546896254713571683294423179865384925671215367489967841352' },
  { id: 'lab-05', title: '草稿练习', label: 'LAB-05', difficulty: 'easy', givens: '007809126000007534600230800046300200000015060085006001302081000000070000500000713', solution: '437859126829167534651234879146398257293715468785426391372681945914573682568942713' },
  { id: 'lab-06', title: '稳定发挥', label: 'LAB-06', difficulty: 'easy', givens: '020000100005024030080007600002068070736200480010005300000740000203809000009010240', solution: '327986154695124837184537629452368971736291485918475362861742593243859716579613248' },
  { id: 'lab-07', title: '隐藏线索', label: 'LAB-07', difficulty: 'easy', givens: '690000820024009700000000000500427000200000305008000000950080013046150070807000560', solution: '693571824124839756785264139539427681271698345468315297952786413346152978817943562' },
  { id: 'lab-08', title: '双区联动', label: 'LAB-08', difficulty: 'easy', givens: '306904050080000000705160000000207460030006901050091000003050804020000000900700003', solution: '316924758289375146745168239891237465432586971657491382173659824524813697968742513' },
  { id: 'lab-09', title: '中段加速', label: 'LAB-09', difficulty: 'easy', givens: '870000310100020000020000007090000706007008034040097000900270100000003470030500020', solution: '879465312153729648426831597591342786267158934348697251985274163612983475734516829' },
  { id: 'lab-10', title: '深度排除', label: 'LAB-10', difficulty: 'easy', givens: '050000309903000004000090182090000020200000030601020800020016000006080040709003000', solution: '152648379983172564467395182894531726275869431631724895328416957516987243749253618' },
  { id: 'lab-11', title: '专注挑战', label: 'LAB-11', difficulty: 'normal', givens: '105070349009005000300600002000000060020040000700206014007000006008000000600007530', solution: '165872349279435681384691752451789263826143975793256814517328496938564127642917538' },
  { id: 'lab-12', title: '首轮毕业', label: 'LAB-12', difficulty: 'normal', givens: '002000870700060040340000005805740000000001000010082500000007096060014000083000000', solution: '652493871798165243341278965835749612276351489419682537524837196967514328183926754' },
  { id: 'lab-13', title: '宫位接力', label: 'LAB-13', difficulty: 'normal', givens: '502006000943000020008250000030002000400790030050300000000120005080070040000003097', solution: '512936784943817526678254913137482659426795138859361472794128365385679241261543897' },
  { id: 'lab-14', title: '斜线排查', label: 'LAB-14', difficulty: 'normal', givens: '605000000200907006000160500000078620004000080000600400030004700046080050700096000', solution: '615843972283957146479162538391478625564219387827635491138524769946781253752396814' },
  { id: 'lab-15', title: '候选压缩', label: 'LAB-15', difficulty: 'normal', givens: '000700000180046000092051060040090500000300000600005207908600000030000010001500009', solution: '456739128187246953392851764243197586875362491619485237928614375534978612761523849' },
  { id: 'lab-16', title: '链路追踪', label: 'LAB-16', difficulty: 'normal', givens: '700049000050000000900000620300004005520090000016200809103750000067020030000000000', solution: '782649153651372498934518627379864215528197346416235879143756982867921534295483761' },
  { id: 'lab-17', title: '节奏校准', label: 'LAB-17', difficulty: 'normal', givens: '506247900700000005002008010080000400000010000009064081900001000300000000001520009', solution: '516247938798136245432958716183795462654812397279364581965471823327689154841523679' },
  { id: 'lab-18', title: '整盘统筹', label: 'LAB-18', difficulty: 'normal', givens: '093040006802000340060000000000004502007200800000830090080107000000000053026000007', solution: '793548216812679345564321978938714562647295831251836794385167429179482653426953187' },
  { id: 'lab-19', title: '少线突破', label: 'LAB-19', difficulty: 'hard', givens: '900501000360040000080300070000020005050000684000900007040603800000050000000000090', solution: '924571368367849521185362479873426915259137684416985237741693852692758143538214796' },
  { id: 'lab-20', title: '双宫锁定', label: 'LAB-20', difficulty: 'hard', givens: '030900000402003009000600000003000000000010500057009013000800004085007900010002030', solution: '538974126462153789791628345123745698849316572657289413376891254285437961914562837' },
  { id: 'lab-21', title: '高阶排除', label: 'LAB-21', difficulty: 'hard', givens: '020805001007009005509100000000000070000046200380000000000410300200008000060030000', solution: '426875931817329645539164728645283179971546283382791564758412396293658417164937852' },
  { id: 'lab-22', title: '极限专注', label: 'LAB-22', difficulty: 'hard', givens: '090010000000060000507009001000800020023001809009000000000040005042003010080007900', solution: '294315786318764592567289431451896327623471859879532164936148275742953618185627943' },
  { id: 'lab-23', title: '终盘试炼', label: 'LAB-23', difficulty: 'hard', givens: '008005000000962500010003000450000010002000970070030600790600200000010000005000000', solution: '928145367347962581516873429453796812162584973879231645791658234284319756635427198' },
  { id: 'lab-24', title: '大师复盘', label: 'LAB-24', difficulty: 'hard', givens: '039000000400000902200004057000150000021407030000000480900000000070803010000000200', solution: '739526148485371962216984357394158726821467539657239481943612875572893614168745293' },
];

function parseGrid(value: string): number[][] {
  if (value.length !== 81) {
    throw new Error('Sudoku grid must be an 81-character string.');
  }

  const rows: number[][] = [];
  for (let row = 0; row < 9; row += 1) {
    const cells: number[] = [];
    for (let col = 0; col < 9; col += 1) {
      const digit = Number(value[row * 9 + col]);
      if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
        throw new Error('Sudoku grid can only contain digits from 0 to 9.');
      }
      cells.push(digit);
    }
    rows.push(cells);
  }
  return rows;
}

export const levels: SudokuLevel[] = LEVEL_SPECS.map((level: LevelSpec): SudokuLevel => ({
  ...level,
  hints: 3,
  rules: ['classic'],
  givens: parseGrid(level.givens),
  solution: parseGrid(level.solution),
  notes: {},
}));

export function getLevelById(id: string): SudokuLevel {
  const level = levels.find((item: SudokuLevel) => item.id === id);
  if (!level) {
    throw new Error(`Unknown level: ${id}`);
  }
  return level;
}
```

- [ ] **Step 3: Build**

Run through DevEco Studio:

```text
Build > Make Project
```

Expected: ArkTS compile succeeds.

- [ ] **Step 4: Commit**

```bash
git add harmonyos/entry/src/main/ets/game/types.ets harmonyos/entry/src/main/ets/game/levels.ets
git commit -m "feat: port harmonyos sudoku levels"
```

---

### Task 3: Port Puzzle State and Rules

**Files:**
- Create: `harmonyos/entry/src/main/ets/game/puzzle.ets`
- Test: DevEco test/build target

- [ ] **Step 1: Add puzzle rule module**

Create `harmonyos/entry/src/main/ets/game/puzzle.ets`:

```ts
import { CellPosition, PuzzleSnapshot, PuzzleState, SudokuCell, SudokuLevel } from './types';
import { levels } from './levels';

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
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

export function createPuzzleState(level: SudokuLevel = levels[0]): PuzzleState {
  const selected = findInitialSelected(level.givens);
  return {
    level,
    solution: level.solution,
    selected,
    noteMode: false,
    completed: false,
    history: [],
    cells: level.givens.map((row: number[], rowIndex: number) =>
      row.map((value: number, colIndex: number) => ({
        row: rowIndex,
        col: colIndex,
        value,
        fixed: value !== 0,
        notes: [...(level.notes[cellKey(rowIndex, colIndex)] ?? [])],
      })),
    ),
  };
}

export function selectCell(state: PuzzleState, row: number, col: number): PuzzleState {
  if (row < 0 || row > 8 || col < 0 || col > 8) {
    return state;
  }
  return { ...state, selected: { row, col } };
}

export function toggleNoteMode(state: PuzzleState): PuzzleState {
  if (state.completed) {
    return state;
  }
  return { ...state, noteMode: !state.noteMode };
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
      return { ...cell, value: 0, notes: nextNotes };
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
      return { ...cell, value: digit, notes: [] };
    }),
  );

  const nextState: PuzzleState = {
    ...state,
    history: pushHistory(state),
    cells: nextCells,
  };

  return { ...nextState, completed: isSolved(nextState) };
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
        return { ...cell, value: 0, notes: [] };
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
  const duplicates = new Set<string>();

  for (let row = 0; row < 9; row += 1) {
    markDuplicateGroup(state, duplicates, Array.from({ length: 9 }, (_, col: number) => ({ row, col })));
  }

  for (let col = 0; col < 9; col += 1) {
    markDuplicateGroup(state, duplicates, Array.from({ length: 9 }, (_, row: number) => ({ row, col })));
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
```

- [ ] **Step 2: Build**

Run:

```text
Build > Make Project
```

Expected: no ArkTS compile errors.

- [ ] **Step 3: Manual parity check in code**

Confirm these behaviors match `minigame/src/puzzle.js`:

```text
fixed clue cannot be edited
note mode toggles candidates and clears answer value
normal digit input clears notes
duplicate detection only marks repeated peer digits
completion depends on exact solution match
restart resets to original givens
```

- [ ] **Step 4: Commit**

```bash
git add harmonyos/entry/src/main/ets/game/puzzle.ets
git commit -m "feat: port harmonyos sudoku puzzle rules"
```

---

### Task 4: Port Modes, Progress, Feedback, and Storage Contracts

**Files:**
- Create: `harmonyos/entry/src/main/ets/game/modes.ets`
- Create: `harmonyos/entry/src/main/ets/game/feedback.ets`
- Create: `harmonyos/entry/src/main/ets/game/progress.ets`
- Create: `harmonyos/entry/src/main/ets/services/storage.ets`
- Create: `harmonyos/entry/src/main/ets/services/sound.ets`
- Create: `harmonyos/entry/src/main/ets/services/localEvents.ets`

- [ ] **Step 1: Add mode helpers**

Create `harmonyos/entry/src/main/ets/game/modes.ets`:

```ts
import { Difficulty, SudokuLevel, TrainingDifficulty } from './types';

export interface TrainingOption {
  trainingDifficulty: TrainingDifficulty;
  label: string;
  sourceDifficulty: Difficulty;
  description: string;
  recommendationText: string;
}

export const trainingOptions: TrainingOption[] = [
  { trainingDifficulty: 'warmup', label: '热身', sourceDifficulty: 'intro', description: '先找确定线索，适合轻量开局。', recommendationText: '适合从这里开始' },
  { trainingDifficulty: 'steady', label: '稳定', sourceDifficulty: 'easy', description: '节奏稳定，适合日常练习。', recommendationText: '接近你当前闯关节奏' },
  { trainingDifficulty: 'standard', label: '标准', sourceDifficulty: 'normal', description: '需要完整推理，慢慢拆线索。', recommendationText: '适合完整推理练习' },
  { trainingDifficulty: 'advanced', label: '进阶', sourceDifficulty: 'hard', description: '长局专注，不急着快。', recommendationText: '适合专注长局' },
];

export function getTrainingOption(trainingDifficulty: TrainingDifficulty): TrainingOption | null {
  return trainingOptions.find((item: TrainingOption) => item.trainingDifficulty === trainingDifficulty) ?? null;
}

export function choosePracticeLevel(levels: SudokuLevel[], trainingDifficulty: TrainingDifficulty, recentLevelId: string | null): SudokuLevel | null {
  const option = getTrainingOption(trainingDifficulty);
  if (!option) {
    return null;
  }
  const candidates = levels.filter((level: SudokuLevel) => level.difficulty === option.sourceDifficulty);
  if (candidates.length === 0) {
    return null;
  }
  return candidates.find((level: SudokuLevel) => level.id !== recentLevelId) ?? candidates[0];
}
```

- [ ] **Step 2: Add progress model**

Create `harmonyos/entry/src/main/ets/game/progress.ets`:

```ts
import { PuzzleSnapshot } from './types';

export interface SavedRun {
  mode: 'campaign' | 'practice';
  levelId: string;
  trainingDifficulty: string | null;
  snapshot: PuzzleSnapshot;
}

export interface AppProgress {
  schemaVersion: number;
  campaignRun: SavedRun | null;
  practiceRun: SavedRun | null;
  completedLevelIds: string[];
  practiceStats: {
    totalCompleted: number;
    lastTrainingDifficulty: string | null;
    recentLevelIdsByTrainingDifficulty: Record<string, string | null>;
  };
  growthStats: {
    totalCompleted: number;
    streakDays: number;
    lastPlayedDate: string | null;
  };
}

export function createEmptyProgress(): AppProgress {
  return {
    schemaVersion: 1,
    campaignRun: null,
    practiceRun: null,
    completedLevelIds: [],
    practiceStats: {
      totalCompleted: 0,
      lastTrainingDifficulty: null,
      recentLevelIdsByTrainingDifficulty: {
        warmup: null,
        steady: null,
        standard: null,
        advanced: null,
      },
    },
    growthStats: {
      totalCompleted: 0,
      streakDays: 0,
      lastPlayedDate: null,
    },
  };
}
```

- [ ] **Step 3: Add feedback copy**

Create `harmonyos/entry/src/main/ets/game/feedback.ets`:

```ts
export interface CompletionFeedback {
  title: string;
  subtitle: string;
  primaryStat: string;
  secondaryStat: string;
}

export function createCompletionFeedback(totalCompleted: number, streakDays: number): CompletionFeedback {
  const safeTotal = Math.max(1, totalCompleted);
  const safeStreak = Math.max(0, streakDays);
  return {
    title: '这一局，大脑除锈完成',
    subtitle: '没有追求速度，只是稳稳把线索理顺了。',
    primaryStat: `累计完成 ${safeTotal} 局`,
    secondaryStat: safeStreak > 1 ? `连续练习 ${safeStreak} 天` : '今天已完成一次练习',
  };
}
```

- [ ] **Step 4: Add storage service contract**

Create `harmonyos/entry/src/main/ets/services/storage.ets`:

```ts
import { AppProgress, createEmptyProgress } from '../game/progress';

const STORAGE_KEY = 'lab_lines_sudoku_progress_v1';

export async function loadProgress(): Promise<AppProgress> {
  // Task 8 upgrades this service to HarmonyOS Preferences.
  // This in-memory fallback keeps page work compileable before platform API wiring.
  const globalStore = globalThis as Record<string, string | undefined>;
  const raw = globalStore[STORAGE_KEY];
  if (!raw) {
    return createEmptyProgress();
  }

  try {
    return JSON.parse(raw) as AppProgress;
  } catch (_) {
    return createEmptyProgress();
  }
}

export async function saveProgress(progress: AppProgress): Promise<void> {
  const globalStore = globalThis as Record<string, string | undefined>;
  globalStore[STORAGE_KEY] = JSON.stringify(progress);
}
```

- [ ] **Step 5: Add sound and local event no-op services**

Create `harmonyos/entry/src/main/ets/services/sound.ets`:

```ts
export type SoundKey = 'select' | 'input' | 'tool' | 'complete';

export function playSound(_key: SoundKey): void {
  // First HarmonyOS MVP keeps sound optional. Wire native audio after core gameplay is stable.
}
```

Create `harmonyos/entry/src/main/ets/services/localEvents.ets`:

```ts
export interface LocalEvent {
  name: string;
  createdAt: number;
}

export function recordLocalEvent(_event: LocalEvent): void {
  // First version does not collect or upload user data.
}
```

- [ ] **Step 6: Build and commit**

Run:

```text
Build > Make Project
```

Expected: no compile errors.

Commit:

```bash
git add harmonyos/entry/src/main/ets/game/modes.ets harmonyos/entry/src/main/ets/game/feedback.ets harmonyos/entry/src/main/ets/game/progress.ets harmonyos/entry/src/main/ets/services/storage.ets harmonyos/entry/src/main/ets/services/sound.ets harmonyos/entry/src/main/ets/services/localEvents.ets
git commit -m "feat: add harmonyos game flow contracts"
```

---

### Task 5: Build Native ArkUI Home and Practice Screens

**Files:**
- Modify: `harmonyos/entry/src/main/ets/pages/Index.ets`
- Create: `harmonyos/entry/src/main/ets/pages/PracticePage.ets`

- [ ] **Step 1: Implement native home page**

Replace `harmonyos/entry/src/main/ets/pages/Index.ets` with:

```ts
@Entry
@Component
struct Index {
  build() {
    Column({ space: 22 }) {
      Text('数独实验室')
        .fontSize(34)
        .fontWeight(FontWeight.Bold)
        .fontColor('#263227')

      Text('每天一局，给大脑做一次轻量除锈。')
        .fontSize(16)
        .fontColor('#6C756B')
        .textAlign(TextAlign.Center)

      Button('闯关挑战')
        .fontSize(20)
        .height(58)
        .width('84%')
        .backgroundColor('#2F6B4F')
        .onClick(() => {
          router.pushUrl({ url: 'pages/GamePage', params: { mode: 'campaign' } });
        })

      Button('自由练习')
        .fontSize(20)
        .height(58)
        .width('84%')
        .fontColor('#2F6B4F')
        .backgroundColor('#E5F0E7')
        .onClick(() => {
          router.pushUrl({ url: 'pages/PracticePage' });
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#F8F3E7')
    .padding({ left: 24, right: 24 })
  }
}
```

If DevEco reports `router` is missing, add this import at the top:

```ts
import router from '@ohos.router';
```

- [ ] **Step 2: Implement practice difficulty page**

Create `harmonyos/entry/src/main/ets/pages/PracticePage.ets`:

```ts
import router from '@ohos.router';
import { trainingOptions } from '../game/modes';

@Entry
@Component
struct PracticePage {
  build() {
    Column({ space: 16 }) {
      Text('自由练习')
        .fontSize(30)
        .fontWeight(FontWeight.Bold)
        .fontColor('#263227')

      Text('选择今天想练的节奏。')
        .fontSize(16)
        .fontColor('#6C756B')

      ForEach(trainingOptions, (option) => {
        Button(`${option.label} · ${option.description}`)
          .fontSize(17)
          .height(56)
          .width('88%')
          .fontColor('#263227')
          .backgroundColor('#FFFFFF')
          .onClick(() => {
            router.pushUrl({
              url: 'pages/GamePage',
              params: {
                mode: 'practice',
                trainingDifficulty: option.trainingDifficulty,
              },
            });
          })
      }, (option) => option.trainingDifficulty)

      Button('返回首页')
        .fontSize(16)
        .height(48)
        .width('88%')
        .fontColor('#6C756B')
        .backgroundColor('#EFE8D7')
        .onClick(() => router.back())
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#F8F3E7')
    .padding({ left: 18, right: 18 })
  }
}
```

- [ ] **Step 3: Register pages if DevEco template requires it**

Open `harmonyos/entry/src/main/resources/base/profile/main_pages.json` or the generated page registry file.

Ensure it includes:

```json
{
  "src": [
    "pages/Index",
    "pages/PracticePage",
    "pages/GamePage",
    "pages/VictoryPage"
  ]
}
```

- [ ] **Step 4: Run on previewer or simulator**

Expected:

```text
Home page shows 数独实验室.
闯关挑战 can navigate toward GamePage after Task 7 creates it.
自由练习 opens PracticePage.
Difficulty buttons are visible and large enough for touch.
```

- [ ] **Step 5: Commit**

```bash
git add harmonyos/entry/src/main/ets/pages/Index.ets harmonyos/entry/src/main/ets/pages/PracticePage.ets harmonyos/entry/src/main/resources/base/profile/main_pages.json
git commit -m "feat: add harmonyos home and practice screens"
```

---

### Task 6: Build Sudoku Board, Digit Pad, and Tools Components

**Files:**
- Create: `harmonyos/entry/src/main/ets/components/SudokuBoard.ets`
- Create: `harmonyos/entry/src/main/ets/components/DigitPad.ets`
- Create: `harmonyos/entry/src/main/ets/components/ToolBar.ets`
- Create: `harmonyos/entry/src/main/ets/components/FeedbackToast.ets`

- [ ] **Step 1: Create Sudoku board component**

Create `harmonyos/entry/src/main/ets/components/SudokuBoard.ets`:

```ts
import { PuzzleState } from '../game/types';
import { getDuplicateKeys } from '../game/puzzle';

@Component
export struct SudokuBoard {
  @Prop state: PuzzleState;
  onSelect: (row: number, col: number) => void = () => {};

  private cellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  build() {
    Grid() {
      ForEach(this.state.cells.flat(), (cell) => {
        GridItem() {
          Text(cell.value > 0 ? `${cell.value}` : cell.notes.join(' '))
            .fontSize(cell.value > 0 ? 22 : 10)
            .fontWeight(cell.fixed ? FontWeight.Bold : FontWeight.Medium)
            .fontColor(cell.fixed ? '#1F2A22' : '#2F6B4F')
            .width('100%')
            .height('100%')
            .textAlign(TextAlign.Center)
            .backgroundColor(this.getCellBackground(cell.row, cell.col))
            .onClick(() => this.onSelect(cell.row, cell.col))
        }
        .border({
          width: this.getBorderWidth(cell.row, cell.col),
          color: '#8B927F',
        })
      }, (cell) => this.cellKey(cell.row, cell.col))
    }
    .columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr')
    .rowsTemplate('1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr')
    .width('92%')
    .aspectRatio(1)
  }

  private getCellBackground(row: number, col: number): string {
    const duplicateKeys = getDuplicateKeys(this.state);
    if (duplicateKeys.includes(this.cellKey(row, col))) {
      return '#F4D38A';
    }
    if (this.state.selected.row === row && this.state.selected.col === col) {
      return '#DDEBDD';
    }
    return '#FFFDF6';
  }

  private getBorderWidth(row: number, col: number): number {
    return row % 3 === 0 || col % 3 === 0 ? 1.4 : 0.7;
  }
}
```

- [ ] **Step 2: Create digit pad**

Create `harmonyos/entry/src/main/ets/components/DigitPad.ets`:

```ts
@Component
export struct DigitPad {
  noteMode: boolean = false;
  onDigit: (digit: number) => void = () => {};

  build() {
    Row({ space: 6 }) {
      ForEach([1, 2, 3, 4, 5, 6, 7, 8, 9], (digit: number) => {
        Button(`${digit}`)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.noteMode ? '#7B5D1E' : '#263227')
          .backgroundColor(this.noteMode ? '#F3D98E' : '#FFFFFF')
          .height(48)
          .layoutWeight(1)
          .onClick(() => this.onDigit(digit))
      }, (digit: number) => `${digit}`)
    }
    .width('92%')
  }
}
```

- [ ] **Step 3: Create toolbar**

Create `harmonyos/entry/src/main/ets/components/ToolBar.ets`:

```ts
@Component
export struct ToolBar {
  noteMode: boolean = false;
  onToggleNote: () => void = () => {};
  onErase: () => void = () => {};
  onRestart: () => void = () => {};

  build() {
    Row({ space: 10 }) {
      Button(this.noteMode ? '草稿中' : '草稿模式')
        .fontSize(15)
        .fontColor(this.noteMode ? '#7B5D1E' : '#263227')
        .backgroundColor(this.noteMode ? '#F3D98E' : '#FFFFFF')
        .layoutWeight(1)
        .height(46)
        .onClick(() => this.onToggleNote())

      Button('清除')
        .fontSize(15)
        .fontColor('#263227')
        .backgroundColor('#FFFFFF')
        .layoutWeight(1)
        .height(46)
        .onClick(() => this.onErase())

      Button('重新开始')
        .fontSize(15)
        .fontColor('#263227')
        .backgroundColor('#FFFFFF')
        .layoutWeight(1)
        .height(46)
        .onClick(() => this.onRestart())
    }
    .width('92%')
  }
}
```

- [ ] **Step 4: Create feedback toast**

Create `harmonyos/entry/src/main/ets/components/FeedbackToast.ets`:

```ts
@Component
export struct FeedbackToast {
  text: string = '';

  build() {
    Text(this.text)
      .fontSize(14)
      .fontColor('#4B5B4E')
      .backgroundColor('#E9F0E5')
      .borderRadius(16)
      .padding({ left: 14, right: 14, top: 8, bottom: 8 })
      .visibility(this.text.length > 0 ? Visibility.Visible : Visibility.Hidden)
  }
}
```

- [ ] **Step 5: Build and commit**

Run:

```text
Build > Make Project
```

Expected: no compile errors.

Commit:

```bash
git add harmonyos/entry/src/main/ets/components/SudokuBoard.ets harmonyos/entry/src/main/ets/components/DigitPad.ets harmonyos/entry/src/main/ets/components/ToolBar.ets harmonyos/entry/src/main/ets/components/FeedbackToast.ets
git commit -m "feat: add harmonyos sudoku play components"
```

---

### Task 7: Build Game Page and Completion Flow

**Files:**
- Create: `harmonyos/entry/src/main/ets/pages/GamePage.ets`
- Create: `harmonyos/entry/src/main/ets/pages/VictoryPage.ets`
- Modify: `harmonyos/entry/src/main/resources/base/profile/main_pages.json`

- [ ] **Step 1: Implement game page state flow**

Create `harmonyos/entry/src/main/ets/pages/GamePage.ets`:

```ts
import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { DigitPad } from '../components/DigitPad';
import { FeedbackToast } from '../components/FeedbackToast';
import { SudokuBoard } from '../components/SudokuBoard';
import { ToolBar } from '../components/ToolBar';
import { levels } from '../game/levels';
import { choosePracticeLevel } from '../game/modes';
import { applyDigit, createPuzzleState, eraseSelected, restartLevel, selectCell, toggleNoteMode } from '../game/puzzle';
import { PuzzleState, TrainingDifficulty } from '../game/types';
import { playSound } from '../services/sound';

@Entry
@Component
struct GamePage {
  @State state: PuzzleState = createPuzzleState(levels[0]);
  @State mode: string = 'campaign';
  @State trainingDifficulty: TrainingDifficulty = 'warmup';
  @State toastText: string = '只提示重复，不判断对错。';

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    this.mode = params.mode ?? 'campaign';
    this.trainingDifficulty = (params.trainingDifficulty ?? 'warmup') as TrainingDifficulty;
    if (this.mode === 'practice') {
      const level = choosePracticeLevel(levels, this.trainingDifficulty, null) ?? levels[0];
      this.state = createPuzzleState(level);
    } else {
      this.state = createPuzzleState(levels[0]);
    }
  }

  build() {
    Column({ space: 14 }) {
      Row() {
        Button('返回')
          .fontSize(14)
          .backgroundColor('#EFE8D7')
          .fontColor('#263227')
          .onClick(() => router.back())

        Text(`${this.state.level.label} · ${this.state.level.title}`)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#263227')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
      }
      .width('92%')

      SudokuBoard({
        state: this.state,
        onSelect: (row: number, col: number) => {
          this.state = selectCell(this.state, row, col);
          playSound('select');
        },
      })

      FeedbackToast({ text: this.toastText })

      ToolBar({
        noteMode: this.state.noteMode,
        onToggleNote: () => {
          this.state = toggleNoteMode(this.state);
          this.toastText = this.state.noteMode ? '草稿模式已开启。' : '已回到正式填写。';
          playSound('tool');
        },
        onErase: () => {
          this.state = eraseSelected(this.state);
          this.toastText = '已清除当前格。';
          playSound('tool');
        },
        onRestart: () => {
          promptAction.showDialog({
            title: '重新开始？',
            message: '会清空本局已填写的数字和草稿。',
            buttons: [
              { text: '取消', color: '#6C756B' },
              { text: '重新开始', color: '#2F6B4F' },
            ],
          }).then((result) => {
            if (result.index === 1) {
              this.state = restartLevel(this.state);
              this.toastText = '已重新开始本局。';
            }
          });
        },
      })

      DigitPad({
        noteMode: this.state.noteMode,
        onDigit: (digit: number) => {
          this.state = applyDigit(this.state, digit);
          this.toastText = this.state.noteMode ? '草稿已更新。' : '已填写。';
          playSound('input');
          if (this.state.completed) {
            playSound('complete');
            router.replaceUrl({ url: 'pages/VictoryPage', params: { mode: this.mode } });
          }
        },
      })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#F8F3E7')
  }
}
```

- [ ] **Step 2: Implement victory page**

Create `harmonyos/entry/src/main/ets/pages/VictoryPage.ets`:

```ts
import router from '@ohos.router';
import { createCompletionFeedback } from '../game/feedback';

@Entry
@Component
struct VictoryPage {
  private feedback = createCompletionFeedback(1, 1);

  build() {
    Column({ space: 18 }) {
      Text(this.feedback.title)
        .fontSize(30)
        .fontWeight(FontWeight.Bold)
        .fontColor('#263227')
        .textAlign(TextAlign.Center)

      Text(this.feedback.subtitle)
        .fontSize(16)
        .fontColor('#6C756B')
        .textAlign(TextAlign.Center)

      Text(this.feedback.primaryStat)
        .fontSize(18)
        .fontColor('#2F6B4F')

      Text(this.feedback.secondaryStat)
        .fontSize(18)
        .fontColor('#2F6B4F')

      Button('继续')
        .fontSize(20)
        .height(56)
        .width('84%')
        .backgroundColor('#2F6B4F')
        .onClick(() => router.back())

      Button('回到首页')
        .fontSize(18)
        .height(52)
        .width('84%')
        .fontColor('#2F6B4F')
        .backgroundColor('#E5F0E7')
        .onClick(() => router.replaceUrl({ url: 'pages/Index' }))
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#F8F3E7')
    .padding({ left: 24, right: 24 })
  }
}
```

- [ ] **Step 3: Build and run manually**

Use DevEco Studio simulator or real device.

Expected:

```text
Home -> 闯关挑战 opens GamePage.
Tap empty cell -> selected highlight changes.
Tap digit -> value appears.
草稿模式 changes digit pad color and writes notes.
清除 clears mutable selected cell.
重新开始 shows confirmation before reset.
Duplicate values show amber full-cell background.
```

- [ ] **Step 4: Commit**

```bash
git add harmonyos/entry/src/main/ets/pages/GamePage.ets harmonyos/entry/src/main/ets/pages/VictoryPage.ets harmonyos/entry/src/main/resources/base/profile/main_pages.json
git commit -m "feat: add harmonyos playable sudoku flow"
```

---

### Task 8: Replace Temporary Storage with HarmonyOS Preferences

**Files:**
- Modify: `harmonyos/entry/src/main/ets/services/storage.ets`
- Modify: `harmonyos/entry/src/main/ets/pages/GamePage.ets`

- [ ] **Step 1: Implement Preferences-backed storage**

Replace `harmonyos/entry/src/main/ets/services/storage.ets` with:

```ts
import dataPreferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';
import { AppProgress, createEmptyProgress } from '../game/progress';

const STORE_NAME = 'lab_lines_sudoku_store';
const STORAGE_KEY = 'lab_lines_sudoku_progress_v1';

let appContext: common.Context | null = null;

export function configureStorage(context: common.Context): void {
  appContext = context;
}

export async function loadProgress(): Promise<AppProgress> {
  if (!appContext) {
    return createEmptyProgress();
  }

  try {
    const store = await dataPreferences.getPreferences(appContext, STORE_NAME);
    const raw = await store.get(STORAGE_KEY, '');
    if (typeof raw !== 'string' || raw.length === 0) {
      return createEmptyProgress();
    }
    return JSON.parse(raw) as AppProgress;
  } catch (_) {
    return createEmptyProgress();
  }
}

export async function saveProgress(progress: AppProgress): Promise<void> {
  if (!appContext) {
    return;
  }

  const store = await dataPreferences.getPreferences(appContext, STORE_NAME);
  await store.put(STORAGE_KEY, JSON.stringify(progress));
  await store.flush();
}
```

- [ ] **Step 2: Configure storage in EntryAbility**

Modify `harmonyos/entry/src/main/ets/entryability/EntryAbility.ets`:

```ts
import { configureStorage } from '../services/storage';
```

In `onCreate`, add:

```ts
configureStorage(this.context);
```

- [ ] **Step 3: Wire minimal save-on-completion**

In `GamePage.ets`, import:

```ts
import { createEmptyProgress } from '../game/progress';
import { saveProgress } from '../services/storage';
```

Inside the `if (this.state.completed)` block, before navigation:

```ts
const progress = createEmptyProgress();
progress.completedLevelIds = [this.state.level.id];
progress.growthStats.totalCompleted = 1;
progress.growthStats.streakDays = 1;
saveProgress(progress);
```

- [ ] **Step 4: Manual persistence check**

Run on simulator or device:

```text
Complete a puzzle by temporarily using a debug-filled state if needed.
Close and reopen the app.
Confirm storage API does not crash the app.
Confirm no login, permission prompt, or network request is introduced.
```

- [ ] **Step 5: Commit**

```bash
git add harmonyos/entry/src/main/ets/services/storage.ets harmonyos/entry/src/main/ets/entryability/EntryAbility.ets harmonyos/entry/src/main/ets/pages/GamePage.ets
git commit -m "feat: persist harmonyos local progress"
```

---

### Task 9: Prepare Release Readiness and AppGallery Materials

**Files:**
- Create: `docs/harmonyos-native-release-checklist.md`
- Create: `docs/harmonyos-native-store-copy.md`
- Modify: `harmonyos/README.md`

- [ ] **Step 1: Add release checklist**

Create `docs/harmonyos-native-release-checklist.md`:

```markdown
# HarmonyOS 原生数独应用上线准备清单

## 开发环境

- DevEco Studio 已安装。
- HarmonyOS SDK 已通过 SDK Manager 安装。
- HUAWEI ID 已完成开发者实名认证。
- AppGallery Connect 已创建应用。
- Bundle name 与 DevEco 工程一致。

## 第一版功能

- 首页可进入闯关挑战。
- 首页可进入自由练习。
- 自由练习可选择热身、稳定、标准、进阶。
- 数独盘可选择格子并输入数字。
- 草稿模式可用。
- 清除可用。
- 重新开始有确认弹窗。
- 重复提醒只提示重复，不判断答案对错。
- 完成后出现“大脑除锈”正反馈。
- 本地进度存储不需要登录。

## 合规边界

- 当前版本不包含广告。
- 当前版本不包含支付。
- 当前版本不包含登录。
- 当前版本不包含排行榜。
- 当前版本不包含游戏货币、商城、兑换码、会员/VIP、付费道具、红包或提现。
- 当前版本不采集个人身份信息。
- “大脑除锈”不承诺疾病预防、治疗或医学效果。

## 上架材料

- 应用名称。
- 一句话简介。
- 详细介绍。
- 应用图标。
- 手机竖屏截图。
- 隐私政策链接。
- 用户协议或玩法说明。
- 版权和素材来源说明。
```

- [ ] **Step 2: Add store copy draft**

Create `docs/harmonyos-native-store-copy.md`:

```markdown
# HarmonyOS 原生数独应用商店文案草稿

## 一句话简介

一款轻量、安静、适合日常练习的 9x9 数独游戏。

## 应用介绍

本应用提供经典 9x9 数独玩法，玩家需要根据已给出的数字线索，在空格中填入 1-9，使每一行、每一列和每一个 3x3 宫内数字不重复。应用包含闯关挑战和自由练习两种模式，支持草稿模式、清除、重新开始和重复提醒。游戏过程不判断单次输入对错，只在完成整局后给出结果反馈，适合希望安静练习逻辑推理的用户。

## 商业化说明

当前版本不包含游戏货币、商城、兑换码、会员/VIP、付费道具、红包或提现等商业化系统。

## 隐私说明

当前版本不需要登录，不采集个人身份信息，不包含广告、支付、排行榜或云同步。应用仅在本地保存关卡进度和练习记录。

## 健康文案说明

应用中的“大脑除锈”等表达仅为轻松的游戏完成反馈，不代表疾病预防、治疗或医学效果承诺。
```

- [ ] **Step 3: Update HarmonyOS README**

Append to `harmonyos/README.md`:

```markdown
## Release Notes

第一版上线前请核对：

- `docs/harmonyos-native-release-checklist.md`
- `docs/harmonyos-native-store-copy.md`

第一版保持离线可玩，不接入广告、支付、登录、排行榜或云同步。
```

- [ ] **Step 4: Commit**

```bash
git add docs/harmonyos-native-release-checklist.md docs/harmonyos-native-store-copy.md harmonyos/README.md
git commit -m "docs: prepare harmonyos release materials"
```

---

### Task 10: Final Verification

**Files:**
- Read only unless verification finds bugs.

- [ ] **Step 1: Verify existing WeChat logic still passes**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected:

```text
# fail 0
```

- [ ] **Step 2: Verify shared legacy puzzle test still passes**

Run:

```bash
node --test test/puzzle.test.mjs
```

Expected:

```text
# fail 0
```

- [ ] **Step 3: Verify HarmonyOS build**

Use DevEco Studio:

```text
Build > Make Project
```

Expected: no ArkTS compile errors.

- [ ] **Step 4: Run manual simulator or device smoke test**

Expected checklist:

```text
Home loads.
闯关挑战 opens first level.
自由练习 opens difficulty selection.
At least one difficulty opens a board.
Cell selection works.
Digit input works.
草稿模式 works.
清除 works.
重新开始 asks for confirmation.
Duplicate reminder appears without red wrong-answer judgment.
Completion page appears after solved board.
No login, payment, ad, ranking, or network prompt appears.
```

- [ ] **Step 5: Check git status**

Run:

```bash
git status --short
```

Expected:

```text
Only intentionally untracked local preview artifacts under output/ may remain.
No uncommitted HarmonyOS source changes.
```

- [ ] **Step 6: Commit verification notes if needed**

If no code changes are needed, do not create an empty commit.

If a verification note file is added, use:

```bash
git add docs/harmonyos-native-release-checklist.md
git commit -m "docs: record harmonyos verification notes"
```

---

## Execution Notes

- Start with Task 1 only after DevEco Studio and HarmonyOS SDK are installed.
- For build verification, use an English-path worktree or copy. Running Hvigor directly under `/Users/tianhai/Documents/微信小游戏/harmonyos` fails with `Invalid project path`.
- If DevEco Studio generates different page registry paths, update the plan task locally and commit the actual generated files.
- If ArkTS reports syntax differences in component callback props, prefer the current DevEco-generated idioms and keep the same component boundary.
- Do not introduce medical claims, cloud sync, login, ads, payment, or analytics in the first version.
- Do not delete `huawei-h5/`; the quick game work is paused, not reverted.
