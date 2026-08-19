# OneXray 排障

- **GeoData 安装失败**：确认下载链接是无 query/fragment 的 HTTPS URL，并核对 manifest 中的文件 hash。
- **Profile 与规则不匹配**：检查 Profile 的 channel 与安装页 channel 是否一致；不一致时同时切换到同名通道。
- **节点为空**：在 Sub-Store 预览 `onexray-nodes`，确认 collection 中存在 OneXray 支持的协议。
- **固定业务失败**：固定节点是在生成 Profile 时解析的快照；修复节点后必须重新生成并重新导入 Profile。
- **macOS 无流量**：检查 System Extension、VPN/TUN 权限和应用状态，再查看脱敏日志。
- **回滚**：重新安装 previous 的两个 GeoData 文件，并导入对应 previous Profile；不要混用 current 与 previous。

分享诊断时只保留平台、时间、错误类别和 hash，删除节点地址、订阅 URL、UUID、密码和完整 deep link。
