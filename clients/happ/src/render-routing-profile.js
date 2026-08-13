import QRCode from "qrcode";

const PROFILE_NAME = "Apple Proxy Profiles Happ";
const REMOTE_DNS = Object.freeze({ type: "DoH", domain: "https://cloudflare-dns.com/dns-query", ip: "1.1.1.1" });
const DOMESTIC_DNS = Object.freeze({ type: "DoH", domain: "https://dns.alidns.com/dns-query", ip: "223.5.5.5" });

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

/** Render the public, geodata-only profile accepted by Happ's routing importer. */
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
    Geoipurl: `${base}/happ/geoip.dat`,
    Geositeurl: `${base}/happ/geosite.dat`,
    LastUpdated: unixTimestamp(generatedAt),
    DnsHosts: Object.freeze({ "cloudflare-dns.com": REMOTE_DNS.ip, "dns.alidns.com": DOMESTIC_DNS.ip }),
    DirectSites: Object.freeze([]),
    DirectIp: Object.freeze([]),
    ProxySites: Object.freeze([]),
    ProxyIp: Object.freeze([]),
    BlockSites: Object.freeze([]),
    BlockIp: Object.freeze([]),
    DomainStrategy: "IPIfNonMatch",
    FakeDNS: "false",
    UseChunkFiles: "true",
  });
}

/** Encode a routing profile using Happ's documented activating deep-link form. */
export function renderHappRoutingDeepLink(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError("Happ routing profile must be an object");
  return `happ://routing/onadd/${Buffer.from(JSON.stringify(profile), "utf8").toString("base64")}`;
}

/** Build a static SVG QR image for the already-public Happ routing link. */
export async function renderHappRoutingQrSvg(deepLink) {
  if (typeof deepLink !== "string" || !deepLink.startsWith("happ://routing/onadd/")) throw new TypeError("Happ routing deep link is invalid");
  return QRCode.toString(deepLink, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
