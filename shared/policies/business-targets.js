import { decodeBase64UrlUtf8 } from "../encoding/base64url.js";

const TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
const NODE_TARGET = /^NODE:(.*)$/iu;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;

function frozenTarget(id, label, aliases, defaultTarget) {
  return Object.freeze({
    id,
    label,
    aliases: Object.freeze([...aliases]),
    defaultTarget,
  });
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
  frozenTarget("apple", "🍎 Apple", ["Apple", "apple"], "DIRECT"),
  frozenTarget("microsoft", "🪟 Microsoft", ["Microsoft", "microsoft"], "DIRECT"),
  // Compatibility aliases for domestic app-specific rules and overrides.
  frozenTarget("domestic", "🇨🇳 国内平台", [
    "国内平台", "domestic", "哔哩哔哩", "bilibili", "抖音", "bytedance",
    "小红书", "xiaohongshu", "微博", "weibo",
  ], "DIRECT"),
  frozenTarget("overseasGame", "🌍 海外游戏", ["海外游戏", "overseasGame"], "FOLLOW"),
  frozenTarget("download", "⬇️ 下载/P2P", ["下载/P2P", "download"], "DIRECT"),
  frozenTarget("dnsAndRules", "🧭 DNS 与规则下载", ["DNS 与规则下载", "dnsAndRules"], "FOLLOW"),
  frozenTarget("final", "最终兜底", ["最终兜底", "final"], "FOLLOW"),
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

function assertUniqueJsonObjectKeys(text) {
  let index = 0;
  const syntaxError = () => { throw new SyntaxError("invalid JSON"); };
  const skipWhitespace = () => {
    while (/[\u0020\t\r\n]/u.test(text[index])) index += 1;
  };
  const parseString = () => {
    if (text[index] !== '"') syntaxError();
    const start = index;
    index += 1;
    while (index < text.length) {
      const character = text[index++];
      if (character === '"') return JSON.parse(text.slice(start, index));
      if (character === "\\") {
        const escape = text[index++];
        if (escape === "u") {
          for (let count = 0; count < 4; count += 1) {
            if (!/[0-9a-f]/iu.test(text[index++])) syntaxError();
          }
        } else if (!'"\\/bfnrt'.includes(escape)) {
          syntaxError();
        }
      } else if (character.charCodeAt(0) < 0x20) {
        syntaxError();
      }
    }
    syntaxError();
  };
  const parseValue = () => {
    skipWhitespace();
    if (text[index] === "{") {
      index += 1;
      skipWhitespace();
      const keys = new Set();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      while (true) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) throw new SyntaxError("duplicate JSON key");
        keys.add(key);
        skipWhitespace();
        if (text[index++] !== ":") syntaxError();
        parseValue();
        skipWhitespace();
        if (text[index] === "}") {
          index += 1;
          return;
        }
        if (text[index++] !== ",") syntaxError();
      }
    }
    if (text[index] === "[") {
      index += 1;
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      while (true) {
        parseValue();
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return;
        }
        if (text[index++] !== ",") syntaxError();
      }
    }
    if (text[index] === '"') {
      parseString();
      return;
    }
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
    if (!number) syntaxError();
    index += number[0].length;
  };

  parseValue();
  skipWhitespace();
  if (index !== text.length) syntaxError();
}

function decodeBase64url(encoded) {
  if (typeof encoded !== "string") throw policyError("must be a Base64URL string");
  if (encoded === "") return Object.freeze({});
  if (!BASE64URL.test(encoded) || encoded.length % 4 === 1) {
    throw policyError("must be a Base64URL string");
  }

  let text;
  try {
    text = decodeBase64UrlUtf8(encoded);
  } catch {
    throw policyError("must contain UTF-8 JSON");
  }

  let parsed;
  try {
    assertUniqueJsonObjectKeys(text);
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
  if (!node || node[1].trim().length === 0 || LINE_TERMINATOR.test(node[1])) {
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
