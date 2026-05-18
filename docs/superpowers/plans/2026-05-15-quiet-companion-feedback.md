# 安静陪伴系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为中后段数独长局增加低打扰情绪价值反馈，包括静默里程碑、专注时长提示、环境氛围变化和长局通关文案。

**Architecture:** 新增 `minigame/src/companion-feedback.js` 承担纯逻辑：判断适用难度、计算填入进度、生成局内 toast、计算氛围等级和通关反馈分层。`game.js` 只负责记录运行时状态并把 `companionFeedback` 传给 renderer；`renderer.js` 只负责绘制提示和氛围。`derust.js` 继续负责完成反馈，但增加可选 `sessionDurationMs` 参数以生成长局版本。

**Tech Stack:** 微信小游戏 Canvas、CommonJS、Node `node:test`。

---

## File Structure

- Create: `minigame/src/companion-feedback.js`
  - 负责安静陪伴系统的纯函数，不依赖 Canvas 和 `wx`。
- Create: `minigame/test/companion-feedback.test.cjs`
  - 覆盖触发条件、频率限制、文案安全和氛围等级。
- Modify: `minigame/src/derust.js`
  - 为 `createCompletionFeedback` 增加可选 `sessionDurationMs`，根据时长替换标题、副标题和第二张统计卡。
- Modify: `minigame/test/derust.test.cjs`
  - 覆盖长局通关反馈分层和医疗/过程判断词安全。
- Modify: `minigame/game.js`
  - 记录 `companionSession`，在有效操作后尝试生成 toast，在 render 时传入 `companionFeedback`。
- Modify: `minigame/src/renderer.js`
  - 绘制环境氛围和轻提示条。
- Modify: `minigame/test/game-runtime.test.cjs`
  - 覆盖 normal/hard 关卡运行时会传递陪伴反馈，但不会影响 intro/easy 基础流。
- Modify: `minigame/test/renderer.test.cjs`
  - 覆盖 toast 绘制、氛围非红色、提示不遮挡棋盘。
- Modify: `minigame/tools/render-snapshots.js`
  - 为视觉快照提供一个示例 `companionFeedback`，方便 QA。

> 当前目录不是 git 仓库，执行时不写 commit 步骤；每个任务以测试命令作为检查点。

---

### Task 1: Companion Feedback Pure Logic

**Files:**
- Create: `minigame/src/companion-feedback.js`
- Create: `minigame/test/companion-feedback.test.cjs`

- [ ] **Step 1: Write the failing tests**

Add `minigame/test/companion-feedback.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const {
  createCompanionSession,
  createCompanionView,
  registerCompanionAction,
} = require('../src/companion-feedback');
const { createPuzzleState } = require('../src/puzzle');

test('registerCompanionAction creates milestone toast only for normal and hard levels', () => {
  const easyState = createPuzzleState(levels[3]);
  const normalState = withFilledMutableCells(createPuzzleState(levels[6]), 5);
  const easySession = createCompanionSession(easyState.level, 0);
  const normalSession = createCompanionSession(normalState.level, 0);

  assert.equal(registerCompanionAction(easySession, easyState, 'digit', 1000).currentToast, null);
  assert.match(
    registerCompanionAction(normalSession, normalState, 'digit', 1000).currentToast.text,
    /线索|推理|大脑|观察|专注|齿轮/,
  );
});

test('registerCompanionAction caps to five toasts and does not repeat the same key', () => {
  let session = createCompanionSession(levels[9], 0);
  const state = withFilledMutableCells(createPuzzleState(levels[9]), 60);

  [1000, 2000, 180000, 420000, 720000, 1200000, 1500000].forEach((now) => {
    session = registerCompanionAction(session, state, 'digit', now);
  });

  assert.equal(session.feedbackCount, 5);
  assert.equal(new Set(session.shownFeedbackKeys).size, session.shownFeedbackKeys.length);
});

test('createCompanionView computes atmosphere from filled progress without red error colors', () => {
  const low = createCompanionView(createPuzzleState(levels[6]), createCompanionSession(levels[6], 0), 0);
  const highState = withFilledMutableCells(createPuzzleState(levels[6]), 24);
  const high = createCompanionView(highState, createCompanionSession(levels[6], 0), 0);

  assert.equal(low.atmosphere.level, 'calm');
  assert.equal(high.atmosphere.level, 'amber');
  assert.equal(/red|error|#d85d57/i.test(JSON.stringify(high.atmosphere)), false);
});

test('companion copy avoids process judgment and medical claim wording', () => {
  let session = createCompanionSession(levels[9], 0);
  const state = withFilledMutableCells(createPuzzleState(levels[9]), 60);

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
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
node --test minigame/test/companion-feedback.test.cjs
```

