const assert = require('node:assert/strict');
const test = require('node:test');

const { createVisualSnapshots } = require('../tools/render-snapshots');

const PRESSURE_COPY_PATTERN = new RegExp(
  ['\u5df2\u638c\u63e1', '\u5b8c\u6210\u7387', '\u6b63\u786e\u7387'].join('|'),
);

test('visual snapshot renderer produces key menu gameplay and victory SVGs', () => {
  const snapshots = createVisualSnapshots();

  assert.match(snapshots.menu, /一一数独/);
  assert.match(snapshots.menu, /每天打开一局/);
  assert.match(snapshots.menu, /#17312b/);
  assert.match(snapshots.menu, /rgba\(22, 163, 160/);
  assert.doesNotMatch(snapshots.menu, /今日报告|今日除锈|累计除锈|今日第一局/);
  assert.match(snapshots.practiceMenu, /技巧训练/);
  assert.match(snapshots.practiceMenu, /不会从哪看起/);
  assert.match(snapshots.techniqueMenu, /技巧训练/);
  assert.match(snapshots.techniqueMenu, /初阶技巧/);
  assert.match(snapshots.techniqueMenu, /进阶技巧/);
  assert.match(snapshots.techniqueMenu, /X-Wing/);
  assert.equal(PRESSURE_COPY_PATTERN.test(snapshots.techniqueMenu), false);
  assert.match(snapshots.techniqueLesson, /唯一空格/);
  assert.match(snapshots.techniqueLesson, /1\/4/);
  assert.match(snapshots.techniqueLesson, /下一步/);
  assert.doesNotMatch(snapshots.techniqueLesson, /看提示|草稿模式|重开|清除/);
  assert.equal(PRESSURE_COPY_PATTERN.test(snapshots.techniqueLesson), false);
  assert.match(snapshots.gameplayDebug, /起步热身/);
  assert.equal(/DEV 完成|08:42|Ⅱ/.test(snapshots.gameplayDebug), false);
  assert.match(snapshots.victory, /LAB CLEAR/);
  assert.match(snapshots.victory, /下一关已解锁/);
  assert.match(snapshots.victory, /下一关/);
  assert.doesNotMatch(snapshots.victory, /同难度再来一局|回首页|\+0\.01%/);
});
