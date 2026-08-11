# Happ Sixth-Client Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add official Happ Proxy Utility as the repository's sixth client, with one private JSON-array subscription for macOS, iPhone, iPad, Android, Windows, and Linux; Chinese business-policy overrides; `DIRECT`, homepage-following `FOLLOW`, and exact fixed-node routing; automatic fixed-node runtime fallback to the homepage-selected node; private audit output; and the same lightweight routing/DNS behavior as the existing clients.

**Architecture:** Keep policy intent, node normalization, and rule ordering shared. Add a Happ adapter that emits one Xray JSON object per eligible node, uses that object as the `FOLLOW` outbound, resolves Chinese business overrides once per generation, and creates one collision-proof `leastPing` balancer per distinct fixed node with `fallbackTag` pointing at `FOLLOW`. Compile the existing normalized default rules into deterministic Xray `geosite.dat` and `geoip.dat`, install them through a public Happ routing-profile deep link, and publish private config/audit generators through the existing immutable edge/current/previous pipeline.

**Tech Stack:** Node.js 22+ ESM, Node built-in test runner, npm workspaces, esbuild, exact-lockfile `protobufjs` and `qrcode` build dependencies, Sub-Store processors, Xray JSON, Xray geosite/geoip protobuf data, static HTML/JavaScript, and the repository's deterministic publication/secret-scan infrastructure.

## Global Constraints

- Target only the official Happ Proxy Utility applications; do not fork or patch Happ.
- Support exactly `macos`, `iphone`, `ipad`, `android`, `windows`, and `linux` as Happ config targets.
- Happ consumes a JSON array; each eligible normalized node produces one independently selectable Happ homepage entry.
- Support only VLESS, VMess, Trojan, Shadowsocks, SOCKS5, and Hysteria2 shapes that can be represented losslessly by Happ's bundled Xray core. Filter Snell and every other unsupported or lossy shape before rendering.
- The Chinese business keys are authoritative user input. English identifiers remain internal implementation IDs only.
- Every business target is exactly one of `DIRECT`, `FOLLOW`, or `NODE:<normalized exact node name>`.
- Fixed-node name matching is case-sensitive and exact after shared node normalization. Missing, renamed, or duplicate matches resolve to `FOLLOW`, create a Chinese generation warning, and appear in the private audit output.
- Runtime health failure of a valid fixed node uses Xray `observatory` plus `leastPing` balancer `fallbackTag` to switch to that JSON object's `FOLLOW` outbound. Recovery automatically returns to the fixed node. Runtime switching is visible only in Happ/Xray logs; do not claim a UI selector or notification that Happ does not expose.
- `DIRECT` never enters a proxy balancer. `FOLLOW` always means the Happ homepage entry currently selected by the user.
- Use collision-proof internal tags derived from node identity, never raw node names. Balancer selectors are prefix matches, so each selector prefix must match exactly one candidate outbound.
- Preserve the shared routing order, `IPIfNonMatch`, explicit final rule, domestic/global DNS split, IPv6 option, QUIC option, security rules, and ChinaIP late-direct behavior.
- Happ's default geodata contains only default lightweight sources. Do not include `Advertising` or `Advertising_Domain`; Happ advertises no `adblock-full` pack in this iteration.
- The public routing profile and helper page contain no node credentials, subscription URLs, policy overrides, or audit data. The policy encoder runs locally with no network request or browser storage and states that Base64URL is not encryption.
- Private audit output includes configured target, resolved target, status, warning code, and counts, but never node credentials, raw subscription URLs, or serialized node objects.
- Generate edge candidates only. Do not promote Happ `current` or overwrite `previous` until all six official applications pass the manual canary checklist.
- Keep all output deterministic for the same normalized nodes, options, rules, and upstream timestamp.
- Use tests first for every behavior change; run focused RED/GREEN checks and make one isolated commit per task.

---

## File Structure and Responsibilities

### Shared client and node capability contracts

- Modify `shared/contracts.js`: add `CLIENT.happ` without widening global platform values used by other adapters.
- Modify `shared/nodes/protocol-registry.js`: declare the six protocol families eligible for Happ.
- Modify `shared/nodes/capabilities.js`: add Happ-specific lossless-shape validation and reject chains, unsupported transports, malformed TLS/REALITY, and lossy Hysteria2 settings.
- Modify `test/capabilities.test.js`: pin accepted and rejected Happ fixtures, including explicit Snell exclusion.

### Happ workspace and private generators

- Create `clients/happ/package.json`: workspace scripts for unit tests, fixtures, build, and verify.
- Create `clients/happ/src/options.js`: six-platform options and output-mode parsing.
- Create `clients/happ/src/policy-overrides.js`: Chinese key catalog, Base64URL decoder, exact fixed-node resolution, and safe audit records.
- Create `clients/happ/src/render-node.js`: normalized-node to Xray outbound conversion.
- Create `clients/happ/src/render-platform.js`: official-Happ-compatible local inbounds and platform metadata.
- Create `clients/happ/src/render-dns.js`: shared domestic/global Xray DNS rendering.
- Create `clients/happ/src/render-routing.js`: ordered geosite/geoip rules, fixed-node balancers, observatory, and final route.
- Create `clients/happ/src/render-subscription.js`: one Xray config per eligible node and Chinese `meta.serverDescription` summaries.
- Create `clients/happ/src/validate-subscription.js`: structural and referential validation for private arrays.
- Create `clients/happ/src/audit.js`: deterministic credential-free audit JSON.
- Create `clients/happ/src/substore-config-entry.js`: Sub-Store config/audit operator.
- Create `clients/happ/scripts/build.mjs` and `clients/happ/scripts/render-fixtures.mjs`: browser-compatible bundles and sanitized examples.
- Create `clients/happ/dist/happ-config-generator.js` and `clients/happ/dist/substore-config-generator.js`: tracked generated bundles.
- Create `clients/happ/examples/*.json`: six sanitized platform examples plus one audit example.

