# Domestic Routing Reliability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the existing five-client `balanced` routing mode with a late `ChinaTLD` direct rule, one shared routing plan, audited ChinaIP drift detection, local route explanation, and canary-safe publication without enabling `direct-first`.

**Architecture:** Extend the existing lightweight policy catalog with phase and DNS metadata, then make every client adapter render the same ordered plan. Keep the current pinned ChinaIP input as the only production source, compare it with a separately pinned gaoyifan snapshot, publish only a deterministic audit report, and preserve the existing edge/current immutable promotion model.

**Tech Stack:** Node.js 22+ ESM, Node built-in test runner, npm workspaces, existing deterministic rule compiler, GitHub Actions, official sing-box 1.14.0-beta.9 core, generated Shadowrocket/Surge INI, Egern YAML, Anywhere ARRS, and sing-box SRS artifacts.

## Global Constraints

- Implement only the approved `balanced` hardening; do not add or expose `routingMode=direct-first`.
- Keep unknown overseas IPs, DNS failures, and unclassifiable traffic on `🚀 节点选择`.
- `ChinaTLD` contains exactly `DOMAIN-SUFFIX,cn`, is independent from `DomesticCore`, and is ordered after all service rules and `OverseasGame` but before `ChinaIP`.
- Do not relax the `DomesticCore` public-suffix validator.
- Keep the existing ChinaIP input as the only client-visible production source; the gaoyifan source is audit-only and must never enter a client rule manifest.
- Keep Advertising and Advertising_Domain optional and disabled by default.
- Preserve the limits: DomesticCore at most 2,000 entries, default rules at most 25,000 entries, and each client’s referenced defaults at most 5,000,000 bytes.
- sing-box production rules must be official-core-compiled binary `.srs`; JSON remains audit input only.
- Do not modify or promote `public/current` before real-device canary approval.
- Do not add runtime telemetry, MITM, insecure TLS, automatic failed-request replay, private node data, or subscription URLs.
- Use tests first, deterministic output, isolated commits, and no new npm dependency.

---

## File Structure and Responsibilities

### Shared policy and compiler

- Modify `shared/rules/lightweight-policy.js`: authoritative phase/DNS metadata, `ChinaTLD`, and `orderedRoutingPlan()`.
- Modify `shared/rules/catalog.js`: preserve phase/DNS metadata and declare the synthetic ChinaTLD compiled path.
- Modify `shared/rules/client-catalog.js`: expose phase/DNS metadata to adapters.
- Modify `shared/rules/model.js`: admit `ChinaTLD` as an allowed synthetic source.
- Modify `automation/src/compile-lightweight-rules.js`: compile the one-entry ChinaTLD set.
- Create `shared/rules/observed-domestic.js`: evidence-bearing observed domestic records only.
- Modify `shared/rules/domestic-core.js`: merge base and observed suffixes into the existing published DomesticCore.

### Client adapters

- Modify `clients/shadowrocket/src/render-rules.js`.
- Modify `clients/surge/src/render-rules.js`.
- Modify `clients/egern/src/render-rules.js` and `clients/egern/src/render-dns.js`.
- Modify `clients/sing-box/src/render-rules.js` and `clients/sing-box/src/render-dns.js`.
- Modify `automation/src/source-catalog.js`, `automation/src/render-anywhere-rules.js`, and `clients/anywhere/src/build-import-page.js` for Anywhere phase/assignment visibility.

### ChinaIP audit and diagnostics

- Create `automation/src/china-ip-audit.js`: pure parsing, compaction, coverage comparison, thresholds, and report generation.
- Create `automation/src/fetch-china-ip-audit.js`: allowlisted resolution and immutable fetch of gaoyifan `china.txt` and `china6.txt`.
- Modify `scripts/stage-rule-artifacts.mjs`, `automation/src/build-artifacts.js`, `scripts/update-rules.mjs`, and `automation/src/build-site.js`: stage, publish, validate, and promote the immutable audit report.
- Create `automation/src/routing-plan-audit.js`: deterministic `audit/routing-plan.json`.
- Create `scripts/explain-route.mjs`: offline CLI over published rule artifacts.
- Modify `package.json`: expose `npm run explain:route`.

### Verification and documentation

- Extend shared, compiler, client, Anywhere, staging, publication, action, and cross-client tests named in the tasks below.
- Update all five canary guides, Anywhere deployment/troubleshooting, root maintenance documentation, and implementation status.
- Rebuild tracked bundles/examples and generate only edge candidates before canary.

---

### Task 1: Add the authoritative routing plan and synthetic ChinaTLD

**Files:**
- Modify: `shared/rules/lightweight-policy.js`
- Modify: `shared/rules/catalog.js`
- Modify: `shared/rules/client-catalog.js`
- Modify: `shared/rules/model.js`
- Modify: `automation/src/compile-lightweight-rules.js`
- Modify: `test/lightweight-policy.test.js`
- Modify: `test/rule-model.test.js`
- Modify: `automation/test/compile-lightweight-rules.test.js`
- Modify: `automation/test/source-catalog.test.js`

**Interfaces:**
- Consumes: existing `ruleClientCatalog({ adblockMode })`, `RULE_KIND`, and `compileLightweightRules({ snapshots })`.
- Produces: `ROUTING_PHASES: readonly string[]`, source records containing `phase` and `dnsClass`, and `orderedRoutingPlan({ adblockMode }): readonly RuleSource[]`.

- [ ] **Step 1: Write failing shared-plan tests**

Add exact assertions:

