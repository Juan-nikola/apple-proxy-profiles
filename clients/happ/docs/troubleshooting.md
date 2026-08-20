# HAPP 排障

- **页面打不开或下载失败**：先确认设备能访问 GitHub Pages，再检查 URL 是否为 `https` 且通道为 `edge`、`current` 或 `previous`。
- **GeoData hash 不一致**：停止导入，重新下载同一通道的 manifest 和两个 `.dat` 文件；不要手工编辑二进制。
- **JSON 为空**：在 Sub-Store 分别预览 collection 和 HAPP 任务，确认至少有一个兼容节点。
- **固定节点未命中**：节点名必须大小写、空格和标点完全一致；修正策略后重新生成 JSON。
- **iOS 提示‘超出隧道内存限制（50 MB）’**：这是旧版 HAPP iOS 配置仍引用大型内置 GeoSite 分类造成的。请在 Sub-Store 重新 Preview `happ-iphone` 或 `happ-ipad`，确认生成时间已更新；删除 HAPP 中旧的 iOS 订阅条目后重新导入新版 JSON，并重新打开当前频道安装页完成 GeoData 更新。iOS/iPadOS 任务会使用项目随频道发布的紧凑 `HAPP-*` 分类，macOS 任务继续使用桌面兼容分类。不要把 `happ-macos` 输出导入 iOS，也不要混用 `edge` 与 `current` 的 GeoData。
- **导入后无流量**：确认先安装 GeoData，再导入相同通道的 JSON；检查 HAPP VPN 权限、DNS 和节点连通性。
- **需要回滚**：切回旧 JSON，并同时安装 previous GeoData 和 previous Profile。不要把 current Profile 与 previous GeoData 混用。

日志和审计只保留脱敏的错误类别、时间、平台和 hash；不要分享节点地址、完整订阅 URL 或凭据。
