# v2rayN / V2Box Dual-Core Routing Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the old v2rayN/V2Box implementations and rebuild them around one route-intent model with separate sing-box and Xray renderers.

**Architecture:** A shared compiler converts normalized rules and nodes into `RouteIntent[]` and `OutboundGraph`. The sing-box renderer preserves selector, urltest, rule_set, and detour semantics; the Xray renderer emits the verified compatibility subset with balancers, fixed nodes, and explicit capability diagnostics. v2rayN exposes both core profiles, while V2Box consumes the Xray profile.

**Tech Stack:** Node.js 22, ESM, Node test runner, esbuild, existing rule/geodata compilers, sing-box JSON, Xray JSON, Sub-Store remote JS operators.

**Spec:** `docs/superpowers/specs/2026-09-06-v2rayn-v2box-dual-core-routing-design.md`

## Global Constraints

- Do not modify or delete `.worktrees/` branches.
- Public artifacts must never contain node credentials, subscription URLs, or private policy values.
- All node references in policy and generated configs use stable node IDs; display names are diagnostic-only.
- A renderer must fail closed when a required node, rule asset, or capability is unavailable.
- `FOLLOW`, `DIRECT`, `REJECT`, and fixed-node targets must remain deterministic across renderers for expressible rules.
- Rule source commits, SHA-256 values, licenses, and parser diagnostics must be recorded in manifests.
- Use `npm test`, package verification scripts, `sing-box check`, and Xray JSON validation before claiming completion.

---

### Task 1: Remove Legacy v2rayN/V2Box Surface

