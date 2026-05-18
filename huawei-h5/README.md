# 华为 H5 快游戏预览

这个目录提供一份零依赖的 H5 预览入口，用于把小游戏共享运行时打包成浏览器可以直接加载的脚本。`main.js` 仍然是构建入口，`index.html` 加载构建后的 `dist/game.bundle.js`。

## 本地构建

在仓库根目录执行：

```sh
node huawei-h5/build.js
```

脚本会递归收集 `main.js` 里的相对 `require` 依赖，并写出：

```text
huawei-h5/dist/game.bundle.js
```

`huawei-h5/dist/` 是本地构建产物，不需要提交到仓库。

## 本地预览

构建完成后，可以用任意静态文件服务器打开 `huawei-h5/index.html`。例如：

```sh
python3 -m http.server 5173
```

然后访问：

```text
http://127.0.0.1:5173/huawei-h5/
```

## 华为 H5 快游戏包装

第一版交付的是浏览器 Bundle 和 H5 入口页面。接入华为 H5 快游戏时，可以把 `index.html`、`styles.css` 和 `dist/game.bundle.js` 放入快游戏 Web 容器资源中，再按华为工具链要求生成最终包体。

建议包装前先执行一次本地构建和浏览器预览，确认画布、触摸输入、音频和本地存档在目标浏览器环境中可用。

## 第一版不包含

第一版重点是复用现有小游戏运行时并提供 H5 预览能力，暂不包含：

- 华为账号、支付、广告、分享等平台能力接入。
- 自动生成 `.rpk` 或调用华为快游戏 IDE 的发布流程。
- 代码压缩、Tree Shaking、Source Map 或增量构建。
- 远程资源托管、CDN 缓存策略和生产监控。
