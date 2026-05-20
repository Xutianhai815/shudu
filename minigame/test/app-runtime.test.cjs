const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const appRuntimePath = path.join(__dirname, '..', 'src', 'app-runtime.js');
const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
const { levels } = require('../src/levels');

test('app runtime boots to the mode menu', () => {
  const runtime = bootAppRuntime();

  try {
    assert.ok(runtime.latestMenuCall());
    assert.match(runtime.drawnText(), /一一数独/);
    assert.match(runtime.drawnText(), /闯关挑战/);
    assert.match(runtime.drawnText(), /自由练习/);
  } finally {
    runtime.restore();
  }
});

test('app runtime does not expose home font diagnostics in review builds', () => {
  const runtime = bootAppRuntime({
    systemInfo: { pixelRatio: 3, windowWidth: 390, windowHeight: 844, platform: 'ios' },
  });

  try {
    const menuLayout = runtime.latestMenuCall().layout;

    assert.equal(menuLayout.canvasTextScale, 1);
    assert.equal(menuLayout.debugOverlay, undefined);
    assert.equal(/DBG|home-font|font42/.test(runtime.drawnText()), false);
  } finally {
    runtime.restore();
  }
});

test('app runtime keeps simulator font scale unchanged', () => {
  const runtime = bootAppRuntime({
    systemInfo: { pixelRatio: 3, windowWidth: 390, windowHeight: 844, platform: 'devtools' },
  });

  try {
    assert.equal(runtime.latestMenuCall().layout.canvasTextScale, 1);
  } finally {
    runtime.restore();
  }
});

test('app runtime starts campaign gameplay from the home screen and persists the run', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'campaign');

    const game = runtime.latestGameCall();
    const latestSave = runtime.latestSave();

    assert.equal(game.state.level.id, 'lab-01');
    assert.deepEqual(game.options.modeContext, {
      mode: 'campaign',
      label: `第 1/${levels.length} 关`,
    });
    assert.equal(latestSave.activeRun.mode, 'campaign');
    assert.equal(latestSave.activeRun.levelId, 'lab-01');
  } finally {
    runtime.restore();
  }
});

test('app runtime opens practice difficulty with a recommended training card and starts advanced gameplay', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /自由练习/);
    assert.match(runtime.drawnText(), /推荐：热身/);

    tapPracticeTrainingDifficulty(runtime, 'advanced');

    const game = runtime.latestGameCall();
    const latestSave = runtime.latestSave();

    assert.equal(game.state.level.difficulty, 'hard');
    assert.equal(game.options.modeContext.title, '自由练习 · 进阶');
    assert.equal(latestSave.practiceRun.mode, 'practice');
    assert.equal(latestSave.practiceRun.difficulty, 'hard');
    assert.equal(latestSave.practiceRun.trainingDifficulty, 'advanced');
  } finally {
    runtime.restore();
  }
});

test('app runtime opens technique training directly from the home screen', () => {
  const runtime = bootAppRuntime();

  try {
    const entry = runtime.latestMenuCall().layout.techniqueTrainingEntry;
    assert.ok(entry);

    runtime.touch(entry.x + entry.width / 2, entry.y + entry.height / 2);

    assert.ok(runtime.latestTechniqueMenuCall());
    assert.match(runtime.drawnText(), /技巧训练/);
    assert.match(runtime.drawnText(), /初阶技巧/);

    tapTechniqueMenuBack(runtime);

    assert.ok(runtime.latestMenuCall());
    assert.match(runtime.drawnText(), /闯关挑战/);
    assert.match(runtime.drawnText(), /自由练习/);
  } finally {
    runtime.restore();
  }
});

test('app runtime returns from practice technique training to practice difficulty', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);

    assert.ok(runtime.latestTechniqueMenuCall());

    tapTechniqueMenuBack(runtime);

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /自由练习/);
    assert.match(runtime.drawnText(), /推荐：热身/);
  } finally {
    runtime.restore();
  }
});

