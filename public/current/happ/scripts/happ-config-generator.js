var HappConfigBundle = (() => {
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
  function nodeMetadata(node) {
    if (!node?._profile || typeof node._profile !== "object") {
      throw new Error("Normalized node is missing _profile metadata");
    }
    return node._profile;
  }

  // ../../shared/nodes/diagnostics.js
  function createDiagnostics() {
    return {
      total: 0,
      accepted: 0,
      protocol: {},
      source: {},
      region: {},
      excluded: {},
      warnings: {}
    };
  }
  function createClientFilterDiagnostics() {
    return {
      accepted: 0,
      excluded: {}
    };
  }
  function increment(bucket, key, amount = 1) {
    const current = Object.hasOwn(bucket, key) ? bucket[key] : 0;
    Object.defineProperty(bucket, key, {
      value: current + amount,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  // ../../shared/nodes/protocol-registry.js
  function protocol(names, clients, { requiredFields = [], tls = false, clientNames = {} } = {}) {
    return Object.freeze({
      names: Object.freeze(names),
      clients: Object.freeze(clients),
      requiredFields: Object.freeze(requiredFields),
      tls,
      clientNames: Object.freeze(Object.fromEntries(
        Object.entries(clientNames).map(([client, supportedNames]) => [client, Object.freeze(supportedNames)])
      ))
    });
  }
  var definitions = Object.freeze([
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash], {
      requiredFields: ["cipher", "password"]
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge, CLIENT.clash], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash]),
    protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.v2box, CLIENT.clash]),
    protocol(["ssh"], [CLIENT.egern, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["username"]
    }),
    protocol(["wireguard"], [CLIENT.egern, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["private-key", "public-key"]
    }),
    protocol(["sudoku"], [CLIENT.anywhere], {
      requiredFields: ["key"]
    })
  ]);
  var registry = /* @__PURE__ */ new Map();
  for (const definition of definitions) {
    for (const name of definition.names) registry.set(name, definition);
  }
  var DISPLAY_PROTOCOL_NAMES = Object.freeze({
    ss: "SS",
    shadowsocks: "SS",
    ssr: "SSR",
    snell: "Snell",
    vmess: "VMess",
    vless: "VLESS",
    trojan: "Trojan",
    anytls: "AnyTLS",
    hysteria2: "Hy2",
    hy2: "Hy2",
    tuic: "Tuic",
    socks5: "SOCKS5",
    http: "HTTP",
    ssh: "SSH",
    wireguard: "WireGuard",
    sudoku: "Sudoku"
  });
  function normalizeProtocol(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }
  function protocolDefinition(value) {
    return registry.get(normalizeProtocol(value)) ?? null;
  }
  function canonicalProtocol(value) {
    const definition = protocolDefinition(value);
    return definition?.names[0] ?? null;
  }
  function protocolSupportsClient(value, client) {
    const protocol2 = normalizeProtocol(value);
    const definition = protocolDefinition(protocol2);
    return definition?.clients.includes(client) === true && (definition.clientNames[client] ?? definition.names).includes(protocol2);
  }
  function diagnosticProtocol(value) {
    const normalized = normalizeProtocol(value);
    return registry.has(normalized) ? normalized : "unknown";
  }
  function protocolDisplayLabel(value) {
    const normalized = normalizeProtocol(value);
    return DISPLAY_PROTOCOL_NAMES[normalized] ?? (normalized || "unknown");
  }

  // ../../shared/nodes/capabilities.js
  var ANYWHERE_VLESS_NETWORKS = /* @__PURE__ */ new Set(["tcp", "ws"]);
  var ANYWHERE_SHADOWSOCKS_METHODS = /* @__PURE__ */ new Set([
    "aes-128-gcm",
    "aes-256-gcm",
    "chacha20-ietf-poly1305",
    "chacha20-poly1305",
    "none",
    "plain",
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305"
  ]);
  var ANYWHERE_HYSTERIA_OBFS = /* @__PURE__ */ new Set(["salamander", "gecko"]);
  var ANYWHERE_SUDOKU_AEAD = /* @__PURE__ */ new Set(["chacha20-poly1305", "aes-128-gcm", "none"]);
  var ANYWHERE_SUDOKU_ASCII = /* @__PURE__ */ new Set([
    "",
    "entropy",
    "prefer_entropy",
    "ascii",
    "prefer_ascii",
    "up_ascii_down_entropy",
    "up_entropy_down_ascii"
  ]);
  var ANYWHERE_SUDOKU_HTTP_MASK_MODES = /* @__PURE__ */ new Set(["legacy", "stream", "poll", "auto", "ws"]);
  var ANYWHERE_REALITY_ALLOWED_KEYS = /* @__PURE__ */ new Set(["public-key", "short-id", "_spider-x"]);
  var ANYWHERE_FINGERPRINTS = /* @__PURE__ */ new Set([
    "chrome",
    "firefox",
    "safari",
    "ios",
    "edge",
    "random",
    "chrome_133",
    "chrome_120",
    "chrome_106",
    "firefox_148",
    "firefox_120",
    "safari_26",
    "edge_106",
    "non_browser"
  ]);
  var EGERN_SHADOWSOCKS_METHODS = /* @__PURE__ */ new Set([
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
    "chacha20-poly1305",
    "aes-256-gcm",
    "aes-128-gcm",
    "none",
    "table",
    "rc4",
    "rc4-md5",
    "aes-128-cfb",
    "aes-192-cfb",
    "aes-256-cfb",
    "aes-128-ctr",
    "aes-192-ctr",
    "aes-256-ctr",
    "bf-cfb",
    "camellia-128-cfb",
    "camellia-192-cfb",
    "camellia-256-cfb",
    "cast5-cfb",
    "des-cfb",
    "idea-cfb",
    "rc2-cfb",
    "seed-cfb",
    "salsa20",
    "chacha20",
    "chacha20-ietf"
  ]);
  var EGERN_SNELL_VERSIONS = /* @__PURE__ */ new Set([1, 2, 3, 4, 5]);
  var SINGBOX_SNELL_VERSIONS = /* @__PURE__ */ new Set([4, 5, 6]);
  var SINGBOX_SNELL_OBFS_MODES = /* @__PURE__ */ new Set(["none", "http"]);
  var SINGBOX_SNELL_MODES = /* @__PURE__ */ new Set(["default", "unshaped", "unsafe-raw"]);
  var EGERN_OBFS = /* @__PURE__ */ new Set(["http", "tls"]);
  var EGERN_VMESS_SECURITY = /* @__PURE__ */ new Set(["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"]);
  var XRAY_VMESS_SECURITY = EGERN_VMESS_SECURITY;
  var EGERN_TRANSPORTS = /* @__PURE__ */ new Set(["tcp", "raw", "ws", "grpc", "h2", "http2", "http", "http1"]);
  var EGERN_VLESS_FLOWS = /* @__PURE__ */ new Set(["xtls-rprx-vision"]);
  var EGERN_TUIC_UDP_MODES = /* @__PURE__ */ new Set(["native", "quic"]);
  var EGERN_IP_VERSIONS = /* @__PURE__ */ new Set(["dual_stack", "v4_only", "v6_only", "v4_prefer", "v6_prefer"]);
  var EGERN_BLOCK_QUIC_PROTOCOLS = /* @__PURE__ */ new Set([
    "ss",
    "shadowsocks",
    "snell",
    "trojan",
    "anytls",
    "hysteria2",
    "hy2",
    "tuic",
    "socks5",
    "ssh",
    "vmess",
    "vless",
    "wireguard"
  ]);
  var EGERN_SHADOW_TLS_PROTOCOLS = /* @__PURE__ */ new Set([
    "ss",
    "shadowsocks",
    "trojan",
    "anytls",
    "socks5",
    "ssh",
    "http",
    "vmess",
    "vless"
  ]);
  var EGERN_TFO_PROTOCOLS = /* @__PURE__ */ new Set([
    "ss",
    "shadowsocks",
    "snell",
    "trojan",
    "anytls",
    "socks5",
    "ssh",
    "http",
    "vmess",
    "vless"
  ]);
  var SHADOW_TLS_ALIASES = Object.freeze(["shadow-tls", "shadow-tls-opts", "shadow_tls"]);
  var BLOCK_QUIC_ALIASES = Object.freeze(["block-quic", "block_quic"]);
  var IP_VERSION_ALIASES = Object.freeze(["ip-version", "ip_version"]);
  var UDP_ALIASES = Object.freeze(["udp", "udp-relay", "udp_relay"]);
  var CHAIN_ALIASES = Object.freeze(["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"]);
  var GENERATED_CHAIN_FIELD = "underlying-proxy";
  var GENERATED_CHAIN_POLICY = "\u{1F517} \u5165\u53E3\u8282\u70B9";
  function hasOption(node, key) {
    return Object.hasOwn(node, key);
  }
  function hasShadowsocksPlugin(node) {
    return Boolean(node.plugin) || hasOption(node, "plugin-opts");
  }
  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function isNonblankString(value) {
    return typeof value === "string" && value.length > 0 && value.trim() === value;
  }
  function isNonblankOpaqueString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isValidPort(value) {
    return Number.isInteger(value) && value >= 1 && value <= 65535;
  }
  function firstAliasValue(node, keys) {
    for (const key of keys) {
      if (hasOption(node, key)) return node[key];
    }
    return void 0;
  }
  function semanticEqual(left, right) {
    if (left === right) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
      return left.length === right.length && left.every((value, index) => semanticEqual(value, right[index]));
    }
    if (isPlainObject(left) && isPlainObject(right)) {
      const leftKeys = Object.keys(left).sort();
      const rightKeys = Object.keys(right).sort();
      return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && semanticEqual(left[key], right[key]));
    }
    return false;
  }
  function conflictingAliases(node, keys) {
    const values = keys.filter((key) => hasOption(node, key)).map((key) => node[key]);
    return values.length > 1 && values.slice(1).some((value) => !semanticEqual(value, values[0]));
  }
  function normalizedHeaderValue(value) {
    return Array.isArray(value) ? value[0] : value;
  }
  function normalizeEgernHeaders(value) {
    if (!isPlainObject(value)) return null;
    const result = {};
    const semantic = /* @__PURE__ */ new Map();
    for (const [key, rawValue] of Object.entries(value)) {
      if (!isNonblankString(key) || !isHeaderValue(rawValue)) return null;
      const normalizedValue = normalizedHeaderValue(rawValue);
      const normalizedKey = key.toLowerCase();
      if (semantic.has(normalizedKey)) {
        if (semantic.get(normalizedKey) !== normalizedValue) return null;
        continue;
      }
      semantic.set(normalizedKey, normalizedValue);
      result[normalizedKey === "host" ? "Host" : key] = normalizedValue;
    }
    return result;
  }
  function hasHeaderAliasConflict(value) {
    if (!isPlainObject(value)) return false;
    const semantic = /* @__PURE__ */ new Map();
    for (const [key, rawValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      const normalizedValue = normalizedHeaderValue(rawValue);
      if (semantic.has(normalizedKey) && semantic.get(normalizedKey) !== normalizedValue) return true;
      semantic.set(normalizedKey, normalizedValue);
    }
    return false;
  }
  function validShadowTls(value) {
    return isPlainObject(value) && Object.keys(value).every((key) => key === "password" || key === "sni") && isNonblankOpaqueString(value.password) && (!hasOption(value, "sni") || isNonblankString(value.sni));
  }
  function validOptionalString(node, key) {
    return !hasOption(node, key) || isNonblankString(node[key]);
  }
  function validOptionalOpaqueString(node, key) {
    return !hasOption(node, key) || isNonblankOpaqueString(node[key]);
  }
  function resolvedUdp(node) {
    return firstAliasValue(node, UDP_ALIASES);
  }
  function isOptionalBoolean(node, key) {
    return !hasOption(node, key) || typeof node[key] === "boolean";
  }
  function isOptionalPositiveInteger(node, key, { allowZero = false } = {}) {
    if (!hasOption(node, key)) return true;
    const value = node[key];
    return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0);
  }
  function hasConflictingAliases(node, keys) {
    return conflictingAliases(node, keys);
  }
  function optionalStringAliasesAreValid(node, keys) {
    return !hasConflictingAliases(node, keys) && keys.every((key) => !hasOption(node, key) || isNonblankString(node[key]));
  }
  function tlsSecurity(node) {
    if (node.security === "tls" || node.security === "reality") return node.security;
    return node.tls === true ? "tls" : "none";
  }
  function hasTlsSettings(node) {
    return tlsSecurity(node) !== "none" || hasOption(node, "sni") || hasOption(node, "servername") || hasOption(node, "skip-cert-verify") || hasOption(node, "allow-insecure") || hasOption(node, "fingerprint-sha256") || hasOption(node, "fingerprint_sha256") || hasOption(node, "reality-opts");
  }
  function isCertificateFingerprint(value) {
    if (!isNonblankString(value)) return false;
    if (value.startsWith("TEST_ONLY_")) return true;
    return /^[0-9a-f]{2}(?:[:-]?[0-9a-f]{2}){31}$/i.test(value);
  }
  function isRealityPublicKey(value) {
    return isNonblankString(value) && (value.startsWith("TEST_ONLY_") || /^[A-Za-z0-9_-]{43}=?$/.test(value));
  }
  function tlsRequestedForCapability(node) {
    return node.tls === true || node.security === "tls" || node.security === "reality" || hasOption(node, "reality-opts");
  }
  function egernTlsReason(node, {
    allowReality = true,
    allowAlpn = false,
    allowClientFingerprint = false,
    implicitTls = false
  } = {}) {
    if (!isOptionalBoolean(node, "tls") || !isOptionalBoolean(node, "skip-cert-verify") || !isOptionalBoolean(node, "allow-insecure") || hasConflictingAliases(node, ["skip-cert-verify", "allow-insecure"]) || !optionalStringAliasesAreValid(node, ["sni", "servername"]) || hasConflictingAliases(node, ["fingerprint-sha256", "fingerprint_sha256"])) {
      return "unsupported-egern-tls-shape";
    }
    for (const key of ["fingerprint-sha256", "fingerprint_sha256"]) {
      if (hasOption(node, key) && !isCertificateFingerprint(node[key])) {
        return "unsupported-egern-tls-shape";
      }
    }
    if (hasOption(node, "client-fingerprint") && !allowClientFingerprint || hasOption(node, "alpn") && !allowAlpn) {
      return "unsupported-egern-tls-shape";
    }
    if (hasOption(node, "security")) {
      const security = node.security;
      const vmessSecurity = normalizeProtocol(node.type) === "vmess" && EGERN_VMESS_SECURITY.has(security);
      if (!vmessSecurity && !["none", "tls", "reality"].includes(security)) {
        return "unsupported-egern-tls-shape";
      }
      if (security === "reality" && !hasOption(node, "reality-opts")) {
        return "incomplete-egern-reality";
      }
      if (node.tls === false && (security === "tls" || security === "reality")) {
        return "unsupported-egern-tls-shape";
      }
    }
    const reality = node["reality-opts"];
    if (reality !== void 0) {
      if (node.tls === false || !allowReality || !isPlainObject(reality) || !isRealityPublicKey(reality["public-key"])) {
        return allowReality ? "incomplete-egern-reality" : "unsupported-egern-tls-shape";
      }
      if (hasOption(reality, "short-id") && (!isNonblankString(reality["short-id"]) || !/^[0-9a-f]+$/i.test(reality["short-id"]))) {
        return "incomplete-egern-reality";
      }
      const realityKeys = Object.keys(reality);
      if (realityKeys.some((key) => !["public-key", "short-id"].includes(key))) {
        return "unsupported-egern-tls-shape";
      }
      if (node["skip-cert-verify"] === true || node["allow-insecure"] === true || hasOption(node, "fingerprint-sha256") || hasOption(node, "fingerprint_sha256")) {
        return "unsupported-egern-tls-shape";
      }
    }
    if (!implicitTls && !tlsRequestedForCapability(node) && hasTlsSettings(node)) {
      return "unsupported-egern-tls-shape";
    }
    return null;
  }
  function normalizeTransport(node) {
    const network = node.network ?? "tcp";
    return typeof network === "string" ? network.trim().toLowerCase() : "";
  }
  function unsupportedPlainTransport(node, allowedNetworks = /* @__PURE__ */ new Set(["tcp", "raw"])) {
    if (hasOption(node, "network") && !allowedNetworks.has(normalizeTransport(node))) return true;
    return ["ws-opts", "grpc-opts", "h2-opts", "http-opts"].some((key) => hasOption(node, key));
  }
  function isHeaderValue(value) {
    return isNonblankString(value) || Array.isArray(value) && value.length === 1 && isNonblankString(value[0]);
  }
  function validHeaders(value) {
    return normalizeEgernHeaders(value) !== null;
  }
  function validPath(value) {
    return isNonblankString(value) || Array.isArray(value) && value.length === 1 && isNonblankString(value[0]);
  }
  function validHttpTransportOptions(options) {
    if (!isPlainObject(options)) return false;
    const allowed = /* @__PURE__ */ new Set(["method", "path", "headers"]);
    return Object.keys(options).every((key) => allowed.has(key)) && (!hasOption(options, "method") || isNonblankString(options.method)) && (!hasOption(options, "path") || validPath(options.path)) && (!hasOption(options, "headers") || validHeaders(options.headers));
  }
  function validHttp2TransportOptions(options) {
    if (!isPlainObject(options)) return false;
    const allowed = /* @__PURE__ */ new Set(["method", "path", "headers", "host"]);
    if (!Object.keys(options).every((key) => allowed.has(key)) || hasOption(options, "method") && !isNonblankString(options.method) || hasOption(options, "path") && !validPath(options.path) || hasOption(options, "headers") && !validHeaders(options.headers) || hasOption(options, "host") && !validPath(options.host)) {
      return false;
    }
    if (hasOption(options, "host") && hasOption(options, "headers")) {
      const host = Array.isArray(options.host) ? options.host[0] : options.host;
      const headerHost = options.headers.Host ?? options.headers.host;
      if (headerHost !== void 0 && (Array.isArray(headerHost) ? headerHost[0] : headerHost) !== host) return false;
    }
    return true;
  }
  function egernVmessVlessTransportReason(node) {
    const network = normalizeTransport(node);
    if (!EGERN_TRANSPORTS.has(network)) return "unsupported-egern-transport";
    const tlsReason = egernTlsReason(node);
    if (tlsReason) return tlsReason;
    const tls = tlsSecurity(node) !== "none" || hasOption(node, "reality-opts");
    const optionKeys = ["ws-opts", "grpc-opts", "h2-opts", "http-opts"];
    if (network === "tcp" || network === "raw") {
      return optionKeys.some((key) => hasOption(node, key)) ? "unsupported-egern-transport" : null;
    }
    if (network === "ws") {
      if (optionKeys.some((key) => key !== "ws-opts" && hasOption(node, key))) return "unsupported-egern-transport";
      const options = node["ws-opts"];
      if (!isPlainObject(options) || Object.keys(options).some((key) => !["path", "headers"].includes(key)) || !validPath(options.path) || hasOption(options, "headers") && !validHeaders(options.headers) || hasOption(node, "reality-opts")) {
        return "unsupported-egern-transport";
      }
      return null;
    }
    if (network === "grpc") {
      if (!tls || optionKeys.some((key) => key !== "grpc-opts" && hasOption(node, key))) {
        return "unsupported-egern-transport";
      }
      const options = node["grpc-opts"];
      if (options === void 0) return null;
      if (!isPlainObject(options) || Object.keys(options).some((key) => !["grpc-service-name", "grpc-mode", "user-agent"].includes(key)) || hasOption(options, "grpc-service-name") && !isNonblankString(options["grpc-service-name"]) || hasOption(options, "user-agent") && !isNonblankString(options["user-agent"]) || hasOption(options, "grpc-mode") && options["grpc-mode"] !== "gun") {
        return "unsupported-egern-transport";
      }
      return null;
    }
    if (network === "h2" || network === "http2") {
      if (!tls || hasOption(node, "reality-opts") || optionKeys.some((key) => key !== "h2-opts" && hasOption(node, key))) {
        return "unsupported-egern-transport";
      }
      return node["h2-opts"] === void 0 || validHttp2TransportOptions(node["h2-opts"]) ? null : "unsupported-egern-transport";
    }
    if (tls || hasTlsSettings(node) || optionKeys.some((key) => key !== "http-opts" && hasOption(node, key))) {
      return "unsupported-egern-transport";
    }
    return node["http-opts"] === void 0 || validHttpTransportOptions(node["http-opts"]) ? null : "unsupported-egern-transport";
  }
  function isPortHopping(value) {
    return isNonblankString(value) && /^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(value) && value.split(",").every((part) => {
      const [start, end = start] = part.split("-").map(Number);
      return start >= 1 && end <= 65535 && start <= end;
    });
  }
  function isWireGuardKey(value) {
    if (!isNonblankString(value)) return false;
    if (value.startsWith("TEST_ONLY_")) return true;
    return /^[A-Za-z0-9+/]{43}=$/.test(value);
  }
  function ipFamily(value) {
    if (!isNonblankString(value)) return 0;
    const [address, prefix, ...extra] = value.split("/");
    if (extra.length > 0 || prefix !== void 0 && !/^\d+$/.test(prefix)) return 0;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address) && address.split(".").every((part) => Number(part) <= 255) && (prefix === void 0 || Number(prefix) <= 32)) return 4;
    if (address.includes(":") && (prefix === void 0 || Number(prefix) <= 128)) {
      try {
        const host = new URL(`http://[${address}]/`).hostname;
        if (host.startsWith("[") && host.endsWith("]")) return 6;
      } catch {
        return 0;
      }
    }
    return 0;
  }
  function addressValues(node) {
    const values = [];
    for (const key of ["local_ipv4", "local-ipv4", "local_ipv6", "local-ipv6", "ip", "ipv6", "local-address"]) {
      if (!hasOption(node, key)) continue;
      const value = node[key];
      values.push(...Array.isArray(value) ? value : [value]);
    }
    return values;
  }
  function egernWireGuardReason(node) {
    if (hasOption(node, "peers") && (!Array.isArray(node.peers) || node.peers.length !== 1 || !isPlainObject(node.peers[0]))) {
      return "unsupported-egern-wireguard-shape";
    }
    const peer = node.peers?.[0] ?? {};
    if (Object.keys(peer).some((key) => !["server", "port", "public-key", "pre-shared-key", "reserved"].includes(key))) {
      return "unsupported-egern-wireguard-shape";
    }
    if (hasOption(peer, "server") && peer.server !== node.server || hasOption(peer, "port") && Number(peer.port) !== Number(node.port)) {
      return "unsupported-egern-wireguard-shape";
    }
    if (hasOption(node, "public-key") && hasOption(peer, "public-key") && node["public-key"] !== peer["public-key"] || hasOption(node, "pre-shared-key") && hasOption(peer, "pre-shared-key") && node["pre-shared-key"] !== peer["pre-shared-key"] || hasOption(node, "reserved") && hasOption(peer, "reserved") && JSON.stringify(node.reserved) !== JSON.stringify(peer.reserved)) {
      return "unsupported-egern-wireguard-shape";
    }
    const publicKey = peer["public-key"] ?? node["public-key"];
    const presharedKey = peer["pre-shared-key"] ?? node["pre-shared-key"];
    const reserved = peer.reserved ?? node.reserved;
    if (!isWireGuardKey(node["private-key"]) || !isWireGuardKey(publicKey) || presharedKey !== void 0 && !isWireGuardKey(presharedKey) || reserved !== void 0 && (!Array.isArray(reserved) || reserved.length !== 3 || reserved.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255))) {
      return "unsupported-egern-wireguard-shape";
    }
    const addresses = addressValues(node);
    const families = addresses.map(ipFamily);
    if (addresses.length === 0 || families.includes(0) || families.filter((family) => family === 4).length > 1 || families.filter((family) => family === 6).length > 1) {
      return "unsupported-egern-wireguard-shape";
    }
    const dns = node.dns_servers ?? node.dns;
    if (dns !== void 0 && (!Array.isArray(dns) || dns.length === 0 || dns.some((value) => ipFamily(value) === 0)) || !isOptionalPositiveInteger(node, "mtu") || !isOptionalPositiveInteger(node, "keepalive", { allowZero: true })) {
      return "unsupported-egern-wireguard-shape";
    }
    return null;
  }
  function headersInNode(node) {
    const values = [];
    if (hasOption(node, "headers")) values.push(node.headers);
    for (const key of ["ws-opts", "h2-opts", "http-opts"]) {
      if (isPlainObject(node[key]) && hasOption(node[key], "headers")) values.push(node[key].headers);
    }
    return values;
  }
  function hasHttp2HostConflict(node) {
    const options = node["h2-opts"];
    if (!isPlainObject(options) || !hasOption(options, "host") || !isPlainObject(options.headers)) return false;
    const host = Array.isArray(options.host) ? options.host[0] : options.host;
    const headerValues = Object.entries(options.headers).filter(([key]) => key.toLowerCase() === "host").map(([, value]) => normalizedHeaderValue(value));
    return headerValues.some((value) => value !== host);
  }
  function hasEgernAliasConflict(node, protocol2) {
    const groups = [
      ["sni", "servername"],
      ["skip-cert-verify", "allow-insecure"],
      ["fingerprint-sha256", "fingerprint_sha256"],
      UDP_ALIASES,
      ["udp-port", "udp_port"],
      ["obfs-host", "obfs_host"],
      ["obfs-uri", "obfs_uri"],
      ["obfs-password", "obfs_password"],
      ["port-hopping", "port_hopping", "ports"],
      ["port-hopping-interval", "port_hopping_interval", "hop-interval"],
      ["bandwidth", "up"],
      BLOCK_QUIC_ALIASES,
      IP_VERSION_ALIASES,
      SHADOW_TLS_ALIASES,
      ["private-key", "private_key"],
      ["host-keys", "host_keys"],
      ["udp-relay-mode", "udp_relay_mode"]
    ];
    if (groups.some((keys) => conflictingAliases(node, keys))) return true;
    if (protocol2 === "wireguard" && conflictingAliases(node, ["dns_servers", "dns"])) return true;
    if (headersInNode(node).some(hasHeaderAliasConflict) || hasHttp2HostConflict(node)) return true;
    if (protocol2 === "vmess" && hasOption(node, "cipher") && EGERN_VMESS_SECURITY.has(node.security) && node.cipher !== node.security) return true;
    return false;
  }
  function egernCommonReason(node, protocol2) {
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort(node.port)) return "invalid-egern-node-shape";
    if (hasEgernAliasConflict(node, protocol2)) return "conflicting-egern-alias";
    if (!isOptionalBoolean(node, "tfo") || UDP_ALIASES.some((key) => !isOptionalBoolean(node, key))) return "invalid-egern-node-shape";
    if (hasOption(node, "tfo") && !EGERN_TFO_PROTOCOLS.has(protocol2)) return "unsupported-egern-option";
    for (const key of BLOCK_QUIC_ALIASES) {
      if (hasOption(node, key) && typeof node[key] !== "boolean") return "invalid-egern-node-shape";
    }
    const blockQuic = firstAliasValue(node, BLOCK_QUIC_ALIASES);
    if (blockQuic !== void 0 && !EGERN_BLOCK_QUIC_PROTOCOLS.has(protocol2)) return "unsupported-egern-option";
    for (const key of IP_VERSION_ALIASES) {
      if (hasOption(node, key) && !EGERN_IP_VERSIONS.has(node[key])) return "invalid-egern-node-shape";
    }
    const shadowTls = firstAliasValue(node, SHADOW_TLS_ALIASES);
    if (shadowTls !== void 0) {
      if (!EGERN_SHADOW_TLS_PROTOCOLS.has(protocol2)) return "unsupported-egern-option";
      if (!validShadowTls(shadowTls) || hasOption(node, "reality-opts")) return "invalid-egern-node-shape";
    }
    return null;
  }
  function validOptionalAuthentication(node) {
    return validOptionalString(node, "username") && validOptionalOpaqueString(node, "password");
  }
  function validSshHostKey(value) {
    if (!isNonblankString(value)) return false;
    const fields = value.split(/\s+/);
    if (fields.length < 2) return false;
    const [type, key] = fields;
    return /^(?:ssh-(?:ed25519|rsa)|ecdsa-sha2-nistp(?:256|384|521))$/.test(type) && (key.startsWith("TEST_ONLY_") || /^[A-Za-z0-9+/]+={0,2}$/.test(key));
  }
  function egernSshReason(node) {
    const sshKeyMaterial = firstAliasValue(node, ["private-key", "private_key"]);
    const hostKeys = firstAliasValue(node, ["host-keys", "host_keys"]);
    if (conflictingAliases(node, ["private-key", "private_key"]) || !isNonblankString(node.username)) {
      return "invalid-egern-node-shape";
    }
    if (!validOptionalOpaqueString(node, "password") || sshKeyMaterial !== void 0 && !isNonblankOpaqueString(sshKeyMaterial) || !isNonblankOpaqueString(node.password) && !isNonblankOpaqueString(sshKeyMaterial)) {
      return "invalid-egern-node-shape";
    }
    if (hostKeys !== void 0 && (!Array.isArray(hostKeys) || hostKeys.some((value) => !validSshHostKey(value)))) {
      return "invalid-egern-node-shape";
    }
    if (hasOption(node, "udp") || hasOption(node, "udp-relay") || hasOption(node, "udp_relay")) {
      return "unsupported-egern-option";
    }
    return unsupportedPlainTransport(node) ? "unsupported-egern-transport" : null;
  }
  function hasArbitraryChain(node) {
    const present = CHAIN_ALIASES.filter((key) => hasOption(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
    if (present.length === 0) return node?._profile?.chained === true;
    return !(present.length === 1 && present[0] === GENERATED_CHAIN_FIELD && node[GENERATED_CHAIN_FIELD] === GENERATED_CHAIN_POLICY && node?._profile?.chained === true);
  }
  function egernNodeExclusionReason(node) {
    const protocol2 = normalizeProtocol(node?.type);
    const commonReason = egernCommonReason(node, protocol2);
    if (commonReason) return commonReason;
    if (hasArbitraryChain(node)) return "unsupported-existing-chain";
    if (protocol2 === "ss" || protocol2 === "shadowsocks") {
      if (!isNonblankString(node.cipher) || !isNonblankOpaqueString(node.password)) return "invalid-egern-node-shape";
      if (!EGERN_SHADOWSOCKS_METHODS.has(node.cipher)) return "unsupported-egern-method";
      if (hasShadowsocksPlugin(node) || unsupportedPlainTransport(node)) return "unsupported-egern-shadowsocks-shape";
      if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-shadowsocks-shape";
      if (["udp-port", "udp_port"].some((key) => !isOptionalPositiveInteger(node, key))) return "invalid-egern-node-shape";
      if (hasOption(node, "obfs") && !EGERN_OBFS.has(node.obfs) || ["obfs-host", "obfs_host"].some((key) => !validOptionalString(node, key)) || ["obfs-uri", "obfs_uri"].some((key) => !validOptionalString(node, key))) {
        return "unsupported-egern-shadowsocks-shape";
      }
      return null;
    }
    if (protocol2 === "snell") {
      if (!isNonblankOpaqueString(node.psk)) return "invalid-egern-node-shape";
      const version = typeof node.version === "string" && /^\d+$/.test(node.version) ? Number(node.version) : node.version;
      if (!EGERN_SNELL_VERSIONS.has(version)) return "unsupported-egern-version";
      if (hasOption(node, "obfs") && !EGERN_OBFS.has(node.obfs)) return "unsupported-egern-obfs";
      if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
      if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "reuse") || !isOptionalBoolean(node, "tfo") || resolvedUdp(node) === true && !(/* @__PURE__ */ new Set([3, 4])).has(version) || hasOption(node, "reuse") && version !== 4 || ["obfs-host", "obfs_host"].some((key) => !validOptionalString(node, key))) {
        return "unsupported-egern-snell-shape";
      }
      return null;
    }
    if (protocol2 === "vmess" || protocol2 === "vless") {
      if (!isNonblankString(node.uuid)) return "invalid-egern-node-shape";
      if (protocol2 === "vmess") {
        const security = EGERN_VMESS_SECURITY.has(node.security) ? node.security : node.cipher ?? "auto";
        if (!EGERN_VMESS_SECURITY.has(security)) return "unsupported-egern-security";
        if (hasOption(node, "legacy") && typeof node.legacy !== "boolean" || hasOption(node, "alter-id") && node["alter-id"] !== 0 || hasOption(node, "alterId") && node.alterId !== 0) {
          return "unsupported-egern-vmess-shape";
        }
      } else {
        if (hasOption(node, "flow") && !EGERN_VLESS_FLOWS.has(node.flow)) return "unsupported-egern-flow";
        if (hasOption(node, "flow") && (!(/* @__PURE__ */ new Set(["tcp", "raw"])).has(normalizeTransport(node)) || !tlsRequestedForCapability(node))) {
          return "unsupported-egern-flow";
        }
        if (node.security === "none" && (node.tls === true || hasOption(node, "reality-opts"))) {
          return "unsupported-egern-tls-shape";
        }
      }
      if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-transport";
      return egernVmessVlessTransportReason(node);
    }
    if (protocol2 === "trojan") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-egern-node-shape";
      if (node.tls === false || node.security === "none") return "unsupported-egern-tls-shape";
      const network = normalizeTransport(node);
      if (!(/* @__PURE__ */ new Set(["tcp", "raw", "ws"])).has(network)) return "unsupported-egern-transport";
      const tlsReason = egernTlsReason(node, { implicitTls: true });
      if (tlsReason) return tlsReason;
      if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-trojan-shape";
      if (network === "ws") {
        const options = node["ws-opts"];
        if (!isPlainObject(options) || Object.keys(options).some((key) => !["path", "headers"].includes(key)) || !validPath(options.path) || hasOption(options, "headers") && (!validHeaders(options.headers) || Object.keys(options.headers).some((key) => key.toLowerCase() !== "host"))) {
          return "unsupported-egern-transport";
        }
      } else if (hasOption(node, "ws-opts")) return "unsupported-egern-transport";
      if (["grpc-opts", "h2-opts", "http-opts"].some((key) => hasOption(node, key))) return "unsupported-egern-transport";
      return null;
    }
    if (protocol2 === "anytls") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-egern-node-shape";
      if (node.tls === false || node.security === "none") return "unsupported-egern-tls-shape";
      if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
      return egernTlsReason(node, { implicitTls: true, allowAlpn: true, allowClientFingerprint: true }) || (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo") ? "unsupported-egern-anytls-shape" : null);
    }
    if (protocol2 === "hysteria2" || protocol2 === "hy2") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-egern-node-shape";
      const tlsReason = egernTlsReason(node, { allowReality: false, implicitTls: true });
      if (tlsReason) return tlsReason;
      if (unsupportedPlainTransport(node, /* @__PURE__ */ new Set(["udp", "quic"]))) return "unsupported-egern-transport";
      if (hasOption(node, "obfs") && node.obfs !== "salamander") return "unsupported-egern-obfs";
      const obfsPassword = firstAliasValue(node, ["obfs-password", "obfs_password"]);
      if (obfsPassword !== void 0 && (!isNonblankOpaqueString(obfsPassword) || node.obfs !== "salamander")) {
        return isNonblankOpaqueString(obfsPassword) ? "unsupported-egern-obfs" : "invalid-egern-node-shape";
      }
      const hopping = firstAliasValue(node, ["port-hopping", "port_hopping", "ports"]);
      if (hopping !== void 0 && !isPortHopping(hopping) || hasConflictingAliases(node, ["port-hopping", "port_hopping", "ports"]) || hasConflictingAliases(node, ["port-hopping-interval", "port_hopping_interval", "hop-interval"]) || !isOptionalPositiveInteger(node, "port-hopping-interval") || !isOptionalPositiveInteger(node, "port_hopping_interval") || !isOptionalPositiveInteger(node, "hop-interval") || !isOptionalPositiveInteger(node, "bandwidth") || !isOptionalPositiveInteger(node, "up") || hasConflictingAliases(node, ["bandwidth", "up"]) || hasOption(node, "down") || resolvedUdp(node) === false) {
        return "unsupported-egern-hysteria2-shape";
      }
      return null;
    }
    if (protocol2 === "tuic") {
      if (!isNonblankString(node.uuid) || !isNonblankOpaqueString(node.password)) return "invalid-egern-node-shape";
      const tlsReason = egernTlsReason(node, { allowReality: false, allowAlpn: true, implicitTls: true });
      if (tlsReason) return tlsReason;
      if (unsupportedPlainTransport(node, /* @__PURE__ */ new Set(["udp", "quic"]))) return "unsupported-egern-transport";
      const udpRelayMode = firstAliasValue(node, ["udp-relay-mode", "udp_relay_mode"]);
      if (udpRelayMode !== void 0 && !EGERN_TUIC_UDP_MODES.has(udpRelayMode)) return "unsupported-egern-udp-mode";
      if (hasOption(node, "alpn") && (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((item) => !isNonblankString(item)))) {
        return "invalid-egern-node-shape";
      }
      const tuicHopping = firstAliasValue(node, ["port-hopping", "port_hopping", "ports"]);
      if (tuicHopping !== void 0 && !isPortHopping(tuicHopping) || ["port-hopping-interval", "port_hopping_interval", "hop-interval"].some((key) => !isOptionalPositiveInteger(node, key))) {
        return "invalid-egern-node-shape";
      }
      if (["congestion-controller", "reduce-rtt", "disable-sni"].some((key) => hasOption(node, key)) || resolvedUdp(node) === false) {
        return "unsupported-egern-tuic-shape";
      }
      return null;
    }
    if (protocol2 === "socks5") {
      if (!validOptionalAuthentication(node)) return "invalid-egern-node-shape";
      const tlsReason = egernTlsReason(node);
      if (tlsReason) return tlsReason;
      if (unsupportedPlainTransport(node) || !isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-socks5-shape";
      return null;
    }
    if (protocol2 === "http") {
      if (!validOptionalAuthentication(node)) return "invalid-egern-node-shape";
      const network = normalizeTransport(node);
      if (network !== "tcp" && network !== "raw") return "unsupported-egern-http-shape";
      if (["ws-opts", "grpc-opts", "h2-opts", "http-opts"].some((key) => hasOption(node, key))) return "unsupported-egern-http-shape";
      const tlsReason = egernTlsReason(node);
      if (tlsReason) return tlsReason;
      if (hasOption(node, "headers") && !validHeaders(node.headers) || !isOptionalBoolean(node, "tfo") || UDP_ALIASES.some((key) => hasOption(node, key))) {
        return "unsupported-egern-http-shape";
      }
      return null;
    }
    if (protocol2 === "wireguard") {
      if (unsupportedPlainTransport(node, /* @__PURE__ */ new Set(["udp"]))) return "unsupported-egern-wireguard-shape";
      return egernWireGuardReason(node);
    }
    if (protocol2 === "ssh") return egernSshReason(node);
    return null;
  }
  function hasAnyChain(node) {
    return CHAIN_ALIASES.some((key) => hasOption(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "") || node?._profile?.chained === true;
  }
  function anywhereTlsWeakeningReason(node) {
    for (const key of ["skip-cert-verify", "allow-insecure"]) {
      if (hasOption(node, key) && typeof node[key] !== "boolean") return "invalid-anywhere-node-shape";
      if (node[key] === true) return "unsupported-anywhere-tls-weakening";
    }
    if (conflictingAliases(node, ["skip-cert-verify", "allow-insecure"])) {
      return "conflicting-anywhere-alias";
    }
    return null;
  }
  function validAnywhereFingerprint(node) {
    return !hasOption(node, "client-fingerprint") || isNonblankString(node["client-fingerprint"]) && ANYWHERE_FINGERPRINTS.has(node["client-fingerprint"].toLowerCase());
  }
  function validAnywhereAlpn(node) {
    return !hasOption(node, "alpn") || Array.isArray(node.alpn) && node.alpn.length > 0 && node.alpn.every(isNonblankString);
  }
  function validAnywhereEch(node) {
    if (!hasOption(node, "ech-opts")) return true;
    const options = node["ech-opts"];
    return isPlainObject(options) && Object.keys(options).every((key) => ["enable", "config"].includes(key)) && (!hasOption(options, "enable") || typeof options.enable === "boolean") && (!hasOption(options, "config") || isNonblankString(options.config)) && (!hasOption(options, "config") || options.enable === true);
  }
  function anywhereTlsShapeReason(node) {
    const weakening = anywhereTlsWeakeningReason(node);
    if (weakening) return weakening;
    if (conflictingAliases(node, ["sni", "servername"]) || !optionalStringAliasesAreValid(node, ["sni", "servername"]) || !validAnywhereFingerprint(node) || !validAnywhereAlpn(node) || !validAnywhereEch(node) || hasOption(node, "fingerprint-sha256") || hasOption(node, "fingerprint_sha256")) {
      return "unsupported-anywhere-tls-shape";
    }
    return null;
  }
  function validVlessUserId(value) {
    if (!isNonblankString(value) || !/^[\u0021-\u007e]+$/u.test(value)) return false;
    if (value.length >= 1 && value.length <= 30) return true;
    return value.length === 32 && /^[0-9A-Fa-f]{32}$/u.test(value) || value.length === 36 && /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/u.test(value);
  }
  function isAnywhereRealityPublicKey(value) {
    return isNonblankString(value) && /^(?:[A-Za-z0-9_-]{43}|[A-Za-z0-9_-]{43}=)$/u.test(value);
  }
  function isAnywhereVlessEncryptionKey(value) {
    return /^(?:[A-Za-z0-9_-]{43}|[A-Za-z0-9_-]{43}=)$/u.test(value) || /^(?:[A-Za-z0-9_-]{1579}|[A-Za-z0-9_-]{1579}=)$/u.test(value);
  }
  function validAnywhereVlessEncryption(value) {
    if (value === void 0 || value === "" || value === "none") return true;
    if (!isNonblankString(value)) return false;
    const segments = value.split(".");
    if (segments.length < 4 || segments[0] !== "mlkem768x25519plus" || !["native", "xorpub", "random"].includes(segments[1]) || !["1rtt", "0rtt"].includes(segments[2])) return false;
    let keyCount = 0;
    for (const segment of segments.slice(3)) {
      if (segment.length < 20) continue;
      if (!isAnywhereVlessEncryptionKey(segment)) return false;
      keyCount += 1;
    }
    return keyCount > 0;
  }
  function validAnywhereBandwidth(value) {
    if (value === void 0) return true;
    const text = typeof value === "number" && Number.isInteger(value) ? String(value) : value;
    if (typeof text !== "string" || !/^\d+(?:\s+Mbps)?$/u.test(text)) return false;
    const amount = Number(text.split(/\s+/u, 1)[0]);
    return Number.isSafeInteger(amount) && amount >= 0 && amount <= 1e3;
  }
  function validAnywhereWsOptions(value) {
    if (!isPlainObject(value)) return false;
    if (Object.keys(value).some((key) => ![
      "path",
      "headers",
      "v2ray-http-upgrade",
      "max-early-data",
      "early-data-header-name"
    ].includes(key))) return false;
    if (hasOption(value, "path") && !isNonblankString(value.path) || hasOption(value, "v2ray-http-upgrade") && typeof value["v2ray-http-upgrade"] !== "boolean" || hasOption(value, "max-early-data") && (!Number.isInteger(value["max-early-data"]) || value["max-early-data"] < 0) || hasOption(value, "early-data-header-name") && !isNonblankString(value["early-data-header-name"])) {
      return false;
    }
    if (!hasOption(value, "headers")) return true;
    return isPlainObject(value.headers) && Object.entries(value.headers).every(([key, field]) => isNonblankString(key) && isNonblankString(field));
  }
  function validAnywhereSudokuAliases(node, keys, predicate) {
    if (conflictingAliases(node, keys)) return false;
    return keys.every((key) => !hasOption(node, key) || predicate(node[key]));
  }
  function validAnywhereSudokuTables(node) {
    const pluralKeys = ["custom-tables", "custom_tables", "customTables"];
    const legacyKeys = ["custom-table", "custom_table", "table"];
    const pluralPresent = pluralKeys.filter((key) => hasOption(node, key));
    const legacyPresent = legacyKeys.filter((key) => hasOption(node, key));
    if (pluralPresent.length > 1 || legacyPresent.length > 1 || pluralPresent.length > 0 && legacyPresent.length > 0) return false;
    if (pluralPresent.length > 0) {
      const tables = node[pluralPresent[0]];
      if (!Array.isArray(tables) || tables.length === 0 || !tables.every((value) => isNonblankString(value))) return false;
      return new Set(tables).size === tables.length;
    }
    return legacyPresent.length === 0 || isNonblankString(node[legacyPresent[0]]);
  }
  function validAnywhereSudokuHttpMask(value) {
    if (!isPlainObject(value) || Object.keys(value).some((key) => !["disable", "mode", "tls", "host", "path-root", "path_root"].includes(key)) || !validAnywhereSudokuAliases(value, ["path-root", "path_root"], (field) => typeof field === "string") || hasOption(value, "disable") && typeof value.disable !== "boolean" || hasOption(value, "tls") && typeof value.tls !== "boolean" || hasOption(value, "mode") && (!isNonblankString(value.mode) || !ANYWHERE_SUDOKU_HTTP_MASK_MODES.has(value.mode)) || hasOption(value, "host") && typeof value.host === "string" && value.host.trim() !== value.host || hasOption(value, "host") && typeof value.host !== "string") return false;
    const pathRoot = firstAliasValue(value, ["path-root", "path_root"]);
    return pathRoot === void 0 || pathRoot === "" || /^[A-Za-z0-9_-]+$/u.test(pathRoot);
  }
  function validAnywhereSudoku(node) {
    if (!validAnywhereSudokuAliases(node, ["aead-method", "aead"], (value) => isNonblankString(value) && ANYWHERE_SUDOKU_AEAD.has(value))) return false;
    if (!validAnywhereSudokuAliases(node, ["table-type", "ascii"], (value) => typeof value === "string" && value.trim() === value && ANYWHERE_SUDOKU_ASCII.has(value.toLowerCase()))) return false;
    if (!validAnywhereSudokuAliases(node, ["padding-min", "padding_min"], (value) => Number.isInteger(value) && value >= 0 && value <= 100)) return false;
    if (!validAnywhereSudokuAliases(node, ["padding-max", "padding_max"], (value) => Number.isInteger(value) && value >= 0 && value <= 100)) return false;
    if (!validAnywhereSudokuAliases(node, ["enable-pure-downlink", "enable_pure_downlink"], (value) => typeof value === "boolean")) return false;
    const paddingMin = firstAliasValue(node, ["padding-min", "padding_min"]);
    const paddingMax = firstAliasValue(node, ["padding-max", "padding_max"]);
    if (paddingMax !== void 0 && paddingMax < (paddingMin ?? 5)) return false;
    if (hasOption(node, "multiplex") && (!isNonblankString(node.multiplex) || !(/* @__PURE__ */ new Set(["off", "auto", "on"])).has(node.multiplex.toLowerCase()))) return false;
    return validAnywhereSudokuTables(node) && (!hasOption(node, "httpmask") || validAnywhereSudokuHttpMask(node.httpmask));
  }
  function anywhereCommonReason(node) {
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort(node.port)) return "invalid-anywhere-node-shape";
    if (hasOption(node, "tls") && typeof node.tls !== "boolean" || hasOption(node, "security") && !isNonblankString(node.security)) {
      return "invalid-anywhere-node-shape";
    }
    if (hasAnyChain(node)) return "unsupported-existing-chain";
    return anywhereTlsWeakeningReason(node);
  }
  function anywhereNodeExclusionReason(node) {
    const protocol2 = normalizeProtocol(node?.type);
    const commonReason = anywhereCommonReason(node);
    if (commonReason) return commonReason;
    const network = normalizeTransport(node);
    const transportFields = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "xhttp-opts"];
    if (protocol2 === "ss" || protocol2 === "shadowsocks") {
      if (!isNonblankOpaqueString(node.password) || !isNonblankString(node.cipher)) return "invalid-anywhere-node-shape";
      if (!ANYWHERE_SHADOWSOCKS_METHODS.has(node.cipher.toLowerCase())) return "unsupported-anywhere-shadowsocks-method";
      if (network !== "tcp" || hasShadowsocksPlugin(node) || node.tls === true || hasOption(node, "security") && node.security !== "none" || transportFields.some((key) => hasOption(node, key))) {
        return "unsupported-anywhere-shadowsocks-shape";
      }
      return null;
    }
    if (protocol2 === "vless") {
      if (!validVlessUserId(node.uuid)) return "invalid-anywhere-node-shape";
      if (!ANYWHERE_VLESS_NETWORKS.has(network)) return "unsupported-anywhere-vless-network";
      if (!validAnywhereVlessEncryption(node.encryption)) return "unsupported-anywhere-vless-encryption";
      if (hasOption(node, "flow") && node.flow !== "" && node.flow !== "xtls-rprx-vision") {
        return "unsupported-anywhere-vless-flow";
      }
      if (network === "ws") {
        if (hasOption(node, "ws-opts") && !validAnywhereWsOptions(node["ws-opts"]) || transportFields.some((key) => key !== "ws-opts" && hasOption(node, key))) {
          return "unsupported-anywhere-vless-transport";
        }
      } else if (transportFields.some((key) => hasOption(node, key))) {
        return "unsupported-anywhere-vless-transport";
      }
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      const reality = node["reality-opts"];
      if (reality !== void 0) {
        if (!isPlainObject(reality) || Object.keys(reality).some((key) => !ANYWHERE_REALITY_ALLOWED_KEYS.has(key)) || !isAnywhereRealityPublicKey(reality["public-key"]) || hasOption(reality, "short-id") && !/^(?:[0-9A-Fa-f]{2}){1,8}$/u.test(reality["short-id"]) || hasOption(node, "alpn") || hasOption(node, "ech-opts")) {
          return "unsupported-anywhere-reality";
        }
      }
      if (node.security === "reality" && reality === void 0 || node.security === "none" && node.tls === true || node.security === "tls" && node.tls === false || node.security === "reality" && node.tls === false) {
        return "unsupported-anywhere-tls-shape";
      }
      return null;
    }
    if (protocol2 === "trojan") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-anywhere-node-shape";
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      const ssOptions = node["ss-opts"];
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields.some((key) => hasOption(node, key)) || hasOption(node, "ss-opts") && (!isPlainObject(ssOptions) || ssOptions.enabled === true)) {
        return "unsupported-anywhere-trojan-shape";
      }
      return null;
    }
    if (protocol2 === "anytls") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-anywhere-node-shape";
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields.some((key) => hasOption(node, key)) || !isOptionalBoolean(node, "udp") || ["idle-session-check-interval", "idle-session-timeout"].some((key) => hasOption(node, key) && (!Number.isInteger(node[key]) || node[key] < 30)) || hasOption(node, "min-idle-session") && (!Number.isInteger(node["min-idle-session"]) || node["min-idle-session"] < 0)) {
        return "unsupported-anywhere-anytls-shape";
      }
      return null;
    }
    if (protocol2 === "hysteria2" || protocol2 === "hy2") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-anywhere-node-shape";
      const hysteriaNetwork = hasOption(node, "network") ? network : "quic";
      if (!["udp", "quic"].includes(hysteriaNetwork)) return "unsupported-anywhere-hysteria2-shape";
      if (node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || hasOption(node, "alpn") || hasOption(node, "bandwidth") || hasOption(node, "client-fingerprint") || hasOption(node, "ech-opts") || ["port-hopping", "port_hopping", "ports", "port-hopping-interval", "port_hopping_interval", "hop-interval"].some((key) => hasOption(node, key))) return "unsupported-anywhere-hysteria2-shape";
      const minAliases = ["obfs-min-packet-size", "obfs_min_packet_size"];
      const maxAliases = ["obfs-max-packet-size", "obfs_max_packet_size"];
      const obfsMin = firstAliasValue(node, minAliases);
      const obfsMax = firstAliasValue(node, maxAliases);
      if (!validAnywhereBandwidth(node.up) || !validAnywhereBandwidth(node.down) || conflictingAliases(node, minAliases) || conflictingAliases(node, maxAliases) || [...minAliases, ...maxAliases].some((key) => hasOption(node, key) && (!Number.isInteger(node[key]) || node[key] <= 0 || node[key] > 2048)) || obfsMin !== void 0 && obfsMax !== void 0 && obfsMax < obfsMin) {
        return "unsupported-anywhere-hysteria2-shape";
      }
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      if (conflictingAliases(node, ["obfs-password", "obfs_password"])) return "conflicting-anywhere-alias";
      const obfs = node.obfs;
      const obfsPassword = firstAliasValue(node, ["obfs-password", "obfs_password"]);
      if (obfs !== void 0 && (!ANYWHERE_HYSTERIA_OBFS.has(String(obfs).toLowerCase()) || !isNonblankOpaqueString(obfsPassword)) || obfs === void 0 && obfsPassword !== void 0 || String(obfs).toLowerCase() !== "gecko" && (obfsMin !== void 0 || obfsMax !== void 0)) {
        return "unsupported-anywhere-hysteria2-obfs";
      }
      return null;
    }
    if (protocol2 === "socks5") {
      if (network !== "tcp" || node.tls === true || hasOption(node, "security") && node.security !== "none") {
        return "unsupported-anywhere-socks5-tls";
      }
      if (!validOptionalAuthentication(node) || hasOption(node, "username") !== hasOption(node, "password")) return "invalid-anywhere-node-shape";
      return null;
    }
    if (protocol2 === "sudoku") {
      if (!isNonblankString(node.key) || network !== "tcp") return "invalid-anywhere-node-shape";
      if (["tls", "security", "sni", "servername", "alpn", "client-fingerprint", "ech-opts", "reality-opts"].some((key) => hasOption(node, key))) return "unsupported-anywhere-sudoku-shape";
      if (!validAnywhereSudoku(node)) return "unsupported-anywhere-sudoku-shape";
      return null;
    }
    return "unsupported-protocol";
  }
  function evaluateNodeForClient(node, client) {
    if (!Object.values(CLIENT).includes(client)) return { supported: false, reason: "unsupported-client" };
    if (client === CLIENT.v2box || client === CLIENT.happ) {
      const reason = evaluateXrayNodeExclusionReason(node ?? {}, client);
      return reason ? { supported: false, reason } : { supported: true, reason: null };
    }
    const protocol2 = normalizeProtocol(node?.type);
    if (!protocolSupportsClient(protocol2, client)) {
      return { supported: false, reason: "unsupported-protocol" };
    }
    let transportReason = null;
    if (client === CLIENT.anywhere) transportReason = anywhereNodeExclusionReason(node ?? {});
    else if (client === CLIENT.egern) transportReason = egernNodeExclusionReason(node ?? {});
    else if (client === CLIENT.singbox) transportReason = singBoxNodeExclusionReason(node ?? {});
    return transportReason ? { supported: false, reason: transportReason } : { supported: true, reason: null };
  }
  var XRAY_TRANSPORTS = /* @__PURE__ */ new Set([
    "tcp",
    "raw",
    "ws",
    "grpc",
    "h2",
    "http2",
    "http",
    "httpupgrade",
    "xhttp",
    "kcp",
    "mkcp",
    "hysteria"
  ]);
  var XRAY_CHAIN_REASON = Object.freeze({
    v2box: "unsupported-v2box-chain",
    happ: "unsupported-happ-chain"
  });
  var XRAY_PROTOCOL_REASON = Object.freeze({
    v2box: "unsupported-v2box-protocol",
    happ: "unsupported-happ-protocol"
  });
  var XRAY_TRANSPORT_REASON = Object.freeze({
    v2box: "unsupported-v2box-transport",
    happ: "unsupported-happ-transport"
  });
  function xrayCommonReason(node, client) {
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort(node.port)) {
      return `invalid-${client}-node-shape`;
    }
    if (hasAnyChain(node)) return XRAY_CHAIN_REASON[client];
    const protocol2 = normalizeProtocol(node.type);
    if (!protocolSupportsClient(protocol2, client)) return XRAY_PROTOCOL_REASON[client];
    return null;
  }
  function xrayTlsReason(node, client) {
    const reality = node["reality-opts"];
    if (Object.hasOwn(node, "reality")) return `unsupported-${client}-tls`;
    const vmessCipherSecurity = normalizeProtocol(node.type) === "vmess" && typeof node.security === "string" && XRAY_VMESS_SECURITY.has(node.security.toLowerCase());
    const security = node.security === void 0 || vmessCipherSecurity ? reality !== void 0 ? "reality" : node.tls === true ? "tls" : "none" : String(node.security).toLowerCase();
    if (!["none", "tls", "reality"].includes(security)) return `unsupported-${client}-tls`;
    if (!vmessCipherSecurity && (node.security === "none" && node.tls === true || node.tls === false && security !== "none")) {
      return `unsupported-${client}-tls`;
    }
    if (normalizeProtocol(node.type) === "vmess" && hasOption(node, "cipher") && vmessCipherSecurity && String(node.cipher).toLowerCase() !== String(node.security).toLowerCase()) {
      return `unsupported-${client}-tls`;
    }
    if (security !== "reality" && reality !== void 0) return `unsupported-${client}-tls`;
    if (security === "reality") {
      if (!isPlainObject(reality) || !isNonblankOpaqueString(reality["public-key"])) {
        return `incomplete-${client}-reality`;
      }
      if (Object.keys(reality).some((key) => !["public-key", "short-id", "spider-x", "_spider-x"].includes(key))) {
        return `unsupported-${client}-tls`;
      }
    }
    if (hasOption(node, "skip-cert-verify") && typeof node["skip-cert-verify"] !== "boolean" || hasOption(node, "allow-insecure") && typeof node["allow-insecure"] !== "boolean") {
      return `unsupported-${client}-tls`;
    }
    return null;
  }
  function xrayTransportReason(node, client, protocol2) {
    if (protocol2 === "hysteria2" || protocol2 === "hy2") {
      const network2 = normalizeTransport(node);
      return network2 !== "tcp" && network2 !== "udp" && network2 !== "quic" ? XRAY_TRANSPORT_REASON[client] : null;
    }
    const network = normalizeTransport(node);
    const allowed = XRAY_TRANSPORTS;
    if (!allowed.has(network)) return XRAY_TRANSPORT_REASON[client];
    if (protocol2 === "socks5" && network !== "tcp" && network !== "raw") return XRAY_TRANSPORT_REASON[client];
    if ((protocol2 === "ss" || protocol2 === "shadowsocks") && (hasShadowsocksPlugin(node) || network !== "tcp" && network !== "raw")) {
      return XRAY_TRANSPORT_REASON[client];
    }
    const optionKeys = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "httpupgrade-opts", "xhttp-opts", "kcp-opts", "hysteria-opts"];
    const present = optionKeys.filter((key) => hasOption(node, key));
    const expected = network === "ws" ? "ws-opts" : network === "grpc" ? "grpc-opts" : network === "h2" || network === "http2" || network === "http" ? "h2-opts" : network === "httpupgrade" ? "httpupgrade-opts" : network === "xhttp" ? "xhttp-opts" : network === "kcp" || network === "mkcp" ? "kcp-opts" : null;
    if (present.some((key) => key !== expected && !(expected === "h2-opts" && key === "http-opts"))) return XRAY_TRANSPORT_REASON[client];
    for (const key of present) if (!isPlainObject(node[key])) return XRAY_TRANSPORT_REASON[client];
    return null;
  }
  function evaluateXrayNodeExclusionReason(node, client) {
    const common2 = xrayCommonReason(node, client);
    if (common2) return common2;
    const protocol2 = normalizeProtocol(node.type);
    const tls = xrayTlsReason(node, client);
    if (tls) return tls;
    const transport = xrayTransportReason(node, client, protocol2);
    if (transport) return transport;
    if ((client === "v2box" || client === "happ") && protocol2 === "socks5" && (node.tls === true || node.security === "tls" || node.security === "reality")) {
      return `unsupported-${client}-tls`;
    }
    return null;
  }
  function singBoxNodeExclusionReason(node) {
    if (normalizeProtocol(node?.type) !== "snell") return null;
    const version = Number(node.version);
    if (!Number.isInteger(version) || !SINGBOX_SNELL_VERSIONS.has(version)) {
      return "unsupported-singbox-snell-version";
    }
    if (version === 4 || version === 5) {
      const obfsMode = node.obfs_mode ?? node["obfs-mode"] ?? node.obfs;
      if (obfsMode !== void 0 && obfsMode !== "" && !SINGBOX_SNELL_OBFS_MODES.has(String(obfsMode).toLowerCase())) {
        return "unsupported-singbox-snell-obfs";
      }
    }
    if (version === 6 && node.mode !== void 0 && !SINGBOX_SNELL_MODES.has(String(node.mode).toLowerCase())) {
      return "unsupported-singbox-snell-mode";
    }
    return null;
  }
  function filterNodesForClient(nodes, client) {
    const diagnostics = createClientFilterDiagnostics();
    const supportedNodes = [];
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const evaluation = evaluateNodeForClient(node, client);
      if (evaluation.supported) {
        supportedNodes.push(node);
        diagnostics.accepted += 1;
      } else {
        increment(diagnostics.excluded, evaluation.reason);
      }
    }
    return { nodes: supportedNodes, diagnostics };
  }

  // ../../shared/nodes/client-chain.js
  var SUPPORTED_LANDING_PROTOCOLS = /* @__PURE__ */ new Set([
    "ss",
    "shadowsocks",
    "ssr",
    "snell",
    "vmess",
    "vless",
    "trojan",
    "socks5",
    "http"
  ]);
  var CHAIN_ALIASES2 = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  function hasExistingChain(node) {
    return CHAIN_ALIASES2.some((key) => {
      if (!Object.hasOwn(node ?? {}, key)) return false;
      const value = node[key];
      return value !== void 0 && value !== null && value !== "";
    });
  }
  function addClientChainClones(nodes, diagnostics, enabled) {
    if (!enabled) return nodes;
    const landings = nodes.filter((node) => nodeMetadata(node).sourceKind === "landing");
    const existingLandings = landings.filter((node) => hasExistingChain(node));
    const chainableLandings = landings.filter((node) => !hasExistingChain(node));
    if (existingLandings.length > 0) {
      increment(diagnostics.excluded, "chain-existing", existingLandings.length);
    }
    if (chainableLandings.length === 0) return nodes;
    if (!nodes.some((node) => nodeMetadata(node).entry === true)) {
      increment(diagnostics.excluded, "chain-entry-missing", chainableLandings.length);
      return nodes;
    }
    const clones = [];
    for (const landing of chainableLandings) {
      if (!SUPPORTED_LANDING_PROTOCOLS.has(String(landing.type).trim().toLowerCase())) {
        increment(diagnostics.excluded, "chain-protocol-unsupported");
        continue;
      }
      const clone = structuredClone(landing);
      clone.name = `\u{1F517} ${clone.name}`;
      clone["underlying-proxy"] = "\u{1F517} \u5165\u53E3\u8282\u70B9";
      clone._profile = { ...nodeMetadata(clone), chained: true };
      clones.push(clone);
    }
    return [...nodes, ...clones];
  }

  // ../../shared/nodes/node-identity.js
  var EXCLUDED_TOP_LEVEL_KEYS = /* @__PURE__ */ new Set(["name"]);
  var SEMANTIC_UNDERSCORE_KEYS = /* @__PURE__ */ new Set(["_network"]);
  function isSemanticUnderscoreKey(key) {
    return SEMANTIC_UNDERSCORE_KEYS.has(key);
  }
  function isExcludedTopLevelKey(key) {
    return EXCLUDED_TOP_LEVEL_KEYS.has(key) || key.startsWith("_") && !isSemanticUnderscoreKey(key);
  }
  function stableValue(value, stack = /* @__PURE__ */ new Set(), topLevel = false) {
    if (value === null) return "null";
    switch (typeof value) {
      case "string":
        return JSON.stringify(value);
      case "boolean":
        return value ? "true" : "false";
      case "number":
        return Number.isFinite(value) ? String(value) : JSON.stringify(String(value));
      case "bigint":
        return JSON.stringify(`${value}n`);
      case "undefined":
        return "undefined";
      case "function":
      case "symbol":
        return JSON.stringify(String(value));
      default:
        break;
    }
    if (stack.has(value)) return JSON.stringify("[Circular]");
    stack.add(value);
    let result;
    if (Array.isArray(value)) {
      result = `[${value.map((item) => stableValue(item, stack)).join(",")}]`;
    } else {
      const entries = Object.keys(value).filter((key) => !(topLevel && isExcludedTopLevelKey(key))).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key], stack)}`);
      result = `{${entries.join(",")}}`;
    }
    stack.delete(value);
    return result;
  }
  function identityKey(node) {
    return stableValue(node, /* @__PURE__ */ new Set(), true);
  }
  function fingerprint(node) {
    const value = identityKey(node);
    let hash2 = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash2 ^= value.charCodeAt(index);
      hash2 = Math.imul(hash2, 16777619);
    }
    return (hash2 >>> 0).toString(36).padStart(7, "0");
  }

  // ../../shared/nodes/node-validation.js
  var PSEUDO_NODE_PATTERN = /剩余|流量|到期|套餐|官网|公告|通知|traffic|expire|website/i;
  function isNonblankOpaqueString2(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isNonblankIdentifier(value) {
    return isNonblankOpaqueString2(value) && value.trim() === value;
  }
  var OPAQUE_AUTH_FIELDS = /* @__PURE__ */ new Set(["password", "psk", "private-key", "public-key", "key"]);
  function isValidPort2(value) {
    const port2 = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return Number.isInteger(port2) && port2 >= 1 && port2 <= 65535;
  }
  function isValidAuthField(field, value) {
    if (field === "version") {
      const version = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
      return Number.isInteger(version) && version >= 1;
    }
    return OPAQUE_AUTH_FIELDS.has(field) ? isNonblankOpaqueString2(value) : isNonblankIdentifier(value);
  }
  function hasTlsIdentity(node) {
    return Boolean(
      isNonblankIdentifier(node.sni) || isNonblankIdentifier(node.servername) || node["skip-cert-verify"] === true || node["allow-insecure"] === true || isNonblankIdentifier(node["reality-opts"]?.["public-key"])
    );
  }
  function wireGuardPublicKey(node) {
    if (isNonblankOpaqueString2(node["public-key"])) return node["public-key"];
    if (!Array.isArray(node.peers) || node.peers.length !== 1) return void 0;
    const peer = node.peers[0];
    return peer && typeof peer === "object" && !Array.isArray(peer) ? peer["public-key"] : void 0;
  }
  function hasSshAuthentication(node) {
    return isNonblankOpaqueString2(node.password) || isNonblankOpaqueString2(node["private-key"]) || isNonblankOpaqueString2(node.private_key);
  }
  function hasExplicitUdp(node) {
    return node?.udp === true;
  }
  function validateNode(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return { valid: false, reason: "not-object", warnings: [] };
    }
    if (typeof node.name !== "string" || !node.name.trim() || PSEUDO_NODE_PATTERN.test(node.name)) {
      return { valid: false, reason: "pseudo-node", warnings: [] };
    }
    if (typeof node.type !== "string" || !node.type.trim() || !isNonblankIdentifier(node.server) || !isValidPort2(node.port)) {
      return { valid: false, reason: "missing-endpoint", warnings: [] };
    }
    const type = node.type.trim().toLowerCase();
    const definition = protocolDefinition(type);
    if (definition?.requiredFields.some((field) => {
      const value = type === "wireguard" && field === "public-key" ? wireGuardPublicKey(node) : node[field];
      return !isValidAuthField(field, value);
    }) || type === "ssh" && !hasSshAuthentication(node)) {
      return { valid: false, reason: "missing-auth", warnings: [] };
    }
    const tls = node.tls === true || definition?.tls === true;
    const warnings = tls && !hasTlsIdentity(node) ? ["tls-verification-unclear"] : [];
    return { valid: true, reason: null, warnings };
  }

  // ../../shared/nodes/country-regions.js
  var REGION_CODES = Object.freeze({
    [CONTINENT.asiaPacific]: Object.freeze(`
    AE AF AM AS AU AZ BD BH BN BT CC CK CN CX CY FJ FM GE GU HK HM ID IL IN
    IQ IR JO JP KG KH KI KP KR KW KZ LA LB LK MH MM MN MO MP MV MY NC NF NP NR
    NU NZ OM PF PG PH PK PN PS PW QA SA SB SG SY TH TJ TK TL TM TO TR TV TW
    UM UZ VN VU WF WS YE
  `.trim().split(/\s+/)),
    [CONTINENT.europe]: Object.freeze(`
    AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE
    IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK
    SM UA VA
  `.trim().split(/\s+/)),
    [CONTINENT.americas]: Object.freeze(`
    AG AI AR AW BB BL BM BO BQ BR BS BV BZ CA CL CO CR CU CW DM DO EC FK GD GF
    GL GP GS GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX
    TC TT US UY VC VE VG VI
  `.trim().split(/\s+/)),
    [CONTINENT.other]: Object.freeze(`
    AO AQ BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ
    GW IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN
    SO SS ST SZ TD TF TG TN TZ UG YT ZA ZM ZW
  `.trim().split(/\s+/))
  });
  function countryCodeToFlag(code) {
    return [...code].map((letter) => String.fromCodePoint(127462 + letter.charCodeAt(0) - 65)).join("");
  }
  var COUNTRY_CODE_COUNT = Object.values(REGION_CODES).flat().length;
  var CONTINENT_FLAGS = Object.freeze(Object.fromEntries(
    Object.entries(REGION_CODES).map(([continent, codes]) => [
      continent,
      Object.freeze(codes.map(countryCodeToFlag))
    ])
  ));
  var FLAG_CONTINENTS = new Map(
    Object.entries(CONTINENT_FLAGS).flatMap(([continent, flags]) => flags.map((flag) => [flag, continent]))
  );
  function continentForFlag(flag) {
    return FLAG_CONTINENTS.get(flag) ?? null;
  }

  // ../../shared/nodes/regions.js
  var FLAG_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
  var RAW_REGIONS = [
    {
      flag: "\u{1F1E8}\u{1F1F3}",
      label: "\u4E2D\u56FD",
      continent: CONTINENT.asiaPacific,
      terms: ["CN", "PEK", "PVG", "CAN", "China", "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "\u4E2D\u56FD", "\u5317\u4EAC", "\u4E0A\u6D77", "\u5E7F\u5DDE", "\u6DF1\u5733"]
    },
    { flag: "\u{1F1ED}\u{1F1F0}", label: "\u9999\u6E2F", continent: CONTINENT.asiaPacific, terms: ["HK", "HKG", "Hong Kong", "\u9999\u6E2F"] },
    { flag: "\u{1F1F2}\u{1F1F4}", label: "\u6FB3\u95E8", continent: CONTINENT.asiaPacific, terms: ["MO", "MFM", "Macau", "Macao", "\u6FB3\u95E8"] },
    { flag: "\u{1F1F9}\u{1F1FC}", label: "\u53F0\u6E7E", continent: CONTINENT.asiaPacific, terms: ["TW", "TPE", "Taiwan", "Taipei", "\u53F0\u6E7E", "\u53F0\u5317"] },
    { flag: "\u{1F1EF}\u{1F1F5}", label: "\u65E5\u672C", continent: CONTINENT.asiaPacific, terms: ["JP", "NRT", "HND", "KIX", "Japan", "Tokyo", "Osaka", "\u65E5\u672C", "\u4E1C\u4EAC", "\u5927\u962A"] },
    { flag: "\u{1F1F0}\u{1F1F7}", label: "\u97E9\u56FD", continent: CONTINENT.asiaPacific, terms: ["KR", "ICN", "Korea", "Seoul", "\u97E9\u56FD", "\u9996\u5C14"] },
    { flag: "\u{1F1F8}\u{1F1EC}", label: "\u65B0\u52A0\u5761", continent: CONTINENT.asiaPacific, terms: ["SG", "SIN", "Singapore", "\u65B0\u52A0\u5761"] },
    { flag: "\u{1F1F2}\u{1F1FE}", label: "\u9A6C\u6765\u897F\u4E9A", continent: CONTINENT.asiaPacific, terms: ["MY", "KUL", "Malaysia", "Kuala Lumpur", "\u9A6C\u6765\u897F\u4E9A", "\u5409\u9686\u5761"] },
    { flag: "\u{1F1F9}\u{1F1ED}", label: "\u6CF0\u56FD", continent: CONTINENT.asiaPacific, terms: ["TH", "BKK", "Thailand", "Bangkok", "\u6CF0\u56FD", "\u66FC\u8C37"] },
    { flag: "\u{1F1F5}\u{1F1ED}", label: "\u83F2\u5F8B\u5BBE", continent: CONTINENT.asiaPacific, terms: ["PH", "MNL", "Philippines", "Manila", "\u83F2\u5F8B\u5BBE", "\u9A6C\u5C3C\u62C9"] },
    { flag: "\u{1F1EE}\u{1F1E9}", label: "\u5370\u5EA6\u5C3C\u897F\u4E9A", continent: CONTINENT.asiaPacific, terms: ["ID", "CGK", "Indonesia", "Jakarta", "\u5370\u5EA6\u5C3C\u897F\u4E9A", "\u96C5\u52A0\u8FBE"] },
    { flag: "\u{1F1E6}\u{1F1FA}", label: "\u6FB3\u5927\u5229\u4E9A", continent: CONTINENT.asiaPacific, terms: ["AU", "SYD", "MEL", "Australia", "Sydney", "Melbourne", "\u6FB3\u5927\u5229\u4E9A", "\u6089\u5C3C", "\u58A8\u5C14\u672C"] },
    { flag: "\u{1F1EE}\u{1F1F3}", label: "\u5370\u5EA6", continent: CONTINENT.asiaPacific, terms: ["IN", "BOM", "DEL", "India", "Mumbai", "Delhi", "\u5370\u5EA6", "\u5B5F\u4E70", "\u5FB7\u91CC"] },
    { flag: "\u{1F1E9}\u{1F1EA}", label: "\u5FB7\u56FD", continent: CONTINENT.europe, terms: ["DE", "FRA", "Germany", "Frankfurt", "\u5FB7\u56FD", "\u6CD5\u5170\u514B\u798F"] },
    { flag: "\u{1F1EC}\u{1F1E7}", label: "\u82F1\u56FD", continent: CONTINENT.europe, terms: ["GB", "UK", "LHR", "Britain", "United Kingdom", "London", "\u82F1\u56FD", "\u4F26\u6566"] },
    { flag: "\u{1F1EB}\u{1F1F7}", label: "\u6CD5\u56FD", continent: CONTINENT.europe, terms: ["FR", "CDG", "France", "Paris", "\u6CD5\u56FD", "\u5DF4\u9ECE"] },
    { flag: "\u{1F1F3}\u{1F1F1}", label: "\u8377\u5170", continent: CONTINENT.europe, terms: ["NL", "AMS", "Netherlands", "Amsterdam", "\u8377\u5170", "\u963F\u59C6\u65AF\u7279\u4E39"] },
    { flag: "\u{1F1E8}\u{1F1ED}", label: "\u745E\u58EB", continent: CONTINENT.europe, terms: ["CH", "ZRH", "Switzerland", "Zurich", "\u745E\u58EB", "\u82CF\u9ECE\u4E16"] },
    { flag: "\u{1F1EE}\u{1F1F9}", label: "\u610F\u5927\u5229", continent: CONTINENT.europe, terms: ["IT", "MXP", "Italy", "Milan", "\u610F\u5927\u5229", "\u7C73\u5170"] },
    { flag: "\u{1F1EA}\u{1F1F8}", label: "\u897F\u73ED\u7259", continent: CONTINENT.europe, terms: ["ES", "MAD", "Spain", "Madrid", "\u897F\u73ED\u7259", "\u9A6C\u5FB7\u91CC"] },
    { flag: "\u{1F1F8}\u{1F1EA}", label: "\u745E\u5178", continent: CONTINENT.europe, terms: ["SE", "ARN", "Sweden", "Stockholm", "\u745E\u5178", "\u65AF\u5FB7\u54E5\u5C14\u6469"] },
    { flag: "\u{1F1FA}\u{1F1F8}", label: "\u7F8E\u56FD", continent: CONTINENT.americas, terms: ["US", "USA", "LAX", "SJC", "SEA", "IAD", "JFK", "America", "United States", "Los Angeles", "\u7F8E\u56FD", "\u6D1B\u6749\u77F6", "\u5723\u4F55\u585E", "\u897F\u96C5\u56FE", "\u534E\u76DB\u987F", "\u7EBD\u7EA6"] },
    { flag: "\u{1F1E8}\u{1F1E6}", label: "\u52A0\u62FF\u5927", continent: CONTINENT.americas, terms: ["CA", "YVR", "YYZ", "Canada", "\u52A0\u62FF\u5927", "\u6E29\u54E5\u534E", "\u591A\u4F26\u591A"] },
    { flag: "\u{1F1E7}\u{1F1F7}", label: "\u5DF4\u897F", continent: CONTINENT.americas, terms: ["BR", "GRU", "Brazil", "\u5DF4\u897F", "\u5723\u4FDD\u7F57"] }
  ];
  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function latinTermPattern(term) {
    const escaped = escapeRegex(term);
    if (/^[A-Z]{2,4}$/.test(term)) {
      return `(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}]|\\d)`;
    }
    return `(?:^|[^\\p{L}\\p{N}])${escaped.replace(/ /g, "\\s*")}(?=$|[^\\p{L}\\p{N}])`;
  }
  var REGIONS = RAW_REGIONS.map((region) => {
    const latinTerms = region.terms.filter((term) => /^[\x00-\x7F]+$/.test(term));
    return {
      ...region,
      chineseTerms: region.terms.filter((term) => !/^[\x00-\x7F]+$/.test(term)),
      latinMatcher: new RegExp(latinTerms.map(latinTermPattern).join("|"), "iu")
    };
  });
  var REGION_LABELS = new Map(RAW_REGIONS.map(({ flag, label }) => [flag, label]));
  function inferRegion(name) {
    return REGIONS.find((region) => region.latinMatcher.test(name) || region.chineseTerms.some((term) => name.includes(term))) ?? null;
  }
  function removeFlags(name) {
    return String(name ?? "").replace(FLAG_PATTERN, " ").replace(/\s+/g, " ").trim();
  }
  function classifyRegion(name) {
    const value = String(name ?? "");
    const flags = value.match(FLAG_PATTERN) ?? [];
    const inferred = inferRegion(removeFlags(value));
    if (flags.length > 0) {
      const continent = continentForFlag(flags[0]);
      return {
        flag: flags[0],
        continent: continent ?? CONTINENT.other,
        warning: flags.length > 1 ? "multiple-flags" : inferred && flags[0] !== inferred.flag ? "flag-text-conflict" : null
      };
    }
    if (inferred) {
      return { flag: inferred.flag, continent: inferred.continent, warning: null };
    }
    return { flag: "\u{1F310}", continent: CONTINENT.other, warning: null };
  }

  // ../../shared/nodes/source-labels.js
  var PROVENANCE_FIELDS = [
    "_subDisplayName",
    "_subName",
    "_collectionDisplayName",
    "_collectionName"
  ];
  var SOURCE_LABELS = /* @__PURE__ */ new Map([
    ["\u673A\u573A", { kind: SOURCE_KIND.airport, label: "\u673A\u573A" }],
    ["\u81EA\u5EFA", { kind: SOURCE_KIND.selfHosted, label: "\u81EA\u5EFA" }],
    ["realm", { kind: SOURCE_KIND.realm, label: "Realm" }],
    ["\u94FE\u5F0F\u4EE3\u7406", { kind: SOURCE_KIND.serverChain, label: "\u94FE\u5F0F\u4EE3\u7406" }],
    ["\u843D\u5730", { kind: SOURCE_KIND.landing, label: "\u843D\u5730" }]
  ]);
  var SOURCE_MARKER_PATTERN = /\[(?:\s*未标记\s*|\s*机场\s*|\s*自建\s*|\s*realm\s*|\s*链式代理\s*|\s*落地\s*)\]/giu;
  function sourceFromToken(token) {
    const source = SOURCE_LABELS.get(String(token).trim().toLowerCase());
    return source ? { ...source, warning: null } : null;
  }
  function sourceFromMarkers(value) {
    if (typeof value !== "string" || value.length === 0) return null;
    for (const match of value.matchAll(/\[([^\]]+)\]/gu)) {
      const source = sourceFromToken(match[1]);
      if (source) return source;
    }
    return null;
  }
  function classifySource(node) {
    for (const field of PROVENANCE_FIELDS) {
      const value = node?.[field];
      if (typeof value !== "string" || !value.trim()) continue;
      const source2 = sourceFromMarkers(value);
      if (source2) return { ...source2, warning: null };
    }
    const source = sourceFromMarkers(node?.name);
    if (source) return { ...source, warning: null };
    return {
      kind: SOURCE_KIND.unknown,
      label: "\u672A\u77E5",
      warning: "missing-source-label"
    };
  }
  function stripSourceMarkers(name) {
    if (typeof name !== "string" || name.length === 0) return "";
    return name.replaceAll(SOURCE_MARKER_PATTERN, " ");
  }

  // ../../shared/nodes/normalize-nodes.js
  var CONTINENT_ORDER = /* @__PURE__ */ new Map([
    [CONTINENT.asiaPacific, 0],
    [CONTINENT.europe, 1],
    [CONTINENT.americas, 2],
    [CONTINENT.other, 3]
  ]);
  var CLEANED_DISPLAY_NAMES = /* @__PURE__ */ new WeakMap();
  var PROTOCOL_NAME_TOKENS = Object.freeze({
    ss: ["ss", "shadowsocks"],
    shadowsocks: ["ss", "shadowsocks"],
    ssr: ["ssr"],
    snell: ["snell"],
    vmess: ["vmess"],
    vless: ["vless"],
    trojan: ["trojan"],
    anytls: ["anytls"],
    hysteria2: ["hy2", "hysteria2", "hysteria 2"],
    hy2: ["hy2", "hysteria2", "hysteria 2"],
    tuic: ["tuic"],
    socks5: ["socks5", "socks"],
    http: ["http"],
    ssh: ["ssh"],
    wireguard: ["wireguard", "wg"]
  });
  function escapeRegex2(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function cleanDisplayName(name, type) {
    const withoutMarkers = removeFlags(name).replace(/\[\s*未标记\s*\]/giu, " ").replace(/\[\s*udp\s*\]/gi, " ").replace(/\[\s*已有链\s*\]/g, " ");
    const stripped = stripSourceMarkers(withoutMarkers);
    const protocolTokens = PROTOCOL_NAME_TOKENS[type] ?? [type];
    const protocolPattern = protocolTokens.filter((token) => typeof token === "string" && token.length > 0).map(escapeRegex2).join("|");
    const withoutNormalizedSuffix = protocolPattern ? stripped.replace(new RegExp(
      "\\s*\xB7\\s*(?:" + protocolPattern + ")(?:\\s*\uFF5C(?:\u673A\u573A|\u81EA\u5EFA|realm|\u94FE\u5F0F\u4EE3\u7406|\u843D\u5730))?(?:\xB7(?:\u94FE|U))*\\s*$",
      "giu"
    ), " ") : stripped;
    const withoutProtocol = protocolPattern ? withoutNormalizedSuffix.replace(new RegExp("(?:^|\\s)(?:[\xB7\uFF5C]\\s*)?(?:" + protocolPattern + ")(?=\\s|\uFF5C|\xB7|$)", "giu"), " ") : withoutNormalizedSuffix;
    const cleaned = withoutProtocol.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "\u672A\u547D\u540D\u8282\u70B9";
  }
  function stripUndefinedValues(value) {
    if (Array.isArray(value)) {
      value.forEach(stripUndefinedValues);
      return value;
    }
    if (!value || typeof value !== "object") return value;
    for (const key of Object.keys(value)) {
      if (value[key] === void 0) Reflect.deleteProperty(value, key);
      else stripUndefinedValues(value[key]);
    }
    return value;
  }
  function sanitizeInternalMetadata(node) {
    for (const key of Object.keys(node)) {
      if (!key.startsWith("_") || key === "_profile") continue;
      if (isSemanticUnderscoreKey(key)) {
        Object.defineProperty(node, key, {
          value: node[key],
          writable: true,
          enumerable: false,
          configurable: true
        });
      } else {
        Reflect.deleteProperty(node, key);
      }
    }
    return node;
  }
  function compareNodes(left, right) {
    const continent = (CONTINENT_ORDER.get(nodeMetadata(left).continent) ?? 99) - (CONTINENT_ORDER.get(nodeMetadata(right).continent) ?? 99);
    if (continent !== 0) return continent;
    const flag = nodeMetadata(left).flag.localeCompare(nodeMetadata(right).flag, "zh-Hans-CN");
    if (flag !== 0) return flag;
    const protocol2 = nodeMetadata(left).protocolLabel.localeCompare(nodeMetadata(right).protocolLabel, "zh-Hans-CN");
    if (protocol2 !== 0) return protocol2;
    const name = (CLEANED_DISPLAY_NAMES.get(left) ?? cleanDisplayName(left.name, left.type)).localeCompare(CLEANED_DISPLAY_NAMES.get(right) ?? cleanDisplayName(right.name, right.type), "zh-Hans-CN");
    if (name !== 0) return name;
    return nodeMetadata(left).id.localeCompare(nodeMetadata(right).id, "zh-Hans-CN");
  }
  function isP2pSource(kind) {
    return kind === SOURCE_KIND.selfHosted || kind === SOURCE_KIND.realm || kind === SOURCE_KIND.serverChain;
  }
  function isEntrySource(kind) {
    return kind === SOURCE_KIND.airport || kind === SOURCE_KIND.selfHosted || kind === SOURCE_KIND.realm;
  }
  function privilegeRank(sourceKind, existingChain) {
    const p2p = isP2pSource(sourceKind);
    const entry = isEntrySource(sourceKind) && !existingChain;
    const landing = sourceKind === SOURCE_KIND.landing && !existingChain;
    return [
      existingChain ? 0 : 1,
      Number(p2p) + Number(entry) + Number(landing),
      Number(p2p),
      Number(landing),
      Number(entry)
    ];
  }
  function compareRank(left, right) {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
    }
    return 0;
  }
  function compareDuplicateCandidates(left, right) {
    const rank = compareRank(
      privilegeRank(left.source.kind, left.existingChain),
      privilegeRank(right.source.kind, right.existingChain)
    );
    if (rank !== 0) return rank;
    const sourceKind = left.source.kind.localeCompare(right.source.kind, "en");
    if (sourceKind !== 0) return sourceKind;
    const provenance = left.provenance.localeCompare(right.provenance, "zh-Hans-CN");
    if (provenance !== 0) return provenance;
    const name = String(left.original.name).localeCompare(String(right.original.name), "zh-Hans-CN");
    if (name !== 0) return name;
    return left.fullKey < right.fullKey ? -1 : left.fullKey > right.fullKey ? 1 : 0;
  }
  function resolveNameCollisions(nodes, getIdentity = identityKey, getFingerprint = fingerprint) {
    const groups = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      const group = groups.get(node.name) ?? [];
      group.push(node);
      groups.set(node.name, group);
    }
    for (const [baseName, group] of groups) {
      if (group.length < 2) continue;
      const byProtocol = /* @__PURE__ */ new Map();
      for (const node of group) {
        const label = protocolDisplayLabel(node.type);
        const protocolGroup = byProtocol.get(label) ?? [];
        protocolGroup.push(node);
        byProtocol.set(label, protocolGroup);
      }
      const multipleProtocols = byProtocol.size > 1;
      for (const [protocolLabel, protocolGroup] of byProtocol) {
        const protocolBase = multipleProtocols && protocolLabel ? `${baseName} ${protocolLabel}` : baseName;
        if (protocolGroup.length === 1) {
          if (protocolBase !== baseName) protocolGroup[0].name = protocolBase;
          continue;
        }
        const byIdentity = protocolGroup.map((node) => ({ node, identity: getIdentity(node), suffix: getFingerprint(node).slice(-5) })).sort((left, right) => left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0);
        const suffixGroups = /* @__PURE__ */ new Map();
        for (const record2 of byIdentity) {
          const suffixGroup = suffixGroups.get(record2.suffix) ?? [];
          suffixGroup.push(record2);
          suffixGroups.set(record2.suffix, suffixGroup);
        }
        for (const records of suffixGroups.values()) {
          records.forEach((record2, index) => {
            const suffix = records.length > 1 ? `${record2.suffix}-${index + 1}` : record2.suffix;
            record2.node.name = `${protocolBase} #${suffix}`;
          });
        }
      }
    }
    return nodes;
  }
  function normalizeNodes(nodes, { clientChain = "off" } = {}) {
    const input = Array.isArray(nodes) ? nodes : [];
    const diagnostics = createDiagnostics();
    diagnostics.total = input.length;
    const candidatesByIdentity = /* @__PURE__ */ new Map();
    const normalized = [];
    for (const original of input) {
      const validation = validateNode(original);
      if (!validation.valid) {
        increment(diagnostics.excluded, validation.reason);
        continue;
      }
      const cloned = stripUndefinedValues(structuredClone(original));
      cloned.type = original.type.trim().toLowerCase();
      cloned.port = Number(original.port);
      const identity = identityKey(cloned);
      const source = classifySource(original);
      const region = classifyRegion(original.name);
      const group = candidatesByIdentity.get(identity) ?? [];
      group.push({
        original,
        cloned,
        source,
        region,
        validation,
        existingChain: hasExistingChain(original),
        provenance: [
          original._subDisplayName,
          original._subName,
          original._collectionDisplayName,
          original._collectionName
        ].filter((value) => typeof value === "string").join("\0"),
        fullKey: identityKey({ value: original })
      });
      candidatesByIdentity.set(identity, group);
    }
    for (const group of candidatesByIdentity.values()) {
      group.sort(compareDuplicateCandidates);
      const { original, cloned, source, region, validation, existingChain } = group[0];
      if (group.length > 1) increment(diagnostics.excluded, "exact-duplicate", group.length - 1);
      increment(diagnostics.protocol, diagnosticProtocol(cloned.type));
      increment(diagnostics.source, source.kind);
      increment(diagnostics.region, region.continent);
      for (const warning of [...validation.warnings, source.warning, region.warning]) {
        if (warning) increment(diagnostics.warnings, warning);
      }
      const udp = hasExplicitUdp(original);
      const id = `sr-${fingerprint(cloned)}`;
      const protocolLabel = protocolDisplayLabel(cloned.type);
      const displayName = cleanDisplayName(original.name, cloned.type);
      const sourceSuffix = source.kind === SOURCE_KIND.unknown ? "" : "\uFF5C" + source.label;
      const capabilitySuffix = [
        existingChain ? "\u94FE" : "",
        udp ? "U" : ""
      ].filter(Boolean).join("\xB7");
      cloned.name = region.flag + " " + displayName + " \xB7 " + protocolLabel + sourceSuffix + (capabilitySuffix ? "\xB7" + capabilitySuffix : "");
      CLEANED_DISPLAY_NAMES.set(cloned, displayName);
      cloned._profile = {
        id,
        originalName: String(original.name),
        protocol: cloned.type,
        protocolLabel,
        sourceKind: source.kind,
        continent: region.continent,
        flag: region.flag,
        udp,
        p2p: isP2pSource(source.kind),
        entry: isEntrySource(source.kind) && !existingChain,
        chained: false
      };
      normalized.push(cloned);
    }
    diagnostics.accepted = normalized.length;
    if (normalized.length === 0) {
      throw new Error("No valid nodes; refusing to publish an empty subscription");
    }
    resolveNameCollisions(normalized);
    normalized.sort(compareNodes);
    const outputNodes = addClientChainClones(normalized, diagnostics, clientChain === "on").map(sanitizeInternalMetadata);
    return {
      nodes: outputNodes,
      diagnostics
    };
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

  // ../../shared/nodes/node-reference.js
  var LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
  var PROTOCOL_QUALIFIER = /^[a-z][a-z0-9_-]*$/iu;
  var EXACT_TARGET = /^NODE:(.*)$/iu;
  var FUZZY_TARGET = /^NODE~(.*)$/iu;
  var LABEL_SEPARATOR = /[\p{P}\p{S}]+/gu;
  var DISPLAY_MARK = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/gu;
  function invalid(message) {
    const error = new Error(`Invalid node reference: ${message}`);
    error.code = "invalid-node-reference";
    return error;
  }
  function freeze(value) {
    return Object.freeze(value);
  }
  function parseNodeReference(target) {
    if (typeof target !== "string") throw invalid("target must be NODE:<name> or NODE~<query>");
    const exact = EXACT_TARGET.exec(target);
    const fuzzy = FUZZY_TARGET.exec(target);
    if (!exact && !fuzzy) throw invalid("target must be NODE:<name> or NODE~<query>");
    const mode = exact ? "exact" : "fuzzy";
    const body = (exact ?? fuzzy)[1];
    if (body.length === 0 || LINE_TERMINATOR.test(body)) {
      throw invalid("node name or query is empty or contains a line break");
    }
    if (mode === "exact" && body.trim() !== body) throw invalid("node name has surrounding whitespace");
    const value = mode === "fuzzy" ? body.trim() : body;
    if (value.length === 0) throw invalid("node name or query is empty");
    const separator = value.lastIndexOf("|");
    let name = value;
    let protocol2 = null;
    if (separator > 0 && separator < value.length - 1) {
      const qualifier = value.slice(separator + 1);
      if (!PROTOCOL_QUALIFIER.test(qualifier)) throw invalid("protocol qualifier is invalid");
      protocol2 = canonicalProtocol(qualifier);
      if (!protocol2) throw invalid("protocol qualifier is unsupported");
      name = value.slice(0, separator);
    }
    if (name.length === 0 || mode === "exact" && name.trim() !== name || LINE_TERMINATOR.test(name)) {
      throw invalid("node name is empty or contains a line break");
    }
    return freeze(mode === "fuzzy" ? { mode, query: name, protocol: protocol2 } : { mode, name, protocol: protocol2 });
  }
  function metadata(node) {
    return node?._profile && typeof node._profile === "object" ? node._profile : {};
  }
  function originalName(node) {
    return typeof metadata(node).originalName === "string" ? metadata(node).originalName : node?.name;
  }
  function nodeProtocol(node) {
    return canonicalProtocol(metadata(node).protocol ?? node?.type);
  }
  function selectable(node) {
    return Boolean(node) && metadata(node).chained !== true;
  }
  function normalizedLabel(value) {
    return String(value ?? "").normalize("NFKC").replace(DISPLAY_MARK, "").replace(LABEL_SEPARATOR, " ").toLocaleLowerCase().replace(/\s+/gu, " ").trim();
  }
  function fuzzyMatches(node, query) {
    const candidate = normalizedLabel(originalName(node));
    const terms = normalizedLabel(query).split(" ").filter(Boolean);
    return terms.length > 0 && terms.every((term) => candidate.includes(term));
  }
  function referenceMatches(node, reference) {
    if (reference.protocol !== null && nodeProtocol(node) !== reference.protocol) return false;
    return reference.mode === "fuzzy" ? fuzzyMatches(node, reference.query) : originalName(node) === reference.name;
  }
  function resolutionError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }
  function resolveNodeReference({ target, allNodes = [], eligibleNodes = [], client } = {}) {
    const reference = parseNodeReference(target);
    const all = (Array.isArray(allNodes) ? allNodes : []).filter(selectable);
    const eligible = (Array.isArray(eligibleNodes) ? eligibleNodes : []).filter(selectable);
    const matchingAll = all.filter((node) => referenceMatches(node, reference));
    const matchingEligible = eligible.filter((node) => referenceMatches(node, reference));
    if (client && matchingEligible.length === 0 && matchingAll.length > 0) {
      const supported = matchingAll.filter((node) => protocolSupportsClient(nodeProtocol(node), client));
      if (supported.length === 0) {
        throw resolutionError("incompatible-node", "Node reference is incompatible with this client");
      }
    }
    if (matchingEligible.length === 1) return matchingEligible[0];
    if (matchingEligible.length > 1) throw resolutionError("ambiguous-node", "Node reference is ambiguous");
    if (matchingAll.length > 0) throw resolutionError("incompatible-node", "Node reference is incompatible with this client");
    throw resolutionError("missing-node", "Node reference is missing");
  }

  // ../../shared/encoding/base64url.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var REVERSE = new Map([...ALPHABET].map((character, index) => [character, index]));

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET = /^(NODE:|NODE~)(.*)$/iu;
  var LINE_TERMINATOR2 = /[\r\n\u2028\u2029]/u;
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
  function canonicalBusinessTarget(value) {
    if (typeof value !== "string") throw new TypeError("target must be a string");
    if (TARGET_KEYWORD.test(value)) return value.toUpperCase();
    const node = NODE_TARGET.exec(value);
    if (!node || node[2].trim().length === 0 || LINE_TERMINATOR2.test(node[2])) {
      throw new TypeError("target must be FOLLOW, DIRECT, NODE:<name>, or NODE~<query>");
    }
    const prefix = node[1].toUpperCase();
    return `${prefix}${prefix === "NODE:" ? node[2] : node[2].trim()}`;
  }

  // ../../shared/policies/unified-policy.js
  var TARGETS = [
    ["ai", "\u{1F916} AI \u4E13\u7528", "FOLLOW"],
    ["github", "\u{1F419} GitHub", "FOLLOW"],
    ["youtube", "\u{1F4FA} YouTube", "FOLLOW"],
    ["overseasMedia", "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53", "FOLLOW"],
    ["globalSocial", "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", "FOLLOW"],
    ["apple", "\u{1F34E} Apple", "DIRECT"],
    ["microsoft", "\u{1FA9F} Microsoft", "DIRECT"],
    ["domesticPlatform", "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0", "DIRECT"],
    ["overseasGame", "\u{1F30D} \u6D77\u5916\u6E38\u620F", "FOLLOW"],
    ["game", "\u{1F3AE} \u6E38\u620F\u8FDE\u63A5", "DIRECT"],
    ["download", "\u2B07\uFE0F \u4E0B\u8F7D/P2P", "DIRECT"],
    ["dnsAndRules", "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D", "FOLLOW"],
    ["final", "\u6700\u7EC8\u515C\u5E95", "FOLLOW"]
  ].map(([id, label, defaultTarget]) => Object.freeze({ id, label, defaultTarget }));
  var UNIFIED_POLICY_TARGETS = Object.freeze(TARGETS);
  var UNIFIED_POLICY_TARGET_IDS = Object.freeze(TARGETS.map(({ id }) => id));
  var TARGET_BY_KEY2 = /* @__PURE__ */ new Map();
  for (const target of UNIFIED_POLICY_TARGETS) {
    TARGET_BY_KEY2.set(target.id, target);
    TARGET_BY_KEY2.set(target.label, target);
  }
  for (const [alias, id] of Object.entries({
    "AI \u4E13\u7528": "ai",
    AI: "ai",
    GitHub: "github",
    YouTube: "youtube",
    "\u6D77\u5916\u6D41\u5A92\u4F53": "overseasMedia",
    "\u6D77\u5916\u793E\u4EA4": "globalSocial",
    Apple: "apple",
    Microsoft: "microsoft",
    "\u56FD\u5185\u5E73\u53F0": "domesticPlatform",
    domestic: "domesticPlatform",
    domesticCore: "domesticPlatform",
    chinaIp: "domesticPlatform",
    "\u56FD\u5185\u6838\u5FC3": "domesticPlatform",
    "\u4E2D\u56FD IP": "domesticPlatform",
    "\u6D77\u5916\u6E38\u620F": "overseasGame",
    "\u6E38\u620F\u8FDE\u63A5": "game",
    "\u4E0B\u8F7D/P2P": "download",
    "DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D": "dnsAndRules"
  })) {
    TARGET_BY_KEY2.set(alias, TARGET_BY_KEY2.get(id));
  }
  function unifiedPolicyTargetByKey(key) {
    return typeof key === "string" ? TARGET_BY_KEY2.get(key) : void 0;
  }
  function defaultUnifiedPolicyTargets() {
    return Object.fromEntries(UNIFIED_POLICY_TARGETS.map(({ id, defaultTarget }) => [id, defaultTarget]));
  }
  function canonicalUnifiedPolicyTarget(value) {
    return canonicalBusinessTarget(value);
  }

  // ../../shared/policies/private-policy.js
  var CHANNEL_KEYS = /* @__PURE__ */ new Set(["revision", "defaults", "clients", ...PRIVATE_POLICY_CLIENTS]);
  var DEFAULT_KEYS = /* @__PURE__ */ new Set(["targets", "dns", "adblockMode", "clientChain"]);
  var OVERRIDE_KEYS = DEFAULT_KEYS;
  var DNS_KEYS = /* @__PURE__ */ new Set(["chinaDns", "globalDns"]);
  var CHAIN_KEYS = /* @__PURE__ */ new Set(["mode", "target"]);
  var TARGET_ID_SET = new Set(PRIVATE_POLICY_TARGET_IDS);
  var CHANNEL_SET = new Set(PRIVATE_POLICY_CHANNELS);
  var CLIENT_SET = new Set(PRIVATE_POLICY_CLIENTS);
  var CHINA_DNS_SET = new Set(OPTION_VALUES.chinaDns);
  var GLOBAL_DNS_SET = new Set(OPTION_VALUES.globalDns);
  var AD_BLOCK_MODES = /* @__PURE__ */ new Set(["off", "full"]);
  var LINE_TERMINATOR3 = /[\r\n\u2028\u2029]/u;
  var URI_VALUE = /(?:[a-z][a-z0-9+.-]{1,15}:\/\/|https?:\/\/)/iu;
  var SECRET_VALUE = /(?:password|passwd|secret|token|uuid|psk|private[-_ ]?key|subscription|credential)/iu;
  var MAX_REVISION_LENGTH = 160;
  var MAX_NODE_NAME_LENGTH = 256;
  function invalid2(reason) {
    return new Error(`Invalid apple-proxy-policy: ${reason}`);
  }
  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }
  function requireRecord(value, reason) {
    if (!isRecord(value)) throw invalid2(reason);
    return value;
  }
  function requireKeys(value, required3, allowed = required3) {
    const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);
    for (const key of Object.keys(value)) {
      if (!allowedSet.has(key)) throw invalid2("contains an unsupported field");
    }
    for (const key of required3) {
      if (!Object.hasOwn(value, key)) throw invalid2("is missing a required field");
    }
  }
  function rejectSecretLikeString(value) {
    if (URI_VALUE.test(value) || SECRET_VALUE.test(value)) {
      throw invalid2("contains a secret or URI");
    }
  }
  function normalizeRevision(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_REVISION_LENGTH || value.trim() !== value || LINE_TERMINATOR3.test(value)) {
      throw invalid2("revision must be a non-empty single-line string");
    }
    rejectSecretLikeString(value);
    return value;
  }
  function normalizeTarget(value) {
    if (typeof value !== "string" || LINE_TERMINATOR3.test(value)) {
      throw invalid2("target must be FOLLOW, DIRECT, or NODE:<name>");
    }
    if (/^(?:FOLLOW|DIRECT)$/iu.test(value)) return value.toUpperCase();
    if (!value.startsWith("NODE:")) throw invalid2("target must be FOLLOW, DIRECT, or NODE:<name>");
    const name = value.slice("NODE:".length);
    if (name.length === 0 || name.length > MAX_NODE_NAME_LENGTH || name.trim() !== name) {
      throw invalid2("target must be FOLLOW, DIRECT, or NODE:<name>");
    }
    rejectSecretLikeString(name);
    return `NODE:${name}`;
  }
  function normalizeUnifiedTarget(value) {
    if (typeof value !== "string" || LINE_TERMINATOR3.test(value)) {
      throw invalid2("target must be FOLLOW, DIRECT, NODE:<name>[|<protocol>], or NODE~<query>");
    }
    try {
      const canonical = canonicalUnifiedPolicyTarget(value);
      if (!/^NODE[:~]/iu.test(canonical)) return canonical;
      const reference = parseNodeReference(canonical);
      const normalizedValue = reference.mode === "fuzzy" ? reference.query : reference.name;
      return `${reference.mode === "fuzzy" ? "NODE~" : "NODE:"}${normalizedValue}${reference.protocol ? `|${reference.protocol}` : ""}`;
    } catch {
      throw invalid2("target must be FOLLOW, DIRECT, NODE:<name>[|<protocol>], or NODE~<query>");
    }
  }
  function normalizeTargetMap(value, { complete }) {
    requireRecord(value, "targets must be an object");
    if (complete) {
      for (const key of Object.keys(value)) {
        if (!TARGET_ID_SET.has(key)) throw invalid2("contains an unsupported business target");
      }
      for (const id of PRIVATE_POLICY_TARGET_IDS) {
        if (!Object.hasOwn(value, id)) throw invalid2("is missing a required business target");
      }
    } else {
      for (const key of Object.keys(value)) {
        if (!TARGET_ID_SET.has(key)) throw invalid2("contains an unsupported business target");
      }
    }
    const result = {};
    for (const id of PRIVATE_POLICY_TARGET_IDS) {
      if (Object.hasOwn(value, id)) result[id] = normalizeTarget(value[id]);
    }
    return result;
  }
  function normalizeDns(value, { complete }) {
    requireRecord(value, "dns must be an object");
    requireKeys(value, complete ? ["chinaDns", "globalDns"] : [], DNS_KEYS);
    const result = {};
    if (Object.hasOwn(value, "chinaDns")) {
      if (typeof value.chinaDns !== "string" || !CHINA_DNS_SET.has(value.chinaDns)) {
        throw invalid2("contains an invalid China DNS provider");
      }
      result.chinaDns = value.chinaDns;
    }
    if (Object.hasOwn(value, "globalDns")) {
      if (typeof value.globalDns !== "string" || !GLOBAL_DNS_SET.has(value.globalDns)) {
        throw invalid2("contains an invalid global DNS provider");
      }
      result.globalDns = value.globalDns;
    }
    return result;
  }
  function normalizeChain(value) {
    requireRecord(value, "clientChain must be an object");
    requireKeys(value, ["mode"], CHAIN_KEYS);
    if (value.mode === "off") {
      if (Object.hasOwn(value, "target")) throw invalid2("clientChain off cannot contain a target");
      return { mode: "off" };
    }
    if (value.mode !== "on" || !Object.hasOwn(value, "target")) {
      throw invalid2("clientChain on requires a target");
    }
    const target = normalizeTarget(value.target);
    if (!target.startsWith("NODE:")) throw invalid2("clientChain target must be NODE:<name>");
    return { mode: "on", target };
  }
  function normalizeDefaults(value) {
    requireRecord(value, "defaults must be an object");
    requireKeys(value, ["targets", "dns", "adblockMode", "clientChain"], DEFAULT_KEYS);
    if (typeof value.adblockMode !== "string" || !AD_BLOCK_MODES.has(value.adblockMode)) {
      throw invalid2("contains an invalid adblock mode");
    }
    return {
      targets: normalizeTargetMap(value.targets, { complete: true }),
      dns: normalizeDns(value.dns, { complete: true }),
      adblockMode: value.adblockMode,
      clientChain: normalizeChain(value.clientChain)
    };
  }
  function normalizeOverride(value) {
    requireRecord(value, "client override must be an object");
    requireKeys(value, [], OVERRIDE_KEYS);
    const result = {};
    if (Object.hasOwn(value, "targets")) result.targets = normalizeTargetMap(value.targets, { complete: false });
    if (Object.hasOwn(value, "dns")) result.dns = normalizeDns(value.dns, { complete: false });
    if (Object.hasOwn(value, "adblockMode")) {
      if (typeof value.adblockMode !== "string" || !AD_BLOCK_MODES.has(value.adblockMode)) {
        throw invalid2("contains an invalid adblock mode");
      }
      result.adblockMode = value.adblockMode;
    }
    if (Object.hasOwn(value, "clientChain")) result.clientChain = normalizeChain(value.clientChain);
    return result;
  }
  function normalizePolicyObject(value) {
    requireRecord(value, "policy must be an object");
    requireKeys(value, ["schemaVersion", "channels"], /* @__PURE__ */ new Set(["schemaVersion", "channels"]));
    if (value.schemaVersion !== 1) throw invalid2("schemaVersion must be 1");
    requireRecord(value.channels, "channels must be an object");
    requireKeys(value.channels, PRIVATE_POLICY_CHANNELS, CHANNEL_SET);
    const channels = {};
    for (const channel of PRIVATE_POLICY_CHANNELS) {
      const record2 = requireRecord(value.channels[channel], "channel must be an object");
      requireKeys(record2, ["revision", "defaults"], CHANNEL_KEYS);
      const legacyClients = isRecord(record2.clients) ? record2.clients : {};
      const overrides = {};
      for (const [key, override] of Object.entries(legacyClients)) overrides[key] = normalizeOverride(override);
      for (const key of PRIVATE_POLICY_CLIENTS) {
        if (Object.hasOwn(record2, key)) overrides[key] = normalizeOverride(record2[key]);
      }
      channels[channel] = {
        revision: normalizeRevision(record2.revision),
        defaults: normalizeDefaults(record2.defaults),
        ...overrides
      };
    }
    return deepFreeze({ schemaVersion: 1, channels });
  }
  function normalizeUnifiedPolicyObject(value) {
    requireRecord(value, "policy must be an object");
    requireKeys(value, ["schemaVersion", "targets"], /* @__PURE__ */ new Set(["schemaVersion", "targets"]));
    if (value.schemaVersion !== 2) throw invalid2("schemaVersion must be 2");
    requireRecord(value.targets, "targets must be an object");
    const targets = defaultUnifiedPolicyTargets();
    const seen = /* @__PURE__ */ new Map();
    for (const [key, rawTarget] of Object.entries(value.targets)) {
      const target = unifiedPolicyTargetByKey(key);
      if (!target) throw invalid2("contains an unsupported business target");
      const canonical = normalizeUnifiedTarget(rawTarget);
      if (seen.has(target.id) && seen.get(target.id) !== canonical) {
        throw invalid2("contains conflicting business target aliases");
      }
      seen.set(target.id, canonical);
      targets[target.id] = canonical;
    }
    for (const id of UNIFIED_POLICY_TARGET_IDS) {
      if (!Object.hasOwn(targets, id)) throw invalid2("contains an incomplete business target map");
    }
    return deepFreeze({ schemaVersion: 2, targets });
  }
  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) deepFreeze(child);
      Object.freeze(value);
    }
    return value;
  }
  function parsePrivatePolicy(text) {
    let parsed;
    try {
      parsed = parseStrictJson(text, {
        label: "apple-proxy-policy",
        maxBytes: 256 * 1024,
        maxDepth: 16
      });
    } catch (error) {
      throw error;
    }
    if (parsed?.schemaVersion === 2) return normalizeUnifiedPolicyObject(parsed);
    return normalizePolicyObject(parsed);
  }
  function resolvePrivatePolicy({ policy, channel, client } = {}) {
    const normalized = typeof policy === "string" || policy instanceof Uint8Array ? parsePrivatePolicy(policy) : policy?.schemaVersion === 2 ? normalizeUnifiedPolicyObject(policy) : normalizePolicyObject(policy);
    if (normalized.schemaVersion === 2) {
      return deepFreeze({
        targets: { ...normalized.targets },
        dns: { chinaDns: "alidns", globalDns: "cloudflare" },
        adblockMode: "off",
        clientChain: { mode: "off" }
      });
    }
    if (!CHANNEL_SET.has(channel)) throw invalid2("contains an unsupported channel");
    if (!CLIENT_SET.has(client)) throw invalid2("contains an unsupported policy client");
    const record2 = normalized.channels[channel];
    const override = record2[client] ?? {};
    const result = {
      targets: { ...record2.defaults.targets, ...override.targets ?? {} },
      dns: { ...record2.defaults.dns, ...override.dns ?? {} },
      adblockMode: override.adblockMode ?? record2.defaults.adblockMode,
      clientChain: { ...override.clientChain ?? record2.defaults.clientChain }
    };
    return deepFreeze(result);
  }

  // ../../shared/substore/policy-artifact.js
  var POLICY_ARTIFACT_NAME = "apple-proxy-policy";
  function contentOf(artifact) {
    if (typeof artifact === "string" || artifact instanceof Uint8Array) return artifact;
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return null;
    if (typeof artifact.$content === "string" || artifact.$content instanceof Uint8Array) return artifact.$content;
    if (typeof artifact.content === "string" || artifact.content instanceof Uint8Array) return artifact.content;
    if (Object.hasOwn(artifact, "schemaVersion")) return JSON.stringify(artifact);
    return null;
  }
  async function loadSubstorePolicyArtifact(context, name = POLICY_ARTIFACT_NAME) {
    if (!context || typeof context.produceArtifact !== "function") {
      throw new Error("Sub-Store policy artifact is unavailable");
    }
    const artifact = await context.produceArtifact({
      type: "file",
      name,
      platform: "JSON",
      produceType: "internal"
    });
    const content = contentOf(artifact);
    if (content === null) throw new Error("Sub-Store policy artifact has no content");
    return parsePrivatePolicy(content);
  }

  // ../../shared/policies/resolve-unified.js
  var LEGACY_TO_UNIFIED = Object.freeze({
    ai: "ai",
    github: "github",
    youtube: "youtube",
    overseasMedia: "overseasMedia",
    globalMedia: "overseasMedia",
    globalSocial: "globalSocial",
    overseasGame: "overseasGame",
    domesticCore: "domesticPlatform",
    domesticPlatform: "domesticPlatform",
    domestic: "domesticPlatform",
    chinaIp: "domesticPlatform",
    apple: "apple",
    microsoft: "microsoft",
    download: "download",
    dnsAndRules: "dnsAndRules",
    final: "final",
    game: "game"
  });
  function freeze2(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze2(child);
      Object.freeze(value);
    }
    return value;
  }
  function configuredTargets(policy, { channel, client }) {
    const defaults2 = defaultUnifiedPolicyTargets();
    if (!policy) return defaults2;
    const parsed = typeof policy === "string" || policy instanceof Uint8Array ? parsePrivatePolicy(policy) : policy;
    const resolved = resolvePrivatePolicy({ policy: parsed, channel, client });
    if (parsed.schemaVersion === 2) return { ...defaults2, ...resolved.targets };
    const result = { ...defaults2 };
    for (const [legacyId, value] of Object.entries(resolved.targets ?? {})) {
      const id = LEGACY_TO_UNIFIED[legacyId];
      if (id) result[id] = value;
    }
    return result;
  }
  function record(configured) {
    if (configured === "DIRECT") return { configured, resolved: "DIRECT", status: "direct", warningCode: null, nodeId: null };
    if (configured === "FOLLOW") return { configured, resolved: "FOLLOW", status: "follow", warningCode: null, nodeId: null };
    return { configured, resolved: configured, status: "fixed", warningCode: null, nodeId: null };
  }
  function addLegacyAliases(targets) {
    targets.globalMedia = targets.overseasMedia;
    targets.domestic = targets.domesticPlatform;
    targets.domesticCore = targets.domesticPlatform;
    targets.chinaIp = targets.domesticPlatform;
    return targets;
  }
  function defaultUnifiedPolicyResolution() {
    const values = defaultUnifiedPolicyTargets();
    return freeze2({
      targets: addLegacyAliases(Object.fromEntries(Object.entries(values).map(([id, value]) => [id, record(value)]))),
      fixedNodes: [],
      warnings: []
    });
  }
  function resolveUnifiedPolicy({
    policy = null,
    channel = "current",
    client = CLIENT.surge,
    allNodes = [],
    eligibleNodes = allNodes
  } = {}) {
    const values = configuredTargets(policy, { channel, client });
    const targets = {};
    const fixedNodes = [];
    const fixedIds = /* @__PURE__ */ new Set();
    for (const target of UNIFIED_POLICY_TARGETS) {
      const configured = values[target.id] ?? target.defaultTarget;
      const resolved = record(configured);
      if (/^NODE[:~]/iu.test(configured)) {
        const node = resolveNodeReference({ target: configured, allNodes, eligibleNodes, client });
        const nodeId = node?._profile?.id ?? `node-${fixedNodes.length}`;
        resolved.resolved = node.name;
        resolved.nodeId = nodeId;
        if (!fixedIds.has(nodeId)) {
          fixedIds.add(nodeId);
          fixedNodes.push({ nodeId, node, name: node.name });
        }
      }
      targets[target.id] = resolved;
    }
    addLegacyAliases(targets);
    return freeze2({ targets, fixedNodes, warnings: [] });
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
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad", "all"]);
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var ENUMS = Object.freeze({
    dnsMode: ["stable", "privacy", "speed"],
    chinaDns: ["alidns", "dnspod", "system"],
    globalDns: ["cloudflare", "google", "quad9"],
    blockMode: ["balanced", "security", "strict", "off"],
    quicMode: ["allow", "proxy-block", "all-block"],
    ipv6Mode: ["auto", "ipv4-only"]
  });
  var DEFAULTS = Object.freeze({ channel: "current", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto" });
  var REQUIRED = /* @__PURE__ */ new Set(["output", "type", "name", "subscriptionName", "platform"]);
  var ALLOWED = /* @__PURE__ */ new Set([...REQUIRED, "channel", "dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode"]);
  var PROTOTYPE = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function ownOptions(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Happ options must be a plain object");
    const proto = Object.getPrototypeOf(raw);
    if (proto !== Object.prototype && proto !== null) throw new TypeError("Happ options must be a plain object");
    const values = /* @__PURE__ */ new Map();
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string" || PROTOTYPE.has(key)) throw new Error("Happ options contain a forbidden key");
      if (!ALLOWED.has(key)) throw new Error(`Unknown Happ option '${key}'`);
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || !descriptor.enumerable || "get" in descriptor || "set" in descriptor) throw new Error("Happ options must contain data properties");
      values.set(key, descriptor.value);
    }
    return values;
  }
  function required(values, key) {
    if (!values.has(key)) throw new Error(`Option '${key}' is required`);
    return values.get(key);
  }
  function literal(values, key, expected) {
    const value = required(values, key);
    if (value !== expected) throw new Error(`Option '${key}' must be '${expected}'`);
    return value;
  }
  function enumValue(values, key) {
    const value = values.has(key) && values.get(key) !== void 0 ? values.get(key) : DEFAULTS[key];
    if (typeof value !== "string" || !ENUMS[key].includes(value)) throw new Error(`Option '${key}' has an unsupported value`);
    return value;
  }
  function parseHappOptions(raw) {
    const values = ownOptions(raw);
    const output = values.get("output");
    if (output !== "config" && output !== "audit") throw new Error("Option 'output' must be 'config' or 'audit'");
    literal(values, "type", "collection");
    const platform = required(values, "platform");
    if (typeof platform !== "string" || !PLATFORMS.has(platform)) throw new Error("Option 'platform' has an unsupported value");
    if (platform === "all" && output !== "audit") throw new Error("Option 'platform' 'all' is valid only for audit output");
    const options = {
      output,
      type: "collection",
      name: validateCollectionName(required(values, "name"), "Option 'name'"),
      subscriptionName: validateCollectionName(required(values, "subscriptionName"), "Option 'subscriptionName'"),
      platform,
      channel: values.has("channel") && values.get("channel") !== void 0 ? values.get("channel") : DEFAULTS.channel,
      dnsMode: enumValue(values, "dnsMode"),
      chinaDns: enumValue(values, "chinaDns"),
      globalDns: enumValue(values, "globalDns"),
      blockMode: enumValue(values, "blockMode"),
      quicMode: enumValue(values, "quicMode"),
      ipv6Mode: enumValue(values, "ipv6Mode")
    };
    if (typeof options.channel !== "string" || !CHANNELS.has(options.channel)) throw new Error("Option 'channel' has an unsupported value");
    return Object.freeze(options);
  }
  var HAPP_PLATFORMS = Object.freeze([...PLATFORMS]);

  // src/render-node.js
  var SUPPORTED = /* @__PURE__ */ new Set(["vless", "vmess", "trojan", "ss", "shadowsocks", "socks5", "hysteria2", "hy2"]);
  var VMESS_CIPHER_SECURITY = /* @__PURE__ */ new Set(["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"]);
  var TRANSPORTS = /* @__PURE__ */ new Set(["tcp", "raw", "ws", "grpc", "h2", "http2", "http", "httpupgrade", "xhttp", "kcp", "mkcp"]);
  var has = (o, k) => Object.hasOwn(o, k);
  var first = (o, keys) => keys.find((k) => has(o, k)) === void 0 ? void 0 : o[keys.find((k) => has(o, k))];
  var required2 = (v, label) => {
    if (typeof v !== "string" || !v) throw new Error(`Happ node ${label} is required`);
    return v;
  };
  var port = (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("Happ node port is invalid");
    return n;
  };
  function tlsSettings(node) {
    const reality = node["reality-opts"] ?? node.reality;
    const vmessCipher = String(node.type ?? "").toLowerCase() === "vmess" && typeof node.security === "string" && VMESS_CIPHER_SECURITY.has(node.security.toLowerCase());
    const explicitSecurity = vmessCipher ? void 0 : node.security;
    const normalizedExplicitSecurity = typeof explicitSecurity === "string" ? explicitSecurity.toLowerCase() : explicitSecurity;
    const security = reality ? "reality" : String(normalizedExplicitSecurity ?? (node.tls ? "tls" : "none")).toLowerCase();
    if (!vmessCipher && (normalizedExplicitSecurity === "none" && node.tls === true || node.tls === false && (security === "tls" || security === "reality"))) throw new Error("Happ node has contradictory TLS fields");
    if (security === "none") return void 0;
    if (security !== "tls" && security !== "reality") throw new Error("Unsupported Happ TLS security");
    const serverName = first(node, ["sni", "servername"]);
    if (security === "reality") {
      const realitySettings = reality ?? {};
      const publicKey = realitySettings["public-key"] ?? realitySettings.publicKey;
      if (!publicKey) throw new Error("Happ REALITY public key is required");
      return {
        realitySettings: {
          serverName: serverName === void 0 ? "" : required2(serverName, "SNI"),
          fingerprint: node["client-fingerprint"] ?? node.fingerprint ?? "chrome",
          publicKey,
          ...realitySettings["short-id"] || realitySettings.shortId ? { shortId: realitySettings["short-id"] ?? realitySettings.shortId } : {},
          ...realitySettings["spider-x"] || realitySettings.spiderX || realitySettings["_spider-x"] ? { spiderX: realitySettings["spider-x"] ?? realitySettings.spiderX ?? realitySettings["_spider-x"] } : {}
        }
      };
    }
    const settings = {};
    if (serverName !== void 0) settings.serverName = required2(serverName, "SNI");
    if (node["skip-cert-verify"] !== void 0) settings.allowInsecure = node["skip-cert-verify"] === true;
    else if (node["allow-insecure"] !== void 0) settings.allowInsecure = node["allow-insecure"] === true;
    if (node.alpn !== void 0) settings.alpn = Array.isArray(node.alpn) ? [...node.alpn] : [node.alpn];
    if (node["client-fingerprint"] !== void 0 || node.fingerprint !== void 0) settings.fingerprint = node["client-fingerprint"] ?? node.fingerprint;
    return settings;
  }
  function streamSettings(node) {
    const network = String(node.network ?? node._network ?? "tcp").toLowerCase();
    if (!TRANSPORTS.has(network)) throw new Error(`Unsupported Happ transport '${network}'`);
    const stream = { network: network === "raw" ? "tcp" : ["h2", "http2", "http"].includes(network) ? "http" : ["kcp", "mkcp"].includes(network) ? "kcp" : network };
    const tls = tlsSettings(node);
    if (tls) {
      if (tls.realitySettings) {
        stream.security = "reality";
        stream.realitySettings = tls.realitySettings;
        delete tls.realitySettings;
      } else {
        stream.security = "tls";
        stream.tlsSettings = tls;
      }
    }
    if (network === "ws") {
      const opts = node["ws-opts"] ?? {};
      stream.wsSettings = { path: opts.path ?? "/", ...opts.headers ? { headers: { ...opts.headers } } : {}, ...opts.maxEarlyData ? { maxEarlyData: opts.maxEarlyData } : {} };
    } else if (network === "grpc") {
      const opts = node["grpc-opts"] ?? {};
      stream.grpcSettings = { serviceName: opts["grpc-service-name"] ?? opts.serviceName ?? "", ...opts["grpc-mode"] || opts.mode ? { multiMode: (opts["grpc-mode"] ?? opts.mode) === "multi" } : {} };
    } else if (network === "h2" || network === "http2" || network === "http") {
      const opts = node["h2-opts"] ?? node["http-opts"] ?? {};
      stream.httpSettings = { path: Array.isArray(opts.path) ? opts.path[0] ?? "/" : opts.path ?? "/", ...opts.host ? { host: Array.isArray(opts.host) ? opts.host : [opts.host] } : {} };
    } else if (network === "httpupgrade") {
      const opts = node["httpupgrade-opts"] ?? {};
      stream.httpupgradeSettings = { path: opts.path ?? "/", ...opts.host ? { host: opts.host } : {} };
    } else if (network === "xhttp") {
      const opts = node["xhttp-opts"] ?? {};
      stream.xhttpSettings = { path: opts.path ?? "/", ...opts.mode ? { mode: opts.mode } : {} };
    } else if (network === "kcp" || network === "mkcp") {
      stream.kcpSettings = { ...node["kcp-opts"] ?? {} };
    }
    return Object.keys(stream).length > 1 ? stream : void 0;
  }
  function common(node) {
    return { address: required2(node.server, "server"), port: port(node.port) };
  }
  function renderVless(node) {
    const user = { id: required2(node.uuid, "UUID"), encryption: node.encryption ?? "none" };
    if (node.flow !== void 0) user.flow = node.flow;
    return { protocol: "vless", settings: { vnext: [{ ...common(node), users: [user] }] }, ...streamSettings(node) ? { streamSettings: streamSettings(node) } : {} };
  }
  function renderVmess(node) {
    const user = { id: required2(node.uuid, "UUID"), alterId: Number(node.alterId ?? node["alter-id"] ?? 0), security: node.cipher ?? node.security ?? "auto" };
    return { protocol: "vmess", settings: { vnext: [{ ...common(node), users: [user] }] }, ...streamSettings(node) ? { streamSettings: streamSettings(node) } : {} };
  }
  function renderTrojan(node) {
    const server = { ...common(node), password: required2(node.password, "password") };
    if (node.flow !== void 0) server.flow = node.flow;
    return { protocol: "trojan", settings: { servers: [server] }, ...streamSettings(node) ? { streamSettings: streamSettings(node) } : {} };
  }
  function renderShadowsocks(node) {
    const server = { ...common(node), method: required2(node.cipher ?? node.method, "method"), password: required2(node.password, "password") };
    return { protocol: "shadowsocks", settings: { servers: [server] }, ...streamSettings(node) ? { streamSettings: streamSettings(node) } : {} };
  }
  function renderSocks(node) {
    const server = { ...common(node) };
    if (node.username !== void 0 || node.password !== void 0) server.users = [{ user: node.username ?? "", pass: node.password ?? "" }];
    return { protocol: "socks", settings: { servers: [server] } };
  }
  function renderHysteria2(node) {
    const tls = tlsSettings(node);
    if (!tls || !tls.serverName && !tls.realitySettings) throw new Error("Happ Hysteria2 requires TLS");
    const server = { ...common(node), ...node.password !== void 0 ? { auth: node.password } : {} };
    const stream = { network: "hysteria", method: "hysteria", ...tls.realitySettings ? { security: "reality", realitySettings: tls.realitySettings } : { security: "tls", tlsSettings: tls }, ...node.obfs ? { hysteriaSettings: { obfs: node.obfs, ...node["obfs-password"] ? { obfsPassword: node["obfs-password"] } : {} } } : {} };
    return { protocol: "hysteria", settings: { version: 2, ...server }, streamSettings: stream };
  }
  function renderHappOutbound(node, tag) {
    if (!node || typeof node !== "object") throw new TypeError("Happ node must be an object");
    const type = String(node.type ?? "").toLowerCase();
    if (!SUPPORTED.has(type)) throw new Error(`Unsupported Happ protocol '${type}'`);
    if (typeof tag !== "string" || !/^happ-[a-z0-9/_-]+$/u.test(tag)) throw new Error("Happ outbound tag must be opaque");
    const output = type === "vless" ? renderVless(node) : type === "vmess" ? renderVmess(node) : type === "trojan" ? renderTrojan(node) : type === "ss" || type === "shadowsocks" ? renderShadowsocks(node) : type === "socks5" ? renderSocks(node) : renderHysteria2(node);
    return Object.freeze({ tag, ...output });
  }

  // src/render-platform.js
  var PLATFORM_METADATA = Object.freeze({
    macos: { tun: false, proxy: "desktop" },
    iphone: { tun: true, proxy: "network-extension" },
    ipad: { tun: true, proxy: "network-extension" }
  });
  var PORTS = Object.freeze({ socks: 10808, http: 10809 });
  function renderHappInbounds(platform) {
    if (!PLATFORM_METADATA[platform]) throw new Error(`Unsupported Happ platform '${platform}'`);
    const common2 = { listen: "127.0.0.1", sniffing: { enabled: true, destOverride: ["http", "tls"], routeOnly: true } };
    return [
      { tag: "happ-in-socks", port: PORTS.socks, protocol: "socks", settings: { auth: "noauth", udp: true }, ...common2 },
      { tag: "happ-in-http", port: PORTS.http, protocol: "http", settings: {}, ...common2 }
    ].map((entry) => Object.freeze(entry));
  }

  // ../../shared/dns/providers.js
  var CHINA_DNS_PROVIDERS = Object.freeze({
    alidns: Object.freeze({
      address: "223.5.5.5",
      doh: "https://dns.alidns.com/dns-query"
    }),
    dnspod: Object.freeze({
      address: "119.29.29.29",
      doh: "https://doh.pub/dns-query"
    }),
    system: Object.freeze({
      address: "local",
      doh: "system"
    })
  });
  var GLOBAL_DNS_PROVIDERS = Object.freeze({
    cloudflare: Object.freeze({
      address: "1.1.1.1",
      serverName: "cloudflare-dns.com",
      doh: "https://cloudflare-dns.com/dns-query"
    }),
    google: Object.freeze({
      address: "8.8.8.8",
      serverName: "dns.google",
      doh: "https://dns.google/dns-query"
    }),
    quad9: Object.freeze({
      address: "9.9.9.9",
      serverName: "dns.quad9.net",
      doh: "https://dns.quad9.net/dns-query"
    })
  });
  function provider(providers, id, label) {
    const value = providers[id];
    if (!value) throw new Error(`Unsupported ${label} DNS provider`);
    return value;
  }
  function chinaDnsProvider(id) {
    return provider(CHINA_DNS_PROVIDERS, id, "China");
  }
  function globalDnsProvider(id) {
    return provider(GLOBAL_DNS_PROVIDERS, id, "global");
  }

  // ../../shared/rules/semantic-intents.js
  var intent = ({ id, ruleId, label, sourceIds, policy, defaultTarget, phase, dnsClass }) => Object.freeze({
    id,
    ruleId,
    label,
    sourceIds: Object.freeze([...sourceIds]),
    policy,
    defaultTarget,
    phase,
    dnsClass
  });
  var SEMANTIC_INTENTS = Object.freeze([
    intent({ id: "security", ruleId: "Security", label: "\u5B89\u5168\u62E6\u622A", sourceIds: ["Hijacking", "BlockHttpDNS"], policy: "REJECT", defaultTarget: "REJECT", phase: "security", dnsClass: "none" }),
    intent({ id: "privacy", ruleId: "Privacy", label: "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A", sourceIds: ["Privacy"], policy: "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A", defaultTarget: "DIRECT", phase: "security", dnsClass: "none" }),
    intent({ id: "domesticCore", ruleId: "DomesticCore", label: "\u56FD\u5185\u6838\u5FC3", sourceIds: ["DomesticCore", "DomesticGame", "SteamCN"], policy: "DIRECT", defaultTarget: "DIRECT", phase: "earlyDomestic", dnsClass: "china" }),
    intent({ id: "domesticPlatform", ruleId: "DomesticPlatform", label: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0", sourceIds: ["BiliBili", "ByteDance", "XiaoHongShu", "Weibo"], policy: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
    intent({ id: "ai", ruleId: "AI", label: "\u{1F916} AI \u4E13\u7528", sourceIds: ["OpenAI", "Claude", "Gemini", "Copilot"], policy: "\u{1F916} AI \u4E13\u7528", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
    intent({ id: "github", ruleId: "GitHub", label: "\u{1F419} GitHub", sourceIds: ["GitHub"], policy: "\u{1F419} GitHub", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
    intent({ id: "youtube", ruleId: "YouTube", label: "\u{1F4FA} YouTube", sourceIds: ["YouTube"], policy: "\u{1F4FA} YouTube", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
    intent({ id: "overseasMedia", ruleId: "OverseasMedia", label: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53", sourceIds: ["Netflix", "Disney", "Spotify", "GlobalMedia"], policy: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
    intent({ id: "globalSocial", ruleId: "OverseasSocial", label: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", sourceIds: ["Telegram", "Facebook", "Instagram", "Twitter", "TikTok"], policy: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
    intent({ id: "apple", ruleId: "Apple", label: "\u{1F34E} Apple", sourceIds: ["Apple"], policy: "\u{1F34E} Apple", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
    intent({ id: "microsoft", ruleId: "Microsoft", label: "\u{1FA9F} Microsoft", sourceIds: ["Microsoft"], policy: "\u{1FA9F} Microsoft", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
    intent({ id: "download", ruleId: "Download", label: "\u2B07\uFE0F \u4E0B\u8F7D/P2P", sourceIds: ["Download", "PrivateTracker"], policy: "\u2B07\uFE0F \u4E0B\u8F7D/P2P", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
    intent({ id: "overseasGame", ruleId: "OverseasGame", label: "\u{1F30D} \u6D77\u5916\u6E38\u620F", sourceIds: ["OverseasGame"], policy: "\u{1F30D} \u6D77\u5916\u6E38\u620F", defaultTarget: "FOLLOW", phase: "overseasGame", dnsClass: "proxy" }),
    intent({ id: "chinaIp", ruleId: "ChinaIP", label: "\u4E2D\u56FD IP", sourceIds: ["ChinaIP"], policy: "DIRECT", defaultTarget: "DIRECT", phase: "resolvedChinaIp", dnsClass: "none" })
  ]);
  var SOURCE_TO_INTENT = new Map(
    SEMANTIC_INTENTS.flatMap((entry) => entry.sourceIds.map((sourceId) => [sourceId, entry]))
  );

  // ../../shared/rules/lightweight-policy.js
  var DEFAULT_RULE_SOURCE_IDS = Object.freeze([
    "Hijacking",
    "BlockHttpDNS",
    "Privacy",
    "DomesticCore",
    "DomesticGame",
    "SteamCN",
    "BiliBili",
    "ByteDance",
    "XiaoHongShu",
    "Weibo",
    "OpenAI",
    "Claude",
    "Gemini",
    "Copilot",
    "GitHub",
    "YouTube",
    "Netflix",
    "Disney",
    "Spotify",
    "GlobalMedia",
    "Telegram",
    "Facebook",
    "Instagram",
    "Twitter",
    "TikTok",
    "Apple",
    "Microsoft",
    "Download",
    "PrivateTracker",
    "OverseasGame",
    "ChinaTLD",
    "ChinaIP"
  ]);
  var MOBILE_RULE_BUNDLES = Object.freeze(SEMANTIC_INTENTS.map((entry) => Object.freeze({
    id: entry.ruleId,
    sourceIds: entry.sourceIds,
    policy: entry.policy,
    phase: entry.phase,
    dnsClass: entry.dnsClass
  })));
  var MOBILE_RULE_SOURCE_IDS = Object.freeze(MOBILE_RULE_BUNDLES.map(({ id }) => id));
  var MOBILE_RULE_PLATFORMS = Object.freeze([
    "iphone",
    "ipad",
    "android"
  ]);
  var FULL_ADBLOCK_SOURCE_IDS = Object.freeze([
    "Advertising",
    "Advertising_Domain"
  ]);
  var ROUTING_PHASES = Object.freeze([
    "security",
    "earlyDomestic",
    "serviceIntent",
    "overseasGame",
    "lateDomestic",
    "resolvedChinaIp"
  ]);
  var PHASE_SOURCE_IDS = Object.freeze({
    security: Object.freeze([
      "Hijacking",
      "BlockHttpDNS",
      "Privacy",
      "Advertising",
      "Advertising_Domain"
    ]),
    earlyDomestic: Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]),
    serviceIntent: Object.freeze([
      "BiliBili",
      "ByteDance",
      "XiaoHongShu",
      "Weibo",
      "OpenAI",
      "Claude",
      "Gemini",
      "Copilot",
      "GitHub",
      "YouTube",
      "Netflix",
      "Disney",
      "Spotify",
      "GlobalMedia",
      "Telegram",
      "Facebook",
      "Instagram",
      "Twitter",
      "TikTok",
      "Apple",
      "Microsoft",
      "Download",
      "PrivateTracker"
    ]),
    overseasGame: Object.freeze(["OverseasGame"]),
    lateDomestic: Object.freeze(["ChinaTLD"]),
    resolvedChinaIp: Object.freeze(["ChinaIP"])
  });
  var RULE_BUDGETS = Object.freeze({
    domesticCoreEntries: 13e4,
    defaultEntries: 4e5,
    defaultBytes: 3e7,
    startupInlineEntries: 64,
    singBoxRuleRssBytes: 50 * 1024 * 1024,
    singBoxTotalRssBytes: 200 * 1024 * 1024,
    // Binary SRS budgets are enforced independently from text/client bundle
    // budgets. This prevents a large external source from being inlined into a
    // sing-box runtime while still allowing compact binary rule sets.
    singBoxRuleSetBytes: 50 * 1024 * 1024,
    singBoxTotalRuleSetBytes: 200 * 1024 * 1024
  });
  var ROUTING_PRECEDENCE = Object.freeze([
    "local",
    "security",
    "custom",
    "domesticCore",
    "domesticPlatform",
    "domesticGame",
    "explicitOverseas",
    "overseasGame",
    "chinaIp",
    "defaultProxy"
  ]);
  var EXPLICIT_OVERSEAS_RULE_SOURCE_IDS = Object.freeze([
    "OpenAI",
    "Claude",
    "Gemini",
    "Copilot",
    "GitHub",
    "YouTube",
    "Netflix",
    "Disney",
    "Spotify",
    "GlobalMedia",
    "Telegram",
    "Facebook",
    "Instagram",
    "Twitter",
    "TikTok",
    "OverseasGame"
  ]);
  var DNS_CLASS_SOURCE_IDS = Object.freeze({
    proxy: EXPLICIT_OVERSEAS_RULE_SOURCE_IDS,
    china: Object.freeze([
      "DomesticCore",
      "DomesticGame",
      "SteamCN",
      "ChinaTLD",
      "BiliBili",
      "ByteDance",
      "XiaoHongShu",
      "Weibo",
      "Apple",
      "Microsoft",
      "Download",
      "PrivateTracker"
    ]),
    none: Object.freeze([
      "Hijacking",
      "BlockHttpDNS",
      "Privacy",
      "Advertising",
      "Advertising_Domain",
      "ChinaIP"
    ])
  });
  var POLICY_TARGETS = Object.freeze({
    direct: "DIRECT",
    defaultProxy: "\u{1F680} \u8282\u70B9\u9009\u62E9",
    overseasGame: "\u{1F30D} \u6D77\u5916\u6E38\u620F",
    overseasMedia: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    overseasSocial: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    domesticPlatform: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    reject: "REJECT"
  });
  var SOURCE_POLICIES = Object.freeze({
    Hijacking: POLICY_TARGETS.reject,
    BlockHttpDNS: POLICY_TARGETS.reject,
    Privacy: "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A",
    DomesticCore: POLICY_TARGETS.direct,
    DomesticGame: POLICY_TARGETS.direct,
    BiliBili: POLICY_TARGETS.domesticPlatform,
    ByteDance: POLICY_TARGETS.domesticPlatform,
    XiaoHongShu: POLICY_TARGETS.domesticPlatform,
    Weibo: POLICY_TARGETS.domesticPlatform,
    OpenAI: "\u{1F916} AI \u4E13\u7528",
    Claude: "\u{1F916} AI \u4E13\u7528",
    Gemini: "\u{1F916} AI \u4E13\u7528",
    Copilot: "\u{1F916} AI \u4E13\u7528",
    GitHub: "\u{1F419} GitHub",
    YouTube: "\u{1F4FA} YouTube",
    Netflix: POLICY_TARGETS.overseasMedia,
    Disney: POLICY_TARGETS.overseasMedia,
    Spotify: POLICY_TARGETS.overseasMedia,
    GlobalMedia: POLICY_TARGETS.overseasMedia,
    Telegram: POLICY_TARGETS.overseasSocial,
    Facebook: POLICY_TARGETS.overseasSocial,
    Instagram: POLICY_TARGETS.overseasSocial,
    Twitter: POLICY_TARGETS.overseasSocial,
    TikTok: POLICY_TARGETS.overseasSocial,
    Apple: "\u{1F34E} Apple",
    Microsoft: "\u{1FA9F} Microsoft",
    SteamCN: POLICY_TARGETS.direct,
    OverseasGame: POLICY_TARGETS.overseasGame,
    Download: "\u2B07\uFE0F \u4E0B\u8F7D/P2P",
    PrivateTracker: "\u2B07\uFE0F \u4E0B\u8F7D/P2P",
    ChinaTLD: POLICY_TARGETS.direct,
    ChinaIP: POLICY_TARGETS.direct,
    Advertising: "\u{1F9F1} \u5E38\u89C1\u5E7F\u544A",
    Advertising_Domain: "\u{1F9F1} \u5E38\u89C1\u5E7F\u544A"
  });
  function policyForRuleSource(sourceId) {
    return SOURCE_POLICIES[sourceId];
  }
  function uniqueMembership(id, memberships, label) {
    const matches = Object.entries(memberships).filter(([, ids]) => ids.includes(id)).map(([name]) => name);
    if (matches.length !== 1) {
      throw new Error(`Lightweight rule source ${id} must have exactly one ${label} membership`);
    }
    return matches[0];
  }
  function clientRecord(id) {
    const policy = SOURCE_POLICIES[id];
    if (!policy) throw new Error(`Missing policy for lightweight rule source: ${id}`);
    const phase = uniqueMembership(id, PHASE_SOURCE_IDS, "routing phase");
    const dnsClass = uniqueMembership(id, DNS_CLASS_SOURCE_IDS, "DNS class");
    return Object.freeze({
      id,
      policy,
      // The publication pipeline emits normalized, typed Surge/Shadowrocket
      // lines for every compiled source, including domain-only inputs.
      inputFormat: "RULE-SET",
      phase,
      dnsClass
    });
  }
  var DEFAULT_RULE_CLIENT_CATALOG = Object.freeze(DEFAULT_RULE_SOURCE_IDS.map(clientRecord));
  var FULL_ADBLOCK_RULE_CLIENT_CATALOG = Object.freeze(FULL_ADBLOCK_SOURCE_IDS.map(clientRecord));
  var MOBILE_RULE_CLIENT_CATALOG = Object.freeze(MOBILE_RULE_BUNDLES.map((bundle) => Object.freeze({
    id: bundle.id,
    policy: bundle.policy,
    inputFormat: "RULE-SET",
    phase: bundle.phase,
    dnsClass: bundle.dnsClass
  })));
  function ruleClientCatalog({ adblockMode = "off" } = {}) {
    if (adblockMode !== "off" && adblockMode !== "full") {
      throw new TypeError("adblockMode must be either off or full");
    }
    return adblockMode === "full" ? Object.freeze([...DEFAULT_RULE_CLIENT_CATALOG, ...FULL_ADBLOCK_RULE_CLIENT_CATALOG]) : DEFAULT_RULE_CLIENT_CATALOG;
  }
  function orderedRoutingPlan({ adblockMode = "off" } = {}) {
    const selected = ruleClientCatalog({ adblockMode });
    const phaseRank = new Map(ROUTING_PHASES.map((phase, index) => [phase, index]));
    const sourceRank = new Map(
      [...DEFAULT_RULE_SOURCE_IDS, ...FULL_ADBLOCK_SOURCE_IDS].map((id, index) => [id, index])
    );
    return Object.freeze([...selected].sort((left, right) => phaseRank.get(left.phase) - phaseRank.get(right.phase) || sourceRank.get(left.id) - sourceRank.get(right.id)));
  }

  // ../../shared/happ-geodata-contract.js
  var HAPP_GEOSITE_ALIASES = Object.freeze({
    Hijacking: "CATEGORY-ADS-ALL",
    BlockHttpDNS: "CATEGORY-HTTPDNS-CN",
    Privacy: "PRIVATE",
    DomesticCore: "CN",
    DomesticGame: "CATEGORY-GAMES-CN",
    SteamCN: "STEAM",
    BiliBili: "BILIBILI",
    ByteDance: "BYTEDANCE",
    XiaoHongShu: "XIAOHONGSHU",
    Weibo: "CATEGORY-SOCIAL-MEDIA-CN",
    OpenAI: "OPENAI",
    Claude: "CATEGORY-AI-!CN",
    Gemini: "GOOGLE-GEMINI",
    Copilot: "GITHUB-COPILOT",
    GitHub: "GITHUB",
    YouTube: "YOUTUBE",
    Netflix: "NETFLIX",
    Disney: "DISNEY",
    Spotify: "SPOTIFY",
    GlobalMedia: "CATEGORY-MEDIA",
    Telegram: "TELEGRAM",
    Facebook: "FACEBOOK",
    Instagram: "INSTAGRAM",
    Twitter: "TWITTER",
    TikTok: "TIKTOK",
    Apple: "APPLE",
    Microsoft: "MICROSOFT",
    Download: "CATEGORY-NETDISK-!CN",
    PrivateTracker: "CATEGORY-PT",
    OverseasGame: "CATEGORY-GAMES-!CN",
    ChinaTLD: "CN"
  });
  var HAPP_GEOIP_ALIASES = Object.freeze({ ChinaIP: "CN" });
  var HAPP_PROFILE_DIRECT_SITES = Object.freeze([
    "geosite:PRIVATE",
    "geosite:CN",
    "geosite:CATEGORY-GAMES-CN",
    "geosite:STEAM",
    "geosite:BILIBILI",
    "geosite:BYTEDANCE",
    "geosite:XIAOHONGSHU",
    "geosite:CATEGORY-SOCIAL-MEDIA-CN",
    "geosite:APPLE",
    "geosite:MICROSOFT",
    "geosite:CATEGORY-NETDISK-!CN",
    "geosite:CATEGORY-PT"
  ]);
  var HAPP_PROFILE_PROXY_SITES = Object.freeze([
    "geosite:OPENAI",
    "geosite:CATEGORY-AI-!CN",
    "geosite:GOOGLE-GEMINI",
    "geosite:GITHUB-COPILOT",
    "geosite:GITHUB",
    "geosite:YOUTUBE",
    "geosite:NETFLIX",
    "geosite:DISNEY",
    "geosite:SPOTIFY",
    "geosite:CATEGORY-MEDIA",
    "geosite:TELEGRAM",
    "geosite:FACEBOOK",
    "geosite:INSTAGRAM",
    "geosite:TWITTER",
    "geosite:TIKTOK",
    "geosite:CATEGORY-GAMES-!CN"
  ]);
  var HAPP_PROFILE_BLOCK_SITES = Object.freeze(["geosite:CATEGORY-ADS-ALL", "geosite:CATEGORY-HTTPDNS-CN"]);
  var HAPP_PROFILE_DIRECT_IP = Object.freeze([
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "169.254.0.0/16",
    "224.0.0.0/4",
    "255.255.255.255",
    "geoip:PRIVATE",
    "geoip:CN"
  ]);
  var HAPP_PRIVATE_IPV4 = Object.freeze([
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.0.0.0/24",
    "192.0.2.0/24",
    "192.168.0.0/16",
    "198.18.0.0/15",
    "198.51.100.0/24",
    "203.0.113.0/24",
    "224.0.0.0/4",
    "240.0.0.0/4",
    "255.255.255.255/32"
  ]);
  var HAPP_PRIVATE_IPV6 = Object.freeze(["::1/128", "::ffff:0:0/96", "fc00::/7", "fe80::/10", "ff00::/8"]);
  var HAPP_PRIVATE_DOMAINS = Object.freeze(["localhost", "localhost.localdomain", "local", "localdomain", "lan"]);

  // src/render-dns.js
  var PROXY_GEOSITE_DOMAINS = Object.freeze(
    EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((id) => `geosite:${HAPP_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`)
  );
  var defaults = { dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto" };
  function renderHappDns(options = {}) {
    const value = { ...defaults, ...options };
    if (!["stable", "privacy", "speed"].includes(value.dnsMode)) throw new Error("Unsupported Happ dnsMode");
    if (!["alidns", "dnspod", "system"].includes(value.chinaDns)) throw new Error("Unsupported Happ chinaDns");
    if (!["cloudflare", "google", "quad9"].includes(value.globalDns)) throw new Error("Unsupported Happ globalDns");
    if (!["auto", "ipv4-only"].includes(value.ipv6Mode)) throw new Error("Unsupported Happ ipv6Mode");
    const domestic = chinaDnsProvider(value.chinaDns);
    const global = globalDnsProvider(value.globalDns);
    const domesticDomains = ["geosite:CN", "geosite:PRIVATE"];
    const domesticExpectIPs = ["geoip:CN"];
    const proxyDomains = PROXY_GEOSITE_DOMAINS;
    return Object.freeze({
      tag: "happ-dns",
      servers: [
        { address: domestic.doh, domains: domesticDomains, expectIPs: domesticExpectIPs },
        { address: global.doh, domains: proxyDomains, skipFallback: true, ...global.address ? { clientIp: global.address } : {} }
      ],
      queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP"
    });
  }
  function renderHappDnsRoutes(options = {}) {
    const followTag = options.followTag ?? "happ-follow/current";
    const globalOutboundTag = options.globalOutboundTag ?? followTag;
    const domesticDomains = ["geosite:CN", "geosite:PRIVATE"];
    const proxyDomains = PROXY_GEOSITE_DOMAINS;
    return [
      { type: "field", domain: domesticDomains, outboundTag: "happ-direct", server: "happ-dns" },
      { type: "field", domain: proxyDomains, outboundTag: globalOutboundTag, server: "happ-dns" }
    ];
  }

  // src/render-routing.js
  function hash(value) {
    let h = 2166136261;
    for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(36);
  }
  function businessTargetForSource(sourceId) {
    if (sourceId === "__final__") return "final";
    if (["DomesticCore", "DomesticGame", "SteamCN", "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "ChinaTLD", "ChinaIP"].includes(sourceId)) return "domesticPlatform";
    return unifiedPolicyTargetByKey(policyForRuleSource(sourceId))?.id ?? "final";
  }
  function targetFor(id, resolution, followTag, fixedById) {
    const targetId = businessTargetForSource(id);
    const record2 = resolution?.targets?.[targetId];
    if (!record2 || record2.resolved === "FOLLOW") return { outboundTag: followTag };
    if (record2.resolved === "DIRECT") return { outboundTag: "happ-direct" };
    const fixed = fixedById.get(record2.nodeId);
    return fixed ? { balancerTag: fixed.balancerTag } : { outboundTag: followTag };
  }
  function renderHappRouting(context = {}) {
    const followTag = context.followTag ?? "happ-follow/current";
    const resolution = context.policyResolution ?? { targets: {} };
    const options = context.options ?? {};
    const fixedRecords = Array.isArray(context.fixedNodes) ? context.fixedNodes : resolution.fixedNodes ?? [];
    const nodes = Array.isArray(context.nodes) ? context.nodes : [];
    const fixedById = /* @__PURE__ */ new Map();
    const outbounds = [];
    const balancers = [];
    const observatorySelectors = [followTag];
    for (const fixed of fixedRecords) {
      if (fixed.nodeId && fixed.nodeId === context.followNodeId) continue;
      const node = fixed.node ?? nodes.find((candidate) => (candidate._profile?.id ?? "") === fixed.nodeId);
      if (!node) continue;
      const suffix = hash(fixed.nodeId);
      const candidateTag = `happ-fixed/${suffix}/candidate`;
      const balancerTag = `happ-fixed/${suffix}/balancer`;
      fixedById.set(fixed.nodeId, { candidateTag, balancerTag });
      outbounds.push((context.renderNode ?? renderHappOutbound)(node, candidateTag));
      balancers.push({ tag: balancerTag, selector: [candidateTag], strategy: { type: "leastPing" }, fallbackTag: followTag });
      observatorySelectors.push(candidateTag);
    }
    const rules = [
      { type: "field", ip: ["geoip:PRIVATE"], outboundTag: "happ-direct" },
      { type: "field", domain: ["geosite:PRIVATE"], outboundTag: "happ-direct" }
    ];
    let quicRuleInserted = false;
    for (const item of orderedRoutingPlan({ adblockMode: "off" })) {
      if (!quicRuleInserted && item.phase !== "security" && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) {
        rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
        quicRuleInserted = true;
      }
      const isIp = item.id === "ChinaIP";
      const source = isIp ? "geoip:CN" : "geosite:" + (HAPP_GEOSITE_ALIASES[item.id] ?? item.id.toUpperCase());
      const target = item.policy === "REJECT" ? { outboundTag: options.blockMode === "off" ? "happ-direct" : "happ-block" } : targetFor(item.id, resolution, followTag, fixedById);
      rules.push({ type: "field", ...isIp ? { ip: [source] } : { domain: [source] }, ...target });
    }
    if (!quicRuleInserted && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
    const dnsTarget = resolution?.targets?.dnsAndRules;
    const dnsFixed = dnsTarget?.nodeId ? fixedById.get(dnsTarget.nodeId) : null;
    const globalDnsOutbound = dnsTarget?.resolved === "DIRECT" ? "happ-direct" : dnsFixed?.candidateTag ?? followTag;
    rules.push(...renderHappDnsRoutes({ followTag, globalOutboundTag: globalDnsOutbound, platform: options.platform }));
    const finalTarget = targetFor("__final__", resolution, followTag, fixedById);
    rules.push({ type: "field", network: "tcp,udp", ...finalTarget });
    const routing = { domainStrategy: "IPIfNonMatch", rules };
    const policyTargets = {};
    for (const [targetId, record2] of Object.entries(resolution.targets ?? {})) {
      if (record2.resolved === "DIRECT") policyTargets[targetId] = "happ-direct";
      else if (record2.resolved === "FOLLOW") policyTargets[targetId] = followTag;
      else if (fixedById.has(record2.nodeId)) policyTargets[targetId] = fixedById.get(record2.nodeId).balancerTag;
      else policyTargets[targetId] = followTag;
    }
    return { routing, observatory: { subjectSelector: observatorySelectors, probeUrl: "https://www.gstatic.com/generate_204", probeInterval: "30s", enableConcurrency: true, timeout: 5e3 }, policyTargets, fixedOutbounds: outbounds, balancers };
  }

  // src/render-subscription.js
  function idFor(node) {
    return node?._profile?.id ?? `h-${Math.abs([...JSON.stringify(node)].reduce((h, c) => h * 31 ^ c.charCodeAt(0) | 0, 17))}`;
  }
  function summary(resolution) {
    const entries = Object.values(resolution?.targets ?? {}).map((target) => `${target.configured}\u2192${target.resolved}`).join("\uFF1B");
    const warnings = (resolution?.warnings ?? []).map((warning) => `\u8B66\u544A:${warning.warningCode}`).join("\uFF0C");
    return `Happ \u5206\u6D41\uFF1A${entries}${warnings ? `\uFF1B${warnings}` : ""}`;
  }
  function renderHappSubscription({ nodes = [], allNodes = nodes, options, policyResolution } = {}) {
    if (!options || typeof options !== "object") throw new TypeError("Happ options are required");
    const eligible = Array.isArray(nodes) ? nodes : [];
    if (eligible.length === 0) throw new Error("\u6CA1\u6709\u53EF\u7528\u7684 Happ \u517C\u5BB9\u8282\u70B9\uFF0C\u62D2\u7EDD\u751F\u6210\u7A7A\u8BA2\u9605");
    const resolution = policyResolution ?? defaultUnifiedPolicyResolution();
    const configs = [];
    for (const followNode of eligible) {
      const followId = idFor(followNode);
      const followTag = `happ-follow/${followId}`;
      const route = renderHappRouting({
        nodes: eligible,
        policyResolution: resolution,
        fixedNodes: resolution.fixedNodes,
        followTag,
        followNodeId: followId,
        options,
        renderNode: renderHappOutbound
      });
      const followOutbound = renderHappOutbound(followNode, followTag);
      const outbounds = [followOutbound, ...route.fixedOutbounds, { tag: "happ-direct", protocol: "freedom", settings: {} }, { tag: "happ-block", protocol: "blackhole", settings: {} }];
      configs.push({
        remarks: followNode.name,
        log: { loglevel: "warning" },
        inbounds: renderHappInbounds(options.platform),
        outbounds,
        observatory: route.observatory,
        dns: renderHappDns(options),
        routing: { ...route.routing, balancers: route.balancers },
        meta: { serverDescription: summary(resolution), platform: options.platform, schemaVersion: 2 }
      });
    }
    return configs;
  }

  // src/routing-profile-data.js
  var PROFILE_NAME = "Apple Proxy Profiles HAPP v2";
  var REMOTE_DNS = Object.freeze({ type: "DoH", domain: "https://cloudflare-dns.com/dns-query", ip: "1.1.1.1" });
  var DOMESTIC_DNS = Object.freeze({ type: "DoH", domain: "https://dns.alidns.com/dns-query", ip: "223.5.5.5" });
  function immutableBaseUrl(value) {
    if (typeof value !== "string" || !/^https:\/\/[^\s?#]+(?:\/[^\s?#]+)*$/u.test(value)) {
      throw new TypeError("Happ immutable base URL must be an HTTPS URL without query or fragment");
    }
    return value.replace(/\/+$/u, "");
  }
  function unixTimestamp(value) {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError("Happ generatedAt must be an ISO timestamp");
    return String(Math.floor(Date.parse(value) / 1e3));
  }
  function renderHappRoutingProfile({ baseUrl, generatedAt }) {
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
      UseChunkFiles: "true"
    });
  }
  function renderHappRoutingDeepLink(profile) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError("Happ routing profile must be an object");
    return "happ://routing/onadd/" + Buffer.from(JSON.stringify(profile), "utf8").toString("base64");
  }

  // src/substore-config-entry.js
  var PUBLIC_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
  var HAPP_PUBLIC_CHANNEL = "current";
  function requestOptionsFrom(input, context) {
    const candidates = [context?.requestOptions, input?.$options];
    return candidates.find((value) => value && typeof value === "object" && !Array.isArray(value));
  }
  function setResponseHeader(requestOptions, name, value) {
    if (!requestOptions) return false;
    if (!requestOptions._res || typeof requestOptions._res !== "object" || Array.isArray(requestOptions._res)) requestOptions._res = {};
    const response = requestOptions._res;
    if (!response.headers || typeof response.headers !== "object" || Array.isArray(response.headers)) response.headers = {};
    if (typeof response.headers.set === "function") response.headers.set(name, value);
    else response.headers[name] = value;
    return true;
  }
  function attachRoutingProfile(input, context, options) {
    const requestOptions = requestOptionsFrom(input, context);
    if (!requestOptions) return;
    const profile = renderHappRoutingProfile({
      baseUrl: `${PUBLIC_ROOT}/${HAPP_PUBLIC_CHANNEL}`,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    setResponseHeader(requestOptions, "routing", renderHappRoutingDeepLink(profile));
    setResponseHeader(requestOptions, "content-type", "application/json; charset=utf-8");
    setResponseHeader(requestOptions, "content-disposition", `attachment; filename="happ-${options.platform}.json"`);
    setResponseHeader(requestOptions, "routing-enable", "1");
    setResponseHeader(requestOptions, "no-limit-enabled", "1");
  }
  function logDiagnostics(context, options, normalized, filtered) {
    const method = typeof context?.logger === "function" ? context.logger : typeof context?.logger?.info === "function" ? context.logger.info.bind(context.logger) : null;
    if (!method) return;
    try {
      method(`[happ-config] ${JSON.stringify({
        client: "happ",
        platform: options.platform,
        channel: HAPP_PUBLIC_CHANNEL,
        accepted: filtered.nodes.length,
        excluded: filtered.diagnostics.excluded,
        normalized: normalized.diagnostics.total
      })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseHappOptions(context.arguments ?? {});
    if (options.output !== "config") throw new Error("HAPP config entry requires output=config");
    if (typeof context.produceArtifact !== "function") throw new Error("HAPP produceArtifact is unavailable");
    const raw = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(raw) || raw.length === 0) throw new Error("HAPP source collection is empty");
    const normalized = normalizeNodes(raw, { clientChain: "off" });
    const filtered = filterNodesForClient(normalized.nodes, CLIENT.happ);
    if (filtered.nodes.length === 0) throw new Error("HAPP has no compatible nodes");
    const policy = await loadSubstorePolicyArtifact(context);
    const policyResolution = resolveUnifiedPolicy({
      policy,
      channel: options.channel,
      client: CLIENT.happ,
      allNodes: normalized.nodes,
      eligibleNodes: filtered.nodes
    });
    logDiagnostics(context, options, normalized, filtered);
    const configs = renderHappSubscription({
      nodes: filtered.nodes,
      allNodes: normalized.nodes,
      options,
      policyResolution
    });
    attachRoutingProfile(input, context, options);
    return { ...input, $content: `${JSON.stringify(configs, null, 2)}
` };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return HappConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, requestOptions: typeof $options === "undefined" ? undefined : $options, logger: console });
}
