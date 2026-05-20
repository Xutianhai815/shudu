const TECHNIQUE_AMBIENT_PARTICLES = Object.freeze([
  { xRatio: 0.16, yRatio: 0.18, radius: 38, color: 'rgba(22, 163, 160, 0.14)' },
  { xRatio: 0.82, yRatio: 0.24, radius: 42, color: 'rgba(255, 200, 97, 0.18)' },
  { xRatio: 0.7, yRatio: 0.74, radius: 34, color: 'rgba(24, 33, 31, 0.08)' },
]);

const SHORT_SUBTITLES = Object.freeze({
  'board-basics': '认识行列宫',
  'single-empty': '找最后空格',
  'single-candidate': '看见唯一可能',
  'digit-scan': '扫描数字落点',
  'box-elimination': '缩小宫内范围',
  'line-box-interaction': '联动行列宫',
  'notes-cleanup': '整理候选草稿',
  'duplicate-check': '避开重复冲突',
  'naked-pair': '识别显性数对',
  'hidden-pair': '找隐藏组合',
  'pointing-set': '观察指向关系',
  'box-line-reduction': '区块清理候选',
  'x-wing': '看两行两列',
  swordfish: '看三行三列',
  'xy-wing': '看双候选链',
  'unique-rectangle': '识别矩形结构',
});

function createTechniqueMenuLayout(width, height, groups, techniques, options = {}) {
  const compact = height < 700;
  const ultraCompact = compact && (width <= 340 || height <= 600);
  const margin = compact ? 18 : 22;
  const topY = Math.max(compact ? 28 : 54, normalizeTopInset(options.topInset, height));
  const backButton = {
    x: margin,
    y: topY,
    width: compact ? 72 : 82,
    height: compact ? 34 : 38,
    label: '返回',
  };
  const titleY = backButton.y + backButton.height + (ultraCompact ? 16 : compact ? 22 : 34);
  const subtitleY = titleY + (ultraCompact ? 24 : compact ? 28 : 34);
  const columnGap = compact ? 8 : 10;
  const groupGap = ultraCompact ? 4 : compact ? 8 : 16;
  const cardGap = ultraCompact ? 4 : compact ? 6 : 10;
  const groupHeaderHeight = ultraCompact ? 26 : compact ? 30 : 42;
  const cardWidth = (width - margin * 2 - columnGap) / 2;
  const groupList = normalizeGroups(groups);
  const techniqueList = normalizeTechniques(techniques);
  const rowCount = groupList.reduce((sum, group) => {
    const count = techniqueList.filter((technique) => technique.group === group.id).length;

    return sum + Math.ceil(count / 2);
  }, 0);
  const contentStartY = subtitleY + (ultraCompact ? 12 : compact ? 18 : 34);
  const availableCardArea =
    height -
    margin -
    contentStartY -
    groupHeaderHeight * groupList.length -
    groupGap * Math.max(0, groupList.length - 1) -
    cardGap * Math.max(0, rowCount - groupList.length);
  const cardHeight = Math.max(
    ultraCompact ? 32 : compact ? 40 : 52,
    Math.min(ultraCompact ? 40 : compact ? 52 : 66, availableCardArea / Math.max(1, rowCount)),
  );
  const laidOutGroups = [];
  const techniqueCards = [];
  let cursorY = contentStartY;

  groupList.forEach((group, groupIndex) => {
    const groupTechniques = techniqueList.filter((technique) => technique.group === group.id);
    const groupRecord = {
      id: group.id,
      title: group.title,
      subtitle: group.subtitle,
      x: margin,
      y: cursorY,
      width: width - margin * 2,
      height: groupHeaderHeight,
    };

    laidOutGroups.push(groupRecord);
    cursorY += groupHeaderHeight;

    groupTechniques.forEach((technique, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);

      techniqueCards.push({
        x: margin + column * (cardWidth + columnGap),
        y: cursorY + row * (cardHeight + cardGap),
        width: cardWidth,
        height: cardHeight,
        id: technique.id,
        group: technique.group,
        title: technique.title,
        shortSubtitle: SHORT_SUBTITLES[technique.id] || '练一次关键步',
        difficultyLabel: group.title,
        showShortSubtitle: !ultraCompact,
        showButtonLabel: false,
      });
    });

    cursorY += Math.ceil(groupTechniques.length / 2) * (cardHeight + cardGap) - cardGap;

    if (groupIndex < groupList.length - 1) {
      cursorY += groupGap;
    }
  });

  return {
    width,
    height,
    margin,
    compact,
    ultraCompact,
    backButton,
    title: {
      x: margin,
      y: titleY,
      text: '技巧训练',
    },
    subtitle: {
      x: margin,
      y: subtitleY,
      text: '选一个观察方法，练一次关键步骤。',
    },
    groups: laidOutGroups,
    techniqueCards,
    ambientParticles: TECHNIQUE_AMBIENT_PARTICLES.map((particle) => ({
      x: width * particle.xRatio,
      y: height * particle.yRatio,
      radius: particle.radius,
      color: particle.color,
    })),
  };
}

function hitTestTechniqueMenu(layout, x, y) {
  if (!layout) {
    return null;
  }

  if (layout.backButton && isInside(layout.backButton, x, y)) {
    return {
      type: 'techniqueMenu',
      action: 'back',
    };
  }

  const cards = Array.isArray(layout.techniqueCards) ? layout.techniqueCards : [];
  const card = cards.find((item) => isInside(item, x, y));

  if (!card) {
    return null;
  }

  return {
    type: 'techniqueMenu',
    action: 'technique',
    techniqueId: card.id,
  };
}

function normalizeGroups(groups) {
  return (Array.isArray(groups) ? groups : [])
    .filter((group) => group && group.id && group.title)
    .map((group) => ({
      id: group.id,
      title: group.title,
      subtitle: group.subtitle || '',
    }));
}

function normalizeTechniques(techniques) {
  return (Array.isArray(techniques) ? techniques : [])
    .filter((technique) => technique && technique.id && technique.group && technique.title)
    .map((technique) => ({
      id: technique.id,
      group: technique.group,
      title: technique.title,
      summary: technique.summary || '',
    }));
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
  createTechniqueMenuLayout,
  hitTestTechniqueMenu,
};
