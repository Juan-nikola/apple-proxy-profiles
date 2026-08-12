# OneXray 诊断与回滚

## 1. 固定节点故障语义

固定业务节点写在 Profile 生成时的固定快照里。运行中固定节点故障时，只有该业务会失败：它不会自动回退到主节点，也不会自动切换到别的节点。系统不会自动通知、不会自动修复、也不提供应急 Profile。你要自己发现故障并修复。

节点刷新与固定快照是两件事：

- `onexray-nodes` 刷新节点订阅，只影响新建连接和主节点候选列表。
- 固定业务引用的是 Profile 生成时保存的固定快照；修复固定节点后，必须重新生成并重新导入 Profile 才能让固定业务使用新凭据。

## 2. 怎么判断问题在哪一层

按顺序检查：

1. OneXray 的 VPN/服务状态是否已连接；状态页显示断开时先重启 VPN。
2. 用 App 内 Ping 或连通性测试检查主节点与固定节点；Ping 失败通常是节点或网络问题。
3. 查看 Xray 日志：连接失败、规则匹配和 DNS 结果都会记录。
4. 只测单个业务：打开该业务域名，确认是否只有固定业务失败。

## 3. macOS 日志注意事项

macOS 上 OneXray 的流量依赖系统扩展（System Extension）。系统扩展未批准或未加载时，TUN 不会接管流量，Xray 日志可能只显示少量连接记录甚至为空。先检查系统设置中的系统扩展状态，再查看 OneXray 状态、Ping 和 Xray 日志。不要把系统扩展的日志或路径截图分享到公开渠道。

## 4. 常见故障

### 4.1 全部网站都无法连接

- 检查 VPN 开关与 TUN 权限。
- 检查系统扩展是否加载。
- 检查主节点是否 Ping 通。

### 4.2 只有固定业务失败

- 这是固定节点故障的预期行为。
- 修复节点后重新生成并重新导入 Profile。
- 不要期待重启 VPN 或刷新订阅能自动修复固定业务。

### 4.3 国内直连失败

- 确认当前 Profile 与当前 GeoData 的通道一致。
- 检查 DNS 是否走了国内解析。
- 查看 Xray 日志中对应域名的规则命中。

### 4.4 QUIC 或 IPv6 行为异常

- 按 `docs/canary.md` 重跑 QUIC/Block/IPv6 用例。
- 修改 `quicMode` 或 `ipv6Mode` 后必须重新生成并重新导入 Profile。

## 5. 回滚

回滚到 previous：

1. 打开 previous 的 GeoData 安装页，安装 previous 的 `geosite` 和 `geoip`。
2. 用之前保存的 previous Profile deep link 重新导入 previous Profile。
3. 选择“Rule 模式”，重启 VPN。

注意：保留 previous Profile 不会自动保留 previous GeoData；两者必须同时切换。current 与 previous 必须同名配对，不要混用。
