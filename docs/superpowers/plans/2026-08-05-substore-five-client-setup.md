# Sub-Store 五客户端统一引用与维护文档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一个只在 Sub-Store 保存私密节点的统一配置流程，让 `snell` 与 `vlesshy2` 通过 `apple-proxy-sources` 同时服务 Egern、Anywhere、Shadowrocket、Surge 和 sing-box，并完善从新手部署到代码维护的中文文档。

**Architecture:** GitHub Pages 只发布 7 个公开、无节点的远程 JavaScript 入口；Sub-Store 创建一个私密组合订阅 `apple-proxy-sources`，16 个 File/Script Operator 任务通过 `name=apple-proxy-sources` 和 URL hash 参数引用它。仓库 README、总指南、维护手册和五个客户端文档共享同一套参数表，真实订阅 URL、API 地址、节点和输出链接不进 Git。

**Tech Stack:** Markdown, Node.js 22+, npm workspaces, Node test runner, esbuild, GitHub Pages, Sub-Store remote Script/File tasks.

## Global Constraints

- 私密组合名称固定为 `apple-proxy-sources`；输入来源为 Sub-Store 中已有的 `snell` 和 `vlesshy2`。
- 公开文档只能出现 GitHub Pages JS URL、公开规则 URL 和 `example.invalid`；不得出现真实 Sub-Store API、节点源、输出订阅、服务器、凭据或 Token。
- 新任务优先保存远程 JS URL 和可视化参数；旧版单行模式使用 `JS_URL#arg=value&arg2=value`，不能使用 `?` 传脚本参数。
- 规范入口为 7 个：Shadowrocket 节点/配置、Egern 节点/配置、Anywhere 节点、Surge 配置、sing-box 配置；旧 `substore-*` 仅兼容，不重复部署。
- 五个客户端共 16 个 Sub-Store 输出任务：Egern 4、Anywhere 1、Shadowrocket 4、Surge 3、sing-box 5。
- 不手工编辑 `clients/*/dist/`、`clients/*/examples/`、`public/` 或自动生成的规则快照；代码修改只落在 `src/`、测试、源目录和文档。
- sing-box `.srs` 只能由显式官方 sing-box core 编译器生成；没有官方可执行文件时必须失败关闭，不能用文本伪装二进制。
- 完成前必须运行文档测试、客户端测试、构建、秘密扫描、Actions 检查和规则检查；没有真机 canary 不得宣称已完成设备验收。

---

### Task 1: 更新根 README 与统一 Sub-Store 任务清单

**Files:**
- Modify: `README.md`
- Modify: `docs/substore-two-layer-setup.md`
- Test: `clients/egern/test/docs.test.js`, `clients/anywhere/test/docs.test.js`, `clients/shadowrocket/test/docs.test.js`, `clients/surge/test/docs.test.js`, `clients/sing-box/test/docs.test.js`

**Interfaces:**
- Consumes: Existing 7 public Pages entrypoints and existing option parsers in `clients/*/src/options.js`.
- Produces: One copy-safe public URL table, one 16-task private Sub-Store table, and a consistent `apple-proxy-sources` parameter contract.

- [ ] **Step 1: Record the current public entrypoints and option keys**

Use these URLs in docs, with `current/` as the default:

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js
```

Use the existing option parsers to keep required keys exact: Egern/Anywhere node output uses `output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`; profile/config output uses `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=...` plus each client’s existing defaults. `Apple-Proxy-Nodes` is a public example display name only and must be described as replaceable by the same private subscription display name.

- [ ] **Step 2: Rewrite the root overview**

Change the three-client wording to five clients, add Surge and sing-box platform coverage, link `docs/maintenance.md`, and add a short “first deployment” sequence: create collection, verify preview, create node task, create client outputs, canary one device at a time, then switch from `edge` to `current`.

- [ ] **Step 3: Replace the central guide’s three-client task model**

Add a table with exactly 7 public JS URLs and a table with exactly 16 tasks. Each task row must include: task name, Sub-Store object type, remote URL, hash-form arguments, platform, update cadence, dependency, and expected preview shape. Use `example.invalid/private/...` for private output URL examples.

- [ ] **Step 4: Add copy-safe parameter blocks**

For each platform, provide both the hash form and key/value form. Include at least these platform values: Egern `macos|iphone|ipad`, Anywhere node YAML, Shadowrocket `macos|iphone|ipad`, Surge `macos|iphone|ipad`, sing-box `macos|iphone|ipad|android|openwrt` with `channel=current` and `channel=edge` examples. State that `&` joins arguments inside the hash and `?` is not used for script arguments.

- [ ] **Step 5: Update documentation tests**

Add assertions that the central guide contains `apple-proxy-sources`, all 7 canonical script URLs, the 16-task count, `#output=config`, `#output=nodes`, `channel=current`, `channel=edge`, and no real-secret-shaped URL. Run each client’s docs test and fix only documentation expectations.

- [ ] **Step 6: Run the documentation test slice**

Run:

```bash
node --test clients/egern/test/docs.test.js clients/anywhere/test/docs.test.js clients/shadowrocket/test/docs.test.js clients/surge/test/docs.test.js clients/sing-box/test/docs.test.js
```

Expected: PASS; failures must identify stale three-client wording or a missing canonical URL/parameter.

- [ ] **Step 7: Commit the task**

```bash
git add README.md docs/substore-two-layer-setup.md clients/*/test/docs.test.js
git commit -m "docs: document unified five-client Sub-Store tasks"
```

### Task 2: Add cross-client maintenance and directory map documentation

**Files:**
- Create: `docs/maintenance.md`
- Modify: `README.md`
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Consumes: Existing workspace package scripts, `scripts/verify.mjs`, `scripts/check-secrets.mjs`, `scripts/check-actions.mjs`, `scripts/update-rules.mjs`, and client README/deployment documents.
- Produces: A decision tree that tells a maintainer exactly which file to change for nodes, public rules, routing policy, client behavior, compiler/toolchain, tests, and releases.

- [ ] **Step 1: Map the repository tree**

Document these responsibilities without listing generated secrets:

```text
shared/                         client-neutral contracts, policies, normalization
clients/egern/src/              Egern YAML nodes and Profiles
clients/anywhere/src/           Anywhere Clash YAML and rule/import logic
clients/shadowrocket/src/       Shadowrocket nodes, INI Profile, groups, rules
clients/surge/src/              Surge nodes, Profile, groups, rules
clients/sing-box/src/           sing-box JSON, routes, DNS, rule-set compiler boundary
clients/*/scripts/              build, fixtures, rule rendering, compatibility checks
clients/*/test/                 client unit, bundle, docs, and security tests
clients/*/examples/             sanitized structural fixtures only
clients/*/dist/                 generated bundles; never hand-edit
automation/                     immutable source fetch and public snapshot rendering
public/                         generated Pages tree; never hand-edit
.github/workflows/              immutable-SHA update and Pages deployment workflows
```

- [ ] **Step 2: Write the maintenance decision tree**

Cover these exact workflows:

1. Add/remove a node source: edit only the private Sub-Store collection; rerun affected tasks.
2. Add/change a public rule: edit the allowlisted source catalog or upstream SHA, not `public/`; run `npm run update:rules` or `npm run check:rules` as appropriate.
3. Change a client default: edit the client option/policy source and its tests; rebuild generated bundles.
4. Add a protocol: update shared contracts, capability filtering, each supported adapter, tests, fixtures, and docs; do not silently drop fields.
5. Change sing-box official-core behavior: update the explicit compiler boundary and compatibility tests; never replace `.srs` with JSON/text.
6. Release: run the full gates, push only intentional generated outputs, wait for Pages, verify HTTP 200 and hashes, then canary.

- [ ] **Step 3: Document build commands for every environment**

Include macOS/Linux development commands:

```bash
node --version
npm --version
npm ci
npm run build
npm run fixtures
npm run verify
npm run check:actions
npm run check:rules
```

Include per-client commands:

```bash
npm --workspace @apple-proxy-profiles/egern run verify
npm --workspace @apple-proxy-profiles/anywhere run verify
npm --workspace @apple-proxy-profiles/shadowrocket run verify
npm --workspace @apple-proxy-profiles/surge run verify
npm --workspace @apple-proxy-profiles/sing-box run verify
```

Explain that the official macOS/iPhone/iPad/Android clients consume generated output and are not compiled from this repository; OpenWrt uses the generated JSON plus the official sing-box binary. Node.js/npm and official sing-box core are built on a development machine or CI, not by copying binaries into Git.

- [ ] **Step 4: Add upgrade, rollback, and secret rules**

Explain `current` versus `edge`, `previous` and immutable manifest versions, canary order, how to preserve old Profiles, and why the provided private Sub-Store API link must never be pasted into README, commits, issues, terminal logs, screenshots, or generated public files.

- [ ] **Step 5: Add links from the root README and implementation status**

Make the maintenance guide discoverable from the root quick-start and record that documentation is complete while real-device canary remains a user-side step.

- [ ] **Step 6: Commit the task**

```bash
git add README.md docs/maintenance.md docs/implementation-status.md
git commit -m "docs: add repository maintenance and build guide"
```

### Task 3: Align each client README and deployment guide

**Files:**
- Modify: `clients/egern/README.md`, `clients/egern/docs/deployment.md`
- Modify: `clients/anywhere/README.md`, `clients/anywhere/docs/deployment.md`
- Modify: `clients/shadowrocket/README.md`, `clients/shadowrocket/docs/deployment.md`
- Modify: `clients/surge/README.md`, `clients/surge/docs/deployment.md`
- Modify: `clients/sing-box/README.md`, `clients/sing-box/docs/deployment.md`, `clients/sing-box/docs/openwrt.md`

**Interfaces:**
- Consumes: The central `apple-proxy-sources` task contract from Task 1 and the maintenance commands from Task 2.
- Produces: Five self-contained client guides with exact public links, task parameters, platform-specific import instructions, and file ownership.