### Happ geodata and public import layer

- Add pinned `protobufjs` to `package.json` and `package-lock.json`.
- Create `clients/happ/proto/geodata.proto`: minimal compatible `Domain`, `GeoSiteList`, `CIDR`, and `GeoIPList` schema with upstream provenance and license notice.
- Create `automation/src/render-happ-geodata.js`: deterministic default-rule protobuf compiler and decoder-backed validator.
- Create `clients/happ/src/render-routing-profile.js`: Happ routing-profile JSON and `happ://routing/onadd/<base64>` deep link.
- Create `clients/happ/src/build-import-page.js`: public one-click geodata install page plus local Chinese policy encoder.
- Create `clients/happ/test/geodata.test.js` and `clients/happ/test/import-page.test.js`.

### Publication, promotion, and cross-client verification

- Modify `automation/src/build-artifacts.js`: add Happ default binaries/static files/manifests and explicitly omit Happ from `adblock-full` client membership.
- Modify `automation/src/build-site.js`, `automation/src/refresh-current.js`, and `scripts/update-rules.mjs`: stage, validate, archive, and promote the Happ directory.
- Modify `shared/release/frontier-manifest.js` and `automation/src/render-frontier-artifacts.js`: add the six Happ platform keys and per-platform candidate manifests while keeping binary geodata in the client artifact manifest.
- Modify publication/frontier tests named in Task 10.
- Modify `test/fixtures/lightweight-routing-cases.js` and `test/cross-client-routing.test.js`: include Happ in the shared behavior matrix.
- Modify `package.json`: add `verify:happ` and include it in `verify:lightweight`.
- Update `README.md`, `docs/substore-two-layer-setup.md`, `docs/maintenance.md`, `docs/implementation-status.md`, and new `clients/happ` guides.

---

### Task 1: Register Happ and enforce its lossless node capability boundary

**Files:**
- Modify: `shared/contracts.js`
- Modify: `shared/nodes/protocol-registry.js`
- Modify: `shared/nodes/capabilities.js`
- Modify: `test/capabilities.test.js`

**Interfaces:**
- Consumes: `normalizeProtocol(node.type)`, `protocolSupportsClient(protocol, client)`, normalized Sub-Store node records.
- Produces: `CLIENT.happ === "happ"`, registry support for `vless|vmess|trojan|ss|socks5|hysteria2`, and `happNodeExclusionReason(node): string | null` used by `filterNodesForClient(nodes, CLIENT.happ)`.

- [ ] **Step 1: Write failing Happ capability tests**

Add `happ` to `ALLOWED_PROTOCOLS` with exactly:

```js
happ: ["vless", "vmess", "trojan", "ss", "socks5", "hysteria2"],
```

