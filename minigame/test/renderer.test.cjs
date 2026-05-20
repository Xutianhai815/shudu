const assert = require('node:assert/strict');
const test = require('node:test');

const { createLayout } = require('../src/layout');
const { levels } = require('../src/levels');
const { createMenuLayout } = require('../src/menu');
const { createPracticeMenuLayout } = require('../src/practice-menu');
const { createTechniqueMenuLayout } = require('../src/technique-menu');
const {
  createTechniqueState,
  getTechniqueById,
  getTechniqueGroups,
  getTechniques,
} = require('../src/technique-training');
const { applyDigit, createPuzzleState, selectCell } = require('../src/puzzle');
const {
  renderGame,
  renderMenu,
  renderPracticeMenu,
  renderTechniqueLesson,
  renderTechniqueMenu,
} = require('../src/renderer');
const { createCompletionFeedback } = require('../src/derust');

test('renderer draws the first level without a browser or WeChat canvas', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    modeContext: {
      mode: 'campaign',
      label: `第 1/${levels.length} 关`,
    },
  });

  const text = getDrawnText(ctx);
  assert.ok(ctx.calls.length > 0);
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes(levels[0].title)));
  assert.match(text, /第 1\/24 关/);
  assert.equal(text.includes(levels[0].label), false);
  assert.equal(text.includes('基础数独'), false);
});

test('renderer draws second level metadata and victory overlay without throwing', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[1]),
    completed: true,
    cells: createPuzzleState(levels[1]).cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: levels[1].solution[rowIndex][colIndex],
        notes: [],
      })),
    ),
  };
  const layout = createLayout(390, 844);

  renderGame(ctx, state, layout);

  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes(levels[1].title)));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('下一关')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('LAB CLEAR')));
  assert.equal(getDrawnText(ctx).includes('回首页'), false);
});

test('renderer uses free training mode context in the top bar', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    modeContext: {
      mode: 'practice',
      label: '自由练习',
      title: '自由练习 · 热身',
    },
  });

  const text = getDrawnText(ctx);
  assert.match(text, /自由练习/);
  assert.match(text, /自由练习 · 热身/);
  assert.match(text, /换难度/);
  assert.equal(text.includes(levels[0].label), false);
  assert.equal(text.includes(levels[0].title), false);
});

test('renderer hides the difficulty switch outside free practice mode', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout);

  assert.equal(getDrawnText(ctx).includes('换难度'), false);
});

test('renderer uses practice victory action copy when provided', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    modeContext: {
      mode: 'practice',
      label: '自由练习',
      title: '自由练习 · 热身',
    },
    victoryActions: {
      restart: '换难度',
      next: '下一局',
    },
  });

  const text = getDrawnText(ctx);
  assert.match(text, /下一局/);
  assert.match(text, /换难度/);
  assert.equal(text.includes('回首页'), false);
  assert.equal(text.includes('再试一次'), false);
  assert.equal(text.includes('下一关'), false);
});

test('renderer draws simplified campaign victory without dense report copy', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 1,
  };
  const layout = createLayout(430, 932);
  const completionFeedback = {
    ...createCompletionFeedback(state, []),
    variant: 'campaign',
    label: 'LAB CLEAR',
    title: '第 1 关完成',
    unlockText: '下一关已解锁',
    progressText: '1 / 12',
    subtitle: '大脑已热身，继续挑战下一关。',
  };

  renderGame(ctx, state, layout, { completionFeedback });

  const text = ctx.calls
    .filter((call) => call.name === 'fillText')
    .map((call) => String(call.args[0]))
    .join(' ');

  assert.match(text, /LAB CLEAR/);
  assert.match(text, /第 1 关完成/);
  assert.match(text, /下一关已解锁/);
  assert.match(text, /1 \/ 12/);
  assert.match(text, /下一关/);
  assert.equal(text.includes('+0.01%'), false);
  assert.equal(text.includes('娱乐数值，不代表医学效果。'), false);
  assert.equal(text.includes('再试一次'), false);
  assert.equal(text.includes('回首页'), false);
  assert.equal(/老年痴呆|阿尔茨海默|预防|降低.*风险|医学证明|患病概率/.test(text), false);
});

