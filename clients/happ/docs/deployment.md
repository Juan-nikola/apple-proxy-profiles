# HAPP 部署

## 公开 GeoData

1. 打开稳定入口：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html`。
2. HAPP 用户只使用最新的 `current/happ` 入口；任务片段不再填写或携带 `channel` 参数。
3. 日常设备和私密任务都固定使用 `current`；`edge` 和 `previous` 只属于维护者的内部灰度与回滚流程。

公开层不包含节点、订阅地址、密码、UUID 或 policy override。

## 私密 Sub-Store

在自己的 Sub-Store 中使用 `current/happ/scripts/happ-config-generator.js`，并把真实 collection 名称放在私密任务参数中。六个平台任务分别使用 `macos`、`iphone`、`ipad`、`android`、`windows`、`linux`；另建一个 `happ-routing-audit` 任务检查兼容性和策略解析。HAPP URL 必须保持 `/current/happ/`，片段中不要添加 `channel=current`、`channel=edge` 或 `channel=previous`。维护者的灰度和回滚由发布系统在内部处理，不暴露给 HAPP 用户。

### 业务组节点设置

HAPP 没有可视化的业务策略组。业务出口由私密 Sub-Store 任务的 `policyOverrides` 参数决定；六个平台配置任务和 `happ-routing-audit` 必须使用同一个值。

每个业务目标只接受三种值：

| 值 | 含义 |
| --- | --- |
| `FOLLOW` | 跟随 HAPP 首页当前选中的节点；首页换节点后一起换 |
| `DIRECT` | 直连，不经过代理 |
| `NODE:<完整节点名>` | 固定到一个节点；名称必须与 HAPP 配置中 `remarks` 的完整规范化名称逐字一致 |

当前业务键和默认目标如下：

| 业务组 | 内部键 | 默认 |
| --- | --- | --- |
| 🤖 AI 专用 | `ai` | `FOLLOW` |
| 🐙 GitHub | `github` | `FOLLOW` |
| 📺 YouTube | `youtube` | `FOLLOW` |
| 🎬 海外流媒体 | `globalMedia` | `FOLLOW` |
| 💬 海外社交 | `globalSocial` | `FOLLOW` |
| 🍎 Apple | `apple` | `DIRECT` |
| 🪟 Microsoft | `microsoft` | `DIRECT` |
| 🇨🇳 国内平台 | `domestic` | `DIRECT` |
| 🌍 海外游戏 | `overseasGame` | `FOLLOW` |
| ⬇️ 下载/P2P | `download` | `DIRECT` |
| 🧭 DNS 与规则下载 | `dnsAndRules` | `FOLLOW` |
| 最终兜底 | `final` | `FOLLOW` |

推荐操作顺序：

1. 先在 `apple-proxy-happ` 中维护你要给 HAPP 使用的节点，并 Preview 一个 HAPP 平台任务。
2. 从 JSON 中复制目标节点的 `remarks` 全值作为固定节点名。不要使用 Sub-Store 原始节点名、模糊名称或部分名称。
3. 打开 [HAPP 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html) 的本地策略助手，选择每个业务的 `FOLLOW`、`DIRECT` 或 `NODE:`，生成 Base64URL。该生成在浏览器本地完成。
4. 将同一个 Base64URL 填入 `happ-macos`、`happ-iphone`、`happ-ipad`、`happ-android`、`happ-windows`、`happ-linux` 和 `happ-routing-audit` 的 `policyOverrides` 参数。
5. 先 Preview `happ-routing-audit`。固定目标必须显示 `status=fixed` 且 `resolved` 为相同的 `NODE:`；出现 `missing-node`、`duplicate-node` 或 `incompatible-node` 时，运行时会退回 `FOLLOW`。
6. 再 Preview 对应平台配置，确认 JSON 非空后重新导入 HAPP。修改业务组后必须重新生成并重新导入 JSON。

也可以手工准备 UTF-8 JSON 后编码，例如：

```json
{
  "🤖 AI 专用": "NODE:<HAPP JSON 中的完整节点名>",
  "📺 YouTube": "NODE:<HAPP JSON 中的完整节点名>",
  "🍎 Apple": "DIRECT",
  "最终兜底": "FOLLOW"
}
```

未写入的业务使用默认值。`policyOverrides` 是 Base64URL，不是加密；完整任务 URL 和节点名称仍应只保存在私密 Sub-Store 中。

### HAPP 六平台 JSON 导入方式

当前兼容基线是 HAPP `4.0.5`/`5.6.0` 系列与 Xray `26.7.28`。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点；HAPP Profile 只负责 GeoData 与 Tunnel DNS。HAPP 路由开关对 JSON 订阅会被锁定，这是客户端的正常限制，不是路由关闭。

`macos`、`iphone`、`ipad`、`android`、`windows`、`linux` 六个平台的真实 File 响应都会自动附带同一格式的 `routing: happ://routing/onadd/<base64>`，由 HAPP 把 Profile 绑定到当前 JSON 订阅。

JSON 中的 follow/fixed 路由标签会包含规范化节点显示名和稳定内部 ID，例如 `happ-follow/🇺🇸 qqpw家宽 · VLESS｜自建·U [sr-0psum4z]`。标签只用于路由诊断和人工识别，不改变业务匹配；控制字符和路径分隔符会被清理，节点地址、UUID、密码不会写入标签。

按下面顺序操作：

1. 在 Sub-Store Preview 对应平台任务，确认输出是非空 JSON 数组；Preview 不会显示真实 HTTP 响应头，这是正常现象。
2. 在 HAPP 删除旧订阅条目和旧绑定 Profile，再导入同一平台的私密 File URL；不要跨平台混用 JSON，也不要手动复制公共 Profile。
3. HAPP 实际请求 File URL 时会收到 `routing` 响应头，并下载同一 `current` channel 的 `geoip.dat`、`geosite.dat`。连接前等待两份 GeoData 下载完成。
4. 连接后检查固定节点、国内外业务、局域网和 DNS；若仍出现 `geosite`/`geoip` 分类不存在、`NEAgentErrorDomain` 或 VPN 无效果，说明客户端仍在使用旧缓存，删除旧订阅后重新导入，不要只点击旧条目的 Refresh。

普通节点列表仍可使用公开安装页导入 Profile。JSON 订阅不要手动复制 routing.happ.su 的 Profile，也不要先绑定一个公共 Profile 再导入 JSON；Restricted Mode 下 Profile 必须由 JSON 订阅响应携带并自动绑定。

策略值只允许 `DIRECT`、`FOLLOW` 或 `NODE:<精确节点名>`。策略修改后重新生成所有相关私密任务，再导入新 JSON。节点名和 Profile deep link 不要提交到仓库或公开聊天。

## 回滚

保留旧 JSON 和旧 Profile。回滚时同时切换到 `previous` GeoData 与对应的 previous Profile；对应平台 JSON 必须重新导入 `previous` 任务，让响应头和 GeoData URL 一起回滚，避免通道名称和规则数据不匹配。
