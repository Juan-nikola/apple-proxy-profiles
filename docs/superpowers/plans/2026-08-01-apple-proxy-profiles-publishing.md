# Rule Automation, Pages, Documentation, and GitHub Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one atomic Blackmatrix7 snapshot into verified Shadowrocket, Egern, and Anywhere artifacts, publish versioned and rollback-safe GitHub Pages content, document deployment, and create the public `Juan-nikola/apple-proxy-profiles` repository.

**Architecture:** Resolve the current Blackmatrix7 default branch to one immutable commit, fetch every approved source by that commit, parse all rules into the shared model, and fan out through client renderers. A deterministic manifest hashes every artifact. GitHub Actions updates public content daily and a separate least-privilege workflow deploys Pages only after the repository verification gate passes.

**Tech Stack:** Node.js 22+, ESM JavaScript, `node:test`, native `fetch`, SHA-256, GitHub Actions pinned by commit SHA, GitHub Pages.

## Global Constraints

- Complete the foundation, Shadowrocket, Egern, and Anywhere plans first.
- Fetch all Blackmatrix7 inputs from one resolved commit; never mix `master` files fetched at different times.
- Build the complete approved catalog: Hijacking, BlockHttpDNS, Advertising, Privacy, every listed app/service, `ChinaMax_Domain`, and `ChinaMax`.
- Never publish a node subscription URL, endpoint, credential, UUID, key, certificate, or node-derived value.
- Publish `current/`, preserve the immediately preceding successful snapshot at `previous/`, and retain immutable content-addressed snapshots under `versions/`.
- Make `current/` replacement atomic inside the build staging directory; never partially overwrite a live tree.
- Pin every third-party GitHub Action to a full 40-character commit SHA.
- Preserve Blackmatrix7 GPL-2.0 attribution, upstream commit, source path, conversion note, and file hashes.
- Do not create or push the GitHub repository until the full local verification and secret gates pass.

---

## Target File Structure

```text
automation/src/{resolve-upstream,source-catalog,fetch-snapshot,parse-surge}.js
automation/src/{render-shadowrocket-rules,render-egern-rules,build-artifacts}.js
automation/src/{manifest,build-site,semantic-evaluator}.js
automation/test/*.test.js
automation/fixtures/upstream/*
scripts/{update-rules,check-actions}.mjs
public/{index.html,manifest.json,current,previous,versions}
docs/{deployment,maintenance,release,security}.md
.github/workflows/{update-rules,deploy-pages}.yml
README.md
LICENSE
THIRD_PARTY_NOTICES.md
SECURITY.md
```

### Task 1: Make the Approved Rule Catalog Immutable Per Run

**Files:**
- Modify: `shared/rules/catalog.js`
- Create: `automation/src/source-catalog.js`
- Create: `automation/src/resolve-upstream.js`
- Create: `automation/test/source-catalog.test.js`
- Create: `automation/test/resolve-upstream.test.js`

**Interfaces:**
- Produces: `BLACKMATRIX_REPOSITORY = "blackmatrix7/ios_rule_script"`.
- Produces: `PUBLISH_SOURCE_CATALOG`, records shaped `{ id, canonicalPath, inputFormat, policy, priority, minEntries }`.
- Produces: `resolveUpstreamCommit(fetchImpl): Promise<{ sha, committedAt }>`.
- The resolver calls the GitHub commits API for the repository default branch and accepts only a 40-character lowercase hexadecimal SHA and an ISO-8601 commit time.

- [ ] **Step 1: Write failing catalog-completeness tests**

Assert exact ordered IDs:

```js
const EXPECTED_IDS = [
  "Hijacking", "BlockHttpDNS", "Advertising", "Privacy",
  "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot",
  "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
  "Apple", "Microsoft", "SteamCN", "ChinaMax_Domain", "Game",
  "Download", "PrivateTracker", "ChinaMax",
];
assert.deepEqual(PUBLISH_SOURCE_CATALOG.map(({ id }) => id), EXPECTED_IDS);
assert.equal(new Set(PUBLISH_SOURCE_CATALOG.map(({ canonicalPath }) => canonicalPath)).size, EXPECTED_IDS.length);
```

