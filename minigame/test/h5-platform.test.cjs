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
