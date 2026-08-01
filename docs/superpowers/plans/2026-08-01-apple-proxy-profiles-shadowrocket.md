# Shadowrocket Migration and Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Shadowrocket consume the shared policy and rule intent without changing its generated Profiles, Sub-Store arguments, bundle contracts, or operational behavior.

**Architecture:** Extract client-neutral policy group records and rule assignments from the migrated Shadowrocket catalog. Keep the existing Shadowrocket renderers as adapters that translate those records into INI. Compare unchanged sections byte-for-byte and permit only the approved `AdvertisingLite` to `Advertising` rule-source delta.

**Tech Stack:** Node.js 22+, ESM JavaScript, `node:test`, esbuild 0.28.1, Sub-Store Script/File Operators.

## Global Constraints

- Complete the foundation plan first.
- Keep `shadowrocket-sources`, `subscriptionName`, `output`, `type`, `name`, `platform`, DNS, block, QUIC, IPv6, automatic-group, and client-chain arguments compatible.
- Keep `🚀 节点选择 = select,PROXY` and all 16 service group defaults unchanged.
- Keep generated profiles free of node credentials.
- Keep macOS IPv4-only, iPhone/iPad IPv6 auto, proxied Cloudflare fallback, and proxy-side QUIC blocking as defaults.
- Do not change production rule URLs to GitHub Pages until the publishing plan has deployed and smoke-tested them.

---

## Target File Structure

```text
shared/policies/catalog.js
shared/policies/filters.js
shared/rules/catalog.js
shared/rules/custom-rules.js
clients/shadowrocket/src/{group-catalog,render-groups,render-rules,render-profile,validate-profile}.js
clients/shadowrocket/test/{groups,rules,profile,compatibility}.test.js
clients/shadowrocket/dist/*
clients/shadowrocket/examples/*
```

### Task 1: Extract the Shared Policy Catalog

**Files:**
- Create: `shared/policies/catalog.js`
- Create: `shared/policies/filters.js`
- Modify: `clients/shadowrocket/src/group-catalog.js`
- Test: `clients/shadowrocket/test/compatibility.test.js`

**Interfaces:**
- Consumes: `platformPreset(platform)`, normalized nodes, `_profile` metadata, and `blockMode`, `autoGroupMode`, `clientChain` options.
- Produces: `buildPolicyGroups(options, nodes): PolicyGroup[]`.
- `PolicyGroup`: `{ name, strategy, candidates, nodeFilter, test, hidden, defaultChoice }`.

- [ ] **Step 1: Write a failing compatibility snapshot test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildGroups as buildLegacyGroups } from "../src/group-catalog.js";
import { buildPolicyGroups } from "../../../shared/policies/catalog.js";

test("shared policy records preserve the Shadowrocket catalog", () => {
  const options = { platform: "iphone", blockMode: "balanced", autoGroupMode: "full", clientChain: "off" };
  const nodes = makeNormalizedInventory();
  const shared = buildPolicyGroups(options, nodes);
  assert.equal(shared.find((group) => group.name === "🚀 节点选择").candidates[0], "PROXY");
  assert.deepEqual(shared.filter((group) => group.kind === "service").map((group) => group.name), EXPECTED_16_SERVICE_NAMES);
  assert.deepEqual(shared.find((group) => group.name === "☣️ 安全威胁").candidates, ["REJECT", "DIRECT"]);
  assert.equal(buildLegacyGroups(options, nodes).length, shared.length);
});
```

Define `EXPECTED_16_SERVICE_NAMES` explicitly with the names in design section 8.2 and reuse the existing synthetic inventory helper.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/shadowrocket/test/compatibility.test.js`

Expected: FAIL because `shared/policies/catalog.js` does not exist.

- [ ] **Step 3: Move filters and build neutral records**

Move continent, source, P2P, game, entry, and all-node filters into `shared/policies/filters.js`. Use neutral strategies:

```js
export const STRATEGY = Object.freeze({
  select: "select",
  autoTest: "auto-test",
  fallback: "fallback",
});
```

Each group record must set `nodeFilter` to a regex string or `null`, `candidates` to explicit policy names, and `test` to `{ url, interval, timeout, tolerance }` or `null`.

- [ ] **Step 4: Adapt Shadowrocket's `buildGroups`**

Make `clients/shadowrocket/src/group-catalog.js` export:

```js
export function buildGroups(options, nodes) {
  return buildPolicyGroups(options, nodes).map((group) => ({
    name: group.name,
    type: group.strategy === "auto-test" ? "url-test" : group.strategy,
    items: group.candidates,
    useSubscription: group.nodeFilter !== null,
    filter: group.nodeFilter ?? undefined,
    url: group.test?.url,
    interval: group.test?.interval,
    timeout: group.test?.timeout,
    tolerance: group.test?.tolerance,
    hidden: group.hidden,
    policySelectName: group.defaultChoice,
  }));
}
```

- [ ] **Step 5: Run focused and full group tests**

Run:

```bash
node --test clients/shadowrocket/test/compatibility.test.js clients/shadowrocket/test/groups.test.js
npm run verify:shadowrocket
```

Expected: PASS with unchanged group rendering.