Also assert `AdvertisingLite` is absent, every path is relative and traversal-free, and `ChinaMax_Domain` precedes `ChinaMax`.

- [ ] **Step 2: Run and verify failure**

Run: `node --test automation/test/source-catalog.test.js automation/test/resolve-upstream.test.js`

Expected: FAIL because the automation modules do not exist.

- [ ] **Step 3: Define exact canonical source paths**

Use Blackmatrix7 Surge paths beneath `rule/Surge/`. Standard records use `rule/Surge/${id}/${id}.list`; `ChinaMax_Domain` uses `rule/Surge/ChinaMax/ChinaMax_Domain.list`. Store explicit paths in source control rather than deriving them at fetch time. Re-export shared policy and priority assignments instead of duplicating them.

- [ ] **Step 4: Implement the immutable commit resolver**

Request `https://api.github.com/repos/blackmatrix7/ios_rule_script/commits/master` with `Accept: application/vnd.github+json`. Fail on non-2xx, missing commit date, malformed JSON, a non-40-character SHA, or a future commit timestamp. Do not print response bodies.

- [ ] **Step 5: Run and commit**

```bash
node --test automation/test/source-catalog.test.js automation/test/resolve-upstream.test.js
git add shared/rules/catalog.js automation/src/source-catalog.js automation/src/resolve-upstream.js automation/test
git commit -m "feat: pin complete upstream rule catalog"
```

### Task 2: Fetch and Parse One Canonical Snapshot

**Files:**
- Create: `automation/src/fetch-snapshot.js`
- Create: `automation/src/parse-surge.js`
- Create: `automation/fixtures/upstream/representative.list`
- Create: `automation/test/fetch-snapshot.test.js`
- Create: `automation/test/parse-surge.test.js`

**Interfaces:**
- Produces: `fetchSnapshot({ commit, catalog, fetchImpl }): Promise<Map<string, { text, rawUrl, etag }>>`.
- Produces: `parseSurgeRules(text, sourceId): { entries: RuleEntry[], diagnostics: { comments, blank, unsupported } }`.
- Raw URLs are `https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/${commit}/${canonicalPath}`.

- [ ] **Step 1: Write failing fetch safety tests**

Assert all requests contain the same provided commit, redirects away from `raw.githubusercontent.com` fail, content larger than 64 MiB per source fails, a missing source fails the whole snapshot, and thrown errors contain the source ID and status only.

- [ ] **Step 2: Write failing parser matrix tests**

Cover `DOMAIN`, `DOMAIN-SUFFIX`, `DOMAIN-KEYWORD`, `IP-CIDR`, `IP-CIDR6`, `GEOIP`, `IP-ASN`, `URL-REGEX`, `USER-AGENT`, and `PROCESS-NAME`, including optional `no-resolve`. Comments and blank lines are counted. Unknown syntactically valid types become `unsupported` entries; malformed known rules throw with line number and source ID but not the rule value.

- [ ] **Step 3: Run and verify failure**

