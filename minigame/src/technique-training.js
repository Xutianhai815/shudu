const TRAINING_SOLUTION_GRID = '438627591725391468961458372153746829296815743847239615679183254314562987582974136';
const TRAINING_BOARD_GRID = '030020090700001060060450300003006020096000740040200600009083050010560007080070030';

const TECHNIQUE_GROUPS = deepFreeze([
  {
    id: 'basic',
    title: '初阶技巧',
    subtitle: '从棋盘观察、唯一位置和基础排除开始，适合轻松热身。',
  },
  {
    id: 'advanced',
    title: '进阶技巧',
    subtitle: '练习数组、鱼形和结构判断，用更少猜测整理线索。',
  },
]);

const TECHNIQUE_SPECS = deepFreeze(
  [
    {
      id: 'board-basics',
      group: 'basic',
      title: '认识棋盘',
      target: [0, 0],
      summary: '观察行、列、宫三个范围，先确认格子所在的位置关系。',
      prompt: '看左上角这一格，它同时属于第一行、第一列和左上宫，请填入匹配数字。',
      successText: '位置关系理清了，后面的观察会更顺手。',
    },
    {
      id: 'single-empty',
      group: 'basic',
      title: '唯一空格',
      target: [0, 1],
      summary: '当一行只剩一个空格时，可以直接补上缺少的数字。',
      prompt: '第一行只留出一个位置，找出这一行缺少的数字。',
      successText: '这一行补齐了，唯一空格的判断很清楚。',
    },
    {
      id: 'single-candidate',
      group: 'basic',
      title: '唯一候选',
      target: [0, 2],
      summary: '结合同行、同列和同宫已有数字，留下唯一可填候选。',
      prompt: '检查这一格的行列宫，排除已出现的数字后填入剩下的候选。',
      successText: '候选收束得很好，这格只留下一个选择。',
      steps: [
        {
          title: '先看目标格',
          text: '目标格会同时受到同一行、同一列和同一宫限制。',
          highlightCells: [{ row: 0, col: 2 }],
          highlightUnits: [{ type: 'row', index: 0 }, { type: 'col', index: 2 }, { type: 'box', index: 0 }],
          targetVisible: true,
          inputEnabled: false,
        },
        {
          title: '排除已有数字',
          text: '这些范围里的数字会排除大部分候选。',
          highlightCells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 2 }],
          highlightUnits: [{ type: 'box', index: 0 }],
          candidateHighlights: [{ row: 0, col: 2, digit: 1, tone: 'muted' }, { row: 0, col: 2, digit: 4, tone: 'muted' }],
          targetVisible: true,
          inputEnabled: false,
        },
        {
          title: '只剩一个可能',
          text: '排除后，目标格只剩下这一格的答案。',
          highlightCells: [{ row: 0, col: 2 }],
          candidateHighlights: [{ row: 0, col: 2, digit: 8, tone: 'amber' }],
          targetVisible: true,
          inputEnabled: false,
        },
        {
          title: '自己填一步',
          text: '现在填入目标数字，完成这次观察。',
          highlightCells: [{ row: 0, col: 2 }],
          candidateHighlights: [{ row: 0, col: 2, digit: 8, tone: 'amber' }],
          targetVisible: true,
          inputEnabled: true,
        },
      ],
    },
    {
      id: 'digit-scan',
      group: 'basic',
      title: '数字扫描',
      target: [0, 3],
      summary: '围绕同一个数字横向和纵向扫描，寻找它还能落下的位置。',
      prompt: '沿着行列扫描数字线索，判断目标格应放入哪个数字。',
      successText: '扫描路径找对了，数字落点更容易看见。',
    },
    {
      id: 'box-elimination',
      group: 'basic',
      title: '宫内排除',
      target: [0, 4],
      summary: '先看一个宫内已有数字，再排除同行同列冲突。',
      prompt: '聚焦上方中宫，排除相邻行列后填入目标格。',
      successText: '宫内范围缩小了，排除思路很稳。',
    },
    {
      id: 'line-box-interaction',
      group: 'basic',
      title: '行列联动',
      target: [0, 5],
      summary: '把行列线索与宫位一起看，找到互相限制后的落点。',
      prompt: '同时查看这一行和所在宫，利用联动关系判断数字。',
      successText: '行列和宫位配合起来，目标格就清楚了。',
    },
    {
      id: 'notes-cleanup',
      group: 'basic',
      title: '草稿整理',
      target: [0, 6],
      summary: '候选草稿需要跟随新线索整理，避免旧标记干扰观察。',
      prompt: '整理目标格附近的候选，只保留与行列宫一致的数字。',
      successText: '草稿更干净了，下一步推理会轻松一些。',
    },
    {
      id: 'duplicate-check',
      group: 'basic',
      title: '重复自检',
      target: [0, 7],
      summary: '填数前快速查看同行、同列和同宫，避开重复数字。',
      prompt: '填入前做一次重复检查，确认这个数字不与周围冲突。',
      successText: '自检到位，棋盘保持一致。',
    },
    {
      id: 'naked-pair',
      group: 'advanced',
      title: '显性数对',
      target: [0, 8],
      summary: '两个格子共享同一对候选时，可从同范围其他格移除这对数字。',
      prompt: '观察这一行的成对候选，利用它们留下目标格的数字。',
      successText: '数对位置看准了，候选范围被自然收窄。',
    },
    {
      id: 'hidden-pair',
      group: 'advanced',
      title: '隐性数对',
      target: [1, 0],
      summary: '某两个数字只出现在同两个格子里时，可以保留这组隐藏关系。',
      prompt: '找出这一宫里只共享两个位置的数字组合，再判断目标格。',
      successText: '隐藏关系被发现了，目标格的方向更明确。',
    },
    {
      id: 'pointing-set',
      group: 'advanced',
      title: '指向数组',
      target: [1, 1],
      summary: '宫内某个数字集中在一条线上时，可影响这条线的其他位置。',
      prompt: '查看宫内候选是否指向同一列，再填入目标格。',
      successText: '指向关系判断得当，线索顺着同一条线展开。',
    },
    {
      id: 'box-line-reduction',
      group: 'advanced',
      title: '区块排除',
      target: [1, 2],
      summary: '一条线上的候选被限制在同一宫时，可清理该宫其他候选。',
      prompt: '利用行列中的区块限制，确认目标格应填的数字。',
      successText: '区块限制生效了，宫内候选更清晰。',
    },
    {
      id: 'x-wing',
      group: 'advanced',
      title: 'X-Wing',
      target: [1, 3],
      summary: '两行两列形成矩形候选时，可排除矩形外同列候选。',
      prompt: '寻找同数字形成的矩形结构，再回到目标格判断。',
      successText: '矩形结构抓住了，鱼形线索开始发挥作用。',
      steps: [
        {
          title: '找两行候选',
          text: '先看数字 3 在两行里是否只落在同两列。',
          highlightUnits: [{ type: 'row', index: 1 }, { type: 'row', index: 4 }],
          candidateHighlights: [
            { row: 1, col: 3, digit: 3, tone: 'teal' },
            { row: 1, col: 4, digit: 3, tone: 'teal' },
            { row: 4, col: 3, digit: 3, tone: 'teal' },
            { row: 4, col: 4, digit: 3, tone: 'teal' },
          ],
        },
        {
          title: '形成矩形',
          text: '两行两列形成矩形后，同列其他 3 可以被排除。',
          shapeHighlights: [{
            type: 'rect',
            cells: [{ row: 1, col: 3 }, { row: 1, col: 4 }, { row: 4, col: 3 }, { row: 4, col: 4 }],
            tone: 'amber',
          }],
          candidateHighlights: [{ row: 5, col: 4, digit: 3, tone: 'muted' }],
        },
        {
          title: '回到目标格',
          text: '候选被排除后，目标格留下确定数字。',
          highlightCells: [{ row: 1, col: 3 }],
          candidateHighlights: [{ row: 1, col: 3, digit: 3, tone: 'amber' }],
          targetVisible: true,
        },
        {
          title: '自己填一步',
          text: '填入目标数字，完成这次结构观察。',
          highlightCells: [{ row: 1, col: 3 }],
          candidateHighlights: [{ row: 1, col: 3, digit: 3, tone: 'amber' }],
          targetVisible: true,
          inputEnabled: true,
        },
      ],
    },
    {
      id: 'swordfish',
      group: 'advanced',
      title: 'Swordfish / 剑鱼',
      target: [1, 4],
      summary: '三行三列形成稳定候选网时，可整理同列其他候选。',
      prompt: '观察三条线的候选分布，用剑鱼结构确认目标格。',
      successText: '三线结构梳理清楚，候选网变得有序。',
    },
    {
      id: 'xy-wing',
      group: 'advanced',
      title: 'XY-Wing',
      target: [1, 5],
      summary: '枢纽格连接两个双候选翼格时，可移除共同看到的候选。',
      prompt: '找到枢纽和两个翼格，利用它们共同限制目标格。',
      successText: '链式关系看得很稳，目标候选被顺利确认。',
    },
    {
      id: 'unique-rectangle',
      group: 'advanced',
      title: '唯一矩形',
      target: [1, 6],
      summary: '四格矩形出现重复候选形态时，可借助额外候选打破对称。',
      prompt: '观察矩形四角的候选差异，选择能保持结构唯一的数字。',
      successText: '矩形差异被识别，结构判断更完整。',
    },
  ].map((spec) => createTechniqueSpec(spec)),
);

