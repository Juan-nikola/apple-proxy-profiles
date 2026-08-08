import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { artifactBuffer } from "../automation/src/artifact-content.js";
import { ruleClientCatalog } from "../shared/rules/lightweight-policy.js";

const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_STAGE_ROOT = resolve(REPOSITORY_ROOT, "clients/sing-box/build/rule-artifacts");
export const DEFAULT_COMPILED_ROOT = resolve(REPOSITORY_ROOT, "clients/sing-box/build/compiled-rule-artifacts");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function expectedCompiledPaths() {
  return [
    ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`),
    "optional/adblock-full/sing-box/Advertising.srs",
    "optional/adblock-full/sing-box/Advertising_Domain.srs",
  ].sort();
}

function auditInputs(artifacts) {
  if (!(artifacts?.defaults instanceof Map) || !(artifacts?.optionalPacks instanceof Map)) {
    throw new TypeError("Built client artifacts are required for sing-box staging");
  }
  const files = new Map();
  for (const [path, content] of artifacts.defaults) {
    const match = /^sing-box\/rules\/([A-Za-z0-9_]+)\.json$/u.exec(path);
    if (match) files.set(`audit/sing-box/rules/${match[1]}.json`, artifactBuffer(content));
  }
  const optional = artifacts.optionalPacks.get("adblock-full");
  if (!(optional instanceof Map)) throw new Error("Optional adblock-full artifacts are missing");
  for (const [path, content] of optional) {
    const match = /^optional\/adblock-full\/sing-box\/rules\/([A-Za-z0-9_]+)\.json$/u.exec(path);
    if (match) files.set(`optional/adblock-full/audit/sing-box/rules/${match[1]}.json`, artifactBuffer(content));
  }
  const expected = [
    ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `audit/sing-box/rules/${id}.json`),
    "optional/adblock-full/audit/sing-box/rules/Advertising.json",
    "optional/adblock-full/audit/sing-box/rules/Advertising_Domain.json",
  ].sort();
  if (JSON.stringify([...files.keys()].sort()) !== JSON.stringify(expected)) {
    throw new Error("Staged sing-box audit input closure failed");
  }
  return new Map([...files].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
}

async function treeFiles(root, current = root, found = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) await treeFiles(root, path, found);
    else if (entry.isFile()) found.push(relative(root, path).replaceAll("\\", "/"));
    else throw new Error("Rule artifact tree contains a non-regular entry");
  }
  return found;
}

export async function stageSingBoxAuditArtifacts({ artifacts, outputRoot = DEFAULT_STAGE_ROOT }) {
  const absoluteOutput = resolve(outputRoot);
  const parent = dirname(absoluteOutput);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, ".sing-box-rule-stage-"));
  try {
    const inputs = auditInputs(artifacts);
    const records = [];
    for (const [path, content] of inputs) {
      const destination = join(staging, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
      records.push(Object.freeze({ path, bytes: content.length, sha256: sha256(content) }));
    }
    const upstream = artifacts.diagnostics?.defaultManifest?.upstream;
    if (!upstream || !/^[0-9a-f]{40}$/u.test(upstream.commit)) throw new Error("Staged upstream commit is invalid");
    const manifest = Object.freeze({ schemaVersion: 1, upstream, files: Object.freeze(records) });
    await writeFile(join(staging, "stage-manifest.json"), `${JSON.stringify(manifest)}\n`, "utf8");
    await rm(absoluteOutput, { recursive: true, force: true });
    await rename(staging, absoluteOutput);
    return manifest;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function readRuleStageManifest(stageRoot = DEFAULT_STAGE_ROOT) {
  const absoluteRoot = resolve(stageRoot);
  const manifest = JSON.parse(await readFile(join(absoluteRoot, "stage-manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || !/^[0-9a-f]{40}$/u.test(manifest.upstream?.commit)
    || !Array.isArray(manifest.files)) throw new Error("Rule stage manifest is invalid");
  const actualPaths = (await treeFiles(absoluteRoot)).filter((path) => path !== "stage-manifest.json").sort();
  const expectedPaths = manifest.files.map(({ path }) => path).sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new Error("Rule stage file closure failed");
  for (const record of manifest.files) {
    if (!record || !/^[0-9a-f]{64}$/u.test(record.sha256) || !Number.isSafeInteger(record.bytes) || record.bytes < 1) {
      throw new Error("Rule stage file record is invalid");
    }
    const content = await readFile(join(absoluteRoot, record.path));
    if (content.length !== record.bytes || sha256(content) !== record.sha256) {
      throw new Error(`Rule stage file hash mismatch: ${record.path}`);
    }
  }
  return Object.freeze(manifest);
}

export async function loadCompiledSingBoxRules(compiledRoot = DEFAULT_COMPILED_ROOT) {
  const absoluteRoot = resolve(compiledRoot);
  const paths = (await treeFiles(absoluteRoot)).sort();
  const expected = expectedCompiledPaths();
  if (JSON.stringify(paths) !== JSON.stringify(expected)) {
    const unexpected = paths.find((path) => !expected.includes(path));
    const missing = expected.find((path) => !paths.includes(path));
    throw new Error(`Compiled sing-box rule closure failed: ${unexpected ? `unexpected ${unexpected}` : `missing ${missing}`}`);
  }
  const files = new Map();
  for (const path of paths) {
    const content = await readFile(join(absoluteRoot, path));
    if (content.length < 17 || !content.subarray(0, 4).equals(Buffer.from([0x53, 0x52, 0x53, 0x02]))) {
      throw new Error(`Compiled sing-box rule is invalid: ${path}`);
    }
    files.set(path, content);
  }
  return files;
}

export async function main(args = process.argv.slice(2), { env = process.env } = {}) {
  if (args.length !== 2 || args[0] !== "--channel" || !["edge", "current"].includes(args[1])) {
    throw new Error("Usage: stage-rule-artifacts.mjs --channel <edge|current>");
  }
  const { buildArtifacts } = await import("./update-rules.mjs");
  const artifacts = await buildArtifacts({
    operation: args[1] === "edge" ? "build-edge" : "check-current",
    publicDirectory: env.PUBLIC_DIRECTORY || resolve(REPOSITORY_ROOT, "public"),
    includeStaticFiles: false,
  });
  const manifest = await stageSingBoxAuditArtifacts({
    artifacts,
    outputRoot: env.SING_BOX_ARTIFACT_ROOT || DEFAULT_STAGE_ROOT,
  });
  process.stdout.write(`Staged ${manifest.files.length} sing-box audit inputs at ${manifest.upstream.commit}\n`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