Assert that valid basic, TLS, REALITY, WebSocket, gRPC, and Hysteria2 fixtures survive. Assert that Snell, HTTP, AnyTLS, TUIC, SSH, WireGuard, chained nodes, unsupported plugins, unsupported transports, conflicting aliases, malformed ports/credentials, and Hysteria2 without TLS are removed with stable diagnostic reasons.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test test/capabilities.test.js
```

Expected: Happ is absent from `CLIENT`, the registry, and capability dispatch.

- [ ] **Step 3: Add the shared client and protocol declarations**

Add `happ: "happ"` to `CLIENT`. Mark only the six approved normalized protocol definitions as Happ-capable. Do not add Happ to the shared Apple-only `OPTION_VALUES.platform`; Happ owns its six-platform set locally.

- [ ] **Step 4: Implement Happ-specific shape checks**

Implement and export:

```js
export function happNodeExclusionReason(node) {
  // Return a stable unsupported-happ-* reason, or null for a lossless shape.
}
```

Reuse the existing alias, TLS, REALITY, header, and chain helpers. Admit transport methods only when `render-node.js` can reproduce every supplied semantic option. Reject unknown supplied fields instead of silently dropping them.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the Step 2 command. Expected: all capability tests pass and Snell is explicitly filtered for Happ while remaining available to its existing clients.

- [ ] **Step 6: Commit Task 1**

```bash
git add shared/contracts.js shared/nodes/protocol-registry.js shared/nodes/capabilities.js test/capabilities.test.js
git commit -m "feat: add Happ node capability boundary"
```

---

### Task 2: Parse Happ options and Chinese policy overrides

**Files:**
- Create: `clients/happ/package.json`
- Create: `clients/happ/src/options.js`
- Create: `clients/happ/src/policy-overrides.js`
- Create: `clients/happ/test/options.test.js`
- Create: `clients/happ/test/policy-overrides.test.js`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Sub-Store `$arguments`, all normalized node records, and the Happ-eligible subset.
- Produces: `parseHappOptions(raw): HappOptions`, `decodePolicyOverrides(encoded): Record<string,string>`, and `resolvePolicyOverrides({ encoded, allNodes, eligibleNodes }): PolicyResolution`.

Use this exact option contract:

```js
{
  output: "config" | "audit",
  type: "collection",
  name: string,
  subscriptionName: string,
  platform: "macos" | "iphone" | "ipad" | "android" | "windows" | "linux" | "all",
  channel: "edge" | "current" | "previous",
  dnsMode: "stable" | "privacy" | "speed",
  chinaDns: "alidns" | "dnspod" | "system",
  globalDns: "cloudflare" | "google" | "quad9",
  blockMode: "balanced" | "security" | "strict" | "off",
  quicMode: "allow" | "proxy-block" | "all-block",
  ipv6Mode: "auto" | "ipv4-only",
  policyOverrides: string,
}
```

`platform: "all"` is valid only for `output: "audit"`.

- [ ] **Step 1: Write failing option and override tests**

Pin the primary Chinese keys and defaults in this order:

```js
[
  ["🤖 AI 专用", "FOLLOW"],
  ["🐙 GitHub", "FOLLOW"],
  ["📺 YouTube", "FOLLOW"],
  ["🎬 海外流媒体", "FOLLOW"],
  ["💬 海外社交", "FOLLOW"],
  ["🍎 Apple", "DIRECT"],
  ["🪟 Microsoft", "DIRECT"],
  ["🇨🇳 国内平台", "DIRECT"],
  ["🌍 海外游戏", "FOLLOW"],
  ["⬇️ 下载/P2P", "DIRECT"],
  ["🧭 DNS 与规则下载", "FOLLOW"],
  ["最终兜底", "FOLLOW"],
]
```

Accept the corresponding no-icon Chinese aliases and stable English internal IDs. Merge aliases only when their values are equal; reject a conflict. Assert UTF-8 JSON Base64URL decoding without padding, rejection of ordinary Base64 characters, unknown keys, non-string values, and targets outside case-insensitive `DIRECT`, `FOLLOW`, or `NODE:<nonblank name>`. Canonicalize the keyword to uppercase while preserving the node-name Unicode exactly. Assert exact case-sensitive node matching and these status codes: `direct`, `follow`, `fixed`, `missing-node-fallback`, `duplicate-node-fallback`, and `incompatible-node-fallback`.

- [ ] **Step 2: Run tests and verify RED**

```bash
npm --workspace @apple-proxy-profiles/happ test
```

Expected: the workspace/modules do not exist.

- [ ] **Step 3: Scaffold the workspace and strict options parser**

Add scripts matching other workspaces: `test`, `build`, `fixtures`, and `verify`. Freeze returned option objects. Apply the approved per-key defaults above; reject malformed overrides rather than guessing. Keep `adblockMode` fixed internally to `off` and do not expose a misleading Happ option for the unsupported optional pack.

- [ ] **Step 4: Implement credential-free resolution records**

Return this shape:

```js
{
  targets: {
    [businessKey]: {
      configured: "FOLLOW",
      resolved: "FOLLOW",
      status: "follow",
      warningCode: null,
      nodeId: null,
    },
  },
  fixedNodes: [],
  warnings: [],
}
```

For `NODE:` targets, first compare against the eligible set; if no eligible match exists but the all-node set has an exact-name match, report `incompatible-node-fallback` rather than the generic missing code. Store only the normalized node identity ID in `nodeId`; never copy the node record or credentials into `targets` or `warnings`.

- [ ] **Step 5: Run tests and verify GREEN**

Run the Step 2 command. Expected: option and override tests pass.

- [ ] **Step 6: Commit Task 2**

```bash
git add clients/happ/package.json clients/happ/src/options.js clients/happ/src/policy-overrides.js clients/happ/test/options.test.js clients/happ/test/policy-overrides.test.js package-lock.json
git commit -m "feat: add Happ Chinese policy overrides"
```

---

### Task 3: Render lossless Xray outbounds for Happ nodes

**Files:**
- Create: `clients/happ/src/render-node.js`
- Create: `clients/happ/test/node.test.js`
- Create: `clients/happ/test/fixtures/nodes.js`

**Interfaces:**
- Consumes: one node already accepted by `filterNodesForClient(..., CLIENT.happ)` and an opaque internal tag.
- Produces: `renderHappOutbound(node, tag): XrayOutbound` and `renderHappStreamSettings(node): XrayStreamSettings | undefined`.

- [ ] **Step 1: Write one failing fixture test per approved protocol**

Assert exact Xray structures for:

- VLESS `vnext/users`, encryption, flow, TLS/REALITY, raw/WebSocket/gRPC transport.
- VMess `vnext/users`, UUID, alterId, security, TLS and supported transports.
- Trojan `servers`, password, TLS and supported transports.
- Shadowsocks `servers`, method, password, UDP/XUDP-compatible options.
- SOCKS5 `servers` and optional username/password.
- Hysteria2 `protocol: "hysteria"`, `settings: { version: 2, address, port }`, `streamSettings.method: "hysteria"`, required TLS, and supported Hysteria transport settings.

Also assert that output tags are opaque, unique, and never contain raw normalized names.

- [ ] **Step 2: Run the node test and verify RED**

```bash
node --test clients/happ/test/node.test.js
```

- [ ] **Step 3: Implement common transport and security rendering**

Use current Xray JSON field names (`method`, `rawSettings`, `wsSettings`, `grpcSettings`, `hysteriaSettings`, `security`, `tlsSettings`, `realitySettings`). Map every admitted header, SNI, ALPN, fingerprint, allow-insecure, REALITY public key/short ID/spider path, and transport path/service name. Throw on an unhandled admitted shape so capabilities and rendering cannot drift silently.

- [ ] **Step 4: Implement six protocol renderers**

Keep secrets only inside the private Xray outbound. Never use them in tags, remarks, warnings, or audit output. Hysteria2 follows the official Xray split between the `hysteria` proxy protocol and `hysteria` transport; do not translate it into a different protocol.

- [ ] **Step 5: Run tests and verify GREEN**

Run the Step 2 command. Expected: all exact fixture assertions pass.

- [ ] **Step 6: Commit Task 3**

```bash
git add clients/happ/src/render-node.js clients/happ/test/node.test.js clients/happ/test/fixtures/nodes.js
git commit -m "feat: render Happ Xray node outbounds"
```

---

### Task 4: Render platform inbounds and shared DNS behavior

**Files:**
- Create: `clients/happ/src/render-platform.js`
- Create: `clients/happ/src/render-dns.js`
- Create: `clients/happ/test/platform.test.js`
- Create: `clients/happ/test/dns.test.js`

**Interfaces:**
- Consumes: `platform`, `dnsMode`, `chinaDns`, `globalDns`, `ipv6Mode`, resolved `🧭 DNS 与规则下载`, and `orderedRoutingPlan()` DNS metadata.
- Produces: `renderHappInbounds(platform): XrayInbound[]`, `renderHappDns(options): XrayDns`, and `renderHappDnsRoutes(options): XrayRule[]`.

- [ ] **Step 1: Write failing platform matrix tests**

For all six platforms, assert loopback-only SOCKS and HTTP inbounds, unique tags/ports, UDP enabled on SOCKS, and sniffing with `routeOnly: true`. Assert that platform selection changes only declared metadata/inbound adapter fields, never policy ordering or credentials.

- [ ] **Step 2: Write failing DNS tests**

Assert:

- domestic-class domains use the domestic resolver and direct DNS route;
- proxy-class domains use the global DoH resolver and the current JSON object's `FOLLOW` outbound;
- resolver routing rules precede user service rules;
- `ipv6Mode: "ipv4-only"` emits `UseIPv4`, while `ipv6Mode: "auto"` emits `UseIP`;
- `dnsMode` and the selected domestic/global resolver IDs change resolver strategy without changing explicit domestic assignments;
- no DNS route can select a fixed-node balancer.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/happ/test/platform.test.js clients/happ/test/dns.test.js
```

