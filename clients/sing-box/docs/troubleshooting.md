# sing-box 排障

## 配置无法启动

先确认 App 使用的核心版本属于当前 edge/current 对应的 sing-box 1.14 testing 契约，再运行：

```bash
sing-box format --config config.json
sing-box check --config config.json
```

不要把旧配置缓存、OpenWrt 配置或其他客户端的 JSON 交叉导入 Apple/Android。

## 国内站点走了代理

查看目标域名是否命中 `DomesticCore`、`ChinaTLD`，以及 `ChinaIP` rule-set 是否成功下载。未配置域名通过 DNS response matching 判断；如果它解析到海外 CDN IP，按 GeoIP 结果代理是预期行为。

## 海外站点打不开

先在 `🚀 节点选择` 切换节点，再检查域名是否命中海外业务规则和 `dns-proxy`。如果是未配置域名，生成器会优先使用代理 DoH 解析非中国地址。规则下载失败时，检查当前节点能否访问 GitHub Pages。

## iPhone/iPad 内存压力

Android 生成 `⚡ 全部自动` 和规则下载专用 URLTest；iPhone/iPad 保留低频业务 URLTest 以及规则下载专用 URLTest，并使用 `ipv4-only`、`log.level=warn`、关闭 `experimental.cache_file.enabled` 和 `store_dns`。重新从 Sub-Store 预览并导入最新配置，确认 iOS JSON 的 `route.rule_set` 恰好有 14 项。

## IPv6 与 QUIC

如果网络没有稳定 IPv6，把任务的 `ipv6Mode` 改为 `ipv4-only`。`quicMode=proxy-block` 只阻断代理路径上的 UDP/443，国内直连 QUIC 保留；`all-block` 阻断全部应用 QUIC；`allow` 不添加阻断规则。

## 规则下载与 DNS

代理 DNS 使用 `⚡ 全部自动`，规则下载使用 `🧭 DNS 与规则下载`，两者不会互相解析形成启动环路。规则下载组默认指向 `🧭 规则下载故障转移`，该 URLTest 直接探测实际的 `Hijacking.srs` 规则文件，并在节点连接拒绝、超时或 TLS/握手失败时切换候选；同时保留 `🚀 节点选择` 和 `DIRECT` 手动备用。如果策略明确将 `dnsAndRules` 设为 `DIRECT`，生成器会直接使用 `DIRECT`。DNS 服务器不再使用 `detour: DIRECT`；新版 sing-box 会拒绝把空 `DIRECT` 出站作为 DNS detour，生成器会用 DNS 提供商 IP 的显式直连规则保证启动可用。

如果新配置仍报告 `lookup <node-host>: context deadline exceeded`，说明该节点的域名解析失败；故障转移组会尝试其他节点，但当所有候选和 `DIRECT` 都无法访问 GitHub Pages 时仍会在规则集初始化阶段报错。此时检查网络、国内 DNS 和节点地址，并确认客户端已刷新到包含 `🧭 规则下载故障转移` 的新配置。

OpenWrt 透明网关不在本阶段范围内；不要用旧 OpenWrt JSON 代替终端配置。
