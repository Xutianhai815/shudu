const { getCellFlags } = require('./puzzle');

const FONT_SCALE_BY_CONTEXT = new WeakMap();

const DEFAULT_COMPLETION_FEEDBACK = {
  label: 'LAB RESULT',
  title: '大脑除锈完成',
  deltaText: '+0.01%',
  metricLabel: '今日脑力光泽度',
  subtitle: '你的脑力刚刚完成了一次轻量热身。请继续保持嚣张。',
  disclaimer: '娱乐数值，不代表医学效果。',
  stats: [
    { label: '今日训练', value: '1 次' },
    { label: '大脑状态', value: '已激活' },
  ],
};

function renderGame(ctx, state, layout, options = {}) {
  const viewLayout = {
    ...layout,
    level: state.level,
    stateNoteMode: state.noteMode,
    companionFeedback: options.companionFeedback,
    completionFeedback: options.completionFeedback,
    modeContext: normalizeModeContext(options.modeContext),
    victoryActions: normalizeVictoryActions(options.victoryActions),
  };
  const { width, height, colors } = viewLayout;

  clear(ctx, width, height);
  drawBackground(ctx, viewLayout);
  drawCompanionAtmosphere(ctx, viewLayout);
  drawTopBar(ctx, viewLayout);
  drawRuleStrip(ctx, viewLayout);
  drawCompanionToast(ctx, viewLayout);
  drawBoard(ctx, state, viewLayout);
  drawTools(ctx, viewLayout);
  drawKeypad(ctx, viewLayout);

  if (state.completed) {
    drawVictoryOverlay(ctx, state, viewLayout);
  }
}

function renderMenu(ctx, layout) {
  ctx.save();
  try {
    clear(ctx, layout.width, layout.height);
    drawMenuBackground(ctx, layout);
    drawMenuAmbientParticles(ctx, layout);
    drawMenuHero(ctx, layout);
    drawMenuHeroBoard(ctx, layout);
    drawMenuActions(ctx, layout);
  } finally {
    ctx.restore();
  }
}

function renderPracticeMenu(ctx, layout) {
  ctx.save();
  try {
    clear(ctx, layout.width, layout.height);
    drawMenuBackground(ctx, layout);
    drawMenuAmbientParticles(ctx, layout);
    drawPracticeMenuHeader(ctx, layout);
    drawPracticeTechniqueEntry(ctx, layout);
    drawPracticeDifficultyCards(ctx, layout);
  } finally {
    ctx.restore();
  }
}

function renderTechniqueMenu(ctx, layout) {
  ctx.save();
  try {
    clear(ctx, layout.width, layout.height);
    drawMenuBackground(ctx, layout);
    drawMenuAmbientParticles(ctx, layout);
    drawTechniqueMenuHeader(ctx, layout);
    drawTechniqueGroups(ctx, layout);
  } finally {
    ctx.restore();
  }
}

function renderTechniqueLesson(ctx, state, layout, options = {}) {
  const technique = options.technique || {};
  const viewLayout = {
    ...layout,
    level: {
      ...(state && state.level ? state.level : {}),
      label: '技巧训练',
      title: technique.title || (state && state.level && state.level.title) || '技巧训练',
      rules: ['classic'],
    },
    stateNoteMode: false,
    modeContext: {
      mode: 'technique',
      label: '技巧训练',
      title: technique.title || (state && state.level && state.level.title) || '技巧训练',
    },
  };

  ctx.save();
  try {
    clear(ctx, viewLayout.width, viewLayout.height);
    drawBackground(ctx, viewLayout);
    drawTopBar(ctx, viewLayout);
    drawTechniqueLessonPrompt(ctx, viewLayout, state, technique);
    drawTechniqueFocusHalo(ctx, viewLayout, technique);
    drawBoard(ctx, state, viewLayout);
    drawKeypad(ctx, viewLayout);
  } finally {
    ctx.restore();
  }
}

function clear(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

function drawMenuBackground(ctx, layout) {
  const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height);
  gradient.addColorStop(0, '#dce9e4');
  gradient.addColorStop(0.48, '#fff4d7');
  gradient.addColorStop(1, '#d5e6df');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);

  roundRect(
    ctx,
    layout.margin / 2,
    8,
    layout.width - layout.margin,
    layout.height - 16,
    34,
    'rgba(255, 255, 255, 0.36)',
  );
}

