const assert = require('node:assert/strict');
const test = require('node:test');

const { createLayout, hitTest } = require('../src/layout');

test('hitTest maps board coordinates to row and column', () => {
  const layout = createLayout(430, 932);
  const cellSize = layout.board.size / 9;
  const x = layout.board.x + cellSize * 2 + cellSize / 2;
  const y = layout.board.y + cellSize * 4 + cellSize / 2;

  assert.deepEqual(hitTest(layout, x, y), {
    type: 'cell',
    row: 4,
    col: 2,
  });
});

test('hitTest maps keypad coordinates to digits', () => {
  const layout = createLayout(430, 932);
  const key = layout.keypad.keys[6];
  const x = key.x + key.width / 2;
  const y = key.y + key.height / 2;

  assert.deepEqual(hitTest(layout, x, y), {
    type: 'digit',
    digit: 7,
  });
});

test('layout keeps the keypad inside a short portrait viewport', () => {
  const layout = createLayout(375, 667);
  const lastKey = layout.keypad.keys.at(-1);

  assert.ok(layout.board.size > 250);
  assert.ok(lastKey.y + lastKey.height <= 667 - layout.margin);
});

test('layout anchors gameplay input controls near the bottom edge', () => {
  const layout = createLayout(430, 932, { topInset: 52 });
  const lastKey = layout.keypad.keys.at(-1);
  const firstTool = layout.tools[0];

  assert.ok(lastKey.y + lastKey.height >= 932 - layout.margin - 1);
  assert.ok(firstTool.y + firstTool.height < layout.keypad.y);
  assert.ok(layout.board.y + layout.board.size < firstTool.y);
});

test('layout starts below the reserved top safe area', () => {
  const layout = createLayout(430, 932, { topInset: 96 });

  assert.ok(layout.topBar.y >= 96);
  assert.ok(layout.ruleStrip.y > layout.topBar.y + layout.topBar.height);
  assert.ok(layout.board.y > layout.ruleStrip.y + layout.ruleStrip.height);
});

test('victory layout stays inside a short portrait viewport', () => {
  const layout = createLayout(375, 667);
  const { panel, campaignNext, restart, next } = layout.victory;

  assert.ok(panel.y + panel.height <= 667);
  assert.ok(campaignNext.y + campaignNext.height <= panel.y + panel.height);
  assert.ok(restart.y + restart.height <= panel.y + panel.height);
  assert.ok(next.y + next.height <= panel.y + panel.height);
  assert.ok(campaignNext.y + campaignNext.height <= 667);
  assert.ok(restart.y + restart.height <= 667);
  assert.ok(next.y + next.height <= 667);
  [campaignNext, restart, next].forEach((button) => {
    assert.ok(button.x >= panel.x);
    assert.ok(button.x + button.width <= panel.x + panel.width);
  });
});

test('hitTest maps tool buttons to actions', () => {
  const layout = createLayout(430, 932);
  const noteTool = layout.tools[0];
  const restartTool = layout.tools[1];
  const eraseTool = layout.tools[2];

  assert.equal(layout.tools.length, 3);

  assert.deepEqual(hitTest(layout, noteTool.x + noteTool.width / 2, noteTool.y + noteTool.height / 2), {
    type: 'tool',
    action: 'note',
  });
  assert.deepEqual(hitTest(layout, restartTool.x + restartTool.width / 2, restartTool.y + restartTool.height / 2), {
    type: 'tool',
    action: 'restart',
  });
  assert.deepEqual(hitTest(layout, eraseTool.x + eraseTool.width / 2, eraseTool.y + eraseTool.height / 2), {
    type: 'tool',
    action: 'erase',
  });
});

