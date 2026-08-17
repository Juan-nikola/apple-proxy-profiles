# Blackmatrix7 Commit Atom Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the Blackmatrix7 `master` head from GitHub's official branch Atom feed so rule builds keep immutable commit inputs when the commits API returns persistent 504 responses.

**Architecture:** `resolveUpstreamCommit()` fetches one branch-specific Atom feed with bounded 429/5xx retries, reads the first entry as the branch head, cross-checks the SHA in the entry ID and official commit link, validates the updated time, and preserves its existing frozen `{ sha, committedAt }` return contract.

**Tech Stack:** Node.js 22 ECMAScript modules, built-in `fetch`, `AbortSignal.timeout`, `node:test`, GitHub commit Atom feeds.

## Global Constraints

- Use only `https://github.com/blackmatrix7/ios_rule_script/commits/master.atom` for branch-head discovery.
- Preserve `redirect: "manual"`, the 30-second timeout, and a repository-specific User-Agent.
- Retry only HTTP 429 and 5xx with delays of 1,000 ms and 2,000 ms; permanent status codes do not retry.
- Treat the first Atom entry as the branch head; do not sort entries by timestamps.
- Require matching 40-character lowercase SHA values in the entry ID and official commit link.
- Reject invalid or more-than-five-minutes-future timestamps.
- Preserve the existing `{ sha, committedAt }` public interface and immutable raw-content URLs.
- Push directly to `main`, as already approved; do not create a pull request or dispatch subagents.

---

### Task 1: Write failing Atom resolver tests

**Files:**
- Modify: `automation/test/resolve-upstream.test.js`
- Create: `docs/superpowers/plans/2026-08-17-blackmatrix7-commit-atom.md`

**Interfaces:**
- Consumes: `resolveUpstreamCommit(fetchImpl, now, sleepImpl)`.
- Produces: observable contracts for the Atom URL, request options, first-entry SHA, timestamp, retry count, permanent errors, and malformed feeds.

- [ ] **Step 1: Replace the JSON success fixture with literal Atom**

Use a feed whose first entry is:

```xml
<entry>
  <id>tag:github.com,2008:Grit::Commit/538b8a79532c44dfbcb8e694d2f43e753c60b157</id>
  <link type="text/html" rel="alternate" href="https://github.com/blackmatrix7/ios_rule_script/commit/538b8a79532c44dfbcb8e694d2f43e753c60b157"/>
  <updated>2026-08-15T18:26:29Z</updated>
</entry>
```

Include an older second entry. Assert the first SHA wins and the result is:

```js
{
  sha: "538b8a79532c44dfbcb8e694d2f43e753c60b157",
  committedAt: "2026-08-15T18:26:29Z",
}
```

Assert the request URL ends with `/commits/master.atom`, Accept is `application/atom+xml`, and redirect remains `manual`.

- [ ] **Step 2: Add bounded transient retry behavior**

Return 504 twice and the valid Atom response on the third request. Inject `sleepImpl`, assert three attempts and delays `[1_000, 2_000]`.

- [ ] **Step 3: Add permanent and malformed-feed cases**

Require these failures:

- 404: `HTTP status 404`, one request;
- no entry: `invalid commit`;
- non-40-character ID SHA: `invalid commit`;
- valid but different link SHA: `invalid commit`;
- missing or invalid updated value: `invalid commit time`;
- future updated value: `invalid commit time`;
- thrown fetch: `network failure`.

- [ ] **Step 4: Run the focused test and verify RED**

Run: `node --test automation/test/resolve-upstream.test.js`

Expected: FAIL because production still requests the JSON commits API, calls `json()`, and has no retry injection.

- [ ] **Step 5: Commit the failing contract**

```bash
git add automation/test/resolve-upstream.test.js docs/superpowers/plans/2026-08-17-blackmatrix7-commit-atom.md
git commit -m "test: require resilient upstream commit resolution"
```

---

### Task 2: Implement strict branch Atom parsing

**Files:**
- Modify: `automation/src/resolve-upstream.js`

**Interfaces:**
- Consumes: official Atom text, injected current time, and optional injected sleep.
- Produces: unchanged frozen `{ sha, committedAt }` objects.

- [ ] **Step 1: Add retry constants and injectable sleep**

Define delays `[1_000, 2_000]`, a Promise-based `sleep()`, and the signature:

```js
resolveUpstreamCommit(fetchImpl = globalThis.fetch, now = Date.now(), sleepImpl = sleep)
```

Validate both injected functions before requesting the feed.

- [ ] **Step 2: Fetch the Atom feed with bounded retries**

Set URL to `https://github.com/blackmatrix7/ios_rule_script/commits/master.atom`, Accept to `application/atom+xml`, and preserve manual redirects and timeout. Retry only 429 and 5xx; retain `network failure` for thrown fetch and exact final status errors.

- [ ] **Step 3: Parse and cross-check the first entry**

Read response text, extract the first complete entry, then require:

```text
tag:github.com,2008:Grit::Commit/<sha>
https://github.com/blackmatrix7/ios_rule_script/commit/<same-sha>
```

Inspect link attributes independently of their order. If either SHA is absent, malformed, or different, throw `Blackmatrix7 resolver returned an invalid commit`.

- [ ] **Step 4: Preserve time validation and return shape**

Parse the first entry's `<updated>`, reject invalid/future values, normalize to ISO without `.000`, and return a frozen object.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test automation/test/resolve-upstream.test.js`

Expected: all resolver tests pass.

- [ ] **Step 6: Commit implementation**

```bash
git add automation/src/resolve-upstream.js
git commit -m "fix: resolve upstream commits from GitHub Atom"
```

---

### Task 3: Verify, publish, and monitor

**Files:**
- Verify all commits and generated effects.

**Interfaces:**
- Consumes: live Blackmatrix7 Atom, repository verification, GitHub Actions, and Pages.
- Produces: successful rule update and deployment evidence.

- [ ] **Step 1: Run the resolver against the live official feed**

Run a Node ESM expression importing `resolveUpstreamCommit()` and printing its result.

Expected: exit 0 with a 40-character SHA and a valid UTC `committedAt`.

- [ ] **Step 2: Run local verification**

Run:

```bash
node --test automation/test/resolve-upstream.test.js
npm test
npm run verify
npm run check:secrets
npm run check:actions
git diff --check
```

Expected: every command exits 0 and the working tree is clean after commits.

- [ ] **Step 3: Push main and monitor exact SHA**

Push directly to `origin/main`, locate Update Rules by full head SHA, and confirm both sing-box installation and Blackmatrix7 staging succeed.

- [ ] **Step 4: Continue through Pages**

Wait for all remaining Update Rules jobs and the resulting Deploy Pages workflow. If a new step fails, retrieve its exact log before changing code.

- [ ] **Step 5: Verify the public site**

Request the site root and one representative public manifest with HTTP success responses, then report the workflow run IDs and only the remaining human-only canary/rollback checks.
