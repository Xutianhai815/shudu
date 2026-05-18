function createWechatPlatform(wxLike) {
  const api = wxLike || {};

  return {
    createCanvas() {
      return api.createCanvas();
    },

    getSystemInfo() {
      if (typeof api.getSystemInfoSync === 'function') {
        return api.getSystemInfoSync();
      }

      return {
        pixelRatio: 1,
        windowWidth: 375,
        windowHeight: 667,
        statusBarHeight: 0,
      };
    },

    getTopInset(systemInfo) {
      const statusBarHeight = Number.isFinite(systemInfo && systemInfo.statusBarHeight)
        ? systemInfo.statusBarHeight
        : 0;

      if (typeof api.getMenuButtonBoundingClientRect === 'function') {
        try {
          const rect = api.getMenuButtonBoundingClientRect();
          if (rect && Number.isFinite(rect.bottom)) {
            return rect.bottom + 8;
          }
        } catch (error) {
          // Some simulator builds can throw here; status bar fallback is good enough.
        }
      }

      return statusBarHeight > 0 ? statusBarHeight + 12 : 0;
    },

    onTouchStart(callback) {
      if (typeof api.onTouchStart === 'function') {
        api.onTouchStart(callback);
      }
    },

    onWindowResize(callback) {
      if (typeof api.onWindowResize === 'function') {
        api.onWindowResize(callback);
      }
    },

    showModal(options) {
      if (typeof api.showModal === 'function') {
        api.showModal(options);
      }
    },

    getStorageSync(key) {
      if (typeof api.getStorageSync !== 'function') {
        return null;
      }

      return api.getStorageSync(key);
    },

    setStorageSync(key, value) {
      if (typeof api.setStorageSync === 'function') {
        api.setStorageSync(key, value);
      }
    },

    removeStorageSync(key) {
      if (typeof api.removeStorageSync === 'function') {
        api.removeStorageSync(key);
      }
    },

    createInnerAudioContext() {
      if (typeof api.createInnerAudioContext === 'function') {
        return api.createInnerAudioContext();
      }

      return createNoopAudioContext();
    },

    requestAnimationFrame(callback) {
      if (typeof api.requestAnimationFrame === 'function') {
        return api.requestAnimationFrame(callback);
      }

      if (typeof requestAnimationFrame === 'function') {
        return requestAnimationFrame(callback);
      }

      return setTimeout(callback, 1000 / 30);
    },

    cancelAnimationFrame(frame) {
      if (typeof api.cancelAnimationFrame === 'function') {
        api.cancelAnimationFrame(frame);
        return;
      }

      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frame);
        return;
      }

      clearTimeout(frame);
    },

    startAccelerometer(options) {
      if (typeof api.startAccelerometer === 'function') {
        api.startAccelerometer(options);
      }
    },

    stopAccelerometer() {
      if (typeof api.stopAccelerometer === 'function') {
        api.stopAccelerometer();
      }
    },

    onAccelerometerChange(callback) {
      if (typeof api.onAccelerometerChange === 'function') {
        api.onAccelerometerChange(callback);
      }
    },

    offAccelerometerChange(callback) {
      if (typeof api.offAccelerometerChange === 'function') {
        api.offAccelerometerChange(callback);
      }
    },

    getEnvironment() {
      return 'wechat';
    },

    getRawApi() {
      return api;
    },
  };
}

function createNoopAudioContext() {
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
  createWechatPlatform,
};
