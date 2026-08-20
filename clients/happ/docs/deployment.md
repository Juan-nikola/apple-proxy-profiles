# HAPP 部署

## 公开 GeoData

1. 打开与私密 Profile 相同的通道安装页：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html`。
2. 先安装该通道的 `geosite.dat` 和 `geoip.dat`，确认页面中的 hash 与下载结果一致。
3. 灰度时把 URL 中的 `current` 换成 `edge`；不要把 edge 工件直接当作稳定配置。

公开层不包含节点、订阅地址、密码、UUID 或 policy override。

## 私密 Sub-Store

在自己的 Sub-Store 中使用 `current/happ/scripts/happ-config-generator.js` 或 `edge/happ/scripts/happ-config-generator.js`，并把真实 collection 名称放在私密任务参数中。六个平台任务分别使用 `macos`、`iphone`、`ipad`、`android`、`windows`、`linux`；另建一个 `happ-routing-audit` 任务检查兼容性和策略解析。

### HAPP iOS 5.6.0 导入方式

当前兼容基线是 HAPP iOS `5.6.0`、Xray `26.7.28`、API `3.19.0`、iOS `27.0`。iPhone/iPad 任务使用项目精简 `HAPP-*` GeoData，并在真实 File 请求的 HTTP 响应中自动附带 `routing: happ://routing/onadd/<base64>`，由 HAPP 将 Profile 绑定到这一个 JSON 订阅。macOS、Android、Windows、Linux 继续使用客户端内置标准 GeoData 标签。

按下面顺序操作：

1. 在 Sub-Store Preview 对应 `happ-iphone` 或 `happ-ipad`，确认输出是非空 JSON 数组；Preview 不会显示真实 HTTP 响应头，这是正常现象。
2. 在 HAPP 删除旧的 iOS 订阅条目，再直接导入该任务的私密 File URL；不要把 macOS JSON 导入 iOS，也不要把公共安装页的 Profile 手动复制到 JSON 订阅。
3. HAPP 实际请求 File URL 时会收到 `routing` 响应头，并下载同一 `channel` 的 `geoip.dat`、`geosite.dat`。连接前等待两份 GeoData 下载完成。
4. 连接后检查规则命中和 DNS；若仍出现旧的 `HAPP-*` 分类错误、`NEAgentErrorDomain` 或 VPN 无效果，说明客户端仍在使用旧缓存，删除订阅后重新添加，不要只点击旧条目的 Refresh。

普通节点列表仍可使用公开安装页导入 Profile；但 JSON 订阅的 Profile 必须由订阅响应携带，不能事后手动绑定。

策略值只允许 `DIRECT`、`FOLLOW` 或 `NODE:<精确节点名>`。策略修改后重新生成所有相关私密任务，再导入新 JSON。节点名和 Profile deep link 不要提交到仓库或公开聊天。

## 回滚

保留旧 JSON 和旧 Profile。回滚时同时切换到 `previous` GeoData 与对应的 previous Profile；iOS JSON 必须重新导入 `previous` 任务，让响应头和 GeoData URL 一起回滚，避免通道名称和规则数据不匹配。
