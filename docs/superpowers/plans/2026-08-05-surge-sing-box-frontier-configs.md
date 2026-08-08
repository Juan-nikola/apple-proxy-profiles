# Surge 与 sing-box 前沿配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有共享节点、策略和规则体系上新增 Surge 与 sing-box 的私密 Sub-Store 配置生成器、公开规则产物、平台校验和可回滚发布元数据。

**Architecture:** 共享层继续负责节点规范化、策略意图和规则目录；Surge 适配器把中立策略映射为 Mac/iPhone/iPad Profile；sing-box 适配器把同一模型映射为 Mac/Apple 移动端/Android/OpenWrt 原生 JSON。公开 Pages 只保存公开脚本、规则、哈希和脱敏示例，真实节点由 Sub-Store 运行时注入。

**Tech Stack:** Node.js 22 ESM、Node built-in test runner、esbuild、官方 Surge Profile 语法、官方 sing-box JSON schema/rule-set 结构、GitHub Pages 静态产物。

## Global Constraints

- Surge 目标平台为 Mac、iPhone、iPad，并优先适配官方最新测试版。
- sing-box 目标平台为 Mac、iPhone/iPad、Android、标准 OpenWrt/ImmortalWrt 软路由，并每天追踪官方 `testing` 分支提交。
- 不编译、签名、安装或分发 Surge、sing-box、SFA/SFI/SFM 或软路由二进制。
- 真实订阅 URL、节点地址、端口、UUID、密码、密钥和私密配置不得进入 GitHub、Pages、公开 fixture 或错误信息。
- 所有适配器必须 fail-closed；未知协议、未知字段、悬空策略、DNS 回环、规则闭包不完整或平台字段不兼容时拒绝生成。
- `edge/` 追踪最新测试候选，`current/` 只接受真实设备 canary，`previous/` 保留可回滚版本；平台之间独立推进。
- 新功能不得改变既有 Shadowrocket、Egern、Anywhere 的输出契约、规则快照和公开 URL。
- 每个生产函数先写一个能正确失败的测试，看到 RED 后才写最小实现；每个任务完成后单独提交。

---

## 文件与职责地图

### 共享层

- Modify: `shared/contracts.js` — 注册 `surge` 与 `singbox` 客户端标识及平台值。
- Modify: `shared/nodes/protocol-registry.js` — 声明两个新客户端支持的协议集合。
- Modify: `shared/policies/platform-presets.js` — 为 Surge/sing-box 复用并明确测速默认值。
- Create: `shared/release/frontier-manifest.js` — 定义平台能力矩阵、上游版本记录和 `edge/current/previous` manifest 结构。

### Surge workspace

- Create: `clients/surge/package.json` — workspace scripts、Node 22 和 esbuild 依赖。
- Create: `clients/surge/src/options.js` — 严格解析 `output/type/name/subscriptionName/platform` 及共享策略选项。
- Create: `clients/surge/src/render-node.js` — 将 Sub-Store normalized node 映射为 Surge `[Proxy]` 行。
- Create: `clients/surge/src/render-groups.js` — 将共享 policy groups 映射为 Surge `[Proxy Group]`。
- Create: `clients/surge/src/render-rules.js` — 将共享规则目录映射为 Surge `[Rule]`，使用公开快照 URL。
- Create: `clients/surge/src/render-profile.js` — 组合平台 Profile 并执行结构校验。
- Create: `clients/surge/src/validate-profile.js` — fail-closed 检查 section、引用图、FINAL 顺序和代理行。
- Create: `clients/surge/src/substore-profile-entry.js` — Sub-Store 远程脚本入口。
- Create: `clients/surge/scripts/build.mjs` — 生成 Surge canonical/legacy bundle 与三个脱敏示例。
- Create: `clients/surge/test/*.test.js` — options、node、groups、profile、security、bundle 和 docs 测试。
- Create: `clients/surge/README.md`, `clients/surge/docs/{deployment,canary,troubleshooting}.md` — 订阅参数和真机验收说明。

### sing-box workspace

