import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import test from "node:test";

import {
  ACTION_PINS,
  checkActions,
  checkPublicPagesTree,
  PUBLIC_PAGES_LIMITS,
  validateWorkflowText,
} from "../scripts/check-actions.mjs";
import {
  SING_BOX_VERSION,
  digestForReleaseAsset,
  installSingBoxCore,
  releaseAsset,
} from "../scripts/install-sing-box-core.mjs";

const repositoryRoot = new URL("../", import.meta.url);
const updateWorkflow = new URL("../.github/workflows/update-rules.yml", import.meta.url);
const deployWorkflow = new URL("../.github/workflows/deploy-pages.yml", import.meta.url);

async function workflowText(url) {
  return readFile(url, "utf8");
}

test("official sing-box release assets are closed to the three supported runners", () => {
  assert.equal(SING_BOX_VERSION, "1.14.0-beta.9");
  assert.deepEqual(releaseAsset("linux", "x64"), {
    suffix: "linux-amd64",
    archiveName: "sing-box-1.14.0-beta.9-linux-amd64.tar.gz",
    archiveUrl: "https://github.com/SagerNet/sing-box/releases/download/v1.14.0-beta.9/sing-box-1.14.0-beta.9-linux-amd64.tar.gz",
    metadataUrl: "https://api.github.com/repos/SagerNet/sing-box/releases/tags/v1.14.0-beta.9",
  });
  assert.equal(releaseAsset("darwin", "arm64").suffix, "darwin-arm64");
  assert.equal(releaseAsset("darwin", "x64").suffix, "darwin-amd64");
  for (const pair of [["linux", "arm64"], ["win32", "x64"], ["darwin", "ia32"]]) {
    assert.throws(() => releaseAsset(...pair), /Unsupported sing-box platform/u);
  }
});

test("official release metadata requires one exact archive digest", () => {
  const name = "sing-box-1.14.0-beta.9-linux-amd64.tar.gz";
  const digest = "a".repeat(64);
  const asset = releaseAsset("linux", "x64");
  const record = (overrides = {}) => ({
    name,
    browser_download_url: asset.archiveUrl,
    digest: `sha256:${digest}`,
    ...overrides,
  });
  assert.equal(digestForReleaseAsset({ tag_name: `v${SING_BOX_VERSION}`, assets: [record()] }, asset), digest);
  assert.throws(() => digestForReleaseAsset({ tag_name: `v${SING_BOX_VERSION}`, assets: [] }, asset), /missing/u);
  assert.throws(
    () => digestForReleaseAsset({ tag_name: `v${SING_BOX_VERSION}`, assets: [record(), record()] }, asset),
    /duplicate/u,
  );
  assert.throws(
    () => digestForReleaseAsset({ tag_name: `v${SING_BOX_VERSION}`, assets: [record({ digest: "sha256:nope" })] }, asset),
    /digest/u,
  );
  assert.throws(
    () => digestForReleaseAsset({ tag_name: "v1.14.0-beta.8", assets: [record()] }, asset),
    /tag/u,
  );
});

test("installer verifies, extracts, versions, and exports an absolute official core", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-installer-test-"));
  const source = join(root, "source");
  const installRoot = join(root, "install");
  const githubEnvPath = join(root, "github-env");
  const asset = releaseAsset("linux", "x64");
  const archiveDirectory = `sing-box-${SING_BOX_VERSION}-${asset.suffix}`;
  const executable = join(source, archiveDirectory, "sing-box");
  await mkdir(join(source, archiveDirectory), { recursive: true });
  await writeFile(executable, "#!/bin/sh\nprintf 'sing-box version 1.14.0-beta.9\\n'\n", "utf8");
  await chmod(executable, 0o755);
  const archivePath = join(root, asset.archiveName);
  const tar = spawnSync("tar", ["-czf", archivePath, "-C", source, archiveDirectory], { encoding: "utf8" });
  assert.equal(tar.status, 0, tar.stderr);
  const archive = await readFile(archivePath);
  const digest = createHash("sha256").update(archive).digest("hex");
  const fetchImpl = async (url) => {
    if (url === asset.archiveUrl) return new Response(archive, { status: 200 });
    if (url === asset.metadataUrl) return new Response(JSON.stringify({
      tag_name: `v${SING_BOX_VERSION}`,
      assets: [{
        name: asset.archiveName,
        browser_download_url: asset.archiveUrl,
        digest: `sha256:${digest}`,
      }],
    }), { status: 200 });
    return new Response("not found", { status: 404 });
  };

  const result = await installSingBoxCore({
    platform: "linux",
    arch: "x64",
    installRoot,
    githubEnvPath,
    fetchImpl,
  });
  assert.equal(isAbsolute(result.corePath), true);
  assert.equal(result.corePath, join(installRoot, archiveDirectory, "sing-box"));
  assert.equal(result.versionOutput, `sing-box version ${SING_BOX_VERSION}`);
  assert.equal(await readFile(githubEnvPath, "utf8"), `SING_BOX_CORE=${result.corePath}\n`);
});

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

