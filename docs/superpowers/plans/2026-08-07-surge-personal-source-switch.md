# Surge Personal Source Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Make Surge remote profiles compatible with compact personal node names and add a private, selectable personal remote node pool beside the default Sub-Store pool.

**Architecture:** Extend Surge options with an independently validated `personalPolicyUrl`. The renderer builds a list of present remote policy pools, emits them as hidden external groups, and uses one escaped multi-group `include-other-group` parameter for filtered groups. A visible `🛠 节点来源` selector references the pools, while the existing automatic groups continue to filter all available pools by robust country-flag prefixes.

**Tech Stack:** Node.js 22, native `node:test`, ES modules, esbuild bundles, Surge profile syntax, Sub-Store Script Operation arguments.

## Global Constraints

- Do not place the user’s personal subscription URL in repository source, fixtures, generated public files, logs, or GitHub commits.
- Preserve existing output when `personalPolicyUrl` is absent.
- Accept only non-empty absolute HTTPS URLs without credentials, fragments, control characters, backslashes, or percent-encoded control bytes.
- Keep the existing remote update interval at 21600 seconds and hidden provider groups.
- Keep the implementation limited to Surge; do not alter other client adapters.
- Follow TDD: each production behavior change starts with a failing test.

---

### Task 1: Add the approved design and plan documents

**Files:**
- Create: `docs/superpowers/specs/2026-08-07-surge-personal-source-switch-design.md`
- Create: `docs/superpowers/plans/2026-08-07-surge-personal-source-switch.md`

- [x] **Step 1: Commit the approved specification first**

Run:

```bash
git add docs/superpowers/specs/2026-08-07-surge-personal-source-switch-design.md
git commit -m "docs: specify Surge personal source switching"
```

Expected: only the specification is committed; pre-existing generated manifest changes remain unstaged.

- [x] **Step 2: Save this implementation plan**

The plan must describe exact files, tests, commands, and private Sub-Store configuration without including the personal URL.

---

### Task 2: Make compact country-flag names match

**Files:**
- Modify: `shared/policies/filters.js`
- Test: `clients/surge/test/profile.test.js`

**Interfaces:**
- `continentFilter(continent)` continues returning a Surge-compatible regular expression string.
- Existing normalized names with a space and compact names without a space must both match.

- [ ] **Step 1: Write the failing test**

Add a remote-profile fixture assertion using `personalPolicyUrl` and assert that the Asia filter in the generated profile matches compact names conceptually by checking the emitted filter no longer contains a mandatory literal space after the flag group:

```js
assert.match(profile, /policy-regex-filter=\^\(\?:🇨🇳\|[^,]+\)\.\+/u);
```

Also add a direct filter assertion by importing `continentFilter` and testing:

```js
const asia = CONTINENTS.find((continent) => continent.name === "🌏 亚太");
assert.match("🇯🇵Neburst1|DMIT-T1", new RegExp(continentFilter(asia), "u"));
assert.match("🇯🇵 Tokyo A｜机场·U", new RegExp(continentFilter(asia), "u"));
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- clients/surge/test/profile.test.js
```

Expected: the compact-name assertion fails because the current filter requires a space after the flag.

- [ ] **Step 3: Implement the minimal filter change**

Change the known-continent expression in `shared/policies/filters.js` from:

```js
return `^(?:${continent.flags.join("|")}) .+$`;
```

to:

```js
return `^(?:${continent.flags.join("|")}).+$`;
```

Change the other/unknown expression so it excludes known flags without requiring a space:

```js
return `^(?!(?:🔗|${knownFlags})).+$`;
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- clients/surge/test/profile.test.js
```

Expected: all profile tests pass, including both compact and normalized name matches.

- [ ] **Step 5: Commit the filter change**

```bash
git add shared/policies/filters.js clients/surge/test/profile.test.js
git commit -m "fix: match compact Surge country names"
```

---

### Task 3: Add the private personal policy URL option

**Files:**
- Modify: `clients/surge/src/options.js`
- Test: `clients/surge/test/profile.test.js`

**Interfaces:**
- `parseSurgeOptions(raw)` returns frozen `personalPolicyUrl` alongside `proxyPolicyUrl`.
- Both URL options use the same safe-HTTPS validation.

- [ ] **Step 1: Write failing option tests**

Add tests that `parseSurgeOptions` accepts a valid personal HTTPS URL, preserves it, and rejects HTTP, credentials, fragments, control characters, and encoded control bytes for `personalPolicyUrl`.

```js
const parsed = parseSurgeOptions({ ...baseOptions, personalPolicyUrl: "https://personal.example.invalid/surge" });
assert.equal(parsed.personalPolicyUrl, "https://personal.example.invalid/surge");
for (const personalPolicyUrl of [
  "http://personal.example.invalid/surge",
  ["https://user", ":pass@personal.example.invalid/surge"].join(""),
  "https://personal.example.invalid/surge#fragment",
  "https://personal.example.invalid/surge%0A",
]) assert.throws(() => parseSurgeOptions({ ...baseOptions, personalPolicyUrl }), /personalPolicyUrl/iu);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- clients/surge/test/profile.test.js
```

