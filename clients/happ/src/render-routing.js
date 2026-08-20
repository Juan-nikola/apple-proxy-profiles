import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { businessTargetForSource } from "./policy-overrides.js";
import { renderHappOutbound } from "./render-node.js";
import { renderHappDnsRoutes } from "./render-dns.js";

const HAPP_GEOSITE_ALIASES = Object.freeze({
  Hijacking: "CATEGORY-ADS-ALL",
  BlockHttpDNS: "CATEGORY-HTTPDNS-CN",
  Privacy: "PRIVATE",
  DomesticCore: "CN",
  DomesticGame: "CATEGORY-GAMES-CN",
  SteamCN: "STEAM",
  BiliBili: "BILIBILI",
  ByteDance: "BYTEDANCE",
  XiaoHongShu: "XIAOHONGSHU",
  Weibo: "CATEGORY-SOCIAL-MEDIA-CN",
  OpenAI: "OPENAI",
  Claude: "CATEGORY-AI-!CN",
  Gemini: "GOOGLE-GEMINI",
  Copilot: "GITHUB-COPILOT",
  GitHub: "GITHUB",
  YouTube: "YOUTUBE",
  Netflix: "NETFLIX",
  Disney: "DISNEY",
  Spotify: "SPOTIFY",
  GlobalMedia: "CATEGORY-MEDIA",
  Telegram: "TELEGRAM",
  Facebook: "FACEBOOK",
  Instagram: "INSTAGRAM",
  Twitter: "TWITTER",
  TikTok: "TIKTOK",
  Apple: "APPLE",
  Microsoft: "MICROSOFT",
  Download: "CATEGORY-NETDISK-!CN",
  PrivateTracker: "CATEGORY-PT",
  OverseasGame: "CATEGORY-GAMES-!CN",
  ChinaTLD: "CN",
});

// iOS/iPadOS Network Extension has a tight RSS ceiling. Use the compact
// project-owned GeoData for those platforms instead of the larger bundled
// geosite/geoip databases. Other platforms keep the standard aliases.
const HAPP_COMPACT_GEOSITE_ALIASES = Object.freeze({
  Hijacking: "HAPP-HIJACKING",
  BlockHttpDNS: "HAPP-BLOCKHTTPDNS",
  Privacy: "HAPP-PRIVACY",
  DomesticCore: "HAPP-DOMESTICCORE",
  DomesticGame: "HAPP-DOMESTICGAME",
  SteamCN: "HAPP-STEAMCN",
  BiliBili: "HAPP-BILIBILI",
  ByteDance: "HAPP-BYTEDANCE",
  XiaoHongShu: "HAPP-XIAOHONGSHU",
  Weibo: "HAPP-WEIBO",
  OpenAI: "HAPP-OPENAI",
  Claude: "HAPP-CLAUDE",
  Gemini: "HAPP-GEMINI",
  Copilot: "HAPP-COPILOT",
  GitHub: "HAPP-GITHUB",
  YouTube: "HAPP-YOUTUBE",
  Netflix: "HAPP-NETFLIX",
  Disney: "HAPP-DISNEY",
  Spotify: "HAPP-SPOTIFY",
  GlobalMedia: "HAPP-GLOBALMEDIA",
  Telegram: "HAPP-TELEGRAM",
  Facebook: "HAPP-FACEBOOK",
  Instagram: "HAPP-INSTAGRAM",
  Twitter: "HAPP-TWITTER",
  TikTok: "HAPP-TIKTOK",
  Apple: "HAPP-APPLE",
  Microsoft: "HAPP-MICROSOFT",
  Download: "HAPP-DOWNLOAD",
  PrivateTracker: "HAPP-PRIVATETRACKER",
  OverseasGame: "HAPP-OVERSEASGAME",
  ChinaTLD: "HAPP-CHINATLD",
});

function usesCompactGeodata(platform) {
  return platform === "iphone" || platform === "ipad";
}

function hash(value) { let h = 2166136261; for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); }
function targetFor(id, resolution, followTag, fixedById) {
  const targetId = businessTargetForSource(id);
  const record = resolution?.targets?.[targetId];
  if (!record || record.resolved === "FOLLOW") return { outboundTag: followTag };
  if (record.resolved === "DIRECT") return { outboundTag: "happ-direct" };
  const fixed = fixedById.get(record.nodeId);
  return fixed ? { balancerTag: fixed.balancerTag } : { outboundTag: followTag };
}

