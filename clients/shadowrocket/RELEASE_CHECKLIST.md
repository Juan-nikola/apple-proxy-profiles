# Release Checklist

自动发布检查由本地构建完成；只有命令实际成功后才勾选。Sub-Store 预览和设备灰度必须由用户完成，本地构建不会代替勾选。

## 自动发布检查

- [x] `node --version` is 22 or newer.
- [x] `npm ci` succeeds from a clean dependency directory.
- [x] `npm test` passes.
- [x] `npm run build` succeeds twice with byte-identical `clients/shadowrocket/dist/` output.
- [x] `npm run fixtures` succeeds twice with byte-identical `clients/shadowrocket/examples/` output.
- [x] `npm --workspace @apple-proxy-profiles/shadowrocket run check:rules` reports all 33 pinned compiler inputs healthy, including default, optional, and input-only sources; check this only after the live command succeeds.
- [x] `npm run check:secrets` reports no potential secret.
- [x] macOS, iPhone, and iPad Profiles contain `[General]`, `[Proxy Group]`, and `[Rule]`.
- [x] Root selector is exactly `🚀 节点选择 = select,🌏 亚太,🌍 欧洲,🌎 美洲`; continent groups contain only flag groups, and every dynamic group uses the configured `<subscriptionName>,use=true` source and contains no `include-all-proxies` field.
- [x] Current default profiles use `adblockMode=off`, contain `DomesticCore`/`DomesticGame`/`SteamCN` DIRECT, route `OverseasGame` to `🌍 海外游戏`, then apply `ChinaIP`, `GEOIP,CN,DIRECT`, and the final proxy fallback.
- [x] `adblockMode=full` adds only the optional `Advertising.list` and `Advertising_Domain.list`; neither is referenced by the default profile.
- [x] macOS renders IPv4-only and proxy QUIC blocking; iPhone/iPad retain IPv6 with proxy QUIC blocking.
- [x] No Profile contains a server, port/credential pair, UUID, PSK, key, Token, subscription URL, or Profile URL.

Historical compatibility audit note (2026-08-02): the retired default migration from `AdvertisingLite` to full `Advertising` validated `Advertising.list` and `Advertising_Domain.list`, plus the former `ChinaMax_Domain`/`ChinaMax` stack. These names remain only as rollback-baseline evidence and are not current defaults. The current checker validates 33 inputs at the pinned compiler commit, including `ChinaIPs` and optional advertising inputs.

## 用户完成：Sub-Store 功能预览

- [ ] Node bundle executes through a Sub-Store functional Script Operator preview.
- [ ] Profile bundle executes through a Sub-Store File Script Operator preview.
- [ ] Preview diagnostics contain only totals and category counts.

## 用户完成：Intel Mac 灰度

- [ ] Old Intel Mac subscription and Profile remain available before canary import.
- [ ] User, not the build process, confirms the Intel Mac canary checklist.
