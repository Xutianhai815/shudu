const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const {
  MAX_TOASTS_PER_SESSION,
  createCompanionSession,
  createCompanionView,
  registerCompanionAction,
} = require('../src/companion-feedback');
const { createPuzzleState } = require('../src/puzzle');

test('registerCompanionAction creates tiered milestone toasts for every difficulty', () => {
  const introState = withFilledMutableCells(createPuzzleState(levelByDifficulty('intro')), 3);
  const easyState = withFilledMutableCells(createPuzzleState(levelByDifficulty('easy')), 5);
  const normalState = withFilledMutableCells(createPuzzleState(levelByDifficulty('normal')), 5);
  const hardState = withFilledMutableCells(createPuzzleState(levelByDifficulty('hard')), 5);

  const introToast = registerCompanionAction(createCompanionSession(introState.level, 0), introState, 'digit', 1000).currentToast;
  const easyToast = registerCompanionAction(createCompanionSession(easyState.level, 0), easyState, 'digit', 1000).currentToast;
  const normalToast = registerCompanionAction(createCompanionSession(normalState.level, 0), normalState, 'digit', 1000).currentToast;
  const hardToast = registerCompanionAction(createCompanionSession(hardState.level, 0), hardState, 'digit', 1000).currentToast;

  assert.match(introToast.text, /观察|节奏|线索|推理|草稿|状态/);
  assert.match(easyToast.text, /观察|节奏|线索|推理|草稿|状态/);
  assert.match(normalToast.text, /线索|推理|大脑|观察|专注|齿轮/);
  assert.match(hardToast.text, /线索|推理|大脑|观察|专注|齿轮/);
});

test('registerCompanionAction caps to five toasts and does not repeat the same key', () => {
  const hardLevel = levelByDifficulty('hard');
  let session = createCompanionSession(hardLevel, 0);
  const state = withFilledMutableCells(createPuzzleState(hardLevel), 60);

  [1000, 2000, 3000, 180000, 420000, 720000, 1200000, 1500000].forEach((now) => {
    session = registerCompanionAction(session, state, 'digit', now);
  });

  assert.equal(session.feedbackCount, MAX_TOASTS_PER_SESSION);
  assert.equal(new Set(session.shownFeedbackKeys).size, session.shownFeedbackKeys.length);
});

test('front levels use lower per-session toast limits', () => {
  const introLevel = levelByDifficulty('intro');
  const easyLevel = levelByDifficulty('easy');
  let introSession = createCompanionSession(introLevel, 0);
  let easySession = createCompanionSession(easyLevel, 0);
  const introState = withFilledMutableCells(createPuzzleState(introLevel), 60);
  const easyState = withFilledMutableCells(createPuzzleState(easyLevel), 60);

  [1000, 12000, 24000, 180000, 420000, 720000].forEach((now) => {
    introSession = registerCompanionAction(introSession, introState, 'digit', now);
    easySession = registerCompanionAction(easySession, easyState, 'digit', now);
  });

  assert.equal(introSession.feedbackCount, 2);
  assert.equal(easySession.feedbackCount, 3);
});

test('difficulty profiles scale focus-time companion prompts by level band', () => {
  let introSession = createCompanionSession(levelByDifficulty('intro'), 0);
  let easySession = createCompanionSession(levelByDifficulty('easy'), 0);
  let normalSession = createCompanionSession(levelByDifficulty('normal'), 0);
  let hardSession = createCompanionSession(levelByDifficulty('hard'), 0);
  const introState = createPuzzleState(levelByDifficulty('intro'));
  const easyState = createPuzzleState(levelByDifficulty('easy'));
  const normalState = createPuzzleState(levelByDifficulty('normal'));
  const hardState = createPuzzleState(levelByDifficulty('hard'));

  [180001, 420001, 720001, 1200001].forEach((now) => {
    introSession = registerCompanionAction(introSession, introState, 'digit', now);
    easySession = registerCompanionAction(easySession, easyState, 'digit', now);
    normalSession = registerCompanionAction(normalSession, normalState, 'digit', now);
    hardSession = registerCompanionAction(hardSession, hardState, 'digit', now);
  });

  assert.deepEqual(introSession.shownFeedbackKeys, []);
  assert.deepEqual(easySession.shownFeedbackKeys, ['focus3']);
  assert.deepEqual(normalSession.shownFeedbackKeys, ['focus3', 'focus7', 'focus12']);
  assert.deepEqual(hardSession.shownFeedbackKeys, ['focus3', 'focus7', 'focus12', 'focus20']);
});

