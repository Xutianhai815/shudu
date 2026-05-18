# 线性入口与同难度再试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首屏不再展示 12 个关卡入口，玩家通过主线推进；通关后点击“再试一次”进入同难度的另一张数独盘。

**Architecture:** 保留现有关卡数组作为主线与难度池。菜单布局只输出主按钮、续玩按钮和报告卡，不输出可点击关卡卡片；重试逻辑由 puzzle 层提供 `retrySameDifficultyLevel`，game 层在胜利按钮中调用。

**Tech Stack:** 微信小游戏 Canvas、CommonJS 模块、Node `node:test`。

---

### Task 1: 菜单隐藏关卡列表

**Files:**
- Modify: `minigame/test/menu.test.cjs`
- Modify: `minigame/src/menu.js`
- Modify: `minigame/test/renderer.test.cjs`

- [ ] 写失败测试：`createMenuLayout` 对 12 关返回空 `levelCards`，`hitTestMenu` 不再命中关卡卡片。
- [ ] 运行：`node --test minigame/test/menu.test.cjs`，预期失败，因为当前仍生成 12 张关卡卡片。
- [ ] 实现：`createMenuLayout` 不再生成关卡卡片，保留按钮和报告；`hitTestMenu` 移除关卡命中。
- [ ] 更新渲染测试：菜单不再要求绘制关卡标题或已除锈卡片。
- [ ] 运行：`node --test minigame/test/menu.test.cjs minigame/test/renderer.test.cjs`，预期通过。

### Task 2: 再试一次切换同难度题

**Files:**
- Modify: `minigame/test/puzzle.test.cjs`
- Modify: `minigame/test/game-runtime.test.cjs`
- Modify: `minigame/src/puzzle.js`
- Modify: `minigame/game.js`

- [ ] 写失败测试：从 `LAB-01` 重试进入 `LAB-02`，从 `LAB-03` 重试回到 `LAB-01`，都保持 `intro` 难度。
- [ ] 运行：`node --test minigame/test/puzzle.test.cjs`，预期失败，因为当前 `restartLevel` 重置同一关。
- [ ] 实现 `retrySameDifficultyLevel(state)`：在 `levels` 中找同 difficulty 的关卡，按数组顺序取下一张，单关难度池时回退当前关。
- [ ] 修改胜利按钮 action `restart` 的处理：调用 `retrySameDifficultyLevel`。
- [ ] 运行：`node --test minigame/test/puzzle.test.cjs minigame/test/game-runtime.test.cjs`，预期通过。

### Task 3: 文档、快照与预览

**Files:**
- Modify: `minigame/README.md`
- Modify: `minigame/tools/render-snapshots.js`
- Generated: `minigame/artifacts/visual/*.svg`

- [ ] 更新 README：首屏不展示关卡列表，再试一次为同难度换题。
- [ ] 运行：`node --test minigame/test/*.test.cjs`，预期 120+ 测试全部通过。
- [ ] 运行：`node minigame/tools/render-snapshots.js`，更新视觉快照。
- [ ] 运行微信开发者工具预览命令，确认可生成二维码。
