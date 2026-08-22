import { renderXrayOutbound, renderXrayNodeError } from "../../../shared/nodes/render-xray-outbound.js";
import { oneXrayGeoNames } from "../../onexray/src/geodata-contract.js";

function dns(options) { return { servers: [{ tag: "china-dns", address: options.chinaDns === "system" ? "localhost" : "223.5.5.5", domains: ["geosite:cn", "geosite:private"] }, { tag: "global-dns", address: options.globalDns === "google" ? "8.8.8.8" : "1.1.1.1", domains: ["geosite:apple-proxy-overseas"] }], queryStrategy: options.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP", tag: "dnsQuery" }; }
export function renderV2rayNProfile({ nodes, options, geoData = null } = {}) {
  if (!options || options.output !== "config") throw new Error("v2rayN profile options are required");
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("v2rayN profile requires compatible nodes");
  const outbounds = [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }]; const failures = {};
  nodes.forEach((node, index) => { try { outbounds.push(renderXrayOutbound(node, { tag: `ap-node-${index.toString(36)}`, client: "v2rayn" })); } catch (error) { const diagnostic = renderXrayNodeError(error, "v2rayn"); Object.entries(diagnostic.excluded).forEach(([key, count]) => { failures[key] = (failures[key] ?? 0) + count; }); } });
  if (outbounds.length === 2) throw new Error("v2rayN profile: no compatible nodes");
  const names = geoData?.manifest?.names ?? oneXrayGeoNames(options.channel);
  const geoPrefix = geoData?.urls ? geoData.urls : { domain: `geodata/${options.region}/${names.domain}.dat`, ip: `geodata/${options.region}/${names.ip}.dat` };
  const rules = [{ domain: ["geosite:private"], outboundTag: "direct" }, { domain: [`geosite:${geoPrefix.domain}`], outboundTag: "direct" }, { ip: [`geoip:${geoPrefix.ip}`], outboundTag: "direct" }];
  if (options.blockMode !== "off") rules.unshift({ domain: ["geosite:apple-proxy-security"], outboundTag: "block" });
  rules.push({ network: "tcp,udp", outboundTag: "proxy" });
  return { name: options.name, dns: dns(options), inbounds: [{ tag: "tun", protocol: "tun", settings: { mtu: 1500 }, sniffing: { enabled: true, routeOnly: true } }], outbounds: [...outbounds, { protocol: "selector", tag: "proxy", settings: { selectors: outbounds.slice(2).map(({ tag }) => tag) } }], routing: { domainStrategy: "IPIfNonMatch", rules }, ...(Object.keys(failures).length ? { renderFailures: failures } : {}) };
}
