# Lab Lines Sudoku HarmonyOS

HarmonyOS 原生数独应用工程。

当前目标：

- 使用 ArkTS 和 ArkUI 开发原生应用。
- 复用现有数独核心规则、关卡、模式和正反馈方向。
- 第一版保持离线可玩，不接入广告、支付、登录、排行榜或云同步。
- 华为 H5 快游戏方向已暂停，`huawei-h5/` 仅保留历史验证结果。

开发入口：

- DevEco Studio 打开本工程；由于 Hvigor 不支持中文父路径，构建和真机调试时请使用英文路径 worktree 或英文路径副本，例如 `/private/tmp/LabLinesSudoku`。
- 手机竖屏优先。
- 第一阶段先完成首页、闯关、练习、数独盘、输入、草稿、清除、重新开始、完成反馈和本地恢复。

## Path Requirement

当前仓库路径包含中文目录名，Hvigor 会报 `Invalid project path`。HarmonyOS 原生工程的构建、预览、真机调试和 release 打包必须在只包含英文、数字、连字符、下划线、英文句点、英文括号、空格或 `@` 的路径下执行。
