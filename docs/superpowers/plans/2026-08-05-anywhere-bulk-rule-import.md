# Anywhere 一键导入全部规则 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one stable `anywhere://add-rule-set` deep link to the Pages import page that passes all current `.arrs` shard URLs at once, while retaining the existing three safe batch links.

**Architecture:** Keep the existing `.arrs` shard and manifest model unchanged. Add a validated all-links deep-link builder beside the existing bounded batch builder; render one total-import anchor before the batch anchors, and keep the manual HTTPS list as the final fallback. Regenerate only the derived import-page/public artifacts and update the Anywhere instructions to distinguish this shortcut from a single `.arrs` subscription URL.

**Tech Stack:** JavaScript ES modules, Node.js built-in test runner, generated static HTML, GitHub Pages artifacts.

## Global Constraints

- Do not modify the Anywhere App source, Sub-Store parameters, rule contents, rule assignments, or the 1,800-character batch behavior.
- The total deep link must contain every current manifest shard exactly once, in manifest order, as encoded `link` query parameters.
- The generated page must remain static HTML with no `<script>`, `javascript:` URL, or inline event handler.
- Preserve the existing three batch links and 34 manual HTTPS shard links as compatibility fallbacks.
- The total link is an import shortcut, not a `.arrs` subscription URL; after import, each rule set remains independently refreshable and locally assignable.
- Use `apply_patch` for source, test, documentation, and plan/spec edits; use the existing generators for derived artifacts.

---

## File Map

- Modify `clients/anywhere/src/build-import-page.js`: expose a validated all-links deep-link builder and render the total-import anchor.
- Modify `clients/anywhere/test/import-page.test.js`: test all-link URL parsing, validation, generated-page counts, and unchanged batch behavior.
- Modify `clients/anywhere/README.md`: document the total deep link and the batch fallback.
- Modify `clients/anywhere/docs/deployment.md`: make the total-import shortcut the first path and explain the subscription distinction and fallback.
- Regenerate `clients/anywhere/examples/import.html`: tracked static import page.
- Regenerate `public/current/anywhere/import.html` and the corresponding immutable public version through the existing publishing generator.
- Create `docs/superpowers/plans/2026-08-05-anywhere-bulk-rule-import.md`: this implementation plan.

## Task 1: Add failing tests for the total deep link

**Files:**
- Modify: `clients/anywhere/test/import-page.test.js`
- Test: `clients/anywhere/test/import-page.test.js`

**Interfaces:**
- Consumes: the existing `urls(count)`, `buildImportBatches`, and `renderImportPage` test fixtures.
- Produces: tests defining `buildImportDeepLink(urls)` as a named export and the generated page contract.

- [ ] **Step 1: Add the import for the new builder and its parser test**

Update the import to include `buildImportDeepLink`, then add a test that builds a link from `urls(34)`, parses it with `new URL`, and asserts:

```js
const link = buildImportDeepLink(input);
const parsed = new URL(link);
assert.equal(parsed.protocol, "anywhere:");
assert.equal(parsed.host, "add-rule-set");
assert.deepEqual(parsed.searchParams.getAll("link"), input);
assert.equal(new Set(parsed.searchParams.getAll("link")).size, input.length);
```

Also assert the link starts with `anywhere://add-rule-set?link=https%3A%2F%2F` and contains one encoded `link=` parameter per input URL.

- [ ] **Step 2: Add validation assertions for the new builder**

Extend the invalid-link test so `buildImportDeepLink` rejects an insecure URL, a query-bearing URL, a non-`.arrs` URL, a duplicate URL, and an empty array. Keep the existing `buildImportBatches` assertions unchanged so the 1,800-character batching contract remains explicit.

- [ ] **Step 3: Add the rendered-page assertions before implementation**

In the tracked-page test, assert that the rendered page contains the text `全部导入`, exactly four `.button` anchors (one total link plus three batches), exactly 34 manual HTTPS links, and no script or executable URL. Add a fixture assertion that the total link's parsed `link` values equal the manifest shard URLs in order.

