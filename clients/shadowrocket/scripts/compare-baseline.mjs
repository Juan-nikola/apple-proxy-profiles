import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const DEFAULT_BASELINE_DIR = "/Users/sunyuze/Documents/代理软件/shadowrocket-profile";
const APPROVED_ADVERTISING = "Advertising/Advertising.list";
const LEGACY_ADVERTISING = "AdvertisingLite/AdvertisingLite.list";
const PROFILE_NAMES = Object.freeze(["macos", "iphone", "ipad"]);
const BUNDLES = Object.freeze([
  Object.freeze({ kind: "node", file: "substore-node-operator.js" }),
  Object.freeze({ kind: "profile", file: "substore-profile-generator.js" }),
]);

function normalizeGeneratedTimestamp(header) {
  return header.replace(
    /^(# generated-at=)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})(\r?\n|$)/gim,
    "$1<TIMESTAMP>$2",
  );
}

export function splitIniSections(source, label = "profile") {
  assert.equal(typeof source, "string", `${label}: profile must be text`);
  const headings = [...source.matchAll(/^\[([^\]\r\n]+)\](?:\r?\n|$)/gm)];
  const sections = new Map();
  const names = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const name = heading[1];
    assert.equal(sections.has(name), false, `${label}: duplicate [${name}] section`);
    const end = headings[index + 1]?.index ?? source.length;
    names.push(name);
    sections.set(name, source.slice(heading.index, end));
  }

  const preambleEnd = headings[0]?.index ?? source.length;
  return { names, preamble: source.slice(0, preambleEnd), sections };
}

function countOccurrences(source, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = source.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

export function compareProfileText(currentSource, baselineSource, label = "profile") {
  const current = splitIniSections(currentSource, `${label} current`);
  const baseline = splitIniSections(baselineSource, `${label} baseline`);

  assert.deepEqual(current.names, baseline.names, `${label}: INI section names or order changed`);
  assert.equal(
    normalizeGeneratedTimestamp(current.preamble),
    normalizeGeneratedTimestamp(baseline.preamble),
    `${label}: generated header changed`,
  );

  for (const name of baseline.names) {
    const currentSection = current.sections.get(name);
    const baselineSection = baseline.sections.get(name);
    if (name !== "Rule") {
      assert.equal(currentSection, baselineSection, `${label}: [${name}] changed`);
      continue;
    }

    assert.equal(
      countOccurrences(currentSection, APPROVED_ADVERTISING) > 0,
      true,
      `${label}: approved Advertising replacement is absent`,
    );
    assert.equal(
      currentSection.replaceAll(APPROVED_ADVERTISING, LEGACY_ADVERTISING),
      baselineSection,
      `${label}: [Rule] contains an unapproved change`,
    );
  }
}

function valueShape(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return { type: "array", items: Array.from(value, (item) => valueShape(item)) };
  }
  if (typeof value === "object") {
    return {
      type: "object",
      entries: Object.keys(value)
        .filter((name) => !name.startsWith("_"))
        .sort()
        .map((name) => [name, valueShape(value[name])]),
    };
  }
  return typeof value;
}

function publicGlobalSignature(context, names) {
  return names.map((name) => {
    const value = context[name];
    if (typeof value === "function") {
      return { name, type: "function", arity: value.length };
    }
    if (value && typeof value === "object") {
      return {
        name,
        type: "object",
        exports: Object.keys(value).sort().map((exportName) => {
          const exported = value[exportName];
          return {
            name: exportName,
            type: typeof exported,
            arity: typeof exported === "function" ? exported.length : null,
          };
        }),
      };
    }
    return { name, type: typeof value };
  });
}

function silentConsole() {
  return Object.freeze({
    error() {},
    info() {},
    log() {},
    warn() {},
  });
}

function loadBundle(source, globals, label) {
  const context = vm.createContext({ ...globals });
  const initialNames = new Set(Object.getOwnPropertyNames(context));
  vm.runInContext(source, context, { filename: label, timeout: 2_000 });
  const addedNames = Object.getOwnPropertyNames(context)
    .filter((name) => !initialNames.has(name))
    .sort();
  return {
    context,
    signature: publicGlobalSignature(context, addedNames),
  };
}

