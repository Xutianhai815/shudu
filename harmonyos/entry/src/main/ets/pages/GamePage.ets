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
  createPuzzleState,
  eraseSelected,
  restartLevel,
  selectCell,
  toggleNoteMode,
} from '../game/puzzle';
import { PuzzleState, TrainingDifficulty } from '../game/types';
import { createEmptyProgress } from '../game/progress';
import { playSound } from '../services/sound';
import { saveProgress } from '../services/storage';
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

  private normalizeTrainingDifficulty(value?: TrainingDifficulty): TrainingDifficulty {
    if (value === 'steady' || value === 'standard' || value === 'advanced') {
      return value;
    }

    return 'warmup';
  }

  aboutToAppear(): void {
    const params = (router.getParams() ?? {}) as GamePageParams;
    const mode = params.mode ?? 'campaign';
    const trainingDifficulty = this.normalizeTrainingDifficulty(params.trainingDifficulty);
    const activeLevel = mode === 'practice'
      ? choosePracticeLevel(levels, trainingDifficulty, null) ?? levels[0]
      : levels[0];

    this.puzzle = createPuzzleState(activeLevel);
    this.feedbackText = mode === 'practice' ? '自由练习已开始，慢慢推理。' : '闯关挑战已开始。';
  }

  private handleSelect(row: number, col: number): void {
    this.puzzle = selectCell(this.puzzle, row, col);
    this.feedbackText = '已选中格子。';
    playSound('select');
  }

  private handleToggleNote(): void {
    this.puzzle = toggleNoteMode(this.puzzle);
    this.feedbackText = this.puzzle.noteMode ? '草稿模式已开启。' : '正式填数模式已开启。';
    playSound('tool');
  }

  private handleErase(): void {
    this.puzzle = eraseSelected(this.puzzle);
    this.feedbackText = '已清除当前格。';
    playSound('tool');
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
      const progress = createEmptyProgress();
      progress.completedLevelIds = [this.puzzle.level.id];
      progress.growthStats.totalCompleted = 1;
      progress.growthStats.streakDays = 1;
      saveProgress(progress).catch(() => {
      });
      router.replaceUrl({ url: 'pages/VictoryPage' });
    }
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
