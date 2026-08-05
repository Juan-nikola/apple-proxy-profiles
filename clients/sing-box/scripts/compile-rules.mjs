import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

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
      reject(new Error(`sing-box rule-set compile failed (${code ?? "signal"})${suffix ? `: ${suffix}` : ""}`));
    });
  });
}

function looksBinary(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2) return false;
  if (buffer.includes(0)) return true;
  const text = buffer.toString("utf8").trimStart();
  return !text.startsWith("{") && !text.startsWith("[") && !/^[\x20-\x7e\r\n\t]*$/u.test(text);
}

export async function compileRules({ corePath, sourceDirectory, outputDirectory }) {
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
    if (!looksBinary(binary)) throw new Error(`sing-box output is not a binary .srs rule set: ${outputName}`);
    files.push(Object.freeze({ path: outputName, bytes: binary.length, sha256: sha256(binary) }));
  }
  return Object.freeze({ version, files: Object.freeze(files) });
}