- [ ] **Step 4: Implement the thin platform adapter**

Use deterministic localhost ports `10808` (SOCKS) and `10809` (HTTP), tags `happ-in-socks` and `happ-in-http`, and no LAN listen address. Centralize these constants and validate port uniqueness.

- [ ] **Step 5: Implement DNS rendering**

Use the authoritative shared `dnsClass` metadata. Give generated DNS traffic a dedicated tag, route the domestic resolver direct, and route the global encrypted resolver through the resolved `🧭 DNS 与规则下载` target (default `FOLLOW`, but also honoring `DIRECT` or a fixed node). Avoid hostname bootstrap loops by pairing each DoH name with its configured literal resolver IP.

- [ ] **Step 6: Run tests and verify GREEN**

Run the Step 3 command.

- [ ] **Step 7: Commit Task 4**

```bash
git add clients/happ/src/render-platform.js clients/happ/src/render-dns.js clients/happ/test/platform.test.js clients/happ/test/dns.test.js
git commit -m "feat: add Happ platform and DNS adapters"
```

---

### Task 5: Render ordered routing and fixed-node automatic fallback

**Files:**
- Create: `clients/happ/src/render-routing.js`
- Create: `clients/happ/test/routing.test.js`
- Create: `clients/happ/test/failover.test.js`

**Interfaces:**
- Consumes: `orderedRoutingPlan({ adblockMode: "off" })`, `PolicyResolution`, follow outbound tag, fixed-node outbound tags, and Happ options.
- Produces: `renderHappRouting(context): { routing, observatory, policyTargets }`.

- [ ] **Step 1: Write failing ordered-routing tests**

Assert local/private routes first, then shared custom rules, then the same source-ID sequence as `orderedRoutingPlan()`, using `geosite:HAPP-<UPPERCASE_SOURCE_ID>` for domain sources and `geoip:HAPP-<UPPERCASE_SOURCE_ID>` for IP sources. Assert `domainStrategy: "IPIfNonMatch"`, security/QUIC rules before service rules, `ChinaTLD` before `ChinaIP`, and one explicit last `network: "tcp,udp"` final rule for `最终兜底`.

- [ ] **Step 2: Write failing target and failover tests**

Pin these translations:

```js
DIRECT -> { outboundTag: "happ-direct" }
FOLLOW -> { outboundTag: followTag }
fixed  -> { balancerTag: fixedBalancerTag }
```

