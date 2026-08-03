import { OPTION_VALUES } from "../../../shared/contracts.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { POLICY_GROUP_SCHEMA } from "../../../shared/policies/schema.js";
import { renderEgernDns } from "./render-dns.js";
import { renderEgernGroups } from "./render-groups.js";
import { PUBLIC_SNAPSHOT_BASE_URL } from "./options.js";
import { renderEgernRules } from "./render-rules.js";
import { renderYaml } from "./render-yaml.js";

const ROOT_KEYS = Object.freeze([
  "ipv6",
  "block_quic",
  "close_connections_on_policy_change",
  "bypass_tunnel_proxy",
  "real_ip_domains",
  "hijack_dns",
  "dns",
  "policy_groups",
  "rules",
  "default_subscription_group",
]);

const BYPASS_TUNNEL_PROXY = Object.freeze([
  "localhost", "*.local", "*.lan", "*.home.arpa",
  "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4",
  "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
]);
const REAL_IP_DOMAINS = Object.freeze(["*.local", "*.lan", "*.home.arpa", "*.push.apple.com"]);
const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/u;
const NUMBER = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/u;
const MAX_PROFILE_BYTES = 2_000_000;
const MAX_LINES = 50_000;
const MAX_LINE_LENGTH = 32_000;
const MAX_DEPTH = 64;
const LATENCY_TEST_URL = "http://www.gstatic.com/generate_204";
const GROUP_TEST_PRESETS = Object.freeze([
  Object.freeze({ interval: 600, timeout: 5, tolerance: 100 }),
  Object.freeze({ interval: 1800, timeout: 7, tolerance: 150 }),
]);

function yamlError(reason = "malformed or unsupported structure") {
  throw new Error(`Invalid Egern YAML: ${reason}`);
}

function scalar(text) {
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  if (text === "{}") return Object.create(null);
  if (text === "[]") return [];
  if (text.startsWith('"')) {
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      yamlError();
    }
    if (typeof value !== "string" || (typeof value.isWellFormed === "function" && !value.isWellFormed())) {
      yamlError();
    }
    return value;
  }
  if (NUMBER.test(text)) {
    const value = Number(text);
    if (!Number.isFinite(value)) yamlError();
    return value;
  }
  yamlError("unsupported scalar");
}

function splitMapping(text) {
  const colon = text.indexOf(":");
  if (colon < 1) yamlError();
  const key = text.slice(0, colon);
  const remainder = text.slice(colon + 1);
  if (!PLAIN_KEY.test(key) || (remainder.length > 0 && !remainder.startsWith(" "))) yamlError();
  return [key, remainder.length === 0 ? null : remainder.slice(1)];
}

function addEntry(target, key, value) {
  if (Object.hasOwn(target, key)) yamlError("duplicate mapping key");
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function parseDeterministicYaml(profile) {
  if (profile.length === 0 || profile.length > MAX_PROFILE_BYTES || !profile.endsWith("\n")) yamlError();
  if (/\r|\t|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u.test(profile)) yamlError();
  const rawLines = profile.slice(0, -1).split("\n");
  if (rawLines.length === 0 || rawLines.length > MAX_LINES) yamlError();
  const lines = rawLines.map((line) => {
    if (line.length === 0 || line.length > MAX_LINE_LENGTH || / +$/u.test(line)) yamlError();
    const match = /^( *)(.*)$/u.exec(line);
    const indent = match[1].length;
    if (indent % 2 !== 0 || match[2].length === 0) yamlError();
    return { indent, text: match[2] };
  });

  function parseEntry(target, key, remainder, index, childIndent, depth) {
    if (remainder !== null) {
      if (remainder.length === 0) yamlError();
      addEntry(target, key, scalar(remainder));
      return index;
    }
    if (index >= lines.length || lines[index].indent !== childIndent) yamlError();
    const child = parseBlock(index, childIndent, depth + 1);
    addEntry(target, key, child.value);
    return child.index;
  }

  function parseMap(index, indent, depth) {
    const value = Object.create(null);
    while (index < lines.length) {
      const line = lines[index];
      if (line.indent < indent) break;
      if (line.indent !== indent || line.text === "-" || line.text.startsWith("- ")) yamlError();
      const [key, remainder] = splitMapping(line.text);
      index = parseEntry(value, key, remainder, index + 1, indent + 2, depth);
    }
    return { value, index };
  }

  function parseSequence(index, indent, depth) {
    const value = [];
    while (index < lines.length) {
      const line = lines[index];
      if (line.indent < indent) break;
      if (line.indent !== indent) yamlError();
      if (line.text === "-") {
        if (index + 1 >= lines.length || lines[index + 1].indent !== indent + 2) yamlError();
        const child = parseBlock(index + 1, indent + 2, depth + 1);
        value.push(child.value);
        index = child.index;
        continue;
      }
      if (!line.text.startsWith("- ")) break;
      const item = line.text.slice(2);
      if (!/^[A-Za-z_][A-Za-z0-9_-]*:/u.test(item)) {
        value.push(scalar(item));
        index += 1;
        continue;
      }

      const object = Object.create(null);
      const [firstKey, firstRemainder] = splitMapping(item);
      index = parseEntry(object, firstKey, firstRemainder, index + 1, indent + 4, depth);
      while (index < lines.length && lines[index].indent === indent + 2) {
        if (lines[index].text === "-" || lines[index].text.startsWith("- ")) yamlError();
        const [key, remainder] = splitMapping(lines[index].text);
        index = parseEntry(object, key, remainder, index + 1, indent + 4, depth);
      }
      value.push(object);
    }
    return { value, index };
  }

  function parseBlock(index, indent, depth) {
    if (depth > MAX_DEPTH || index >= lines.length || lines[index].indent !== indent) yamlError();
    return lines[index].text === "-" || lines[index].text.startsWith("- ")
      ? parseSequence(index, indent, depth)
      : parseMap(index, indent, depth);
  }

  const parsed = parseBlock(0, 0, 0);
  if (parsed.index !== lines.length) yamlError();
  if (renderYaml(parsed.value) !== profile) yamlError("non-canonical encoding");
  return parsed.value;
}

function sameValue(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameValue(value, right[index]));
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && sameValue(left[key], right[key]));
}

