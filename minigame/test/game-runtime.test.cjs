const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const gamePath = path.join(__dirname, '..', 'game.js');
const appRuntimePath = path.join(__dirname, '..', 'src', 'app-runtime.js');
const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
const { levels } = require('../src/levels');
const { createPuzzleState } = require('../src/puzzle');
const { createRunFromState } = require('../src/progress');
const { PROGRESS_STORAGE_KEY } = require('../src/storage');

test('runtime completes the active level through normal player input and persists progress', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    completePuzzleWithTouchInput(runtime);

    assert.match(runtime.drawnText(), /LAB CLEAR/);
    assert.match(runtime.drawnText(), /第 1 关完成/);
    assert.match(runtime.drawnText(), /下一关已解锁/);
    assert.match(runtime.drawnText(), /1 \/ 24/);
    assert.match(runtime.drawnText(), /下一关/);
    assert.equal(runtime.drawnText().includes('同难度再来一局'), false);
    assert.equal(runtime.drawnText().includes('回首页'), false);
    assert.ok(runtime.renderCalls.some((call) => call.type === 'game' && call.completed));
    assert.ok(
      runtime.savedWrites.some(
        (write) => write.value && write.value.activeRun && write.value.activeRun.completed === true,
      ),
    );
    assert.deepEqual(runtime.completedWrite().dailyReport, {
      date: '2026-05-14',
      completionCount: 1,
      completedLevelIds: ['lab-01'],
    });
  } finally {
    runtime.restore();
  }
});

test('runtime records daily report once for a single completion transition', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    completePuzzleWithTouchInput(runtime);
    tapVictoryNext(runtime);

    assert.equal(runtime.latestGameCall().state.level.id, 'lab-02');
    assert.equal(runtime.latestGameCall().state.completed, false);

    const reportWrites = runtime.savedWrites
      .map((write) => write.value && write.value.dailyReport)
      .filter((dailyReport) => dailyReport && dailyReport.completionCount > 0);

    assert.ok(reportWrites.length >= 2);
    assert.equal(reportWrites[0].completionCount, 1);
    assert.equal(reportWrites[reportWrites.length - 1].completionCount, 1);
    assert.ok(reportWrites.every((dailyReport) => dailyReport.completionCount === 1));
  } finally {
    runtime.restore();
  }
});

test('release runtime does not expose the debug complete button', () => {
  const runtime = bootGameRuntime('release');

  try {
    startGame(runtime);

    assert.equal(runtime.drawnText().includes('DEV 完成'), false);

    tapTopBarTitleArea(runtime);

    assert.equal(runtime.drawnText().includes('第 1 关完成'), false);
    assert.equal(
      runtime.savedWrites.some(
        (write) => write.value && write.value.activeRun && write.value.activeRun.completed === true,
      ),
      false,
    );
  } finally {
    runtime.restore();
  }
});

test('runtime plays lightweight sound effects for puzzle actions', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    tapSolvedDigitForCell(runtime, findFirstMutableCell(runtime));
    tapNoteTool(runtime);
    tapNoteTool(runtime);
    completePuzzleWithTouchInput(runtime);

    assert.ok(runtime.soundPlayCount('select') >= 1);
    assert.ok(runtime.soundPlayCount('input') >= 1);
    assert.ok(runtime.soundPlayCount('tool') >= 1);
    assert.equal(runtime.soundPlayCount('complete'), 1);
  } finally {
    runtime.restore();
  }
});

test('runtime does not reveal wrong digit input with a distinct error sound', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    const cell = findFirstMutableCell(runtime);
    tapMutableCell(runtime, cell.row, cell.col);
    tapDigit(runtime, wrongDigitForCell(runtime, cell));

    assert.equal(runtime.soundPlayCount('error'), 0);
    assert.equal(runtime.soundPlayCount('input'), 1);
  } finally {
    runtime.restore();
  }
});

test('runtime asks for confirmation before restarting the active puzzle', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    const cell = findFirstMutableCell(runtime);
    tapSolvedDigitForCell(runtime, cell);

    const beforeRestart = runtime.latestGameCall().state;
    tapRestartTool(runtime);

    assert.equal(runtime.modalCount(), 1);
    assert.match(runtime.latestModal().title, /重新开始|重开/);
    assert.match(runtime.latestModal().content, /题面数字会保留/);

    runtime.respondToLatestModal(false);

    assert.equal(runtime.latestGameCall().state.cells[cell.row][cell.col].value, beforeRestart.solution[cell.row][cell.col]);
    assert.equal(runtime.latestGameCall().state.level.id, beforeRestart.level.id);
  } finally {
    runtime.restore();
  }
});