function getTechniqueGroups() {
  return cloneValue(TECHNIQUE_GROUPS);
}

function getTechniques(groupId) {
  const techniques = groupId ? TECHNIQUE_SPECS.filter((technique) => technique.group === groupId) : TECHNIQUE_SPECS;

  return cloneValue(techniques);
}

function getTechniqueById(value) {
  const id = normalizeTechniqueId(value);
  const technique = TECHNIQUE_SPECS.find((item) => item.id === id);

  return technique ? cloneValue(technique) : null;
}

function normalizeTechniqueId(value) {
  if (value && typeof value === 'object') {
    return normalizeTechniqueId(value.id);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const id = normalized.replace(/^technique-/, '');

  return TECHNIQUE_SPECS.some((technique) => technique.id === id) ? id : null;
}

function createTechniqueState(value) {
  const technique = resolveTechnique(value);
  const givens = cloneGrid(technique.lesson.board);
  const solution = cloneGrid(technique.lesson.solution);
  const notes = cloneValue(technique.lesson.notes || {});

  return {
    mode: 'technique',
    level: {
      id: `technique-${technique.id}`,
      title: technique.title,
      label: '技巧训练',
      difficulty: technique.group,
      rules: ['classic'],
      givens,
      solution,
      notes,
    },
    selected: {
      row: technique.lesson.target.row,
      col: technique.lesson.target.col,
    },
    noteMode: false,
    currentStepIndex: 0,
    completed: false,
    cells: givens.map((row, rowIndex) =>
      row.map((value, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        value,
        fixed: value > 0,
        notes: getCellNotes(notes, rowIndex, colIndex),
      })),
    ),
  };
}

