const TAG_PATTERN = /^ap-incy-[a-z0-9/_-]{1,120}$/u;
const VALID_CONFIG_KEYS = new Set([
  "remarks",
  "log",
  "inbounds",
  "outbounds",
  "dns",
  "routing",
  "observatory",
  "meta",
]);
const STANDARD_INBOUNDS = Object.freeze([
  Object.freeze({ tag: "incy-in-socks", port: 10808, protocol: "socks" }),
  Object.freeze({ tag: "incy-in-http", port: 10809, protocol: "http" }),
]);
const DIRECT_TAG = "ap-incy-direct";
const BLOCK_TAG = "ap-incy-block";
const FOLLOW_PREFIX = "ap-incy-follow/";
const FIXED_PREFIX = "ap-incy-fixed/";
const DNS_PREFIX = "ap-incy-dns/";
const BALANCER_PREFIX = "balancer-ap-incy-fixed/";
const SECRET_VALUE_PATTERNS = [
  /TEST_ONLY_/u,
  /https?:\/\/[^\s]+/iu,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/iu,
  /\bpassword\b/iu,
  /\buuid\b/iu,
];

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
    if (key === "inbounds" || key === "routing" || key === "dns" || key === "api" || key === "policy" || key === "stats" || key === "observatory" || key === "reverse" || key === "transport") {
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
    if (key !== "tag" && key !== "protocol" && key !== "name" && key !== "settings" && key !== "streamSettings" && key !== "mux" && key !== "sendThrough" && key !== "packetEncoding" && key !== "proxySettings" && key !== "dialerProxy" && key !== "domainStrategy") {
      throw new Error(`INCY outbound contains forbidden key '${key}'`);
    }
  }
  validateTag(outbound.tag, seen);
  if (typeof outbound.protocol !== "string" || outbound.protocol.trim().length === 0) {
    throw new Error("INCY outbound protocol is invalid");
  }
  validateSettingsShape(outbound.protocol, outbound.settings);
  for (const key of Object.keys(outbound)) {
    if (key === "password" || key === "uuid" || key === "cipher" || key === "psk" || key === "username" || key === "private-key" || key === "public-key" || key === "server" || key === "port" || key === "flow" || key === "security" || key === "auth" || key === "method" || key === "id" || key === "key" || key === "token" || key === "secret") {
      throw new Error("INCY outbound contains secret metadata");
    }
  }
}

function validateInboundShape(inbound, index) {
  if (!isPlainObject(inbound)) {
    throw new TypeError("INCY inbound must be a plain object");
  }
  if (inbound.tag !== STANDARD_INBOUNDS[index].tag) {
    throw new Error("INCY inbound tag is invalid");
  }
  if (inbound.port !== STANDARD_INBOUNDS[index].port) {
    throw new Error("INCY inbound port is invalid");
  }
  if (inbound.protocol !== STANDARD_INBOUNDS[index].protocol) {
    throw new Error("INCY inbound protocol is invalid");
  }
  if (inbound.listen !== "127.0.0.1") {
    throw new Error("INCY inbound listen address is invalid");
  }
}

function validateDns(config, outboundTags, followTag) {
  if (!isPlainObject(config.dns)) {
    throw new Error("INCY DNS config is invalid");
  }
  if (typeof config.dns.tag !== "string" || !config.dns.tag.startsWith(DNS_PREFIX)) {
    throw new Error("INCY DNS tag is invalid");
  }
  if (!Array.isArray(config.dns.servers) || config.dns.servers.length !== 2) {
    throw new Error("INCY DNS servers are invalid");
  }
  const [directServer, followServer] = config.dns.servers;
  if (directServer?.tag !== DIRECT_TAG || followServer?.tag !== followTag) {
    throw new Error("INCY DNS server tags are invalid");
  }
  if (typeof config.dns.queryStrategy !== "string" || !["UseIPv4", "UseIP"].includes(config.dns.queryStrategy)) {
    throw new Error("INCY DNS query strategy is invalid");
  }
  if (!outboundTags.has(DIRECT_TAG) || !outboundTags.has(followTag)) {
    throw new Error("INCY DNS references missing outbound tags");
  }
}

