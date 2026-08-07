# Lightweight Hybrid Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized default routing rule stack with a deterministic lightweight hybrid model shared by sing-box/SFM, Surge, Shadowrocket, Egern, and Stash/Clash-compatible Anywhere output, while preserving direct access for domestic apps and introducing an isolated sing-box diagnostic profile.

**Architecture:** A shared semantic contract defines default sources, optional packs, policy targets, domestic seed domains, game partitioning, and hard resource budgets. The automation layer compiles that contract into native artifacts for each client; sing-box consumes compiled `.srs` only, while human-readable JSON remains audit-only. Every renderer follows the same precedence: local/private and hard blocks, explicit services, domestic core and domestic games direct, explicit overseas and overseas games proxy, resolved CN IP direct, then proxy on non-CN or resolution failure.

**Tech Stack:** Node.js 22 ESM, `node:test`, existing client workspaces and renderers, official sing-box `1.14.0-beta.9` compiler/check command, GitHub Actions, generated static release artifacts.

**Approved design:** [`docs/superpowers/specs/2026-08-07-lightweight-hybrid-routing-design.md`](../specs/2026-08-07-lightweight-hybrid-routing-design.md)

## Global Constraints

- Do not add AI classification, traffic replay, cloud telemetry, packet-content inspection, or process-name rules as a core dependency.
- Default profiles must not reference `Advertising`, `Advertising_Domain`, or `ChinaMax_Domain`.
- Full advertising rules remain available only through a separately published optional pack. Config-generating clients expose `adblockMode: "off" | "full"` with `off` as the default; Anywhere exposes a separate manual import page.
- `DomesticCore` must contain no more than 2,000 normalized entries.
- All rules referenced by a default profile must total no more than 25,000 normalized entries and 5,000,000 downloaded bytes per client.
- sing-box production profiles must reference remote `.srs` only; remote `.json` is audit-only and must never appear in `route.rule_set`.
- The sing-box diagnostic profile must start without any remote rule set and must retain node, DNS, TUN, and platform settings needed to isolate the rule layer from TUN/RootHelper failures.
- Unknown domains resolve through the trusted domestic resolver. A CN result routes direct; a non-CN result or resolution failure routes through the default proxy policy.
- Domestic games route direct; overseas games route to the selectable `🌍 海外游戏` group.
- Default profile startup acceptance: VPN established within 30 seconds, survives 5 minutes idle, rule-layer RSS delta no more than 50 MB, total steady RSS target below 200 MB, and memory released after stop.
- Implement on `agent/singbox-rule-download-failover`; do not modify unrelated dirty files or publish `current` before the canary passes.

---

### Task 1: Encode the shared lightweight routing contract

**Files:**
- Create: `shared/rules/lightweight-policy.js`
- Create: `shared/rules/domestic-core.js`
- Modify: `shared/rules/catalog-data.js`
- Modify: `shared/rules/catalog.js`
- Modify: `shared/rules/client-catalog.js`
- Modify: `shared/rules/custom-rules.js`
- Modify: `shared/policies/catalog.js`
- Modify: `shared/rules/model.js`
- Create: `test/lightweight-policy.test.js`
- Modify: `test/rule-model.test.js`

- [ ] **Step 1: Write failing contract tests**

Add tests that import the public contract and assert exact invariants:

```js
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("Advertising"), false);
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("Advertising_Domain"), false);
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("ChinaMax_Domain"), false);
assert.deepEqual(FULL_ADBLOCK_SOURCE_IDS, ["Advertising", "Advertising_Domain"]);
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("DomesticCore"), true);
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("DomesticGame"), true);
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("OverseasGame"), true);
assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("ChinaIP"), true);
assert.equal(new Set(DOMESTIC_CORE_DOMAIN_SUFFIXES).size, DOMESTIC_CORE_DOMAIN_SUFFIXES.length);
assert.equal(DOMESTIC_CORE_DOMAIN_SUFFIXES.length <= RULE_BUDGETS.domesticCoreEntries, true);
assert.equal(POLICY_TARGETS.overseasGame, "🌍 海外游戏");
```

Test representative domestic coverage for Bilibili, Douyin/ByteDance, Xiaohongshu, Weibo, WeChat/QQ, iQIYI, Youku, Tencent Video, Mango TV, Baidu, Alibaba, NetEase, Amap, and common Chinese game platforms. Test that every suffix is lower-case, contains no wildcard, and is not a public suffix such as `com`, `net`, `cn`, or `com.cn`.

- [ ] **Step 2: Run the tests and verify the red state**

Run: `node --test test/lightweight-policy.test.js test/rule-model.test.js`

Expected: FAIL because the contract modules and `overseasGame` policy target do not exist.

- [ ] **Step 3: Implement the immutable contract**

Export these exact shapes from `shared/rules/lightweight-policy.js`:

