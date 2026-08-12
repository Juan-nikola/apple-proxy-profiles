import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "./geodata-contract.js";
import { canonicalProfileJson, encodeStandardBase64 } from "./profile-codec.js";

const MAX_PROFILE_LINK_LENGTH = 32_768;
const CHANNELS = new Set(["edge", "current", "previous"]);
const RESERVED_TAGS = new Set([
  "proxy", "chainProxy", "direct", "fragment", "block", "dnsOut", "tunIn", "pingIn",
]);
const DNS_TAGS = new Set(["dns-global", "dns-china"]);
const RUNTIME_OUTBOUND_TAGS = new Set(["proxy"]);
const INBOUND_TAGS = new Set(["tunIn", "pingIn", "dnsOut"]);
const TOP_LEVEL_KEYS = new Set(["name", "log", "dns", "routing", "inbounds", "outbounds"]);
const LOG_KEYS = new Set(["loglevel"]);
const DNS_KEYS = new Set(["servers"]);
const DNS_SERVER_KEYS = new Set(["tag", "address", "domains", "skipFallback"]);
const ROUTING_KEYS = new Set(["domainStrategy", "rules"]);
const ROUTE_KEYS = new Set(["type", "inboundTag", "domain", "ip", "network", "port", "outboundTag"]);
const INBOUND_KEYS = new Set(["tag", "protocol", "settings", "listen", "port"]);
const OUTBOUND_KEYS = new Set(["name", "protocol", "settings", "tag", "streamSettings", "mux"]);
const STREAM_KEYS = new Set([
  "network", "rawSettings", "wsSettings", "grpcSettings", "httpupgradeSettings", "xhttpSettings",
  "kcpSettings", "security", "tlsSettings", "realitySettings", "hysteriaSettings",
]);
const TLS_KEYS = new Set(["serverName", "alpn", "fingerprint"]);
const REALITY_KEYS = new Set(["fingerprint", "serverName", "publicKey", "shortId", "spiderX"]);
const MUX_KEYS = new Set(["enabled"]);
const KNOWN_PROTOCOLS = new Set(["vless", "vmess", "shadowsocks", "trojan", "socks", "http", "hysteria", "freedom", "blackhole", "dns"]);
const CREDENTIAL_KEY = /(?:pass(?:word)?|token|secret|psk|private(?:[-_ ]?key)?|uuid|public(?:[-_ ]?key)?|auth|id)$/iu;
const DIAGNOSTIC_KEY = /(?:diagnostic|debug|error|warning|excluded|accepted|subscription|policyoverride|policy_overrides)/iu;
const PEM = /-----BEGIN [^-]+-----/u;
const URL_SCHEME = /^(?:https?|vless|vmess|trojan|ss|socks(?:5)?|hysteria2?):\/\//iu;
const EXT_REFERENCE = /^ext:([^./]+)\.(dat):([A-Z0-9]+(?:-[A-Z0-9]+)*)$/u;
const APPROVED_DNS_URLS = new Set([
  "https://dns.alidns.com/dns-query",
  "https://doh.pub/dns-query",
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/dns-query",
  "https://dns.quad9.net/dns-query",
]);

function add(errors, message) {
  errors.add(message);
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function keysOnly(value, allowed, path, errors) {
  if (!object(value)) {
    add(errors, `${path} must be an object`);
    return false;
  }
  let valid = true;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      add(errors, `${path}.${key} is not an allowed OneXray model key`);
      valid = false;
    }
  }
  return valid;
}

function strings(values, path, errors) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.length === 0)) {
    add(errors, `${path} must be a non-empty string array`);
    return false;
  }
  return true;
}

function validateDns(profile, errors) {
  if (!keysOnly(profile.dns, DNS_KEYS, "dns", errors) || !Array.isArray(profile.dns.servers)) {
    add(errors, "dns.servers must be an array");
    return;
  }
  for (const [index, server] of profile.dns.servers.entries()) {
    const path = `dns.servers[${index}]`;
    if (!keysOnly(server, DNS_SERVER_KEYS, path, errors)) continue;
    if (typeof server.tag !== "string" || !DNS_TAGS.has(server.tag)) add(errors, `${path}.tag is not an audited DNS tag`);
    if (typeof server.address !== "string" || server.address.length === 0) add(errors, `${path}.address is invalid`);
    if (server.domains !== undefined && !strings(server.domains, `${path}.domains`, errors)) continue;
    if (server.skipFallback !== undefined && typeof server.skipFallback !== "boolean") add(errors, `${path}.skipFallback is invalid`);
  }
}

