export const POLICY_DEFAULTS = Object.freeze({
  "🤖 AI 专用": "FOLLOW",
  "🐙 GitHub": "FOLLOW",
  "📺 YouTube": "FOLLOW",
  "🎬 海外流媒体": "FOLLOW",
  "💬 海外社交": "FOLLOW",
  "🍎 Apple": "DIRECT",
  "🪟 Microsoft": "DIRECT",
  "🇨🇳 国内平台": "DIRECT",
  "🌍 海外游戏": "FOLLOW",
  "⬇️ 下载/P2P": "DIRECT",
  "🧭 DNS 与规则下载": "FOLLOW",
  "最终兜底": "FOLLOW",
});

const POLICY_KEYS = Object.freeze([
  ["🤖 AI 专用", ["AI 专用", "ai"]],
  ["🐙 GitHub", ["GitHub", "github"]],
  ["📺 YouTube", ["YouTube", "youtube"]],
  ["🎬 海外流媒体", ["海外流媒体", "globalMedia"]],
  ["💬 海外社交", ["海外社交", "globalSocial"]],
  ["🍎 Apple", ["Apple", "apple"]],
  ["🪟 Microsoft", ["Microsoft", "microsoft"]],
  ["🇨🇳 国内平台", ["国内平台", "domestic"]],
  ["🌍 海外游戏", ["海外游戏", "overseasGame"]],
  ["⬇️ 下载/P2P", ["下载/P2P", "download"]],
  ["🧭 DNS 与规则下载", ["DNS 与规则下载", "dnsAndRules"]],
  ["最终兜底", ["final"]],
]);
const ALIASES = new Map(POLICY_KEYS.flatMap(([primary, aliases]) => [[primary, primary], ...aliases.map((alias) => [alias, primary])]));
const BASE64URL = /^[A-Za-z0-9_-]*$/u;
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function plainObject(value, message) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(message);
  }
  return value;
}

function canonicalTarget(value) {
  if (typeof value !== "string") throw new TypeError("Policy override targets must be strings");
  const keyword = /^(direct|follow)$/iu.exec(value);
  if (keyword) return keyword[1].toUpperCase();
  const node = /^node:(.*)$/iu.exec(value);
  if (!node || node[1].trim().length === 0) throw new Error("Policy override target is invalid");
  return `NODE:${node[1]}`;
}

export function decodePolicyOverrides(encoded) {
  if (encoded === "") return Object.freeze({});
  if (typeof encoded !== "string" || !BASE64URL.test(encoded) || encoded.includes("=")) {
    throw new Error("policyOverrides must be unpadded Base64URL");
  }
  let parsed;
  try {
    const base64 = encoded.replace(/-/gu, "+").replace(/_/gu, "/");
    const bytes = Uint8Array.from(atob(base64), (character) => character.codePointAt(0));
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    parsed = JSON.parse(json);
  } catch {
    throw new Error("policyOverrides must encode UTF-8 JSON");
  }
  plainObject(parsed, "policyOverrides must encode a plain object");
  const overrides = {};
  for (const key of Reflect.ownKeys(parsed)) {
    if (typeof key !== "string" || PROTOTYPE_KEYS.has(key)) throw new Error("Unknown policy override key");
    const descriptor = Object.getOwnPropertyDescriptor(parsed, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) throw new Error("Policy overrides must contain data values");
    const primary = ALIASES.get(key);
    if (!primary) throw new Error(`Unknown policy override key: ${key}`);
    const target = canonicalTarget(descriptor.value);
    if (Object.hasOwn(overrides, primary) && overrides[primary] !== target) throw new Error(`Policy override conflict: ${primary}`);
    overrides[primary] = target;
  }
  return Object.freeze(overrides);
}

function nodeName(node) {
  return typeof node?.name === "string" ? node.name : "";
}

function nodeId(node) {
  const id = node?._profile?.id;
  if (typeof id !== "string" || id.length === 0) throw new Error("Normalized node is missing _profile.id");
  return id;
}

export function resolvePolicyOverrides({ encoded = "", allNodes, eligibleNodes }) {
  if (!Array.isArray(allNodes) || !Array.isArray(eligibleNodes)) throw new TypeError("allNodes and eligibleNodes must be arrays");
  const overrides = decodePolicyOverrides(encoded);
  const targets = {};
  const warnings = [];
  const fixedNodes = [];
  for (const [businessKey, defaultTarget] of Object.entries(POLICY_DEFAULTS)) {
    const configured = overrides[businessKey] ?? defaultTarget;
    if (configured === "DIRECT" || configured === "FOLLOW") {
      targets[businessKey] = Object.freeze({ configured, resolved: configured, status: configured.toLowerCase(), warningCode: null, nodeId: null });
      continue;
    }
    const name = configured.slice("NODE:".length);
    const eligibleMatches = eligibleNodes.filter((node) => nodeName(node) === name);
    if (eligibleMatches.length === 1) {
      const id = nodeId(eligibleMatches[0]);
      targets[businessKey] = Object.freeze({ configured, resolved: configured, status: "fixed", warningCode: null, nodeId: id });
      if (!fixedNodes.includes(id)) fixedNodes.push(id);
      continue;
    }
    const status = eligibleMatches.length > 1 ? "duplicate-node-fallback" : allNodes.some((node) => nodeName(node) === name) ? "incompatible-node-fallback" : "missing-node-fallback";
    targets[businessKey] = Object.freeze({ configured, resolved: "FOLLOW", status, warningCode: status, nodeId: null });
    warnings.push(Object.freeze({ businessKey, code: status }));
  }
  return Object.freeze({ targets: Object.freeze(targets), fixedNodes: Object.freeze(fixedNodes), warnings: Object.freeze(warnings) });
}