test('renderer draws completion feedback growth stat cards', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[4]),
    completed: true,
  };
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    completionFeedback: {
      variant: 'campaign',
      label: 'LAB CLEAR',
      title: '第 5 关完成',
      unlockText: '下一关已解锁',
      progressText: '5 / 24',
      subtitle: '大脑已热身，继续挑战下一关。',
      stats: [
        { label: '闯关进度', value: '5/24' },
        { label: '连续除锈', value: '3 天' },
      ],
    },
  });

  const text = getDrawnText(ctx);
  assert.match(text, /闯关进度/);
  assert.match(text, /5\/24/);
  assert.match(text, /连续除锈/);
  assert.match(text, /3 天/);
});

test('renderer safely merges incomplete completion feedback', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 3,
  };
  const layout = createLayout(430, 932);

  assert.doesNotThrow(() => {
    renderGame(ctx, state, layout, {
      completionFeedback: {
        stats: [{ value: '+2' }],
      },
    });
  });

  const text = getDrawnText(ctx);
  assert.match(text, /LAB CLEAR/);
  assert.match(text, /下一关已解锁/);
  assert.equal(/错误数|mistakes/i.test(text), false);
  assert.match(text, /下一关/);
  assert.equal(text.includes('再试一次'), false);
  assert.equal(text.includes('回首页'), false);
  assert.equal(text.includes('undefined'), false);
});

test('renderer uses provided non-empty completion stats without adding fallback cards', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 2,
  };
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    modeContext: {
      mode: 'practice',
      label: '自由练习',
      title: '自由练习 · 热身',
    },
    completionFeedback: {
      stats: [{ label: '自定义', value: 'OK' }],
    },
  });

  const text = getDrawnText(ctx);
  assert.match(text, /自定义/);
  assert.match(text, /OK/);
  assert.equal(text.includes('大脑状态'), false);
  assert.equal(text.includes('已激活'), false);
  assert.equal(/错误数|mistakes/i.test(text), false);
});

test('renderer draws completed overlay without measureText support', () => {
  const ctx = createMockCanvasContext({ measureText: false });
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };
  const layout = createLayout(430, 932);

  assert.doesNotThrow(() => renderGame(ctx, state, layout));
  assert.match(getDrawnText(ctx), /大脑除锈完成/);
});

test('renderer hides debug placeholders and inactive top controls', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932, { debugToolsEnabled: true });

  renderGame(ctx, state, layout);

  const text = getDrawnText(ctx);
  assert.equal(/DEV 完成|08:42|Ⅱ/.test(text), false);
});

test('renderer keeps debug completion hidden when disabled or completed', () => {
  const defaultCtx = createMockCanvasContext();
  const defaultState = createPuzzleState(levels[0]);
  const defaultLayout = createLayout(430, 932);

  renderGame(defaultCtx, defaultState, defaultLayout);

  assert.equal(getDrawnText(defaultCtx).includes('DEV 完成'), false);

  const completedCtx = createMockCanvasContext();
  const completedState = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };
  const debugLayout = createLayout(430, 932, { debugToolsEnabled: true });

  renderGame(completedCtx, completedState, debugLayout);

  assert.equal(getDrawnText(completedCtx).includes('DEV 完成'), false);
});

test('renderer keeps debug placeholders hidden on narrow viewports', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(320, 568, { debugToolsEnabled: true });

  assert.doesNotThrow(() => renderGame(ctx, state, layout));
  assert.equal(/DEV 完成|08:42|Ⅱ/.test(getDrawnText(ctx)), false);
});

