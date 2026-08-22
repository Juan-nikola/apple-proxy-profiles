# Domain Fallback Routing Design

**Date:** 2026-08-22

## Goal

让未知域名在不加载 blackmatrix7 完整中国域名表的前提下，按 DNS/IP 结果选择直连或代理，并保证受限内存平台不会加载 sing-box 完整规则目录。

## Decisions

1. 业务域名规则优先；只有未命中业务规则时才进入 IP 回落。
2. 中国 IP 回落使用现有 `ChinaIP` 规则集或客户端原生 `GEOIP/GeoIP` 能力，命中后 `DIRECT`，未命中后使用默认代理。
3. 不加入 `ChinaMax_Domain` 或其他完整域名表到默认客户端配置。
4. sing-box 的 iPhone、iPad、Android 统一使用 `mobile-rule-sets`；macOS 保留完整业务规则目录。
5. `dnsMode=stable` 继续作为默认的国内应用优先模式；`privacy` 保留代理 DNS 的隐私取舍。

## Scope

- 修改共享平台判定，避免 Android 漏用移动规则包。
- 修改 sing-box 规则与 DNS 渲染器及其验证测试。
- 增加跨客户端回落契约测试，锁定 `GEOIP,CN,DIRECT`、Egern `geoip`、sing-box `resolve -> ChinaIP` 以及 HAPP/OneXray GeoIP 回落顺序。
- 更新维护文档，解释“先判断再连接”的行为和完整域名表不默认启用的原因。

## Non-goals

- 不实现直连失败后的自动代理重试。
- 不收集用户访问域名。
- 不改变既有业务组、节点选择器或代理协议。
- 不把完整中国域名表复制到任何移动端配置。

## Acceptance Criteria

- iPhone、iPad、Android 生成的 sing-box 配置只引用移动规则目录。
- macOS sing-box 仍引用完整业务规则目录。
- 所有客户端的中国 IP 回落规则位于最终默认代理之前。
- 默认构建产物不引用 `ChinaMax`、`ChinaMax_Domain` 或完整域名 URL。
- 现有测试与客户端验证通过。
