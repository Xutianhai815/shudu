import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { DigitPad } from '../components/DigitPad';
import { FeedbackToast } from '../components/FeedbackToast';
import { SudokuBoard } from '../components/SudokuBoard';
import { ToolBar } from '../components/ToolBar';
import { levels } from '../game/levels';
import { choosePracticeLevel } from '../game/modes';
import {
  applyDigit,
  createPuzzleSnapshot,
  createPuzzleState,
  createPuzzleStateFromSnapshot,
  eraseSelected,
  restartLevel,
  selectCell,
  toggleNoteMode,
} from '../game/puzzle';
import { PuzzleState, SudokuLevel, TrainingDifficulty } from '../game/types';
import { AppProgress, SavedRun } from '../game/progress';
import { playSound } from '../services/sound';
import { loadProgress, saveProgress } from '../services/storage';
import {
  ACCENT_BROWN,
  GAME_BOTTOM_PADDING,
  GAME_HORIZONTAL_PADDING,
  GAME_TOP_PADDING,
  MUTED_PANEL,
  PAGE_BACKGROUND,
  PRIMARY_TEXT,
  SECONDARY_TEXT,
} from '../ui/layout';

interface GamePageParams {
  mode?: string;
  trainingDifficulty?: TrainingDifficulty;
}

@Entry
@Component
struct GamePage {
  @State puzzle: PuzzleState = createPuzzleState(levels[0]);
  @State feedbackText: string = '先选择一个空格，再填入数字。';
  private activeMode: 'campaign' | 'practice' = 'campaign';
  private activeTrainingDifficulty: TrainingDifficulty | null = null;

  private normalizeTrainingDifficulty(value?: TrainingDifficulty): TrainingDifficulty {
    if (value === 'steady' || value === 'standard' || value === 'advanced') {
      return value;
    }

    return 'warmup';
  }

  aboutToAppear(): void {
    const params = (router.getParams() ?? {}) as GamePageParams;
    const mode = params.mode === 'practice' ? 'practice' : 'campaign';
    const trainingDifficulty = this.normalizeTrainingDifficulty(params.trainingDifficulty);
    this.activeMode = mode;
    this.activeTrainingDifficulty = mode === 'practice' ? trainingDifficulty : null;
    const activeLevel = mode === 'practice'
      ? choosePracticeLevel(levels, trainingDifficulty, null) ?? levels[0]
      : levels[0];

    this.puzzle = createPuzzleState(activeLevel);
    this.feedbackText = mode === 'practice' ? '自由练习已开始，慢慢推理。' : '闯关挑战已开始。';
    this.restoreActiveRun();
  }

  private findLevel(levelId: string): SudokuLevel | null {
    for (let index = 0; index < levels.length; index += 1) {
      if (levels[index].id === levelId) {
        return levels[index];
      }
    }
    return null;
  }

