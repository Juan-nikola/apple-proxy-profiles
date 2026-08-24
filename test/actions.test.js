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
  digestForReleaseAssetPage,
  installSingBoxCore,
  releaseAsset,
  resolveSingBoxTestingRelease,
} from "../scripts/install-sing-box-core.mjs";

const repositoryRoot = new URL("../", import.meta.url);
const updateWorkflow = new URL("../.github/workflows/update-rules.yml", import.meta.url);
const deployWorkflow = new URL("../.github/workflows/deploy-pages.yml", import.meta.url);

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

function releaseAssetRow({
  href = "/SagerNet/sing-box/releases/download/v1.14.0-beta.17/sing-box-1.14.0-beta.17-linux-amd64.tar.gz",
  digest = "a".repeat(64),
} = {}) {
  return `<li>
    <a href="${href}">
      <span>sing-box-1.14.0-beta.17-linux-amd64.tar.gz</span>
    </a>
    <clipboard-copy
      aria-label="Copy to clipboard digest for sing-box-1.14.0-beta.17-linux-amd64.tar.gz"
      value="sha256:${digest}">
    </clipboard-copy>
  </li>`;
}

async function workflowText(url) {
  return readFile(url, "utf8");
}

test("official sing-box release assets are closed to supported runners", () => {
  assert.equal(SING_BOX_VERSION, "1.14.0-beta.17");
  assert.deepEqual(releaseAsset("linux", "x64"), {
    version: "1.14.0-beta.17",
    suffix: "linux-amd64",
    archiveName: "sing-box-1.14.0-beta.17-linux-amd64.tar.gz",
    archiveUrl: "https://github.com/SagerNet/sing-box/releases/download/v1.14.0-beta.17/sing-box-1.14.0-beta.17-linux-amd64.tar.gz",
    integrityUrl: "https://github.com/SagerNet/sing-box/releases/expanded_assets/v1.14.0-beta.17",
  });
  assert.equal(releaseAsset("darwin", "arm64").suffix, "darwin-arm64");
  assert.equal(releaseAsset("darwin", "x64").suffix, "darwin-amd64");
  for (const pair of [["win32", "x64"], ["darwin", "ia32"]]) {
    assert.throws(() => releaseAsset(...pair), /Unsupported sing-box platform/u);
  }
});

