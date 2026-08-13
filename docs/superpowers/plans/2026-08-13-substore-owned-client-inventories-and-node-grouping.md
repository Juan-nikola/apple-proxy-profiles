# SubStore 自主管理客户端节点池与国旗分组实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将六个客户端的节点选择边界移到用户自己的 SubStore 组合中。仓库只对对应组合中的节点做通用校验、去重、国旗/洲别归纳、协议名称标注、稳定排序和客户端格式渲染；不再调用客户端协议白名单静默删除节点，并为 Egern、Anywhere、Shadowrocket、Surge、sing-box 和 OneXray 提供可维护的独立组合输入。

**Architecture:** 保留 `apple-proxy-sources` 作为迁移和回滚入口；新增文档约定的 `apple-proxy-all` 总组合及六个客户端组合。共享归一化层把节点命名为“国旗 + 节点名 + 协议标签 + 来源/能力后缀”，共享策略组层生成“主组 → 洲组 → 国旗组 → 节点”。Egern、Shadowrocket、Surge 和 sing-box 使用这套策略组树；Anywhere 只输出 Clash `proxies` 列表，由 App 本地管理策略组。OneXray 沿用仓库已经审计的原生模型：其 Profile 不伪造 Xray selector，`🚀 节点选择` 的语义由 OneXray 首页运行时 `proxy` 和私密节点订阅承载。所有客户端都对用户选入但当前渲染器无法表示的协议显式失败，并按客户端和协议聚合错误。

**Tech Stack:** Node.js 22+ ESM、npm workspaces、Node 内置 test runner、esbuild、SubStore `produceArtifact({ type: "collection", name, platform: "JSON", produceType: "internal" })`、现有各客户端渲染器、现有公开构建和秘密扫描流水线。

## Global Constraints

- 不把真实 SubStore API、节点服务器、端口、UUID、密码、PSK、私钥、固定节点名或私密输出 URL 写入源码、fixture、公开文档、日志或 `public/`。
- 六个客户端任务均从自己的组合名读取节点：`apple-proxy-egern`、`apple-proxy-anywhere`、`apple-proxy-shadowrocket`、`apple-proxy-surge`、`apple-proxy-singbox`、`apple-proxy-onexray`；组合名通过参数传入，代码不再硬编码 `apple-proxy-sources`。
- `apple-proxy-sources` 只作为兼容迁移入口保留；新任务、示例和维护文档使用客户端组合名，`apple-proxy-all` 只作为用户在 SubStore 中建立的总组合名称。
- 通用验证仍拒绝空节点、无名称节点、无服务器节点、非法端口和协议必填认证字段缺失；通用验证不是客户端能力筛选。
- `filterNodesForClient()` 不得出现在六个客户端的 SubStore 输出路径中。旧能力诊断 API 如需暂时保留，只能作为兼容测试或显式审计工具，不能改变任务输出集合。
- 渲染器必须在输出前验证整个用户选择的节点集合；某个协议不能渲染时任务整体失败，错误只包含客户端名、规范化协议名和数量，不包含节点值。
- 已知协议使用规范显示名；未知协议使用规范化后的原始类型字符串，不能在归一化阶段变成空标签或被丢弃。
- 节点名中的第一个国旗优先于城市/国家文字推断；冲突和多国旗只增加聚合诊断，不能改变国旗分组依据。没有国旗且无法推断的节点进入 `🌐 其他/未分类`。
- 来源、UDP、已有链、生成链和 `🔗` 前缀的既有正则语义必须继续有效。协议标签必须插入来源和能力后缀之前，不能破坏 `｜机场`、`｜自建`、`·U`、`·链` 和 `🔗` 的匹配。
- 不为每个国旗再生成协议子组；协议只作为节点名称和 `_profile` 元数据维度，避免策略组树过深。
- OneXray 不生成未被其原生 Profile schema 支持的策略组对象。OneXray 继续使用首页当前节点作为运行时 `proxy`，节点订阅按归一化顺序提供可选节点；该例外必须在代码注释、测试和文档中明确。
- 所有行为变更先写失败测试，再实现；每个任务完成后运行该任务的聚焦测试并创建一个独立提交。不要手工编辑 `dist/`、`public/` 或生成的示例。

---

## File Structure and Responsibilities

### Shared node and SubStore contracts

- Modify `shared/nodes/protocol-registry.js`: 保留协议规范化、通用必填字段和已知协议显示名；增加一个不为空的协议显示标签接口，不再让输出路径把 `clients` 字段当作筛选矩阵。
- Modify `shared/nodes/normalize-nodes.js`: 写入协议标签元数据，按洲、国旗、协议标签、名称、稳定身份排序，并在来源/能力后缀前插入协议标签。
- Modify `shared/nodes/regions.js` and `shared/nodes/country-regions.js`: 保留国旗优先规则，提供确定性的国旗组显示名和国旗到洲的辅助接口。
- Create `shared/nodes/renderability.js`: 提供不泄露节点值的全量渲染断言，聚合客户端和协议失败计数，不返回被筛掉的节点集合。
- Create `shared/substore/collection-name.js`: 统一校验 SubStore 组合名为非空、单行、ASCII slug、长度受限的安全字符串。
- Modify `shared/policies/filters.js`, `shared/policies/catalog.js`, and `shared/policies/schema.js`: 增加国旗过滤器、国旗组 schema、动态存在组推断和新的候选关系。