```js
const plan = orderedRoutingPlan();
const byId = new Map(plan.map((source) => [source.id, source]));
assert.deepEqual(ROUTING_PHASES, [
  "security",
  "earlyDomestic",
  "serviceIntent",
  "overseasGame",
  "lateDomestic",
  "resolvedChinaIp",
]);
assert.deepEqual(
  plan.filter(({ phase }) => phase === "lateDomestic").map(({ id }) => id),
  ["ChinaTLD"],
);
assert.deepEqual(byId.get("ChinaTLD"), {
  id: "ChinaTLD",
  policy: "DIRECT",
  inputFormat: "RULE-SET",
  phase: "lateDomestic",
  dnsClass: "china",
});
assert.ok(plan.findIndex(({ id }) => id === "OverseasGame")
  < plan.findIndex(({ id }) => id === "ChinaTLD"));
assert.ok(plan.findIndex(({ id }) => id === "ChinaTLD")
  < plan.findIndex(({ id }) => id === "ChinaIP"));
assert.equal(new Set(plan.map(({ id }) => id)).size, plan.length);
```

Also assert that adblock sources remain `phase: "security"`, every source has one legal phase/DNS class, and `validateLightweightRuleCatalog` accepts `ChinaTLD` but still rejects unknown synthetic IDs.

- [ ] **Step 2: Write failing compiler tests**

Add:

```js
const result = compileLightweightRules({ snapshots: fixtureSnapshots() });
assert.deepEqual(values(result.defaultRuleSets, "ChinaTLD"), [
  { kind: "domainSuffix", value: "cn", noResolve: false },
]);
assert.ok([...result.defaultRuleSets.keys()].indexOf("OverseasGame")
  < [...result.defaultRuleSets.keys()].indexOf("ChinaTLD"));
assert.ok([...result.defaultRuleSets.keys()].indexOf("ChinaTLD")
  < [...result.defaultRuleSets.keys()].indexOf("ChinaIP"));
```

Update source-catalog expectations from 31 to 32 client-visible default outputs without changing the 33 pinned Blackmatrix7 inputs.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test test/lightweight-policy.test.js test/rule-model.test.js automation/test/compile-lightweight-rules.test.js automation/test/source-catalog.test.js
```

Expected: failures for missing `ROUTING_PHASES`, `orderedRoutingPlan`, `ChinaTLD`, and the old publication count.

- [ ] **Step 4: Add complete phase and DNS metadata**

Use these authoritative phase memberships in `shared/rules/lightweight-policy.js`:

```js
export const ROUTING_PHASES = Object.freeze([
  "security",
  "earlyDomestic",
  "serviceIntent",
  "overseasGame",
  "lateDomestic",
  "resolvedChinaIp",
]);

