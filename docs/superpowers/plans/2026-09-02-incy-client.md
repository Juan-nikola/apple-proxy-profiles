# INCY Client Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `apple-proxy-profiles` monorepo 中新增 INCY 适配器，使一个私密 Sub-Store collection URL 返回 HAPP 式完整 Xray JSON 数组，并在 iPhone、iPad、Apple TV、Android、Android TV、macOS、Windows、Linux 上提供统一的 DNS、业务分组、域名优先/IP 后备路由、固定节点测速和故障回退。

**Architecture:** 新建 `clients/incy` workspace，独立负责 Xray renderer、完整配置数组、INCY autorouting header 和 routing profile；节点输入沿用 `normalizeNodes`，但不经过客户端能力矩阵预过滤，collection 中每个节点都必须成功渲染，否则整个 task 失败。业务目标由 `resolveUnifiedPolicy` 解析，规则发布链复用共享规则编译结果，分别生成 `public/current/incy/` 下的 GeoData、routing profile 和 manifest。

**Tech Stack:** Node.js 22 ESM、Node built-in test runner、Sub-Store operator API、Xray JSON schema、现有 `shared/policies`/`shared/rules` 发布器、protobuf GeoData 编译器、SHA-256 canonical manifests。

**Spec:** `docs/superpowers/specs/2026-09-02-incy-client-design.md`

## Global Constraints

- INCY 是闭源客户端，本项目只生成它可导入的 Xray JSON 和 autorouting profile，不复制 App 二进制、UI 或运行时。
- 导入格式必须是 HAPP 式 JSON 数组：每个 collection 节点对应一个独立、完整、可切换的 Xray 配置元素。
- 首期显式支持 VLESS、VMess、Trojan、Shadowsocks、Hysteria2/Hy2、SOCKS5、HTTP；SSR、TUIC、Snell、AnyTLS、SSH 不得伪装支持；WireGuard/AmneziaWG 只有在验证输入和 Xray 表达后才加入。
- INCY 适配器不调用 `filterNodesForClient` 预过滤；输入 collection 中的每个节点都尝试渲染，任何一个节点失败则 task 失败且不得返回部分数组。
- 路由顺序固定为安全规则、国内/业务规则、`ChinaTLD`、`IPIfNonMatch`、`ChinaIP`、final；业务命中时不等待 IP 解析，未命中域名规则才使用解析 IP 判断。
- `FOLLOW` 指当前数组元素 follow outbound，`DIRECT` 指 freedom，`NODE~`/`NODE:` 指固定节点 balancer，`REJECT` 指 blackhole。
- 公共发布目录不包含节点地址、密码、UUID、订阅 URL、private policy 正文或诊断中的秘密。
- 所有生成的 JSON、manifest 和 routing profile 必须 canonical、可校验、可从 `edge` 原子晋级到 `current`/`previous`。

## File Map

