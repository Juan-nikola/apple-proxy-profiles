# Shadowrocket Subscription Group Parser Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore every explicit service-group policy in Shadowrocket while keeping concrete servers selectable and preserving homepage-node following through `🚀 节点选择 = select,PROXY`.

**Architecture:** Dynamic groups will again render Shadowrocket's named-subscription syntax, `<subscriptionName>,use=true`, instead of `include-all-proxies=true`. The group catalog will declare `policySelectName` only for the 16 common service groups so proxy-first groups explicitly default to `🚀 节点选择` and direct-first groups explicitly default to `DIRECT`; the renderer will serialize this as `policy-select-name=...`.

**Tech Stack:** JavaScript ES modules, Node.js built-in test runner, esbuild, Sub-Store File Script Operator, Shadowrocket INI profiles.

## Global Constraints

- `🚀 节点选择` must remain exactly `select,PROXY` with no dynamic subscription source.
- Ten proxy-first service groups must declare `policy-select-name=🚀 节点选择`.
- Six direct-first service groups must declare `policy-select-name=DIRECT`.
- All 16 service groups must retain automatic, fallback, present-continent, and concrete-server choices.
- Dynamic groups must render `<subscriptionName>,use=true`; generated mixed service groups must not render `include-all-proxies=true`.
- `subscriptionName` preserves exact supported text (including Chinese, internal spaces, ordinary punctuation, `=`, comma, and backslash) and must exactly match the Shadowrocket subscription display name; reject leading/trailing whitespace and CR/LF.
- Do not change Blackmatrix7 rules, Wendao direct rules, DNS, QUIC, IPv6, TUN, node normalization, client-chain eligibility, or the node bundle.

---

### Task 1: Reproduce and fix the group-rendering incompatibility

**Files:**
- Modify: `test/groups.test.js`
- Modify: `src/group-catalog.js`
- Modify: `src/render-groups.js`

**Interfaces:**
- Consumes: `buildGroups(options, nodes)` and `renderGroups(groups, subscriptionName)`.
- Produces: service group objects with optional `policySelectName: string`, and rendered dynamic groups using `<subscriptionName>,use=true`.

- [ ] **Step 1: Write failing catalog and renderer tests**

In `test/groups.test.js`, extend the existing service-group loop:

```js
for (const name of foreignGroups) {
  const group = named(groups, name);
  assert.deepEqual(group.items, foreignItems, name);
  assert.equal(group.policySelectName, "🚀 节点选择", name);
}
for (const name of domesticGroups) {
  const group = named(groups, name);
  assert.deepEqual(group.items, directItems, name);
  assert.equal(group.policySelectName, "DIRECT", name);
}
```

Replace the renderer expectation with:

```js
assert.equal(
  line,
  "测试组 = url-test,DIRECT,节点\\,一,订阅\\,名称,use=true,policy-regex-filter=^节点\\,一$,url=https://example.invalid/a\\,b,interval=600,timeout=5,tolerance=100,hidden=1",
);
```

Add a service rendering assertion:

```js
const github = named(groups, "🐙 GitHub");
const [githubLine] = renderGroups([github], "SHADOWROCKET-NODES");
assert.match(githubLine, /,SHADOWROCKET-NODES,use=true,policy-regex-filter=\^\.\+\$,policy-select-name=🚀 节点选择$/);
assert.doesNotMatch(githubLine, /include-all-proxies/);
```

