const { createAppRuntime } = require('./src/app-runtime');
const { createWechatPlatform } = require('./src/platform/wechat-platform');

createAppRuntime(createWechatPlatform(wx)).boot();