| 文件 | 责任 |
| --- | --- |
| `clients/incy/package.json` | workspace 元数据、test/build/verify scripts |
| `clients/incy/README.md`、`clients/incy/docs/*`、`clients/incy/examples/*` | 导入、支持边界、真机验收和完整配置样例 |
| `clients/incy/src/options.js` | 严格解析 output/type/platform、DNS、QUIC、IPv6、block 和 channel 参数 |
| `clients/incy/src/render-platform.js` | 八个平台的 Xray 入口、测速和资源 preset |
| `clients/incy/src/render-node.js` | 已知协议和 raw Xray outbound 扩展入口 |
| `clients/incy/src/render-dns.js` | 国内/海外 DNS、route hint 和防循环直连保护 |
| `clients/incy/src/render-routing.js` | 统一 policy 到 Xray domain/IP/rule/balancer 规则 |
| `clients/incy/src/render-subscription.js` | 每个候选节点组装完整配置数组 |
| `clients/incy/src/render-routing-profile.js` | `Geoipurl`、`Geositeurl`、`DomainStrategy=IPIfNonMatch` 的公共 profile 和 deep link |
| `clients/incy/src/validate-subscription.js` | fail-closed schema、tag、目标引用和秘密扫描 |
| `clients/incy/src/substore-config-entry.js` | Sub-Store operator，collection 输入、policy 解析、headers、全量失败语义 |
| `clients/incy/src/link-encoder.js` | 可选 `incy://crypt1` 分享辅助，不承担保密 |
| `clients/incy/scripts/build.mjs`、`clients/incy/scripts/render-fixtures.mjs` | 生成 Sub-Store IIFE bundle 和脱敏 JSON fixtures |
| `clients/incy/dist/*` | 发布到公共目录的 INCY generator bundle |
| `clients/incy/test/*.test.js` | renderer、策略、失败、安全、响应和发布契约测试 |
| `shared/contracts.js`、`shared/nodes/protocol-registry.js` | 注册 `CLIENT.incy` 和首期协议能力边界 |
| `shared/policies/platform-presets.js` | Android TV、Windows、Linux、INCY preset |
| `shared/release/client-catalog.js` | active client、八个平台、`incy` public directory 和 schema |
| `shared/release/channel-closure.js` | 允许 INCY native scripts 的 channel closure 路径 |
| `automation/src/build-artifacts.js` | INCY native scripts、GeoData、routing profile、client manifest |
| `automation/src/refresh-current.js` | INCY 目录的 current/edge bytes 和 referenced bytes 校验 |
| `scripts/configure-substore.mjs`、`scripts/check-substore-task.mjs` | `apple-proxy-incy` collection 和 8 个 config task |
| `test/foundation.test.js`、`test/client-catalog.test.js`、`test/substore-task-check.test.js` 等 | monorepo active-client 与 Sub-Store 回归覆盖 |
| `public/current/incy/*` | 构建生成的 routing、GeoData、sha256 和 client manifest |

### Task 1: Scaffold INCY Workspace and Strict Options

**Files:**
- Create: `clients/incy/package.json`
- Create: `clients/incy/README.md`
- Create: `clients/incy/src/options.js`
- Create: `clients/incy/src/render-platform.js`
- Create: `clients/incy/scripts/build.mjs`
- Create: `clients/incy/scripts/render-fixtures.mjs`
- Create: `clients/incy/test/options.test.js`
- Create: `clients/incy/test/platform.test.js`
- Modify: `package-lock.json`

**Interfaces:**
- `parseIncyOptions(raw) -> Frozen<IncyOptions>` accepts `output=config`, `type=collection`, `name`, `subscriptionName`, `platform`, `channel`, `dnsMode`, `chinaDns`, `globalDns`, `blockMode`, `quicMode`, `ipv6Mode`, `adblockMode`, `autoGroupMode`, `clientChain` and policy target overrides.
- `INCY_PLATFORMS` is exactly `['iphone','ipad','appletv','android','androidtv','macos','windows','linux']`.
- `renderIncyInbounds(platform) -> XrayInbound[]` emits SOCKS `127.0.0.1:10808` and HTTP `127.0.0.1:10809`, both with `udp`/`http`/`tls`/`quic` sniffing and `routeOnly:false`.
- `incyPlatformPreset(platform) -> { testInterval, timeout, tolerance, ipv6Mode, resourceProfile }` returns a frozen platform record.

- [ ] **Step 1: Write failing option and platform tests**

```js
test('accepts all eight INCY platforms and applies stable defaults', () => {
  const options = parseIncyOptions({
    output: 'config', type: 'collection', name: 'apple-proxy-incy',
    subscriptionName: 'INCY', platform: 'androidtv',
  });
  assert.equal(options.dnsMode, 'stable');
  assert.equal(options.ipv6Mode, 'ipv4-only');
  assert.deepEqual(INCY_PLATFORMS, ['iphone','ipad','appletv','android','androidtv','macos','windows','linux']);
});

test('rejects unknown keys, non-collection output, and unsupported platforms', () => {
  assert.throws(() => parseIncyOptions({ output:'nodes', type:'collection', name:'x', subscriptionName:'x', platform:'iphone' }), /output/);
  assert.throws(() => parseIncyOptions({ output:'config', type:'collection', name:'x', subscriptionName:'x', platform:'tvOS' }), /platform/);
  assert.throws(() => parseIncyOptions({ output:'config', type:'collection', name:'x', subscriptionName:'x', platform:'iphone', surprise:true }), /Unknown INCY option/);
});

test('renders stable local inbounds for every platform', () => {
  for (const platform of INCY_PLATFORMS) {
    const ports = renderIncyInbounds(platform).map(({ port }) => port);
    assert.deepEqual(ports, [10808, 10809]);
  }
});
```