For each distinct fixed node, assert exactly one candidate outbound, one balancer with `strategy.type: "leastPing"`, `fallbackTag: followTag`, and one top-level observatory subject selector. Verify by prefix expansion that each balancer selector matches exactly one outbound. When the fixed node is also the current follow node, collapse the target to `outboundTag: followTag` and do not create a self-observing balancer.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/happ/test/routing.test.js clients/happ/test/failover.test.js
```

- [ ] **Step 4: Implement policy-to-rule mapping**

Map source `policy` values to the approved Chinese business keys through one frozen table. Domestic core/game/TLD/IP remain `🇨🇳 国内平台`; PrivateTracker and Download map to `⬇️ 下载/P2P`; global resolver traffic maps to `🧭 DNS 与规则下载`; unmatched traffic maps to `最终兜底`. Do not derive mappings from UI labels. Emit exactly one of `outboundTag` or `balancerTag` on each Xray rule.

- [ ] **Step 5: Implement collision-proof fixed-node topology**

Derive tags from the normalized identity ID plus a stable hash:

```text
happ-follow/<id>
happ-fixed/<hash>/candidate
happ-fixed/<hash>/balancer
```

Append `/candidate` to the selector prefix and validate exact cardinality. Set the observatory probe URL, interval, concurrency, and timeout as constants covered by tests. Keep `observatory` at the Xray top level.

- [ ] **Step 6: Run tests and verify GREEN**

Run the Step 3 command.

- [ ] **Step 7: Commit Task 5**

```bash
git add clients/happ/src/render-routing.js clients/happ/test/routing.test.js clients/happ/test/failover.test.js
git commit -m "feat: add Happ fixed-node fallback routing"
```

---

### Task 6: Build and validate one Happ JSON entry per eligible node

**Files:**
- Create: `clients/happ/src/render-subscription.js`
- Create: `clients/happ/src/validate-subscription.js`
- Create: `clients/happ/src/audit.js`
- Create: `clients/happ/test/subscription.test.js`
- Create: `clients/happ/test/validation.test.js`
- Create: `clients/happ/test/audit.test.js`
- Create: `clients/happ/test/scaling.test.js`

**Interfaces:**
- Consumes: normalized/filtered nodes, `HappOptions`, and `PolicyResolution`.
- Produces: `renderHappSubscription({ nodes, options }): XrayConfig[]`, `validateHappSubscription(configs): true`, and `buildHappAudit(input): HappAudit`.

- [ ] **Step 1: Write failing subscription tests**

Assert array length equals the eligible node count, each object's `remarks` equals the normalized node name, each object uses that node as `FOLLOW`, fixed-node outbounds are deduplicated, and all six platforms render. Assert that zero eligible nodes fails with one stable Chinese error.

- [ ] **Step 2: Write failing warning and audit tests**

Assert `meta.serverDescription` includes Chinese warnings for generation-time missing/duplicate fixed nodes and otherwise includes a compact Chinese business mapping summary. Assert audit schema version, counts, configured/resolved targets, statuses, warning codes, and no keys matching the shared secret-key detector.

- [ ] **Step 3: Write failing structural validation tests**

Reject duplicate outbound/inbound/balancer tags, dangling route references, selector cardinality other than one, missing fallback outbound, fixed candidates absent from observatory, Snell, raw node names in internal tags, and a config whose final rule is not last.

- [ ] **Step 4: Write failing bounded-growth tests**

Generate sanitized fixtures with 30, 100, and 1,000 eligible nodes while holding the number of unique fixed targets constant. Assert array lengths exactly match input counts, total serialized bytes per node stay within a tested tolerance band, and the 1,000-node output remains below the publication/private-subscription budget recorded in the test. Measure time for diagnostics, but enforce deterministic structure and byte-growth bounds rather than a flaky wall-clock threshold.

- [ ] **Step 5: Run tests and verify RED**

```bash
node --test clients/happ/test/subscription.test.js clients/happ/test/validation.test.js clients/happ/test/audit.test.js clients/happ/test/scaling.test.js
```

- [ ] **Step 6: Compose configs and safe metadata**

Order outbounds deterministically: current `FOLLOW`, distinct fixed candidates, `DIRECT`, then `BLOCK`. Ensure a missing fixed node never appears as an outbound and is rendered as `FOLLOW` everywhere.

- [ ] **Step 7: Implement validation and audit**

Validation must walk every cross-reference. Audit records may contain fixed normalized names because the audit is private, but never addresses, ports, UUIDs, passwords, public keys, headers, subscription URLs, or the original node object.

- [ ] **Step 8: Run tests and verify GREEN**

Run the Step 5 command.

- [ ] **Step 9: Commit Task 6**

```bash
git add clients/happ/src/render-subscription.js clients/happ/src/validate-subscription.js clients/happ/src/audit.js clients/happ/test/subscription.test.js clients/happ/test/validation.test.js clients/happ/test/audit.test.js clients/happ/test/scaling.test.js
git commit -m "feat: compose validated Happ subscriptions"
```

---

### Task 7: Add the two Happ Sub-Store generators and six-platform task contract

**Files:**
- Create: `clients/happ/src/substore-config-entry.js`
- Create: `clients/happ/scripts/build.mjs`
- Create: `clients/happ/scripts/render-fixtures.mjs`
- Create: `clients/happ/test/substore-config-entry.test.js`
- Create: `clients/happ/test/bundles.test.js`
- Create: `clients/happ/test/examples.test.js`
- Create: `clients/happ/dist/happ-config-generator.js`
- Create: `clients/happ/dist/substore-config-generator.js`
- Create: `clients/happ/examples/happ-{macos,iphone,ipad,android,windows,linux}.json`
- Create: `clients/happ/examples/happ-routing-audit.json`

**Interfaces:**
- Consumes: Sub-Store `operator(input, targetPlatform, context)`, `context.arguments`, and `context.produceArtifact`.
- Produces: private JSON-array config output for six platform tasks and private audit-object output for one platform-independent task.

- [ ] **Step 1: Write failing operator tests**

Assert `produceArtifact({ type, name, platform: "JSON", produceType: "internal" })`, shared normalization, Happ filtering, JSON plus one trailing newline, logger summaries without credentials, and stable failures for missing arguments or zero eligible nodes.

- [ ] **Step 2: Write failing bundle and example tests**

Evaluate both browser bundles in a VM context with `$arguments`, `produceArtifact`, and `logger`. Assert no Node-only imports, no placeholder/TODO markers, and valid sanitized examples for all six platforms plus audit.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/happ/test/substore-config-entry.test.js clients/happ/test/bundles.test.js clients/happ/test/examples.test.js
```

- [ ] **Step 4: Implement the operator**

Use these exact private task names: `happ-config-macos`, `happ-config-iphone`, `happ-config-ipad`, `happ-config-android`, `happ-config-windows`, `happ-config-linux`, and `happ-routing-audit`. The first six use `output=config` with their named platform; the audit uses `output=audit&platform=all`. All seven use `type=collection`, their own `name`/`subscriptionName`, and the identical `policyOverrides` Base64URL string.

- [ ] **Step 5: Build deterministic bundles and sanitized fixtures**

Use `TEST_ONLY_` credentials in examples. Make the two tracked bundle entry points explicit aliases of the same tested operator so their behavior cannot diverge.

- [ ] **Step 6: Run tests, build, and verify GREEN**

```bash
npm --workspace @apple-proxy-profiles/happ run build
npm --workspace @apple-proxy-profiles/happ run fixtures
npm --workspace @apple-proxy-profiles/happ test
```

- [ ] **Step 7: Commit Task 7**

```bash
git add clients/happ/src/substore-config-entry.js clients/happ/scripts clients/happ/test/substore-config-entry.test.js clients/happ/test/bundles.test.js clients/happ/test/examples.test.js clients/happ/dist clients/happ/examples
git commit -m "feat: add Happ Sub-Store generators"
```

---

### Task 8: Compile deterministic Xray geosite and geoip binaries

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `THIRD_PARTY_NOTICES.md`
- Create: `clients/happ/proto/geodata.proto`
- Create: `automation/src/render-happ-geodata.js`
- Create: `clients/happ/test/geodata.test.js`
- Modify: `automation/test/compile-lightweight-rules.test.js`

