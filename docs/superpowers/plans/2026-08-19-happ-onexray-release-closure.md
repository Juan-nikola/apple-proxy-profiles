# HAPP 与 OneXray 发布闭环实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 HAPP 与 OneXray 从“私密 renderer + edge 脚本”收尾为具有确定性 GeoData、公开安装层和可回滚发布通道的 active 客户端。

**Architecture:** 复用当前共享轻量规则编译器、client catalog、root manifest 和原子发布流程；新增独立 Xray GeoData 编译/校验模块与无凭据安装页，随后把两个客户端的静态入口和平台清单接入同一套 edge/current/previous/version 闭包。

**Tech Stack:** Node.js 22 ESM、Node built-in test runner、npm workspaces、protobufjs、Xray protobuf schema、静态 HTML、现有发布与秘密扫描工具。

**Spec:** `docs/superpowers/specs/2026-08-19-happ-onexray-release-closure-design.md`

## Global Constraints

- HAPP 与 OneXray 继续使用当前通过测试的私密 renderer，不把节点或策略正文写进公开产物。
- GeoData 只从 `compileLightweightRules()` 的默认规则集生成；`Advertising` 与 `Advertising_Domain` 只能留在 optional pack。
- 所有 public URL 使用 `https://juan-nikola.github.io/apple-proxy-profiles/<channel>/...`，不使用 `master`、query、fragment、认证信息或私密域名。
- 六个平台的 frontier 状态只能反映真实输入；没有设备证据时不得写 `validated`。
- 每个任务先写失败测试，再写最小实现；生成的 `dist/` 和 `public/` 只在对应构建/fixture 验证后更新。

### Task 1: 恢复并收紧 Xray GeoData 合同

**Files:**
- Create: `clients/happ/proto/geodata.proto`
- Create: `clients/onexray/src/geodata-contract.js`
- Create: `automation/src/render-happ-geodata.js`
- Create: `automation/src/render-xray-geodata.js`
- Test: `clients/happ/test/geodata.test.js`
- Test: `clients/onexray/test/geodata.test.js`
- Test: `automation/test/build-artifacts.test.js`

**Interfaces:**
- Consumes: `Map<string, { id, entries, sourceSha256? }>` from the compiled lightweight default snapshot.
- Produces: `renderHappGeodata(ruleSets)`, `decodeHappGeodata(files)`, `renderXrayGeoData(ruleSets, channel)`, `decodeXrayGeoData(bytes, type)`, `buildOneXrayGeoDataArtifacts({ ruleSets, upstream, channel, publicBase })`.

- [ ] **Step 1: Add failing tests for category codes, omitted optional sources, canonical sorting, and decode round trips.**
- [ ] **Step 2: Run `node --test clients/happ/test/geodata.test.js clients/onexray/test/geodata.test.js` and confirm the missing-module failures.**
- [ ] **Step 3: Restore the vendored protobuf schema and implement deterministic HAPP/OneXray encoders with source-ID validation, CIDR canonicalization, duplicate removal, and stable category ordering.**
- [ ] **Step 4: Add manifest creation and validation that records channel, upstream identity, input hashes, file hashes, rule counts, and exactly two data files.**
- [ ] **Step 5: Run the focused tests and confirm PASS before touching publication code.**

### Task 2: Add credential-free installation pages and static entry contracts

**Files:**
- Create: `clients/happ/src/build-import-page.js`
- Create: `clients/happ/src/render-routing-profile.js`
- Create: `clients/onexray/src/profile-codec.js`
- Create: `clients/onexray/src/profile-link.js`
- Create: `clients/onexray/src/build-import-page.js`
- Modify: `clients/happ/package.json`
- Modify: `clients/onexray/package.json`
- Test: `clients/happ/test/import-page.test.js`
- Test: `clients/onexray/test/import-page.test.js`
- Test: `clients/onexray/test/profile-link.test.js`

**Interfaces:**
- Consumes: validated GeoData manifests and assets from Task 1; current HAPP/OneXray profile shapes.
- Produces: static `index.html` renderers, canonical `happ://`/`onexray://` links, and local-only policy helper boundaries.

