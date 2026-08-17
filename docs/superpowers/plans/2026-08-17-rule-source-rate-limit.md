# Rule Source Rate-Limit Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make immutable raw rule downloads recover from GitHub 429/5xx responses by honoring bounded server cooldown hints and pacing the production snapshot without changing any source identity or validation.

**Architecture:** `fetchSnapshot()` owns a shared request-start gate and injects it into each worker. `fetchOne()` keeps the existing retry count but waits using `Retry-After`, `Expires - Date`, or status-specific fallback delays before another attempt. Production `buildArtifacts()` injects a single-worker, 250 ms paced configuration through a testable fetch boundary.

**Tech Stack:** Node.js 22 ECMAScript modules, built-in `fetch`, Web Streams, `node:test`, GitHub raw content.

## Global Constraints

- Preserve all 33 source records and their exact commit-pinned `raw.githubusercontent.com` URLs.
- Preserve manual redirects, content-type checks, 64 MiB byte limit, fatal UTF-8 decoding, non-empty/HTML rejection, and SHA-256 calculation.
- Keep at most three total attempts per source.
- Prefer `Retry-After`, then `Expires - Date`, then local fallback; cap one wait at 300,000 ms and require at least 1,000 ms.
- Use 429 fallbacks of 30,000 and 60,000 ms; use 1,000 and 2,000 ms for network and other retryable statuses.
- Production uses `concurrency: 1` and `requestIntervalMs: 250`.
- Permanent errors and redirects remain fail-fast.
- Push directly to `main`; do not create a pull request or dispatch subagents.

---

### Task 1: Write failing cooldown and pacing tests

**Files:**
- Modify: `automation/test/fetch-snapshot.test.js`
- Modify: `test/update-rules.test.js`
- Create: `docs/superpowers/plans/2026-08-17-rule-source-rate-limit.md`

**Interfaces:**
- Consumes: `fetchSnapshot({ sleepImpl, nowImpl, requestIntervalMs, ... })` and `buildArtifacts({ fetchSnapshotImpl, ... })`.
- Produces: regression coverage for server cooldowns, fallback waits, permanent statuses, shared pacing, and production fetch options.

- [ ] **Step 1: Add a 429 Expires cooldown test**

Return two 429 responses with:

```text
Date: Mon, 17 Aug 2026 15:37:40 GMT
Expires: Mon, 17 Aug 2026 15:42:40 GMT
```

Return a valid rule on the third attempt. Inject `sleepImpl`, assert three attempts and delays `[300_000, 300_000]`.

- [ ] **Step 2: Add fallback delay tests**

For 503 without cooldown headers, require delays `[1_000, 2_000]`. For thrown network errors followed by success, require the same fallback. For 404, require one attempt and no delay.

- [ ] **Step 3: Add shared request-start pacing behavior**

Use three sources, `concurrency: 3`, `requestIntervalMs: 250`, and an event-recording `sleepImpl`/`fetchImpl`. Require the observable sequence:

```js
["fetch:S0", "sleep:250", "fetch:S1", "sleep:250", "fetch:S2"]
```

The returned Map must retain catalog order.

- [ ] **Step 4: Lock production snapshot options**

Export/inject `fetchSnapshotImpl` through `buildArtifacts()`. In `test/update-rules.test.js`, pass `upstreamOverride`, `includeStaticFiles: false`, and a fake snapshot function that captures options then throws `capture snapshot options`. Assert:

```js
{
  concurrency: 1,
  requestIntervalMs: 250,
}
```

- [ ] **Step 5: Run focused tests and verify RED**

Run:

```bash
node --test automation/test/fetch-snapshot.test.js test/update-rules.test.js
```

Expected: FAIL because retries do not sleep, pacing options are ignored, and `buildArtifacts()` does not expose the snapshot boundary.

- [ ] **Step 6: Commit the failing contracts**

```bash
git add automation/test/fetch-snapshot.test.js test/update-rules.test.js docs/superpowers/plans/2026-08-17-rule-source-rate-limit.md
git commit -m "test: require rate-limit-aware rule fetching"
```

---

### Task 2: Implement bounded cooldowns and production pacing

**Files:**
- Modify: `automation/src/fetch-snapshot.js`
- Modify: `scripts/update-rules.mjs`

**Interfaces:**
- Consumes: response status/headers, injected sleep/clock, shared request gate.
- Produces: unchanged snapshot Map entries and testable production fetch configuration.

- [ ] **Step 1: Add injected timing dependencies**

Add Promise-based `sleep`, defaults `sleepImpl = sleep`, `nowImpl = Date.now`, and `requestIntervalMs = 0`. Validate both functions and require an integer interval between 0 and 5,000 ms.

- [ ] **Step 2: Build one shared request-start gate**

Create one gate per `fetchSnapshot()` call. Every source attempt must pass through it before `fetchImpl`. When interval is nonzero, serialize start slots and wait exactly that interval between successive starts, including starts from different workers.

- [ ] **Step 3: Calculate bounded retry delays**

Parse `Retry-After` as integer seconds or HTTP date. Otherwise use a valid `Expires` minus response `Date` (or `nowImpl()` if Date is absent). Clamp valid delays to `[1_000, 300_000]`; use the status-specific fallbacks when headers are missing or invalid.

- [ ] **Step 4: Wait before every retry**

For retryable HTTP statuses, cancel the unused response body, await the calculated delay, then retry. For thrown fetch errors, await 1,000/2,000 ms before retrying. Preserve the exact final source error after attempts are exhausted.

- [ ] **Step 5: Configure the production caller**

Extend `buildArtifacts()` with `fetchSnapshotImpl = fetchSnapshot`, call that injection with `concurrency: 1` and `requestIntervalMs: 250`, and leave all other inputs unchanged.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
node --test automation/test/fetch-snapshot.test.js test/update-rules.test.js
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit implementation**

```bash
git add automation/src/fetch-snapshot.js scripts/update-rules.mjs
git commit -m "fix: honor rule-source rate limits"
```

---

### Task 3: Verify, publish, and monitor through Pages

**Files:**
- Verify all commits and generated effects.

**Interfaces:**
- Consumes: live GitHub raw cooldown behavior, all local checks, GitHub Actions, and Pages.
- Produces: complete deployment evidence.

- [ ] **Step 1: Run focused and full local verification**

Run:

```bash
node --test automation/test/fetch-snapshot.test.js test/update-rules.test.js
npm test
npm run verify
npm run check:secrets
npm run check:actions
git diff --check
```

Expected: every command exits 0 and the working tree is clean.

- [ ] **Step 2: Push main**

Push directly to `origin/main` and locate Update Rules by the exact full SHA.

- [ ] **Step 3: Monitor all update stages**

Confirm sing-box installation, Blackmatrix7 commit resolution, all 33 rule downloads, binary compilation, client generation, repository verification, edge generation, current restaging, scanning, and commit behavior.

- [ ] **Step 4: Monitor Pages and public URLs**

Wait for the successful workflow-run Pages deployment. Request the public root and one representative Manifest with HTTP 200.

- [ ] **Step 5: Report residual risk**

Report exact commits and run IDs. The only remaining non-automatable tasks are real-device canary and a real rollback rehearsal.