test('renderer uses amber highlight in the victory overlay', () => {
  const ctx = createMockCanvasContext();
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout);

  assert.ok(ctx.calls.some((call) => call.name === 'set:fillStyle' && call.args.includes('#ffc861')));
});

test('renderer draws player-entered digits with the same visual weight as fixed digits', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  state.cells[0][3] = {
    ...state.cells[0][3],
    value: 6,
  };

  renderGame(ctx, state, layout);

  const digitFontCalls = ctx.calls
    .filter((call) => call.name === 'set:font' && String(call.args[0]).includes('31px sans-serif'))
    .map((call) => call.args[0]);

  assert.ok(digitFontCalls.length >= 2);
  assert.equal(digitFontCalls.includes('850 31px sans-serif'), false);
  assert.ok(digitFontCalls.every((font) => font === '900 31px sans-serif'));
});

test('renderer visually distinguishes fixed clues from player-entered digits', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  state.cells[0][3] = {
    ...state.cells[0][3],
    value: 6,
  };

  renderGame(ctx, state, layout);

  assert.ok(ctx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#eef1ea'));
  assert.ok(ctx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#18211f'));
  assert.ok(ctx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#087471'));
});

test('renderer gives tool icons and labels enough visual weight', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout);

  assert.ok(ctx.calls.some((call) => call.name === 'set:font' && call.args[0] === '900 26px sans-serif'));
  assert.ok(ctx.calls.some((call) => call.name === 'set:font' && call.args[0] === '850 12px sans-serif'));
});

test('renderer hides process status labels and uses Chinese tool labels', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout);

  const text = getDrawnText(ctx);
  assert.equal(/FOCUS|MODE|ERR|Notes|Undo|Hint|Erase|hints|撤销/i.test(text), false);
  assert.match(text, /草稿模式/);
  assert.match(text, /重开/);
  assert.match(text, /清除/);
});

test('renderer does not use color to reveal whether player-entered digits are correct', () => {
  const correctCtx = createMockCanvasContext();
  const wrongCtx = createMockCanvasContext();
  const correctState = createPuzzleState(levels[0]);
  const wrongState = createPuzzleState(levels[0]);
  const layout = createLayout(430, 932);

  correctState.cells[0][3] = {
    ...correctState.cells[0][3],
    value: 6,
  };
  wrongState.cells[0][3] = {
    ...wrongState.cells[0][3],
    value: 1,
  };

  renderGame(correctCtx, correctState, layout);
  renderGame(wrongCtx, wrongState, layout);

  assert.ok(correctCtx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#087471'));
  assert.ok(wrongCtx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#087471'));
  assert.equal(wrongCtx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#d85d57'), false);
});

test('renderer gives duplicate digits a full-cell amber wash without a heavy border', () => {
  const ctx = createMockCanvasContext();
  const state = applyDigit(selectCell(createPuzzleState(levels[0]), 0, 3), 4);
  const layout = createLayout(430, 932);
  const cellSize = layout.board.size / 9;

  renderGame(ctx, state, layout);

  assert.ok(ctx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === 'rgba(215, 155, 39, 0.16)'));
  assert.ok(
    ctx.calls.some(
      (call) =>
        call.name === 'fillRect' &&
        call.args[0] === layout.board.x + 3 * cellSize &&
        call.args[1] === layout.board.y &&
        call.args[2] === cellSize &&
        call.args[3] === cellSize,
    ),
  );
  assert.equal(ctx.calls.some((call) => call.name === 'set:strokeStyle' && call.args[0] === '#d79b27'), false);
  assert.equal(ctx.calls.some((call) => call.name === 'set:fillStyle' && call.args[0] === '#d85d57'), false);
  assert.equal(ctx.calls.some((call) => call.name === 'set:strokeStyle' && call.args[0] === '#d85d57'), false);
});

test('renderer draws quiet companion toast outside the board', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[6]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    companionFeedback: {
      toast: {
        text: '线索开始连起来了',
      },
      atmosphere: {
        level: 'teal',
        tint: 'rgba(22, 163, 160, 0.08)',
      },
    },
  });

  assert.match(getDrawnText(ctx), /线索开始连起来了/);

  const toastTextCall = ctx.calls.find(
    (call) => call.name === 'fillText' && call.args[0] === '线索开始连起来了',
  );

  assert.ok(toastTextCall.args[2] < layout.board.y || toastTextCall.args[2] > layout.board.y + layout.board.size);
});