test('runtime restarts the active puzzle after confirmation and keeps fixed clues', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    const firstMutable = findFirstMutableCell(runtime);
    tapSolvedDigitForCell(runtime, firstMutable);
    tapNoteTool(runtime);
    const secondMutable = findFirstMutableCell(runtime);
    tapSolvedDigitForCell(runtime, secondMutable);
    const fixedCell = findFirstFixedCell(runtime);
    tapRestartTool(runtime);
    runtime.respondToLatestModal(true);

    const restarted = runtime.latestGameCall().state;
    assert.equal(restarted.cells[fixedCell.row][fixedCell.col].value, fixedCell.value);
    assert.equal(restarted.cells[firstMutable.row][firstMutable.col].value, 0);
    assert.equal(restarted.cells[secondMutable.row][secondMutable.col].value, 0);
    assert.deepEqual(restarted.cells[secondMutable.row][secondMutable.col].notes, []);
    assert.equal(restarted.history.length, 0);
    assert.equal(restarted.mistakes, 0);
    assert.ok(runtime.savedWrites.some((write) => write.value && write.value.activeRun && write.value.activeRun.levelId === 'lab-01'));
  } finally {
    runtime.restore();
  }
});

test('runtime passes the WeChat menu button safe area into layouts', () => {
  const runtime = bootGameRuntime('develop', {
    systemInfo: { pixelRatio: 1, windowWidth: 430, windowHeight: 932, statusBarHeight: 54 },
    menuButtonRect: { top: 58, bottom: 90, height: 32 },
  });

  try {
    assert.ok(runtime.renderCalls.some((call) => call.type === 'menu' && call.titleY >= 98));

    startGame(runtime);

    assert.ok(runtime.renderCalls.some((call) => call.type === 'game' && call.topBarY === 52));
  } finally {
    runtime.restore();
  }
});

test('runtime homepage hides daily report copy', () => {
  const runtime = bootGameRuntime('develop');

  try {
    assert.equal(/今日报告|今日除锈|累计除锈|今日第一局/.test(runtime.drawnText()), false);
    assert.match(runtime.drawnText(), /一一数独/);
  } finally {
    runtime.restore();
  }
});

test('runtime enters free training difficulty selection from the home screen', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /自由练习/);
    assert.match(runtime.drawnText(), /入门/);
    assert.match(runtime.drawnText(), /挑战/);
  } finally {
    runtime.restore();
  }
});

test('runtime starts a hard free training puzzle without writing campaign completion', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeDifficulty(runtime, 'hard');

    let game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'hard');
    assert.match(runtime.drawnText(), /自由练习 · 挑战/);
    assert.match(runtime.drawnText(), /换难度/);

    completePuzzleWithTouchInput(runtime);
    game = runtime.latestGameCall();

    const latestSave = runtime.latestSave();
    assert.equal(game.state.completed, true);
    assert.match(runtime.drawnText(), /再练一局/);
    assert.match(runtime.drawnText(), /换个难度/);
    assert.equal(runtime.drawnText().includes('回首页'), false);
    assert.equal(latestSave.completedLevelIds.includes(game.state.level.id), false);
    assert.ok(latestSave.dailyReport.completionCount >= 1);
    assert.equal(latestSave.practiceStats.totalCompleted, 1);
    assert.equal(latestSave.practiceStats.lastDifficulty, 'hard');
  } finally {
    runtime.restore();
  }
});

test('runtime lets free practice players switch difficulty from gameplay', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeDifficulty(runtime, 'intro');
    fillMutableCells(runtime, 1);

    const introRun = runtime.latestSave().practiceRun;
    assert.equal(introRun.difficulty, 'intro');

    tapPracticeDifficultySwitch(runtime);

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /自由练习/);
    assert.match(runtime.drawnText(), /挑战/);

    tapPracticeDifficulty(runtime, 'hard');

    const game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'hard');
    assert.equal(runtime.latestSave().practiceRun.difficulty, 'hard');
  } finally {
    runtime.restore();
  }
});

