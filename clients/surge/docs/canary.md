# Surge 灰度顺序

建议按以下顺序做 canary：

1. 先在测试 Sub-Store 集合使用 `edge` 脚本，并显式设置 `channel=edge&adblockMode=off`。
2. 先验证 Intel Mac，再验证 Apple Silicon Mac。
3. 再验证一台 iPhone 和一台 iPad。
4. 检查国内 App、国际站点、DNS、UDP、切换节点和断网恢复。
5. 观察一个完整更新周期后，再把脚本 URL 和 `channel` 一起切换到 `current`。

只要出现配置解析失败、国内 App 变慢或规则下载失败，就回退到上一版 `current`，并保留失败时间、平台和生成参数用于排查。

## 分流顺序、残余风险与离线解释

共享分流顺序固定为：`DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → FINAL。稳定 DNS 优先国内解析；普通 `.cn` 域名应命中 `ChinaTLD`/DIRECT，未知国内 IPv4/IPv6 应命中 `GEOIP,CN,DIRECT`，未知境外与 DNS 失败走 `FINAL,🚀 节点选择,dns-failed`。HTTPDNS、硬编码 IP、IPv6、QUIC 和手动服务组选择仍是残余风险。`npm run explain:route -- --channel current --domain <域名>` 只读取本地已发布规则、不执行 DNS，可用于离线核对预期分流。支持蜂窝的设备必须分别测试 Wi‑Fi 与蜂窝；保留旧配置，并实际完成一次回滚。
