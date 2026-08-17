# Resilient sing-box Official Release Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistently failing SagerNet GitHub Releases API dependency with GitHub's official Atom release feed and expanded-assets digest page without weakening version, URL, digest, or binary verification.

**Architecture:** `resolveSingBoxTestingRelease()` reads the official Atom feed and selects the newest semver prerelease by entry timestamp. `releaseAsset()` closes the selected version over one exact download URL and one exact expanded-assets URL, while `digestForReleaseAssetPage()` accepts only a unique asset row containing the expected relative download path and GitHub SHA-256. The installer downloads the archive and integrity page, verifies the digest timing-safely, extracts the binary, and checks its self-reported version.

**Tech Stack:** Node.js 22 ECMAScript modules, built-in `fetch`, `node:test`, GitHub Actions, GitHub Releases Atom/HTML endpoints.

## Global Constraints

- Use only official `github.com/SagerNet/sing-box` release endpoints and assets.
- Select the newest published prerelease/testing entry; stable releases must never win selection.
- Retry only HTTP 429 and 5xx, with delays of 1,000 ms and 2,000 ms, for at most three attempts.
- Never silently replace a failed latest-version lookup with the repository's pinned version constant.
- Require one exact release asset path, one exact filename, one valid lowercase 64-character SHA-256, and one matching installed version.
- Do not modify client routing rules, business groups, generated profiles, Sub-Store tasks, Pages permissions, or public artifacts except for output produced by the existing verified workflow.
- Push directly to `main`, as previously approved; do not create a pull request or dispatch subagents.

---

### Task 1: Lock the Atom and expanded-assets contracts with failing tests

**Files:**
- Modify: `test/actions.test.js`

**Interfaces:**
- Consumes: existing `resolveSingBoxTestingRelease()`, `releaseAsset()`, `digestForReleaseAsset()` and `installSingBoxCore()` exports.
- Produces: tests that require Atom parsing, exact expanded-assets digest parsing, transient retry behavior, and a complete installer fetch sequence.

- [ ] **Step 1: Replace JSON release fixtures with literal Atom fixtures**

Import the renamed digest parser and define hand-written fixtures containing a stable release, an older prerelease, and a newer prerelease:

```js
const releaseFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <updated>2026-08-17T09:47:06Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/SagerNet/sing-box/releases/tag/v1.13.19"/>
  </entry>
  <entry>
    <updated>2026-08-17T09:47:04Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/SagerNet/sing-box/releases/tag/v1.14.0-beta.17"/>
  </entry>
  <entry>
    <updated>2026-08-15T14:02:19Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/SagerNet/sing-box/releases/tag/v1.14.0-beta.15"/>
  </entry>
</feed>`;
```

Assert that selection returns:

```js
{ version: "1.14.0-beta.17", tag: "v1.14.0-beta.17", commit: null }
```

- [ ] **Step 2: Add exact expanded-assets digest behavior**

Use a literal `<li>` containing the exact expected relative href, filename, aria-label, and digest. Assert the parser returns the literal digest. Add independent cases proving that a missing row, duplicate row, wrong release path, and malformed digest throw errors containing `missing`, `duplicate`, `URL`, and `digest` respectively.

- [ ] **Step 3: Update the installer integration fake**

Run `installSingBoxCore()` without an explicit version. The fake fetch must return, in order by URL identity:

- the Atom feed selecting `v1.14.0-beta.17`;
- the generated beta.17 archive;
- the beta.17 expanded-assets HTML containing the archive's real test SHA-256.

Assert the installed path, `sing-box version 1.14.0-beta.17`, `GITHUB_ENV`, and returned release object.

- [ ] **Step 4: Preserve transient retry coverage on the Atom endpoint**

Make the first two Atom responses `{ ok: false, status: 504 }` and the third response return `releaseFeed` through `text()`. Assert three attempts and delays `[1_000, 2_000]`.

- [ ] **Step 5: Run the focused test and verify RED**

Run: `node --test test/actions.test.js`

Expected: FAIL because production still calls the JSON Releases API, expects `json()`, exposes the JSON metadata parser, and requests the old metadata URL.

- [ ] **Step 6: Commit the failing behavior contract**

```bash
git add test/actions.test.js docs/superpowers/plans/2026-08-17-sing-box-official-release-fallback.md
git commit -m "test: require resilient sing-box release discovery"
```

---

### Task 2: Implement official Atom discovery and expanded-assets verification

**Files:**
- Modify: `scripts/install-sing-box-core.mjs`

**Interfaces:**
- Consumes: GitHub Atom text, GitHub expanded-assets HTML, platform and architecture.
- Produces: `resolveSingBoxTestingRelease({ fetchImpl, sleepImpl })`, `releaseAsset(platform, arch, version)`, `digestForReleaseAssetPage(html, asset)`, and `installSingBoxCore(options)`.

- [ ] **Step 1: Generalize the bounded retry helper**

Add an internal `fetchWithRetry(url, init, { fetchImpl, sleepImpl, description })` that retries only 429 and 5xx using `[1_000, 2_000]`, then throws:

```js
new Error(`Failed to download ${description} (${status ?? "no response"})`)
```

Use it for both the release feed and expanded-assets page. Keep the archive download strict and non-retrying unless the existing `download()` behavior already covers it.

- [ ] **Step 2: Parse the official Atom feed**

Change the discovery URL to `https://github.com/SagerNet/sing-box/releases.atom`. Split complete `<entry>...</entry>` blocks, extract only links matching:

```text
https://github.com/SagerNet/sing-box/releases/tag/v<semver-prerelease>
```

Extract a valid ISO `<updated>` timestamp, sort candidates descending by timestamp, and return the newest prerelease. Reject non-string feed bodies and feeds with no valid prerelease.

- [ ] **Step 3: Close each version over its official asset page**

Replace `metadataUrl` with:

```js
integrityUrl: `https://github.com/SagerNet/sing-box/releases/expanded_assets/v${version}`
```

Keep the archive name and download URL unchanged.

- [ ] **Step 4: Parse a unique exact asset row**

Implement `digestForReleaseAssetPage(html, asset)` by examining complete `<li>...</li>` blocks. A matching row must contain both the exact relative release download href and the exact `Copy to clipboard digest for <archiveName>` label. Require exactly one matching row and exactly one valid `value="sha256:<digest>"` attached to that label. Throw distinct missing, duplicate, URL, and digest errors.

- [ ] **Step 5: Integrate HTML integrity verification**

Download the archive and integrity page concurrently. Save the integrity evidence as `sing-box-<version>-release-assets.html`, compute the archive SHA-256, compare timing-safely, then preserve the existing extraction and version-output checks.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `node --test test/actions.test.js`

Expected: all Actions tests pass, including Atom selection, retries, exact digest failures, and installer integration.

- [ ] **Step 7: Commit the implementation**

```bash
git add scripts/install-sing-box-core.mjs
git commit -m "fix: use official sing-box release pages"
```

---

### Task 3: Verify the real upstream path and publish

**Files:**
- Verify all commits and generated effects.
- No additional production files unless a verification failure exposes a defect inside this design.

**Interfaces:**
- Consumes: the live official Atom feed, expanded-assets page, archive, repository verification suite, and GitHub Actions.
- Produces: a verified `main` tip, successful Update Rules run, successful Pages deployment, and public endpoint evidence.

- [ ] **Step 1: Run the installer against the live official endpoints**

Run: `node scripts/install-sing-box-core.mjs --print-path`

Expected: exit 0, stderr reports the Atom-selected latest prerelease version, and stdout prints an absolute verified core path.

- [ ] **Step 2: Run local verification**

Run, in order:

```bash
node --test test/actions.test.js
npm test
npm run verify
npm run check:secrets
npm run check:actions
git diff --check
```

Expected: every command exits 0. Inspect `git status --short --branch` and the commit range to confirm there are no unstaged or unrelated changes.

- [ ] **Step 3: Push directly to main**

Run: `git push origin main`

Expected: `origin/main` advances from the failed retry-only commit through the design, test, and implementation commits.

- [ ] **Step 4: Monitor Update Rules to completion**

Resolve the new run by exact head SHA. Confirm `Install verified official sing-box core` succeeds, then monitor every later build-edge and promotion step. If it fails, retrieve the exact failed logs before proposing another change.

- [ ] **Step 5: Monitor and verify Pages**

Confirm the successful Update Rules workflow triggers Deploy Pages, wait for a successful deployment conclusion, and request the public site root plus a representative generated manifest with an HTTP success response.

- [ ] **Step 6: Report residual manual work**

State the exact commits, local verification counts, workflow run IDs, and public endpoint result. Keep real-device canary and a real rollback rehearsal marked as the only human-only checks.
