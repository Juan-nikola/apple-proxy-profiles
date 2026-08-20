# HAPP JSON Runtime Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HAPP's full Xray JSON subscription parse and initialize consistently on all six platforms while preserving exact fixed-node business routing.

**Architecture:** Xray JSON is the sole routing control plane. A provider-owned HAPP profile is attached to every platform only to supply tunnel DNS and retain the complete GeoData label closure required by the JSON.

**Tech Stack:** Node.js ES modules, Node test runner, Sub-Store script API, Xray JSON, V2Ray GeoData protobuf, official Xray CLI.

**Spec:** `docs/superpowers/specs/2026-08-20-happ-json-runtime-reliability-design.md`

## Global Constraints

- Preserve `DIRECT`, `FOLLOW`, and `NODE:<exact node name>` policy behavior.
- Use `current` for users; `edge` is candidate-only and `previous` is rollback-only.
- Never expose node credentials, private File URLs, policy overrides, or full device logs in public artifacts.
- Do not claim a platform is usable until a fresh real-device canary passes.

---

### Task 1: Enforce Profile And JSON GeoData Closure

**Files:**
- Modify: `clients/happ/test/routing-profile.test.js`
- Modify: `clients/happ/test/geodata.test.js`
- Modify: `clients/happ/src/geodata-contract.js`
- Modify: `clients/happ/src/routing-profile-data.js`

**Interfaces:**
- Consumes: `renderHappRoutingProfile`, `renderHappSubscription`, `decodeHappGeodata`
- Produces: shared profile label arrays containing all JSON-referenced GeoData labels

- [ ] **Step 1: Write a failing profile test**

Assert that `DirectIp` contains `geoip:PRIVATE` and that every `geoip:` or
`geosite:` reference collected from a rendered subscription exists in the
profile's Direct/Proxy/Block lists.

- [ ] **Step 2: Run the targeted tests and verify the expected failure**

Run: `npm --workspace @apple-proxy-profiles/happ test -- --test-name-pattern='routing profile|GeoData'`

Expected: FAIL because `geoip:PRIVATE` is referenced by JSON but absent from
the profile IP lists.

- [ ] **Step 3: Implement the minimal shared contract change**

Add `geoip:PRIVATE` to the exported HAPP profile IP contract and keep profile
rendering dependent on that contract rather than a duplicate literal.

- [ ] **Step 4: Run the targeted tests and verify they pass**

Run: `npm --workspace @apple-proxy-profiles/happ test -- --test-name-pattern='routing profile|GeoData'`

Expected: PASS.

### Task 2: Bind The Provider Profile On All Platforms

**Files:**
- Modify: `clients/happ/test/substore-entry.test.js`
- Modify: `clients/happ/src/substore-config-entry.js`

**Interfaces:**
- Consumes: Sub-Store `$options._res.headers`
- Produces: a `routing: happ://routing/onadd/<base64>` response header for each supported platform

- [ ] **Step 1: Replace the non-iOS exclusion test with a six-platform test**

For `macos`, `iphone`, `ipad`, `android`, `windows`, and `linux`, run the
operator with real response options and assert that the routing header exists,
uses the requested channel, and includes `geoip:PRIVATE`.

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `npm --workspace @apple-proxy-profiles/happ test -- --test-name-pattern='response headers'`

Expected: FAIL for macOS, Android, Windows, and Linux.

- [ ] **Step 3: Remove the platform-specific header guard**

Attach the same provider profile for every platform accepted by HAPP options.

- [ ] **Step 4: Run the test and verify all six platforms pass**

Run: `npm --workspace @apple-proxy-profiles/happ test -- --test-name-pattern='response headers'`

Expected: PASS.

### Task 3: Validate Generated JSON With Official Xray

**Files:**
- Create: `scripts/check-happ-xray.mjs`
- Modify: `package.json`
- Modify: `clients/happ/test/core.test.js`
- Modify as required by validation: `clients/happ/src/render-dns.js`
- Modify as required by validation: `clients/happ/src/render-routing.js`
- Modify as required by validation: `clients/happ/src/render-platform.js`

**Interfaces:**
- Consumes: HAPP example JSON, published GeoData files, `XRAY_BIN`
- Produces: `npm run check:happ-xray` with nonzero exit on any invalid platform configuration

- [ ] **Step 1: Add a failing static/runtime validation test**

The checker must reject missing binaries, absent GeoData labels, invalid Xray
JSON, unknown fields, and configs that fail `xray run -test`.

- [ ] **Step 2: Run the checker against the current generated fixture**

Run: `XRAY_BIN=/absolute/path/to/xray npm run check:happ-xray`

Expected: FAIL on the first real incompatibility, with the platform and config
index identified but without printing credentials.

- [ ] **Step 3: Make only evidence-driven renderer corrections**

Remove or relocate fields only when the official core rejects them. Preserve
fixed outbounds, routing targets, and DNS semantics.

- [ ] **Step 4: Rebuild fixtures and verify runtime parsing**

Run: `npm --workspace @apple-proxy-profiles/happ run build && npm run fixtures && XRAY_BIN=/absolute/path/to/xray npm run check:happ-xray`

Expected: PASS for all six generated platform fixtures.

### Task 4: Document The JSON Operating Model

**Files:**
- Modify: `clients/happ/README.md`
- Modify: `clients/happ/docs/deployment.md`
- Modify: `clients/happ/docs/troubleshooting.md`
- Modify: `README.md`
- Modify: `test/substore-docs.test.js`

**Interfaces:**
- Consumes: the final all-platform binding and canary workflow
- Produces: one unambiguous operator procedure using `current`

- [ ] **Step 1: Add failing documentation assertions**

Assert that docs say JSON owns routing, the HAPP switch is expected to be
locked, all six File responses carry the profile, old subscriptions must be
deleted, and `edge` is candidate-only.

- [ ] **Step 2: Run the documentation test and verify failure**

Run: `node --test test/substore-docs.test.js`

Expected: FAIL until the operating model is documented.

- [ ] **Step 3: Update the documentation**

Describe the exact import order and state that an enabled/disabled HAPP routing
switch is not the authority for JSON configs.

- [ ] **Step 4: Run the documentation test and verify it passes**

Run: `node --test test/substore-docs.test.js`

Expected: PASS.

### Task 5: Verify And Publish A Candidate

**Files:**
- Generated: `clients/happ/dist/*`
- Generated: `clients/happ/examples/happ-config.json`
- Generated: `public/edge/happ/**`
- Generated: `public/edge/clients/happ/**`

**Interfaces:**
- Consumes: completed source changes and official Xray binary
- Produces: an immutable internal `edge` HAPP candidate and canary hash

- [ ] **Step 1: Run all verification gates**

Run:

```bash
npm test
npm run build
npm run fixtures
npm run check:rules
npm run check:secrets
npm run check:actions
XRAY_BIN=/absolute/path/to/xray npm run check:happ-xray
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Generate the internal edge candidate**

Run: `node scripts/update-rules.mjs --channel edge`

Expected: a new immutable HAPP client hash with public artifacts containing no
credentials.

- [ ] **Step 3: Verify the edge candidate again**

Run: `node scripts/update-rules.mjs --check --channel edge`

Expected: PASS.

- [ ] **Step 4: Perform real iOS and macOS canaries**

Delete the old HAPP subscription and bound profile, import the private edge
File URL, wait for both GeoData downloads, reconnect, and record only redacted
startup/routing outcomes.

- [ ] **Step 5: Promote only after canaries pass**

Use the repository's HAPP promotion command with the verified immutable hash
and real canary evidence. If either device fails, keep `current` unchanged and
return to the failing contract layer.