function isTechniqueTargetInput(value, row, col, digit) {
  const technique = resolveTechnique(value, { allowMissing: true });

  if (!technique) {
    return false;
  }

  const target = technique.lesson.target;

  return target.row === row && target.col === col && target.digit === digit;
}

function resolveTechnique(value, options = {}) {
  if (value && typeof value === 'object' && value.lesson && value.id) {
    return cloneValue(value);
  }

  const technique = getTechniqueById(value);

  if (!technique && !options.allowMissing) {
    throw new Error(`Unknown technique: ${String(value)}`);
  }

  return technique;
}

function createTechniqueSpec({ id, group, title, target, summary, prompt, successText, steps }) {
  const solution = parseGrid(TRAINING_SOLUTION_GRID);
  const board = parseGrid(TRAINING_BOARD_GRID);
  const [row, col] = target;
  const digit = solution[row][col];

  board[row][col] = 0;
  const rawSteps = createDefaultSteps({ title, target: { row, col, digit }, group, prompt, board, solution });
  const sourceSteps = Array.isArray(steps) && steps.length ? steps : rawSteps;
  const normalizedSteps = sourceSteps.map((step, index) => createLessonStep(step, index, sourceSteps.length));

  return {
    id,
    group,
    title,
    summary,
    lesson: {
      prompt,
      successText,
      board,
      solution,
      target: {
        row,
        col,
        digit,
      },
      notes: {},
      steps: normalizedSteps,
    },
  };
}