Expected: FAIL with `Cannot find module '../src/companion-feedback'`.

- [ ] **Step 3: Implement minimal pure logic**

Create `minigame/src/companion-feedback.js` with:

```js
const MAX_TOASTS_PER_SESSION = 5;
const TOAST_DURATION_MS = 1800;
const RECENT_ACTION_WINDOW_MS = 60 * 1000;

const MILESTONE_COPY = {
  fill5: '线索开始连起来了',
  progress25: '这一步很像真正的推理',
  progress50: '大脑正在把混乱拆成秩序',
  progress75: '观察有效，继续慢慢收束',
  noteReturn: '这一段专注很扎实',
};

const TIME_COPY = {
  focus3: '已专注 3 分钟，大脑开始热机',
  focus7: '进入深水区了，慢慢来',
  focus12: '持续观察本身就是训练',
  focus20: '这一局不是快题，是耐力题',
};

function createCompanionSession(level, now = Date.now()) {
  return {
    levelId: level && level.id,
    difficulty: level && level.difficulty,
    startedAt: now,
    lastActionAt: now,
    shownFeedbackKeys: [],
    feedbackCount: 0,
    currentToast: null,
    toastHistory: [],
    usedNoteMode: false,
  };
}

function registerCompanionAction(session, state, action, now = Date.now()) {
  const base = normalizeSession(session, state, now);
  const usedNoteMode = base.usedNoteMode || action === 'note';
  const nextBase = { ...base, lastActionAt: now, usedNoteMode };

  if (!isCompanionLevel(state && state.level)) {
    return { ...nextBase, currentToast: null };
  }

  const key = chooseToastKey(nextBase, state, action, now);
  if (!key || nextBase.feedbackCount >= MAX_TOASTS_PER_SESSION || nextBase.shownFeedbackKeys.includes(key)) {
    return { ...nextBase, currentToast: expireToast(nextBase.currentToast, now) };
  }

  const text = MILESTONE_COPY[key] || TIME_COPY[key];
  const toast = { key, text, createdAt: now, expiresAt: now + TOAST_DURATION_MS };

  return {
    ...nextBase,
    currentToast: toast,
    shownFeedbackKeys: [...nextBase.shownFeedbackKeys, key],
    feedbackCount: nextBase.feedbackCount + 1,
    toastHistory: [...nextBase.toastHistory, toast],
  };
}

function createCompanionView(state, session, now = Date.now()) {
  return {
    toast: session ? expireToast(session.currentToast, now) : null,
    atmosphere: createAtmosphere(state),
  };
}

function chooseToastKey(session, state, action, now) {
  const progress = getFillProgress(state);
  const elapsed = now - session.startedAt;
  const recent = now - session.lastActionAt <= RECENT_ACTION_WINDOW_MS;

  if (session.usedNoteMode && action === 'digit' && !session.shownFeedbackKeys.includes('noteReturn')) {
    return 'noteReturn';
  }

  if (progress.filledByPlayer >= 5) {
    return 'fill5';
  }

  if (progress.ratio >= 0.75) {
    return 'progress75';
  }

  if (progress.ratio >= 0.5) {
    return 'progress50';
  }

  if (progress.ratio >= 0.25) {
    return 'progress25';
  }

  if (recent && state.level.difficulty === 'hard' && elapsed >= 20 * 60 * 1000) {
    return 'focus20';
  }

  if (recent && elapsed >= 12 * 60 * 1000) {
    return 'focus12';
  }

  if (recent && elapsed >= 7 * 60 * 1000) {
    return 'focus7';
  }

  if (recent && elapsed >= 3 * 60 * 1000) {
    return 'focus3';
  }

  return null;
}

function createAtmosphere(state) {
  const { ratio } = getFillProgress(state);

  if (ratio >= 0.75) {
    return { level: 'amber', progressRatio: ratio, tint: 'rgba(255, 200, 97, 0.14)' };
  }

  if (ratio >= 0.5) {
    return { level: 'glow', progressRatio: ratio, tint: 'rgba(22, 163, 160, 0.14)' };
  }

  if (ratio >= 0.25) {
    return { level: 'teal', progressRatio: ratio, tint: 'rgba(22, 163, 160, 0.08)' };
  }

  return { level: 'calm', progressRatio: ratio, tint: 'rgba(22, 163, 160, 0)' };
}

function getFillProgress(state) {
  if (!state || !Array.isArray(state.cells)) {
    return { filledByPlayer: 0, emptyTotal: 0, ratio: 0 };
  }

  let emptyTotal = 0;
  let filledByPlayer = 0;

  state.cells.forEach((row) => {
    row.forEach((cell) => {
      if (!cell.fixed) {
        emptyTotal += 1;
        if (cell.value !== 0) {
          filledByPlayer += 1;
        }
      }
    });
  });

  return {
    filledByPlayer,
    emptyTotal,
    ratio: emptyTotal > 0 ? filledByPlayer / emptyTotal : 0,
  };
}

function normalizeSession(session, state, now) {
  if (!session || session.levelId !== (state && state.level && state.level.id)) {
    return createCompanionSession(state && state.level, now);
  }

  return session;
}

function expireToast(toast, now) {
  if (!toast || toast.expiresAt <= now) {
    return null;
  }

  return toast;
}

function isCompanionLevel(level) {
  return Boolean(level && (level.difficulty === 'normal' || level.difficulty === 'hard'));
}

module.exports = {
  MAX_TOASTS_PER_SESSION,
  createCompanionSession,
  createCompanionView,
  getFillProgress,
  registerCompanionAction,
};
```

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
node --test minigame/test/companion-feedback.test.cjs
```

Expected: PASS.

---

### Task 2: Long-Session Completion Feedback

**Files:**
- Modify: `minigame/src/derust.js`
- Modify: `minigame/test/derust.test.cjs`

- [ ] **Step 1: Write failing tests**

Append to `minigame/test/derust.test.cjs`:

```js
test('createCompletionFeedback adapts completion copy for long sessions', () => {
  const state = {
    ...createPuzzleState(levels[9]),
    completed: true,
  };

  const stable = createCompletionFeedback(state, [], null, '2026-05-14', 8 * 60 * 1000);
  const deep = createCompletionFeedback(state, [], null, '2026-05-14', 14 * 60 * 1000);
  const endurance = createCompletionFeedback(state, [], null, '2026-05-14', 22 * 60 * 1000);

  assert.equal(stable.title, '稳定除锈完成');
  assert.deepEqual(stable.stats[1], { label: '训练类型', value: '稳定推理' });
  assert.equal(deep.title, '深度除锈完成');
  assert.deepEqual(deep.stats[1], { label: '训练类型', value: '深度推理' });
  assert.equal(endurance.title, '推理马拉松完成');
  assert.deepEqual(endurance.stats[1], { label: '训练类型', value: '耐力推理' });
});