test("update workflow verifies official binary rules before building edge and gates byte-exact promotion", async () => {
  const text = await workflowText(updateWorkflow);
  const installAt = text.indexOf("node scripts/install-sing-box-core.mjs");
  const compileAt = text.indexOf("npm --workspace @apple-proxy-profiles/sing-box run compile:rules");
  const configAt = text.indexOf("npm --workspace @apple-proxy-profiles/sing-box run check:config");
  const verifyAt = text.indexOf("npm run verify:lightweight");
  const edgeAt = text.indexOf("run: npm run update:rules");
  const currentStageAt = text.indexOf("node scripts/stage-rule-artifacts.mjs --channel current");
  const currentCompileAt = text.lastIndexOf("npm --workspace @apple-proxy-profiles/sing-box run compile:rules");
  const currentCheckAt = text.indexOf("npm run check:rules");
  assert.ok(installAt > text.indexOf("npm ci"), "official core installs after dependencies");
  assert.ok(compileAt > installAt, "binary rule compilation uses the verified core");
  assert.ok(configAt > compileAt, "both generated profile modes are checked after compilation");
  assert.ok(verifyAt > configAt, "lightweight tests and budgets run after official config checks");
  assert.ok(edgeAt > verifyAt, "edge candidates are generated only after verification");
  assert.ok(currentStageAt > edgeAt, "current is restaged only after the tested edge bytes are emitted");
  assert.ok(currentCompileAt > currentStageAt, "current uses binaries compiled from its own immutable stage");
  assert.ok(currentCheckAt > currentCompileAt, "current verification consumes its own compiled binaries");
  assert.match(text, /^\s*client:\s*$/mu);
  assert.match(text, /^\s*manifest_hash:\s*$/mu);
  assert.match(text, /^\s*environment:\s*canary-approval\s*$/mu);
  assert.match(text, /npm run update:rules -- --promote "\$PROMOTION_CLIENT" "\$PROMOTION_MANIFEST_HASH"/u);
  assert.match(text, /^\s*run: npm run update:rules\s*$/mu);
  assert.doesNotMatch(text, /run: npm run update:rules -- --channel edge/u);
  assert.match(text, /github\.event_name == 'workflow_dispatch'.*inputs\.client.*inputs\.manifest_hash/su);
  const scheduleBlock = text.slice(text.indexOf("build-edge:"), text.indexOf("promote-current:"));
  assert.match(scheduleBlock, /--channel edge/u);
  assert.doesNotMatch(scheduleBlock, /--promote|canary-approval/u);
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

test("Pages deployment reproduces binary and lightweight checks before upload", async () => {
  const text = await workflowText(deployWorkflow);
  const installAt = text.indexOf("node scripts/install-sing-box-core.mjs");
  const compileAt = text.indexOf("npm --workspace @apple-proxy-profiles/sing-box run compile:rules");
  const configAt = text.indexOf("npm --workspace @apple-proxy-profiles/sing-box run check:config");
  const verifyAt = text.indexOf("npm run verify:lightweight");
  const currentAt = text.indexOf("npm run check:rules");
  const uploadAt = text.indexOf("uses: actions/upload-pages-artifact@");
  assert.ok(installAt > text.indexOf("npm ci"));
  assert.ok(compileAt > installAt);
  assert.ok(configAt > compileAt);
  assert.ok(verifyAt > configAt);
  assert.ok(currentAt > verifyAt);
  assert.ok(uploadAt > currentAt);
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

test("checker rejects workflows that omit the official compiler gate", () => {
  const errors = validateWorkflowText(".github/workflows/update-rules.yml", [
    "on:",
    "  schedule:",
    "permissions:",
    "  contents: write",
    "jobs:",
    "  build-edge:",
    "    if: github.event_name == 'schedule' || github.ref == 'refs/heads/main'",
    "    steps:",
    "      - run: npm run verify:lightweight",
    "      - run: git diff --exit-code -- . \" :(exclude)public/**\"",
    "      - run: npm run update:rules -- --channel edge",
    "      - run: npm run check:rules",
    "      - run: npm run check:secrets",
  ].join("\n"));
  assert.equal(errors.some((error) => error.includes("official sing-box compiler gate")), true);
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
