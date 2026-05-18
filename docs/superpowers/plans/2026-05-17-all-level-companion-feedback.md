# 全关卡安静陪伴系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有只面向 `normal/hard` 的安静陪伴系统扩展到所有关卡，并为 `intro/easy` 提供更轻、更教学友好的陪伴强度和完成反馈。

**Architecture:** `minigame/src/companion-feedback.js` 继续承担局内陪伴纯逻辑，但新增按难度生成的 companion profile，统一控制提示上限、里程碑、专注时长和文案池。`minigame/src/derust.js` 继续承担通关反馈，但根据关卡阶段和时长选择前段或中后段文案。`game.js` 的接入方式保持不变，主要通过纯逻辑和渲染测试保护行为。

**Tech Stack:** WeChat Mini Game Canvas runtime, CommonJS modules, Node.js built-in test runner (`node:test`), existing Canvas mock tests.

---

## File Structure

- Modify: `minigame/src/companion-feedback.js`
  - 新增 `getCompanionProfile(level)`、按难度分层的提示上限、里程碑、专注时长和文案。
  - 移除 `isCompanionLevel()` 对 `normal/hard` 的硬限制。
  - 保留纯函数接口：`createCompanionSession`、`registerCompanionAction`、`createCompanionView`。
- Modify: `minigame/test/companion-feedback.test.cjs`
  - 将旧的“仅 normal/hard 生成提示”测试改为“所有关卡可生成陪伴，但强度不同”。
  - 增加 `intro`、`easy` 的提示次数、时间提示和文案安全测试。
- Modify: `minigame/src/derust.js`
  - 让 `createCompletionFeedback()` 根据 `state.level.difficulty` 和 `sessionDurationMs` 选择前段或中后段完成文案。
- Modify: `minigame/test/derust.test.cjs`
  - 增加前段长局完成反馈测试。
  - 保留中后段长局反馈测试。
- Modify: `minigame/test/game-runtime.test.cjs`
  - 将运行时测试从“later levels”扩展为首关也能收到轻陪伴反馈。
- Modify: `minigame/README.md`
  - 更新当前范围描述，从“mid/late levels”改为“all levels with intensity tiers”。
  - 同步工具栏说明中 `撤销` 到当前 `重开` 设定。

---

### Task 1: Companion Profile And All-Level Session Logic

**Files:**
- Modify: `minigame/test/companion-feedback.test.cjs`
- Modify: `minigame/src/companion-feedback.js`

- [ ] **Step 1: Write failing tests for all-level companion profiles**

Replace the first test in `minigame/test/companion-feedback.test.cjs` with:

```javascript
test('registerCompanionAction creates tiered milestone toasts for every difficulty', () => {
  const introState = withFilledMutableCells(createPuzzleState(levels[0]), 3);
  const easyState = withFilledMutableCells(createPuzzleState(levels[3]), 5);
  const normalState = withFilledMutableCells(createPuzzleState(levels[6]), 5);
  const hardState = withFilledMutableCells(createPuzzleState(levels[9]), 5);

  const introToast = registerCompanionAction(createCompanionSession(introState.level, 0), introState, 'digit', 1000).currentToast;
  const easyToast = registerCompanionAction(createCompanionSession(easyState.level, 0), easyState, 'digit', 1000).currentToast;
  const normalToast = registerCompanionAction(createCompanionSession(normalState.level, 0), normalState, 'digit', 1000).currentToast;
  const hardToast = registerCompanionAction(createCompanionSession(hardState.level, 0), hardState, 'digit', 1000).currentToast;

  assert.match(introToast.text, /观察|节奏|线索|推理|草稿|状态/);
  assert.match(easyToast.text, /观察|节奏|线索|推理|草稿|状态/);
  assert.match(normalToast.text, /线索|推理|大脑|观察|专注|齿轮/);
  assert.match(hardToast.text, /线索|推理|大脑|观察|专注|齿轮/);
});
```

Add this test below the cap test:

```javascript
test('front levels use lower per-session toast limits', () => {
  let introSession = createCompanionSession(levels[0], 0);
  let easySession = createCompanionSession(levels[3], 0);
  const introState = withFilledMutableCells(createPuzzleState(levels[0]), 60);
  const easyState = withFilledMutableCells(createPuzzleState(levels[3]), 60);

  [1000, 12000, 24000, 180000, 420000, 720000].forEach((now) => {
    introSession = registerCompanionAction(introSession, introState, 'digit', now);
    easySession = registerCompanionAction(easySession, easyState, 'digit', now);
  });

  assert.equal(introSession.feedbackCount, 2);
  assert.equal(easySession.feedbackCount, 3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test minigame/test/companion-feedback.test.cjs
```

