# Lab Lines UI Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight interactive browser prototype for the selected Lab Lines Sudoku mini game UI direction.

**Architecture:** The prototype is a static web app with a small pure state module for board interaction and a separate rendering layer for DOM updates. Styling focuses on the mobile portrait game surface, board readability, variant clue overlays, and one-handed keypad controls.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node's built-in test runner.

---

### Task 1: Board State Helpers

**Files:**
- Create: `src/puzzle.js`
- Create: `test/puzzle.test.mjs`

- [ ] Write tests for selected-cell peer highlighting and digit placement.
- [ ] Implement pure helpers for board creation, peer detection, and input.
- [ ] Run `node --test test/puzzle.test.mjs` and confirm the tests pass.

### Task 2: Interactive Game Screen

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/app.js`

- [ ] Build the mobile Lab Lines screen with top status, 9x9 board, thermo/arrow overlays, tool buttons, and 3x3 number keypad.
- [ ] Wire cell selection, row/column/block highlighting, same-number highlighting, candidate-note display, and keypad input.
- [ ] Keep the visual system focused: pale graphite surface, charcoal grid, teal/amber clue lines, light lime success, restrained red conflicts.

### Task 3: Local Verification

**Files:**
- Read: `index.html`
- Read: `styles.css`
- Read: `src/app.js`

- [ ] Run `node --test test/puzzle.test.mjs`.
- [ ] Serve the folder locally with `python3 -m http.server 4173`.
- [ ] Inspect the prototype in a browser at `http://127.0.0.1:4173/`.