- [ ] **Step 4: Run the focused tests and confirm they fail for the missing export/page**

Run:

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test clients/anywhere/test/import-page.test.js
```

Expected: FAIL because `buildImportDeepLink` is not exported and the tracked import page has no total-import anchor. Do not change implementation in this step.

- [ ] **Step 5: Commit the failing-test checkpoint**

```bash
git add clients/anywhere/test/import-page.test.js
git commit -m "test: specify Anywhere bulk rule import link"
```

## Task 2: Implement the validated total deep link and page rendering

**Files:**
- Modify: `clients/anywhere/src/build-import-page.js`
- Test: `clients/anywhere/test/import-page.test.js`

**Interfaces:**
- Consumes: canonical HTTPS `.arrs` URLs from the manifest.
- Produces: `buildImportDeepLink(urls): string` and a `renderImportPage` output with one total-import anchor followed by the existing batch anchors.

- [ ] **Step 1: Extract shared URL normalization without changing batch semantics**

Add a private `normalizeRuleUrls(urls)` helper that checks for a non-empty array, calls the existing `validateRuleUrl` for each item, and rejects duplicates. Use it from both `buildImportDeepLink` and `buildImportBatches`; leave the batch `maxLength` range and split algorithm unchanged.

- [ ] **Step 2: Implement the all-links builder**

Export:

```js
export function buildImportDeepLink(urls) {
  return deepLink(normalizeRuleUrls(urls));
}
```

The internal `deepLink` function must continue to encode each URL exactly once with `encodeURIComponent` and join repeated `link=` query parameters in input order. It must not apply the 1,800-character batch limit.

- [ ] **Step 3: Render the total-import anchor from the closed manifest URL set**

In `renderImportPage`, derive `allDeepLink` from `expectedUrls` after checking that batches close over the manifest. Render one anchor before the batch list:

```html
<h2>一键导入全部规则</h2>
<p>一次打开 Anywhere 的确认页，导入全部 34 个规则分片；导入后仍是独立规则集。</p>
<p><a class="button" href="anywhere://add-rule-set?...">全部导入 34 个规则分片</a></p>
<p>如果系统未能打开总链接，请按下面的 3 个批次导入。</p>
```

Escape the generated deep link through the existing `escapeHtml` path. Keep the current batch headings, manual links, warning, manifest metadata, and no-script CSP unchanged.

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run:

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test clients/anywhere/test/import-page.test.js
```

Expected: PASS, including the 34-link parser round trip, validation checks, unchanged 3-batch lengths, and static-page checks.

- [ ] **Step 5: Commit the implementation checkpoint**

```bash
git add clients/anywhere/src/build-import-page.js clients/anywhere/test/import-page.test.js
git commit -m "feat: add Anywhere bulk rule import deep link"
```

## Task 3: Regenerate tracked artifacts and update user instructions

**Files:**
- Modify: `clients/anywhere/examples/import.html`
- Modify: `clients/anywhere/README.md`
- Modify: `clients/anywhere/docs/deployment.md`
- Regenerate: `public/current/anywhere/import.html` and its immutable public version through the existing generator.

**Interfaces:**
- Consumes: the implemented `renderImportPage`, the pinned rule manifest, and the current publishing workflow.
- Produces: a public import page with one total link, three batch fallbacks, and documentation that accurately describes both paths.

- [ ] **Step 1: Update the Anywhere README instructions**

Change the import-page description from “34 shards in 3 batches” to “one total deep link plus 3 fallback batches.” State that the total link opens Anywhere’s confirmation screen and does not create one aggregate `.arrs` subscription; all imported rule sets remain independently refreshable.

- [ ] **Step 2: Update the deployment sequence**