Expected: FAIL because `intro/easy` currently do not create toast feedback and all sessions still share `MAX_TOASTS_PER_SESSION = 5`.

- [ ] **Step 3: Implement companion profiles**

In `minigame/src/companion-feedback.js`, add profile constants near the top:

```javascript
const COMPANION_PROFILES = {
  intro: {
    intensity: 'minimal',
    maxToasts: 2,
    milestoneKeys: ['fill3', 'noteReturn'],
    timeKeys: [],
    copyTone: 'front',
    atmosphere: 'minimal',
  },
  easy: {
    intensity: 'light',
    maxToasts: 3,
    milestoneKeys: ['fill5', 'progress50', 'noteReturn'],
    timeKeys: ['focus3'],
    copyTone: 'front',
    atmosphere: 'light',
  },
  normal: {
    intensity: 'standard',
    maxToasts: 5,
    milestoneKeys: ['fill5', 'progress25', 'progress50', 'progress75', 'noteReturn'],
    timeKeys: ['focus3', 'focus7', 'focus12'],
    copyTone: 'standard',
    atmosphere: 'standard',
  },
  hard: {
    intensity: 'full',
    maxToasts: 5,
    milestoneKeys: ['fill5', 'progress25', 'progress50', 'progress75', 'noteReturn'],
    timeKeys: ['focus3', 'focus7', 'focus12', 'focus20'],
    copyTone: 'standard',
    atmosphere: 'standard',
  },
};
```

Add front copy and keep existing standard copy:

```javascript
const FRONT_MILESTONE_COPY = {
  fill3: '先观察，再落子',
  fill5: '这一步是在建立节奏',
  progress50: '格子开始有线索了',
  noteReturn: '草稿用得很像实验记录',
};

const FRONT_TIME_COPY = {
  focus3: '已专注 3 分钟，节奏很稳',
};
```

Replace `isCompanionLevel()` usage with profile checks:

```javascript
function getCompanionProfile(level) {
  return (
    level &&
    COMPANION_PROFILES[level.difficulty]
  ) || COMPANION_PROFILES.intro;
}
```

Update `createCompanionSession()` to include `companionIntensity`:

```javascript
function createCompanionSession(level, now = Date.now()) {
  const profile = getCompanionProfile(level);

  return {
    levelId: level && level.id,
    difficulty: level && level.difficulty,
    companionIntensity: profile.intensity,
    startedAt: now,
    lastActionAt: now,
    shownFeedbackKeys: [],
    feedbackCount: 0,
    currentToast: null,
    toastHistory: [],
    lastToastAt: 0,
    usedNoteMode: false,
  };
}
```

In `registerCompanionAction()`, compute profile and use its cap:

```javascript
const profile = getCompanionProfile(state && state.level);
```

Replace:

```javascript
nextBase.feedbackCount >= MAX_TOASTS_PER_SESSION
```

with:

```javascript
nextBase.feedbackCount >= profile.maxToasts
```

Change `chooseToastKey()` and `getEligibleToastKeys()` signatures to accept `profile`:

```javascript
const key = chooseToastKey(nextBase, state, action, now, profile);
```

```javascript
function chooseToastKey(session, state, action, now, profile) {
  const candidates = getEligibleToastKeys(session, state, action, now, profile);
  return candidates.find((key) => !session.shownFeedbackKeys.includes(key)) || null;
}
```

- [ ] **Step 4: Implement profile-aware eligible keys and copy**

Replace `getEligibleToastKeys()` body with:

```javascript
function getEligibleToastKeys(session, state, action, now, profile) {
  const progress = getFillProgress(state);
  const elapsed = now - session.startedAt;
  const recentAction = now - session.lastActionAt <= RECENT_ACTION_WINDOW_MS;
  const keys = [];

  if (profile.milestoneKeys.includes('noteReturn') && session.usedNoteMode && action === 'digit') {
    keys.push('noteReturn');
  }

  if (profile.milestoneKeys.includes('fill3') && progress.filledByPlayer >= 3) {
    keys.push('fill3');
  }

  if (profile.milestoneKeys.includes('fill5') && progress.filledByPlayer >= 5) {
    keys.push('fill5');
  }

  if (profile.milestoneKeys.includes('progress25') && progress.ratio >= 0.25) {
    keys.push('progress25');
  }

  if (profile.milestoneKeys.includes('progress50') && progress.ratio >= 0.5) {
    keys.push('progress50');
  }

  if (profile.milestoneKeys.includes('progress75') && progress.ratio >= 0.75) {
    keys.push('progress75');
  }

  if (recentAction && profile.timeKeys.includes('focus3') && elapsed >= 3 * 60 * 1000) {
    keys.push('focus3');
  }

  if (recentAction && profile.timeKeys.includes('focus7') && elapsed >= 7 * 60 * 1000) {
    keys.push('focus7');
  }

  if (recentAction && profile.timeKeys.includes('focus12') && elapsed >= 12 * 60 * 1000) {
    keys.push('focus12');
  }

  if (recentAction && profile.timeKeys.includes('focus20') && elapsed >= 20 * 60 * 1000) {
    keys.push('focus20');
  }

  return keys;
}
```

Change toast creation to pass profile:

```javascript
const toast = createToast(key, now, profile);
```

Replace `createToast()` with:

```javascript
function createToast(key, now, profile) {
  const milestoneCopy = profile.copyTone === 'front' ? FRONT_MILESTONE_COPY : MILESTONE_COPY;
  const timeCopy = profile.copyTone === 'front' ? FRONT_TIME_COPY : TIME_COPY;

  return {
    key,
    text: milestoneCopy[key] || timeCopy[key],
    createdAt: now,
    expiresAt: now + TOAST_DURATION_MS,
  };
}
```

- [ ] **Step 5: Run companion tests**

Run:

```bash
node --test minigame/test/companion-feedback.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Inspect changed files**

Run:

```bash
sed -n '1,280p' minigame/src/companion-feedback.js
sed -n '1,180p' minigame/test/companion-feedback.test.cjs
```

Expected: `intro/easy/normal/hard` all have explicit profiles; no `isCompanionLevel()` gate remains.

---

### Task 2: Profile-Aware Atmosphere

**Files:**
- Modify: `minigame/test/companion-feedback.test.cjs`
- Modify: `minigame/src/companion-feedback.js`

- [ ] **Step 1: Write failing atmosphere tests for front levels**

Replace the existing `createCompanionView computes atmosphere...` test with:

```javascript
test('createCompanionView computes tiered atmosphere without red error colors', () => {
  const introHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(levels[0]), 60),
    createCompanionSession(levels[0], 0),
    0,
  );
  const easyHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(levels[3]), 60),
    createCompanionSession(levels[3], 0),
    0,
  );
  const normalHigh = createCompanionView(
    withFilledMutableCells(createPuzzleState(levels[6]), 60),
    createCompanionSession(levels[6], 0),
    0,
  );

  assert.equal(introHigh.atmosphere.level, 'teal');
  assert.match(introHigh.atmosphere.tint, /0\.04/);
  assert.equal(easyHigh.atmosphere.level, 'glow');
  assert.equal(normalHigh.atmosphere.level, 'amber');
  assert.equal(/red|error|#d85d57/i.test(JSON.stringify([introHigh, easyHigh, normalHigh])), false);
});
```

- [ ] **Step 2: Run the atmosphere test and verify failure**

Run:

```bash
node --test minigame/test/companion-feedback.test.cjs
```

Expected: FAIL because current `createCompanionView()` still treats non-companion levels as calm.

- [ ] **Step 3: Implement profile-aware atmosphere**

Update `createCompanionView()`:

```javascript
function createCompanionView(state, session, now = Date.now()) {
  const profile = getCompanionProfile(state && state.level);

  return {
    toast: session ? expireToast(session.currentToast, now) : null,
    atmosphere: createAtmosphere(state, profile),
  };
}
```

Update `createAtmosphere()` signature and front-level behavior:

```javascript
function createAtmosphere(state, profile = COMPANION_PROFILES.normal) {
  const { ratio } = getFillProgress(state);

  if (profile.atmosphere === 'minimal') {
    return {
      level: ratio >= 0.25 ? 'teal' : 'calm',
      progressRatio: ratio,
      tint: ratio >= 0.25 ? 'rgba(22, 163, 160, 0.04)' : 'rgba(22, 163, 160, 0)',
    };
  }

  if (profile.atmosphere === 'light') {
    if (ratio >= 0.5) {
      return {
        level: 'glow',
        progressRatio: ratio,
        tint: 'rgba(22, 163, 160, 0.10)',
      };
    }

    if (ratio >= 0.25) {
      return {
        level: 'teal',
        progressRatio: ratio,
        tint: 'rgba(22, 163, 160, 0.06)',
      };
    }

    return {
      level: 'calm',
      progressRatio: ratio,
      tint: 'rgba(22, 163, 160, 0)',
    };
  }

  if (ratio >= 0.75) {
    return {
      level: 'amber',
      progressRatio: ratio,
      tint: 'rgba(255, 200, 97, 0.14)',
    };
  }

  if (ratio >= 0.5) {
    return {
      level: 'glow',
      progressRatio: ratio,
      tint: 'rgba(22, 163, 160, 0.14)',
    };
  }

  if (ratio >= 0.25) {
    return {
      level: 'teal',
      progressRatio: ratio,
      tint: 'rgba(22, 163, 160, 0.08)',
    };
  }

  return {
    level: 'calm',
    progressRatio: ratio,
    tint: 'rgba(22, 163, 160, 0)',
  };
}
```

Remove `createCalmAtmosphere()` if it is no longer referenced.

- [ ] **Step 4: Run companion tests**

Run:

```bash
node --test minigame/test/companion-feedback.test.cjs
```

Expected: PASS.

---

### Task 3: Front-Level Completion Feedback

**Files:**
- Modify: `minigame/test/derust.test.cjs`
- Modify: `minigame/src/derust.js`

- [ ] **Step 1: Write failing completion feedback tests**

Add these tests near the existing long-session completion tests in `minigame/test/derust.test.cjs`:

```javascript
test('front-level completion copy adapts long sessions without sounding like a hard marathon', () => {
  const introState = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };

  const feedback = createCompletionFeedback(introState, ['lab-01'], null, '2026-05-14', 6 * 60 * 1000);

  assert.equal(feedback.title, '热身除锈完成');
  assert.equal(feedback.subtitle, '节奏建立起来了，下一局会更顺。');
  assert.deepEqual(feedback.stats, [
    { label: '今日训练', value: '1 次' },
    { label: '训练类型', value: '热身推理' },
  ]);
});