test("official release asset page requires one exact archive path and digest", () => {
  const digest = "a".repeat(64);
  const asset = {
    version: "1.14.0-beta.17",
    archiveName: "sing-box-1.14.0-beta.17-linux-amd64.tar.gz",
    archiveUrl: "https://github.com/SagerNet/sing-box/releases/download/v1.14.0-beta.17/sing-box-1.14.0-beta.17-linux-amd64.tar.gz",
    integrityUrl: "https://github.com/SagerNet/sing-box/releases/expanded_assets/v1.14.0-beta.17",
  };
  assert.equal(digestForReleaseAssetPage(releaseAssetRow({ digest }), asset), digest);
  assert.throws(() => digestForReleaseAssetPage("<ul></ul>", asset), /missing/u);
  assert.throws(
    () => digestForReleaseAssetPage(`${releaseAssetRow()}${releaseAssetRow()}`, asset),
    /duplicate/u,
  );
  assert.throws(
    () => digestForReleaseAssetPage(releaseAssetRow({
      href: "/SagerNet/sing-box/releases/download/v1.14.0-beta.16/sing-box-1.14.0-beta.17-linux-amd64.tar.gz",
    }), asset),
    /URL/u,
  );
  assert.throws(
    () => digestForReleaseAssetPage(releaseAssetRow({ digest: "nope" }), asset),
    /digest/u,
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
  await writeFile(executable, `#!/bin/sh\nprintf 'sing-box version ${SING_BOX_VERSION}\\n'\n`, "utf8");
  await chmod(executable, 0o755);
  const archivePath = join(root, asset.archiveName);
  const tar = spawnSync("tar", ["-czf", archivePath, "-C", source, archiveDirectory], { encoding: "utf8" });
  assert.equal(tar.status, 0, tar.stderr);
  const archive = await readFile(archivePath);
  const digest = createHash("sha256").update(archive).digest("hex");
  let integrityAttempts = 0;
  const retryDelays = [];
  const fetchImpl = async (url) => {
    if (url === "https://github.com/SagerNet/sing-box/releases.atom") {
      return new Response(releaseFeed, { status: 200 });
    }
    if (url === asset.archiveUrl) return new Response(archive, { status: 200 });
    if (url === asset.integrityUrl) {
      integrityAttempts += 1;
      if (integrityAttempts < 3) return new Response("gateway timeout", { status: 504 });
      return new Response(releaseAssetRow({ digest }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };

  const result = await installSingBoxCore({
    platform: "linux",
    arch: "x64",
    installRoot,
    githubEnvPath,
    fetchImpl,
    sleepImpl: async (delayMs) => { retryDelays.push(delayMs); },
  });
  assert.equal(isAbsolute(result.corePath), true);
  assert.equal(result.corePath, join(installRoot, archiveDirectory, "sing-box"));
  assert.equal(result.versionOutput, `sing-box version ${SING_BOX_VERSION}`);
  assert.equal(await readFile(githubEnvPath, "utf8"), `SING_BOX_CORE=${result.corePath}\n`);
  assert.equal(integrityAttempts, 3);
  assert.deepEqual(retryDelays, [1_000, 2_000]);
  assert.deepEqual(result.release, {
    version: "1.14.0-beta.17",
    tag: "v1.14.0-beta.17",
    commit: null,
  });
});

test("resolves the newest published prerelease testing release", async () => {
  const result = await resolveSingBoxTestingRelease({
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://github.com/SagerNet/sing-box/releases.atom");
      assert.equal(init.headers.Accept, "application/atom+xml");
      return {
        ok: true,
        async text() { return releaseFeed; },
      };
    },
  });
  assert.deepEqual(result, { version: "1.14.0-beta.17", tag: "v1.14.0-beta.17", commit: null });
  await assert.rejects(
    resolveSingBoxTestingRelease({
      fetchImpl: async () => ({
        ok: true,
        async text() {
          return releaseFeed.replaceAll("1.14.0-beta.17", "1.13.19").replaceAll("1.14.0-beta.15", "1.13.18");
        },
      }),
    }),
    /No published sing-box testing release/u,
  );
});

test("retries transient release feed failures before selecting the newest testing release", async () => {
  let attempts = 0;
  const delays = [];
  const result = await resolveSingBoxTestingRelease({
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) return { ok: false, status: 504 };
      return {
        ok: true,
        async text() { return releaseFeed; },
      };
    },
    sleepImpl: async (delayMs) => { delays.push(delayMs); },
  });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
  assert.deepEqual(result, { version: "1.14.0-beta.17", tag: "v1.14.0-beta.17", commit: null });
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

test("update workflow is source-push/daily/manual, verifies output, and commits only public", async () => {
  const text = await workflowText(updateWorkflow);
  assert.match(text, /^\s*push:\s*$/mu);
  assert.match(text, /^\s*schedule:\s*$/mu);
  assert.match(text, /^\s*workflow_dispatch:\s*$/mu);
  for (const path of ["automation/**", "clients/**", "scripts/**", "shared/**"]) {
    assert.ok(text.includes(`- "${path}"`), path);
  }
  assert.doesNotMatch(text, /^\s*-\s*["']?public\/\*\*/mu);
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

test("update workflow verifies official binary rules before building and promoting the release", async () => {
  const text = await workflowText(updateWorkflow);
  const installAt = text.indexOf("node scripts/install-sing-box-core.mjs");
  const stageAt = text.indexOf("node scripts/stage-rule-artifacts.mjs --channel edge");
  const compileAt = text.indexOf("npm --workspace @apple-proxy-profiles/sing-box run compile:rules");
  const configAt = text.indexOf("npm --workspace @apple-proxy-profiles/sing-box run check:config");
  const verifyAt = text.indexOf("npm run verify:lightweight");
  const edgeAt = text.indexOf("run: npm run update:rules");
  const currentStageAt = text.indexOf("node scripts/stage-rule-artifacts.mjs --channel current");
  const currentCompileAt = text.lastIndexOf("npm --workspace @apple-proxy-profiles/sing-box run compile:rules");
  const currentCheckAt = text.indexOf("npm run check:rules");
  const promoteAllAt = text.indexOf("node scripts/update-rules.mjs --promote-all");
  assert.ok(installAt > text.indexOf("npm ci"), "official core installs after dependencies");
  assert.ok(stageAt > installAt, "the stage command resolves all immutable network inputs");
  assert.ok(compileAt > stageAt, "binary rule compilation consumes the closed stage");
  assert.ok(configAt > compileAt, "both generated profile modes are checked after compilation");
  assert.ok(verifyAt > configAt, "lightweight tests and budgets run after official config checks");
  assert.ok(edgeAt > verifyAt, "edge candidates are generated only after verification");
  assert.ok(currentStageAt > edgeAt, "current is restaged only after the tested edge bytes are emitted");
  assert.ok(currentCompileAt > currentStageAt, "current uses binaries compiled from its own immutable stage");
  assert.ok(promoteAllAt > currentCompileAt, "current promotion consumes the tested edge bytes");
  assert.ok(currentCheckAt > promoteAllAt, "current verification consumes the promoted bytes");
  assert.match(text, /^\s*client:\s*$/mu);
  assert.match(text, /^\s*manifest_hash:\s*$/mu);
  assert.doesNotMatch(text, /^\s*environment:\s*canary-approval\s*$/mu);
  assert.match(text, /node scripts\/update-rules\.mjs --promote "\$PROMOTION_CLIENT" "\$PROMOTION_MANIFEST_HASH"/u);
  assert.match(text, /^\s*run: npm run update:rules\s*$/mu);
  assert.doesNotMatch(text, /run: npm run update:rules -- --channel edge/u);
  assert.match(text, /github\.event_name == 'workflow_dispatch'.*inputs\.client.*inputs\.manifest_hash/su);
  const scheduleBlock = text.slice(text.indexOf("build-edge:"), text.indexOf("promote-current:"));
  assert.match(scheduleBlock, /--channel edge/u);
  assert.match(scheduleBlock, /--promote-all/u);
  assert.doesNotMatch(scheduleBlock, /canary-approval/u);
  assert.match(text, /name: Fetch immutable ChinaIP audit and stage lightweight rules/u);
  assert.equal(
    text.match(/node scripts\/stage-rule-artifacts\.mjs --channel edge/gu)?.length,
    1,
  );
  assert.doesNotMatch(text, /fetch-china-ip-audit|gaoyifan/u);
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