test('renderer atmosphere uses calm companion colors without error red', () => {
  const ctx = createMockCanvasContext();
  const state = createPuzzleState(levels[9]);
  const layout = createLayout(430, 932);

  renderGame(ctx, state, layout, {
    companionFeedback: {
      toast: null,
      atmosphere: {
        level: 'amber',
        tint: 'rgba(255, 200, 97, 0.14)',
      },
    },
  });

  const styles = ctx.calls
    .filter((call) => call.name === 'set:fillStyle' || call.name === 'set:strokeStyle')
    .map((call) => String(call.args[0]))
    .join(' ');

  assert.match(styles, /255, 200, 97/);
  assert.equal(styles.includes('#d85d57'), false);
});

test('renderer draws the menu without throwing', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = {
    width: 430,
    height: 932,
    margin: 22,
    title: {
      x: 22,
      y: 72,
      text: 'Lab Lines Sudoku',
      subtitle: '一一数独',
    },
    modeCards: {
      campaign: {
        x: 22,
        y: 680,
        width: 386,
        height: 88,
        title: '闯关挑战',
        label: '闯关挑战',
        buttonLabel: '闯关挑战',
      },
      practice: {
        x: 22,
        y: 780,
        width: 386,
        height: 88,
        title: '自由练习',
        label: '自由练习',
        buttonLabel: '自由练习',
      },
    },
    levelCards: [],
  };

  renderMenu(ctx, menuLayout);

  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('一一数独')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('闯关挑战')));
  assert.ok(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes('自由练习')));
  assert.equal(getDrawnText(ctx).includes('从 LAB-01 开始'), false);
  assert.equal(getDrawnText(ctx).includes('选一个难度'), false);
  ['入门', '简单', '标准', '挑战'].forEach((dot) => {
    assert.equal(ctx.calls.some((call) => call.name === 'fillText' && call.args.includes(dot)), false);
  });
  assert.equal(getDrawnText(ctx).includes('基础数独 01'), false);
});

test('renderer ignores legacy menu buttons when mode cards are present', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = {
    width: 430,
    height: 932,
    margin: 22,
    title: {
      x: 22,
      y: 72,
      text: 'Lab Lines Sudoku',
      subtitle: '一一数独',
    },
    modeCards: {
      campaign: {
        x: 22,
        y: 680,
        width: 386,
        height: 88,
        title: '闯关挑战',
        label: '闯关挑战',
        buttonLabel: '闯关挑战',
      },
      practice: {
        x: 22,
        y: 780,
        width: 386,
        height: 88,
        title: '自由练习',
        label: '自由练习',
        buttonLabel: '自由练习',
      },
    },
    continueButton: {
      x: 22,
      y: 188,
      width: 386,
      height: 62,
      label: '继续实验',
    },
    primaryButton: {
      x: 22,
      y: 188,
      width: 386,
      height: 62,
      label: '开始新实验',
    },
    levelCards: [],
  };

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /闯关挑战/);
  assert.match(text, /自由练习/);
  assert.equal(/开始闯关|选择难度/.test(text), false);
  assert.equal(/继续实验|开始新实验/.test(text), false);
});

test('renderer restores canvas state after drawing the menu', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    completedLevelIds: ['lab-02'],
  });
  const originalState = {
    fillStyle: '#ff00ff',
    font: '12px serif',
    textAlign: 'right',
    textBaseline: 'top',
  };
  Object.assign(ctx, originalState);

  renderMenu(ctx, menuLayout);

  assert.equal(ctx.fillStyle, originalState.fillStyle);
  assert.equal(ctx.font, originalState.font);
  assert.equal(ctx.textAlign, originalState.textAlign);
  assert.equal(ctx.textBaseline, originalState.textBaseline);
});