function validateRouting(profile, errors) {
  if (!keysOnly(profile.routing, ROUTING_KEYS, "routing", errors)) return;
  if (profile.routing.domainStrategy !== "IPIfNonMatch") add(errors, "routing.domainStrategy must be IPIfNonMatch");
  if (!Array.isArray(profile.routing.rules)) {
    add(errors, "routing.rules must be an array");
    return;
  }
  for (const [index, rule] of profile.routing.rules.entries()) {
    const path = `routing.rules[${index}]`;
    if (!keysOnly(rule, ROUTE_KEYS, path, errors)) continue;
    if (rule.type !== "field") add(errors, `${path}.type must be field`);
    for (const key of ["inboundTag", "domain", "ip"]) {
      if (rule[key] !== undefined) strings(rule[key], `${path}.${key}`, errors);
    }
    if (rule.network !== undefined && (typeof rule.network !== "string" || !/^(?:tcp|udp)(?:,(?:tcp|udp))*$/u.test(rule.network))) add(errors, `${path}.network is invalid`);
    if (rule.port !== undefined && !((Number.isSafeInteger(rule.port) && rule.port >= 1 && rule.port <= 65535) || (typeof rule.port === "string" && /^[0-9]+(?:-[0-9]+)?$/u.test(rule.port)))) add(errors, `${path}.port is invalid`);
    if (typeof rule.outboundTag !== "string" || rule.outboundTag.length === 0) add(errors, `${path}.outboundTag is invalid`);
  }
}

function validateStream(stream, path, errors) {
  if (!keysOnly(stream, STREAM_KEYS, path, errors)) return;
  if (typeof stream.network !== "string") add(errors, `${path}.network is invalid`);
  if (stream.security !== undefined && !["none", "tls", "reality"].includes(stream.security)) add(errors, `${path}.security is invalid`);
  if (stream.tlsSettings !== undefined) {
    if (!keysOnly(stream.tlsSettings, TLS_KEYS, `${path}.tlsSettings`, errors)) return;
    if (stream.tlsSettings.alpn !== undefined && !strings(stream.tlsSettings.alpn, `${path}.tlsSettings.alpn`, errors)) return;
  }
  if (stream.realitySettings !== undefined) {
    if (!keysOnly(stream.realitySettings, REALITY_KEYS, `${path}.realitySettings`, errors)) return;
    if (typeof stream.realitySettings.fingerprint !== "string" || typeof stream.realitySettings.publicKey !== "string") add(errors, `${path}.realitySettings credentials are incomplete`);
  }
  for (const key of ["rawSettings", "wsSettings", "grpcSettings", "httpupgradeSettings", "xhttpSettings", "kcpSettings", "hysteriaSettings"]) {
    if (stream[key] !== undefined && !object(stream[key])) add(errors, `${path}.${key} must be an object`);
  }
}

function validateSettings(protocol, settings, path, errors) {
  if (!object(settings)) {
    if (!["freedom", "blackhole", "dns"].includes(protocol)) add(errors, `${path} must be an object`);
    return;
  }
  const allowed = {
    vless: new Set(["address", "port", "id", "flow", "encryption", "reverse"]),
    vmess: new Set(["address", "port", "id", "security"]),
    shadowsocks: new Set(["address", "port", "method", "password"]),
    trojan: new Set(["address", "port", "password"]),
    socks: new Set(["address", "port", "user", "pass"]),
    http: new Set(["address", "port", "user", "pass", "headers"]),
    hysteria: new Set(["version", "address", "port"]),
    freedom: new Set(),
    blackhole: new Set(),
    dns: new Set(),
  }[protocol] ?? new Set();
  if (!keysOnly(settings, allowed, path, errors)) return;
  if (protocol === "vless" && settings.reverse !== undefined && (!object(settings.reverse) || Object.keys(settings.reverse).some((key) => key !== "tag") || typeof settings.reverse.tag !== "string")) add(errors, `${path}.reverse is invalid`);
  if (protocol === "http" && settings.headers !== undefined && !object(settings.headers)) add(errors, `${path}.headers is invalid`);
}

