const TAG_PATTERN = /^ap-incy-[a-z0-9/_-]{1,120}$/u;
const FORBIDDEN_CONTAINER_KEYS = new Set([
  "inbounds",
  "routing",
  "dns",
  "api",
  "policy",
  "stats",
  "observatory",
  "reverse",
  "transport",
]);
const ALLOWED_OUTBOUND_KEYS = new Set([
  "tag",
  "protocol",
  "name",
  "settings",
  "streamSettings",
  "mux",
  "sendThrough",
  "packetEncoding",
  "proxySettings",
  "dialerProxy",
  "domainStrategy",
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ensureContainerShape(container) {
  if (!isPlainObject(container)) {
    throw new TypeError("INCY subscription must be a plain object");
  }
  for (const key of Object.keys(container)) {
    if (FORBIDDEN_CONTAINER_KEYS.has(key)) {
      throw new Error(`INCY subscription contains forbidden key '${key}'`);
    }
  }
  if (!Array.isArray(container.outbounds) || container.outbounds.length === 0) {
    throw new Error("INCY subscription requires at least one outbound");
  }
  return container.outbounds;
}

function validateTag(tag, seen) {
  if (typeof tag !== "string" || !TAG_PATTERN.test(tag)) {
    throw new Error("INCY outbound tag is invalid");
  }
  if (seen.has(tag)) {
    throw new Error("INCY subscription contains duplicate outbound tags");
  }
  seen.add(tag);
}

function validateSettingsShape(protocol, settings) {
  if (!isPlainObject(settings)) {
    throw new TypeError("INCY outbound settings must be a plain object");
  }
  switch (protocol) {
    case "vless":
    case "vmess":
      if (!Array.isArray(settings.vnext)) {
        throw new Error("INCY outbound settings schema is invalid");
      }
      break;
    case "trojan":
    case "ss":
    case "shadowsocks":
    case "socks5":
    case "http":
      if (!Array.isArray(settings.servers)) {
        throw new Error("INCY outbound settings schema is invalid");
      }
      break;
    default:
      break;
  }
}

function validateOutbound(outbound, seen) {
  if (!isPlainObject(outbound)) {
    throw new TypeError("INCY outbound must be a plain object");
  }
  for (const key of Object.keys(outbound)) {
    if (!ALLOWED_OUTBOUND_KEYS.has(key)) {
      throw new Error(`INCY outbound contains forbidden key '${key}'`);
    }
  }
  validateTag(outbound.tag, seen);
  if (typeof outbound.protocol !== "string" || outbound.protocol.trim().length === 0) {
    throw new Error("INCY outbound protocol is invalid");
  }
  validateSettingsShape(outbound.protocol, outbound.settings);
  for (const key of Object.keys(outbound)) {
    if (["password", "uuid", "cipher", "psk", "username", "private-key", "public-key", "server", "port", "flow", "security", "auth", "method", "id", "key", "token", "secret"].includes(key)) {
      throw new Error("INCY outbound contains secret metadata");
    }
  }
}

export function assertIncyOutbound(container) {
  const outbounds = ensureContainerShape(container);
  const seen = new Set();
  for (const outbound of outbounds) {
    validateOutbound(outbound, seen);
  }
  return true;
}

export function validateIncySubscription(configs) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new Error("INCY subscription set must be a non-empty array");
  }
  for (const config of configs) {
    assertIncyOutbound(config);
  }
  return true;
}
