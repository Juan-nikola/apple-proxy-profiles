# OneXray Sixth-Client Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add official OneXray as the repository's sixth implemented client, with a private homepage-node subscription, a private versioned native Xray Profile, a private Chinese routing audit, and public deterministic Xray GeoData for macOS, iPhone, iPad, Android, Windows, and Linux while preserving the project's shared routing and DNS behavior.

**Architecture:** Keep normalization, policy intent, rule ordering, DNS providers, and release contracts shared. Add a OneXray adapter that emits only losslessly representable structured outbounds; keeps homepage-selected traffic on runtime `proxy`; embeds only uniquely resolved fixed-business outbounds; optionally uses OneXray Final Outbound for one global entry-to-landing chain; compiles the shared rule snapshot into channel-specific Xray `geosite.dat` and `geoip.dat`; and exposes only credential-free install assets publicly. Private Profile generation is transactional: any invalid fixed target, chain target, tag reference, GeoData reference, secret-scan result, or 32 KiB deep-link breach rejects the whole output.

**Tech Stack:** Node.js 22+ ESM, Node built-in test runner, npm workspaces, esbuild, exact-lockfile `protobufjs@7.6.5`, Sub-Store processors, OneXray native Xray Profile JSON, Xray geosite/geoip protobuf data, static HTML/JavaScript, and the repository's deterministic edge/current/previous publication pipeline.

## Global Constraints

- Target only the official OneXray applications. Do not fork OneXray or generate Raw JSON as the primary configuration path.
- Support one node subscription and one Profile across exactly `macos`, `iphone`, `ipad`, `android`, `windows`, and `linux`; platform-specific TUN behavior remains owned by OneXray settings.
- Pin compatibility to upstream commit `a7415277f3c9fb6a6af3ef29101517fac731d029` and OneXray 26.8.3 until a deliberate compatibility audit updates the pin.
- Support only structured, lossless VLESS, VMess, Shadowsocks, Trojan, SOCKS5, HTTP, and Hysteria2 shapes accepted by the audited OneXray model. Reject unsupported supplied fields instead of dropping them.
- `FOLLOW` means runtime `proxy`, `DIRECT` means `direct`, and `NODE:<normalized exact name>` means one embedded custom outbound. Matching is exact, Unicode-preserving, and case-sensitive after shared normalization.
- A missing, renamed, duplicate, incompatible, or malformed fixed node rejects the entire Profile and audit generation. Never silently change a fixed business to `FOLLOW`.
- A valid fixed node that fails at runtime remains selected and its connections fail. Do not add health checks, balancers, fallback, notifications, or an emergency Profile.
- `clientChain=off` is the default. With `clientChain=on`, publish only entry-eligible homepage nodes and require one unique compatible landing target; homepage becomes `chainProxy`, landing becomes Final Outbound/runtime `proxy`, `FOLLOW` uses the chain, and fixed business outbounds bypass it.
- Security targets are immutable: `blockMode` alone maps threat/advertising/tracking categories to `block` or `direct`; `policyOverrides` cannot redirect them.
- Preserve the shared route order, `IPIfNonMatch`, explicit final rule, domestic/global DNS split, IPv6 contract, QUIC contract, and late ChinaIP direct rule.
- Default OneXray GeoData contains the lightweight rule set only. Do not advertise OneXray support for the optional `adblock-full` pack in this implementation.
- Profile names are `Apple Proxy · OneXray · <channel> · <8-hex>` from canonical Profile SHA-256. Same-name imports are inserts, so documentation must retain only the newest and previous verified Profile manually.
- Reject encoded Profile links longer than 32 KiB. Do not generate a Profile QR code.
- Public Pages, manifests, fixtures, tests, and logs contain no node credentials, subscription URLs, policy overrides, fixed-node names, Profile deep links, or private audit payloads.
- Generate and stage `edge` candidates only. Do not promote OneXray `current`, overwrite `previous`, or claim a platform ready until its manual canary is recorded.
- Keep output deterministic for identical normalized nodes, options, rule snapshot, and upstream timestamp.
- Write tests before each behavior change, verify focused RED/GREEN, and create one isolated commit per task.

---

## File Structure and Responsibilities

### Shared contracts

- Modify `shared/contracts.js`: register `CLIENT.onexray` while leaving platform options client-local.
- Modify `shared/nodes/protocol-registry.js`: declare OneXray support for seven approved protocol families.
- Modify `shared/nodes/capabilities.js`: add stable OneXray field-level exclusion reasons.
- Create `shared/policies/business-targets.js`: one authoritative business ID/Chinese alias/default catalog and strict Base64URL override parser reusable by OneXray and later Happ work.
- Create `shared/dns/providers.js`: canonical domestic/global resolver metadata used by existing clients and OneXray.

### OneXray workspace and private generators

- Create `clients/onexray/package.json` and `clients/onexray/UPSTREAM_COMPATIBILITY.md`.
- Create `clients/onexray/src/options.js`: strict private task options.
- Create `clients/onexray/src/resolve-policy.js`: exact fixed-node and client-chain resolution with transactional failure.
- Create `clients/onexray/src/render-outbound.js`: normalized node to audited OneXray structured outbound.
- Create `clients/onexray/src/render-subscription.js`: homepage outbound subscription document.
- Create `clients/onexray/src/render-dns.js`: native Xray DNS servers and DNS routing intents.
- Create `clients/onexray/src/render-routing.js`: ordered native Xray routing rules and outbound tags.
- Create `clients/onexray/src/geodata-contract.js`: channel names, stable category codes, and ext references.
- Create `clients/onexray/src/render-profile.js`: canonical OneXray Profile with fixed outbounds and optional Final Outbound.
- Create `clients/onexray/src/profile-link.js`: deterministic hash/name/deep-link encoding and decoding.
- Create `clients/onexray/src/validate-profile.js`: model, reference, size, and secret-boundary validation.
- Create `clients/onexray/src/render-audit.js`: deterministic credential-free private audit.
- Create `clients/onexray/src/substore-nodes-entry.js` and `clients/onexray/src/substore-profile-entry.js`: three private output modes with shared resolution.
- Create build, fixture, public-page, tests, tracked bundles, and sanitized examples under `clients/onexray`.

### GeoData and publication

