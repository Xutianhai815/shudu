# 华为 H5 快游戏迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有微信数独小游戏迁移出平台无关运行时，并新增可在浏览器运行、后续可被华为快应用 IDE 包装为 H5 快游戏的入口。

**Architecture:** 把当前 `minigame/game.js` 中的状态机抽到 `minigame/src/app-runtime.js`，平台能力由 `wechat-platform.js` 和 `h5-platform.js` 提供。微信入口继续薄封装 `wx`，H5 入口复用同一套 runtime、Canvas renderer、关卡、存档和反馈逻辑。

**Tech Stack:** JavaScript CommonJS, Node test runner, Canvas 2D, 微信小游戏 `wx` API, browser DOM/localStorage/HTMLAudioElement, zero-dependency H5 preview.

---

## Scope Boundary

- 本计划实现 H5 本地可运行版本和华为 H5 快游戏包装准备。
- 本计划不接入华为账号、游戏服务、防沉迷、广告、支付、排行榜、云存档。
- 本计划不引入 Cocos/Laya/Egret，也不做 Runtime 快游戏重写。
- 本计划不改变数独玩法、首页双模式、自由训练、完成反馈和安静陪伴系统的产品逻辑。

## File Structure

- Create `minigame/src/platform/wechat-platform.js`
  - 微信平台适配层，封装 `wx`、Canvas、触摸、存储、音频、动画帧、加速度和弹窗。
- Create `minigame/src/platform/h5-platform.js`
  - H5 平台适配层，封装浏览器 Canvas、DOM 事件、localStorage、confirm、HTMLAudioElement、requestAnimationFrame 和 DeviceMotion 降级。
- Create `minigame/src/app-runtime.js`
  - 平台无关游戏控制器，承接当前 `game.js` 的场景、状态、触摸、存档、音效、陪伴提示、菜单动画逻辑。
- Modify `minigame/game.js`
  - 变成微信入口：创建微信平台并调用 `createAppRuntime(platform).boot()`。
- Create `minigame/test/app-runtime.test.cjs`
  - 用 mock platform 验证 runtime 可启动、进入闯关、进入自由训练、完成关卡、保存进度、保持微信既有行为。
- Create `minigame/test/h5-platform.test.cjs`
  - 验证 H5 平台的存储、系统信息、弹窗、触摸、音频降级和动画帧接口。
- Create `huawei-h5/index.html`
  - H5 预览页面，提供全屏 Canvas 和入口脚本。
- Create `huawei-h5/styles.css`
  - H5 页面布局样式。
- Create `huawei-h5/main.js`
  - H5 入口，创建 H5 platform 并启动 runtime。
- Create `huawei-h5/README.md`
  - 本地预览、华为快应用 IDE 包装、RPK 打包和人工准备项说明。
- Modify `.gitignore`
  - 忽略 `huawei-h5/dist/`、`huawei-h5/build/`、`*.rpk` 已存在；如实现中新增临时目录，补充忽略规则。
- Modify `minigame/README.md`
  - 增加“多平台入口”说明，避免后来维护者继续把功能写死在微信入口。

---

### Task 1: Define Platform Contract And H5 Platform

**Files:**
- Create: `minigame/src/platform/h5-platform.js`
- Create: `minigame/test/h5-platform.test.cjs`

- [ ] **Step 1: Write failing tests for H5 storage, system info, modal, touch, and safe fallbacks**

