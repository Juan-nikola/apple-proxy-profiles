import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";

const DNS_INBOUND_TAG = "dnsOut";
const TUN_INBOUND_TAG = "tunIn";

function requiredObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`OneXray ${label} must be an object`);
  }
  return value;
}

function selectedProxySources(routingPlan) {
  if (!Array.isArray(routingPlan)) throw new TypeError("OneXray routing plan must be an array");
  return routingPlan
    .filter((entry) => entry?.dnsClass === "proxy")
    .map((entry) => entry.id);
}

function geoSiteReference(geo, sourceId) {
  if (typeof geo.siteName !== "string" || geo.siteName.length === 0 || typeof geo.code !== "function") {
    throw new TypeError("OneXray GeoData must provide siteName and code");
  }
  const code = geo.code(sourceId);
  if (typeof code !== "string" || code.length === 0) throw new Error("OneXray GeoData returned an invalid code");
  return `ext:${geo.siteName}.dat:${code}`;
}

function dohHost(provider) {
  return new URL(provider.doh).hostname;
}

function resolverRule(provider, outboundTag) {
  return [
    {
      type: "field",
      inboundTag: [DNS_INBOUND_TAG],
      domain: [`full:${provider.serverName ?? dohHost(provider)}`],
      outboundTag,
    },
    { type: "field", inboundTag: [DNS_INBOUND_TAG], ip: [provider.address], outboundTag },
  ];
}

/**
 * Renders only the DNS prelude. The later routing compiler owns its placement
 * ahead of shared policy rules and preserves OneXray's runtime query strategy.
 */
export function renderOneXrayDns({ options, routingPlan, geo } = {}) {
  requiredObject(options, "DNS options");
  requiredObject(geo, "GeoData");
  const china = chinaDnsProvider(options.chinaDns);
  const global = globalDnsProvider(options.globalDns);
  const explicitOverseas = selectedProxySources(routingPlan).map((sourceId) => geoSiteReference(geo, sourceId));
  const privacy = options.dnsMode === "privacy";

  const globalServer = {
    tag: "dns-global",
    address: global.doh,
    ...(privacy ? {} : { domains: explicitOverseas }),
    skipFallback: true,
  };
  const chinaServer = {
    tag: "dns-china",
    address: china.doh,
    skipFallback: true,
  };
  const rules = [
    { type: "field", inboundTag: [TUN_INBOUND_TAG], network: "tcp,udp", port: "53", outboundTag: DNS_INBOUND_TAG },
    ...(options.chinaDns === "system" ? [] : resolverRule(china, "direct")),
    ...resolverRule(global, "proxy"),
    { type: "field", inboundTag: [DNS_INBOUND_TAG], outboundTag: "direct" },
  ];

  return { dns: { servers: [globalServer, chinaServer] }, rules };
}
