# Apple Proxy Profiles Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the history-preserving monorepo, move the existing Shadowrocket project without behavior changes, and establish shared node contracts, capability filtering, diagnostics, and root verification.

**Architecture:** Clone the existing local repository so Git history is preserved without touching the rollback folder. Keep Shadowrocket functional during the move, then extract client-neutral node modules behind exact ESM interfaces and add client capability filtering before any new renderer is introduced.

**Tech Stack:** Node.js 22+, ESM JavaScript, `node:test`, esbuild 0.28.1, npm workspaces.

## Global Constraints

- Preserve `/Users/sunyuze/Documents/代理软件/shadowrocket-profile` unchanged after cloning.
- Create `/Users/sunyuze/Documents/代理软件/apple-proxy-profiles` with the same HEAD history.
- Keep every existing Shadowrocket test green before and after each move.
- Use no new runtime dependency.
- Use `_profile` as the only enumerable internal metadata key on normalized nodes.
- Never include node values in capability diagnostics.
- Keep Node.js `>=22` and ESM.

---

## Target File Structure

```text
package.json
scripts/verify.mjs
shared/contracts.js
shared/nodes/{client-chain,country-regions,diagnostics,node-identity,node-validation,normalize-nodes,regions,source-labels}.js
shared/nodes/capabilities.js
shared/security/secret-scan.js
clients/shadowrocket/{package.json,src,test,scripts,dist,examples,docs}
test/foundation.test.js
```

### Task 1: Clone the Existing History Into the New Folder

**Files:**
- Source repository: `/Users/sunyuze/Documents/代理软件/shadowrocket-profile`
- Create repository: `/Users/sunyuze/Documents/代理软件/apple-proxy-profiles`

**Interfaces:**
- Consumes: current clean `main` at commit containing the approved spec and plan suite.
- Produces: a separate working repository with identical `HEAD`, branches, tags, and tracked files.

- [ ] **Step 1: Verify the source repository is clean and passing**

Run:

```bash
git -C /Users/sunyuze/Documents/代理软件/shadowrocket-profile status --short
npm ci
npm run verify
```

Working directory for npm commands: `/Users/sunyuze/Documents/代理软件/shadowrocket-profile`.

Expected: empty status and a passing verify run.

- [ ] **Step 2: Clone locally without shared object hardlinks**

Run from `/Users/sunyuze/Documents/代理软件`:

```bash
git clone --no-hardlinks /Users/sunyuze/Documents/代理软件/shadowrocket-profile apple-proxy-profiles
```

Expected: the new folder exists and reports branch `main`.

- [ ] **Step 3: Verify history identity and rollback isolation**

Run:

```bash
git -C /Users/sunyuze/Documents/代理软件/shadowrocket-profile rev-parse HEAD
git -C /Users/sunyuze/Documents/代理软件/apple-proxy-profiles rev-parse HEAD
git -C /Users/sunyuze/Documents/代理软件/apple-proxy-profiles remote remove origin
git -C /Users/sunyuze/Documents/代理软件/apple-proxy-profiles status --short
```

Expected: both hashes are identical, the new repository has no remote, and status is empty.

### Task 2: Move Shadowrocket Into a Client Workspace

**Files:**
- Create: `clients/shadowrocket/package.json`
- Create: `scripts/verify.mjs`
- Modify: `package.json`
- Move: `src/`, `test/`, `scripts/`, `dist/`, `examples/`, `README.md`, `RELEASE_CHECKLIST.md`, `THIRD_PARTY_NOTICES.md`, and operational docs into `clients/shadowrocket/`
- Keep: `docs/superpowers/` at repository root
- Test: `test/foundation.test.js`

**Interfaces:**
- Consumes: the unchanged Shadowrocket npm scripts.
- Produces: root scripts `verify`, `verify:shadowrocket`, `build`, `fixtures`, and `check:secrets`.

- [ ] **Step 1: Write a failing root-layout test**

Create `test/foundation.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("monorepo exposes the Shadowrocket workspace and root verification", async () => {
  await access(new URL("../clients/shadowrocket/package.json", import.meta.url));
  const root = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(root.workspaces, ["clients/*"]);
  assert.equal(root.scripts["verify:shadowrocket"], "npm --workspace @apple-proxy-profiles/shadowrocket run verify");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/foundation.test.js`

Expected: FAIL because `clients/shadowrocket/package.json` does not exist.

- [ ] **Step 3: Move files and define workspace scripts**

Use `git mv` for tracked files. Set the root `package.json` to:

```json
{
  "name": "apple-proxy-profiles",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "workspaces": ["clients/*"],
  "scripts": {
    "test": "node --test test && npm --workspaces --if-present test",
    "build": "npm --workspaces --if-present run build",
    "fixtures": "npm --workspaces --if-present run fixtures",
    "check:secrets": "node scripts/check-secrets.mjs",
    "verify:shadowrocket": "npm --workspace @apple-proxy-profiles/shadowrocket run verify",
    "verify": "node scripts/verify.mjs"
  },
  "devDependencies": { "esbuild": "0.28.1" }
}
```

