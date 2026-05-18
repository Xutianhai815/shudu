const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { createH5Platform } = require('../src/platform/h5-platform');

const repoRoot = path.resolve(__dirname, '../..');
const huaweiH5Root = path.join(repoRoot, 'huawei-h5');

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

test('h5 platform falls back to a compact phone viewport when window size is unavailable', () => {
  const platform = createH5Platform(createMockBrowser({ omitWindowSize: true }));

  assert.deepEqual(platform.getSystemInfo(), {
    pixelRatio: 2,
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 0,
  });
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

test('h5 platform defaults showModal to cancel when confirm is unavailable', () => {
  const browser = createMockBrowser({ omitConfirm: true });
  const platform = createH5Platform(browser);
  let payload = null;

  platform.showModal({
    title: '重新开始本局？',
    content: '要清空本局已填写内容吗？',
    success(result) {
      payload = result;
    },
  });

  assert.deepEqual(payload, { confirm: false, cancel: true });
});

test('h5 platform registers touch and mouse input as wx-style touches', () => {
  const browser = createMockBrowser();
  const platform = createH5Platform(browser);
  const events = [];

  platform.onTouchStart((event) => events.push(event));
  browser.canvas.dispatch('touchstart', {
    preventDefault() {},
    touches: [
      { clientX: 12, clientY: 34, force: 0.7 },
      { clientX: 90, clientY: 91 },
    ],
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

test('h5 platform exposes wx-compatible audio fields when Audio is available', () => {
  class MockAudio {
    constructor() {
      this.src = '';
      this.volume = 1;
      this.currentTime = 10;
      this.playCount = 0;
      this.pauseCount = 0;
    }

    play() {
      this.playCount += 1;
      return Promise.resolve();
    }

    pause() {
      this.pauseCount += 1;
    }
  }

  const browser = createMockBrowser({ Audio: MockAudio });
  const audio = createH5Platform(browser).createInnerAudioContext();

  audio.src = 'assets/sounds/input.wav';
  audio.volume = 0.5;

  assert.equal(audio.obeyMuteSwitch, true);
  assert.equal(typeof audio.onError, 'function');
  assert.doesNotThrow(() => audio.onError(() => {}));
  assert.doesNotThrow(() => audio.play());
  assert.doesNotThrow(() => audio.stop());
  assert.doesNotThrow(() => audio.destroy());
});

test('h5 platform creates a no-crash audio context wrapper when Audio is unavailable', () => {
  const browser = createMockBrowser({ Audio: null });
  const audio = createH5Platform(browser).createInnerAudioContext();

  audio.src = 'assets/sounds/input.wav';
  audio.volume = 0.5;

  assert.doesNotThrow(() => audio.play());
  assert.doesNotThrow(() => audio.stop());
  assert.equal(audio.obeyMuteSwitch, true);
  assert.equal(typeof audio.onError, 'function');
  assert.doesNotThrow(() => audio.onError(() => {}));
  assert.doesNotThrow(() => audio.destroy());
});

test('huawei h5 preview entry includes canvas and startup script', () => {
  const html = fs.readFileSync(path.join(huaweiH5Root, 'index.html'), 'utf8');

  assert.match(html, /<canvas\b[^>]*\bid=["']gameCanvas["'][^>]*>/);
  assert.match(html, /<link\b[^>]*\bhref=["']styles\.css["'][^>]*>/);
  assert.match(html, /<script\b[^>]*\bsrc=["']dist\/game\.bundle\.js["'][^>]*><\/script>/);
});

test('huawei h5 main starts the shared app runtime with h5 platform', () => {
  const mainSource = fs.readFileSync(path.join(huaweiH5Root, 'main.js'), 'utf8');
  const calls = [];
  const platform = { environment: 'h5' };
  const runtime = {
    boot() {
      calls.push(['boot']);
    },
  };
  const window = {};

  vm.runInNewContext(mainSource, {
    require(request) {
      calls.push(['require', request]);

      if (request === '../minigame/src/app-runtime') {
        return {
          createAppRuntime(receivedPlatform) {
            calls.push(['createAppRuntime', receivedPlatform]);
            return runtime;
          },
        };
      }

      if (request === '../minigame/src/platform/h5-platform') {
        return {
          createH5Platform(receivedWindow) {
            calls.push(['createH5Platform', receivedWindow]);
            return platform;
          },
        };
      }

      throw new Error(`Unexpected require: ${request}`);
    },
    window,
  });

  assert.deepEqual(calls, [
    ['require', '../minigame/src/app-runtime'],
    ['require', '../minigame/src/platform/h5-platform'],
    ['createH5Platform', window],
    ['createAppRuntime', platform],
    ['boot'],
  ]);
});

test('huawei h5 build script exists and writes a browser bundle', () => {
  const buildScript = path.join(huaweiH5Root, 'build.js');
  const { buildBundle } = require(buildScript);
  const outputFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'huawei-h5-bundle-')),
    'game.bundle.js',
  );

  const result = buildBundle({ outputFile });
  const bundle = fs.readFileSync(outputFile, 'utf8');

  assert.equal(result.outputFile, outputFile);
  assert.match(bundle, /__huaweiH5Modules__/);
  assert.match(bundle, /createAppRuntime\(createH5Platform\(window\)\)\.boot\(\)/);
  assert.doesNotMatch(bundle, /require\(['"]\.\.?\/[^'"]+['"]\)/);
});

test('huawei h5 html loads built bundle for browser preview', () => {
  const html = fs.readFileSync(path.join(huaweiH5Root, 'index.html'), 'utf8');

  assert.match(html, /<script\b[^>]*\bsrc=["']dist\/game\.bundle\.js["'][^>]*><\/script>/);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=["']main\.js["'][^>]*><\/script>/);
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

  const browser = {
    canvas,
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

  if (!options.omitWindowSize) {
    browser.innerWidth = 430;
    browser.innerHeight = 932;
  }

  if (!options.omitConfirm) {
    browser.confirm = function confirm(message) {
      this.confirmMessage = message;
      return options.confirmResult === true;
    };
  }

  return browser;
}

function createMockCanvasContext() {
  return {
    setTransform() {},
    clearRect() {},
  };
}
