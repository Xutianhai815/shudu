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

命令行构建可使用 DevEco Studio 自带 SDK 和 JBR：

```bash
DEVECO_SDK_HOME=/Applications/DevEco-Studio.app/Contents/sdk \
JAVA_HOME=/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home \
PATH=/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home/bin:$PATH \
/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw assembleApp --no-daemon
```

## Simulator Smoke Test

本机已验证的模拟器组合：

- DevEco Studio：`6.1.0`
- 模拟器：`Pura 90`
- 系统镜像：`HarmonyOS 6.0.31(23)`，Phone，软件版本 `6.1.0.115`
- SDK 根目录：`/Applications/DevEco-Studio.app/Contents/sdk`
- 镜像目录：`/Users/tianhai/Library/Huawei/Sdk/system-image/HarmonyOS-6.0.31/phone_all_arm/`

如果 `Emulator -list -details` 能看到设备实例，但启动时报 `can not read uuid file`、`can not read sn`，通常是系统镜像没有下载完整。可先查询已下载镜像：

```bash
/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator -imageList -downloaded true
```

如果 Phone 镜像未下载，安装镜像：

```bash
/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator \
  -install \
  -deviceType Phone \
  -osVersion "HarmonyOS 6.0.31(23)" \
  -imageRoot /Users/tianhai/Library/Huawei/Sdk
```

启动模拟器时建议去掉 Codex 沙箱和代理相关环境变量，避免 `hdc` server 继承后出现 `Connect server failed`：

```bash
env -u CODEX_SANDBOX_NETWORK_DISABLED \
  -u CODEX_CI \
  -u HTTP_PROXY \
  -u HTTPS_PROXY \
  -u ALL_PROXY \
  -u http_proxy \
  -u https_proxy \
  -u all_proxy \
  /Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator -start Pura\ 90
```

确认设备已连接：

```bash
env -u CODEX_SANDBOX_NETWORK_DISABLED \
  -u CODEX_CI \
  -u HTTP_PROXY \
  -u HTTPS_PROXY \
  -u ALL_PROXY \
  -u http_proxy \
  -u https_proxy \
  -u all_proxy \
  /Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc list targets -v
```

期望输出包含：

```text
127.0.0.1:5555		TCP	Connected	localhost
```

安装 HAP：

```bash
env -u CODEX_SANDBOX_NETWORK_DISABLED \
  -u CODEX_CI \
  -u HTTP_PROXY \
  -u HTTPS_PROXY \
  -u ALL_PROXY \
  -u http_proxy \
  -u https_proxy \
  -u all_proxy \
  /Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc install -r \
  /path/to/entry-default.hap
```

普通 `aa start` 在当前模拟器 developer mode 下可能被锁屏策略拦截，报 `The device screen is locked during the application launch`。调试启动可使用 `-D`：

```bash
env -u CODEX_SANDBOX_NETWORK_DISABLED \
  -u CODEX_CI \
  -u HTTP_PROXY \
  -u HTTPS_PROXY \
  -u ALL_PROXY \
  -u http_proxy \
  -u https_proxy \
  -u all_proxy \
  /Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc shell \
  aa start -b com.lablines.sudoku -a EntryAbility -D
```

已验证结果：

- `install bundle successfully`
- `pidof com.lablines.sudoku` 能返回进程号
- 首页显示“数独实验室”，点击“闯关挑战”可进入 `LAB-01 · 起步热身`

## Release Notes

第一版上线前请核对：

- `docs/harmonyos-native-release-checklist.md`
- `docs/harmonyos-native-store-copy.md`

第一版保持离线可玩，不接入广告、支付、登录、排行榜或云同步，并关闭系统备份恢复能力。
