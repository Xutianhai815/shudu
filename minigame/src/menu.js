const HERO_BOARD_VALUES = Object.freeze([
  5, 0, 0, 0, 0, 9, 0, 0, 0,
  0, 8, 0, 0, 0, 0, 3, 0, 0,
  0, 0, 2, 0, 0, 0, 0, 7, 0,
  0, 0, 6, 0, 0, 0, 0, 0, 1,
  0, 0, 0, 4, 0, 2, 0, 0, 0,
  7, 0, 0, 0, 0, 0, 8, 0, 0,
  0, 3, 0, 0, 0, 0, 6, 0, 0,
  0, 0, 1, 0, 0, 0, 0, 4, 0,
  0, 0, 0, 8, 0, 0, 0, 0, 5,
]);

const HERO_BOARD_TEAL_INDEXES = Object.freeze([3, 20, 38, 56, 77]);
const HERO_BOARD_AMBER_INDEXES = Object.freeze([8, 23, 40, 54, 72]);
const MENU_HERO_MOTION_RESERVE = Object.freeze({
  compact: 36,
  regular: 44,
});

const AMBIENT_PARTICLES = Object.freeze([
  { xRatio: 0.16, yRatio: 0.35, radius: 30, color: 'rgba(22, 163, 160, 0.18)' },
  { xRatio: 0.78, yRatio: 0.23, radius: 42, color: 'rgba(255, 200, 97, 0.24)' },
  { xRatio: 0.72, yRatio: 0.58, radius: 24, color: 'rgba(22, 163, 160, 0.12)' },
  { xRatio: 0.26, yRatio: 0.68, radius: 18, color: 'rgba(255, 255, 255, 0.42)' },
]);

function createMenuLayout(width, height, levels, progressSummary = {}) {
  const {
    hasActiveRun = false,
    activeRun = null,
    completedLevelIds = [],
    growthStats = null,
    topInset = 0,
  } = progressSummary;
  const margin = 22;
  const compact = height < 760;
  const topY = Math.max(compact ? 42 : 72, normalizeTopInset(topInset, height));
  const titleY = topY;
  const cardHeight = compact ? 50 : 54;
  const cardGap = compact ? 12 : 16;
  const cardLift = compact ? 58 : 78;
  const cardWidth = Math.min(width - margin * 2, compact ? 230 : 258);
  const cardX = (width - cardWidth) / 2;
  const practiceCardY = height - margin - cardHeight - cardLift;
  const campaignCardY = practiceCardY - cardGap - cardHeight;
  const motionReserve = compact
    ? MENU_HERO_MOTION_RESERVE.compact
    : MENU_HERO_MOTION_RESERVE.regular;
  const minHeroY = titleY + 104;
  const maxHeroSize = Math.max(0, campaignCardY - minHeroY - motionReserve);
  const heroSize = Math.min(width - margin * 3.2, compact ? 176 : 218, maxHeroSize);
  const heroY = titleY + (compact ? 118 : 148);
  const safeHeroY = Math.max(
    minHeroY,
    Math.min(heroY, campaignCardY - heroSize - motionReserve),
  );

  const campaignCopy = createCampaignCardCopy(levels, {
    hasActiveRun,
    activeRun,
    completedLevelIds,
  });
  const practiceCopy = createPracticeCardCopy();

  const modeCards = {
    campaign: {
      x: cardX,
      y: campaignCardY,
      width: cardWidth,
      height: cardHeight,
      action: 'campaign',
      title: campaignCopy.title,
      subtitle: null,
      buttonLabel: campaignCopy.buttonLabel,
      label: campaignCopy.buttonLabel,
    },
    practice: {
      x: cardX,
      y: practiceCardY,
      width: cardWidth,
      height: cardHeight,
      action: 'practice',
      title: practiceCopy.title,
      subtitle: null,
      buttonLabel: practiceCopy.buttonLabel,
      label: practiceCopy.buttonLabel,
    },
  };
  const techniqueEntryWidth = compact ? 118 : 132;
  const techniqueEntryHeight = compact ? 28 : 30;
  const techniqueTrainingEntry = {
    x: (width - techniqueEntryWidth) / 2,
    y: Math.min(
      height - margin - techniqueEntryHeight,
      modeCards.practice.y + modeCards.practice.height + (compact ? 8 : 12),
    ),
    width: techniqueEntryWidth,
    height: techniqueEntryHeight,
    action: 'techniqueTraining',
    label: '技巧训练',
    helperText: null,
    emphasis: 'low',
  };

  return {
    width,
    height,
    margin,
    compact,
    title: {
      x: margin,
      y: titleY,
      text: 'Lab Lines Sudoku',
      subtitle: '一一数独',
    },
    heroSubtitle: '每天打开一局，给大脑做一次轻量热身。',
    heroBoard: {
      x: (width - heroSize) / 2,
      y: safeHeroY,
      size: heroSize,
      cells: createHeroBoardCells(),
    },
    ambientParticles: AMBIENT_PARTICLES.map((particle) => ({
      x: width * particle.xRatio,
      y: height * particle.yRatio,
      radius: particle.radius,
      color: particle.color,
    })),
    growthSummary: createGrowthSummary(growthStats),
    modeCards,
    techniqueTrainingEntry,
    derustSummary: { visible: false },
    levelCards: [],
  };
}

