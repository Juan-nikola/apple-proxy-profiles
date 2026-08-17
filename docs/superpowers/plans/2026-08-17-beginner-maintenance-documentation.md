# Beginner Deployment and Maintenance Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the root README the single beginner entry point, synchronize all active documentation with the five-client release and Anywhere's 14 logical rule packages, and prevent stale counts and private-environment assumptions from returning.

**Architecture:** Treat `shared/contracts.js`, the canonical Sub-Store task list, and `clients/anywhere/examples/rules/manifest.json` as independent sources of truth. A focused documentation test compares active documentation with those sources, while the README owns the complete beginner journey and existing client documents retain deep technical details.

**Tech Stack:** Markdown, Node.js 22 built-in test runner, ECMAScript modules, npm workspaces, GitHub Actions/Pages.

## Global Constraints

- The maintained clients are exactly Shadowrocket, Surge, Egern, Anywhere, and sing-box; Android is a sing-box platform, not a sixth client.
- The canonical Sub-Store setup has one total pool, five client collections, and 17 File tasks: Egern 4, Anywhere 1, Shadowrocket 4, Surge 4, sing-box 4.
- Anywhere's default rule layer contains the 14 `logicalRuleSets` declared by `clients/anywhere/examples/rules/manifest.json`.
- Happ and OneXray remain only in historical `docs/superpowers/specs/` and `docs/superpowers/plans/`; active deployment documents must not present them as supported clients.
- Public documentation must not assert a real user's Sub-Store host, source names, completed tasks, private URLs, node values, credentials, or tokens.
- Preserve existing client runtime behavior and generated artifacts; this plan changes documentation and documentation tests only.
- Push directly to `main`, as explicitly approved by the user; do not open a pull request.

---

### Task 1: Lock current documentation facts with a failing test

**Files:**
- Modify: `test/substore-docs.test.js`
- Modify: `docs/superpowers/specs/2026-08-17-beginner-maintenance-documentation-design.md`

**Interfaces:**
- Consumes: `CLIENT` from `shared/contracts.js`; `logicalRuleSets` from `clients/anywhere/examples/rules/manifest.json`; the canonical File task names listed in `docs/substore-two-layer-setup.md`.
- Produces: regression checks that report the exact active document containing a stale client count, stale Anywhere shard wording, missing task, unsupported client entry, or private-environment assertion.

- [ ] **Step 1: Correct the reviewed design's discovered task-count error**

Change the design from 16 to 17 tasks and include `shadowrocket-nodes` in the Shadowrocket task boundary. Record the arithmetic as `4+1+4+4+4=17` so the plan and implementation use the audited fact.

- [ ] **Step 2: Write the failing documentation tests**

Extend `test/substore-docs.test.js` with real manifest and client-contract inputs:

```js
import { CLIENT } from "../shared/contracts.js";

const activeDocs = [
  "README.md",
  "docs/substore-two-layer-setup.md",
  "docs/implementation-status.md",
  "clients/anywhere/README.md",
  "clients/anywhere/docs/canary.md",
  "clients/anywhere/docs/deployment.md",
  "clients/anywhere/docs/troubleshooting.md",
];

test("active documentation follows the maintained client and Anywhere package contracts", async () => {
  const manifest = JSON.parse(await text("clients/anywhere/examples/rules/manifest.json"));
  const packageIds = manifest.logicalRuleSets.map(({ id }) => id).sort();
  const expectedCount = packageIds.length;
  const docs = await Promise.all(activeDocs.map(async (path) => [path, await text(path)]));

  assert.deepEqual(Object.keys(CLIENT).sort(), ["anywhere", "egern", "shadowrocket", "singbox", "surge"]);
  assert.equal(expectedCount, 14);
  for (const [path, content] of docs) {
    assert.doesNotMatch(content, /六个客户端|六个 client collection|31 个默认(?:规则)?分片|31 个默认 shard/u, path);
    assert.doesNotMatch(content, /(?:Happ|OneXray).{0,40}(?:部署|客户端|任务|collection)/iu, path);
  }
  const entry = docs.find(([path]) => path === "README.md")[1];
  assert.match(entry, new RegExp(`${expectedCount} 个稳定业务包`, "u"));
  for (const id of packageIds) assert.ok(entry.includes(`\`${id}\``), `README missing Anywhere package ${id}`);
});
```

Update the canonical task assertion to include `shadowrocket-nodes`, require all 17 task names, and match `4+1+4+4+4=17 个任务`. Add a README privacy assertion that rejects `substore.sunyz.uk`, `xiaov`, “已经全部建好”, “已经帮你建好”, and statements that a reader already owns named sources.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test test/substore-docs.test.js`

