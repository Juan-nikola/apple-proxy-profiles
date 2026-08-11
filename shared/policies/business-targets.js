const TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
const NODE_TARGET = /^NODE:(.*)$/iu;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const CONTROL = /[\r\n]/u;

function frozenTarget(id, label, alias, defaultTarget) {
  return Object.freeze({
    id,
    label,
    aliases: Object.freeze([alias, id]),
    defaultTarget,
  });
}

export const BUSINESS_TARGETS = Object.freeze([
  frozenTarget("ai", "🤖 AI 专用", "AI 专用", "FOLLOW"),
  frozenTarget("github", "🐙 GitHub", "GitHub", "FOLLOW"),
  frozenTarget("youtube", "📺 YouTube", "YouTube", "FOLLOW"),
  frozenTarget("globalMedia", "🎬 海外流媒体", "海外流媒体", "FOLLOW"),
  frozenTarget("globalSocial", "💬 海外社交", "海外社交", "FOLLOW"),
  frozenTarget("apple", "🍎 Apple", "Apple", "DIRECT"),
  frozenTarget("microsoft", "🪟 Microsoft", "Microsoft", "DIRECT"),
  frozenTarget("domestic", "🇨🇳 国内平台", "国内平台", "DIRECT"),
  frozenTarget("overseasGame", "🌍 海外游戏", "海外游戏", "FOLLOW"),
  frozenTarget("download", "⬇️ 下载/P2P", "下载/P2P", "DIRECT"),
  frozenTarget("dnsAndRules", "🧭 DNS 与规则下载", "DNS 与规则下载", "FOLLOW"),
  frozenTarget("final", "最终兜底", "最终兜底", "FOLLOW"),
]);

const TARGET_BY_KEY = new Map();
for (const target of BUSINESS_TARGETS) {
  TARGET_BY_KEY.set(target.label, target);
  for (const alias of target.aliases) TARGET_BY_KEY.set(alias, target);
}

export function businessTargetByKey(key) {
  return typeof key === "string" ? TARGET_BY_KEY.get(key) : undefined;
}

function policyError(message) {
  return new Error(`Invalid business policy overrides: ${message}`);
}

function targetError(target, message) {
  return policyError(`${target.label}: ${message}`);
}

function decodeBase64url(encoded) {
  if (typeof encoded !== "string") throw policyError("must be a Base64URL string");
  if (encoded === "") return Object.freeze({});
  if (!BASE64URL.test(encoded) || encoded.length % 4 === 1) {
    throw policyError("must be a Base64URL string");
  }

  let bytes;
  let text;
  try {
    bytes = Buffer.from(encoded, "base64url");
    if (bytes.toString("base64url") !== encoded) throw new Error("non-canonical Base64URL");
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw policyError("must contain UTF-8 JSON");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw policyError("must contain JSON object");
  }
  if (parsed === null || Array.isArray(parsed) || Object.getPrototypeOf(parsed) !== Object.prototype) {
    throw policyError("must contain a JSON object");
  }
  return parsed;
}

function canonicalTarget(target, value) {
  if (typeof value !== "string") throw targetError(target, "target must be a string");
  if (TARGET_KEYWORD.test(value)) return value.toUpperCase();

  const node = NODE_TARGET.exec(value);
  if (!node || node[1].trim().length === 0 || CONTROL.test(node[1])) {
    throw targetError(target, "target must be FOLLOW, DIRECT, or NODE:<name>");
  }
  return `NODE:${node[1]}`;
}

export function parseBusinessOverrides(encoded) {
  const values = decodeBase64url(encoded);
  const overrides = {};

  for (const [key, value] of Object.entries(values)) {
    const target = businessTargetByKey(key);
    if (!target) throw policyError("contains an unknown business key");
    const canonical = canonicalTarget(target, value);
    if (Object.hasOwn(overrides, target.id) && overrides[target.id] !== canonical) {
      throw targetError(target, "has conflicting aliases");
    }
    overrides[target.id] = canonical;
  }

  return Object.freeze(overrides);
}