### Client entry and renderer changes

- Egern: modify `clients/egern/src/adapt-substore-nodes.js`, `render-node.js`, `render-subscription.js`, `substore-nodes-entry.js`, and `substore-profile-entry.js`; 适配失败不再逐节点删除，AnyTLS 继续走明确渲染分支。
- Anywhere: modify `clients/anywhere/src/substore-nodes-entry.js`, `render-subscription.js`, and `render-node.js`; 组合名可配置，AnyTLS 保持 Clash 节点字段，远程输出不生成策略组。
- Shadowrocket: create `clients/shadowrocket/src/render-node.js` to hold proxy-record validation and AnyTLS fields; modify `substore-node-entry.js`, `substore-node-subscription-entry.js`, and `substore-profile-entry.js` to use the full selected inventory.
- Surge: modify `clients/surge/src/substore-nodes-entry.js`, `substore-profile-entry.js`, and `render-node.js` call boundaries; Surge 当前未实现的协议必须在组合中由用户排除，否则任务显式失败。
- sing-box: modify `clients/sing-box/src/substore-config-entry.js`, `render-node.js`, and `render-groups.js`; AnyTLS 只保留渲染器明确支持的字段，无法表示的字段触发全量失败。
- OneXray: modify `clients/onexray/src/substore-nodes-entry.js`, `substore-profile-entry.js`, `render-subscription.js`, `render-outbound.js`, and audit diagnostics; 移除能力过滤，使用完整归一化节点集合，保持原生首页 `proxy` 模型。

### Tests, docs, and generated publication

- Shared tests: `test/capabilities.test.js`, `test/lightweight-policy.test.js`, `test/substore-task-check.test.js`, and new `test/substore-collection-name.test.js`.
- Client tests: the existing node, normalization, group, SubStore entry, profile/config validation, bundle, fixture, and docs tests under `clients/{egern,anywhere,shadowrocket,surge,sing-box,onexray}/test`.
- Documentation: create `docs/substore-client-pools.md`; update `README.md`, `docs/substore-two-layer-setup.md`, `docs/maintenance.md`, `docs/implementation-status.md`, and the six client README/deployment/maintenance/troubleshooting documents that currently describe one shared input.
- Publication checks: modify `scripts/check-substore-task.mjs` and `test/substore-docs.test.js` for the six collection mapping and update generated bundles/examples through each workspace build/fixture command.

---

## Task 1: Establish protocol labels, flag metadata, and deterministic node naming

**Files:**

- Modify: `shared/nodes/protocol-registry.js`
- Modify: `shared/nodes/normalize-nodes.js`
- Modify: `shared/nodes/regions.js`
- Modify: `shared/nodes/country-regions.js`
- Modify: `clients/shadowrocket/test/normalization.test.js`
- Modify: `clients/shadowrocket/test/classification.test.js`
- Modify: `test/capabilities.test.js`

**Interfaces:**

- `protocolDisplayLabel(value): string` returns a known display name or the normalized raw type; an empty/invalid type returns `unknown`.
- `countryLabelForFlag(flag): string` returns a deterministic Chinese label for the existing common country/region map and the flag itself for an unmapped valid flag.
- `normalizeNodes()` returns `_profile.protocol` and `_profile.protocolLabel` in addition to the existing `flag`, `continent`, `sourceKind`, `udp`, `p2p`, `entry`, and `chained` fields.

- [ ] Add failing tests for these normalized names and ordering:

  ```text
  🇯🇵 Tokyo · VLESS｜自建·U
  🇩🇪 Frankfurt · AnyTLS｜机场
  🇺🇸 Los Angeles · quicx｜自建
  ```

  Assert that a node already named with `🇯🇵` stays in Japan even when its text says Frankfurt, that multiple flags use the first flag, and that an unknown region receives `🌐` and `CONTINENT.other`.
