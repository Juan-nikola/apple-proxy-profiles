# sing-box 规则下载故障转移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make sing-box rule-set startup automatically choose a node that can actually download the rule resource, while retaining manual and DIRECT fallbacks.

**Architecture:** Keep the shared policy catalog unchanged for other clients. In the sing-box renderer, add a dedicated URLTest outbound for rule downloads that probes a real rule URL through each concrete node and DIRECT. Keep `🧭 DNS 与规则下载` as a selector whose default is that dedicated probe group, then point the sing-box HTTP client at it. Pass the rule base URL into group rendering so the probe URL follows the selected channel.

**Tech Stack:** Node.js 22, native `node:test`, ES modules, existing sing-box renderer and SubStore generator.

## Global Constraints

- Keep sing-box 1.14+ configuration fields; do not reintroduce `geoip`, `geosite`, `download_detour`, or removed rule fields.
- Preserve the existing `⚡ 全部自动`, `🚀 节点选择`, and `DIRECT` groups for normal traffic.
- Rule download errors covered by health probing include connection refusal, timeout, TLS, and handshake failures.
- Do not expose subscription credentials in tests, logs, or documentation.

### Task 1: Add failing renderer tests

**Files:**
- Modify: `clients/sing-box/test/config.test.js`
- Modify: `clients/sing-box/test/render-groups.test.js` if the existing group test file is present; otherwise keep assertions in `config.test.js`

**Interfaces:**
- Consume: `renderSingBoxConfig()` and the existing fixture node.
- Produce: failing assertions for the dedicated `🧭 规则下载故障转移` URLTest group and the selector default.

- [ ] **Step 1: Write the failing test**

  Assert that the generated config contains a URLTest tagged `🧭 规则下载故障转移`, whose candidates include the concrete fixture node and `DIRECT`, whose URL is `${ruleBaseUrl}/Hijacking.json`, and that `🧭 DNS 与规则下载` is a selector defaulting to the dedicated group with `🚀 节点选择` and `DIRECT` available.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `npm --workspace @apple-proxy-profiles/sing-box test -- --test-name-pattern="rule download"`

  Expected: FAIL because the current renderer has no dedicated group and defaults directly to `⚡ 全部自动`.

### Task 2: Implement dedicated rule-download health probing

**Files:**
- Modify: `clients/sing-box/src/render-groups.js`
- Modify: `clients/sing-box/src/render-config.js`
- Modify: `clients/sing-box/test/config.test.js`

**Interfaces:**
- Consume: `renderSingBoxGroups(options, nodes, { ruleProbeUrl })`.
- Produce: validated sing-box groups with concrete-node health probing.

- [ ] **Step 1: Add constants and a probe URL helper**

  Define `RULE_DOWNLOAD_FAILOVER_GROUP = "🧭 规则下载故障转移"` and choose `${ruleBaseUrl}/Hijacking.json` as the default probe when a rule base URL is supplied. Reject malformed probe URLs through the existing rule-base validation path rather than silently emitting a different host.

- [ ] **Step 2: Render the dedicated URLTest group before the selector**

  Build its candidates from non-chained inventory node names followed by `DIRECT`, deduplicate them, and emit `type: "urltest"`, `interval: "30s"`, `tolerance: 0`, `interrupt_exist_connections: true`, and the actual rule probe URL. Keep the existing selector tag `🧭 DNS 与规则下载`, set its candidates to `[RULE_DOWNLOAD_FAILOVER_GROUP, "🚀 节点选择", "DIRECT"]`, and set its default to the failover group.

- [ ] **Step 3: Pass rule base URL through the config renderer**

  Call `renderSingBoxGroups(options, inventory, { ruleProbeUrl: `${ruleBaseUrl}/Hijacking.json` })` from `renderSingBoxConfig()`. Keep all other group health checks on their existing gstatic URL.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `npm --workspace @apple-proxy-profiles/sing-box test -- --test-name-pattern="rule download"`

  Expected: PASS, including existing validation assertions.

### Task 3: Update fixtures, documentation, and generated artifacts

**Files:**
- Modify: `clients/sing-box/examples/sing-box-iphone.json`
- Modify: `clients/sing-box/examples/sing-box-ipad.json`
- Modify: `clients/sing-box/examples/sing-box-macos.json`
- Modify: `clients/sing-box/examples/sing-box-android.json`
- Modify: `clients/sing-box/examples/sing-box-openwrt.json`
- Modify: `clients/sing-box/docs/troubleshooting.md`
- Modify: `clients/sing-box/dist/sing-box-config-generator.js` via the existing build script
- Modify: `clients/sing-box/dist/substore-config-generator.js` via the existing build script

- [ ] **Step 1: Regenerate examples and bundles**

  Run: `npm --workspace @apple-proxy-profiles/sing-box run build && npm --workspace @apple-proxy-profiles/sing-box run fixtures`.

- [ ] **Step 2: Document the operational behavior**

  Explain that the dedicated group probes a real rule URL, switches away from nodes that refuse, time out, or fail TLS, and still cannot help when every candidate and DIRECT are unavailable.

- [ ] **Step 3: Run the full sing-box verification**

  Run: `npm run verify:singbox`.

  Expected: all tests, build, fixtures, and secret checks pass.

### Task 4: Refresh and verify SubStore files

**Files:**
- External UI: SubStore File tasks `sing-box iPhone Config`, `sing-box macOS Config`, `sing-box iPad Config`, `sing-box Android Config`, and `sing-box OpenWrt Config`.

- [ ] **Step 1: Refresh each task**

  Keep the existing generator URLs with `#noCache`, refresh all five tasks, and do not change the subscription token or node source.

- [ ] **Step 2: Verify generated JSON through the file endpoint**

  Parse the iPhone and macOS outputs and assert that each has the dedicated failover group, the selector default points to it, and every remote rule-set references `🧭 规则下载 HTTP`.

- [ ] **Step 3: Commit implementation and generated artifacts**

  Run: `git add clients/sing-box docs/superpowers && git commit -m "fix: fail over sing-box rule downloads"`.

