const COLORS = {
  surface: '#edf1ef',
  surfaceStrong: '#f8fbf8',
  ink: '#18211f',
  muted: '#71817d',
  grid: '#263330',
  hairline: '#c5cfcb',
  teal: '#16a3a0',
  tealSoft: 'rgba(22, 163, 160, 0.16)',
  amber: '#d79b27',
  amberSoft: 'rgba(215, 155, 39, 0.18)',
  lime: '#88bd3f',
  limeSoft: 'rgba(136, 189, 63, 0.22)',
  conflict: '#d85d57',
  conflictSoft: 'rgba(216, 93, 87, 0.18)',
  keyGreen: '#133532',
  keyDark: '#1b2927',
  keyAmber: '#4a3715',
  white: '#f7fbf8',
};

function createLayout(width, height, options = {}) {
  const { topInset = 0 } = options;
  const margin = 18;
  const compact = height < 760;
  const topY = Math.max(compact ? 12 : 20, normalizeTopInset(topInset, height));
  const topBar = { x: margin, y: topY, width: width - margin * 2, height: compact ? 42 : 46 };
  const ruleStripY = topBar.y + topBar.height + 8;
  const ruleStrip = { x: margin, y: ruleStripY, width: topBar.width, height: compact ? 24 : 28 };
  const toolsHeight = compact ? 48 : 58;
  const keypadHeight = compact ? 132 : Math.min(174, Math.max(144, height * 0.19));
  const boardGap = compact ? 8 : 12;
  const bottomGap = compact ? 8 : 12;
  const bottomStackHeight = bottomGap + toolsHeight + 10 + keypadHeight + margin;
  const boardSize = Math.min(width - margin * 2, height - (ruleStrip.y + ruleStrip.height + boardGap) - bottomStackHeight);
  const board = {
    x: margin,
    y: ruleStrip.y + ruleStrip.height + boardGap,
    size: boardSize,
  };
  const toolsY = board.y + board.size + bottomGap;
  const tools = buildRowRects(margin, toolsY, width - margin * 2, toolsHeight, 3, 10).map((rect, index) => ({
    ...rect,
    action: ['note', 'restart', 'erase'][index],
  }));
  const keypadY = toolsY + toolsHeight + 10;
  const keypad = {
    x: margin,
    y: keypadY,
    width: width - margin * 2,
    keys: buildGridRects(margin, keypadY, width - margin * 2, keypadHeight, 3, 3, 10),
  };
  const victory = createVictoryLayout(width, height);

  return {
    width,
    height,
    margin,
    colors: COLORS,
    topBar,
    backButton: {
      x: topBar.x,
      y: topBar.y,
      width: 44,
      height: 44,
    },
    modeSwitchButton: {
      x: topBar.x + topBar.width - 76,
      y: topBar.y + 7,
      width: 76,
      height: 32,
      action: 'practiceDifficulty',
    },
    ruleStrip,
    board,
    tools,
    keypad,
    victory,
    debugCompleteButton: null,
  };
}

function normalizeTopInset(topInset, height) {
  if (!Number.isFinite(topInset) || topInset < 0) {
    return 0;
  }

  return Math.min(topInset, Math.max(0, height * 0.22));
}

function createVictoryLayout(width, height) {
  const panelWidth = Math.min(width - 48, 330);
  const panelHeight = 348;
  const x = (width - panelWidth) / 2;
  const y = Math.max(72, (height - panelHeight) / 2);
  const buttonHeight = 38;
  const panelBottomPadding = 16;
  const buttonY = y + panelHeight - panelBottomPadding - buttonHeight;
  const buttons = buildRowRects(x + 22, buttonY, panelWidth - 44, buttonHeight, 3, 8);

  return {
    panel: { x, y, width: panelWidth, height: panelHeight },
    restart: {
      ...buttons[0],
      action: 'restart',
    },
    next: {
      ...buttons[1],
      action: 'next',
    },
    home: {
      ...buttons[2],
      action: 'home',
    },
  };
}

function buildRowRects(x, y, width, height, count, gap) {
  const itemWidth = (width - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({
    x: x + index * (itemWidth + gap),
    y,
    width: itemWidth,
    height,
  }));
}

function buildGridRects(x, y, width, height, cols, rows, gap) {
  const itemWidth = (width - gap * (cols - 1)) / cols;
  const itemHeight = (height - gap * (rows - 1)) / rows;
  const rects = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      rects.push({
        x: x + col * (itemWidth + gap),
        y: y + row * (itemHeight + gap),
        width: itemWidth,
        height: itemHeight,
        digit: index + 1,
      });
    }
  }

  return rects;
}

function hitTest(layout, x, y, completed = false) {
  if (isInside(layout.backButton, x, y)) {
    return {
      type: 'nav',
      action: 'back',
    };
  }

  if (completed) {
    const victoryAction = hitTestVictory(layout, x, y);
    if (victoryAction) {
      return victoryAction;
    }
    return null;
  }

  if (layout.modeSwitchButton && isInside(layout.modeSwitchButton, x, y)) {
    return {
      type: 'nav',
      action: layout.modeSwitchButton.action,
    };
  }

  const { board } = layout;
  const cellSize = board.size / 9;

  if (x >= board.x && x <= board.x + board.size && y >= board.y && y <= board.y + board.size) {
    return {
      type: 'cell',
      row: Math.min(8, Math.floor((y - board.y) / cellSize)),
      col: Math.min(8, Math.floor((x - board.x) / cellSize)),
    };
  }

  const key = layout.keypad.keys.find((rect) => isInside(rect, x, y));
  if (key) {
    return {
      type: 'digit',
      digit: key.digit,
    };
  }

  const tool = layout.tools.find((rect) => isInside(rect, x, y));
  if (tool) {
    return {
      type: 'tool',
      action: tool.action,
    };
  }

  return null;
}

function hitTestVictory(layout, x, y) {
  const buttons = [layout.victory.restart, layout.victory.next, layout.victory.home].filter(Boolean);
  const button = buttons.find((rect) => isInside(rect, x, y));

  return button
    ? {
        type: 'victory',
        action: button.action,
      }
    : null;
}

function isInside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

module.exports = {
  COLORS,
  createLayout,
  hitTest,
};