- Create `automation/proto/xray-geodata.proto`: minimal vendored Xray geosite/geoip schema with provenance/license comments.
- Create `automation/src/render-xray-geodata.js`: deterministic protobuf compiler plus decode-backed validation.
- Modify artifact, site, refresh, frontier, update, and publication tests to stage OneXray edge artifacts and model six platform candidates.
- Update root scripts, cross-client fixtures, documentation, secret scanning, and release counts.

---

### Task 1: Register OneXray and pin its lossless capability boundary

**Files:**
- Modify: `shared/contracts.js`
- Modify: `shared/nodes/protocol-registry.js`
- Modify: `shared/nodes/capabilities.js`
- Modify: `test/capabilities.test.js`
- Create: `clients/onexray/UPSTREAM_COMPATIBILITY.md`

**Interfaces:**
- Consumes: normalized Sub-Store node records and `nodeMetadata(node)`.
- Produces: `CLIENT.onexray === "onexray"`, registry support for `vless|vmess|ss|trojan|socks5|http|hysteria2`, and `oneXrayNodeExclusionReason(node): string | null` used by `filterNodesForClient(nodes, CLIENT.onexray)`.

- [ ] **Step 1: Write failing OneXray capability tests**

Add this exact client matrix entry:

```js
onexray: ["vless", "vmess", "ss", "trojan", "socks5", "http", "hysteria2"],
```

Pin accepted basic, TLS, REALITY, raw, WebSocket, gRPC, HTTPUpgrade, XHTTP, KCP, and audited Hysteria2 fixtures. Pin rejection of Snell, SSR, AnyTLS, TUIC, SSH, WireGuard, chained nodes, unsupported plugins, conflicting aliases, malformed ports/credentials, incomplete REALITY, and every supplied field the structured renderer cannot preserve. Assert stable reasons including `unsupported-onexray-protocol`, `unsupported-onexray-transport`, `unsupported-onexray-chain`, and `incomplete-onexray-reality`.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test test/capabilities.test.js
```

Expected: OneXray is absent from the client contract, registry, and capability dispatch.

- [ ] **Step 3: Add client and protocol declarations**

Add `onexray: "onexray"` to `CLIENT`. Add only the seven approved protocols to OneXray's registry lists; do not widen global `OPTION_VALUES.platform`.

- [ ] **Step 4: Implement strict field-level checks**

Export:

```js
export function oneXrayNodeExclusionReason(node) {
  const protocol = normalizeProtocol(node?.type);
  if (!protocolSupportsClient(protocol, CLIENT.onexray)) return "unsupported-onexray-protocol";
  if (nodeMetadata(node).chained) return "unsupported-onexray-chain";
  return validateOneXrayProtocolShape(node, protocol);
}
```

`validateOneXrayProtocolShape` must return `null` only when Task 3 can serialize every meaningful normalized field. Reuse existing alias/TLS/REALITY/transport helpers; keep diagnostic strings credential-free.

- [ ] **Step 5: Record the audited upstream contract**

Write `UPSTREAM_COMPATIBILITY.md` with the commit, version, audited OneXray source files, supported outbound shapes, runtime-reserved tags, TUN/DNS rewrites, same-name Profile insertion, Final Outbound behavior, HTTPS subscription scope, log caveats, and a mandatory re-audit checklist.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run Step 2. Expected: all capability tests pass without changing existing-client acceptance.

- [ ] **Step 7: Commit Task 1**

```bash
git add shared/contracts.js shared/nodes/protocol-registry.js shared/nodes/capabilities.js test/capabilities.test.js clients/onexray/UPSTREAM_COMPATIBILITY.md
git commit -m "feat: add OneXray capability boundary"
```

---

### Task 2: Centralize business targets and parse OneXray options

**Files:**
- Create: `shared/policies/business-targets.js`
- Create: `test/business-targets.test.js`
- Create: `clients/onexray/package.json`
- Create: `clients/onexray/src/options.js`
- Create: `clients/onexray/test/options.test.js`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `BUSINESS_TARGETS`, `parseBusinessOverrides(encoded)`, `businessTargetByKey(key)`, and `parseOneXrayOptions(raw)`.
- OneXray options are exactly:

```js
{
  output: "nodes" | "profile" | "audit",
  type: "collection",
  name: string,
  channel: "edge" | "current" | "previous",
  dnsMode: "stable" | "privacy" | "speed",
  chinaDns: "alidns" | "dnspod" | "system",
  globalDns: "cloudflare" | "google" | "quad9",
  blockMode: "balanced" | "security" | "strict" | "off",
  quicMode: "allow" | "proxy-block" | "all-block",
  ipv6Mode: "auto" | "ipv4-only",
  clientChain: "off" | "on",
  clientChainTarget: "" | "NODE:<exact normalized name>",
  policyOverrides: string,
}
```

- [ ] **Step 1: Write failing shared-catalog and option tests**

Pin these IDs, primary labels, and defaults in order: `ai/🤖 AI 专用/FOLLOW`, `github/🐙 GitHub/FOLLOW`, `youtube/📺 YouTube/FOLLOW`, `globalMedia/🎬 海外流媒体/FOLLOW`, `globalSocial/💬 海外社交/FOLLOW`, `apple/🍎 Apple/DIRECT`, `microsoft/🪟 Microsoft/DIRECT`, `domestic/🇨🇳 国内平台/DIRECT`, `overseasGame/🌍 海外游戏/FOLLOW`, `download/⬇️ 下载/P2P/DIRECT`, `dnsAndRules/🧭 DNS 与规则下载/FOLLOW`, and `final/最终兜底/FOLLOW`.

Accept each approved no-icon Chinese alias and English ID. Reject unknown keys, conflicting aliases, ordinary Base64 `+` or `/`, padding, invalid UTF-8/JSON, non-string values, blank `NODE:`, and targets outside case-insensitive `FOLLOW|DIRECT|NODE:`. Preserve node-name Unicode and case exactly.

Require explicit non-empty single-line `output`, `type`, and collection `name`; require `type=collection`. Pin optional defaults: `channel=edge`, `dnsMode=stable`, `chinaDns=alidns`, `globalDns=cloudflare`, `blockMode=balanced`, `quicMode=proxy-block`, `ipv6Mode=auto`, `clientChain=off`, blank target/overrides. Reject `clientChain=on` without `NODE:` target and reject a target when chain is off.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test test/business-targets.test.js
npm --workspace @apple-proxy-profiles/onexray test
```

Expected: the modules and workspace do not exist.

- [ ] **Step 3: Implement the immutable shared catalog**

Use frozen records shaped as:

```js
Object.freeze({
  id: "ai",
  label: "🤖 AI 专用",
  aliases: Object.freeze(["AI 专用", "ai"]),
  defaultTarget: "FOLLOW",
})
```

Decode Base64URL only after lexical validation, parse JSON as a plain object, canonicalize only target keywords, merge identical aliases, and throw stable errors that include the business label but never the encoded input.

- [ ] **Step 4: Scaffold the workspace and strict option parser**

Add `test`, `build`, `fixtures`, and `verify` scripts consistent with existing workspaces. Reuse shared enum values, reject unknown values, trim non-secret display names, and return a deeply frozen options object. Do not add a platform or `adblockMode` option.

- [ ] **Step 5: Run tests and verify GREEN**

Run Step 2. Expected: both suites pass.

- [ ] **Step 6: Commit Task 2**

```bash
git add shared/policies/business-targets.js test/business-targets.test.js clients/onexray/package.json clients/onexray/src/options.js clients/onexray/test/options.test.js package-lock.json
git commit -m "feat: add shared business target contract"
```

---

### Task 3: Render audited OneXray structured outbounds

**Files:**
- Create: `clients/onexray/src/render-outbound.js`
- Create: `clients/onexray/test/outbound.test.js`

**Interfaces:**
- Consumes: one OneXray-eligible normalized node and an internal tag.
- Produces: `renderOneXrayOutbound(node, { tag }): OneXrayOutbound` with flattened `{ name, protocol, settings, tag, streamSettings, mux }`.

- [ ] **Step 1: Write failing protocol/transport tests**

For every accepted Task 1 fixture, assert exact OneXray property names and no unknown keys. Cover VLESS `{address,port,id,flow,encryption,reverse}`, VMess `{address,port,id,security}`, Shadowsocks `{address,port,method,password}`, Trojan `{address,port,password}`, SOCKS `{address,port,user,pass}`, HTTP `{address,port,user,pass,headers}`, and Hysteria `{version,address,port}` plus `network:"hysteria"`/`hysteriaSettings`.

Pin TLS/REALITY and raw/ws/grpc/httpupgrade/xhttp/kcp/hysteria transports. Assert `allowInsecure` defaults false, source nodes are not mutated, raw names appear only in `name`, and reserved/duplicate tags are rejected.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test clients/onexray/test/outbound.test.js
```

Expected: renderer module is absent.

- [ ] **Step 3: Implement protocol settings as exhaustive switches**

Use a switch that throws on every unhandled protocol even though capabilities ran first:

```js
switch (normalizeProtocol(node.type)) {
  case "vless": return renderVlessSettings(node);
  case "vmess": return renderVmessSettings(node);
  case "ss": return renderShadowsocksSettings(node);
  case "trojan": return renderTrojanSettings(node);
  case "socks5": return renderSocksSettings(node);
  case "http": return renderHttpSettings(node);
  case "hysteria2": return renderHysteriaSettings(node);
  default: throw new Error("unsupported-onexray-protocol");
}
```

Build `streamSettings` from audited normalized aliases, omit absent optional keys deterministically, and call the Task 1 exclusion function as a precondition.

- [ ] **Step 4: Run test and verify GREEN**

Run Step 2. Expected: exact fixtures pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add clients/onexray/src/render-outbound.js clients/onexray/test/outbound.test.js
git commit -m "feat: render OneXray structured outbounds"
```

---

### Task 4: Resolve fixed businesses and optional global chain transactionally

**Files:**
- Create: `clients/onexray/src/resolve-policy.js`
- Create: `clients/onexray/test/resolve-policy.test.js`

**Interfaces:**
- Consumes: parsed options, all normalized nodes, and OneXray-compatible nodes.
- Produces: `resolveOneXrayPolicy({ options, allNodes, eligibleNodes }): OneXrayPolicyResolution` or throws before output.

- [ ] **Step 1: Write failing resolution tests**

Assert exact case-sensitive matching after normalization; shared fixed outbound reuse; stable collision-proof `ap-fixed-<id>` tags; and preservation of configured/resolved display values. Missing, duplicate, incompatible, renamed, reserved-tag, and malformed fixed targets must throw with the Chinese label and normalized target name but no node object or secret.

For chain-on, assert homepage candidates are only `entry === true`, landing is exactly one compatible `landing === true` node, landing has no existing chain, landing is not in entry output, Final Outbound uses tag `chainProxy`, and fixed business outbounds do not inherit the chain. Assert empty entry set and every invalid landing case throw.

- [ ] **Step 2: Run test and verify RED**

```bash
node --test clients/onexray/test/resolve-policy.test.js
```

Expected: resolver module is absent.

- [ ] **Step 3: Implement strict single-pass resolution**

Return a frozen credential-separated shape:

```js
{
  homepageNodes,
  fixedNodes: [{ node, tag: "ap-fixed-4c1a2e9d" }],
  finalOutbound: null,
  targets: {
    ai: { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" },
  },
  chain: { enabled: false, landingTag: null, entryCount: homepageNodes.length },
}
```

When chain is on, `finalOutbound` contains the unique landing node rendered later with tag `chainProxy`; target `FOLLOW` still resolves to runtime `proxy`. Complete all validation before returning so callers cannot emit partial data.

- [ ] **Step 4: Run test and verify GREEN**

Run Step 2. Expected: all fixed/chain failure modes are transactional.

- [ ] **Step 5: Commit Task 4**

```bash
git add clients/onexray/src/resolve-policy.js clients/onexray/test/resolve-policy.test.js
git commit -m "feat: resolve OneXray business routing"
```

---

### Task 5: Generate the private homepage-node subscription

**Files:**
- Create: `clients/onexray/src/render-subscription.js`
- Create: `clients/onexray/src/substore-nodes-entry.js`
- Create: `clients/onexray/test/subscription.test.js`
- Create: `clients/onexray/test/substore-nodes-entry.test.js`

**Interfaces:**
- Produces: `renderOneXraySubscription(resolution): string` and `runOneXrayNodesProcessor({ proxies, arguments }): string`.
- Output is one Xray JSON document whose top-level `outbounds` contains only homepage-selectable structured outbounds tagged with unique normalized names.

- [ ] **Step 1: Write failing subscription and entry tests**