Set `clients/shadowrocket/package.json` to the old script set with name `@apple-proxy-profiles/shadowrocket` and paths relative to that workspace.

- [ ] **Step 4: Add a deterministic root verifier**

Create `scripts/verify.mjs`:

```js
import { spawn } from "node:child_process";

const commands = [
  ["npm", ["test"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "fixtures"]],
  ["npm", ["run", "check:secrets"]],
];

for (const [command, args] of commands) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)));
  });
}
```

- [ ] **Step 5: Reinstall and run the moved suite**

Run:

```bash
npm install
node --test test/foundation.test.js
npm run verify:shadowrocket
```

Expected: PASS and the generated Shadowrocket files match their pre-move content.

- [ ] **Step 6: Commit the mechanical move**

```bash
git add package.json package-lock.json scripts test clients docs
git commit -m "build: establish multi-client workspace"
```

### Task 3: Extract Client-Neutral Node Contracts

**Files:**
- Create: `shared/contracts.js`
- Move: `clients/shadowrocket/src/{client-chain,country-regions,diagnostics,node-identity,node-validation,normalize-nodes,regions,source-labels}.js` to `shared/nodes/`
- Modify: every Shadowrocket import of those modules
- Modify: Shadowrocket tests that read `node._sr`
- Test: `test/foundation.test.js`

**Interfaces:**
- Produces: `CLIENT`, `OPTION_VALUES`, `SOURCE_KIND`, `CONTINENT`, and `nodeMetadata(node)`.
- Produces: `normalizeNodes(nodes, { clientChain }): { nodes, diagnostics }` where each node owns `_profile` metadata.

- [ ] **Step 1: Add failing neutral-metadata assertions**

Append to `test/foundation.test.js`:

```js
import { normalizeNodes } from "../shared/nodes/normalize-nodes.js";

test("normalized nodes expose neutral metadata only", () => {
  const { nodes } = normalizeNodes([{
    name: "US Test", type: "ss", server: "192.0.2.10", port: 8388,
    cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD_1234", _subName: "[自建]Test",
  }]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]._profile.sourceKind, "selfHosted");
  assert.equal(Object.hasOwn(nodes[0], "_sr"), false);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/foundation.test.js`

Expected: FAIL because the shared module and `_profile` do not exist.

- [ ] **Step 3: Define the neutral contract**

Create `shared/contracts.js` with:

```js
export const CLIENT = Object.freeze({
  shadowrocket: "shadowrocket",
  egern: "egern",
  anywhere: "anywhere",
});

export const SOURCE_KIND = Object.freeze({
  airport: "airport", selfHosted: "selfHosted", realm: "realm",
  serverChain: "serverChain", landing: "landing", unknown: "unknown",
});

export const CONTINENT = Object.freeze({
  asiaPacific: "asiaPacific", europe: "europe", americas: "americas", other: "other",
});

export function nodeMetadata(node) {
  if (!node?._profile || typeof node._profile !== "object") {
    throw new Error("Normalized node is missing _profile metadata");
  }
  return node._profile;
}
```

Move `OPTION_VALUES` into the same file without changing its values.

- [ ] **Step 4: Move the node modules and replace `_sr` with `_profile`**

Update imports to `shared/contracts.js`, keep all existing function signatures, and update Shadowrocket consumers to call `nodeMetadata(node)` instead of accessing a client-branded key.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
node --test test/foundation.test.js clients/shadowrocket/test/normalization.test.js clients/shadowrocket/test/groups.test.js
npm run verify:shadowrocket
```

Expected: PASS with unchanged rendered Shadowrocket Profiles.

- [ ] **Step 6: Commit the extraction**

```bash
git add shared clients/shadowrocket test
git commit -m "refactor: extract shared node model"
```

### Task 4: Add Explicit Client Capability Filtering

**Files:**
- Create: `shared/nodes/capabilities.js`
- Create: `test/capabilities.test.js`
- Modify: `shared/nodes/diagnostics.js`

**Interfaces:**
- Consumes: normalized nodes and `CLIENT`.
- Produces: `evaluateNodeForClient(node, client): { supported: boolean, reason: string | null }`.
- Produces: `filterNodesForClient(nodes, client): { nodes: object[], diagnostics: { accepted: number, excluded: Record<string, number> } }`.

- [ ] **Step 1: Write the capability matrix tests**

Create `test/capabilities.test.js` with fixtures asserting:

```js
test("filters by verified client subscription capabilities", () => {
  assert.deepEqual(evaluateNodeForClient({ type: "snell" }, CLIENT.egern), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "snell" }, CLIENT.anywhere), { supported: false, reason: "unsupported-protocol" });
  assert.deepEqual(evaluateNodeForClient({ type: "vless", network: "grpc" }, CLIENT.anywhere), { supported: false, reason: "unsupported-vless-network" });
  assert.deepEqual(evaluateNodeForClient({ type: "trojan", network: "ws" }, CLIENT.anywhere), { supported: false, reason: "unsupported-trojan-transport" });
});
```

Also assert that `filterNodesForClient` reports counts without returning node names or endpoint values in JSON diagnostics.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/capabilities.test.js`

