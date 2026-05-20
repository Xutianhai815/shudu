const assert = require('node:assert/strict');
const test = require('node:test');

const { getTechniqueGroups, getTechniques } = require('../src/technique-training');
const { createTechniqueMenuLayout, hitTestTechniqueMenu } = require('../src/technique-menu');

test('createTechniqueMenuLayout builds the technique training directory', () => {
  const groups = getTechniqueGroups();
  const techniques = getTechniques();
  const layout = createTechniqueMenuLayout(430, 932, groups, techniques);

  assert.equal(layout.width, 430);
  assert.equal(layout.height, 932);
  assert.equal(layout.title.text, '技巧训练');
  assert.equal(layout.subtitle.text, '选一个观察方法，练一次关键步骤。');
  assert.equal(layout.backButton.label, '返回');
  assert.deepEqual(
    layout.groups.map((group) => [group.id, group.title]),
    [
      ['basic', '初阶技巧'],
      ['advanced', '进阶技巧'],
    ],
  );
  assert.equal(layout.techniqueCards.length, 16);
});

test('createTechniqueMenuLayout maps techniques without pressure progress fields', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const singleEmpty = layout.techniqueCards.find((card) => card.id === 'single-empty');
  const xWing = layout.techniqueCards.find((card) => card.id === 'x-wing');

  assert.deepEqual(
    Object.keys(singleEmpty).filter((key) => ['progress', 'mastered'].includes(key)),
    [],
  );
  assert.equal(singleEmpty.group, 'basic');
  assert.equal(singleEmpty.title, '唯一空格');
  assert.equal(singleEmpty.summary, undefined);
  assert.equal(singleEmpty.difficultyLabel, '初阶技巧');
  assert.equal(singleEmpty.buttonLabel, undefined);
  assert.equal(xWing.group, 'advanced');
  assert.equal(xWing.title, 'X-Wing');
  assert.equal(xWing.difficultyLabel, '进阶技巧');
  assert.ok(layout.techniqueCards.every((card) => card.progress === undefined));
  assert.ok(layout.techniqueCards.every((card) => card.mastered === undefined));
});

test('createTechniqueMenuLayout uses short subtitles instead of long summaries', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const singleCandidate = layout.techniqueCards.find((card) => card.id === 'single-candidate');

  assert.equal(singleCandidate.title, '唯一候选');
  assert.equal(singleCandidate.shortSubtitle, '看见唯一可能');
  assert.equal(singleCandidate.summary, undefined);
  assert.equal(singleCandidate.buttonLabel, undefined);
  assert.equal(singleCandidate.showButtonLabel, false);
});

test('createTechniqueMenuLayout hides short subtitles only on ultra compact viewports', () => {
  const regular = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const ultra = createTechniqueMenuLayout(320, 568, getTechniqueGroups(), getTechniques(), { topInset: 96 });

  assert.ok(regular.techniqueCards.every((card) => card.showShortSubtitle === true));
  assert.ok(ultra.techniqueCards.every((card) => card.showShortSubtitle === false));
  ultra.techniqueCards.forEach((card) => {
    assert.ok(card.height >= 32);
    assert.ok(card.y + card.height <= ultra.height - ultra.margin);
  });
});

test('createTechniqueMenuLayout starts below the reserved top safe area', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques(), {
    topInset: 96,
  });

  assert.ok(layout.backButton.y >= 96);
  assert.ok(layout.title.y > layout.backButton.y + layout.backButton.height);
  assert.ok(layout.techniqueCards.every((card) => card.y >= layout.subtitle.y));
});

test('createTechniqueMenuLayout keeps every technique card inside a compact 375x667 viewport', () => {
  const layout = createTechniqueMenuLayout(375, 667, getTechniqueGroups(), getTechniques(), {
    topInset: 0,
  });

  assertCardsStayWithinViewport(layout);
});

test('createTechniqueMenuLayout keeps every technique card inside a compact 375x667 viewport with top inset', () => {
  const layout = createTechniqueMenuLayout(375, 667, getTechniqueGroups(), getTechniques(), {
    topInset: 70,
  });

  assert.ok(layout.backButton.y >= 70);
  assertCardsStayWithinViewport(layout);
});

test('createTechniqueMenuLayout keeps every technique card inside an ultra compact 320x568 viewport', () => {
  const layout = createTechniqueMenuLayout(320, 568, getTechniqueGroups(), getTechniques(), {
    topInset: 0,
  });

  assertCardsStayWithinViewport(layout);
});

test('createTechniqueMenuLayout keeps every technique card inside an ultra compact 320x568 viewport with medium top inset', () => {
  const layout = createTechniqueMenuLayout(320, 568, getTechniqueGroups(), getTechniques(), {
    topInset: 70,
  });

  assert.ok(layout.backButton.y >= 70);
  assertCardsStayWithinViewport(layout);
});

test('createTechniqueMenuLayout keeps every technique card inside an ultra compact 320x568 viewport with large top inset', () => {
  const layout = createTechniqueMenuLayout(320, 568, getTechniqueGroups(), getTechniques(), {
    topInset: 96,
  });

  assert.ok(layout.backButton.y >= 96);
  assertCardsStayWithinViewport(layout);
});

test('hitTestTechniqueMenu maps back and technique cards', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());
  const back = layout.backButton;
  const xWing = layout.techniqueCards.find((card) => card.id === 'x-wing');

  assert.deepEqual(hitTestTechniqueMenu(layout, back.x + 4, back.y + 4), {
    type: 'techniqueMenu',
    action: 'back',
  });
  assert.deepEqual(
    hitTestTechniqueMenu(layout, xWing.x + xWing.width / 2, xWing.y + xWing.height / 2),
    {
      type: 'techniqueMenu',
      action: 'technique',
      techniqueId: 'x-wing',
    },
  );
});

test('hitTestTechniqueMenu ignores outside taps and missing layouts', () => {
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());

  assert.equal(hitTestTechniqueMenu(layout, 1, 1), null);
  assert.equal(hitTestTechniqueMenu(null, 120, 120), null);
});

function assertCardsStayWithinViewport(layout) {
  layout.techniqueCards.forEach((card) => {
    assert.ok(card.height >= 32, `${card.id} height ${card.height} is too small`);
    assert.ok(
      card.y + card.height <= layout.height - layout.margin,
      `${card.id} bottom ${card.y + card.height} exceeds ${layout.height - layout.margin}`,
    );
  });
}