Assert deterministic order, exact normalized display tags, duplicate-name rejection, partial incompatible-node filtering with diagnostic counts, total-empty failure, no Profile/DNS/routing keys, and no fixed-only landing credentials when chain is enabled. Assert Sub-Store accepts only `output=nodes`, normalizes before filtering, and never logs or returns raw input on error.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test clients/onexray/test/subscription.test.js clients/onexray/test/substore-nodes-entry.test.js
```

Expected: subscription modules are absent.

- [ ] **Step 3: Implement deterministic subscription rendering**

Render with the Task 3 converter, reject duplicate output tags, sort only through the repository's normalized input order, and terminate JSON with one newline. When `clientChain=on`, consume `resolution.homepageNodes` so only entry-eligible nodes are visible on the homepage.

- [ ] **Step 4: Implement the Sub-Store adapter**

Follow existing adapters for `$arguments`/`$substore` injection, but keep the pure processor export testable. Catch errors only to add a fixed `OneXray nodes:` prefix; do not include serialized nodes or arguments.

- [ ] **Step 5: Run tests and verify GREEN**

Run Step 2. Expected: both suites pass.

- [ ] **Step 6: Commit Task 5**

```bash
git add clients/onexray/src/render-subscription.js clients/onexray/src/substore-nodes-entry.js clients/onexray/test/subscription.test.js clients/onexray/test/substore-nodes-entry.test.js
git commit -m "feat: generate OneXray node subscription"
```

---

### Task 6: Centralize DNS providers and render OneXray DNS

**Files:**
- Create: `shared/dns/providers.js`
- Create: `test/dns-providers.test.js`
- Modify: `clients/shadowrocket/src/dns.js`
- Modify: `clients/egern/src/render-dns.js`
- Modify: `clients/surge/src/render-profile.js`
- Modify: `clients/sing-box/src/render-dns.js`
- Create: `clients/onexray/src/render-dns.js`
- Create: `clients/onexray/test/dns.test.js`

**Interfaces:**
- Produces: `chinaDnsProvider(id)`, `globalDnsProvider(id)`, and `renderOneXrayDns({ options, routingPlan, geo }): { dns, rules }`.

- [ ] **Step 1: Write failing provider and OneXray DNS tests**

Pin provider metadata once: AliDNS `223.5.5.5`, DNSPod `119.29.29.29`, system/local, Cloudflare `1.1.1.1` + `cloudflare-dns.com`, Google `8.8.8.8` + `dns.google`, and Quad9 `9.9.9.9` + `dns.quad9.net`. Preserve existing client-rendered values byte-for-byte after refactor.

For OneXray, assert tagged China/global servers; China queries route `direct`; explicit overseas DNS categories route `proxy`; TUN UDP/TCP 53 routes `dnsOut`; resolver endpoints and internal DNS traffic cannot loop; `domainStrategy` remains `IPIfNonMatch`; and renderer does not fight OneXray's runtime `queryStrategy` rewrite.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test test/dns-providers.test.js clients/onexray/test/dns.test.js clients/shadowrocket/test/general.test.js clients/egern/test/dns.test.js clients/sing-box/test/config.test.js clients/surge/test/profile.test.js
```

Expected: shared provider and OneXray modules are absent.

- [ ] **Step 3: Add shared provider records and migrate existing renderers**

Use immutable neutral records such as:

```js
global: {
  cloudflare: { address: "1.1.1.1", serverName: "cloudflare-dns.com", doh: "https://cloudflare-dns.com/dns-query" },
}
```

Adapters select only the fields their format needs. Confirm regenerated existing fixtures do not change.

- [ ] **Step 4: Render OneXray DNS and routing prelude**

Return DNS object and the system rules separately so Task 8 can prepend them exactly once. Map `dnsMode` through shared policy intent, attach explicit overseas GeoData codes, and leave per-server/global query strategy compatible with the selected `ipv6Mode` and OneXray runtime ownership.

- [ ] **Step 5: Run tests and verify GREEN**

Run Step 2. Expected: all old and new DNS tests pass.

- [ ] **Step 6: Commit Task 6**

```bash
git add shared/dns/providers.js test/dns-providers.test.js clients/shadowrocket/src/dns.js clients/egern/src/render-dns.js clients/surge/src/render-profile.js clients/sing-box/src/render-dns.js clients/onexray/src/render-dns.js clients/onexray/test/dns.test.js
git commit -m "refactor: share DNS provider definitions"
```

---

### Task 7: Compile deterministic Xray GeoData for three channels

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `THIRD_PARTY_NOTICES.md`
- Create: `automation/proto/xray-geodata.proto`
- Create: `automation/src/render-xray-geodata.js`
- Create: `clients/onexray/src/geodata-contract.js`
- Create: `clients/onexray/test/geodata.test.js`

**Interfaces:**
- Produces: `oneXrayGeoNames(channel)`, `oneXrayGeoCode(sourceId)`, `renderXrayGeoData(snapshot, channel)`, `decodeXrayGeoData(buffer, type)`, and a manifest containing provenance/counts/hashes/schema.

- [ ] **Step 1: Write failing contract/compiler tests**

Pin the six exact names: `AppleProxySiteCurrent`, `AppleProxySitePrevious`, `AppleProxySiteEdge`, `AppleProxyIPCurrent`, `AppleProxyIPPrevious`, and `AppleProxyIPEdge`. Pin stable category codes as `APP-` plus uppercase alphanumeric/hyphen source IDs. Assert all shared default domain/IP sources compile, CIDR prefixes remain exact, output bytes are reproducible across input object ordering, duplicate codes fail, and decode-backed counts equal source counts.

Assert every required adjacent-channel label is present and that default output excludes full `Advertising`/`Advertising_Domain` data.

- [ ] **Step 2: Run test and verify RED**

```bash
node --test clients/onexray/test/geodata.test.js
```

Expected: compiler and protobuf dependency are absent.

- [ ] **Step 3: Pin protobuf and vendor the minimal schema**

Install exactly `protobufjs@7.6.5` as a root dev dependency:

```bash
npm install --save-dev --save-exact protobufjs@7.6.5
```