- [ ] Assert the exact sort keys: Asia-Pacific, Europe, Americas, Other; flag; protocol label; cleaned display name; stable identity. Run `node --test clients/shadowrocket/test/normalization.test.js clients/shadowrocket/test/classification.test.js test/capabilities.test.js` and verify the new expectations fail against the current names.
- [ ] Add `protocolDisplayLabel()` without changing generic required-field validation. Keep `diagnosticProtocol()` count-only behavior for unknown types.
- [ ] Add deterministic labels to the existing `RAW_REGIONS` records and expose `countryLabelForFlag()`. Use `🌐 未分类` as the display group label for the fallback flag so it cannot collide with the continent group `🌐 其他/未分类`.
- [ ] Update `cleanDisplayName()`, `compareNodes()`, `resolveNameCollisions()`, and the `_profile` construction in `normalize-nodes.js`. Remove protocol tokens before adding exactly one `· <label>` segment, and use the fallback label during collision grouping so unknown protocols never share an empty collision bucket.
- [ ] Re-run the focused commands and update affected normalized fixtures to the new exact names without changing private fixture values.
- [ ] Commit:

  ```bash
  git add shared/nodes/protocol-registry.js shared/nodes/normalize-nodes.js shared/nodes/regions.js shared/nodes/country-regions.js clients/shadowrocket/test/normalization.test.js clients/shadowrocket/test/classification.test.js test/capabilities.test.js
  git commit -m "feat: label and sort normalized nodes by protocol"
  ```

## Task 2: Remove silent client filtering and add a strict full-inventory render boundary

**Files:**

- Create: `shared/nodes/renderability.js`
- Modify: `shared/nodes/capabilities.js`
- Modify: `clients/egern/src/adapt-substore-nodes.js`
- Modify: `clients/egern/src/render-subscription.js`
- Modify: `clients/anywhere/src/render-subscription.js`
- Modify: `clients/shadowrocket/src/substore-node-entry.js`
- Modify: `clients/shadowrocket/src/substore-node-subscription-entry.js`
- Modify: `clients/shadowrocket/src/substore-profile-entry.js`
- Modify: `clients/surge/src/substore-nodes-entry.js`
- Modify: `clients/surge/src/substore-profile-entry.js`
- Modify: `clients/sing-box/src/substore-config-entry.js`
- Modify: `clients/onexray/src/substore-nodes-entry.js`
- Modify: `clients/onexray/src/substore-profile-entry.js`
- Modify: `clients/egern/test/nodes-review.test.js`
- Modify: `clients/egern/test/substore-node-adapter.test.js`
- Modify: `clients/anywhere/test/substore.test.js`
- Modify: `clients/shadowrocket/test/substore-node-entry.test.js`
- Modify: `clients/shadowrocket/test/substore-node-subscription.test.js`
- Modify: `clients/shadowrocket/test/substore-profile-entry.test.js`
- Modify: `clients/surge/test/substore-nodes-entry.test.js`
- Modify: `clients/surge/test/substore-profile-entry.test.js`
- Modify: `clients/sing-box/test/substore-config-entry.test.js`
- Modify: `clients/onexray/test/substore-nodes-entry.test.js`
- Modify: `clients/onexray/test/substore-profile-entry.test.js`

**Interfaces:**

```js
assertRenderableNodes(nodes, clientName, renderOneNode): void
```

The helper calls the supplied side-effect-free renderer for every selected node, counts failures by normalized protocol, and throws a single safe message such as `Surge cannot render selected protocols: anytls=1`. It never returns a filtered subset and never includes node names or renderer error text.

- [ ] Add failing mixed-inventory tests for each client: one renderable node plus one selected but unimplemented protocol must reject the task; the output must not contain a partial success artifact and diagnostic logs must not contain the private node name, server, or credential.
- [ ] Implement `assertRenderableNodes()` and use the existing client renderer as its probe. Keep empty-inventory rejection separate from renderability rejection so `No valid nodes` and `cannot render selected protocols` remain distinguishable.
- [ ] Remove every runtime import and call to `filterNodesForClient()` from the six client `src/` SubStore paths. Pass `normalized.nodes` directly to the renderer after generic normalization.
- [ ] Change Egern adaptation failures from `adapted.excluded` node removal into a strict failure record consumed by `assertRenderableNodes()`. Preserve the only non-protocol selection behavior: generated client-chain clones are omitted when `clientChain=off`, and chain metadata remains validated by the renderer.
- [ ] Keep `evaluateNodeForClient()` and the old capability matrix only where existing tests or explicit diagnostics require compatibility; do not add new output behavior that depends on that matrix. Add a source-level test or verification assertion that no `clients/*/src` SubStore entry imports `filterNodesForClient`.
- [ ] Run the focused client entry tests and verify that unsupported nodes now fail closed instead of disappearing. Commit:

  ```bash
  git add shared/nodes/renderability.js shared/nodes/capabilities.js clients/egern/src clients/anywhere/src/render-subscription.js clients/shadowrocket/src clients/surge/src clients/sing-box/src/substore-config-entry.js clients/onexray/src/substore-nodes-entry.js clients/onexray/src/substore-profile-entry.js clients/egern/test clients/anywhere/test/substore.test.js clients/shadowrocket/test clients/surge/test/substore-nodes-entry.test.js clients/surge/test/substore-profile-entry.test.js clients/sing-box/test/substore-config-entry.test.js clients/onexray/test/substore-nodes-entry.test.js clients/onexray/test/substore-profile-entry.test.js
  git commit -m "refactor: fail closed instead of filtering client nodes"
  ```