Expected: the parser rejects the unknown option or does not expose the value.

- [ ] **Step 3: Implement minimal option parsing**

Add `personalPolicyUrl` to `ALLOWED_KEYS`, extract a shared `validatePolicyUrl(value, key)` helper from the existing validator, and assign:

```js
proxyPolicyUrl: validatePolicyUrl(raw.proxyPolicyUrl, "proxyPolicyUrl"),
personalPolicyUrl: validatePolicyUrl(raw.personalPolicyUrl, "personalPolicyUrl"),
```

Preserve the existing error wording pattern with the option name included.

- [ ] **Step 4: Run the focused test and verify GREEN**

```bash
npm test -- clients/surge/test/profile.test.js
```

Expected: all option tests pass.

- [ ] **Step 5: Commit the option change**

```bash
git add clients/surge/src/options.js clients/surge/test/profile.test.js
git commit -m "feat: accept a private Surge policy source"
```

---

### Task 4: Render two remote pools and the source selector

**Files:**
- Modify: `clients/surge/src/render-groups.js`
- Modify: `clients/surge/src/render-profile.js`
- Test: `clients/surge/test/profile.test.js`

**Interfaces:**
- `renderSurgeGroups(options, nodes)` emits one hidden provider per present URL, one source selector when both exist, and filtered groups containing all present provider groups.
- `renderSurgeProfile` treats either URL as remote mode and never embeds node transport details in that mode.

- [ ] **Step 1: Write failing renderer tests**

Add a profile test with both URLs:

```js
const profile = renderSurgeProfile(parseSurgeOptions({
  ...baseOptions,
  proxyPolicyUrl: "https://default.example.invalid/surge",
  personalPolicyUrl: "https://personal.example.invalid/surge",
}), [normalizedSsNode], { ruleBaseUrl: "https://example.invalid/current/surge/rules" });
assert.match(profile, /📦 远程节点池 = select,policy-path=https:\/\/default\.example\.invalid\/surge,update-interval=21600,hidden=1/u);
assert.match(profile, /🧩 个人节点池 = select,policy-path=https:\/\/personal\.example\.invalid\/surge,update-interval=21600,hidden=1/u);
assert.match(profile, /🛠 节点来源 = select,📦 远程节点池,🧩 个人节点池/u);
assert.match(profile, /🚀 节点选择 = select,⚡ 全部自动,🛠 节点来源/u);
assert.match(profile, /include-other-group=📦 远程节点池\\,🧩 个人节点池/u);
assert.doesNotMatch(profile.split("[Proxy]\n", 2)[1].split("\n\n[Proxy Group]", 1)[0], / = (?:ss|snell|vmess|hysteria2),/iu);
```

Add a personal-only test proving either URL alone still enters remote mode and emits no local proxy transport lines.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npm test -- clients/surge/test/profile.test.js
```

Expected: `personalPolicyUrl` is absent from output, and the renderer still uses only the existing provider.

- [ ] **Step 3: Implement provider list and source selector**

In `render-groups.js`, add constants:

```js
export const PERSONAL_POLICY_POOL_NAME = "🧩 个人节点池";
export const POLICY_SOURCE_GROUP_NAME = "🛠 节点来源";
```

Build an ordered array from the non-empty URLs. Emit each provider as:

```js
`${escapeValue(name)} = select,policy-path=${escapeValue(url)},update-interval=${REMOTE_POLICY_UPDATE_INTERVAL},hidden=1`
```

When both providers exist, emit the source selector and append `POLICY_SOURCE_GROUP_NAME` to the `🚀 节点选择` items. For filtered groups, emit exactly one escaped parameter:

```js
fields.push(`include-other-group=${escapeValue(remotePolicies.map(({ name }) => name).join(","))}`);
```

Use `remotePolicies.length > 0` instead of checking only `proxyPolicyUrl`.

In `render-profile.js`, define `hasRemotePolicy = Boolean(options.proxyPolicyUrl || options.personalPolicyUrl)` and use it for the `[Proxy]` placeholder.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
npm test -- clients/surge/test/profile.test.js
```

Expected: both-provider, personal-only, and legacy default-only tests pass.

- [ ] **Step 5: Commit the renderer change**

```bash
git add clients/surge/src/render-groups.js clients/surge/src/render-profile.js clients/surge/test/profile.test.js
git commit -m "feat: add selectable Surge personal policy pool"
```

---

### Task 5: Validate comma-separated remote group references

**Files:**
- Modify: `clients/surge/src/validate-profile.js`
- Test: `clients/surge/test/validation.test.js`

- [ ] **Step 1: Write the failing validator test**

Add a valid profile case whose filtered group uses the escaped multi-source field:

```js
"A = select,include-other-group=PoolA\\,PoolB,policy-regex-filter=^.+$",
"PoolA = select,policy-path=https://a.example.invalid/nodes,hidden=1",
"PoolB = select,policy-path=https://b.example.invalid/nodes,hidden=1",
```

