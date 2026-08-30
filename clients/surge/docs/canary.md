# Surge 上线后可选 Canary

以下步骤是上线后的可选实践反馈，不是 `current` 发布门禁。`current` 由自动化测试、规则预算、manifest 闭合和审计通过后发布。需要设备反馈时，建议按以下顺序：

1. 在测试 Sub-Store 集合使用唯一公开的 `current` 脚本，并显式设置 `channel=current&adblockMode=off`。
2. 先验证 Intel Mac，再验证 Apple Silicon Mac。
3. 再验证一台 iPhone 和一台 iPad。
4. 检查国内 App、国际站点、DNS、UDP、切换节点和断网恢复。
5. 观察一个完整更新周期；生产入口本身已经使用 `current`，无需等待设备反馈才能完成 promotion。

只要出现配置解析失败、国内 App 变慢或规则下载失败，就切回设备上保留的旧 Profile/Config，并保留失败时间、平台和生成参数用于排查；服务端修复后重新生成 current。

## 分流顺序、残余风险与离线解释

共享分流顺序固定为：`DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → `FINAL,漏网之鱼,dns-failed`。稳定 DNS 优先国内解析；普通 `.cn` 域名应命中 `ChinaTLD`/DIRECT，未知国内 IPv4/IPv6 应命中 `GEOIP,CN,DIRECT`，未知境外与 DNS 失败进入 `漏网之鱼`，默认出口由私密 policy 的 `final` 决定。HTTPDNS、硬编码 IP、IPv6、QUIC 和手动服务组选择仍是残余风险。`npm run explain:route -- --channel current --domain <域名>` 只读取本地已发布规则、不执行 DNS，可用于离线核对预期分流。支持蜂窝的设备必须分别测试 Wi‑Fi 与蜂窝；保留旧配置，并实际完成一次回滚。