- [ ] **Step 2: Run the focused tests and verify they fail because the workspace is absent**

Run: `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='options|inbounds'`

Expected: FAIL with module/workspace-not-found errors.

- [ ] **Step 3: Implement package metadata, option parser, and platform presets**

Use the HAPP `ownOptions`/data-property pattern, but change the error prefix to `INCY`, add the eight platform values and `adblockMode`, `autoGroupMode`, `clientChain`, and default `ipv6Mode` to `ipv4-only`. Keep `validateCollectionName` and reject prototype keys/accessors. Implement `renderIncyInbounds` with the exact two loopback ports and sniffing object from the spec; keep TUN/system-proxy behavior in `resourceProfile` metadata rather than inventing INCY-private JSON fields. Make `scripts/build.mjs` bundle `src/substore-config-entry.js` into `dist/incy-config-generator.js` and `dist/substore-config-generator.js`; make `scripts/render-fixtures.mjs` write the two example configs after validating them.

- [ ] **Step 4: Run focused tests and commit the scaffold**

Run: `npm --workspace @apple-proxy-profiles/incy test`

Expected: PASS for option and platform tests.

Commit: `git add clients/incy package-lock.json && git commit -m "feat(incy): scaffold workspace and platform options"`

### Task 2: Add Strict Xray Node Rendering and Raw Outbound Extension

**Files:**
- Create: `clients/incy/src/render-node.js`
- Create: `clients/incy/src/validate-subscription.js`
- Create: `clients/incy/test/render-node.test.js`
- Create: `clients/incy/test/raw-outbound.test.js`
- Modify: `shared/contracts.js`
- Modify: `shared/nodes/protocol-registry.js`

**Interfaces:**
- `renderIncyOutbound(node, { tag, rawOutbound = null }) -> XrayOutbound` renders VLESS, VMess, Trojan, Shadowsocks, Hy2, SOCKS5 and HTTP with stable `ap-incy-*` tags.
- `parseRawXrayOutbound(node) -> XrayOutbound|null` accepts only `node._incy?.xrayOutbound` or `node.xrayOutbound` plain objects, deep clones it, requires `protocol`, `settings`, and a valid caller-supplied tag, and rejects `inbounds`, `routing`, `dns`, `api`, `policy`, `stats`, `observatory`, `reverse`, `transport` escape keys and non-plain values.
- `assertIncyOutbound(outbound) -> true` validates protocol/settings shape, tag uniqueness at the subscription level, and absence of secret metadata outside the outbound credential fields.

- [ ] **Step 1: Write failing renderer tests for every supported protocol and rejected protocol**

Fixtures must include valid VLESS Reality/WS, VMess TLS, Trojan TLS, SS, Hy2, SOCKS5, and HTTP nodes. Assert server, port, auth, stream settings, and protocol names in the resulting Xray outbound. Also assert `ssr`, `tuic`, `snell`, `anytls`, `ssh`, malformed `wireguard`, missing UUID/password and duplicate tags throw `unsupported-incy-protocol` or a field-specific error.

- [ ] **Step 2: Write failing raw-outbound tests**

