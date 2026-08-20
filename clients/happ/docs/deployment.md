# HAPP 部署

## 公开 GeoData

1. 打开与私密 Profile 相同的通道安装页：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html`。
2. 先安装该通道的 `geosite.dat` 和 `geoip.dat`，确认页面中的 hash 与下载结果一致。
3. 灰度时把 URL 中的 `current` 换成 `edge`；不要把 edge 工件直接当作稳定配置。

公开层不包含节点、订阅地址、密码、UUID 或 policy override。

## 私密 Sub-Store

在自己的 Sub-Store 中使用 `current/happ/scripts/happ-config-generator.js` 或 `edge/happ/scripts/happ-config-generator.js`，并把真实 collection 名称放在私密任务参数中。六个平台任务分别使用 `macos`、`iphone`、`ipad`、`android`、`windows`、`linux`；另建一个 `happ-routing-audit` 任务检查兼容性和策略解析。

手机端注意：HAPP JSON 统一使用客户端内置 Xray GeoData 能识别的标准 `geosite`/`geoip` 标签；公开频道 GeoData 不会自动替换 HAPP.app 的内置资产。请始终把 iPhone/iPad 任务与同一频道安装页配对；不要把 macOS 任务输出或另一频道的旧 JSON 混用。

策略值只允许 `DIRECT`、`FOLLOW` 或 `NODE:<精确节点名>`。策略修改后重新生成所有相关私密任务，再导入新 JSON。节点名和 Profile deep link 不要提交到仓库或公开聊天。

## 回滚

保留旧 JSON 和旧 Profile。回滚时同时切换到 `previous` GeoData 与对应的 previous Profile，避免通道名称和规则数据不匹配。
