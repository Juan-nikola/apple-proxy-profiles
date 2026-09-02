/**
 * Sub-Store task URL self-checker.
 *
 * Validates the `#`-parameter fragment of a Sub-Store File/Script-Operator
 * task URL against the option schema of the referenced generator. Runs fully
 * offline (no network), so it can be used before pasting a task into
 * Sub-Store or while debugging a misbehaving task.
 *
 * Usage:
 *   node scripts/check-substore-task.mjs '<task-url>' [more urls...]
 *   echo '<url>' | node scripts/check-substore-task.mjs --stdin
 */

import { fileURLToPath, pathToFileURL } from "node:url";

import { OPTION_VALUES } from "../shared/contracts.js";
import { validateCollectionName } from "../shared/substore/collection-name.js";

const PUBLIC_BASE = "juan-nikola.github.io/apple-proxy-profiles";

/** Generator identifier -> option schema. */
const COMMON_ENUM_KEYS = Object.freeze([
  "dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode",
  "ipv6Mode", "autoGroupMode", "clientChain",
]);

const CHANNELS = Object.freeze(["edge", "current", "previous"]);
const REGIONS = Object.freeze(["cn", "global", "ru", "ir"]);
const ADBLOCK_MODES = Object.freeze(["off", "full"]);
const PROFILE_MODES = Object.freeze(["light", "diagnostic"]);
const NODE_ERROR_MODES = Object.freeze(["strict", "compatible"]);

const GENERATOR_SCHEMAS = Object.freeze({
  "shadowrocket/scripts/shadowrocket-node-subscription.js": nodeSchema(),
  "shadowrocket/scripts/shadowrocket-profile-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad"],
    requiresSubscriptionName: true,
  }),
  "egern/scripts/egern-node-generator.js": nodeSchema(),
  "egern/scripts/egern-profile-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad"],
    requiresNodeSubscriptionUrl: true,
    omitKeys: ["subscriptionName"],
  }),
  "anywhere/scripts/anywhere-node-generator.js": nodeSchema(),
  "anywhere/scripts/anywhere-strategy-generator.js": strategySchema(),
  "anywhere/scripts/substore-strategy-generator.js": strategySchema(),
  "surge/scripts/surge-nodes-generator.js": nodeSchema(),
  "surge/scripts/surge-profile-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad"],
    requiresSubscriptionName: true,
  }),
  "sing-box/scripts/sing-box-config-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad", "android"],
    requiresSubscriptionName: true,
    rejectFullAdblockPlatforms: ["iphone", "ipad", "android"],
    extraKeys: ["profileMode", "nodeErrorMode"],
    extraEnums: {
      profileMode: PROFILE_MODES,
      nodeErrorMode: NODE_ERROR_MODES,
    },
  }),
  "v2box/scripts/substore-node-generator.js": nodeSchema(),
  "v2box/scripts/substore-config-generator.js": configSchema({
    platforms: ["iphone", "ipad"],
    extraKeys: ["region"],
    extraEnums: { region: REGIONS },
    omitKeys: ["autoGroupMode"],
  }),
  "clash/scripts/substore-node-generator.js": nodeSchema(),
  "clash/scripts/clash-node-generator.js": nodeSchema(),
  "clash/scripts/substore-profile-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad", "appletv"],
    requiresSubscriptionName: true,
    requiresNodeSubscriptionUrl: true,
  }),
  "clash/scripts/clash-profile-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad", "appletv"],
    requiresSubscriptionName: true,
    requiresNodeSubscriptionUrl: true,
    rejectFullAdblockPlatforms: ["iphone", "ipad", "appletv"],
  }),
  "happ/scripts/happ-config-generator.js": configSchema({
    platforms: ["macos", "iphone", "ipad"],
    omitKeys: ["autoGroupMode", "clientChain"],
  }),
  "incy/scripts/incy-config-generator.js": configSchema({
    platforms: ["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"],
    requiresSubscriptionName: true,
    expectedName: "apple-proxy-incy",
    requiresChannel: true,
    extraKeys: ["adblockMode", "autoGroupMode", "clientChain"],
  }),
});

function nodeSchema() {
  return Object.freeze({
    policyInput: null,
    required: Object.freeze(["output", "type", "name"]),
    allowed: Object.freeze(["output", "type", "name", "clientChain", "channel"]),
    outputValues: Object.freeze(["nodes"]),
    enums: Object.freeze({ clientChain: OPTION_VALUES.clientChain }),
  });
}

function strategySchema() {
  return Object.freeze({
    policyInput: "apple-proxy-policy",
    required: Object.freeze(["output", "type", "name", "channel"]),
    allowed: Object.freeze(["output", "type", "name", "channel"]),
    outputValues: Object.freeze(["strategy"]),
    enums: Object.freeze({}),
  });
}