function validateOutbounds(profile, errors) {
  if (!Array.isArray(profile.outbounds)) {
    add(errors, "outbounds must be an array");
    return;
  }
  for (const [index, outbound] of profile.outbounds.entries()) {
    const path = `outbounds[${index}]`;
    if (!keysOnly(outbound, OUTBOUND_KEYS, path, errors)) continue;
    if (typeof outbound.protocol !== "string" || !KNOWN_PROTOCOLS.has(outbound.protocol)) add(errors, `${path}.protocol is unsupported`);
    if (typeof outbound.tag !== "string" || outbound.tag.length === 0) add(errors, `${path}.tag is invalid`);
    if (outbound.name !== undefined && typeof outbound.name !== "string") add(errors, `${path}.name is invalid`);
    validateSettings(outbound.protocol, outbound.settings, `${path}.settings`, errors);
    if (outbound.streamSettings !== undefined) validateStream(outbound.streamSettings, `${path}.streamSettings`, errors);
    if (outbound.mux !== undefined && (!keysOnly(outbound.mux, MUX_KEYS, `${path}.mux`, errors) || typeof outbound.mux.enabled !== "boolean")) add(errors, `${path}.mux.enabled is invalid`);
  }
}

function validateModel(profile, errors) {
  if (!keysOnly(profile, TOP_LEVEL_KEYS, "Profile", errors)) return;
  if (typeof profile.name !== "string" || profile.name.length === 0 || /[\r\n\u2028\u2029]/u.test(profile.name)) add(errors, "Profile.name is invalid");
  if (!keysOnly(profile.log, LOG_KEYS, "log", errors) || typeof profile.log.loglevel !== "string") add(errors, "log.loglevel is invalid");
  validateDns(profile, errors);
  validateRouting(profile, errors);
  if (!Array.isArray(profile.inbounds)) add(errors, "inbounds must be an array");
  else for (const [index, inbound] of profile.inbounds.entries()) {
    const path = `inbounds[${index}]`;
    if (!keysOnly(inbound, INBOUND_KEYS, path, errors)) continue;
    if (typeof inbound.tag !== "string" || !INBOUND_TAGS.has(inbound.tag)) add(errors, `${path}.tag is not a runtime inbound tag`);
    if (typeof inbound.protocol !== "string") add(errors, `${path}.protocol is invalid`);
  }
  validateOutbounds(profile, errors);
}

function tagChecks(profile, errors) {
  const all = new Set();
  const outbounds = Array.isArray(profile.outbounds) ? profile.outbounds : [];
  const inbounds = Array.isArray(profile.inbounds) ? profile.inbounds : [];
  const servers = Array.isArray(profile.dns?.servers) ? profile.dns.servers : [];
  for (const item of [...outbounds, ...inbounds, ...servers]) {
    if (!object(item) || typeof item.tag !== "string") continue;
    if (all.has(item.tag)) add(errors, `duplicate tag: ${item.tag}`);
    all.add(item.tag);
  }
  for (const outbound of outbounds) {
    if (!object(outbound) || typeof outbound.tag !== "string") continue;
    if (RESERVED_TAGS.has(outbound.tag) && !["direct", "block", "dnsOut", "chainProxy"].includes(outbound.tag)) add(errors, `reserved outbound tag is not runtime-owned: ${outbound.tag}`);
    if (outbound.tag === "direct" && outbound.protocol !== "freedom") add(errors, "direct must use freedom");
    if (outbound.tag === "block" && outbound.protocol !== "blackhole") add(errors, "block must use blackhole");
    if (outbound.tag === "dnsOut" && outbound.protocol !== "dns") add(errors, "dnsOut must use dns");
  }
  for (const server of servers) if (object(server) && typeof server.tag === "string" && !DNS_TAGS.has(server.tag)) add(errors, `unknown OneXray DNS tag: ${server.tag}`);
}

