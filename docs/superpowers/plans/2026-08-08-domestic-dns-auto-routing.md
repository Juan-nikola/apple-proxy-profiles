# Domestic DNS Auto-Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop domestic App/CDN and domestic mobile-game traffic from falling through the proxy by combining a small observed-domain safety set with China-first DNS resolution across all five clients, without importing a giant China IP/domain database.

**Architecture:** Keep one shared `DomesticCore` semantic source so the compiler emits equivalent artifacts for Egern, Shadowrocket, Surge, sing-box, and Anywhere. Add only confirmed domestic CDN/app suffixes from the supplied reference config, observed traces, and audited domestic media/live sources (including `douyu.com`, `douyuscdn.com`, `huya.com`, Bilibili/iQIYI/Youku/Tencent CDN suffixes), then make Egern stable/speed DNS use China DNS for unknown names while routing explicitly overseas rule sets through global DNS. This China-first resolution is also the automatic fallback for domestic games such as 问道手游; `leiting.com` is already in the domestic-game seed, while changing CDN hostnames are handled by ChinaIP/GeoIP instead of requiring manual entries. Preserve the existing ChinaIP/GeoIP fallback and the 25,000-entry publication budget.

**Tech Stack:** Node.js built-in test runner, ESM JavaScript, existing rule compiler/publication pipeline, generated client fixtures and manifests.

## Global Constraints

- Do not add ChinaMax/ChinaMax_Domain or the full ChinaCIDR list to default output.
- Keep Advertising and Advertising_Domain optional and disabled by default.
- Preserve shared rule order: local/security/custom → domestic → explicit overseas → ChinaIP/GeoIP CN → proxy fallback.
- Keep all five client outputs semantically equivalent; client-native syntax may differ.
- Never modify `public/current` during this change.
- Validate generated artifacts with the bundled Node runtime and the existing official sing-box checks.

### Task 1: Add failing cross-client regressions

**Files:**
- Modify: `test/fixtures/lightweight-routing-cases.js`
- Modify: `test/cross-client-routing.test.js`
- Modify: `clients/egern/test/dns.test.js`
- Modify: `test/lightweight-policy.test.js`

**Interfaces:**
- Consumes: current generated examples and `DOMESTIC_CORE_DOMAIN_SUFFIXES`.
- Produces: failing assertions for the four observed domestic domains and China-first Egern unknown-domain DNS behavior.

- [x] **Step 1: Write the failing tests**

  Add routing cases for the observed app/CDN hosts plus representative Douyu, Huya, Bilibili, iQIYI, Youku, and Tencent CDN suffixes, each expected to be `DIRECT` through `DomesticCore` for every client. Add `wd.leiting.com` as a domestic-game regression and retain the existing unresolved-domain/CN-IP case to prove that a changing game CDN does not need a hand-maintained suffix. Add a policy test requiring the observed suffixes in the shared domestic core. Add an Egern DNS test requiring stable and speed modes to end with `domain_wildcard: china`, while privacy remains global.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run:

  ```bash
  /Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test test/cross-client-routing.test.js test/lightweight-policy.test.js clients/egern/test/dns.test.js
  ```

  Expected: failures for the missing observed suffixes and the current Egern global/system wildcard.

### Task 2: Implement the shared domestic safety set and China-first DNS

**Files:**
- Modify: `shared/rules/domestic-core.js`
- Modify: `clients/egern/src/render-dns.js`
- Modify: `clients/egern/test/dns.test.js` only if the RED assertions need exact fixture helpers.

**Interfaces:**
- Consumes: existing shared compiler, Egern `proxy_rule_set` publication URL, current DNS options.
- Produces: deterministic shared `DomesticCore` entries and Egern forward rules that resolve unknown names through China DNS by default.

- [x] **Step 1: Add the minimal observed suffixes**

  Extend the normalized domestic suffix list with exactly:

  ```js
  "wmpvp.com",
  "bytehwm.com",
  "rtbasia.com",
  "sandbox.itunes.apple.com",
  "douyucdn.cn",
  "douyu.com",
  "douyu.tv",
  "douyutv.com",
  "douyuscdn.com",
  "huya.com",
  ```

  The media/CDN additions also cover Bilibili (`bilibili.net`, `bilibili.tv`, `bilibili.cc`, `bilivideo.net`, `hdslb.org`), iQIYI (`iqiyipic.com`), Youku (`tudouui.com`, `ykimg.com`), and Tencent video/static (`gtimg.com`).

  Keep the existing validation, duplicate detection, and domestic-core budget check.

  Keep `leiting.com` in `DOMESTIC_GAME_DOMAIN_SUFFIXES`; do not add a broad game wildcard. A domestic game's changing CDN is classified automatically by China-first DNS and the existing ChinaIP/GeoIP direct step.

- [x] **Step 2: Add explicit Egern overseas DNS forwarding**

  Define the existing explicit-overseas source IDs once in `clients/egern/src/render-dns.js`. In stable/speed modes, emit their `proxy_rule_set` records with value `global` before domestic fallback records. Keep domestic fallback and `DomesticCore` records mapped to `china`, and change the final wildcard for stable/speed from `global`/`system` to `china`. Keep privacy mode as global wildcard. This makes unknown domains China-first while known foreign services still use proxy-side DNS.

- [x] **Step 3: Run focused tests and verify GREEN**

  Run the Task 1 command. Expected: all new assertions pass and existing DNS/provider/channel/security tests remain green.

### Task 3: Rebuild all five clients and verify budgets/reproducibility

**Files:**
- Generated: `clients/*/dist/` and `clients/*/examples/` through existing build scripts.
- Generated: staged edge artifacts/manifests only; do not touch `public/current`.
- Modify: relevant generated-test expectations only if a deterministic count/hash is intentionally changed.

**Interfaces:**
- Consumes: updated shared source and Egern DNS renderer.
- Produces: byte-stable five-client artifacts with the observed domains and unchanged optional-pack boundary.

- [x] **Step 1: Run all client builds and fixture renderers**

  Use the repository’s existing build commands with the bundled Node runtime for Shadowrocket, Surge, Egern, sing-box, and Anywhere. Confirm the generated profiles contain no private node URL or credentials.

- [x] **Step 2: Run cross-client, budget, security, and official sing-box checks**

  Run the existing root/automation suites, secret scan, `git diff --check`, and the official sing-box 1.14 beta format/check commands already used by the project. Confirm default entry/byte budgets remain below their limits and no optional adblock source enters default output.

- [x] **Step 3: Rebuild twice and compare generated hashes**

  Render the same edge snapshot twice, compare all generated client/dist/example hashes, and verify `public/current` is unchanged. The final generated-tree digest is `4aabb9b491817a966940b59b61478a37675bb7bcfcc764ef62a3f7c5b6c6f39d` on both runs. Record the final observed-domain behavior and any remaining limitation: domains whose DNS/CDN behavior changes over time can still require a small audited observed-domain addition, but normal unknown domestic names are handled automatically by China-first DNS plus ChinaIP/GeoIP.

- [x] **Step 4: Commit the focused change**

  ```bash
  git add shared/rules/domestic-core.js clients/egern/src/render-dns.js test clients/egern/test automation docs/superpowers/plans/2026-08-08-domestic-dns-auto-routing.md
  git commit -m "fix: route domestic cdn traffic by shared china-first dns"
  ```