test('mid-late completion copy keeps deeper long-session language', () => {
  const normalState = {
    ...createPuzzleState(levels[6]),
    completed: true,
  };

  const feedback = createCompletionFeedback(normalState, ['lab-07'], null, '2026-05-14', 13 * 60 * 1000);

  assert.equal(feedback.title, '深度除锈完成');
  assert.deepEqual(feedback.stats[1], { label: '训练类型', value: '深度推理' });
});
```

- [ ] **Step 2: Run derust tests and verify failure**

Run:

```bash
node --test minigame/test/derust.test.cjs
```

Expected: FAIL because `createDurationCompletionCopy()` currently does not inspect difficulty.

- [ ] **Step 3: Pass level into duration copy**

In `createCompletionFeedback()`, replace:

```javascript
const durationCopy = createDurationCompletionCopy(sessionDurationMs);
```

with:

```javascript
const durationCopy = createDurationCompletionCopy(sessionDurationMs, state && state.level);
```

Replace `createDurationCompletionCopy(sessionDurationMs)` with:

```javascript
function createDurationCompletionCopy(sessionDurationMs, level = null) {
  const frontLevel = level && (level.difficulty === 'intro' || level.difficulty === 'easy');

  if (frontLevel) {
    return createFrontDurationCompletionCopy(sessionDurationMs);
  }

  return createStandardDurationCompletionCopy(sessionDurationMs);
}
```

Add:

```javascript
function createFrontDurationCompletionCopy(sessionDurationMs) {
  if (sessionDurationMs >= 20 * 60 * 1000) {
    return {
      title: '耐心实验完成',
      subtitle: '慢慢完成，也是一种很扎实的训练。',
      secondStat: { label: '训练类型', value: '热身推理' },
    };
  }

  if (sessionDurationMs >= 12 * 60 * 1000) {
    return {
      title: '入门推理完成',
      subtitle: '你把线索一点点捋清楚了。',
      secondStat: { label: '训练类型', value: '热身推理' },
    };
  }

  if (sessionDurationMs >= 5 * 60 * 1000) {
    return {
      title: '热身除锈完成',
      subtitle: '节奏建立起来了，下一局会更顺。',
      secondStat: { label: '训练类型', value: '热身推理' },
    };
  }

  return {
    title: DERUST_COPY.completionTitle,
    subtitle: '这一局是在给大脑开机。',
    secondStat: { label: DERUST_COPY.activationStatLabel, value: DERUST_COPY.activationStatValue },
  };
}
```

Rename the old `createDurationCompletionCopy()` body to:

```javascript
function createStandardDurationCompletionCopy(sessionDurationMs) {
  // existing standard body unchanged
}
```

- [ ] **Step 4: Run derust tests**

Run:

```bash
node --test minigame/test/derust.test.cjs
```

Expected: PASS.

---

### Task 4: Runtime And Documentation Alignment

**Files:**
- Modify: `minigame/test/game-runtime.test.cjs`
- Modify: `minigame/README.md`

- [ ] **Step 1: Add runtime test for first-level companion feedback**

Add this test near the existing companion runtime tests:

```javascript
test('runtime passes lightweight companion feedback for the first level', () => {
  const runtime = bootGameRuntime('develop');

  try {
    startGame(runtime);
    fillMutableCells(runtime, 3);

    const game = runtime.latestGameCall();
    assert.equal(game.state.level.difficulty, 'intro');
    assert.ok(game.companionFeedback);
    assert.ok(game.companionFeedback.toast);
    assert.match(game.companionFeedback.toast.text, /观察|节奏|线索|推理|草稿|状态/);
    assert.equal(runtime.soundPlayCount('error'), 0);
  } finally {
    runtime.restore();
  }
});
```

- [ ] **Step 2: Run runtime tests and verify failure**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: FAIL until Task 1 implementation is complete, because first-level `intro` currently produces no toast.

- [ ] **Step 3: Update README scope and checklist**

In `minigame/README.md`, replace:

```markdown
- Tapping `撤销` restores the previous mutable move.
```

with:

```markdown
- Tapping `重开` asks for confirmation, then clears player-entered digits while keeping fixed clues.
```

Replace:

```markdown
- Quiet companion feedback for mid/late levels: low-interruption milestone copy, focus-time encouragement, calm atmosphere changes, and long-session completion copy.
```

with:

```markdown
- Quiet companion feedback for all levels: front levels use lighter onboarding-style encouragement, while mid/late levels keep deeper focus-time and long-session feedback.
```

- [ ] **Step 4: Run runtime tests**

Run:

```bash
node --test minigame/test/game-runtime.test.cjs
```

Expected: PASS.

---

### Task 5: Full Verification And Preview

**Files:**
- Verify all modified files.
- Refresh generated visual artifacts.

- [ ] **Step 1: Run full test suite**

Run:

```bash
node --test minigame/test/*.test.cjs
```

Expected: PASS with all tests passing.

- [ ] **Step 2: Refresh visual snapshots**

Run:

```bash
node minigame/tools/render-snapshots.js
```

Expected output includes:

```text
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/menu.svg
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/gameplayDebug.svg
/Users/tianhai/Documents/微信小游戏/minigame/artifacts/visual/victory.svg
```

- [ ] **Step 3: Generate WeChat preview QR**

Run:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/tianhai/Documents/微信小游戏/minigame --qr-format image --qr-output /private/tmp/lab-lines-sudoku-all-level-companion-preview.png --info-output /private/tmp/lab-lines-sudoku-all-level-companion-preview.json
```

Expected: `✔ preview` and a package size table.

- [ ] **Step 4: Inspect package info**

Run:

```bash
sed -n '1,120p' /private/tmp/lab-lines-sudoku-all-level-companion-preview.json
```

Expected: JSON with `size.total`.

- [ ] **Step 5: Check workspace changes**

Run:

```bash
find .. -maxdepth 3 -name .git -type d
```

Expected: If no `.git` exists for this workspace, do not run git commands. Summarize changed files manually in the final response.

---

## Self-Review

- Spec coverage: all关卡启用、前段强度、专注时长差异、氛围差异、前段/中后段通关反馈、测试要求和验收标准均映射到 Task 1-5。
- Placeholder scan: no `TODO`、`TBD`、`implement later` placeholders.
- Type consistency: `companionIntensity`、`getCompanionProfile()`、`profile.maxToasts`、`profile.milestoneKeys`、`profile.timeKeys`、`profile.copyTone`、`profile.atmosphere` 在计划中命名一致。
- Workspace note: 当前工作区此前表现为非 Git 仓库，因此计划不包含不可执行的 `git commit` 步骤。
