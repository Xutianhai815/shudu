const assert = require('node:assert/strict');
const test = require('node:test');

const { createVisualSnapshots } = require('../tools/render-snapshots');

test('visual snapshot renderer produces key menu gameplay and victory SVGs', () => {
  const snapshots = createVisualSnapshots();

  assert.match(snapshots.menu, /一一数独/);
  assert.match(snapshots.menu, /每天打开一局/);
  assert.match(snapshots.menu, /#17312b/);
  assert.match(snapshots.menu, /rgba\(22, 163, 160/);
  assert.doesNotMatch(snapshots.menu, /今日报告|今日除锈|累计除锈|今日第一局/);
  assert.match(snapshots.gameplayDebug, /起步热身/);
  assert.equal(/DEV 完成|08:42|Ⅱ/.test(snapshots.gameplayDebug), false);
  assert.match(snapshots.victory, /LAB CLEAR/);
  assert.match(snapshots.victory, /下一关已解锁/);
  assert.match(snapshots.victory, /下一关/);
  assert.doesNotMatch(snapshots.victory, /同难度再来一局|回首页|\+0\.01%/);
});