function syntheticNode() {
  return {
    name: "Synthetic Tokyo",
    type: "ss",
    server: "192.0.2.10",
    port: 443,
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_NOT_A_SECRET",
    udp: true,
    _subDisplayName: "[机场]Synthetic",
  };
}

function syntheticInventory() {
  return Array.from({ length: 25 }, (_, index) => ({
    name: `Synthetic ${index + 1}`,
    _profile: {
      id: `synthetic-${index + 1}`,
      continent: "asiaPacific",
      sourceKind: "airport",
      udp: true,
      p2p: false,
      entry: true,
      chained: false,
    },
  }));
}

const PROFILE_ARGUMENTS = Object.freeze({
  output: "config",
  type: "collection",
  name: "synthetic-collection",
  subscriptionName: "Synthetic-Nodes",
  platform: "macos",
});

function scenariosFor(kind) {
  if (kind === "node") {
    return [
      { name: "accepts required arguments", arguments: { output: "nodes" }, input: [syntheticNode()] },
      { name: "accepts clientChain", arguments: { output: "nodes", clientChain: "on", _trace: "synthetic" }, input: [syntheticNode()] },
      { name: "rejects missing output", arguments: {}, input: [syntheticNode()] },
      { name: "rejects invalid output", arguments: { output: "config" }, input: [syntheticNode()] },
      { name: "rejects unknown argument", arguments: { output: "nodes", unknown: true }, input: [syntheticNode()] },
      { name: "rejects invalid clientChain", arguments: { output: "nodes", clientChain: "invalid" }, input: [syntheticNode()] },
      { name: "rejects non-object arguments", arguments: null, input: [syntheticNode()] },
    ];
  }
  assert.equal(kind, "profile", `Unsupported bundle kind: ${kind}`);
  const scenarios = [
    { name: "accepts required arguments", arguments: PROFILE_ARGUMENTS, input: { url: "https://example.invalid/profile" } },
    {
      name: "accepts optional arguments",
      arguments: {
        ...PROFILE_ARGUMENTS,
        platform: "iphone",
        dnsMode: "privacy",
        chinaDns: "dnspod",
        globalDns: "quad9",
        blockMode: "strict",
        quicMode: "all-block",
        ipv6Mode: "ipv4-only",
        autoGroupMode: "full",
        clientChain: "on",
        _trace: "synthetic",
      },
      input: { url: "https://example.invalid/profile" },
    },
    { name: "rejects missing output", arguments: {}, input: {} },
    { name: "rejects unknown argument", arguments: { ...PROFILE_ARGUMENTS, unknown: true }, input: {} },
    { name: "rejects invalid platform", arguments: { ...PROFILE_ARGUMENTS, platform: "invalid" }, input: {} },
    { name: "rejects non-object arguments", arguments: null, input: {} },
    { name: "rejects empty artifacts", arguments: PROFILE_ARGUMENTS, input: {}, artifactMode: "empty" },
    { name: "rejects unavailable artifact producer", arguments: PROFILE_ARGUMENTS, input: {}, artifactMode: "unavailable" },
  ];
  const invalidValues = {
    output: "invalid",
    type: "invalid",
    name: "",
    subscriptionName: "",
    platform: "invalid",
    dnsMode: "invalid",
    chinaDns: "invalid",
    globalDns: "invalid",
    blockMode: "invalid",
    quicMode: "invalid",
    ipv6Mode: "invalid",
    autoGroupMode: "invalid",
    clientChain: "invalid",
  };
  for (const [key, value] of Object.entries(invalidValues)) {
    scenarios.push({
      name: `rejects invalid ${key}`,
      arguments: { ...PROFILE_ARGUMENTS, [key]: value },
      input: {},
    });
  }
  for (const key of ["output", "type", "name", "subscriptionName", "platform"]) {
    const argumentsWithoutKey = { ...PROFILE_ARGUMENTS };
    delete argumentsWithoutKey[key];
    scenarios.push({
      name: `rejects missing ${key}`,
      arguments: argumentsWithoutKey,
      input: {},
    });
  }
  return scenarios;
}