Expected: FAIL because the capability functions do not exist.

- [ ] **Step 3: Implement the allowlists and fail-closed transport checks**

Use these protocol sets:

```js
const PROTOCOLS = Object.freeze({
  shadowrocket: new Set(["ss", "shadowsocks", "ssr", "snell", "vmess", "vless", "trojan", "hysteria2", "hy2", "tuic", "socks5", "http"]),
  egern: new Set(["ss", "shadowsocks", "snell", "vmess", "vless", "trojan", "anytls", "hysteria2", "hy2", "tuic", "socks5", "http", "wireguard"]),
  anywhere: new Set(["ss", "shadowsocks", "vless", "trojan", "anytls", "hysteria2", "hy2", "socks5", "sudoku"]),
});
```

For Anywhere, accept VLESS only for `tcp` or `ws`; accept Trojan only for TCP without `grpc-opts`, `reality-opts`, or enabled `ss-opts`; reject Shadowsocks plugins.

- [ ] **Step 4: Run tests**

Run:

```bash
node --test test/capabilities.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/nodes/capabilities.js shared/nodes/diagnostics.js test/capabilities.test.js
git commit -m "feat: add client capability filtering"
```

### Task 5: Centralize Secret Scanning

**Files:**
- Create: `shared/security/secret-scan.js`
- Modify: `scripts/check-secrets.mjs`
- Move or adapt: `clients/shadowrocket/test/security.test.js`
- Test: `test/security.test.js`

**Interfaces:**
- Produces: `containsSecret(text)`, `scanText(name, text)`, and `scanFiles(files)`.
- Produces: findings containing only file paths and rule IDs, never matched secret text.

- [ ] **Step 1: Write failing public/private boundary tests**

```js
test("public output rejects private URLs and endpoint credentials", () => {
  const credential = ["runtime", "constructed", "credential", "value"].join("_");
  const tokenKey = ["to", "ken"].join("");
  const passwordKey = ["pass", "word"].join("");
  assert.equal(containsSecret(`https://example.com/sub?${tokenKey}=${credential}`), true);
  assert.equal(containsSecret(`server: 192.0.2.20\n${passwordKey}: ${credential}`), true);
  assert.equal(containsSecret("https://juan-nikola.github.io/apple-proxy-profiles/current/rules/x.arrs"), false);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/security.test.js`

Expected: FAIL because `shared/security/secret-scan.js` does not exist.

- [ ] **Step 3: Move the scanner and add high-entropy detection**

Preserve existing URI, private-key, credential, UUID, and secret-query patterns. Add a detector that flags base64/base64url tokens of 32 or more characters only when they occur after a credential key such as `token`, `password`, `psk`, `private_key`, `uuid`, or `auth`.

- [ ] **Step 4: Run security and full tests**

Run:

```bash
node --test test/security.test.js
npm run check:secrets
npm test
```

Expected: PASS with no secret values printed.

- [ ] **Step 5: Commit**

```bash
git add shared/security scripts/check-secrets.mjs test/security.test.js clients/shadowrocket/test/security.test.js
git commit -m "security: centralize public artifact scanning"
```

### Task 6: Verify the Foundation Milestone

**Files:**
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: a clean, testable foundation accepted by later plans.

- [ ] **Step 1: Run the milestone gate**

```bash
npm ci
npm run verify
git diff --check
git status --short
```

Expected: every command passes and status is empty.

- [ ] **Step 2: Compare Shadowrocket fixtures with the source repository**

Run:

```bash
diff -u /Users/sunyuze/Documents/代理软件/shadowrocket-profile/examples/shadowrocket-macos.conf clients/shadowrocket/examples/shadowrocket-macos.conf
diff -u /Users/sunyuze/Documents/代理软件/shadowrocket-profile/examples/shadowrocket-iphone.conf clients/shadowrocket/examples/shadowrocket-iphone.conf
diff -u /Users/sunyuze/Documents/代理软件/shadowrocket-profile/examples/shadowrocket-ipad.conf clients/shadowrocket/examples/shadowrocket-ipad.conf
```

Expected: no output from all three comparisons.

- [ ] **Step 3: Update and commit milestone status**

Record the final foundation commit and `npm run verify — PASS`, then commit:

```bash
git add docs/implementation-status.md
git commit -m "docs: record foundation milestone"
```