const PHASE_SOURCE_IDS = Object.freeze({
  security: Object.freeze([
    "Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain",
  ]),
  earlyDomestic: Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]),
  serviceIntent: Object.freeze([
    "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
    "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
    "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
    "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
    "Apple", "Microsoft", "Download", "PrivateTracker",
  ]),
  overseasGame: Object.freeze(["OverseasGame"]),
  lateDomestic: Object.freeze(["ChinaTLD"]),
  resolvedChinaIp: Object.freeze(["ChinaIP"]),
});
```

Keep `EXPLICIT_OVERSEAS_RULE_SOURCE_IDS` as the exact proxy-DNS set. Assign `dnsClass: "proxy"` to those IDs, `dnsClass: "china"` to early domestic, late domestic, BiliBili, ByteDance, XiaoHongShu, Weibo, Apple, Microsoft, Download and PrivateTracker, and `dnsClass: "none"` to security and ChinaIP. Make `clientRecord(id)` fail if membership is missing or duplicated.

Implement:

```js
export function orderedRoutingPlan({ adblockMode = "off" } = {}) {
  const selected = ruleClientCatalog({ adblockMode });
  const rank = new Map(ROUTING_PHASES.map((phase, index) => [phase, index]));
  return Object.freeze([...selected].sort((left, right) => (
    rank.get(left.phase) - rank.get(right.phase)
    || DEFAULT_RULE_SOURCE_IDS.indexOf(left.id) - DEFAULT_RULE_SOURCE_IDS.indexOf(right.id)
  )));
}
```

- [ ] **Step 5: Compile the synthetic source**

Add `ChinaTLD` to `DEFAULT_RULE_SOURCE_IDS`, `SOURCE_POLICIES`, `ALLOWED_SYNTHETIC_SOURCE_IDS`, and `COMPILED_SOURCE_INPUTS`. Preserve metadata with `{ ...upstream, ...source }` or `{ ...mapping, ...source }` in `compiledRule`.

In `compileLightweightRules`, handle it explicitly:

```js
if (id === "ChinaTLD") {
  defaultRuleSets.set(id, compiledSet(
    id,
    normalizeEntries([{
      kind: RULE_KIND.domainSuffix,
      value: "cn",
      noResolve: false,
      sourceId: "ChinaTLD",
    }], "ChinaTLD"),
    [],
    0,
    omittedByKind,
  ));
  continue;
}
```

Do not add `cn` to `DOMESTIC_CORE_DOMAIN_SUFFIXES`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 3 command.

Expected: all tests pass; default publication outputs are 32; pinned fetch inputs remain 33.

- [ ] **Step 7: Commit Task 1**

```bash
git add shared/rules/lightweight-policy.js shared/rules/catalog.js shared/rules/client-catalog.js shared/rules/model.js automation/src/compile-lightweight-rules.js test/lightweight-policy.test.js test/rule-model.test.js automation/test/compile-lightweight-rules.test.js automation/test/source-catalog.test.js
git commit -m "feat: add shared late domestic routing phase"
```

---

### Task 2: Render the shared plan in Shadowrocket and Surge

**Files:**
- Modify: `clients/shadowrocket/src/render-rules.js`
- Modify: `clients/shadowrocket/test/rules.test.js`
- Modify: `clients/surge/src/render-rules.js`
- Modify: `clients/surge/test/profile.test.js`

**Interfaces:**
- Consumes: `orderedRoutingPlan({ adblockMode })`.
- Produces: textual rule sections with service rules, `ChinaTLD`, ChinaIP, native GEOIP CN, and final proxy in the approved order.

- [ ] **Step 1: Write failing order tests**

For both clients assert:

```js
assert.ok(indexOf("/OpenAI.list") < indexOf("/OverseasGame.list"));
assert.ok(indexOf("/OverseasGame.list") < indexOf("/ChinaTLD.list"));
assert.ok(indexOf("/ChinaTLD.list") < indexOf("/ChinaIP.list"));
assert.match(lines[indexOf("/ChinaTLD.list")], /ChinaTLD\.list,DIRECT,/u);
```

Retain Shadowrocket `FINAL,🚀 节点选择` and Surge `FINAL,🚀 节点选择,dns-failed` assertions. Assert the number of default remote rule lines equals the updated default catalog length.

- [ ] **Step 2: Run tests and verify RED**

```bash
npm --workspace @apple-proxy-profiles/shadowrocket test
npm --workspace @apple-proxy-profiles/surge test
```

Expected: missing ChinaTLD and adapters still using local phase constants.

- [ ] **Step 3: Replace local source-ID grouping with the shared plan**

In each renderer, call `orderedRoutingPlan({ adblockMode })`. Render `security` before custom rules, insert the existing rule-download bootstrap after custom rules, then render the remaining phases in `ROUTING_PHASES` order. Preserve the existing optional-adblock URL selection.

Use this loop shape:

```js
const plan = orderedRoutingPlan({ adblockMode });
lines.push(...plan.filter(({ phase }) => phase === "security").map(render));
lines.push(...renderCustomSection());
lines.push(renderRuleDownloadBootstrap());
for (const phase of ROUTING_PHASES.filter((value) => value !== "security")) {
  lines.push(...plan.filter((source) => source.phase === phase).map(render));
}
```

Keep native GEOIP CN and final rules after the shared plan.

- [ ] **Step 4: Run tests and rebuild both clients**

```bash
npm --workspace @apple-proxy-profiles/shadowrocket test
npm --workspace @apple-proxy-profiles/shadowrocket run build
npm --workspace @apple-proxy-profiles/shadowrocket run fixtures
npm --workspace @apple-proxy-profiles/surge test
npm --workspace @apple-proxy-profiles/surge run build
npm --workspace @apple-proxy-profiles/surge run fixtures
```

Expected: tests pass and generated examples include ChinaTLD in the approved position.

- [ ] **Step 5: Commit Task 2**

```bash
git add clients/shadowrocket clients/surge
git commit -m "feat: render shared routing plan in text clients"
```

---

### Task 3: Render the shared plan and DNS metadata in Egern and sing-box

**Files:**
- Modify: `clients/egern/src/render-rules.js`
- Modify: `clients/egern/src/render-dns.js`
- Modify: `clients/egern/test/profile.test.js`
- Modify: `clients/egern/test/dns.test.js`
- Modify: `clients/sing-box/src/render-rules.js`
- Modify: `clients/sing-box/src/render-dns.js`
- Modify: `clients/sing-box/test/config.test.js`

**Interfaces:**
- Consumes: `ROUTING_PHASES` and `orderedRoutingPlan({ adblockMode })`.
- Produces: structured Egern/sing-box routing plus proxy-DNS source IDs derived from `dnsClass === "proxy"`.

- [ ] **Step 1: Write failing Egern tests**

Assert that Egern routing contains `ChinaTLD.yaml` with DIRECT between OverseasGame and ChinaIP. In DNS tests, derive the expected proxy IDs from the shared plan and assert stable/speed emits exactly those rule-set forwarders before China fallback; privacy remains one global wildcard.

- [ ] **Step 2: Write failing sing-box tests**

Extend the existing deterministic fallback test:

```js
const chinaTld = indexOfTag("rule-ChinaTLD");
assert.equal(overseasGame < chinaTld, true);
assert.equal(chinaTld < resolve, true);
assert.equal(resolve < chinaIp, true);
assert.equal(rules[chinaTld].outbound, "DIRECT");
assert.deepEqual(rules[resolve], { action: "resolve", server: "dns-direct" });
```

Assert `dns.rules[0].rule_set` equals all and only plan records whose `dnsClass` is `proxy`.

- [ ] **Step 3: Run tests and verify RED**

```bash
npm --workspace @apple-proxy-profiles/egern test
npm --workspace @apple-proxy-profiles/sing-box test
```

Expected: missing ChinaTLD and DNS still depends on the standalone overseas constant.

- [ ] **Step 4: Implement plan-driven structured rendering**

Render Egern phases exactly as Task 2, preserving custom records between security and early domestic and native GEOIP/default after ChinaIP.

For sing-box, render all phases through `lateDomestic`, then emit:

```js
rules.push({ action: "resolve", server: "dns-direct" });
rules.push(...plan
  .filter(({ phase }) => phase === "resolvedChinaIp")
  .map(taggedRule));