Assert `{ valid: true, errors: [] }`. Add a missing `PoolB` case and assert `missing group or proxy reference`.

- [ ] **Step 2: Run the focused validator test and verify RED**

```bash
npm test -- clients/surge/test/validation.test.js
```

Expected: the current validator treats `PoolA,PoolB` as one unresolved name.

- [ ] **Step 3: Implement the minimal parser change**

When reading `include-other-group=...`, split the unescaped field value on the comma and flatten the names:

```js
const remoteGroupReferences = fields.slice(1)
  .filter((field) => field.startsWith("include-other-group="))
  .flatMap((field) => field.slice("include-other-group=".length).split(","));
```

Keep existing single-group behavior and cycle detection.

- [ ] **Step 4: Run focused validator tests and verify GREEN**

```bash
npm test -- clients/surge/test/validation.test.js
```

Expected: single-source and multi-source validator cases pass.

- [ ] **Step 5: Commit the validator change**

```bash
git add clients/surge/src/validate-profile.js clients/surge/test/validation.test.js
git commit -m "test: validate multiple Surge remote groups"
```

---

### Task 6: Rebuild artifacts and verify all Surge behavior

**Files:**
- Modify: `clients/surge/dist/surge-profile-generator.js`
- Modify: `clients/surge/dist/substore-profile-generator.js`
- Modify: `clients/surge/dist/surge-nodes-generator.js` only if the build changes it
- Modify: `clients/surge/dist/substore-nodes-generator.js` only if the build changes it
- Modify: `clients/surge/examples/surge-macos.conf`
- Modify: `clients/surge/examples/surge-iphone.conf`
- Modify: `clients/surge/examples/surge-ipad.conf`

- [ ] **Step 1: Run the complete Surge verification suite**

```bash
npm run verify --workspace=@apple-proxy-profiles/surge
```

Expected: all Surge tests, build, fixtures, and secret scan pass. The build must not contain the personal URL.

- [ ] **Step 2: Inspect generated output safely**

Run:

```bash
rg -n "个人节点池|节点来源|include-other-group" clients/surge/dist clients/surge/examples
rg -n "private-source\.example|EXAMPLE_TOKEN|personalPolicyUrl" clients/surge/dist clients/surge/examples docs || true
```

Expected: names and generic option support are present; the user’s URL/token is absent.

- [ ] **Step 3: Commit generated artifacts**

```bash
git add clients/surge/dist clients/surge/examples
git commit -m "chore: rebuild Surge personal source artifacts"
```

Do not stage unrelated pre-existing `public/**/manifest.json` changes in this worktree.

---

### Task 7: Configure private Sub-Store profile operations

**Files:**
- External private Sub-Store configuration only; no repository file.

- [ ] **Step 1: Update the three Surge profile Script Operations**

Keep each existing default `proxyPolicyUrl` argument unchanged. Add a private argument named `personalPolicyUrl` with the user-provided personal Surge subscription. Keep `output=config`, `type=collection`, platform, and `noCache` unchanged.

- [ ] **Step 2: Refresh each profile through the private API**

Fetch the three private file endpoints with `raw=1` and assert HTTP 200. Do not print the response body or URL.

- [ ] **Step 3: Validate remote sections**

For each returned profile, assert:

```text
📦 远程节点池
🧩 个人节点池
🛠 节点来源
include-other-group=...远程节点池...个人节点池
```

Assert the `[Proxy]` section contains no inline `snell`, `ss`, `vmess`, `hysteria2`, or `vless` transport definitions.

- [ ] **Step 4: Validate the personal policy resource**

Use the private endpoint only to check HTTP 200 and count redacted `[Proxy]` entries. Confirm the profile’s remote URL is the private personal source without echoing it in logs.

---

### Task 8: Final review, deployment, and handoff

**Files:**
- Repository commits from Tasks 2–6.
- GitHub Pages artifacts generated by the project’s existing publication workflow.

- [ ] **Step 1: Run repository-level verification**

```bash
npm test
npm run verify
```

Expected: exit code 0 and zero failing tests. Record exact counts from output before claiming completion.

- [ ] **Step 2: Review the diff and secret scan**

```bash
git diff --check HEAD~6..HEAD
npm run check:secrets
git status --short
```

Expected: no whitespace errors, no secret scan findings, and only intended source/docs/dist changes plus pre-existing unstaged manifest changes.

- [ ] **Step 3: Push the implementation branch**

```bash
git push origin agent/surge-remote-provider
```

- [ ] **Step 4: Merge/deploy through the existing GitHub workflow**

Use the repository’s existing merge/publish path. Confirm the public Surge generator URLs return HTTP 200 and generic bundles contain the new behavior but no personal URL.

- [ ] **Step 5: Report user actions**

Tell the user to refresh the three Surge profiles, then choose `🛠 节点来源 → 🧩 个人节点池` when they want the personal source. Explain that `⚡ 亚太自动` now accepts compact personal names and that future URL changes belong in the private Sub-Store parameter.