Run: `node --test automation/test/fetch-snapshot.test.js automation/test/parse-surge.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement bounded fetching and parsing**

Use native `fetch` with `redirect: "manual"`, a 30-second `AbortSignal.timeout`, and a streaming byte counter. Normalize LF endings before parsing. Pass parsed entries through `normalizeRuleEntry`; keep unknown kinds for client-specific diagnostics rather than silently discarding them.

- [ ] **Step 5: Run and commit**

```bash
node --test automation/test/fetch-snapshot.test.js automation/test/parse-surge.test.js test/rule-model.test.js
git add automation/src/fetch-snapshot.js automation/src/parse-surge.js automation/fixtures automation/test
git commit -m "feat: fetch and parse atomic rule snapshots"
```

### Task 3: Render Client-Native Public Rule Files

**Files:**
- Create: `automation/src/render-shadowrocket-rules.js`
- Create: `automation/src/render-egern-rules.js`
- Create: `automation/src/build-artifacts.js`
- Create: `automation/test/render-shadowrocket-rules.test.js`
- Create: `automation/test/render-egern-rules.test.js`
- Create: `automation/test/build-artifacts.test.js`
- Modify: `clients/anywhere/src/compile-priority.js`
- Modify: `clients/anywhere/src/shard-rules.js`

**Interfaces:**
- Produces: `renderShadowrocketRuleSet(source): { path, content, counts }`.
- Produces: `renderEgernRuleSet(source): { path, content, counts }`.
- Produces: `buildClientArtifacts(snapshot, provenance): { files: Map<string,string>, diagnostics }`.
- Shadowrocket paths: `shadowrocket/rules/${id}.list`.
- Egern paths: `egern/rules/${id}.yaml`.
- Anywhere paths: `anywhere/rules/${id-or-shard}.arrs`.

- [ ] **Step 1: Write failing native-renderer tests**

Assert Shadowrocket preserves supported Surge rule syntax and source order. Assert Egern emits deterministic YAML arrays for `domain_set`, `domain_suffix_set`, `domain_keyword_set`, `ip_cidr_set`, `ip_cidr6_set`, `asn_set`, `url_regex_set`, and `user_agent_set`; it records unsupported `PROCESS-NAME` and `GEOIP` counts without values. Assert all outputs contain GPL provenance comments and end with LF.

- [ ] **Step 2: Write a failing complete fan-out test**

For every catalog record, require one Shadowrocket artifact, one Egern artifact, and at least one Anywhere artifact. Assert Anywhere compilation is performed across the ordered catalog before sharding, all shard counts remain at or below 95,000, and any unresolved conflict fails the entire build.

- [ ] **Step 3: Run and verify failure**

```bash
node --test automation/test/render-shadowrocket-rules.test.js automation/test/render-egern-rules.test.js automation/test/build-artifacts.test.js
```

Expected: FAIL because the automation renderers do not exist.

- [ ] **Step 4: Implement native conversion without policy widening**

Shadowrocket may preserve exact domains. Egern maps only supported typed arrays. Anywhere omits exact domains and all unrepresentable kinds with explicit count diagnostics; it must never turn an exact domain into a suffix or keyword. Treat a zero-entry output for a required source, a count below its catalog minimum, or an unsupported kind not listed in the checked-in per-client baseline as a release-blocking failure. Exact-domain omissions for Anywhere and `PROCESS-NAME`/`GEOIP` omissions for Egern are approved baseline diagnostics with count-change bounds, not silent successes.

- [ ] **Step 5: Run and commit**

```bash
node --test automation/test clients/anywhere/test/priority.test.js clients/anywhere/test/sharding.test.js
git add automation/src automation/test clients/anywhere/src
git commit -m "feat: render shared rules for three clients"
```

### Task 4: Prove Cross-Client Policy Semantics

**Files:**
- Create: `automation/src/semantic-evaluator.js`
- Create: `automation/fixtures/semantic-corpus.json`
- Create: `automation/test/semantic-equivalence.test.js`

**Interfaces:**
- Produces: `evaluateOrderedPolicy(ruleSets, subject): string`.
- Produces: `evaluateAnywherePolicy(compiledRuleSets, subject): string`.
- Corpus records: `{ description, subject: { domain, ip }, expectedPolicy, clients }`.

- [ ] **Step 1: Write the semantic corpus and failing test**

Include advertising rejection, hijacking rejection, AI routing, independent services, China direct, LAN direct, private tracker direct, download direct, game proxy, generic foreign proxy, suffix specificity, keyword overlap, IPv4 containment, and IPv6 containment. For representable inputs, require all three clients to return the same expected policy. Mark exact-domain cases as Shadowrocket/Egern only and assert Anywhere diagnostics record the deliberate omission.

- [ ] **Step 2: Run and verify failure**

Run: `node --test automation/test/semantic-equivalence.test.js`

Expected: FAIL because the semantic evaluator does not exist.

- [ ] **Step 3: Implement independent evaluators**

The ordered evaluator models source order and first match. The Anywhere evaluator models its typed-set specificity plus compiled duplicate removal. Do not call one evaluator from the other. Return `FINAL` only after checking every supplied rule set.

- [ ] **Step 4: Run and commit**

```bash
node --test automation/test/semantic-equivalence.test.js clients/anywhere/test/priority.test.js
git add automation/src/semantic-evaluator.js automation/fixtures/semantic-corpus.json automation/test/semantic-equivalence.test.js
git commit -m "test: verify cross-client routing semantics"
```

### Task 5: Build Deterministic Current, Previous, and Versioned Pages Trees

**Files:**
- Create: `automation/src/manifest.js`
- Create: `automation/src/build-site.js`
- Create: `automation/test/manifest.test.js`
- Create: `automation/test/build-site.test.js`
- Create: `scripts/update-rules.mjs`
- Create during build: `public/`
- Modify: `package.json`
- Modify: `scripts/verify.mjs`

**Interfaces:**
- Produces: `createManifest({ upstream, files, diagnostics }): object`.
- Produces: `manifestHash(manifest): string` from canonical JSON without the `manifestHash` field.
- Produces: `buildSite({ priorPublicDir, stagingDir, artifacts, manifest }): Promise<void>`.
- Root scripts: `update:rules`, `check:rules`, and `verify:publishing`.

- [ ] **Step 1: Write failing determinism and rollback tests**

Assert byte-identical inputs and the same upstream commit timestamp produce the same manifest and artifact hashes on repeated runs. Assert `current/` contains the new snapshot, `previous/` exactly contains the former `current/`, and `versions/${manifestHash}/` is immutable. On the first build, copy the first verified version to both `current/` and `previous/` so both stable URLs exist. If an existing version has different bytes, fail. Assert an interrupted staging build leaves the original public tree untouched.

- [ ] **Step 2: Run and verify failure**

Run: `node --test automation/test/manifest.test.js automation/test/build-site.test.js`

Expected: FAIL because site building is absent.

- [ ] **Step 3: Implement canonical manifests**

Sort object keys recursively, sort file records by path, and use SHA-256 lowercase hex. Record schema version, upstream repository, commit, commit timestamp, generator version, per-client source counts, unsupported counts, each file path/hash/entry count, GPL license, and conversion notice. Never use the wall clock in generated artifacts.

- [ ] **Step 4: Implement staged tree replacement**

Build into a sibling temporary directory created with `mkdtemp`. Copy the prior `current/` to new `previous/`, write the new version once, copy that version to new `current/`, then rename the completed staging tree into place with a recoverable backup rename. Restore the backup if final rename fails. Keep every version directory; Git history remains the secondary recovery path.

- [ ] **Step 5: Add online update and offline reproducibility modes**

`node scripts/update-rules.mjs` resolves and fetches upstream. Unit tests may call the internal builder with `commit=d0e4aafc8728e2b5e2a179b0922d8c09ad932024` and `fixtureDir=automation/fixtures/upstream`, but the CLI must reject `--fixture-dir` when its output target is tracked `public/`. `npm run check:rules` reads the commit from tracked `public/manifest.json`, refetches that immutable commit into a temporary directory, and byte-compares the rebuild with tracked `public/`; it never resolves `master` during the comparison.

Set root scripts exactly as follows and add `npm run verify:publishing` to `scripts/verify.mjs` after workspace fixtures and before the secret scan:

```json
{
  "update:rules": "node scripts/update-rules.mjs",
  "check:rules": "node scripts/update-rules.mjs --check",
  "verify:publishing": "node --test automation/test"
}
```

- [ ] **Step 6: Run and commit**

```bash
node --test automation/test/manifest.test.js automation/test/build-site.test.js
npm run update:rules
npm run check:rules
npm run check:secrets
git add package.json package-lock.json scripts/verify.mjs automation scripts/update-rules.mjs public
git commit -m "feat: build versioned public rule site"
```

### Task 6: Point Profiles at the Atomic Pages Snapshot

**Files:**
- Modify: `shared/rules/catalog.js`
- Modify: `clients/shadowrocket/src/render-rules.js`
- Modify: `clients/egern/src/render-profile.js`
- Modify: `clients/anywhere/src/build-import-page.js`
- Modify: profile and import-page fixtures
- Create: `automation/test/public-urls.test.js`

**Interfaces:**
- Produces: `publicRuleUrl(client, sourceId, manifest, shardId): string`.
- Base URL: `https://juan-nikola.github.io/apple-proxy-profiles/current/`.