```js
test('accepts a safe raw Xray outbound extension without filtering the node', () => {
  const node = { name:'future', type:'future-protocol', _incy:{ xrayOutbound:{ protocol:'vless', settings:{ vnext:[] } } } };
  const output = renderIncyOutbound(node, { tag:'ap-incy-future' });
  assert.equal(output.protocol, 'vless');
});

test('rejects raw outbounds that can inject routing or non-plain values', () => {
  assert.throws(() => parseRawXrayOutbound({ xrayOutbound:{ protocol:'vless', settings:{}, routing:{} } }), /forbidden|schema/i);
  assert.throws(() => parseRawXrayOutbound({ xrayOutbound:{ protocol:'vless', settings:new Map() } }), /plain|schema/i);
});
```

- [ ] **Step 3: Implement the renderer and registry entry**

Add `CLIENT.incy`; add INCY to the supported-client list only for the seven verified protocols. Do not add WireGuard until its renderer contract is proven. Reuse `renderXrayOutbound` field semantics where safe, but use `client:'incy'` and wrap errors with INCY-specific diagnostics. Raw extension is opt-in and schema-validated; unknown `type` without raw extension fails.

- [ ] **Step 4: Implement subscription-level validation and run tests**

`assertIncyOutbound` must verify tags match `^ap-incy-[a-z0-9/_-]{1,120}$`, outbound `tag` references are unique, and forbidden top-level runtime keys do not appear. Run: `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='render|raw'`. Expected: PASS.

- [ ] **Step 5: Commit node boundary**

Run: `npm test -- --test-name-pattern='client catalog|capabilities'` and `npm --workspace @apple-proxy-profiles/incy test`; then commit `git add clients/incy shared/contracts.js shared/nodes/protocol-registry.js && git commit -m "feat(incy): render verified Xray outbounds"`.

### Task 3: Implement DNS, Policy Routing, Balancers, and Observatory

**Files:**
- Create: `clients/incy/src/render-dns.js`
- Create: `clients/incy/src/render-routing.js`
- Create: `clients/incy/test/dns.test.js`
- Create: `clients/incy/test/routing.test.js`
- Modify: `shared/policies/platform-presets.js`

**Interfaces:**
- `renderIncyDns(options, { followTag, directTag, dnsRulesTag }) -> XrayDnsConfig` emits domestic and global servers, `ipv4-only` strategy when selected, and direct protection for DNS/balancer/observatory IPs.
- `renderIncyRouting({ options, policyResolution, fixedOutbounds, followTag, directTag, blockTag, balancerTags }) -> XrayRoutingConfig` emits ordered domain/IP rules and final `followTag`.
- `renderIncyBalancers(policyResolution, fixedOutbounds, followTag) -> { balancers, observatory }` creates one `leastPing` balancer per fixed policy node set, with `fallbackTag: followTag`, and subject selectors containing follow plus actual fixed candidates.
- `routeTargetForPolicy(record, tags) -> string` maps `FOLLOW`, `DIRECT`, fixed `NODE~`/`NODE:` and `REJECT` exactly as specified.

- [ ] **Step 1: Write failing DNS and routing ordering tests**

Assert DNS has `geosite:CN`/`geosite:PRIVATE` domestic matches, overseas service matches, `ipv4-only` query strategy, and direct route hints for DNS IPs. Assert routing rule order by inspecting the rule index: private/localhost, security, domestic and service policy rules, `geosite:CN`, `IPIfNonMatch`, `geoip:CN`, then final. Assert AI/GitHub/YouTube targets precede DNS route hints and China fallback.

- [ ] **Step 2: Write failing policy mapping and balancer tests**

```js
assert.equal(routeTargetForPolicy({ resolved:'FOLLOW' }, tags), 'incy-follow-abc');
assert.equal(routeTargetForPolicy({ resolved:'DIRECT' }, tags), 'direct');
assert.equal(routeTargetForPolicy({ resolved:'REJECT' }, tags), 'block');
assert.match(routeTargetForPolicy({ resolved:'Node A', status:'fixed' }, tags), /^balancer-ap-incy-/u);
assert.equal(renderIncyBalancers(resolution, fixed, 'incy-follow-abc').balancers[0].fallbackTag, 'incy-follow-abc');
```

