import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ruleClientCatalog } from "../../../shared/rules/lightweight-policy.js";

// Official sing-box binary rule sets start with ASCII "SRS" followed by the
// binary format version byte 0x02. Even an empty v5 source compiles to 17 bytes.
const SRS_MAGIC = Buffer.from([0x53, 0x52, 0x53, 0x02]);
const SRS_MINIMUM_BYTES = 17;
const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");
export const DEFAULT_ARTIFACT_ROOT = resolve(REPOSITORY_ROOT, "clients/sing-box/build/rule-artifacts");
export const DEFAULT_RULE_OUTPUT_ROOT = resolve(REPOSITORY_ROOT, "clients/sing-box/build/compiled-rule-artifacts");

function requiredPath(value, label) {
  if (typeof value !== "string" || !value || /[\r\n]/u.test(value)) throw new TypeError(`${label} is required`);
  return resolve(value);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function runCore(corePath, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(corePath, args, { stdio: ["ignore", "ignore", "pipe"], shell: false });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.once("error", (error) => reject(Object.assign(new Error("Unable to execute sing-box core"), { cause: error })));
    child.once("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      void signal;
      const suffix = stderr.trim().replace(/[\r\n]+/gu, " ").slice(0, 240);
      reject(new Error(`sing-box ${args[0] ?? "command"} failed (${code ?? "signal"})${suffix ? `: ${suffix}` : ""}`));
    });
  });
}

function artifactBuffer(value, label) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string") return Buffer.from(value, "utf8");
  throw new TypeError(`sing-box artifact ${label} must be text or Buffer`);
}

function safeArtifactPath(path) {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.includes("\\")
    && !path.split("/").includes("..");
}

function compiledArtifactPath(sourcePath) {
  let match = /^audit\/sing-box\/rules\/([^/]+)\.json$/u.exec(sourcePath);
  if (match) return `sing-box/rule-sets/${match[1]}.srs`;
  match = /^optional\/([^/]+)\/audit\/sing-box\/rules\/([^/]+)\.json$/u.exec(sourcePath);
  if (match) return `optional/${match[1]}/sing-box/${match[2]}.srs`;
  throw new Error(`Unsupported sing-box audit artifact path: ${sourcePath}`);
}

function validateSource(sourceName, content) {
  let source;
  try {
    source = JSON.parse(content.toString("utf8"));
  } catch (error) {
    throw Object.assign(new Error(`Invalid sing-box source rule set JSON: ${sourceName}`), { cause: error });
  }
  if (!Number.isInteger(source.version) || source.version < 3 || source.version > 5 || !Array.isArray(source.rules)) {
    throw new Error(`Invalid sing-box source rule set: ${sourceName}`);
  }
  return source.version;
}

function validateSrsBinary(buffer, label) {
  if (!Buffer.isBuffer(buffer) || buffer.length < SRS_MINIMUM_BYTES) {
    throw new Error(`${label} is shorter than the minimum valid SRS header and payload`);
  }
  if (!buffer.subarray(0, SRS_MAGIC.length).equals(SRS_MAGIC)) {
    throw new Error(`${label} does not contain the official sing-box SRS magic`);
  }
  return buffer;
}

