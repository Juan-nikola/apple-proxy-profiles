# v2rayN / V2Box Unified Rule Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add v2rayN (Windows/macOS) and V2Box (iPhone/iPad) as first-class clients while compiling v2fly, Loyalsoldier, Russia, and Iran rule sources into the existing unified routing model.

**Architecture:** Keep Sub-Store node collections private and user-maintained. Add pinned source adapters and a canonical merge/policy layer, then fan the resulting region-specific rule snapshot into Xray-compatible GeoData and two client renderers. Reuse the existing release manifest, `edge/current/previous` channels, diagnostics, and cross-client semantic tests.

**Tech Stack:** Node.js 22 ESM, `node:test`, existing `protobufjs` Xray GeoData compiler, existing `esbuild` client bundles, GitHub Pages artifact builder, Sub-Store remote JavaScript tasks.

**Spec:** `docs/superpowers/specs/2026-08-22-v2rayn-v2box-unified-rule-integration-design.md`

## Global Constraints

- Nodes remain in user-owned Sub-Store collections; this repository never stores node credentials or private output URLs.
- New collection slugs are exactly `apple-proxy-v2rayn` and `apple-proxy-v2box`.
- Supported platforms are exactly v2rayN `windows|macos` and V2Box `iphone|ipad`.
- Region selection is exactly `region=cn|global|ru|ir`; default is `cn`.
- Rule precedence is user custom > explicit business > security > selected region overlay > generic Geo > ChinaTLD/ChinaIP > fallback.
- Every external source is pinned to a full commit or release and recorded with SHA-256, license, retrieval time, and parser diagnostics.
- Unknown source formats and unsupported rule kinds must fail or enter an explicit blocking diagnostic; never silently disappear.
- Public artifacts may contain rules, GeoData, manifests, and generator bundles, but no node values, credentials, or private Sub-Store addresses.
- Publication uses `edge -> current -> previous`; a failed source parse, renderer check, manifest closure, or secret scan blocks promotion.
- Existing seven clients and their public paths remain byte-compatible unless a shared rule contract intentionally changes and its tests are updated.

## File Map

**Shared contracts and policy**

- Modify: `shared/contracts.js` — add client IDs, region option, and platform values.
- Modify: `shared/release/client-catalog.js` — register active client adapters and public directories.
- Modify: `shared/nodes/capabilities.js` and `shared/nodes/protocol-registry.js` — add audited v2rayN/V2Box protocol boundaries.
- Create: `shared/rules/external-sources.js` — pinned source metadata and region overlay catalog.
- Create: `shared/rules/region-profiles.js` — `cn|global|ru|ir` composition and validation.
- Create: `shared/rules/source-mappings.js` — external category to semantic intent/action mappings.
- Modify: `shared/rules/lightweight-policy.js` and `shared/rules/semantic-intents.js` — expose the merged catalog without changing existing intent IDs.

**Source ingestion and compilation**

- Create: `automation/src/rule-sources/adapter-contract.js` — adapter input/output validators.
- Create: `automation/src/rule-sources/v2fly-domain-list.js` — v2fly YAML/domain-list adapter.
- Create: `automation/src/rule-sources/loyalsoldier-rules-dat.js` — Loyalsoldier geosite/geoip text and protobuf `.dat` adapter.
- Create: `automation/src/rule-sources/russia-v2ray-rules.js` — Russia overlay adapter.
- Create: `automation/src/rule-sources/iran-v2ray-rules.js` — Iran overlay adapter.
- Create: `automation/src/merge-rule-sources.js` — normalization, deduplication, provenance, and deterministic conflict resolution.
- Create: `automation/src/render-region-geodata.js` — region-specific Xray GeoData and manifest generation.
- Modify: `automation/src/source-catalog.js` and `automation/src/build-artifacts.js` — include external snapshots and region outputs.

**Client packages**

- Create: `clients/v2rayn/package.json`, `clients/v2rayn/README.md`, `clients/v2rayn/src/*`, `clients/v2rayn/scripts/*`, `clients/v2rayn/test/*`.
- Create: `clients/v2box/package.json`, `clients/v2box/README.md`, `clients/v2box/src/*`, `clients/v2box/scripts/*`, `clients/v2box/test/*`.
- Create: `shared/nodes/render-xray-outbound.js`; modify `clients/onexray/src/render-outbound.js` and its tests to re-export/use the shared implementation.

**Publication, Sub-Store, and docs**