- [ ] **Step 3: Implement routing and DNS using `resolveUnifiedPolicy` outputs**

Use the shared service catalog and `policyResolution.targets`; do not duplicate policy defaults. Emit `domainStrategy: 'IPIfNonMatch'`, make `ChinaTLD` a domain rule before the IP stage, and keep the final target as the current array element follow tag. Add DNS route hints only after explicit business rules. Use the preset interval/timeout/tolerance for `observatory` and keep all balancer target tags referentially valid.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='dns|routing|balancer'`. Expected: PASS.

Commit: `git add clients/incy shared/policies/platform-presets.js && git commit -m "feat(incy): add DNS and policy routing"`.

### Task 4: Assemble Complete HAPP-Style JSON Arrays

**Files:**
- Create: `clients/incy/src/render-subscription.js`
- Create: `clients/incy/test/subscription.test.js`
- Modify: `clients/incy/src/validate-subscription.js`

**Interfaces:**
- `renderIncySubscription({ nodes, options, policyResolution }) -> XrayConfig[]` returns one complete config per normalized input node, preserving input order and rejecting empty input or any render failure.
- `buildIncyConfig({ node, options, policyResolution, index }) -> XrayConfig` creates `inbounds`, current follow outbound, fixed outbounds, `direct`, `block`, `dns`, `routing`, `observatory`, and non-secret `meta`.
- `validateIncySubscription(configs) -> true` verifies array non-empty, unique outbound/inbound tags, fixed balancer references, `IPIfNonMatch`, standard ports, and no private values in `meta`.

- [ ] **Step 1: Write failing full-config tests**

For two fixture nodes assert two array elements, each has both standard inbounds, `direct` and `block`, a unique follow tag, fixed balancer fallback, valid observatory selectors, routing final target, and metadata fields `platform`, `schemaVersion`, `serverDescription` without UUID/password/server URL. Assert a collection containing one valid and one unsupported node throws and does not expose a partial `$content`.

- [ ] **Step 2: Implement per-node assembly**

For each node, render `incy-follow/<stable-node-id>`; render all `policyResolution.fixedNodes` once per element with deterministic IDs; generate `direct` freedom and `block` blackhole; call DNS/routing/balancer renderers; add `meta` with only counts, platform, schema and redacted protocol/name labels. Run `validateIncySubscription` before returning.

- [ ] **Step 3: Run tests and commit**

Run: `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='subscription|validation'`. Expected: PASS.

Commit: `git add clients/incy && git commit -m "feat(incy): render complete configuration arrays"`.

### Task 5: Add Sub-Store Operator, Headers, and Optional Link Encoder

**Files:**
- Create: `clients/incy/src/substore-config-entry.js`
- Create: `clients/incy/src/link-encoder.js`
- Create: `clients/incy/test/substore-entry.test.js`
- Create: `clients/incy/test/link-encoder.test.js`

**Interfaces:**
- `operator(input, targetPlatform, context) -> Promise<{ ...input, $content: string }>` reads options from `context.arguments`, calls `produceArtifact({ type:'collection', name, platform:'JSON', produceType:'internal' })`, normalizes without client filtering, loads policy artifact, resolves unified policy with `client: CLIENT.incy`, renders all configs, and sets response headers.
- `incyAutoroutingUrl(channel='current') -> string` returns the public `routing.json` URL.
- `encodeIncyCrypt1(value) -> string` and `decodeIncyCrypt1(value) -> string` are explicitly labeled obfuscation helpers and reject malformed payloads; they are never used to hide credentials by default.

- [ ] **Step 1: Write failing operator tests**

Mock `produceArtifact` with two nodes and a policy artifact. Assert `$content` parses as an array, `content-type` is JSON, `content-disposition` is `incy-<platform>.json`, and `autorouting` equals `incy://autorouting/onadd/https://juan-nikola.github.io/apple-proxy-profiles/current/incy/routing.json`. Assert no `filterNodesForClient` call is needed and one unsupported selected node rejects the whole operator before `$content` is set.