test('runtime keeps campaign and free training saves independent', () => {
  const runtime = bootGameRuntime('develop');

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeDifficulty(runtime, 'intro');
    fillMutableCells(runtime, 1);
    tapBack(runtime);

    tapMenuMode(runtime, 'campaign');
    fillMutableCells(runtime, 1);
    tapBack(runtime);

    const latestSave = runtime.latestSave();
    assert.ok(latestSave.activeRun);
    assert.ok(latestSave.practiceRun);
    assert.equal(latestSave.activeRun.mode, 'campaign');
    assert.equal(latestSave.practiceRun.mode, 'practice');
  } finally {
    runtime.restore();
  }
});

test('runtime ignores completed legacy free training saves', () => {
  const completedPracticeRun = {
    ...createRunFromState(createPuzzleState(levels.find((level) => level.difficulty === 'hard')), 'practice'),
    completed: true,
  };
  const runtime = bootGameRuntime('develop', {
    initialStorage: {
      [PROGRESS_STORAGE_KEY]: {
        version: 1,
        activeRun: null,
        practiceRun: completedPracticeRun,
        completedLevelIds: [],
      },
    },
  });

  try {
    assert.match(runtime.drawnText(), /自由练习/);
    assert.doesNotMatch(runtime.drawnText(), /继续训练/);

    tapMenuMode(runtime, 'practice');

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /选一个难度/);
    assert.doesNotMatch(runtime.drawnText(), /大脑除锈完成/);
  } finally {
    runtime.restore();
  }
});

test('runtime animates homepage and stops animation after entering gameplay', () => {
  const runtime = bootGameRuntime('develop');

  try {
    const firstMenuCall = runtime.latestMenuCall();
    assert.equal(firstMenuCall.layout.animationTime, 0);
    assert.equal(runtime.activeAnimationFrameCount(), 1);

    runtime.runAnimationFrame(600);

    assert.ok(runtime.latestMenuCall().layout.animationTime >= 600);
    assert.equal(runtime.activeAnimationFrameCount(), 1);

    startGame(runtime);

    assert.equal(runtime.activeAnimationFrameCount(), 0);
  } finally {
    runtime.restore();
  }
});

test('runtime passes accelerometer tilt into homepage animation and stops it in gameplay', () => {
  const runtime = bootGameRuntime('develop');

  try {
    assert.equal(runtime.accelerometerStartCount(), 1);
    assert.deepEqual(runtime.latestMenuCall().layout.tilt, { x: 0, y: 0 });

    runtime.emitAccelerometerChange({ x: 0.62, y: -0.48 });
    runtime.runAnimationFrame(16);

    assert.deepEqual(runtime.latestMenuCall().layout.tilt, { x: 0.62, y: -0.48 });

    startGame(runtime);

    assert.equal(runtime.accelerometerStopCount(), 1);
    assert.equal(runtime.accelerometerOffCount(), 1);
  } finally {
    runtime.restore();
  }
});

test('runtime passes quiet companion feedback for later levels without revealing answer correctness', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    advanceCompletedLevels(runtime, 10);
    fillMutableCells(runtime, 5);

    const game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'normal');
    assert.ok(game.companionFeedback);
    assert.ok(game.companionFeedback.toast);
    assert.equal(runtime.soundPlayCount('error'), 0);
  } finally {
    runtime.restore();
  }
});

test('runtime passes lightweight companion feedback for the intro level without error sound', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    fillMutableCells(runtime, 3);

    const game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'intro');
    assert.ok(game.companionFeedback);
    assert.ok(game.companionFeedback.toast);
    assert.match(game.companionFeedback.toast.text, /观察|节奏|线索|推理|草稿|状态/);
    assert.equal(runtime.soundPlayCount('error'), 0);
  } finally {
    runtime.restore();
  }
});

test('runtime schedules companion toast expiry redraw', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    advanceCompletedLevels(runtime, 10);
    fillMutableCells(runtime, 5);

    assert.ok(runtime.latestGameCall().companionFeedback.toast);

    runtime.runTimers(1800);

    assert.equal(runtime.latestGameCall().companionFeedback.toast, null);
  } finally {
    runtime.restore();
  }
});