- Modify: `automation/src/build-site.js`, `shared/release/channel-closure.js`, `scripts/verify.mjs`, `scripts/configure-substore.mjs`.
- Modify: `test/client-catalog.test.js`, `test/client-set.test.js`, `test/capabilities.test.js`, `test/cross-client-routing.test.js`, `test/public.test.js`, `test/private-substore-config.test.js`, `test/substore-docs.test.js`, `test/substore-task-check.test.js`.
- Create: `automation/test/external-source-adapters.test.js`, `automation/test/merge-rule-sources.test.js`, `automation/test/region-geodata.test.js`, `test/region-profiles.test.js`, `test/external-rule-routing.test.js`.
- Modify: `README.md`, `docs/maintenance.md`, `docs/substore-client-pools.md`, `docs/implementation-status.md`, `THIRD_PARTY_NOTICES.md`.

---

### Task 1: Extend the shared client and option contracts

**Files:**
- Modify: `shared/contracts.js`
- Modify: `shared/release/client-catalog.js`
- Modify: `shared/nodes/capabilities.js`
- Modify: `shared/nodes/protocol-registry.js`
- Test: `test/client-catalog.test.js`, `test/client-set.test.js`, `test/capabilities.test.js`

**Interfaces:**
- Produce `CLIENT.v2rayn === "v2rayn"` and `CLIENT.v2box === "v2box"`.
- Produce catalog records with `platforms: ["windows", "macos"]` for v2rayN and `platforms: ["iphone", "ipad"]` for V2Box.
- Extend `OPTION_VALUES.platform` and add `OPTION_VALUES.region` with `cn|global|ru|ir`.
- Keep the initial common Xray renderer boundary explicit: `vless`, `vmess`, `ss`, `shadowsocks`, `trojan`, `socks5`, `http`, `hysteria2`, and `hy2`. Any additional protocol requires a lossless fixture before it enters the client contract.

- [ ] **Step 1: Write contract tests first.**