- [ ] **Step 2: Implement operator and diagnostics**

Mirror HAPP request option/header handling, but use `CLIENT.incy`, no capability filtering, `channel` from parsed options for policy lookup, and fixed public autorouting channel `current` for the public routing asset. Log only platform, normalized count, accepted count, protocol error counts and schema version. Never log raw node or policy objects.

- [ ] **Step 3: Add and test `crypt1` helper**

Implement the documented URL-safe transformation as a pure round-trip helper. Add a README warning that this is not encryption and keep it opt-in. Run: `npm --workspace @apple-proxy-profiles/incy test`; Expected: PASS.

- [ ] **Step 4: Commit Sub-Store integration**

Commit: `git add clients/incy && git commit -m "feat(incy): add Sub-Store full-config operator"`.

### Task 6: Register INCY as an Active Client and Add Platform/Protocol Contracts

**Files:**
- Modify: `shared/contracts.js`
- Modify: `shared/nodes/protocol-registry.js`
- Modify: `shared/release/client-catalog.js`
- Modify: `shared/release/channel-closure.js`
- Modify: `test/client-catalog.test.js`
- Modify: `test/foundation.test.js`
- Modify: `test/cross-client-routing.test.js`

**Interfaces:**
- `CLIENT.incy === 'incy'`; `activeClientIds()` contains INCY after `clash` in stable order.
- `clientAdapter('incy')` exposes `displayName:'INCY'`, `configFormat:'xray-json-array'`, `ruleFormat:'xray-geodata'`, `nodeValidator:'incy'`, `adapterSchema:'incy-v1'`, `publicDirectory:'incy'`, and all eight platforms.
- `platformPolicyPreset` supports `androidtv`, `windows`, and `linux` with deterministic timeout/tolerance values.

- [ ] **Step 1: Extend contract tests first**

Update expected client arrays and assert the exact INCY record, eight platforms, and supported protocol boundary. Add foundation assertions for `clients/incy/package.json` and its workspace test/verify scripts.

- [ ] **Step 2: Implement registration and closure rules**

Add INCY to `PRIVATE_POLICY_CLIENTS`, protocol definitions for the seven verified protocols, active catalog, platform presets, and native generator path regex. Keep INCY out of lightweight rule client IDs because it consumes Xray GeoData rather than text rule files.

- [ ] **Step 3: Run monorepo contract tests and commit**

Run: `node --test test/client-catalog.test.js test/foundation.test.js test/cross-client-routing.test.js`. Expected: PASS.

Commit: `git add shared test clients/incy/package.json && git commit -m "feat(incy): register active client contract"`.

### Task 7: Publish INCY GeoData, Routing Profile, Scripts, and Manifests

**Files:**
- Create: `clients/incy/src/render-routing-profile.js`
- Create: `clients/incy/docs/deployment.md`
- Create: `clients/incy/docs/troubleshooting.md`
- Create: `clients/incy/examples/incy-config-iphone.json`
- Create: `clients/incy/examples/incy-config-windows.json`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/refresh-current.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `automation/test/build-artifacts.test.js`
- Modify: `automation/test/refresh-current.test.js`
- Generated: `public/current/incy/client-manifest.json`, `public/current/incy/routing.json`, `public/current/incy/geoip.dat`, `public/current/incy/geoip.dat.sha256`, `public/current/incy/geosite.dat`, `public/current/incy/geosite.dat.sha256`

**Interfaces:**
- `renderIncyRoutingProfile({ baseUrl, generatedAt, channel }) -> object` emits `Geoipurl`, `Geositeurl`, `LastUpdated`, `DomainStrategy:'IPIfNonMatch'`, `useChunkFiles`, and DNS/Direct/Proxy/Block categories.
- `renderIncyRoutingDeepLink(profile) -> string` emits `incy://autorouting/onadd/<encoded-public-routing-url>`.
- `renderIncyGeoData(ruleSets) -> Map<string, Buffer>` emits exactly `incy/geoip.dat` and `incy/geosite.dat` with SHA-256 sidecars handled by the artifact builder.