test('hitTest maps campaign victory overlay to next only', () => {
  const layout = createLayout(430, 932);
  const campaignNext = layout.victory.campaignNext;
  const practiceOnlyRestartEdge = layout.victory.restart;

  assert.deepEqual(hitTest(layout, campaignNext.x + campaignNext.width / 2, campaignNext.y + campaignNext.height / 2, true), {
    type: 'victory',
    action: 'next',
  });
  assert.notEqual(hitTest(layout, campaignNext.x + 4, campaignNext.y + campaignNext.height / 2, true).action, 'restart');
  assert.equal(
    hitTest(layout, practiceOnlyRestartEdge.x + 2, practiceOnlyRestartEdge.y + practiceOnlyRestartEdge.height / 2, true),
    null,
  );
});

test('hitTest maps practice victory overlay to replay and difficulty actions', () => {
  const layout = createLayout(430, 932);
  const restartButton = layout.victory.restart;
  const nextButton = layout.victory.next;

  assert.deepEqual(
    hitTest(layout, restartButton.x + restartButton.width / 2, restartButton.y + restartButton.height / 2, true, {
      victoryMode: 'practice',
    }),
    {
      type: 'victory',
      action: 'restart',
    },
  );
  assert.deepEqual(hitTest(layout, nextButton.x + nextButton.width / 2, nextButton.y + nextButton.height / 2, true, {
    victoryMode: 'practice',
  }), {
    type: 'victory',
    action: 'next',
  });
});

test('victory layout has enough vertical room for derust report', () => {
  const layout = createLayout(430, 932);

  assert.ok(layout.victory.panel.height >= 330);
  assert.ok(layout.victory.campaignNext.y > layout.victory.panel.y + 280);
  assert.ok(layout.victory.restart.y > layout.victory.panel.y + 280);
  assert.ok(layout.victory.next.y > layout.victory.panel.y + 280);
});

test('victory layout keeps campaign and practice action buttons inside compact panels', () => {
  const layout = createLayout(320, 568);
  const { panel, campaignNext, restart, next } = layout.victory;

  assert.ok(panel.y + panel.height <= 568);
  assert.ok(campaignNext.width >= 180);
  assert.ok(restart.width >= 108);
  assert.ok(next.x > restart.x + restart.width);
  [campaignNext, restart, next].forEach((button) => {
    assert.ok(button.y + button.height <= panel.y + panel.height);
    assert.ok(button.x >= panel.x);
    assert.ok(button.x + button.width <= panel.x + panel.width);
  });
});

test('hitTest maps top-left puzzle button to back action', () => {
  const layout = createLayout(430, 932);
  const backButton = layout.backButton;

  assert.deepEqual(hitTest(layout, backButton.x + backButton.width / 2, backButton.y + backButton.height / 2), {
    type: 'nav',
    action: 'back',
  });
});

test('hitTest maps top-right practice switch button to difficulty action', () => {
  const layout = createLayout(430, 932);
  const button = layout.modeSwitchButton;

  assert.deepEqual(hitTest(layout, button.x + button.width / 2, button.y + button.height / 2), {
    type: 'nav',
    action: 'practiceDifficulty',
  });
});

test('hitTest maps top-left puzzle button to back action when completed', () => {
  const layout = createLayout(430, 932);
  const backButton = layout.backButton;

  assert.deepEqual(hitTest(layout, backButton.x + backButton.width / 2, backButton.y + backButton.height / 2, true), {
    type: 'nav',
    action: 'back',
  });
});

test('createLayout does not expose visible debug controls in gameplay', () => {
  const layout = createLayout(430, 932, { debugToolsEnabled: true });
  const defaultLayout = createLayout(430, 932);

  assert.equal(layout.debugCompleteButton, null);
  assert.equal(defaultLayout.debugCompleteButton, null);
});

test('debug compact layout keeps board and keypad usable on narrow viewport', () => {
  const layout = createLayout(320, 568, { debugToolsEnabled: true });
  const lastKey = layout.keypad.keys.at(-1);

  assert.ok(layout.board.size >= 190);
  assert.ok(layout.board.size / 9 >= 21);
  assert.ok(lastKey.y + lastKey.height <= 568 - layout.margin);
});