export async function compileRules(options) {
  if (options?.artifacts !== undefined) return compileArtifactMap(options);
  const { corePath, sourceDirectory, outputDirectory } = options ?? {};
  const executable = requiredPath(corePath, "sing-box corePath");
  const sourceRoot = requiredPath(sourceDirectory, "sing-box sourceDirectory");
  const outputRoot = requiredPath(outputDirectory, "sing-box outputDirectory");
  const sourceNames = (await readdir(sourceRoot)).filter((name) => name.endsWith(".json")).sort();
  if (sourceNames.length === 0) throw new Error("No sing-box source rule sets found");
  await mkdir(outputRoot, { recursive: true });
  const files = [];
  let version;
  for (const sourceName of sourceNames) {
    const sourcePath = join(sourceRoot, sourceName);
    const source = JSON.parse(await readFile(sourcePath, "utf8"));
    if (!Number.isInteger(source.version) || source.version < 3 || source.version > 5 || !Array.isArray(source.rules)) {
      throw new Error(`Invalid sing-box source rule set: ${sourceName}`);
    }
    if (version === undefined) version = source.version;
    if (source.version !== version) throw new Error("sing-box source rule-set versions must match");
    const outputName = sourceName.slice(0, -5) + ".srs";
    const outputPath = join(outputRoot, outputName);
    await runCore(executable, ["rule-set", "compile", "--output", outputPath, sourcePath]);
    const outputStat = await stat(outputPath);
    if (!outputStat.isFile() || outputStat.size === 0) throw new Error(`sing-box core produced no binary rule set: ${outputName}`);
    const binary = await readFile(outputPath);
    validateSrsBinary(binary, `sing-box output ${outputName}`);
    files.push(Object.freeze({ path: outputName, bytes: binary.length, sha256: sha256(binary) }));
  }
  return Object.freeze({ version, files: Object.freeze(files) });
}