- [ ] **Step 6: Commit**

```bash
git add shared/policies clients/shadowrocket/src/group-catalog.js clients/shadowrocket/test
git commit -m "refactor: share proxy policy catalog"
```

### Task 2: Extract Rule Assignments and Custom Overrides

**Files:**
- Create: `shared/rules/catalog.js`
- Create: `shared/rules/custom-rules.js`
- Modify: `clients/shadowrocket/src/rule-catalog.js`
- Modify: `clients/shadowrocket/src/custom-rules.js`
- Modify: `clients/shadowrocket/src/render-rules.js`
- Test: `clients/shadowrocket/test/rules.test.js`

**Interfaces:**
- Produces: `RULE_SOURCE_CATALOG`, records shaped `{ id, sourcePath, upstreamUrl, policy, minEntries, inputFormat }`.
- Produces: `CUSTOM_RULES` shaped `{ block: string[], direct: string[], proxy: string[], ai: string[] }`.
- Produces: `orderedRuleAssignments(): { sourceId, policy }[]`.

- [ ] **Step 1: Add failing shared-catalog assertions**

```js
test("shared rule intent includes complete domestic and advertising sources", () => {
  const ids = RULE_SOURCE_CATALOG.map((rule) => rule.id);
  assert.ok(ids.includes("ChinaMax_Domain"));
  assert.ok(ids.includes("ChinaMax"));
  assert.ok(ids.includes("Advertising"));
  assert.equal(ids.includes("AdvertisingLite"), false);
  assert.deepEqual(CUSTOM_RULES.ai, [
    "DOMAIN-SUFFIX,perplexity.ai", "DOMAIN-SUFFIX,pplx.ai", "DOMAIN-SUFFIX,x.ai",
    "DOMAIN-SUFFIX,grok.com", "DOMAIN-SUFFIX,poe.com", "DOMAIN-SUFFIX,poecdn.net",
  ]);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/shadowrocket/test/rules.test.js`

Expected: FAIL because the shared catalog is absent and Advertising is not yet selected.

- [ ] **Step 3: Move the catalog and replace AdvertisingLite**

Define upstream URLs from `https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket`. Preserve the existing routing order, replace only `AdvertisingLite` with `Advertising`, and set a conservative full-Advertising minimum of 10,000 valid entries.

- [ ] **Step 4: Keep client adapters as re-exports**

```js
export { RULE_SOURCE_CATALOG as RULE_CATALOG } from "../../../shared/rules/catalog.js";
export const {
  block: CUSTOM_BLOCK,
  direct: CUSTOM_DIRECT,
  proxy: CUSTOM_PROXY,
  ai: CUSTOM_AI,
} = CUSTOM_RULES;
```

Update `render-rules.js` to consume `upstreamUrl` until the publishing milestone changes the base.

- [ ] **Step 5: Run rule and profile regression tests**

Run:

```bash
node --test clients/shadowrocket/test/rules.test.js clients/shadowrocket/test/profile.test.js
npm run verify:shadowrocket
```

Expected: PASS after fixtures are intentionally regenerated with `Advertising`.

- [ ] **Step 6: Commit**

```bash
git add shared/rules clients/shadowrocket/src clients/shadowrocket/test clients/shadowrocket/examples
git commit -m "feat: adopt shared complete rule catalog"
```

### Task 3: Preserve Sub-Store Operator Contracts

**Files:**
- Modify: `clients/shadowrocket/src/substore-node-entry.js`
- Modify: `clients/shadowrocket/src/substore-profile-entry.js`
- Modify: `clients/shadowrocket/scripts/build.mjs`
- Test: `clients/shadowrocket/test/substore-node-entry.test.js`
- Test: `clients/shadowrocket/test/substore-profile-entry.test.js`
- Test: `clients/shadowrocket/test/bundles.test.js`

**Interfaces:**
- Node operator remains `operator(proxies, targetPlatform, context): Promise<object[]>`.
- Profile operator remains `operator(input, targetPlatform, context): Promise<{ $content: string } & object>`.
- Bundles remain `substore-node-operator.js` and `substore-profile-generator.js`.

- [ ] **Step 1: Add exact argument and output compatibility tests**

Assert that the node operator still accepts only `output=nodes&clientChain=off|on`, the profile operator still accepts the full existing option set, and both reject unknown non-internal keys.

```js
await assert.rejects(
  operator([], "Shadowrocket", { arguments: { output: "nodes", unexpected: "x" } }),
  /Unknown option: unexpected/,
);
```

- [ ] **Step 2: Run the operator tests**

Run: `node --test clients/shadowrocket/test/substore-*.test.js clients/shadowrocket/test/bundles.test.js`

Expected: PASS before implementation; this is the characterization gate.

- [ ] **Step 3: Update bundle entry paths only**

Build from `clients/shadowrocket/src`, import shared modules through relative ESM paths, and continue bundling to `clients/shadowrocket/dist`. Keep the wrapper functions and global names unchanged.

- [ ] **Step 4: Rebuild twice and prove determinism**

Run:

```bash
npm --workspace @apple-proxy-profiles/shadowrocket run build
shasum -a 256 clients/shadowrocket/dist/*.js
npm --workspace @apple-proxy-profiles/shadowrocket run build
shasum -a 256 clients/shadowrocket/dist/*.js
```

Expected: both hash lists are identical.

- [ ] **Step 5: Run bundle tests and commit**

```bash
node --test clients/shadowrocket/test/substore-node-entry.test.js clients/shadowrocket/test/substore-profile-entry.test.js clients/shadowrocket/test/bundles.test.js
git add clients/shadowrocket/src clients/shadowrocket/scripts clients/shadowrocket/dist clients/shadowrocket/test
git commit -m "build: preserve Shadowrocket operator contracts"
```

### Task 4: Add a Full Shadowrocket Compatibility Gate

**Files:**
- Create: `clients/shadowrocket/scripts/compare-baseline.mjs`
- Modify: `clients/shadowrocket/package.json`
- Test: `clients/shadowrocket/test/examples.test.js`

**Interfaces:**
- Produces npm script `verify:compatibility`.
- Compares generated public behavior, not private `_profile.id` values.

- [ ] **Step 1: Write the baseline comparator test**

The comparator must parse each example into named INI sections. Compare `[General]`, `[Host]`, `[URL Rewrite]`, and `[Proxy Group]` byte-for-byte after normalizing only a generated header timestamp if one is ever added. For `[Rule]`, canonicalize the new Blackmatrix7 path segment and ID `Advertising/Advertising.list` to the legacy `AdvertisingLite/AdvertisingLite.list`, then compare exact bytes; reject every other difference. Load both bundles in isolated `vm` contexts and compare the exported global names, operator arity, accepted argument characterization tests, and returned value shapes rather than comparing implementation bytes.

- [ ] **Step 2: Run and verify failure**

Run: `npm --workspace @apple-proxy-profiles/shadowrocket run verify:compatibility`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement the comparator**

Use `readFile`, an exact INI section splitter, the single explicit Advertising canonicalization above, `vm.createContext`, and `assert.equal`/`assert.deepEqual`. Accept `SHADOWROCKET_BASELINE_DIR` and default it to `/Users/sunyuze/Documents/代理软件/shadowrocket-profile`. Refuse a missing baseline directory with `Shadowrocket baseline directory is unavailable`; fail if the approved Advertising replacement is absent from a newly rendered Profile.

- [ ] **Step 4: Add the script and run the gate**

Set:

```json
"verify:compatibility": "node scripts/compare-baseline.mjs"
```

Run:

```bash
npm --workspace @apple-proxy-profiles/shadowrocket run fixtures
npm --workspace @apple-proxy-profiles/shadowrocket run verify:compatibility
npm run verify:shadowrocket
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add clients/shadowrocket/package.json clients/shadowrocket/scripts/compare-baseline.mjs clients/shadowrocket/test/examples.test.js
git commit -m "test: gate Shadowrocket migration compatibility"
```

### Task 5: Update Shadowrocket Documentation Without Renaming Objects

**Files:**
- Modify: `clients/shadowrocket/README.md`
- Modify: `clients/shadowrocket/docs/deployment.md`
- Modify: `clients/shadowrocket/docs/maintenance.md`
- Modify: `clients/shadowrocket/docs/troubleshooting.md`
- Modify: `clients/shadowrocket/RELEASE_CHECKLIST.md`
- Test: `clients/shadowrocket/test/docs.test.js`

**Interfaces:**
- Produces: beginner instructions that point to monorepo paths while retaining every existing Sub-Store name and rollback warning.

- [ ] **Step 1: Add failing documentation assertions**

Assert the docs contain `clients/shadowrocket/dist/substore-node-operator.js`, `clients/shadowrocket/dist/substore-profile-generator.js`, `shadowrocket-sources`, `不要重命名`, `HTTPS 解密保持关闭`, and `旧 Profile`.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/shadowrocket/test/docs.test.js`

Expected: FAIL because old paths do not include the client directory.

- [ ] **Step 3: Update paths and migration wording**

Do not change the operational order. Add one migration note explaining that repository layout changed but Sub-Store objects and URLs do not.

- [ ] **Step 4: Run docs and full verification**

Run:

```bash
node --test clients/shadowrocket/test/docs.test.js
npm run verify:shadowrocket
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add clients/shadowrocket/README.md clients/shadowrocket/docs clients/shadowrocket/RELEASE_CHECKLIST.md clients/shadowrocket/test/docs.test.js
git commit -m "docs: migrate Shadowrocket maintenance paths"
```

### Task 6: Verify the Shadowrocket Milestone

**Files:**
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: a regression-approved Shadowrocket baseline for Egern and Anywhere.

- [ ] **Step 1: Run all local gates**

```bash
npm ci
npm run verify:shadowrocket
npm --workspace @apple-proxy-profiles/shadowrocket run verify:compatibility
npm run check:secrets
git diff --check
git status --short
```

Expected: PASS and empty status.

- [ ] **Step 2: Record and commit the milestone**

Update the Shadowrocket row with the final commit and command, then:

```bash
git add docs/implementation-status.md
git commit -m "docs: record Shadowrocket migration milestone"
```
