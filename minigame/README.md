# 一一数独微信小游戏

This folder is a lightweight WeChat Mini Game project ported from the browser UI prototype.

## Open in WeChat DevTools

1. Open WeChat DevTools.
2. Choose Mini Game project import.
3. Select this folder: `minigame`.
4. Confirm the AppID in `project.config.json`: `wx2ae48d4332aebd75`.
5. Compile and run.

## Release Readiness

Use the Chinese release checklist before uploading a build:

```bash
node --test test/*.test.cjs
node tools/render-snapshots.js
```

See `RELEASE_CHECKLIST.md` for the 0.1.0 experience-version and review-submission workflow.

The upload package is configured to ignore local-only development files:

- `test/`
- `tools/`
- `artifacts/`
- `README.md`

The gameplay top bar intentionally only shows back navigation and level metadata. Debug completion, fake timers, and inactive pause controls are not rendered in the playable build.

## Runtime Verification Checklist

After importing into WeChat DevTools, verify these items in the simulator:

- The home screen shows `一一数独` with two simplified mode cards: `闯关挑战` or `继续闯关`, and `自由练习`.
- Tapping `闯关挑战` starts the campaign flow; if a campaign save exists, the card shows `继续闯关`.
- Tapping `自由练习` opens the difficulty selector with `热身`, `稳定`, `标准`, and `进阶`.
- The board, keypad, and tool row all fit in iPhone SE-sized and larger portrait simulators.
- Tapping an empty board cell updates the board highlight.
- Tapping a fixed clue does not change the clue value.
- Tapping `草稿模式` changes note mode, and keypad input adds/removes candidates instead of answers.
- Tapping `重开` asks for confirmation, then clears player-filled digits while keeping fixed clues.
- Tapping `清除` clears the selected mutable cell.
- Completing the board shows the victory overlay.
- Campaign victory is a compact `下一关已解锁` overlay with one `下一关` button.
- Campaign victory `下一关` advances to `LAB-02 九宫巡检`; use the top-left back button to return home.
- Free practice gameplay shows `换难度`, which returns to difficulty selection and starts a new practice puzzle after choosing a difficulty.
- Completing a free practice puzzle does not mark campaign levels complete.
- Free practice victory shows `再练一局` and `换个难度`.
- The board does not show extra variant lines, circles, or arrows in the current basic-play version.

If the WeChat DevTools CLI is enabled later, the project can also be opened from the command line with the DevTools `cli` executable and this folder path.

## Visual Snapshot Checks

Run this command to generate SVG snapshots from the same Canvas renderer used by the mini game:

```bash
node tools/render-snapshots.js
```

The snapshots are written to `artifacts/visual/`:

- `menu.svg`: dual-mode home screen with `闯关挑战` and `自由练习`.
- `practiceMenu.svg`: free practice difficulty selector with `热身`, `稳定`, `标准`, and `进阶`.
- `gameplayDebug.svg`: campaign gameplay with the same top bar controls as the playable build.
- `victory.svg`: campaign victory with `下一关已解锁` and a single `下一关` button.
- `practiceVictory.svg`: free practice victory with `再练一局` and `换个难度`.

Use these as a quick visual QA pass before or after opening the project in WeChat DevTools.

## Current Scope

- Canvas-based portrait gameplay screen.
- Dual-mode home screen: campaign progression via `闯关挑战` or `继续闯关`, and difficulty-selected practice via `自由练习`.
- Lab Lines visual direction: pale graphite surface, charcoal board, and a clean basic Sudoku grid.
- Touch support for selecting board cells, entering digits, toggling notes, restarting, and erasing.
- Local lightweight sound effects for puzzle selection, digit input, tools, and completion.
- Neutral in-progress input feedback, completion detection, and a positive victory overlay.
- Quiet companion feedback for all levels: front levels use lightweight observation/rhythm copy, while mid/late levels keep deeper focus-time, calm atmosphere, and long-session completion feedback.
- Victory overlay actions are intentionally narrow: campaign advances with `下一关`, while free practice supports `再练一局` and `换个难度`.
- The first screen intentionally hides the full level list; players progress through the main flow from `闯关挑战`.
- Independent local saves for campaign runs and free practice runs.
- Data-driven level metadata in `src/levels.js`, including 24 progressive basic Sudoku levels with givens, solutions, and difficulty bands.
- Pure puzzle/layout modules that can be tested with Node.

## Multi-Platform Runtime

The playable game should stay platform-neutral whenever possible:

- Shared gameplay logic lives in `src/app-runtime.js` and `src/`.
- WeChat-specific APIs live in `src/platform/wechat-platform.js` and `game.js`.
- H5/Huawei Quick Game APIs live in `src/platform/h5-platform.js` and `../huawei-h5/`.

When adding a gameplay feature, put it in shared modules first. Only add platform-specific code for capabilities such as login, sharing, payment, storage bridges, or channel review requirements.

## Adding Levels

Add a new entry to `src/levels.js` with:

- `givens`: 9x9 puzzle grid where `0` means empty.
- `solution`: matching 9x9 solved grid.
- `notes`: optional starting candidates keyed by `"row:col"`.
- `rules`: chips shown in the rule strip. Use `classic` for the current basic Sudoku mode.

The game advances through the `levels` array order and wraps to the first level after the final entry.

The old browser prototype remains in the repository root as a visual and interaction reference.
