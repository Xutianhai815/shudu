const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createPracticeMenuLayout, hitTestPracticeMenu } = require('../src/practice-menu');

test('createPracticeMenuLayout builds a free training difficulty page on 430x932', () => {
  const layout = createPracticeMenuLayout(430, 932, levels, {
    recommendedTrainingDifficulty: 'steady',
  });

  assert.equal(layout.width, 430);
  assert.equal(layout.height, 932);
  assert.equal(layout.title.text, '自由练习');
  assert.equal(layout.subtitle.text, '选一个难度，随时练一局，不影响闯关进度。');
  assert.equal(layout.backButton.label, '返回');
  assert.deepEqual(
    layout.difficultyCards.map((card) => [
      card.trainingDifficulty,
      card.sourceDifficulty,
      card.label,
      card.enabled,
      card.recommendation,
      card.statusLabel,
    ]),
    [
      ['warmup', 'intro', '热身', true, '推荐：稳定', '可练习'],
      ['steady', 'easy', '稳定', true, '推荐：稳定', '推荐'],
      ['standard', 'normal', '标准', true, '推荐：稳定', '可练习'],
      ['advanced', 'hard', '进阶', true, '推荐：稳定', '可练习'],
    ],
  );
});

test('createPracticeMenuLayout marks the first-time recommended training card', () => {
  const layout = createPracticeMenuLayout(430, 932, levels, {
    recommendedTrainingDifficulty: 'warmup',
  });
  const recommended = layout.difficultyCards.find((card) => card.trainingDifficulty === 'warmup');

  assert.equal(recommended.label, '热身');
  assert.equal(recommended.statusLabel, '推荐');
  assert.equal(recommended.recommendation, '推荐：热身');
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
    layout.difficultyCards.map((card) => [card.trainingDifficulty, card.sourceDifficulty, card.enabled, card.statusLabel]),
    [
      ['warmup', 'intro', true, '推荐'],
      ['steady', 'easy', false, '暂未开放'],
      ['standard', 'normal', false, '暂未开放'],
      ['advanced', 'hard', false, '暂未开放'],
    ],
  );
});

test('hitTestPracticeMenu maps back and enabled difficulty cards', () => {
  const layout = createPracticeMenuLayout(430, 932, levels);
  const back = layout.backButton;
  const advanced = layout.difficultyCards.find((card) => card.trainingDifficulty === 'advanced');

  assert.deepEqual(hitTestPracticeMenu(layout, back.x + 2, back.y + 2), {
    type: 'practiceMenu',
    action: 'back',
  });
  assert.deepEqual(hitTestPracticeMenu(layout, advanced.x + advanced.width / 2, advanced.y + advanced.height / 2), {
    type: 'practiceMenu',
    action: 'difficulty',
    difficulty: 'hard',
    trainingDifficulty: 'advanced',
  });
});

test('hitTestPracticeMenu ignores disabled difficulty cards and outside taps', () => {
  const introOnlyLevels = levels.filter((level) => level.difficulty === 'intro');
  const layout = createPracticeMenuLayout(430, 932, introOnlyLevels);
  const disabled = layout.difficultyCards.find((card) => card.trainingDifficulty === 'standard');

  assert.equal(
    hitTestPracticeMenu(layout, disabled.x + disabled.width / 2, disabled.y + disabled.height / 2),
    null,
  );
  assert.equal(hitTestPracticeMenu(layout, 1, 1), null);
});