- Create: `clients/sing-box/package.json` — workspace scripts、Node 22 和 esbuild 依赖。
- Create: `clients/sing-box/src/options.js` — 平台、模式、规则根 URL 和更新通道解析。
- Create: `clients/sing-box/src/render-node.js` — 生成官方 outbound JSON，支持协议和 transport 的显式白名单。
- Create: `clients/sing-box/src/render-groups.js` — 把共享 policy groups 映射为 `selector`/`urltest`/fallback 结构。
- Create: `clients/sing-box/src/render-rules.js` — 生成 `route.rules`、`rule_set` 和本地直连/阻断规则。
- Create: `clients/sing-box/src/render-dns.js` — 生成国内/国外 DNS、代理 DNS、规则 DNS 和防泄漏配置。
- Create: `clients/sing-box/src/render-platform.js` — Mac、Apple mobile、Android、OpenWrt TUN 差异模板。
- Create: `clients/sing-box/src/render-config.js` — 组合确定性 JSON，并在发布前检查 schema 关键约束。
- Create: `clients/sing-box/src/validate-config.js` — 检查 outbound/tag/route/rule-set/DNS/TUN 引用闭包。
- Create: `clients/sing-box/src/substore-config-entry.js` — Sub-Store 远程 JSON 配置入口。
- Create: `clients/sing-box/scripts/build.mjs` — 生成 bundle 和脱敏 JSON 示例。
- Create: `clients/sing-box/scripts/compile-rules.mjs` — 在传入官方 sing-box core 时把 source JSON 编译为 `.srs`，没有 core 时明确失败，不生成伪 `.srs`。
- Create: `clients/sing-box/test/*.test.js` — node、groups、route、DNS、平台、validation、security 和 bundle 测试。
- Create: `clients/sing-box/README.md`, `clients/sing-box/docs/{deployment,canary,openwrt,troubleshooting}.md` — 订阅与软路由部署说明。

### 自动化与公开产物

- Create: `automation/src/render-sing-box-rules.js` — 从已解析规则生成可审计 source JSON，按 source ID 保持确定性。
- Create: `automation/src/render-frontier-artifacts.js` — 生成 Surge/sing-box 公开脚本、示例、规则和 manifest 记录。
- Modify: `automation/src/build-artifacts.js` — 把新客户端规则和 frontier manifest 纳入同一个 hash-closed artifact set。
- Modify: `automation/src/build-site.js` — 增加平台独立的 `edge/current/previous` 元数据和原子回滚入口，不破坏旧路径。
- Modify: `scripts/update-rules.mjs` — 复制新 workspace bundle、规则、示例和文档，并重写公开规则 URL。
- Modify: `scripts/verify.mjs`, `test/foundation.test.js`, `test/public.test.js`, `test/security.test.js` — 加入新 workspace、产物、密钥和 URL 闭包断言。
- Modify: `package.json` — 新 workspace 的 root verify/build/test 入口。

---

## Task 1: 注册共享客户端与 frontier manifest 契约

**Files:**
- Modify: `shared/contracts.js`
- Modify: `shared/nodes/protocol-registry.js`
- Modify: `shared/policies/platform-presets.js`
- Create: `shared/release/frontier-manifest.js`
- Test: `test/frontier-contract.test.js`

**Interfaces:**
- Produces `CLIENT.surge === "surge"` and `CLIENT.singbox === "singbox"`.
- Produces `frontierPlatformKey(client, platform)`, `createFrontierManifest(input)` and `validateFrontierManifest(manifest)`.
- `createFrontierManifest` accepts `{ client, platform, channel, upstream, schemaVersion, ruleManifestSha256, configSha256, status, failure }` and returns a frozen manifest with no node-valued fields.

- [ ] **Step 1: Write the failing test**

```js
test("frontier manifest records platform-specific upstream and rejects secret-shaped fields", () => {
  const input = {
    client: CLIENT.singbox,
    platform: "openwrt",
    channel: "edge",
    upstream: { branch: "testing", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    schemaVersion: "singbox-testing-1",
    ruleManifestSha256: "b".repeat(64),
    configSha256: "c".repeat(64),
    status: "validated",
  };
  const manifest = createFrontierManifest(input);
  assert.equal(manifest.platformKey, "singbox/openwrt");
  assert.equal(validateFrontierManifest(manifest), true);
  assert.throws(() => createFrontierManifest({ ...input, configSha256: "password=secret" }), /sha256/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/frontier-contract.test.js`