```js
export const DEFAULT_RULE_SOURCE_IDS = Object.freeze([
  "Hijacking", "BlockHttpDNS", "Privacy",
  "DomesticCore", "DomesticGame",
  "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
  "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
  "Apple", "Microsoft", "SteamCN", "OverseasGame",
  "Download", "PrivateTracker", "ChinaIP"
]);

export const FULL_ADBLOCK_SOURCE_IDS = Object.freeze([
  "Advertising", "Advertising_Domain"
]);

export const RULE_BUDGETS = Object.freeze({
  domesticCoreEntries: 2_000,
  defaultEntries: 25_000,
  defaultBytes: 5_000_000,
  startupInlineEntries: 64,
  singBoxRuleRssBytes: 50 * 1024 * 1024,
  singBoxTotalRssBytes: 200 * 1024 * 1024
});

export const ROUTING_PRECEDENCE = Object.freeze([
  "local", "security", "custom", "domesticCore", "domesticGame",
  "explicitOverseas", "overseasGame", "chinaIp", "defaultProxy"
]);

export const POLICY_TARGETS = Object.freeze({
  direct: "DIRECT",
  defaultProxy: "🚀 节点选择",
  overseasGame: "🌍 海外游戏",
  reject: "REJECT"
});
```

Keep `shared/rules/domestic-fallback.js` as the backward-compatible import point, but make it re-export the new domestic core. Populate `DOMESTIC_CORE_DOMAIN_SUFFIXES` with an explicit curated seed set covering the tested ecosystems and `DOMESTIC_GAME_DOMAIN_SUFFIXES` with Chinese publisher/platform suffixes. Normalize and freeze both arrays at module load.

Separate upstream fetch definitions from generated client definitions:

```js
export const UPSTREAM_RULE_SOURCE_DEFINITIONS = Object.freeze(/* existing Blackmatrix inputs */);
export const DEFAULT_RULE_CLIENT_CATALOG = Object.freeze(/* DEFAULT_RULE_SOURCE_IDS + policy */);
export function ruleClientCatalog({ adblockMode = "off" } = {}) { /* append full pack only for full */ }
```

`shared/rules/catalog.js` must export `UPSTREAM_RULE_SOURCE_CATALOG` for automation and `RULE_SOURCE_CATALOG` as the compiled default-output catalog for compatibility. `shared/rules/client-catalog.js` must build from the default-output catalog, not the upstream input catalog. Reject every `adblockMode` value except `off` and `full`.

Keep user custom rules ahead of domestic, service, game, China-IP, and final rules. Validate custom rules with the existing secret and syntax checks; this feature must not broaden which custom values are accepted.

In `shared/policies/catalog.js`, replace the existing proxy-first generic game policy with `🌍 海外游戏`, using `🚀 节点选择` as the first fallback and `DIRECT` as the last manual escape hatch. Keep `SteamCN` direct-first.

- [ ] **Step 4: Add rule-model validation**

Reject synthetic identifiers outside the four allowed names (`DomesticCore`, `DomesticGame`, `OverseasGame`, `ChinaIP`), duplicate default source IDs, and default/optional pack overlap.

- [ ] **Step 5: Run focused and root tests**

Run: `node --test test/lightweight-policy.test.js test/rule-model.test.js test/domestic-fallback.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add shared/rules shared/policies/catalog.js test/lightweight-policy.test.js test/rule-model.test.js test/domestic-fallback.test.js
git commit -m "feat: define lightweight routing contract"
```

---

### Task 2: Compile upstream inputs into the lightweight default snapshot

**Files:**
- Create: `automation/src/compile-lightweight-rules.js`
- Modify: `automation/src/source-catalog.js`
- Modify: `automation/src/fetch-snapshot.js`
- Create: `automation/test/compile-lightweight-rules.test.js`
- Modify: `automation/test/source-catalog.test.js`
- Modify: `automation/test/fetch-snapshot.test.js`

- [ ] **Step 1: Write failing compiler tests**

Build an in-memory fixture containing `Game`, `ChinaMax`, `ChinaMax_Domain`, both advertising sets, service sets, and duplicate domain rules. Assert:

```js
const result = compileLightweightRules({ snapshots });
assert.equal(result.defaultRuleSets.has("ChinaMax_Domain"), false);
assert.equal(result.defaultRuleSets.has("Advertising"), false);
assert.equal(result.defaultRuleSets.has("Advertising_Domain"), false);
assert.equal(result.optionalPacks.adblockFull.has("Advertising"), true);
assert.equal(result.defaultRuleSets.has("ChinaIP"), true);
assert.equal(result.defaultRuleSets.has("OverseasGame"), true);
assert.equal(result.defaultRuleSets.has("DomesticGame"), true);
assert.deepEqual(result.diagnostics.overlap, []);
```

Use game fixture entries for a `.cn` host, a domain under a domestic game seed suffix, `steampowered.com`, and a game IP CIDR. Assert the first two become `DomesticGame`; the latter two become `OverseasGame`. The pinned baseline's `ChinaMax` file is mixed (domain/ASN/process metadata), so add the pinned pure-IP input `ChinaIPs` at `rule/Surge/ChinaIPs/ChinaIPs.list` and include one Chinese IPv4 and one Chinese IPv6 prefix from that input; both must survive under `ChinaIP`. If `ChinaMax` remains fetched for compatibility/audit, it must never feed the `ChinaIP` output. Assert domain entries covered by `DomesticCore` are removed from narrower direct lists only when the client renderer would otherwise emit identical rules.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test automation/test/compile-lightweight-rules.test.js automation/test/source-catalog.test.js automation/test/fetch-snapshot.test.js`

Expected: FAIL because no compiler exists and the source catalog still exposes all source sets as default output.

- [ ] **Step 3: Implement the compiler interface**

Implement:

```js
export function compileLightweightRules({ snapshots }) {
  return {
    defaultRuleSets: new Map(),
    optionalPacks: { adblockFull: new Map() },
    diagnostics: {
      defaultEntries: 0,
      defaultSourceBytes: 0,
      domesticCoreEntries: 0,
      overlap: []
    }
  };
}
```