function bootGameRuntime(envVersion, options = {}) {
  const OriginalDate = global.Date;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  const originalWx = global.wx;
  const originalLoad = Module._load;
  const originalGameCache = require.cache[gamePath];
  const originalAppRuntimeCache = require.cache[appRuntimePath];
  const originalRendererCache = require.cache[rendererPath];
  const ctx = createMockCanvasContext();
  const renderCalls = [];
  const audioContexts = [];
  const savedWrites = [];
  const modalRequests = [];
  let touchStartHandler = null;
  let now = options.now || new OriginalDate(2026, 4, 14, 12, 0, 0).getTime();
  const timers = [];
  const animationFrames = [];
  let accelerometerHandler = null;
  let accelerometerStartCount = 0;
  let accelerometerStopCount = 0;
  let accelerometerOffCount = 0;

  delete require.cache[gamePath];
  delete require.cache[appRuntimePath];

  class FixedDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(now);
        return;
      }

      super(...args);
    }

    static now() {
      return now;
    }
  }

  global.Date = FixedDate;
  global.setTimeout = (callback, delay) => {
    const timer = {
      active: true,
      callback,
      delay,
      unref() {
        this.unrefed = true;
      },
    };
    timers.push(timer);
    return timer;
  };
  global.clearTimeout = (timer) => {
    if (timer) {
      timer.active = false;
    }
  };
  global.requestAnimationFrame = (callback) => {
    const frame = {
      active: true,
      callback,
    };
    animationFrames.push(frame);
    return frame;
  };
  global.cancelAnimationFrame = (frame) => {
    if (frame) {
      frame.active = false;
    }
  };

  global.wx = {
    createCanvas: () => ({ getContext: () => ctx }),
    getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
    getSystemInfoSync: () => options.systemInfo || ({ pixelRatio: 1, windowWidth: 430, windowHeight: 932 }),
    getMenuButtonBoundingClientRect: options.menuButtonRect
      ? () => options.menuButtonRect
      : undefined,
    getStorageSync: (key) =>
      options.initialStorage && Object.hasOwn(options.initialStorage, key)
        ? options.initialStorage[key]
        : null,
    createInnerAudioContext: () => {
      const context = {
        playCount: 0,
        stopCount: 0,
        destroyCount: 0,
        obeyMuteSwitch: false,
        src: '',
        volume: 1,
        destroy() {
          this.destroyCount += 1;
        },
        play() {
          this.playCount += 1;
        },
        stop() {
          this.stopCount += 1;
        },
      };

      audioContexts.push(context);
      return context;
    },
    setStorageSync: (key, value) => savedWrites.push({ key, value }),
    onTouchStart: (handler) => {
      touchStartHandler = handler;
    },
    onWindowResize: () => {},
    showModal: (request) => {
      modalRequests.push(request);
    },
    requestAnimationFrame: global.requestAnimationFrame,
    cancelAnimationFrame: global.cancelAnimationFrame,
    startAccelerometer: () => {
      accelerometerStartCount += 1;
    },
    stopAccelerometer: () => {
      accelerometerStopCount += 1;
    },
    onAccelerometerChange: (handler) => {
      accelerometerHandler = handler;
    },
    offAccelerometerChange: (handler) => {
      if (!handler || handler === accelerometerHandler) {
        accelerometerHandler = null;
        accelerometerOffCount += 1;
      }
    },
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    const resolved = Module._resolveFilename(request, parent, isMain);

    if (resolved === rendererPath) {
      const actual = originalLoad.apply(this, arguments);

      return {
        ...actual,
        renderGame(ctxArg, state, layout, options) {
          renderCalls.push({
            type: 'game',
            completed: state.completed,
            hasDebug: Boolean(layout.debugCompleteButton),
            topBarY: layout.topBar.y,
            state,
            layout,
            options,
            companionFeedback: options && options.companionFeedback,
            completionFeedback: options && options.completionFeedback,
          });
          return actual.renderGame(ctxArg, state, layout, options);
        },
        renderMenu(ctxArg, layout) {
          renderCalls.push({
            type: 'menu',
            hasActiveRun: Boolean(layout.continueButton),
            titleY: layout.title.y,
            layout,
          });
          return actual.renderMenu(ctxArg, layout);
        },
        renderPracticeMenu(ctxArg, layout) {
          renderCalls.push({
            type: 'practiceMenu',
            layout,
          });
          return actual.renderPracticeMenu(ctxArg, layout);
        },
      };
    }

    return originalLoad.apply(this, arguments);
  };

  require(gamePath);

  assert.equal(typeof touchStartHandler, 'function');

  return {
    ctx,
    renderCalls,
    savedWrites,
    modalCount() {
      return modalRequests.length;
    },
    latestModal() {
      const modal = modalRequests[modalRequests.length - 1];
      assert.ok(modal);
      return modal;
    },
    respondToLatestModal(confirm) {
      const modal = this.latestModal();
      assert.equal(typeof modal.success, 'function');
      modal.success({ confirm, cancel: !confirm });
    },
    completedWrite() {
      const write = savedWrites.find(
        (item) => item.value && item.value.activeRun && item.value.activeRun.completed === true,
      );

      assert.ok(write);
      return write.value;
    },
    latestSave() {
      const write = savedWrites.at(-1);
      assert.ok(write);
      return write.value;
    },
    drawnText() {
      return ctx.calls
        .filter((call) => call.name === 'fillText')
        .map((call) => String(call.args[0]))
        .join(' ');
    },
    soundPlayCount(name) {
      return audioContexts
        .filter((context) => context.src === `assets/sounds/${name}.wav`)
        .reduce((total, context) => total + context.playCount, 0);
    },
    restore() {
      Module._load = originalLoad;
      global.Date = OriginalDate;
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
      global.requestAnimationFrame = originalRequestAnimationFrame;
      global.cancelAnimationFrame = originalCancelAnimationFrame;
      global.wx = originalWx;
      delete require.cache[gamePath];
      delete require.cache[appRuntimePath];

      if (originalGameCache) {
        require.cache[gamePath] = originalGameCache;
      }

      if (originalAppRuntimeCache) {
        require.cache[appRuntimePath] = originalAppRuntimeCache;
      }

      if (originalRendererCache) {
        require.cache[rendererPath] = originalRendererCache;
      }
    },
    touch(clientX, clientY) {
      touchStartHandler({ touches: [{ clientX, clientY }] });
    },
    latestGameCall() {
      const gameCall = [...renderCalls].reverse().find((call) => call.type === 'game');
      assert.ok(gameCall);
      return gameCall;
    },
    latestMenuCall() {
      const menuCall = [...renderCalls].reverse().find((call) => call.type === 'menu');
      assert.ok(menuCall);
      return menuCall;
    },
    latestPracticeMenuCall() {
      const practiceMenuCall = [...renderCalls].reverse().find((call) => call.type === 'practiceMenu');
      assert.ok(practiceMenuCall);
      return practiceMenuCall;
    },
    activeAnimationFrameCount() {
      return animationFrames.filter((frame) => frame.active).length;
    },
    accelerometerStartCount() {
      return accelerometerStartCount;
    },
    accelerometerStopCount() {
      return accelerometerStopCount;
    },
    accelerometerOffCount() {
      return accelerometerOffCount;
    },
    emitAccelerometerChange(payload) {
      assert.equal(typeof accelerometerHandler, 'function');
      accelerometerHandler(payload);
    },
    runAnimationFrame(ms) {
      now += ms;
      const frame = animationFrames.find((item) => item.active);

      assert.ok(frame);

      frame.active = false;
      frame.callback(now);
    },
    runTimers(ms) {
      now += ms;
      timers
        .filter((timer) => timer.active && timer.delay <= ms)
        .forEach((timer) => {
          timer.active = false;
          timer.callback();
        });
    },
  };
}