Create `minigame/test/h5-platform.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { createH5Platform } = require('../src/platform/h5-platform');

test('h5 platform reads window size and device pixel ratio', () => {
  const platform = createH5Platform(createMockBrowser());

  assert.deepEqual(platform.getSystemInfo(), {
    pixelRatio: 2,
    windowWidth: 430,
    windowHeight: 932,
    statusBarHeight: 0,
  });
  assert.equal(platform.getTopInset(), 0);
  assert.equal(platform.getEnvironment(), 'h5');
});

test('h5 platform stores JSON-compatible progress values in localStorage', () => {
  const browser = createMockBrowser();
  const platform = createH5Platform(browser);

  platform.setStorageSync('lab-lines-progress-v1', { activeRun: { levelId: 'lab-01' } });

  assert.deepEqual(platform.getStorageSync('lab-lines-progress-v1'), {
    activeRun: { levelId: 'lab-01' },
  });

  platform.removeStorageSync('lab-lines-progress-v1');

  assert.equal(platform.getStorageSync('lab-lines-progress-v1'), null);
});

test('h5 platform returns null when stored JSON is malformed', () => {
  const browser = createMockBrowser();
  browser.localStorage.setItem('broken', '{');

  assert.equal(createH5Platform(browser).getStorageSync('broken'), null);
});

test('h5 platform maps confirm result to wx-style showModal success payload', () => {
  const browser = createMockBrowser({ confirmResult: true });
  const platform = createH5Platform(browser);
  let payload = null;

  platform.showModal({
    title: '重新开始本局？',
    content: '要清空本局已填写内容吗？',
    success(result) {
      payload = result;
    },
  });

  assert.deepEqual(payload, { confirm: true, cancel: false });
  assert.equal(browser.confirmMessage, '重新开始本局？\n要清空本局已填写内容吗？');
});

test('h5 platform registers touch and mouse input as wx-style touches', () => {
  const browser = createMockBrowser();
  const platform = createH5Platform(browser);
  const events = [];

  platform.onTouchStart((event) => events.push(event));
  browser.canvas.dispatch('touchstart', {
    preventDefault() {},
    touches: [{ clientX: 12, clientY: 34 }],
  });
  browser.canvas.dispatch('mousedown', {
    preventDefault() {},
    clientX: 56,
    clientY: 78,
  });

  assert.deepEqual(events, [
    { touches: [{ clientX: 12, clientY: 34 }] },
    { touches: [{ clientX: 56, clientY: 78 }] },
  ]);
});

test('h5 platform creates a no-crash audio context wrapper when Audio is unavailable', () => {
  const browser = createMockBrowser({ Audio: null });
  const audio = createH5Platform(browser).createInnerAudioContext();

  audio.src = 'assets/sounds/input.wav';
  audio.volume = 0.5;

  assert.doesNotThrow(() => audio.play());
  assert.doesNotThrow(() => audio.stop());
  assert.doesNotThrow(() => audio.destroy());
});

function createMockBrowser(options = {}) {
  const storage = new Map();
  const listeners = new Map();
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => createMockCanvasContext(),
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    dispatch(type, event) {
      listeners.get(type)(event);
    },
  };

  return {
    canvas,
    innerWidth: 430,
    innerHeight: 932,
    devicePixelRatio: 2,
    document: {
      getElementById(id) {
        return id === 'gameCanvas' ? canvas : null;
      },
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
    confirm(message) {
      this.confirmMessage = message;
      return options.confirmResult === true;
    },
    addEventListener(type, handler) {
      listeners.set(`window:${type}`, handler);
    },
    requestAnimationFrame(callback) {
      this.animationCallback = callback;
      return 1;
    },
    cancelAnimationFrame(frame) {
      this.cancelledFrame = frame;
    },
    Audio: options.Audio,
  };
}

function createMockCanvasContext() {
  return {
    setTransform() {},
    clearRect() {},
  };
}
```

- [ ] **Step 2: Run the H5 platform tests and verify they fail**

Run:

```bash
node --test minigame/test/h5-platform.test.cjs
```

Expected: FAIL with `Cannot find module '../src/platform/h5-platform'`.

- [ ] **Step 3: Implement `createH5Platform`**

Create `minigame/src/platform/h5-platform.js`:

```js
function createH5Platform(browser = globalThis) {
  const canvas = getCanvas(browser);
  let motionHandler = null;

  return {
    createCanvas() {
      return canvas;
    },
    getSystemInfo() {
      return {
        pixelRatio: browser.devicePixelRatio || 1,
        windowWidth: browser.innerWidth || 375,
        windowHeight: browser.innerHeight || 667,
        statusBarHeight: 0,
      };
    },
    getTopInset() {
      return 0;
    },
    onTouchStart(handler) {
      canvas.addEventListener('touchstart', (event) => {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }

        const touch = event.touches && event.touches[0];
        if (touch) {
          handler({ touches: [{ clientX: touch.clientX, clientY: touch.clientY }] });
        }
      });

      canvas.addEventListener('mousedown', (event) => {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }

        handler({ touches: [{ clientX: event.clientX, clientY: event.clientY }] });
      });
    },
    onWindowResize(handler) {
      if (typeof browser.addEventListener === 'function') {
        browser.addEventListener('resize', handler);
      }
    },
    showModal(options) {
      const message = [options && options.title, options && options.content]
        .filter(Boolean)
        .join('\n');
      const confirm = typeof browser.confirm === 'function' ? browser.confirm(message) : false;

      if (options && typeof options.success === 'function') {
        options.success({ confirm, cancel: !confirm });
      }
    },
    getStorageSync(key) {
      try {
        const value = browser.localStorage && browser.localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        return null;
      }
    },
    setStorageSync(key, value) {
      if (browser.localStorage) {
        browser.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    removeStorageSync(key) {
      if (browser.localStorage) {
        browser.localStorage.removeItem(key);
      }
    },
    createInnerAudioContext() {
      return createAudioContext(browser);
    },
    requestAnimationFrame(callback) {
      return typeof browser.requestAnimationFrame === 'function'
        ? browser.requestAnimationFrame(callback)
        : setTimeout(callback, 1000 / 30);
    },
    cancelAnimationFrame(frame) {
      if (typeof browser.cancelAnimationFrame === 'function') {
        browser.cancelAnimationFrame(frame);
        return;
      }

      clearTimeout(frame);
    },
    startAccelerometer() {},
    stopAccelerometer() {
      motionHandler = null;
    },
    onAccelerometerChange(handler) {
      motionHandler = handler;
      if (typeof browser.addEventListener === 'function') {
        browser.addEventListener('devicemotion', (event) => {
          if (motionHandler) {
            motionHandler({
              x: event.accelerationIncludingGravity && event.accelerationIncludingGravity.x,
              y: event.accelerationIncludingGravity && event.accelerationIncludingGravity.y,
            });
          }
        });
      }
    },
    offAccelerometerChange() {
      motionHandler = null;
    },
    getEnvironment() {
      return 'h5';
    },
  };
}

function getCanvas(browser) {
  const canvas =
    browser.document &&
    typeof browser.document.getElementById === 'function' &&
    browser.document.getElementById('gameCanvas');

  if (!canvas) {
    throw new Error('H5 canvas element #gameCanvas is required.');
  }

  return canvas;
}

function createAudioContext(browser) {
  if (typeof browser.Audio !== 'function') {
    return createSilentAudioContext();
  }

  const audio = new browser.Audio();

  return {
    get src() {
      return audio.src;
    },
    set src(value) {
      audio.src = value;
    },
    get volume() {
      return audio.volume;
    },
    set volume(value) {
      audio.volume = value;
    },
    obeyMuteSwitch: true,
    play() {
      try {
        const result = audio.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {});
        }
      } catch (error) {}
    },
    stop() {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {}
    },
    destroy() {
      this.stop();
    },
    onError() {},
  };
}

function createSilentAudioContext() {
  return {
    src: '',
    volume: 1,
    obeyMuteSwitch: true,
    play() {},
    stop() {},
    destroy() {},
    onError() {},
  };
}

module.exports = {
  createH5Platform,
};
```