function validateRoot(root) {
  if (root === null || typeof root !== "object" || Array.isArray(root)) throw new Error("Invalid Egern root object");
  const keys = Object.keys(root);
  if (keys.length !== ROOT_KEYS.length || keys.some((key, index) => key !== ROOT_KEYS[index])) {
    throw new Error("Invalid Egern root fields");
  }
  if (
    typeof root.ipv6 !== "boolean"
    || typeof root.block_quic !== "boolean"
    || root.close_connections_on_policy_change !== true
    || !sameValue(root.bypass_tunnel_proxy, BYPASS_TUNNEL_PROXY)
    || !sameValue(root.real_ip_domains, REAL_IP_DOMAINS)
    || !sameValue(root.hijack_dns, ["*"])
    || root.default_subscription_group !== "🚀 节点选择"
  ) throw new Error("Invalid Egern root field values");
}

function validDns(dns) {
  for (const dnsMode of OPTION_VALUES.dnsMode) {
    for (const chinaDns of OPTION_VALUES.chinaDns) {
      for (const globalDns of OPTION_VALUES.globalDns) {
        const expected = renderEgernDns({
          dnsMode,
          chinaDns,
          globalDns,
          publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL,
        });
        if (sameValue(dns, expected)) return true;
      }
    }
  }
  return false;
}