function startGame(runtime) {
  tapMenuMode(runtime, 'campaign');
  assert.ok(runtime.renderCalls.some((call) => call.type === 'game' && !call.hasDebug && !call.completed));
}

function tapMenuMode(runtime, mode) {
  const card = runtime.latestMenuCall().layout.modeCards[mode];
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapPracticeDifficulty(runtime, difficulty) {
  const call = runtime.latestPracticeMenuCall();
  const card = call.layout.difficultyCards.find((item) => item.difficulty === difficulty);
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapPracticeDifficultySwitch(runtime) {
  const game = runtime.latestGameCall();
  const button = game.layout.modeSwitchButton;

  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function tapBack(runtime) {
  const game = runtime.latestGameCall();
  runtime.touch(
    game.layout.backButton.x + game.layout.backButton.width / 2,
    game.layout.backButton.y + game.layout.backButton.height / 2,
  );
}

function completePuzzleWithTouchInput(runtime) {
  const initialGame = runtime.latestGameCall();
  const emptyCells = initialGame.state.cells
    .flat()
    .filter((cell) => !cell.fixed)
    .map((cell) => ({ row: cell.row, col: cell.col }));

  emptyCells.forEach(({ row, col }) => {
    const game = runtime.latestGameCall();
    const digit = game.state.solution[row][col];
    tapMutableCell(runtime, row, col);
    tapDigit(runtime, digit);
  });
}

function advanceCompletedLevels(runtime, count) {
  for (let index = 0; index < count; index += 1) {
    completePuzzleWithTouchInput(runtime);
    tapVictoryNext(runtime);
  }
}

function fillMutableCells(runtime, count) {
  for (let index = 0; index < count; index += 1) {
    const game = runtime.latestGameCall();
    const cell = game.state.cells.flat().find((item) => !item.fixed && item.value === 0);

    assert.ok(cell);
    tapMutableCell(runtime, cell.row, cell.col);
    tapDigit(runtime, game.state.solution[cell.row][cell.col]);
  }
}

function tapMutableCell(runtime, row, col) {
  const game = runtime.latestGameCall();
  const cellSize = game.layout.board.size / 9;
  runtime.touch(
    game.layout.board.x + col * cellSize + cellSize / 2,
    game.layout.board.y + row * cellSize + cellSize / 2,
  );
}

function tapDigit(runtime, digit) {
  const game = runtime.latestGameCall();
  const key = game.layout.keypad.keys[digit - 1];
  runtime.touch(key.x + key.width / 2, key.y + key.height / 2);
}

function tapNoteTool(runtime) {
  const game = runtime.latestGameCall();
  const tool = game.layout.tools.find((item) => item.action === 'note');
  runtime.touch(tool.x + tool.width / 2, tool.y + tool.height / 2);
}

function tapRestartTool(runtime) {
  const game = runtime.latestGameCall();
  const tool = game.layout.tools.find((item) => item.action === 'restart');
  runtime.touch(tool.x + tool.width / 2, tool.y + tool.height / 2);
}

function tapVictoryNext(runtime) {
  const game = runtime.latestGameCall();
  const next = game.layout.victory.campaignNext;
  runtime.touch(next.x + next.width / 2, next.y + next.height / 2);
}

function tapTopBarTitleArea(runtime) {
  const game = runtime.latestGameCall();
  runtime.touch(game.layout.topBar.x + 120, game.layout.topBar.y + 24);
}

function findFirstMutableCell(runtime) {
  const cell = runtime.latestGameCall().state.cells.flat().find((item) => !item.fixed && item.value === 0);
  assert.ok(cell);
  return cell;
}

function findFirstFixedCell(runtime) {
  const cell = runtime.latestGameCall().state.cells.flat().find((item) => item.fixed);
  assert.ok(cell);
  return cell;
}

function tapSolvedDigitForCell(runtime, cell) {
  const game = runtime.latestGameCall();
  tapMutableCell(runtime, cell.row, cell.col);
  tapDigit(runtime, game.state.solution[cell.row][cell.col]);
}

function wrongDigitForCell(runtime, cell) {
  const solution = runtime.latestGameCall().state.solution[cell.row][cell.col];
  return solution === 1 ? 2 : 1;
}

function createMockCanvasContext() {
  const calls = [];
  const context = {
    calls,
    arc: record('arc'),
    beginPath: record('beginPath'),
    clearRect: (...args) => {
      calls.length = 0;
      calls.push({ name: 'clearRect', args });
    },
    clip: record('clip'),
    closePath: record('closePath'),
    createLinearGradient: () => ({
      addColorStop: record('addColorStop'),
    }),
    fill: record('fill'),
    fillRect: record('fillRect'),
    fillText: record('fillText'),
    lineTo: record('lineTo'),
    measureText: (text) => ({ width: String(text).length * 10 }),
    moveTo: record('moveTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    restore: record('restore'),
    save: record('save'),
    setTransform: record('setTransform'),
    stroke: record('stroke'),
    strokeRect: record('strokeRect'),
  };
  const stateValues = {
    fillStyle: '',
    font: '',
    lineCap: '',
    lineJoin: '',
    lineWidth: 1,
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };

  Object.keys(stateValues).forEach((key) => {
    Object.defineProperty(context, key, {
      get() {
        return stateValues[key];
      },
      set(value) {
        stateValues[key] = value;
        calls.push({ name: `set:${key}`, args: [value] });
      },
      enumerable: true,
    });
  });

  function record(name) {
    return (...args) => {
      calls.push({ name, args });
    };
  }

  return context;
}
