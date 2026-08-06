# sing-box and source-boundary fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make current sing-box configurations start successfully and ensure Egern, Anywhere, Shadowrocket, Surge, and sing-box all receive the same compact, source-aware node names without a processed inventory being normalized a second time.

**Architecture:** Keep `apple-proxy-sources` as a raw two-source combination containing only the selected Snell and VLESS/Hysteria2 sources. Create a separate `shadowrocket-nodes` combination with the Shadowrocket node operator. Shadowrocket Profile files read the processed combination; every other client reads the raw combination and performs exactly one normalization. Represent sing-box DoH providers as structured HTTPS server fields (`server`, `server_port`, `path`, `tls`) rather than complete URLs.

**Tech Stack:** ESM JavaScript, Node.js built-in test runner, esbuild bundles, Sub-Store Script/File Operators, Markdown documentation, GitHub Pages artifacts.

## Global Constraints

- Work only in `/Users/sunyuze/Documents/代理软件/apple-proxy-profiles/.worktrees/latest-client-fixes` on `agent/latest-client-fixes`.
- Do not put the user’s Sub-Store URL, node credentials, UUIDs, passwords, or private output URLs in the repository, tests, logs, commits, or final response.
- Use `apply_patch` for source, test, and documentation edits.
- Follow test-driven development: add each regression test, run it to observe the expected failure, then implement the smallest fix.
- Preserve the already-introduced sing-box HTTP client/rule-set changes and compact-name behavior unless a regression test proves they need adjustment.
- Do not merge directly to `main`; push the completed branch and update the existing draft PR. Do not change live Sub-Store tasks until the public `current`/`edge` artifact containing these fixes is available.

## Task 1: Lock the sing-box DNS contract with failing tests

**Files:** `clients/sing-box/test/config.test.js`, `clients/sing-box/test/validation.test.js`, `clients/sing-box/src/render-dns.js` (read-only until the tests fail).

- [ ] Add a provider-table test that renders Cloudflare, Google, and Quad9 and asserts each `type: "https"` server has a host-only `server`, a valid `server_port`, a `/dns-query` path, and the expected TLS server name; assert no `server` value starts with `http://` or `https://`.
- [ ] Add a validation regression test that rejects a structured HTTPS server containing a complete URL or an embedded path and accepts the structured form.
- [ ] Run the focused sing-box tests with the bundled Node runtime and record the failure before changing production code.

## Task 2: Fix and validate structured DoH generation

**Files:** `clients/sing-box/src/render-dns.js`, `clients/sing-box/src/validate-config.js`, `clients/sing-box/test/config.test.js`, `clients/sing-box/test/validation.test.js`.

- [ ] Replace the global DoH URL strings with immutable provider descriptors for Cloudflare (`1.1.1.1`/`cloudflare-dns.com`), Google (`8.8.8.8`/`dns.google`), and Quad9 (`9.9.9.9`/`dns.quad9.net`).
- [ ] Render the proxy DNS server with the sing-box structured HTTPS schema: `server`, `server_port: 443`, `path: "/dns-query"`, TLS identity, and the existing detour/tag semantics.
- [ ] Extend config validation so structured HTTPS servers reject schemes, query strings, or path components in `server`, require a leading-slash path, and require a valid port when present. Keep non-HTTPS DNS server validation unchanged.
- [ ] Run the focused tests and inspect the generated JSON to confirm the malformed `https://https:%2F...` shape cannot be produced.

## Task 3: Add a raw/processed naming-boundary regression

**Files:** `shared/nodes/test/normalize-nodes.test.js` (or the existing shared naming test file), `clients/shadowrocket/test/substore-profile-entry.test.js`, `clients/egern/test/substore-profile-entry.test.js`, `clients/anywhere/test/substore.test.js`, `clients/surge/test/substore-profile-entry.test.js`, `clients/sing-box/test/substore-config-entry.test.js`.

- [ ] Add a canonical raw fixture with `[未标记] [自建]` metadata and a Snell/VLESS-HY2 capability, then assert one normalization produces a compact name such as `🇭🇰 Boil-HKT｜自建·U` with no `未知`, duplicated source marker, or repeated capability suffix.
- [ ] Add boundary assertions that Shadowrocket’s node operator consumes and returns the processed inventory, while the other four profile/config operators request the raw `apple-proxy-sources` collection and normalize that raw inventory once.
- [ ] Run these tests before changing the Sub-Store-facing constants/docs so the test demonstrates the current processed-combo reuse failure where applicable.

