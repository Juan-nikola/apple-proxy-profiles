import {
  HAPP_GEOSITE_ALIASES,
  HAPP_PROFILE_BLOCK_SITES,
  HAPP_PROFILE_DIRECT_IP,
  HAPP_PROFILE_DIRECT_SITES,
  HAPP_PROFILE_PROXY_SITES,
} from "../../../shared/happ-geodata-contract.js";

const PROFILE_NAME = "Apple Proxy Profiles INCY";
const DNS_CATEGORY = Object.freeze([
  "geosite:PRIVATE",
  "geosite:CN",
  "geoip:PRIVATE",
  "geoip:CN",
]);

function immutableBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s?#]+(?:\/[^\s?#]+)*$/u.test(value)) {
    throw new TypeError("INCY base URL must be an HTTPS URL without query or fragment");
  }
  return value.replace(/\/+$/u, "");
}

function unixTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError("INCY generatedAt must be an ISO timestamp");
  }
  return String(Math.floor(Date.parse(value) / 1000));
}

function category(value) {
  return Object.freeze([...new Set(value)]);
}

function geoReference(kind, sourceId) {
  if (kind === "ip") {
    return `geoip:${HAPP_GEOIP_ALIASES[sourceId] ?? sourceId.toUpperCase()}`;
  }
  return `geosite:${HAPP_GEOSITE_ALIASES[sourceId] ?? sourceId.toUpperCase()}`;
}

function renderRoutingUrl(baseUrl, channel) {
  const base = immutableBaseUrl(baseUrl);
  void channel;
  return `${base}/incy/routing.json`;
}

function publicRoutingUrl(profile) {
  if (typeof profile.routingUrl === "string" && profile.routingUrl.length > 0) {
    return profile.routingUrl;
  }
  const geoipUrl = typeof profile.Geoipurl === "string" ? profile.Geoipurl : null;
  const geositeUrl = typeof profile.Geositeurl === "string" ? profile.Geositeurl : null;
  const source = geoipUrl ?? geositeUrl;
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }
  return source
    .replace(/\/geoip\.dat$/u, "/routing.json")
    .replace(/\/geosite\.dat$/u, "/routing.json");
}

export function renderIncyRoutingProfile({ baseUrl, generatedAt, channel = "current" }) {
  const base = immutableBaseUrl(baseUrl);
  const routingUrl = renderRoutingUrl(baseUrl, channel);
  const profile = {
    Name: PROFILE_NAME,
    Geoipurl: `${base}/incy/geoip.dat`,
    Geositeurl: `${base}/incy/geosite.dat`,
    LastUpdated: unixTimestamp(generatedAt),
    useChunkFiles: "true",
    DomainStrategy: "IPIfNonMatch",
    DNS: DNS_CATEGORY,
    Direct: category([
      ...HAPP_PROFILE_DIRECT_SITES,
      ...HAPP_PROFILE_DIRECT_IP,
      geoReference("site", "ChinaTLD"),
    ]),
    Proxy: category(HAPP_PROFILE_PROXY_SITES),
    Block: category(HAPP_PROFILE_BLOCK_SITES),
  };
  Object.defineProperty(profile, "routingUrl", {
    value: routingUrl,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(profile);
}

export function renderIncyRoutingDeepLink(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new TypeError("INCY routing profile must be an object");
  }
  const routingUrl = publicRoutingUrl(profile);
  if (typeof routingUrl !== "string" || routingUrl.length === 0) {
    throw new TypeError("INCY routing profile is missing a public routing URL");
  }
  return `incy://autorouting/onadd/${encodeURIComponent(routingUrl)}`;
}