function drawMenuAmbientParticles(ctx, layout) {
  const particles = Array.isArray(layout.ambientParticles) ? layout.ambientParticles : [];
  const animationTime = normalizeAnimationTime(layout.animationTime);
  const tilt = normalizeTilt(layout.tilt);

  particles.forEach((particle, index) => {
    const drift = Math.sin(animationTime / 760 + index * 0.9) * 10;
    const depth = 1 + (index % 3) * 0.35;

    ctx.beginPath();
    ctx.fillStyle = particle.color || 'rgba(22, 163, 160, 0.12)';
    ctx.arc(
      particle.x + drift + tilt.x * 12 * depth,
      particle.y - drift * 0.65 + tilt.y * 8 * depth,
      particle.radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}

function drawMenuHero(ctx, layout) {
  ctx.fillStyle = '#18211f';
  setFont(ctx, layout, layout.compact ? '900 31px sans-serif' : '900 36px sans-serif');
  ctx.fillText(layout.title.subtitle, layout.title.x, layout.title.y);

  ctx.fillStyle = 'rgba(24, 33, 31, 0.58)';
  setFont(ctx, layout, '800 13px sans-serif');
  ctx.fillText(layout.title.text, layout.title.x, layout.title.y + 28);

  if (layout.heroSubtitle) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.68)';
    setFont(ctx, layout, layout.compact ? '800 13px sans-serif' : '800 14px sans-serif');
    ctx.fillText(layout.heroSubtitle, layout.title.x, layout.title.y + (layout.compact ? 58 : 64));
  }
}

function drawMenuHeroBoard(ctx, layout) {
  const board = layout.heroBoard;

  if (!board || !Array.isArray(board.cells)) {
    return;
  }

  const animationTime = normalizeAnimationTime(layout.animationTime);
  const tilt = normalizeTilt(layout.tilt);
  const floatOffset = Math.sin(animationTime / 700) * 14;
  const boardX = board.x + tilt.x * 18;
  const boardY = board.y + floatOffset + tilt.y * 14;

  roundRect(ctx, boardX, boardY, board.size, board.size, 24, 'rgba(255, 255, 255, 0.52)');

  ctx.strokeStyle = 'rgba(24, 33, 31, 0.08)';
  ctx.lineWidth = 1.5;
  roundedPath(ctx, boardX + 1, boardY + 1, board.size - 2, board.size - 2, 23);
  ctx.stroke();

  const padding = board.size * 0.08;
  const gridSize = board.size - padding * 2;
  const cellSize = gridSize / 9;

  board.cells.slice(0, 81).forEach((cell, index) => {
    const boardRow = Math.floor(index / 9);
    const col = index % 9;
    const x = boardX + padding + col * cellSize;
    const y = boardY + padding + boardRow * cellSize;

    ctx.fillStyle = getMenuBoardCellFill(cell);
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

    if (cell && cell.value > 0) {
      ctx.fillStyle = '#17312b';
      setFont(ctx, layout, '900 10px sans-serif');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cell.value), x + cellSize / 2, y + cellSize / 2 + 0.5);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  });

  drawMenuBoardGrid(ctx, boardX + padding, boardY + padding, gridSize);
}

function normalizeAnimationTime(animationTime) {
  return Number.isFinite(animationTime) ? animationTime : 0;
}

function normalizeTilt(tilt) {
  return {
    x: tilt && Number.isFinite(tilt.x) ? tilt.x : 0,
    y: tilt && Number.isFinite(tilt.y) ? tilt.y : 0,
  };
}

function getMenuBoardCellFill(cell) {
  if (!cell) {
    return 'rgba(255, 250, 240, 0.42)';
  }

  if (cell.tone === 'teal') {
    return 'rgba(22, 163, 160, 0.18)';
  }

  if (cell.tone === 'amber') {
    return 'rgba(246, 207, 117, 0.24)';
  }

  if (cell.tone === 'given') {
    return 'rgba(24, 33, 31, 0.075)';
  }

  return 'rgba(255, 250, 240, 0.42)';
}

function drawMenuBoardGrid(ctx, x, y, size) {
  const cellSize = size / 9;

  for (let index = 0; index <= 9; index += 1) {
    const position = index * cellSize;
    const majorLine = index % 3 === 0;

    ctx.beginPath();
    ctx.strokeStyle = majorLine ? 'rgba(24, 33, 31, 0.34)' : 'rgba(24, 33, 31, 0.12)';
    ctx.lineWidth = majorLine ? 1.8 : 0.8;
    ctx.moveTo(x + position, y);
    ctx.lineTo(x + position, y + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + position);
    ctx.lineTo(x + size, y + position);
    ctx.stroke();
  }
}

function drawMenuActions(ctx, layout) {
  if (layout.modeCards) {
    drawMenuProgressSummaries(ctx, layout);
    drawMenuModeCards(ctx, layout, layout.modeCards);
    drawHomepageTechniqueEntry(ctx, layout);
    return;
  }

  if (layout.continueButton) {
    drawMenuButton(ctx, layout, layout.continueButton, layout.continueButton.label, '#18211f', '#ffffff');
    drawMenuButton(ctx, layout, layout.primaryButton, layout.primaryButton.label, 'rgba(255, 255, 255, 0.72)', '#18211f');
    return;
  }

  if (layout.primaryButton) {
    drawMenuButton(ctx, layout, layout.primaryButton, layout.primaryButton.label, '#18211f', '#ffffff');
  }
}

