function createH5Platform(browser = globalThis) {
  const canvas = resolveCanvas(browser);
  const accelerometerHandlers = new Set();
  let deviceMotionHandler = null;

  function ensureDeviceMotionListener() {
    if (deviceMotionHandler || typeof browser.addEventListener !== 'function') {
      return;
    }

    deviceMotionHandler = (event) => {
      const acceleration = event.accelerationIncludingGravity || event.acceleration || {};
      const payload = {
        x: Number(acceleration.x) || 0,
        y: Number(acceleration.y) || 0,
        z: Number(acceleration.z) || 0,
      };
      accelerometerHandlers.forEach((handler) => handler(payload));
    };
    browser.addEventListener('devicemotion', deviceMotionHandler);
  }

  return {
    createCanvas() {
      return canvas;
    },

    getSystemInfo() {
      return {
        pixelRatio: browser.devicePixelRatio || 1,
        windowWidth: browser.innerWidth || 0,
        windowHeight: browser.innerHeight || 0,
        statusBarHeight: 0,
      };
    },

    getTopInset() {
      return 0;
    },

    onTouchStart(callback) {
      if (!canvas || typeof canvas.addEventListener !== 'function') {
        return;
      }

      canvas.addEventListener('touchstart', (event) => {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        callback({ touches: Array.from(event.touches || []) });
      });

      canvas.addEventListener('mousedown', (event) => {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        callback({ touches: [{ clientX: event.clientX, clientY: event.clientY }] });
      });
    },

    onWindowResize(callback) {
      if (typeof browser.addEventListener === 'function') {
        browser.addEventListener('resize', callback);
      }
    },

    showModal(options = {}) {
      const title = options.title || '';
      const content = options.content || '';
      const message = [title, content].filter(Boolean).join('\n');
      const confirm = typeof browser.confirm === 'function' ? browser.confirm(message) : true;
      if (typeof options.success === 'function') {
        options.success({ confirm, cancel: !confirm });
      }
    },

    getStorageSync(key) {
      try {
        const value = browser.localStorage && browser.localStorage.getItem(key);
        return value === null || value === undefined ? null : JSON.parse(value);
      } catch (error) {
        return null;
      }
    },

    setStorageSync(key, value) {
      try {
        if (browser.localStorage) {
          browser.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        // Match mini-game storage semantics: quota/private-mode failures should not crash gameplay.
      }
    },

    removeStorageSync(key) {
      try {
        if (browser.localStorage) {
          browser.localStorage.removeItem(key);
        }
      } catch (error) {
        // Safe no-op when browser storage is unavailable.
      }
    },

    createInnerAudioContext() {
      return createAudioContext(browser);
    },

    requestAnimationFrame(callback) {
      if (typeof browser.requestAnimationFrame === 'function') {
        return browser.requestAnimationFrame(callback);
      }
      return setTimeout(() => callback(Date.now()), 16);
    },

    cancelAnimationFrame(frame) {
      if (typeof browser.cancelAnimationFrame === 'function') {
        browser.cancelAnimationFrame(frame);
        return;
      }
      clearTimeout(frame);
    },

    startAccelerometer() {
      ensureDeviceMotionListener();
    },

    stopAccelerometer() {},

    onAccelerometerChange(callback) {
      accelerometerHandlers.add(callback);
      ensureDeviceMotionListener();
    },

    offAccelerometerChange(callback) {
      accelerometerHandlers.delete(callback);
    },

    getEnvironment() {
      return 'h5';
    },
  };
}

function resolveCanvas(browser) {
  if (browser.canvas) {
    return browser.canvas;
  }

  const document = browser.document;
  if (document && typeof document.getElementById === 'function') {
    const existingCanvas = document.getElementById('gameCanvas');
    if (existingCanvas) {
      return existingCanvas;
    }
  }

  if (document && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    if (document.body && typeof document.body.appendChild === 'function') {
      document.body.appendChild(canvas);
    }
    return canvas;
  }

  return null;
}

function createAudioContext(browser) {
  const AudioCtor = browser.Audio;
  if (typeof AudioCtor !== 'function') {
    return createNoopAudioContext();
  }

  const audio = new AudioCtor();
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
    play() {
      const result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    },
    stop() {
      if (typeof audio.pause === 'function') {
        audio.pause();
      }
      try {
        audio.currentTime = 0;
      } catch (error) {
        // Some browsers reject currentTime changes before metadata is loaded.
      }
    },
    destroy() {
      if (typeof audio.pause === 'function') {
        audio.pause();
      }
      audio.src = '';
    },
  };
}

function createNoopAudioContext() {
  return {
    src: '',
    volume: 1,
    play() {},
    stop() {},
    destroy() {},
  };
}

module.exports = {
  createH5Platform,
};
