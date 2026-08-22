# Domain Fallback Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** 让未知域名通过 DNS/IP 回落获得稳定的直连或代理决策，并让 sing-box Android 使用受限内存规则包。

**Architecture:** 复用现有业务规则和 `ChinaIP`/原生 GeoIP 回落，不引入完整中国域名表。新增共享的平台能力判定，供 sing-box 规则和 DNS 渲染器共同使用；其他客户端保留现有回落实现，通过跨客户端契约测试锁定顺序。

**Tech Stack:** Node.js 22、Node built-in test runner、sing-box JSON renderer、Surge/Shadowrocket/Egern/HAPP/OneXray existing renderers。

**Spec:** `docs/superpowers/specs/2026-08-22-domain-fallback-routing-design.md`

## Global Constraints

- 默认配置不得引用 `ChinaMax`、`ChinaMax_Domain` 或完整中国域名 URL。
- iPhone、iPad、Android 必须使用 `mobile-rule-sets`；macOS 使用完整业务规则目录。
- 未命中业务域名规则时按 DNS/IP 结果路由；不实现直连失败后的自动代理重试。
- `dnsMode=stable` 保持默认；`privacy` 的代理 DNS 行为保持可选。
- 先写失败测试，再写生产代码；每个任务完成后运行对应的最小验证。

### Task 1: Establish baseline and shared platform contract

**Files:**
- Modify: `shared/rules/lightweight-policy.js`
- Test: `test/lightweight-policy.test.js`
- Test: `clients/sing-box/test/config.test.js`

**Interfaces:**
- Produces an exported immutable platform set and helper that answer whether a platform uses mobile rule bundles.
- Existing callers continue to accept `iphone`, `ipad`, `android`, and `macos` without changing public option names.

- [ ] **Step 1: Write the failing test**

  Add assertions that `iphone`, `ipad`, and `android` use mobile bundles while `macos` does not, and that the shared helper is the single source of truth.

- [ ] **Step 2: Run the focused tests to verify failure**

  Run: `node --test test/lightweight-policy.test.js clients/sing-box/test/config.test.js`

  Expected: FAIL because Android is not represented by the shared helper yet.

- [ ] **Step 3: Implement the minimal shared contract**

  Add an exported frozen platform set and `usesMobileRuleBundles(platform)` helper in `shared/rules/lightweight-policy.js`. Keep the existing rule IDs and bundle composition unchanged.

- [ ] **Step 4: Run the focused tests to verify the contract**

  Run: `node --test test/lightweight-policy.test.js clients/sing-box/test/config.test.js`

  Expected: PASS.

- [ ] **Step 5: Commit**

  Run: `git add shared/rules/lightweight-policy.js test/lightweight-policy.test.js clients/sing-box/test/config.test.js && git commit -m "test: define mobile rule platform contract"`

### Task 2: Make sing-box Android use mobile rule sets and DNS bundles

**Files:**
- Modify: `clients/sing-box/src/render-rules.js`
- Modify: `clients/sing-box/src/render-dns.js`
- Modify: `clients/sing-box/src/validate-config.js` only if the new invariant needs validator coverage
- Test: `clients/sing-box/test/config.test.js`
- Test: `clients/sing-box/test/validation.test.js`

**Interfaces:**
- `renderSingBoxRuleSets({ platform })` returns remote rule URLs under `mobile-rule-sets` for `iphone`, `ipad`, and `android`.
- `renderSingBoxRouteRules({ platform })` preserves existing route order and final proxy.
- `renderSingBoxDns({ platform })` uses the same platform selection as route rules.

- [ ] **Step 1: Write the failing Android URL and DNS tests**

  Assert that Android rule URLs contain `/mobile-rule-sets/`, macOS URLs contain `/rule-sets/`, and Android DNS rule-set references use the mobile catalog IDs.

- [ ] **Step 2: Run the focused tests to verify failure**

  Run: `node --test clients/sing-box/test/config.test.js`

  Expected: FAIL because Android currently follows the full catalog and default DNS catalog.

- [ ] **Step 3: Implement the minimal renderer change**

  Replace duplicated `iphone`/`ipad` checks in `clients/sing-box/src/render-rules.js` and `clients/sing-box/src/render-dns.js` with the shared helper from Task 1. Keep macOS behavior unchanged and keep route ordering `business rules -> ChinaTLD -> resolve -> ChinaIP -> final proxy`.