function drawMenuProgressSummaries(ctx, layout) {
  const summaries = [layout.growthSummary].filter(
    (summary) => summary && summary.visible && summary.text,
  );

  if (summaries.length === 0) {
    return;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const campaignCard = layout.modeCards && layout.modeCards.campaign;
  const x = campaignCard ? campaignCard.x + campaignCard.width / 2 : layout.width / 2;
  const startY = campaignCard
    ? campaignCard.y - (layout.compact ? 40 : 46)
    : layout.height - layout.margin - 140;

  summaries.forEach((summary, index) => {
    ctx.fillStyle = index === 0 ? 'rgba(24, 33, 31, 0.72)' : 'rgba(8, 116, 113, 0.78)';
    setFont(ctx, layout, index === 0 ? '900 13px sans-serif' : '850 12px sans-serif');
    ctx.fillText(summary.text, x, startY + index * (layout.compact ? 18 : 20));
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawMenuModeCards(ctx, layout, modeCards) {
  const cards = [modeCards.campaign, modeCards.practice].filter(Boolean);

  cards.forEach((card, index) => {
    const primary = index === 0;
    const minimal = !card.subtitle && !(Array.isArray(card.difficultyDots) && card.difficultyDots.length > 0);
    const fill = primary ? 'rgba(24, 33, 31, 0.94)' : 'rgba(255, 255, 255, 0.76)';
    const titleColor = primary ? '#ffffff' : '#18211f';
    const labelColor = primary ? 'rgba(255, 200, 97, 0.95)' : '#087471';
    const railColor = primary ? '#ffc861' : '#16a3a0';

    roundRect(ctx, card.x, card.y, card.width, card.height, 22, fill);
    ctx.fillStyle = railColor;
    roundRect(ctx, card.x + 12, card.y + 10, 6, card.height - 20, 3, railColor);

    ctx.fillStyle = titleColor;
    setFont(ctx, layout, minimal ? '950 34px sans-serif' : '950 20px sans-serif');
    ctx.textAlign = 'left';
    ctx.textBaseline = minimal ? 'middle' : 'alphabetic';
    ctx.fillText(card.title, card.x + 30, minimal ? card.y + card.height / 2 + 1 : card.y + 27);
    ctx.textBaseline = 'alphabetic';

    if (card.subtitle) {
      ctx.fillStyle = primary ? 'rgba(255, 255, 255, 0.66)' : 'rgba(24, 33, 31, 0.58)';
      setFont(ctx, layout, '800 11px sans-serif');
      ctx.fillText(card.subtitle, card.x + 32, card.y + 46);
    }

    if (Array.isArray(card.difficultyDots) && card.difficultyDots.length > 0) {
      drawMenuDifficultyDots(ctx, layout, card, primary);
    }

    if (!minimal) {
      ctx.fillStyle = labelColor;
      setFont(ctx, layout, '900 15px sans-serif');
      ctx.fillText(card.buttonLabel || card.label, card.x + 32, card.y + card.height - 12);
    }

    ctx.fillStyle = primary ? 'rgba(255, 255, 255, 0.72)' : 'rgba(24, 33, 31, 0.44)';
    setFont(ctx, layout, '900 22px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('›', card.x + card.width - 24, card.y + card.height / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });
}

function drawHomepageTechniqueEntry(ctx, layout) {
  const entry = layout.techniqueTrainingEntry;

  if (!entry) {
    return;
  }

  roundRect(ctx, entry.x, entry.y, entry.width, entry.height, entry.height / 2, 'rgba(255, 255, 255, 0.46)');
  ctx.fillStyle = '#087471';
  setFont(ctx, layout, layout.compact ? '850 11px sans-serif' : '900 12px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.label, entry.x + entry.width / 2, entry.y + entry.height / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawMenuDifficultyDots(ctx, layout, card, primary) {
  let dotX = card.x + 32;
  const dotY = card.y + card.height - 34;

  card.difficultyDots.forEach((label) => {
    const width = Math.max(32, measureTextWidth(ctx, label) * 0.68 + 16);
    roundRect(
      ctx,
      dotX,
      dotY,
      width,
      18,
      9,
      primary ? 'rgba(255, 255, 255, 0.14)' : 'rgba(22, 163, 160, 0.1)',
    );
    ctx.fillStyle = primary ? 'rgba(255, 255, 255, 0.72)' : 'rgba(8, 116, 113, 0.78)';
    setFont(ctx, layout, '850 10px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, dotX + width / 2, dotY + 9.5);
    dotX += width + 6;
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawMenuButton(ctx, layout, rect, label, fill, color) {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 18, fill);
  ctx.fillStyle = color;
  setFont(ctx, layout, '900 18px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPracticeMenuHeader(ctx, layout) {
  const back = layout.backButton;

  if (back) {
    roundRect(ctx, back.x, back.y, back.width, back.height, back.height / 2, 'rgba(255, 255, 255, 0.72)');
    ctx.fillStyle = '#18211f';
    setFont(ctx, layout, '900 14px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(back.label || '返回', back.x + back.width / 2, back.y + back.height / 2 + 0.5);
  }

  if (layout.title) {
    ctx.fillStyle = '#18211f';
    setFont(ctx, layout, layout.compact ? '950 34px sans-serif' : '950 42px sans-serif');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(layout.title.text, layout.title.x, layout.title.y);
  }

  if (layout.subtitle) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.62)';
    setFont(ctx, layout, layout.compact ? '850 13px sans-serif' : '850 15px sans-serif');
    ctx.fillText(layout.subtitle.text, layout.subtitle.x, layout.subtitle.y);
  }

  if (layout.recommendation && layout.recommendation.text) {
    ctx.fillStyle = 'rgba(8, 116, 113, 0.78)';
    setFont(ctx, layout, layout.compact ? '900 12px sans-serif' : '900 13px sans-serif');
    ctx.fillText(layout.recommendation.text, layout.recommendation.x, layout.recommendation.y);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPracticeDifficultyCards(ctx, layout) {
  const cards = Array.isArray(layout.difficultyCards) ? layout.difficultyCards : [];

  cards.forEach((card, index) => {
    const enabled = card.enabled !== false;
    const fill = enabled ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.42)';
    const railColor = enabled ? getPracticeRailColor(index) : 'rgba(24, 33, 31, 0.16)';
    const titleColor = enabled ? '#18211f' : 'rgba(24, 33, 31, 0.38)';
    const bodyColor = enabled ? 'rgba(24, 33, 31, 0.62)' : 'rgba(24, 33, 31, 0.34)';
    const statusFill = enabled ? 'rgba(22, 163, 160, 0.12)' : 'rgba(24, 33, 31, 0.08)';
    const statusColor = enabled ? '#087471' : 'rgba(24, 33, 31, 0.42)';

    roundRect(ctx, card.x, card.y, card.width, card.height, 24, fill);
    ctx.fillStyle = railColor;
    roundRect(ctx, card.x + 14, card.y + 16, 6, card.height - 32, 3, railColor);

    ctx.fillStyle = titleColor;
    setFont(ctx, layout, layout.compact ? '950 21px sans-serif' : '950 24px sans-serif');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(card.label, card.x + 32, card.y + (layout.compact ? 30 : 36));

    ctx.fillStyle = bodyColor;
    setFont(ctx, layout, layout.compact ? '800 11px sans-serif' : '800 13px sans-serif');
    ctx.fillText(card.description, card.x + 32, card.y + (layout.compact ? 51 : 62));

    if (card.statusLabel) {
      drawPracticeStatusPill(ctx, layout, card, card.statusLabel, statusFill, statusColor);
    }

    if (enabled) {
      ctx.fillStyle = 'rgba(24, 33, 31, 0.42)';
      setFont(ctx, layout, '900 22px sans-serif');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('›', card.x + card.width - 28, card.y + card.height / 2);
    }
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPracticeTechniqueEntry(ctx, layout) {
  const button = layout.techniqueTrainingButton;

  if (!button) {
    return;
  }

  roundRect(ctx, button.x, button.y, button.width, button.height, button.height / 2, 'rgba(24, 33, 31, 0.9)');
  ctx.fillStyle = '#ffffff';
  setFont(ctx, layout, layout.compact ? '900 13px sans-serif' : '900 14px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2 + 0.5);

  if (button.helperText) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.58)';
    setFont(ctx, layout, layout.compact ? '800 11px sans-serif' : '800 12px sans-serif');
    ctx.textAlign = 'left';
    ctx.fillText(button.helperText, button.x + button.width + 10, button.y + button.height / 2 + 4);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTechniqueMenuHeader(ctx, layout) {
  const back = layout.backButton;

  if (back) {
    roundRect(ctx, back.x, back.y, back.width, back.height, back.height / 2, 'rgba(255, 255, 255, 0.72)');
    ctx.fillStyle = '#18211f';
    setFont(ctx, layout, '900 14px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(back.label || '返回', back.x + back.width / 2, back.y + back.height / 2 + 0.5);
  }

  if (layout.title) {
    ctx.fillStyle = '#18211f';
    setFont(ctx, layout, layout.compact ? '900 32px sans-serif' : '900 40px sans-serif');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(layout.title.text, layout.title.x, layout.title.y);
  }

  if (layout.subtitle) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.62)';
    setFont(ctx, layout, layout.compact ? '850 13px sans-serif' : '850 15px sans-serif');
    ctx.fillText(layout.subtitle.text, layout.subtitle.x, layout.subtitle.y);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTechniqueGroups(ctx, layout) {
  const groups = Array.isArray(layout.groups) ? layout.groups : [];
  const cards = Array.isArray(layout.techniqueCards) ? layout.techniqueCards : [];

  groups.forEach((group, groupIndex) => {
    const railColor = groupIndex === 0 ? '#16a3a0' : '#d79b27';

    ctx.fillStyle = '#18211f';
    setFont(ctx, layout, layout.compact ? '900 18px sans-serif' : '900 20px sans-serif');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(group.title, group.x, group.y + (layout.compact ? 22 : 26));

    if (group.subtitle && !layout.compact) {
      ctx.fillStyle = 'rgba(24, 33, 31, 0.52)';
      setFont(ctx, layout, layout.compact ? '800 10px sans-serif' : '800 11px sans-serif');
      ctx.fillText(group.subtitle, group.x + 94, group.y + (layout.compact ? 21 : 25));
    }

    cards
      .filter((card) => card.group === group.id)
      .forEach((card) => drawTechniqueCard(ctx, layout, card, railColor));
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTechniqueCard(ctx, layout, card, railColor) {
  roundRect(ctx, card.x, card.y, card.width, card.height, 18, 'rgba(255, 255, 255, 0.78)');
  ctx.fillStyle = railColor;
  roundRect(ctx, card.x + 10, card.y + 12, 5, card.height - 24, 3, railColor);

  ctx.fillStyle = '#18211f';
  setFont(ctx, layout, layout.ultraCompact ? '900 12px sans-serif' : '900 15px sans-serif');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.title, card.x + 18, card.y + card.height / 2 - (card.showShortSubtitle ? 7 : 0));

  if (card.showShortSubtitle && card.shortSubtitle) {
    ctx.fillStyle = 'rgba(24, 33, 31, 0.52)';
    setFont(ctx, layout, '800 10px sans-serif');
    ctx.fillText(card.shortSubtitle, card.x + 18, card.y + card.height / 2 + 11);
  }

  ctx.fillStyle = 'rgba(24, 33, 31, 0.32)';
  setFont(ctx, layout, '900 16px sans-serif');
  ctx.textAlign = 'right';
  ctx.fillText('›', card.x + card.width - 14, card.y + card.height / 2 + 1);
  ctx.textAlign = 'left';
}

function drawTechniqueLessonPrompt(ctx, layout, state, technique) {
  const completed = state && state.completed === true;
  const text = completed
    ? technique.lesson && technique.lesson.successText
      ? technique.lesson.successText
      : '这一步完成了，观察路径已经连起来。'
    : technique.lesson && technique.lesson.prompt
      ? technique.lesson.prompt
      : '观察目标格，填入这一步最确定的数字。';
  const promptX = layout.margin;
  const promptY = layout.ruleStrip.y - 2;
  const promptWidth = layout.width - layout.margin * 2;
  const panelHeight = layout.compact ? 38 : 42;

  roundRect(
    ctx,
    promptX,
    promptY,
    promptWidth,
    panelHeight,
    16,
    completed ? 'rgba(22, 163, 160, 0.16)' : 'rgba(255, 255, 255, 0.7)',
  );
  ctx.fillStyle = completed ? '#087471' : '#18211f';
  setFont(ctx, layout, layout.compact ? '850 12px sans-serif' : '850 13px sans-serif');
  wrapText(ctx, text, promptX + 14, promptY + (layout.compact ? 18 : 19), promptWidth - 112, layout.compact ? 14 : 15);

  if (!completed) {
    const hintWidth = 70;
    const hintX = promptX + promptWidth - hintWidth - 10;
    const hintY = promptY + (panelHeight - 26) / 2;

    roundRect(ctx, hintX, hintY, hintWidth, 26, 13, 'rgba(255, 200, 97, 0.24)');
    ctx.fillStyle = '#8a691f';
    setFont(ctx, layout, '900 12px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('看提示', hintX + hintWidth / 2, hintY + 13.5);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTechniqueFocusHalo(ctx, layout, technique) {
  const target = technique && technique.lesson && technique.lesson.target;

  if (!target) {
    return;
  }

  const cellSize = layout.board.size / 9;
  const x = layout.board.x + target.col * cellSize;
  const y = layout.board.y + target.row * cellSize;

  roundRect(ctx, x - 3, y - 3, cellSize + 6, cellSize + 6, 10, 'rgba(255, 200, 97, 0.2)');
}

function getPracticeRailColor(index) {
  return ['#16a3a0', '#6ea64e', '#d79b27', '#18211f'][index % 4];
}

function drawPracticeStatusPill(ctx, layout, card, text, fill, color) {
  const label = text;
  const width = Math.max(58, measureTextWidth(ctx, label) * 0.72 + 20);
  const x = card.x + card.width - width - 42;
  const y = card.y + 16;

  roundRect(ctx, x, y, width, 24, 12, fill);
  ctx.fillStyle = color;
  setFont(ctx, layout, '900 11px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + 12.5);
}

function drawCompanionAtmosphere(ctx, layout) {
  const atmosphere = layout.companionFeedback && layout.companionFeedback.atmosphere;

  if (!atmosphere || !atmosphere.tint || atmosphere.level === 'calm') {
    return;
  }

  ctx.save();
  try {
    ctx.fillStyle = atmosphere.tint;
    ctx.fillRect(0, 0, layout.width, layout.height);

    if (atmosphere.level === 'glow' || atmosphere.level === 'amber') {
      const { board } = layout;
      ctx.strokeStyle = atmosphere.tint;
      ctx.lineWidth = atmosphere.level === 'amber' ? 8 : 5;
      roundedPath(ctx, board.x - 6, board.y - 6, board.size + 12, board.size + 12, 18);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

function drawCompanionToast(ctx, layout) {
  const toast = layout.companionFeedback && layout.companionFeedback.toast;

  if (!toast || !toast.text) {
    return;
  }

  const width = Math.min(layout.width - layout.margin * 2, 310);
  const x = (layout.width - width) / 2;
  const y = Math.max(layout.ruleStrip.y, layout.board.y - 32);

  roundRect(ctx, x, y, width, 26, 13, 'rgba(11, 36, 29, 0.78)');
  ctx.fillStyle = 'rgba(246, 255, 244, 0.92)';
  setFont(ctx, layout, '850 12px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(toast.text, layout.width / 2, y + 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawBackground(ctx, layout) {
  const { width, height, colors } = layout;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#d9e1de');
  gradient.addColorStop(0.48, '#f4f6f3');
  gradient.addColorStop(1, '#dce5e1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  roundRect(ctx, layout.margin / 2, 8, width - layout.margin, height - 16, 34, colors.surface);
}

function drawTopBar(ctx, layout) {
  const { colors, topBar } = layout;
  const buttonSize = 44;
  const label = layout.modeContext.label || layout.level.label;
  const title = layout.modeContext.title || layout.level.title;

  drawButton(ctx, layout, topBar.x, topBar.y, buttonSize, buttonSize, '‹', colors.surfaceStrong, colors.ink);

  ctx.fillStyle = colors.muted;
  setFont(ctx, layout, '700 10px sans-serif');
  ctx.fillText(label, topBar.x + 58, topBar.y + 14);
  ctx.fillStyle = colors.ink;
  setFont(ctx, layout, '800 17px sans-serif');
  ctx.fillText(title, topBar.x + 58, topBar.y + 36);

  if (layout.modeContext.mode === 'practice' && layout.modeSwitchButton) {
    drawModeSwitchButton(ctx, layout);
  }
}

function drawModeSwitchButton(ctx, layout) {
  const button = layout.modeSwitchButton;

  roundRect(ctx, button.x, button.y, button.width, button.height, 12, 'rgba(255, 255, 255, 0.72)');
  ctx.fillStyle = '#087471';
  setFont(ctx, layout, '850 12px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('换难度', button.x + button.width / 2, button.y + button.height / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawRuleStrip(ctx, layout) {
  const { colors, ruleStrip } = layout;
  const rules = layout.level.rules.filter((rule) => rule !== 'classic');
  rules.forEach((rule, index) => {
    const label = getRuleLabel(rule);
    chip(
      ctx,
      ruleStrip.x + index * 76,
      ruleStrip.y,
      label.length > 4 ? 74 : 66,
      24,
      label,
      'rgba(24, 33, 31, 0.08)',
      colors.muted,
      layout,
    );
  });
}

function getRuleLabel(rule) {
  if (rule === 'classic') {
    return '基础数独';
  }

  return String(rule || '').toUpperCase();
}

function drawBoard(ctx, state, layout) {
  const { board, colors } = layout;
  const cellSize = board.size / 9;

  roundRect(ctx, board.x, board.y, board.size, board.size, 18, colors.surfaceStrong);
  ctx.save();
  roundedClip(ctx, board.x, board.y, board.size, board.size, 18);

  state.cells.flat().forEach((cell) => {
    const flags = getCellFlags(state, cell.row, cell.col);
    const x = board.x + cell.col * cellSize;
    const y = board.y + cell.row * cellSize;

    if (cell.fixed) {
      ctx.fillStyle = '#eef1ea';
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }

    if (flags.peer) {
      ctx.fillStyle = 'rgba(22, 163, 160, 0.08)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    if (flags.conflict) {
      ctx.fillStyle = 'rgba(215, 155, 39, 0.16)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    if (flags.selected) {
      ctx.fillStyle = 'rgba(22, 163, 160, 0.24)';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = colors.teal;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    }

    drawCellValue(ctx, layout, cell, flags, x, y, cellSize, colors);
  });

  drawGrid(ctx, board, cellSize, colors);
  ctx.restore();
}

function drawCellValue(ctx, layout, cell, flags, x, y, cellSize, colors) {
  if (cell.value !== 0) {
    ctx.fillStyle = cell.fixed ? colors.ink : '#087471';
    setFont(ctx, layout, '900 31px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(cell.value), x + cellSize / 2, y + cellSize / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return;
  }

  if (cell.notes.length === 0) {
    return;
  }

  ctx.fillStyle = 'rgba(24, 33, 31, 0.48)';
  setFont(ctx, layout, '800 9px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let digit = 1; digit <= 9; digit += 1) {
    if (!cell.notes.includes(digit)) {
      continue;
    }
    const noteCol = (digit - 1) % 3;
    const noteRow = Math.floor((digit - 1) / 3);
    ctx.fillText(
      String(digit),
      x + cellSize * (0.25 + noteCol * 0.25),
      y + cellSize * (0.25 + noteRow * 0.25),
    );
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawGrid(ctx, board, cellSize, colors) {
  for (let index = 0; index <= 9; index += 1) {
    const heavy = index % 3 === 0;
    ctx.strokeStyle = heavy ? colors.grid : colors.hairline;
    ctx.lineWidth = heavy ? 2 : 1;

    ctx.beginPath();
    ctx.moveTo(board.x + index * cellSize, board.y);
    ctx.lineTo(board.x + index * cellSize, board.y + board.size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(board.x, board.y + index * cellSize);
    ctx.lineTo(board.x + board.size, board.y + index * cellSize);
    ctx.stroke();
  }
}

function drawVictoryOverlay(ctx, state, layout) {
  const { width, height, colors } = layout;
  const feedback = normalizeCompletionFeedback(layout.completionFeedback, state);

  ctx.save();
  try {
    ctx.fillStyle = 'rgba(4, 21, 17, 0.58)';
    ctx.fillRect(0, 0, width, height);

    const { panel } = layout.victory;
    const x = panel.x;
    const y = panel.y;
    const panelGradient = ctx.createLinearGradient(x, y, x + panel.width, y + panel.height);
    panelGradient.addColorStop(0, '#0b241d');
    panelGradient.addColorStop(0.58, '#123429');
    panelGradient.addColorStop(1, '#071712');

    roundRect(ctx, panel.x, panel.y, panel.width, panel.height, 22, panelGradient);

    ctx.strokeStyle = 'rgba(255, 200, 97, 0.42)';
    ctx.lineWidth = 2;
    roundedPath(ctx, panel.x + 1, panel.y + 1, panel.width - 2, panel.height - 2, 21);
    ctx.stroke();

    if (layout.modeContext.mode !== 'practice') {
      drawCampaignVictoryContent(ctx, layout, feedback);
    } else {
      drawPracticeVictoryContent(ctx, layout, feedback, colors);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  } finally {
    ctx.restore();
  }
}

function drawCampaignVictoryContent(ctx, layout, feedback) {
  const { panel, campaignNext } = layout.victory;
  const x = panel.x;
  const y = panel.y;

  roundRect(ctx, x + 22, y + 20, 104, 24, 8, 'rgba(255, 200, 97, 0.15)');
  ctx.fillStyle = '#ffc861';
  setFont(ctx, layout, '900 11px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(feedback.label === 'LAB RESULT' ? 'LAB CLEAR' : feedback.label, x + 74, y + 32);

  ctx.fillStyle = '#f6fff4';
  setFont(ctx, layout, '950 26px sans-serif');
  ctx.fillText(feedback.title, x + panel.width / 2, y + 74);

  drawCampaignUnlockBadge(ctx, x + panel.width / 2, y + 126);

  ctx.fillStyle = '#ffc861';
  setFont(ctx, layout, '900 17px sans-serif');
  ctx.fillText(feedback.unlockText, x + panel.width / 2, y + 190);

  ctx.fillStyle = 'rgba(246, 255, 244, 0.68)';
  setFont(ctx, layout, '850 12px sans-serif');
  ctx.fillText(feedback.progressText, x + panel.width / 2, y + 208);

  drawVictoryStats(ctx, layout, x + 22, y + 220, panel.width - 44, feedback.stats, layout.colors);

  ctx.fillStyle = 'rgba(246, 255, 244, 0.9)';
  setFont(ctx, layout, '850 13px sans-serif');
  ctx.fillText(feedback.subtitle, x + panel.width / 2, y + 267);

  drawVictoryButton(
    ctx,
    layout,
    campaignNext.x,
    campaignNext.y,
    campaignNext.width,
    layout.victoryActions.next,
    '#ffc861',
    '#0b241d',
  );
}

function drawCampaignUnlockBadge(ctx, centerX, centerY) {
  const size = 74;
  const x = centerX - size / 2;
  const y = centerY - size / 2;
  const cell = size / 3;

  roundRect(ctx, x, y, size, size, 18, 'rgba(255, 200, 97, 0.13)');
  ctx.strokeStyle = 'rgba(255, 200, 97, 0.48)';
  ctx.lineWidth = 1.5;
  roundedPath(ctx, x + 0.75, y + 0.75, size - 1.5, size - 1.5, 17);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 200, 97, 0.22)';
  ctx.lineWidth = 1;
  for (let index = 1; index < 3; index += 1) {
    ctx.beginPath();
    ctx.moveTo(x + cell * index, y + 10);
    ctx.lineTo(x + cell * index, y + size - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, y + cell * index);
    ctx.lineTo(x + size - 10, y + cell * index);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ffc861';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 19, centerY + 1);
  ctx.lineTo(centerX - 5, centerY + 16);
  ctx.lineTo(centerX + 22, centerY - 18);
  ctx.stroke();
}

function drawPracticeVictoryContent(ctx, layout, feedback, colors) {
  const { panel, restart, next } = layout.victory;
  const x = panel.x;
  const y = panel.y;

  roundRect(ctx, x + 22, y + 20, 104, 24, 8, 'rgba(255, 200, 97, 0.15)');
  ctx.fillStyle = '#ffc861';
  setFont(ctx, layout, '900 11px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(feedback.label, x + 74, y + 32);

  ctx.fillStyle = '#f6fff4';
  setFont(ctx, layout, '900 24px sans-serif');
  ctx.fillText(feedback.title, x + panel.width / 2, y + 72);

  ctx.fillStyle = '#ffc861';
  setFont(ctx, layout, '950 42px sans-serif');
  ctx.fillText(feedback.deltaText, x + panel.width / 2, y + 118);

  ctx.fillStyle = 'rgba(246, 255, 244, 0.72)';
  setFont(ctx, layout, '850 12px sans-serif');
  ctx.fillText(feedback.metricLabel, x + panel.width / 2, y + 146);

  drawVictoryStats(ctx, layout, x + 22, y + 164, panel.width - 44, feedback.stats, colors);

  ctx.fillStyle = 'rgba(246, 255, 244, 0.9)';
  setFont(ctx, layout, '850 13px sans-serif');
  wrapText(ctx, feedback.subtitle, x + 28, y + 230, panel.width - 56, 18);

  ctx.fillStyle = 'rgba(246, 255, 244, 0.58)';
  setFont(ctx, layout, '800 11px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(feedback.disclaimer, x + panel.width / 2, y + 278);

  drawVictoryButton(
    ctx,
    layout,
    restart.x,
    restart.y,
    restart.width,
    layout.victoryActions.restart,
    'rgba(246, 255, 244, 0.9)',
    '#0b241d',
  );
  drawVictoryButton(ctx, layout, next.x, next.y, next.width, layout.victoryActions.next, '#ffc861', '#0b241d');
}

function createDefaultCompletionFeedback(state) {
  return {
    ...DEFAULT_COMPLETION_FEEDBACK,
    stats: DEFAULT_COMPLETION_FEEDBACK.stats.map((stat) => ({ ...stat })),
  };
}

function normalizeCompletionFeedback(feedback, state) {
  const defaults = createDefaultCompletionFeedback(state);
  const source = feedback && typeof feedback === 'object' ? feedback : {};
  const sourceStats = Array.isArray(source.stats) ? source.stats : [];

  return {
    ...defaults,
    ...source,
    label: toDisplayText(source.label, defaults.label),
    title: toDisplayText(source.title, defaults.title),
    unlockText: toDisplayText(source.unlockText, '下一关已解锁'),
    progressText: toDisplayText(source.progressText, ''),
    deltaText: toDisplayText(source.deltaText, defaults.deltaText),
    metricLabel: toDisplayText(source.metricLabel, defaults.metricLabel),
    subtitle: toDisplayText(source.subtitle, defaults.subtitle),
    disclaimer: toDisplayText(source.disclaimer, defaults.disclaimer),
    stats: normalizeCompletionStats(sourceStats, defaults.stats),
  };
}

function normalizeCompletionStats(sourceStats, defaultStats) {
  if (!sourceStats.length) {
    return defaultStats.map((stat) => ({ ...stat }));
  }

  return sourceStats
    .slice(0, 3)
    .map((stat, index) => normalizeCompletionStat(stat, defaultStats[index] || defaultStats[defaultStats.length - 1]));
}

function normalizeCompletionStat(stat, defaultStat) {
  const source = stat && typeof stat === 'object' ? stat : {};
  return {
    label: toDisplayText(source.label, defaultStat.label),
    value: toDisplayText(source.value, defaultStat.value),
  };
}

function toDisplayText(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
}

function normalizeModeContext(modeContext) {
  const source = modeContext && typeof modeContext === 'object' ? modeContext : {};

  return {
    mode: source.mode === 'practice' ? 'practice' : 'campaign',
    label: toDisplayText(source.label, ''),
    title: toDisplayText(source.title, ''),
  };
}

function normalizeVictoryActions(victoryActions) {
  const source = victoryActions && typeof victoryActions === 'object' ? victoryActions : {};

  return {
    restart: toDisplayText(source.restart, '再试一次'),
    next: toDisplayText(source.next, '下一关'),
    home: toDisplayText(source.home, '回首页'),
  };
}

function drawVictoryStats(ctx, layout, x, y, width, stats, colors) {
  const safeStats = Array.isArray(stats) && stats.length ? stats.slice(0, 3) : createDefaultCompletionFeedback({}).stats;
  const gap = safeStats.length >= 3 ? 8 : 10;
  const statWidth = (width - gap * (safeStats.length - 1)) / safeStats.length;

  safeStats.forEach((stat, index) => {
    drawVictoryStat(ctx, layout, x + index * (statWidth + gap), y, statWidth, stat, colors);
  });
}

function drawVictoryStat(ctx, layout, x, y, width, stat, colors) {
  roundRect(ctx, x, y, width, 48, 12, 'rgba(246, 255, 244, 0.12)');
  ctx.fillStyle = 'rgba(246, 255, 244, 0.62)';
  setFont(ctx, layout, width < 86 ? '800 9px sans-serif' : '800 10px sans-serif');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(stat.label, x + 10, y + 18);
  ctx.fillStyle = '#ffc861';
  setFont(ctx, layout, width < 86 ? '900 15px sans-serif' : '950 18px sans-serif');
  ctx.fillText(stat.value, x + 10, y + 38);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = String(text).split('');
  let line = '';
  let lineY = y;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  chars.forEach((char) => {
    const testLine = line + char;
    if (line && measureTextWidth(ctx, testLine) > maxWidth) {
      ctx.fillText(line, x, lineY);
      line = char;
      lineY += lineHeight;
      return;
    }
    line = testLine;
  });

  if (line) {
    ctx.fillText(line, x, lineY);
  }
}

function measureTextWidth(ctx, text) {
  if (typeof ctx.measureText !== 'function') {
    return String(text).length * 10;
  }

  const measurement = ctx.measureText(text);
  const width = measurement && Number.isFinite(measurement.width) ? measurement.width : String(text).length * 10;
  const scale = FONT_SCALE_BY_CONTEXT.get(ctx) || 1;

  return width / scale;
}

function setFont(ctx, layout, font) {
  const scale = getTextScale(layout);
  FONT_SCALE_BY_CONTEXT.set(ctx, scale);
  ctx.font = scaleFont(sanitizeFontWeight(font), scale);
}

function getTextScale(layout) {
  const scale = Number(layout && layout.canvasTextScale);

  if (!Number.isFinite(scale) || scale <= 1) {
    return 1;
  }

  return scale;
}

function scaleFont(font, scale) {
  if (scale === 1) {
    return font;
  }

  return String(font).replace(/(\d+(?:\.\d+)?)px/g, (_, value) => `${formatFontSize(Number(value) * scale)}px`);
}

function formatFontSize(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function sanitizeFontWeight(font) {
  return String(font).replace(/\b(\d{3,4})(?=\s+\d+(?:\.\d+)?px)/g, (_, weight) => {
    const numericWeight = Number(weight);

    if (!Number.isFinite(numericWeight)) {
      return weight;
    }

    return String(Math.min(900, Math.max(100, numericWeight)));
  });
}

function drawVictoryButton(ctx, layout, x, y, width, label, fill, color) {
  roundRect(ctx, x, y, width, 38, 12, fill);
  ctx.fillStyle = color;
  setFont(ctx, layout, '900 14px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + 19);
}

function drawTools(ctx, layout) {
  const tools = [
    [layout.stateNoteMode ? '◆' : '◇', '草稿模式', 'note'],
    ['↻', '重开', 'restart'],
    ['⌫', '清除', 'erase'],
  ];

  layout.tools.forEach((rect, index) => {
    const [, , action] = tools[index];
    const active = action === 'note' && layout.stateNoteMode;
    const disabled = false;
    const fill = active ? layout.colors.tealSoft : 'rgba(255, 255, 255, 0.62)';
    const ink = disabled ? 'rgba(113, 129, 125, 0.38)' : active ? '#087471' : layout.colors.ink;

    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10, fill);
    ctx.fillStyle = ink;
    setFont(ctx, layout, '900 26px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tools[index][0], rect.x + rect.width / 2, rect.y + rect.height * 0.38);
    ctx.fillStyle = disabled ? 'rgba(113, 129, 125, 0.38)' : active ? '#087471' : layout.colors.muted;
    setFont(ctx, layout, '850 12px sans-serif');
    ctx.fillText(tools[index][1], rect.x + rect.width / 2, rect.y + rect.height * 0.74);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });
}

function drawKeypad(ctx, layout) {
  layout.keypad.keys.forEach((rect) => {
    const color = layout.stateNoteMode
      ? rect.digit % 3 === 0
        ? '#8a691f'
        : '#23726e'
      : rect.digit % 3 === 1
        ? layout.colors.keyGreen
        : rect.digit % 3 === 2
          ? layout.colors.keyDark
          : layout.colors.keyAmber;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12, color);
    ctx.fillStyle = layout.colors.white;
    setFont(ctx, layout, '900 24px sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(rect.digit), rect.x + rect.width / 2, rect.y + rect.height / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });
}

function drawButton(ctx, layout, x, y, width, height, label, fill, color) {
  roundRect(ctx, x, y, width, height, 14, fill);
  ctx.fillStyle = color;
  setFont(ctx, layout, '800 22px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function chip(ctx, x, y, width, height, text, fill, color, layout) {
  roundRect(ctx, x, y, width, height, 8, fill);
  ctx.fillStyle = color;
  setFont(ctx, layout, '900 10px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function roundRect(ctx, x, y, width, height, radius, fill) {
  roundedPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundedClip(ctx, x, y, width, height, radius) {
  roundedPath(ctx, x, y, width, height, radius);
  ctx.clip();
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = {
  renderGame,
  renderMenu,
  renderPracticeMenu,
  renderTechniqueLesson,
  renderTechniqueMenu,
};