test('long-session completion copy avoids speed pressure and medical claims', () => {
  const state = {
    ...createPuzzleState(levels[9]),
    completed: true,
  };
  const feedback = createCompletionFeedback(state, [], null, '2026-05-14', 22 * 60 * 1000);
  const copy = [feedback.title, feedback.subtitle, ...feedback.stats.map((stat) => `${stat.label} ${stat.value}`)].join(' ');

  assert.equal(/太慢|用时过长|落后|老年痴呆|阿尔茨海默|医学|疾病/.test(copy), false);
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
node --test minigame/test/derust.test.cjs
```

Expected: FAIL because `createCompletionFeedback` ignores the fifth `sessionDurationMs` argument.

- [ ] **Step 3: Implement duration tier in `derust.js`**

Modify `createCompletionFeedback` signature:

```js
function createCompletionFeedback(
  state,
  completedLevelIds = [],
  dailyReport = null,
  todayKey = getTodayKey(),
  sessionDurationMs = 0,
) {
```

Add helper:

```js
function createDurationCompletionCopy(sessionDurationMs) {
  if (sessionDurationMs >= 20 * 60 * 1000) {
    return {
      title: '推理马拉松完成',
      subtitle: '这一局值得记一笔，耐心也在发光。',
      secondStat: { label: '训练类型', value: '耐力推理' },
    };
  }

  if (sessionDurationMs >= 12 * 60 * 1000) {
    return {
      title: '深度除锈完成',
      subtitle: '你完成了一场安静的推理马拉松。',
      secondStat: { label: '训练类型', value: '深度推理' },
    };
  }

  if (sessionDurationMs >= 5 * 60 * 1000) {
    return {
      title: '稳定除锈完成',
      subtitle: '这不是快局，这是一次完整脑力拉伸。',
      secondStat: { label: '训练类型', value: '稳定推理' },
    };
  }

  return {
    title: DERUST_COPY.completionTitle,
    subtitle: DERUST_COPY.subtitle,
    secondStat: { label: DERUST_COPY.activationStatLabel, value: DERUST_COPY.activationStatValue },
  };
}
```

Use the helper in return value:

```js
const durationCopy = createDurationCompletionCopy(sessionDurationMs);

return {
  label: DERUST_COPY.completionLabel,
  title: durationCopy.title,
  deltaText: formatSignedPercent(DERUST_STEP),
  metricLabel: DERUST_COPY.metricLabel,
  subtitle: durationCopy.subtitle,
  disclaimer: DERUST_DISCLAIMER,
  stats: [
    { label: DERUST_COPY.todayStatLabel, value: `${todayCompletionCount} 次` },
    durationCopy.secondStat,
  ],
  totalText: `累计除锈 ${formatPercent(completionCount * DERUST_STEP)}`,
};
```

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
node --test minigame/test/derust.test.cjs
```

Expected: PASS.

---

### Task 3: Runtime Integration

**Files:**
- Modify: `minigame/game.js`
- Modify: `minigame/test/game-runtime.test.cjs`

- [ ] **Step 1: Write failing runtime test**

Update the renderer patch in `bootGameRuntime` so captured game render calls include `options.companionFeedback`. Add:

```js
companionFeedback: options && options.companionFeedback,
completionFeedback: options && options.completionFeedback,
```

Add test:

```js
test('runtime passes quiet companion feedback for later levels without changing answer feedback', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    completePuzzleWithTouchInput(runtime);
    tapVictoryNext(runtime);
    tapVictoryNext(runtime);
    tapVictoryNext(runtime);
    tapVictoryNext(runtime);
    tapVictoryNext(runtime);
    tapVictoryNext(runtime);

    tapMutableCell(runtime, 0, 0);
    tapDigit(runtime, runtime.latestGameCall().state.solution[0][0]);

    const game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'normal');
    assert.ok(game.companionFeedback);
    assert.equal(runtime.soundPlayCount('error'), 0);
  } finally {
    runtime.restore();
  }
});
```

Add helper:

```js
function tapVictoryNext(runtime) {
  const game = runtime.latestGameCall();
  const next = game.layout.victory.next;
  runtime.touch(next.x + next.width / 2, next.y + next.height / 2);
}
```

- [ ] **Step 2: Run test to verify red**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: FAIL because `options.companionFeedback` is missing.

- [ ] **Step 3: Wire companion session into `game.js`**

Import:

```js
const {
  createCompanionSession,
  createCompanionView,
  registerCompanionAction,
} = require('./src/companion-feedback');
```

Add module state:

```js
let companionSession = null;
```

In `startLevel(level)` after `state = createPuzzleState(level);`:

```js
companionSession = createCompanionSession(level);
```

When restoring from progress in `boot()`:

```js
companionSession = createCompanionSession(state.level);
```

In `renderGame` options:

```js
companionFeedback: createCompanionView(state, companionSession),
completionFeedback: state.completed
  ? createCompletionFeedback(
      state,
      completedLevelIds,
      savedProgress && savedProgress.dailyReport,
      getTodayKey(),
      companionSession ? Date.now() - companionSession.startedAt : 0,
    )
  : null,
```

After each effective action, call:

```js
function registerCompanion(action) {
  companionSession = registerCompanionAction(companionSession, state, action);
}
```

Use `registerCompanion('select')` after selecting a cell, `registerCompanion('digit')` after digit changes, and `registerCompanion('note' | 'undo' | 'erase')` in tool actions when state changes.

In `applyVictoryAction`, after assigning next/retry state:

```js
companionSession = createCompanionSession(state.level);
```

- [ ] **Step 4: Run runtime tests**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: PASS.

---

### Task 4: Renderer Integration

**Files:**
- Modify: `minigame/src/renderer.js`
- Modify: `minigame/test/renderer.test.cjs`
- Modify: `minigame/tools/render-snapshots.js`

- [ ] **Step 1: Write failing renderer tests**

Add to `minigame/test/renderer.test.cjs`:

```js
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
  const toastTextCall = ctx.calls.find((call) => call.name === 'fillText' && call.args[0] === '线索开始连起来了');
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
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
node --test minigame/test/renderer.test.cjs
```

Expected: FAIL because renderer ignores `companionFeedback`.

- [ ] **Step 3: Implement renderer drawing**

In `renderGame`, add `companionFeedback` to `viewLayout`:

```js
companionFeedback: options.companionFeedback,
```

After `drawBackground(ctx, viewLayout);`, call:

```js
drawCompanionAtmosphere(ctx, viewLayout);
```

After `drawRuleStrip(ctx, viewLayout);`, call:

```js
drawCompanionToast(ctx, viewLayout);
```

Add functions:

```js
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
  const y = layout.ruleStrip.y + layout.ruleStrip.height + 4;

  roundRect(ctx, x, y, width, 26, 13, 'rgba(11, 36, 29, 0.78)');
  ctx.fillStyle = 'rgba(246, 255, 244, 0.92)';
  ctx.font = '850 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(toast.text, layout.width / 2, y + 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
```

Update `minigame/tools/render-snapshots.js` gameplay render options:

```js
renderGame(ctx, gameplayState, gameplayLayout, {
  companionFeedback: {
    toast: { text: '线索开始连起来了' },
    atmosphere: { level: 'teal', tint: 'rgba(22, 163, 160, 0.08)' },
  },
});
```

- [ ] **Step 4: Run renderer tests**

Run:

```bash
node --test minigame/test/renderer.test.cjs minigame/test/visual-snapshots.test.cjs
```

Expected: PASS.

---

### Task 5: Full Verification

**Files:**
- Modify: `minigame/README.md`
- Generated: `minigame/artifacts/visual/menu.svg`
- Generated: `minigame/artifacts/visual/gameplayDebug.svg`
- Generated: `minigame/artifacts/visual/victory.svg`

- [ ] **Step 1: Update README**

Add one bullet under Current Scope:

```md
- Quiet companion feedback for mid/late levels: low-interruption milestone copy, focus-time encouragement, calm atmosphere changes, and long-session completion copy.
```

- [ ] **Step 2: Run full tests**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: all tests pass, with no failures.

- [ ] **Step 3: Regenerate visual snapshots**

Run:

```bash
node minigame/tools/render-snapshots.js
```

Expected: writes:

```text
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/menu.svg
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/gameplayDebug.svg
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/victory.svg
```

- [ ] **Step 4: Generate WeChat preview**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /private/tmp/lab-lines-sudoku-quiet-companion-preview.png --info-output /private/tmp/lab-lines-sudoku-quiet-companion-preview.json
```

Expected: `✔ preview` and package size table.

- [ ] **Step 5: Scan for forbidden copy**

Run:

```bash
rg -n "正确|错误|快完成|还差|老年痴呆|阿尔茨海默|医学证明|患病概率" minigame/src minigame/test minigame/tools minigame/README.md
```

Expected: matches only in tests that assert forbidden copy is absent, or no matches.