function createCampaignCardCopy(levels, progressSummary) {
  const safeLevels = Array.isArray(levels) ? levels : [];
  const activeRun = progressSummary.activeRun;

  if (progressSummary.hasActiveRun || activeRun) {
    return {
      title: '继续闯关',
      buttonLabel: '继续闯关',
    };
  }

  const completedCount = countKnownCompletedLevels(progressSummary.completedLevelIds, safeLevels);
  if (completedCount > 0) {
    return {
      title: '闯关挑战',
      buttonLabel: '闯关挑战',
    };
  }

  return {
    title: '闯关挑战',
    buttonLabel: '闯关挑战',
  };
}

function createPracticeCardCopy() {
  return {
    title: '自由练习',
    buttonLabel: '自由练习',
  };
}

function createGrowthSummary(growthStats) {
  const currentStreak =
    growthStats && Number.isInteger(growthStats.currentStreak) && growthStats.currentStreak > 0
      ? growthStats.currentStreak
      : 0;

  if (currentStreak === 0) {
    return {
      visible: false,
      text: '',
    };
  }

  const todayCompletedCount =
    growthStats && Number.isInteger(growthStats.todayCompletedCount) && growthStats.todayCompletedCount > 0
      ? growthStats.todayCompletedCount
      : 0;

  return {
    visible: true,
    text: `连续除锈 ${currentStreak} 天 · 今日 ${todayCompletedCount} 局`,
  };
}

function countKnownCompletedLevels(completedLevelIds, levels) {
  if (!Array.isArray(completedLevelIds) || !Array.isArray(levels)) {
    return 0;
  }

  const knownLevelIds = new Set(levels.map((level) => level && level.id).filter(Boolean));
  return new Set(completedLevelIds.filter((levelId) => knownLevelIds.has(levelId))).size;
}

function createHeroBoardCells() {
  return HERO_BOARD_VALUES.map((value, index) => ({
    value,
    tone: getHeroBoardTone(value, index),
  }));
}

function getHeroBoardTone(value, index) {
  if (HERO_BOARD_TEAL_INDEXES.includes(index)) {
    return 'teal';
  }

  if (HERO_BOARD_AMBER_INDEXES.includes(index)) {
    return 'amber';
  }

  return value > 0 ? 'given' : 'empty';
}

function normalizeTopInset(topInset, height) {
  if (!Number.isFinite(topInset) || topInset < 0) {
    return 0;
  }

  return Math.min(topInset, Math.max(0, height * 0.22));
}

function hitTestMenu(layout, x, y) {
  if (!layout) {
    return null;
  }

  const modeCards = layout && layout.modeCards ? layout.modeCards : {};
  const campaignCard = modeCards.campaign;
  const practiceCard = modeCards.practice;

  if (campaignCard && isInside(campaignCard, x, y)) {
    return {
      type: 'menu',
      action: 'campaign',
    };
  }

  if (practiceCard && isInside(practiceCard, x, y)) {
    return {
      type: 'menu',
      action: 'practice',
    };
  }

  if (layout.techniqueTrainingEntry && isInside(layout.techniqueTrainingEntry, x, y)) {
    return {
      type: 'menu',
      action: 'techniqueTraining',
    };
  }

  return null;
}

function isInside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

module.exports = {
  MENU_HERO_MOTION_RESERVE,
  createMenuLayout,
  hitTestMenu,
};
