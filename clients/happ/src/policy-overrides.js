import { decodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";

const TARGET_RE = /^(DIRECT|FOLLOW)$/iu;
const NODE_RE = /^NODE:(.*)$/iu;
const BASE64URL = /^[A-Za-z0-9_-]*$/u;

const definitions = [
  ["ai", "🤖 AI 专用", ["AI 专用", "ai"] , "FOLLOW"],
  ["github", "🐙 GitHub", ["GitHub", "github"], "FOLLOW"],
  ["youtube", "📺 YouTube", ["YouTube", "youtube"], "FOLLOW"],
  ["globalMedia", "🎬 海外流媒体", ["海外流媒体", "globalMedia", "overseasMedia"], "FOLLOW"],
  ["globalSocial", "💬 海外社交", ["海外社交", "globalSocial", "overseasSocial"], "FOLLOW"],
  ["apple", "🍎 Apple", ["Apple", "apple"], "DIRECT"],
  ["microsoft", "🪟 Microsoft", ["Microsoft", "microsoft"], "DIRECT"],
  ["domestic", "🇨🇳 国内平台", ["国内平台", "domestic", "domesticPlatform"], "DIRECT"],
  ["overseasGame", "🌍 海外游戏", ["海外游戏", "overseasGame"], "FOLLOW"],
  ["download", "⬇️ 下载/P2P", ["下载/P2P", "download"], "DIRECT"],
  ["dnsAndRules", "🧭 DNS 与规则下载", ["DNS 与规则下载", "dnsAndRules"], "FOLLOW"],
  ["final", "最终兜底", ["final", "最终兜底"], "FOLLOW"],
];
export const BUSINESS_KEYS = Object.freeze(definitions.map(([id, label, aliases, defaultTarget]) => Object.freeze({ id, label, aliases: Object.freeze(aliases), defaultTarget })));
const BY_KEY = new Map();
for (const target of BUSINESS_KEYS) { BY_KEY.set(target.label, target); for (const alias of target.aliases) BY_KEY.set(alias, target); }
// Shared rule sources such as DomesticCore and ChinaIP intentionally map to
// the domestic-platform policy; they are accepted as migration aliases but
// do not create extra user-facing policy targets.
BY_KEY.set("国内核心", BY_KEY.get("domestic"));
BY_KEY.set("domesticCore", BY_KEY.get("domestic"));
BY_KEY.set("中国 IP", BY_KEY.get("domestic"));
BY_KEY.set("chinaIp", BY_KEY.get("domestic"));

function error(message) { throw new Error(`Invalid Happ policyOverrides: ${message}`); }
function canonicalTarget(value) {
  if (typeof value !== "string") error("target must be a string");
  if (TARGET_RE.test(value)) return value.toUpperCase();
  const match = NODE_RE.exec(value);
  if (!match || !match[1] || !match[1].trim() || /[\r\n\u2028\u2029]/u.test(match[1])) error("target must be DIRECT, FOLLOW, or NODE:<name>");
  return `NODE:${match[1]}`;
}
export const canonicalBusinessTarget = canonicalTarget;

export function decodePolicyOverrides(encoded = "") {
  if (typeof encoded !== "string" || !BASE64URL.test(encoded) || encoded.length % 4 === 1) error("must be canonical Base64URL");
  if (!encoded) return Object.freeze({});
  let parsed;
  try { parsed = JSON.parse(decodeBase64UrlUtf8(encoded)); } catch { error("must contain UTF-8 JSON object"); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" || Object.getPrototypeOf(parsed) !== Object.prototype) error("must contain a JSON object");
  const result = {};
  for (const [key, value] of Object.entries(parsed)) {
    const target = BY_KEY.get(key);
    if (!target) error("contains an unknown business key");
    const canonical = canonicalTarget(value);
    if (Object.hasOwn(result, target.id) && result[target.id] !== canonical) error(`${target.label} has conflicting aliases`);
    result[target.id] = canonical;
  }
  return Object.freeze(result);
}

function normalizedName(node) { return typeof node?.name === "string" ? node.name : ""; }
function nodeId(node) { return node?._profile?.id ?? `node-${Math.abs([...JSON.stringify(node)].reduce((h, c) => ((h * 33) ^ c.charCodeAt(0)) | 0, 5381))}`; }

export function resolvePolicyOverrides({ encoded = "", allNodes = [], eligibleNodes = [] } = {}) {
  const overrides = decodePolicyOverrides(encoded);
  const targets = {};
  const fixedNodes = [];
  const warnings = [];
  for (const target of BUSINESS_KEYS) {
    const configured = overrides[target.id] ?? target.defaultTarget;
    const record = { configured, resolved: configured, status: configured === "DIRECT" ? "direct" : configured === "FOLLOW" ? "follow" : "fixed", warningCode: null, nodeId: null };
    if (configured.startsWith("NODE:")) {
      const wanted = configured.slice(5);
      const matches = eligibleNodes.filter((node) => normalizedName(node) === wanted);
      const allMatches = allNodes.filter((node) => normalizedName(node) === wanted);
      if (matches.length === 1) {
        record.nodeId = nodeId(matches[0]);
        fixedNodes.push({ nodeId: record.nodeId, name: wanted });
      } else {
        record.resolved = "FOLLOW";
        if (matches.length > 1) record.status = "duplicate-node-fallback", record.warningCode = "duplicate-node";
        else if (allMatches.length > 0) record.status = "incompatible-node-fallback", record.warningCode = "incompatible-node";
        else record.status = "missing-node-fallback", record.warningCode = "missing-node";
        warnings.push({ businessKey: target.label, warningCode: record.warningCode });
      }
    }
    targets[target.id] = record;
  }
  const dedup = new Map(fixedNodes.map((item) => [item.nodeId, item]));
  return Object.freeze({ targets: Object.freeze(targets), fixedNodes: Object.freeze([...dedup.values()]), warnings: Object.freeze(warnings) });
}

export function businessTargetForSource(sourceId) {
  const mapping = { OpenAI: "ai", Claude: "ai", Gemini: "ai", Copilot: "ai", GitHub: "github", YouTube: "youtube", Netflix: "globalMedia", Disney: "globalMedia", Spotify: "globalMedia", GlobalMedia: "globalMedia", Telegram: "globalSocial", Facebook: "globalSocial", Instagram: "globalSocial", Twitter: "globalSocial", TikTok: "globalSocial", Apple: "apple", Microsoft: "microsoft", Download: "download", PrivateTracker: "download", OverseasGame: "overseasGame", DomesticCore: "domestic", DomesticGame: "domestic", SteamCN: "domestic", BiliBili: "domestic", ByteDance: "domestic", XiaoHongShu: "domestic", Weibo: "domestic", ChinaTLD: "domestic", ChinaIP: "domestic" };
  return mapping[sourceId] ?? "final";
}