## Task 3: Make every SubStore collection name configurable and safe

**Files:**

- Create: `shared/substore/collection-name.js`
- Modify: `clients/egern/src/options.js`
- Modify: `clients/egern/src/substore-nodes-entry.js`
- Modify: `clients/anywhere/src/substore-nodes-entry.js`
- Modify: `clients/shadowrocket/src/options.js`
- Modify: `clients/shadowrocket/src/substore-node-entry.js`
- Modify: `clients/shadowrocket/src/substore-node-subscription-entry.js`
- Modify: `clients/surge/src/options.js`
- Modify: `clients/surge/src/substore-nodes-entry.js`
- Modify: `clients/sing-box/src/options.js`
- Modify: `clients/onexray/src/options.js`
- Modify: `test/substore-collection-name.test.js`
- Modify: `clients/anywhere/test/substore.test.js`
- Modify: `clients/egern/test/options.test.js`
- Modify: `clients/shadowrocket/test/options.test.js`
- Modify: `clients/surge/test/substore-nodes-entry.test.js`
- Modify: `clients/sing-box/test/substore-config-entry.test.js`
- Modify: `clients/onexray/test/options.test.js`

**Interfaces:**

```js
validateCollectionName(value, label = "collection name"): string
```

Accept only `[A-Za-z0-9][A-Za-z0-9_-]{0,127}`, preserving the exact value; reject blank values, leading/trailing whitespace, control characters, line terminators, prototype keys, and URL-like input. This matches the offline task checker and keeps SubStore lookup unambiguous.

- [ ] Add failing tests for `apple-proxy-egern`, `apple-proxy-anywhere`, `apple-proxy-shadowrocket`, `apple-proxy-surge`, `apple-proxy-singbox`, `apple-proxy-onexray`, the legacy `apple-proxy-sources`, blank names, Chinese names, names containing `/`, `?`, `#`, whitespace, and line breaks.
- [ ] Implement the shared validator and use it in every node and Profile/Config option parser. Remove Anywhere’s `COLLECTION_NAME` equality check; return the validated supplied name in the immutable options object.
- [ ] Assert every `produceArtifact()` call forwards exactly the parsed name and never a fallback constant. Keep `type=collection`, `platform=JSON`, and `produceType=internal` unchanged.
- [ ] Update the task-checker tests so a client-specific slug is accepted and an unsafe name is rejected. Run `node --test test/substore-collection-name.test.js test/substore-task-check.test.js clients/anywhere/test/substore.test.js clients/egern/test/options.test.js clients/shadowrocket/test/options.test.js clients/surge/test/substore-nodes-entry.test.js clients/sing-box/test/substore-config-entry.test.js clients/onexray/test/options.test.js`.
- [ ] Commit:

  ```bash
  git add shared/substore/collection-name.js clients/egern/src clients/anywhere/src/substore-nodes-entry.js clients/shadowrocket/src clients/surge/src clients/sing-box/src/options.js clients/onexray/src/options.js test/substore-collection-name.test.js test/substore-task-check.test.js clients/anywhere/test/substore.test.js clients/egern/test/options.test.js clients/shadowrocket/test/options.test.js clients/surge/test/substore-nodes-entry.test.js clients/sing-box/test/substore-config-entry.test.js clients/onexray/test/options.test.js
  git commit -m "feat: parameterize SubStore collection names"
  ```

## Task 4: Add the shared continent-to-flag policy-group hierarchy

**Files:**

- Modify: `shared/policies/filters.js`
- Modify: `shared/policies/catalog.js`
- Modify: `shared/policies/schema.js`
- Modify: `clients/egern/src/render-groups.js`
- Modify: `clients/shadowrocket/src/group-catalog.js`
- Modify: `clients/sing-box/src/render-groups.js`
- Modify: `test/lightweight-policy.test.js`
- Modify: `clients/egern/test/groups.test.js`
- Modify: `clients/shadowrocket/test/groups.test.js`
- Modify: `clients/surge/test/profile.test.js`
- Modify: `clients/sing-box/test/config.test.js`

**Interfaces:**

- Add `GROUP_KIND.flag === "flag"`.
- Add `flagFilter(flag): string`, matching only normalized names beginning with the exact flag and a separator.
- Add `flagGroupName(flag): string`, using the deterministic region label from Task 1 and `🌐 未分类` for the fallback flag.
- `buildPolicyGroups(options, nodes)` emits, in deterministic order:

  ```text
  🚀 节点选择              candidates: present continent group names, nodeFilter: null
  🌏 亚太                  candidates: helpers then present flag group names, nodeFilter: null
  🇯🇵 日本                 candidates: [], nodeFilter: ^🇯🇵(?: |$)
  ```

  Existing hidden all-node/continent helpers, source groups, AI groups, service groups, security groups, and chain groups remain available with their existing semantics.

