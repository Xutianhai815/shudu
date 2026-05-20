## 改动类型

- [ ] 核心玩法 / 数据 / 成长系统
- [ ] 微信小游戏适配
- [ ] H5 / 快游戏适配
- [ ] HarmonyOS 适配
- [ ] 文档 / 流程

## 复用检查

- [ ] 已确认没有重复实现已有核心逻辑
- [ ] 如涉及核心逻辑，已同步或复用共享模块
- [ ] 未提交 `output/`、`dist/`、`build/` 等本地产物

## 验证

请填写已运行的命令和结果：

```sh
node --test minigame/test/*.test.cjs
```

如适用：

```sh
node minigame/tools/render-snapshots.js
node huawei-h5/build.js
```