function reconstructGroups(policyGroups) {
  if (!Array.isArray(policyGroups) || policyGroups.length === 0) {
    throw new Error("Invalid Egern policy group schema");
  }
  let nodeSubscriptionUrl;
  const overrides = new Set();
  const stripped = [];
  const shared = [];

  for (const record of policyGroups) {
    if (record === null || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("Invalid Egern policy group schema");
    }
    const wrapperKeys = Object.keys(record);
    if (wrapperKeys.length !== 1 || !["select", "auto_test", "fallback"].includes(wrapperKeys[0])) {
      throw new Error("Invalid Egern policy group schema");
    }
    const type = wrapperKeys[0];
    const originalFields = record[type];
    if (originalFields === null || typeof originalFields !== "object" || Array.isArray(originalFields)) {
      throw new Error("Invalid Egern policy group schema");
    }
    const fields = { ...originalFields };
    if (Object.hasOwn(fields, "block_quic")) {
      if (fields.block_quic !== true || typeof fields.name !== "string" || overrides.has(fields.name)) {
        throw new Error("Invalid Egern policy group QUIC schema");
      }
      overrides.add(fields.name);
      delete fields.block_quic;
    }
    stripped.push({ [type]: fields });

    if (typeof fields.name !== "string" || !Object.hasOwn(POLICY_GROUP_SCHEMA.groups, fields.name)) {
      throw new Error("Invalid Egern policy group schema");
    }
    const schema = POLICY_GROUP_SCHEMA.groups[fields.name];
    const strategy = type === "auto_test" ? "auto-test" : type;
    const candidates = fields.name === "🚀 节点选择"
      ? [POLICY_TARGET.primaryProxy]
      : (fields.policies ?? []);
    const nodeFilter = fields.name !== "🚀 节点选择" && fields.urls !== undefined
      ? fields.filter
      : null;
    let test = null;
    if (type === "auto_test") {
      test = {
        url: fields.latency_test_url,
        interval: fields.interval,
        timeout: fields.timeout,
        tolerance: fields.tolerance,
      };
    } else if (type === "fallback") {
      test = {
        url: fields.latency_test_url,
        interval: fields.interval,
        timeout: fields.timeout,
        tolerance: 0,
      };
    }
    shared.push({
      kind: schema.kind,
      name: fields.name,
      strategy,
      candidates,
      nodeFilter,
      test,
      hidden: fields.hidden,
      defaultChoice: schema.defaultChoice,
    });
    if (fields.name === "🚀 节点选择") {
      if (!Array.isArray(fields.urls) || fields.urls.length !== 1 || typeof fields.urls[0] !== "string") {
        throw new Error("Invalid Egern policy group subscription URL");
      }
      nodeSubscriptionUrl = fields.urls[0];
    }
  }
  if (nodeSubscriptionUrl === undefined) throw new Error("Invalid Egern policy group schema");

  let canonical;
  try {
    canonical = renderEgernGroups(shared, nodeSubscriptionUrl);
  } catch {
    throw new Error("Invalid Egern policy group schema");
  }
  if (!sameValue(stripped, canonical)) throw new Error("Invalid Egern policy group order or schema");
  const validPreset = GROUP_TEST_PRESETS.some((preset) => stripped.every((record) => {
    const [type] = Object.keys(record);
    const fields = record[type];
    if (type === "auto_test") {
      return fields.latency_test_url === LATENCY_TEST_URL
        && fields.interval === preset.interval
        && fields.timeout === preset.timeout
        && fields.tolerance === preset.tolerance;
    }
    if (type === "fallback") {
      return fields.latency_test_url === LATENCY_TEST_URL
        && fields.interval === preset.interval
        && fields.timeout === preset.timeout;
    }
    return true;
  }));
  if (!validPreset) throw new Error("Invalid Egern policy group platform settings");
  return { shared, overrides };
}

function proxyDefaultGroupNames(groups) {
  const byName = new Map(groups.map((group) => [group.name, group]));
  const memo = new Map();
  const active = new Set();
  const followsProxy = (name) => {
    if (name === POLICY_TARGET.primaryProxy) return true;
    if (name === "DIRECT" || name === "REJECT") return false;
    if (memo.has(name)) return memo.get(name);
    if (active.has(name) || !byName.has(name)) throw new Error("Invalid Egern policy group graph");
    active.add(name);
    const group = byName.get(name);
    let result;
    if (group.defaultChoice !== undefined) result = followsProxy(group.defaultChoice);
    else if (group.candidates.length > 0) result = followsProxy(group.candidates[0]);
    else result = group.nodeFilter !== null;
    active.delete(name);
    memo.set(name, result);
    return result;
  };
  return new Set(groups.filter((group) => followsProxy(group.name)).map((group) => group.name));
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function validateQuic(root, groups, overrides) {
  if (root.block_quic) {
    if (overrides.size !== 0) throw new Error("Invalid Egern policy group QUIC schema");
    return;
  }
  if (overrides.size === 0) return;
  if (!sameSet(overrides, proxyDefaultGroupNames(groups))) {
    throw new Error("Invalid Egern policy group QUIC schema");
  }
}

function validateParsedProfile(root) {
  validateRoot(root);
  if (!validDns(root.dns)) throw new Error("Invalid Egern DNS schema or rule URL");
  const groups = reconstructGroups(root.policy_groups);
  validateQuic(root, groups.shared, groups.overrides);
  const expectedRules = renderEgernRules({ publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL });
  if (!sameValue(root.rules, expectedRules)) throw new Error("Invalid Egern rule catalog, order, policy, or URL");
}

export function validateEgernProfile(profile) {
  if (typeof profile !== "string") {
    return { valid: false, errors: ["Egern profile must be a string"] };
  }
  try {
    const root = parseDeterministicYaml(profile);
    validateParsedProfile(root);
    return { valid: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error && /^Invalid Egern /u.test(error.message)
      ? error.message
      : "Invalid Egern profile structure";
    return { valid: false, errors: [message] };
  }
}

export function assertValidEgernProfile(profile) {
  if (!validateEgernProfile(profile).valid) {
    throw new Error("Generated Egern profile failed validation");
  }
}