Expected: FAIL because the new client constants and manifest functions do not exist.

- [ ] **Step 3: Write minimal implementation**

Add the two client constants, add protocol definitions only for protocols supported by the corresponding renderer, and make `createFrontierManifest` validate SHA-256 strings, channel values, platform keys, upstream commit format, and aggregated failure data without copying arbitrary input fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/frontier-contract.test.js`
Expected: PASS.

- [ ] **Step 5: Run regression tests**

Run: `npm test -- --test-name-pattern='capabilit|foundation|frontier'`
Expected: PASS with existing client capability expectations unchanged except for the explicit new client cases.

- [ ] **Step 6: Commit**

```bash
git add shared/contracts.js shared/nodes/protocol-registry.js shared/policies/platform-presets.js shared/release/frontier-manifest.js test/frontier-contract.test.js
git commit -m "feat: add frontier client contracts"
```

## Task 2: Build the Surge adapter with TDD

**Files:**
- Create: `clients/surge/package.json`
- Create: `clients/surge/src/options.js`
- Create: `clients/surge/src/render-node.js`
- Create: `clients/surge/src/render-groups.js`
- Create: `clients/surge/src/render-rules.js`
- Create: `clients/surge/src/validate-profile.js`
- Create: `clients/surge/src/render-profile.js`
- Create: `clients/surge/src/substore-profile-entry.js`
- Test: `clients/surge/test/options.test.js`, `clients/surge/test/node.test.js`, `clients/surge/test/profile.test.js`, `clients/surge/test/validation.test.js`

**Interfaces:**
- `parseSurgeOptions(raw) -> ParsedSurgeOptions` accepts `platform` in `macos|iphone|ipad` and the shared policy options.
- `renderSurgeProxy(node) -> string` emits one escaped Surge proxy line and never emits `_profile` or private metadata.
- `renderSurgeProfile(options, nodes, { ruleBaseUrl }) -> string` emits `[General]`, `[Proxy]`, `[Proxy Group]`, and `[Rule]` with a final `FINAL` rule.
- `validateSurgeProfile(profile) -> { valid: boolean, errors: string[] }` rejects duplicate required sections, missing group references, cycles, missing proxy references, malformed node lines, and rules after `FINAL`.

- [ ] **Step 1: Write failing tests for options and a single SS node**

```js
test("Surge renders an SS node without metadata or fixture credentials", () => {
  const profile = renderSurgeProfile(options, [normalizedSsNode], {
    ruleBaseUrl: "https://example.invalid/current/surge/rules",
  });
  assert.match(profile, /^\[General\]/m);
  assert.match(profile, /\[Proxy\][\s\S]*🇯🇵 \[机场\]/u);
  assert.doesNotMatch(profile, /_profile|_subName|_resolved/u);
  assert.deepEqual(validateSurgeProfile(profile), { valid: true, errors: [] });
});
```

The private Sub-Store response is allowed to contain the node endpoint and credential required by Surge; public artifact and security tests below must prove that sanitized examples and published files do not contain those values.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='SS node|options'`
Expected: FAIL because the workspace and renderer do not exist.

- [ ] **Step 3: Implement options, node mapping, and escaping**

