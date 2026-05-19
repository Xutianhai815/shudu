# HarmonyOS 原生数独应用设计 Spec

日期：2026-05-19

## 1. 背景

当前项目已经形成微信小游戏版本，并额外验证过华为 H5 快游戏方向。现在产品策略调整为：暂停华为 H5 快游戏开发，优先开发并上线 HarmonyOS 原生数独应用。

本 spec 的目标是锁定第一版 HarmonyOS 原生应用范围，明确哪些能力复用现有数独项目，哪些能力用 ArkTS 和 ArkUI 原生重做，避免多个平台方向互相干扰。

## 2. 目标

第一版 HarmonyOS 原生应用要做到：

- 使用 DevEco Studio 创建 HarmonyOS 原生 Application 工程。
- 使用 ArkTS 作为主要开发语言。
- 使用 ArkUI 构建首页、数独页、练习难度页和完成反馈页。
- 复用现有数独核心玩法、关卡数据、闯关模式、练习模式和“大脑除锈”正反馈方向。
- 第一版保持离线可玩，不接入广告、支付、登录、排行榜、云同步。
- 能在真机或模拟器完成基本试玩，并准备 AppGallery Connect 上架材料。

## 3. 非目标

第一版暂不做以下内容：

- 不继续开发华为 H5 快游戏或 Runtime 快游戏能力。
- 不使用 WebView 套壳作为 HarmonyOS 原生版本。
- 不接入商业化系统，包括游戏货币、商城、兑换码、会员/VIP、付费道具、红包或提现。
- 不接入用户账号、社交分享、排行榜、云存档。
- 不做复杂多端分布式能力，先聚焦手机竖屏体验。

## 4. 推荐技术路线

采用方案 A：ArkTS + ArkUI 原生应用，复用现有数独核心逻辑。

推荐原因：

- 数独是强离线、强交互、低资源消耗的益智游戏，适合先做轻量原生 MVP。
- 原生 ArkUI 更符合 HarmonyOS 审核和用户体验预期，不像 H5 壳或快游戏迁移层。
- 现有项目已经将玩法逻辑和渲染入口逐步拆开，便于提取平台无关逻辑。
- 后续如果上线 Android、iOS 或其他渠道，核心规则和关卡仍可继续抽象复用。

## 5. 工程结构

建议在仓库内新增独立目录：

```text
harmonyos/
  AppScope/
  entry/
    src/main/ets/
      entryability/
      pages/
      components/
      game/
      data/
      services/
    src/main/resources/
  oh-package.json5
```

目录职责：

- `pages/`：首页、闯关游戏页、练习难度页、完成反馈页。
- `components/`：数独盘、数字键盘、工具按钮、顶部状态区、轻提示组件。
- `game/`：数独状态、输入规则、完成判断、重复提醒、模式流转。
- `data/`：关卡数据、难度配置、文案配置。
- `services/`：本地进度存储、音效、设备适配、本地事件接口预留；第一版默认不采集、不上报用户数据。

微信小游戏目录 `minigame/` 和华为 H5 目录 `huawei-h5/` 保留，但 HarmonyOS 原生版本不直接依赖它们的 UI 渲染代码。

## 6. 逻辑迁移策略

优先迁移这些平台无关模块：

- `minigame/src/puzzle.js`：棋盘状态、输入、草稿、清除、重复检测、完成判断。
- `minigame/src/levels.js`：关卡数据和难度递进。
- `minigame/src/game-modes.js`：闯关和自由练习的模式概念。
- `minigame/src/companion-feedback.js`：安静陪伴和轻量情绪反馈文案方向。
- `minigame/src/derust.js`、`growth-stats.js`：完成后的正反馈和连续练习统计。

迁移方式：

- 不直接复制 CommonJS 写法到 HarmonyOS 工程。
- 将核心规则改写为 ArkTS 模块，保留函数命名和测试语义。
- 先迁移纯逻辑，再迁移 UI 状态流，最后迁移音效和本地存储。
- 每迁移一个核心模块，都补一组 ArkTS 单元测试或最小可验证用例。

## 7. UI 与交互设计

第一版保留当前产品结构：

- 首页提供两个入口：闯关挑战、自由练习。
- 闯关挑战从第一关开始，完成后进入下一关。
- 自由练习允许选择难度，并在完成后继续同难度不同题目。
- 数独页包含顶部关卡信息、9x9 数独盘、数字输入区、草稿模式、清除、重新开始。
- 过程不判断用户输入对错，只提示同行、同列、同宫重复。
- 完成时再给成功反馈和“大脑除锈”类正向反馈。

HarmonyOS 原生 UI 建议：

