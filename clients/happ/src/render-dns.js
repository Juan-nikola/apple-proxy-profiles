import { OPTION_VALUES } from "../../../shared/contracts.js";
import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";

export const HAPP_DNS_TAG = "happ-dns";
export const HAPP_DIRECT_TAG = "happ-direct";

const CHINA_DNS = Object.freeze({
  alidns: Object.freeze({ address: "223.5.5.5" }),
  dnspod: Object.freeze({ address: "119.29.29.29" }),
  system: Object.freeze({ address: "localhost" }),
});
const GLOBAL_DNS = Object.freeze({
  cloudflare: Object.freeze({ address: "https://cloudflare-dns.com/dns-query", host: "cloudflare-dns.com", ip: "1.1.1.1" }),
  google: Object.freeze({ address: "https://dns.google/dns-query", host: "dns.google", ip: "8.8.8.8" }),
  quad9: Object.freeze({ address: "https://dns.quad9.net/dns-query", host: "dns.quad9.net", ip: "9.9.9.9" }),
});
const DNS_CLASSES = Object.freeze(
  Object.fromEntries(["china", "proxy"].map((dnsClass) => [
    dnsClass,
    Object.freeze(orderedRoutingPlan()
      .filter((source) => source.dnsClass === dnsClass)
      .map(({ id }) => `geosite:HAPP-${id.toUpperCase()}`)),
  ])),
);

function option(options, key) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Happ DNS options must be an object");
  }
  const descriptor = Object.getOwnPropertyDescriptor(options, key);
  if (!descriptor || "get" in descriptor || "set" in descriptor) {
    throw new Error(`Happ DNS option '${key}' must be an own data property`);
  }
  return descriptor.value;
}

function enumOption(options, key) {
  const value = option(options, key);
  if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
    throw new Error(`Happ DNS option '${key}' has an unsupported value`);
  }
  return value;
}

function selectedResolvers(options) {
  const dnsMode = enumOption(options, "dnsMode");
  const chinaDns = enumOption(options, "chinaDns");
  const globalDns = enumOption(options, "globalDns");
  const ipv6Mode = enumOption(options, "ipv6Mode");
  return { dnsMode, china: CHINA_DNS[chinaDns], global: GLOBAL_DNS[globalDns], ipv6Mode };
}

function modeSettings(dnsMode) {
  switch (dnsMode) {
    case "stable": return { disableFallbackIfMatch: true, enableParallelQuery: false, defaultResolver: "domestic" };
    case "privacy": return { disableFallback: true, enableParallelQuery: false, defaultResolver: "global" };
    case "speed": return { disableFallbackIfMatch: false, enableParallelQuery: true, defaultResolver: "domestic" };
    default: throw new Error("Happ DNS mode is unsupported");
  }
}

function resolverServer({ tag, address, domains, skipFallback }) {
  const server = { tag, address, skipFallback };
  if (domains !== undefined) server.domains = [...domains];
  return server;
}

/** Render Xray's built-in DNS object without relying on public resolver host lookups. */
export function renderHappDns(options) {
  const { dnsMode, china, global, ipv6Mode } = selectedResolvers(options);
  const mode = modeSettings(dnsMode);
  const defaultResolver = mode.defaultResolver === "domestic" ? china : global;
  const servers = [
    resolverServer({ tag: "happ-dns-domestic", address: china.address, domains: DNS_CLASSES.china, skipFallback: true }),
    resolverServer({ tag: "happ-dns-global", address: global.address, domains: DNS_CLASSES.proxy, skipFallback: true }),
    resolverServer({ tag: "happ-dns-default", address: defaultResolver.address, skipFallback: false }),
  ];
  const dns = {
    hosts: { [global.host]: global.ip },
    servers,
    queryStrategy: ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
    tag: HAPP_DNS_TAG,
    enableParallelQuery: mode.enableParallelQuery,
  };
  if (mode.disableFallback === true) dns.disableFallback = true;
  if (mode.disableFallbackIfMatch !== undefined) dns.disableFallbackIfMatch = mode.disableFallbackIfMatch;
  return dns;
}

function dnsOutboundTag(options) {
  const target = option(options, "dnsTarget");
  if (target === null || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("Happ DNS target must be an object");
  }
  if (Object.hasOwn(target, "balancerTag")) {
    throw new Error("Happ DNS target must use an outboundTag, not a balancerTag");
  }
  const descriptor = Object.getOwnPropertyDescriptor(target, "outboundTag");
  if (!descriptor || "get" in descriptor || "set" in descriptor || typeof descriptor.value !== "string" || descriptor.value.length === 0) {
    throw new Error("Happ DNS target outboundTag is required");
  }
  if (descriptor.value.endsWith("/balancer")) {
    throw new Error("Happ DNS target cannot select a fixed-node balancer");
  }
  return descriptor.value;
}

/**
 * These rules are prepended to user/service routing rules. DNS always targets
 * a concrete outbound: a fixed candidate is allowed, its health balancer is
 * not, so recursive resolver traffic cannot inherit a service failover loop.
 */
export function renderHappDnsRoutes(options) {
  const { china, global } = selectedResolvers(options);
  const routes = [];
  if (china.address !== "localhost") {
    routes.push({ inboundTag: [HAPP_DNS_TAG], ip: [china.address], outboundTag: HAPP_DIRECT_TAG });
  }
  routes.push({ inboundTag: [HAPP_DNS_TAG], ip: [global.ip], outboundTag: dnsOutboundTag(options) });
  return routes;
}