test('createCompanionView computes tiered atmosphere without red error colors', () => {
  const introLevel = levelByDifficulty('intro');
  const easyLevel = levelByDifficulty('easy');
  const normalLevel = levelByDifficulty('normal');
  const hardLevel = levelByDifficulty('hard');
  const introHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(introLevel), 60),
    createCompanionSession(introLevel, 0),
    0,
  );
  const easyHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(easyLevel), 60),
    createCompanionSession(easyLevel, 0),
    0,
  );
  const normalHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(normalLevel), 60),
    createCompanionSession(normalLevel, 0),
    0,
  );
  const hardHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(hardLevel), 60),
    createCompanionSession(hardLevel, 0),
    0,
  );

  assert.equal(introHigh.atmosphere.level, 'teal');
  assert.match(introHigh.atmosphere.tint, /0\.04/);
  assert.equal(easyHigh.atmosphere.level, 'glow');
  assert.match(easyHigh.atmosphere.tint, /0\.10/);
  assert.equal(normalHigh.atmosphere.level, 'amber');
  assert.equal(hardHigh.atmosphere.level, 'amber');
  assert.equal(/red|error|#d85d57/i.test(JSON.stringify([introHigh, easyHigh, normalHigh, hardHigh])), false);
});

test('draft return toast waits until player leaves note mode and inputs a formal digit', () => {
  const state = withFilledMutableCells(createPuzzleState(levels[6]), 5);
  let session = createCompanionSession(state.level, 0);

  session = registerCompanionAction(session, state, 'note', 1000);
  session = registerCompanionAction(session, state, 'noteDigit', 12000);

  assert.equal(session.shownFeedbackKeys.includes('noteReturn'), false);

  session = registerCompanionAction(session, state, 'digit', 24000);

  assert.equal(session.shownFeedbackKeys.includes('noteReturn'), true);
});

test('registerCompanionAction coalesces adjacent milestones within ten seconds', () => {
  const hardLevel = levelByDifficulty('hard');
  let session = createCompanionSession(hardLevel, 0);
  const state = withFilledMutableCells(createPuzzleState(hardLevel), 60);

  session = registerCompanionAction(session, state, 'digit', 1000);
  session = registerCompanionAction(session, state, 'digit', 5000);
  session = registerCompanionAction(session, state, 'digit', 11000);

  assert.equal(session.feedbackCount, 1);

  session = registerCompanionAction(session, state, 'digit', 12001);

  assert.equal(session.feedbackCount, 2);
});

test('companion copy avoids process judgment and medical claim wording', () => {
  const hardLevel = levelByDifficulty('hard');
  let session = createCompanionSession(hardLevel, 0);
  const state = withFilledMutableCells(createPuzzleState(hardLevel), 60);

  [1000, 180000, 420000, 720000, 1200000].forEach((now) => {
    session = registerCompanionAction(session, state, 'digit', now);
  });

  const copy = [
    session.currentToast && session.currentToast.text,
    ...session.toastHistory.map((toast) => toast.text),
  ].join(' ');

  assert.equal(/正确|错误|快完成|还差|老年痴呆|阿尔茨海默|医学|疾病/.test(copy), false);
});

function withFilledMutableCells(state, count) {
  let remaining = count;

  return {
    ...state,
    cells: state.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (cell.fixed || remaining <= 0) {
          return cell;
        }

        remaining -= 1;
        return {
          ...cell,
          value: state.solution[rowIndex][colIndex],
        };
      }),
    ),
  };
}

function levelByDifficulty(difficulty) {
  const level = levels.find((item) => item.difficulty === difficulty);

  assert.ok(level);
  return level;
}
