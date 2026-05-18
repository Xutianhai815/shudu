const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createPracticeMenuLayout, hitTestPracticeMenu } = require('../src/practice-menu');

test('createPracticeMenuLayout builds a free training difficulty page on 430x932', () => {
  const layout = createPracticeMenuLayout(430, 932, levels);

  assert.equal(layout.width, 430);
  assert.equal(layout.height, 932);
  assert.equal(layout.title.text, '自由练习');
  assert.equal(layout.subtitle.text, '选一个难度，随时练一局，不影响闯关进度。');
  assert.equal(layout.backButton.label, '返回');
  assert.deepEqual(
    layout.difficultyCards.map((card) => [card.difficulty, card.label, card.enabled]),
    [
      ['intro', '入门', true],
      ['easy', '简单', true],
      ['normal', '标准', true],
      ['hard', '挑战', true],
    ],
  );
});

test('createPracticeMenuLayout keeps controls inside a short viewport', () => {
  const layout = createPracticeMenuLayout(320, 568, levels);

  assert.ok(layout.title.y >= layout.backButton.y + layout.backButton.height + 18);
  layout.difficultyCards.forEach((card) => {
    assert.ok(card.x >= layout.margin);
    assert.ok(card.x + card.width <= 320 - layout.margin);
    assert.ok(card.y + card.height <= 568 - layout.margin);
  });
});

test('createPracticeMenuLayout starts below the reserved top safe area', () => {
  const layout = createPracticeMenuLayout(430, 932, levels, { topInset: 96 });

  assert.ok(layout.backButton.y >= 96);
  assert.ok(layout.title.y > layout.backButton.y + layout.backButton.height);
});

test('createPracticeMenuLayout disables unavailable difficulties', () => {
  const introOnlyLevels = levels.filter((level) => level.difficulty === 'intro');
  const layout = createPracticeMenuLayout(430, 932, introOnlyLevels);

  assert.deepEqual(
    layout.difficultyCards.map((card) => [card.difficulty, card.enabled, card.statusLabel]),
    [
      ['intro', true, '可练习'],
      ['easy', false, '暂未开放'],
      ['normal', false, '暂未开放'],
      ['hard', false, '暂未开放'],
    ],
  );
});

test('hitTestPracticeMenu maps back and enabled difficulty cards', () => {
  const layout = createPracticeMenuLayout(430, 932, levels);
  const back = layout.backButton;
  const hard = layout.difficultyCards.find((card) => card.difficulty === 'hard');

  assert.deepEqual(hitTestPracticeMenu(layout, back.x + 2, back.y + 2), {
    type: 'practiceMenu',
    action: 'back',
  });
  assert.deepEqual(hitTestPracticeMenu(layout, hard.x + hard.width / 2, hard.y + hard.height / 2), {
    type: 'practiceMenu',
    action: 'difficulty',
    difficulty: 'hard',
  });
});

test('hitTestPracticeMenu ignores disabled difficulty cards and outside taps', () => {
  const introOnlyLevels = levels.filter((level) => level.difficulty === 'intro');
  const layout = createPracticeMenuLayout(430, 932, introOnlyLevels);
  const disabled = layout.difficultyCards.find((card) => card.difficulty === 'normal');

  assert.equal(
    hitTestPracticeMenu(layout, disabled.x + disabled.width / 2, disabled.y + disabled.height / 2),
    null,
  );
  assert.equal(hitTestPracticeMenu(layout, 1, 1), null);
});