**Interfaces:**
- Consumes: compacted default `Map<sourceId, CompiledRuleSet>` from `compileLightweightRules`.
- Produces: `renderHappGeodata(ruleSets): { files: Map<string,Buffer>, counts }` and `decodeHappGeodata(files): DecodedGeodata`.

- [ ] **Step 1: Add the pinned protobuf dependency and schema**

Install an exact `protobufjs` version into root `devDependencies`. Vendor only the minimal wire-compatible schema fields:

```proto
message Domain { enum Type { Plain = 0; Regex = 1; Domain = 2; Full = 3; } Type type = 1; string value = 2; }
message GeoSite { string country_code = 1; repeated Domain domain = 2; }
message GeoSiteList { repeated GeoSite entry = 1; }
message CIDR { bytes ip = 1; uint32 prefix = 2; }
message GeoIP { string country_code = 1; repeated CIDR cidr = 2; bool reverse_match = 3; }
message GeoIPList { repeated GeoIP entry = 1; }
```

Record the pinned Xray/V2Ray upstream source URL, commit, and license in comments and `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 2: Write failing encode/decode tests**

Assert deterministic byte equality across runs, sorted tag/source/entry order, mapping `domain -> Full`, `domainSuffix -> Domain`, `domainKeyword -> Plain`, binary IPv4/IPv6 CIDR bytes, and tags named `HAPP-<UPPERCASE_SOURCE_ID>`. Decode every output with the same schema and compare all entries to the compacted input.

Assert `Advertising` and `Advertising_Domain` are absent from both binaries and that unsupported rule kinds fail closed.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/happ/test/geodata.test.js automation/test/compile-lightweight-rules.test.js
```

- [ ] **Step 4: Implement deterministic protobuf compilation**

Emit exactly `happ/geosite.dat` and `happ/geoip.dat`. Sort before encoding, use canonical IP bytes, uppercase stored country codes, and validate by decoding before returning buffers.

- [ ] **Step 5: Run tests and verify GREEN**

Run the Step 3 command.

- [ ] **Step 6: Commit Task 8**

```bash
git add package.json package-lock.json clients/happ/proto/geodata.proto automation/src/render-happ-geodata.js clients/happ/test/geodata.test.js automation/test/compile-lightweight-rules.test.js THIRD_PARTY_NOTICES.md
git commit -m "feat: compile Happ Xray geodata"
```

---

### Task 9: Build the public Happ routing profile and local policy helper

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `clients/happ/src/render-routing-profile.js`
- Create: `clients/happ/src/build-import-page.js`
- Create: `clients/happ/test/import-page.test.js`

**Interfaces:**
- Consumes: immutable channel base URL and upstream `generatedAt`.
- Produces: `renderHappRoutingProfile(input): HappRoutingProfile`, `renderHappRoutingDeepLink(profile): string`, `renderHappRoutingQrSvg(deepLink): Promise<string>`, and `renderHappImportPage(input): string`.

- [ ] **Step 1: Write failing routing-profile tests**

Assert the official Happ schema keys and types: `Name`, string `GlobalProxy`, `RouteOrder`, remote/domestic DNS type/domain/IP fields, `Geoipurl`, `Geositeurl`, Unix-string `LastUpdated`, `DnsHosts`, `DirectSites`, `DirectIp`, `ProxySites`, `ProxyIp`, `BlockSites`, `BlockIp`, `DomainStrategy`, string `FakeDNS`, and string `UseChunkFiles`. Decode the deep link's Base64 payload and deep-compare it to the profile object.

- [ ] **Step 2: Write failing helper-page privacy tests**

Assert one-click routing import, a build-time QR SVG for the same public deep link, all Chinese business keys, `DIRECT`/`FOLLOW`/`NODE:` controls, client-side UTF-8 Base64URL encoding/decoding, copy button, warning that Base64URL is not encryption, and absence of `fetch`, `XMLHttpRequest`, `sendBeacon`, cookies, `localStorage`, `sessionStorage`, analytics, and external scripts.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/happ/test/import-page.test.js
```

- [ ] **Step 4: Implement profile and deep link**

Point `Geoipurl` and `Geositeurl` at the same immutable publication channel. Keep routing rule arrays empty because the private Xray JSON owns rule behavior; retain valid bootstrap DNS fields required by Happ. Set `GlobalProxy: "true"`, `RouteOrder: "block-proxy-direct"`, `DomainStrategy: "IPIfNonMatch"`, `FakeDNS: "false"`, and `UseChunkFiles: "true"`.

- [ ] **Step 5: Implement the offline helper page**

Pin `qrcode` in the lockfile and render the public deep-link QR to static SVG during the build. Inline all CSS/JavaScript, add a restrictive CSP, encode only after an explicit button click, and never place the generated override string in a URL query or fragment.

- [ ] **Step 6: Run tests and verify GREEN**

Run the Step 3 command.

- [ ] **Step 7: Commit Task 9**

```bash
git add package.json package-lock.json clients/happ/src/render-routing-profile.js clients/happ/src/build-import-page.js clients/happ/test/import-page.test.js
git commit -m "feat: add Happ geodata import helper"
```

---

### Task 10: Integrate Happ with immutable publication and promotion

**Files:**
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `automation/src/refresh-current.js`
- Modify: `automation/src/render-frontier-artifacts.js`
- Modify: `shared/release/frontier-manifest.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `automation/test/build-artifacts.test.js`
- Modify: `automation/test/build-site.test.js`
- Modify: `automation/test/refresh-current.test.js`
- Modify: `automation/test/frontier-artifacts.test.js`
- Modify: `test/frontier-contract.test.js`
- Modify: `test/frontier-verification.test.js`
- Modify: `test/update-rules.test.js`
- Modify: `test/public.test.js`
- Modify: `test/rule-budgets.test.js`

**Interfaces:**
- Consumes: `renderHappGeodata`, Happ generated bundles/examples/import page/profile, and existing upstream/channel metadata.
- Produces: immutable `happ/` client artifacts, client manifest, six Happ frontier platform manifests, and edge/current/previous channel projections.

