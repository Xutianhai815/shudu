const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { MENU_HERO_MOTION_RESERVE, createMenuLayout, hitTestMenu } = require('../src/menu');

test('hitTestMenu maps the campaign mode card to campaign action', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    completedLevelIds: ['lab-02'],
  });
  const card = layout.modeCards.campaign;

  assert.deepEqual(hitTestMenu(layout, card.x + card.width / 2, card.y + card.height / 2), {
    type: 'menu',
    action: 'campaign',
  });
});

test('hitTestMenu maps the practice mode card to practice action', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    hasPracticeRun: true,
    completedLevelIds: [],
  });
  const card = layout.modeCards.practice;

  assert.deepEqual(hitTestMenu(layout, card.x + card.width / 2, card.y + card.height / 2), {
    type: 'menu',
    action: 'practice',
  });
});

test('createMenuLayout exposes two homepage mode cards with first-time copy', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    hasPracticeRun: false,
    completedLevelIds: [],
  });

  assert.equal(layout.primaryButton, undefined);
  assert.equal(layout.continueButton, undefined);
  assert.deepEqual(Object.keys(layout.modeCards), ['campaign', 'practice']);
  assert.ok(layout.modeCards.campaign.width <= 260);
  assert.ok(layout.modeCards.campaign.height <= 56);
  assert.ok(layout.modeCards.campaign.y <= 710);
  assert.ok(layout.modeCards.practice.y <= 780);
  assert.equal(layout.modeCards.campaign.title, '闯关挑战');
  assert.equal(layout.modeCards.campaign.label, '闯关挑战');
  assert.equal(layout.modeCards.campaign.buttonLabel, '闯关挑战');
  assert.equal(layout.modeCards.campaign.subtitle, null);
  assert.equal(layout.modeCards.practice.title, '自由练习');
  assert.equal(layout.modeCards.practice.label, '自由练习');
  assert.equal(layout.modeCards.practice.buttonLabel, '自由练习');
  assert.equal(layout.modeCards.practice.subtitle, null);
  assert.equal(layout.modeCards.practice.difficultyDots, undefined);
});

test('createMenuLayout updates mode card copy when saves exist', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    hasPracticeRun: true,
    activeRun: {
      levelId: 'lab-04',
    },
    practiceRun: {
      difficulty: 'hard',
    },
    completedLevelIds: ['lab-02'],
  });

  assert.equal(layout.modeCards.campaign.title, '继续闯关');
  assert.equal(layout.modeCards.campaign.label, '继续闯关');
  assert.equal(layout.modeCards.campaign.buttonLabel, '继续闯关');
  assert.equal(layout.modeCards.campaign.subtitle, null);
  assert.equal(layout.modeCards.practice.title, '自由练习');
  assert.equal(layout.modeCards.practice.label, '自由练习');
  assert.equal(layout.modeCards.practice.buttonLabel, '自由练习');
  assert.equal(layout.modeCards.practice.subtitle, null);
});

test('createMenuLayout summarizes completed campaign progress when no active run exists', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-01', 'lab-02', 'lab-03'],
    growthStats: {
      currentStreak: 3,
      todayCompletedCount: 1,
    },
  });

  assert.equal(layout.modeCards.campaign.title, '闯关挑战');
  assert.equal(layout.modeCards.campaign.buttonLabel, '闯关挑战');
  assert.equal(layout.modeCards.campaign.subtitle, null);
  assert.deepEqual(layout.campaignProgress, {
    visible: true,
    text: '闯关进度 3/24',
  });
  assert.deepEqual(layout.growthSummary, {
    visible: true,
    text: '连续除锈 3 天 · 今日 1 局',
  });
});

test('createMenuLayout hides growth summary when there is no streak', () => {
  const layout = createMenuLayout(430, 932, levels, {
    completedLevelIds: ['lab-01'],
    growthStats: {
      currentStreak: 0,
      todayCompletedCount: 1,
    },
  });

  assert.deepEqual(layout.campaignProgress, {
    visible: true,
    text: '闯关进度 1/24',
  });
  assert.deepEqual(layout.growthSummary, {
    visible: false,
    text: '',
  });
});