Rules for compilation:

1. Inject local `DomesticCore` and `DomesticGame` suffix rules.
2. Partition upstream `Game`: `.cn` and suffixes covered by `DomesticGame` go direct; remaining domains and IP CIDRs become `OverseasGame`.
3. Compile the pinned pure-IP `ChinaIPs` input as `ChinaIP`; reject any domain or non-address entry found in `ChinaIPs`. The mixed `ChinaMax` input, if retained for compatibility/audit, is never used as `ChinaIP`.
4. Keep both advertising sources only in `optionalPacks.adblockFull`.
5. Drop `ChinaMax_Domain` from every default/optional output.
6. Normalize case, canonicalize CIDRs, remove exact duplicates, and sort deterministically.
7. Throw a diagnostic error if a domain/IP rule appears in both domestic and overseas game outputs.

- [ ] **Step 4: Separate fetch inputs from publication outputs**

Build `PUBLISH_SOURCE_CATALOG` from `UPSTREAM_RULE_SOURCE_CATALOG`. Keep upstream `Game`, pinned `ChinaIPs`, and advertising URLs in `automation/src/source-catalog.js` because compilation still needs them. `ChinaMax` may remain as an input-only compatibility/audit source but is not a ChinaIP compiler input. Add explicit metadata:

```js
{ id: "Game", inputOnly: true }
{ id: "ChinaIPs", inputOnly: true }
{ id: "ChinaMax", inputOnly: true, auditOnly: true }
{ id: "ChinaMax_Domain", inputOnly: true }
{ id: "Advertising", optionalPack: "adblock-full" }
{ id: "Advertising_Domain", optionalPack: "adblock-full" }
```

Ensure `fetch-snapshot.js` fetches all input sources but returns compilation metadata separately from published default IDs.

- [ ] **Step 5: Run automation tests**

Run: `node --test automation/test/*.test.js`

Expected: PASS, including deterministic output under shuffled input order.

- [ ] **Step 6: Commit the compiler**

```bash
git add automation/src automation/test
git commit -m "feat: compile lightweight rule snapshots"
```

---

### Task 3: Make the artifact pipeline binary-safe and publish optional packs separately

