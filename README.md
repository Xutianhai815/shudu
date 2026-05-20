# 一一数独 / Shudu

一个以经典 9x9 数独为核心的多平台益智游戏项目。当前重点平台包括微信小游戏、H5 预览和 HarmonyOS 原生应用。

## 项目目标

- 复用同一套数独规则、关卡数据、成长反馈和自由练习策略。
- 让不同平台只负责各自的 UI、输入、音频、存储和发布适配。
- 避免多个 agent 在不同平台重复实现同一套核心玩法逻辑。
- 保持第一版轻量、离线可玩、审核友好，不接入广告、支付、会员、商城、红包或医学化承诺。

## 目录结构

```text
.
├── minigame/       # 微信小游戏 Canvas 版本，当前主要可玩版本
├── huawei-h5/      # H5/华为快游戏预览方向，复用小游戏共享运行时
├── harmonyos/      # HarmonyOS 原生 ArkTS/ArkUI 工程
├── docs/           # 产品 spec、实施 plan、协作指南
└── output/         # 本地预览二维码和上传信息，已被 .gitignore 忽略
```

## 共享优先原则

新功能默认先判断是否属于“核心玩法”。如果属于核心玩法，应优先在可复用模块中实现，再由各平台适配展示。

必须优先复用或同步的能力：

- 数独题库、关卡编号、难度曲线和唯一解校验。
- 数独状态、填写、草稿、清除、重开、撤销、重复提醒。
- 闯关进度、自由练习推荐、练习难度递进。
- 连续练习记录、完成反馈和审核安全文案边界。

平台可独立实现的能力：

- Canvas、ArkUI、H5 DOM 等渲染层。
- 触摸输入、音频播放、本地存储桥接。
- 微信、HarmonyOS、H5 的平台发布配置。

更多细节见 [docs/agent-guide.md](docs/agent-guide.md)。

## 常用验证

微信小游戏核心测试：

```sh
node --test minigame/test/*.test.cjs
```

微信小游戏视觉快照：

```sh
node minigame/tools/render-snapshots.js
```

H5 bundle 冒烟构建：

```sh
node huawei-h5/build.js
```

## 分支建议

- `main`：稳定主线，作为其他 agent 的默认基线。
- `feature/wechat-*`：微信小游戏相关功能。
- `feature/harmonyos-*`：HarmonyOS 原生相关功能。
- `feature/h5-*`：H5/快游戏相关功能。
- `feature/core-*`：跨平台核心逻辑。

协作时请通过 Pull Request 合并到 `main`，不要直接把半成品推到主线。