return { ruleSets, rules, final: "🚀 节点选择" };
```

In both DNS renderers derive:

```js
const proxyDnsSourceIds = Object.freeze(
  orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id),
);
```

Do not route ChinaTLD through proxy DNS.

- [ ] **Step 5: Run tests, builds, fixtures, and sing-box config checks**

```bash
npm --workspace @apple-proxy-profiles/egern test
npm --workspace @apple-proxy-profiles/egern run build
npm --workspace @apple-proxy-profiles/egern run fixtures
npm --workspace @apple-proxy-profiles/sing-box test
npm --workspace @apple-proxy-profiles/sing-box run build
npm --workspace @apple-proxy-profiles/sing-box run fixtures
npm --workspace @apple-proxy-profiles/sing-box run check:config
```

Expected: all pass; diagnostic mode still has zero remote rule sets.

- [ ] **Step 6: Commit Task 3**

```bash
git add clients/egern clients/sing-box
git commit -m "feat: align structured clients with shared routing"
```

---

### Task 4: Make Anywhere phase and assignment requirements explicit

**Files:**
- Modify: `automation/src/source-catalog.js`
- Modify: `automation/src/render-anywhere-rules.js`
- Modify: `clients/anywhere/src/build-import-page.js`
- Modify: `automation/test/source-catalog.test.js`
- Modify: `clients/anywhere/test/rule-artifacts.test.js`
- Modify: `clients/anywhere/test/import-page.test.js`

**Interfaces:**
- Consumes: catalog records with `phase` and `dnsClass`.
- Produces: Anywhere Manifest source records containing `phase`, `dnsClass`, `routing`, and `shardIds`; import page assignment table in manifest order.

- [ ] **Step 1: Write failing Manifest tests**

Assert:

```js
const chinaTld = manifest.sources.find(({ id }) => id === "ChinaTLD");
assert.deepEqual({
  phase: chinaTld.phase,
  dnsClass: chinaTld.dnsClass,
  routing: chinaTld.routing,
}, {
  phase: "lateDomestic",
  dnsClass: "china",
  routing: 1,
});
assert.ok(manifest.sources.findIndex(({ id }) => id === "OverseasGame")
  < manifest.sources.findIndex(({ id }) => id === "ChinaTLD"));
assert.ok(manifest.sources.findIndex(({ id }) => id === "ChinaTLD")
  < manifest.sources.findIndex(({ id }) => id === "ChinaIP"));