- [ ] **Step 4: Run tests and commit**

Run:

```bash
node --test minigame/test/h5-platform.test.cjs
```

Expected: PASS.

Commit:

```bash
git add minigame/src/platform/h5-platform.js minigame/test/h5-platform.test.cjs
git commit -m "feat: add h5 platform adapter"
```

---

### Task 2: Extract WeChat Platform Adapter

**Files:**
- Create: `minigame/src/platform/wechat-platform.js`
- Modify: `minigame/game.js`
- Test: `minigame/test/game-runtime.test.cjs`

- [ ] **Step 1: Create a WeChat platform adapter**

Create `minigame/src/platform/wechat-platform.js`:

```js
function createWechatPlatform(wxLike) {
  return {
    createCanvas() {
      return wxLike.createCanvas();
    },
    getSystemInfo() {
      return wxLike.getSystemInfoSync();
    },
    getTopInset(systemInfo) {
      const statusBarHeight = Number.isFinite(systemInfo && systemInfo.statusBarHeight)
        ? systemInfo.statusBarHeight
        : 0;

      if (typeof wxLike.getMenuButtonBoundingClientRect === 'function') {
        try {
          const rect = wxLike.getMenuButtonBoundingClientRect();
          if (rect && Number.isFinite(rect.bottom)) {
            return rect.bottom + 8;
          }
        } catch (error) {}
      }

      return statusBarHeight > 0 ? statusBarHeight + 12 : 0;
    },
    onTouchStart(handler) {
      wxLike.onTouchStart(handler);
    },
    onWindowResize(handler) {
      if (typeof wxLike.onWindowResize === 'function') {
        wxLike.onWindowResize(handler);
      }
    },
    showModal(options) {
      if (typeof wxLike.showModal === 'function') {
        wxLike.showModal(options);
      }
    },
    getStorageSync(key) {
      return wxLike.getStorageSync(key);
    },
    setStorageSync(key, value) {
      wxLike.setStorageSync(key, value);
    },
    removeStorageSync(key) {
      if (typeof wxLike.removeStorageSync === 'function') {
        wxLike.removeStorageSync(key);
      }
    },
    createInnerAudioContext() {
      return wxLike.createInnerAudioContext();
    },
    requestAnimationFrame(callback) {
      if (typeof wxLike.requestAnimationFrame === 'function') {
        return wxLike.requestAnimationFrame(callback);
      }

      return requestAnimationFrame(callback);
    },
    cancelAnimationFrame(frame) {
      if (typeof wxLike.cancelAnimationFrame === 'function') {
        wxLike.cancelAnimationFrame(frame);
        return;
      }

      cancelAnimationFrame(frame);
    },
    startAccelerometer(options) {
      if (typeof wxLike.startAccelerometer === 'function') {
        wxLike.startAccelerometer(options);
      }
    },
    stopAccelerometer() {
      if (typeof wxLike.stopAccelerometer === 'function') {
        wxLike.stopAccelerometer();
      }
    },
    onAccelerometerChange(handler) {
      if (typeof wxLike.onAccelerometerChange === 'function') {
        wxLike.onAccelerometerChange(handler);
      }
    },
    offAccelerometerChange(handler) {
      if (typeof wxLike.offAccelerometerChange === 'function') {
        wxLike.offAccelerometerChange(handler);
      }
    },
    getEnvironment() {
      const account = typeof wxLike.getAccountInfoSync === 'function'
        ? wxLike.getAccountInfoSync()
        : null;
      return account && account.miniProgram && account.miniProgram.envVersion
        ? account.miniProgram.envVersion
        : 'wechat';
    },
    getRawApi() {
      return wxLike;
    },
  };
}

module.exports = {
  createWechatPlatform,
};
```