- [ ] **Step 1: Write failing publication tests**

Assert `buildClientArtifacts` includes INCY native scripts and the six INCY public files (`client-manifest.json`, `routing.json`, two GeoData files and two SHA-256 sidecars), `client-manifest.json` has `client:'incy'` and valid hash, routing profile uses public `current/incy` URLs and `IPIfNonMatch`, and `refreshChannelManifest`/`refreshCurrentManifest` counts INCY bytes without treating it as a text-rule client.

- [ ] **Step 2: Implement routing profile and GeoData integration**

Reuse the shared compiled rule sets and HAPP/Xray GeoData encoder, but write independent INCY paths and manifest records. Add native bundled scripts from `clients/incy/dist/` to the default publication. Keep `routing.json` free of node and private policy data. Ensure edge/current URL normalization and `channel-closure` pass.

- [ ] **Step 3: Build and verify generated artifacts**

Run: `npm --workspace @apple-proxy-profiles/incy run build`; `node scripts/update-rules.mjs --channel current`; `node --test automation/test/build-artifacts.test.js automation/test/refresh-current.test.js`. Expected: PASS and all seven files present under `public/current/incy/`.

- [ ] **Step 4: Commit publication pipeline**

Commit: `git add clients/incy automation scripts public/current/incy && git commit -m "feat(incy): publish GeoData and autorouting profile"`.

### Task 8: Add Sub-Store Collection and Eight Platform Tasks

**Files:**
- Modify: `scripts/configure-substore.mjs`
- Modify: `scripts/check-substore-task.mjs`
- Modify: `test/substore-task-check.test.js`
- Modify: `test/private-substore-config.test.js`
- Modify: `README.md`
- Modify: `docs/substore-two-layer-setup.md`

**Interfaces:**
- `buildPrivateSubstoreConfig()` includes collection `{ name:'apple-proxy-incy', type:'collection' }` and eight tasks `incy-config-iphone`, `incy-config-ipad`, `incy-config-appletv`, `incy-config-android`, `incy-config-androidtv`, `incy-config-macos`, `incy-config-windows`, `incy-config-linux`.
- Every task uses `output:'config'`, `type:'collection'`, `name:'apple-proxy-incy'`, the platform value, `subscriptionName`, `channel`, and the shared DNS/policy option names.
- `checkSubstoreTask` accepts INCY tasks and rejects wrong collection, platform, output, or missing private source binding.

- [ ] **Step 1: Write failing catalog/check tests**

Assert exact task IDs, exact platform mapping, collection count increase by one, task count increase from 30 to 38, and rejection of an INCY task pointing to another collection or an unsupported platform. Assert generated config contains no private source URL in public artifacts.

- [ ] **Step 2: Implement the collection and task catalog**

Use the existing canonical task builder and remote JS URL format; add INCY generator task URLs under the public `current/incy/scripts/` path and update the canonical count and validator from 30 to 38. Keep user node selection in Sub-Store; the INCY script only renders the selected collection.

- [ ] **Step 3: Update operator setup docs and run tests**

Run: `node --test test/substore-task-check.test.js test/private-substore-config.test.js test/readme-docs.test.js`; Expected: PASS.

Commit: `git add scripts test README.md docs/substore-two-layer-setup.md && git commit -m "feat(incy): add Sub-Store collection and platform tasks"`.

### Task 9: Add End-to-End, Security, and Cross-Client Verification

**Files:**
- Create: `clients/incy/test/end-to-end.test.js`
- Create: `clients/incy/test/security.test.js`
- Create: `clients/incy/test/fixtures.js`
- Modify: `test/security.test.js`
- Modify: `test/rule-budgets.test.js`
- Modify: `scripts/verify.mjs`
- Modify: `clients/incy/README.md`

**Interfaces:**
- `fixtureNodes()` returns only synthetic RFC 5737 endpoints and test credentials.
- `renderIncySubscription` and `operator` are tested against the same policy fixture used by HAPP/sing-box routing tests.
- `verify` validates INCY JSON schema, generated manifests, channel closure, secret scan, and configured Sub-Store task count.