## Task 4: Implement the source-boundary contract

**Files:** client Sub-Store entry modules and shared naming modules only where the new tests identify a code-level boundary defect; otherwise keep the boundary in the documented Sub-Store topology.

- [ ] Keep the common collection name for raw consumers as `apple-proxy-sources` and make the Shadowrocket profile entry use a distinct `shadowrocket-nodes` collection name/argument.
- [ ] Ensure no Egern, Anywhere, Surge, or sing-box generator consumes Shadowrocket’s processed node output or a node-operator result.
- [ ] Preserve source provenance through the raw inventory so the shared normalizer can use Sub-Store markers and emit the same compact name across clients.
- [ ] Add or adjust only the minimum code needed for the boundary tests; do not add a second normalization pass or make client generators depend on each other.

## Task 5: Update deployment and migration documentation

**Files:** `README.md`, `docs/substore-two-layer-setup.md`, `docs/maintenance.md`, `clients/shadowrocket/README.md`, `clients/shadowrocket/docs/deployment.md`, `clients/egern/README.md`, `clients/egern/docs/deployment.md`, `clients/anywhere/README.md`, `clients/surge/README.md`, `clients/sing-box/README.md`, `clients/sing-box/docs/troubleshooting.md`.

- [ ] Document the two-combination topology, the shared source-selection/tag invariant, and the exact argument change: only Shadowrocket Profile tasks use `name=shadowrocket-nodes`; Egern/Anywhere/Surge/sing-box continue to use `name=apple-proxy-sources`.
- [ ] Document the migration order: create/preview processed output, canary Shadowrocket, detach the old operator from the raw combination, then re-preview the four raw consumers; keep old Profile URLs for rollback.
- [ ] Add the sing-box symptom and recovery note explaining that a structured HTTPS DNS server must not receive a complete DoH URL.
- [ ] Update docs tests and run them; do not include real private URLs.

## Task 6: Rebuild deterministic public artifacts

**Files:** generated `clients/*/dist/**` files and any checked-in examples/fixtures produced by the repository build scripts.

- [ ] Run the existing build scripts for sing-box and the affected client bundles with the bundled Node/esbuild runtime.
- [ ] Regenerate sing-box examples/fixtures if the repository script requires it, then inspect the diff for credentials or private Sub-Store values.
- [ ] Run bundle smoke tests to ensure the public scripts still expose only their documented globals and accept the existing hash arguments.

## Task 7: Full verification and publication

**Files:** none unless verification exposes a regression.

- [ ] Run all five client test suites, shared naming tests, docs tests, `scripts/update-rules.mjs --check`, `scripts/check-actions.mjs`, `scripts/check-secrets.mjs`, and the repository verification script with the bundled runtime.
- [ ] If a sing-box binary is available, run its config check against every generated platform example and perform one remote rule-set/DNS initialization check; otherwise record the exact unavailable-binary limitation without claiming runtime validation.
- [ ] Review `git diff --check`, `git status`, and the public-artifact diff for secrets and accidental unrelated changes.
- [ ] Commit the implementation in focused commits, push `agent/latest-client-fixes` to the user’s GitHub repository over HTTPS, and update draft PR #4 with the new root causes, migration order, and verification evidence.
- [ ] Do not switch the live Sub-Store combinations in this step if the Pages `current` artifact has not deployed; provide the exact post-deploy Sub-Store migration actions and rollback check instead.

## Task 8: Post-deploy Sub-Store canary (only after the public artifact is available)

**External state:** the user’s authenticated Sub-Store account; no repository files.

- [ ] Create `shadowrocket-nodes` from the same two selected sources (prefer a shared source tag; otherwise manually verify membership), leaving `apple-proxy-sources` unchanged.
- [ ] Attach the Shadowrocket node operator only to `shadowrocket-nodes`, preview it, and verify a non-empty processed node list with compact names.
- [ ] Update the three Shadowrocket Profile tasks to `name=shadowrocket-nodes` and canary-import them without overwriting the old Profile.
- [ ] After Shadowrocket passes, remove the operator from `apple-proxy-sources` and re-preview Egern, Anywhere, Surge, and sing-box; keep the old private URLs/Profiles until all five clients pass.