- [ ] Add failing tests for an inventory containing Japan, Germany, United States, and an unknown flag. Assert root → continent → flag references, continent order, flag order, no cycles, and no protocol child groups.
- [ ] Implement safe regex escaping in `flagFilter()`. Derive present flags from non-chained `_profile.flag` values in the same continent order used by `CONTINENTS`; include `🌐` only when it is present.
- [ ] Change the primary group from a flat `NON_CHAINED_FILTER` subscription group to a selector whose candidates are present continent groups. Change continent groups to selectors whose candidates are the existing automatic/fallback helpers followed by flag groups. Preserve full/balanced/minimal auto-group modes and keep helper filters intact.
- [ ] Extend `POLICY_GROUP_SCHEMA` with `GROUP_KIND.flag` entries for the finite country/territory flag catalog plus the fallback flag. Update canonical semantic inference to reconstruct `_profile.flag` values from emitted flag group names, and validate that the primary and continent candidate order is exact.
- [ ] Update Egern’s strict shared graph validator: the primary group now permits the continent candidate list and `nodeFilter=null`; flag groups require `GROUP_KIND.flag`, `STRATEGY.select`, and their exact filter. Update Shadowrocket, Surge, and sing-box adapters to preserve nested group references. Keep sing-box’s compact primary selector special case, now using its continent candidates.
- [ ] Keep Anywhere unchanged at the policy-group layer; add only node-name assertions in its subscription tests.
- [ ] Run `node --test test/lightweight-policy.test.js clients/egern/test/groups.test.js clients/shadowrocket/test/groups.test.js clients/surge/test/profile.test.js clients/sing-box/test/config.test.js` and commit:

  ```bash
  git add shared/policies/filters.js shared/policies/catalog.js shared/policies/schema.js clients/egern/src/render-groups.js clients/shadowrocket/src/group-catalog.js clients/sing-box/src/render-groups.js test/lightweight-policy.test.js clients/egern/test/groups.test.js clients/shadowrocket/test/groups.test.js clients/surge/test/profile.test.js clients/sing-box/test/config.test.js
  git commit -m "feat: add continent and flag policy groups"
  ```

## Task 5: Finish Egern, Anywhere, and Shadowrocket full-inventory rendering

**Files:**

- Modify: `clients/egern/src/adapt-substore-nodes.js`
- Modify: `clients/egern/src/render-node.js`
- Modify: `clients/egern/src/render-subscription.js`
- Modify: `clients/egern/src/substore-profile-entry.js`
- Modify: `clients/anywhere/src/render-node.js`
- Modify: `clients/anywhere/src/render-subscription.js`
- Modify: `clients/shadowrocket/src/substore-node-entry.js`
- Modify: `clients/shadowrocket/src/substore-node-subscription-entry.js`
- Modify: `clients/shadowrocket/src/substore-profile-entry.js`
- Create: `clients/shadowrocket/src/render-node.js`
- Modify: `clients/egern/test/nodes.test.js`
- Modify: `clients/egern/test/substore-node-adapter.test.js`
- Modify: `clients/egern/test/substore.test.js`
- Modify: `clients/anywhere/test/subscription.test.js`
- Modify: `clients/anywhere/test/substore.test.js`
- Modify: `clients/shadowrocket/test/substore-node-subscription.test.js`
- Modify: `clients/shadowrocket/test/substore-profile-entry.test.js`
- Modify: `clients/shadowrocket/test/bundles.test.js`

**Interfaces:**

- Egern and Anywhere continue exporting `toEgernProxy(node)` and `toAnywhereProxy(node)`, but errors identify `client + normalized protocol`; neither function silently returns an omission.
- Shadowrocket’s new renderer exports `renderShadowrocketProxyRecord(node)` and `assertShadowrocketNodeSet(nodes)`; the supported record set includes AnyTLS fields `alpn`, `client-fingerprint`, `idle-session-check-interval`, `idle-session-timeout`, and `min-idle-session`.