function createDefaultSteps({ title, target, group, prompt, board, solution }) {
  const { row, col, digit } = target;
  const targetCell = { row, col };
  const relatedBox = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const advancedDecorations = createAdvancedStepDecorations(targetCell, board, solution);
  const mutedDigit = getLegalCandidateDigits(board, row, col).find((candidateDigit) => candidateDigit !== digit);
  const mutedCandidates = mutedDigit ? [{ row, col, digit: mutedDigit, tone: 'muted' }] : [];

  if (group === 'advanced') {
    return [
      {
        title: '先看结构',
        text: prompt,
        highlightCells: advancedDecorations.anchorCells,
        highlightUnits: advancedDecorations.units,
        candidateHighlights: advancedDecorations.candidates,
        shapeHighlights: advancedDecorations.shapes,
      },
      {
        title: '排除干扰',
        text: '观察被同一结构影响的位置，把不稳定候选先放到一边。',
        highlightCells: advancedDecorations.removeCells,
        candidateHighlights: advancedDecorations.removals,
        shapeHighlights: advancedDecorations.shapes,
      },
      {
        title: '回到目标格',
        text: '结构线索收束后，目标格已经可以被单独观察。',
        highlightCells: [targetCell],
        targetVisible: true,
      },
      {
        title: '自己填一步',
        text: '现在填入目标数字，完成这次结构观察。',
        highlightCells: [targetCell],
        candidateHighlights: [{ row, col, digit, tone: 'amber' }],
        targetVisible: true,
        inputEnabled: true,
      },
    ];
  }

  return [
    {
      title: '先看范围',
      text: prompt,
      highlightCells: [targetCell],
      highlightUnits: [{ type: 'row', index: row }, { type: 'col', index: col }, { type: 'box', index: relatedBox }],
      targetVisible: true,
    },
    {
      title: '排除已有数字',
      text: '同一行、同一列和同一宫里已经出现的数字，都会压缩目标格的选择。',
      highlightCells: getPeerPreviewCells(row, col),
      highlightUnits: [{ type: 'box', index: relatedBox }],
      candidateHighlights: mutedCandidates,
      targetVisible: true,
    },
    {
      title: '留下关键候选',
      text: '候选被整理后，目标数字成为这一步最清晰的落点。',
      highlightCells: [targetCell],
      candidateHighlights: [{ row, col, digit, tone: 'amber' }],
      targetVisible: true,
    },
    {
      title: '自己填一步',
      text: '现在填入目标数字，完成这次观察。',
      highlightCells: [targetCell],
      candidateHighlights: [{ row, col, digit, tone: 'amber' }],
      targetVisible: true,
      inputEnabled: true,
    },
  ];
}

function createLessonStep(step, index, total) {
  return {
    title: step.title,
    text: step.text,
    highlightCells: normalizeCells(step.highlightCells || []),
    highlightUnits: normalizeUnits(step.highlightUnits || []),
    candidateHighlights: normalizeCandidateHighlights(step.candidateHighlights || []),
    shapeHighlights: normalizeShapeHighlights(step.shapeHighlights || []),
    targetVisible: step.targetVisible === true || index >= total - 2,
    inputEnabled: index === total - 1,
  };
}

function normalizeCells(cells) {
  return cells
    .filter((cell) => cell && Number.isInteger(cell.row) && Number.isInteger(cell.col))
    .map((cell) => ({ row: cell.row, col: cell.col }));
}

function normalizeUnits(units) {
  return units
    .filter((unit) => unit && ['row', 'col', 'box'].includes(unit.type) && Number.isInteger(unit.index))
    .map((unit) => ({ type: unit.type, index: unit.index }));
}