```js
test("registers v2rayN and V2Box as active clients", () => {
  assert.deepEqual(activeClientIds(), [
    "anywhere", "egern", "shadowrocket", "surge", "singbox", "onexray", "happ", "v2rayn", "v2box",
  ]);
  assert.deepEqual(clientAdapter("v2rayn").platforms, ["windows", "macos"]);
  assert.deepEqual(clientAdapter("v2box").platforms, ["iphone", "ipad"]);
});

test("accepts the final region option set", () => {
  assert.deepEqual(OPTION_VALUES.region, ["cn", "global", "ru", "ir"]);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail.**

Run: `node --test test/client-catalog.test.js test/client-set.test.js test/capabilities.test.js`

Expected: FAIL because the new client IDs, platforms, and region option do not exist.

- [ ] **Step 3: Implement the minimal contract changes.** Add frozen catalog records, public directories `v2rayn` and `v2box`, adapter schemas `v2rayn-v1` and `v2box-v1`, and capability checks using the common Xray boundary.

- [ ] **Step 4: Run the focused tests and verify they pass.**

Run: `node --test test/client-catalog.test.js test/client-set.test.js test/capabilities.test.js`

- [ ] **Step 5: Commit.**

```bash
git add shared/contracts.js shared/release/client-catalog.js shared/nodes/capabilities.js shared/nodes/protocol-registry.js test/client-catalog.test.js test/client-set.test.js test/capabilities.test.js
git commit -m "feat: register v2rayn and v2box client contracts"
```

### Task 2: Add pinned external-source and region catalogs

**Files:**
- Create: `shared/rules/external-sources.js`
- Create: `shared/rules/region-profiles.js`
- Modify: `automation/src/source-catalog.js`
- Test: `test/region-profiles.test.js`, `automation/test/source-catalog.test.js`

**Interfaces:**
- Export `EXTERNAL_RULE_SOURCE_CATALOG`, whose records contain `{ id, repository, branch, commit, license, format, region, adapter, minEntries }`.
- Export `REGION_PROFILES` and `parseRegion(value)`, where `parseRegion(undefined)` returns `"cn"` and invalid values throw.
- Export `sourcesForRegion(region, { adblockMode })`, returning a frozen ordered list of source IDs without duplicates.

- [ ] **Step 1: Write failing tests for pinned metadata and region composition.** Assert all four repositories have full 40-character commits, non-empty licenses, and that `cn` excludes Russia/Iran while `ru` and `ir` include only their respective overlays.
- [ ] **Step 2: Run tests to verify failure.**

Run: `node --test test/region-profiles.test.js automation/test/source-catalog.test.js`

Expected: FAIL because the catalog modules and exports do not exist.

- [ ] **Step 3: Implement the frozen catalogs.** Keep the existing Blackmatrix7/v2fly baselines intact and add the three new pinned baselines plus explicit format and adapter names. Do not use `main`, `master`, or `latest` as a runtime version.
- [ ] **Step 4: Add source-catalog validation.** Reject duplicate IDs, invalid commits, invalid region names, unsafe source paths, and an overlay that is listed in the default `cn` profile.
- [ ] **Step 5: Run tests to verify pass.**

Run: `node --test test/region-profiles.test.js automation/test/source-catalog.test.js`

- [ ] **Step 6: Commit.**

```bash
git add shared/rules/external-sources.js shared/rules/region-profiles.js automation/src/source-catalog.js test/region-profiles.test.js automation/test/source-catalog.test.js
git commit -m "feat: pin external rule sources and region profiles"
```

### Task 3: Build the adapter contract and v2fly/Loyalsoldier adapters

**Files:**
- Create: `automation/src/rule-sources/adapter-contract.js`
- Create: `automation/src/rule-sources/v2fly-domain-list.js`
- Create: `automation/src/rule-sources/loyalsoldier-rules-dat.js`
- Test: `automation/test/external-source-adapters.test.js`

**Interfaces:**
- `parseExternalRuleSource({ source, text, sourceSha256, retrievedAt })` returns `{ sourceId, entries, categories, diagnostics, provenance }`.
- Every `entries` item is accepted by `normalizeRuleEntry({ ...entry, sourceId })`.
- `diagnostics` contains `{ candidateCount, parsedCount, unsupportedCount, unsupportedByReason, minEntries, sourceSha256 }`.

- [ ] **Step 1: Add fixtures for YAML domain lists, text geosite categories, and compact GeoIP CIDRs.** Use `.example.invalid`, RFC 5737/RFC 3849 addresses, and `TEST_ONLY_` metadata only.
- [ ] **Step 2: Write failing parser tests.** Cover suffix normalization, exact domain preservation, comments, category names, IPv4/IPv6 CIDR parsing, duplicate entries, malformed lines, and unsupported records.
- [ ] **Step 3: Run the adapter tests and verify failure.**

Run: `node --test automation/test/external-source-adapters.test.js`

Expected: FAIL because the adapter modules and contract validators do not exist.

- [ ] **Step 4: Implement the adapter contract.** Validate source identity, full commit, SHA-256, retrieval timestamp, and canonical entry kinds before returning a snapshot.
- [ ] **Step 5: Implement the v2fly adapter.** Parse the pinned domain-list YAML/category structure into domain suffix/keyword entries while preserving category IDs as metadata; reject malformed category records.
- [ ] **Step 6: Implement the Loyalsoldier adapter.** Parse its selected geosite/geoip outputs into the same canonical entry kinds and mark integrated categories as baseline or security/region candidates rather than assigning a client policy in the parser.
- [ ] **Step 7: Run the tests and verify pass.**

Run: `node --test automation/test/external-source-adapters.test.js`

- [ ] **Step 8: Commit.**

```bash
git add automation/src/rule-sources/adapter-contract.js automation/src/rule-sources/v2fly-domain-list.js automation/src/rule-sources/loyalsoldier-rules-dat.js automation/test/external-source-adapters.test.js
git commit -m "feat: parse v2fly and loyalsoldier rule sources"
```

### Task 4: Add Russia and Iran overlay adapters

**Files:**
- Create: `automation/src/rule-sources/russia-v2ray-rules.js`
- Create: `automation/src/rule-sources/iran-v2ray-rules.js`
- Modify: `automation/src/rule-sources/adapter-contract.js`
- Test: `automation/test/external-source-adapters.test.js`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Both adapters implement the Task 3 `parseExternalRuleSource` contract.
- Each returned category includes `region: "ru"` or `region: "ir"` and a source-local category ID.
- The adapters expose category metadata to the mapping layer without assigning a final policy action.

- [ ] **Step 1: Extend fixtures with Russia blocked/local categories and Iran local/security categories.** Keep the fixture small but include one duplicate with v2fly and one category that must be rejected when its format is unknown.
- [ ] **Step 2: Add failing tests for region tags and category preservation.** Assert Russia entries never appear in a `cn` snapshot and Iran entries never appear in a `ru` snapshot.
- [ ] **Step 3: Implement both adapters using the validated contract.** Parse only the pinned, documented source files selected by the catalog; reject the oversized all-domain input when it exceeds the configured source budget instead of silently truncating it.
- [ ] **Step 4: Add third-party notices.** Record repository name, pinned commit/release, license, and the fact that the project transforms the data into client-specific artifacts.
- [ ] **Step 5: Run the focused adapter tests.**

Run: `node --test automation/test/external-source-adapters.test.js`

- [ ] **Step 6: Commit.**

```bash
git add automation/src/rule-sources/russia-v2ray-rules.js automation/src/rule-sources/iran-v2ray-rules.js automation/src/rule-sources/adapter-contract.js automation/test/external-source-adapters.test.js THIRD_PARTY_NOTICES.md
git commit -m "feat: add regional Russia and Iran rule adapters"
```

### Task 5: Implement source merge, provenance, and deterministic policy mapping

**Files:**
- Create: `shared/rules/source-mappings.js`
- Create: `automation/src/merge-rule-sources.js`
- Modify: `shared/rules/lightweight-policy.js`
- Modify: `shared/rules/semantic-intents.js`
- Test: `automation/test/merge-rule-sources.test.js`

**Interfaces:**
- `mergeRuleSources({ snapshots, region, userRules, adblockMode })` returns `{ ruleSets, decisions, provenance, diagnostics }`.
- `ruleSets` is a `Map<string, { id, entries, policy, phase, dnsClass, region, sources }>`.
- `decisions` is a deterministic list of `RouteDecision` records with `action`, `policyGroup`, `priority`, `reason`, and `matchedSources`.
- `explainRoute({ hostname, ip, merged })` returns the winning decision without performing DNS or network I/O.

- [ ] **Step 1: Write failing merge tests.** Include a user override over a business rule, a security rule over a region overlay, a duplicate domain from two upstream projects, and a ChinaIP fallback after ChinaTLD.
- [ ] **Step 2: Run the merge tests to verify failure.**

Run: `node --test automation/test/merge-rule-sources.test.js test/external-rule-routing.test.js`

Expected: FAIL because the mapping and merge functions do not exist.

- [ ] **Step 3: Implement `source-mappings.js`.** Map source-local categories to existing semantic intent IDs or explicit actions. Keep `DIRECT`, `PROXY`, and `REJECT` mapping outside the parsers.
- [ ] **Step 4: Implement deterministic deduplication.** Normalize entries, merge `noResolve` conservatively, retain all provenance, and sort by precedence, matcher specificity, source ID, and value.
- [ ] **Step 5: Implement region selection and conflict resolution.** Apply the exact precedence from the spec and throw on two equal-priority mappings that produce different actions without an explicit mapping decision.
- [ ] **Step 6: Add `explainRoute` integration.** Reuse the existing `explain:route` command’s local-only behavior and include source IDs/commits without exposing node data. Leave the cross-client external routing corpus to Task 12 so it is created once.
- [ ] **Step 7: Run tests and verify pass.**

Run: `node --test automation/test/merge-rule-sources.test.js test/external-rule-routing.test.js test/rule-model.test.js test/cross-client-routing.test.js`

- [ ] **Step 8: Commit.**

```bash
git add shared/rules/source-mappings.js automation/src/merge-rule-sources.js shared/rules/lightweight-policy.js shared/rules/semantic-intents.js automation/test/merge-rule-sources.test.js test/external-rule-routing.test.js
git commit -m "feat: merge external rules into unified routing policy"
```

### Task 6: Generate region-specific Xray GeoData and manifests

**Files:**
- Create: `automation/src/render-region-geodata.js`
- Modify: `automation/src/render-xray-geodata.js`
- Modify: `clients/onexray/src/geodata-contract.js`
- Test: `automation/test/region-geodata.test.js`, `clients/onexray/test/geodata.test.js`

**Interfaces:**
- `buildRegionGeoDataArtifacts({ merged, region, channel, publicBase })` returns `{ geosite, geoip, manifest }` as buffers/JSON with SHA-256 records.
- `renderRegionGeoData({ ruleSets, region, channel })` produces stable category codes for existing intents and external overlays.
- Existing `renderXrayGeoData(snapshot, channel)` remains backward compatible for OneXray fixtures.

- [ ] **Step 1: Write failing tests for four region manifests.** Assert stable category codes, no Russia categories in `cn`, no Iran categories in `ru`, deterministic bytes, valid protobuf decode, and manifest hashes matching exact asset bytes.
- [ ] **Step 2: Run the focused GeoData tests to verify failure.**

Run: `node --test automation/test/region-geodata.test.js clients/onexray/test/geodata.test.js`

- [ ] **Step 3: Implement region code allocation.** Reserve existing OneXray codes; derive new codes from a checked-in slug map so source/category IDs do not change when source order changes.
- [ ] **Step 4: Implement GeoData rendering and manifest closure.** Use the existing protobuf schema and byte/hash helpers; include source commits, region, category counts, omitted kinds, and generated asset hashes.
- [ ] **Step 5: Keep OneXray output stable.** Adapt the shared renderer without changing existing category names or the current OneXray manifest contract.
- [ ] **Step 6: Run focused tests and verify pass.**

Run: `node --test automation/test/region-geodata.test.js clients/onexray/test/geodata.test.js`

- [ ] **Step 7: Commit.**

```bash
git add automation/src/render-region-geodata.js automation/src/render-xray-geodata.js clients/onexray/src/geodata-contract.js automation/test/region-geodata.test.js clients/onexray/test/geodata.test.js
git commit -m "feat: publish region-specific xray geodata"
```

### Task 7: Extract shared Xray node rendering primitives

**Files:**
- Create: `shared/nodes/render-xray-outbound.js`
- Modify: `clients/onexray/src/render-outbound.js`
- Modify: `clients/onexray/src/render-subscription.js`
- Test: `clients/onexray/test/render-outbound.test.js`, `test/capabilities.test.js`

**Interfaces:**
- `renderXrayOutbound(node, { tag, client })` returns one validated Xray outbound object.
- `renderXraySubscription({ nodes, client })` returns a newline-terminated JSON string containing `outbounds`.
- `renderXrayNodeError(error, client)` converts private node failures into count-only diagnostics.

- [ ] **Step 1: Move the existing OneXray fixture assertions into shared primitive tests without changing expected bytes.**
- [ ] **Step 2: Run the OneXray tests and verify the new shared exports fail.**
- [ ] **Step 3: Extract the protocol/transport/security mapping, parameterize the client label, and keep OneXray’s public exports as compatibility wrappers.**
- [ ] **Step 4: Add capability tests for v2rayN and V2Box using only fixtures with lossless Xray mappings.**
- [ ] **Step 5: Run focused tests.**

Run: `node --test clients/onexray/test test/capabilities.test.js`

- [ ] **Step 6: Commit.**

```bash
git add shared/nodes/render-xray-outbound.js clients/onexray/src/render-outbound.js clients/onexray/src/render-subscription.js clients/onexray/test/render-outbound.test.js test/capabilities.test.js
git commit -m "refactor: share xray node rendering primitives"
```

### Task 8: Implement the v2rayN client package

**Files:**
- Create: `clients/v2rayn/package.json`
- Create: `clients/v2rayn/src/options.js`
- Create: `clients/v2rayn/src/render-node.js`
- Create: `clients/v2rayn/src/render-profile.js`
- Create: `clients/v2rayn/src/substore-node-entry.js`
- Create: `clients/v2rayn/src/substore-config-entry.js`
- Create: `clients/v2rayn/scripts/build.mjs`
- Create: `clients/v2rayn/scripts/render-fixtures.mjs`
- Create: `clients/v2rayn/test/options.test.js`, `clients/v2rayn/test/profile.test.js`, `clients/v2rayn/test/substore-entry.test.js`
- Create: `clients/v2rayn/README.md`

**Interfaces:**
- `parseV2rayNOptions(raw)` accepts `output=nodes|config`, `type=collection`, `name`, `subscriptionName`, `platform=windows|macos`, `region`, and the existing DNS/block/IPv6/QUIC/chain options.
- `renderV2rayNSubscription({ nodes })` returns newline-terminated Xray-compatible JSON for the node task.
- `renderV2rayNProfile({ nodes, options, geoData })` returns a JSON object with DNS, TUN/inbounds, outbounds, and routing rules.
- `operator(input, targetPlatform, context)` follows the existing HAPP/OneXray private Sub-Store operator contract.

- [ ] **Step 1: Write failing option and profile tests.** Assert required fields, region defaults, platform rejection, empty collection rejection, deterministic node tags, `geosite`/`geoip` references, and final proxy fallback after China rules.
- [ ] **Step 2: Run the package tests to verify failure.**

Run: `npm --workspace @apple-proxy-profiles/v2rayn test`

Expected: FAIL because the workspace and source files do not exist.

- [ ] **Step 3: Create the package and option parser.** Reuse `validateCollectionName`, `OPTION_VALUES`, and the existing channel validation pattern; reject unknown hash parameters and malformed policy overrides.
- [ ] **Step 4: Implement node rendering through `renderXraySubscription`.** Normalize the Sub-Store collection, call `filterNodesForClient`, and return count-only `renderFailures` for incompatible nodes.
- [ ] **Step 5: Implement the profile renderer.** Reuse shared Xray outbound rendering, existing policy target names, DNS mode helpers, `region` GeoData references, and `blockMode` behavior. Keep all private node values confined to `$content`.
- [ ] **Step 6: Implement both Sub-Store operators.** Require `output=nodes` for the node entry and `output=config` for the profile entry; use `context.produceArtifact({ type, name, platform: "JSON", produceType: "internal" })`.
- [ ] **Step 7: Add build and fixture scripts.** Bundle the operators with `esbuild` and generate Windows/macOS fixture JSON containing only test nodes.
- [ ] **Step 8: Run package tests and verify pass.**

Run: `npm --workspace @apple-proxy-profiles/v2rayn test && npm --workspace @apple-proxy-profiles/v2rayn run build && npm --workspace @apple-proxy-profiles/v2rayn run fixtures`

- [ ] **Step 9: Commit.**

```bash
git add clients/v2rayn
git commit -m "feat: add v2rayn client renderer"
```

### Task 9: Implement the V2Box client package

**Files:**
- Create: `clients/v2box/package.json`
- Create: `clients/v2box/src/options.js`
- Create: `clients/v2box/src/render-node.js`
- Create: `clients/v2box/src/render-profile.js`
- Create: `clients/v2box/src/render-assets.js`
- Create: `clients/v2box/src/substore-node-entry.js`
- Create: `clients/v2box/src/substore-config-entry.js`
- Create: `clients/v2box/scripts/build.mjs`
- Create: `clients/v2box/scripts/render-fixtures.mjs`
- Create: `clients/v2box/test/options.test.js`, `clients/v2box/test/profile.test.js`, `clients/v2box/test/assets.test.js`, `clients/v2box/test/substore-entry.test.js`
- Create: `clients/v2box/README.md`

**Interfaces:**
- `parseV2BoxOptions(raw)` accepts the same policy options as v2rayN with `platform=iphone|ipad` and `region=cn|global|ru|ir`.
- `renderV2BoxSubscription({ nodes })` returns the client’s tested importable node subscription format.
- `renderV2BoxProfile({ nodes, options, assetManifest })` returns the tested V2Box/Xray JSON profile.
- `renderV2BoxAssetManifest({ region, channel, publicBase, geositeSha256, geoipSha256 })` returns stable asset URLs and hashes.
- `operator(input, targetPlatform, context)` follows the private Sub-Store operator contract and never embeds credentials in public artifacts.

- [ ] **Step 1: Write failing tests for V2Box option parsing, JSON shape, assets, and platform-specific defaults.** Include both asset-backed output and the small inline fallback rules.
- [ ] **Step 2: Run the package tests to verify failure.**

Run: `npm --workspace @apple-proxy-profiles/v2box test`

Expected: FAIL because the workspace and source files do not exist.

- [ ] **Step 3: Implement the option parser and node subscription renderer.** Use the shared Xray protocol boundary and preserve duplicate-name/error behavior.
- [ ] **Step 4: Implement the asset manifest renderer.** Generate channel-relative URLs under `geodata/<region>/`, include SHA-256 values, and reject a manifest whose URL channel or region does not match the profile.
- [ ] **Step 5: Implement the profile renderer.** Emit the exact verified V2Box JSON fields, reference project Geo Assets by stable names/URLs where supported, and include inline business/security rules needed for a safe startup fallback.
- [ ] **Step 6: Implement Sub-Store operators and bundle scripts.** Keep node data private; public bundles contain only code and safe default URLs.
- [ ] **Step 7: Run package tests, bundle generation, and fixture rendering.**

Run: `npm --workspace @apple-proxy-profiles/v2box test && npm --workspace @apple-proxy-profiles/v2box run build && npm --workspace @apple-proxy-profiles/v2box run fixtures`

- [ ] **Step 8: Commit.**

```bash
git add clients/v2box
git commit -m "feat: add v2box client renderer"
```

### Task 10: Integrate unified snapshots, GeoData, and client artifacts into publication

**Files:**
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `shared/release/channel-closure.js`
- Modify: `scripts/verify.mjs`
- Modify: `test/public.test.js`, `automation/test/build-artifacts.test.js`, `automation/test/native-publication.test.js`, `automation/test/build-site.test.js`

**Interfaces:**
- `buildClientArtifacts({ snapshot, externalSnapshots, regions, upstream, channel, additionalFiles })` returns default and optional maps containing v2rayN/V2Box scripts, region GeoData, asset manifests, and client manifests.
- `buildRegionGeoDataArtifacts` from Task 6 is called once per selected region, not once per client.
- `CLIENT_PUBLIC_PATHS` and channel closure include the two new public directories.

- [ ] **Step 1: Add failing publication assertions.** Require `v2rayn/client-manifest.json`, `v2box/client-manifest.json`, shared `geodata/<region>/manifest.json` for `cn`, `global`, `ru`, and `ir`, and all bundled scripts in the manifest closure. Client manifests must reference the shared asset records instead of duplicating GeoData files.
- [ ] **Step 2: Run publication tests to verify failure.**

Run: `node --test automation/test/build-artifacts.test.js automation/test/native-publication.test.js automation/test/build-site.test.js test/public.test.js`

- [ ] **Step 3: Wire external snapshot loading and region compilation into the artifact build.** Preserve the existing lightweight source snapshots and optional adblock pack behavior.
- [ ] **Step 4: Add v2rayN/V2Box public script collection.** Use generated `dist` bundles; reject empty bundles and duplicate paths.
- [ ] **Step 5: Add shared GeoData files and per-client manifest references.** Account for binary bytes with `artifactBuffer`, `artifactByteLength`, and `artifactSha256`.
- [ ] **Step 6: Add channel rewrite/rebind handling.** Every URL, GeoData manifest, and asset manifest must point to the active channel after `edge/current/previous` publication.
- [ ] **Step 7: Run publication tests and verify pass.**

Run: `node --test automation/test/build-artifacts.test.js automation/test/native-publication.test.js automation/test/build-site.test.js test/public.test.js`

- [ ] **Step 8: Commit.**

```bash
git add automation/src/build-artifacts.js automation/src/build-site.js shared/release/channel-closure.js scripts/verify.mjs test/public.test.js automation/test/build-artifacts.test.js automation/test/native-publication.test.js automation/test/build-site.test.js
git commit -m "feat: publish v2rayn and v2box artifacts"
```

### Task 11: Add canonical Sub-Store tasks and maintenance documentation

**Files:**
- Modify: `scripts/configure-substore.mjs`
- Modify: `scripts/check-substore-task.mjs`
- Modify: `docs/substore-client-pools.md`
- Modify: `docs/maintenance.md`
- Modify: `README.md`
- Modify: `docs/implementation-status.md`
- Modify: `test/private-substore-config.test.js`, `test/substore-task-check.test.js`, `test/substore-docs.test.js`

**Interfaces:**
- `canonicalTaskCatalog(channel)` returns 34 tasks: the existing 28 plus six v2rayN/V2Box tasks.
- `COLLECTIONS` contains `apple-proxy-v2rayn` and `apple-proxy-v2box`.
- Every new config task includes `region=cn`, `dnsMode=stable`, `blockMode=balanced`, `quicMode=proxy-block`, `ipv6Mode` appropriate to platform, and `clientChain=off` by default.
- `buildPrivateSubstoreConfig` and `validatePrivateSubstoreConfig` continue to write mode `0600` and reject any real private URL in public fixtures.

- [ ] **Step 1: Update tests first.** Change the expected collection/task counts and assert exact task names, scripts, platforms, regions, and collection slugs.
- [ ] **Step 2: Run focused Sub-Store tests to verify failure.**

Run: `node --test test/private-substore-config.test.js test/substore-task-check.test.js test/substore-docs.test.js`

- [ ] **Step 3: Add the two collections and six tasks.** Use `v2rayn-node-generator.js`, `v2rayn-config-generator.js`, `v2box-node-generator.js`, and `v2box-config-generator.js` with hash parameters only.
- [ ] **Step 4: Add region parameter parsing to task validation.** Reject `region=ru` on a malformed client task and reject unknown URL hash keys.
- [ ] **Step 5: Update the pool table, task table, import steps, failure checks, and rollback instructions.** State that the user selects nodes in the two new collections and the generator does not own node selection.
- [ ] **Step 6: Run focused tests and verify pass.**

Run: `node --test test/private-substore-config.test.js test/substore-task-check.test.js test/substore-docs.test.js`

- [ ] **Step 7: Commit.**

```bash
git add scripts/configure-substore.mjs scripts/check-substore-task.mjs docs/substore-client-pools.md docs/maintenance.md README.md docs/implementation-status.md test/private-substore-config.test.js test/substore-task-check.test.js test/substore-docs.test.js
git commit -m "feat: add v2rayn and v2box substore tasks"
```

### Task 12: Add cross-client semantic and failure-closure tests

**Files:**
- Create: `test/region-routing.test.js`
- Create: `test/external-rule-routing.test.js`
- Modify: `test/cross-client-routing.test.js`
- Modify: `test/rule-budgets.test.js`
- Create: `clients/v2rayn/test/import-closure.test.js`
- Create: `clients/v2box/test/import-closure.test.js`
- Modify: `automation/test/rule-manifest.test.js`

**Interfaces:**
- Shared fixtures use `{ description, subject: { domain, ip }, expectedPolicy, expectedTarget, regions, clients }`.
- Each renderer exposes a test-only route explanation or normalized rule output so tests compare semantics rather than formatting.
- Import-closure tests verify every GeoData reference has a published asset and every asset hash matches its manifest.

- [ ] **Step 1: Add the semantic corpus.** Include existing AI/media/social/game/domestic cases plus one hit for each external source and one duplicate/conflict case.
- [ ] **Step 2: Add region matrix assertions.** Verify Russia-only and Iran-only categories are absent outside their selected region and that `cn` preserves the previous default decisions.
- [ ] **Step 3: Add client equivalence assertions.** Compare v2rayN, V2Box, OneXray, HAPP, sing-box, Surge, Shadowrocket, Egern, and Anywhere where each client can represent the matcher.
- [ ] **Step 4: Add failure-closure assertions.** Corrupt a GeoData byte, delete a manifest record, use an unknown category code, and provide an unsupported node protocol; each case must fail with a count-only diagnostic and no leaked node values.
- [ ] **Step 5: Run the focused cross-client suite.**

Run: `node --test test/region-routing.test.js test/external-rule-routing.test.js test/cross-client-routing.test.js test/rule-budgets.test.js automation/test/rule-manifest.test.js clients/v2rayn/test/import-closure.test.js clients/v2box/test/import-closure.test.js`

- [ ] **Step 6: Commit.**

```bash
git add test/region-routing.test.js test/external-rule-routing.test.js test/cross-client-routing.test.js test/rule-budgets.test.js automation/test/rule-manifest.test.js clients/v2rayn/test/import-closure.test.js clients/v2box/test/import-closure.test.js
git commit -m "test: enforce cross-client region rule equivalence"
```

### Task 13: Add verification commands and release documentation

**Files:**
- Modify: `package.json`
- Modify: `clients/v2rayn/package.json`
- Modify: `clients/v2box/package.json`
- Modify: `scripts/verify.mjs`
- Modify: `README.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Root scripts expose `verify:v2rayn`, `verify:v2box`, and include both in `verify:lightweight` or the native-client verification chain.
- Each workspace exposes `test`, `build`, `fixtures`, `check:secrets`, and `verify`.
- `npm run verify` remains the single release gate.