Vendor only compatible Xray `Domain`, `GeoSite`, `GeoSiteList`, `CIDR`, `GeoIP`, and `GeoIPList` messages, with upstream URL, license, and retrieval date in comments and `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 4: Implement deterministic compilation and validation**

Normalize and sort category codes and rule entries before protobuf encoding. Encode IPv4/IPv6 bytes without textual ambiguity. Decode each output immediately and reject schema, count, duplicate-code, invalid-prefix, missing-reference, or hash mismatch before returning buffers.

- [ ] **Step 5: Run test and verify GREEN**

Run Step 2. Expected: binary equality, counts, and channel contracts pass.

- [ ] **Step 6: Commit Task 7**

```bash
git add package.json package-lock.json THIRD_PARTY_NOTICES.md automation/proto/xray-geodata.proto automation/src/render-xray-geodata.js clients/onexray/src/geodata-contract.js clients/onexray/test/geodata.test.js
git commit -m "feat: compile OneXray GeoData"
```

---

### Task 8: Render ordered OneXray routing rules

**Files:**
- Create: `clients/onexray/src/render-routing.js`
- Create: `clients/onexray/test/routing.test.js`

**Interfaces:**
- Consumes: `orderedRoutingPlan()`, OneXray policy resolution, DNS prelude rules, `blockMode`, `quicMode`, and channel GeoData contract.
- Produces: `renderOneXrayRouting({ options, resolution, dnsRules }): { domainStrategy: "IPIfNonMatch", rules }`.

- [ ] **Step 1: Write failing ordering and target tests**

Assert the exact phase sequence:

```text
system DNS/ping → local → security → custom → domesticCore → domesticGame
→ explicitOverseas → overseasGame → ChinaTLD → resolved ChinaIP → final
```

Pin `tunIn` DNS hijack to `dnsOut`, `pingIn` to runtime `proxy`, private/local domain and IPv4/IPv6 to `direct`, business categories to their resolved tag, security categories to `block|direct`, ChinaIP late direct, and one explicit final rule. Assert every `ext:<Name>.dat:<APP-CODE>` matches Task 7's channel/type contract.

Cover all `blockMode` values and `quicMode=allow|proxy-block|all-block`. For proxy-block, assert UDP/443 is blocked only before proxy-bound overseas rules and does not preempt explicitly domestic UDP. Assert no rule uses a nonexistent fixed tag and no security rule accepts a policy override.

- [ ] **Step 2: Run test and verify RED**

```bash
node --test clients/onexray/test/routing.test.js
```

Expected: routing renderer is absent.

- [ ] **Step 3: Implement phase-to-Xray compilation**

Map shared source IDs through `oneXrayGeoCode`, coalesce adjacent rules only when inbound/network/port/outbound semantics are identical, and retain shared plan order. Use one target resolver:

```js
function outboundTagForIntent(intent, resolution) {
  if (intent === "direct") return "direct";
  if (intent === "block") return "block";
  return resolution.targets[intent].resolvedTag;
}
```

Reject unknown intents and empty domain/IP payloads. Do not emit balancers, observatory, or platform TUN settings.

- [ ] **Step 4: Run test and verify GREEN**

Run Step 2. Expected: order, target, QUIC, and security matrices pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add clients/onexray/src/render-routing.js clients/onexray/test/routing.test.js
git commit -m "feat: render OneXray routing rules"
```

---

### Task 9: Compose, hash, deep-link, and validate the native Profile

**Files:**
- Create: `clients/onexray/src/render-profile.js`
- Create: `clients/onexray/src/profile-link.js`
- Create: `clients/onexray/src/validate-profile.js`
- Create: `clients/onexray/test/profile.test.js`
- Create: `clients/onexray/test/profile-link.test.js`
- Create: `clients/onexray/test/validation.test.js`

**Interfaces:**
- Produces: `renderOneXrayProfile(input)`, `canonicalProfileJson(profile)`, `buildOneXrayProfileLink(profile, channel)`, `decodeOneXrayProfileLink(link)`, and `validateOneXrayProfile(profile, context)`.
- Reserved tags are exactly `proxy`, `chainProxy`, `direct`, `fragment`, `block`, `dnsOut`, `tunIn`, and `pingIn` plus audited OneXray DNS tags.

- [ ] **Step 1: Write failing Profile structure tests**

Pin a minimal native Profile containing `name`, `log`, `dns`, `routing`, `inbounds`, and `outbounds`; fixed outbounds; required system `freedom`, `blackhole`, and `dns` outbounds; and no Raw Config-only fields. Assert no fixed node means no custom credential-bearing outbound. Assert one shared fixed node is emitted once for multiple businesses.

For chain-off, assert no outbound tagged `chainProxy`. For chain-on, assert the landing outbound is stored exactly once with tag `chainProxy` and no `dialerProxy`; this is the audited marker OneXray converts at runtime into landing `proxy` plus homepage `chainProxy`. Assert fixed outbounds carry no `dialerProxy` and therefore bypass the global chain.

- [ ] **Step 2: Write failing canonical-link tests**

Assert recursive key-stable compact JSON with one canonical byte representation. The JSON's `name` is the invariant base `Apple Proxy · OneXray · <channel>`; compute the full SHA-256 and first eight lowercase hex characters over that complete canonical JSON, then let the app-link fragment override the imported display name:

```text
onexray://onexray.com/config/add?type=profile&data=<percent-encoded-standard-base64>#Apple%20Proxy%20%C2%B7%20OneXray%20%C2%B7%20<channel>%20%C2%B7%20<8-hex>
```