test('renderer draws menu layout without an active run', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: [],
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /闯关挑战/);
  assert.match(text, /自由练习/);
  assert.equal(text.includes('从 LAB-01 开始'), false);
  assert.equal(text.includes('选一个难度'), false);
  assert.equal(text.includes('入门'), false);
  assert.equal(getDrawnText(ctx).includes(levels[0].title), false);
  assert.equal(getDrawnText(ctx).includes(levels[1].title), false);
});

test('renderer draws saved campaign and practice mode labels', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: true,
    hasPracticeRun: true,
    activeRun: {
      levelId: 'lab-04',
    },
    practiceRun: {
      difficulty: 'normal',
    },
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /继续闯关/);
  assert.match(text, /自由练习/);
  assert.equal(text.includes('继续 LAB-04'), false);
  assert.equal(text.includes('继续上次'), false);
  assert.equal(text.includes('继续训练'), false);
});

test('renderer draws homepage growth summary without campaign progress', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    completedLevelIds: ['lab-01', 'lab-02'],
    growthStats: {
      currentStreak: 2,
      todayCompletedCount: 1,
    },
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.equal(text.includes('闯关进度 2/24'), false);
  assert.match(text, /连续除锈 2 天 · 今日 1 局/);
});

test('renderer omits available practice status pills while keeping recommendation', () => {
  const ctx = createMockCanvasContext();
  const practiceLayout = createPracticeMenuLayout(430, 932, levels, {
    recommendedTrainingDifficulty: 'steady',
  });

  renderPracticeMenu(ctx, practiceLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /推荐/);
  assert.equal(text.includes('可练习'), false);
});

test('renderer draws brain greenhouse homepage without report copy', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels, {
    hasActiveRun: false,
    completedLevelIds: ['lab-01', 'lab-02'],
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.match(text, /一一数独/);
  assert.match(text, /每天打开一局，给大脑做一次轻量热身。/);
  assert.match(text, /闯关挑战/);
  assert.match(text, /自由练习/);
  assert.equal(text.includes('已完成 2/12'), false);
  assert.equal(text.includes('选择难度'), false);
  assert.equal(/今日报告|今日除锈|累计除锈|今日第一局/.test(text), false);
});

test('renderer gives simplified homepage buttons comfortable label text', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels);

  renderMenu(ctx, menuLayout);

  assert.ok(ctx.calls.some((call) => call.name === 'set:font' && call.args[0] === '900 34px sans-serif'));
});

test('renderer ignores legacy home font diagnostics before review submission', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(390, 844, levels, {
    debugOverlay: {
      metricsText: 'DBG home-font-v2 w390 h844 dpr3 font42 w900',
      calibrationText: '字42',
    },
  });

  renderMenu(ctx, menuLayout);

  const text = getDrawnText(ctx);
  assert.equal(/DBG|home-font-v2|font42|字42/.test(text), false);
});

test('renderer clamps unsupported canvas font weights before drawing', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(390, 844, levels);

  renderMenu(ctx, menuLayout);

  assert.equal(ctx.calls.some((call) => call.name === 'set:font' && /^950\b/.test(call.args[0])), false);
  assert.ok(ctx.calls.some((call) => call.name === 'set:font' && call.args[0] === '900 34px sans-serif'));
});

test('renderer draws the nine-by-nine sudoku hero board', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels);

  renderMenu(ctx, menuLayout);

  const tealFills = ctx.calls.filter(
    (call) => call.name === 'set:fillStyle' && call.args.includes('rgba(22, 163, 160, 0.18)'),
  );
  const amberFills = ctx.calls.filter(
    (call) => call.name === 'set:fillStyle' && call.args.includes('rgba(246, 207, 117, 0.24)'),
  );
  const boardLines = ctx.calls.filter((call) => call.name === 'stroke');

  assert.ok(tealFills.length >= 1);
  assert.ok(amberFills.length >= 1);
  assert.ok(boardLines.length >= 8);
});