**Files:**
- Create: `automation/src/artifact-content.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `automation/test/build-artifacts.test.js`
- Modify: `automation/test/build-site.test.js`
- Create: `automation/test/rule-manifest.test.js`
- Create: `test/update-rules.test.js`

- [ ] **Step 1: Write failing binary and manifest tests**

Assert `Buffer.from([0xd9, 0x9d, 0x73, 0x72])` can travel through artifact hashing, byte counting, snapshot comparison, and site emission without UTF-8 conversion. Assert the default manifest contains no advertising or `ChinaMax_Domain` paths. Assert the ad pack is emitted only under:

```text
optional/adblock-full/manifest.json
optional/adblock-full/anywhere/
optional/adblock-full/egern/
optional/adblock-full/shadowrocket/
optional/adblock-full/sing-box/
optional/adblock-full/surge/
```

The optional manifest must include `packId`, `generatedAt`, `files`, `entries`, `bytes`, and SHA-256 for each file. It must not be merged into the default manifest's `files` array.

- [ ] **Step 2: Verify the red state**

Run: `node --test test/update-rules.test.js automation/test/*.test.js`

Expected: FAIL because the pipeline assumes text artifacts and publishes one undifferentiated set.

- [ ] **Step 3: Add content-safe helpers**

Implement these functions and use them in every hasher/writer/comparator:

```js
export function artifactBuffer(content) {
  return Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
}
export function artifactByteLength(content) {
  return artifactBuffer(content).byteLength;
}
export function artifactSha256(content) {
  return createHash("sha256").update(artifactBuffer(content)).digest("hex");
}
```

- [ ] **Step 4: Route compiled outputs into separate publications**

Change `buildClientArtifacts()` to consume `compileLightweightRules()` and return:

```js
{
  defaults: Map<string, string | Buffer>,
  optionalPacks: Map<string, Map<string, string | Buffer>>,
  diagnostics
}
```

Update `scripts/update-rules.mjs` to write default and optional trees atomically, calculate budgets from emitted content, and leave the previously published tree unchanged on any budget or compilation failure.

Expose three explicit publication operations and reject every other argument combination:

```text
node scripts/update-rules.mjs --channel edge
node scripts/update-rules.mjs --check --channel current
node scripts/update-rules.mjs --promote singbox <64-character-edge-client-manifest-hash>
```

Accept `singbox`, `surge`, `shadowrocket`, `egern`, or `anywhere` as the promotion client. `--channel edge` writes candidates without replacing `current`; `--promote` copies only the selected client's immutable tested version bytes to `current/<client>`, moves its prior bytes to `previous/<client>`, and updates a root rollout manifest mapping every client to its independently selected hash. Promotion never rebuilds and one failed client cannot move or roll back the other four.

- [ ] **Step 5: Enforce the three publication budgets**

Fail before writing `edge`, `current`, or metadata when `DomesticCore > 2,000`, default normalized entries `> 25,000`, or any client's referenced default downloads total `> 5,000,000` bytes. Include the actual count, limit, client, and largest five files in the error.

- [ ] **Step 6: Run the pipeline tests**

Run: `node --test automation/test/*.test.js test/update-rules.test.js`

Expected: PASS with binary bytes preserved and two isolated manifest trees.

- [ ] **Step 7: Commit the artifact changes**

```bash
git add automation/src automation/test scripts/update-rules.mjs test/update-rules.test.js
git commit -m "feat: publish budgeted default and optional rules"
```

---

### Task 4: Make sing-box binary-only and add a zero-remote-rule diagnostic profile

**Files:**
- Modify: `clients/sing-box/src/render-config.js`
- Modify: `clients/sing-box/src/options.js`
- Modify: `clients/sing-box/src/render-dns.js`
- Modify: `clients/sing-box/src/render-groups.js`
- Modify: `clients/sing-box/src/render-rules.js`
- Modify: `clients/sing-box/src/render-platform.js`
- Modify: `clients/sing-box/src/substore-config-entry.js`
- Modify: `clients/sing-box/src/validate-config.js`
- Modify: `clients/sing-box/scripts/compile-rules.mjs`
- Modify: `clients/sing-box/scripts/build.mjs`
- Modify: `clients/sing-box/scripts/render-fixtures.mjs`
- Modify: `clients/sing-box/package.json`
- Create: `clients/sing-box/examples/sing-box-macos-diagnostic.json`
- Create: `clients/sing-box/examples/sing-box-iphone-diagnostic.json`
- Create: `clients/sing-box/examples/sing-box-ipad-diagnostic.json`
- Create: `clients/sing-box/examples/sing-box-android-diagnostic.json`
- Create: `clients/sing-box/examples/sing-box-openwrt-diagnostic.json`
- Modify: `clients/sing-box/docs/canary.md`
- Modify: `clients/sing-box/test/config.test.js`
- Modify: `clients/sing-box/test/rule-compile.test.js`
- Modify: `clients/sing-box/test/substore-config-entry.test.js`
- Modify: `clients/sing-box/test/validation.test.js`
- Modify: `clients/sing-box/test/bundles.test.js`

- [ ] **Step 1: Write failing sing-box acceptance tests**

For the default rendered config, recursively inspect JSON and assert:

```js
assert.equal(serialized.includes('"format":"source"'), false);
assert.equal(serialized.includes(".json"), false);
assert.equal(config.route.rule_set.every((r) => r.format === "binary"), true);
assert.equal(config.route.rule_set.every((r) => r.url.endsWith(".srs")), true);
assert.equal(ruleSetTags.includes("rule-Advertising"), false);
assert.equal(ruleSetTags.includes("rule-ChinaMax_Domain"), false);
assert.equal(ruleSetTags.includes("rule-DomesticCore"), true);
assert.equal(ruleSetTags.includes("rule-ChinaIP"), true);
```

Render the same fixture with `adblockMode: "full"` and assert both advertising rule tags reference `optional/adblock-full/sing-box/*.srs`. The default fixture must contain neither tag nor optional-pack URL.

Assert rule order and behavior:

1. local/private/hijacking block rules;
2. validated user custom rules;
3. `DomesticCore`, `DomesticGame`, and `SteamCN` to `DIRECT`;
4. explicit overseas service rules;
5. `OverseasGame` to `🌍 海外游戏`;
6. an explicit `resolve` action using the domestic DNS server;
7. resolved `ChinaIP` to `DIRECT`;
8. route final to `🚀 节点选择`.

For `profileMode: "diagnostic"`, assert `route.rule_set` is empty, no DNS rule references a rule-set tag, node outbounds still exist, `route.final` remains selectable, and TUN/platform settings match the default profile.

- [ ] **Step 2: Verify the red state**

Run: `npm --workspace clients/sing-box test`

Expected: FAIL because source JSON is still the default and diagnostic mode is absent.

- [ ] **Step 3: Remove source format from production APIs**

Change the public renderer options from `ruleSetFormat` to:

```js
profileMode: "light" | "diagnostic" // default: "light"
adblockMode: "off" | "full"         // default: "off"
```

Generate audit JSON only in the build pipeline under `audit/sing-box/rules/<id>.json`; generated production files use `sing-box/rule-sets/<id>.srs`, while optional advertising binaries use `optional/adblock-full/sing-box/<id>.srs`. Reject a supplied legacy `ruleSetFormat: "source"` option with a migration error. Make `substore-config-entry.js` pass `profileMode: "light"` and never inject a source format.

- [ ] **Step 4: Implement deterministic unknown-domain fallback**

Use a trusted domestic direct DNS server for uncategorized names and proxied encrypted DNS for explicit overseas services. The route layer must resolve before the `ChinaIP` test. Do not add `ip_is_private` or fake-IP matching that can accidentally send public CN applications through the proxy.

When DNS resolution returns no usable address, the CN-IP rule does not match and the route falls through to `🚀 节点选择`; test this with the pure route-order model rather than live DNS.

- [ ] **Step 5: Compile every referenced sing-box rule set to `.srs`**

Extend `compile-rules.mjs` so it accepts an input artifact map, compiles each audit JSON through `SING_BOX_CORE rule-set compile`, reads the resulting bytes, validates the binary magic/size, and returns a `Map<string, Buffer>`. Run `SING_BOX_CORE check` against both generated profile modes.

The build must fail closed if `SING_BOX_CORE` is missing, if any expected `.srs` is missing, or if any `.srs` URL has no emitted file.

Add `compile:rules` and `check:config` package scripts that invoke the compiler and validator against generated fixtures, so local and CI commands use the same entry points.

Update `render-fixtures.mjs` to emit both normal and `-diagnostic.json` fixtures for every supported platform. Add the diagnostic files to the public static-file map and document a direct import link, so the canary does not require the user to edit JSON or Sub-Store parameters.

- [ ] **Step 6: Preserve the bootstrap route for rule downloads**

Keep rule-download traffic able to use actual node outbounds before remote rules load. The bootstrap path may include resolved release-host IPs and explicit node outbounds, but must not depend on a remote rule set. Add a test proving there is no dependency cycle from rule download to `rule-*` tags.

Count all inline route rules and fail validation above `RULE_BUDGETS.startupInlineEntries`. Verify an unavailable remote update cannot replace a valid cached rule set with an empty artifact; first-install absence must surface a named rule-set download error.

- [ ] **Step 7: Run sing-box tests and official validation**

Run:

```bash
npm --workspace clients/sing-box test
npm --workspace clients/sing-box run build
SING_BOX_CORE=/absolute/path/to/sing-box npm --workspace clients/sing-box run compile:rules
SING_BOX_CORE=/absolute/path/to/sing-box npm --workspace clients/sing-box run check:config
```

Expected: all tests pass, every production URL ends in `.srs`, both configs pass the official core, and the diagnostic config contains zero remote rule sets.

- [ ] **Step 8: Commit the sing-box adapter**

```bash
git add clients/sing-box
git commit -m "feat: make sing-box rules binary and diagnostic"
```

---

### Task 5: Apply the same semantics to Surge

**Files:**
- Modify: `clients/surge/src/render-rules.js`
- Modify: `clients/surge/src/render-groups.js`
- Modify: `clients/surge/src/options.js`
- Modify: `clients/surge/src/render-profile.js`
- Modify: `clients/surge/src/substore-profile-entry.js`
- Modify: `clients/surge/test/profile.test.js`
- Modify: `clients/surge/test/substore-profile-entry.test.js`
- Modify: `clients/surge/test/validation.test.js`

- [ ] **Step 1: Write failing Surge semantic tests**

Assert the default profile references neither advertising set nor `ChinaMax_Domain`, maps `DomesticCore`, `DomesticGame`, and `SteamCN` to `DIRECT`, maps `OverseasGame` to `🌍 海外游戏`, then applies `GEOIP,CN,DIRECT`, and ends with `FINAL,🚀 节点选择`. Assert the CN GeoIP rule is not marked `no-resolve`. Render `adblockMode: "full"` separately and assert it references only the two optional-pack Surge files.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace clients/surge test`

Expected: FAIL on old catalog references and generic game policy.

- [ ] **Step 3: Update renderer, DNS, and Sub-Store entry**

Consume the shared IDs and targets instead of maintaining a second source list. Preserve the current rule download fallback transport. Configure domestic DNS for unknown names and protected/proxy DNS for explicit overseas sets using Surge-native syntax.

- [ ] **Step 4: Run Surge verification**

Run: `npm --workspace clients/surge test && npm run verify:surge`

Expected: PASS and generated config order matches the approved precedence.

- [ ] **Step 5: Commit the Surge adapter**

```bash
git add clients/surge
git commit -m "feat: apply lightweight routing to surge"
```

---

### Task 6: Apply the same semantics to Shadowrocket

**Files:**
- Modify: `clients/shadowrocket/src/render-rules.js`
- Modify: `clients/shadowrocket/src/render-groups.js`
- Modify: `clients/shadowrocket/src/options.js`
- Modify: `clients/shadowrocket/src/dns.js`
- Modify: `clients/shadowrocket/src/render-profile.js`
- Modify: `clients/shadowrocket/src/substore-profile-entry.js`
- Modify: `clients/shadowrocket/test/profile.test.js`
- Modify: `clients/shadowrocket/test/rules.test.js`
- Modify: `clients/shadowrocket/test/substore-profile-entry.test.js`
- Modify: `clients/shadowrocket/test/security.test.js`

- [ ] **Step 1: Write failing Shadowrocket semantic tests**

Assert no advertising or `ChinaMax_Domain` references by default, domestic sets before CN IP fallback, overseas games to `🌍 海外游戏`, `GEOIP,CN,DIRECT` allowed to resolve, and `FINAL,🚀 节点选择` last. Assert `adblockMode: "full"` adds only the two Shadowrocket files under the optional pack URL root.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace clients/shadowrocket test`

Expected: FAIL on legacy catalog/rule order.

- [ ] **Step 3: Update the native renderer and Sub-Store entry**

Reuse the shared contract but retain Shadowrocket-native rule-provider and DNS syntax. Do not translate sing-box action objects into the profile.

- [ ] **Step 4: Run Shadowrocket verification**

Run: `npm --workspace clients/shadowrocket test && npm run verify:shadowrocket`

Expected: PASS.

- [ ] **Step 5: Commit the Shadowrocket adapter**

```bash
git add clients/shadowrocket
git commit -m "feat: apply lightweight routing to shadowrocket"
```

---

### Task 7: Apply the same semantics to Egern

**Files:**
- Modify: `clients/egern/src/render-rules.js`
- Modify: `clients/egern/src/render-groups.js`
- Modify: `clients/egern/src/render-dns.js`
- Modify: `clients/egern/src/options.js`
- Modify: `clients/egern/src/render-profile.js`
- Modify: `clients/egern/src/substore-profile-entry.js`
- Modify: `clients/egern/test/profile.test.js`
- Modify: `clients/egern/test/substore.test.js`
- Modify: `clients/egern/test/dns.test.js`
- Modify: `clients/egern/test/validation.test.js`

- [ ] **Step 1: Write failing Egern semantic tests**

Assert the YAML contains the same semantic sets and order as Surge/Shadowrocket. Specifically assert the CN GeoIP matcher is permitted to resolve and the default fallback is the proxy selector. Assert no full ad or China domain source is downloaded by default; `adblockMode: "full"` must add only the two Egern optional-pack providers.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace clients/egern test`

Expected: FAIL on old source and game mappings.

- [ ] **Step 3: Update Egern-native output**

Use the shared contract and preserve valid Egern YAML keys. Add the `🌍 海外游戏` selector with the shared fallback order. Keep optional full adblock outside the default profile.

- [ ] **Step 4: Run Egern verification**

Run: `npm --workspace clients/egern test && npm run verify:egern`

Expected: PASS.

- [ ] **Step 5: Commit the Egern adapter**

```bash
git add clients/egern
git commit -m "feat: apply lightweight routing to egern"
```

---

### Task 8: Migrate Anywhere/Stash-compatible shards without leaving giant rules active

**Files:**
- Modify: `clients/anywhere/src/build-import-page.js`
- Modify: `clients/anywhere/src/render-arrs.js`
- Modify: `clients/anywhere/src/shard-rules.js`
- Modify: `clients/anywhere/scripts/render-rules.mjs`
- Modify: `clients/anywhere/compatibility/rule-baseline.json`
- Modify: `clients/anywhere/test/arrs.test.js`
- Modify: `clients/anywhere/test/import-page.test.js`
- Modify: `clients/anywhere/test/rule-artifacts.test.js`
- Modify: `clients/anywhere/test/sharding.test.js`
- Modify: `automation/src/render-anywhere-rules.js`
- Modify: `automation/test/render-anywhere-rules.test.js`

- [ ] **Step 1: Write failing shard and migration tests**

Assert default `.arrs` shards exist for `DomesticCore`, `DomesticGame`, `OverseasGame`, and `ChinaIP`; assert no default shard exists for advertising or `ChinaMax_Domain`. Assert routing headers are `DIRECT` for domestic sets, the Anywhere default/proxy routing value for `OverseasGame`, and `DIRECT` for `ChinaIP`.

Assert the import page contains an explicit migration notice naming old `Advertising`, `Advertising_Domain`, `ChinaMax_Domain`, and generic `Game` shards and tells existing users to delete or disable them before importing the new set.

Assert a separate `optional/adblock-full/anywhere/import.html` imports only advertising shards, labels the resulting routing target as `REJECT`, and warns that enabling it can materially increase memory use.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --workspace clients/anywhere test && node --test automation/test/render-anywhere-rules.test.js`

Expected: FAIL because old shard topology is still assumed.

- [ ] **Step 3: Introduce manifest schema version 2**

Publish this exact migration mapping in the Anywhere manifest:

```json
{
  "schemaVersion": 2,
  "removed": ["Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"],
  "replacements": {
    "ChinaMax_Domain": ["DomesticCore"],
    "Game": ["DomesticGame", "OverseasGame"]
  },
  "optionalPacks": { "adblock-full": "../../optional/adblock-full/manifest.json" }
}
```

Update topology validation to accept this one explicit migration while still rejecting accidental shard deletion or rename.

- [ ] **Step 4: Render native default shards**

Render only the lightweight default set into the normal import tree. Route overseas games through the profile's default proxy policy when the `.arrs` format cannot name a selector; document the native UI step for binding `OverseasGame` to a dedicated group when supported.

- [ ] **Step 5: Run Anywhere verification**

Run: `npm --workspace clients/anywhere test && npm run verify:anywhere`

Expected: PASS with schema version 2 and the migration warning visible in generated HTML.

- [ ] **Step 6: Commit the Anywhere migration**

```bash
git add clients/anywhere automation/src/render-anywhere-rules.js automation/test/render-anywhere-rules.test.js
git commit -m "feat: migrate anywhere to lightweight shards"
```

---

### Task 9: Add cross-client semantic and resource-budget gates

**Files:**
- Create: `test/fixtures/lightweight-routing-cases.js`
- Create: `test/cross-client-routing.test.js`
- Create: `test/rule-budgets.test.js`
- Modify: `test/public.test.js`
- Modify: `test/foundation.test.js`
- Modify: `package.json`

- [ ] **Step 1: Create shared behavior cases**

Define cases with stable expected semantic targets, including:

```js
[
  { domain: "www.bilibili.com", expected: "DIRECT" },
  { domain: "www.douyin.com", expected: "DIRECT" },
  { domain: "www.xiaohongshu.com", expected: "DIRECT" },
  { domain: "www.weibo.com", expected: "DIRECT" },
  { domain: "www.iqiyi.com", expected: "DIRECT" },
  { domain: "www.qq.com", expected: "DIRECT" },
  { domain: "store.steampowered.com", expected: "🌍 海外游戏" },
  { domain: "chat.openai.com", expected: "OpenAI policy" },
  { domain: "custom.example", customPolicy: "DIRECT", expected: "DIRECT" },
  { domain: "unknown.example", resolvedCountry: "CN", expected: "DIRECT" },
  { domain: "unknown.example", resolvedCountry: "US", expected: "🚀 节点选择" },
  { domain: "unknown.example", resolution: "failed", expected: "🚀 节点选择" }
]
```

- [ ] **Step 2: Write client artifact inspectors**

Parse each generated format and map native syntax back to semantic targets. Assert every client implements every case, while allowing its native syntax to differ. For Anywhere, assert the static shard/default-policy equivalent rather than pretending it supports sing-box actions.

- [ ] **Step 3: Add hard budget tests**

Read emitted default manifests and files, then assert all global limits. Also assert:

- no default file content or URL includes `Advertising`, `Advertising_Domain`, or `ChinaMax_Domain`;
- no sing-box production config contains `format: source` or remote `.json`;
- every sing-box `.srs` in the manifest exists and has a non-zero SHA-256;
- inline sing-box startup rules do not exceed 64 entries;
- optional ad files are unreachable from every default profile.

- [ ] **Step 4: Expose one verification command**

Add `verify:lightweight` to root `package.json`, running shared tests, cross-client semantics, budgets, and each client validator. Include it in `npm run verify` before generated fixture comparison.

- [ ] **Step 5: Run the new gates**

Run: `npm run verify:lightweight`

Expected: PASS with counts and bytes printed for all five clients.

- [ ] **Step 6: Commit the gates**

```bash
git add test package.json
git commit -m "test: enforce cross-client lightweight routing"
```

---

### Task 10: Pin the official sing-box toolchain and update CI

**Files:**
- Create: `scripts/install-sing-box-core.mjs`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.github/workflows/update-rules.yml`
- Modify: `scripts/check-actions.mjs`
- Modify: `test/actions.test.js`
- Modify: `README.md`

- [ ] **Step 1: Write failing action/toolchain contract tests**

Assert CI installs sing-box `1.14.0-beta.9`, verifies the archive against the official release checksum file, exports the resulting absolute binary path as `SING_BOX_CORE`, compiles `.srs`, checks both sing-box profile modes, and runs `verify:lightweight` before publication.

- [ ] **Step 2: Verify the red state**

Run: `node --test test/actions.test.js && npm run check:actions`

Expected: FAIL because CI does not yet provision a compiler for binary artifacts.

- [ ] **Step 3: Implement deterministic official-core installation**

Support Linux x64, macOS arm64, and macOS x64 with the exact asset suffixes `linux-amd64`, `darwin-arm64`, and `darwin-amd64`. For Linux amd64 CI, download:

```text
https://github.com/SagerNet/sing-box/releases/download/v1.14.0-beta.9/sing-box-1.14.0-beta.9-linux-amd64.tar.gz
https://github.com/SagerNet/sing-box/releases/download/v1.14.0-beta.9/sing-box-1.14.0-beta.9-checksums.txt
```

Verify the archive hash against the signed release checksum list, extract into the runner temporary directory, print `sing-box version`, and write the absolute executable path to `GITHUB_ENV` as `SING_BOX_CORE`. Abort on download, checksum, version, compile, or config-check failure.

- [ ] **Step 4: Add CI and update workflow ordering**

Use this order: install dependencies, install/verify sing-box core, fetch snapshots, compile lightweight rules, build `.srs`, run all tests and budget gates, generate per-client `edge` candidates, then upload artifacts. The `current` promotion job accepts a client and its tested client-manifest hash, depends on the explicit canary approval environment, and reuses those exact bytes rather than rebuilding. The scheduled job updates `edge` only; it must never auto-promote `current`.

- [ ] **Step 5: Document local equivalents**

Document the two profile modes, optional ad pack, official-core requirement, budget limits, and why source JSON is audit-only.

- [ ] **Step 6: Run action and secret checks**

Run: `npm run check:actions && npm run check:secrets && node --test test/actions.test.js`

Expected: PASS.

- [ ] **Step 7: Commit CI changes**

```bash
git add scripts/install-sing-box-core.mjs .github scripts/check-actions.mjs test/actions.test.js README.md
git commit -m "ci: compile and validate sing-box binary rules"
```

---

### Task 11: Regenerate fixtures and perform full repository verification

**Files:**
- Modify: `clients/surge/examples/surge-macos.conf`
- Modify: `clients/surge/examples/surge-iphone.conf`
- Modify: `clients/surge/examples/surge-ipad.conf`
- Modify: `clients/shadowrocket/examples/shadowrocket-macos.conf`
- Modify: `clients/shadowrocket/examples/shadowrocket-iphone.conf`
- Modify: `clients/shadowrocket/examples/shadowrocket-ipad.conf`
- Modify: `clients/egern/examples/egern-macos.yaml`
- Modify: `clients/egern/examples/egern-iphone.yaml`
- Modify: `clients/egern/examples/egern-ipad.yaml`
- Modify: `clients/sing-box/examples/sing-box-macos.json`
- Modify: `clients/sing-box/examples/sing-box-iphone.json`
- Modify: `clients/sing-box/examples/sing-box-ipad.json`
- Modify: `clients/sing-box/examples/sing-box-android.json`
- Modify: `clients/sing-box/examples/sing-box-openwrt.json`
- Modify: `clients/anywhere/examples/import.html`
- Modify: `clients/anywhere/examples/rules/`
- Modify: `public/edge/`

- [ ] **Step 1: Generate all client fixtures with the pinned core**

Run:

```bash
npm ci
TASK_SING_BOX_CORE="$(node scripts/install-sing-box-core.mjs --print-path)"
SING_BOX_CORE="$TASK_SING_BOX_CORE" npm run fixtures
SING_BOX_CORE="$TASK_SING_BOX_CORE" npm run build
SING_BOX_CORE="$TASK_SING_BOX_CORE" npm run update:rules -- --channel edge
```

Use the absolute installed core path for `SING_BOX_CORE` in commands that compile/check sing-box.

- [ ] **Step 2: Inspect the generated diff before accepting it**

Run: `git diff --stat && git diff -- clients shared automation test scripts .github README.md`

Confirm that generated configs removed the three forbidden source IDs, sing-box URLs changed to `.srs`, the new domestic/overseas game split appears in all clients, and no unrelated node/credential data changed.

- [ ] **Step 3: Run the full clean verification suite**

Run:

```bash
npm test
npm run verify
npm run check:rules
npm run check:actions
npm run check:secrets
git diff --check
```

Expected: every command exits 0; generated artifacts are reproducible on a second `npm run fixtures && npm run build` with no new diff.

- [ ] **Step 4: Commit generated artifacts**

```bash
git add clients public/edge
git commit -m "build: regenerate lightweight client artifacts"
```

---

### Task 12: Run the SFM/iOS canary, diagnose failures, and promote or roll back

**Files:**
- Create on execution: `docs/canary/2026-08-07-lightweight-routing-results.md`
- Modify on successful canary only: `public/current/*`
- Modify on successful canary only: release metadata files selected by `scripts/update-rules.mjs`

- [ ] **Step 1: Capture the baseline before importing**

On the same Mac and iPhone used for the reported failure, record app/core version, OS version, profile mode, startup time, RSS before start, peak RSS during 30 seconds, RSS at 5 minutes, RSS 60 seconds after stop, and whether the VPN session remained connected. Use one run of the existing profile and do not run both profiles simultaneously.

- [ ] **Step 2: Test the diagnostic sing-box profile first**

Import the generated diagnostic profile, start it three times, and keep the third run active for 5 minutes. If it fails or grows beyond the total memory target with zero remote rules, classify the remaining cause as TUN/platform/RootHelper/core rather than rule volume. Collect the SFM log lines around route setup, `RootHelper`, network extension termination, and memory pressure.

- [ ] **Step 3: Test the lightweight default sing-box profile**

Repeat the same three-start/5-minute procedure. Pass only if startup is within 30 seconds, total steady RSS is below the 200 MB target, the default-minus-diagnostic RSS delta is no more than 50 MB, stop releases the session/core memory, and no rule download or `.srs` load fails.

- [ ] **Step 4: Test domestic direct behavior and unknown fallback**

For Bilibili, Douyin, Xiaohongshu, Weibo, iQIYI/Tencent Video, one domestic game, and one domestic comment feed, verify loading and confirm the selected policy is `DIRECT`. Test one uncategorized CN-hosted domain and confirm resolved CN IP routes direct. Test OpenAI/YouTube and an overseas game and confirm the intended proxy/game group. Test a deliberately non-resolving name and confirm it does not bypass the proxy fallback.

- [ ] **Step 5: Test the other four clients as a semantic canary**

Import one generated default profile into Surge, Shadowrocket, Egern, and Anywhere/Stash-compatible client. Verify the same representative direct/proxy cases. For existing Anywhere users, delete/disable the four schema-v1 shards before importing schema v2 and record that cleanup in the canary report.

- [ ] **Step 6: Write the evidence report**

Record actual measurements and pass/fail for each acceptance gate in `docs/canary/2026-08-07-lightweight-routing-results.md`. Include each client's exact edge manifest SHA-256 and installed client/core version so every promotion refers to tested bytes.

- [ ] **Step 7: Choose the bounded outcome**

If diagnostic fails, stop sing-box promotion and open a follow-up limited to SFM TUN/RootHelper/core diagnosis; keep the current sing-box production profile untouched. If diagnostic passes but lightweight fails, stop sing-box promotion and bisect rule subsets using the binary budget report. For each of the other clients, promote its exact edge client manifest only when that client's semantic canary passes; a failure does not block already approved clients or alter their selected versions.

- [ ] **Step 8: Verify promotion or rollback**

After each successful client promotion, download `current/<client>/manifest.json` afresh, verify its SHA-256 equals that client's tested edge manifest, and perform one final start/stop or import check. On any regression, restore only that client from `previous/<client>` and verify the rollback hash; confirm the other four hashes did not change.

- [ ] **Step 9: Commit the canary record and successful promotion metadata**

```bash
git add docs/canary public/current
git commit -m "release: promote verified lightweight routing"
```

Do not create this release commit when the canary fails; commit only the evidence report on the feature branch with `docs: record lightweight routing canary`.

---

## Final Review Checklist

- [ ] Every approved design requirement has at least one automated test or an explicit device-canary gate above.
- [ ] Default profiles contain no full-ad or giant China-domain dependency.
- [ ] The optional ad pack is independently addressable and cannot be loaded accidentally by a default profile.
- [ ] sing-box production consumes `.srs` only and diagnostic mode consumes no remote rules.
- [ ] All five clients share policy semantics but use native syntax.
- [ ] Existing Anywhere users receive an explicit removal/migration path for old giant shards.
- [ ] Budget failures are fail-closed before any publication mutation.
- [ ] The exact edge bytes—not a rebuild—are promoted after device acceptance.
- [ ] Rollback preserves the last known-good `current` manifest and files.
