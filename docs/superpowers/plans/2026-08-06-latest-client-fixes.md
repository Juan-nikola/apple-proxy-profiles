# 最新客户端兼容与节点命名 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 修复 sing-box 1.14 schema、恢复 Surge 主节点候选并发布紧凑共享节点名，同时验证最新 core。

**Architecture:** 共享节点层负责 provenance、短名称和能力后缀；各客户端继续消费同一规范化节点。sing-box 使用显式 HTTP client 和 rule-set 引用，Surge 使用现有内嵌节点模式；构建流程生成并校验 dist、examples 和 public 产物。

**Tech Stack:** Node.js 24 runtime、Node built-in test runner、ES modules、esbuild 0.28.1、官方 sing-box 1.14.0-beta.8。

## Global Constraints

- 真实节点、订阅 Token、UUID、密码、私钥和私密 URL 不得进入仓库。
- 当前验证版本为 \`1.14.0-beta.8\`；后续 release 必须先通过官方 check 再更新。
- sing-box 结果不得包含 \`geoip\`、\`geosite\`、\`download_detour\` 或 \`store_rdrc\`。
- Surge 继续使用内嵌节点模式，不新增 \`proxyPolicyUrl\` 或新的 Sub-Store 任务。
- 节点名格式为 \`<旗帜> <短名称>｜<来源>·<能力>\`，未知来源不显示“未知”。
- dist、examples、public 只能由构建脚本生成。

---

### Task 1: Add failing regression tests

**Files:**
- Modify: \`clients/sing-box/test/config.test.js\`
- Modify: \`clients/sing-box/test/validation.test.js\`
- Modify: \`clients/surge/test/profile.test.js\`
- Modify: \`clients/shadowrocket/test/normalization.test.js\`
- Modify: \`clients/shadowrocket/test/classification.test.js\`

- [ ] Add sing-box assertions for one tagged HTTP client, default HTTP client,
  every rule-set reference, no old fields, and ChinaMax direct routes.
- [ ] Add Surge assertion that \`🚀 节点选择\` contains all compatible node names
  after \`⚡ 全部自动\`.
- [ ] Add naming fixtures where provenance starts with \`[未标记]\` but a later
  provenance field or the original node name contains \`[自建]\`.
- [ ] Run focused tests and verify they fail for the expected missing behavior:

\`\`\`bash
NODE=/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
\$NODE --test clients/sing-box/test/config.test.js clients/sing-box/test/validation.test.js
\$NODE --test clients/surge/test/profile.test.js
\$NODE --test clients/shadowrocket/test/normalization.test.js clients/shadowrocket/test/classification.test.js
\`\`\`

### Task 2: Implement sing-box 1.14 schema

**Files:**
- Modify: \`clients/sing-box/src/render-rules.js\`
- Modify: \`clients/sing-box/src/render-config.js\`
- Modify: \`clients/sing-box/src/validate-config.js\`

- [ ] Export a rule-download HTTP client tag and render each remote rule-set
  with \`http_client\`, never \`download_detour\`.
- [ ] Render top-level \`http_clients\` with HTTP/2 version 2 and
  \`detour: "🧭 DNS 与规则下载"\`; set
  \`route.default_http_client\` to that tag.
- [ ] Remove the final \`geoip\` route and emit
  \`experimental.cache_file.store_dns: true\` without \`store_rdrc\`.
- [ ] Extend validation to reject removed fields and validate HTTP client tags,
  default references, rule-set references, and cache fields.
- [ ] Run the focused sing-box tests and confirm GREEN.

### Task 3: Implement compact shared node names

**Files:**
- Modify: \`shared/nodes/source-labels.js\`
- Modify: \`shared/nodes/normalize-nodes.js\`
- Modify: \`shared/policies/filters.js\`
- Modify: \`clients/egern/test/groups.test.js\`
- Modify: \`clients/shadowrocket/test/normalization.test.js\`
- Modify: \`clients/shadowrocket/test/classification.test.js\`

- [ ] Add a recognized-marker helper that scans all provenance fields, skips
  \`[未标记]\`, and falls back to known markers in the original node name.
- [ ] Strip source/UDP/chain markers, duplicate flags, and only clearly matching
  region/protocol tokens from the short name.
- [ ] Render \`<flag> <short>｜<source>·<capability>\`; omit unknown source text
  while retaining diagnostics and stable collision suffixes.
- [ ] Update source and game regex filters for the new delimiter and \`·U\`.
- [ ] Run all client policy and normalization tests.

### Task 4: Restore Surge published bundle parity

**Files:**
- Modify: \`clients/surge/test/bundles.test.js\`
- Generated: \`clients/surge/dist/\`
- Generated: \`public/current/surge/\`
- Generated: \`public/edge/surge/\`

- [ ] Add a bundle regression assertion for primary node filtering and compact
  naming logic.
- [ ] Rebuild Surge bundles and sanitized fixtures:

\`\`\`bash
\$NODE clients/surge/scripts/build.mjs
\$NODE clients/surge/scripts/render-fixtures.mjs
\`\`\`

- [ ] Run all Surge tests and assert the primary group has node candidates.

### Task 5: Rebuild, verify, and document latest-version policy

**Files:**
- Modify: \`README.md\`
- Modify: \`clients/sing-box/docs/\`
- Modify: \`clients/surge/docs/\`
- Generated: \`clients/*/dist/\`, \`clients/*/examples/\`,
  \`public/current/\`, \`public/edge/\`

- [ ] Document that the current verified core is 1.14.0-beta.8 and future
  releases require schema tests plus official \`sing-box check\`.
- [ ] Rebuild every client and render sanitized fixtures.
- [ ] Run root, all client, secret, Actions, and diff checks.
- [ ] Run \`sing-box version\` and \`sing-box check -c\` for macOS, iPhone,
  iPad, Android, and OpenWrt examples.
- [ ] Repeat the build and expect no additional diff.
- [ ] Commit with:

\`\`\`bash
git add docs clients shared public README.md
git diff --cached --check
git commit -m "fix: align latest client schemas and node naming"
\`\`\`

### Task 6: Handoff

- [ ] Report the isolated worktree, commit, test summary, and exact core version.
- [ ] Provide public artifact paths and private Sub-Store refresh steps.
- [ ] List any remaining device-side canary checks.