function configSchema({
  output = "config",
  platforms,
  requiresSubscriptionName = false,
  requiresNodeSubscriptionUrl = false,
  requiresChannel = false,
  expectedName = null,
  rejectFullAdblockPlatforms = [],
  extraKeys = [],
  extraEnums = {},
  omitKeys = [],
}) {
  const omitted = new Set(omitKeys);
  const allowed = [
    "output", "type", "name", "subscriptionName", "nodeSubscriptionUrl", "platform",
    "channel", "adblockMode", ...COMMON_ENUM_KEYS, ...extraKeys,
  ].filter((key) => !omitted.has(key));
  const required = [
    "output", "type", "name", "platform",
    ...(requiresSubscriptionName ? ["subscriptionName"] : []),
    ...(requiresChannel ? ["channel"] : []),
    ...(requiresNodeSubscriptionUrl ? ["nodeSubscriptionUrl"] : []),
  ];
  return Object.freeze({
    policyInput: "apple-proxy-policy",
    required: Object.freeze(required),
    allowed: Object.freeze(allowed),
    outputValues: Object.freeze([output]),
    platforms: Object.freeze(platforms),
    expectedName,
    rejectFullAdblockPlatforms: Object.freeze(rejectFullAdblockPlatforms),
    enums: Object.freeze({
      dnsMode: OPTION_VALUES.dnsMode,
      chinaDns: OPTION_VALUES.chinaDns,
      globalDns: OPTION_VALUES.globalDns,
      blockMode: OPTION_VALUES.blockMode,
      quicMode: OPTION_VALUES.quicMode,
      ipv6Mode: OPTION_VALUES.ipv6Mode,
      autoGroupMode: OPTION_VALUES.autoGroupMode,
      clientChain: OPTION_VALUES.clientChain,
      ...extraEnums,
    }),
  });
}

function xraySchema(output) {
  return Object.freeze({
    policyInput: "apple-proxy-policy",
    required: Object.freeze(["output", "type", "name"]),
    allowed: Object.freeze([
      "output", "type", "name", "channel", "dnsMode", "chinaDns", "globalDns",
      "blockMode", "quicMode", "ipv6Mode", "clientChain", "clientChainTarget", "policyOverrides",
    ]),
    outputValues: Object.freeze([output]),
    enums: Object.freeze({
      dnsMode: OPTION_VALUES.dnsMode,
      chinaDns: OPTION_VALUES.chinaDns,
      globalDns: OPTION_VALUES.globalDns,
      blockMode: OPTION_VALUES.blockMode,
      quicMode: OPTION_VALUES.quicMode,
      ipv6Mode: OPTION_VALUES.ipv6Mode,
      clientChain: OPTION_VALUES.clientChain,
    }),
  });
}

function parseHashParams(fragment) {
  if (typeof fragment !== "string" || fragment.length === 0) return Object.freeze({});
  const values = {};
  for (const pair of fragment.split("&")) {
    if (pair === "") continue;
    if (!pair.includes("=")) throw new Error(`Parameter '${pair}' is missing '='`);
    const separator = pair.indexOf("=");
    const key = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (key === "") throw new Error("Parameter has an empty key");
    if (Object.hasOwn(values, key)) throw new Error(`Parameter '${key}' is duplicated`);
    values[key] = value;
  }
  return Object.freeze(values);
}

