# Shadowrocket Homepage Follow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `🚀 节点选择` an unambiguous alias of Shadowrocket's homepage-selected node while preserving direct defaults, automatic testing, fallback, regional selection, and the existing routing/stability fixes.

**Architecture:** Render the root selector as `select,PROXY` with no dynamic node source so Shadowrocket cannot persist a concrete node inside it. Move the automatic and fallback choices that were formerly reachable through the root selector into the foreign-service selectors; keep domestic selectors direct-first and keep AI/regional selectors independent. Regenerate distribution bundles and examples from source.

**Tech Stack:** JavaScript ES modules, Node.js built-in test runner, esbuild, Sub-Store/Shadowrocket INI profiles.

## Global Constraints

- Do not change Blackmatrix7 rules, Wendao direct rules, DNS, QUIC, IPv6, or other network-stability settings.
- `🚀 节点选择` must contain only the built-in `PROXY` policy and must not enumerate concrete nodes.
- Foreign service groups default to `🚀 节点选择` and retain explicit automatic-test, fallback, and direct choices.
- Domestic service groups default to `DIRECT` and retain `🚀 节点选择` as the alternate route.
- AI and regional groups retain their independent automatic-test and concrete-node behavior.
- Node-subscription display names remain arbitrary through `include-all-proxies=true` on groups that still enumerate nodes.
- README and deployment/canary documentation must explain both the generated behavior and the one-time Profile refresh needed on devices.

---

### Task 1: Lock the root selector to the homepage node

**Files:**
- Modify: `test/groups.test.js`
- Modify: `src/group-catalog.js`

**Interfaces:**
- Consumes: `buildGroups(options, nodes)` and the Shadowrocket built-in policy name `PROXY`.
- Produces: a root group object `{ name: "🚀 节点选择", type: "select", items: ["PROXY"] }` with no `useSubscription` or `filter` fields.

- [ ] **Step 1: Write the failing group-catalog test**

Assert that `🚀 节点选择` has exactly `items: ["PROXY"]`, has no dynamic subscription source, and that foreign service groups expose `🚀 节点选择`, `⚡ 全部自动`, `🛟 全部故障转移`, and `DIRECT` in that order while domestic service groups remain `DIRECT` then `🚀 节点选择`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/groups.test.js`

Expected: FAIL because the root selector still contains automatic, fallback, continent, and concrete-node candidates.

- [ ] **Step 3: Implement the minimal catalog change**

Create `🚀 节点选择` as a plain select group containing only `PROXY`. Add automatic and fallback candidates to proxy-first service groups; leave direct-first domestic groups unchanged. Do not alter AI, continent, game-connection, P2P, security, DNS, or rule definitions.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/groups.test.js`

Expected: all group tests pass.

### Task 2: Lock generated examples and validation behavior

**Files:**
- Modify: `test/examples.test.js`
- Modify: `examples/shadowrocket-macos.conf`
- Modify: `examples/shadowrocket-iphone.conf`
- Modify: `examples/shadowrocket-ipad.conf`
- Modify: `dist/substore-profile-generator.js`

**Interfaces:**
- Consumes: the group catalog and fixture renderer.
- Produces: generated profiles containing `🚀 节点选择 = select,PROXY` and no dynamic attributes on that line.

- [ ] **Step 1: Write the failing generated-profile assertions**

Assert the root line is exactly `🚀 节点选择 = select,PROXY`; assert GitHub contains the automatic/fallback choices; continue asserting AI and regional groups use `include-all-proxies=true`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/examples.test.js`

Expected: FAIL against the current examples.

- [ ] **Step 3: Rebuild generated files**

Run: `npm run build && npm run fixtures`

Expected: the distribution bundle and all three examples are regenerated from `src/`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/examples.test.js`

Expected: all generated-profile assertions pass.

### Task 3: Rewrite the operator documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/deployment.md`
- Modify: `docs/canary-checklist.md`
- Modify: `test/docs.test.js`

**Interfaces:**
- Consumes: the final generated policy hierarchy.
- Produces: user-facing instructions that distinguish homepage following from automatic testing and explain how to refresh the Profile.

- [ ] **Step 1: Write failing documentation assertions**

Require documentation to state that `🚀 节点选择` contains only `PROXY`, foreign groups default to it, domestic groups default to `DIRECT`, and automatic/fallback selection moved to foreign-service group choices.

- [ ] **Step 2: Run the documentation test and verify RED**

Run: `node --test test/docs.test.js`

Expected: FAIL because the current README says the root selector itself contains automatic, fallback, continent, and concrete-node choices.

- [ ] **Step 3: Update README and operating guides**

Replace the obsolete hierarchy description, add the one-time refresh procedure, retain the arbitrary subscription-name explanation, and retain the existing Blackmatrix7/Wendao/Mac stability documentation.

- [ ] **Step 4: Run the documentation test and verify GREEN**

Run: `node --test test/docs.test.js`

Expected: all documentation assertions pass.

### Task 4: Verify and publish

**Files:**
- Verify all intended source, test, documentation, distribution, and example changes.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: one reviewed commit published to `Juan-nikola/shadowrocket-profile`.

- [ ] **Step 1: Run the complete local verification**

Run: `npm run verify`

Expected: all tests pass; build, fixtures, and secret scan exit successfully.

- [ ] **Step 2: Run live rule validation**

Run: `npm run check:rules`

Expected: all configured Blackmatrix7 rule sources respond and meet minimum entry counts.

- [ ] **Step 3: Inspect scope and generated diff**

Run: `git status -sb && git diff --check && git diff --stat && git diff -- src/group-catalog.js test/groups.test.js test/examples.test.js test/docs.test.js README.md docs/deployment.md docs/canary-checklist.md`

Expected: no whitespace errors, no credentials, and no changes to routing/network source files.

- [ ] **Step 4: Commit and publish**

Commit only the intended files with message `fix: make node selector follow homepage`, publish without force, and verify the remote commit and file contents match the local result.
