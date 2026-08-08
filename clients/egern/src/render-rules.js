import { ruleClientCatalog } from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { PUBLIC_RULE_ROOT } from "./options.js";

const CUSTOM_FIELDS = Object.freeze(["block", "direct", "proxy", "ai"]);
const CUSTOM_POLICIES = Object.freeze({
  block: "REJECT",
  direct: "DIRECT",
  proxy: "🚀 节点选择",
  ai: "🤖 AI 专用",
});
const RULE_TYPES = Object.freeze({
  DOMAIN: "domain",
  "DOMAIN-SUFFIX": "domain_suffix",
  "DOMAIN-KEYWORD": "domain_keyword",
  "IP-CIDR": "ip_cidr",
  "IP-CIDR6": "ip_cidr6",
});
const UNSAFE_TEXT = /[\u0000-\u0020,\u007f-\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/u;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u;
const CUSTOM_ERROR = "Invalid Egern custom rule configuration";

const LOCAL_RULES = Object.freeze([
  Object.freeze({ domain_suffix: Object.freeze({ match: "local", policy: "DIRECT" }) }),
  Object.freeze({ domain_suffix: Object.freeze({ match: "home.arpa", policy: "DIRECT" }) }),
  Object.freeze({ domain_suffix: Object.freeze({ match: "lan", policy: "DIRECT" }) }),
  ...[
    ["ip_cidr", "10.0.0.0/8"],
    ["ip_cidr", "100.64.0.0/10"],
    ["ip_cidr", "127.0.0.0/8"],
    ["ip_cidr", "169.254.0.0/16"],
    ["ip_cidr", "172.16.0.0/12"],
    ["ip_cidr", "192.168.0.0/16"],
    ["ip_cidr", "224.0.0.0/4"],
    ["ip_cidr6", "::1/128"],
    ["ip_cidr6", "fc00::/7"],
    ["ip_cidr6", "fe80::/10"],
    ["ip_cidr6", "ff00::/8"],
  ].map(([type, match]) => Object.freeze({
    [type]: Object.freeze({ match, policy: "DIRECT", no_resolve: true }),
  })),
]);

const SECURITY_IDS = new Set(["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"]);
const DOMESTIC_IDS = Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]);
const OVERSEAS_GAME_ID = "OverseasGame";
const CHINA_IP_ID = "ChinaIP";

function invalidCustom() {
  throw new Error(CUSTOM_ERROR);
}

function ownDataRecord(value, expectedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalidCustom();
  let keys;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalidCustom();
    keys = Reflect.ownKeys(value);
  } catch {
    invalidCustom();
  }
  if (keys.length !== expectedKeys.length) invalidCustom();
  const result = new Map();
  for (const key of keys) {
    if (typeof key !== "string" || !expectedKeys.includes(key)) invalidCustom();
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      invalidCustom();
    }
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) invalidCustom();
    result.set(key, descriptor.value);
  }
  if (result.size !== expectedKeys.length) invalidCustom();
  return result;
}

function ownArray(value) {
  let prototype;
  let keys;
  let lengthDescriptor;
  try {
    if (!Array.isArray(value)) invalidCustom();
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch {
    invalidCustom();
  }
  if (
    prototype !== Array.prototype
    || !lengthDescriptor
    || "get" in lengthDescriptor
    || "set" in lengthDescriptor
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
  ) invalidCustom();

  const length = lengthDescriptor.value;
  const itemKeys = [];
  for (const key of keys) {
    if (key === "length") continue;
    if (
      typeof key !== "string"
      || !/^(?:0|[1-9][0-9]*)$/u.test(key)
      || Number(key) >= length
    ) invalidCustom();
    itemKeys.push(key);
  }
  if (itemKeys.length !== length) invalidCustom();

  const result = [];
  for (let index = 0; index < length; index += 1) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      invalidCustom();
    }
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) invalidCustom();
    result.push(descriptor.value);
  }
  return result;
}

function validDomain(value) {
  if (value.length > 253 || value.startsWith(".") || value.endsWith(".")) return false;
  const labels = value.split(".");
  return labels.every((label) => DOMAIN_LABEL.test(label));
}

function validIpv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => (
    /^(?:0|[1-9][0-9]{0,2})$/u.test(part) && Number(part) <= 255
  ));
}

function ipv6UnitCount(value) {
  if (value.length === 0) return 0;
  const parts = value.split(":");
  let units = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.includes(".")) {
      if (index !== parts.length - 1 || !validIpv4(part)) return -1;
      units += 2;
    } else if (/^[0-9A-Fa-f]{1,4}$/u.test(part)) {
      units += 1;
    } else {
      return -1;
    }
  }
  return units;
}

function validIpv6(value) {
  if (value.length === 0 || value.includes("%")) return false;
  const compressed = value.indexOf("::");
  if (compressed !== value.lastIndexOf("::")) return false;
  if (compressed < 0) return ipv6UnitCount(value) === 8;
  const left = value.slice(0, compressed);
  const right = value.slice(compressed + 2);
  if (left.includes(".")) return false;
  const leftUnits = ipv6UnitCount(left);
  const rightUnits = ipv6UnitCount(right);
  return leftUnits >= 0 && rightUnits >= 0 && leftUnits + rightUnits < 8;
}

