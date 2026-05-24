# Bilibili Watchlater

[English README](README.md)

Bilibili Watchlater 是一个 Chrome/Edge 浏览器扩展，用来把你选定的 B 站 UP 主最新视频自动加入你自己的「稍后再看」列表。

扩展完全在浏览器本地运行。它使用你当前浏览器里已经登录的 B 站状态，通过 `chrome.storage.local` 保存配置和同步记录，不会把 Cookie、UP 主列表或同步历史上传到任何第三方服务器。

## 功能

- 管理需要关注的 B 站 UP 主。
- 在管理页显示 UP 主头像、昵称和空间链接。
- 支持 dry-run 预览模式，先看候选视频，不实际加入稍后再看。
- 支持从 popup 手动同步。
- 支持通过 `chrome.alarms` 做浏览器级定时同步。
- 自动同步真实加入前有额外安全开关，避免误操作。
- 记录已成功加入的视频，避免重复添加。
- 对临时失败做重试，对连续失败的视频做冷却。
- 在 `space.bilibili.com/{mid}` 页面右下角提供一键添加 UP 主按钮。
- 支持导入和导出配置。

## 本地安装

克隆仓库：

```bash
git clone https://github.com/Holmze/bilibili-watchlater.git
cd bilibili-watchlater
```

加载未打包扩展：

1. 打开 Chrome 或 Edge。
2. 访问 `chrome://extensions/`。
3. 打开右上角「开发者模式」。
4. 点击「加载已解压的扩展程序」。
5. 选择刚刚克隆下来的 `bilibili-watchlater` 目录。

如果你是从 GitHub Release 下载 zip，可以先解压，然后在浏览器扩展页面选择解压后的目录。

## 首次使用

1. 确认你已经在同一个浏览器 Profile 里登录 B 站。
2. 点击扩展图标，进入 popup。
3. 点击 `Options` 打开设置页。
4. 添加一个或多个 UP 主：
   - 在 `UP Owners` 中手动填写 UP 主 `mid`。
   - 或者打开 `https://space.bilibili.com/{mid}` 页面，点击右下角 `Add to Watchlater Bot`。
5. 保持 `Dry-run only` 开启。
6. 点击 `Save`。
7. 回到 popup，点击 `Sync now`。
8. 检查候选视频是否符合预期。
9. 确认无误后，再关闭 `Dry-run only`。
10. 先手动执行一次真实同步，确认视频进入 B 站稍后再看。
11. 手动同步确认正常后，再开启自动同步。

自动同步要真实加入视频，需要同时满足：

- `Dry-run only` 已关闭。
- `Allow auto live sync when dry-run is off` 已开启。

这个双重开关是为了避免你在调试配置时误开启自动真实添加。

## 设置说明

- `Dry-run only`：只预览候选视频，不调用「加入稍后再看」接口。默认开启。
- `Auto sync with browser alarms`：开启浏览器级定时同步。
- `Allow auto live sync when dry-run is off`：允许自动同步在非 dry-run 模式下真实加入视频。
- `Page size`：每个 UP 主每次拉取的最新视频数量。
- `Max age hours`：只处理最近多少小时内发布的视频。留空表示不按发布时间过滤。
- `Add interval seconds`：真实添加多个视频时，每次添加之间等待的秒数。
- `Fetch retries` / `Add retries`：拉取视频或添加视频失败时的重试次数。
- `Failed cooldown minutes`：同一个视频连续失败达到阈值后，暂停重试的时间。

## 本地保存的数据

扩展会在浏览器本地保存：

- `settings`：UP 主列表和同步配置。
- `processedVideos`：已成功加入的视频，用于避免重复添加。
- `failedVideos`：连续失败的视频、失败次数和最近错误原因。
- `lastSync` / `syncHistory`：最近同步结果。
- `lastDiagnostics`：最近诊断结果。
- `syncLock`：短期同步锁，避免手动同步和自动同步重叠运行。

扩展不会显示、导出或保存原始 B 站 Cookie 值。

## 权限说明

- `cookies`：读取 B 站登录状态和接口需要的 CSRF token。
- `storage`：保存本地配置和同步状态。
- `alarms`：执行浏览器级定时同步。
- `tabs`：查找或打开 B 站页面。
- `scripting`：在 B 站页面上下文中提交「加入稍后再看」请求。
- `https://*.bilibili.com/*`：访问扩展所需的 B 站页面和接口。

`tabs` 和 `scripting` 是为了解决 B 站接口对 POST 请求来源的校验问题。扩展会把「加入稍后再看」请求放到 B 站页面上下文中执行，避免后台 service worker 直接请求时被拒绝。

## 开发

运行检查：

```bash
node --check src/background.js
node --check src/bilibili.js
node --check src/content-space.js
node --check src/page-add.js
node --check src/storage.js
node --check src/sync.js
node --check popup/popup.js
node --check options/options.js
node --test tests/*.test.js
python3 -m json.tool manifest.json
```

生成发布包：

```bash
npm run package
```

输出文件：

- `dist/`：未压缩扩展目录。
- `bilibili-watchlater-extension.zip`：可用于 Release 或商店提交的压缩包。

## 发布相关

文档：

- [隐私政策](docs/PRIVACY.md)
- [Chrome/Edge 商店文案草稿](docs/STORE_LISTING.md)
- [发布指南](docs/PUBLISHING.md)

目前可以通过 GitHub Release 发布 zip 包。Chrome Web Store 和 Microsoft Edge Add-ons 后续也可以使用同一份扩展 zip 提交。

## 常见问题

### 自动同步是不是系统后台常驻？

不是。自动同步使用浏览器的 `chrome.alarms`。浏览器关闭、电脑休眠或扩展被停用时，它不会像服务器任务那样持续运行。

### 为什么要先 dry-run？

dry-run 可以让你先确认候选视频是否正确，避免配置错误导致视频被误加入稍后再看。

### 为什么需要打开 B 站页面？

真实加入稍后再看时，扩展会优先复用已有 B 站标签页。如果没有，它会自动打开一个临时 B 站首页标签页，执行完成后关闭。这样可以让请求更接近网页端正常操作。

### 会不会上传我的 Cookie？

不会。扩展只在浏览器本地读取 B 站 Cookie，用来向 B 站接口发起请求。不会把 Cookie 发送给开发者或第三方服务器。

### B 站接口变了怎么办？

这个扩展使用的是 B 站网页端接口，不是官方稳定开放 API。如果 B 站接口变更，可能需要更新扩展适配逻辑。

## 限制

- 自动同步依赖浏览器运行状态。
- B 站网页端接口可能变化。
- 扩展不会绕过验证码、风控或登录验证。