function scenarioGlobals(kind, scenario, artifactRequests) {
  const globals = {
    $arguments: structuredClone(scenario.arguments),
    console: silentConsole(),
    structuredClone,
  };
  if (kind === "profile") {
    globals.produceArtifact = scenario.artifactMode === "unavailable"
      ? undefined
      : async (request) => {
        artifactRequests.push(structuredClone(request));
        return scenario.artifactMode === "empty" ? [] : syntheticInventory();
      };
  }
  return globals;
}

async function characterizeScenario(kind, source, scenario, label) {
  const artifactRequests = [];
  const { context } = loadBundle(
    source,
    scenarioGlobals(kind, scenario, artifactRequests),
    `${label}:${scenario.name}`,
  );
  assert.equal(typeof context.operator, "function", `${label}: operator global is unavailable`);
  try {
    const value = await context.operator(structuredClone(scenario.input), "Shadowrocket");
    return {
      status: "fulfilled",
      shape: valueShape(value),
      artifactRequests,
    };
  } catch (error) {
    return {
      status: "rejected",
      error: {
        name: error?.name ?? typeof error,
        message: error?.message ?? String(error),
      },
      artifactRequests,
    };
  }
}

export async function compareBundleSources(kind, currentSource, baselineSource, label = `${kind} bundle`) {
  const signatureGlobals = kind === "node"
    ? { $arguments: { output: "nodes" }, console: silentConsole(), structuredClone }
    : {
      $arguments: PROFILE_ARGUMENTS,
      console: silentConsole(),
      produceArtifact: async () => syntheticInventory(),
      structuredClone,
    };
  const currentSignature = loadBundle(currentSource, signatureGlobals, `${label}:current`).signature;
  const baselineSignature = loadBundle(baselineSource, signatureGlobals, `${label}:baseline`).signature;
  assert.deepEqual(currentSignature, baselineSignature, `${label}: exported globals or operator arity changed`);

  for (const scenario of scenariosFor(kind)) {
    const current = await characterizeScenario(kind, currentSource, scenario, `${label}:current`);
    const baseline = await characterizeScenario(kind, baselineSource, scenario, `${label}:baseline`);
    assert.deepEqual(current, baseline, `${label}: ${scenario.name} behavior changed`);
  }
}

async function ensureBaselineDirectory(baselineDir) {
  try {
    const details = await stat(baselineDir);
    if (!details.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error("Shadowrocket baseline directory is unavailable");
  }
}

export async function verifyCompatibility({
  baselineDir = process.env.SHADOWROCKET_BASELINE_DIR ?? DEFAULT_BASELINE_DIR,
  targetDir = resolve(import.meta.dirname, ".."),
} = {}) {
  await ensureBaselineDirectory(baselineDir);

  for (const platform of PROFILE_NAMES) {
    const file = `shadowrocket-${platform}.conf`;
    const [currentSource, baselineSource] = await Promise.all([
      readFile(resolve(targetDir, "examples", file), "utf8"),
      readFile(resolve(baselineDir, "examples", file), "utf8"),
    ]);
    compareProfileText(currentSource, baselineSource, file);
  }

  for (const { kind, file } of BUNDLES) {
    const [currentSource, baselineSource] = await Promise.all([
      readFile(resolve(targetDir, "dist", file), "utf8"),
      readFile(resolve(baselineDir, "dist", file), "utf8"),
    ]);
    await compareBundleSources(kind, currentSource, baselineSource, file);
  }
}

const mainPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === mainPath) {
  try {
    await verifyCompatibility();
    console.log("Shadowrocket compatibility verified: 3 profiles, 2 bundles");
  } catch (error) {
    console.error(error?.message ?? error);
    process.exitCode = 1;
  }
}