Map supported input types to Surge names: `ss/shadowsocks`, `ssr`, `snell`, `vmess`, `vless`, `trojan`, `hysteria2/hy2`, `tuic`, `socks5`, and `http`. Validate required fields and transport aliases before rendering. Use a single-line escaping function for commas, backslashes, and line breaks; unknown transport fields are rejected instead of silently ignored.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='SS node|options'`
Expected: PASS.

- [ ] **Step 5: Add policy group and rule tests before implementing them**

Cover `select`, `url-test`, `fallback`, subscription filters, `DIRECT`, `REJECT`, default selection, local bypass rules, public rule-set URL rewriting, and the required rule order `local/custom/rule-set/GEOIP/FINAL`.

- [ ] **Step 6: Run group/rule tests and verify RED**

Run: `npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='group|rule order'`
Expected: FAIL because group/rule renderers are not implemented.

- [ ] **Step 7: Implement groups, rules, profile composition, and validation**

Map `POLICY_TARGET.primaryProxy` to `PROXY`, use shared `buildPolicyGroups`, render dynamic subscription sources with the configured subscription name, render `RULE-SET` URLs from `ruleBaseUrl`, and reject any graph with an unresolved group or cycle. Use platform-specific `[General]` values only for documented Mac/iPhone/iPad differences; do not add MITM, rewrite, or script sections.

- [ ] **Step 8: Run the full Surge workspace test suite**

Run: `npm --workspace @apple-proxy-profiles/surge test`
Expected: PASS with deterministic output and all failure cases covered.

- [ ] **Step 9: Add the Sub-Store entry test before bundling**

Assert that `operator(input, targetPlatform, context)` calls `produceArtifact({ type: "collection", name: "surge-sources", platform: "JSON", produceType: "internal" })`, returns `{ ...input, $content }`, and logs aggregate diagnostics without node values.

- [ ] **Step 10: Run entry test and verify RED, then implement the entry**

Run: `npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='Sub-Store entry'`
Expected first: FAIL because `substore-profile-entry.js` is missing; after implementing the smallest entry wrapper: PASS.

- [ ] **Step 11: Commit the Surge adapter**

```bash
git add clients/surge
git commit -m "feat: add Surge profile adapter"
```

## Task 3: Add sing-box outbound, policy, route and DNS generation

**Files:**
- Create: `clients/sing-box/package.json`
- Create: `clients/sing-box/src/options.js`
- Create: `clients/sing-box/src/render-node.js`
- Create: `clients/sing-box/src/render-groups.js`
- Create: `clients/sing-box/src/render-rules.js`
- Create: `clients/sing-box/src/render-dns.js`
- Create: `clients/sing-box/src/render-platform.js`
- Create: `clients/sing-box/src/validate-config.js`
- Create: `clients/sing-box/src/render-config.js`
- Test: `clients/sing-box/test/node.test.js`, `clients/sing-box/test/groups.test.js`, `clients/sing-box/test/route.test.js`, `clients/sing-box/test/platform.test.js`, `clients/sing-box/test/validation.test.js`

**Interfaces:**
- `parseSingBoxOptions(raw) -> ParsedSingBoxOptions` accepts `platform` in `macos|iphone|ipad|android|openwrt` and `channel` in `edge|current`.
- `renderSingBoxOutbound(node) -> { tag, type, ... }` emits only official outbound keys for the supported protocol and preserves no source metadata.
- `renderSingBoxConfig(options, nodes, { ruleBaseUrl, ruleSetFormat }) -> object` returns a plain JSON object with `log`, `dns`, `inbounds`, `outbounds`, `route`, and `experimental`.
- `validateSingBoxConfig(config) -> { valid: boolean, errors: string[] }` verifies all tags, route actions, rule-set references, DNS server references, and platform TUN invariants.

- [ ] **Step 1: Write failing node tests**

```js
test("sing-box renders VLESS Reality with WebSocket transport and rejects unknown fields", () => {
  const outbound = renderSingBoxOutbound(vlessRealityWsNode);
  assert.deepEqual(outbound, {
    type: "vless", tag: "🇩🇪 [Realm] DE Frankfurt", server: "203.0.113.20", server_port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: { enabled: true, server_name: "example.invalid", utls: { enabled: true, fingerprint: "chrome" }, reality: { enabled: true, public_key: "TEST_ONLY_PUBLIC_KEY", short_id: "00000000" } },
    transport: { type: "ws", path: "/", headers: {} },
  });
  assert.throws(() => renderSingBoxOutbound({ ...vlessRealityWsNode, "future-option": true }), /unsupported.*field/i);
});
```

- [ ] **Step 2: Run focused node tests and verify RED**

Run: `npm --workspace @apple-proxy-profiles/sing-box test -- --test-name-pattern='VLESS Reality|unknown fields'`
Expected: FAIL because the workspace and renderer do not exist.

- [ ] **Step 3: Implement explicit outbound mappings**

Support native mappings for Shadowsocks, Snell, VMess, VLESS, Trojan, AnyTLS, Hysteria2, TUIC, SOCKS5, HTTP, SSH, and WireGuard. Normalize `sni/servername`, `skip-cert-verify/allow-insecure`, Reality keys, WebSocket/gRPC/HTTP2 transports, UDP relay, and client chain `detour` only when the chain was generated by this project. Reject SSR, Sudoku, arbitrary existing chains, unsupported transports, and unknown non-private fields.

- [ ] **Step 4: Run node tests and verify GREEN**

Run: `npm --workspace @apple-proxy-profiles/sing-box test -- --test-name-pattern='node|unknown fields'`
Expected: PASS, including unsupported-protocol diagnostics without endpoint or credential values.

- [ ] **Step 5: Write failing group/route/DNS/platform tests**

Assert that shared policy groups become stable tags, `urltest` uses the shared probe interval/timeout, domestic rules route to `DIRECT`, overseas service rules route to the matching selector, local CIDRs bypass the TUN, DNS rules do not point back to the proxy DNS server, and OpenWrt includes `auto_route`, `auto_redirect`, DNS hijack, LAN exclusion, and loop prevention.

- [ ] **Step 6: Run those tests and verify RED**

Run: `npm --workspace @apple-proxy-profiles/sing-box test -- --test-name-pattern='group|route|DNS|OpenWrt'`
Expected: FAIL because the route, DNS, and platform renderers are missing.

- [ ] **Step 7: Implement groups, route, DNS, and platform templates**

Map `POLICY_TARGET.primaryProxy` to `🚀 节点选择`, represent shared `select` groups as `selector`, shared `auto-test` groups as `urltest`, and shared fallback groups as `urltest` with the documented fallback behavior. Generate `rule_set` references with stable tags and `route.rules` in the same order as the existing clients. Use `format: "binary"` only when `ruleSetFormat === "binary"`; otherwise use source JSON. Keep the OpenWrt template distinct from Apple/Android and do not emit Linux-only options into mobile configs.

- [ ] **Step 8: Implement config composition and fail-closed validation**

The validator must reject duplicate tags, missing tags, unresolved selector/urltest members, missing rule-set tags, DNS server loops, a non-final final rule, missing TUN for tunnel platforms, and OpenWrt configs lacking LAN/router exclusions. Validate JSON deterministically using `JSON.stringify(config, null, 2) + "\n"`.

- [ ] **Step 9: Run sing-box tests and verify GREEN**

Run: `npm --workspace @apple-proxy-profiles/sing-box test`
Expected: PASS with deterministic JSON and explicit rejection coverage.

- [ ] **Step 10: Commit the sing-box renderer**

```bash
git add clients/sing-box
git commit -m "feat: add sing-box platform config adapter"
```

## Task 4: Add Sub-Store entrypoints, bundles, examples and docs

**Files:**
- Create: `clients/surge/scripts/build.mjs`, `clients/surge/scripts/render-fixtures.mjs`
- Create: `clients/sing-box/src/substore-config-entry.js`, `clients/sing-box/scripts/build.mjs`, `clients/sing-box/scripts/render-fixtures.mjs`
- Create: `clients/surge/examples/surge-{macos,iphone,ipad}.conf`
- Create: `clients/sing-box/examples/sing-box-{macos,iphone,ipad,android,openwrt}.json`
- Create: `clients/surge/README.md`, `clients/surge/docs/*`
- Create: `clients/sing-box/README.md`, `clients/sing-box/docs/*`
- Test: `clients/surge/test/bundles.test.js`, `clients/sing-box/test/bundles.test.js`, `clients/*/test/examples.test.js`, `clients/*/test/docs.test.js`

**Interfaces:**
- Surge bundle entry: `operator(input, targetPlatform)` returns `{ ...input, $content: profile }`.
- sing-box bundle entry: `operator(input, targetPlatform)` returns `{ ...input, $content: JSON.stringify(config, null, 2) + "\\n" }`.
- Each docs page contains exact Sub-Store parameter strings with `output=config`, collection name, platform and update channel.

- [ ] **Step 1: Write failing bundle and docs tests**

Check each expected `dist` file exists after build, loads in a VM-like Node context, exposes `operator`, contains no `raw.githubusercontent.com/blackmatrix7` URL after public rewriting, and docs mention `edge`, `current`, the private Sub-Store source, and the OpenWrt test VLAN canary.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='bundle|docs'` and `npm --workspace @apple-proxy-profiles/sing-box test -- --test-name-pattern='bundle|docs'`
Expected: FAIL because build scripts, dist outputs and docs do not exist.

- [ ] **Step 3: Implement build scripts and examples**

Bundle source with esbuild using the same IIFE pattern as existing workspaces, render examples from sanitized fixture nodes, and keep all example endpoint/auth values under `example.invalid` or `TEST_ONLY_` markers.

- [ ] **Step 4: Run workspace builds and focused tests**

Run: `npm run build` followed by the two workspace bundle/doc test commands.
Expected: PASS and generated examples are byte-deterministic.

- [ ] **Step 5: Commit entrypoints, bundles and docs**

```bash
git add clients/surge clients/sing-box
git commit -m "feat: publish Surge and sing-box Sub-Store entrypoints"
```

## Task 5: Publish shared rule artifacts and frontier metadata

**Files:**
- Create: `automation/src/render-sing-box-rules.js`
- Create: `automation/src/render-frontier-artifacts.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `scripts/update-rules.mjs`
- Test: `automation/test/render-sing-box-rules.test.js`, `automation/test/frontier-artifacts.test.js`, `automation/test/build-artifacts.test.js`, `automation/test/build-site.test.js`

**Interfaces:**
- `renderSingBoxRuleSource({ source, parsed, upstream }) -> { content, counts }` returns canonical source JSON and never copies unsupported raw fields.
- `buildFrontierArtifacts({ ruleBaseUrl, manifests, staticFiles }) -> Map<string,string>` returns only safe relative public paths.
- `buildSite` keeps old current/previous/version behavior and additionally publishes platform manifests below `edge/`, `current/`, and `previous/`.

- [ ] **Step 1: Write failing artifact tests**

Assert deterministic source JSON, stable rule tags, SHA-256 manifest entries, platform-independent update behavior, and atomic retention when a platform candidate fails. Add a test that a failed Surge candidate leaves its prior `edge` and `current` files intact while a sing-box candidate can advance.

- [ ] **Step 2: Run artifact tests and verify RED**

Run: `node --test automation/test/render-sing-box-rules.test.js automation/test/frontier-artifacts.test.js automation/test/build-site.test.js`
Expected: FAIL because the new renderers and platform paths are missing.

- [ ] **Step 3: Implement source JSON and artifact integration**

Render each parsed rule as a canonical sing-box source rule-set with provenance in the manifest, add Surge/sing-box static scripts and sanitized examples to `buildClientArtifacts`, and keep source/output counts for each client. Reuse the existing content-addressed immutable version directories.

- [ ] **Step 4: Implement independent channel advancement**

Add explicit `edge/current/previous` platform records; only a validated platform candidate is promoted, failed candidates keep the previous files, and no platform promotion deletes another platform's current/previous state.

- [ ] **Step 5: Run automation tests and verify GREEN**

Run: `node --test automation/test/*.test.js`
Expected: PASS, including all existing Anywhere/Shadowrocket/Egern artifact tests.

- [ ] **Step 6: Commit automation changes**

```bash
git add automation scripts/update-rules.mjs
git commit -m "feat: publish frontier client artifacts"
```

## Task 6: Add official-core rule compilation and full verification gates

**Files:**
- Create: `clients/sing-box/scripts/compile-rules.mjs`
- Modify: `package.json`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/check-secrets.mjs` only if the existing scanner needs an explicit public-path rule
- Modify: `test/foundation.test.js`, `test/public.test.js`, `test/security.test.js`
- Test: `clients/sing-box/test/rule-compile.test.js`, `test/frontier-verification.test.js`

**Interfaces:**
- `compileRules({ corePath, sourceDirectory, outputDirectory }) -> Promise<{ files, version }>` invokes only an explicitly supplied official `sing-box` core and rejects nonzero exit, missing output, or a source/output hash mismatch.
- `npm run verify:surge`, `npm run verify:singbox`, and root `npm run verify` run workspace tests/builds, fixture checks, secret scans, and public snapshot checks.

- [ ] **Step 1: Write failing compiler and verification tests**

Use a temporary executable fixture that records arguments and writes a known `.srs` file; assert the script passes `rule-set compile`, never accepts a fake text file as `.srs`, and returns a failure when no core is configured. Assert root tests include both new workspaces and public manifest paths.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test clients/sing-box/test/rule-compile.test.js test/frontier-verification.test.js`
Expected: FAIL because the compiler and root hooks do not exist.

- [ ] **Step 3: Implement compiler and root verification hooks**

Use `spawn` with an argument array, no shell interpolation, explicit output directory validation, and secret-safe aggregate errors. Keep source JSON as the auditable fallback artifact, but never label source JSON as binary `.srs`.

- [ ] **Step 4: Run the complete local verification suite**

Run: `npm run verify`
Expected: PASS with no warnings, no secret findings, deterministic examples, valid public manifests, and existing client snapshots unchanged.

- [ ] **Step 5: Commit verification gates**

```bash
git add package.json scripts test clients/sing-box
git commit -m "test: add frontier verification gates"
```

## Task 7: Final canary documentation, review, and release preparation

**Files:**
- Modify: `README.md`
- Modify: `docs/implementation-status.md`
- Create: `docs/frontier-release-checklist.md`
- Test: `test/docs-frontier.test.js`

- [ ] **Step 1: Write failing documentation test**

Require the README and release checklist to include exact public paths for Surge Mac/iPhone/iPad, sing-box Mac/iPhone/iPad/Android/OpenWrt, `edge/current/previous`, the private Sub-Store boundary, and the canary order `Intel Mac → iPhone → iPad` plus `Mac → Android → iPhone/iPad → OpenWrt test VLAN → home gateway`.

- [ ] **Step 2: Run documentation test and verify RED**

Run: `node --test test/docs-frontier.test.js`
Expected: FAIL because the new public entry documentation is not present.

- [ ] **Step 3: Add release checklist and usage docs**

Document import, refresh, urltest, domestic direct routing, overseas proxy routing, DNS, IPv4/IPv6, QUIC/UDP, network switching, restart, rollback, and the rule that `current` is not promoted until device canary evidence is recorded.

- [ ] **Step 4: Run final verification and inspect the diff**

Run: `npm run verify`, `git diff --check`, and `git status --short --branch`.
Expected: all verification commands pass, no untracked generated secrets exist, and only intended files are modified.

- [ ] **Step 5: Commit release documentation**

```bash
git add README.md docs/implementation-status.md docs/frontier-release-checklist.md test/docs-frontier.test.js
git commit -m "docs: add frontier client release checklist"
```

- [ ] **Step 6: Prepare GitHub publication**

After verification, use the GitHub publishing workflow to review the commit scope, push the feature branch, open a draft PR, and report the PR URL. Do not claim real-device canary completion until the user supplies or confirms device results; publish code and `edge` artifacts separately from `current` promotion.

## Self-review checklist

- Spec coverage: Tasks 1–2 cover shared contracts and Surge; Tasks 3–4 cover sing-box and all requested platforms; Tasks 5–6 cover rules, manifests, channels, compiler, security, and verification; Task 7 covers docs and release handoff.
- Placeholder scan: the plan contains no `TBD`, `TODO`, `FIXME`, or unspecified “handle edge cases” step.
- Type consistency: all later tasks consume the exact function names and object shapes defined in earlier tasks; bundle entrypoints return `$content`; public artifact functions return `Map<string,string>`.
- Fail-closed behavior: unsupported node fields/protocols, missing official core, invalid manifest hashes, unresolved policy graphs, DNS loops, and public-secret leakage all have explicit failing tests.
- Existing compatibility: every automation/root task retains the existing three-client output paths and tests before adding the two new clients.
