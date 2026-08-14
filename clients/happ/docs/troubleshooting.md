# Happ 排障

先切回保留的旧订阅，再在 Sub-Store 查看私密预览与 `happ-routing-audit`；不要公开 URL、节点或完整日志。

## 生成期：审计与订阅摘要

- **空订阅**：`apple-proxy-sources` 为空，或跳过 renderer 无法表示的节点后没有 Happ 节点。先分别预览来源与组合，确认至少一个可接受节点；不要导入空 JSON。
- **缺失节点**：`NODE:名称` 没有同名节点，审计为 `missing-node-fallback`，自动改为 `FOLLOW`。
- **重名节点**：兼容节点中同名不止一个，审计为 `duplicate-node-fallback`，自动改为 `FOLLOW`；在私密源把名称改成唯一值。
- **不兼容协议**：同名节点存在但不能由 Happ/Xray 渲染，会跳过并计入 `renderFailures`；不要伪造协议字段，改用兼容节点。
- **改名/大小写不一致**：节点显示名改过、大小写或空格不完全一致时视为缺失。回到中文目标更新 `NODE:` 后，重新生成同一份 Base64URL 并复制进七任务。
- **Base64URL 错误**：只接受无 `=` 填充、无 `+`/`/` 的 canonical Base64URL；JSON 必须是普通对象，业务键和目标值必须受支持。回助手重新复制，不要手改。
- **geodata 未导入或通道不一致**：先从公开助手导入对应 `edge`/`current` 路由/geodata Profile，确认 `geosite.dat` 与 `geoip.dat` 下载成功，再刷新 JSON；不要把 JSON 订阅误当作 geodata 安装包。

生成期警告只出现在每个 JSON 项的 `meta.serverDescription` 与私密 `happ-routing-audit`。它们不会说明运行时健康状态。

## 运行期：固定节点健康与恢复

固定节点临时失败时，路由会回退当前 `FOLLOW`；固定节点恢复后会恢复选用。这个 fallback/recovery 仅在 **Happ/Xray 日志**可见，不会回写到 `meta.serverDescription` 或审计。记录时间、平台、网络、非敏感错误类别和日志证据；不要把节点地址或凭据贴出。

若 DNS、IPv4/IPv6、QUIC、休眠唤醒或切网后异常，先检查当前网络和路由/geodata Profile 是否仍存在，再刷新相同平台 JSON，最后重启 Happ。一次只改一个变量；持续失败则回滚旧订阅并停止提升 current。