Expected: FAIL for the current 16-task arithmetic, the missing canonical `shadowrocket-nodes` row, stale “six collections” text, stale “31 shards” text, and README private-environment assumptions. The failure must come from these intended documentation mismatches, not a syntax or file error.

- [ ] **Step 4: Commit the regression boundary with the corrected design**

```bash
git add test/substore-docs.test.js docs/superpowers/specs/2026-08-17-beginner-maintenance-documentation-design.md docs/superpowers/plans/2026-08-17-beginner-maintenance-documentation.md
git commit -m "test: lock beginner documentation contracts"
```

---

### Task 2: Rewrite the root README as the single beginner entry point

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: five client collection names from `docs/substore-client-pools.md`; 17 task names from `docs/substore-two-layer-setup.md`; 14 Anywhere package IDs from the manifest.
- Produces: a standalone beginner path for first deployment, importing, daily maintenance, rule updates, publishing, rollback, and troubleshooting.

- [ ] **Step 1: Replace private assumptions with conditional setup language**

Remove the real Sub-Store hostname, named personal sources, the `xiaov` exclusion, and wording such as “already deployed” or “already created”. Explain that users with an existing setup should preview it and users without one should create it from the canonical checklist.

- [ ] **Step 2: Add a top-level action navigator**

Add a short “我现在要做什么” table linking to:

- first deployment;
- adding or deleting nodes;
- changing one task parameter;
- updating public rules;
- modifying source and publishing;
- rollback and troubleshooting.

Keep the root README sufficient for the happy path; use client documents only for expanded details.

- [ ] **Step 3: Publish the audited client, collection, and task model**

Describe five clients, one total pool, five client collections, and 17 tasks. Use canonical Egern names (`egern-nodes`, `egern-macos`, `egern-iphone`, `egern-ipad`) and include the `shadowrocket-nodes` task rather than mentioning it only later in the import section.

- [ ] **Step 4: Explain Anywhere's 14 business packages and bindings**

List all 14 manifest IDs in backticks. Explain that `Security` defaults to REJECT; `DomesticCore`, `DomesticPlatform`, `Apple`, `Microsoft`, `Download`, `ChinaIP`, and `Privacy` use the current manifest defaults; proxy-following packages use the selected node or chain. Tell users to trust the import page's current assignments and verify them in the app instead of reusing old 31-shard binding instructions.

- [ ] **Step 5: Make every critical workflow observable and reversible**

For collection preview, task preview, client import, rule update, source edit, Pages deployment, and rollback, include an operation, success marker, first failure check, and rollback path. Preserve the warning to keep MITM/HTTPS decryption disabled and never publish private output URLs.

- [ ] **Step 6: Run the focused test**

Run: `node --test test/substore-docs.test.js`

Expected: Remaining failures should be limited to the supporting documents not yet synchronized in Task 3; README-specific task names, package list, privacy assertions, and current client boundary pass.

- [ ] **Step 7: Commit the beginner entry point**

```bash
git add README.md
git commit -m "docs: rewrite beginner deployment guide"
```

---

### Task 3: Synchronize active supporting documentation

**Files:**
- Modify: `docs/substore-two-layer-setup.md`
- Modify: `docs/substore-client-pools.md`
- Modify: `docs/implementation-status.md`
- Modify: `clients/anywhere/README.md`
- Modify: `clients/anywhere/docs/canary.md`
- Modify: `clients/anywhere/docs/deployment.md`
- Modify: `clients/anywhere/docs/troubleshooting.md`
- Modify when private-source assumptions are found: `clients/egern/docs/deployment.md`
- Modify when private-source assumptions are found: `clients/shadowrocket/README.md`
- Modify when private-source assumptions are found: `clients/shadowrocket/docs/deployment.md`
- Modify when private-source assumptions are found: `clients/shadowrocket/docs/troubleshooting.md`
- Modify when private-source assumptions are found: `clients/surge/README.md`
- Modify when private-source assumptions are found: `clients/surge/docs/deployment.md`