async function compileArtifactMap({ corePath, artifacts, expectedPaths = null }) {
  const executable = requiredPath(corePath, "sing-box corePath");
  if (!(artifacts instanceof Map) || artifacts.size === 0) throw new TypeError("sing-box artifacts must be a non-empty Map");
  const tempRoot = await mkdtemp(join(tmpdir(), "sing-box-rule-artifacts-"));
  try {
    const compiled = new Map();
    let version;
    for (const [sourcePath, value] of [...artifacts].sort(([left], [right]) => left.localeCompare(right))) {
      if (!safeArtifactPath(sourcePath)) throw new Error(`Unsafe sing-box artifact path: ${sourcePath}`);
      const outputPath = compiledArtifactPath(sourcePath);
      const sourceBytes = artifactBuffer(value, sourcePath);
      const sourceVersion = validateSource(sourcePath, sourceBytes);
      if (version === undefined) version = sourceVersion;
      if (sourceVersion !== version) throw new Error("sing-box source rule-set versions must match");
      const sourceFile = join(tempRoot, `${compiled.size}-${basename(sourcePath)}`);
      const outputFile = join(tempRoot, `${compiled.size}-${basename(outputPath)}`);
      await writeFile(sourceFile, sourceBytes);
      await runCore(executable, ["rule-set", "compile", "--output", outputFile, sourceFile]);
      const binary = await readFile(outputFile).catch(() => null);
      validateSrsBinary(binary, `sing-box output ${outputPath}`);
      compiled.set(outputPath, binary);
    }
    const ordered = new Map([...compiled].sort(([left], [right]) => left.localeCompare(right)));
    if (expectedPaths !== null) {
      if (!Array.isArray(expectedPaths) || expectedPaths.some((path) => !safeArtifactPath(path) || !path.endsWith(".srs"))) {
        throw new TypeError("sing-box expectedPaths must contain safe .srs paths");
      }
      for (const path of expectedPaths) if (!ordered.has(path)) throw new Error(`Expected sing-box rule-set artifact is missing: ${path}`);
      for (const path of ordered.keys()) if (!expectedPaths.includes(path)) throw new Error(`Unexpected sing-box rule-set artifact: ${path}`);
    }
    return ordered;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function checkConfigs({ corePath, configs }) {
  const executable = requiredPath(corePath, "sing-box corePath");
  if (!(configs instanceof Map) || configs.size === 0) throw new TypeError("sing-box configs must be a non-empty Map");
  const tempRoot = await mkdtemp(join(tmpdir(), "sing-box-config-check-"));
  try {
    const formatted = [];
    const checked = [];
    const ordered = [...configs].sort(([left], [right]) => left.localeCompare(right));
    const hasMacProfiles = ordered.some(([name]) => /^sing-box-macos(?:-diagnostic)?\.json$/u.test(name));
    for (const [name, value] of ordered) {
      if (!safeArtifactPath(name) || !name.endsWith(".json")) throw new Error(`Unsafe sing-box config path: ${name}`);
      const path = join(tempRoot, basename(name));
      const content = artifactBuffer(value, name);
      JSON.parse(content.toString("utf8"));
      await writeFile(path, content);
      await runCore(executable, ["format", "--config", path]);
      formatted.push(name);
      if (hasMacProfiles && !/^sing-box-macos(?:-diagnostic)?\.json$/u.test(name)) continue;
      await runCore(executable, ["check", "--config", path]);
      checked.push(name);
    }
    return Object.freeze({ formatted: Object.freeze(formatted), checked: Object.freeze(checked) });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function collectFiles(root, current = root, files = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) await collectFiles(root, path, files);
    else if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files;
}

function expectedPublicationPaths() {
  const defaults = ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`);
  const optionalIds = ruleClientCatalog({ adblockMode: "full" })
    .filter(({ id }) => id === "Advertising" || id === "Advertising_Domain")
    .map(({ id }) => `optional/adblock-full/sing-box/${id}.srs`);
  return [...defaults, ...optionalIds].sort();
}

function expectedAuditPaths() {
  const defaults = ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `audit/sing-box/rules/${id}.json`);
  const optionalIds = ruleClientCatalog({ adblockMode: "full" })
    .filter(({ id }) => id === "Advertising" || id === "Advertising_Domain")
    .map(({ id }) => `optional/adblock-full/audit/sing-box/rules/${id}.json`);
  return [...defaults, ...optionalIds].sort();
}

async function compileCommand(corePath, env) {
  const artifactRoot = requiredPath(env.SING_BOX_ARTIFACT_ROOT ?? DEFAULT_ARTIFACT_ROOT, "SING_BOX_ARTIFACT_ROOT");
  const outputRoot = requiredPath(env.SING_BOX_RULE_OUTPUT_ROOT ?? DEFAULT_RULE_OUTPUT_ROOT, "SING_BOX_RULE_OUTPUT_ROOT");
  let discovered;
  try {
    discovered = await collectFiles(artifactRoot);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Staged sing-box artifact root is missing: ${artifactRoot}`);
    throw error;
  }
  const paths = discovered.filter((path) => (
    /^audit\/sing-box\/rules\/[^/]+\.json$/u.test(path)
    || /^optional\/[^/]+\/audit\/sing-box\/rules\/[^/]+\.json$/u.test(path)
  ));
  for (const path of expectedAuditPaths()) {
    if (!paths.includes(path)) throw new Error(`Expected staged sing-box audit artifact is missing: ${join(artifactRoot, path)}`);
  }
  const artifacts = new Map(await Promise.all(paths.map(async (path) => [path, await readFile(join(artifactRoot, path))])));
  const compiled = await compileRules({ corePath, artifacts, expectedPaths: expectedPublicationPaths() });
  for (const [path, content] of compiled) {
    const destination = join(outputRoot, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  return compiled;
}

async function checkCommand(corePath) {
  const examplesRoot = resolve(import.meta.dirname, "../examples");
  const configs = new Map();
  for (const platform of ["macos", "iphone", "ipad", "android", "openwrt"]) {
    for (const suffix of ["", "-diagnostic"]) {
      const name = `sing-box-${platform}${suffix}.json`;
      configs.set(name, await readFile(join(examplesRoot, name)));
    }
  }
  return checkConfigs({ corePath, configs });
}

export async function main(args = process.argv.slice(2), { env = process.env } = {}) {
  const [command] = args;
  const corePath = env.SING_BOX_CORE;
  if (command === "compile") return compileCommand(corePath, env);
  if (command === "check") return checkCommand(corePath);
  throw new Error("Usage: compile-rules.mjs <compile|check>");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