export function renderHappRouting(context = {}) {
  const followTag = context.followTag ?? "happ-follow/current";
  const resolution = context.policyResolution ?? { targets: {} };
  const options = context.options ?? {};
  const fixedRecords = Array.isArray(context.fixedNodes) ? context.fixedNodes : (resolution.fixedNodes ?? []);
  const nodes = Array.isArray(context.nodes) ? context.nodes : [];
  const fixedById = new Map();
  const outbounds = [];
  const balancers = [];
  const observatorySelectors = [];
  for (const fixed of fixedRecords) {
    if (fixed.nodeId && fixed.nodeId === context.followNodeId) continue;
    const node = fixed.node ?? nodes.find((candidate) => (candidate._profile?.id ?? "") === fixed.nodeId);
    if (!node) continue;
    const suffix = hash(fixed.nodeId);
    const candidateTag = `happ-fixed/${suffix}/candidate`;
    const balancerTag = `happ-fixed/${suffix}/balancer`;
    fixedById.set(fixed.nodeId, { candidateTag, balancerTag });
    outbounds.push((context.renderNode ?? renderHappOutbound)(node, candidateTag));
    balancers.push({ tag: balancerTag, selector: [candidateTag], strategy: { type: "leastPing" }, fallbackTag: followTag });
    observatorySelectors.push(candidateTag);
  }
  const rules = [
    { type: "field", ip: ["geoip:private"], outboundTag: "happ-direct" },
    { type: "field", domain: ["geosite:private"], outboundTag: "happ-direct" },
  ];
  let quicRuleInserted = false;
  for (const item of orderedRoutingPlan({ adblockMode: "off" })) {
    if (!quicRuleInserted && item.phase !== "security" && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) {
      rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
      quicRuleInserted = true;
    }
    const isIp = item.id === "ChinaIP";
    const compact = usesCompactGeodata(options.platform);
    const source = isIp
      ? (compact ? "geoip:HAPP-CHINAIP" : "geoip:cn")
      : "geosite:" + ((compact ? HAPP_COMPACT_GEOSITE_ALIASES[item.id] : HAPP_GEOSITE_ALIASES[item.id]) ?? item.id.toUpperCase());
    const target = item.policy === "REJECT"
      ? { outboundTag: options.blockMode === "off" ? "happ-direct" : "happ-block" }
      : targetFor(item.id, resolution, followTag, fixedById);
    rules.push({ type: "field", ...(isIp ? { ip: [source] } : { domain: [source] }), ...target });
  }
  if (!quicRuleInserted && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
  const dnsTarget = resolution?.targets?.dnsAndRules;
  const dnsFixed = dnsTarget?.nodeId ? fixedById.get(dnsTarget.nodeId) : null;
  const globalDnsOutbound = dnsTarget?.resolved === "DIRECT" ? "happ-direct" : dnsFixed?.candidateTag ?? followTag;
  rules.splice(2, 0, ...renderHappDnsRoutes({ followTag, globalOutboundTag: globalDnsOutbound, platform: options.platform }));
  const finalTarget = targetFor("__final__", resolution, followTag, fixedById);
  rules.push({ type: "field", network: "tcp,udp", ...finalTarget });
  const routing = { domainStrategy: "IPIfNonMatch", rules };
  const policyTargets = {};
  for (const [targetId, record] of Object.entries(resolution.targets ?? {})) {
    if (record.resolved === "DIRECT") policyTargets[targetId] = "happ-direct";
    else if (record.resolved === "FOLLOW") policyTargets[targetId] = followTag;
    else if (fixedById.has(record.nodeId)) policyTargets[targetId] = fixedById.get(record.nodeId).balancerTag;
    else policyTargets[targetId] = followTag;
  }
  return { routing, observatory: { subjectSelector: observatorySelectors, probeUrl: "https://www.gstatic.com/generate_204", probeInterval: "30s", enableConcurrency: true, timeout: 5000 }, policyTargets, fixedOutbounds: outbounds, balancers };
}
