#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { createCompletionFeedback } = require('../src/derust');
const { createLayout } = require('../src/layout');
const { levels } = require('../src/levels');
const { createMenuLayout } = require('../src/menu');
const { createPracticeMenuLayout } = require('../src/practice-menu');
const { createPuzzleState } = require('../src/puzzle');
const { createTechniqueMenuLayout } = require('../src/technique-menu');
const {
  createTechniqueState,
  getTechniqueById,
  getTechniqueGroups,
  getTechniques,
} = require('../src/technique-training');
const {
  renderGame,
  renderMenu,
  renderPracticeMenu,
  renderTechniqueLesson,
  renderTechniqueMenu,
} = require('../src/renderer');

const SNAPSHOT_WIDTH = 430;
const SNAPSHOT_HEIGHT = 932;
const SNAPSHOT_TOP_INSET = 98;

function createVisualSnapshots() {
  const menuLayout = createMenuLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, levels, {
    hasActiveRun: true,
    hasPracticeRun: true,
    completedLevelIds: ['lab-01'],
    activeRun: { levelId: 'lab-02' },
    practiceRun: { difficulty: 'intro' },
    topInset: SNAPSHOT_TOP_INSET,
  });
  const practiceMenuLayout = createPracticeMenuLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, levels, {
    topInset: SNAPSHOT_TOP_INSET,
  });
  const techniqueMenuLayout = createTechniqueMenuLayout(
    SNAPSHOT_WIDTH,
    SNAPSHOT_HEIGHT,
    getTechniqueGroups(),
    getTechniques(),
    { topInset: SNAPSHOT_TOP_INSET },
  );
  const technique = getTechniqueById('single-empty');
  const techniqueState = createTechniqueState(technique);
  const techniqueStep = technique.lesson.steps[0];
  const techniqueLessonLayout = createLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, {
    topInset: SNAPSHOT_TOP_INSET,
  });
  const gameplayState = createPuzzleState(levels[0]);
  const gameplayLayout = createLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, {
    topInset: SNAPSHOT_TOP_INSET,
  });
  const completedState = createCompletedState(levels[0]);
  const victoryLayout = createLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, {
    topInset: SNAPSHOT_TOP_INSET,
  });
  const practiceLevel = levels.find((level) => level.difficulty === 'hard') || levels[0];
  const practiceCompletedState = createCompletedState(practiceLevel);
  const practiceVictoryLayout = createLayout(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT, {
    topInset: SNAPSHOT_TOP_INSET,
  });

  return {
    menu: renderToSvg((ctx) => renderMenu(ctx, menuLayout)),
    practiceMenu: renderToSvg((ctx) => renderPracticeMenu(ctx, practiceMenuLayout)),
    techniqueMenu: renderToSvg((ctx) => renderTechniqueMenu(ctx, techniqueMenuLayout)),
    techniqueLesson: renderToSvg((ctx) =>
      renderTechniqueLesson(ctx, techniqueState, techniqueLessonLayout, {
        technique,
        currentStep: techniqueStep,
        currentStepIndex: 0,
        totalSteps: technique.lesson.steps.length,
      }),
    ),
    gameplayDebug: renderToSvg((ctx) =>
      renderGame(ctx, gameplayState, gameplayLayout, {
        modeContext: {
          label: gameplayState.level.label,
          title: gameplayState.level.title,
        },
        companionFeedback: {
          toast: { text: '线索开始连起来了' },
          atmosphere: { level: 'teal', tint: 'rgba(22, 163, 160, 0.08)' },
        },
      }),
    ),
    victory: renderToSvg((ctx) =>
      renderGame(ctx, completedState, victoryLayout, {
        completionFeedback: {
          ...createCompletionFeedback(
            completedState,
            ['lab-01'],
            {
              date: '2026-05-14',
              completionCount: 1,
              completedLevelIds: ['lab-01'],
            },
            '2026-05-14',
          ),
          variant: 'campaign',
          label: 'LAB CLEAR',
          title: '第 1 关完成',
          unlockText: '下一关已解锁',
          progressText: '1 / 12',
          subtitle: '大脑已热身，继续挑战下一关。',
        },
        victoryActions: {
          next: '下一关',
        },
      }),
    ),
    practiceVictory: renderToSvg((ctx) =>
      renderGame(ctx, practiceCompletedState, practiceVictoryLayout, {
        modeContext: {
          mode: 'practice',
          label: '自由练习',
          title: '自由练习 · 挑战',
        },
        completionFeedback: createCompletionFeedback(
          practiceCompletedState,
          ['lab-01'],
          {
            date: '2026-05-14',
            completionCount: 1,
            completedLevelIds: ['lab-01'],
          },
          '2026-05-14',
        ),
        victoryActions: {
          restart: '再练一局',
          next: '换个难度',
        },
      }),
    ),
  };
}

function createCompletedState(level) {
  const state = createPuzzleState(level);

  return {
    ...state,
    completed: true,
    cells: state.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: level.solution[rowIndex][colIndex],
        notes: [],
      })),
    ),
  };
}

function writeVisualSnapshots(outputDir = path.join(__dirname, '..', 'artifacts', 'visual')) {
  const snapshots = createVisualSnapshots();
  fs.mkdirSync(outputDir, { recursive: true });

  return Object.fromEntries(
    Object.entries(snapshots).map(([name, svg]) => {
      const filePath = path.join(outputDir, `${name}.svg`);
      fs.writeFileSync(filePath, svg, 'utf8');
      return [name, filePath];
    }),
  );
}

function renderToSvg(draw) {
  const ctx = new SvgCanvasContext(SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);
  draw(ctx);
  return ctx.toSvg();
}

