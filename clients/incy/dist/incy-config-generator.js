var INCYConfigBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/substore-config-entry.js
  var substore_config_entry_exports = {};
  __export(substore_config_entry_exports, {
    operator: () => operator
  });

  // ../../shared/contracts.js
  var CLIENT = Object.freeze({
    anywhere: "anywhere",
    egern: "egern",
    shadowrocket: "shadowrocket",
    surge: "surge",
    singbox: "singbox",
    happ: "happ",
    v2box: "v2box",
    clash: "clash"
  });
  var PRIVATE_POLICY_CHANNELS = Object.freeze(["edge", "current", "previous"]);
  var PRIVATE_POLICY_CLIENTS = Object.freeze([
    CLIENT.anywhere,
    CLIENT.egern,
    CLIENT.shadowrocket,
    CLIENT.surge,
    CLIENT.singbox,
    CLIENT.happ,
    CLIENT.v2box,
    CLIENT.clash
  ]);
  var PRIVATE_POLICY_TARGET_IDS = Object.freeze([
    "ai",
    "github",
    "youtube",
    "overseasMedia",
    "globalSocial",
    "overseasGame",
    "domesticCore",
    "domesticPlatform",
    "chinaIp",
    "apple",
    "microsoft",
    "download"
  ]);
  var OPTION_VALUES = Object.freeze({
    output: Object.freeze(["nodes", "config"]),
    type: Object.freeze(["collection"]),
    platform: Object.freeze(["iphone", "ipad", "macos", "appletv", "windows", "linux"]),
    region: Object.freeze(["cn", "global", "ru", "ir"]),
    dnsMode: Object.freeze(["stable", "privacy", "speed"]),
    chinaDns: Object.freeze(["alidns", "dnspod", "system"]),
    globalDns: Object.freeze(["cloudflare", "google", "quad9"]),
    blockMode: Object.freeze(["balanced", "security", "strict", "off"]),
    quicMode: Object.freeze(["allow", "proxy-block", "all-block"]),
    ipv6Mode: Object.freeze(["auto", "ipv4-only"]),
    autoGroupMode: Object.freeze(["auto", "full", "balanced", "minimal"]),
    clientChain: Object.freeze(["off", "on"])
  });
  var SOURCE_KIND = Object.freeze({
    airport: "airport",
    selfHosted: "selfHosted",
    realm: "realm",
    serverChain: "serverChain",
    landing: "landing",
    unknown: "unknown"
  });
  var CONTINENT = Object.freeze({
    asiaPacific: "asiaPacific",
    europe: "europe",
    americas: "americas",
    other: "other"
  });

  // ../../shared/release/client-catalog.js
  var freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  var records = [
    {
      id: CLIENT.anywhere,
      displayName: "Anywhere",
      state: "active",
      platforms: ["iphone", "ipad", "macos", "appletv"],
      configFormat: "clash-yaml",
      ruleFormat: "clash-yaml",
      nodeValidator: "anywhere",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "anywhere-v1",
      publicDirectory: "anywhere"
    },
    {
      id: CLIENT.egern,
      displayName: "Egern",
      state: "active",
      platforms: ["iphone", "ipad", "macos"],
      configFormat: "yaml",
      ruleFormat: "yaml",
      nodeValidator: "egern",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "egern-v1",
      publicDirectory: "egern"
    },
    {
      id: CLIENT.shadowrocket,
      displayName: "Shadowrocket",
      state: "active",
      platforms: ["iphone", "ipad", "macos"],
      configFormat: "ini",
      ruleFormat: "list",
      nodeValidator: "shadowrocket",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "shadowrocket-v1",
      publicDirectory: "shadowrocket"
    },
    {
      id: CLIENT.surge,
      displayName: "Surge",
      state: "active",
      platforms: ["macos", "iphone", "ipad"],
      configFormat: "ini",
      ruleFormat: "list",
      nodeValidator: "surge",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "surge-v1",
      publicDirectory: "surge"
    },
    {
      id: CLIENT.singbox,
      displayName: "sing-box",
      state: "active",
      platforms: ["macos", "iphone", "ipad", "android"],
      configFormat: "json",
      ruleFormat: "srs",
      nodeValidator: "singbox",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "singbox-v1",
      publicDirectory: "sing-box"
    },
    {
      id: CLIENT.happ,
      displayName: "HAPP",
      state: "active",
      platforms: ["macos", "iphone", "ipad"],
      configFormat: "happ-json",
      ruleFormat: "xray-geodata",
      nodeValidator: "happ",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "happ-v1",
      publicDirectory: "happ"
    },
    {
      id: CLIENT.v2box,
      displayName: "V2Box",
      state: "active",
      platforms: ["iphone", "ipad"],
      configFormat: "xray-profile-json",
      ruleFormat: "xray-geodata",
      nodeValidator: "v2box",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "v2box-v1",
      publicDirectory: "v2box"
    },
    {
      id: CLIENT.clash,
      displayName: "Clash Apple",
      state: "active",
      platforms: ["iphone", "ipad", "macos", "appletv"],
      configFormat: "mihomo-yaml",
      ruleFormat: "mihomo-classical-yaml",
      nodeValidator: "clash",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "clash-v1",
      publicDirectory: "clash"
    }
  ].map((record) => freeze(record));
  var byId = new Map(records.map((record) => [record.id, record]));
  var ids = freeze(records.map(({ id }) => id));
  var activeIds = freeze(records.filter(({ state }) => state === "active").map(({ id }) => id));
  var plannedIds = freeze(records.filter(({ state }) => state === "planned").map(({ id }) => id));
  var lightweightRuleIds = freeze([
    CLIENT.anywhere,
    CLIENT.egern,
    CLIENT.shadowrocket,
    CLIENT.surge,
    CLIENT.singbox,
    CLIENT.clash
  ]);

  // ../../shared/release/frontier-manifest.js
  var FRONTIER_CHANNELS = Object.freeze(["current"]);
  var FRONTIER_PLATFORMS = Object.freeze({
    [CLIENT.surge]: Object.freeze(["macos", "iphone", "ipad"]),
    [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"])
  });

  // ../../shared/encoding/base64url.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var REVERSE = new Map([...ALPHABET].map((character, index) => [character, index]));
  function assertBase64Url(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) {
      throw new TypeError("Base64URL value is invalid");
    }
  }
  function decodeBase64Url(value) {
    assertBase64Url(value);
    if (value.length === 0) return new Uint8Array();
    const remainder = value.length % 4;
    const last = REVERSE.get(value.at(-1));
    if (remainder === 2 && (last & 15) !== 0 || remainder === 3 && (last & 3) !== 0) {
      throw new TypeError("Base64URL value is not canonical");
    }
    const bytes = new Uint8Array(Math.floor(value.length * 6 / 8));
    let accumulator = 0;
    let bits = 0;
    let offset = 0;
    for (const character of value) {
      accumulator = accumulator << 6 | REVERSE.get(character);
      bits += 6;
      if (bits < 8) continue;
      bits -= 8;
      bytes[offset] = accumulator >> bits & 255;
      offset += 1;
      accumulator &= (1 << bits) - 1;
    }
    if (bits !== 0 && accumulator !== 0) throw new TypeError("Base64URL value is not canonical");
    return bytes;
  }

  // ../../shared/serialization/strict-json.js
  var DEFAULT_MAX_BYTES = 1 * 1024 * 1024;
  var DEFAULT_MAX_DEPTH = 32;
  var FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  var WHITESPACE = /* @__PURE__ */ new Set([" ", "	", "\r", "\n"]);
  function failure(label, reason) {
    const prefix = typeof label === "string" && label.length > 0 ? `${label}: ` : "";
    return new SyntaxError(`${prefix}${reason}`);
  }
  function asText(value, label) {
    if (typeof value === "string") {
      if (/[\uD800-\uDFFF]/u.test(value.replace(/[\uD800-\uDBFF](?=[\uDC00-\uDFFF])/gu, "").replace(/(?<=[\uD800-\uDBFF])[\uDC00-\uDFFF]/gu, ""))) {
        throw failure(label, "invalid UTF-8 text");
      }
      return { text: value, bytes: new TextEncoder().encode(value).byteLength };
    }
    if (value instanceof Uint8Array) {
      try {
        return {
          text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(value),
          bytes: value.byteLength
        };
      } catch {
        throw failure(label, "invalid UTF-8 text");
      }
    }
    throw failure(label, "input must be UTF-8 text");
  }
  function validateOptions(options, label) {
    const { maxBytes = DEFAULT_MAX_BYTES, maxDepth = DEFAULT_MAX_DEPTH } = options ?? {};
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw failure(label, "maxBytes must be a non-negative integer");
    if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) throw failure(label, "maxDepth must be a non-negative integer");
    return { maxBytes, maxDepth };
  }
  function validateAndParse(text, { label, maxDepth }) {
    let index = 0;
    const length = text.length;
    const error = (reason) => {
      throw failure(label, reason);
    };
    const skipWhitespace = () => {
      while (index < length && WHITESPACE.has(text[index])) index += 1;
    };
    const parseString = () => {
      if (text[index] !== '"') error("invalid JSON");
      const start = index;
      index += 1;
      while (index < length) {
        const character = text[index++];
        if (character === '"') {
          try {
            return JSON.parse(text.slice(start, index));
          } catch {
            error("invalid JSON");
          }
        }
        if (character === "\\") {
          const escape = text[index++];
          if (escape === "u") {
            if (!/^[0-9a-f]{4}$/iu.test(text.slice(index, index + 4))) error("invalid JSON");
            index += 4;
          } else if (!'"\\/bfnrt'.includes(escape)) {
            error("invalid JSON");
          }
        } else if (character < " ") {
          error("invalid JSON");
        }
      }
      error("invalid JSON");
    };
    const parseNumber = () => {
      const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
      if (!match) error("invalid JSON");
      index += match[0].length;
    };
    const parseValue = (depth) => {
      skipWhitespace();
      const character = text[index];
      if (character === "{" || character === "[") {
        if (depth > maxDepth) error("maximum JSON depth exceeded");
        const object = character === "{";
        index += 1;
        skipWhitespace();
        if (text[index] === (object ? "}" : "]")) {
          index += 1;
          return;
        }
        const keys = object ? /* @__PURE__ */ new Set() : null;
        while (index < length) {
          skipWhitespace();
          if (object) {
            const key = parseString();
            if (keys.has(key)) error("duplicate JSON key");
            if (FORBIDDEN_KEYS.has(key)) error("unsupported prototype key");
            keys.add(key);
            skipWhitespace();
            if (text[index++] !== ":") error("invalid JSON");
          }
          parseValue(depth + 1);
          skipWhitespace();
          const close = object ? "}" : "]";
          if (text[index] === close) {
            index += 1;
            return;
          }
          if (text[index++] !== ",") error("invalid JSON");
        }
        error("invalid JSON");
      }
      if (character === '"') {
        parseString();
        return;
      }
      if (text.startsWith("true", index) || text.startsWith("false", index) || text.startsWith("null", index)) {
        index += text.startsWith("true", index) ? 4 : text.startsWith("false", index) ? 5 : 4;
        return;
      }
      parseNumber();
    };
    skipWhitespace();
    parseValue(1);
    skipWhitespace();
    if (index !== length) error("invalid JSON");
    try {
      return JSON.parse(text);
    } catch {
      error("invalid JSON");
    }
  }
  function parseStrictJson(value, options = {}) {
    const label = options?.label;
    const { maxBytes, maxDepth } = validateOptions(options, label);
    const { text, bytes } = asText(value, label);
    if (bytes > maxBytes) throw failure(label, "JSON exceeds byte limit");
    return validateAndParse(text, { label, maxDepth });
  }
  var STRICT_JSON_DEFAULTS = Object.freeze({
    maxBytes: DEFAULT_MAX_BYTES,
    maxDepth: DEFAULT_MAX_DEPTH
  });

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET = /^(NODE:|NODE~)(.*)$/iu;
  var BASE64URL = /^[A-Za-z0-9_-]+$/u;
  var LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
  function frozenTarget(id, label, aliases, defaultTarget) {
    return Object.freeze({ id, label, aliases: Object.freeze([...aliases]), defaultTarget });
  }
  var BUSINESS_TARGETS = Object.freeze([
    frozenTarget("ai", "\u{1F916} AI \u4E13\u7528", ["AI \u4E13\u7528", "ai"], "FOLLOW"),
    frozenTarget("github", "\u{1F419} GitHub", ["GitHub", "github"], "FOLLOW"),
    frozenTarget("youtube", "\u{1F4FA} YouTube", ["YouTube", "youtube"], "FOLLOW"),
    frozenTarget("overseasMedia", "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53", [
      "\u6D77\u5916\u6D41\u5A92\u4F53",
      "overseasMedia",
      "Netflix",
      "netflix",
      "Disney+",
      "disney",
      "Spotify",
      "spotify",
      "\u56FD\u9645\u5A92\u4F53",
      "globalMedia"
    ], "FOLLOW"),
    frozenTarget("globalSocial", "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", [
      "\u6D77\u5916\u793E\u4EA4",
      "globalSocial",
      "Telegram",
      "telegram",
      "TikTok",
      "tiktok"
    ], "FOLLOW"),
    frozenTarget("overseasGame", "\u{1F30D} \u6D77\u5916\u6E38\u620F", ["\u6D77\u5916\u6E38\u620F", "overseasGame"], "FOLLOW"),
    frozenTarget("domesticCore", "\u56FD\u5185\u6838\u5FC3", ["\u56FD\u5185\u6838\u5FC3", "domesticCore"], "DIRECT"),
    // Preserve all published domestic-platform spellings under the stable ID.
    frozenTarget("domesticPlatform", "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0", [
      "\u56FD\u5185\u5E73\u53F0",
      "domestic",
      "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
      "domesticPlatform",
      "\u54D4\u54E9\u54D4\u54E9",
      "bilibili",
      "\u6296\u97F3",
      "bytedance",
      "\u5C0F\u7EA2\u4E66",
      "xiaohongshu",
      "\u5FAE\u535A",
      "weibo"
    ], "DIRECT"),
    frozenTarget("chinaIp", "\u4E2D\u56FD IP", ["\u4E2D\u56FD IP", "chinaIp"], "DIRECT"),
    frozenTarget("apple", "\u{1F34E} Apple", ["Apple", "apple"], "DIRECT"),
    frozenTarget("microsoft", "\u{1FA9F} Microsoft", ["Microsoft", "microsoft"], "DIRECT"),
    frozenTarget("download", "\u2B07\uFE0F \u4E0B\u8F7D/P2P", ["\u4E0B\u8F7D/P2P", "download"], "DIRECT")
  ]);
  var TARGET_BY_KEY = /* @__PURE__ */ new Map();
  for (const target of BUSINESS_TARGETS) {
    TARGET_BY_KEY.set(target.label, target);
    for (const alias of target.aliases) TARGET_BY_KEY.set(alias, target);
  }
  function businessTargetByKey(key) {
    return typeof key === "string" ? TARGET_BY_KEY.get(key) : void 0;
  }
  function policyError(message) {
    return new Error(`Invalid business policy overrides: ${message}`);
  }
  function targetError(target, message) {
    return policyError(`${target.label}: ${message}`);
  }
  function decodePolicy(encoded) {
    if (typeof encoded !== "string" || encoded !== "" && !BASE64URL.test(encoded) || encoded.length % 4 === 1) {
      throw policyError("must be a Base64URL string");
    }
    if (encoded === "") return Object.freeze({});
    let bytes;
    try {
      bytes = decodeBase64Url(encoded);
    } catch {
      throw policyError("must be a Base64URL string");
    }
    let values;
    try {
      values = parseStrictJson(bytes, { label: "business overrides", maxBytes: 64 * 1024, maxDepth: 8 });
    } catch {
      throw policyError("must contain JSON object");
    }
    if (values === null || Array.isArray(values) || typeof values !== "object" || Object.getPrototypeOf(values) !== Object.prototype) {
      throw policyError("must contain a JSON object");
    }
    return values;
  }
  function canonicalBusinessTarget(value) {
    if (typeof value !== "string") throw new TypeError("target must be a string");
    if (TARGET_KEYWORD.test(value)) return value.toUpperCase();
    const node = NODE_TARGET.exec(value);
    if (!node || node[2].trim().length === 0 || LINE_TERMINATOR.test(node[2])) {
      throw new TypeError("target must be FOLLOW, DIRECT, NODE:<name>, or NODE~<query>");
    }
    const prefix = node[1].toUpperCase();
    return `${prefix}${prefix === "NODE:" ? node[2] : node[2].trim()}`;
  }
  function parseBusinessOverrides(encoded) {
    const values = decodePolicy(encoded);
    const overrides = {};
    for (const [key, value] of Object.entries(values)) {
      const target = businessTargetByKey(key);
      if (!target) throw policyError("contains an unknown business key");
      let canonical;
      try {
        canonical = canonicalBusinessTarget(value);
      } catch {
        throw targetError(target, "target must be FOLLOW, DIRECT, or NODE:<name>");
      }
      if (Object.hasOwn(overrides, target.id) && overrides[target.id] !== canonical) {
        throw targetError(target, "has conflicting aliases");
      }
      overrides[target.id] = canonical;
    }
    return Object.freeze(overrides);
  }

  // ../../shared/substore/collection-name.js
  var SAFE_COLLECTION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function validateCollectionName(value, label = "collection name") {
    if (typeof value !== "string" || !SAFE_COLLECTION_NAME.test(value) || PROTOTYPE_KEYS.has(value)) {
      throw new Error(`${label} must be a safe collection slug`);
    }
    return value;
  }

  // src/options.js
  var INCY_PLATFORMS = Object.freeze(["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);
  var DEFAULTS = Object.freeze({
    channel: "current",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "ipv4-only",
    adblockMode: "off",
    autoGroupMode: "auto",
    clientChain: "off",
    policyOverrides: ""
  });
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([
    "output",
    "type",
    "name",
    "subscriptionName",
    "platform",
    "channel",
    "dnsMode",
    "chinaDns",
    "globalDns",
    "blockMode",
    "quicMode",
    "ipv6Mode",
    "adblockMode",
    "autoGroupMode",
    "clientChain",
    "policyOverrides"
  ]);
  var PROTOTYPE_KEYS2 = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  var ENUM_VALUES = Object.freeze({
    dnsMode: Object.freeze(["stable", "privacy", "speed"]),
    chinaDns: Object.freeze(["alidns", "dnspod", "system"]),
    globalDns: Object.freeze(["cloudflare", "google", "quad9"]),
    blockMode: Object.freeze(["balanced", "security", "strict", "off"]),
    quicMode: Object.freeze(["allow", "proxy-block", "all-block"]),
    ipv6Mode: Object.freeze(["auto", "ipv4-only"]),
    adblockMode: Object.freeze(["off", "full"]),
    autoGroupMode: Object.freeze(["auto", "full", "balanced", "minimal"]),
    clientChain: Object.freeze(["off", "on"])
  });
  function ownOptions(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("INCY options must be a plain object");
    }
    const prototype = Object.getPrototypeOf(raw);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("INCY options must be a plain object");
    }
    const values = /* @__PURE__ */ new Map();
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string") continue;
      if (PROTOTYPE_KEYS2.has(key)) throw new Error("INCY options contain a forbidden key");
      if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown INCY option '${key}'`);
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || !descriptor.enumerable || "get" in descriptor || "set" in descriptor) {
        throw new Error("INCY options must contain data properties");
      }
      values.set(key, descriptor.value);
    }
    return values;
  }
  function required(values, key) {
    if (!values.has(key)) throw new Error(`INCY option '${key}' is required`);
    return values.get(key);
  }
  function literal(values, key, expected) {
    const value = required(values, key);
    if (value !== expected) throw new Error(`INCY option '${key}' must be '${expected}'`);
    return value;
  }
  function enumValue(values, key, fallback = DEFAULTS[key]) {
    const value = values.has(key) && values.get(key) !== void 0 ? values.get(key) : fallback;
    if (typeof value !== "string" || !ENUM_VALUES[key]?.includes(value)) {
      throw new Error(`INCY option '${key}' has an unsupported value`);
    }
    return value;
  }
  function parsePolicyOverrides(values) {
    const encoded = values.has("policyOverrides") && values.get("policyOverrides") !== void 0 ? values.get("policyOverrides") : DEFAULTS.policyOverrides;
    if (typeof encoded !== "string") throw new Error("INCY option 'policyOverrides' has an unsupported value");
    parseBusinessOverrides(encoded);
    return encoded;
  }
  function parseIncyOptions(raw) {
    const values = ownOptions(raw);
    literal(values, "output", "config");
    literal(values, "type", "collection");
    const platform = required(values, "platform");
    if (typeof platform !== "string" || !INCY_PLATFORMS.includes(platform)) {
      throw new Error("INCY option 'platform' has an unsupported value");
    }
    const channel = values.has("channel") && values.get("channel") !== void 0 ? values.get("channel") : DEFAULTS.channel;
    if (typeof channel !== "string" || !FRONTIER_CHANNELS.includes(channel)) {
      throw new Error("INCY option 'channel' has an unsupported value");
    }
    const options = {
      output: "config",
      type: "collection",
      name: validateCollectionName(required(values, "name"), "INCY option 'name'"),
      subscriptionName: validateCollectionName(required(values, "subscriptionName"), "INCY option 'subscriptionName'"),
      platform,
      channel,
      dnsMode: enumValue(values, "dnsMode"),
      chinaDns: enumValue(values, "chinaDns"),
      globalDns: enumValue(values, "globalDns"),
      blockMode: enumValue(values, "blockMode"),
      quicMode: enumValue(values, "quicMode"),
      ipv6Mode: enumValue(values, "ipv6Mode"),
      adblockMode: enumValue(values, "adblockMode"),
      autoGroupMode: enumValue(values, "autoGroupMode"),
      clientChain: enumValue(values, "clientChain"),
      policyOverrides: parsePolicyOverrides(values)
    };
    return Object.freeze(options);
  }

  // src/substore-config-entry.js
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    void context;
    const options = parseIncyOptions({ ...context.arguments ?? {}, output: "config", type: "collection" });
    return { ...input, $content: JSON.stringify({ options }, null, 2) + "\n" };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return INCYConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
