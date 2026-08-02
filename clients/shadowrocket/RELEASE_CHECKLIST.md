# Release Checklist

自动发布检查由本地构建完成；只有命令实际成功后才勾选。Sub-Store 预览和设备灰度必须由用户完成，本地构建不会代替勾选。

## 自动发布检查

- [x] `node --version` is 22 or newer.
- [x] `npm ci` succeeds from a clean dependency directory.
- [x] `npm test` passes.
- [x] `npm run build` succeeds twice with byte-identical `clients/shadowrocket/dist/` output.
- [x] `npm run fixtures` succeeds twice with byte-identical `clients/shadowrocket/examples/` output.
- [x] `npm --workspace @apple-proxy-profiles/shadowrocket run check:rules` reports every catalog rule healthy; check this only after the live command succeeds.
- [x] `npm run check:secrets` reports no potential secret.
- [x] macOS, iPhone, and iPad Profiles contain `[General]`, `[Proxy Group]`, and `[Rule]`.
- [x] Root selector is exactly `🚀 节点选择 = select,PROXY`; every dynamic group uses the configured `<subscriptionName>,use=true` source and contains no `include-all-proxies` field.
- [x] The approved rollback-baseline rule delta replaces `AdvertisingLite` with the full `Advertising` catalog: `Advertising.list` plus `Advertising_Domain.list`.
- [x] Blackmatrix7 `ByteDance`, `SteamCN`, `ChinaMax_Domain`, and `ChinaMax` are present in the approved order.
- [x] macOS renders IPv4-only and proxy QUIC blocking; iPhone/iPad retain IPv6 with proxy QUIC blocking.
- [x] No Profile contains a server, port/credential pair, UUID, PSK, key, Token, subscription URL, or Profile URL.

Latest live rule evidence (2026-08-02): official Blackmatrix7 master `dab47069a30c4ae70f7f5f4c919d639d9aaf79dc`; all 32 catalog sources passed with exit code 0. `Advertising.list` returned HTTP 200 with 781 entries (minimum 700), and `Advertising_Domain.list` returned HTTP 200 with 262,589 entries (minimum 250,000), for 263,370 full logical Advertising entries.

## 用户完成：Sub-Store 功能预览

- [ ] Node bundle executes through a Sub-Store functional Script Operator preview.
- [ ] Profile bundle executes through a Sub-Store File Script Operator preview.
- [ ] Preview diagnostics contain only totals and category counts.

## 用户完成：Intel Mac 灰度

- [ ] Old Intel Mac subscription and Profile remain available before canary import.
- [ ] User, not the build process, confirms the Intel Mac canary checklist.
