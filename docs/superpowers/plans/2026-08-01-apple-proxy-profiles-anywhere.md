# Anywhere Subscription and Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a private Anywhere-compatible node subscription and a complete, sharded, auditable set of public `.arrs` routing subscriptions with safe bulk-import links.

**Architecture:** A Clash-subset renderer emits only nodes accepted without security downgrade by Anywhere's subscription parser. A client-specific rule compiler maps the shared semantic model into four `.arrs` rule types, resolves literal priority conflicts, shards below the source-enforced limit, and produces bounded deep-link batches.

**Tech Stack:** Node.js 22+, ESM JavaScript, `node:test`, esbuild 0.28.1, Clash-compatible YAML subset, Anywhere `.arrs`, Sub-Store File Script Operators, static HTML.

## Global Constraints

- Complete the foundation, Shadowrocket, and Egern plans first.
- Do not modify or include Anywhere source code or branding.
- Pin compatibility facts to the supplied source commit `e15518fde1f5d2652dfc1c234c89a68b87cecec0` and revalidate them against the latest stable app during iPhone canary.
- Output only `.arrs`; never output `.amrs`, MITM rules, certificates, rewrites, or scripts.
- Use at most 95,000 rules per shard, below Anywhere's 100,000 custom-rule-set limit.
- Never widen an exact-domain rule into a domain suffix or keyword; report it as `unsupported-exact-domain`.
- Use `routing=0` for proxy/default sets, `routing=1` for direct sets, and `routing=2` for reject sets.
- Keep deep-link URLs at or below 1,800 characters and split batches deterministically.

---

## Target File Structure

```text
shared/rules/model.js
shared/render-yaml.js
clients/anywhere/package.json
clients/anywhere/compatibility/source-contract.json
clients/anywhere/src/{render-yaml,render-node,render-subscription}.js
clients/anywhere/src/{compile-priority,render-arrs,shard-rules,build-import-page}.js
clients/anywhere/src/substore-nodes-entry.js
clients/anywhere/scripts/{build,render-fixtures,verify-source-contract}.mjs
clients/anywhere/test/*.test.js
clients/anywhere/dist/substore-node-generator.js
clients/anywhere/examples/{anywhere-nodes.yaml,rules,import.html}
clients/anywhere/docs/{deployment,canary,troubleshooting}.md
```

### Task 1: Record the Anywhere Source Compatibility Contract

