const {
  applyDigit,
  createPuzzleState,
  eraseSelected,
  nextLevel,
  restartLevel,
  selectCell,
  toggleNoteMode,
} = require('./puzzle');
const { createLayout, hitTest } = require('./layout');
const { levels, getLevelById } = require('./levels');
const { createMenuLayout, hitTestMenu } = require('./menu');
const { createPracticeMenuLayout, hitTestPracticeMenu } = require('./practice-menu');
const {
  choosePracticeLevel,
  createEmptyPracticeStats,
  getDifficultyOption,
  recordPracticeCompletion,
} = require('./game-modes');
const {
  createProgressFromRuns,
  createRunFromState,
  restoreStateFromProgress,
} = require('./progress');
const { recordGrowthCompletion } = require('./growth-stats');
const { loadProgress, saveProgress } = require('./storage');
const { renderGame, renderMenu, renderPracticeMenu } = require('./renderer');
const {
  createCompletionFeedback,
  createNextDailyReport,
  getTodayKey,
} = require('./derust');
const { isDebugToolsEnabled } = require('./debug');
const { createSoundManager } = require('./sound');
const {
  createCompanionSession,
  createCompanionView,
  registerCompanionAction,
} = require('./companion-feedback');

function createAppRuntime(platform) {
const canvas = platform.createCanvas();
const ctx = canvas.getContext('2d');

let scene = 'menu';
let currentMode = 'campaign';
let state = null;
let savedProgress = null;
let completedLevelIds = [];
let menuLayout = null;
let practiceMenuLayout = null;
let layout = null;
let dpr = 1;
let debugToolsEnabled = false;
let soundManager = null;
let topInset = 0;
let gameplayTopInset = 0;
let companionSession = null;
let companionToastTimer = null;
let menuAnimationFrame = null;
let menuAnimationStartedAt = 0;
let menuTilt = { x: 0, y: 0 };
let menuAccelerometerHandler = null;
let menuAccelerometerActive = false;

function boot() {
  debugToolsEnabled = isDebugToolsEnabled(platform.getRawApi ? platform.getRawApi() : null);
  soundManager = createSoundManager(platform);
  savedProgress = loadProgress(platform);
  completedLevelIds = savedProgress.completedLevelIds;
  state = restoreStateFromProgress(savedProgress.activeRun, levels) || createPuzzleState(levels[0]);
  resetCompanionSession(state.level);

  setupCanvas();
  startMenuAnimation();
  render();

  platform.onTouchStart((event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) {
      return;
    }

    if (scene === 'menu') {
      handleMenuTouch(touch);
      return;
    }

    if (scene === 'practiceDifficulty') {
      handlePracticeMenuTouch(touch);
      return;
    }

    if (scene === 'playing') {
      handleGameTouch(touch);
    }
  });

  if (typeof platform.onWindowResize === 'function') {
    platform.onWindowResize(() => {
      setupCanvas();
      render();
    });
  }
}

function setupCanvas() {
  const systemInfo = platform.getSystemInfo();
  dpr = systemInfo.pixelRatio || 1;
  const width = systemInfo.windowWidth;
  const height = systemInfo.windowHeight;
  topInset = platform.getTopInset(systemInfo);
  gameplayTopInset =
    typeof platform.getGameplayTopInset === 'function'
      ? platform.getGameplayTopInset(systemInfo, topInset)
      : topInset;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = {
    ...createLayout(width, height, { debugToolsEnabled, topInset: gameplayTopInset }),
    canvasTextScale: 1,
  };
  refreshMenuLayout();
  refreshPracticeMenuLayout();
}

function refreshMenuLayout() {
  if (!layout) {
    return;
  }

  const activeRun = getResumeableRun(savedProgress && savedProgress.activeRun);
  const practiceRun = getResumeableRun(savedProgress && savedProgress.practiceRun);

  menuLayout = {
    ...createMenuLayout(layout.width, layout.height, levels, {
      hasActiveRun: Boolean(activeRun),
      activeRun,
      hasPracticeRun: Boolean(practiceRun),
      practiceRun,
      completedLevelIds,
      growthStats: savedProgress && savedProgress.growthStats,
      topInset,
    }),
    canvasTextScale: layout.canvasTextScale,
  };
}

function getResumeableRun(run) {
  return run && run.completed !== true ? run : null;
}

function refreshPracticeMenuLayout() {
  if (!layout) {
    return;
  }

  practiceMenuLayout = {
    ...createPracticeMenuLayout(layout.width, layout.height, levels, { topInset }),
    canvasTextScale: layout.canvasTextScale,
  };
}

