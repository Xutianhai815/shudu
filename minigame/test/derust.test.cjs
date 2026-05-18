const assert = require('node:assert/strict');
const test = require('node:test');

const { levels } = require('../src/levels');
const { createPuzzleState } = require('../src/puzzle');
const {
  DERUST_DISCLAIMER,
  createCompletionFeedback,
  createDailyReportSummary,
  createDerustSummary,
  createNextDailyReport,
  getTodayKey,
} = require('../src/derust');

test('createCompletionFeedback returns playful derust copy for completed state', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 1,
  };

  const feedback = createCompletionFeedback(state, ['lab-01']);

  assert.equal(feedback.label, 'LAB RESULT');
  assert.equal(feedback.title, '大脑除锈完成');
  assert.equal(feedback.deltaText, '+0.01%');
  assert.equal(feedback.metricLabel, '今日脑力光泽度');
  assert.equal(feedback.subtitle, '这一局是在给大脑开机。');
  assert.equal(feedback.disclaimer, DERUST_DISCLAIMER);
  assert.deepEqual(feedback.stats, [
    { label: '今日训练', value: '1 次' },
    { label: '大脑状态', value: '已激活' },
  ]);
});

test('createCompletionFeedback counts the current completed level once', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };

  assert.equal(createCompletionFeedback(state, []).totalText, '累计除锈 0.01%');
  assert.equal(createCompletionFeedback(state, ['lab-01']).totalText, '累计除锈 0.01%');
});

test('createCompletionFeedback derives total from unique completed ids and current level', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };

  assert.equal(createCompletionFeedback(state, ['lab-01', 'lab-02', 'lab-02']).totalText, '累计除锈 0.02%');
});

test('createCompletionFeedback does not expose mistake counts', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: -3,
  };

  assert.deepEqual(createCompletionFeedback(state).stats, [
    { label: '今日训练', value: '1 次' },
    { label: '大脑状态', value: '已激活' },
  ]);
});

test('createCompletionFeedback handles invalid state and completed ids safely', () => {
  assert.equal(createCompletionFeedback(null, ['lab-01']).totalText, '累计除锈 0.01%');

  const feedback = createCompletionFeedback({ mistakes: 'bad' }, 'bad');

  assert.equal(feedback.totalText, '累计除锈 0.00%');
  assert.deepEqual(feedback.stats, [
    { label: '今日训练', value: '1 次' },
    { label: '大脑状态', value: '已激活' },
  ]);
});

test('getTodayKey formats local calendar date as YYYY-MM-DD', () => {
  assert.equal(getTodayKey(new Date(2026, 4, 14, 23, 59, 0)), '2026-05-14');
  assert.equal(getTodayKey(new Date(2026, 0, 3, 8, 0, 0)), '2026-01-03');
});

test('createNextDailyReport increments same-day completion events including repeated level', () => {
  assert.deepEqual(
    createNextDailyReport(
      {
        date: '2026-05-14',
        completionCount: 1,
        completedLevelIds: ['lab-02'],
      },
      'lab-02',
      '2026-05-14',
    ),
    {
      date: '2026-05-14',
      completionCount: 2,
      completedLevelIds: ['lab-02'],
    },
  );
});

test('createNextDailyReport resets stale daily report to today before counting', () => {
  assert.deepEqual(
    createNextDailyReport(
      {
        date: '2026-05-13',
        completionCount: 9,
        completedLevelIds: ['lab-99'],
      },
      'lab-03',
      '2026-05-14',
    ),
    {
      date: '2026-05-14',
      completionCount: 1,
      completedLevelIds: ['lab-03'],
    },
  );
});

test('createDailyReportSummary shows today count and derust value', () => {
  assert.deepEqual(
    createDailyReportSummary(
      {
        date: '2026-05-14',
        completionCount: 2,
        completedLevelIds: ['lab-02', 'lab-03'],
      },
      '2026-05-14',
      ['lab-02'],
    ),
    {
      visible: true,
      label: '今日报告',
      totalText: '今日除锈 0.02%',
      detail: '娱乐指标 · 今日已完成 2 次训练',
      disclaimer: DERUST_DISCLAIMER,
    },
  );
});

test('createDailyReportSummary defaults to the local today key', () => {
  const OriginalDate = global.Date;

  try {
    class FixedDate extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(2026, 4, 14, 12, 0, 0);
          return;
        }

        super(...args);
      }
    }

    global.Date = FixedDate;

    assert.deepEqual(
      createDailyReportSummary(
        {
          date: '2026-05-14',
          completionCount: 1,
          completedLevelIds: ['lab-02'],
        },
        undefined,
        ['lab-02'],
      ),
      {
        visible: true,
        label: '今日报告',
        totalText: '今日除锈 0.01%',
        detail: '娱乐指标 · 今日已完成 1 次训练',
        disclaimer: DERUST_DISCLAIMER,
      },
    );
  } finally {
    global.Date = OriginalDate;
  }
});

