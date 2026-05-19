const { TRAINING_OPTIONS, getTrainingOption } = require('./game-modes');

const PRACTICE_AMBIENT_PARTICLES = Object.freeze([
  { xRatio: 0.18, yRatio: 0.22, radius: 34, color: 'rgba(22, 163, 160, 0.15)' },
  { xRatio: 0.82, yRatio: 0.18, radius: 46, color: 'rgba(255, 200, 97, 0.2)' },
  { xRatio: 0.74, yRatio: 0.66, radius: 28, color: 'rgba(22, 163, 160, 0.1)' },
]);

function createPracticeMenuLayout(width, height, levels, options = {}) {
  const compact = height < 700;
  const margin = compact ? 18 : 22;
  const topY = Math.max(compact ? 28 : 54, normalizeTopInset(options.topInset, height));
  const backButton = {
    x: margin,
    y: topY,
    width: compact ? 72 : 82,
    height: compact ? 34 : 38,
    label: '返回',
  };
  const titleY = backButton.y + backButton.height + (compact ? 24 : 38);
  const cardGap = compact ? 10 : 14;
  const cardStartY = titleY + (compact ? 58 : 88);
  const availableCardHeight =
    (height - margin - cardStartY - cardGap * (TRAINING_OPTIONS.length - 1)) /
    TRAINING_OPTIONS.length;
  const cardHeight = Math.max(70, Math.min(compact ? 86 : 108, availableCardHeight));
  const availableSourceDifficulties = getAvailableSourceDifficulties(levels);
  const recommendedTrainingDifficulty =
    getTrainingOption(options.recommendedTrainingDifficulty)
      ? options.recommendedTrainingDifficulty
      : 'warmup';
  const recommendedOption = getTrainingOption(recommendedTrainingDifficulty);
  const recommendation = recommendedOption ? `推荐：${recommendedOption.label}` : '';

  return {
    width,
    height,
    margin,
    compact,
    backButton,
    title: {
      x: margin,
      y: titleY,
      text: '自由练习',
    },
    subtitle: {
      x: margin,
      y: titleY + (compact ? 28 : 34),
      text: '选一个难度，随时练一局，不影响闯关进度。',
    },
    recommendation: {
      x: margin,
      y: titleY + (compact ? 50 : 56),
      text: recommendation,
    },
    ambientParticles: PRACTICE_AMBIENT_PARTICLES.map((particle) => ({
      x: width * particle.xRatio,
      y: height * particle.yRatio,
      radius: particle.radius,
      color: particle.color,
    })),
    difficultyCards: TRAINING_OPTIONS.map((option, index) => {
      const enabled = availableSourceDifficulties.has(option.sourceDifficulty);
      const recommended = option.trainingDifficulty === recommendedTrainingDifficulty;

      return {
        x: margin,
        y: cardStartY + index * (cardHeight + cardGap),
        width: width - margin * 2,
        height: cardHeight,
        difficulty: option.sourceDifficulty,
        trainingDifficulty: option.trainingDifficulty,
        sourceDifficulty: option.sourceDifficulty,
        label: option.label,
        description: option.description,
        recommendationText: option.recommendationText,
        enabled,
        statusLabel: enabled ? (recommended ? '推荐' : '可练习') : '暂未开放',
      };
    }),
  };
}

function hitTestPracticeMenu(layout, x, y) {
  if (!layout) {
    return null;
  }

  if (layout.backButton && isInside(layout.backButton, x, y)) {
    return {
      type: 'practiceMenu',
      action: 'back',
    };
  }

  const cards = Array.isArray(layout.difficultyCards) ? layout.difficultyCards : [];
  const card = cards.find((item) => item.enabled && isInside(item, x, y));

  if (!card) {
    return null;
  }

  return {
    type: 'practiceMenu',
    action: 'difficulty',
    difficulty: card.difficulty,
    trainingDifficulty: card.trainingDifficulty,
  };
}

function getAvailableSourceDifficulties(levels) {
  const safeLevels = Array.isArray(levels) ? levels : [];

  return new Set(
    safeLevels
      .map((level) => level && level.difficulty)
      .filter((difficulty) =>
        TRAINING_OPTIONS.some((option) => option.sourceDifficulty === difficulty),
      ),
  );
}

function normalizeTopInset(topInset, height) {
  if (!Number.isFinite(topInset) || topInset < 0) {
    return 0;
  }

  return Math.min(topInset, Math.max(0, height * 0.22));
}

function isInside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

module.exports = {
  createPracticeMenuLayout,
  hitTestPracticeMenu,
};