- [ ] Add RED tests showing that an Egern/Anywhere/Shadowrocket inventory containing an AnyTLS node produces that node, including its non-empty protocol label, and that a deliberately unsupported/unknown protocol causes the whole task to fail with a safe protocol count.
- [ ] Make Egern’s SubStore adapter preserve all successfully normalized nodes. Convert adaptation rejection records into a strict error before YAML serialization; retain Snell v5 → v4 and the existing lossless Reality/Hysteria2 aliases only when the adaptation is complete.
- [ ] Make `prepareEgernInventory()` render every non-disabled-chain node and aggregate failures through `assertRenderableNodes()`. Keep diagnostics for generic normalization and chain state; remove per-node client capability exclusion counts.
- [ ] Ensure `renderAnytls()` and `toAnywhereProxy()` retain AnyTLS TLS, ALPN, fingerprint, and idle-session fields already supported by the current Anywhere renderer. An unsupported field must fail before `assertAnywhereSubscription()` rather than disappear during sanitization.
- [ ] Move Shadowrocket’s proxy record key list into the new renderer module. Add a protocol dispatch assertion for the protocols the current Shadowrocket output can represent, add AnyTLS serialization, and reject a protocol not covered by that record contract. Use the same assertion in node subscription, legacy node operator, and Profile operator paths.
- [ ] Update tests to assert `produceArtifact()` receives the client-specific name, the serialized list is non-empty, the protocol label is preserved, and mixed failure diagnostics contain no node name, server, or credential.
- [ ] Run the three workspace test subsets and commit:

  ```bash
  npm --workspace @apple-proxy-profiles/egern test
  npm --workspace @apple-proxy-profiles/anywhere test
  npm --workspace @apple-proxy-profiles/shadowrocket test
  git add clients/egern/src clients/anywhere/src clients/shadowrocket/src clients/egern/test clients/anywhere/test clients/shadowrocket/test
  git commit -m "feat: render selected Egern Anywhere and Shadowrocket inventories"
  ```

## Task 6: Finish Surge, sing-box, and OneXray strict rendering

**Files:**

- Modify: `clients/surge/src/render-node.js`
- Modify: `clients/surge/src/substore-nodes-entry.js`
- Modify: `clients/surge/src/substore-profile-entry.js`
- Modify: `clients/sing-box/src/render-node.js`
- Modify: `clients/sing-box/src/substore-config-entry.js`
- Modify: `clients/onexray/src/render-outbound.js`
- Modify: `clients/onexray/src/render-subscription.js`
- Modify: `clients/onexray/src/substore-nodes-entry.js`
- Modify: `clients/onexray/src/substore-profile-entry.js`
- Modify: `clients/onexray/src/render-audit.js`
- Modify: `clients/surge/test/node.test.js`
- Modify: `clients/surge/test/substore-nodes-entry.test.js`
- Modify: `clients/surge/test/substore-profile-entry.test.js`
- Modify: `clients/sing-box/test/node.test.js`
- Modify: `clients/sing-box/test/substore-config-entry.test.js`
- Modify: `clients/onexray/test/outbound.test.js`
- Modify: `clients/onexray/test/subscription.test.js`
- Modify: `clients/onexray/test/substore-nodes-entry.test.js`
- Modify: `clients/onexray/test/substore-profile-entry.test.js`
- Modify: `clients/onexray/test/audit.test.js`

**Interfaces:**

- Surge and sing-box continue to render all normalized nodes through their existing node renderers; an unsupported protocol produces a safe full-task error.
- OneXray’s internal `eligibleNodes` becomes the complete normalized node set, not a capability-filtered subset. Its renderer remains the final lossless boundary; `homepageNodes` and fixed-target resolution never silently drop a selected node.
- OneXray’s audit reports normalization counts and render-failure protocol counts only. It no longer reports an `excluded` capability count for nodes that were supplied by the client collection.

- [ ] Add RED tests where Surge receives a VLESS/AnyTLS node and fails with `surge + vless/anytls` rather than emitting only the Snell or SS subset. Add sing-box and OneXray tests where an accepted AnyTLS/known protocol is retained and a deliberately unsupported protocol fails without a partial JSON document.
- [ ] Remove Surge’s and sing-box’s `filterNodesForClient()` calls. Validate the full normalized collection before profile generation and before node-resource serialization; retain only client-chain behavior and generic empty-inventory rejection.
- [ ] Audit `sanitizeSingBoxNode()` and `renderSingBoxOutbound()` so every AnyTLS field that the renderer claims to support is copied to the output; any other selected field is rejected by the renderability probe rather than silently stripped.
- [ ] Remove OneXray’s filtered `eligible` object from both SubStore entries. Pass `normalized.nodes` to `resolveOneXrayPolicy()`, then let `renderOneXrayOutbound()` reject unsupported protocols. Wrap failures as `OneXray cannot render selected protocols: <protocol>=<count>` without exposing fixed node names or credentials.
- [ ] Preserve OneXray’s audited native semantics: no synthetic selector outbound, no Xray balancer, no fake `policy_groups`, and no change to `FOLLOW → proxy`, `DIRECT → direct`, fixed-node, DNS, routing, or client-chain behavior. Add a test that the private Profile remains valid under `validateOneXrayProfile()` and the node subscription preserves the normalized flag/protocol order.
- [ ] Update the old OneXray tests that expected Snell to be silently omitted. They must now expect a safe rejection; supported protocol fixtures must use the new normalized names with protocol labels.
- [ ] Run:

  ```bash
  npm --workspace @apple-proxy-profiles/surge test
  npm --workspace @apple-proxy-profiles/sing-box test
  npm --workspace @apple-proxy-profiles/onexray test
  ```

  Then commit:

  ```bash
  git add clients/surge/src clients/sing-box/src clients/onexray/src clients/surge/test clients/sing-box/test clients/onexray/test
  git commit -m "feat: reject unrenderable selected protocols explicitly"
  ```