test('createDailyReportSummary shows recall state when history exists but today is empty', () => {
  assert.deepEqual(createDailyReportSummary(null, '2026-05-14', ['lab-02']), {
    visible: true,
    label: '今日报告',
    totalText: '今日除锈 0.00%',
    detail: '完成一局，给大脑做个热身',
    disclaimer: DERUST_DISCLAIMER,
  });
});

test('createDailyReportSummary hides when there is no today or historical completion', () => {
  assert.deepEqual(createDailyReportSummary(null, '2026-05-14', []), {
    visible: false,
    label: '今日报告',
    totalText: '今日除锈 0.00%',
    detail: '完成一局，给大脑做个热身',
    disclaimer: DERUST_DISCLAIMER,
  });
});

test('createCompletionFeedback includes updated today training count', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
    mistakes: 0,
  };

  const feedback = createCompletionFeedback(
    state,
    ['lab-01'],
    {
      date: '2026-05-14',
      completionCount: 2,
      completedLevelIds: ['lab-01'],
    },
    '2026-05-14',
  );

  assert.deepEqual(feedback.stats, [
    { label: '今日训练', value: '2 次' },
    { label: '大脑状态', value: '已激活' },
  ]);
});

test('createDerustSummary formats cumulative derust from completed levels', () => {
  assert.deepEqual(createDerustSummary(['lab-02', 'lab-03']), {
    visible: true,
    label: '今日报告',
    totalText: '累计除锈 0.02%',
    detail: '娱乐指标 · 已完成 2 次训练',
    disclaimer: DERUST_DISCLAIMER,
  });
});

test('createDerustSummary returns hidden default for invalid or empty input', () => {
  const hiddenDefault = {
    visible: false,
    label: '今日报告',
    totalText: '累计除锈 0.00%',
    detail: '娱乐指标 · 已完成 0 次训练',
    disclaimer: DERUST_DISCLAIMER,
  };

  assert.deepEqual(createDerustSummary(null), hiddenDefault);
  assert.deepEqual(createDerustSummary([]), hiddenDefault);
  assert.deepEqual(createDerustSummary('bad'), hiddenDefault);
});

test('derust copy avoids disease or medical claim wording', () => {
  const state = {
    ...createPuzzleState(levels[0]),
    completed: true,
  };
  const feedback = createCompletionFeedback(state, ['lab-01']);
  const summary = createDerustSummary(['lab-01']);
  const dailySummary = createDailyReportSummary(
    {
      date: '2026-05-14',
      completionCount: 1,
      completedLevelIds: ['lab-01'],
    },
    '2026-05-14',
    ['lab-01'],
  );
  const copy = [
    feedback.title,
    feedback.deltaText,
    feedback.metricLabel,
    feedback.subtitle,
    feedback.disclaimer,
    summary.totalText,
    summary.detail,
    summary.disclaimer,
    dailySummary.totalText,
    dailySummary.detail,
    dailySummary.disclaimer,
  ].join(' ');

  assert.equal(/老年痴呆|阿尔茨海默|预防|降低.*风险|医学证明|患病概率/.test(copy), false);
});

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
  const normalLevel = levels.find((level) => level.difficulty === 'normal');
  const normalState = {
    ...createPuzzleState(normalLevel),
    completed: true,
  };

  const feedback = createCompletionFeedback(normalState, ['lab-07'], null, '2026-05-14', 13 * 60 * 1000);

  assert.equal(feedback.title, '深度除锈完成');
  assert.deepEqual(feedback.stats[1], { label: '训练类型', value: '深度推理' });
});

test('unknown difficulty completion copy falls back to standard long-session language', () => {
  const customState = {
    ...createPuzzleState({
      ...levels[0],
      id: 'custom-01',
      difficulty: 'custom',
    }),
    completed: true,
  };

  const feedback = createCompletionFeedback(customState, [], null, '2026-05-14', 13 * 60 * 1000);

  assert.equal(feedback.title, '深度除锈完成');
  assert.deepEqual(feedback.stats[1], { label: '训练类型', value: '深度推理' });
});

test('long-session completion copy avoids speed pressure and medical claims', () => {
  const state = {
    ...createPuzzleState(levels[9]),
    completed: true,
  };
  const feedback = createCompletionFeedback(state, [], null, '2026-05-14', 22 * 60 * 1000);
  const copy = [
    feedback.title,
    feedback.subtitle,
    ...feedback.stats.map((stat) => `${stat.label} ${stat.value}`),
  ].join(' ');

  assert.equal(/太慢|用时过长|落后|老年痴呆|阿尔茨海默|医学|疾病/.test(copy), false);
});
