# HAPP 排障

- **页面打不开或下载失败**：先确认设备能访问 GitHub Pages，再检查 URL 是否为 `https` 且使用公开稳定入口 `current/happ`。HAPP 任务片段不应出现 `channel=`；`edge` 和 `previous` 只供维护者内部灰度或回滚。
- **GeoData hash 不一致**：停止导入，重新下载同一通道的 manifest 和两个 `.dat` 文件；不要手工编辑二进制。
- **JSON 为空**：在 Sub-Store 分别预览 collection 和 HAPP 任务，确认至少有一个兼容节点。
- **固定节点未命中**：节点名必须大小写、空格和标点完全一致；修正策略后重新生成 JSON。
- **HAPP 路由开关显示锁定**：JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点；HAPP 路由开关对 JSON 订阅会被锁定，这是正常行为。不要把“开关锁定”当成路由没有生效，也不要用 routing.happ.su 的链接手动覆盖 JSON 订阅 Profile。
- **内核提示 `balancer ... not found`**：这是旧版 HAPP JSON 的结构问题，旧输出把固定节点 balancer 放在了配置顶层。不要继续刷新旧订阅；在 Sub-Store 重新 Preview 对应平台任务，确认新版 JSON 将 balancer 放在 `routing.balancers`，然后删除 HAPP 旧订阅条目并重新导入。
- **iOS 提示‘超出隧道内存限制（50 MB）’**：先在 Sub-Store 重新 Preview 对应平台任务，确认输出非空；真实 File 请求会通过 `routing` 响应头绑定 Profile，Preview 看不到响应头是正常的。删除 HAPP 中旧的订阅条目后重新导入新版 JSON，并重启 HAPP。不要跨平台混用 JSON，也不要混用不同发布通道。
- **日志出现 `illegal domain rule: geosite:*`、`NEAgentErrorDomain` 或 VPN 没有效果**：通常是旧 JSON、旧 Profile 或旧 GeoData 缓存仍被使用。删除旧订阅，重新导入新版 File URL，等待 `current` GeoData 下载成功后再连接；不要在 JSON 订阅上手动复制公共 Profile。
- **Sub-Store Preview 看不到 `routing` 响应头**：这是预览请求的限制，不代表生产 File 没有响应头。用真实私密 File URL 在 HAPP 中删除旧条目后重新导入，才会触发 Profile 绑定。
- **导入后无流量**：确认先安装 `current` GeoData，再导入 `current` JSON；检查 HAPP VPN 权限、DNS 和节点连通性。
- **需要回滚**：切回旧 JSON，并同时安装 previous GeoData 和 previous Profile。不要把 current Profile 与 previous GeoData 混用。

日志和审计只保留脱敏的错误类别、时间、平台和 hash；不要分享节点地址、完整订阅 URL 或凭据。
