# Surge Remote Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Surge profiles reference a private Surge-compatible remote node resource generated from the existing `apple-proxy-sources` collection, while leaving other clients and the source collection unchanged.

**Architecture:** Add a Surge Sub-Store `output=nodes` entry that normalizes the same collection, applies `CLIENT.surge` capability filtering, and emits a Surge `[Proxy]` resource. Add a `proxyPolicyUrl` option to the existing profile entry; when supplied, the profile keeps `[Proxy]` empty and creates one hidden remote pool with `policy-path`, while all shared policy groups reference that pool with `include-other-group` and `policy-regex-filter`. Keep the existing embedded-node path for compatibility when `proxyPolicyUrl` is absent.

**Tech Stack:** Node.js 22 ESM, Node built-in test runner, esbuild, Sub-Store operator bundles, Surge configuration syntax.

## Global Constraints

- Only the Surge client and Surge Sub-Store tasks change behavior; Egern, sing-box, Shadowrocket, Anywhere, and `apple-proxy-sources` remain unchanged.
- Surge output accepts only protocols registered for `CLIENT.surge`; unsupported and unknown protocols are excluded before rendering.
- `proxyPolicyUrl` must be a single-line absolute HTTPS URL without embedded credentials or fragments and must never be committed to source, fixtures, public bundles, or documentation.
- The remote pool refresh interval is 21600 seconds (6 hours); the existing embedded mode remains available when no URL is supplied.
- Every production change requires a failing test first, followed by a passing focused test and the full relevant workspace test suite.

---

### Task 1: Add failing tests for the Surge node resource and remote profile

**Files:**
- Modify: `clients/surge/test/profile.test.js`
- Modify: `clients/surge/test/substore-profile-entry.test.js`
- Create: `clients/surge/test/substore-nodes-entry.test.js`
- Modify: `clients/surge/test/validation.test.js`

**Interfaces:**
- Tests will require `parseSurgeNodeOptions` and `operator` from `clients/surge/src/substore-nodes-entry.js`.
- Tests will pass `proxyPolicyUrl` to `parseSurgeOptions` and assert remote group rendering.

- [ ] **Step 1: Write a failing node-resource test**

  Use a fixture containing one valid Snell node and one valid VLESS node, call the future node operator with `output=nodes`, and assert that the returned `$content` contains a `[Proxy]` Snell line but no VLESS line. Assert that `produceArtifact` receives `{ type: "collection", name: "apple-proxy-sources", platform: "JSON", produceType: "internal" }`.

- [ ] **Step 2: Write a failing remote-profile test**

  Parse options with `proxyPolicyUrl: "https://substore.example.invalid/surge-nodes"`, render a profile, and assert that `[Proxy]` contains no `server=` or node transport line, one hidden `policy-path` pool exists, and the primary group contains `include-other-group=📦 远程节点池`.

- [ ] **Step 3: Write URL validation and profile validation assertions**

  Assert that non-HTTPS, credentials-bearing, fragment-bearing, newline-containing, and control-character URLs are rejected. Extend the profile fixture parser so a remote pool with `policy-path`, `include-other-group`, `policy-regex-filter`, and `update-interval` validates without requiring local proxy names.

- [ ] **Step 4: Run focused tests and verify the expected RED state**

  Run:

  ```bash
  npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='remote|node resource|policy-path'
  ```

  Expected: FAIL because the new node entrypoint, option, and remote group behavior do not exist yet.

### Task 2: Implement the Surge node-resource operator

**Files:**
- Create: `clients/surge/src/substore-nodes-entry.js`
- Modify: `clients/surge/src/options.js`
- Modify: `clients/surge/src/render-node.js`
- Modify: `clients/surge/src/substore-profile-entry.js`

**Interfaces:**
- `parseSurgeNodeOptions(raw)` returns a frozen `{ output: "nodes", type: "collection", name, clientChain }` object.
- `operator(input, targetPlatform, context)` in `substore-nodes-entry.js` requests the same collection, normalizes nodes, filters with `CLIENT.surge`, renders a Surge `[Proxy]` resource, and returns `{ ...input, $content }`.

