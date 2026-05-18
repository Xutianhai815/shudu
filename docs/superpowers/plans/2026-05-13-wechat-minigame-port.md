# WeChat Minigame Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Lab Lines Sudoku browser prototype into a WeChat Mini Game project that can be imported into WeChat DevTools.

**Architecture:** Keep the browser prototype as a reference and create a separate `minigame/` project. The Mini Game uses CommonJS modules, pure testable puzzle/layout logic, and a Canvas renderer controlled from `game.js`.

**Tech Stack:** WeChat Mini Game runtime, Canvas 2D, CommonJS JavaScript, Node built-in test runner.

---

### Task 1: Project Scaffold

**Files:**
- Create: `minigame/game.json`
- Create: `minigame/project.config.json`
- Create: `minigame/README.md`

- [x] Add a portrait Mini Game config.
- [x] Add a DevTools import config with `compileType: "game"` and placeholder `touristappid`.
- [x] Document how to import the folder into WeChat DevTools.

### Task 2: Portable Logic

**Files:**
- Create: `minigame/src/puzzle.js`
- Create: `minigame/src/layout.js`
- Create: `minigame/test/puzzle.test.cjs`
- Create: `minigame/test/layout.test.cjs`

- [x] Port puzzle state helpers from the browser prototype to CommonJS.
- [x] Add layout hit testing for board cells and keypad digits.
- [x] Add short portrait viewport coverage so the keypad stays visible.

### Task 3: Canvas Runtime

**Files:**
- Create: `minigame/game.js`
- Create: `minigame/src/renderer.js`

- [x] Initialize WeChat Canvas with device pixel ratio scaling.
- [x] Draw the Lab Lines gameplay surface with board, variant clues, status panels, tools, and keypad.
- [x] Wire touch input through `hitTest`, `selectCell`, and `applyDigit`.

### Task 4: Verification

**Files:**
- Read: `minigame/src/*.js`
- Read: `minigame/test/*.cjs`

- [x] Run `node --test minigame/test/puzzle.test.cjs`.
- [x] Run `node --test minigame/test/layout.test.cjs`.
- [ ] Import into WeChat DevTools and visually verify the Canvas runtime.
