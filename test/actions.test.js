import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTION_PINS,
  checkActions,
  checkPublicPagesTree,
  PUBLIC_PAGES_LIMITS,
  validateWorkflowText,
} from "../scripts/check-actions.mjs";

const repositoryRoot = new URL("../", import.meta.url);
const updateWorkflow = new URL("../.github/workflows/update-rules.yml", import.meta.url);
const deployWorkflow = new URL("../.github/workflows/deploy-pages.yml", import.meta.url);

async function workflowText(url) {
  return readFile(url, "utf8");
}

test("all Actions use the approved immutable SHA pins", async () => {
  const result = await checkActions(repositoryRoot);
  assert.equal(result.workflowCount, 2);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(ACTION_PINS, {
    "actions/checkout": "3d3c42e5aac5ba805825da76410c181273ba90b1",
    "actions/setup-node": "820762786026740c76f36085b0efc47a31fe5020",
    "actions/configure-pages": "45bfe0192ca1faeb007ade9deae92b16b8254a0d",
    "actions/upload-pages-artifact": "fc324d3547104276b827a68afc52ff2a11cc49c9",
    "actions/deploy-pages": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
  });
});

test("update workflow is daily/manual, verifies output, and commits only public", async () => {
  const text = await workflowText(updateWorkflow);
  assert.match(text, /^\s*schedule:\s*$/mu);
  assert.match(text, /^\s*workflow_dispatch:\s*$/mu);
  assert.match(text, /^\s*contents:\s*write\s*$/mu);
  assert.match(text, /github\.event_name == 'schedule' \|\| github\.ref == 'refs\/heads\/main'/u);
  assert.doesNotMatch(text, /^\s*(?:pages|id-token):\s*/mu);
  for (const command of [
    "npm ci",
    "npm run update:rules",
    "npm run verify",
    "npm run check:rules",
    "npm run check:secrets",
  ]) assert.ok(text.includes(command), command);
  const verifyAt = text.indexOf("run: npm run verify");
  const cleanGeneratorsAt = text.indexOf("run: git diff --exit-code -- . \":(exclude)public/**\"");
  const updateAt = text.indexOf("run: npm run update:rules");
  const checkRulesAt = text.indexOf("run: npm run check:rules");
  const checkSecretsAt = text.indexOf("run: npm run check:secrets");
  assert.ok(verifyAt < cleanGeneratorsAt, "verify precedes the clean-generator gate");
  assert.ok(cleanGeneratorsAt < updateAt, "only committed generator bytes feed the public update");
  assert.ok(updateAt < checkRulesAt, "updated public content is reproducibility-checked");
  assert.ok(checkRulesAt < checkSecretsAt, "reproducible public content is scanned last");
  assert.match(text, /git add -- public/u);
  assert.match(text, /git push origin main/u);
  assert.doesNotMatch(text, /git add\s+(?:-A|\.|--all)/u);
  assert.match(text, /group:\s*rule-update-main/u);
  assert.match(text, /cancel-in-progress:\s*false/u);
});

test("Pages deploy handles public pushes, manual runs, and successful update completion", async () => {
  const text = await workflowText(deployWorkflow);
  assert.match(text, /^\s*push:\s*$/mu);
  assert.match(text, /^\s*workflow_dispatch:\s*$/mu);
  assert.match(text, /^\s*workflow_run:\s*$/mu);
  assert.match(text, /^\s*-\s*Update Rules\s*$/mu);
  assert.match(text, /workflow_run\.conclusion == 'success'/u);
  assert.match(text, /^\s*ref:\s*main\s*$/mu);
  assert.doesNotMatch(text, /^\s*contents:\s*write\s*$/mu);
  for (const command of ["npm ci", "npm run verify", "npm run check:rules"]) {
    assert.ok(text.includes(command), command);
  }
  assert.match(text, /^\s*path:\s*public\s*$/mu);
  assert.match(text, /^\s*name:\s*github-pages\s*$/mu);
  assert.match(text, /^\s*pages:\s*write\s*$/mu);
  assert.match(text, new RegExp(`^\\s*${["id", "token"].join("-")}:\\s*write\\s*$`, "mu"));
  assert.match(text, /group:\s*pages/u);
  assert.match(text, /cancel-in-progress:\s*false/u);
});

test("checker rejects unpinned Actions, pull_request_target, and unsafe artifacts", () => {
  const errors = validateWorkflowText(".github/workflows/unsafe.yml", [
    "on:",
    "  pull_request_target:",
    "jobs:",
    "  unsafe:",
    "    steps:",
    "      - uses: actions/checkout@main",
    "      - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9",
    "        with:",
    "          path: .",
  ].join("\n"));

  assert.equal(errors.some((error) => error.includes("pull_request_target")), true);
  assert.equal(errors.some((error) => error.includes("not pinned")), true);
  assert.equal(errors.some((error) => error.includes("unsafe artifact path")), true);
});

test("checker rejects recursive updates and a non-closed publication order", () => {
  const errors = validateWorkflowText(".github/workflows/update-rules.yml", [
    "on:",
    "  push:",
    "permissions:",
    "  contents: write",
    "jobs:",
    "  update:",
    "    if: github.event_name == 'schedule' || github.ref == 'refs/heads/main'",
    "    steps:",
    "      - run: npm run update:rules",
    "      - run: npm run verify",
    "      - run: npm run check:rules",
    "      - run: npm run check:secrets",
  ].join("\n"));

  assert.equal(errors.some((error) => error.includes("must not trigger on its own push")), true);
  assert.equal(errors.some((error) => error.includes("not closed in order")), true);
});

test("Pages tree stays inside the guarded size and immutable-version window", async () => {
  assert.deepEqual(PUBLIC_PAGES_LIMITS, {
    githubMaxBytes: 1024 * 1024 * 1024,
    maxBytes: 750 * 1024 * 1024,
    maxVersions: 9,
  });
  const result = await checkPublicPagesTree(repositoryRoot);
  assert.deepEqual(result.errors, []);
  assert.ok(result.bytes > 0);
  assert.ok(result.versionCount >= 2);
  assert.ok(result.versionCount <= PUBLIC_PAGES_LIMITS.maxVersions);
});