function render() {
  if (scene === 'menu' && menuLayout) {
    renderMenu(ctx, {
      ...menuLayout,
      animationTime: Math.max(0, Date.now() - menuAnimationStartedAt),
      tilt: menuTilt,
    });
    return;
  }

  if (scene === 'practiceDifficulty' && practiceMenuLayout) {
    renderPracticeMenu(ctx, practiceMenuLayout);
    return;
  }

  if (scene === 'playing' && state && layout) {
    renderGame(ctx, state, layout, {
      modeContext: createModeContext(),
      victoryActions: createVictoryActions(),
      companionFeedback: createCompanionView(state, companionSession),
      completionFeedback: state.completed ? createCurrentCompletionFeedback() : null,
    });
  }
}

function createCurrentCompletionFeedback() {
  const feedback = createCompletionFeedback(
    state,
    completedLevelIds,
    savedProgress && savedProgress.dailyReport,
    getTodayKey(),
    companionSession ? Date.now() - companionSession.startedAt : 0,
  );

  if (currentMode !== 'campaign') {
    return feedback;
  }

  const levelNumber = getCampaignLevelNumber(state.level);

  return {
    ...feedback,
    variant: 'campaign',
    label: 'LAB CLEAR',
    title: `第 ${levelNumber} 关完成`,
    subtitle: '大脑已热身，继续挑战下一关。',
    unlockText: '下一关已解锁',
    progressText: `${levelNumber} / ${levels.length}`,
  };
}

function getCampaignLevelNumber(level) {
  const index = levels.findIndex((item) => item.id === (level && level.id));
  return index >= 0 ? index + 1 : 1;
}

function createModeContext() {
  if (currentMode !== 'practice' || !state || !state.level) {
    return { mode: 'campaign' };
  }

  const option = getDifficultyOption(state.level.difficulty);

  return {
    mode: 'practice',
    label: '自由练习',
    title: `自由练习 · ${option ? option.label : '练习'}`,
  };
}

function createVictoryActions() {
  if (currentMode === 'practice') {
    return {
      restart: '再练一局',
      next: '换个难度',
    };
  }

  return {
    next: '下一关',
  };
}

function handleMenuTouch(touch) {
  if (!menuLayout) {
    return;
  }

  const hit = hitTestMenu(menuLayout, touch.clientX, touch.clientY);
  if (!hit) {
    return;
  }

  if (hit.action === 'campaign') {
    startOrContinueCampaign();
    return;
  }

  if (hit.action === 'practice') {
    startOrContinuePractice();
    return;
  }

  // Legacy actions are kept as a defensive fallback for older menu layouts.
  if (hit.action === 'continue' || hit.action === 'start') {
    startOrContinueCampaign();
    return;
  }

  if (hit.action === 'level') {
    startLevel(getLevelById(hit.levelId), 'campaign');
  }
}

function startOrContinueCampaign() {
  const restored = restoreStateFromProgress(
    getResumeableRun(savedProgress && savedProgress.activeRun),
    levels,
  );

  if (restored) {
    currentMode = 'campaign';
    state = restored;
    scene = 'playing';
    resetCompanionSession(state.level);
    stopMenuAnimation();
    render();
    return;
  }

  startLevel(levels[0], 'campaign');
}

function startOrContinuePractice() {
  const restored = restoreStateFromProgress(
    getResumeableRun(savedProgress && savedProgress.practiceRun),
    levels,
  );

  if (restored) {
    currentMode = 'practice';
    state = restored;
    scene = 'playing';
    resetCompanionSession(state.level);
    stopMenuAnimation();
    render();
    return;
  }

  scene = 'practiceDifficulty';
  stopMenuAnimation();
  refreshPracticeMenuLayout();
  render();
}

function handlePracticeMenuTouch(touch) {
  const hit =
    practiceMenuLayout && hitTestPracticeMenu(practiceMenuLayout, touch.clientX, touch.clientY);

  if (!hit) {
    return;
  }

  if (hit.action === 'back') {
    scene = 'menu';
    refreshMenuLayout();
    startMenuAnimation();
    render();
    return;
  }

  if (hit.action === 'difficulty') {
    const level = choosePracticeLevel(
      levels,
      hit.difficulty,
      savedProgress && savedProgress.practiceStats,
    );

    if (level) {
      startLevel(level, 'practice');
    }
  }
}

function startLevel(level, mode = 'campaign') {
  if (!level) {
    return;
  }

  currentMode = mode;
  state = createPuzzleState(level);
  resetCompanionSession(level);
  persistProgress();
  scene = 'playing';
  stopMenuAnimation();
  render();
}