- [ ] **Step 1: Write failing end-to-end assertions**

Use a domestic domain, an unknown domain resolving to a China CIDR, an AI domain, GitHub, YouTube, an overseas media domain, a blocked advertising domain, and a literal IP. Assert domain rules win before IP fallback, domestic IP fallback uses `direct`, business domains use their policy targets, and unmatched traffic uses the current follow tag. Assert the same semantic target IDs resolve identically for HAPP, sing-box, and INCY fixtures.

- [ ] **Step 2: Add secret and malformed-output scans**

Run `scanSecrets` over serialized configs and metadata; assert fixture password/UUID/server values never occur in `meta`, routing profile, manifest or public files. Assert an unsupported node aborts before writing a response body and that diagnostics contain only counts and protocol categories.

- [ ] **Step 3: Integrate verification commands**

Add `verify:incy` to the root scripts and include it in `verify`. The workspace verify command must run tests, build, fixtures, secret scan, and JSON validation. Update rule budget expectations only for actual INCY native scripts and GeoData bytes; INCY must not be added to lightweight text-rule budgets.

- [ ] **Step 4: Run the complete automated suite and commit**

Run: `npm test`; `npm run verify:incy`; `npm run check:task`; `npm run check:secrets`; `npm run check:rules`. Expected: PASS with no secret findings, no channel-closure violations, and no stale manifests.

Commit: `git add clients/incy test scripts package.json && git commit -m "test(incy): verify end-to-end routing and publication"`.

### Task 10: Real-Client Acceptance and Release Handoff

**Files:**
- Modify: `clients/incy/docs/deployment.md`
- Modify: `clients/incy/docs/troubleshooting.md`
- Create: `clients/incy/docs/device-matrix.md`
- Modify: `README.md`

- [ ] **Step 1: Import the single private URL on each platform**

Verify the response displays multiple switchable array configurations on iPhone, iPad, Apple TV, Android, Android TV, macOS, Windows and Linux. Record app version, INCY core version, imported element count and whether `autorouting` is attached.

- [ ] **Step 2: Verify routing and failure behavior**

Check domestic domain direct, unknown domain with China IP direct, AI/GitHub/YouTube/media/social/game/download business targets, DNS hijack blocking, QUIC proxy-block, IPv4-only, fixed-node least-ping, fallback after fixed-node failure, and final follow fallback.

- [ ] **Step 3: Verify update and rollback**

Change the public routing profile/GeoData in `edge`, promote to `current`, simulate offline refresh, confirm old configs remain usable, and verify `previous` rollback has matching manifest hashes. Record any INCY runtime limitations rather than widening the renderer contract without evidence.

- [ ] **Step 4: Publish the final release evidence**

Run `npm run verify`, attach the device matrix to `clients/incy/docs/device-matrix.md`, and commit only after all eight platforms pass or a specific documented INCY runtime limitation is accepted.

## Self-Review Checklist

- **Spec coverage:** Tasks 1-2 cover the workspace, eight platforms, supported protocol boundary, raw outbound extension and fail-closed node handling; Task 3 covers DNS, domain-first/IP-later ordering, policy targets, balancers and observatory; Tasks 4-5 cover complete arrays, headers and `crypt1`; Tasks 6-8 cover contracts, public GeoData/routing/manifests and all Sub-Store tasks; Tasks 9-10 cover security, automated tests, cross-client semantics and real-device acceptance.
- **Placeholder scan:** Every task has concrete files, interfaces, commands, expected outcomes and failure behavior; no unresolved planning marker or unspecified validation step remains.
- **Type consistency:** `parseIncyOptions`, `renderIncyOutbound`, `renderIncyDns`, `renderIncyRouting`, `renderIncyBalancers`, `renderIncySubscription`, `validateIncySubscription`, `operator`, `renderIncyRoutingProfile`, and `renderIncyRoutingDeepLink` are introduced once and consumed with the same signatures in later tasks.
