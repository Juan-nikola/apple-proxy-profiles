# Shadowrocket Restore Service Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every common service group manual automatic-test, failover, regional, and concrete-node choices while preserving the correct proxy-first or direct-first default and the homepage-following root selector.

**Architecture:** Reuse one dynamic service-choice builder in `src/group-catalog.js` so proxy-first and direct-first groups differ only in their first two candidates. Keep helper groups hidden but reachable from every service selector, leave specialized groups unchanged, and regenerate distribution/examples from source.

**Tech Stack:** JavaScript ES modules, Node.js built-in test runner, esbuild, Sub-Store/Shadowrocket INI profiles.

## Global Constraints

- `🚀 节点选择` must remain exactly `select,PROXY` with no dynamic proxy source.
- The ten foreign service groups must default to `🚀 节点选择`.
- The six direct-first service groups must default to `DIRECT`.
- Both service categories must expose `⚡ 全部自动`, `🛟 全部故障转移`, all present continents, and concrete nodes.
- AI, game connection, P2P, DNS, security, source, and chain groups must retain their current behavior.
- Blackmatrix7 rules, Wendao direct rules, DNS, QUIC, IPv6, and arbitrary subscription display-name support must not change.

---

### Task 1: Lock the restored service candidate order

**Files:**
- Modify: `test/groups.test.js`
- Modify: `src/group-catalog.js`

**Interfaces:**
- Consumes: `buildGroups(options, nodes)` and its calculated `presentContinents` list.
- Produces: literal service item arrays with proxy-first or direct-first defaults followed by the shared automatic/failover/continent candidates.

- [ ] **Step 1: Write the failing regression assertion**

In the existing table-driven service-group test, require every direct-first group to equal:

```js
[
  "DIRECT",
  "🚀 节点选择",
  "⚡ 全部自动",
  "🛟 全部故障转移",
  "🌏 亚太",
  "🌍 欧洲",
  "🌎 美洲",
]
```

Keep the existing literal assertion for all ten proxy-first groups and the exact `["PROXY"]` root assertion.

- [ ] **Step 2: Verify RED**

Run: `node --test test/groups.test.js`

Expected: FAIL because direct-first groups currently stop after `DIRECT,🚀 节点选择`.

- [ ] **Step 3: Implement one shared service-choice builder**

Replace the identity-based `AUTO_PROXY_THEN_DIRECT` branch with a helper that takes the group defaults and present continent names. Proxy-first groups keep `🚀 节点选择` first and `DIRECT` after the continents; direct-first groups keep `DIRECT` first and `🚀 节点选择` second, then append automatic, failover, and continents. Pass the resulting array to `subscriptionGroup`, preserving concrete-node enumeration through `include-all-proxies=true`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/groups.test.js`

Expected: all group tests pass with no duplicate or cyclic references.

### Task 2: Regenerate and verify all platforms

**Files:**
- Modify: `test/examples.test.js`
- Modify: `dist/substore-profile-generator.js`
- Modify: `examples/shadowrocket-macos.conf`
- Modify: `examples/shadowrocket-iphone.conf`
- Modify: `examples/shadowrocket-ipad.conf`

**Interfaces:**
- Consumes: the updated group catalog.
- Produces: self-contained Sub-Store bundle and deterministic three-platform examples.

- [ ] **Step 1: Add a failing generated-profile assertion**

Require the `🎵 抖音` line in each example to start with:

```text
🎵 抖音 = select,DIRECT,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,🌏 亚太,🌍 欧洲,🌎 美洲
```

Continue requiring `🚀 节点选择 = select,PROXY`, arbitrary-name dynamic sources, Wendao direct rules, QUIC defaults, and platform IPv6 values.

- [ ] **Step 2: Verify RED**

Run: `node --test test/examples.test.js`

Expected: FAIL against the current generated examples.

- [ ] **Step 3: Rebuild generated artifacts**

Run: `node scripts/build.mjs && node scripts/render-fixtures.mjs`

Expected: update only the profile bundle and three example profiles; the node bundle remains byte-identical.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/examples.test.js test/bundles.test.js`

Expected: generated examples and self-contained bundles pass.

### Task 3: Align operator documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/deployment.md`
- Modify: `docs/canary-checklist.md`

**Interfaces:**
- Consumes: the final service group hierarchy.
- Produces: device instructions that distinguish generated defaults from saved Shadowrocket choices.

- [ ] **Step 1: Update README behavior table**

State that all sixteen common service groups contain automatic, failover, regional, and concrete-node choices; foreign groups are homepage-follow first and direct-first groups are DIRECT first.

- [ ] **Step 2: Update deployment and canary steps**

Tell users to update the current platform Profile, verify `SELECT > PROXY`, inspect one foreign group and one direct-first group, and manually reselect the first item when Shadowrocket retains an old valid choice.

- [ ] **Step 3: Run documentation and focused group tests**

Run: `node --test test/docs.test.js test/groups.test.js test/examples.test.js`

Expected: all focused tests pass.

### Task 4: Verify, review, commit, and publish

**Files:**
- Verify the intended source, tests, documentation, bundle, examples, spec, and plan.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a reviewed fast-forward commit on GitHub `main`.

- [ ] **Step 1: Run complete verification**

Run: `node --test && node scripts/build.mjs && node scripts/render-fixtures.mjs && node scripts/check-secrets.mjs && node scripts/check-rules.mjs && git diff --check`

Expected: 0 test failures, no secret findings, 31 healthy remote rule sets, and no whitespace errors.

- [ ] **Step 2: Audit scope and generated artifacts**

Confirm `dist/substore-node-operator.js`, rules, DNS, general/network, and node-generation source are unchanged. Confirm all three examples contain the exact root and service candidate prefixes.

- [ ] **Step 3: Request read-only code review**

Ask the existing reviewer to check the working diff against this plan and `docs/superpowers/specs/2026-08-01-shadowrocket-group-restoration-design.md`; resolve every Critical or Important issue.

- [ ] **Step 4: Commit and publish**

Commit only intended files with message `fix: restore service group choices`, create one remote commit whose parent is the current GitHub `main`, update `main` without force, and verify the remote commit plus every changed blob SHA.
