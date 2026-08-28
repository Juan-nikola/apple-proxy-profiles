import { decodeBase64Url } from "../encoding/base64url.js";
import { parseStrictJson } from "../serialization/strict-json.js";

const TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
const NODE_TARGET = /^(NODE:|NODE~)(.*)$/iu;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;

function frozenTarget(id, label, aliases, defaultTarget) {
  return Object.freeze({ id, label, aliases: Object.freeze([...aliases]), defaultTarget });
}

export const BUSINESS_TARGETS = Object.freeze([
  frozenTarget("ai", "🤖 AI 专用", ["AI 专用", "ai"], "FOLLOW"),
  frozenTarget("github", "🐙 GitHub", ["GitHub", "github"], "FOLLOW"),
  frozenTarget("youtube", "📺 YouTube", ["YouTube", "youtube"], "FOLLOW"),
  frozenTarget("overseasMedia", "🎬 海外流媒体", [
    "海外流媒体", "overseasMedia", "Netflix", "netflix", "Disney+", "disney",
    "Spotify", "spotify", "国际媒体", "globalMedia",
  ], "FOLLOW"),
  frozenTarget("globalSocial", "💬 海外社交", [
    "海外社交", "globalSocial", "Telegram", "telegram", "TikTok", "tiktok",
  ], "FOLLOW"),
  frozenTarget("overseasGame", "🌍 海外游戏", ["海外游戏", "overseasGame"], "FOLLOW"),
  frozenTarget("domesticCore", "国内核心", ["国内核心", "domesticCore"], "DIRECT"),
  // Preserve all published domestic-platform spellings under the stable ID.
  frozenTarget("domesticPlatform", "🇨🇳 国内平台", [
    "国内平台", "domestic", "🇨🇳 国内平台", "domesticPlatform", "哔哩哔哩", "bilibili",
    "抖音", "bytedance", "小红书", "xiaohongshu", "微博", "weibo",
  ], "DIRECT"),
  frozenTarget("chinaIp", "中国 IP", ["中国 IP", "chinaIp"], "DIRECT"),
  frozenTarget("apple", "🍎 Apple", ["Apple", "apple"], "DIRECT"),
  frozenTarget("microsoft", "🪟 Microsoft", ["Microsoft", "microsoft"], "DIRECT"),
  frozenTarget("download", "⬇️ 下载/P2P", ["下载/P2P", "download"], "DIRECT"),
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

function decodePolicy(encoded) {
  if (typeof encoded !== "string" || (encoded !== "" && !BASE64URL.test(encoded)) || encoded.length % 4 === 1) {
    throw policyError("must be a Base64URL string");
  }
  if (encoded === "") return Object.freeze({});
  let bytes;
  try {
    bytes = decodeBase64Url(encoded);
  } catch {
    throw policyError("must be a Base64URL string");
  }
  let values;
  try {
    values = parseStrictJson(bytes, { label: "business overrides", maxBytes: 64 * 1024, maxDepth: 8 });
  } catch {
    throw policyError("must contain JSON object");
  }
  if (values === null || Array.isArray(values) || typeof values !== "object" || Object.getPrototypeOf(values) !== Object.prototype) {
    throw policyError("must contain a JSON object");
  }
  return values;
}

export function canonicalBusinessTarget(value) {
  if (typeof value !== "string") throw new TypeError("target must be a string");
  if (TARGET_KEYWORD.test(value)) return value.toUpperCase();
  const node = NODE_TARGET.exec(value);
  if (!node || node[2].trim().length === 0 || LINE_TERMINATOR.test(node[2])) {
    throw new TypeError("target must be FOLLOW, DIRECT, NODE:<name>, or NODE~<query>");
  }
  const prefix = node[1].toUpperCase();
  return `${prefix}${prefix === "NODE:" ? node[2] : node[2].trim()}`;
}

export function parseBusinessOverrides(encoded) {
  const values = decodePolicy(encoded);
  const overrides = {};
  for (const [key, value] of Object.entries(values)) {
    const target = businessTargetByKey(key);
    if (!target) throw policyError("contains an unknown business key");
    let canonical;
    try {
      canonical = canonicalBusinessTarget(value);
    } catch {
      throw targetError(target, "target must be FOLLOW, DIRECT, or NODE:<name>");
    }
    if (Object.hasOwn(overrides, target.id) && overrides[target.id] !== canonical) {
      throw targetError(target, "has conflicting aliases");
    }
    overrides[target.id] = canonical;
  }
  return Object.freeze(overrides);
}