- [ ] **Step 1: Write tests that reject query-bearing/insecure/credentialed URLs and private fields in HTML.**
- [ ] **Step 2: Run the focused page/link tests and verify RED.**
- [ ] **Step 3: Implement escaped static pages with channel notices, hashes, HTTPS download links, and manual fallback instructions.**
- [ ] **Step 4: Implement browser-safe OneXray profile hashing/encoding and canonical deep-link round trips without Node-only APIs.**
- [ ] **Step 5: Run HAPP and OneXray focused tests plus `npm run check:secrets`.**

### Task 3: Integrate native assets into build and publication manifests

**Files:**
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `automation/src/refresh-current.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `shared/release/channel-closure.js`
- Test: `automation/test/build-artifacts.test.js`
- Test: `automation/test/build-site.test.js`
- Test: `automation/test/refresh-current.test.js`
- Test: `test/update-rules.test.js`

**Interfaces:**
- Consumes: Task 1/2 GeoData artifacts and existing static bundle map.
- Produces: seven closed client manifests, root manifest records for native assets, channel-rebound install pages, and promotion/rollback verification for both clients.

- [ ] **Step 1: Add failing tests showing HAPP/OneXray native files are absent from the generated client manifests and current channel.**
- [ ] **Step 2: Run the focused publication tests and verify RED.**
- [ ] **Step 3: Add HAPP/OneXray GeoData and public scripts to `buildClientArtifacts()` before manifest accounting; preserve lightweight byte budgets by excluding native GeoData from rule-byte totals.**
- [ ] **Step 4: Validate native file closures, rewrite channel URLs for `edge`/`current`/`previous`, refresh root/client manifests, and keep immutable versions byte-identical.**
- [ ] **Step 5: Run the publication tests and confirm all channels pass closure validation.**

### Task 4: Expand frontier platform contracts and documentation

**Files:**
- Modify: `shared/release/frontier-manifest.js`
- Modify: `automation/src/render-frontier-artifacts.js`
- Modify: `automation/test/frontier-artifacts.test.js`
- Modify: `test/frontier-contract.test.js`
- Modify: `README.md`
- Modify: `docs/implementation-status.md`
- Create: `clients/happ/README.md`
- Create: `clients/happ/docs/deployment.md`
- Create: `clients/happ/docs/troubleshooting.md`
- Create: `clients/happ/docs/canary.md`
- Modify: `clients/onexray/README.md`
- Create: `clients/onexray/docs/deployment.md`
- Create: `clients/onexray/docs/troubleshooting.md`
- Create: `clients/onexray/docs/canary.md`

**Interfaces:**
- Consumes: native public paths and active client catalog.
- Produces: six-platform HAPP/OneXray frontier records, explicit `candidate`/`validated` semantics, and synchronized user/operator docs.

- [ ] **Step 1: Add failing assertions for six-platform frontier coverage, active client links, and canary-pending language.**
- [ ] **Step 2: Run the focused contract/documentation tests and verify RED.**
- [ ] **Step 3: Extend frontier platform maps and native directory recognition without weakening secret checks or allowing unknown paths.**
- [ ] **Step 4: Write deployment, rollback, troubleshooting, and per-platform canary instructions that never claim unexecuted device validation.**
- [ ] **Step 5: Run focused tests and `git diff --check`.**

### Task 5: Rebuild tracked artifacts and run the full verification gate

**Files:**
- Modify: `public/edge/**`
- Modify: `public/current/**`
- Modify: `public/previous/**`
- Modify: `public/manifest.json`
- Modify: `public/rollout.json`
- Modify: `clients/happ/dist/**`
- Modify: `clients/onexray/dist/**`
- Test: existing full suite and workspace verification scripts.

**Interfaces:**
- Consumes: all implementation tasks and the checked-in rule snapshot.
- Produces: deterministic tracked HAPP/OneXray public artifacts with matching manifests and no secrets.

- [ ] **Step 1: Install exact dependencies with `npm ci`.**
- [ ] **Step 2: Run `npm test`, `npm run build`, `npm run fixtures`, `npm run verify`, `npm run check:secrets`, `npm run check:actions`, and `git diff --check`.**
- [ ] **Step 3: Regenerate only the HAPP/OneXray bundles and public channel artifacts using the repository's offline/staged inputs; verify `edge`, `current`, `previous`, and immutable version hashes.**
- [ ] **Step 4: Re-run the full verification commands after regeneration and inspect `git status --short --branch`.**
- [ ] **Step 5: Commit the completed closure with `git commit -m "feat: close HAPP and OneXray publication loop"`.**