function systemOutboundChecks(profile, context, errors) {
  if (!Array.isArray(profile.outbounds)) {
    add(errors, "outbounds must be an array");
    return;
  }
  const required = new Map([["direct", "freedom"], ["block", "blackhole"], ["dnsOut", "dns"]]);
  for (const [tag, protocol] of required) {
    const matches = profile.outbounds.filter((outbound) => outbound?.tag === tag);
    if (matches.length !== 1) add(errors, `Profile requires exactly one ${tag} outbound`);
    else if (matches[0].protocol !== protocol) add(errors, `${tag} outbound must use ${protocol}`);
  }
  const chain = profile.outbounds.filter((outbound) => outbound?.tag === "chainProxy");
  if (chain.length > 0 && chain.some((outbound) => ["freedom", "blackhole", "dns"].includes(outbound?.protocol))) {
    add(errors, "chainProxy must be a valid custom landing outbound");
  }
  if (chain.length > 0 && chain.some((outbound) => typeof outbound.name !== "string" || !object(outbound.settings))) {
    add(errors, "chainProxy landing outbound is incomplete");
  }
  if (context.chain?.enabled === true && chain.length !== 1) add(errors, "chain-enabled Profile must contain exactly one chainProxy outbound");
}

function outboundReferences(profile, errors) {
  const outbounds = Array.isArray(profile.outbounds) ? profile.outbounds : [];
  const tags = new Set(outbounds.map((outbound) => outbound?.tag).filter((tag) => typeof tag === "string"));
  const rules = Array.isArray(profile.routing?.rules) ? profile.routing.rules : [];
  for (const rule of rules) {
    if (!object(rule) || typeof rule.outboundTag !== "string") continue;
    if (!tags.has(rule.outboundTag) && !RUNTIME_OUTBOUND_TAGS.has(rule.outboundTag)) add(errors, `routing references missing outbound: ${rule.outboundTag}`);
  }
}

function inboundReferences(profile, errors) {
  const inbounds = Array.isArray(profile.inbounds) ? profile.inbounds : [];
  const tags = new Set([...inbounds.map((inbound) => inbound?.tag), ...INBOUND_TAGS]);
  const rules = Array.isArray(profile.routing?.rules) ? profile.routing.rules : [];
  for (const rule of rules) {
    if (!object(rule)) continue;
    if (!Array.isArray(rule.inboundTag)) continue;
    for (const tag of rule.inboundTag) if (!tags.has(tag)) add(errors, `routing references missing inbound: ${tag}`);
  }
}

function geoCodes(context, channel) {
  const names = oneXrayGeoNames(channel);
  const sourceIds = orderedRoutingPlan().map(({ id }) => id);
  const fromContext = context.geo?.codes;
  if (fromContext instanceof Set) return { names, codes: fromContext };
  if (Array.isArray(fromContext)) return { names, codes: new Set(fromContext) };
  const codes = new Set(sourceIds.map(oneXrayGeoCode));
  return { names, codes };
}

function geoReferences(profile, context, errors) {
  const channel = CHANNELS.has(context.channel) ? context.channel : "edge";
  const { names, codes } = geoCodes(context, channel);
  const allStrings = [];
  const seen = new Set();
  const walk = (value) => {
    if (typeof value === "string") allStrings.push(value);
    else if (Array.isArray(value)) {
      if (seen.has(value)) return;
      seen.add(value);
      value.forEach(walk);
    } else if (object(value)) {
      if (seen.has(value)) return;
      seen.add(value);
      Object.values(value).forEach(walk);
    }
  };
  walk(profile);
  for (const value of allStrings) {
    if (!value.startsWith("ext:")) continue;
    const match = EXT_REFERENCE.exec(value);
    if (!match) {
      add(errors, `invalid GeoData reference: ${value}`);
      continue;
    }
    if (![names.domain, names.ip].includes(match[1]) || !codes.has(match[3])) add(errors, `missing GeoData reference: ${value}`);
  }
}

function chainChecks(profile, context, errors) {
  const enabled = context.chain?.enabled === true || context.resolution?.chain?.enabled === true;
  const outbounds = Array.isArray(profile.outbounds) ? profile.outbounds : [];
  const chain = outbounds.filter((outbound) => outbound?.tag === "chainProxy");
  if (enabled && chain.length !== 1) add(errors, "chain-enabled Profile must contain exactly one chainProxy outbound");
  if (!enabled && chain.length !== 0) add(errors, "chain-off Profile must not contain chainProxy");
  if (context.chain?.landingTag !== undefined && enabled && context.chain.landingTag !== "chainProxy") add(errors, "chain landing tag is invalid");
  try {
    const serialized = JSON.stringify(profile);
    if (serialized.includes("dialerProxy")) add(errors, "dialerProxy is not allowed in OneXray Profile");
  } catch {
    add(errors, "Profile contains a non-JSON value or cycle");
  }
}