## Task 7: Update task checker, documentation, migration instructions, and rollback guidance

**Files:**

- Create: `docs/substore-client-pools.md`
- Modify: `scripts/check-substore-task.mjs`
- Modify: `test/substore-task-check.test.js`
- Modify: `test/substore-docs.test.js`
- Modify: `README.md`
- Modify: `docs/substore-two-layer-setup.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/implementation-status.md`
- Modify: `clients/egern/README.md`
- Modify: `clients/egern/docs/deployment.md`
- Modify: `clients/anywhere/README.md`
- Modify: `clients/anywhere/docs/deployment.md`
- Modify: `clients/shadowrocket/README.md`
- Modify: `clients/shadowrocket/docs/deployment.md`
- Modify: `clients/shadowrocket/docs/maintenance.md`
- Modify: `clients/shadowrocket/docs/troubleshooting.md`
- Modify: `clients/shadowrocket/docs/canary-checklist.md`
- Modify: `clients/surge/README.md`
- Modify: `clients/surge/docs/deployment.md`
- Modify: `clients/sing-box/README.md`
- Modify: `clients/sing-box/docs/deployment.md`
- Modify: `clients/sing-box/docs/openwrt.md`
- Modify: `clients/onexray/README.md`
- Modify: `clients/onexray/docs/deployment.md`

**Interfaces:**

`docs/substore-client-pools.md` becomes the canonical manual boundary. It must contain only synthetic names and example.invalid URLs, and it must define this mapping:

| 客户端 | SubStore 组合 | 维护原则 |
| --- | --- | --- |
| Egern | `apple-proxy-egern` | 用户自行选择来源、AnyTLS 和字段形状 |
| Anywhere | `apple-proxy-anywhere` | 用户自行选择 Anywhere 可导入的节点，远程输出只有节点列表 |
| Shadowrocket | `apple-proxy-shadowrocket` | 可维护 AnyTLS 及其他已实现节点类型 |
| Surge | `apple-proxy-surge` | 只加入当前 Surge renderer 已实现的类型 |
| sing-box | `apple-proxy-singbox` | 可加入当前 sing-box renderer 已实现的类型和字段 |
| OneXray | `apple-proxy-onexray` | 只加入当前 OneXray 原生 Profile 已实现的类型 |

- [ ] Add a failing docs test for all six names, the `apple-proxy-all` total pool, the retained `apple-proxy-sources` rollback path, and the statement that unsupported selected protocols fail instead of being silently dropped.
- [ ] Document the manual migration in this order: keep the old collection/tasks; create `apple-proxy-all`; create six client collections from it; apply client-specific SubStore filters; preview each collection; update only that client’s `name=` parameter; refresh and compare counts; keep the old URL for rollback.
- [ ] Document the protocol-label migration: fixed OneXray `NODE:<name>` targets and any external exact-name references must be updated from the old name to the new `· <Protocol>` form after a preview confirms the normalized name.
- [ ] Update the task checker with OneXray generator schemas and make its name validation use the same safe slug rule as `validateCollectionName()`. Keep actual SubStore URLs out of tests and docs.
- [ ] Replace old wording that says all six clients directly read `apple-proxy-sources`. Historical plan/spec files remain unchanged; operational docs must point to the new guide.
- [ ] Run `node --test test/substore-task-check.test.js test/substore-docs.test.js` and commit:

  ```bash
  git add docs/substore-client-pools.md scripts/check-substore-task.mjs test/substore-task-check.test.js test/substore-docs.test.js README.md docs/substore-two-layer-setup.md docs/maintenance.md docs/implementation-status.md clients/egern/README.md clients/egern/docs/deployment.md clients/anywhere/README.md clients/anywhere/docs/deployment.md clients/shadowrocket/README.md clients/shadowrocket/docs/deployment.md clients/shadowrocket/docs/maintenance.md clients/shadowrocket/docs/troubleshooting.md clients/shadowrocket/docs/canary-checklist.md clients/surge/README.md clients/surge/docs/deployment.md clients/sing-box/README.md clients/sing-box/docs/deployment.md clients/sing-box/docs/openwrt.md clients/onexray/README.md clients/onexray/docs/deployment.md
  git commit -m "docs: document SubStore client node pools and migration"
  ```

## Task 8: Rebuild bundles, refresh sanitized fixtures, and verify the publication boundary

**Files:**

- Modify generated `clients/*/dist/*.js` and `clients/*/examples/*` only through workspace scripts.
- Modify generated `public/` only through the existing publication/build scripts if the repository verification flow requires it.
- Modify: `scripts/update-rules.mjs` only if the changed bundle/example manifest closure requires a new source mapping.
- Modify: `scripts/check-actions.mjs` and `test/security.test.js` only when the new task/doc contract needs an explicit invariant.

