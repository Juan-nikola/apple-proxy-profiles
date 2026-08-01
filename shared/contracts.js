export const CLIENT = Object.freeze({
  shadowrocket: "shadowrocket",
  egern: "egern",
  anywhere: "anywhere",
});

export const OPTION_VALUES = Object.freeze({
  output: Object.freeze(["nodes", "config"]),
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

export const SOURCE_KIND = Object.freeze({
  airport: "airport", selfHosted: "selfHosted", realm: "realm",
  serverChain: "serverChain", landing: "landing", unknown: "unknown",
});

export const CONTINENT = Object.freeze({
  asiaPacific: "asiaPacific", europe: "europe", americas: "americas", other: "other",
});

export function nodeMetadata(node) {
  if (!node?._profile || typeof node._profile !== "object") {
    throw new Error("Normalized node is missing _profile metadata");
  }
  return node._profile;
}