test('createMenuLayout falls back when saved campaign level or practice difficulty is unknown', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    hasPracticeRun: true,
    activeRun: {
      levelId: 'missing-level',
    },
    practiceRun: {
      difficulty: 'expert',
    },
  });

  assert.equal(layout.modeCards.campaign.title, '继续闯关');
  assert.equal(layout.modeCards.campaign.subtitle, null);
  assert.equal(layout.modeCards.practice.title, '自由练习');
  assert.equal(layout.modeCards.practice.subtitle, null);
});

test('createMenuLayout does not expose individual level cards on the first screen', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-01'],
  });

  assert.deepEqual(layout.levelCards, []);
  assert.equal(hitTestMenu(layout, 215, 360), null);
});

test('createMenuLayout keeps primary controls inside a short viewport', () => {
  const layout = createMenuLayout(375, 667, levels, {
    hasActiveRun: true,
    completedLevelIds: [],
  });

  Object.values(layout.modeCards).forEach((card) => {
    assert.ok(card.y + card.height <= 667 - layout.margin);
  });
});

test('createMenuLayout keeps the twelve-level pack hidden on common portrait viewports', () => {
  [
    [430, 932],
    [390, 844],
    [375, 667],
    [320, 568],
  ].forEach(([width, height]) => {
    const layout = createMenuLayout(width, height, levels, {
      hasActiveRun: true,
      completedLevelIds: ['lab-01'],
    });

    assert.deepEqual(layout.levelCards, []);
    assertHeroBoardMotionGap(layout);
    Object.values(layout.modeCards).forEach((card) => {
      assert.ok(card.y + card.height <= height - layout.margin);
    });
  });
});

test('createMenuLayout starts below the reserved top safe area', () => {
  const layout = createMenuLayout(430, 932, levels, {
    topInset: 96,
  });

  assert.ok(layout.title.y >= 96);
  assert.ok(layout.modeCards.campaign.y > layout.title.y);
  assertHeroBoardMotionGap(layout);
});

test('createMenuLayout reserves animated hero motion space on a short viewport', () => {
  const layout = createMenuLayout(320, 568, levels, {
    hasActiveRun: true,
    completedLevelIds: ['lab-01'],
  });

  assertHeroBoardMotionGap(layout);
  assert.ok(layout.heroBoard.y >= layout.title.y + 104);
});

test('createMenuLayout reserves animated hero motion space with a tall top safe area', () => {
  const layout = createMenuLayout(320, 568, levels, {
    hasActiveRun: true,
    completedLevelIds: ['lab-01'],
    topInset: 96,
  });

  assert.ok(layout.title.y >= 96);
  assertHeroBoardMotionGap(layout);
});

test('createMenuLayout uses safe defaults when progress summary is omitted', () => {
  const layout = createMenuLayout(430, 932, levels);

  assert.equal(layout.modeCards.campaign.label, '闯关挑战');
  assert.equal(layout.modeCards.campaign.buttonLabel, '闯关挑战');
  assert.equal(layout.modeCards.practice.label, '自由练习');
  assert.equal(layout.modeCards.practice.buttonLabel, '自由练习');
});

test('createMenuLayout hides supplied level cards even in a short viewport', () => {
  const manyLevels = Array.from({ length: 5 }, (_, index) => ({
    ...levels[index % levels.length],
    id: `lab-${String(index + 2).padStart(2, '0')}`,
    rules: [...levels[index % levels.length].rules],
  }));
  const layout = createMenuLayout(375, 667, manyLevels, {
    hasActiveRun: true,
    completedLevelIds: [],
  });

  assert.deepEqual(layout.levelCards, []);
  Object.values(layout.modeCards).forEach((card) => {
    assert.ok(card.y + card.height <= 667 - layout.margin);
  });
});