- [ ] **Step 2: Modify `game.js` only enough to use `createWechatPlatform` for duplicated platform reads**

At the top of `minigame/game.js`, add:

```js
const { createWechatPlatform } = require('./src/platform/wechat-platform');
```

Replace:

```js
const canvas = wx.createCanvas();
```

with:

```js
const platform = createWechatPlatform(wx);
const canvas = platform.createCanvas();
```

In `setupCanvas()`, replace:

```js
const systemInfo = wx.getSystemInfoSync();
```

with:

```js
const systemInfo = platform.getSystemInfo();
```

Replace:

```js
topInset = getTopInset(wx, systemInfo);
```

with:

```js
topInset = platform.getTopInset(systemInfo);
```

Do not remove `getTopInset()` yet in this task; it will disappear when the runtime is extracted in Task 3.

- [ ] **Step 3: Run runtime tests**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: PASS.

- [ ] **Step 4: Run full mini game tests and commit**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS.

Commit:

```bash
git add minigame/game.js minigame/src/platform/wechat-platform.js
git commit -m "refactor: add wechat platform adapter"
```

---

### Task 3: Extract Platform-Neutral App Runtime

**Files:**
- Create: `minigame/src/app-runtime.js`
- Create: `minigame/test/app-runtime.test.cjs`
- Modify: `minigame/game.js`
- Modify: `minigame/test/game-runtime.test.cjs`

- [ ] **Step 1: Write a runtime boot smoke test with a mock platform**

Create `minigame/test/app-runtime.test.cjs`:

```js
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const { createAppRuntime } = require('../src/app-runtime');

const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');

test('app runtime boots to menu and enters campaign gameplay through platform touch', () => {
  const runtime = bootRuntime();

  try {
    assert.equal(runtime.latestRender().type, 'menu');

    tap(runtime, runtime.latestRender().layout.modeCards[0]);

    const game = runtime.latestRender();
    assert.equal(game.type, 'game');
    assert.equal(game.state.mode, 'campaign');
    assert.equal(game.state.level.id, 'lab-01');
    assert.ok(runtime.platform.savedWrites.length >= 1);
  } finally {
    runtime.restore();
  }
});

test('app runtime enters free training difficulty menu and starts selected practice level', () => {
  const runtime = bootRuntime();

  try {
    tap(runtime, runtime.latestRender().layout.modeCards[1]);

    assert.equal(runtime.latestRender().type, 'practiceMenu');

    const hardCard = runtime.latestRender().layout.difficultyCards.find((card) => card.difficulty === 'hard');
    tap(runtime, hardCard);

    const game = runtime.latestRender();
    assert.equal(game.type, 'game');
    assert.equal(game.state.mode, 'practice');
    assert.equal(game.state.level.difficulty, 'hard');
  } finally {
    runtime.restore();
  }
});

function bootRuntime() {
  const originalLoad = Module._load;
  const originalRendererCache = require.cache[rendererPath];
  const platform = createMockPlatform();
  const renders = [];

  Module._load = function patchedLoad(request, parent, isMain) {
    const resolved = Module._resolveFilename(request, parent, isMain);

    if (resolved === rendererPath) {
      const actual = originalLoad.apply(this, arguments);
      return {
        renderMenu(ctx, layout) {
          renders.push({ type: 'menu', layout });
        },
        renderPracticeMenu(ctx, layout) {
          renders.push({ type: 'practiceMenu', layout });
        },
        renderGame(ctx, state, layout, options) {
          renders.push({ type: 'game', state, layout, options });
        },
      };
    }

    return originalLoad.apply(this, arguments);
  };

  createAppRuntime(platform).boot();

  return {
    platform,
    latestRender() {
      const render = renders[renders.length - 1];
      assert.ok(render);
      return render;
    },
    restore() {
      Module._load = originalLoad;
      if (originalRendererCache) {
        require.cache[rendererPath] = originalRendererCache;
      } else {
        delete require.cache[rendererPath];
      }
    },
  };
}

function tap(runtime, rect) {
  runtime.platform.touch(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function createMockPlatform() {
  let touchHandler = null;
  const savedWrites = [];

  return {
    savedWrites,
    createCanvas: () => ({ getContext: () => ({ setTransform() {} }) }),
    getSystemInfo: () => ({ pixelRatio: 1, windowWidth: 430, windowHeight: 932, statusBarHeight: 0 }),
    getTopInset: () => 0,
    onTouchStart(handler) {
      touchHandler = handler;
    },
    onWindowResize() {},
    showModal(request) {
      request.success({ confirm: true, cancel: false });
    },
    getStorageSync: () => null,
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
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    startAccelerometer() {},
    stopAccelerometer() {},
    onAccelerometerChange() {},
    offAccelerometerChange() {},
    getEnvironment: () => 'develop',
    touch(clientX, clientY) {
      touchHandler({ touches: [{ clientX, clientY }] });
    },
  };
}
```