**Files:**
- Delete: `clients/v2box/**`
- Delete: any tracked `clients/v2rayn/**` legacy implementation on the active branch
- Modify: `shared/contracts.js`
- Modify: `shared/release/client-catalog.js`
- Modify: `shared/policies/private-policy.js`
- Modify: `shared/policies/resolve-unified.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `scripts/check-substore-task.mjs`
- Modify: root `package.json`
- Modify: `test/client-catalog.test.js`, `test/foundation.test.js`, `test/capabilities.test.js`, `test/rule-budgets.test.js`, `test/public.test.js`, `test/private-policy.test.js`, `test/private-substore-config.test.js`, `test/substore-task-check.test.js`
- Delete: tracked `public/current/v2box/**` and legacy v2rayN public outputs
- Modify: `README.md`, `docs/maintenance.md`, `docs/substore-client-pools.md`, `docs/substore-two-layer-setup.md`

**Interfaces:**
- Consumes: existing client catalog and publication tests.
- Produces: a repository state with no references to the deleted client implementations and no stale public artifacts.

- [ ] **Step 1: Add failing absence assertions**

```js
test("legacy v2rayn and v2box implementations are absent", async () => {
  await assert.rejects(access(new URL("../clients/v2box/package.json", import.meta.url)));
  await assert.rejects(access(new URL("../clients/v2rayn/package.json", import.meta.url)));
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test test/client-catalog.test.js test/foundation.test.js test/public.test.js`

Expected: FAIL because the old packages and catalog entries still exist.

- [ ] **Step 3: Delete old client trees and generated outputs**

Remove the tracked directories listed above. Remove package scripts, workspace verification entries, public manifest records, policy client records, task schemas, and documentation statements that describe the old implementation.

- [ ] **Step 4: Update shared references and tests**

Make client lists, policy schemas, task counts, artifact builders, and rule-budget checks describe only the remaining clients. Do not remove shared node/rule modules used by other clients.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `node --test test/client-catalog.test.js test/foundation.test.js test/public.test.js test/private-policy.test.js test/substore-task-check.test.js`

Expected: PASS with no `v2rayn` or `v2box` legacy reference in the active catalog.

- [ ] **Step 6: Commit the deletion boundary**

```bash
git add clients shared automation scripts test public README.md docs package.json
git commit -m "refactor: remove legacy v2rayn and v2box clients"
```

### Task 2: Add the Shared Route Intent Compiler

**Files:**
- Create: `shared/routing/route-intent.js`
- Create: `shared/routing/outbound-graph.js`
- Create: `shared/routing/compile-route-plan.js`
- Create: `shared/routing/capability-diagnostics.js`
- Modify: `shared/policies/catalog.js`
- Modify: `shared/policies/resolve-unified.js`
- Modify: `shared/nodes/normalize-nodes.js`
- Test: `test/route-intent.test.js`, `test/outbound-graph.test.js`, `test/cross-client-routing.test.js`

**Interfaces:**
- Consumes: normalized nodes, unified policy resolution, ordered rule sources.
- Produces: `compileRoutePlan({ rules, nodes, policyResolution, options }) -> { intents, graph, diagnostics }`.
- Produces: `buildOutboundGraph({ nodes, policyResolution, options }) -> OutboundGraph`.

- [ ] **Step 1: Write failing route-intent tests**

```js
test("business intent outranks ChinaIP fallback", () => {
  const plan = compileRoutePlan({
    rules: [{ kind: "domainSuffix", value: "openai.com", sourceId: "OpenAI" }],
    nodes: fixtureNodes(),
    policyResolution: defaultResolution(),
    options: { platform: "windows", core: "singbox" },
  });
  assert.equal(plan.intents[0].businessId, "ai");
  assert.ok(plan.intents[0].priority < plan.intents.find((it) => it.sourceId === "ChinaIP").priority);
});
```

- [ ] **Step 2: Run the tests and verify the compiler is missing**

Run: `node --test test/route-intent.test.js test/outbound-graph.test.js`

Expected: FAIL with module/function-not-found errors.

- [ ] **Step 3: Implement normalized intent and graph types**

Validate matchers, business IDs, actions, priorities, DNS classes, node IDs, and diagnostics. Reject duplicate node IDs and unresolved fixed-node references. Keep display names outside the identity fields.

- [ ] **Step 4: Implement the fixed route order**

Emit intents in this order: local/private, security, user custom, explicit business, domestic business, ChinaTLD/china-list, resolve+ChinaIP, default proxy, fail-closed fallback. Attach source IDs and reasons to every intent.

- [ ] **Step 5: Implement the outbound graph**

Create direct/reject/final nodes, physical node tags, business candidate pools, manual group records, automatic group records, and detour edges. Map `FOLLOW` to a business group, `DIRECT` to direct, and stable fixed node IDs to physical outbounds.

- [ ] **Step 6: Run focused and cross-client tests**

Run: `node --test test/route-intent.test.js test/outbound-graph.test.js test/cross-client-routing.test.js`

Expected: PASS, including fixed-node failure, duplicate-node rejection, chain diagnostics, and China fallback ordering.

- [ ] **Step 7: Commit the shared compiler**

```bash
git add shared/routing shared/policies shared/nodes test/route-intent.test.js test/outbound-graph.test.js test/cross-client-routing.test.js
git commit -m "feat: add shared route intent and outbound graph compiler"
```

### Task 3: Add Locked External Rule Sources and China Precision Fixtures

**Files:**
- Create: `automation/src/rule-sources/loyalsoldier-v2ray-rules.js`
- Create: `automation/src/rule-sources/v2fly-domain-list.js`
- Create: `automation/src/route-manifest.js`
- Modify: `automation/src/source-catalog.js`
- Modify: `automation/src/compile-lightweight-rules.js`
- Modify: `shared/rules/catalog-data.js`
- Modify: `shared/rules/source-mappings.js`
- Create: `automation/test/loyalsoldier-source.test.js`
- Create: `automation/test/china-precision-routing.test.js`
- Modify: `test/rule-model.test.js`, `test/rule-budgets.test.js`, `test/external-rule-routing.test.js`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: pinned upstream text lists and existing rule source adapters.
- Produces: canonical typed rule entries plus a manifest containing commit, hash, license, counts, and unsupported-format diagnostics.

- [ ] **Step 1: Add failing source and precedence fixtures**

Cover `china-list`, `direct-list`, `proxy-list`, `gfw`, ad lists, duplicate domain entries, parent/child suffixes, China CDN domains, overseas business domains, pure IP, and unresolved domains.

- [ ] **Step 2: Run source tests and verify the adapter is absent**

Run: `node --test automation/test/loyalsoldier-source.test.js automation/test/china-precision-routing.test.js`

Expected: FAIL because the new adapters and manifest builder do not exist.

- [ ] **Step 3: Implement pinned source fetching and parsing**

Accept only configured commit/ref URLs, normalize domain/CIDR entries through `shared/rules/model.js`, compute SHA-256, preserve license metadata, and reject unknown formats or empty sources.

- [ ] **Step 4: Implement source-to-intent mappings**

Map source facts to existing business IDs without allowing generic `geolocation-!cn` to override explicit AI/media/social/domestic rules. Record all matched sources after deduplication.

- [ ] **Step 5: Implement DNS and ChinaIP test semantics**

Model sniff-before-route, domestic DNS, proxy DNS, resolve-after-domain-rules, IPv4/IPv6 strategy, QUIC handling, and fail-closed fallback in deterministic fixtures.

- [ ] **Step 6: Run adapter, model, and budget tests**

Run: `node --test automation/test/loyalsoldier-source.test.js automation/test/china-precision-routing.test.js test/rule-model.test.js test/rule-budgets.test.js test/external-rule-routing.test.js`

Expected: PASS with source hashes and unsupported diagnostics present in the route manifest.

- [ ] **Step 7: Commit the source integration**

```bash
git add automation/src/rule-sources automation/src/route-manifest.js automation/test shared/rules test THIRD_PARTY_NOTICES.md
git commit -m "feat: lock external rule sources and china routing fixtures"
```

### Task 4: Rebuild v2rayN with Sing-Box Core Renderer

**Files:**
- Create: `clients/v2rayn/package.json`
- Create: `clients/v2rayn/src/options.js`
- Create: `clients/v2rayn/src/render-node.js`
- Create: `clients/v2rayn/src/render-singbox-profile.js`
- Create: `clients/v2rayn/src/substore-singbox-entry.js`
- Create: `clients/v2rayn/src/substore-node-entry.js`
- Create: `clients/v2rayn/scripts/build.mjs`
- Create: `clients/v2rayn/scripts/render-fixtures.mjs`
- Create: `clients/v2rayn/test/options.test.js`, `clients/v2rayn/test/singbox-profile.test.js`, `clients/v2rayn/test/substore-entry.test.js`
- Create: `clients/v2rayn/README.md`

**Interfaces:**
- Consumes: `compileRoutePlan`, shared node rendering, sing-box rule-set assets.
- Produces: `renderV2rayNSingBoxProfile({ nodes, options, policyResolution, routeManifest }) -> object`.
- Produces: Sub-Store operators for `output=nodes` and `output=config`, with `core=singbox` fixed in the config schema.

- [ ] **Step 1: Write failing profile tests**

```js
test("sing-box v2rayN profile contains business selectors and detours", () => {
  const profile = renderV2rayNSingBoxProfile(fixtureInput({ core: "singbox" }));
  assert.equal(profile.route.final, "漏网之鱼");
  assert.ok(profile.outbounds.some((item) => item.type === "selector" && item.tag === "业务:ai"));
  assert.ok(profile.outbounds.some((item) => item.type === "urltest"));
  assert.ok(profile.outbounds.some((item) => item.detour));
  assert.ok(profile.route.rules.some((rule) => rule.rule_set?.includes("rule-OpenAI")));
});
```

- [ ] **Step 2: Run the profile tests and verify they fail**

Run: `npm --workspace @apple-proxy-profiles/v2rayn test`

Expected: FAIL because the package and renderer are new.

- [ ] **Step 3: Implement option parsing and node output**

Support `windows|macos`, `singbox` core, `edge|current|previous`, region, DNS, block, QUIC, IPv6, auto-group, chain, and policy inputs. Reject `core=xray` in this package and route it to Task 5's renderer.

- [ ] **Step 4: Implement sing-box outbound graph rendering**

Render physical protocol outbounds, direct/reject, business selectors, URLTest helpers, chain detours, rule-download HTTP client, and capability metadata with `fullGroupSemantics=true`.

- [ ] **Step 5: Implement route and DNS rendering**

Render sniff and DNS hijack rules, business rule-set references, domestic DNS rules, explicit business rules before ChinaIP resolve, and final leak-safe fallback.

- [ ] **Step 6: Implement Sub-Store operators and fixtures**

Keep node and config tasks separate. The config task must load private policy and refuse empty or unresolved node pools.

- [ ] **Step 7: Run package verification**

Run: `npm --workspace @apple-proxy-profiles/v2rayn run verify`

Expected: PASS, including fixture JSON validation and secret scan.

- [ ] **Step 8: Commit the sing-box client**

```bash
git add clients/v2rayn
git commit -m "feat: add v2rayn sing-box core renderer"
```

### Task 5: Rebuild Xray Renderer for v2rayN and V2Box

**Files:**
- Create: `shared/renderers/xray-profile.js`
- Create: `shared/renderers/xray-capabilities.js`
- Create: `clients/v2rayn/src/render-xray-profile.js`
- Create: `clients/v2rayn/src/substore-xray-entry.js`
- Create: `clients/v2box/package.json`
- Create: `clients/v2box/src/options.js`
- Create: `clients/v2box/src/render-node.js`
- Create: `clients/v2box/src/render-profile.js`
- Create: `clients/v2box/src/substore-config-entry.js`
- Create: `clients/v2box/src/substore-node-entry.js`
- Create: `clients/v2box/scripts/build.mjs`
- Create: `clients/v2box/scripts/render-fixtures.mjs`
- Create: `clients/v2box/test/profile.test.js`, `clients/v2box/test/options.test.js`, `clients/v2box/test/substore-entry.test.js`
- Modify: `test/cross-client-routing.test.js`

**Interfaces:**
- Consumes: `OutboundGraph`, `RouteIntent[]`, shared Xray protocol renderer.
- Produces: `renderXrayProfile({ nodes, options, policyResolution, routeManifest, client }) -> { config, capabilityDiagnostics }`.
- Produces: v2rayN `core=xray` tasks and V2Box `iphone|ipad` Xray tasks.

- [ ] **Step 1: Write failing Xray compatibility tests**

```js
test("xray renderer reports degraded group semantics", () => {
  const result = renderXrayProfile(fixtureInput({ client: "v2box", core: "xray" }));
  assert.equal(result.capabilityDiagnostics.fullGroupSemantics, false);
  assert.ok(result.capabilityDiagnostics.degraded.includes("manual-selector"));
  assert.ok(result.config.routing.rules.some((rule) => rule.balancerTag || rule.outboundTag));
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm --workspace @apple-proxy-profiles/v2box test && node --test test/cross-client-routing.test.js`

Expected: FAIL because the new packages and shared renderer do not exist.

- [ ] **Step 3: Implement the Xray capability contract**

Declare support for business routing, ChinaIP, fixed nodes, balancer pools, and verified chain forms. Declare degradation for selector runtime control, urltest parity, dynamic rule-set updates, and any unverified V2Box fields.

- [ ] **Step 4: Implement Xray outbound and balancer graph rendering**

Render physical outbounds, direct/blackhole, per-business balancer candidates, fixed-node targets, and `proxySettings` chain edges only when the node protocol contract permits them. Reject missing or ambiguous node IDs.

- [ ] **Step 5: Implement Xray DNS and route rendering**

Render domain-first rules, `IPIfNonMatch` or equivalent verified strategy, China GeoData references, QUIC policy, and fail-closed final routing. Keep the same intent IDs and priority as the sing-box renderer.

- [ ] **Step 6: Implement v2rayN Xray and V2Box operators**

Expose separate config outputs, platform validation, private policy loading, stable node binding, render diagnostics, and non-empty node subscription guards.

- [ ] **Step 7: Run package and parity tests**

Run: `npm --workspace @apple-proxy-profiles/v2box run verify && node --test test/cross-client-routing.test.js test/capabilities.test.js`

Expected: PASS for expressible rules, with explicit diagnostics for degraded Xray semantics.

- [ ] **Step 8: Commit the Xray compatibility renderer**

```bash
git add shared/renderers clients/v2rayn clients/v2box test/cross-client-routing.test.js test/capabilities.test.js
git commit -m "feat: add xray renderer for v2rayn and v2box"
```

### Task 6: Reconnect Catalog, Policy, Artifacts, and Sub-Store Tasks

**Files:**
- Modify: `shared/contracts.js`
- Modify: `shared/release/client-catalog.js`
- Modify: `shared/policies/private-policy.js`, `shared/policies/resolve-unified.js`, `shared/policies/catalog.js`
- Modify: `automation/src/build-artifacts.js`, `automation/src/build-site.js`, `automation/src/public-audit-dashboard.js`
- Modify: `scripts/check-substore-task.mjs`, `scripts/configure-substore.mjs`
- Modify: `public/manifest.json`, `public/current/manifest.json`
- Create: `public/current/v2rayn/**` generated through build scripts
- Create: `public/current/v2box/**` generated through build scripts
- Modify: `test/private-substore-config.test.js`, `test/substore-task-check.test.js`, `test/client-set.test.js`, `test/foundation.test.js`, `test/public.test.js`
- Modify: `README.md`, `docs/maintenance.md`, `docs/substore-client-pools.md`, `docs/substore-two-layer-setup.md`

**Interfaces:**
- Consumes: both client packages and shared manifest/capability outputs.
- Produces: six canonical task URLs and public artifacts for both cores/clients.

- [ ] **Step 1: Add failing catalog and task assertions**

Assert v2rayN has `singbox` and `xray` config formats, V2Box has Xray-only formats, and task URLs include the required core/platform parameters.

- [ ] **Step 2: Run focused catalog tests and verify failures**

Run: `node --test test/client-set.test.js test/private-substore-config.test.js test/substore-task-check.test.js`

Expected: FAIL because catalogs and task schemas still describe the deleted surface.

- [ ] **Step 3: Register new client identities and policy layers**

Add `v2rayn` and `v2box` with explicit per-core capabilities. Keep policy target IDs stable and remove display-name-only aliases from generated task interfaces.

- [ ] **Step 4: Add artifact build and manifest entries**

Bundle both renderer families, include route manifest and capability diagnostics, calculate hashes, and reject public outputs containing private markers.

- [ ] **Step 5: Add six canonical Sub-Store tasks**

Create node/config pairs for v2rayN sing-box Windows/macOS, v2rayN Xray Windows/macOS, and V2Box Xray iPhone/iPad. Keep channel and private policy checks consistent with existing task validation.

- [ ] **Step 6: Regenerate public artifacts and fixtures**

Run the repository build and fixture scripts; inspect generated JSON for stable IDs, correct rule assets, and explicit capability diagnostics.

- [ ] **Step 7: Run catalog, artifact, and secret checks**

Run: `node --test test/client-set.test.js test/private-substore-config.test.js test/substore-task-check.test.js test/public.test.js test/security.test.js && npm run build && npm run check:secrets`

Expected: PASS with no credentials or private URLs in public output.

- [ ] **Step 8: Commit publication integration**

```bash
git add shared automation scripts public test README.md docs package.json package-lock.json
git commit -m "feat: publish dual-core v2rayn and v2box tasks"
```

### Task 7: Runtime Validation, Device Import, and Rollout Gates

**Files:**
- Create: `clients/v2rayn/test/runtime-fixtures.test.js`
- Create: `clients/v2box/test/runtime-fixtures.test.js`
- Create: `docs/v2rayn-dual-core.md`
- Create: `docs/v2box-xray-compatibility.md`
- Modify: `scripts/verify.mjs`
- Modify: `test/explain-route.test.js`, `test/frontier-contract.test.js`, `test/frontier-verification.test.js`

**Interfaces:**
- Consumes: generated public artifacts, route manifests, renderer capability reports.
- Produces: reproducible core checks, import instructions, and a release gate that blocks unsupported or malformed profiles.

- [ ] **Step 1: Add failing runtime contract checks**

Check sing-box JSON with `sing-box check`, Xray JSON structure with the repository validator, rule-set URLs and hashes, non-empty outbounds, and no unresolved route targets.

- [ ] **Step 2: Run runtime tests and verify missing checks**

Run: `npm run verify`

Expected: FAIL until the new client paths and validators are connected.

- [ ] **Step 3: Implement core validators and explain-route parity checks**

For each fixture domain/IP, assert identical intent/action/business ID across sing-box and Xray when the rule is expressible. Assert a diagnostic entry for every deliberate degradation.

- [ ] **Step 4: Validate v2rayN sing-box and Xray profiles**

Import generated Windows and macOS profiles into v2rayN using each core, verify TUN/system proxy operation, business selector switching, automatic URLTest, China direct routing, overseas proxy routing, and chain detours.

- [ ] **Step 5: Validate V2Box iPhone/iPad profiles**

Import node and profile outputs into V2Box, verify domestic/overseas routing, fixed business node behavior, ChinaIP fallback, supported protocols, and the documented degraded capabilities. Record the tested app version in the compatibility document.

- [ ] **Step 6: Add release and rollback gates**

Require `edge` tests, private Sub-Store preview, manifest hash closure, secret scan, and explicit promotion to `current`. Keep `previous` artifacts intact for rollback.

- [ ] **Step 7: Run the complete verification suite**

Run: `npm test && npm run verify && npm run check:rules && npm run check:secrets && npm run check:actions`

Expected: PASS with runtime fixtures, source manifests, public artifacts, and device validation recorded.

- [ ] **Step 8: Commit the runtime gate and documentation**

```bash
git add clients/v2rayn clients/v2box scripts docs test
git commit -m "test: validate dual-core routing profiles and rollout gates"
```

## Self-Review Checklist

- [ ] Every requirement in `docs/superpowers/specs/2026-09-06-v2rayn-v2box-dual-core-routing-design.md` maps to at least one task.
- [ ] No task depends on the deleted renderer files.
- [ ] `RouteIntent`, `OutboundGraph`, `compileRoutePlan`, and renderer signatures are consistent across tasks.
- [ ] Xray degradation is reported through `capabilityDiagnostics`; no task silently claims selector/urltest parity.
- [ ] Device import validation is a release gate, not only a unit-test assertion.
- [ ] Public artifact and secret checks run after every generated-output change.