Round-trip bytes through an independent URL/standard-Base64 decoder. Assert content/credential/option changes alter the hash, object insertion order does not, malformed links reject, and lengths `32768` accepted / `32769` rejected.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/onexray/test/profile.test.js clients/onexray/test/profile-link.test.js clients/onexray/test/validation.test.js
```

Expected: Profile modules are absent.

- [ ] **Step 4: Implement the canonical Profile composer**

Compose only after Tasks 4, 6, and 8 succeed. Use Task 3 for fixed/final outbounds; append system outbounds once; leave OneXray-owned TUN and `pingIn` runtime details at audited defaults. Set the JSON `name` to the invariant channel base, hash the complete canonical JSON, and set only the deep-link fragment to `Apple Proxy · OneXray · <channel> · <8-hex>`. The audited importer overwrites the stored display name from that fragment, so the imported name is versioned without a recursive content hash.

- [ ] **Step 5: Implement closed-reference validation**

Validate before encoding:

```js
{
  uniqueTags: true,
  allOutboundRefsExist: true,
  allInboundRefsAllowed: true,
  allGeoRefsExist: true,
  reservedTagsValid: true,
  oneXrayModelKeysOnly: true,
  chainShapeValid: true,
  canonicalRoundTrip: true,
  encodedLengthAtMost: 32768,
}
```

Also traverse every string/key and reject subscription URLs, PEM material, private-key field names, unexpected credential values outside approved custom outbound paths, or diagnostics embedded in the Profile.

- [ ] **Step 6: Run tests and verify GREEN**

Run Step 3. Expected: structure, chain semantics, hash, link, budget, and validation tests pass.

- [ ] **Step 7: Commit Task 9**

```bash
git add clients/onexray/src/render-profile.js clients/onexray/src/profile-link.js clients/onexray/src/validate-profile.js clients/onexray/test/profile.test.js clients/onexray/test/profile-link.test.js clients/onexray/test/validation.test.js
git commit -m "feat: build native OneXray profiles"
```

---

### Task 10: Produce private Profile and credential-free audit tasks

**Files:**
- Create: `clients/onexray/src/render-audit.js`
- Create: `clients/onexray/src/substore-profile-entry.js`
- Create: `clients/onexray/test/audit.test.js`
- Create: `clients/onexray/test/substore-profile-entry.test.js`

**Interfaces:**
- Produces: `renderOneXrayAudit(context): string` and `runOneXrayProfileProcessor({ proxies, arguments }): string` supporting only `output=profile|audit`.

- [ ] **Step 1: Write failing audit tests**

Require deterministic Chinese JSON with accepted/excluded totals, per-protocol counts, stable exclusion-reason counts, each business configured/resolved target, fixed-node protocol/uniqueness/compatibility result, chain state and entry count, landing display name, DNS/IPv6/QUIC/block summary, full Profile hash, short version, rule release ID, domain/IP GeoData hashes, and deep-link size/budget state.

Prohibit keys or values matching password, UUID, PSK, private/public key material, raw node objects, subscription URL, encoded `policyOverrides`, full Profile JSON, or Profile deep link. Tests must seed recognizable canary secrets and assert none appear.

- [ ] **Step 2: Write failing shared-transaction tests**

Assert Profile and audit modes call the same normalization, filtering, option parsing, policy resolution, DNS/routing, Profile validation, and hash pipeline. Any fixed/chain/Profile failure rejects both outputs with the same stable code. Assert `output=nodes` is rejected by this entry.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test clients/onexray/test/audit.test.js clients/onexray/test/substore-profile-entry.test.js
```

Expected: audit and entry modules are absent.

- [ ] **Step 4: Implement a single private build context**

Create one internal `buildPrivateOneXrayContext()` called by both modes. Keep credential-bearing node/outbound fields in non-enumerated internal variables; explicitly construct the audit allowlist instead of redacting a Profile after serialization.

- [ ] **Step 5: Return exact output formats**

`output=profile` returns only the deep link plus one newline. `output=audit` returns pretty JSON plus one newline. Prefix thrown messages with a stable code and Chinese business context where applicable, never with serialized input.

- [ ] **Step 6: Run tests and verify GREEN**

Run Step 3. Expected: private task behavior and secret canaries pass.

- [ ] **Step 7: Commit Task 10**

```bash
git add clients/onexray/src/render-audit.js clients/onexray/src/substore-profile-entry.js clients/onexray/test/audit.test.js clients/onexray/test/substore-profile-entry.test.js
git commit -m "feat: add OneXray private profile tasks"
```

---

### Task 11: Build browser bundles and sanitized contract fixtures

**Files:**
- Create: `clients/onexray/scripts/build.mjs`
- Create: `clients/onexray/scripts/render-fixtures.mjs`
- Create: `clients/onexray/dist/onexray-nodes-generator.js`
- Create: `clients/onexray/dist/substore-nodes-generator.js`
- Create: `clients/onexray/dist/onexray-profile-generator.js`
- Create: `clients/onexray/dist/substore-profile-generator.js`
- Create: `clients/onexray/examples/onexray-nodes-contract.json`
- Create: `clients/onexray/examples/onexray-profile-contract.json`
- Create: `clients/onexray/examples/onexray-routing-audit.json`
- Create: `clients/onexray/test/bundles.test.js`
- Create: `clients/onexray/test/examples.test.js`

**Interfaces:**
- Two node aliases must be byte-identical; two Profile aliases must be byte-identical.
- Examples describe sanitized shapes only; they must not contain a usable node, deep link, subscription URL, private target name, or credential.

- [ ] **Step 1: Write failing bundle/example tests**

Execute each bundle in a mock Sub-Store runtime for success and stable failure cases. Assert alias hashes match, bundles contain no dynamic import/Node-only API, examples parse, Profile contract contains redacted schema fields rather than a usable Profile, and repository secret scanning accepts all fixtures.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test clients/onexray/test/bundles.test.js clients/onexray/test/examples.test.js
```

Expected: build scripts and outputs are absent.

- [ ] **Step 3: Implement deterministic esbuild and fixture scripts**

Bundle the two Sub-Store entries for browser/IIFE execution, write aliases from the same build result, strip source paths/banners that vary by machine, and render fixtures only from synthetic non-routable examples such as `198.51.100.0/24`.

- [ ] **Step 4: Build and verify GREEN**

```bash
npm --workspace @apple-proxy-profiles/onexray run build
npm --workspace @apple-proxy-profiles/onexray run fixtures
node --test clients/onexray/test/bundles.test.js clients/onexray/test/examples.test.js
```

Expected: generated files are stable on a second run and tests pass.

- [ ] **Step 5: Commit Task 11**

```bash
git add clients/onexray/scripts clients/onexray/dist clients/onexray/examples clients/onexray/test/bundles.test.js clients/onexray/test/examples.test.js
git commit -m "build: add OneXray generator bundles"
```

---

### Task 12: Build the public GeoData install layer without private inputs

**Files:**
- Create: `clients/onexray/src/build-import-page.js`
- Create: `clients/onexray/test/import-page.test.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/test/build-artifacts.test.js`
- Modify: `test/public.test.js`

**Interfaces:**
- Public channel paths contain domain/IP `.dat`, their credential-free manifest, and OneXray GeoData app links.
- Deep links use `onexray://onexray.com/dat/add?type=domain|ip&url=<encoded-https-url>#<channel-name>`.

- [ ] **Step 1: Write failing public-contract tests**