- [ ] **Step 1: Write failing client-closure and binary-publication tests**

Assert `happ` is present in default client maps, both `.dat` files are Buffers and decode successfully, static helper/generator/example files are present, manifest hashes cover binary bytes, and Happ referenced-default bytes remain under 5 MB.

- [ ] **Step 2: Write failing optional-pack tests**

Introduce `OPTIONAL_PACK_CLIENTS["adblock-full"]` containing only the original five clients. Assert the optional manifest omits Happ, Happ's default client manifest has `optionalPacks: {}`, and the default binaries contain no forbidden optional IDs.

- [ ] **Step 3: Write failing channel and frontier tests**

Add `happ` to public/current refresh/promotion maps and six platform keys to `FRONTIER_PLATFORMS`. Assert edge creation never mutates current/previous, platform promotion changes only the selected Happ platform manifest, rollback restores the previous digest, and binary geodata is carried by the client manifest rather than duplicated in platform manifests.

- [ ] **Step 4: Run focused publication tests and verify RED**

```bash
node --test automation/test/build-artifacts.test.js automation/test/build-site.test.js automation/test/refresh-current.test.js automation/test/frontier-artifacts.test.js test/frontier-contract.test.js test/frontier-verification.test.js test/update-rules.test.js test/public.test.js test/rule-budgets.test.js
```

- [ ] **Step 5: Integrate Happ default artifact rendering**

Add `happ: "happ"` to client path maps, call `renderHappGeodata` after default compaction, add static Happ files through `additionalFiles`, include both binaries in `clientRuleRecords`, and preserve binary-safe hashing/copying.

- [ ] **Step 6: Make optional-pack client membership explicit**

Parameterize `addClientManifests` with an explicit client-path map. Use all six clients for defaults and the original five for `adblock-full`. Generate `optionalSelections.happ = {}` without dereferencing a missing optional manifest.

- [ ] **Step 7: Integrate immutable channels and six platform manifests**

Extend `CLIENT_PUBLIC_PATHS`, `CLIENT_DIRECTORIES`, promotion allowlists/regexes, static file closures, routing prefixes, and frontier platform maps. Keep `happ/geosite.dat` and `happ/geoip.dat` client-wide; platform manifests hash the corresponding example config and the Happ client manifest.

- [ ] **Step 8: Run tests and verify GREEN**

Run the Step 4 command.

- [ ] **Step 9: Commit Task 10**

```bash
git add automation/src/build-artifacts.js automation/src/build-site.js automation/src/refresh-current.js automation/src/render-frontier-artifacts.js shared/release/frontier-manifest.js scripts/update-rules.mjs automation/test/build-artifacts.test.js automation/test/build-site.test.js automation/test/refresh-current.test.js automation/test/frontier-artifacts.test.js test/frontier-contract.test.js test/frontier-verification.test.js test/update-rules.test.js test/public.test.js test/rule-budgets.test.js
git commit -m "feat: publish Happ immutable artifacts"
```

---

### Task 11: Add Happ to shared routing parity and root verification

