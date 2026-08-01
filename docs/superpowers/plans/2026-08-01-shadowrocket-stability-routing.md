# Shadowrocket Stability and Routing Enhancement Implementation Plan

> Design: `docs/superpowers/specs/2026-08-01-shadowrocket-stability-routing-design.md`

**Goal:** Improve domestic app and game routing, reduce macOS disconnects, make the root selector follow the Shadowrocket homepage node, and remove the fixed subscription-display-name dependency.

**Architecture:** Keep the existing generator pipeline and policy-group model. Extend the rule catalog and renderer with Blackmatrix7 native `DOMAIN-SET` plus narrowly scoped local corrections, replace named-subscription group expansion with all-client-proxy expansion, and derive network defaults by platform while retaining explicit overrides.

**Tech Stack:** Node.js 22+, built-in `node:test`, ES modules, esbuild, Sub-Store Script Operator, Shadowrocket INI profiles.

---

## Task 1: Lock policy-group behavior with failing tests

**Files:**
- Modify: `test/groups.test.js`
- Modify: `test/profile.test.js`
- Modify: `test/substore-profile-entry.test.js`

1. Add assertions that `🚀 节点选择` starts with `PROXY` and preserves all existing helper/continent choices.
2. Add assertions that all dynamic groups render `include-all-proxies=true`, retain their filters, and contain no `<subscriptionName>,use=true` pair.
3. Add a profile validation assertion proving `PROXY` is accepted as a built-in policy.
4. Run the focused tests and confirm they fail for the intended missing behavior:
   `node --test test/groups.test.js test/profile.test.js test/substore-profile-entry.test.js`.

## Task 2: Implement homepage following and name-independent node discovery

**Files:**
- Modify: `src/group-catalog.js`
- Modify: `src/render-groups.js`
- Modify: `src/validate-profile.js`
- Modify: `src/options.js`

1. Prepend `PROXY` only to the root selector.
2. Render `include-all-proxies=true` for dynamic groups instead of named `use=true` subscription references.
3. Add `PROXY` to the built-in policy allowlist and validate the new group attribute.
4. Retain `subscriptionName` as an accepted compatibility parameter but remove it from group rendering decisions.
5. Run the focused tests until they pass.

## Task 3: Lock enhanced rule coverage and ordering with failing tests

**Files:**
- Modify: `test/rules.test.js`
- Modify: `test/check-rules.test.js`
- Modify: `test/profile.test.js`

1. Add assertions for exactly one `ByteDance`, `SteamCN`, `ChinaMax_Domain`, and `ChinaMax` reference.
2. Assert `ByteDance` keeps policy `🎵 抖音`.
3. Assert the local `leiting.com`, `leitingcn.com`, and `g-bits.com` DIRECT rules precede `SteamCN`, `ChinaMax_Domain`, and generic Game.
4. Assert order: named service rules → game corrections → `SteamCN` → `ChinaMax_Domain` → Game UDP/Game → download/P2P → `ChinaMax` → GEOIP → FINAL.
5. Add `DOMAIN-SET` validation/check coverage and confirm focused tests fail before implementation.

## Task 4: Implement Blackmatrix7 native enhanced rules

**Files:**
- Modify: `src/rule-catalog.js`
- Modify: `src/render-rules.js`
- Modify: `src/rule-validator.js`
- Modify: `src/validate-profile.js`
- Modify: `scripts/check-rules.mjs`

1. Replace `DouYin` with `ByteDance`, retaining the existing policy group.
2. Add `SteamCN` and `ChinaMax_Domain` catalog entries with conservative minimum counts.
3. Represent `ChinaMax_Domain` as `DOMAIN-SET`; keep ordinary Blackmatrix7 files as `RULE-SET`.
4. Add the three official 《问道手游》 operator-domain DIRECT corrections.
5. Render the approved order and reject duplicate/malformed remote entries.
6. Run focused rules/profile/checker tests until they pass.

## Task 5: Lock and implement platform stability defaults

**Files:**
- Modify: `test/options.test.js`
- Modify: `test/general.test.js`
- Modify: `src/options.js`

1. Add failing tests for default `quicMode=proxy-block`.
2. Add failing tests for macOS default `ipv6Mode=ipv4-only` and iPhone/iPad default `ipv6Mode=auto`.
3. Assert explicit valid parameters still override derived defaults.
4. Implement platform-aware defaults after the platform value is validated.
5. Run focused option/general tests until they pass.

## Task 6: Update generated bundles, examples, and operator documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/deployment.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/troubleshooting.md`
- Modify: `docs/canary-checklist.md`
- Modify: `RELEASE_CHECKLIST.md`
- Regenerate: `dist/substore-profile-generator.js`
- Regenerate: `examples/shadowrocket-macos.conf`
- Regenerate: `examples/shadowrocket-iphone.conf`
- Regenerate: `examples/shadowrocket-ipad.conf`
- Modify tests as required: `test/docs.test.js`, `test/examples.test.js`, `test/bundles.test.js`

1. Update deployment URLs: proxy QUIC blocked by default; macOS IPv4-only; iPhone/iPad IPv6 auto.
2. Document arbitrary subscription display names and explain the `PROXY` homepage-follow option.
3. Document that dynamic groups can include matching nodes from all client subscriptions.
4. Add explicit iPhone 《问道手游》 and macOS sleep/network-switch checks.
5. Run `npm run build` and `npm run fixtures`; review generated diffs and ensure no credentials are embedded.

## Task 7: Full verification and release commit

1. Run `npm test`.
2. Run `npm run build` and confirm a clean second build.
3. Run `npm run fixtures` and confirm a clean second fixture render.
4. Run `npm run check:rules` against live Blackmatrix7 files.
5. Run `npm run check:secrets` and `npm run verify`.
6. Run `git diff --check`, review the complete diff, and confirm only approved repository files changed.
7. Commit implementation with an intentional message.
8. Publish the resulting tree to GitHub `Juan-nikola/shadowrocket-profile` on `main` using the connected GitHub account, preserving the current remote parent commit.
9. Re-read the remote `main` head and key files to verify publication.