export function parseTaskUrl(raw) {
  if (typeof raw !== "string" || raw.trim() === "") throw new Error("Task URL is empty");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Task URL is not a valid URL");
  }
  if (url.protocol !== "https:") throw new Error("Task URL must use https:");
  if (url.search !== "") throw new Error("Task URL must not use '?'; Sub-Store parameters go after '#'");
  if (!url.pathname.endsWith(".js")) throw new Error("Task URL must point to a .js generator script");
  if (url.hash === "") throw new Error("Task URL is missing its '#...' parameter fragment");
  const scriptPath = url.pathname.replace(/^\//u, "");
  const params = parseHashParams(url.hash.replace(/^#/u, ""));
  return Object.freeze({ url, scriptPath, params });
}

export function checkTaskOptions(schema, params) {
  const errors = [];
  const expectedName = schema.expectedName ?? null;
  for (const key of Object.keys(params)) {
    if (!schema.allowed.includes(key)) {
      errors.push(`Unknown option '${key}' (allowed: ${schema.allowed.join(", ")})`);
      continue;
    }
    const enumValues = schema.enums[key];
    if (enumValues && !enumValues.includes(params[key])) {
      errors.push(`Option '${key}' has unsupported value '${params[key]}' (allowed: ${enumValues.join(", ")})`);
    }
    if (key === "channel" && !CHANNELS.includes(params[key])) {
      errors.push(`Option 'channel' has unsupported value '${params[key]}' (allowed: ${CHANNELS.join(", ")})`);
    }
    if (key === "adblockMode" && !ADBLOCK_MODES.includes(params[key])) {
      errors.push(`Option 'adblockMode' has unsupported value '${params[key]}' (allowed: ${ADBLOCK_MODES.join(", ")})`);
    }
    if (key === "platform" && schema.platforms && !schema.platforms.includes(params[key])) {
      errors.push(`Option 'platform' has unsupported value '${params[key]}' (allowed: ${schema.platforms.join(", ")})`);
    }
    if (key === "output" && !schema.outputValues.includes(params[key])) {
      errors.push(`Option 'output' has unsupported value '${params[key]}' (expected: ${schema.outputValues.join(", ")})`);
    }
    if (key === "name") {
      try {
        validateCollectionName(params[key], "Option 'name'");
      } catch (error) {
        errors.push(error.message);
        continue;
      }
      if (expectedName !== null && params[key] !== expectedName) {
        errors.push(`Option 'name' has unsupported value '${params[key]}' (expected: ${expectedName})`);
      }
    }
    if (key === "subscriptionName" && /[\r\n]/u.test(params[key])) {
      errors.push("Option 'subscriptionName' must not contain line breaks");
    }
  }
  for (const key of schema.required) {
    if (!Object.hasOwn(params, key)) errors.push(`Missing required option '${key}'`);
  }
  if (params.adblockMode === "full" && schema.rejectFullAdblockPlatforms?.includes(params.platform)) {
    errors.push(`Option 'adblockMode=full' is not supported on ${params.platform} because of the mobile client memory budget`);
  }
  return Object.freeze(errors);
}

const PUBLISHED_CHANNELS = Object.freeze(["current", "edge", "previous"]);

function normalizeScriptPath(scriptPath) {
  const segments = scriptPath.split("/");
  const channelIndex = segments.findIndex((segment) => PUBLISHED_CHANNELS.includes(segment));
  if (channelIndex >= 0 && channelIndex + 1 < segments.length) {
    return segments.slice(channelIndex + 1).join("/");
  }
  return scriptPath;
}

export function getSubstoreTaskSchema(scriptPath) {
  return GENERATOR_SCHEMAS[normalizeScriptPath(scriptPath)] ?? null;
}

export function checkSubstoreTaskUrl(raw) {
  const parsed = parseTaskUrl(raw);
  const generatorPath = normalizeScriptPath(parsed.scriptPath);
  const generator = getSubstoreTaskSchema(generatorPath);
  if (!generator) {
    return Object.freeze({
      ok: false,
      taskUrl: raw,
      scriptPath: parsed.scriptPath,
      errors: Object.freeze(["Unknown generator script path; it is not a known public generator"]),
    });
  }
  if (parsed.url.hostname !== PUBLIC_BASE && !parsed.url.hostname.endsWith(".github.io")) {
    return Object.freeze({
      ok: false,
      taskUrl: raw,
      scriptPath: parsed.scriptPath,
      errors: Object.freeze([`Unexpected publication host '${parsed.url.hostname}'; expected ${PUBLIC_BASE} or a personal *.github.io fork`]),
    });
  }
  const errors = [...checkTaskOptions(generator, parsed.params)];
  const pathChannel = parsed.scriptPath.split("/").find((segment) => PUBLISHED_CHANNELS.includes(segment));
  if (pathChannel && parsed.params.channel && parsed.params.channel !== pathChannel) {
    errors.push(`Option 'channel' must match the publication path '${pathChannel}'`);
  }
  return Object.freeze({
    ok: errors.length === 0,
    taskUrl: raw,
    scriptPath: parsed.scriptPath,
    errors,
  });
}

function writeResult(result) {
  const status = result.ok ? "OK" : "ERROR";
  process.stdout.write(`${status}: ${result.scriptPath}\n`);
  if (result.errors.length === 0) {
    process.stdout.write("  Task URL parameters are valid.\n");
  } else {
    for (const error of result.errors) process.stdout.write(`  - ${error}\n`);
  }
}

async function main(args) {
  let urls = args.filter((arg) => arg !== "--stdin");
  const useStdin = args.includes("--stdin");
  if (useStdin) {
    const input = await new Promise((resolvePromise) => {
      let buffer = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { buffer += chunk; });
      process.stdin.on("end", () => resolvePromise(buffer));
    });
    urls = [...urls, ...input.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)];
  }
  if (urls.length === 0) {
    throw new Error("Usage: node scripts/check-substore-task.mjs '<task-url>' [more urls...] (or --stdin)");
  }
  let allOk = true;
  for (const url of urls) {
    try {
      const result = checkSubstoreTaskUrl(url);
      writeResult(result);
      if (!result.ok) allOk = false;
    } catch (error) {
      process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
      allOk = false;
    }
  }
  if (!allOk) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
