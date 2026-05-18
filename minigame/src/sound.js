const SOUND_FILES = Object.freeze({
  select: 'assets/sounds/select.wav',
  input: 'assets/sounds/input.wav',
  tool: 'assets/sounds/tool.wav',
  complete: 'assets/sounds/complete.wav',
});

const DEFAULT_POOL_SIZE = 2;
const DEFAULT_VOLUME = 0.42;

function createSoundManager(wxLike, options = {}) {
  const poolSize = normalizePoolSize(options.poolSize);
  const volume = normalizeVolume(options.volume);
  const pools = new Map();
  let enabled = options.enabled !== false && canCreateAudio(wxLike);
  let destroyed = false;

  if (enabled) {
    try {
      Object.entries(SOUND_FILES).forEach(([name, src]) => {
        pools.set(name, createPool(wxLike, src, poolSize, volume));
      });
    } catch (error) {
      enabled = false;
      destroyPools(pools);
      pools.clear();
    }
  }

  return {
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      enabled = false;
      destroyPools(pools);
      pools.clear();
    },
    isEnabled() {
      return enabled && !destroyed;
    },
    play(name) {
      if (!enabled || destroyed || !pools.has(name)) {
        return false;
      }

      return playFromPool(pools.get(name));
    },
    setEnabled(value) {
      enabled = value === true && !destroyed && canCreateAudio(wxLike);
    },
  };
}

function createPool(wxLike, src, poolSize, volume) {
  return {
    cursor: 0,
    contexts: Array.from({ length: poolSize }, () => createAudioContext(wxLike, src, volume)),
  };
}

function createAudioContext(wxLike, src, volume) {
  const audio = wxLike.createInnerAudioContext();
  audio.src = src;
  audio.volume = volume;
  audio.obeyMuteSwitch = true;

  if (typeof audio.onError === 'function') {
    audio.onError(() => {});
  }

  return audio;
}

function playFromPool(pool) {
  const audio = pool.contexts[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.contexts.length;

  try {
    if (typeof audio.stop === 'function') {
      audio.stop();
    }

    audio.play();
    return true;
  } catch (error) {
    return false;
  }
}

function destroyPools(pools) {
  pools.forEach((pool) => {
    pool.contexts.forEach((audio) => {
      if (audio && typeof audio.destroy === 'function') {
        audio.destroy();
      }
    });
  });
}

function canCreateAudio(wxLike) {
  return Boolean(wxLike && typeof wxLike.createInnerAudioContext === 'function');
}

function normalizePoolSize(poolSize) {
  return Number.isInteger(poolSize) && poolSize > 0 ? poolSize : DEFAULT_POOL_SIZE;
}

function normalizeVolume(volume) {
  if (typeof volume !== 'number' || Number.isNaN(volume)) {
    return DEFAULT_VOLUME;
  }

  return Math.max(0, Math.min(1, volume));
}

module.exports = {
  SOUND_FILES,
  createSoundManager,
};