test('renderer offsets homepage hero board clearly when animation time advances', () => {
  const stillCtx = createMockCanvasContext();
  const animatedCtx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels);

  renderMenu(stillCtx, { ...menuLayout, animationTime: 0 });
  renderMenu(animatedCtx, { ...menuLayout, animationTime: 1100 });

  assert.ok(Math.abs(firstBoardCell(animatedCtx).y - firstBoardCell(stillCtx).y) >= 10);
});

test('renderer shifts homepage hero board with device tilt', () => {
  const neutralCtx = createMockCanvasContext();
  const tiltedCtx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, levels);

  renderMenu(neutralCtx, { ...menuLayout, animationTime: 0, tilt: { x: 0, y: 0 } });
  renderMenu(tiltedCtx, { ...menuLayout, animationTime: 0, tilt: { x: 0.7, y: -0.5 } });

  assert.ok(firstBoardCell(tiltedCtx).x - firstBoardCell(neutralCtx).x >= 10);
  assert.ok(firstBoardCell(neutralCtx).y - firstBoardCell(tiltedCtx).y >= 6);
});

test('renderer handles a menu with no visible level cards', () => {
  const ctx = createMockCanvasContext();
  const menuLayout = createMenuLayout(430, 932, [
    {
      ...levels[0],
      rules: [],
    },
  ]);

  renderMenu(ctx, menuLayout);

  assert.equal(getDrawnText(ctx).includes(levels[0].title), false);
});

test('renderer draws the free training difficulty menu copy', () => {
  const ctx = createMockCanvasContext();
  const layout = createPracticeMenuLayout(430, 932, levels, {
    recommendedTrainingDifficulty: 'steady',
  });

  renderPracticeMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /自由练习/);
  assert.match(text, /选一个难度，随时练一局，不影响闯关进度。/);
  assert.match(text, /返回/);
  ['热身', '稳定', '标准', '进阶'].forEach((label) => {
    assert.match(text, new RegExp(label));
  });
  assert.match(text, /推荐：稳定/);
  assert.match(text, /推荐/);
  assert.match(text, /长局专注，不急着快。/);
  assert.equal((text.match(/推荐：稳定/g) || []).length, 1);
  assert.equal(text.includes('undefined'), false);
});

test('renderer draws the technique training entry on the practice menu', () => {
  const ctx = createMockCanvasContext();
  const layout = createPracticeMenuLayout(430, 932, levels, {
    recommendedTrainingDifficulty: 'steady',
  });

  renderPracticeMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /技巧训练/);
  assert.match(text, /不会从哪看起？试试技巧训练。/);
});

test('renderer draws the technique training directory without pressure copy', () => {
  const ctx = createMockCanvasContext();
  const layout = createTechniqueMenuLayout(430, 932, getTechniqueGroups(), getTechniques());

  renderTechniqueMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /技巧训练/);
  assert.match(text, /初阶技巧/);
  assert.match(text, /进阶技巧/);
  assert.match(text, /唯一空格/);
  assert.match(text, /X-Wing/);
  assert.equal(/已掌握|完成率|正确率|学习失败|等级不足/.test(text), false);
});

test('renderer draws a technique lesson without pressure copy', () => {
  const ctx = createMockCanvasContext();
  const layout = createLayout(430, 932);
  const technique = getTechniqueById('single-empty');
  const state = createTechniqueState(technique);

  renderTechniqueLesson(ctx, state, layout, { technique });

  const text = getDrawnText(ctx);
  assert.match(text, /技巧训练/);
  assert.match(text, /唯一空格/);
  assert.match(text, /第一行只留出一个位置，找出这一行缺少的数字。/);
  assert.match(text, /看提示/);
  assert.equal(/已掌握|完成率|正确率|学习失败/.test(text), false);
});