- [ ] **Step 1: Add failing script/catalog assertions.** Assert the two workspaces are included by `npm --workspaces --if-present` and that `verify` reports both clients.
- [ ] **Step 2: Add workspace scripts and root verification entries.** Use the existing Node 22, `node:test`, esbuild, fixture, and secret-scan patterns.
- [ ] **Step 3: Document the two new clients, their private collections, region parameter examples, Geo Assets behavior, and rollback path.** Use only synthetic URLs and test node values.
- [ ] **Step 4: Run the workspace verification commands.**

Run: `npm --workspace @apple-proxy-profiles/v2rayn run verify && npm --workspace @apple-proxy-profiles/v2box run verify`

- [ ] **Step 5: Commit.**

```bash
git add package.json clients/v2rayn/package.json clients/v2box/package.json scripts/verify.mjs README.md docs/maintenance.md docs/implementation-status.md
git commit -m "docs: document v2rayn and v2box verification"
```

### Task 14: Run the complete release gate and inspect generated artifacts

**Files:**
- Modify only generated `public/edge` or fixture outputs if the existing build scripts require regeneration; never hand-edit generated production artifacts.
- Test: all repository tests and both new workspaces.

- [ ] **Step 1: Run the full test suite.**

Run: `npm test`

Expected: PASS with no secret-scan failures and no changed existing-client semantic expectations except those explicitly covered by the new merged source fixtures.