- 9x9 数独盘优先用 ArkUI Canvas 或自定义绘制组件实现，保证线条、字号和重复提示可精细控制。
- 顶部、按钮、完成反馈用 ArkUI 原生组件实现，避免所有内容都塞进 Canvas。
- 保留手机竖屏、单手操作优先。
- 第一版先做浅色、温暖、清晰的视觉风格，不引入复杂主题系统。

## 8. 数据与存储

第一版只保存本地进度：

- 当前闯关进度。
- 当前闯关未完成棋盘。
- 当前自由练习未完成棋盘。
- 已完成关卡集合。
- 连续练习天数和累计完成数。

存储建议使用 HarmonyOS 原生本地首选项能力。数据结构保持可版本化：

```text
schemaVersion
campaignRun
practiceRun
completedLevelIds
practiceStats
growthStats
```

如果后续接入账号或云同步，再新增同步层，不改变核心玩法状态结构。

## 9. 上架与合规边界

第一版上架材料要保持事实导向：

- 应用类型：益智类游戏或休闲益智。
- 玩法描述：9x9 数独、行列宫不重复、闯关挑战、自由练习、草稿/清除/重新开始。
- 商业化说明：当前版本不包含游戏货币、商城、兑换码、会员/VIP、付费道具、红包或提现等商业化系统。
- 隐私说明：当前版本不采集个人身份信息，不需要登录；如后续接入分析或崩溃服务，需要更新隐私政策和权限说明。
- 健康类文案边界：“大脑除锈”只能作为轻松的游戏反馈，不承诺疾病预防、治疗或医学效果。

## 10. 开发环境与工具

需要准备：

- HUAWEI ID，并完成开发者实名认证。
- HUAWEI DevEco Studio，用于创建 HarmonyOS 原生工程、下载 SDK、调试、打包。
- HarmonyOS SDK，由 DevEco Studio 内部 SDK Manager 安装。
- AppGallery Connect 项目，用于创建 HarmonyOS 应用、配置包名、后续上传包体和填写上架信息。
- HarmonyOS 真机，优先使用 HarmonyOS NEXT 或目标上架设备系统；没有真机时先用模拟器验证。
- Node.js LTS，用于继续运行现有仓库的 Node 测试和迁移前对照测试。
- Git，用于分支、提交和版本管理。

暂不需要：

- 华为快应用 IDE。
- 快游戏 RPK 打包工具。
- Android Studio。
- Xcode。
- Unity、Cocos 或其他游戏引擎。

## 11. 验收标准

第一阶段验收：

- DevEco Studio 能打开 `harmonyos/` 工程。
- 首页能显示闯关挑战和自由练习入口。
- 能进入第一关并显示 9x9 数独盘。
- 能选择空格并输入数字。
- 草稿模式、清除、重新开始可用。
- 重复提醒只提示重复，不判断答案对错。
- 完成一局后出现正反馈页面。
- 本地退出重进后能恢复进度。

第二阶段验收：

- 关卡递进至少覆盖现有前 12 关。
- 自由练习能选择入门、简单、标准、挑战难度。
- 真机竖屏布局不被系统状态栏、导航区、折叠屏或大字号设置严重破坏。
- 能生成 release 包。
- 上架材料、隐私政策和截图准备完成。

## 12. 风险与应对

- 风险：ArkTS 与现有 JavaScript 模块语法不兼容。
  应对：不做机械复制，按模块逐个改写并保留测试语义。

- 风险：ArkUI Canvas 与微信 Canvas 的字体和绘制表现不同。
  应对：优先复用布局意图，不复用具体像素参数；用真机截图回归。

- 风险：HarmonyOS 上架资料或审核规则比小游戏更严格。
  应对：第一版不接入敏感能力，审核文案明确无商业化、无登录、无个人信息采集。

- 风险：同时维护微信、HarmonyOS、未来 Android/iOS 导致重复开发。
  应对：从第一版开始把核心规则、关卡、文案、模式状态抽象为平台中立模块，再由各平台实现 UI 和系统能力。

## 13. 实施顺序

建议后续按以下顺序进入 implementation plan：

1. 创建 HarmonyOS 原生工程骨架。
2. 迁移数独核心规则和关卡数据。
3. 实现首页和模式选择。
4. 实现数独盘与数字输入。
5. 实现草稿、清除、重新开始、重复提醒。
6. 实现完成反馈和本地进度。
7. 真机适配、截图和上架材料准备。

## 14. 官方参考

- HarmonyOS 开发资源：https://developer.huawei.com/consumer/cn/hmos/overview/
- DevEco Studio：https://developer.huawei.com/consumer/en/deveco-studio/
- AppGallery Connect：https://developer.huawei.com/consumer/en/agconnect/
- AppGallery Connect HarmonyOS 应用创建准备：https://developer.huawei.com/consumer/cn/codelab/AGCPreparation-HarmonyOS/
