const MAX_TOASTS_PER_SESSION = 5;
const TOAST_DURATION_MS = 1800;
const TOAST_COOLDOWN_MS = 10 * 1000;
const RECENT_ACTION_WINDOW_MS = 60 * 1000;

const COMPANION_PROFILES = {
  intro: {
    intensity: 'minimal',
    maxToasts: 2,
    milestoneKeys: ['fill3', 'progress50', 'noteReturn'],
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

const FRONT_MILESTONE_COPY = {
  fill3: '先观察，再落子',
  fill5: '这一步是在建立节奏',
  progress50: '格子开始有线索了',
  noteReturn: '草稿用得很像实验记录',
};

const FRONT_TIME_COPY = {
  focus3: '已专注 3 分钟，节奏很稳',
};

function getCompanionProfile(level) {
  return (
    level &&
    COMPANION_PROFILES[level.difficulty]
  ) || COMPANION_PROFILES.intro;
}

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

function registerCompanionAction(session, state, action, now = Date.now()) {
  const profile = getCompanionProfile(state && state.level);
  const base = normalizeSession(session, state, now);
  const nextBase = {
    ...base,
    lastActionAt: now,
    usedNoteMode: base.usedNoteMode || action === 'note' || action === 'noteDigit',
  };

  const key = chooseToastKey(nextBase, state, action, now, profile);

  if (
    !key ||
    nextBase.feedbackCount >= profile.maxToasts ||
    isWithinToastCooldown(nextBase, now)
  ) {
    return {
      ...nextBase,
      currentToast: expireToast(nextBase.currentToast, now),
    };
  }

  const toast = createToast(key, now, profile);

  return {
    ...nextBase,
    currentToast: toast,
    shownFeedbackKeys: [...nextBase.shownFeedbackKeys, key],
    feedbackCount: nextBase.feedbackCount + 1,
    toastHistory: [...nextBase.toastHistory, toast],
    lastToastAt: now,
  };
}

function createCompanionView(state, session, now = Date.now()) {
  const profile = getCompanionProfile(state && state.level);

  return {
    toast: session ? expireToast(session.currentToast, now) : null,
    atmosphere: createAtmosphere(state, profile),
  };
}

function getFillProgress(state) {
  if (!state || !Array.isArray(state.cells)) {
    return {
      filledByPlayer: 0,
      emptyTotal: 0,
      ratio: 0,
    };
  }

  let filledByPlayer = 0;
  let emptyTotal = 0;

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

function chooseToastKey(session, state, action, now, profile) {
  const candidates = getEligibleToastKeys(session, state, action, now, profile);
  return candidates.find((key) => !session.shownFeedbackKeys.includes(key)) || null;
}

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

function normalizeSession(session, state, now) {
  const levelId = state && state.level && state.level.id;

  if (!session || session.levelId !== levelId) {
    return createCompanionSession(state && state.level, now);
  }

  return session;
}

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

function expireToast(toast, now) {
  if (!toast || toast.expiresAt <= now) {
    return null;
  }

  return toast;
}

function isWithinToastCooldown(session, now) {
  return Boolean(session.lastToastAt && now - session.lastToastAt <= TOAST_COOLDOWN_MS);
}

module.exports = {
  MAX_TOASTS_PER_SESSION,
  createCompanionSession,
  createCompanionView,
  getFillProgress,
  registerCompanionAction,
};