test('app runtime starts the recommended training source difficulty', () => {
  const runtime = bootAppRuntime({
    initialProgress: {
      version: 1,
      activeRun: null,
      practiceRun: null,
      completedLevelIds: Array.from({ length: 10 }, (_, index) => `lab-${index + 1}`),
      practiceStats: {
        totalCompleted: 0,
        lastDifficulty: null,
        recentLevelIdsByDifficulty: {
          intro: null,
          easy: null,
          normal: null,
          hard: null,
        },
      },
    },
  });

  try {
    tapMenuMode(runtime, 'practice');

    const recommended = runtime
      .latestPracticeMenuCall()
      .layout.difficultyCards.find((card) => card.statusLabel === '推荐');
    assert.equal(recommended.trainingDifficulty, 'standard');

    runtime.touch(recommended.x + recommended.width / 2, recommended.y + recommended.height / 2);

    const game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'normal');
    assert.equal(runtime.latestSave().practiceRun.trainingDifficulty, 'standard');
  } finally {
    runtime.restore();
  }
});

test('app runtime records growth stats for campaign and practice completions', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'campaign');
    completeCurrentLevel(runtime);

    const campaignSave = runtime.latestSave();
    assert.deepEqual(runtime.latestGameCall().options.completionFeedback.stats, [
      { label: '闯关进度', value: `1/${levels.length}` },
      { label: '连续除锈', value: '1 天' },
    ]);
    assert.equal(campaignSave.growthStats.currentStreak, 1);
    assert.equal(campaignSave.growthStats.todayCompletedCount, 1);
    assert.equal(campaignSave.growthStats.campaignCompletedCount, 1);
    assert.equal(campaignSave.growthStats.practiceCompletedCount, 0);
    assert.deepEqual(campaignSave.completedLevelIds, ['lab-01']);

    tapBack(runtime);
    tapMenuMode(runtime, 'practice');
    tapPracticeTrainingDifficulty(runtime, 'advanced');
    completeCurrentLevel(runtime);

    const practiceSave = runtime.latestSave();
    assert.deepEqual(runtime.latestGameCall().options.completionFeedback.stats, [
      { label: '今日训练', value: '2 局' },
      { label: '连续除锈', value: '1 天' },
      { label: '当前训练', value: '进阶' },
    ]);
    assert.equal(practiceSave.growthStats.currentStreak, 1);
    assert.equal(practiceSave.growthStats.todayCompletedCount, 2);
    assert.equal(practiceSave.growthStats.campaignCompletedCount, 1);
    assert.equal(practiceSave.growthStats.practiceCompletedCount, 1);
    assert.deepEqual(practiceSave.completedLevelIds, ['lab-01']);
  } finally {
    runtime.restore();
  }
});

test('app runtime practice victory next uses recommended difficulty and restart returns to difficulty page', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTrainingDifficulty(runtime, 'steady');
    completeCurrentLevel(runtime);

    assert.equal(runtime.latestGameCall().options.victoryActions.next, '下一局');
    assert.equal(runtime.latestGameCall().options.victoryActions.restart, '换难度');

    tapVictoryAction(runtime, 'next');

    assert.equal(runtime.latestGameCall().state.level.difficulty, 'easy');
    assert.equal(runtime.latestSave().practiceRun.trainingDifficulty, 'steady');

    completeCurrentLevel(runtime);
    tapVictoryAction(runtime, 'restart');

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /推荐：标准/);
  } finally {
    runtime.restore();
  }
});

test('app runtime completes a technique lesson from the free practice entry', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);

    assert.ok(runtime.latestTechniqueMenuCall());
    assert.match(runtime.drawnText(), /技巧训练/);

    tapTechniqueCard(runtime, 'single-empty');

    let lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.technique.id, 'single-empty');
    assert.equal(lesson.state.completed, false);
    assert.match(runtime.drawnText(), /唯一空格/);

    advanceTechniqueLessonToInput(runtime);
    lesson = runtime.latestTechniqueLessonCall();
    tapCell(runtime, lesson.layout, 0, 1);
    lesson = runtime.latestTechniqueLessonCall();
    tapDigit(runtime, lesson.layout, 3);

    lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.state.completed, true);
    assert.match(runtime.drawnText(), /这一行补齐了，唯一空格的判断很清楚。/);

    tapTechniqueLessonBack(runtime);
    assert.ok(runtime.latestTechniqueMenuCall());
    tapTechniqueMenuBack(runtime);
    assert.ok(runtime.latestPracticeMenuCall());
  } finally {
    runtime.restore();
  }
});