- [ ] **Step 1: Write failing URL-closure tests**

Parse every generated profile and import page URL. Require HTTPS, the expected Pages authority, a path present in the current manifest, no query or fragment, and no reference to `raw.githubusercontent.com`. Assert the public tree contains no private node-subscription URL.

- [ ] **Step 2: Run and verify failure**

Run: `node --test automation/test/public-urls.test.js`

Expected: FAIL because profiles still reference upstream URLs.

- [ ] **Step 3: Switch all public rule references together**

Shadowrocket uses `current/shadowrocket/rules/${id}.list`; Egern uses `current/egern/rules/${id}.yaml`; Anywhere import batches use the exact shard paths from the current manifest. Keep private node URLs as runtime Sub-Store arguments and never place them in fixtures.

- [ ] **Step 4: Regenerate, verify, and commit**

```bash
npm run fixtures
node --test automation/test/public-urls.test.js
npm run verify
npm run check:rules
git add shared clients automation/test public
git commit -m "feat: use atomic Pages rule snapshots"
```

### Task 7: Pin and Test Daily Update and Pages Workflows

**Files:**
- Create: `.github/workflows/update-rules.yml`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `scripts/check-actions.mjs`
- Create: `test/actions.test.js`
- Modify: `package.json`

**Interfaces:**
- `update-rules.yml`: daily schedule plus `workflow_dispatch`, `contents: write`, one update job.
- `deploy-pages.yml`: push to `main` for `public/**` plus `workflow_dispatch`, `pages: write`, `id-token: write`, one build job and one environment-protected deploy job.

