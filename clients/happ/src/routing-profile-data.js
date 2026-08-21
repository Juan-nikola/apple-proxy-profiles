// Change the routing profile identity after the GeoData contract migration so HAPP
// does not reuse a stale cached profile/geodata pair from the previous schema.
const PROFILE_NAME = "Apple Proxy Profiles HAPP v2";
const REMOTE_DNS = Object.freeze({ type: "DoH", domain: "https://cloudflare-dns.com/dns-query", ip: "1.1.1.1" });
const DOMESTIC_DNS = Object.freeze({ type: "DoH", domain: "https://dns.alidns.com/dns-query", ip: "223.5.5.5" });
import {
  HAPP_PROFILE_BLOCK_SITES,
  HAPP_PROFILE_DIRECT_IP,
  HAPP_PROFILE_DIRECT_SITES,
  HAPP_PROFILE_PROXY_SITES,
} from "./geodata-contract.js";

function immutableBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s?#]+(?:\/[^\s?#]+)*$/u.test(value)) {
    throw new TypeError("Happ immutable base URL must be an HTTPS URL without query or fragment");
  }
  return value.replace(/\/+$/u, "");
}

function unixTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError("Happ generatedAt must be an ISO timestamp");
  return String(Math.floor(Date.parse(value) / 1000));
}

export function renderHappRoutingProfile({ baseUrl, generatedAt }) {
  const base = immutableBaseUrl(baseUrl);
  return Object.freeze({
    Name: PROFILE_NAME,
    GlobalProxy: "true",
    RouteOrder: "block-proxy-direct",
    RemoteDNSType: REMOTE_DNS.type,
    RemoteDNSDomain: REMOTE_DNS.domain,
    RemoteDNSIP: REMOTE_DNS.ip,
    DomesticDNSType: DOMESTIC_DNS.type,
    DomesticDNSDomain: DOMESTIC_DNS.domain,
    DomesticDNSIP: DOMESTIC_DNS.ip,
    Geoipurl: base + "/happ/geoip.dat",
    Geositeurl: base + "/happ/geosite.dat",
    LastUpdated: unixTimestamp(generatedAt),
    DnsHosts: Object.freeze({ "cloudflare-dns.com": REMOTE_DNS.ip, "dns.alidns.com": DOMESTIC_DNS.ip }),
    DirectSites: HAPP_PROFILE_DIRECT_SITES,
    DirectIp: HAPP_PROFILE_DIRECT_IP,
    ProxySites: HAPP_PROFILE_PROXY_SITES,
    ProxyIp: Object.freeze([]),
    BlockSites: HAPP_PROFILE_BLOCK_SITES,
    BlockIp: Object.freeze([]),
    DomainStrategy: "IPIfNonMatch",
    FakeDNS: "false",
    UseChunkFiles: "true",
  });
}

export function renderHappRoutingDeepLink(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError("Happ routing profile must be an object");
  return "happ://routing/onadd/" + Buffer.from(JSON.stringify(profile), "utf8").toString("base64");
}
