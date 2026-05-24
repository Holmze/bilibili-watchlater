# POC Test Notes

## 浏览器验证结果

用户已在浏览器扩展环境验证：

```text
cookies:ok | nav:ok | space:ok | alarm:ok
```

结论：纯插件方案可行。当前代码已经从 POC 扩展为最小同步框架。

## 加入稍后再看 POST

后台 service worker 直接 POST `x/v2/history/toview/add` 时，用户遇到过：

```text
HTTP 412
```

当前修复方式：后台只负责同步编排，实际添加动作通过 `chrome.scripting.executeScript` 注入到 B 站标签页主环境中执行，使请求来源回到 `https://www.bilibili.com` 页面上下文。

## 长期运行优化

当前版本已经加入：

- `syncLock` 同步锁，避免手动和自动任务重叠。
- 自动 live sync 二次保护。
- 添加间隔、拉取重试、添加重试。
- 失败分类和失败冷却。
- 临时 B 站 tab 自动关闭。
- UP 主主页一键添加。
- popup 视频链接和暂停/恢复自动同步。
- Options 配置导入/导出。

## 已完成的本地静态验证

```bash
python3 -m json.tool manifest.json
node --check src/wbi.js
node --check src/bilibili.js
node --check src/background.js
node --input-type=module -e "import { signWbiParams } from './src/wbi.js'; const signed = await signWbiParams({mid:1,ps:10}, '7cd084941338484aae1ad9425b84077c', '4932caff0ff746eab6f01bf08b70ac45', 1700000000); console.log(signed.w_rid);"
```

期望 WBI 签名：

```text
7be8078d0046554890d487ede07159d6
```

当前已通过。

## 需要在浏览器里验证的部分

这些能力只能在 Chrome/Edge 扩展环境里验证：

- `chrome.cookies.get` 是否能读到 B 站的 `SESSDATA` 和 `bili_jct`。
- 扩展 service worker 的 `fetch(..., { credentials: "include" })` 是否会携带 B 站登录态。
- B 站是否接受扩展发起的 `x/space/wbi/arc/search` 请求。
- `chrome.alarms` 是否创建成功。

## 结果解释

### 全部成功

```text
cookies:ok | nav:ok | space:ok | alarm:ok
```

说明纯插件方案基本可行。下一步可以实现：

- UP 主列表管理。
- 已处理视频去重。
- dry-run/实际加入稍后再看开关。
- `chrome.alarms` 定时同步。

### cookies 成功，nav 失败

说明 Cookie 能读到，但扩展后台请求没有被 B 站接受。优先检查：

- 是否在同一个浏览器 Profile 登录 B 站。
- 是否登录 `www.bilibili.com`。
- 扩展权限是否完整。
- Service worker console 里的错误。

### nav 成功，space 失败

说明登录态可用，但投稿接口请求失败。优先检查：

- WBI key 是否返回。
- 签名参数是否变化。
- B 站是否增加了额外请求头或风控。

### alarm 成功

只能说明插件可定时触发。它不是系统常驻服务，浏览器关闭或电脑睡眠时不会持续运行。