- [ ] **Step 1: Write failing workflow security tests**

Assert every `uses:` value ends with `@[0-9a-f]{40}`, no `pull_request_target`, no artifact includes `.git` or the repository root, the update workflow has no Pages permissions, and the deploy workflow has no contents-write permission.

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/actions.test.js`

Expected: FAIL because workflows do not exist.

- [ ] **Step 3: Implement the update workflow with exact pins**

Use:

```yaml
actions/checkout@11d5960a326750d5838078e36cf38b85af677262
actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
```

Set Node 22, run `npm ci`, `npm run update:rules`, `npm run verify`, `npm run check:rules`, and `npm run check:secrets`. Commit only `public/` when it changes using `github-actions[bot]`; push to the checked-out `main` branch. Set concurrency group `rule-update-main` with cancellation disabled.

- [ ] **Step 4: Implement the Pages workflow with exact pins**

In addition to checkout and setup-node above, use:

```yaml
actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b
actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa
actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e
```

The build job runs `npm ci`, `npm run verify`, `npm run check:rules`, and uploads only `public/`. The deploy job uses environment `github-pages`. Set concurrency group `pages` with cancellation disabled.

- [ ] **Step 5: Run and commit**

```bash
node --test test/actions.test.js
node scripts/check-actions.mjs
npm run verify
git add .github scripts/check-actions.mjs test/actions.test.js package.json
git commit -m "ci: automate rule updates and Pages deployment"
```

### Task 8: Add Complete Deployment, Maintenance, Security, and License Documentation

**Files:**
- Modify: `README.md`
- Create: `docs/deployment.md`
- Create: `docs/maintenance.md`
- Create: `docs/release.md`
- Create: `docs/security.md`
- Create: `SECURITY.md`
- Create: `LICENSE`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `test/root-docs.test.js`

**Interfaces:**
- Produces: one root entry point for all three clients, exact canary order, rollback paths, and the public/private boundary.

- [ ] **Step 1: Write failing documentation and license tests**

Assert the root README links Shadowrocket, Egern, Anywhere, current manifest, previous snapshot, version snapshots, and device canary guides. Assert deployment says Intel Mac Egern → iPhone Egern → iPad Egern → iPhone Anywhere → iPad Anywhere. Assert `LICENSE` contains the unmodified GNU GPL version 2 text and `THIRD_PARTY_NOTICES.md` names Blackmatrix7, its repository, source commit field, GPL-2.0, and modification/conversion notice.

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/root-docs.test.js`