- [ ] **Step 2: Run the app runtime test and verify it fails**

Run:

```bash
node --test minigame/test/app-runtime.test.cjs
```

Expected: FAIL with `Cannot find module '../src/app-runtime'`.

- [ ] **Step 3: Move the current `game.js` state machine into `app-runtime.js`**

Create `minigame/src/app-runtime.js` by moving the current runtime logic out of `minigame/game.js`.

Required exports:

```js
function createAppRuntime(platform) {
  // Keep the existing state variables inside this factory:
  // scene, state, savedProgress, completedLevelIds, menuLayout, practiceMenuLayout,
  // layout, dpr, soundManager, topInset, companionSession, timers, animation, tilt.
  return {
    boot,
  };
}

module.exports = {
  createAppRuntime,
};
```

Required import changes inside `app-runtime.js`:

```js
const {
  applyDigit,
  createPuzzleState,
  eraseSelected,
  nextLevel,
  restartLevel,
  retrySameDifficultyLevel,
  selectCell,
  toggleNoteMode,
} = require('./puzzle');
const { createLayout, hitTest } = require('./layout');
const { levels, getLevelById } = require('./levels');
const { createMenuLayout, hitTestMenu } = require('./menu');
const { createPracticeMenuLayout, hitTestPracticeMenu } = require('./practice-menu');
const {
  createProgressFromRuns,
  createRunFromState,
  restoreStateFromProgress,
} = require('./progress');
const { loadProgress, saveProgress } = require('./storage');
const { renderGame, renderMenu, renderPracticeMenu } = require('./renderer');
const {
  createCompletionFeedback,
  createNextDailyReport,
  getTodayKey,
} = require('./derust');
const { isDebugToolsEnabled } = require('./debug');
const { createSoundManager } = require('./sound');
const {
  createCompanionSession,
  createCompanionView,
  registerCompanionAction,
} = require('./companion-feedback');
const { choosePracticeLevel, recordPracticeCompletion } = require('./game-modes');
```

Replace all direct `wx` usage with `platform`:

```js
debugToolsEnabled = isDebugToolsEnabled(platform.getRawApi ? platform.getRawApi() : null);
soundManager = createSoundManager(platform);
savedProgress = loadProgress(platform);
const systemInfo = platform.getSystemInfo();
topInset = platform.getTopInset(systemInfo);
platform.onTouchStart((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) {
    return;
  }

  if (scene === 'menu') {
    handleMenuTouch(touch);
    return;
  }

  if (scene === 'practiceMenu') {
    handlePracticeMenuTouch(touch);
    return;
  }

  if (scene === 'playing') {
    handleGameTouch(touch);
  }
});
platform.onWindowResize(() => {
  setupCanvas();
  render();
});
platform.showModal({
  title: '重新开始本局？',
  content: '要清空本局已填写内容吗？题面数字会保留。',
  confirmText: '重开',
  cancelText: '取消',
  success(result) {
    if (result && result.confirm === true) {
      state = restartLevel(state);
      resetCompanionSession(state.level);
      persistProgress();
      playSound('tool');
      render();
    }
  },
});
```

Replace `requestFrame()` and `cancelFrame()` helpers with platform methods:

```js
function requestFrame(callback) {
  return platform.requestAnimationFrame(callback);
}

function cancelFrame(frame) {
  platform.cancelAnimationFrame(frame);
}
```

Replace accelerometer calls with platform calls:

```js
platform.onAccelerometerChange(menuAccelerometerHandler);
platform.startAccelerometer({ interval: 'game' });
platform.offAccelerometerChange(menuAccelerometerHandler);
platform.stopAccelerometer();
```

- [ ] **Step 4: Make `game.js` a thin WeChat entry**

Replace `minigame/game.js` with:

```js
const { createAppRuntime } = require('./src/app-runtime');
const { createWechatPlatform } = require('./src/platform/wechat-platform');

createAppRuntime(createWechatPlatform(wx)).boot();
```

- [ ] **Step 5: Run focused runtime tests**

Run:

```bash
node --test minigame/test/app-runtime.test.cjs minigame/test/game-runtime.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Run full tests and commit**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS.

Commit:

```bash
git add minigame/game.js minigame/src/app-runtime.js minigame/test/app-runtime.test.cjs minigame/test/game-runtime.test.cjs
git commit -m "refactor: extract platform-neutral app runtime"
```

---

### Task 4: Add H5 Preview Entry

**Files:**
- Create: `huawei-h5/index.html`
- Create: `huawei-h5/styles.css`
- Create: `huawei-h5/main.js`
- Modify: `minigame/test/h5-platform.test.cjs`

- [ ] **Step 1: Add an H5 entry smoke test for required files**

Append to `minigame/test/h5-platform.test.cjs`:

```js
const fs = require('node:fs');
const path = require('node:path');

test('huawei h5 preview entry includes canvas and startup script', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'huawei-h5', 'index.html'), 'utf8');

  assert.match(html, /<canvas id="gameCanvas"/);
  assert.match(html, /main\.js/);
  assert.match(html, /styles\.css/);
});

test('huawei h5 main starts the shared app runtime with h5 platform', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', '..', 'huawei-h5', 'main.js'), 'utf8');

  assert.match(main, /createAppRuntime/);
  assert.match(main, /createH5Platform/);
  assert.match(main, /\.boot\(\)/);
});
```

- [ ] **Step 2: Run the H5 platform test and verify it fails**

Run:

```bash
node --test minigame/test/h5-platform.test.cjs
```

Expected: FAIL because `huawei-h5/index.html` and `huawei-h5/main.js` do not exist.

- [ ] **Step 3: Create `huawei-h5/index.html`**

Create `huawei-h5/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    />
    <meta name="theme-color" content="#f4efe4" />
    <title>数独实验室</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <canvas id="gameCanvas" aria-label="数独实验室游戏画布"></canvas>
    <script src="./main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `huawei-h5/styles.css`**

Create `huawei-h5/styles.css`:

```css
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #f4efe4;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

#gameCanvas {
  display: block;
  width: 100vw;
  height: 100vh;
  background: #f4efe4;
}
```

- [ ] **Step 5: Create `huawei-h5/main.js`**

Create `huawei-h5/main.js`:

```js
(function startLabLinesSudoku() {
  const { createAppRuntime } = require('../minigame/src/app-runtime');
  const { createH5Platform } = require('../minigame/src/platform/h5-platform');

  createAppRuntime(createH5Platform(window)).boot();
})();
```

This file intentionally uses CommonJS for local Node/bundler compatibility. If opened directly in a browser before Task 5, it will require bundling.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
node --test minigame/test/h5-platform.test.cjs
```

Expected: PASS.

Commit:

```bash
git add huawei-h5/index.html huawei-h5/styles.css huawei-h5/main.js minigame/test/h5-platform.test.cjs
git commit -m "feat: add huawei h5 preview entry"
```

---

### Task 5: Add Zero-Dependency Browser Bundle Script

**Files:**
- Create: `huawei-h5/build.js`
- Modify: `huawei-h5/index.html`
- Modify: `huawei-h5/README.md`
- Modify: `.gitignore`
- Test: `minigame/test/h5-platform.test.cjs`

- [ ] **Step 1: Add tests for bundle script and built output contract**

Append to `minigame/test/h5-platform.test.cjs`:

```js
test('huawei h5 build script exists and writes a browser bundle', () => {
  const buildScript = fs.readFileSync(path.join(__dirname, '..', '..', 'huawei-h5', 'build.js'), 'utf8');

  assert.match(buildScript, /dist\/game\.bundle\.js/);
  assert.match(buildScript, /minigame\/src\/app-runtime/);
  assert.match(buildScript, /minigame\/src\/platform\/h5-platform/);
});

test('huawei h5 html loads built bundle for browser preview', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'huawei-h5', 'index.html'), 'utf8');

  assert.match(html, /dist\/game\.bundle\.js/);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
node --test minigame/test/h5-platform.test.cjs
```

Expected: FAIL because `huawei-h5/build.js` does not exist and `index.html` still loads `main.js`.

- [ ] **Step 3: Create a small CommonJS bundler script**

Create `huawei-h5/build.js`:

```js
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ENTRY = path.join(ROOT, 'huawei-h5', 'main.js');
const OUT_DIR = path.join(ROOT, 'huawei-h5', 'dist');
const OUT_FILE = path.join(OUT_DIR, 'game.bundle.js');

function buildBundle() {
  const modules = new Map();
  collectModule(ENTRY, modules);

  const moduleEntries = Array.from(modules.entries())
    .map(([id, code]) => `${JSON.stringify(id)}: function(require, module, exports) {\n${code}\n}`)
    .join(',\n');

  const entryId = toModuleId(ENTRY);
  const bundle = `(function(modules) {
  var cache = {};
  function localRequire(id) {
    if (cache[id]) {
      return cache[id].exports;
    }
    if (!modules[id]) {
      throw new Error('Module not found: ' + id);
    }
    var module = { exports: {} };
    cache[id] = module;
    modules[id](localRequire, module, module.exports);
    return module.exports;
  }
  localRequire(${JSON.stringify(entryId)});
})({
${moduleEntries}
});
`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, bundle);
  return OUT_FILE;
}

