import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseSurgeRules } from "../automation/src/parse-surge.js";
import { artifactSha256 } from "../automation/src/artifact-content.js";
import { explainRoute } from "../automation/src/routing-plan-audit.js";
import { ruleClientCatalog } from "../shared/rules/lightweight-policy.js";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const RULE_PATH = /^surge\/rules\/[A-Za-z0-9_-]+\.list$/u;

export function parseExplainArguments(args) {
  if (!Array.isArray(args)) throw new TypeError("Explain-route arguments must be an array");
  if (args.length !== 4 && args.length !== 6) {
    throw new Error("Invalid explain-route arguments; use --channel <edge|current> --domain <domain> [--ip <address>]");
  }
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--channel") {
      if (options.channel !== undefined) throw new Error("Invalid explain-route arguments: duplicate --channel");
      if (value !== "edge" && value !== "current") {
        throw new Error("Invalid explain-route arguments: --channel must be edge or current");
      }
      options.channel = value;
    } else if (flag === "--domain") {
      if (options.domain !== undefined) throw new Error("Invalid explain-route arguments: duplicate --domain");
      options.domain = value;
    } else if (flag === "--ip") {
      if (options.ip !== undefined) throw new Error("Invalid explain-route arguments: duplicate --ip");
      options.ip = value;
    } else {
      throw new Error(`Invalid explain-route arguments: unknown flag ${flag}`);
    }
  }
  if (options.channel === undefined || options.domain === undefined) {
    throw new Error("Invalid explain-route arguments; use --channel <edge|current> --domain <domain> [--ip <address>]");
  }
  return Object.freeze(options);
}

export async function loadChannelRules({ channel, publicRoot = join(repositoryRoot, "public") }) {
  const channelDirectory = join(publicRoot, channel);
  let manifestBytes;
  try {
    manifestBytes = await readFile(join(channelDirectory, "manifest.json"));
  } catch {
    throw new Error(`Missing channel tree or Manifest: ${channel}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error(`Noncanonical Manifest under ${channel}: invalid JSON`);
  }
  if (!manifest || manifest.schemaVersion !== 2 || !Array.isArray(manifest.files)) {
    throw new Error(`Noncanonical Manifest under ${channel}: schema or files are invalid`);
  }
  const recordsByPath = new Map(manifest.files.map((record) => [record.path, record]));
  const ruleRecords = manifest.files.filter((record) => RULE_PATH.test(record.path));
  for (const record of ruleRecords) {
    if (typeof record.bytes !== "number" || !Number.isSafeInteger(record.bytes)
      || typeof record.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(record.sha256)) {
      throw new Error(`Noncanonical Manifest rule record: ${record.path}`);
    }
  }

  const rulesDirectory = join(channelDirectory, "surge", "rules");
  let onDisk;
  try {
    onDisk = (await readdir(rulesDirectory)).filter((name) => name.endsWith(".list")).sort();
  } catch {
    throw new Error(`Missing channel tree or rule directory: ${channel}/surge/rules`);
  }
  const manifestRuleNames = ruleRecords
    .map((record) => record.path.slice("surge/rules/".length))
    .sort();
  if (JSON.stringify(onDisk) !== JSON.stringify(manifestRuleNames)) {
    throw new Error(`Noncanonical rule paths under ${channel}/surge/rules`);
  }

  const catalog = ruleClientCatalog({ adblockMode: "off" });
  const catalogById = new Map(catalog.map((record) => [record.id, record]));
  const plan = [];
  const ruleSets = new Map();
  for (const name of onDisk) {
    const id = name.slice(0, -".list".length);
    const record = catalogById.get(id);
    const manifestRecord = recordsByPath.get(`surge/rules/${name}`);
    if (!record || !manifestRecord) {
      throw new Error(`Noncanonical rule source in manifest: ${id}`);
    }
    let text;
    try {
      text = await readFile(join(rulesDirectory, name), "utf8");
    } catch {
      throw new Error(`Missing published rule file: surge/rules/${name}`);
    }
    const bytes = Buffer.byteLength(text);
    if (bytes !== manifestRecord.bytes || artifactSha256(text) !== manifestRecord.sha256) {
      throw new Error(`Noncanonical rule bytes: surge/rules/${name}`);
    }
    const parsed = parseSurgeRules(text, { id, inputFormat: "RULE-SET", minEntries: 0 });
    plan.push(record);
    ruleSets.set(id, parsed);
  }
  return Object.freeze({ plan, ruleSets });
}

export async function explainRouteMain(args, { publicRoot = join(repositoryRoot, "public") } = {}) {
  const options = parseExplainArguments(args);
  const { plan, ruleSets } = await loadChannelRules({ channel: options.channel, publicRoot });
  return explainRoute({ domain: options.domain, ip: options.ip, plan, ruleSets });
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  explainRouteMain(process.argv.slice(2))
    .then((explanation) => {
      process.stdout.write(`${JSON.stringify(explanation, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
