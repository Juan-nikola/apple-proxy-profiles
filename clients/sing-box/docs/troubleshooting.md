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

移动端只生成一个 `⚡ 全部自动` URLTest；地区组保留选择器，不额外并发测速。重新从 Sub-Store 预览并导入最新配置，确认 JSON 中只有一个 `"type": "urltest"`。

## IPv6 与 QUIC

如果网络没有稳定 IPv6，把任务的 `ipv6Mode` 改为 `ipv4-only`。`quicMode=proxy-block` 只阻断代理路径上的 UDP/443，国内直连 QUIC 保留；`all-block` 阻断全部应用 QUIC；`allow` 不添加阻断规则。

## 规则下载与 DNS

代理 DNS 使用 `⚡ 全部自动`，规则下载使用 `🧭 DNS 与规则下载`，两者不会互相解析形成启动环路。`dns-direct` 必须通过 `DIRECT` 出站；如果节点域名解析失败，先检查国内 DNS，再切换到 IP/备用节点。

OpenWrt 透明网关不在本阶段范围内；不要用旧 OpenWrt JSON 代替终端配置。