At renderer level, cover current/previous/edge and assert distinct names and URLs, HTTPS-only asset URLs, percent-encoded app links, hashes/counts/schema/upstream version on the page, and no form/input/script path capable of receiving subscription URLs, policy overrides, Profile links, nodes, or fixed targets. At staging level, assert this implementation writes edge only. Assert edge is visibly canary-only and current/previous become separate rollback dependencies only after deliberate promotion.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test clients/onexray/test/import-page.test.js automation/test/build-artifacts.test.js test/public.test.js
```

Expected: OneXray public artifacts are absent.

- [ ] **Step 3: Implement pure import-page rendering**

Build static HTML from already validated manifest data. Include six-platform installation order and explicit warnings that Profile/subscription remain private and that installing GeoData does not create a Profile. Do not add local storage, analytics, form controls, clipboard ingestion, or network requests beyond user-initiated asset/deep-link navigation.

- [ ] **Step 4: Stage OneXray artifacts in the root build**

Compile domain/IP data from the same pinned snapshot as other clients. The channel renderer must be able to write `onexray/geodata/geosite.dat`, `geoip.dat`, `manifest.json`, and `index.html` for any explicit channel, but the default build in this task writes only the edge projection and its root-manifest hashes/counts. Keep OneXray out of optional `adblock-full` membership.

- [ ] **Step 5: Run tests and verify GREEN**

Run Step 2. Expected: public contract and secret-boundary tests pass.

- [ ] **Step 6: Commit Task 12**

```bash
git add clients/onexray/src/build-import-page.js clients/onexray/test/import-page.test.js automation/src/build-artifacts.js automation/test/build-artifacts.test.js test/public.test.js
git commit -m "feat: publish OneXray GeoData installer"
```

---

### Task 13: Integrate OneXray into edge staging and frontier manifests

**Files:**
- Modify: `automation/src/build-site.js`
- Modify: `automation/src/refresh-current.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `shared/release/frontier-manifest.js`
- Modify: `automation/src/render-frontier-artifacts.js`
- Modify: `automation/test/refresh-current.test.js`
- Modify: `test/stage-rule-artifacts.test.js`
- Modify: `test/update-rules.test.js`
- Modify: `test/frontier-contract.test.js`
- Modify: `test/frontier-verification.test.js`
- Modify: `test/actions.test.js`
- Modify: `automation/test/build-site.test.js`
- Modify: `automation/test/frontier-artifacts.test.js`

**Interfaces:**
- Six frontier keys: `onexray-macos`, `onexray-iphone`, `onexray-ipad`, `onexray-android`, `onexray-windows`, `onexray-linux`.
- All six initially point to the same sanitized Profile contract/client artifact identity but retain independent canary states.

- [ ] **Step 1: Write failing staging/frontier tests**

Assert `edge/onexray/**` stages atomically, current/previous projections understand the directory, root manifests include OneXray hashes, and partial domain/IP/manifest/page combinations reject. Assert all six platform candidates exist, share the intended profile hash, and cannot be marked current merely because another platform passed.

Add a regression test that default `update:rules --channel edge` does not mutate tracked `public/current/onexray` or `public/previous/onexray`; explicit promotion must still require a validated candidate and preserve the prior current as previous.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test automation/test/build-site.test.js automation/test/frontier-artifacts.test.js automation/test/refresh-current.test.js test/stage-rule-artifacts.test.js test/update-rules.test.js test/frontier-contract.test.js test/frontier-verification.test.js test/actions.test.js
```

Expected: OneXray directory and platform keys are absent.

- [ ] **Step 3: Add client paths and atomic promotion checks**

Extend the client path tables in one direction only: edge build/stage is enabled; current/previous promotion code can validate OneXray when deliberately invoked, but no default workflow promotes it. Require both GeoData files, manifest, and install page to share release ID/schema/channel before directory replacement.

- [ ] **Step 4: Add six independent frontier candidates**

Use one helper that fans out the shared contract hash to six platform entries while keeping `status`, `verifiedAt`, and canary evidence per platform. Do not duplicate binary hashes inside each platform when the client artifact manifest already owns them.

- [ ] **Step 5: Run tests and verify GREEN**

Run Step 2. Expected: staging, rollback, frontier, and workflow tests pass.

- [ ] **Step 6: Commit Task 13**

```bash
git add automation/src/build-site.js automation/src/refresh-current.js scripts/update-rules.mjs shared/release/frontier-manifest.js automation/src/render-frontier-artifacts.js automation/test/build-site.test.js automation/test/frontier-artifacts.test.js automation/test/refresh-current.test.js test/stage-rule-artifacts.test.js test/update-rules.test.js test/frontier-contract.test.js test/frontier-verification.test.js test/actions.test.js
git commit -m "feat: stage OneXray edge candidates"
```

---

### Task 14: Add OneXray to cross-client routing parity

**Files:**
- Modify: `test/fixtures/lightweight-routing-cases.js`
- Modify: `test/cross-client-routing.test.js`
- Create: `clients/onexray/test/parity.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Adds `verify:onexray` and includes it in `verify:lightweight`.
- Cross-client classifier must interpret OneXray Profile rules without evaluating implementation internals.

- [ ] **Step 1: Write failing parity cases**

Add OneXray expected decisions for LAN/localhost, private IPv4/IPv6, security categories, custom rules, domestic core/game, AI, GitHub, YouTube, global media/social, overseas game, China TLD, resolved ChinaIP, DNS/rule downloads, QUIC variants, and the final catch-all. Exercise `DIRECT`, `FOLLOW`, and one fixed node.