**Interfaces:**

- Source entrypoints, generated bundles, sanitized examples, and the bundle tests must describe the same collection-name, protocol-label, full-inventory, and flag-group behavior.
- No generated artifact may contain a real endpoint, credential, private task URL, or raw SubStore input.

- [ ] Run each workspace’s prescribed build and fixture commands:

  ```bash
  npm --workspace @apple-proxy-profiles/egern run build
  npm --workspace @apple-proxy-profiles/egern run fixtures
  npm --workspace @apple-proxy-profiles/anywhere run build
  npm --workspace @apple-proxy-profiles/shadowrocket run build
  npm --workspace @apple-proxy-profiles/shadowrocket run fixtures
  npm --workspace @apple-proxy-profiles/surge run build
  npm --workspace @apple-proxy-profiles/surge run fixtures
  npm --workspace @apple-proxy-profiles/sing-box run build
  npm --workspace @apple-proxy-profiles/sing-box run fixtures
  npm --workspace @apple-proxy-profiles/onexray run build
  npm --workspace @apple-proxy-profiles/onexray run fixtures
  ```

- [ ] Run bundle tests for all six clients and verify that each bundle contains its updated collection parser, protocol label behavior, and no `filterNodesForClient` call in the generated SubStore output path.
- [ ] Run the repository checks in this order so failures are attributable:

  ```bash
  git diff --check
  npm test
  npm run check:secrets
  npm run check:actions
  npm run check:task -- "https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off"
  npm run verify
  ```

  Use the synthetic public URL above for the successful CLI assertion; do not paste the user’s real SubStore URL into a repository file or command log.
- [ ] Run `git status --short` and confirm that the pre-existing unrelated `clients/sing-box/build/` worktree entry remains untouched. Review `git diff --stat` and `git diff --check` before staging generated files.
- [ ] Commit generated outputs and verification-related source changes in one release-preparation commit:

  ```bash
  git add clients/*/dist clients/*/examples public scripts/update-rules.mjs scripts/check-actions.mjs test/security.test.js
  git commit -m "build: publish client inventory and grouping updates"
  ```

## Task 9: Perform the user-side SubStore canary and migration

**Files:**

- No repository files. This task is performed manually in the user’s private SubStore and client apps after Tasks 1–8 pass.

**Interfaces:**

- Input: the existing private source collections and the six generated task URLs from the published bundle.
- Output: six non-empty private client outputs, one retained old output for rollback, and a count-only canary record.

- [ ] Create or retain `apple-proxy-all` as the user-maintained total collection. Do not delete or rename `apple-proxy-sources` until every new output has passed preview and import checks.
- [ ] Create the six client collections with the exact names in Task 7. Configure protocol/source filters in SubStore, not in a repository JSON or shared capability matrix.
- [ ] For Egern, Anywhere, and Shadowrocket, place the AnyTLS nodes intended for those clients in their own collections. For Surge and OneXray, omit AnyTLS until their renderers are explicitly extended and verified. For sing-box, include only the AnyTLS fields covered by its renderer.
- [ ] Refresh each node task first, then each Profile/Config task. Confirm the output count is non-zero, node names include the expected flag and protocol label, and the continent/flag groups contain the expected names.
- [ ] Import one representative output per client. Verify Egern/Shadowrocket/Surge/sing-box group references have no cycles; verify Anywhere’s node list is available for local App policy groups; verify OneXray’s homepage node list and runtime `proxy` behavior remain native.
- [ ] Keep the old `apple-proxy-sources` task URLs and old Profile imports until the new outputs have survived one refresh cycle. Roll back by restoring the old task URL/name if any new collection is empty or a client rejects a protocol.
- [ ] Record only totals, accepted counts, protocol counts, continent counts, and warning counts. Never record the raw SubStore URL or node details.

## Final Verification Checklist

- [ ] `normalizeNodes()` never removes a node because of a client whitelist; a supplied unknown protocol either passes generic normalization and reaches the renderer or fails explicitly at that renderer.
- [ ] An AnyTLS node selected in Egern, Anywhere, or Shadowrocket appears in the private output with `AnyTLS` in its normalized name; it is not removed by a stale shared matrix.
- [ ] Nodes with existing flags are grouped by those flags before text inference; unknown regions are deterministic `🌐` fallback nodes.
- [ ] Egern, Shadowrocket, Surge, and sing-box produce `🚀 节点选择 → continent → flag → node` references without cycles; Anywhere produces only valid `proxies`; OneXray keeps its audited runtime-homepage `proxy` model and does not emit fake groups.
- [ ] Existing source, UDP, chain, DNS, routing, security, remote policy, and private-output invariants pass their current validators.
- [ ] `npm test`, `npm run verify`, `npm run check:secrets`, `npm run check:actions`, all workspace bundle tests, and `git diff --check` pass with evidence captured before claiming completion.