class SvgCanvasContext {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.elements = [];
    this.defs = [];
    this.stateStack = [];
    this.currentPath = [];
    this.gradientCount = 0;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.font = '12px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
  }

  arc(x, y, radius) {
    this.currentPath.push(
      `M ${formatNumber(x + radius)} ${formatNumber(y)}`,
      `A ${formatNumber(radius)} ${formatNumber(radius)} 0 1 0 ${formatNumber(x - radius)} ${formatNumber(y)}`,
      `A ${formatNumber(radius)} ${formatNumber(radius)} 0 1 0 ${formatNumber(x + radius)} ${formatNumber(y)}`,
    );
  }

  beginPath() {
    this.currentPath = [];
  }

  clearRect() {
    // SVG snapshots start empty, so clearRect is naturally a no-op.
  }

  clip() {
    // Snapshot rendering is for visual QA; clipping is intentionally approximate.
  }

  closePath() {
    this.currentPath.push('Z');
  }

  createLinearGradient(x1, y1, x2, y2) {
    const id = `gradient-${this.gradientCount}`;
    this.gradientCount += 1;
    const stops = [];

    return {
      __svgGradient: true,
      id,
      addColorStop(offset, color) {
        stops.push({ offset, color });
      },
      toDef: () => {
        const stopMarkup = stops
          .map((stop) => `<stop offset="${formatPercent(stop.offset)}" stop-color="${escapeAttribute(stop.color)}" />`)
          .join('');
        return `<linearGradient id="${id}" x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}" gradientUnits="userSpaceOnUse">${stopMarkup}</linearGradient>`;
      },
    };
  }

  fill() {
    if (this.currentPath.length === 0) {
      return;
    }

    this.elements.push(
      `<path d="${this.currentPath.join(' ')}" fill="${this.paint(this.fillStyle)}" stroke="none" />`,
    );
  }

  fillRect(x, y, width, height) {
    this.elements.push(
      `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="${this.paint(this.fillStyle)}" />`,
    );
  }

  fillText(text, x, y) {
    const { size, family, weight } = parseFont(this.font);
    this.elements.push(
      `<text x="${formatNumber(x)}" y="${formatNumber(y)}" fill="${this.paint(this.fillStyle)}" font-family="${escapeAttribute(family)}" font-size="${formatNumber(size)}" font-weight="${escapeAttribute(weight)}" text-anchor="${textAnchor(this.textAlign)}" dominant-baseline="${dominantBaseline(this.textBaseline)}">${escapeText(text)}</text>`,
    );
  }

  lineTo(x, y) {
    this.currentPath.push(`L ${formatNumber(x)} ${formatNumber(y)}`);
  }

  measureText(text) {
    const { size } = parseFont(this.font);
    return { width: String(text).length * size * 0.62 };
  }

  moveTo(x, y) {
    this.currentPath.push(`M ${formatNumber(x)} ${formatNumber(y)}`);
  }

  quadraticCurveTo(cpx, cpy, x, y) {
    this.currentPath.push(
      `Q ${formatNumber(cpx)} ${formatNumber(cpy)} ${formatNumber(x)} ${formatNumber(y)}`,
    );
  }

  restore() {
    const state = this.stateStack.pop();
    if (!state) {
      return;
    }

    Object.assign(this, state);
  }

  save() {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
    });
  }

  setTransform() {
    // The snapshot canvas uses CSS pixels directly.
  }

  stroke() {
    if (this.currentPath.length === 0) {
      return;
    }

    this.elements.push(
      `<path d="${this.currentPath.join(' ')}" fill="none" stroke="${this.paint(this.strokeStyle)}" stroke-width="${formatNumber(this.lineWidth)}" stroke-linecap="${escapeAttribute(this.lineCap)}" stroke-linejoin="${escapeAttribute(this.lineJoin)}" />`,
    );
  }

  strokeRect(x, y, width, height) {
    this.elements.push(
      `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="none" stroke="${this.paint(this.strokeStyle)}" stroke-width="${formatNumber(this.lineWidth)}" />`,
    );
  }

  toSvg() {
    const defs = this.defs.length > 0 ? `<defs>${this.defs.join('')}</defs>` : '';
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`,
      defs,
      ...this.elements,
      '</svg>',
      '',
    ].join('\n');
  }

  paint(value) {
    if (value && value.__svgGradient) {
      this.defs.push(value.toDef());
      return `url(#${value.id})`;
    }

    return escapeAttribute(value || 'none');
  }
}

function parseFont(font) {
  const fontText = String(font || '12px sans-serif');
  const sizeMatch = fontText.match(/(\d+(?:\.\d+)?)px/);
  const size = sizeMatch ? Number(sizeMatch[1]) : 12;
  const weightMatch = fontText.match(/\b(700|800|850|900|950|bold)\b/);
  const family = fontText.slice(fontText.indexOf('px') + 2).trim() || 'sans-serif';

  return {
    family,
    size,
    weight: weightMatch ? weightMatch[1] : '400',
  };
}

function textAnchor(align) {
  if (align === 'center') {
    return 'middle';
  }

  if (align === 'right') {
    return 'end';
  }

  return 'start';
}

function dominantBaseline(baseline) {
  if (baseline === 'middle') {
    return 'middle';
  }

  return 'auto';
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, '');
}

function formatPercent(offset) {
  return `${formatNumber(Number(offset) * 100)}%`;
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function escapeText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

if (require.main === module) {
  const written = writeVisualSnapshots();
  Object.values(written).forEach((filePath) => {
    console.log(filePath);
  });
}

module.exports = {
  createVisualSnapshots,
  writeVisualSnapshots,
};
