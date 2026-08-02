import { increment } from "./diagnostics.js";
import { nodeMetadata } from "../contracts.js";

const SUPPORTED_LANDING_PROTOCOLS = new Set([
  "ss",
  "shadowsocks",
  "ssr",
  "snell",
  "vmess",
  "vless",
  "trojan",
  "socks5",
  "http",
  "ssh",
]);

const CHAIN_ALIASES = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];

export function hasExistingChain(node) {
  return CHAIN_ALIASES.some((key) => {
    if (!Object.hasOwn(node ?? {}, key)) return false;
    const value = node[key];
    return value !== undefined && value !== null && value !== "";
  });
}

export function addClientChainClones(nodes, diagnostics, enabled) {
  if (!enabled) return nodes;

  const landings = nodes.filter((node) => nodeMetadata(node).sourceKind === "landing");
  const existingLandings = landings.filter((node) => hasExistingChain(node));
  const chainableLandings = landings.filter((node) => !hasExistingChain(node));
  if (existingLandings.length > 0) {
    increment(diagnostics.excluded, "chain-existing", existingLandings.length);
  }
  if (chainableLandings.length === 0) return nodes;

  if (!nodes.some((node) => nodeMetadata(node).entry === true)) {
    increment(diagnostics.excluded, "chain-entry-missing", chainableLandings.length);
    return nodes;
  }

  const clones = [];
  for (const landing of chainableLandings) {
    if (!SUPPORTED_LANDING_PROTOCOLS.has(String(landing.type).trim().toLowerCase())) {
      increment(diagnostics.excluded, "chain-protocol-unsupported");
      continue;
    }
    const clone = structuredClone(landing);
    clone.name = `🔗 ${clone.name}`;
    clone["underlying-proxy"] = "🔗 入口节点";
    clone._profile = { ...nodeMetadata(clone), chained: true };
    clones.push(clone);
  }
  return [...nodes, ...clones];
}