Expected: FAIL because the root documentation is incomplete.

- [ ] **Step 3: Write operational documentation**

Document Sub-Store private output creation and six-hour refresh, platform defaults, stable-versus-beta support, rule diagnostics, manual Anywhere bindings, Pages rollback by switching `current` to `previous` or a manifest hash, scheduled-update recovery, source-contract revalidation, and the prohibition on issue reports containing private subscriptions or nodes.

- [ ] **Step 4: Run and commit**

```bash
node --test test/root-docs.test.js clients/egern/test/docs.test.js clients/anywhere/test/docs.test.js
npm run check:secrets
git add README.md docs SECURITY.md LICENSE THIRD_PARTY_NOTICES.md test/root-docs.test.js
git commit -m "docs: complete deployment and licensing guides"
```

### Task 9: Run the Release Gate and Publish to GitHub

**Files:**
- Modify: `docs/implementation-status.md`
- No other source changes are allowed after the release gate begins.

**Interfaces:**
- Produces: public repository `https://github.com/Juan-nikola/apple-proxy-profiles`.
- Produces: Pages site `https://juan-nikola.github.io/apple-proxy-profiles/`.

- [ ] **Step 1: Run the complete clean-room gate**

```bash
npm ci
npm run verify
npm run check:rules
npm run check:secrets
node scripts/check-actions.mjs
git diff --check
git status --short
```

Expected: every command passes and status prints nothing.

- [ ] **Step 2: Verify public content cannot contain private data**

Run the scanner directly against every tracked public artifact and generated client example. Review diagnostics to confirm they contain counts only. Search for URL authorities and require only Blackmatrix7, GitHub API/raw during automation source code, and the project Pages authority in tracked public output.

- [ ] **Step 3: Create and push the repository using the GitHub publication skill**

Invoke `github:yeet`. Confirm scope is branch `main`, repository owner is `Juan-nikola`, repository name is `apple-proxy-profiles`, and visibility is Public. If the repository does not exist, create it through the connected GitHub app; do not initialize it remotely. Add the returned HTTPS remote as `origin`, push the complete local `main` history, and create a draft pull request only if publication must use a non-default branch. For a new empty repository, push `main` directly because there is nothing to review remotely.

- [ ] **Step 4: Enable and verify GitHub Pages through Actions**

Set Pages source to GitHub Actions in repository settings. Manually dispatch `deploy-pages.yml`, wait for both jobs, then verify HTTP 200 for `/`, `/manifest.json`, one rule file for each client, and the Anywhere import page. Compare downloaded hashes to `public/manifest.json`.

- [ ] **Step 5: Perform the user-assisted device canary in exact order**

Follow the checked-in canary guides: Intel Mac Egern, iPhone Egern, iPad Egern, iPhone Anywhere, then iPad Anywhere. At every stage verify DNS, IPv6, QUIC behavior, AI independence, China direct, foreign proxy, advertising reject, game/P2P behavior, and rollback. Stop on the first mismatch and keep remaining devices on the old configuration.

- [ ] **Step 6: Record the milestone only after repository, Pages, and canary results are known**

Update `docs/implementation-status.md` with the final commit, verification command, repository URL, Pages manifest hash, and per-device canary result. Commit and push the ledger only after all required results pass.