- [ ] **Step 1: Implement strict node-output option parsing**

  Accept only `output`, `type`, `name`, and `clientChain`; require `output=nodes`, `type=collection`, and a non-empty safe collection name. Default `clientChain` to `off`.

- [ ] **Step 2: Implement node production and capability filtering**

  Call `context.produceArtifact` with the collection request used by the existing profile operator. Run `normalizeNodes`, then `filterNodesForClient(normalized.nodes, CLIENT.surge)`. Throw `No compatible Surge nodes` when the filtered result is empty, preserving the existing non-empty safety rule.

- [ ] **Step 3: Render a provider resource using existing sanitization**

  Export `renderSurgeNodeResource(nodes)` from `render-node.js` or a focused helper. Render `# Generated by apple-proxy-profiles` followed by `[Proxy]` and one `renderSurgeProxy(sanitizeSurgeNode(node))` line per filtered node. Do not include `_profile`, source credentials outside the required Surge fields, or policy groups.

- [ ] **Step 4: Export the node operator from the bundle entrypoint**

  Keep `output=config` routed to the existing profile path and route `output=nodes` to the new node path, or expose the node operator through the same Sub-Store bundle without changing the wrapper contract.

- [ ] **Step 5: Run the focused node tests and confirm GREEN**

  Run:

  ```bash
  npm --workspace @apple-proxy-profiles/surge test -- --test-name-pattern='node resource|Surge node'
  ```

  Expected: PASS, including exclusion of VLESS and rejection of an empty compatible inventory.

### Task 3: Implement the remote policy pool and preserve embedded mode

**Files:**
- Modify: `clients/surge/src/options.js`
- Modify: `clients/surge/src/render-profile.js`
- Modify: `clients/surge/src/render-groups.js`
- Modify: `clients/surge/src/validate-profile.js`
- Modify: `clients/surge/test/profile.test.js`
- Modify: `clients/surge/test/validation.test.js`

**Interfaces:**
- `parseSurgeOptions(raw)` adds optional `proxyPolicyUrl` while preserving all existing defaults.
- `renderSurgeProfile(options, nodes, { ruleBaseUrl })` renders embedded nodes when the URL is absent and a remote-only profile when present.
- `renderSurgeGroups(options, nodes)` renders a hidden `📦 远程节点池` and makes all node-filtered groups consume it in remote mode.

- [ ] **Step 1: Implement safe `proxyPolicyUrl` parsing**

  Accept only absolute HTTPS URLs with a hostname, no username/password, no fragment, no control characters, and no leading/trailing whitespace. Keep the value out of public defaults and examples.

- [ ] **Step 2: Render the remote-only `[Proxy]` section**

  In remote mode, emit an empty/comment-only `[Proxy]` section and do not call `renderSurgeProxy` for the profile inventory. In embedded mode, retain the current node rendering unchanged.

- [ ] **Step 3: Render one hidden remote pool and dynamic groups**

  Add:

  ```ini
  📦 远程节点池 = select, policy-path=<proxyPolicyUrl>, update-interval=21600, hidden=1
  ```

  For every shared group with a non-null `nodeFilter`, append `include-other-group=📦 远程节点池` and `policy-regex-filter=<nodeFilter>`. Keep explicit built-in/group candidates and service-group references intact. Do not duplicate `policy-path` on every group.

- [ ] **Step 4: Extend validation for dynamic remote references**

  Teach `validateSurgeProfile` that `policy-path`, `include-other-group`, `policy-regex-filter`, `update-interval`, and `hidden=1` are control fields; validate the hidden pool URL shape and allow filtered groups to resolve through the remote pool instead of local proxy names.

- [ ] **Step 5: Run all Surge tests**

  Run:

  ```bash
  npm --workspace @apple-proxy-profiles/surge test
  ```

  Expected: all existing embedded-mode tests and new remote-mode tests pass.

### Task 4: Build and publish the dual-purpose Sub-Store bundle

**Files:**
- Modify: `clients/surge/scripts/build.mjs`
- Modify: `clients/surge/scripts/render-fixtures.mjs`
- Modify: `clients/surge/test/bundles.test.js`
- Modify: `clients/surge/test/examples.test.js`
- Modify: `clients/surge/examples/surge-iphone.conf`
- Modify: `clients/surge/examples/surge-ipad.conf`
- Modify: `clients/surge/examples/surge-macos.conf`
- Regenerate: `clients/surge/dist/*.js`
- Regenerate: `public/current/surge/scripts/*.js`