function secretBoundary(profile, errors) {
  const seen = new Set();
  const walk = (value, path = [], approvedCredential = false) => {
    if (Array.isArray(value)) {
      if (seen.has(value)) return;
      seen.add(value);
      value.forEach((entry, index) => walk(entry, [...path, String(index)], approvedCredential));
      return;
    }
    if (!object(value)) {
      if (typeof value === "string") {
        if (PEM.test(value)) add(errors, "Profile contains PEM key material");
        const inDnsAddress = path[0] === "dns" && path.at(-1) === "address";
        if (URL_SCHEME.test(value) && (!inDnsAddress || !APPROVED_DNS_URLS.has(value))) add(errors, "Profile contains a subscription or node URL");
      }
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    for (const [key, entry] of Object.entries(value)) {
      const next = [...path, key];
      if (DIAGNOSTIC_KEY.test(key) && key !== "loglevel") add(errors, `Profile contains diagnostic or private field: ${key}`);
      const customSettings = path[0] === "outbounds" && path[2] === "settings";
      const allowedCredential = approvedCredential || customSettings || path[2] === "streamSettings";
      if (CREDENTIAL_KEY.test(key) && !allowedCredential && key !== "id") add(errors, `Profile contains credential field outside custom outbound: ${key}`);
      walk(entry, next, allowedCredential);
    }
  };
  walk(profile);
}

function canonicalChecks(profile, context, errors) {
  let canonical;
  try {
    canonical = canonicalProfileJson(profile);
    if (JSON.stringify(JSON.parse(canonical)) !== canonical) add(errors, "Profile canonical JSON round-trip is not stable");
  } catch (error) {
    add(errors, `Profile canonical JSON is invalid: ${error.message}`);
    return;
  }
  const channel = CHANNELS.has(context.channel) ? context.channel : "edge";
  const name = `Apple Proxy · OneXray · ${channel}`;
  const bytes = new TextEncoder().encode(canonical);
  const digest = "00000000";
  const encoded = encodeURIComponent(encodeStandardBase64(bytes));
  const fragment = encodeURIComponent(`${name} · ${digest}`);
  if (`onexray://onexray.com/config/add?type=profile&data=${encoded}#${fragment}`.length > MAX_PROFILE_LINK_LENGTH) add(errors, "OneXray Profile deep link exceeds 32 KiB");
}

export function validateOneXrayProfile(profile, context = {}) {
  const errors = new Set();
  if (!object(profile)) add(errors, "OneXray Profile must be an object");
  else {
    validateModel(profile, errors);
    tagChecks(profile, errors);
    systemOutboundChecks(profile, context, errors);
    outboundReferences(profile, errors);
    inboundReferences(profile, errors);
    geoReferences(profile, context, errors);
    chainChecks(profile, context, errors);
    secretBoundary(profile, errors);
    canonicalChecks(profile, context, errors);
    const channel = CHANNELS.has(context.channel) ? context.channel : "edge";
    if (profile.name !== `Apple Proxy · OneXray · ${channel}`) add(errors, "Profile.name must be the invariant channel base name");
  }
  const checks = {
    uniqueTags: ![...errors].some((message) => /duplicate tag/iu.test(message)),
    allOutboundRefsExist: ![...errors].some((message) => /missing outbound/iu.test(message)),
    allInboundRefsAllowed: ![...errors].some((message) => /missing inbound/iu.test(message)),
    allGeoRefsExist: ![...errors].some((message) => /GeoData reference/iu.test(message)),
    reservedTagsValid: ![...errors].some((message) => /reserved|runtime-owned|unknown OneXray DNS tag|must use freedom|must use blackhole|must use dns/iu.test(message)),
    oneXrayModelKeysOnly: ![...errors].some((message) => /allowed OneXray model key|unsupported|model key/iu.test(message)),
    chainShapeValid: ![...errors].some((message) => /chain|dialerProxy/iu.test(message)),
    canonicalRoundTrip: ![...errors].some((message) => /canonical JSON/iu.test(message)),
    encodedLengthAtMost: ![...errors].some((message) => /32 KiB|deep link/iu.test(message)),
  };
  return Object.freeze({ valid: errors.size === 0, errors: [...errors], checks: Object.freeze(checks) });
}

export { MAX_PROFILE_LINK_LENGTH, RESERVED_TAGS };