function handleGameTouch(touch) {
  if (!layout || !state) {
    return;
  }

  const hit = hitTest(layout, touch.clientX, touch.clientY, state.completed, {
    victoryMode: currentMode,
  });
  if (!hit) {
    return;
  }

  if (hit.type === 'nav' && hit.action === 'back') {
    playSound('tool');
    persistProgress();
    scene = 'menu';
    refreshMenuLayout();
    startMenuAnimation();
    render();
    return;
  }

  if (hit.type === 'nav' && hit.action === 'practiceDifficulty' && currentMode === 'practice') {
    playSound('tool');
    persistProgress();
    scene = 'practiceDifficulty';
    refreshPracticeMenuLayout();
    render();
    return;
  }

  if (state.completed) {
    if (hit.type === 'victory') {
      applyVictoryAction(hit.action);
      render();
    }
    return;
  }

  if (hit.type === 'cell') {
    state = selectCell(state, hit.row, hit.col);
    registerCompanion('select');
    playSound('select');
    render();
    return;
  }

  if (hit.type === 'digit') {
    const previousState = state;
    const wasCompleted = state.completed;
    const wasNoteMode = state.noteMode;
    applyStateChange(() => applyDigit(state, hit.digit), true);

    if (state !== previousState && !(!wasCompleted && state.completed)) {
      registerCompanion(wasNoteMode ? 'noteDigit' : 'digit');
      playSound('input');
      render();
    }
    return;
  }

  if (hit.type === 'tool') {
    applyToolAction(hit.action);
  }
}

function applyStateChange(updateState, shouldPersist) {
  const previousState = state;
  state = updateState();

  if (didCompleteLevel(previousState, state)) {
    recordCompletedLevel();
    playSound('complete');
  }

  if (shouldPersist && state !== previousState) {
    persistProgress();
  }

  render();
}

function didCompleteLevel(previousState, nextState) {
  return Boolean(
    previousState &&
      nextState &&
      previousState.completed === false &&
      nextState.completed === true,
  );
}

function recordCompletedLevel() {
  if (!state || !state.level || !state.level.id) {
    return;
  }

  const levelId = state.level.id;
  const previous = savedProgress || {};
  const todayKey = getTodayKey();
  const nextDailyReport = createNextDailyReport(
    previous.dailyReport,
    levelId,
    todayKey,
  );
  const nextGrowthStats = recordGrowthCompletion(previous.growthStats, currentMode, todayKey);

  if (currentMode === 'practice') {
    savedProgress = {
      ...previous,
      practiceRun: null,
      completedLevelIds,
      dailyReport: nextDailyReport,
      growthStats: nextGrowthStats,
      practiceStats: recordPracticeCompletion(previous.practiceStats, state.level),
    };
    return;
  }

  completedLevelIds = Array.from(new Set([...completedLevelIds, levelId]));
  savedProgress = {
    ...previous,
    completedLevelIds,
    dailyReport: nextDailyReport,
    growthStats: nextGrowthStats,
  };
}

function persistProgress() {
  if (!state) {
    return;
  }

  const previous = savedProgress || {};
  const activeRun =
    currentMode === 'campaign'
      ? createRunFromState(state, 'campaign')
      : getResumeableRun(previous.activeRun);
  const practiceRun =
    currentMode === 'practice' && !state.completed
      ? createRunFromState(state, 'practice')
      : getResumeableRun(previous.practiceRun);

  savedProgress = createProgressFromRuns({
    activeRun,
    practiceRun,
    completedLevelIds,
    dailyReport: previous.dailyReport,
    practiceStats: previous.practiceStats || createEmptyPracticeStats(),
    growthStats: previous.growthStats,
  });
  saveProgress(platform, savedProgress);
  refreshMenuLayout();
}

function applyToolAction(action) {
  if (action === 'note') {
    applyStateChangeWithToolSound(() => toggleNoteMode(state), true, action);
    return;
  }

  if (action === 'restart') {
    confirmRestartLevel();
    return;
  }

  if (action === 'erase') {
    applyStateChangeWithToolSound(() => eraseSelected(state), true, action);
    return;
  }

}

function confirmRestartLevel() {
  if (!state || state.completed || typeof platform.showModal !== 'function') {
    return;
  }

  platform.showModal({
    title: '重新开始本局？',
    content: '要清空本局已填写内容吗？题面数字会保留。',
    confirmText: '重开',
    cancelText: '取消',
    success(result) {
      if (!result || result.confirm !== true) {
        return;
      }

      state = restartLevel(state);
      resetCompanionSession(state.level);
      persistProgress();
      playSound('tool');
      render();
    },
  });
}