function validCidr(value, version) {
  const parts = value.split("/");
  if (parts.length !== 2 || !/^(?:0|[1-9][0-9]{0,2})$/u.test(parts[1])) return false;
  const prefix = Number(parts[1]);
  return version === 4
    ? prefix <= 32 && validIpv4(parts[0])
    : prefix <= 128 && validIpv6(parts[0]);
}

function validValue(type, value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || UNSAFE_TEXT.test(value)) {
    return false;
  }
  if (type === "DOMAIN" || type === "DOMAIN-SUFFIX") return validDomain(value);
  if (type === "DOMAIN-KEYWORD") return /^[A-Za-z0-9._-]+$/u.test(value);
  if (type === "IP-CIDR") return validCidr(value, 4);
  if (type === "IP-CIDR6") return validCidr(value, 6);
  return false;
}

function parseCustomRule(rule) {
  if (typeof rule !== "string" || rule.trim() !== rule || /[\r\n]/u.test(rule)) invalidCustom();
  const parts = rule.split(",");
  if (parts.length !== 2 || !Object.hasOwn(RULE_TYPES, parts[0]) || !validValue(parts[0], parts[1])) {
    invalidCustom();
  }
  return { type: parts[0], value: parts[1] };
}

export function renderEgernCustomRules(customRules) {
  const fields = ownDataRecord(customRules, CUSTOM_FIELDS);
  const seen = new Set();
  const rendered = [];
  for (const field of CUSTOM_FIELDS) {
    for (const rule of ownArray(fields.get(field))) {
      const { type, value } = parseCustomRule(rule);
      const identity = `${type},${value.toLowerCase()}`;
      if (seen.has(identity)) invalidCustom();
      seen.add(identity);
      const body = { match: value, policy: CUSTOM_POLICIES[field] };
      if (type === "IP-CIDR" || type === "IP-CIDR6") body.no_resolve = true;
      rendered.push({ [RULE_TYPES[type]]: body });
    }
  }
  return rendered;
}

function validatedOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Invalid Egern public rule base");
  }
  const descriptors = new Map();
  try {
    for (const key of ["publicBaseUrl", "adblockMode"]) {
      descriptors.set(key, Object.getOwnPropertyDescriptor(options, key));
    }
  } catch {
    throw new Error("Invalid Egern public rule base");
  }
  const baseDescriptor = descriptors.get("publicBaseUrl");
  const adblockDescriptor = descriptors.get("adblockMode");
  const base = baseDescriptor?.value;
  const adblockMode = adblockDescriptor?.value;
  if (
    !baseDescriptor || "get" in baseDescriptor || "set" in baseDescriptor
    || (base !== `${PUBLIC_RULE_ROOT}/edge` && base !== `${PUBLIC_RULE_ROOT}/current`)
    || !adblockDescriptor || "get" in adblockDescriptor || "set" in adblockDescriptor
    || (adblockMode !== "off" && adblockMode !== "full")
  ) {
    throw new Error("Invalid Egern public rule base");
  }
  return { ruleBase: `${base}/egern/rules`, adblockMode };
}

export function renderEgernRules(options) {
  const { ruleBase, adblockMode } = validatedOptions(options);
  const catalog = ruleClientCatalog({ adblockMode });
  const optionalBase = adblockMode === "full"
    ? ruleBase.replace(/\/egern\/rules$/u, "/optional/adblock-full/egern/rules")
    : null;
  const byId = new Map();
  for (const source of catalog) {
    if (byId.has(source.id)) throw new Error("Invalid Egern rule catalog");
    byId.set(source.id, source);
  }

  const renderRemote = (source) => ({
    rule_set: {
      match: `${SECURITY_IDS.has(source.id) && ["Advertising", "Advertising_Domain"].includes(source.id) ? optionalBase : ruleBase}/${source.id}.yaml`,
      policy: source.policy,
      update_interval: 86400,
    },
  });

  const rules = [...LOCAL_RULES.map((rule) => structuredClone(rule))];
  rules.push(...catalog.filter(({ id }) => SECURITY_IDS.has(id)).map(renderRemote));
  rules.push(...renderEgernCustomRules(CUSTOM_RULES));
  for (const id of DOMESTIC_IDS) {
    const source = byId.get(id);
    if (!source) throw new Error("Invalid Egern rule catalog");
    rules.push(renderRemote(source));
  }
  for (const source of catalog) {
    if (SECURITY_IDS.has(source.id) || DOMESTIC_IDS.includes(source.id) || [OVERSEAS_GAME_ID, CHINA_IP_ID].includes(source.id)) continue;
    rules.push(renderRemote(source));
  }
  for (const id of [OVERSEAS_GAME_ID, CHINA_IP_ID]) {
    const source = byId.get(id);
    if (!source) throw new Error("Invalid Egern rule catalog");
    rules.push(renderRemote(source));
  }
  rules.push(
    { geoip: { match: "CN", policy: "DIRECT" } },
    { default: { policy: "🚀 节点选择" } },
  );
  return rules;
}