function normalizeCandidateHighlights(items) {
  return items
    .filter((item) => item && Number.isInteger(item.row) && Number.isInteger(item.col) && Number.isInteger(item.digit))
    .map((item) => ({
      row: item.row,
      col: item.col,
      digit: item.digit,
      tone: item.tone || 'teal',
    }));
}

function normalizeShapeHighlights(items) {
  return items
    .filter((item) => item && item.type)
    .map((item) => ({
      type: item.type,
      cells: normalizeCells(item.cells || []),
      tone: item.tone || 'amber',
    }));
}

function getPeerPreviewCells(row, col) {
  return [
    { row, col: (col + 1) % 9 },
    { row: (row + 1) % 9, col },
    { row: Math.floor(row / 3) * 3, col: Math.floor(col / 3) * 3 },
  ].filter((cell) => cell.row !== row || cell.col !== col);
}

function createAdvancedStepDecorations(targetCell, board, solution) {
  const teachingCandidates = getLegalTeachingCandidates(board, solution, targetCell, 6);
  const anchorCells = teachingCandidates.slice(0, 5).map(({ row, col }) => ({ row, col }));
  const removalCandidate = teachingCandidates[5] || teachingCandidates[1] || teachingCandidates[0];
  const candidates = teachingCandidates
    .slice(1, 5)
    .map(({ row, col, digit }) => ({ row, col, digit, tone: 'teal' }));
  const removals = removalCandidate ? [{ ...removalCandidate, tone: 'muted' }] : [];
  const targetBox = Math.floor(targetCell.row / 3) * 3 + Math.floor(targetCell.col / 3);

  return {
    anchorCells,
    removeCells: removalCandidate ? [{ row: removalCandidate.row, col: removalCandidate.col }] : [],
    units: [{ type: 'box', index: targetBox }],
    candidates,
    removals,
    shapes: [],
  };
}

function getLegalTeachingCandidates(board, solution, targetCell, count) {
  const candidates = [];
  const addCandidate = (row, col) => {
    const digit = solution[row][col];

    if (board[row][col] === 0 && isLegalCandidate(board, row, col, digit)) {
      candidates.push({ row, col, digit });
    }
  };

  addCandidate(targetCell.row, targetCell.col);

  for (let row = 0; row < 9 && candidates.length < count; row += 1) {
    for (let col = 0; col < 9 && candidates.length < count; col += 1) {
      const isTarget = row === targetCell.row && col === targetCell.col;

      if (!isTarget) {
        addCandidate(row, col);
      }
    }
  }

  return candidates;
}

function getLegalCandidateDigits(board, row, col) {
  const digits = [];

  for (let digit = 1; digit <= 9; digit += 1) {
    if (isLegalCandidate(board, row, col, digit)) {
      digits.push(digit);
    }
  }

  return digits;
}

function isLegalCandidate(board, row, col, digit) {
  if (board[row][col] !== 0) {
    return false;
  }

  for (let index = 0; index < 9; index += 1) {
    if (board[row][index] === digit || board[index][col] === digit) {
      return false;
    }
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
    for (let colOffset = 0; colOffset < 3; colOffset += 1) {
      if (board[boxRow + rowOffset][boxCol + colOffset] === digit) {
        return false;
      }
    }
  }

  return true;
}

function parseGrid(value) {
  if (typeof value !== 'string' || value.length !== 81) {
    throw new Error('Sudoku grid must be an 81-character string.');
  }

  return Array.from({ length: 9 }, (_, rowIndex) =>
    Array.from({ length: 9 }, (_, colIndex) => {
      const digit = Number(value[rowIndex * 9 + colIndex]);

      if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
        throw new Error('Sudoku grid can only contain digits from 0 to 9.');
      }

      return digit;
    }),
  );
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCellNotes(notes, row, col) {
  const key = `${row},${col}`;
  const values = Array.isArray(notes[key]) ? notes[key] : [];

  return values.slice();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);
  Object.values(value).forEach((child) => deepFreeze(child));

  return value;
}

module.exports = {
  TECHNIQUE_GROUPS,
  createTechniqueState,
  getTechniqueById,
  getTechniqueGroups,
  getTechniques,
  isTechniqueTargetInput,
  normalizeTechniqueId,
};