- [ ] **Step 4: Run sing-box tests**

  Run: `node --test clients/sing-box/test/config.test.js clients/sing-box/test/validation.test.js clients/sing-box/test/examples.test.js`

  Expected: PASS.

- [ ] **Step 5: Commit**

  Run: `git add clients/sing-box/src/render-rules.js clients/sing-box/src/render-dns.js clients/sing-box/test/config.test.js clients/sing-box/test/validation.test.js && git commit -m "fix: use mobile sing-box rules on Android"`

### Task 3: Lock cross-client China IP fallback behavior

**Files:**
- Modify: `test/cross-client-routing.test.js`
- Modify: `test/rule-budgets.test.js` if a default artifact guard belongs there
- Inspect only unless tests expose a defect: `clients/surge/src/render-rules.js`, `clients/shadowrocket/src/render-rules.js`, `clients/egern/src/render-rules.js`, `clients/happ/src/render-routing.js`, `clients/onexray/src/render-profile.js`

**Interfaces:**
- Cross-client tests describe the public routing contract without changing client-specific syntax.
- Existing client renderers remain authoritative for their native GeoIP/GeoData formats.

- [ ] **Step 1: Add failing/strengthening assertions**

  Assert that Surge and Shadowrocket place `GEOIP,CN,DIRECT` before `FINAL`; Egern places `geoip: CN` before `default`; sing-box places `resolve` before `rule-ChinaIP` and final proxy; HAPP and OneXray retain `geoip:CN`/`geoip:apple-proxy-china-ip` before their final proxy rule. Add a default artifact scan that rejects `ChinaMax_Domain` and full-domain URLs.

- [ ] **Step 2: Run the cross-client tests**

  Run: `node --test test/cross-client-routing.test.js test/rule-budgets.test.js`

  Expected: PASS after assertions match the existing architecture; if a real ordering defect appears, stop and fix only that renderer with a new focused failing test.

- [ ] **Step 3: Commit**

  Run: `git add test/cross-client-routing.test.js test/rule-budgets.test.js && git commit -m "test: enforce cross-client China IP fallback"`

### Task 4: Update operational documentation and generated artifacts

**Files:**
- Modify: `README.md`
- Modify: `docs/maintenance.md`
- Generated: `clients/sing-box/dist/sing-box-config-generator.js`
- Generated: `clients/sing-box/dist/substore-config-generator.js`
- Generated/public files only when the repository build updates them: `public/current/sing-box/**`, `public/edge/sing-box/**`

**Interfaces:**
- Documentation explains `stable` versus `privacy` DNS and the “判断后连接” flow.
- Generated bundles reflect source renderer behavior and do not introduce full-domain references.

- [ ] **Step 1: Update documentation**

  Document that unknown domains are resolved first, China IPs use `DIRECT`, overseas results use the proxy, and direct-failure retry is intentionally not automatic. State that full China domain lists are optional research inputs, never default mobile rules.

- [ ] **Step 2: Build generated bundles**

  Run: `npm install` then `npm run build`

  Expected: generated sing-box bundles contain the Android mobile-rule selection.

- [ ] **Step 3: Run generated artifact checks**

  Run: `npm run verify:singbox && node --test test/frontier-verification.test.js test/update-rules.test.js`

  Expected: PASS; generated artifacts remain within existing rule budgets.

- [ ] **Step 4: Commit**

  Run: `git add README.md docs/maintenance.md clients/sing-box/dist public/current/sing-box public/edge/sing-box && git commit -m "docs: explain domain fallback routing"`

### Task 5: Full verification and branch handoff

**Files:**
- No new source files; review all changed files and generated manifests.

- [ ] **Step 1: Run the complete test suite**

  Run: `npm test`

  Expected: PASS with no new warnings.

- [ ] **Step 2: Run the project verification suite**

  Run: `npm run verify`

  Expected: PASS for all active clients and public artifact checks.

- [ ] **Step 3: Inspect the diff and status**

  Run: `git diff --check && git status --short && git log --oneline -6`

  Expected: only planned source, test, documentation, and generated artifact changes are present.

- [ ] **Step 4: Report branch and verification results**

  Report the branch name, test commands, and any residual device-level risks such as HTTPDNS, hard-coded IPs, IPv6, and QUIC.
