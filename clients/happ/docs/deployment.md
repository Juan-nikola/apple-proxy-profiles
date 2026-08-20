# HAPP 部署

## 公开 GeoData

1. 打开稳定入口：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html`。
2. 先安装 `current` 的 `geosite.dat` 和 `geoip.dat`，确认页面中的 hash 与下载结果一致。
3. 日常设备和私密任务都固定使用 `current`；`edge` 只由维护者用于灰度验证，不要把它填入生产任务。

公开层不包含节点、订阅地址、密码、UUID 或 policy override。

## 私密 Sub-Store

在自己的 Sub-Store 中使用 `current/happ/scripts/happ-config-generator.js`，并把真实 collection 名称放在私密任务参数中。六个平台任务分别使用 `macos`、`iphone`、`ipad`、`android`、`windows`、`linux`；另建一个 `happ-routing-audit` 任务检查兼容性和策略解析。维护者只有在灰度时才会临时生成 `edge` 任务。

### HAPP 六平台 JSON 导入方式

当前兼容基线是 HAPP `4.0.5`/`5.6.0` 系列与 Xray `26.7.28`。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点；HAPP Profile 只负责 GeoData 与 Tunnel DNS。HAPP 路由开关对 JSON 订阅会被锁定，这是客户端的正常限制，不是路由关闭。

`macos`、`iphone`、`ipad`、`android`、`windows`、`linux` 六个平台的真实 File 响应都会自动附带同一格式的 `routing: happ://routing/onadd/<base64>`，由 HAPP 把 Profile 绑定到当前 JSON 订阅。

按下面顺序操作：

1. 在 Sub-Store Preview 对应平台任务，确认输出是非空 JSON 数组；Preview 不会显示真实 HTTP 响应头，这是正常现象。
2. 在 HAPP 删除旧订阅条目和旧绑定 Profile，再导入同一平台的私密 File URL；不要跨平台混用 JSON，也不要手动复制公共 Profile。
3. HAPP 实际请求 File URL 时会收到 `routing` 响应头，并下载同一 `current` channel 的 `geoip.dat`、`geosite.dat`。连接前等待两份 GeoData 下载完成。
4. 连接后检查固定节点、国内外业务、局域网和 DNS；若仍出现 `geosite`/`geoip` 分类不存在、`NEAgentErrorDomain` 或 VPN 无效果，说明客户端仍在使用旧缓存，删除旧订阅后重新导入，不要只点击旧条目的 Refresh。

普通节点列表仍可使用公开安装页导入 Profile；但 JSON 订阅的 Profile 必须由订阅响应携带，不能事后手动绑定。

策略值只允许 `DIRECT`、`FOLLOW` 或 `NODE:<精确节点名>`。策略修改后重新生成所有相关私密任务，再导入新 JSON。节点名和 Profile deep link 不要提交到仓库或公开聊天。

## 回滚

保留旧 JSON 和旧 Profile。回滚时同时切换到 `previous` GeoData 与对应的 previous Profile；对应平台 JSON 必须重新导入 `previous` 任务，让响应头和 GeoData URL 一起回滚，避免通道名称和规则数据不匹配。