**Interfaces:**
- The public Sub-Store script accepts `output=config` for the Profile and `output=nodes` for the private Surge provider resource.
- Public examples use `https://example.invalid/surge-nodes` only and contain no real subscription token.

- [ ] **Step 1: Add bundle coverage for both outputs**

  Assert that the generated bundles contain the node-resource operator and contain no real provider URL or test credential.

- [ ] **Step 2: Generate remote-mode examples with a documentation URL**

  Render the three platform examples in remote mode with `https://example.invalid/surge-nodes`, validate them, and assert they contain `policy-path` and no fixture server line in `[Proxy]`.

- [ ] **Step 3: Rebuild and run generated-artifact tests**

  Run:

  ```bash
  npm --workspace @apple-proxy-profiles/surge run build
  npm --workspace @apple-proxy-profiles/surge test
  ```

  Expected: generated dist and public scripts match source behavior.

### Task 5: Update Sub-Store setup and deployment documentation

**Files:**
- Modify: `clients/surge/README.md`
- Modify: `clients/surge/docs/deployment.md`
- Modify: `clients/surge/docs/troubleshooting.md`
- Modify: `docs/substore-two-layer-setup.md`
- Modify: `public/current/manifest.json` only if the build manifest requires the new script entry.

**Interfaces:**
- Documentation names two private File tasks: `surge-nodes` (`output=nodes`) and `surge-profile` (`output=config`, with `proxyPolicyUrl` set to the private `surge-nodes` URL).

- [ ] **Step 1: Document the two-task Sub-Store order**

  Explain that both tasks consume `apple-proxy-sources`; create `surge-nodes` first, copy its private URL, then place that URL in the Surge Profile task arguments. The profile download automatically carries the URL.

- [ ] **Step 2: Document protocol and refresh behavior**

  State that Surge receives only protocols registered as Surge-compatible, while future protocols require a registry/renderer update. State that the provider refreshes every 6 hours and Surge groups perform runtime testing.

- [ ] **Step 3: Document secret handling and rollback**

  Keep private URLs out of GitHub and examples. Include the backup tag `backup-before-surge-remote-20260807` as the rollback reference.

### Task 6: Full verification, commit, push, and deployment

**Files:**
- All files changed by Tasks 1–5.

- [ ] **Step 1: Run repository checks**

  ```bash
  npm test
  npm run build
  npm run check:secrets
  npm run check:actions
  npm run verify
  ```

- [ ] **Step 2: Inspect the diff and generated artifacts**

  Confirm only Surge source, tests, docs, generated Surge bundles/examples, and required manifests changed; confirm no private subscription URL or real node credential appears in `git diff`.

- [ ] **Step 3: Commit the implementation**

  ```bash
  git add clients/surge docs/substore-two-layer-setup.md public/current/surge
  git commit -m "feat: add Surge remote node provider"
  ```

- [ ] **Step 4: Push the implementation branch**

  ```bash
  git push -u origin agent/surge-remote-provider
  ```

- [ ] **Step 5: Open a draft PR against `main`**

  Include the remote-provider architecture, compatibility filtering, tests run, and the backup branch/tag in the PR description. Do not include the private Sub-Store URL.

- [ ] **Step 6: Configure the user’s private Sub-Store tasks after code is published**

  Use the published `surge-profile-generator.js` for both task modes, keep the original combination source, set the profile’s `proxyPolicyUrl` to the private provider output, refresh the provider, and perform a manual Surge iOS/macOS import test.

## Self-Review Checklist

- Source collection remains unchanged and all non-Surge clients keep their existing entrypoints.
- The Profile contains a remote provider URL but no node transport lines in remote mode.
- The provider output contains only Surge-compatible, normalized, sanitized nodes.
- New nodes and newly supported protocols flow through the same collection and capability registry.
- Unknown protocols fail closed instead of being emitted into Surge.
- Tests cover both remote and legacy embedded modes, validation, bundle output, and secret scanning.