function applyStateChangeWithToolSound(updateState, shouldPersist, action) {
  const previousState = state;
  applyStateChange(updateState, shouldPersist);

  if (state !== previousState) {
    registerCompanion(action);
    playSound('tool');
    render();
  }
}

function registerCompanion(action) {
  companionSession = registerCompanionAction(companionSession, state, action);
  scheduleCompanionToastExpiry();
}

function resetCompanionSession(level) {
  clearCompanionToastTimer();
  companionSession = createCompanionSession(level);
}

function clearCompanionToastTimer() {
  if (companionToastTimer) {
    clearTimeout(companionToastTimer);
    companionToastTimer = null;
  }
}

function scheduleCompanionToastExpiry() {
  clearCompanionToastTimer();

  const toast = companionSession && companionSession.currentToast;

  if (!toast) {
    return;
  }

  companionToastTimer = setTimeout(() => {
    companionToastTimer = null;
    render();
  }, Math.max(0, toast.expiresAt - Date.now()));

  if (companionToastTimer && typeof companionToastTimer.unref === 'function') {
    companionToastTimer.unref();
  }
}

function applyVictoryAction(action) {
  persistProgress();

  if (currentMode === 'practice') {
    applyPracticeVictoryAction(action);
    return;
  }

  applyCampaignVictoryAction(action);
}

function applyCampaignVictoryAction(action) {
  if (action === 'next') {
    playSound('tool');
    state = nextLevel(state);
    resetCompanionSession(state.level);
    persistProgress();
  }
}

function applyPracticeVictoryAction(action) {
  if (action === 'restart') {
    playSound('tool');
    const level = choosePracticeLevel(
      levels,
      state.level.difficulty,
      savedProgress && savedProgress.practiceStats,
    );
    state = createPuzzleState(level || state.level);
    resetCompanionSession(state.level);
    persistProgress();
    return;
  }

  if (action === 'next') {
    playSound('tool');
    scene = 'practiceDifficulty';
    refreshPracticeMenuLayout();
  }
}

function startMenuAnimation() {
  if (menuAnimationFrame || scene !== 'menu') {
    return;
  }

  menuAnimationStartedAt = Date.now();
  startMenuTiltTracking();
  scheduleMenuAnimationFrame();
}

function scheduleMenuAnimationFrame() {
  menuAnimationFrame = requestFrame(() => {
    menuAnimationFrame = null;

    if (scene !== 'menu') {
      return;
    }

    render();
    scheduleMenuAnimationFrame();
  });
}

function stopMenuAnimation() {
  if (!menuAnimationFrame) {
    stopMenuTiltTracking();
    return;
  }

  cancelFrame(menuAnimationFrame);
  menuAnimationFrame = null;
  stopMenuTiltTracking();
}

function startMenuTiltTracking() {
  if (
    menuAccelerometerActive ||
    typeof platform.startAccelerometer !== 'function' ||
    typeof platform.onAccelerometerChange !== 'function'
  ) {
    return;
  }

  menuAccelerometerHandler = (motion) => {
    menuTilt = normalizeMenuTilt(motion);
  };

  try {
    platform.onAccelerometerChange(menuAccelerometerHandler);
    platform.startAccelerometer({ interval: 'game' });
    menuAccelerometerActive = true;
  } catch (error) {
    stopMenuTiltTracking();
  }
}

function stopMenuTiltTracking() {
  if (!menuAccelerometerActive) {
    menuTilt = { x: 0, y: 0 };
    menuAccelerometerHandler = null;
    return;
  }

  if (typeof platform.offAccelerometerChange === 'function' && menuAccelerometerHandler) {
    platform.offAccelerometerChange(menuAccelerometerHandler);
  }

  if (typeof platform.stopAccelerometer === 'function') {
    platform.stopAccelerometer();
  }

  menuTilt = { x: 0, y: 0 };
  menuAccelerometerHandler = null;
  menuAccelerometerActive = false;
}

function normalizeMenuTilt(motion) {
  return {
    x: clampTilt(motion && motion.x),
    y: clampTilt(motion && motion.y),
  };
}

function clampTilt(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
}

function requestFrame(callback) {
  return platform.requestAnimationFrame(callback);
}

function cancelFrame(frame) {
  platform.cancelAnimationFrame(frame);
}

function playSound(name) {
  if (soundManager) {
    soundManager.play(name);
  }
}

return {
  boot,
};
}

module.exports = {
  createAppRuntime,
};