**Files:**
- Create: `clients/anywhere/package.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `clients/anywhere/compatibility/source-contract.json`
- Create: `clients/anywhere/scripts/verify-source-contract.mjs`
- Create: `clients/anywhere/test/source-contract.test.js`

**Interfaces:**
- Produces: a machine-readable contract with source commit, allowed subscription types, `.arrs` IDs, maximum rule count, routing headers, and default-assignment behavior.
- Produces: `verify-source-contract.mjs [source-directory]`.

- [ ] **Step 1: Write a failing contract test**

```js
test("pins the supplied Anywhere parser and routing limits", async () => {
  const contract = JSON.parse(await readFile(new URL("../compatibility/source-contract.json", import.meta.url)));
  assert.equal(contract.sourceCommit, "e15518fde1f5d2652dfc1c234c89a68b87cecec0");
  assert.equal(contract.maxRuleCount, 100000);
  assert.deepEqual(contract.arrsTypeIds, { ipv4Cidr: 0, ipv6Cidr: 1, domainSuffix: 2, domainKeyword: 3 });
  assert.deepEqual(contract.routingIds, { default: 0, direct: 1, reject: 2 });
  assert.equal(contract.defaultFallsBackToSelectedProxy, true);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/source-contract.test.js`

Expected: FAIL because the contract file does not exist.

- [ ] **Step 3: Create the exact contract**

Set accepted Clash types to `vless`, `hysteria2`, `trojan`, `anytls`, `ss`, `socks5`, `sudoku`; record VLESS networks `tcp|ws`; record that Trojan subscription parsing rejects non-TCP, Reality, gRPC, and enabled `ss-opts`; record the 100,000 limit and four type IDs.

- [ ] **Step 4: Define workspace scripts and update the lockfile**

Set `clients/anywhere/package.json` to:

```json
{
  "name": "@apple-proxy-profiles/anywhere",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test test",
    "build": "node scripts/build.mjs",
    "fixtures": "node scripts/render-fixtures.mjs",
    "verify": "npm run test && npm run build && npm run fixtures"
  }
}
```

Add root scripts `"verify:anywhere": "npm --workspace @apple-proxy-profiles/anywhere run verify"` and `"verify:egern": "npm --workspace @apple-proxy-profiles/egern run verify"`, then run `npm install --package-lock-only`.

- [ ] **Step 5: Implement source-text verification**

The script accepts the extracted Anywhere source directory and asserts exact strings or regexes in:

- `Shared/Utilities/ClashProxyParser.swift`
- `Shared/Models/RoutingRule.swift`
- `Shared/DataStore/RoutingRuleSetStore.swift`
- `Anywhere/Views/Settings/RuleSets/RoutingRuleParser.swift`

It must fail with a file and contract key only, never source secrets. If no source directory is supplied, print `SKIP source tree not supplied` and exit 0 so public CI remains reproducible.

- [ ] **Step 6: Run against the user's extracted source and commit**

Run:

```bash
inspect_dir=$(mktemp -d /tmp/anywhere-source.XXXXXX)
unzip -q /Users/sunyuze/Downloads/Anywhere-main.zip -d "$inspect_dir"
node clients/anywhere/scripts/verify-source-contract.mjs "$inspect_dir/Anywhere-main"
node --test clients/anywhere/test/source-contract.test.js
```

Expected: PASS and a summary naming the pinned commit.

```bash
git add package.json package-lock.json clients/anywhere/package.json clients/anywhere/compatibility clients/anywhere/scripts/verify-source-contract.mjs clients/anywhere/test/source-contract.test.js
git commit -m "test: pin Anywhere import capabilities"
```

### Task 2: Render the Private Anywhere Node Subscription

**Files:**
- Create by moving: `shared/render-yaml.js`
- Modify: `clients/egern/src/render-yaml.js`
- Modify: Egern imports of `renderYaml`
- Create: `clients/anywhere/src/render-node.js`
- Create: `clients/anywhere/src/render-subscription.js`
- Create: `clients/anywhere/test/nodes.test.js`
- Create: `clients/anywhere/test/fixtures/nodes.js`
- Modify: `shared/nodes/capabilities.js`

**Interfaces:**
- Produces: `toAnywhereProxy(node): object` in the supported Clash subset.
- Produces: `renderAnywhereSubscription(nodes): { content: string, diagnostics: object }`.

- [ ] **Step 1: Write failing supported and rejected-node tests**

```js
test("renders only the Clash fields consumed by Anywhere", () => {
  assert.deepEqual(toAnywhereProxy(vlessRealityTcp), {
    name: vlessRealityTcp.name,
    type: "vless",
    server: "vless.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "tcp",
    flow: "xtls-rprx-vision",
    servername: "www.example.com",
    "reality-opts": { "public-key": "TEST_ONLY_PUBLIC_KEY", "short-id": "0123abcd" },
  });
});
```

Assert Snell is excluded, VLESS gRPC is excluded, Trojan WS is excluded, Shadowsocks plugins are excluded, and diagnostics contain only counts.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/nodes.test.js`

Expected: FAIL because the renderer is absent.

- [ ] **Step 3: Reuse the deterministic YAML rules**

Move the generic YAML encoder from `clients/egern/src/render-yaml.js` to `shared/render-yaml.js`, replace the original Egern file with a compatibility re-export, update internal Egern imports to the shared path, and make Anywhere use the same encoder. Do not duplicate YAML escaping logic.

- [ ] **Step 4: Map the verified Clash subset**

Map:

- `ss|shadowsocks` → `type: ss`, `cipher`, `password`.
- `vless` → UUID, network, flow, TLS/Reality, SNI, WebSocket options only when accepted by the pinned parser.
- `hysteria2|hy2` → `type: hysteria2`, password, SNI, bandwidth and supported obfuscation.
- `trojan` → password, SNI, ALPN for TCP without rejected option blocks.
- `anytls` → password, SNI and idle-session fields.
- `socks5` → username and password.
- `sudoku` → only fields demonstrated by a pinned source fixture.

If a node requests per-node insecure TLS or certificate pinning that the parser does not preserve, exclude it with `unsupported-security-setting`.

- [ ] **Step 5: Render, verify, and commit**

```bash
node --test clients/anywhere/test/nodes.test.js clients/egern/test/yaml.test.js test/capabilities.test.js
npm run check:secrets
git add shared/render-yaml.js shared/nodes/capabilities.js clients/egern clients/anywhere/src clients/anywhere/test
git commit -m "feat: render Anywhere-compatible node subscriptions"
```

### Task 3: Define the Shared Normalized Rule Model

**Files:**
- Create: `shared/rules/model.js`
- Create: `test/rule-model.test.js`

**Interfaces:**
- Produces: `RULE_KIND` with `domain`, `domainSuffix`, `domainKeyword`, `ipv4Cidr`, `ipv6Cidr`, `geoip`, `ipAsn`, `urlRegex`, `userAgent`, `processName`, `unsupported`.
- Produces: `normalizeRuleEntry(entry): RuleEntry`.
- `RuleEntry`: `{ kind, value, noResolve, sourceId }`.
- `PolicyRuleSet`: `{ id, name, policy, priority, routing, entries }`.

- [ ] **Step 1: Write failing normalization tests**

```js
test("normalizes domains and host CIDRs without changing intent", () => {
  assert.deepEqual(normalizeRuleEntry({ kind: "domainSuffix", value: ".Example.COM.", sourceId: "x" }), {
    kind: "domainSuffix", value: "example.com", noResolve: false, sourceId: "x",
  });
  assert.deepEqual(normalizeRuleEntry({ kind: "ipv4Cidr", value: "192.0.2.9", sourceId: "x" }).value, "192.0.2.9/32");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/rule-model.test.js`

Expected: FAIL because `model.js` is absent.

- [ ] **Step 3: Implement strict normalization**

Lowercase domains, remove one leading/trailing dot for suffixes, validate ASCII/IDNA-safe host text, use `node:net` to distinguish IPv4/IPv6, add `/32` or `/128` to bare IPs, and reject CR/LF, commas in values, invalid prefixes, and empty source IDs.

- [ ] **Step 4: Run and commit**

```bash
node --test test/rule-model.test.js
git add shared/rules/model.js test/rule-model.test.js
git commit -m "feat: define normalized routing rule model"
```

### Task 4: Compile Anywhere Priority Semantics

**Files:**
- Create: `clients/anywhere/src/compile-priority.js`
- Create: `clients/anywhere/test/priority.test.js`

**Interfaces:**
- Consumes: `PolicyRuleSet[]` ordered by ascending numeric priority.
- Produces: `compileAnywhereRuleSets(ruleSets): { ruleSets, diagnostics }`.
- Diagnostics: `{ duplicates, shadowed, unsupported, unresolved }` count maps only.

- [ ] **Step 1: Write failing overlap tests**

Cover:

- exact duplicate suffix in high/low sets → keep high only;
- high `example.com`, low `api.example.com` → remove low because high first-match intent covers it;
- high `api.example.com`, low `example.com` → keep both because Anywhere specificity preserves high on the overlap;
- high CIDR `/8`, low `/24` → remove low;
- high `/24`, low `/8` → keep both;
- high keyword literally contained in a lower suffix → remove the lower suffix;
- an exact-domain rule → report `unsupported-exact-domain` and omit;
- conflicting identical patterns with different policies → never leave both outputs.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/priority.test.js`

Expected: FAIL because the compiler does not exist.

- [ ] **Step 3: Implement domain and CIDR containment**

Use label-aligned suffix containment and BigInt network masks for IPv4/IPv6. Process higher-priority sets first. A lower rule is `shadowed` only when every destination it can match is already governed by the higher rule. Put only concrete incompatible duplicates or literal containments that the output cannot order safely into `unresolved`; do not fail for merely hypothetical keyword/subdomain overlap.

- [ ] **Step 4: Implement literal keyword conflict rules**

Deduplicate identical keywords. Remove a lower suffix only when its normalized suffix text contains a higher keyword, because every host matching that suffix also matches the keyword. Mark malformed or empty keywords unsupported. Do not treat hypothetical subdomain strings as a build failure.

- [ ] **Step 5: Fail on unresolved conflicts and run tests**

Throw `Anywhere rule precedence has ${diagnostics.unresolved} unresolved conflict(s)` after building diagnostics. Never include pattern values in the thrown message.

Run: `node --test clients/anywhere/test/priority.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add clients/anywhere/src/compile-priority.js clients/anywhere/test/priority.test.js
git commit -m "feat: compile Anywhere routing precedence"
```

### Task 5: Render and Shard `.arrs` Files

**Files:**
- Create: `clients/anywhere/src/render-arrs.js`
- Create: `clients/anywhere/src/shard-rules.js`
- Create: `clients/anywhere/test/arrs.test.js`
- Create: `clients/anywhere/test/sharding.test.js`

**Interfaces:**
- Produces: `renderArrs({ name, routing, entries, provenance }): string`.
- Produces: `shardRuleSet(ruleSet, maxEntries = 95000): PolicyRuleSet[]`.

- [ ] **Step 1: Write failing format and boundary tests**

Assert type IDs `0/1/2/3`, `name =`, `routing =`, source/change comments, sorted deterministic entries, LF endings, a final newline, and shards of 95,000 + 5,001 for 100,001 entries. Assert no shard exceeds 95,000.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/arrs.test.js clients/anywhere/test/sharding.test.js`

Expected: FAIL because renderers are absent.

- [ ] **Step 3: Implement exact type mapping and provenance**

Map `ipv4Cidr→0`, `ipv6Cidr→1`, `domainSuffix→2`, `domainKeyword→3`. Header comments must contain upstream repository, source ID, source commit, conversion timestamp equal to the upstream commit timestamp, GPL-2.0 notice, and changed-by project name; do not include fetched URLs with query strings or the wall clock.

- [ ] **Step 4: Implement stable sharding**

Sort by rule type then normalized value before slicing. Name one shard with `ruleSet.name`; name multiple shards `${ruleSet.name} (1/${totalShards})`. Give shards IDs `${ruleSet.id}-001`, `${ruleSet.id}-002` with three-digit numbering.

- [ ] **Step 5: Run and commit**

```bash
node --test clients/anywhere/test/arrs.test.js clients/anywhere/test/sharding.test.js
git add clients/anywhere/src/render-arrs.js clients/anywhere/src/shard-rules.js clients/anywhere/test
git commit -m "feat: render sharded Anywhere rule sets"
```

### Task 6: Build Bounded Bulk-Import Pages

**Files:**
- Create: `clients/anywhere/src/build-import-page.js`
- Create: `clients/anywhere/test/import-page.test.js`
- Create: `clients/anywhere/examples/import.html`

**Interfaces:**
- Produces: `buildImportBatches(urls, maxLength = 1800): { label, deepLink, urls }[]`.
- Produces: `renderImportPage(batches, manifest): string`.

- [ ] **Step 1: Write failing URL and HTML tests**

Assert every URL is HTTPS, every path ends in `.arrs`, each nested link uses `encodeURIComponent`, no deep link exceeds 1,800 characters, original order is preserved, all URLs appear exactly once, and HTML escapes labels and URLs.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/import-page.test.js`

Expected: FAIL because the builder is absent.

- [ ] **Step 3: Implement deterministic batching**

Build `anywhere://add-rule-set?link=${encodeURIComponent(url1)}&link=${encodeURIComponent(url2)}`. Start a new batch before adding a link that would exceed the maximum. Throw if one encoded link alone exceeds the maximum.

- [ ] **Step 4: Render a static no-script page**

Show manifest version, generation time, batch count, one anchor button per batch, the number of rule sets in each batch, HTTPS decryption warning, and a manual list of URLs as fallback. Do not execute JavaScript.

- [ ] **Step 5: Run and commit**

```bash
node --test clients/anywhere/test/import-page.test.js
git add clients/anywhere/src/build-import-page.js clients/anywhere/test/import-page.test.js clients/anywhere/examples/import.html
git commit -m "feat: add Anywhere bulk import page"
```

### Task 7: Bundle the Private Node File Operator

**Files:**
- Create: `clients/anywhere/src/substore-nodes-entry.js`
- Create: `clients/anywhere/scripts/build.mjs`
- Create: `clients/anywhere/scripts/render-fixtures.mjs`
- Create: `clients/anywhere/test/substore.test.js`
- Create: `clients/anywhere/test/bundles.test.js`
- Create: `clients/anywhere/dist/substore-node-generator.js`
- Create: `clients/anywhere/examples/anywhere-nodes.yaml`

**Interfaces:**
- Operator: `operator(input, targetPlatform, context): Promise<{ $content: string } & object>`.
- Arguments: `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off|on`.

- [ ] **Step 1: Write failing File Operator tests**

Assert `produceArtifact` is called with JSON/internal output, compatible nodes render, incompatible counts are logged without values, empty output fails closed, unknown args fail, and `$content` begins with `proxies:`.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/substore.test.js clients/anywhere/test/bundles.test.js`

Expected: FAIL because the operator is absent.

- [ ] **Step 3: Implement and bundle**

Use IIFE global `AnywhereNodeBundle`; inject `$arguments`, `produceArtifact`, and `console`. The bundle must be self-contained and leave only the expected global `operator` wrapper.

- [ ] **Step 4: Generate a fake fixture and verify**

```bash
npm --workspace @apple-proxy-profiles/anywhere run build
npm --workspace @apple-proxy-profiles/anywhere run fixtures
node --test clients/anywhere/test/substore.test.js clients/anywhere/test/bundles.test.js
npm run check:secrets
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add clients/anywhere/package.json clients/anywhere/src/substore-nodes-entry.js clients/anywhere/scripts clients/anywhere/test clients/anywhere/dist clients/anywhere/examples/anywhere-nodes.yaml
git commit -m "build: bundle Anywhere node generator"
```

### Task 8: Document Import, Defaults, Manual Settings, and Canary

**Files:**
- Create: `clients/anywhere/README.md`
- Create: `clients/anywhere/docs/deployment.md`
- Create: `clients/anywhere/docs/canary.md`
- Create: `clients/anywhere/docs/troubleshooting.md`
- Create: `clients/anywhere/test/docs.test.js`

**Interfaces:**
- Produces beginner-safe iPhone/iPad instructions and the stable/beta source-contract caveat.

- [ ] **Step 1: Write failing documentation tests**

Assert docs contain `anywhere-nodes`, 6-hour refresh, Pages import page, all import batches, `routing = 0/1/2` meanings, AI independent binding, DNS/IPv6/QUIC manual checks, game/P2P node warning, HTTPS decryption disabled, iPhone-before-iPad order, and old configuration rollback.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/anywhere/test/docs.test.js`

Expected: FAIL because docs are absent.

- [ ] **Step 3: Write deployment and fallback paths**

Explain the pinned-source behavior: first test a dedicated public documentation domain in a `routing=0` rule set; if it does not follow the selected global proxy, manually bind every proxy-intent set and mark automatic fallback unsupported in the canary checklist.

- [ ] **Step 4: Verify and commit**

```bash
node --test clients/anywhere/test/docs.test.js
npm --workspace @apple-proxy-profiles/anywhere run test
npm run check:secrets
git add clients/anywhere/README.md clients/anywhere/docs clients/anywhere/test/docs.test.js
git commit -m "docs: add Anywhere deployment and canary guide"
```

### Task 9: Verify the Anywhere Milestone

**Files:**
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Consumes: Tasks 1–8.
- Produces: a generator and compiler ready for real public rule snapshots.

- [ ] **Step 1: Run the milestone gate**

```bash
npm ci
npm --workspace @apple-proxy-profiles/anywhere run verify
npm --workspace @apple-proxy-profiles/egern run verify
npm run verify:shadowrocket
npm run check:secrets
git diff --check
git status --short
```

Expected: PASS and empty status.

- [ ] **Step 2: Record and commit the milestone**

```bash
git add docs/implementation-status.md
git commit -m "docs: record Anywhere generator milestone"
```