Assert homepage main switching changes every `FOLLOW` result and final only; fixed, direct, and block results stay unchanged. With chain-on, assert only `FOLLOW` paths traverse entry→landing and fixed/direct/block paths do not.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test clients/onexray/test/parity.test.js test/cross-client-routing.test.js
```

Expected: OneXray is absent from the matrix.

- [ ] **Step 3: Implement an output-level OneXray classifier**

Parse the rendered sanitized Profile's ordered `routing.rules`, resolve ext codes through decoded test GeoData, and return the effective outbound tag. Do not call `renderOneXrayRouting` internals from assertions; the test must catch serialization/reference mistakes.

- [ ] **Step 4: Add verification scripts and verify GREEN**

```bash
npm run verify:onexray
node --test clients/onexray/test/parity.test.js test/cross-client-routing.test.js
```

Expected: OneXray and all existing clients pass the common fixture matrix.

- [ ] **Step 5: Commit Task 14**

```bash
git add test/fixtures/lightweight-routing-cases.js test/cross-client-routing.test.js clients/onexray/test/parity.test.js package.json package-lock.json
git commit -m "test: verify OneXray routing parity"
```

---

### Task 15: Document private setup, manual diagnosis, rollback, and six-platform canary

**Files:**
- Create: `clients/onexray/README.md`
- Create: `clients/onexray/docs/deployment.md`
- Create: `clients/onexray/docs/troubleshooting.md`
- Create: `clients/onexray/docs/canary.md`
- Create: `clients/onexray/test/docs.test.js`
- Modify: `README.md`
- Modify: `docs/substore-two-layer-setup.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/implementation-status.md`
- Modify: `test/substore-docs.test.js`

**Interfaces:**
- Documents exactly three new private tasks, increasing the current implemented total from 17 to 20.

- [ ] **Step 1: Write failing documentation contract tests**

Require task names `onexray-nodes`, `onexray-profile`, and `onexray-routing-audit`; all option enums/defaults; Base64URL-is-not-encryption warning; exact fixed-node failure semantics; no automatic fallback/notification/emergency Profile; node-refresh versus fixed-snapshot distinction; Rule mode; Profile version insertion; current/previous dependency; 32 KiB limit; and edge-only status.

Require per-platform TUN/IPv6 checklist sections for macOS, iPhone, iPad, Android, Windows, and Linux. Require macOS System Extension logging caveat and Ping/status/log-based diagnosis. Require the canary table to begin with no platform marked passed.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test clients/onexray/test/docs.test.js test/substore-docs.test.js
```

Expected: OneXray docs are absent and task count is still 17.

- [ ] **Step 3: Write deployment and private Sub-Store instructions**

Document two exact install orders. Pre-release canary installs edge domain/IP GeoData and an edge Profile. Production installation, only after promotion, installs current plus previous domain/IP GeoData before importing a current Profile. Both then create the private node task, choose the versioned Profile, set Rule mode, choose a main node, restart VPN, and run the corresponding checks. Include complete parameter examples with synthetic names only and explain that changing fixed-node credentials requires Profile regeneration/reimport.

- [ ] **Step 4: Write diagnosis, update, and rollback instructions**

Explain that a fixed-node runtime failure intentionally fails that business, how to inspect OneXray state/Ping/Xray logs, how macOS logging differs, how repaired nodes affect new connections, and how to switch to previous Profile plus matching previous GeoData. State that keeping a previous Profile does not automatically retain its assets.

- [ ] **Step 5: Write six-platform canary gates**

For each platform require import, connect, main-node switching, fixed-business isolation, DNS direct/proxy split, local/direct, overseas/FOLLOW, ChinaIP late direct, QUIC/block/IPv6 cases, node refresh/restart behavior, fixed failure, chain-off and optional chain-on, Profile rollback, and GeoData rollback evidence. No checkbox is pre-completed.

- [ ] **Step 6: Run tests and verify GREEN**

Run Step 2. Expected: documentation contracts pass and the repository clearly distinguishes implementation from canary readiness.

- [ ] **Step 7: Commit Task 15**

```bash
git add clients/onexray/README.md clients/onexray/docs clients/onexray/test/docs.test.js README.md docs/substore-two-layer-setup.md docs/maintenance.md docs/implementation-status.md test/substore-docs.test.js
git commit -m "docs: add OneXray deployment runbook"
```

---

### Task 16: Run full verification and stage edge artifacts only

**Files:**
- Regenerate: all tracked client bundles and sanitized examples affected by shared DNS/catalog changes
- Generate: `public/edge/onexray/**`
- Modify only if deterministic output requires it: root edge manifests and frontier candidate artifacts

**Interfaces:**
- Completion means automated implementation checks pass and an edge candidate exists. It does not mean six-platform production readiness or authorization to promote.

- [ ] **Step 1: Rebuild all affected generated files**

```bash
npm run build
npm run fixtures
npm run update:rules
```

Expected: deterministic bundles/examples and a complete OneXray edge artifact set are generated; current/previous OneXray paths are untouched.

- [ ] **Step 2: Run focused OneXray verification**

```bash
npm run verify:onexray
```

Expected: OneXray unit, bundle, fixture, Profile, GeoData, parity, and docs checks pass.

- [ ] **Step 3: Run full repository verification**

```bash
npm test
npm run verify
npm run check:secrets
npm run check:actions
```

Expected: every command exits 0. Record exact command output in the implementation handoff.

- [ ] **Step 4: Verify deterministic and publication boundaries**

Run build/fixtures/edge generation a second time and inspect:

```bash
git status --short
git diff --check
git diff -- public/current public/previous
```

Expected: the second generation creates no new diff, `git diff --check` is clean, and current/previous have no OneXray mutation. Run a targeted secret scan over `clients/onexray`, `public/edge/onexray`, and root manifests with seeded private-field fixtures covered only in tests.

- [ ] **Step 5: Review implementation against the approved design**

Confirm every design section is covered, all reserved tags and GeoData references are closed, fixed failures remain hard failures, no fallback/notification/emergency behavior was introduced, no public surface accepts private input, and no platform is marked passed without manual evidence.

- [ ] **Step 6: Commit generated edge candidate**

Stage only the reviewed OneXray/shared/generated files; inspect the staged diff and then commit:

```bash
git commit -m "feat: stage OneXray edge release"
```

- [ ] **Step 7: Stop before production promotion**

Hand off the edge URL, private task templates, exact hashes, automated verification evidence, and blank six-platform canary checklist. Do not run current promotion, overwrite previous, or mark frontier entries verified until the user completes the manual canaries.

---

## Plan Self-Review Checklist

- [ ] Every approved product decision is represented by a task, test, or global constraint.
- [ ] `FOLLOW`, `DIRECT`, fixed business, fixed failure, and optional global chain semantics are tested at output level.
- [ ] OneXray structured models and reserved tags match the pinned upstream audit.
- [ ] Profile name hashing is non-recursive, canonical, deterministic, and size-bounded.
- [ ] Public/private boundaries and secret canaries cover nodes, arguments, Profile data, audit, manifests, pages, logs, and errors.
- [ ] GeoData code/name/schema changes are versioned and adjacent channels remain compatible.
- [ ] Existing client behavior remains unchanged after shared business/DNS refactors.
- [ ] Edge generation cannot implicitly promote current or overwrite previous.
- [ ] No unfinished marker, omitted implementation block, or vague error-handling instruction remains.
- [ ] All file paths, exported interfaces, commands, expected RED/GREEN results, and commit boundaries are explicit.
