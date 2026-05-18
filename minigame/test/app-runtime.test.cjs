const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const appRuntimePath = path.join(__dirname, '..', 'src', 'app-runtime.js');
const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');

test('app runtime boots to the mode menu', () => {
  const runtime = bootAppRuntime();

  try {
    assert.ok(runtime.latestMenuCall());
    assert.match(runtime.drawnText(), /数独实验室/);
    assert.match(runtime.drawnText(), /闯关挑战/);
    assert.match(runtime.drawnText(), /自由练习/);
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
    assert.equal(latestSave.activeRun.mode, 'campaign');
    assert.equal(latestSave.activeRun.levelId, 'lab-01');
  } finally {
    runtime.restore();
  }
});

test('app runtime opens practice difficulty and starts hard practice gameplay', () => {
  const runtime = bootAppRuntime();

  try {
    tapMenuMode(runtime, 'practice');

    assert.ok(runtime.latestPracticeMenuCall());
    assert.match(runtime.drawnText(), /自由练习/);

    tapPracticeDifficulty(runtime, 'hard');

    const game = runtime.latestGameCall();
    const latestSave = runtime.latestSave();

    assert.equal(game.state.level.difficulty, 'hard');
    assert.equal(latestSave.practiceRun.mode, 'practice');
    assert.equal(latestSave.practiceRun.difficulty, 'hard');
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
      return null;
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
  };
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
