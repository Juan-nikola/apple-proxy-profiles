import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { artifactBuffer } from "../automation/src/artifact-content.js";
import {
  buildChinaIpAudit,
  parseAuditCidrs,
  validateChinaIpAuditForPromotion,
} from "../automation/src/china-ip-audit.js";
import {
  fetchChinaIpAuditSnapshot,
  resolveChinaIpAuditCommit,
} from "../automation/src/fetch-china-ip-audit.js";
import { buildV2flyDomainAudit } from "../automation/src/v2fly-domain-audit.js";
import { fetchV2flyDomainAuditSnapshot } from "../automation/src/fetch-v2fly-domain-audit.js";
import { canonicalJson } from "../automation/src/render-anywhere-rules.js";
import { parseSurgeRules } from "../automation/src/parse-surge.js";
import { V2FLY_AUDIT_BASELINE } from "../automation/src/source-catalog.js";
import { MOBILE_RULE_SOURCE_IDS, ruleClientCatalog } from "../shared/rules/lightweight-policy.js";

const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_STAGE_ROOT = resolve(REPOSITORY_ROOT, "clients/sing-box/build/rule-artifacts");
export const DEFAULT_COMPILED_ROOT = resolve(REPOSITORY_ROOT, "clients/sing-box/build/compiled-rule-artifacts");
const CHINA_IP_AUDIT_PATH = "audit/china-ip-drift.json";
const V2FLY_AUDIT_PATH = "audit/v2fly-domain-drift.json";
const REUSE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SRS_MAGIC = Buffer.from([0x53, 0x52, 0x53, 0x02]);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function expectedCompiledPaths() {
  return [
    ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`),
    ...MOBILE_RULE_SOURCE_IDS.map((id) => `sing-box/mobile-rule-sets/${id}.srs`),
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
    ...MOBILE_RULE_SOURCE_IDS.map((id) => `audit/sing-box/rules/mobile_${id}.json`),
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

function canonicalChinaIpAudit(content) {
  const bytes = artifactBuffer(content);
  let report;
  try {
    report = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("ChinaIP audit report is invalid JSON");
  }
  if (!bytes.equals(Buffer.from(canonicalJson(report), "utf8"))) {
    throw new Error("ChinaIP audit report bytes are not canonical");
  }
  return Object.freeze({ bytes, report });
}

function canonicalV2flyAudit(content) {
  const bytes = artifactBuffer(content);
  let report;
  try {
    report = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("v2fly audit report is invalid JSON");
  }
  if (!bytes.equals(Buffer.from(canonicalJson(report), "utf8"))) {
    throw new Error("v2fly audit report bytes are not canonical");
  }
  return Object.freeze({ bytes, report });
}

function productionDomainEntries(artifacts) {
  const entries = [];
  const domainKinds = new Set(["domain", "domainSuffix", "domainKeyword", "regexp"]);
  for (const [path, content] of artifacts.defaults) {
    const match = /^surge\/rules\/[A-Za-z0-9_]+\.list$/u.exec(path);
    if (!match) continue;
    const id = path.slice("surge/rules/".length, -".list".length);
    const parsed = parseSurgeRules(artifactBuffer(content).toString("utf8"), {
      id,
      inputFormat: "RULE-SET",
      minEntries: 0,
    });
    entries.push(...parsed.entries.filter(({ kind }) => domainKinds.has(kind)));
  }
  return entries;
}

export async function buildEdgeV2flyDomainAudit({
  artifacts,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  fetchSnapshotImpl = fetchV2flyDomainAuditSnapshot,
  baseline = V2FLY_AUDIT_BASELINE,
} = {}) {
  if (!artifacts?.defaults || !artifacts.diagnostics?.defaultManifest?.upstream) {
    throw new TypeError("Built artifacts are required for v2fly audit");
  }
  const generatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const snapshot = await fetchSnapshotImpl({
    commit: { sha: baseline.commit, committedAt: artifacts.diagnostics.defaultManifest.upstream.committedAt },
    fetchImpl,
  });
  const report = buildV2flyDomainAudit({
    snapshot,
    generatedAt,
    blackmatrixCatalog: productionDomainEntries(artifacts),
    production: artifacts.diagnostics.defaultManifest.upstream,
  });
  return Buffer.from(canonicalJson(report), "utf8");
}

function previousChinaIpEntries(content) {
  if (typeof content !== "string") throw new TypeError("Previous edge ChinaIP rule must be text");
  const ipv4 = [];
  const ipv6 = [];
  for (const line of content.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean)) {
    if (line.startsWith("#")) continue;
    const [kind, value, ...modifiers] = line.split(",");
    if (!value || modifiers.some((modifier) => modifier !== "no-resolve")) {
      throw new Error("Previous edge ChinaIP rule is invalid");
    }
    if (kind === "IP-CIDR") ipv4.push(value);
    else if (kind === "IP-CIDR6") ipv6.push(value);
    else throw new Error("Previous edge ChinaIP rule is invalid");
  }
  return parseAuditCidrs({
    ipv4Text: `${ipv4.join("\n")}\n`,
    ipv6Text: `${ipv6.join("\n")}\n`,
    sourceId: "ChinaIP-previous-edge",
  });
}

async function optionalFile(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function buildEdgeChinaIpAudit({
  publicDirectory,
  primary,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  resolveCommitImpl = resolveChinaIpAuditCommit,
  fetchSnapshotImpl = fetchChinaIpAuditSnapshot,
}) {
  if (typeof publicDirectory !== "string" || !publicDirectory
    || !primary || !Array.isArray(primary.entries) || !primary.source) {
    throw new TypeError("ChinaIP audit primary snapshot is required");
  }
  const nowMillis = now instanceof Date ? now.getTime() : (
    typeof now === "number" ? now : Date.parse(now)
  );
  if (!Number.isFinite(nowMillis)) throw new TypeError("ChinaIP audit generation time is invalid");
  const existingBytes = await optionalFile(join(publicDirectory, "current", CHINA_IP_AUDIT_PATH));
  if (existingBytes !== null) {
    try {
      const existing = canonicalChinaIpAudit(existingBytes).report;
      const generatedAt = Date.parse(existing.generatedAt);
      const age = Number.isFinite(generatedAt) ? nowMillis - generatedAt : Infinity;
      const calibrationEndsAt = Date.parse(existing.calibrationEndsAt);
      const calibrationExpired = existing.reportOnly === true
        && Number.isFinite(calibrationEndsAt)
        && nowMillis >= calibrationEndsAt;
      if (existing.schemaVersion === 1
        && age >= 0 && age < REUSE_MAX_AGE_MS
        && !calibrationExpired
        && existing.primary?.commit === primary.source.commit
        && existing.primary?.sha256 === primary.source.sha256
        && /^[0-9a-f]{40}$/u.test(existing.secondary?.commit ?? "")
        && /^[0-9a-f]{64}$/u.test(existing.secondary?.sha256 ?? "")) {
        return existingBytes;
      }
    } catch {
      // Regenerate when the prior edge audit is absent, stale, or invalid.
    }
  }
  const commit = await resolveCommitImpl(fetchImpl, nowMillis);
  const secondarySnapshot = await fetchSnapshotImpl({ commit, fetchImpl });

  const previousRule = await optionalFile(join(publicDirectory, "current/surge/rules/ChinaIP.list"));
  const previousPrimaryEntries = previousRule === null
    ? primary.entries
    : previousChinaIpEntries(previousRule.toString("utf8"));
  const previousReportBytes = await optionalFile(join(publicDirectory, "current", CHINA_IP_AUDIT_PATH));
  let calibrationStartedAt;
  if (previousReportBytes !== null) {
    const previousReport = canonicalChinaIpAudit(previousReportBytes).report;
    const started = Date.parse(previousReport.calibrationStartedAt);
    const ended = Date.parse(previousReport.calibrationEndsAt);
    if (previousReport.schemaVersion !== 1 || !Number.isFinite(started) || !Number.isFinite(ended)
      || ended - started !== 14 * 24 * 60 * 60 * 1_000) {
      throw new Error("Previous edge ChinaIP audit report is invalid");
    }
    calibrationStartedAt = previousReport.calibrationStartedAt;
  }
  const report = buildChinaIpAudit({
    previousPrimaryEntries,
    currentPrimaryEntries: primary.entries,
    secondaryEntries: secondarySnapshot.entries,
    primary: primary.source,
    secondary: {
      repository: secondarySnapshot.source.repository,
      commit: secondarySnapshot.source.commit,
      committedAt: secondarySnapshot.source.committedAt,
      sha256: secondarySnapshot.sha256,
    },
    now: new Date(nowMillis),
    calibrationStartedAt,
  });
  return Buffer.from(canonicalJson(report), "utf8");
}

export async function loadCurrentChinaIpAudit({ publicDirectory }) {
  if (typeof publicDirectory !== "string" || !publicDirectory) {
    throw new TypeError("Current public directory is required");
  }
  const loaded = canonicalChinaIpAudit(await readFile(join(publicDirectory, "current", CHINA_IP_AUDIT_PATH)));
  validateChinaIpAuditForPromotion(loaded.report, loaded.report.generatedAt);
  return loaded.bytes;
}

async function writeRuleStage({ inputs, upstream, chinaIpAudit, v2flyDomainAudit = null, outputRoot }) {
  const absoluteOutput = resolve(outputRoot);
  const parent = dirname(absoluteOutput);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, ".sing-box-rule-stage-"));
  try {
    if (!(inputs instanceof Map) || inputs.size === 0) throw new TypeError("Rule stage inputs are required");
    const audit = canonicalChinaIpAudit(chinaIpAudit);
    const records = [];
    for (const [path, content] of inputs) {
      const destination = join(staging, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
      records.push(Object.freeze({ path, bytes: content.length, sha256: sha256(content) }));
    }
    const auditDestination = join(staging, CHINA_IP_AUDIT_PATH);
    await mkdir(dirname(auditDestination), { recursive: true });
    await writeFile(auditDestination, audit.bytes);
    const chinaIpAuditRecord = Object.freeze({
      path: CHINA_IP_AUDIT_PATH,
      bytes: audit.bytes.length,
      sha256: sha256(audit.bytes),
    });
    let v2flyAuditRecord = null;
    if (v2flyDomainAudit !== null) {
      const audit = canonicalV2flyAudit(v2flyDomainAudit);
      const destination = join(staging, V2FLY_AUDIT_PATH);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, audit.bytes);
      v2flyAuditRecord = Object.freeze({
        path: V2FLY_AUDIT_PATH,
        bytes: audit.bytes.length,
        sha256: sha256(audit.bytes),
      });
    }
    if (!upstream || !/^[0-9a-f]{40}$/u.test(upstream.commit)) throw new Error("Staged upstream commit is invalid");
    const manifest = Object.freeze({
      schemaVersion: 2,
      upstream,
      chinaIpAudit: chinaIpAuditRecord,
      ...(v2flyAuditRecord === null ? {} : { v2flyAudit: v2flyAuditRecord }),
      files: Object.freeze(records),
    });
    await writeFile(join(staging, "stage-manifest.json"), `${JSON.stringify(manifest)}\n`, "utf8");
    await rm(absoluteOutput, { recursive: true, force: true });
    await rename(staging, absoluteOutput);
    return manifest;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function stageSingBoxAuditArtifacts({
  artifacts,
  chinaIpAudit,
  v2flyDomainAudit = null,
  outputRoot = DEFAULT_STAGE_ROOT,
}) {
  return writeRuleStage({
    inputs: auditInputs(artifacts),
    upstream: artifacts.diagnostics?.defaultManifest?.upstream,
    chinaIpAudit,
    v2flyDomainAudit,
    outputRoot,
  });
}

export async function stageSingBoxAuditArtifactsWithV2fly({
  artifacts,
  chinaIpAudit,
  v2flyDomainAudit = null,
  outputRoot = DEFAULT_STAGE_ROOT,
}) {
  return stageSingBoxAuditArtifacts({ artifacts, chinaIpAudit, v2flyDomainAudit, outputRoot });
}

export async function stageCurrentSingBoxArtifacts({
  publicDirectory,
  chinaIpAudit,
  v2flyDomainAudit = null,
  outputRoot = DEFAULT_STAGE_ROOT,
}) {
  if (typeof publicDirectory !== "string" || !publicDirectory) {
    throw new TypeError("Current public directory is required");
  }
  const currentManifest = JSON.parse(await readFile(join(publicDirectory, "current/manifest.json"), "utf8"));
  const inputs = new Map();
  for (const path of expectedCompiledPaths()) {
    const source = path.startsWith("optional/adblock-full/")
      ? join(publicDirectory, "optional/adblock-full/current", path.slice("optional/adblock-full/".length))
      : join(publicDirectory, "current", path);
    const content = await readFile(source);
    if (content.length < 17 || !content.subarray(0, SRS_MAGIC.length).equals(SRS_MAGIC)) {
      throw new Error(`Tracked current sing-box rule is invalid: ${path}`);
    }
    inputs.set(path, content);
  }
  return writeRuleStage({
    inputs,
    upstream: currentManifest.upstream,
    chinaIpAudit,
    v2flyDomainAudit,
    outputRoot,
  });
}

export async function readRuleStageManifest(stageRoot = DEFAULT_STAGE_ROOT) {
  const absoluteRoot = resolve(stageRoot);
  const manifest = JSON.parse(await readFile(join(absoluteRoot, "stage-manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 2 || !/^[0-9a-f]{40}$/u.test(manifest.upstream?.commit)
    || !Array.isArray(manifest.files) || manifest.chinaIpAudit?.path !== CHINA_IP_AUDIT_PATH) {
    throw new Error("Rule stage manifest is invalid");
  }
  const actualPaths = (await treeFiles(absoluteRoot)).filter((path) => path !== "stage-manifest.json").sort();
  const expectedPaths = [
    ...manifest.files.map(({ path }) => path),
    manifest.chinaIpAudit.path,
    ...(manifest.v2flyAudit === undefined ? [] : [manifest.v2flyAudit.path]),
  ].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new Error("Rule stage file closure failed");
  for (const record of [...manifest.files, manifest.chinaIpAudit]) {
    if (!record || !/^[0-9a-f]{64}$/u.test(record.sha256) || !Number.isSafeInteger(record.bytes) || record.bytes < 1) {
      throw new Error("Rule stage file record is invalid");
    }
    const content = await readFile(join(absoluteRoot, record.path));
    if (content.length !== record.bytes || sha256(content) !== record.sha256) {
      throw new Error(`Rule stage file hash mismatch: ${record.path}`);
    }
  }
  if (manifest.v2flyAudit !== undefined) {
    const record = manifest.v2flyAudit;
    if (record.path !== V2FLY_AUDIT_PATH || !/^[0-9a-f]{64}$/u.test(record.sha256)
      || !Number.isSafeInteger(record.bytes) || record.bytes < 1) {
      throw new Error("Rule stage v2fly audit record is invalid");
    }
    const content = await readFile(join(absoluteRoot, record.path));
    if (content.length !== record.bytes || sha256(content) !== record.sha256) {
      throw new Error("Rule stage v2fly audit hash mismatch");
    }
    canonicalV2flyAudit(content);
  }
  canonicalChinaIpAudit(await readFile(join(absoluteRoot, manifest.chinaIpAudit.path)));
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

export async function main(args = process.argv.slice(2), {
  env = process.env,
  buildArtifactsImpl = null,
  buildEdgeChinaIpAuditImpl = buildEdgeChinaIpAudit,
  now = new Date(),
} = {}) {
  if (args.length !== 2 || args[0] !== "--channel" || args[1] !== "current") {
    throw new Error("Usage: stage-rule-artifacts.mjs --channel current");
  }
  const publicDirectory = env.PUBLIC_DIRECTORY || resolve(REPOSITORY_ROOT, "public");
  const channel = args[1];
  if (channel === "current") {
    const chinaIpAudit = await loadCurrentChinaIpAudit({ publicDirectory });
    let v2flyDomainAudit = null;
    try {
      v2flyDomainAudit = await readFile(join(publicDirectory, "current", V2FLY_AUDIT_PATH));
      canonicalV2flyAudit(v2flyDomainAudit);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const manifest = await stageCurrentSingBoxArtifacts({
      publicDirectory,
      chinaIpAudit,
      v2flyDomainAudit,
      outputRoot: env.SING_BOX_ARTIFACT_ROOT || DEFAULT_STAGE_ROOT,
    });
    process.stdout.write(`Staged ${manifest.files.length} tracked current sing-box rules at ${manifest.upstream.commit}\n`);
    return manifest;
  }
  throw new Error("Current-only staging does not build an unpublished channel");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