test('app runtime keeps technique lesson input target focused', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);
    tapTechniqueCard(runtime, 'single-empty');

    let lesson = runtime.latestTechniqueLessonCall();
    const originalSelected = { ...lesson.state.selected };
    const nonTargetValue = lesson.state.cells[0][2].value;

    tapCell(runtime, lesson.layout, 0, 2);
    lesson = runtime.latestTechniqueLessonCall();
    assert.deepEqual(lesson.state.selected, originalSelected);
    assert.equal(lesson.state.cells[0][2].value, nonTargetValue);

    advanceTechniqueLessonToInput(runtime);
    lesson = runtime.latestTechniqueLessonCall();
    tapDigit(runtime, lesson.layout, 9);
    lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.state.completed, false);
    assert.equal(lesson.state.cells[0][1].value, 9);

    tapDigit(runtime, lesson.layout, 3);
    lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.state.completed, true);
    assert.equal(lesson.state.cells[0][1].value, 3);
  } finally {
    runtime.restore();
  }
});

test('app runtime technique training does not persist campaign, practice, or growth progress', () => {
  const initialProgress = createProgressFixture();
  const runtime = bootAppRuntime({ initialProgress });

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);
    tapTechniqueCard(runtime, 'single-empty');

    let lesson = runtime.latestTechniqueLessonCall();
    advanceTechniqueLessonToInput(runtime);
    lesson = runtime.latestTechniqueLessonCall();
    tapCell(runtime, lesson.layout, 0, 1);
    lesson = runtime.latestTechniqueLessonCall();
    tapDigit(runtime, lesson.layout, 3);

    assert.equal(runtime.latestTechniqueLessonCall().state.completed, true);
    assert.equal(runtime.savedWrites.length, 0);
    assert.deepEqual(initialProgress.completedLevelIds, ['lab-01', 'lab-02']);
    assert.equal(initialProgress.practiceStats.totalCompleted, 4);
    assert.equal(initialProgress.growthStats.totalCompletedCount, 6);
    assert.equal(initialProgress.growthStats.campaignCompletedCount, 2);
    assert.equal(initialProgress.growthStats.practiceCompletedCount, 4);
  } finally {
    runtime.restore();
  }
});

test('app runtime preserves stored campaign and practice runs through technique training', () => {
  const initialProgress = createProgressFixture({
    activeRun: createRunFixture(levels[0], 'campaign', { completed: false }),
    practiceRun: createRunFixture(levels[1], 'practice', {
      completed: true,
      trainingDifficulty: 'steady',
    }),
  });
  const runtime = bootAppRuntime({ initialProgress });

  try {
    tapMenuMode(runtime, 'practice');
    tapPracticeTechniqueTraining(runtime);
    tapTechniqueCard(runtime, 'single-empty');
    tapTechniqueLessonBack(runtime);
    tapTechniqueMenuBack(runtime);

    assert.ok(runtime.latestPracticeMenuCall());
    assert.equal(runtime.savedWrites.length, 0);
    assert.deepEqual(initialProgress.activeRun, createRunFixture(levels[0], 'campaign', { completed: false }));
    assert.deepEqual(
      initialProgress.practiceRun,
      createRunFixture(levels[1], 'practice', {
        completed: true,
        trainingDifficulty: 'steady',
      }),
    );
  } finally {
    runtime.restore();
  }
});

test('app runtime advances technique lesson steps before allowing input', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuTechniqueTraining(runtime);
    tapTechniqueCard(runtime, 'single-candidate');

    let lesson = runtime.latestTechniqueLessonCall();
    const target = lesson.options.technique.lesson.target;
    assert.equal(lesson.state.currentStepIndex, 0);

    tapCell(runtime, lesson.layout, target.row, target.col);
    tapDigit(runtime, lesson.layout, target.digit);
    assert.equal(runtime.latestTechniqueLessonCall().state.completed, false);
    assert.equal(runtime.latestTechniqueLessonCall().state.cells[target.row][target.col].value, 0);

    while (!runtime.latestTechniqueLessonCall().options.currentStep.inputEnabled) {
      tapTechniqueNextStep(runtime);
    }

    lesson = runtime.latestTechniqueLessonCall();
    assert.equal(lesson.options.currentStep.inputEnabled, true);
    tapCell(runtime, lesson.layout, target.row, target.col);
    tapDigit(runtime, lesson.layout, target.digit);

    assert.equal(runtime.latestTechniqueLessonCall().state.completed, true);
  } finally {
    runtime.restore();
  }
});

