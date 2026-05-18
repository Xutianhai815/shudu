const { createAppRuntime } = require('../minigame/src/app-runtime');
const { createH5Platform } = require('../minigame/src/platform/h5-platform');

createAppRuntime(createH5Platform(window)).boot();