function validateRouting(config, outboundTags, balancerTags, followTag, observatorySelectors) {
  if (!isPlainObject(config.routing)) {
    throw new Error("INCY routing config is invalid");
  }
  if (config.routing.domainStrategy !== "IPIfNonMatch") {
    throw new Error("INCY routing domainStrategy must be IPIfNonMatch");
  }
  if (!Array.isArray(config.routing.rules) || config.routing.rules.length === 0) {
    throw new Error("INCY routing rules are invalid");
  }
  const finalRule = config.routing.rules.at(-1);
  if (finalRule?.network !== "tcp,udp" || finalRule?.outboundTag !== followTag) {
    throw new Error("INCY routing final rule must target the follow outbound");
  }
  for (const rule of config.routing.rules) {
    if (rule?.outboundTag && !outboundTags.has(rule.outboundTag) && !balancerTags.has(rule.outboundTag)) {
      throw new Error(`INCY routing rule references missing outbound '${rule.outboundTag}'`);
    }
    if (rule?.balancerTag && !balancerTags.has(rule.balancerTag)) {
      throw new Error(`INCY routing rule references missing balancer '${rule.balancerTag}'`);
    }
  }
  if (!Array.isArray(config.routing.balancers)) {
    throw new Error("INCY routing balancers are invalid");
  }
  for (const balancer of config.routing.balancers) {
    if (!isPlainObject(balancer)) {
      throw new Error("INCY balancer must be a plain object");
    }
    if (typeof balancer.tag !== "string" || !balancer.tag.startsWith(BALANCER_PREFIX)) {
      throw new Error("INCY balancer tag is invalid");
    }
    if (!balancerTags.has(balancer.tag)) {
      throw new Error("INCY balancer tag is missing from routing references");
    }
    if (!Array.isArray(balancer.selector) || balancer.selector.length !== 1 || !outboundTags.has(balancer.selector[0])) {
      throw new Error("INCY balancer selector is invalid");
    }
    if (balancer.fallbackTag !== followTag) {
      throw new Error("INCY balancer fallback must target the follow outbound");
    }
    if (!observatorySelectors.includes(followTag) || !observatorySelectors.includes(balancer.selector[0])) {
      throw new Error("INCY balancer selector is not observed");
    }
  }
}

function validateObservatory(config, followTag, fixedTags) {
  if (!isPlainObject(config.observatory)) {
    throw new Error("INCY observatory config is invalid");
  }
  if (!Array.isArray(config.observatory.subjectSelector) || config.observatory.subjectSelector.length === 0) {
    throw new Error("INCY observatory selectors are invalid");
  }
  if (config.observatory.subjectSelector[0] !== followTag) {
    throw new Error("INCY observatory must prioritize the follow outbound");
  }
  for (const tag of fixedTags) {
    if (!config.observatory.subjectSelector.includes(tag)) {
      throw new Error("INCY observatory is missing a fixed selector");
    }
  }
  if (config.observatory.probeUrl !== "https://www.gstatic.com/generate_204") {
    throw new Error("INCY observatory probe URL is invalid");
  }
}

function validateMeta(config) {
  if (!isPlainObject(config.meta)) {
    throw new Error("INCY meta is invalid");
  }
  const keys = Object.keys(config.meta).sort();
  if (keys.join(",") !== "platform,schemaVersion,serverDescription") {
    throw new Error("INCY meta contains forbidden fields");
  }
  if (typeof config.meta.platform !== "string" || config.meta.platform.length === 0) {
    throw new Error("INCY meta platform is invalid");
  }
  if (config.meta.schemaVersion !== 2) {
    throw new Error("INCY meta schemaVersion is invalid");
  }
  if (typeof config.meta.serverDescription !== "string" || config.meta.serverDescription.length === 0) {
    throw new Error("INCY meta serverDescription is invalid");
  }
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(config.meta.serverDescription))) {
    throw new Error("INCY meta contains secret values");
  }
}

function validateIncyConfig(config) {
  if (!isPlainObject(config)) {
    throw new TypeError("INCY config must be a plain object");
  }
  for (const key of Object.keys(config)) {
    if (!VALID_CONFIG_KEYS.has(key)) {
      throw new Error(`INCY config contains forbidden key '${key}'`);
    }
  }
  if (typeof config.remarks !== "string" || config.remarks.length === 0) {
    throw new Error("INCY config remarks are invalid");
  }
  if (!isPlainObject(config.log) || config.log.loglevel !== "info") {
    throw new Error("INCY config loglevel is invalid");
  }
  if (!Array.isArray(config.inbounds) || config.inbounds.length !== STANDARD_INBOUNDS.length) {
    throw new Error("INCY config requires the standard inbounds");
  }
  config.inbounds.forEach(validateInboundShape);

  const outboundContainer = { outbounds: config.outbounds };
  assertIncyOutbound(outboundContainer);
  const outboundTags = new Set(config.outbounds.map((outbound) => outbound.tag));
  const followTags = config.outbounds.filter((outbound) => typeof outbound.tag === "string" && outbound.tag.startsWith(FOLLOW_PREFIX)).map((outbound) => outbound.tag);
  const fixedTags = config.outbounds.filter((outbound) => typeof outbound.tag === "string" && outbound.tag.startsWith(FIXED_PREFIX)).map((outbound) => outbound.tag);
  const balancerTags = new Set((config.routing?.balancers ?? []).map((balancer) => balancer.tag));

  if (followTags.length !== 1) {
    throw new Error("INCY config requires exactly one follow outbound");
  }
  if (!outboundTags.has(DIRECT_TAG) || !outboundTags.has(BLOCK_TAG)) {
    throw new Error("INCY config is missing direct or block outbounds");
  }
  validateDns(config, outboundTags, followTags[0]);
  validateRouting(config, outboundTags, balancerTags, followTags[0], config.observatory?.subjectSelector ?? []);
  validateObservatory(config, followTags[0], fixedTags);
  validateMeta(config);
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
    validateIncyConfig(config);
  }
  return true;
}