  private getTodayKey(): string {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private createCurrentRun(): SavedRun {
    const run: SavedRun = {
      mode: this.activeMode,
      levelId: this.puzzle.level.id,
      trainingDifficulty: this.activeTrainingDifficulty,
      snapshot: createPuzzleSnapshot(this.puzzle),
    };
    return run;
  }

  private restoreActiveRun(): void {
    loadProgress().then((progress: AppProgress) => {
      const savedRun = this.activeMode === 'practice' ? progress.practiceRun : progress.campaignRun;
      if (!savedRun || savedRun.mode !== this.activeMode) {
        return;
      }

      if (this.activeMode === 'practice' && savedRun.trainingDifficulty !== this.activeTrainingDifficulty) {
        return;
      }

      const savedLevel = this.findLevel(savedRun.levelId);
      if (!savedLevel) {
        return;
      }

      const restoredPuzzle = createPuzzleStateFromSnapshot(savedLevel, savedRun.snapshot);
      if (!restoredPuzzle || restoredPuzzle.completed) {
        return;
      }

      this.puzzle = restoredPuzzle;
      this.feedbackText = this.activeMode === 'practice' ? '已恢复上次自由练习。' : '已恢复上次闯关进度。';
    }).catch(() => {
    });
  }

  private persistActiveRun(): void {
    if (this.puzzle.completed) {
      return;
    }

    const run = this.createCurrentRun();
    loadProgress().then((progress: AppProgress) => {
      if (run.mode === 'practice') {
        progress.practiceRun = run;
      } else {
        progress.campaignRun = run;
      }
      return saveProgress(progress);
    }).catch(() => {
    });
  }

  private recordRecentPracticeLevel(progress: AppProgress, completedLevelId: string): void {
    if (this.activeTrainingDifficulty === 'warmup') {
      progress.practiceStats.recentLevelIdsByTrainingDifficulty.warmup = completedLevelId;
      return;
    }

    if (this.activeTrainingDifficulty === 'steady') {
      progress.practiceStats.recentLevelIdsByTrainingDifficulty.steady = completedLevelId;
      return;
    }

    if (this.activeTrainingDifficulty === 'standard') {
      progress.practiceStats.recentLevelIdsByTrainingDifficulty.standard = completedLevelId;
      return;
    }

    if (this.activeTrainingDifficulty === 'advanced') {
      progress.practiceStats.recentLevelIdsByTrainingDifficulty.advanced = completedLevelId;
    }
  }

  private recordCompletion(): void {
    const completedLevelId = this.puzzle.level.id;
    loadProgress().then((progress: AppProgress) => {
      if (progress.completedLevelIds.indexOf(completedLevelId) < 0) {
        progress.completedLevelIds.push(completedLevelId);
      }

      if (this.activeMode === 'practice') {
        progress.practiceRun = null;
        progress.practiceStats.totalCompleted += 1;
        progress.practiceStats.lastTrainingDifficulty = this.activeTrainingDifficulty;
        this.recordRecentPracticeLevel(progress, completedLevelId);
      } else {
        progress.campaignRun = null;
      }

      progress.growthStats.totalCompleted += 1;
      progress.growthStats.streakDays = Math.max(1, progress.growthStats.streakDays);
      progress.growthStats.lastPlayedDate = this.getTodayKey();
      return saveProgress(progress);
    }).catch(() => {
    });
  }

  private handleSelect(row: number, col: number): void {
    this.puzzle = selectCell(this.puzzle, row, col);
    this.feedbackText = '已选中格子。';
    playSound('select');
    this.persistActiveRun();
  }

  private handleToggleNote(): void {
    this.puzzle = toggleNoteMode(this.puzzle);
    this.feedbackText = this.puzzle.noteMode ? '草稿模式已开启。' : '正式填数模式已开启。';
    playSound('tool');
    this.persistActiveRun();
  }

  private handleErase(): void {
    this.puzzle = eraseSelected(this.puzzle);
    this.feedbackText = '已清除当前格。';
    playSound('tool');
    this.persistActiveRun();
  }

  private handleRestart(): void {
    promptAction.showDialog({
      title: '重新开始本局？',
      message: '当前填写和草稿会被清空。',
      buttons: [
        {
          text: '取消',
          color: '#776857',
        },
        {
          text: '重新开始',
          color: '#7A4E2D',
        },
      ],
    }).then((result) => {
      if (result.index !== 1) {
        return;
      }

      this.puzzle = restartLevel(this.puzzle);
      this.feedbackText = '本局已重新开始。';
      playSound('tool');
      this.persistActiveRun();
    }).catch(() => {
    });
  }

  private handleDigit(digit: number): void {
    const wasCompleted = this.puzzle.completed;
    const wasNoteMode = this.puzzle.noteMode;
    const previousPuzzle = this.puzzle;
    const nextPuzzle = applyDigit(this.puzzle, digit);

    if (nextPuzzle === previousPuzzle) {
      this.feedbackText = wasCompleted ? '这一局已经完成。' : '题面数字不能修改。';
      playSound('tool');
      return;
    }

    this.puzzle = nextPuzzle;
    this.feedbackText = wasNoteMode ? `已记录草稿 ${digit}。` : `已填入 ${digit}。`;
    playSound('input');

    if (!wasCompleted && this.puzzle.completed) {
      this.feedbackText = '完成了，准备查看反馈。';
      playSound('complete');
      this.recordCompletion();
      router.replaceUrl({ url: 'pages/VictoryPage' });
      return;
    }

    this.persistActiveRun();
  }

  build() {
    Column() {
      Row() {
        Button('返回')
          .height(40)
          .padding({ left: 16, right: 16 })
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(ACCENT_BROWN)
          .backgroundColor(MUTED_PANEL)
          .borderRadius(16)
          .onClick(() => {
            router.back();
          })

        Text(`${this.puzzle.level.label} · ${this.puzzle.level.title}`)
          .layoutWeight(1)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(PRIMARY_TEXT)
          .textAlign(TextAlign.End)
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)

      Text('经典九宫数独')
        .margin({ top: 20 })
        .width('100%')
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .fontColor(SECONDARY_TEXT)
        .textAlign(TextAlign.Start)

      SudokuBoard({
        state: this.puzzle,
        onSelect: (row: number, col: number): void => {
          this.handleSelect(row, col);
        },
      })
        .margin({ top: 14 })

      FeedbackToast({ text: this.feedbackText })
        .margin({ top: 16 })

      Blank()

      ToolBar({
        noteMode: this.puzzle.noteMode,
        onToggleNote: (): void => {
          this.handleToggleNote();
        },
        onErase: (): void => {
          this.handleErase();
        },
        onRestart: (): void => {
          this.handleRestart();
        },
      })

      DigitPad({
        noteMode: this.puzzle.noteMode,
        onDigit: (digit: number): void => {
          this.handleDigit(digit);
        },
      })
        .margin({ top: 14 })
    }
    .width('100%')
    .height('100%')
    .padding({
      left: GAME_HORIZONTAL_PADDING,
      right: GAME_HORIZONTAL_PADDING,
      top: GAME_TOP_PADDING,
      bottom: GAME_BOTTOM_PADDING,
    })
    .backgroundColor(PAGE_BACKGROUND)
  }
}