function collectModule(filename, modules) {
  const id = toModuleId(filename);
  if (modules.has(id)) {
    return;
  }

  const source = fs.readFileSync(filename, 'utf8');
  const rewritten = source.replace(/require\((['"])(\..+?)\1\)/g, (match, quote, request) => {
    const resolved = resolveRequest(filename, request);
    collectModule(resolved, modules);
    return `require(${JSON.stringify(toModuleId(resolved))})`;
  });

  modules.set(id, rewritten);
}

function resolveRequest(fromFile, request) {
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [base, `${base}.js`, path.join(base, 'index.js')];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolved) {
    throw new Error(`Unable to resolve ${request} from ${fromFile}`);
  }

  return resolved;
}

function toModuleId(filename) {
  return path.relative(ROOT, filename).replace(/\\/g, '/');
}

if (require.main === module) {
  const output = buildBundle();
  console.log(output);
}

module.exports = {
  buildBundle,
};
```

- [ ] **Step 4: Update `huawei-h5/index.html` to load the bundle**

Replace:

```html
<script src="./main.js"></script>
```

with:

```html
<script src="./dist/game.bundle.js"></script>
```

- [ ] **Step 5: Add `huawei-h5/README.md`**

Create `huawei-h5/README.md`:

```md
# 华为 H5 快游戏预览工程

此目录提供数独实验室的 H5 入口，用于先在浏览器验证，再交给华为快应用 IDE 包装为 H5 快游戏。

## 本地构建

```bash
node huawei-h5/build.js
```

构建产物：

- `huawei-h5/dist/game.bundle.js`

## 本地预览

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://127.0.0.1:8080/huawei-h5/
```

## 华为快游戏包装

1. 安装并打开华为快应用 IDE。
2. 创建 H5 快游戏项目。
3. 应用名称使用“数独实验室”或正式上架名称。
4. 包名使用上架前确定的唯一包名，例如 `com.lablines.sudoku`。
5. 方向选择竖屏，显示方式选择全屏。
6. 将 H5 入口指向 `index.html`，并确保 `dist/game.bundle.js`、`styles.css` 随包可访问。
7. 使用真机或快游戏调试工具运行。
8. 打包正式版本生成 `RPK`。

## 第一版不包含

- 华为账号登录。
- 防沉迷和实名认证。
- 广告、支付、排行榜、云存档。

这些能力如审核或运营需要，应单独开 spec 和 plan 接入。
```

- [ ] **Step 6: Run build and tests**

Run:

```bash
node huawei-h5/build.js
node --test minigame/test/h5-platform.test.cjs
```

Expected: build prints `/Users/tianhai/Documents/微信小游戏/huawei-h5/dist/game.bundle.js`; tests PASS.

- [ ] **Step 7: Commit source files without generated bundle**

`huawei-h5/dist/` should remain ignored. Commit:

```bash
git add huawei-h5/build.js huawei-h5/index.html huawei-h5/README.md minigame/test/h5-platform.test.cjs .gitignore
git commit -m "build: add huawei h5 browser bundle script"
```

---

### Task 6: Browser Smoke Verification

**Files:**
- Modify: `minigame/test/h5-platform.test.cjs`
- Modify: `huawei-h5/README.md`

- [ ] **Step 1: Add a generated bundle smoke test**

Append to `minigame/test/h5-platform.test.cjs`:

```js
test('huawei h5 build produces a bundle containing startup modules', () => {
  const { buildBundle } = require('../../huawei-h5/build');
  const output = buildBundle();
  const bundle = fs.readFileSync(output, 'utf8');

  assert.match(bundle, /createAppRuntime/);
  assert.match(bundle, /createH5Platform/);
  assert.match(bundle, /数独实验室/);
});
```

- [ ] **Step 2: Run the smoke test**

Run:

```bash
node --test minigame/test/h5-platform.test.cjs
```

Expected: PASS.

- [ ] **Step 3: Start local HTTP server and manually preview**

Run:

```bash
python3 -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080/huawei-h5/
```

Manual expected result:

- 首页显示数独实验室。
- 点击 `闯关实验` 进入 LAB-01。
- 点击返回后可进入 `自由训练`。
- 选择 `挑战` 能进入 hard 难度练习。

- [ ] **Step 4: Update H5 README with smoke checklist**

Append to `huawei-h5/README.md`:

```md
## 本地冒烟检查

- 首页显示 `数独实验室`。
- `闯关实验` 可进入 LAB-01。
- `自由训练` 可进入难度选择页。
- 选择 `挑战` 可进入 hard 难度练习。
- 数字输入、草稿模式、清除和重开确认可用。
- 完成一局后显示“大脑除锈”反馈。
```

- [ ] **Step 5: Commit**

Run:

```bash
git add minigame/test/h5-platform.test.cjs huawei-h5/README.md
git commit -m "test: add huawei h5 bundle smoke check"
```

---

### Task 7: Documentation And Release Readiness

**Files:**
- Modify: `minigame/README.md`
- Create: `docs/huawei-h5-quickgame-checklist.md`

- [ ] **Step 1: Update mini game README with shared-runtime guidance**

Add to `minigame/README.md` after `## Current Scope`:

```md
## Multi-Platform Runtime

The playable game should stay platform-neutral whenever possible:

- Shared gameplay logic lives in `src/app-runtime.js` and `src/`.
- WeChat-specific APIs live in `src/platform/wechat-platform.js` and `game.js`.
- H5/Huawei Quick Game APIs live in `src/platform/h5-platform.js` and `../huawei-h5/`.

When adding a gameplay feature, put it in shared modules first. Only add platform-specific code for capabilities such as login, sharing, payment, storage bridges, or channel review requirements.
```

- [ ] **Step 2: Create Huawei checklist**

Create `docs/huawei-h5-quickgame-checklist.md`:

```md
# 华为 H5 快游戏上线准备清单

## 开发者后台

- 注册并认证华为开发者账号。
- 在 AppGallery Connect 创建项目。
- 添加快游戏应用。
- 确认应用名称、包名、分类、图标和版本号。
- 生成签名证书和证书指纹。
- 在 AppGallery Connect 配置证书指纹。

## 本地工程

- 运行 `node --test minigame/test/*.test.cjs`。
- 运行 `node huawei-h5/build.js`。
- 本地打开 `http://127.0.0.1:8080/huawei-h5/` 完成冒烟检查。
- 在华为快应用 IDE 中创建 H5 快游戏项目。
- 配置竖屏、全屏、图标和 H5 入口。
- 使用真机或快游戏调试工具运行。
- 打包 release RPK。

## 审核材料

- 应用一句话简介。
- 应用详细介绍。
- 应用图标。
- 竖屏截图。
- 隐私政策链接。
- 用户协议或游戏说明。
- 版权和素材来源说明。

## 合规自查

- “大脑除锈”文案不包含疾病预防或治疗承诺。
- 游戏过程不判断输入对错，只提示重复冲突。
- 第一版不采集个人信息。
- 第一版不包含广告、支付、排行榜和账号登录。
- 如华为审核要求游戏登录、防沉迷或实名认证，单独启动 HMS 能力接入计划。
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS.

Commit:

```bash
git add minigame/README.md docs/huawei-h5-quickgame-checklist.md
git commit -m "docs: add huawei quick game readiness checklist"
```

---

### Task 8: Final Verification

**Files:**
- No source changes unless verification finds a defect.

- [ ] **Step 1: Run all Node tests**

Run:

```bash
node --test minigame/test/*.test.cjs
node --test test/puzzle.test.mjs
```

Expected: both commands PASS.

- [ ] **Step 2: Build H5 bundle**

Run:

```bash
node huawei-h5/build.js
```

Expected: prints `huawei-h5/dist/game.bundle.js`.

- [ ] **Step 3: Regenerate visual snapshots**

Run:

```bash
node minigame/tools/render-snapshots.js
```

Expected: writes:

- `minigame/artifacts/visual/menu.svg`
- `minigame/artifacts/visual/gameplayDebug.svg`
- `minigame/artifacts/visual/victory.svg`

- [ ] **Step 4: Generate WeChat preview to prove existing channel is not broken**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /private/tmp/lab-lines-sudoku-huawei-h5-migration-wechat-preview.png --info-output /private/tmp/lab-lines-sudoku-huawei-h5-migration-wechat-preview.json
```

Expected: preview command succeeds and writes QR image plus info JSON.

- [ ] **Step 5: Review git status**

Run:

```bash
git status --short
```

Expected: only ignored generated artifacts such as `huawei-h5/dist/` and `minigame/artifacts/` remain untracked/ignored; no source changes are left unstaged.

---

## Self-Review

- Spec coverage: H5 可运行由 Tasks 1, 3, 4, 5, 6 覆盖；平台适配层由 Tasks 1, 2, 3 覆盖；华为快游戏包装说明由 Tasks 5, 7 覆盖；微信不回退由 Tasks 2, 3, 7, 8 覆盖；审核准备和人工事项由 Task 7 覆盖。
- Scope check: 本计划不接入华为账号、游戏服务、防沉迷、广告、支付、排行榜、云存档；这些保留为后续独立 spec。
- Type consistency: 全计划统一使用 `createAppRuntime(platform)`、`createWechatPlatform(wxLike)`、`createH5Platform(browser)`、`getEnvironment()`、`createCanvas()` 等接口名。
- Generated artifacts: `huawei-h5/dist/` 和 `minigame/artifacts/` 不提交；源文件、测试和文档提交。