- [ ] **Step 2: Build all workspaces and publication artifacts.**

Run: `npm run build && npm run fixtures`

Expected: non-empty bundles for all nine clients, deterministic fixtures, region GeoData manifests, and no duplicate public paths.

- [ ] **Step 3: Run the release verification gate.**

Run: `npm run verify`

Expected: source pins, parser counts, rule budgets, GeoData closure, client manifests, channel closure, Sub-Store task URLs, and secret scans all pass.

- [ ] **Step 4: Inspect the generated manifest records.**

Run: `node --input-type=module - <<'NODE'
import { readFile } from "node:fs/promises";
for (const path of [
  "public/edge/v2rayn/client-manifest.json",
  "public/edge/v2box/client-manifest.json",
  "public/edge/geodata/cn/manifest.json",
  "public/edge/geodata/ru/manifest.json",
  "public/edge/geodata/ir/manifest.json",
]) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!value || typeof value.manifestHash !== "string") throw new Error(`invalid manifest: ${path}`);
  console.log(path, value.manifestHash);
}
NODE`

- [ ] **Step 5: Run the local route explainer against one baseline and one overlay case.**

Run: `node scripts/explain-route.mjs --region cn --domain openai.example.invalid` and `node scripts/explain-route.mjs --region ru --domain ru-overlay.example.invalid`

Expected: output contains the selected region, winning policy, and source provenance; it performs no DNS or network request.

- [ ] **Step 6: Review the final diff for private data and generated-path drift.**

Run: `git diff --check && npm run check:secrets && git status --short`

Expected: no whitespace errors, no private node values, and only intended source/docs/generated fixture changes.

- [ ] **Step 7: Commit the final verified implementation.**

```bash
git add shared automation clients scripts test docs README.md package.json THIRD_PARTY_NOTICES.md
git commit -m "feat: integrate unified rules with v2rayn and v2box"
```

## Review Checkpoints

1. After Task 2: approve pinned source IDs, region names, and the exact source snapshot contract.
2. After Task 5: inspect the merged rule snapshot and precedence audit before client work begins.
3. After Task 9: inspect v2rayN/V2Box fixture JSON and Geo Assets manifest URLs.
4. After Task 11: inspect the generated 34-task Sub-Store catalog and private/public boundary.
5. After Task 14: review the complete verification output before promoting from `edge` to `current`.