- [ ] **Step 1: Normalize the shared private source name in examples**

Use `apple-proxy-sources` in public examples. Keep `snell` and `vlesshy2` only as Sub-Store source labels; never include their private URLs. Mark `Apple-Proxy-Nodes` as a replaceable display name in every profile/config guide.

- [ ] **Step 2: Complete Egern and Anywhere guides**

Egern must show the node File first, then three Profile Files, `nodeSubscriptionUrl=...`, mobile versus macOS IPv6 defaults, and the exact `ipv6:`/`dns:`/`policy_groups:`/`rules:` preview checks. Anywhere must explain that only nodes are remotely generated, while `.arrs` rules and device bindings remain a separate public/local layer; include the all-rules import URL and the binding warning.

- [ ] **Step 3: Complete Shadowrocket guide**

Document the node Script Operator plus three Profile Files, the exact `subscriptionName` matching rule, domestic-direct defaults, macOS/iPhone/iPad import order, and the public rule/diagnostic boundaries.

- [ ] **Step 4: Complete Surge guide**

Document the single Surge Profile Generator URL, three platform File tasks, the exact parameter differences (`ipv4-only` for macOS and `auto` for mobile), INI preview checks, official Surge client import, and stable/test channel choice.

- [ ] **Step 5: Complete sing-box guide**

Document the single Config Generator URL, five platform File tasks, `channel=current|edge`, JSON preview checks, mobile TUN versus OpenWrt transparent-gateway differences, official sing-box testing channel caveat, and `.srs` compiler requirements.

- [ ] **Step 6: Add file ownership tables**

Each README must include “改什么去哪里” with source files, tests, examples, generated dist, public artifacts, and client-only docs. Generated paths must be labeled read-only.

- [ ] **Step 7: Update client docs tests**

Add or adjust assertions for public URLs, `apple-proxy-sources`, platform lists, current/edge channels, and the documented build/preview steps. Run each workspace’s docs test.

- [ ] **Step 8: Commit the task**

```bash
git add clients/*/README.md clients/*/docs
git commit -m "docs: complete client deployment and maintenance guides"
```

### Task 4: Configure the private Sub-Store objects without persisting secrets

**Files:**
- No repository files may contain the private API link, node URLs, or generated private output URLs.
- Reference only: the public Pages URLs in `docs/substore-two-layer-setup.md`.

**Interfaces:**
- Consumes: Existing private Sub-Store source names `snell` and `vlesshy2`, and the public 7-script table.
- Produces: Private collection `apple-proxy-sources`, 16 private output tasks, and one private output URL per task/platform.

- [ ] **Step 1: Create the collection**

In the user’s Sub-Store, create `apple-proxy-sources` and add only the existing `snell` and `vlesshy2` sources. Preview it before adding any generator.

- [ ] **Step 2: Create node outputs**

Create Egern and Anywhere node File tasks, plus the Shadowrocket node Script Operator, each using the public URL and `#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`. Confirm non-empty previews without exposing node values.

- [ ] **Step 3: Create platform outputs**

Create the three Egern, three Shadowrocket, three Surge, and five sing-box platform tasks using the central guide’s exact parameters. Use `channel=current` for production; test `edge` only in an isolated task. Save every generated private URL only in Sub-Store/device storage.

- [ ] **Step 4: Verify task refresh order**

Refresh the collection first, then node output, then platform output. Keep `noCache` off normally and `insecure` off always. Do not paste private output URLs into chat or repository files.

### Task 5: Verify, publish, and hand off

**Files:**
- Modify only generated artifacts produced by the approved build commands.
- Test: root and all workspace test suites.

- [ ] **Step 1: Run format and secret checks**

```bash
git diff --check
npm run check:secrets
npm run check:actions
```

Expected: no whitespace errors, no secrets, and all workflows remain pinned/minimal.

- [ ] **Step 2: Run root and workspace tests/builds**

```bash
npm test
npm run build
npm run fixtures
npm run verify
npm run check:rules
```

Expected: all tests pass, generated bundles are deterministic, public snapshot hashes close, and official-core absence fails closed where required.

- [ ] **Step 3: Review the final diff**

Run `git status --short`, `git diff --stat`, and `git diff --check`. Confirm no private API link or node value appears in the diff. Confirm documentation says device canary is still required.

- [ ] **Step 4: Commit and push**

```bash
git add README.md docs clients
git commit -m "docs: complete five-client Sub-Store operations guide"
git push origin HEAD:refs/heads/agent/surge-sing-box-design
git push origin HEAD:refs/heads/main
```

Use the repository’s existing GitHub deploy key only for the push; never add it to the repository or documentation.

- [ ] **Step 5: Verify published URLs**

Check HTTP 200 for at least the current Surge and sing-box scripts and the public Anywhere import page, then report the seven stable script URLs, the private task setup status, and the remaining one-device-at-a-time canary requirement.