test('renderer hides normal tools in a technique lesson', () => {
  const ctx = createMockCanvasContext();
  const layout = createLayout(430, 932);
  const technique = getTechniqueById('single-empty');
  const state = createTechniqueState(technique);

  renderTechniqueLesson(ctx, state, layout, { technique });

  assert.equal(/草稿模式|重开|清除/.test(getDrawnText(ctx)), false);
});

test('renderer draws technique lesson success copy when completed', () => {
  const ctx = createMockCanvasContext();
  const layout = createLayout(430, 932);
  const technique = getTechniqueById('single-empty');
  const state = {
    ...createTechniqueState(technique),
    completed: true,
  };
  const target = technique.lesson.target;
  state.cells[target.row][target.col] = {
    ...state.cells[target.row][target.col],
    value: target.digit,
  };

  renderTechniqueLesson(ctx, state, layout, { technique });

  assert.match(getDrawnText(ctx), /这一行补齐了，唯一空格的判断很清楚。/);
});

test('renderer marks unavailable free training difficulties as closed', () => {
  const ctx = createMockCanvasContext();
  const introOnlyLevels = levels.filter((level) => level.difficulty === 'intro');
  const layout = createPracticeMenuLayout(430, 932, introOnlyLevels);

  renderPracticeMenu(ctx, layout);

  const text = getDrawnText(ctx);
  assert.match(text, /热身/);
  assert.match(text, /推荐/);
  assert.match(text, /暂未开放/);
});

function getDrawnText(ctx) {
  return ctx.calls
    .filter((call) => call.name === 'fillText')
    .map((call) => String(call.args[0]))
    .join(' ');
}

function firstBoardCell(ctx) {
  const boardRect = ctx.calls.find(
    (call) => call.name === 'fillRect' && call.args[2] > 10 && call.args[2] < 30,
  );

  assert.ok(boardRect);
  return {
    x: boardRect.args[0],
    y: boardRect.args[1],
  };
}

function createMockCanvasContext(options = {}) {
  const calls = [];
  const stateStack = [];
  const stateKeys = [
    'fillStyle',
    'font',
    'lineCap',
    'lineJoin',
    'lineWidth',
    'strokeStyle',
    'textAlign',
    'textBaseline',
  ];
  const context = {
    calls,
    arc: record('arc'),
    beginPath: record('beginPath'),
    clearRect: record('clearRect'),
    clip: record('clip'),
    closePath: record('closePath'),
    createLinearGradient: () => ({
      addColorStop: record('addColorStop'),
    }),
    fill: record('fill'),
    fillRect: record('fillRect'),
    fillText: record('fillText'),
    lineTo: record('lineTo'),
    moveTo: record('moveTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    restore: () => {
      calls.push({ name: 'restore', args: [] });
      const savedState = stateStack.pop();
      if (savedState) {
        Object.assign(context, savedState);
      }
    },
    save: () => {
      calls.push({ name: 'save', args: [] });
      stateStack.push(Object.fromEntries(stateKeys.map((key) => [key, context[key]])));
    },
    stroke: record('stroke'),
    strokeRect: record('strokeRect'),
  };
  const stateValues = {
    fillStyle: '',
    font: '',
    lineCap: '',
    lineJoin: '',
    lineWidth: 1,
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };

  stateKeys.forEach((key) => {
    Object.defineProperty(context, key, {
      get() {
        return stateValues[key];
      },
      set(value) {
        stateValues[key] = value;
        calls.push({ name: `set:${key}`, args: [value] });
      },
      enumerable: true,
    });
  });

  if (options.measureText !== false) {
    context.measureText = (text) => ({ width: String(text).length * 12 });
  }

  function record(name) {
    return (...args) => {
      calls.push({ name, args });
    };
  }

  return context;
}