**Files:**
- Modify: `test/fixtures/lightweight-routing-cases.js`
- Modify: `test/cross-client-routing.test.js`
- Modify: `test/security.test.js`
- Modify: `test/foundation.test.js`
- Modify: `test/substore-docs.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: sanitized Happ macOS example, decoded geodata tags, and the existing shared routing cases.
- Produces: six-client routing parity checks and root `verify:happ`/`verify:lightweight` coverage.

- [ ] **Step 1: Write the Happ example parser and failing parity assertions**

Add `"happ"` to `LIGHTWEIGHT_CLIENTS`. Parse the first sanitized Happ config's ordered `routing.rules`, translate `geosite:HAPP-*`/`geoip:HAPP-*` back to source IDs, and map its target reference back to the shared policy. Assert all existing domain, IP, DNS-failure, explicit-overseas, ChinaTLD, ChinaIP, and final-route cases.

- [ ] **Step 2: Extend security and foundation tests**

Scan Happ bundles, examples, import page, routing profile, and public artifacts. Permit only `TEST_ONLY_` fixture secrets. Assert exactly six root clients, seven Happ Sub-Store tasks in documentation, no public audit, and no private override string in generated public files.

- [ ] **Step 3: Run focused tests and verify RED**

```bash
node --test test/cross-client-routing.test.js test/security.test.js test/foundation.test.js test/substore-docs.test.js
```

- [ ] **Step 4: Add root scripts and update assumptions**

Add:

```json
"verify:happ": "npm --workspace @apple-proxy-profiles/happ run verify"
```

Insert `verify:happ` into `verify:lightweight`, and replace hard-coded five-client counts only where Happ now participates.

- [ ] **Step 5: Run Happ and shared verification**

```bash
npm run verify:happ
npm run verify:lightweight
```

- [ ] **Step 6: Commit Task 11**

```bash
git add test/fixtures/lightweight-routing-cases.js test/cross-client-routing.test.js test/security.test.js test/foundation.test.js test/substore-docs.test.js package.json
git commit -m "test: enforce six-client Happ parity"
```

---

### Task 12: Document setup, manual node changes, warnings, and six-platform canary

**Files:**
- Create: `clients/happ/README.md`
- Create: `clients/happ/docs/deployment.md`
- Create: `clients/happ/docs/troubleshooting.md`
- Create: `clients/happ/docs/canary.md`
- Modify: `README.md`
- Modify: `docs/substore-two-layer-setup.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/implementation-status.md`
- Modify: `clients/happ/test/examples.test.js`
- Modify: `test/substore-docs.test.js`

**Interfaces:**
- Consumes: final seven-task argument contract, routing-profile link, warning codes, and edge artifact URLs.
- Produces: reproducible Chinese operator documentation and a signed-off six-platform canary record.

- [ ] **Step 1: Write failing documentation assertions**

Require docs to contain all six platforms; all seven exact task names (`happ-config-macos`, `happ-config-iphone`, `happ-config-ipad`, `happ-config-android`, `happ-config-windows`, `happ-config-linux`, `happ-routing-audit`); identical `policyOverrides` use; the 17-to-24 private-task count change; exact-node case sensitivity; `DIRECT`/`FOLLOW`/`NODE:` examples; missing/duplicate/incompatible fallback behavior; runtime log visibility; Base64URL warning; two-layer import order; and edge-before-current promotion.

- [ ] **Step 2: Document the normal one-time setup**

Explain:

1. Open the public Happ helper and install the routing/geodata profile.
2. Choose Chinese business targets and copy the locally generated `policyOverrides` value.
3. Create six private config tasks and one private audit task in Sub-Store.
4. Import the platform-appropriate JSON-array subscription into official Happ.
5. Switch nodes from Happ's homepage; `FOLLOW` changes with the selected entry, while fixed-node business routes remain fixed and automatically fall back when unhealthy.

Include the ordinary maintenance answer: changing a fixed node later requires editing the Chinese target, regenerating the one Base64URL string, and updating it in all seven tasks; after a stable setup it normally does not need ongoing changes.

- [ ] **Step 3: Document warnings and troubleshooting**

Give Chinese explanations for missing, renamed, duplicate, unsupported-protocol, empty-subscription, geodata-import, and runtime-health cases. State precisely that generation warnings appear in `meta.serverDescription` and the private audit, while runtime fallback/recovery appears only in Happ/Xray logs.

- [ ] **Step 4: Write the six-platform canary checklist**

For every official application, record app version, bundled Xray version if exposed, install result, node-switch result, domestic/global DNS result, each Chinese business route, DIRECT, FOLLOW, fixed healthy, fixed failure fallback, recovery, IPv4/IPv6, QUIC allow/block, sleep/wake, network change, and log evidence. A failed platform blocks all Happ current-channel promotion.

- [ ] **Step 5: Run documentation tests and commit**

```bash
node --test clients/happ/test/examples.test.js test/substore-docs.test.js
git add clients/happ/README.md clients/happ/docs README.md docs/substore-two-layer-setup.md docs/maintenance.md docs/implementation-status.md clients/happ/test/examples.test.js test/substore-docs.test.js
git commit -m "docs: add Happ setup and canary guide"
```

---

### Task 13: Rebuild, stage edge only, and run final verification

**Files:**
- Modify: tracked generated Happ bundles/examples from Tasks 7 and 9
- Modify: `public/edge/**` generated by the staging command
- Do not modify: `public/current/**`
- Do not modify: `public/previous/**`

**Interfaces:**
- Consumes: all implemented Happ sources and the existing pinned rule snapshots.
- Produces: a verified edge candidate and a clean repository state containing no unintended current/previous promotion.

- [ ] **Step 1: Rebuild and regenerate tracked Happ outputs**

```bash
npm --workspace @apple-proxy-profiles/happ run build
npm --workspace @apple-proxy-profiles/happ run fixtures
```

- [ ] **Step 2: Run the complete test suite**

```bash
npm test
npm run check:secrets
npm run check:actions
npm run verify
```

Expected: every command exits 0; Happ participates in six-client routing and publication checks.

- [ ] **Step 3: Stage an edge candidate only**

```bash
npm run update:rules
```

Verify with `git diff --name-only` that generated publication changes are confined to `public/edge`, immutable edge archives/manifests, and intended source/generated Happ files. Fail if `public/current` or `public/previous` changed.

- [ ] **Step 4: Run placeholder, type-contract, and secret self-review**

```bash
rg -n "TODO|FIXME|PLACEHOLDER|TBD|throw new Error\(\"not implemented" clients/happ automation/src/render-happ-geodata.js
rg -n "Advertising|Advertising_Domain" public/edge/happ
npm run check:secrets
```

Expected: no placeholder hits, no optional-adblock references in Happ defaults, and no secret findings.

- [ ] **Step 5: Review the final diff against the approved design**

Check every design requirement: official client only, six platforms, JSON-array homepage selection, Chinese overrides, exact fixed name, generation fallback warning, runtime health fallback and recovery, audit privacy, two-layer import, binary geodata, optional-pack omission, immutable edge staging, and no current promotion.

- [ ] **Step 6: Commit the verified edge candidate**

```bash
git add clients/happ/dist clients/happ/examples public/edge
git commit -m "feat: add Happ as sixth proxy client"
```

- [ ] **Step 7: Stop before promotion**

Do not run `--promote happ ...` until all six rows in `clients/happ/docs/canary.md` contain real-device evidence and explicit approval. Each row must prove the official Happ application accepted and started its generated JSON, which is the authoritative bundled-Xray compatibility check; a standalone desktop Xray validation cannot substitute for the mobile or desktop application canary. Report the edge URLs and the remaining manual canary gate.

---

## Self-Review Checklist

- [ ] Every approved design section maps to at least one task and test.
- [ ] Every created or modified file is listed under a task.
- [ ] All six platforms and seven Sub-Store tasks are covered by tests and docs.
- [ ] Capability acceptance and node rendering cover the same six protocol families with no silent field loss.
- [ ] Chinese policy keys, internal policy IDs, geodata tags, and Xray targets have one-to-one tested mappings.
- [ ] Fixed-node selector prefix expansion is tested to produce exactly one candidate.
- [ ] Generation warnings and runtime log-only fallback are not conflated.
- [ ] Public artifacts are free of node secrets, subscription URLs, overrides, and private audit data.
- [ ] Happ is absent from `adblock-full`, and its default geodata contains no optional source.
- [ ] Binary artifact hashing, byte budgets, immutable channels, rollback, and edge-only staging are tested.
- [ ] No placeholder/TODO markers or unresolved interface names remain.
- [ ] Final verification commands and manual promotion gate are explicit.