**Interfaces:**
- Consumes: the terminology and workflow established by the root README.
- Produces: current technical detail without contradicting the beginner entry point or assuming one person's private environment.

- [ ] **Step 1: Fix the canonical Sub-Store inventory**

Add `shadowrocket-nodes` to the numbered task table, renumber later rows, change the total to `4+1+4+4+4=17`, replace “six client collections” with five, and remove the deployment-specific `xiaov` instruction. Preserve `apple-proxy-sources` only as a compatibility/rollback path.

- [ ] **Step 2: Fix Anywhere terminology from upstream shards to logical packages**

Replace “31 default shards/sources” claims with the 14 logical packages from the manifest. Where audit detail matters, explain that multiple upstream sources are compiled into those 14 packages; do not retain an obsolete fixed entry count as a user-facing success criterion. Update binding examples to use current package names such as `DomesticPlatform` instead of removed source-level names such as `DomesticGame`.

- [ ] **Step 3: Remove personal source assumptions from active client guides**

Replace `snell`/`vlesshy2`-specific setup instructions with “your validated private sources” unless a protocol name is explicitly used as a renderer example. Remove the `xiaov` user-specific exclusion from the canonical pool guide. Fix the Surge README's stale “18 tasks” wording if still present.

- [ ] **Step 4: Update implementation status**

Record five client collections and 17 tasks, change the pending migration row from six to five collections, and keep real-device canary explicitly pending because automated validation cannot substitute for device testing.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test test/substore-docs.test.js`

Expected: PASS with no stale-client, stale-Anywhere, missing-task, or private-environment failures.

- [ ] **Step 6: Search active documentation for residual drift**

Run:

```bash
rg -n "六个客户端|六个 client collection|31 个默认|31 个.*分片|31 个.*shard|substore\.sunyz\.uk|xiaov|已经全部建好|已经帮你建好" README.md docs/*.md clients/*/README.md clients/*/docs/*.md
```

Expected: no matches in active documentation. Historical files under `docs/superpowers/` are intentionally excluded.

- [ ] **Step 7: Commit synchronized documentation**

```bash
git add docs/substore-two-layer-setup.md docs/substore-client-pools.md docs/implementation-status.md clients/anywhere clients/egern/docs/deployment.md clients/shadowrocket clients/surge
git commit -m "docs: synchronize five-client maintenance guides"
```

---

### Task 4: Run full verification and publish main

**Files:**
- Verify all tracked changes.
- No new production files unless a verification failure exposes a documentation defect within this plan's scope.

**Interfaces:**
- Consumes: all documentation and regression checks from Tasks 1-3.
- Produces: verified commits on `main`, pushed to `origin/main`, with GitHub Actions and Pages status reported.

- [ ] **Step 1: Run documentation and repository checks**

Run, in order:

```bash
node --test test/substore-docs.test.js test/client-set.test.js
npm test
npm run verify
npm run check:secrets
npm run check:actions
git diff --check
```

Expected: every command exits 0. If a network-only rule check fails inside `verify`, distinguish an external fetch problem from a local test failure and do not claim completion without a fresh successful full verification.

- [ ] **Step 2: Inspect the final diff and repository state**

Run:

```bash
git status --short --branch
git diff origin/main...HEAD --stat
git log --oneline --decorate -6
```

Expected: only intended design, plan, test, and active documentation changes are present; `main` is ahead of `origin/main`; no unstaged edits remain after the final documentation commit.

- [ ] **Step 3: Commit any final verification-only corrections**

If verification required a scoped correction, stage only the affected files and commit with:

```bash
git commit -m "docs: finalize beginner maintenance guide"
```

Do not create an empty commit.

- [ ] **Step 4: Push directly to main**

Run: `git push origin main`

Expected: the remote reports the new `main` tip and includes the earlier semantic-rules refactor plus all documentation commits.

- [ ] **Step 5: Confirm GitHub Actions and Pages**

Use `gh` to inspect runs for the pushed commit. Confirm all required checks finish successfully. If documentation-only changes do not automatically deploy Pages, report that fact; if a workflow runs, confirm its conclusion and the public Pages endpoint.

- [ ] **Step 6: Report the remaining human-only action**

State that no repository maintenance action remains. The only non-automatable follow-up is real-device canary testing in the order documented by each client, with old Profiles retained for rollback.