function bootAppRuntime(options = {}) {
  const originalLoad = Module._load;
  const originalAppRuntimeCache = require.cache[appRuntimePath];
  const originalRendererCache = require.cache[rendererPath];
  const ctx = createMockCanvasContext();
  const renderCalls = [];
  const savedWrites = [];
  const animationFrames = [];
  let touchStartHandler = null;

  delete require.cache[appRuntimePath];

  Module._load = function patchedLoad(request, parent, isMain) {
    const resolved = Module._resolveFilename(request, parent, isMain);

    if (resolved === rendererPath) {
      const actual = originalLoad.apply(this, arguments);

      return {
        ...actual,
        renderGame(ctxArg, state, layout, renderOptions) {
          renderCalls.push({
            type: 'game',
            state,
            layout,
            options: renderOptions,
          });
          return actual.renderGame(ctxArg, state, layout, renderOptions);
        },
        renderMenu(ctxArg, layout) {
          renderCalls.push({
            type: 'menu',
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
        renderTechniqueMenu(ctxArg, layout) {
          renderCalls.push({
            type: 'techniqueMenu',
            layout,
          });
          return actual.renderTechniqueMenu(ctxArg, layout);
        },
        renderTechniqueLesson(ctxArg, state, layout, renderOptions) {
          renderCalls.push({
            type: 'techniqueLesson',
            state,
            layout,
            technique: renderOptions && renderOptions.technique,
            options: renderOptions,
          });
          return actual.renderTechniqueLesson(ctxArg, state, layout, renderOptions);
        },
      };
    }

    return originalLoad.apply(this, arguments);
  };

  const platform = {
    createCanvas: () => ({ getContext: () => ctx }),
    getSystemInfo: () => options.systemInfo || ({ pixelRatio: 1, windowWidth: 430, windowHeight: 932 }),
    getTopInset: () => 0,
    getGameplayTopInset: () => 0,
    onTouchStart(handler) {
      touchStartHandler = handler;
    },
    onWindowResize() {},
    showModal() {},
    getStorageSync() {
      return options.initialProgress || null;
    },
    setStorageSync(key, value) {
      savedWrites.push({ key, value });
    },
    removeStorageSync() {},
    createInnerAudioContext: () => ({
      src: '',
      volume: 1,
      obeyMuteSwitch: true,
      play() {},
      stop() {},
      destroy() {},
      onError() {},
    }),
    requestAnimationFrame(callback) {
      const frame = { active: true, callback };
      animationFrames.push(frame);
      return frame;
    },
    cancelAnimationFrame(frame) {
      if (frame) {
        frame.active = false;
      }
    },
    startAccelerometer() {},
    stopAccelerometer() {},
    onAccelerometerChange() {},
    offAccelerometerChange() {},
    getRawApi: () => ({
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
    }),
  };

  const { createAppRuntime } = require(appRuntimePath);
  createAppRuntime(platform).boot();

  assert.equal(typeof touchStartHandler, 'function');

  return {
    renderCalls,
    savedWrites,
    drawnText() {
      return ctx.calls
        .filter((call) => call.name === 'fillText')
        .map((call) => String(call.args[0]))
        .join(' ');
    },
    latestSave() {
      const write = savedWrites.at(-1);
      assert.ok(write);
      return write.value;
    },
    restore() {
      Module._load = originalLoad;
      delete require.cache[appRuntimePath];

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
    latestTechniqueMenuCall() {
      const techniqueMenuCall = [...renderCalls].reverse().find((call) => call.type === 'techniqueMenu');
      assert.ok(techniqueMenuCall);
      return techniqueMenuCall;
    },
    latestTechniqueLessonCall() {
      const techniqueLessonCall = [...renderCalls].reverse().find((call) => call.type === 'techniqueLesson');
      assert.ok(techniqueLessonCall);
      return techniqueLessonCall;
    },
  };
}

function tapMenuMode(runtime, mode) {
  const card = runtime.latestMenuCall().layout.modeCards[mode];
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapPracticeTrainingDifficulty(runtime, trainingDifficulty) {
  const call = runtime.latestPracticeMenuCall();
  const card = call.layout.difficultyCards.find((item) => item.trainingDifficulty === trainingDifficulty);
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapPracticeTechniqueTraining(runtime) {
  const button = runtime.latestPracticeMenuCall().layout.techniqueTrainingButton;
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function tapMenuTechniqueTraining(runtime) {
  const entry = runtime.latestMenuCall().layout.techniqueTrainingEntry;
  assert.ok(entry);
  runtime.touch(entry.x + entry.width / 2, entry.y + entry.height / 2);
}

function tapTechniqueCard(runtime, techniqueId) {
  const card = runtime.latestTechniqueMenuCall().layout.techniqueCards.find((item) => item.id === techniqueId);
  assert.ok(card);
  runtime.touch(card.x + card.width / 2, card.y + card.height / 2);
}

function tapTechniqueMenuBack(runtime) {
  const button = runtime.latestTechniqueMenuCall().layout.backButton;
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function tapTechniqueLessonBack(runtime) {
  const button = runtime.latestTechniqueLessonCall().layout.backButton;
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function tapTechniqueNextStep(runtime) {
  const button = runtime.latestTechniqueLessonCall().layout.techniqueStepButton;
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function advanceTechniqueLessonToInput(runtime) {
  while (!runtime.latestTechniqueLessonCall().options.currentStep.inputEnabled) {
    tapTechniqueNextStep(runtime);
  }
}

function tapVictoryAction(runtime, action) {
  const call = runtime.latestGameCall();
  const button = call.layout.victory[action];
  assert.ok(button);
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function tapBack(runtime) {
  const call = runtime.latestGameCall();
  const button = call.layout.backButton;
  runtime.touch(button.x + button.width / 2, button.y + button.height / 2);
}

function completeCurrentLevel(runtime) {
  let call = runtime.latestGameCall();
  const level = call.state.level;

  level.givens.forEach((row, rowIndex) => {
    row.forEach((given, colIndex) => {
      if (given !== 0) {
        return;
      }

      call = runtime.latestGameCall();
      tapCell(runtime, call.layout, rowIndex, colIndex);
      tapDigit(runtime, call.layout, level.solution[rowIndex][colIndex]);
    });
  });

  assert.equal(runtime.latestGameCall().state.completed, true);
}

function tapCell(runtime, layout, row, col) {
  const cellSize = layout.board.size / 9;
  runtime.touch(
    layout.board.x + col * cellSize + cellSize / 2,
    layout.board.y + row * cellSize + cellSize / 2,
  );
}

function tapDigit(runtime, layout, digit) {
  const key = layout.keypad.keys.find((item) => item.digit === digit);
  assert.ok(key);
  runtime.touch(key.x + key.width / 2, key.y + key.height / 2);
}

function createProgressFixture(overrides = {}) {
  return {
    version: 1,
    activeRun: null,
    practiceRun: null,
    completedLevelIds: ['lab-01', 'lab-02'],
    dailyReport: {
      date: '2026-05-19',
      completionCount: 2,
      completedLevelIds: ['lab-01', 'lab-02'],
    },
    practiceStats: {
      totalCompleted: 4,
      lastDifficulty: 'normal',
      recentLevelIdsByDifficulty: {
        intro: 'lab-01',
        easy: 'lab-02',
        normal: 'lab-03',
        hard: null,
      },
    },
    growthStats: {
      currentStreak: 3,
      bestStreak: 5,
      lastCompletedDate: '2026-05-19',
      todayDate: '2026-05-19',
      todayCompletedCount: 2,
      totalCompletedCount: 6,
      campaignCompletedCount: 2,
      practiceCompletedCount: 4,
    },
    ...overrides,
  };
}

function createRunFixture(level, mode, options = {}) {
  const completed = options.completed === true;

  return {
    mode,
    levelId: level.id,
    difficulty: level.difficulty,
    ...(typeof options.trainingDifficulty === 'string'
      ? { trainingDifficulty: options.trainingDifficulty }
      : {}),
    selected: { row: 0, col: 1 },
    noteMode: false,
    mistakes: 0,
    completed,
    cells: level.givens.map((row) =>
      row.map((value) => ({
        value,
        notes: [],
      })),
    ),
  };
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