assert.equal(chinaTld.shardIds.length, 1);
```

- [ ] **Step 2: Write failing import-page tests**

Require a visible assignment row for every source with ID, phase, intended target, shard count, and a warning that every shard must share one assignment. Assert the page contains `ChinaTLD`, `lateDomestic`, and `DIRECT`, and contains no script element.

- [ ] **Step 3: Run Anywhere and source tests and verify RED**

```bash
node --test automation/test/source-catalog.test.js
npm --workspace @apple-proxy-profiles/anywhere test
```

Expected: Manifest omits phase/DNS fields and the page omits the assignment table.

- [ ] **Step 4: Preserve metadata through publication**

Add `phase: source.phase` and `dnsClass: source.dnsClass` in `sourceRecord()`, validate them against the shared legal values, and copy them into each Anywhere `sources` record. Keep `routing=1` for DIRECT and do not change ARRS routing semantics.

- [ ] **Step 5: Render the deterministic assignment table**

Build rows only from validated `manifest.sources`, ordered by `order`. Escape all fields through `escapeHtml`. Each row must state:

```text
<source id> | <phase> | <intendedTarget> | <shardIds.length> shard(s)
```

Keep existing Content Security Policy and deep-link validation.

- [ ] **Step 6: Run tests and regenerate Anywhere examples**

```bash
node --test automation/test/source-catalog.test.js
npm --workspace @apple-proxy-profiles/anywhere test
npm --workspace @apple-proxy-profiles/anywhere run rules
npm --workspace @apple-proxy-profiles/anywhere run build
```

Expected: generated Manifest and import page include ChinaTLD and assignment metadata; all shard URLs close over the Manifest.

- [ ] **Step 7: Commit Task 4**

```bash
git add automation/src/source-catalog.js automation/src/render-anywhere-rules.js automation/test/source-catalog.test.js clients/anywhere
git commit -m "feat: expose anywhere routing assignments"
```

---

### Task 5: Add evidence-bearing ObservedDomestic records

**Files:**
- Create: `shared/rules/observed-domestic.js`
- Modify: `shared/rules/domestic-core.js`
- Modify: `test/lightweight-policy.test.js`
- Modify: `automation/test/compile-lightweight-rules.test.js`

**Interfaces:**
- Produces: `OBSERVED_DOMESTIC_RECORDS: readonly { suffix, service, observedAt, reason }[]`.
- Consumes: `OBSERVED_DOMESTIC_RECORDS.map(({ suffix }) => suffix` when building the existing `DOMESTIC_CORE_DOMAIN_SUFFIXES`.

- [ ] **Step 1: Write failing provenance tests**

Require exact keys, ISO dates, non-empty service/reason, normalized suffixes, no duplicates, and no public suffixes. Assert the observed suffixes are present in compiled DomesticCore but there is no client-visible `ObservedDomestic` source.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test test/lightweight-policy.test.js automation/test/compile-lightweight-rules.test.js
```

Expected: missing module and provenance records.

- [ ] **Step 3: Create the observed records**

Move only the trace-derived entries into the new module:

```js
export const OBSERVED_DOMESTIC_RECORDS = Object.freeze([
  Object.freeze({
    suffix: "wmpvp.com",
    service: "WeChat mini-program media",
    observedAt: "2026-08-08",
    reason: "Domestic App media request was observed falling through to the proxy",
  }),
  Object.freeze({
    suffix: "bytehwm.com",
    service: "ByteDance font and static CDN",
    observedAt: "2026-08-08",
    reason: "Domestic static asset request was observed falling through to the proxy",
  }),
  Object.freeze({
    suffix: "rtbasia.com",
    service: "Observed domestic App dependency",
    observedAt: "2026-08-08",
    reason: "App dependency was observed using the proxy during domestic workflow testing",
  }),
  Object.freeze({
    suffix: "sandbox.itunes.apple.com",
    service: "Apple sandbox purchase validation",
    observedAt: "2026-08-08",
    reason: "Sandbox validation request was observed using the proxy during domestic App testing",
  }),
]);
```

Keep audited Douyu/Huya media domains in the base list. Merge and validate the two lists once in `domestic-core.js`.

- [ ] **Step 4: Run tests and verify GREEN**

Run the Step 2 command.

Expected: published DomesticCore content is unchanged except for deterministic internal provenance structure.

- [ ] **Step 5: Commit Task 5**

```bash
git add shared/rules/observed-domestic.js shared/rules/domestic-core.js test/lightweight-policy.test.js automation/test/compile-lightweight-rules.test.js
git commit -m "refactor: record observed domestic provenance"
```

---

### Task 6: Build a pure ChinaIP drift audit engine

**Files:**
- Create: `automation/src/china-ip-audit.js`
- Create: `automation/test/china-ip-audit.test.js`

**Interfaces:**
- Produces:
  - `parseAuditCidrs({ ipv4Text, ipv6Text, sourceId }): readonly RuleEntry[]`
  - `buildChinaIpAudit({ previousPrimaryEntries, currentPrimaryEntries, secondaryEntries, primary, secondary, now, calibrationStartedAt }): ChinaIpAuditReport`
  - `validateChinaIpAuditForPromotion(report, now): true`
- Consumes: canonical CIDR helpers from `shared/rules/model.js` and CIDR compaction from `automation/src/compact-rule-cidrs.js`.

- [ ] **Step 1: Write parser and structural-failure tests**

Cover pure CIDR lines, blank/comment lines, invalid UTF-8 input already rejected by fetcher, mixed address families, malformed prefixes, HTML, empty lists, and forbidden ranges.

Use these forbidden test cases:

```js
[
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "::/128",
  "::1/128",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
  "2001:db8::/32",
]
```

Structural failures remain blockers even during calibration.

- [ ] **Step 2: Write coverage and threshold tests**

Use compacted, non-overlapping prefixes. Compute exact covered-address counts as BigInt and serialize them as decimal strings. Compute percentage changes in basis points.

Assert:

- primary shrink greater than 2,000 basis points blocks;
- divergence greater than 500 basis points warns;
- divergence greater than 1,500 basis points blocks after calibration;
- secondary comparison older than seven days blocks promotion;
- first report sets `calibrationStartedAt`;
- numerical blockers become warnings until `calibrationStartedAt + 14 days`;
- structural blockers never become warnings.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test automation/test/china-ip-audit.test.js
```

Expected: module missing.

- [ ] **Step 4: Implement deterministic parsing and coverage**

Return a canonical report with this closed shape:

```js
{
  schemaVersion: 1,
  generatedAt,
  calibrationStartedAt,
  calibrationEndsAt,
  reportOnly,
  primary: { repository, commit, committedAt, sha256 },
  secondary: { repository, commit, committedAt, sha256 },
  families: {
    ipv4: { previousPrefixes, currentPrefixes, secondaryPrefixes, previousAddresses, currentAddresses, secondaryAddresses, shrinkBasisPoints, divergenceBasisPoints },
    ipv6: { previousPrefixes, currentPrefixes, secondaryPrefixes, previousAddresses, currentAddresses, secondaryAddresses, shrinkBasisPoints, divergenceBasisPoints },
  },
  warnings: [],
  blockers: [],
}
```

Canonicalize warning/blocker ordering and reject unknown object keys in promotion validation.

- [ ] **Step 5: Run tests and verify GREEN**

Run the Step 3 command.

Expected: all threshold, calibration, structural, and deterministic JSON cases pass.

- [ ] **Step 6: Commit Task 6**

```bash
git add automation/src/china-ip-audit.js automation/test/china-ip-audit.test.js
git commit -m "feat: audit china ip coverage drift"
```

---

### Task 7: Pin, stage, publish, and gate the ChinaIP audit report

**Files:**
- Create: `automation/src/fetch-china-ip-audit.js`
- Create: `automation/test/fetch-china-ip-audit.test.js`
- Modify: `scripts/stage-rule-artifacts.mjs`
- Modify: `test/stage-rule-artifacts.test.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/test/build-artifacts.test.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `test/update-rules.test.js`
- Modify: `automation/src/build-site.js`
- Modify: `automation/test/build-site.test.js`
- Modify: `.github/workflows/update-rules.yml`
- Modify: `test/actions.test.js`

**Interfaces:**
- Produces:
  - `resolveChinaIpAuditCommit(fetchImpl, now): { sha, committedAt }`
  - `fetchChinaIpAuditSnapshot({ commit, fetchImpl }): { source, entries, sha256 }`
  - stage manifest schema v2 with `chinaIpAudit: { path, bytes, sha256 }`.
- Consumes: `buildChinaIpAudit` and `validateChinaIpAuditForPromotion` from Task 6.

- [ ] **Step 1: Write allowlisted fetch tests**

Allow only:

```text
https://api.github.com/repos/gaoyifan/china-operator-ip/commits/ip-lists
https://raw.githubusercontent.com/gaoyifan/china-operator-ip/<40-char-sha>/china.txt
https://raw.githubusercontent.com/gaoyifan/china-operator-ip/<40-char-sha>/china6.txt
```

Test manual redirects, non-200 responses, HTML, invalid UTF-8, empty content, files above 4 MiB, invalid commit/time, and a future timestamp. Require `Accept: text/plain`, `redirect: manual`, and a 30-second timeout.

- [ ] **Step 2: Write staging and publication tests**

Require edge staging to write `audit/china-ip-drift.json` and record its byte length/hash in stage-manifest schema v2. Require current staging to reuse the tracked current report instead of network fetch. Require `buildClientArtifacts({ chinaIpAudit })` to add the report at the root audit path while every client source list remains unchanged.

- [ ] **Step 3: Write promotion-gate tests**

Assert promotion fails when:

- audit blockers are non-empty outside calibration;
- the report is older than seven days;
- the report hash is not present in the edge root manifest;
- the report bytes differ from the manifested hash.

Assert promotion succeeds during numerical calibration warnings but never with structural blockers.

- [ ] **Step 4: Run focused tests and verify RED**

```bash
node --test automation/test/fetch-china-ip-audit.test.js test/stage-rule-artifacts.test.js automation/test/build-artifacts.test.js test/update-rules.test.js automation/test/build-site.test.js test/actions.test.js
```

Expected: fetcher, stage schema v2, public audit artifact, and promotion validator are missing.

- [ ] **Step 5: Implement immutable secondary fetch**

Resolve the `ip-lists` commit, then fetch `china.txt` and `china6.txt` at that SHA. Combine their normalized entries only in memory. Record:

```js
{
  repository: "https://github.com/gaoyifan/china-operator-ip",
  branch: "ip-lists",
  commit,
  committedAt,
  license: "MIT",
  files: [
    { path: "china.txt", sha256, bytes },
    { path: "china6.txt", sha256, bytes },
  ],
}
```

Never add this source to `FETCH_SOURCE_CATALOG`, `DEFAULT_PUBLISH_SOURCE_CATALOG`, `ruleClientCatalog`, or any client Manifest.

- [ ] **Step 6: Integrate stage and build**

For edge staging:

1. build the current primary ChinaIP entries;
2. load the prior edge report and prior edge ChinaIP rule when present;
3. fetch the pinned secondary;
4. call `buildChinaIpAudit`;
5. write canonical report bytes into the stage;
6. record the report in stage-manifest schema v2.

For current staging, load and validate `public/current/audit/china-ip-drift.json` without network.

Pass the staged report to `buildClientArtifacts`, add it to `defaults`, and include it in the root manifest file records. Do not add it to per-client `rule_set`, ARRS sources, or rule byte budgets.

- [ ] **Step 7: Enforce the promotion gate**

Before copying edge client bytes, validate the edge root Manifest and audit report. Promotion must reuse the exact report bytes that accompanied the approved edge candidate. Copy the report to current root audit evidence only when a client promotion succeeds; do not rebuild or refetch.

- [ ] **Step 8: Keep Actions deterministic**

Keep the existing order: stage → compile SRS → build/fixtures → checks → edge publication. The stage command is the only step that resolves/fetches the secondary source. Keep Actions pinned to full SHAs and permissions unchanged.

- [ ] **Step 9: Run focused tests and verify GREEN**

Run the Step 4 command.

Expected: all pass; secondary source IDs never appear in any client catalog or Manifest.

- [ ] **Step 10: Commit Task 7**

```bash
git add automation/src/fetch-china-ip-audit.js automation/test/fetch-china-ip-audit.test.js scripts/stage-rule-artifacts.mjs test/stage-rule-artifacts.test.js automation/src/build-artifacts.js automation/test/build-artifacts.test.js scripts/update-rules.mjs test/update-rules.test.js automation/src/build-site.js automation/test/build-site.test.js .github/workflows/update-rules.yml test/actions.test.js
git commit -m "feat: gate releases on china ip audit"
```

---

### Task 8: Generate routing audit data and an offline explain command

**Files:**
- Create: `automation/src/routing-plan-audit.js`
- Create: `automation/test/routing-plan-audit.test.js`
- Create: `scripts/explain-route.mjs`
- Create: `test/explain-route.test.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/test/build-artifacts.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `buildRoutingPlanAudit({ plan, ruleSets }): RoutingPlanAudit`
  - `explainRoute({ domain, ip, plan, ruleSets }): RouteExplanation`
- CLI: `npm run explain:route -- --channel <edge|current> --domain <domain> [--ip <address>]`.
- Consumes: published local Surge-format rule files only; never performs DNS or network access.

- [ ] **Step 1: Write failing routing-audit tests**

Require canonical schema v1 containing ordered phases, source IDs, policies, DNS classes, entry counts, and SHA-256. Assert no node, URL query, password, UUID, or subscription field is accepted.

- [ ] **Step 2: Write failing explain tests**

Cover:

```js
[
  { domain: "portal.example.cn", expectedSource: "ChinaTLD", expectedPolicy: "DIRECT" },
  { domain: "chat.openai.com", expectedSource: "OpenAI", expectedPolicy: "🤖 AI 专用" },
  { domain: "unknown.example", ip: "1.0.1.1", expectedSource: "ChinaIP", expectedPolicy: "DIRECT" },
  { domain: "unknown.example", ip: "203.0.113.9", expectedSource: null, expectedPolicy: "🚀 节点选择" },
]
```

Require domain/custom/service checks before ChinaTLD, and ChinaTLD before IP checks. When IP is omitted and no domain rule matches, return `needsResolution: true` and the balanced final proxy, not a guessed country.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test automation/test/routing-plan-audit.test.js test/explain-route.test.js
```

Expected: both modules missing.

- [ ] **Step 4: Implement deterministic audit and explanation**

Use only normalized domain exact/suffix/keyword matches and canonical CIDR containment. Return:

```js
{
  domain,
  ip,
  matchedPhase,
  matchedSource,
  dnsClass,
  expectedPolicy,
  needsResolution,
  clientExpression: {
    shadowrocket: "shared rule plan plus native GEOIP CN",
    surge: "shared rule plan plus native GEOIP CN and dns-failed final",
    egern: "shared rule plan plus native GEOIP CN",
    singbox: "explicit dns-direct resolve before ChinaIP",
    anywhere: "shared ARRS plan; local assignment must be verified",
  },
}
```

Reject unknown CLI flags, credentials in URLs, invalid domains, invalid IPs, missing channel trees, and noncanonical Manifest/rule paths.

- [ ] **Step 5: Add build artifact and npm command**

Add `audit/routing-plan.json` to root default artifacts and its hash to the root Manifest. Add:

```json
"explain:route": "node scripts/explain-route.mjs"
```

The command must not mutate files.

- [ ] **Step 6: Run tests and verify GREEN**

```bash
node --test automation/test/routing-plan-audit.test.js test/explain-route.test.js automation/test/build-artifacts.test.js
npm run explain:route -- --channel current --domain example.cn
```

Expected: tests pass and CLI reports ChinaTLD/DIRECT without network access.

- [ ] **Step 7: Commit Task 8**

```bash
git add automation/src/routing-plan-audit.js automation/test/routing-plan-audit.test.js scripts/explain-route.mjs test/explain-route.test.js automation/src/build-artifacts.js automation/test/build-artifacts.test.js package.json
git commit -m "feat: explain shared routing decisions"
```

---

### Task 9: Extend cross-client regressions and operator documentation

**Files:**
- Modify: `test/fixtures/lightweight-routing-cases.js`
- Modify: `test/cross-client-routing.test.js`
- Modify: `clients/anywhere/docs/deployment.md`
- Modify: `clients/anywhere/docs/troubleshooting.md`
- Modify: `clients/anywhere/docs/canary.md`
- Modify: `clients/shadowrocket/docs/canary-checklist.md`
- Modify: `clients/surge/docs/canary.md`
- Modify: `clients/egern/docs/canary.md`
- Modify: `clients/sing-box/docs/canary.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/implementation-status.md`
- Modify: `clients/anywhere/test/docs.test.js`
- Modify: `clients/shadowrocket/test/docs.test.js`
- Modify: `clients/surge/test/docs.test.js`
- Modify: `clients/egern/test/docs.test.js`
- Modify: `clients/sing-box/test/docs.test.js`

**Interfaces:**
- Consumes: generated examples/Manifest after Tasks 2–4.
- Produces: one shared behavior matrix and exact human canary gates.

- [ ] **Step 1: Add failing cross-client cases**

Add:

```js
Object.freeze({
  domain: "portal.ordinary-service.cn",
  sourceId: "ChinaTLD",
  expected: "DIRECT",
}),
Object.freeze({
  domain: "unknown-v4.example",
  resolvedIp: "1.0.1.1",
  resolvedCountry: "CN",
  expected: "DIRECT",
}),
Object.freeze({
  domain: "unknown-v6.example",
  resolvedIp: "2400:3200::1",
  resolvedCountry: "CN",
  expected: "DIRECT",
}),
Object.freeze({
  domain: "unknown-overseas.example",
  resolvedIp: "203.0.113.9",
  resolvedCountry: "US",
  expected: "🚀 节点选择",
}),
```

Extend parsers to assert ChinaTLD position in all generated formats and Anywhere routing=1. Keep the existing DNS-failed proxy case.

- [ ] **Step 2: Run cross-client test and verify RED**

```bash
node --test test/cross-client-routing.test.js
```

Expected: tracked examples do not yet close over the new case until all client fixtures are regenerated.

- [ ] **Step 3: Update exact operator guidance**

Every canary guide must state:

- `DomesticCore → service rules → OverseasGame → ChinaTLD → ChinaIP → final`;
- stable DNS is the domestic-first recommendation;
- ordinary `.cn` should hit ChinaTLD/DIRECT;
- unknown CN IPv4 and IPv6 should hit ChinaIP/GEOIP CN;
- unknown overseas and DNS failures should use the proxy;
- HTTPDNS, hard-coded IP, IPv6, QUIC and manual service-group choices remain residual risks;
- the route explain command is offline and does not perform DNS;
- test Wi-Fi and cellular where the client supports them;
- preserve old configuration and perform one rollback.

Anywhere must additionally require every ChinaTLD shard to be DIRECT, all logical shards to share assignment, and the actual generated shard count from Manifest rather than a hard-coded count.

ChinaIP documentation must state that gaoyifan is audit-only and never merged automatically.

- [ ] **Step 4: Run docs and cross-client tests**

```bash
npm --workspace @apple-proxy-profiles/anywhere test
npm --workspace @apple-proxy-profiles/shadowrocket test
npm --workspace @apple-proxy-profiles/surge test
npm --workspace @apple-proxy-profiles/egern test
npm --workspace @apple-proxy-profiles/sing-box test
node --test test/cross-client-routing.test.js
```

Expected: all pass after regenerated examples from Tasks 2–4.

- [ ] **Step 5: Commit Task 9**

```bash
git add test clients/anywhere/docs clients/shadowrocket/docs clients/surge/docs clients/egern/docs clients/sing-box/docs docs/maintenance.md docs/implementation-status.md
git commit -m "test: cover late domestic routing across clients"
```

---

### Task 10: Rebuild, verify reproducibility, and create an edge-only candidate

**Files:**
- Generated: `clients/*/dist/`
- Generated: `clients/*/examples/`
- Generated: `public/edge/`
- Generated: `public/versions/<manifest-hash>/` when produced by the existing edge publisher
- Must remain unchanged: `public/current/`
- Must remain unchanged: `public/previous/`

**Interfaces:**
- Consumes: all source, test, audit, documentation, and workflow changes.
- Produces: deterministic edge candidates and client-manifest hashes for real-device canary.

- [ ] **Step 1: Install and verify the fixed toolchain**

```bash
node --version
npm --version
npm ci
node scripts/install-sing-box-core.mjs
```

Expected: Node is at least 22; lockfile is unchanged; official sing-box installer verifies the pinned asset digest.

- [ ] **Step 2: Run the complete source test suite**

```bash
npm test
npm run check:actions
npm run check:secrets
```

Expected: all pass and secret scanning reports no private inputs.

- [ ] **Step 3: Build primary and secondary staged audit inputs**

```bash
node scripts/stage-rule-artifacts.mjs --channel edge
npm --workspace @apple-proxy-profiles/sing-box run compile:rules
npm run fixtures
npm run build
npm --workspace @apple-proxy-profiles/sing-box run check:config
```

Expected: stage schema v2 contains a valid ChinaIP audit report; every default rule including ChinaTLD has an official binary SRS.

- [ ] **Step 4: Run all semantic and publication gates**

```bash
npm run verify:lightweight
npm run verify
npm run update:rules
npm run check:secrets
```

Expected: default rules stay within all budgets; edge root contains both audit JSON files; no secondary source appears in client rule lists.

- [ ] **Step 5: Prove current and previous are untouched**

```bash
git diff --exit-code -- public/current public/previous
```

Expected: exit 0.

- [ ] **Step 6: Prove deterministic generation**

Record hashes:

```bash
find clients -type f \( -path '*/dist/*' -o -path '*/examples/*' \) -print0 | sort -z | xargs -0 shasum -a 256
find public/edge -type f -print0 | sort -z | xargs -0 shasum -a 256
```

Repeat Steps 3–4, run both hash commands again, and compare the two outputs byte-for-byte.

Expected: identical hashes.

- [ ] **Step 7: Inspect exact scope**

```bash
git diff --check
git status --short
git diff --stat
git diff -- public/current public/previous
```

Expected: no whitespace errors, no current/previous changes, no private or unexplained large files.

- [ ] **Step 8: Commit Task 10**

```bash
git add clients public/edge public/versions
git commit -m "chore: build domestic routing edge candidates"
```

Do not stage `public/current` or `public/previous`.

---

### Task 11: Real-device canary, rollback proof, and explicit promotion handoff

**Files:**
- Modify after sanitized results exist: `docs/implementation-status.md`
- Do not store: private URLs, node values, UUIDs, credentials, full request logs, or screenshots containing them.

**Interfaces:**
- Consumes: exact edge client-manifest hashes from Task 10.
- Produces: per-client pass/fail evidence and, only after explicit user approval, immutable current promotion.

- [ ] **Step 1: Record the five edge client-manifest hashes**

Read the generated manifests for Shadowrocket, Surge, Egern, Anywhere and sing-box. Record only client, manifest hash, platform, public rule Manifest hash, test start time, and app version/build.

- [ ] **Step 2: Run canary in documented order**

Use:

- Egern: Intel Mac → iPhone → iPad.
- Shadowrocket: Intel Mac → iPhone → iPad.
- Surge: Mac → iPhone → iPad.
- sing-box: Mac → iPhone → iPad → Android → OpenWrt.
- Anywhere: iPhone → iPad.

Verify ordinary `.cn`, domestic core/media/payment, domestic game login/update/voice/gameplay, unknown CN IPv4/IPv6, AI, GitHub, overseas media/game, unknown overseas, DNS failure, QUIC, node switching and network recovery.

- [ ] **Step 3: Hold each client for at least 24 hours**

Expected: no unexpected VPN exit, repeated DNS failure, assignment reset, memory regression, domestic proxy leak, or overseas direct leak.

- [ ] **Step 4: Perform one rollback per client**

Switch to the old Profile/config/rules, confirm connectivity, then return to the exact edge candidate. Anywhere rollback must use in-place Update when possible so local assignment remains intact.

- [ ] **Step 5: Update sanitized implementation status**

Record pass/fail, manifest hashes, platforms, duration, rollback result, and known residual limitation categories. Do not copy request contents or node details.

- [ ] **Step 6: Stop for explicit promotion approval**

Present the five tested hashes and audit-report hash to the user. Do not invoke the promotion workflow until the user explicitly identifies which client hashes to promote.

- [ ] **Step 7: Promote only approved immutable client bytes**

For each explicitly approved client:

```bash
npm run update:rules -- --promote <approved-client> <approved-64-character-manifest-hash>
```

The actual client and hash must be copied from the user-approved canary record. The promotion validator must reuse the edge audit report and reject stale or blocked evidence.

- [ ] **Step 8: Verify online current and rollback pointers**

Run the existing current reproduction check, secret scan, public URL/Manifest hash checks, and confirm the previous/version snapshots still restore the old configuration.

- [ ] **Step 9: Commit only sanitized status and promoted generated bytes**

Use one commit per approved client, matching the existing workflow convention:

```text
chore: promote tested client <client>
```

No unapproved client may change.