test('createMenuLayout keeps report hidden without exposing level cards in a short viewport', () => {
  const manyLevels = Array.from({ length: 5 }, (_, index) => ({
    ...levels[index % levels.length],
    id: `lab-${String(index + 2).padStart(2, '0')}`,
    rules: [...levels[index % levels.length].rules],
  }));
  const layout = createMenuLayout(375, 667, manyLevels, {
    hasActiveRun: true,
    completedLevelIds: ['lab-02'],
  });

  assert.deepEqual(layout.levelCards, []);
  assert.deepEqual(layout.derustSummary, { visible: false });
  Object.values(layout.modeCards).forEach((card) => {
    assert.ok(card.y + card.height <= 667 - layout.margin);
  });
});

test('createMenuLayout does not leak level metadata into first-screen cards', () => {
  const layout = createMenuLayout(430, 932, levels);

  assert.deepEqual(layout.levelCards, []);
});

test('hitTestMenu returns null for card gap and outside menu', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    completedLevelIds: [],
  });
  const gapX = layout.modeCards.campaign.x + layout.modeCards.campaign.width / 2;
  const gapY = layout.modeCards.campaign.y + layout.modeCards.campaign.height + 5;

  assert.equal(hitTestMenu(layout, gapX, gapY), null);
  assert.equal(hitTestMenu(layout, 1, 1), null);
});

test('campaign and practice mode cards do not overlap', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    completedLevelIds: [],
  });

  assert.ok(layout.modeCards.campaign.y + layout.modeCards.campaign.height < layout.modeCards.practice.y);
});

test('createMenuLayout adds a nine-by-nine sudoku hero board for first-time users', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: [],
  });

  assert.equal(layout.heroSubtitle, '每天打开一局，给大脑做一次轻量热身。');
  assert.equal(layout.heroOrb, undefined);
  assert.equal(layout.heroBoard.cells.length, 81);
  assert.ok(layout.heroBoard.cells.some((cell) => cell.value > 0));
  assert.ok(layout.heroBoard.y > layout.title.y + 80);
  assertHeroBoardMotionGap(layout);
  assert.ok(layout.modeCards.practice.y + layout.modeCards.practice.height <= layout.height - layout.margin - 32);
  assert.ok(layout.ambientParticles.length >= 3);
  assert.equal(layout.derustSummary.visible, false);
});

test('createMenuLayout keeps homepage report hidden even after completed levels', () => {
  const layout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-01', 'lab-02'],
    dailyReportSummary: {
      visible: true,
      label: '今日报告',
      totalText: '今日除锈 0.02%',
      detail: '娱乐指标 · 今日已完成 2 次训练',
      disclaimer: '娱乐数值，不代表医学效果。',
    },
  });

  assert.deepEqual(layout.levelCards, []);
  assert.deepEqual(layout.derustSummary, { visible: false });
});

test('brain greenhouse layout keeps hero and controls inside common portrait viewports', () => {
  [
    [430, 932],
    [390, 844],
    [375, 667],
  ].forEach(([width, height]) => {
    const layout = createMenuLayout(width, height, levels, {
      hasActiveRun: true,
      completedLevelIds: ['lab-01'],
    });

    assert.ok(layout.title.y >= 0);
    assertHeroBoardMotionGap(layout);
    assert.ok(layout.modeCards.practice.y + layout.modeCards.practice.height <= height - layout.margin - 32);
    assert.ok(layout.modeCards.campaign.y + layout.modeCards.campaign.height < layout.modeCards.practice.y);
  });
});

function assertHeroBoardMotionGap(layout) {
  const reserve = layout.compact
    ? MENU_HERO_MOTION_RESERVE.compact
    : MENU_HERO_MOTION_RESERVE.regular;

  assert.ok(layout.heroBoard.y + layout.heroBoard.size + reserve <= layout.modeCards.campaign.y);
}
