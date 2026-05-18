# 关卡菜单与本地进度设计

## 目标

为微信小游戏增加一个轻量的 Canvas 内入口流程，让玩家可以继续未完成的实验、选择关卡、开始新实验，并从数独棋盘返回菜单，同时保持当前单 Canvas 架构。

## 范围

本次功能包含：

- 在现有 Canvas 内渲染首页/菜单场景。
- 支持选择当前内置关卡。
- 通过微信本地存储自动保存进度。
- 有未完成存档时支持继续游戏。
- 在棋盘界面提供返回菜单的入口。

本次功能不包含：

- 云存档、账号同步、排行榜、分享、广告、埋点或远程关卡下载。
- 改造成多页面小程序结构。
- 新的数独生成器或新的变体规则。

## 推荐方案

在当前模块上叠加一个小型场景控制器。游戏继续使用一个 Canvas 和一个触摸监听器，但由 `game.js` 根据场景值分发渲染和点击逻辑：

- `menu`：显示标题、可用时显示“继续实验”、主按钮和关卡卡片。
- `playing`：显示现有数独棋盘和操作区。

现有 `puzzle.js`、`layout.js`、`renderer.js` 继续保持职责清晰。菜单和存储能力拆到小模块里，不把所有逻辑都塞进 `game.js`。

## 用户体验

启动时：

- 如果存在未完成存档，菜单突出显示 `继续实验`。
- 如果没有存档，主操作显示 `开始实验`。
- 玩家可以点击关卡卡片直接开始对应关卡。

游戏中：

- 左上角按钮返回菜单。
- 填数、笔记、擦除、撤销、重开、下一关和通关都会触发本地保存。
- 通关后标记该关已完成，并保留现有胜利弹层行为。

再次进入时：

- `继续实验` 恢复关卡 id、选中格、笔记模式、错误数、完成状态、格子值和候选数。
- 如果存档无效或引用了已移除关卡，游戏安全忽略该存档并进入菜单。

## 架构

### `minigame/src/progress.js`

负责纯数据序列化与恢复逻辑。

职责：

- 将当前数独状态转换成 JSON 安全的进度对象。
- 从 JSON 安全的进度对象和关卡数据恢复数独状态。
- 校验数据形状，避免过期或损坏的存档导致崩溃。
- 汇总已完成关卡 id，供菜单渲染使用。

### `minigame/src/storage.js`

封装微信本地存储 API。

职责：

- 使用单一存储 key，例如 `lab-lines-progress-v1`。
- 提供 `loadProgress(wxLike)`、`saveProgress(wxLike, progress)`、`clearProgress(wxLike)`。
- 捕获存储异常并返回安全默认值。
- 通过传入 `wxLike` 依赖保持可测试性。

### `minigame/src/menu.js`

负责菜单布局、命中测试和渲染所需元数据。

职责：

- 创建适配屏幕的继续/开始按钮与关卡卡片区域。
- 将菜单点击位置映射为具体动作。
- 提供足够的布局元数据给 renderer 绘制菜单。

### 现有文件

- `minigame/game.js`：作为场景协调器，启动时读取进度，分发触摸输入，在状态变化后保存进度，并切换菜单/游戏场景。
- `minigame/src/layout.js`：为棋盘界面左上角返回按钮增加命中区域。
- `minigame/src/renderer.js`：保留现有棋盘渲染，并新增 `renderMenu`。
- `minigame/src/puzzle.js`：仅在必要时增加状态恢复辅助函数，核心数独规则保持纯函数。

## 数据模型

保存一个带版本号的对象：

```json
{
  "version": 1,
  "activeRun": {
    "levelId": "lab-02",
    "selected": { "row": 0, "col": 2 },
    "noteMode": false,
    "mistakes": 0,
    "completed": false,
    "cells": [
      [{ "value": 8, "notes": [] }]
    ]
  },
  "completedLevelIds": ["lab-02"]
}
```

存储中只信任可变数据。固定题面格应从关卡数据重建，避免过期存档把题目给定数字变成可编辑格。

## 错误处理

- 本地存储为空时返回空进度对象。
- JSON 形状不匹配时返回空进度对象。
- 未知关卡 id 会被忽略。
- 存储写入失败不阻塞游戏；生产环境静默失败，测试中保持可观察。

## 测试

实现前先补充聚焦测试：

- `progress.test.cjs`：序列化当前数独状态，并恢复格子值、候选数、错误数、完成状态和选中格。
- `progress.test.cjs`：遇到未知关卡 id 或畸形格子数据时不抛错，并返回安全结果。
- `storage.test.cjs`：存储为空或损坏时返回空进度，并用预期 key 保存。
- `menu.test.cjs`：菜单点击能映射到继续、开始、关卡选择动作。
- `layout.test.cjs`：棋盘左上角返回按钮能映射到 `back` 动作。
- `renderer.test.cjs`：菜单渲染在假的 Canvas context 上不抛错。

回归命令：

```bash
node --test test/puzzle.test.mjs minigame/test/*.cjs
node --check minigame/game.js
node --check minigame/src/puzzle.js
node --check minigame/src/progress.js
node --check minigame/src/storage.js
node --check minigame/src/menu.js
node --check minigame/src/layout.js
node --check minigame/src/renderer.js
```

## 验收标准

- 游戏启动后进入 Canvas 菜单，而不是直接进入关卡。
- 点击开始按钮或关卡卡片能进入可玩的数独关卡。
- 点击棋盘左上角返回按钮能回到菜单。
- 有意义的数独状态变化会自动保存到本地。
- 重新进入游戏后，可以通过 `继续实验` 恢复未完成进度。
- 现有数独交互和胜利弹层继续可用。
- 所有现有测试和新增测试通过。

## 设计说明

本方案刻意避免引入大型场景引擎。当前项目仍然很小，两个场景的协调器已经足够支撑产品行为，不需要过早把代码变成框架。
