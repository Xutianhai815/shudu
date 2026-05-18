# 开发专用快速完成当前关设计

## 目标

为微信小游戏开发阶段增加一个仅开发环境可见的“快速完成当前关”入口，方便在微信开发者工具中一键触发通关流程和“大脑除锈完成”弹层，减少手动解题或控制台注入带来的验收成本。

## 范围

本次功能包含：

- 在开发环境中显示一个轻量调试按钮，例如 `DEV 完成`。
- 点击按钮后把当前关卡填为正确答案，并进入已完成状态。
- 复用现有保存、通关反馈和胜利弹层渲染链路。
- 完成后仍能通过现有“下一关”“再来一局”“返回菜单”流程继续操作。
- 为开发入口、命中测试、完成状态和生产环境隐藏行为补充测试。

本次功能不包含：

- 给正式玩家提供跳关、作弊或自动解题能力。
- 改变数独规则、关卡数据、除锈文案或存档结构。
- 新增分享、排行榜、后台配置或云端开关。

## 启用规则

调试入口只能在开发环境启用。建议用一个纯函数集中判断：

```js
function isDebugToolsEnabled(wxLike) {}
```

判断优先级：

- 如果 `wx.getAccountInfoSync().miniProgram.envVersion === 'develop'`，启用。
- 如果相关 API 不存在或抛错，默认禁用。
- 不依赖网络、远程配置或用户存档。

这样在正式版、体验版或 API 不可用时都不会显示调试入口。

## 交互设计

游戏进行中且未完成时，界面右上角显示小型 `DEV 完成` 按钮。它不进入菜单页，也不在通关弹层上显示。

点击后：

1. 当前棋盘所有格子填入 `state.level.solution`。
2. `state.completed` 变为 `true`。
3. 通过现有 `persistProgress()` 保存当前关卡到 `completedLevelIds`。
4. 通过现有 `renderGame(..., { completionFeedback })` 触发“大脑除锈完成”弹层。

## 架构

新增或调整的职责边界：

- `minigame/src/debug.js`：纯函数模块，判断是否启用调试工具，并生成已完成状态。
- `minigame/src/layout.js`：在启用调试工具时提供 `debugCompleteButton` 布局，并在 `hitTest` 中返回 `{ type: 'debug', action: 'complete' }`。
- `minigame/src/renderer.js`：只负责绘制 `DEV 完成` 按钮，不包含完成逻辑。
- `minigame/game.js`：启动时判断调试开关；收到 debug hit 后调用纯函数完成当前关，并复用现有保存和渲染流程。

## 错误处理

- 没有 `solution`、状态异常或已完成时，快速完成不应抛错。
- 调试按钮隐藏时，点击同一区域不应产生 debug action。
- 正式环境或无法判断环境时，调试入口默认关闭。

## 测试

新增或更新测试：

- `debug.test.cjs`：开发环境启用、正式/体验/异常环境禁用。
- `debug.test.cjs`：快速完成会填入 solution，设置 completed，且不修改原 state。
- `layout.test.cjs`：调试按钮启用时可命中，禁用或已完成时不可命中。
- `renderer.test.cjs`：启用时绘制 `DEV 完成`，禁用时不绘制。
- 回归全量 puzzle/menu/layout/renderer/progress/storage/derust 测试。

## 验收标准

- 在微信开发者工具开发环境中，游戏页可看到 `DEV 完成`。
- 点击 `DEV 完成` 后出现“大脑除锈完成”通关弹层。
- 菜单页不显示调试入口。
- 正式环境、体验环境或 API 不可用时不显示调试入口。
- 不新增或改变正式存档结构。
- 所有测试通过。