Update the CR/LF test so `renderGroups([group], "Nodes\nInjected")` throws `/CR or LF/`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test test/groups.test.js
```

Expected: FAIL because the current renderer emits `include-all-proxies=true`, ignores `subscriptionName`, and the catalog has no `policySelectName`.

- [ ] **Step 3: Implement the minimal catalog and renderer change**

In `src/group-catalog.js`, add defaults:

```js
const PROXY_FIRST_SERVICE_DEFAULTS = Object.freeze({
  beforeCandidates: ["🚀 节点选择"],
  afterCandidates: ["DIRECT"],
  policySelectName: "🚀 节点选择",
});
const DIRECT_FIRST_SERVICE_DEFAULTS = Object.freeze({
  beforeCandidates: ["DIRECT", "🚀 节点选择"],
  afterCandidates: [],
  policySelectName: "DIRECT",
});
```

When creating each service group, attach the default without changing `items`:

```js
groups.push({
  ...subscriptionGroup(name, ALL_NODES_FILTER, serviceChoiceItems(defaults, presentContinentNames)),
  policySelectName: defaults.policySelectName,
});
```

In `src/render-groups.js`, replace the dynamic source, encoding only the subscription field by doubling backslashes before escaping commas, and serialize the optional default after the filter:

```js
if (group.useSubscription) {
  fields.push(escapeSubscriptionName(subscriptionName), "use=true");
}
if (group.filter !== undefined) fields.push(`policy-regex-filter=${escapeValue(group.filter)}`);
if (group.policySelectName !== undefined) {
  fields.push(`policy-select-name=${escapeValue(group.policySelectName)}`);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 1 command again.

Expected: all group tests pass and rendered dynamic groups contain the escaped subscription display name plus `use=true`.

- [ ] **Step 5: Commit Task 1**

```bash
git add test/groups.test.js src/group-catalog.js src/render-groups.js
git commit -m "fix: restore Shadowrocket subscription group policies"
```

### Task 2: Lock validation and generated artifacts to named subscriptions

**Files:**
- Modify: `test/profile.test.js`
- Modify: `test/examples.test.js`
- Modify: `dist/substore-profile-generator.js`
- Modify: `examples/shadowrocket-macos.conf`
- Modify: `examples/shadowrocket-iphone.conf`
- Modify: `examples/shadowrocket-ipad.conf`

**Interfaces:**
- Consumes: `renderProfile(rawOptions, nodes)` and fixture `subscriptionName: "Shadowrocket-Nodes"`.
- Produces: self-contained Profile bundle and three examples using named-subscription syntax.

- [ ] **Step 1: Write failing Profile and example assertions**

In `test/profile.test.js`, make the filtered dynamic-source fixture use:

```js
groups: ["A = select,PROXY,Nodes,use=true,policy-regex-filter=^.+$"]
```

Remove `,Nodes,use=true` for the missing-source case and continue expecting validation failure.

In `test/examples.test.js`, assert exact service suffixes:

```js
assert.match(profile, /^🐙 GitHub = select,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,🌏 亚太,🌍 欧洲,🌎 美洲,DIRECT,Shadowrocket-Nodes,use=true,policy-regex-filter=\^\.\+\$,policy-select-name=🚀 节点选择$/m);
assert.match(profile, /^🍎 Apple = select,DIRECT,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,🌏 亚太,🌍 欧洲,🌎 美洲,Shadowrocket-Nodes,use=true,policy-regex-filter=\^\.\+\$,policy-select-name=DIRECT$/m);
assert.doesNotMatch(profile, /include-all-proxies=true/);
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test test/profile.test.js test/examples.test.js
```

Expected: example assertions fail against the current generated files.

- [ ] **Step 3: Rebuild bundle and fixtures**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build.mjs
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/render-fixtures.mjs
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Task 2 focused test command again.

Expected: all Profile and example tests pass; all three examples retain `🚀 节点选择 = select,PROXY`.

- [ ] **Step 5: Confirm protected artifacts are unchanged**

```bash
git diff --exit-code HEAD -- dist/substore-node-operator.js src/dns.js src/general.js src/render-rules.js src/rule-catalog.js
```

Expected: exit 0 with no output.

- [ ] **Step 6: Commit Task 2**

```bash
git add test/profile.test.js test/examples.test.js dist/substore-profile-generator.js examples/shadowrocket-macos.conf examples/shadowrocket-iphone.conf examples/shadowrocket-ipad.conf
git commit -m "build: regenerate named subscription profiles"
```

### Task 3: Correct deployment and troubleshooting guidance

**Files:**
- Modify: `test/docs.test.js`
- Modify: `README.md`
- Modify: `docs/deployment.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/troubleshooting.md`
- Modify: `docs/canary-checklist.md`

**Interfaces:**
- Consumes: the exact File argument key `subscriptionName` and the generated behavior from Tasks 1–2.
- Produces: beginner-safe instructions for matching the Shadowrocket subscription display name.

- [ ] **Step 1: Write failing documentation checks**

Replace the old arbitrary-name phrases in `test/docs.test.js` with assertions that the combined documentation includes:

```js
for (const phrase of [
  "subscriptionName",
  "完全一致",
  "Shadowrocket-Nodes,use=true",
  "policy-select-name=🚀 节点选择",
  "policy-select-name=DIRECT",
]) assert.ok(text.includes(phrase), `missing named-subscription guidance: ${phrase}`);
assert.doesNotMatch(text, /兼容占位参数/);
```

Update the maintenance chain-section assertion to require that its test subscription name matches its `subscriptionName` parameter.

- [ ] **Step 2: Run the docs test and verify RED**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test test/docs.test.js
```

Expected: FAIL because current documentation says the display name is unrelated and `subscriptionName` is a placeholder.

- [ ] **Step 3: Update all operational documentation**

Make these exact operational rules consistent across the six documents:

- The Shadowrocket subscription display name may be chosen freely.
- `subscriptionName` in macOS, iPhone, and iPad File arguments must match that display name exactly, including case, emoji, spaces, and punctuation.
- The examples use `Shadowrocket-Nodes` and render `Shadowrocket-Nodes,use=true`.
- `🚀 节点选择 = select,PROXY` follows the homepage node.
- Proxy-first groups declare `policy-select-name=🚀 节点选择`; direct-first groups declare `policy-select-name=DIRECT`.
- A missing name match leaves explicit choices available but removes subscription servers from dynamic groups.
- The canary must open GitHub and Apple, confirm all explicit choices plus concrete servers, and then switch the homepage node while GitHub remains on `🚀 节点选择`.

- [ ] **Step 4: Run docs and generated-example tests**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test test/docs.test.js test/examples.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add test/docs.test.js README.md docs/deployment.md docs/maintenance.md docs/troubleshooting.md docs/canary-checklist.md
git commit -m "docs: explain named Shadowrocket subscriptions"
```

### Task 4: Verify and publish the parser fix

**Files:**
- Verify all tracked files.
- Publish only files changed after the current remote `main` commit.

**Interfaces:**
- Consumes: Tasks 1–3 and GitHub repository `Juan-nikola/shadowrocket-profile`.
- Produces: a non-force `main` update and a verified commit URL.

- [ ] **Step 1: Run the complete verification chain**

```bash
task_node=/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$task_node" --test
"$task_node" scripts/build.mjs
"$task_node" scripts/render-fixtures.mjs
"$task_node" scripts/check-secrets.mjs
"$task_node" scripts/check-rules.mjs
git diff --check
git status -sb
```

Expected: 0 failures, no generated drift, no secrets, all remote rule sets valid, and a clean worktree.

- [ ] **Step 2: Audit the exact generated policies**

For all three examples, verify:

- `🚀 节点选择 = select,PROXY` exactly.
- GitHub ends with `Shadowrocket-Nodes,use=true,policy-regex-filter=^.+$,policy-select-name=🚀 节点选择`.
- Apple ends with `Shadowrocket-Nodes,use=true,policy-regex-filter=^.+$,policy-select-name=DIRECT`.
- No generated Profile contains `include-all-proxies=true`.
- Wendao direct rules, `block-quic`, and platform IPv6 values remain present.

- [ ] **Step 3: Review the full branch range**

Review from the current remote-equivalent local baseline through HEAD. Reject publication for any change to the node bundle, rules, DNS, network stability, or secret-bearing data.

- [ ] **Step 4: Publish without force**

Confirm the remote `main` SHA immediately before publication. Create blobs/tree/commit through the connected GitHub API with that SHA as the sole parent, then update `main` with `force:false`.

- [ ] **Step 5: Verify the remote result**

Confirm the new SHA is the top `main` commit and compare every published remote blob SHA with the locally created blob SHA. Report the commit URL and the exact device update instructions.
