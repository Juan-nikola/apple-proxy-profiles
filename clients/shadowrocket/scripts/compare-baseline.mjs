import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

import { expandLegacyAdvertisingProfile } from "./compatibility-advertising.mjs";

const DEFAULT_BASELINE_DIR = "/Users/sunyuze/Documents/代理软件/shadowrocket-profile";
const PROFILE_NAMES = Object.freeze(["macos", "iphone", "ipad"]);
const BUNDLES = Object.freeze([
  Object.freeze({ kind: "node", current: "shadowrocket-node-operator.js", baseline: "substore-node-operator.js" }),
  Object.freeze({ kind: "profile", current: "shadowrocket-profile-generator.js", baseline: "substore-profile-generator.js" }),
]);
const WORKER_URL = new URL("./compare-bundle-worker.mjs", import.meta.url);

const PROFILE_ARGUMENTS = Object.freeze({
  output: "config",
  type: "collection",
  name: "synthetic-collection",
  subscriptionName: "Synthetic-Nodes",
  platform: "macos",
});

const PROFILE_OPTION_VALUES = Object.freeze({
  output: Object.freeze(["config"]),
  type: Object.freeze(["collection"]),
  platform: Object.freeze(["iphone", "ipad", "macos", "appletv"]),
  dnsMode: Object.freeze(["stable", "privacy", "speed"]),
  chinaDns: Object.freeze(["alidns", "dnspod", "system"]),
  globalDns: Object.freeze(["cloudflare", "google", "quad9"]),
  blockMode: Object.freeze(["balanced", "security", "strict", "off"]),
  quicMode: Object.freeze(["allow", "proxy-block", "all-block"]),
  ipv6Mode: Object.freeze(["auto", "ipv4-only"]),
  autoGroupMode: Object.freeze(["auto", "full", "balanced", "minimal"]),
  clientChain: Object.freeze(["off", "on"]),
});

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

function isValidIsoTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  if (zone === "Z") return true;
  const offsetHour = Number(offsetHourText);
  const offsetMinute = Number(offsetMinuteText);
  return offsetMinute <= 59 && offsetHour <= 14 && (offsetHour < 14 || offsetMinute === 0);
}

function normalizeGeneratedTimestamp(header) {
  return header.replace(/^(# generated-at=)([^\r\n]*)(\r?\n|$)/gim, (line, prefix, value, ending) => (
    isValidIsoTimestamp(value) ? `${prefix}<TIMESTAMP>${ending}` : line
  ));
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

    let expectedCurrentSection;
    try {
      expectedCurrentSection = expandLegacyAdvertisingProfile(baselineSection);
    } catch {
      assert.fail(`${label}: rollback baseline has an invalid Advertising migration contract`);
    }
    assert.equal(
      currentSection === expectedCurrentSection,
      true,
      `${label}: approved Advertising replacement or Advertising_Domain companion is absent or altered`,
    );
  }
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
  };
}

function acceptedScenario(name, argumentsValue, input, extra = {}) {
  return { name, expectedStatus: "fulfilled", arguments: argumentsValue, input, ...extra };
}

function rejectedScenario(name, argumentsValue, input, extra = {}) {
  return { name, expectedStatus: "rejected", arguments: argumentsValue, input, ...extra };
}

function nodeScenarios() {
  const input = [syntheticNode()];
  return [
    acceptedScenario("accepts required arguments", { output: "nodes" }, input),
    acceptedScenario("accepts explicit clientChain off", { output: "nodes", clientChain: "off" }, input),
    acceptedScenario("accepts explicit clientChain on and private key", { output: "nodes", clientChain: "on", _trace: "synthetic" }, input),
    rejectedScenario("rejects missing output", {}, input),
    rejectedScenario("rejects config output", { output: "config" }, input),
    rejectedScenario("rejects empty output", { output: "" }, input),
    rejectedScenario("rejects whitespace output", { output: " nodes " }, input),
    rejectedScenario("rejects boolean output", { output: false }, input),
    rejectedScenario("rejects array output", { output: [] }, input),
    rejectedScenario("rejects unknown argument", { output: "nodes", unknown: true }, input),
    rejectedScenario("rejects invalid clientChain", { output: "nodes", clientChain: "invalid" }, input),
    rejectedScenario("rejects empty clientChain", { output: "nodes", clientChain: "" }, input),
    rejectedScenario("rejects whitespace clientChain", { output: "nodes", clientChain: "on " }, input),
    rejectedScenario("rejects boolean clientChain", { output: "nodes", clientChain: false }, input),
    rejectedScenario("rejects array clientChain", { output: "nodes", clientChain: [] }, input),
    rejectedScenario("rejects null arguments", null, input),
    rejectedScenario("rejects string arguments", "nodes", input),
    rejectedScenario("rejects numeric arguments", 0, input),
    rejectedScenario("rejects boolean arguments", false, input),
    rejectedScenario("rejects array arguments", [], input),
  ];
}