In `clients/anywhere/docs/deployment.md`, make the total link the first instruction, retain the three batch links as fallback, and preserve the requirement to verify all 34 rule sets and their local assignments. Explicitly say not to paste the `anywhere://` deep link into the `.arrs` subscription field.

- [ ] **Step 3: Regenerate the tracked example page**

Run:

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node clients/anywhere/scripts/render-rules.mjs
```

Expected: `clients/anywhere/examples/import.html` gains one total-import anchor while rule file content and manifest counts remain unchanged. Inspect `git diff --stat` and `git diff -- clients/anywhere/examples/rules` to ensure no rule content changed.

- [ ] **Step 4: Regenerate the public current/version artifacts**

Run the repository’s pinned public snapshot generator using the approved command:

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/update-rules.mjs
```

Expected: the public import page is regenerated with the same total deep link and the rule snapshot remains internally consistent. If the generator reports the public tree is current except for the import page, keep only the generated import-page/version manifest changes required by the generator; do not hand-edit generated manifests.

- [ ] **Step 5: Commit generated artifacts and documentation**

```bash
git add clients/anywhere/examples/import.html clients/anywhere/README.md clients/anywhere/docs/deployment.md public
git commit -m "docs: publish Anywhere bulk rule import shortcut"
```

## Task 4: Verify the complete change

**Files:**
- Read: `clients/anywhere/examples/import.html`
- Read: `public/current/anywhere/import.html`
- Test: `clients/anywhere/test/*.test.js`, `test/*.test.js`, `automation/test/*.test.js`

**Interfaces:**
- Consumes: all source and generated changes from Tasks 1–3.
- Produces: fresh evidence that the total link is complete, the repository is clean, and all tests pass.

- [ ] **Step 1: Inspect the generated total link structurally**

Use the bundled Node runtime to parse the generated page and assert the first `anywhere://add-rule-set` anchor contains 34 `link` query parameters, all equal to the current manifest shard URLs in order. Assert the page has four `.button` anchors and 34 manual HTTPS links.

- [ ] **Step 2: Run Anywhere tests**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test clients/anywhere/test/*.test.js
```

Expected: all Anywhere tests pass.

- [ ] **Step 3: Run shared and automation tests**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test test/*.test.js automation/test/*.test.js
```

Expected: all shared and automation tests pass.

- [ ] **Step 4: Run repository verification and pinned public snapshot check**

```bash
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/verify.mjs
/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/update-rules.mjs --check
```

Expected: both commands exit 0, generated output is deterministic, and the public snapshot is verified.

- [ ] **Step 5: Confirm clean scope and commit history**

```bash
git status --short --branch
git diff origin/main...HEAD --stat
git log --oneline --decorate --max-count=6
```

Expected: no unstaged changes; the diff contains only the design/plan records, import-link source/tests/docs, and generated import-page/public artifacts.

## Task 5: Publish the feature

**Files:**
- Modify: Git branch and GitHub PR only; no additional source files.

**Interfaces:**
- Consumes: verified local commits from Tasks 1–4.
- Produces: a GitHub PR merged into `main`, followed by a successful Pages deployment.

- [ ] **Step 1: Push the feature branch**

Create/use a dedicated branch based on the current feature branch with the design and implementation commits, then push it to `origin`:

```bash
git push -u origin agent/anywhere-bulk-rule-import
```

- [ ] **Step 2: Open or update the GitHub PR**

Use the GitHub connector to create a PR targeting `main` with title `feat: add Anywhere bulk rule import link`, and include the source-code constraint and fallback behavior in the body. Do not force-push or overwrite unrelated branches.

- [ ] **Step 3: Merge after verification**

Merge the PR with the expected head SHA only after the local verification evidence is fresh. Confirm `origin/main` points to the merge commit.

- [ ] **Step 4: Verify Pages deployment and public output**

Check the GitHub Actions `Deploy Pages` run for the merge commit. After it succeeds, fetch `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html` and verify it contains the total link with 34 encoded `link` parameters and the same manifest hash as the published `current/manifest.json`.