function profileScenarios() {
  const input = { url: "https://example.invalid/profile" };
  const scenarios = [
    acceptedScenario("accepts required arguments", PROFILE_ARGUMENTS, input),
    acceptedScenario("accepts internal argument key", { ...PROFILE_ARGUMENTS, _trace: "synthetic" }, input),
    acceptedScenario("accepts trimmed collection name", { ...PROFILE_ARGUMENTS, name: " synthetic-collection " }, input),
    acceptedScenario("accepts CRLF collection name", { ...PROFILE_ARGUMENTS, name: "synthetic\r\ncollection" }, input),
    acceptedScenario("accepts the complete optional combination", {
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
    }, input),
    rejectedScenario("rejects unknown argument", { ...PROFILE_ARGUMENTS, unknown: true }, {}),
    rejectedScenario("rejects null arguments", null, {}),
    rejectedScenario("rejects string arguments", "config", {}),
    rejectedScenario("rejects numeric arguments", 0, {}),
    rejectedScenario("rejects boolean arguments", false, {}),
    rejectedScenario("rejects array arguments", [], {}),
    rejectedScenario("rejects empty artifacts", PROFILE_ARGUMENTS, {}, { artifactMode: "empty" }),
    rejectedScenario("rejects unavailable artifact producer", PROFILE_ARGUMENTS, {}, { artifactMode: "unavailable" }),
  ];

  for (const [key, values] of Object.entries(PROFILE_OPTION_VALUES)) {
    for (const value of values) {
      scenarios.push(acceptedScenario(`accepts ${key}=${value}`, { ...PROFILE_ARGUMENTS, [key]: value }, input));
    }
    scenarios.push(acceptedScenario(
      `accepts trimmed ${key}`,
      { ...PROFILE_ARGUMENTS, [key]: ` ${values[0]} ` },
      input,
    ));
  }

  for (const key of ["output", "type", "name", "subscriptionName", "platform"]) {
    const argumentsWithoutKey = { ...PROFILE_ARGUMENTS };
    delete argumentsWithoutKey[key];
    scenarios.push(rejectedScenario(`rejects missing ${key}`, argumentsWithoutKey, {}));
  }

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
    scenarios.push(rejectedScenario(`rejects invalid ${key}`, { ...PROFILE_ARGUMENTS, [key]: value }, {}));
    scenarios.push(rejectedScenario(`rejects primitive ${key}`, { ...PROFILE_ARGUMENTS, [key]: false }, {}));
    scenarios.push(rejectedScenario(`rejects array ${key}`, { ...PROFILE_ARGUMENTS, [key]: [] }, {}));
  }

  for (const [name, overrides] of [
    ["rejects whitespace name", { name: "   " }],
    ["rejects whitespace subscriptionName", { subscriptionName: " Synthetic-Nodes " }],
    ["rejects CRLF subscriptionName", { subscriptionName: "Synthetic-Nodes\r\ninjected" }],
  ]) {
    scenarios.push(rejectedScenario(name, { ...PROFILE_ARGUMENTS, ...overrides }, {}));
  }
  return scenarios;
}

function scenariosFor(kind) {
  if (kind === "node") return nodeScenarios();
  assert.equal(kind, "profile", `Unsupported bundle kind: ${kind}`);
  return profileScenarios();
}

export async function compareBundleSources(
  kind,
  currentSource,
  baselineSource,
  label = `${kind} bundle`,
  { timeoutMs = 10_000 } = {},
) {
  assert.equal(Number.isInteger(timeoutMs) && timeoutMs > 0, true, "Compatibility timeout must be a positive integer");
  const worker = new Worker(WORKER_URL, {
    workerData: {
      kind,
      currentSource,
      baselineSource,
      label,
      scenarios: scenariosFor(kind),
      timeoutMs,
    },
    resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
  });

  await new Promise((resolveWorker, rejectWorker) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => {
      void worker.terminate();
      finish(rejectWorker, new Error(`${label}: compatibility worker timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    worker.once("message", (message) => {
      if (message?.ok) {
        finish(resolveWorker);
      } else {
        const error = new Error(message?.error?.message ?? `${label}: compatibility worker failed`);
        error.name = message?.error?.name ?? "Error";
        finish(rejectWorker, error);
      }
    });
    worker.once("error", (error) => finish(rejectWorker, error));
    worker.once("exit", (code) => {
      if (code !== 0) finish(rejectWorker, new Error(`${label}: compatibility worker exited ${code}`));
    });
  });
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

  for (const { kind, current, baseline } of BUNDLES) {
    const [currentSource, baselineSource] = await Promise.all([
      readFile(resolve(targetDir, "dist", current), "utf8"),
      readFile(resolve(baselineDir, "dist", baseline), "utf8"),
    ]);
    await compareBundleSources(kind, currentSource, baselineSource, current);
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
