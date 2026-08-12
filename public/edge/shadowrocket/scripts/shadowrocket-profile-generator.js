var ShadowrocketProfileBundle = (() => {
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

  // substore-profile-entry.js
  var substore_profile_entry_exports = {};
  __export(substore_profile_entry_exports, {
    operator: () => operator
  });

  // ../../../shared/contracts.js
  var CLIENT = Object.freeze({
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere",
    surge: "surge",
    singbox: "singbox",
    onexray: "onexray"
  });
  var OPTION_VALUES = Object.freeze({
    output: Object.freeze(["nodes", "config"]),
    type: Object.freeze(["collection"]),
    platform: Object.freeze(["iphone", "ipad", "macos", "appletv"]),
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

  // ../../../shared/nodes/diagnostics.js
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

  // ../../../shared/nodes/protocol-registry.js
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
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray], {
      requiredFields: ["cipher", "password"],
      clientNames: { [CLIENT.onexray]: ["ss"] }
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.onexray], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.onexray], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.egern, CLIENT.anywhere, CLIENT.singbox], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray], {
      requiredFields: ["password"],
      tls: true,
      clientNames: { [CLIENT.onexray]: ["hysteria2"] }
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray]),
    protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.onexray]),
    protocol(["ssh"], [CLIENT.egern, CLIENT.singbox], {
      requiredFields: ["username"]
    }),
    protocol(["wireguard"], [CLIENT.egern, CLIENT.singbox], {
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
  function protocolSupportsClient(value, client) {
    const protocol2 = normalizeProtocol(value);
    const definition = protocolDefinition(protocol2);
    return definition?.clients.includes(client) === true && (definition.clientNames[client] ?? definition.names).includes(protocol2);
  }
  function diagnosticProtocol(value) {
    const normalized = normalizeProtocol(value);
    return registry.has(normalized) ? normalized : "unknown";
  }
  function displayProtocol(value) {
    return DISPLAY_PROTOCOL_NAMES[normalizeProtocol(value)] ?? "";
  }

  // ../../../shared/nodes/capabilities.js
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
  function egernTlsReason(node, { allowReality = true, allowAlpn = false, implicitTls = false } = {}) {
    if (!isOptionalBoolean(node, "tls") || !isOptionalBoolean(node, "skip-cert-verify") || !isOptionalBoolean(node, "allow-insecure") || hasConflictingAliases(node, ["skip-cert-verify", "allow-insecure"]) || !optionalStringAliasesAreValid(node, ["sni", "servername"]) || hasConflictingAliases(node, ["fingerprint-sha256", "fingerprint_sha256"])) {
      return "unsupported-egern-tls-shape";
    }
    for (const key of ["fingerprint-sha256", "fingerprint_sha256"]) {
      if (hasOption(node, key) && !isCertificateFingerprint(node[key])) {
        return "unsupported-egern-tls-shape";
      }
    }
    if (hasOption(node, "client-fingerprint") || hasOption(node, "alpn") && !allowAlpn) {
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
      return egernTlsReason(node, { implicitTls: true }) || (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo") ? "unsupported-egern-anytls-shape" : null);
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
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields.some((key) => hasOption(node, key)) || ["idle-session-check-interval", "idle-session-timeout"].some((key) => hasOption(node, key) && (!Number.isInteger(node[key]) || node[key] < 30)) || hasOption(node, "min-idle-session") && (!Number.isInteger(node["min-idle-session"]) || node["min-idle-session"] < 0)) {
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
  var ONEXRAY_TLS_FIELDS = /* @__PURE__ */ new Set([
    "tls",
    "security",
    "sni",
    "servername",
    "alpn",
    "client-fingerprint",
    "reality-opts",
    "skip-cert-verify",
    "allow-insecure"
  ]);
  var ONEXRAY_TRANSPORT_FIELDS = /* @__PURE__ */ new Set([
    "network",
    "packet-encoding",
    "ws-opts",
    "grpc-opts",
    "httpupgrade-opts",
    "xhttp-opts",
    "kcp-opts"
  ]);
  var ONEXRAY_COMMON_FIELDS = /* @__PURE__ */ new Set(["name", "type", "server", "port", "udp", "_profile"]);
  var ONEXRAY_PACKET_ENCODINGS = /* @__PURE__ */ new Set(["none", "xudp", "packet"]);
  function validOneXrayHeaders(value) {
    return isPlainObject(value) && Object.entries(value).every(([key, field]) => isNonblankString(key) && isNonblankString(field));
  }
  function validOneXrayWebSocketHeaders(value) {
    return isPlainObject(value) && !hasHeaderAliasConflict(value) && Object.entries(value).every(([key, field]) => key.toLowerCase() === "host" && isNonblankString(field));
  }
  function oneXrayAliasReason(node) {
    if (conflictingAliases(node, ["sni", "servername"]) || conflictingAliases(node, ["skip-cert-verify", "allow-insecure"]) || conflictingAliases(node, ["obfs-password", "obfs_password"])) {
      return "conflicting-onexray-alias";
    }
    return null;
  }
  function oneXrayCommonReason(node) {
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort(node.port) || !isOptionalBoolean(node, "udp")) return "invalid-onexray-node-shape";
    return oneXrayAliasReason(node);
  }
  function oneXrayTlsReason(node, protocol2, { implicitTls = false, allowReality = protocol2 === "vless" } = {}) {
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) {
      return "unsupported-onexray-option";
    }
    if (!isOptionalBoolean(node, "tls") || !optionalStringAliasesAreValid(node, ["sni", "servername"])) {
      return "invalid-onexray-node-shape";
    }
    if (!isOptionalBoolean(node, "skip-cert-verify") || !isOptionalBoolean(node, "allow-insecure")) {
      return "invalid-onexray-node-shape";
    }
    if (hasOption(node, "alpn") && (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((value) => !isNonblankString(value)))) {
      return "unsupported-onexray-tls-shape";
    }
    if (hasOption(node, "client-fingerprint") && !isNonblankString(node["client-fingerprint"])) {
      return "unsupported-onexray-tls-shape";
    }
    if (hasOption(node, "security") && !["none", "tls", "reality", "auto", "aes-128-gcm", "chacha20-poly1305", "zero"].includes(node.security)) {
      return "unsupported-onexray-tls-shape";
    }
    if (protocol2 !== "vmess" && ["auto", "aes-128-gcm", "chacha20-poly1305", "zero"].includes(node.security)) {
      return "unsupported-onexray-tls-shape";
    }
    const realityRequested = node.security === "reality" || hasOption(node, "reality-opts");
    if (realityRequested && !allowReality) return "unsupported-onexray-tls-shape";
    if (node.security === "reality" && !hasOption(node, "reality-opts")) return "incomplete-onexray-reality";
    if (hasOption(node, "reality-opts") && hasOption(node, "security") && node.security !== "reality") {
      return "incomplete-onexray-reality";
    }
    if (node.tls === false && ["tls", "reality"].includes(node.security) || node.tls === true && node.security === "none") return "unsupported-onexray-tls-shape";
    const reality = node["reality-opts"];
    if (reality !== void 0) {
      const realityPublicKey = firstAliasValue(reality, ["public-key", "_public-key"]);
      const shortId = reality["short-id"] ?? reality["_short-id"];
      const spiderX = reality["spider-x"] ?? reality["_spider-x"];
      if (!allowReality || node.tls === false || !isPlainObject(reality) || !isRealityPublicKey(realityPublicKey)) {
        return "incomplete-onexray-reality";
      }
      if (Object.keys(reality).some((key) => !["public-key", "short-id", "spider-x", "_public-key", "_short-id", "_spider-x"].includes(key)) || (hasOption(reality, "short-id") || hasOption(reality, "_short-id")) && (!isNonblankString(shortId) || !/^[0-9a-f]*$/i.test(shortId)) || (hasOption(reality, "spider-x") || hasOption(reality, "_spider-x")) && !isNonblankString(spiderX)) {
        return "incomplete-onexray-reality";
      }
    }
    const tlsRequested = tlsRequestedForCapability(node);
    if (!implicitTls && !tlsRequested && (hasTlsSettings(node) || hasOption(node, "alpn") || hasOption(node, "client-fingerprint"))) return "unsupported-onexray-tls-shape";
    if (implicitTls && (node.tls === false || node.security === "none")) return "unsupported-onexray-tls-shape";
    return null;
  }
  function oneXrayTransportReason(node, protocol2) {
    const network = normalizeTransport(node);
    const transportOptions = ["ws-opts", "grpc-opts", "httpupgrade-opts", "xhttp-opts", "kcp-opts"];
    if (protocol2 === "hysteria2") {
      if (!(/* @__PURE__ */ new Set(["", "quic", "udp", "hysteria"])).has(hasOption(node, "network") ? network : "")) {
        return "unsupported-onexray-transport";
      }
      return transportOptions.some((key) => hasOption(node, key)) ? "unsupported-onexray-transport" : null;
    }
    if (!(/* @__PURE__ */ new Set(["tcp", "raw", "ws", "grpc", "httpupgrade", "xhttp", "kcp"])).has(network)) {
      return "unsupported-onexray-transport";
    }
    const packetEncoding = node["packet-encoding"];
    const hasPacketEncoding = hasOption(node, "packet-encoding");
    if (hasPacketEncoding && (!isNonblankString(packetEncoding) || !ONEXRAY_PACKET_ENCODINGS.has(packetEncoding))) {
      return "unsupported-onexray-transport";
    }
    if (network === "tcp" || network === "raw") {
      return transportOptions.some((key) => hasOption(node, key)) ? "unsupported-onexray-transport" : null;
    }
    if (hasPacketEncoding && network !== "xhttp") {
      return "unsupported-onexray-transport";
    }
    const optionByNetwork = {
      ws: "ws-opts",
      grpc: "grpc-opts",
      httpupgrade: "httpupgrade-opts",
      xhttp: "xhttp-opts",
      kcp: "kcp-opts"
    };
    const optionKey = optionByNetwork[network];
    if (transportOptions.some((key) => key !== optionKey && hasOption(node, key))) return "unsupported-onexray-transport";
    const options = node[optionKey];
    if (options === void 0) return null;
    if (!isPlainObject(options)) return "unsupported-onexray-transport";
    if (network === "ws") {
      return Object.keys(options).some((key) => !["path", "headers"].includes(key)) || hasOption(options, "path") && !isNonblankString(options.path) || hasOption(options, "headers") && !validOneXrayWebSocketHeaders(options.headers) ? "unsupported-onexray-transport" : null;
    }
    if (network === "grpc") {
      return Object.keys(options).some((key) => key !== "grpc-service-name") || hasOption(options, "grpc-service-name") && !isNonblankString(options["grpc-service-name"]) ? "unsupported-onexray-transport" : null;
    }
    if (network === "httpupgrade" || network === "xhttp") {
      const allowed = network === "httpupgrade" ? ["path", "host"] : ["path", "host", "mode", "packet-encoding"];
      return Object.keys(options).some((key) => !allowed.includes(key)) || hasOption(options, "path") && !isNonblankString(options.path) || hasOption(options, "host") && !isNonblankString(options.host) || hasOption(options, "mode") && !(/* @__PURE__ */ new Set(["auto", "packet-up", "stream-up", "stream-one"])).has(options.mode) || hasOption(options, "packet-encoding") && (!isNonblankString(options["packet-encoding"]) || !ONEXRAY_PACKET_ENCODINGS.has(options["packet-encoding"])) ? "unsupported-onexray-transport" : null;
    }
    return Object.keys(options).length === 0 ? null : "unsupported-onexray-transport";
  }
  function unsupportedOneXrayFields(node, protocol2) {
    const allowed = new Set(ONEXRAY_COMMON_FIELDS);
    const protocolFields = {
      ss: ["cipher", "password", "plugin", "plugin-opts"],
      vmess: ["uuid", "security", "cipher"],
      vless: ["uuid", "flow", "encryption", "reverse"],
      trojan: ["password"],
      socks5: ["username", "password"],
      http: ["username", "password", "headers"],
      hysteria2: ["password"]
    };
    for (const key of protocolFields[protocol2] ?? []) allowed.add(key);
    if (["vmess", "vless", "trojan", "hysteria2"].includes(protocol2)) {
      for (const key of ONEXRAY_TLS_FIELDS) allowed.add(key);
    }
    if (["vmess", "vless"].includes(protocol2)) {
      for (const key of ONEXRAY_TRANSPORT_FIELDS) allowed.add(key);
    } else if (protocol2 === "hysteria2") {
      allowed.add("network");
    }
    return Object.keys(node).some((key) => !allowed.has(key));
  }
  function validateOneXrayProtocolShape(node, protocol2) {
    const commonReason = oneXrayCommonReason(node);
    if (commonReason) return commonReason;
    if (hasAnyChain(node)) return "unsupported-onexray-chain";
    if (unsupportedOneXrayFields(node, protocol2)) return "unsupported-onexray-option";
    if (protocol2 === "ss") {
      if (!isNonblankString(node.cipher) || !isNonblankOpaqueString(node.password)) return "invalid-onexray-node-shape";
      if (hasShadowsocksPlugin(node)) return "unsupported-onexray-shadowsocks-plugin";
      return null;
    }
    if (protocol2 === "vmess" || protocol2 === "vless") {
      if (!isNonblankString(node.uuid)) return "invalid-onexray-node-shape";
      if (protocol2 === "vless" && hasOption(node, "flow") && !isNonblankString(node.flow) || protocol2 === "vless" && hasOption(node, "encryption") && !isNonblankString(node.encryption) || protocol2 === "vless" && hasOption(node, "reverse") && (!isPlainObject(node.reverse) || Object.keys(node.reverse).some((key) => key !== "tag") || !isNonblankString(node.reverse.tag))) return "invalid-onexray-node-shape";
      if (protocol2 === "vmess") {
        const supportedSecurity = ["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"];
        if (["cipher", "security"].some((key) => hasOption(node, key) && (!isNonblankString(node[key]) || !supportedSecurity.includes(node[key])))) {
          return "invalid-onexray-node-shape";
        }
      }
      if (protocol2 === "vmess" && hasOption(node, "cipher") && hasOption(node, "security") && node.cipher !== node.security) {
        return "conflicting-onexray-alias";
      }
      const tlsReason = oneXrayTlsReason(node, protocol2);
      return tlsReason || oneXrayTransportReason(node, protocol2);
    }
    if (protocol2 === "trojan") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-onexray-node-shape";
      return oneXrayTlsReason(node, protocol2, { implicitTls: true, allowReality: false });
    }
    if (protocol2 === "socks5" || protocol2 === "http") {
      if (!validOptionalAuthentication(node) || hasOption(node, "username") !== hasOption(node, "password")) {
        return "invalid-onexray-node-shape";
      }
      return protocol2 === "http" && hasOption(node, "headers") && !validOneXrayHeaders(node.headers) ? "invalid-onexray-node-shape" : null;
    }
    if (protocol2 === "hysteria2") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-onexray-node-shape";
      return oneXrayTlsReason(node, protocol2, { implicitTls: true, allowReality: false }) || oneXrayTransportReason(node, protocol2);
    }
    return "unsupported-onexray-protocol";
  }
  function oneXrayNodeExclusionReason(node) {
    const protocol2 = normalizeProtocol(node?.type);
    if (!protocolSupportsClient(protocol2, CLIENT.onexray)) return "unsupported-onexray-protocol";
    if (nodeMetadata(node).chained) return "unsupported-onexray-chain";
    return validateOneXrayProtocolShape(node, protocol2);
  }
  function evaluateNodeForClient(node, client) {
    if (!Object.values(CLIENT).includes(client)) return { supported: false, reason: "unsupported-client" };
    const protocol2 = normalizeProtocol(node?.type);
    if (!protocolSupportsClient(protocol2, client)) {
      return { supported: false, reason: client === CLIENT.onexray ? "unsupported-onexray-protocol" : "unsupported-protocol" };
    }
    let transportReason = null;
    if (client === CLIENT.anywhere) transportReason = anywhereNodeExclusionReason(node ?? {});
    else if (client === CLIENT.egern) transportReason = egernNodeExclusionReason(node ?? {});
    else if (client === CLIENT.singbox) transportReason = singBoxNodeExclusionReason(node ?? {});
    else if (client === CLIENT.onexray) {
      transportReason = oneXrayNodeExclusionReason(node ?? {});
    }
    return transportReason ? { supported: false, reason: transportReason } : { supported: true, reason: null };
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

  // ../../../shared/nodes/client-chain.js
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

  // ../../../shared/nodes/node-identity.js
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
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).padStart(7, "0");
  }

  // ../../../shared/nodes/node-validation.js
  var PSEUDO_NODE_PATTERN = /剩余|流量|到期|套餐|官网|公告|通知|traffic|expire|website/i;
  function isNonblankOpaqueString2(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isNonblankIdentifier(value) {
    return isNonblankOpaqueString2(value) && value.trim() === value;
  }
  var OPAQUE_AUTH_FIELDS = /* @__PURE__ */ new Set(["password", "psk", "private-key", "public-key", "key"]);
  function isValidPort2(value) {
    const port = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return Number.isInteger(port) && port >= 1 && port <= 65535;
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

  // ../../../shared/nodes/country-regions.js
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

  // ../../../shared/nodes/regions.js
  var FLAG_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
  var RAW_REGIONS = [
    {
      flag: "\u{1F1E8}\u{1F1F3}",
      continent: CONTINENT.asiaPacific,
      terms: ["CN", "PEK", "PVG", "CAN", "China", "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "\u4E2D\u56FD", "\u5317\u4EAC", "\u4E0A\u6D77", "\u5E7F\u5DDE", "\u6DF1\u5733"]
    },
    { flag: "\u{1F1ED}\u{1F1F0}", continent: CONTINENT.asiaPacific, terms: ["HK", "HKG", "Hong Kong", "\u9999\u6E2F"] },
    { flag: "\u{1F1F2}\u{1F1F4}", continent: CONTINENT.asiaPacific, terms: ["MO", "MFM", "Macau", "Macao", "\u6FB3\u95E8"] },
    { flag: "\u{1F1F9}\u{1F1FC}", continent: CONTINENT.asiaPacific, terms: ["TW", "TPE", "Taiwan", "Taipei", "\u53F0\u6E7E", "\u53F0\u5317"] },
    { flag: "\u{1F1EF}\u{1F1F5}", continent: CONTINENT.asiaPacific, terms: ["JP", "NRT", "HND", "KIX", "Japan", "Tokyo", "Osaka", "\u65E5\u672C", "\u4E1C\u4EAC", "\u5927\u962A"] },
    { flag: "\u{1F1F0}\u{1F1F7}", continent: CONTINENT.asiaPacific, terms: ["KR", "ICN", "Korea", "Seoul", "\u97E9\u56FD", "\u9996\u5C14"] },
    { flag: "\u{1F1F8}\u{1F1EC}", continent: CONTINENT.asiaPacific, terms: ["SG", "SIN", "Singapore", "\u65B0\u52A0\u5761"] },
    { flag: "\u{1F1F2}\u{1F1FE}", continent: CONTINENT.asiaPacific, terms: ["MY", "KUL", "Malaysia", "Kuala Lumpur", "\u9A6C\u6765\u897F\u4E9A", "\u5409\u9686\u5761"] },
    { flag: "\u{1F1F9}\u{1F1ED}", continent: CONTINENT.asiaPacific, terms: ["TH", "BKK", "Thailand", "Bangkok", "\u6CF0\u56FD", "\u66FC\u8C37"] },
    { flag: "\u{1F1F5}\u{1F1ED}", continent: CONTINENT.asiaPacific, terms: ["PH", "MNL", "Philippines", "Manila", "\u83F2\u5F8B\u5BBE", "\u9A6C\u5C3C\u62C9"] },
    { flag: "\u{1F1EE}\u{1F1E9}", continent: CONTINENT.asiaPacific, terms: ["ID", "CGK", "Indonesia", "Jakarta", "\u5370\u5EA6\u5C3C\u897F\u4E9A", "\u96C5\u52A0\u8FBE"] },
    { flag: "\u{1F1E6}\u{1F1FA}", continent: CONTINENT.asiaPacific, terms: ["AU", "SYD", "MEL", "Australia", "Sydney", "Melbourne", "\u6FB3\u5927\u5229\u4E9A", "\u6089\u5C3C", "\u58A8\u5C14\u672C"] },
    { flag: "\u{1F1EE}\u{1F1F3}", continent: CONTINENT.asiaPacific, terms: ["IN", "BOM", "DEL", "India", "Mumbai", "Delhi", "\u5370\u5EA6", "\u5B5F\u4E70", "\u5FB7\u91CC"] },
    { flag: "\u{1F1E9}\u{1F1EA}", continent: CONTINENT.europe, terms: ["DE", "FRA", "Germany", "Frankfurt", "\u5FB7\u56FD", "\u6CD5\u5170\u514B\u798F"] },
    { flag: "\u{1F1EC}\u{1F1E7}", continent: CONTINENT.europe, terms: ["GB", "UK", "LHR", "Britain", "United Kingdom", "London", "\u82F1\u56FD", "\u4F26\u6566"] },
    { flag: "\u{1F1EB}\u{1F1F7}", continent: CONTINENT.europe, terms: ["FR", "CDG", "France", "Paris", "\u6CD5\u56FD", "\u5DF4\u9ECE"] },
    { flag: "\u{1F1F3}\u{1F1F1}", continent: CONTINENT.europe, terms: ["NL", "AMS", "Netherlands", "Amsterdam", "\u8377\u5170", "\u963F\u59C6\u65AF\u7279\u4E39"] },
    { flag: "\u{1F1E8}\u{1F1ED}", continent: CONTINENT.europe, terms: ["CH", "ZRH", "Switzerland", "Zurich", "\u745E\u58EB", "\u82CF\u9ECE\u4E16"] },
    { flag: "\u{1F1EE}\u{1F1F9}", continent: CONTINENT.europe, terms: ["IT", "MXP", "Italy", "Milan", "\u610F\u5927\u5229", "\u7C73\u5170"] },
    { flag: "\u{1F1EA}\u{1F1F8}", continent: CONTINENT.europe, terms: ["ES", "MAD", "Spain", "Madrid", "\u897F\u73ED\u7259", "\u9A6C\u5FB7\u91CC"] },
    { flag: "\u{1F1F8}\u{1F1EA}", continent: CONTINENT.europe, terms: ["SE", "ARN", "Sweden", "Stockholm", "\u745E\u5178", "\u65AF\u5FB7\u54E5\u5C14\u6469"] },
    { flag: "\u{1F1FA}\u{1F1F8}", continent: CONTINENT.americas, terms: ["US", "USA", "LAX", "SJC", "SEA", "IAD", "JFK", "America", "United States", "\u7F8E\u56FD", "\u6D1B\u6749\u77F6", "\u5723\u4F55\u585E", "\u897F\u96C5\u56FE", "\u534E\u76DB\u987F", "\u7EBD\u7EA6"] },
    { flag: "\u{1F1E8}\u{1F1E6}", continent: CONTINENT.americas, terms: ["CA", "YVR", "YYZ", "Canada", "\u52A0\u62FF\u5927", "\u6E29\u54E5\u534E", "\u591A\u4F26\u591A"] },
    { flag: "\u{1F1E7}\u{1F1F7}", continent: CONTINENT.americas, terms: ["BR", "GRU", "Brazil", "\u5DF4\u897F", "\u5723\u4FDD\u7F57"] }
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

  // ../../../shared/nodes/source-labels.js
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

  // ../../../shared/nodes/normalize-nodes.js
  var CONTINENT_ORDER = /* @__PURE__ */ new Map([
    [CONTINENT.asiaPacific, 0],
    [CONTINENT.europe, 1],
    [CONTINENT.americas, 2],
    [CONTINENT.other, 3]
  ]);
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
  function cleanDisplayName(name, type) {
    const withoutMarkers = removeFlags(name).replace(/\[\s*未标记\s*\]/giu, " ").replace(/\[\s*udp\s*\]/gi, " ").replace(/\[\s*已有链\s*\]/g, " ");
    const stripped = stripSourceMarkers(withoutMarkers);
    const protocolTokens = PROTOCOL_NAME_TOKENS[type] ?? [type];
    const protocolPattern = protocolTokens.filter((token) => typeof token === "string" && token.length > 0).join("|");
    const withoutProtocol = protocolPattern ? stripped.replace(new RegExp("(?:^|\\s)(?:" + protocolPattern + ")(?=\\s|$)", "giu"), " ") : stripped;
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
    const name = left.name.localeCompare(right.name, "zh-Hans-CN");
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
        const label = displayProtocol(node.type);
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
        for (const record of byIdentity) {
          const suffixGroup = suffixGroups.get(record.suffix) ?? [];
          suffixGroup.push(record);
          suffixGroups.set(record.suffix, suffixGroup);
        }
        for (const records of suffixGroups.values()) {
          records.forEach((record, index) => {
            const suffix = records.length > 1 ? `${record.suffix}-${index + 1}` : record.suffix;
            record.node.name = `${protocolBase} #${suffix}`;
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
      const sourceSuffix = source.kind === SOURCE_KIND.unknown ? "" : "\uFF5C" + source.label;
      const capabilitySuffix = [
        existingChain ? "\u94FE" : "",
        udp ? "U" : ""
      ].filter(Boolean).join("\xB7");
      cloned.name = region.flag + " " + cleanDisplayName(original.name, cloned.type) + sourceSuffix + (capabilitySuffix ? "\xB7" + capabilitySuffix : "");
      cloned._profile = {
        id,
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

  // ../../../shared/policies/platform-presets.js
  var POLICY_PLATFORM_PRESETS = Object.freeze({
    macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    android: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    openwrt: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200 })
  });
  function platformPolicyPreset(platform) {
    if (typeof platform !== "string" || !Object.hasOwn(POLICY_PLATFORM_PRESETS, platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return POLICY_PLATFORM_PRESETS[platform];
  }

  // options.js
  var REQUIRED_KEYS = Object.freeze([
    "output",
    "type",
    "name",
    "subscriptionName",
    "platform"
  ]);
  var DEFAULTS = Object.freeze({
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    autoGroupMode: "auto",
    clientChain: "off",
    adblockMode: "off"
  });
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current"]);
  var ADBLOCK_MODES = /* @__PURE__ */ new Set(["off", "full"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);
  function requiredString(raw, key) {
    if (!Object.hasOwn(raw, key)) {
      throw new Error(`Option '${key}' must be a non-empty string`);
    }
    const value = raw[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Option '${key}' must be a non-empty string`);
    }
    return value.trim();
  }
  function subscriptionDisplayName(raw) {
    if (!Object.hasOwn(raw, "subscriptionName")) {
      throw new Error("Option 'subscriptionName' must be a non-empty string");
    }
    const value = raw.subscriptionName;
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("Option 'subscriptionName' must be a non-empty string");
    }
    if (/[\r\n]/.test(value)) {
      throw new Error("Option 'subscriptionName' must not contain CR or LF");
    }
    if (value.trim() !== value) {
      throw new Error("Option 'subscriptionName' must not have leading or trailing whitespace");
    }
    return value;
  }
  function enumValue(raw, key) {
    const value = requiredString(raw, key);
    if (!OPTION_VALUES[key].includes(value)) {
      throw new Error(`Option '${key}' has an unsupported value: ${value}`);
    }
    return value;
  }
  function parseOptions(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("Options must be an object");
    }
    for (const key of Object.keys(raw)) {
      if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) {
        throw new Error(`Unknown option: ${key}`);
      }
    }
    const options = {};
    for (const key of REQUIRED_KEYS) {
      options[key] = key === "subscriptionName" ? subscriptionDisplayName(raw) : OPTION_VALUES[key] ? enumValue(raw, key) : requiredString(raw, key);
    }
    for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
      const platformDefault = key === "ipv6Mode" && options.platform === "macos" ? "ipv4-only" : defaultValue;
      if (key === "channel") {
        const value = Object.hasOwn(raw, key) && raw[key] !== void 0 ? raw[key] : platformDefault;
        if (typeof value !== "string" || !CHANNELS.has(value)) {
          throw new Error(`Option '${key}' has an unsupported value: ${value}`);
        }
        options[key] = value;
      } else if (key === "adblockMode") {
        const value = Object.hasOwn(raw, key) && raw[key] !== void 0 ? raw[key] : platformDefault;
        if (typeof value !== "string" || !ADBLOCK_MODES.has(value)) {
          throw new Error(`Option '${key}' has an unsupported value: ${value}`);
        }
        options[key] = value;
      } else {
        options[key] = Object.hasOwn(raw, key) && raw[key] !== void 0 ? enumValue(raw, key) : platformDefault;
      }
    }
    return options;
  }

  // ../../../shared/dns/providers.js
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

  // dns.js
  var DNS_MODES = /* @__PURE__ */ new Set(["stable", "privacy", "speed"]);
  var DNS_PROXY = `#proxy=${encodeURIComponent("\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D")}`;
  function optionValue(options, key, allowed) {
    const value = options?.[key];
    if (!allowed.has(value)) {
      throw new Error(`Unsupported ${key}: ${value}`);
    }
    return value;
  }
  function dnsSettings(options) {
    const dnsMode = optionValue(options, "dnsMode", DNS_MODES);
    const chinaDns = optionValue(options, "chinaDns", /* @__PURE__ */ new Set(["alidns", "dnspod", "system"]));
    const globalDns = optionValue(options, "globalDns", /* @__PURE__ */ new Set(["cloudflare", "google", "quad9"]));
    const privacySystemDns = dnsMode === "privacy" && chinaDns === "system";
    const globalUsesProxy = dnsMode !== "speed";
    const china = chinaDnsProvider(privacySystemDns ? "alidns" : chinaDns);
    const global = globalDnsProvider(globalDns);
    return [
      `dns-server = ${china.doh}`,
      `fallback-dns-server = ${global.doh}${globalUsesProxy ? DNS_PROXY : ""}`,
      `dns-direct-system = ${chinaDns === "system" && !privacySystemDns}`,
      `dns-direct-fallback-proxy = ${globalUsesProxy}`,
      "private-ip-answer = true",
      "hijack-dns = *:53"
    ];
  }

  // general.js
  var IPV6_MODES = /* @__PURE__ */ new Set(["auto", "ipv4-only"]);
  var QUIC_MODES = Object.freeze({
    allow: "always-allow",
    "proxy-block": "all-proxy",
    "all-block": "all"
  });
  var CLIENT_CHAIN_MODES = /* @__PURE__ */ new Set(["off", "on"]);
  var SKIP_PROXY = "127.0.0.1,localhost,*.local,*.lan,*.home.arpa,10.0.0.0/8,100.64.0.0/10,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,fc00::/7,fe80::/10";
  var TUN_EXCLUDED_ROUTES = "10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,224.0.0.0/4,::1/128,fc00::/7,fe80::/10,ff00::/8";
  function optionValue2(options, key, allowed) {
    const value = options?.[key];
    if (!allowed.has(value)) {
      throw new Error(`Unsupported ${key}: ${value}`);
    }
    return value;
  }
  function generalSettings(options) {
    const ipv6Mode = optionValue2(options, "ipv6Mode", IPV6_MODES);
    const quicMode = optionValue2(options, "quicMode", new Set(Object.keys(QUIC_MODES)));
    const clientChain = optionValue2(options, "clientChain", CLIENT_CHAIN_MODES);
    return [
      `skip-proxy = ${SKIP_PROXY}`,
      `tun-excluded-routes = ${TUN_EXCLUDED_ROUTES}`,
      "bypass-system = true",
      "udp-policy-not-supported-behaviour = REJECT",
      "allow-dns-svcb = false",
      "allow-dns-all = false",
      "proxy-dns-server = system",
      `ipv6 = ${ipv6Mode === "auto"}`,
      "prefer-ipv6 = false",
      "ipv6-only-if-no-ipv4-dns = true",
      `block-quic = ${QUIC_MODES[quicMode]}`,
      `close-if-proxy-chain-missing = ${clientChain === "on"}`,
      ...dnsSettings(options)
    ];
  }

  // ../../../shared/policies/filters.js
  var ALL_NODES_FILTER = "^.+$";
  var NON_CHAINED_FILTER = "^(?!\u{1F517} ).+$";
  var ENTRY_FILTER = "^(?!\u{1F517} )(?!.*\xB7\u94FE).+\uFF5C(?:\u673A\u573A|\u81EA\u5EFA|Realm)(?:\xB7.*)?$";
  var P2P_FILTER = "^(?!\u{1F517} ).+\uFF5C(?:\u81EA\u5EFA|Realm|\u94FE\u5F0F\u4EE3\u7406)(?:\xB7.*)?$";
  var GAME_FILTER = "^(?!\u{1F517} ).+\xB7U$";
  var CONTINENTS = Object.freeze([
    Object.freeze({
      key: CONTINENT.asiaPacific,
      name: "\u{1F30F} \u4E9A\u592A",
      helperName: "\u4E9A\u592A",
      flags: CONTINENT_FLAGS[CONTINENT.asiaPacific]
    }),
    Object.freeze({
      key: CONTINENT.europe,
      name: "\u{1F30D} \u6B27\u6D32",
      helperName: "\u6B27\u6D32",
      flags: CONTINENT_FLAGS[CONTINENT.europe]
    }),
    Object.freeze({
      key: CONTINENT.americas,
      name: "\u{1F30E} \u7F8E\u6D32",
      helperName: "\u7F8E\u6D32",
      flags: CONTINENT_FLAGS[CONTINENT.americas]
    }),
    Object.freeze({
      key: CONTINENT.other,
      name: "\u{1F310} \u5176\u4ED6/\u672A\u5206\u7C7B",
      helperName: "\u5176\u4ED6/\u672A\u5206\u7C7B",
      flags: Object.freeze([])
    })
  ]);
  var SOURCE_GROUPS = Object.freeze([
    Object.freeze({ kind: SOURCE_KIND.selfHosted, name: "\u{1F3E0} \u81EA\u5EFA\u8282\u70B9", filter: "^.+\uFF5C\u81EA\u5EFA(?:\xB7.*)?$" }),
    Object.freeze({ kind: SOURCE_KIND.airport, name: "\u{1F3E2} \u673A\u573A\u8282\u70B9", filter: "^.+\uFF5C\u673A\u573A(?:\xB7.*)?$" }),
    Object.freeze({ kind: SOURCE_KIND.realm, name: "\u21AA\uFE0F Realm \u8F6C\u53D1", filter: "^.+\uFF5CRealm(?:\xB7.*)?$" }),
    Object.freeze({ kind: SOURCE_KIND.serverChain, name: "\u26D3\uFE0F \u94FE\u5F0F\u4EE3\u7406", filter: "^.+\uFF5C\u94FE\u5F0F\u4EE3\u7406(?:\xB7.*)?$" })
  ]);
  function continentFilter(continent) {
    if (continent.key === CONTINENT.other) {
      const knownFlags = CONTINENTS.flatMap((record) => record.flags).join("|");
      return `^(?!(?:\u{1F517}|${knownFlags})).+$`;
    }
    return `^(?:${continent.flags.join("|")}).+$`;
  }

  // ../../../shared/policies/intents.js
  var POLICY_TARGET = Object.freeze({
    primaryProxy: "primary-proxy"
  });

  // ../../../shared/policies/catalog.js
  var TEST_URL = "http://www.gstatic.com/generate_204";
  var STRATEGY = Object.freeze({
    select: "select",
    autoTest: "auto-test",
    fallback: "fallback"
  });
  var GROUP_KIND = Object.freeze({
    helper: "helper",
    primary: "primary",
    continent: "continent",
    source: "source",
    ai: "ai",
    service: "service",
    special: "special",
    security: "security",
    chain: "chain"
  });
  var PROXY_THEN_DIRECT = Object.freeze(["\u{1F680} \u8282\u70B9\u9009\u62E9", "DIRECT"]);
  var PROXY_FIRST_SERVICE_DEFAULTS = Object.freeze({
    beforeCandidates: Object.freeze(["\u{1F680} \u8282\u70B9\u9009\u62E9"]),
    afterCandidates: Object.freeze(["DIRECT"]),
    defaultChoice: "\u{1F680} \u8282\u70B9\u9009\u62E9"
  });
  var DIRECT_FIRST_SERVICE_DEFAULTS = Object.freeze({
    beforeCandidates: Object.freeze(["DIRECT", "\u{1F680} \u8282\u70B9\u9009\u62E9"]),
    afterCandidates: Object.freeze([]),
    defaultChoice: "DIRECT"
  });
  var SERVICE_GROUPS = Object.freeze([
    Object.freeze(["\u{1F419} GitHub", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F4FA} YouTube", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F4AC} \u6D77\u5916\u793E\u4EA4", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F34E} Apple", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1FA9F} Microsoft", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F30D} \u6D77\u5916\u6E38\u620F", PROXY_FIRST_SERVICE_DEFAULTS])
  ]);
  function policyGroup({
    kind,
    name,
    strategy = STRATEGY.select,
    candidates = [],
    nodeFilter = null,
    test = null,
    hidden,
    defaultChoice
  }) {
    return { kind, name, strategy, candidates, nodeFilter, test, hidden, defaultChoice };
  }
  function helper(kind, name, strategy, preset, nodeFilter, candidates = []) {
    return policyGroup({
      kind,
      name,
      strategy,
      candidates,
      nodeFilter,
      test: {
        url: TEST_URL,
        interval: preset.testInterval,
        timeout: preset.timeout,
        tolerance: preset.tolerance
      },
      hidden: true
    });
  }
  function subscriptionGroup(kind, name, nodeFilter, candidates = ["DIRECT"], options = {}) {
    return policyGroup({ kind, name, candidates, nodeFilter, ...options });
  }
  function automaticHelperName(continent) {
    return `\u26A1 ${continent.helperName}\u81EA\u52A8`;
  }
  function fallbackHelperName(continent) {
    return `\u{1F6DF} ${continent.helperName}\u6545\u969C\u8F6C\u79FB`;
  }
  function continentHelperItems(continent, mode) {
    if (mode === "full") return [automaticHelperName(continent), fallbackHelperName(continent)];
    if (mode === "balanced") return [automaticHelperName(continent)];
    return [];
  }
  function serviceChoiceItems(defaults, presentContinentNames) {
    return [
      ...defaults.beforeCandidates,
      "\u26A1 \u5168\u90E8\u81EA\u52A8",
      "\u{1F6DF} \u5168\u90E8\u6545\u969C\u8F6C\u79FB",
      ...presentContinentNames,
      ...defaults.afterCandidates
    ];
  }
  function securityGroups(blockMode) {
    const defaults = {
      off: ["DIRECT", "DIRECT", "DIRECT"],
      security: ["REJECT", "DIRECT", "DIRECT"],
      balanced: ["REJECT", "REJECT", "DIRECT"],
      strict: ["REJECT", "REJECT", "REJECT"]
    }[blockMode] ?? ["REJECT", "REJECT", "DIRECT"];
    return ["\u2623\uFE0F \u5B89\u5168\u5A01\u80C1", "\u{1F9F1} \u5E38\u89C1\u5E7F\u544A", "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A"].map((name, index) => {
      const primary = defaults[index];
      return policyGroup({
        kind: GROUP_KIND.security,
        name,
        candidates: [primary, primary === "REJECT" ? "DIRECT" : "REJECT"]
      });
    });
  }
  function effectiveAutoMode(requested, nodeCount) {
    if (requested !== "auto") return requested;
    if (nodeCount <= 30) return "full";
    if (nodeCount <= 100) return "balanced";
    return "minimal";
  }
  function buildPolicyGroups(options, nodes) {
    const normalizedNodes = Array.isArray(nodes) ? nodes : [];
    const preset = platformPolicyPreset(options.platform);
    const mode = effectiveAutoMode(options.autoGroupMode, normalizedNodes.length);
    const presentContinents = CONTINENTS.filter((continent) => normalizedNodes.some((node) => nodeMetadata(node).continent === continent.key && !nodeMetadata(node).chained));
    const chainEligible = options.clientChain === "on" && normalizedNodes.some((node) => nodeMetadata(node).entry === true && !nodeMetadata(node).chained) && normalizedNodes.some((node) => nodeMetadata(node).chained === true);
    const groups = [
      helper(GROUP_KIND.helper, "\u26A1 \u5168\u90E8\u81EA\u52A8", STRATEGY.autoTest, preset, NON_CHAINED_FILTER),
      helper(GROUP_KIND.helper, "\u{1F6DF} \u5168\u90E8\u6545\u969C\u8F6C\u79FB", STRATEGY.fallback, preset, NON_CHAINED_FILTER)
    ];
    if (chainEligible) {
      groups.push(helper(GROUP_KIND.chain, "\u26A1 \u5165\u53E3\u81EA\u52A8", STRATEGY.autoTest, preset, ENTRY_FILTER));
    }
    if (mode !== "minimal") {
      for (const continent of presentContinents) {
        groups.push(helper(
          GROUP_KIND.helper,
          automaticHelperName(continent),
          STRATEGY.autoTest,
          preset,
          continentFilter(continent)
        ));
        if (mode === "full") {
          groups.push(helper(
            GROUP_KIND.helper,
            fallbackHelperName(continent),
            STRATEGY.fallback,
            preset,
            continentFilter(continent)
          ));
        }
      }
    }
    groups.push(policyGroup({
      kind: GROUP_KIND.primary,
      name: "\u{1F680} \u8282\u70B9\u9009\u62E9",
      candidates: [POLICY_TARGET.primaryProxy],
      nodeFilter: NON_CHAINED_FILTER
    }));
    for (const continent of presentContinents) {
      groups.push(subscriptionGroup(
        GROUP_KIND.continent,
        continent.name,
        continentFilter(continent),
        continentHelperItems(continent, mode)
      ));
    }
    for (const source of SOURCE_GROUPS) {
      if (normalizedNodes.some((node) => nodeMetadata(node).sourceKind === source.kind && !nodeMetadata(node).chained)) {
        groups.push(subscriptionGroup(GROUP_KIND.source, source.name, source.filter));
      }
    }
    if (chainEligible) {
      groups.push(subscriptionGroup(GROUP_KIND.chain, "\u{1F3AF} \u5BA2\u6237\u7AEF\u843D\u5730", "^\u{1F517} .+$"));
    }
    const aiContinentGroups = presentContinents.map((continent) => subscriptionGroup(
      GROUP_KIND.ai,
      `\u{1F916} AI ${continent.helperName}`,
      continentFilter(continent),
      continentHelperItems(continent, mode),
      { hidden: true }
    ));
    groups.push(...aiContinentGroups);
    groups.push(subscriptionGroup(
      GROUP_KIND.ai,
      "\u{1F916} AI \u4E13\u7528",
      ALL_NODES_FILTER,
      aiContinentGroups.map((group) => group.name)
    ));
    const presentContinentNames = presentContinents.map((continent) => continent.name);
    for (const [name, defaults] of SERVICE_GROUPS) {
      groups.push(subscriptionGroup(
        GROUP_KIND.service,
        name,
        ALL_NODES_FILTER,
        serviceChoiceItems(defaults, presentContinentNames),
        { defaultChoice: defaults.defaultChoice }
      ));
    }
    if (normalizedNodes.some((node) => nodeMetadata(node).udp === true && !nodeMetadata(node).chained)) {
      groups.push(subscriptionGroup(GROUP_KIND.special, "\u{1F3AE} \u6E38\u620F\u8FDE\u63A5", GAME_FILTER));
    } else {
      groups.push(policyGroup({ kind: GROUP_KIND.special, name: "\u{1F3AE} \u6E38\u620F\u8FDE\u63A5", candidates: ["DIRECT"] }));
    }
    if (normalizedNodes.some((node) => nodeMetadata(node).p2p === true && !nodeMetadata(node).chained)) {
      groups.push(subscriptionGroup(GROUP_KIND.special, "\u2B07\uFE0F \u4E0B\u8F7D/P2P", P2P_FILTER));
    } else {
      groups.push(policyGroup({ kind: GROUP_KIND.special, name: "\u2B07\uFE0F \u4E0B\u8F7D/P2P", candidates: ["DIRECT"] }));
    }
    groups.push(policyGroup({
      kind: GROUP_KIND.special,
      name: "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D",
      candidates: [...PROXY_THEN_DIRECT]
    }));
    groups.push(...securityGroups(options.blockMode));
    if (chainEligible) {
      groups.push(subscriptionGroup(GROUP_KIND.chain, "\u{1F517} \u5165\u53E3\u8282\u70B9", ENTRY_FILTER, ["\u26A1 \u5165\u53E3\u81EA\u52A8"]));
    }
    return groups;
  }

  // group-catalog.js
  function shadowrocketPolicyTarget(candidate) {
    return candidate === POLICY_TARGET.primaryProxy ? "PROXY" : candidate;
  }
  function buildGroups(options, nodes) {
    return buildPolicyGroups(options, nodes).map((group) => ({
      name: group.name,
      type: group.strategy === "auto-test" ? "url-test" : group.strategy,
      items: group.candidates.map(shadowrocketPolicyTarget),
      useSubscription: group.nodeFilter === null ? void 0 : true,
      filter: group.nodeFilter ?? void 0,
      url: group.test?.url,
      interval: group.test?.interval,
      timeout: group.test?.timeout,
      tolerance: group.test?.tolerance,
      hidden: group.hidden,
      policySelectName: group.defaultChoice
    }));
  }

  // render-groups.js
  function escapeValue(value) {
    const string = String(value);
    if (/[\r\n]/.test(string)) throw new Error("Group field values must not contain CR or LF");
    return string.replaceAll(",", "\\,");
  }
  function escapeSubscriptionName(value) {
    const string = String(value);
    if (/[\r\n]/.test(string)) throw new Error("Subscription display name must not contain CR or LF");
    if (string.trim() !== string) {
      throw new Error("Subscription display name must not have leading or trailing whitespace");
    }
    return string.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
  }
  function renderGroups(groups, subscriptionName) {
    return groups.map((group) => {
      const items = (group.items ?? []).map(escapeValue);
      const fields = [escapeValue(group.type), ...items];
      if (group.useSubscription) {
        fields.push(escapeSubscriptionName(subscriptionName), "use=true");
      }
      if (group.filter !== void 0) fields.push(`policy-regex-filter=${escapeValue(group.filter)}`);
      if (group.policySelectName !== void 0) {
        fields.push(`policy-select-name=${escapeValue(group.policySelectName)}`);
      }
      if (group.url !== void 0) fields.push(`url=${escapeValue(group.url)}`);
      if (group.interval !== void 0) fields.push(`interval=${escapeValue(group.interval)}`);
      if (group.timeout !== void 0) fields.push(`timeout=${escapeValue(group.timeout)}`);
      if (group.tolerance !== void 0) fields.push(`tolerance=${escapeValue(group.tolerance)}`);
      if (group.hidden) fields.push("hidden=1");
      return `${escapeValue(group.name)} = ${fields.join(",")}`;
    });
  }

  // ../../../shared/rules/lightweight-policy.js
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
    domesticCoreEntries: 2e3,
    defaultEntries: 25e3,
    defaultBytes: 5e6,
    startupInlineEntries: 64,
    singBoxRuleRssBytes: 50 * 1024 * 1024,
    singBoxTotalRssBytes: 200 * 1024 * 1024
  });
  var ROUTING_PRECEDENCE = Object.freeze([
    "local",
    "security",
    "custom",
    "domesticCore",
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
    reject: "REJECT"
  });
  var SOURCE_POLICIES = Object.freeze({
    Hijacking: POLICY_TARGETS.reject,
    BlockHttpDNS: POLICY_TARGETS.reject,
    Privacy: "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A",
    DomesticCore: POLICY_TARGETS.direct,
    DomesticGame: POLICY_TARGETS.direct,
    BiliBili: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    ByteDance: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    XiaoHongShu: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    Weibo: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    OpenAI: "\u{1F916} AI \u4E13\u7528",
    Claude: "\u{1F916} AI \u4E13\u7528",
    Gemini: "\u{1F916} AI \u4E13\u7528",
    Copilot: "\u{1F916} AI \u4E13\u7528",
    GitHub: "\u{1F419} GitHub",
    YouTube: "\u{1F4FA} YouTube",
    Netflix: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    Disney: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    Spotify: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    GlobalMedia: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    Telegram: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    Facebook: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    Instagram: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    Twitter: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    TikTok: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
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

  // ../../../shared/rules/custom-rules.js
  var CUSTOM_RULE_PRECEDENCE_INDEX = ROUTING_PRECEDENCE.indexOf("custom");
  if (CUSTOM_RULE_PRECEDENCE_INDEX < 0 || CUSTOM_RULE_PRECEDENCE_INDEX > ROUTING_PRECEDENCE.indexOf("domesticCore")) {
    throw new Error("Custom rules must precede generated lightweight rules");
  }
  var CUSTOM_RULES = Object.freeze({
    block: Object.freeze([]),
    direct: Object.freeze([]),
    proxy: Object.freeze([]),
    ai: Object.freeze([
      "DOMAIN-SUFFIX,perplexity.ai",
      "DOMAIN-SUFFIX,pplx.ai",
      "DOMAIN-SUFFIX,x.ai",
      "DOMAIN-SUFFIX,grok.com",
      "DOMAIN-SUFFIX,poe.com",
      "DOMAIN-SUFFIX,poecdn.net"
    ])
  });

  // custom-rules.js
  var {
    block: CUSTOM_BLOCK,
    direct: CUSTOM_DIRECT,
    proxy: CUSTOM_PROXY,
    ai: CUSTOM_AI
  } = CUSTOM_RULES;

  // rule-validator.js
  var ALLOWED_TYPES = /* @__PURE__ */ new Set([
    "DOMAIN",
    "DOMAIN-SUFFIX",
    "DOMAIN-KEYWORD",
    "DOMAIN-WILDCARD",
    "IP-CIDR",
    "IP-CIDR6",
    "IP-ASN",
    "GEOIP",
    "USER-AGENT",
    "PROCESS-NAME",
    "URL-REGEX",
    "DST-PORT",
    "DEST-PORT",
    "SRC-IP-CIDR"
  ]);
  var LOGICAL_TYPES = /* @__PURE__ */ new Set(["AND", "OR", "NOT"]);
  var LOGICAL_LEAF_TYPES = /* @__PURE__ */ new Set([...ALLOWED_TYPES, "PROTOCOL", "RULE-SET"]);
  function isNonEmptyField(value) {
    return typeof value === "string" && value.length > 0 && value.trim() === value && !/[\r\n\0]/.test(value);
  }
  function isIpv4(value) {
    const parts = value.split(".");
    return parts.length === 4 && parts.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
  }
  function ipv6PartCount(parts) {
    let count = 0;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (/^[0-9a-f]{1,4}$/i.test(part)) {
        count += 1;
      } else if (index === parts.length - 1 && isIpv4(part)) {
        count += 2;
      } else {
        return -1;
      }
    }
    return count;
  }
  function isIpv6(value) {
    if (!value || value.includes("%") || (value.match(/::/g) ?? []).length > 1) return false;
    if (value.includes("::")) {
      const [left, right] = value.split("::");
      const leftParts = left ? left.split(":") : [];
      const rightParts = right ? right.split(":") : [];
      const count = ipv6PartCount(leftParts) + ipv6PartCount(rightParts);
      return ipv6PartCount(leftParts) >= 0 && ipv6PartCount(rightParts) >= 0 && count < 8;
    }
    const parts = value.split(":");
    return ipv6PartCount(parts) === 8;
  }
  function isDomainName(value) {
    if (!isNonEmptyField(value) || value.length > 253 || value.includes("..")) return false;
    return value.split(".").every((label) => /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/i.test(label));
  }
  function isWildcardDomain(value) {
    if (!isNonEmptyField(value) || value.length > 253 || value.includes("..")) return false;
    return value.split(".").every((label) => /^[a-z0-9_*?](?:[a-z0-9_*?-]{0,61}[a-z0-9_*?])?$/i.test(label));
  }
  function isCidr(value, family) {
    const parts = value.split("/");
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return false;
    const prefix = Number(parts[1]);
    if (family === 4) return isIpv4(parts[0]) && prefix >= 0 && prefix <= 32;
    return isIpv6(parts[0]) && prefix >= 0 && prefix <= 128;
  }
  function isPort(value) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(value);
    if (!match) return false;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    return start >= 1 && end <= 65535 && start <= end;
  }
  function isValidRegex(value) {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }
  function isDnsHostname(value) {
    if (!value || value.length > 253 || value.includes("..")) return false;
    return value.split(".").every((label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
  }
  function isUrlPort(value) {
    return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
  }
  function isHttpUrl(value) {
    if (typeof value !== "string" || /[\s\0]/.test(value)) return false;
    const scheme = /^https?:\/\//i.exec(value);
    if (!scheme) return false;
    const remainder = value.slice(scheme[0].length);
    const boundary = remainder.search(/[/?#]/);
    const authority = boundary === -1 ? remainder : remainder.slice(0, boundary);
    if (!authority || authority.includes("@")) return false;
    if (authority.startsWith("[")) {
      const close = authority.indexOf("]");
      if (close < 0 || !isIpv6(authority.slice(1, close))) return false;
      const suffix = authority.slice(close + 1);
      return suffix === "" || suffix.startsWith(":") && isUrlPort(suffix.slice(1));
    }
    if (authority.includes("[") || authority.includes("]")) return false;
    const firstColon = authority.indexOf(":");
    const lastColon = authority.lastIndexOf(":");
    if (firstColon !== lastColon) return false;
    const host = firstColon === -1 ? authority : authority.slice(0, firstColon);
    const port = firstColon === -1 ? null : authority.slice(firstColon + 1);
    if (port !== null && !isUrlPort(port)) return false;
    if (/^[0-9.]+$/.test(host)) return isIpv4(host);
    return isDnsHostname(host);
  }
  function topLevelFields(value) {
    const fields = [];
    let field = "";
    let depth = 0;
    let escaped = false;
    for (const character of value) {
      if (escaped) {
        field += character;
        escaped = false;
      } else if (character === "\\") {
        field += character;
        escaped = true;
      } else if (character === "(") {
        depth += 1;
        field += character;
      } else if (character === ")") {
        depth -= 1;
        if (depth < 0) return null;
        field += character;
      } else if (character === "," && depth === 0) {
        fields.push(field);
        field = "";
      } else {
        field += character;
      }
    }
    if (escaped || depth !== 0) return null;
    fields.push(field);
    return fields;
  }
  function parenthesizedInner(value) {
    if (!value.startsWith("(") || !value.endsWith(")")) return null;
    const fields = topLevelFields(value);
    if (!fields || fields.length !== 1) return null;
    return value.slice(1, -1);
  }
  function isValidLogicalLeaf(type, target) {
    if (!LOGICAL_LEAF_TYPES.has(type)) return false;
    if (ALLOWED_TYPES.has(type)) return isValidRuleLine(`${type},${target}`);
    if (type === "PROTOCOL") return /^(?:TCP|UDP)$/.test(target);
    return isHttpUrl(target);
  }
  function isLogicalOperand(value) {
    const inner = parenthesizedInner(value);
    if (!inner) return false;
    const fields = topLevelFields(inner);
    if (!fields || fields.some((field) => !isNonEmptyField(field))) return false;
    if (LOGICAL_TYPES.has(fields[0])) {
      const operands = fields.slice(1);
      const hasValidArity = fields[0] === "NOT" ? operands.length === 1 : operands.length >= 2;
      return hasValidArity && operands.every(isLogicalOperand);
    }
    if (!/^[A-Z][A-Z0-9-]*$/.test(fields[0]) || fields.length < 2) return false;
    return isValidLogicalLeaf(fields[0], fields.slice(1).join(","));
  }
  function isValidLogicalExpression(type, target) {
    if (type === "NOT" && isLogicalOperand(target)) return true;
    const inner = parenthesizedInner(target);
    if (!inner) return false;
    const operands = topLevelFields(inner);
    const hasValidArity = type === "NOT" ? operands?.length === 1 : operands?.length >= 2;
    return hasValidArity && operands.every(isLogicalOperand);
  }
  function isValidRuleTarget(type, target) {
    if (!ALLOWED_TYPES.has(type) || !isNonEmptyField(target)) return false;
    if (type === "DOMAIN" || type === "DOMAIN-SUFFIX") return isDomainName(target);
    if (type === "DOMAIN-WILDCARD") return isWildcardDomain(target);
    if (type === "IP-CIDR") return isCidr(target, 4) || isCidr(target, 6);
    if (type === "IP-CIDR6") return isCidr(target, 6);
    if (type === "SRC-IP-CIDR") return isCidr(target, 4) || isCidr(target, 6);
    if (type === "IP-ASN") return /^[1-9]\d*$/.test(target);
    if (type === "DST-PORT" || type === "DEST-PORT") return isPort(target);
    if (type === "GEOIP") return /^(?:[A-Z]{2}|LAN|PRIVATE)$/.test(target);
    if (type === "URL-REGEX") return isValidRegex(target);
    return true;
  }
  function isValidRuleLine(line) {
    if (!isNonEmptyField(line)) return false;
    const separator = line.indexOf(",");
    if (separator <= 0) return false;
    const type = line.slice(0, separator);
    const rawTarget = line.slice(separator + 1);
    if (!/^[A-Z][A-Z0-9-]*$/.test(type) || !isNonEmptyField(rawTarget)) return false;
    if (LOGICAL_TYPES.has(type)) return isValidLogicalExpression(type, rawTarget);
    if (!ALLOWED_TYPES.has(type)) return false;
    const [target, ...tail] = rawTarget.split(",");
    const hasValidIpTail = tail.length === 0 || tail.length === 1 && tail[0] === "no-resolve";
    if (["IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR", "IP-ASN"].includes(type)) {
      return hasValidIpTail && isValidRuleTarget(type, target);
    }
    if (type === "URL-REGEX") return isValidRuleTarget(type, rawTarget);
    return tail.length === 0 && isValidRuleTarget(type, target);
  }

  // render-rules.js
  var PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
  var LOCAL_RULES = Object.freeze([
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,home.arpa,DIRECT",
    "DOMAIN-SUFFIX,lan,DIRECT",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
    "IP-CIDR6,::1/128,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
    "IP-CIDR6,ff00::/8,DIRECT,no-resolve"
  ]);
  var CUSTOM_RULES2 = Object.freeze([
    Object.freeze(["CUSTOM_BLOCK", CUSTOM_BLOCK, "REJECT"]),
    Object.freeze(["CUSTOM_DIRECT", CUSTOM_DIRECT, "DIRECT"]),
    Object.freeze(["CUSTOM_PROXY", CUSTOM_PROXY, "\u{1F680} \u8282\u70B9\u9009\u62E9"]),
    Object.freeze(["CUSTOM_AI", CUSTOM_AI, "\u{1F916} AI \u4E13\u7528"])
  ]);
  var RULE_DOWNLOAD_POLICY = "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D";
  function isSafeCustomField(value) {
    return typeof value === "string" && value.length > 0 && value.trim() === value && !/[\r\n,=]/.test(value);
  }
  function validateCustomRules(customRules) {
    if (!Array.isArray(customRules)) throw new Error("Invalid custom rule configuration");
    const seen = /* @__PURE__ */ new Set();
    for (const entry of customRules) {
      if (!Array.isArray(entry) || entry.length !== 3 || !isSafeCustomField(entry[0]) || !Array.isArray(entry[1]) || !isSafeCustomField(entry[2])) {
        throw new Error("Invalid custom rule configuration");
      }
      for (const rule of entry[1]) {
        if (typeof rule !== "string" || /[\r\n]/.test(rule) || rule.trim() !== rule) {
          throw new Error("Invalid custom rule");
        }
        if (rule.split(",").length !== 2 || !isValidRuleLine(rule)) {
          throw new Error("Invalid custom rule");
        }
        if (seen.has(rule)) throw new Error("Duplicate custom rule");
        seen.add(rule);
      }
    }
  }
  function safeBaseUrl(value) {
    if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
      throw new Error("Shadowrocket rule base URL must be an HTTPS URL without commas");
    }
    const match = /^https:\/\/([^/]+)(\/[^?#]*)$/u.exec(value);
    if (!match) {
      throw new Error("Shadowrocket rule base URL is invalid");
    }
    const hostname = match[1];
    const labels = hostname.split(".");
    if (hostname.includes(":") || hostname.includes("@") || labels.some((label) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label))) {
      throw new Error("Shadowrocket rule base URL must be a plain HTTPS publication URL");
    }
    const normalized = value.replace(/\/+$/u, "");
    if (!normalized.endsWith("/shadowrocket/rules")) {
      throw new Error("Shadowrocket rule base URL must end in /shadowrocket/rules");
    }
    return Object.freeze({ url: normalized, hostname });
  }
  function optionalAdblockBase(defaultBase) {
    const optional = defaultBase.replace(
      /\/shadowrocket\/rules$/u,
      "/optional/adblock-full/shadowrocket/rules"
    );
    if (optional === defaultBase) {
      throw new Error("Shadowrocket rule base URL must end in /shadowrocket/rules");
    }
    return optional;
  }
  function sourceUrl(source, base, optionalBase) {
    const selectedBase = source.id === "Advertising" || source.id === "Advertising_Domain" ? optionalBase : base;
    if (!selectedBase) throw new Error("Shadowrocket optional rule URL is unavailable");
    return `${selectedBase}/${source.id}.list`;
  }
  function renderRuleSet(source, base, optionalBase) {
    return `${source.inputFormat},${sourceUrl(source, base, optionalBase)},${source.policy},update-interval=86400`;
  }
  function ruleBaseUrlForChannel(channel) {
    if (channel !== "edge" && channel !== "current") {
      throw new Error(`Unsupported Shadowrocket publication channel: ${channel}`);
    }
    return `${PUBLIC_RULE_ROOT}/${channel}/shadowrocket/rules`;
  }
  function renderRules({ ruleBaseUrl, adblockMode = "off" } = {}) {
    validateCustomRules(CUSTOM_RULES2);
    const base = safeBaseUrl(ruleBaseUrl);
    const plan = orderedRoutingPlan({ adblockMode });
    const optionalBase = adblockMode === "full" ? optionalAdblockBase(base.url) : null;
    const render = (source) => renderRuleSet(source, base.url, optionalBase);
    const lines = [
      ...LOCAL_RULES,
      "# Security rules",
      ...plan.filter(({ phase }) => phase === "security").map(render),
      "# Custom rules"
    ];
    for (const [name, rules, policy] of CUSTOM_RULES2) {
      lines.push(`# ${name}`);
      lines.push(...rules.map((rule) => `${rule},${policy}`));
    }
    lines.push(
      "# Rule-download fallback transport",
      `DOMAIN,${base.hostname},${RULE_DOWNLOAD_POLICY}`
    );
    for (const phase of ROUTING_PHASES.filter((value) => value !== "security")) {
      lines.push(...plan.filter((source) => source.phase === phase).map(render));
    }
    lines.push("GEOIP,CN,DIRECT", "FINAL,\u{1F680} \u8282\u70B9\u9009\u62E9");
    return lines;
  }

  // render-profile.js
  var NODE_REFRESH_SECONDS = 21600;
  var RULE_REFRESH_SECONDS = 86400;
  function renderProfile(rawOptions, nodes, { ruleBaseUrl } = {}) {
    const options = parseOptions(rawOptions);
    const inventory = Array.isArray(nodes) ? nodes : [];
    const hasChainedNodes = inventory.some((node) => nodeMetadata(node).chained === true);
    const hasEligibleEntry = inventory.some((node) => nodeMetadata(node).entry === true && nodeMetadata(node).chained !== true);
    if (options.clientChain === "off" && hasChainedNodes) {
      throw new Error("clientChain=off rejects an inventory containing chained nodes");
    }
    if (options.clientChain === "on" && hasChainedNodes && !hasEligibleEntry) {
      throw new Error("clientChain=on requires an eligible unchained entry for chained nodes");
    }
    const header = [
      "# Generated by shadowrocket-profile. Do not paste credentials into this file.",
      `# platform=${options.platform}; node-count=${inventory.length}; node-refresh=${NODE_REFRESH_SECONDS}; rule-refresh=${RULE_REFRESH_SECONDS}`
    ].join("\n");
    const groups = renderGroups(buildGroups(options, inventory), options.subscriptionName).join("\n");
    return [
      header,
      `[General]
${generalSettings(options).join("\n")}`,
      `[Proxy Group]
${groups}`,
      `[Rule]
${renderRules({
        ruleBaseUrl: ruleBaseUrl ?? ruleBaseUrlForChannel(options.channel),
        adblockMode: options.adblockMode
      }).join("\n")}`
    ].join("\n\n") + "\n";
  }

  // validate-profile.js
  var BUILTIN_POLICIES = /* @__PURE__ */ new Set(["DIRECT", "REJECT", "PROXY"]);
  var GROUP_TYPES = /* @__PURE__ */ new Set(["select", "url-test", "fallback", "load-balance", "random"]);
  var REQUIRED_SECTIONS = /* @__PURE__ */ new Set(["General", "Proxy Group", "Rule"]);
  var SIMPLE_RULE_TYPES = /* @__PURE__ */ new Set([
    "DOMAIN",
    "DOMAIN-SUFFIX",
    "DOMAIN-KEYWORD",
    "DOMAIN-WILDCARD",
    "IP-CIDR",
    "IP-CIDR6",
    "SRC-IP-CIDR",
    "IP-ASN",
    "GEOIP",
    "USER-AGENT",
    "PROCESS-NAME",
    "URL-REGEX",
    "DST-PORT",
    "DEST-PORT"
  ]);
  var IP_RULE_TYPES = /* @__PURE__ */ new Set(["IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR"]);
  function escapedCommaFields(value) {
    const fields = [];
    let field = "";
    let escaped = false;
    for (const character of value) {
      if (escaped) {
        field += character;
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === ",") {
        fields.push(field);
        field = "";
      } else {
        field += character;
      }
    }
    if (escaped) field += "\\";
    fields.push(field);
    return fields;
  }
  function sectionsFrom(profile, errors) {
    const sections = /* @__PURE__ */ new Map();
    let active;
    for (const line of profile.replaceAll("\r\n", "\n").split("\n")) {
      const match = /^\[([^\]]+)\]$/.exec(line);
      if (match) {
        active = match[1];
        if (!REQUIRED_SECTIONS.has(active)) errors.add(`Unrecognized section: ${active}`);
        if (!sections.has(active)) {
          sections.set(active, []);
        } else if (REQUIRED_SECTIONS.has(active)) {
          errors.add(`Duplicate required section: ${active}`);
        } else {
          errors.add(`Duplicate section: ${active}`);
        }
        continue;
      }
      if (active) sections.get(active).push(line);
    }
    for (const required of REQUIRED_SECTIONS) {
      if (!sections.has(required)) errors.add(`Missing required section: ${required}`);
    }
    return sections;
  }
  function parseGroups(lines, errors) {
    const groups = /* @__PURE__ */ new Map();
    for (const line of lines ?? []) {
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) {
        errors.add(`Invalid proxy group: ${line}`);
        continue;
      }
      const nameFields = escapedCommaFields(line.slice(0, separator).trim());
      const name = nameFields[0];
      const fields = escapedCommaFields(line.slice(separator + 1).trim());
      if (nameFields.length !== 1 || !name || !GROUP_TYPES.has(fields[0])) {
        errors.add(`Invalid proxy group: ${name || line}`);
        continue;
      }
      if (groups.has(name)) {
        errors.add(`Duplicate group: ${name}`);
        continue;
      }
      groups.set(name, fields);
    }
    return groups;
  }
  function groupReferences(groups, errors) {
    const graph = new Map([...groups.keys()].map((name) => [name, []]));
    for (const [name, fields] of groups) {
      const useIndex = fields.lastIndexOf("use=true");
      const staticEnd = useIndex > 1 ? useIndex - 1 : useIndex === -1 ? fields.length : 1;
      const staticItems = [];
      for (let index = 1; index < staticEnd; index += 1) {
        const item = fields[index];
        if (!item || item.includes("=")) continue;
        staticItems.push(item);
        if (BUILTIN_POLICIES.has(item)) continue;
        if (groups.has(item)) {
          graph.get(name).push(item);
        } else {
          errors.add(`Missing group reference: ${name} -> ${item}`);
        }
      }
      const subscriptionSource = useIndex > 1 ? fields[useIndex - 1] : "";
      const hasSubscription = subscriptionSource.length > 0;
      const includesAllProxies = fields.includes("include-all-proxies=true");
      const filtersDynamicPolicies = fields.some((field) => field.startsWith("policy-regex-filter="));
      if (filtersDynamicPolicies && !hasSubscription && !includesAllProxies) {
        errors.add(`Filtered group requires include-all-proxies=true or a subscription source: ${name}`);
      }
      if (staticItems.length === 0 && !hasSubscription && !includesAllProxies) {
        errors.add(`Group requires a selectable item or subscription source: ${name}`);
      }
    }
    return graph;
  }
  function detectCycles(graph, errors) {
    const visiting = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    function visit(name) {
      if (visiting.has(name)) {
        errors.add(`Group cycle: ${[...visiting, name].join(" -> ")}`);
        return;
      }
      if (visited.has(name)) return;
      visiting.add(name);
      for (const reference of graph.get(name) ?? []) visit(reference);
      visiting.delete(name);
      visited.add(name);
    }
    for (const name of graph.keys()) visit(name);
  }
  function validPolicy(policy, groups) {
    return BUILTIN_POLICIES.has(policy) || groups.has(policy);
  }
  function validatePolicy(kind, policy, groups, errors) {
    if (!policy) {
      errors.add(`${kind} policy is missing`);
    } else if (!validPolicy(policy, groups)) {
      errors.add(`${kind} policy references missing group: ${policy}`);
    }
  }
  function isControlTail(field) {
    return field === "no-resolve" || field.includes("=");
  }
  function validateSimpleRule(type, fields, groups, errors) {
    if (fields.length < 3 || !fields[1]) {
      errors.add(`Malformed ${type} rule`);
      return;
    }
    if (!isValidRuleTarget(type, fields[1])) errors.add(`Malformed ${type} rule`);
    validatePolicy(type, fields[2], groups, errors);
    const tail = fields.slice(3);
    if (!IP_RULE_TYPES.has(type) && tail.length > 0 || IP_RULE_TYPES.has(type) && tail.some((field) => !isControlTail(field))) {
      errors.add(`Malformed ${type} rule`);
    }
  }
  function topLevelFields2(value) {
    const fields = [];
    let field = "";
    let depth = 0;
    let escaped = false;
    for (const character of value) {
      if (escaped) {
        field += character;
        escaped = false;
      } else if (character === "\\") {
        field += character;
        escaped = true;
      } else if (character === "(") {
        depth += 1;
        field += character;
      } else if (character === ")") {
        depth -= 1;
        if (depth < 0) return null;
        field += character;
      } else if (character === "," && depth === 0) {
        fields.push(field);
        field = "";
      } else {
        field += character;
      }
    }
    if (escaped || depth !== 0) return null;
    fields.push(field);
    return fields;
  }
  function validateLogicalRule(type, rule, groups, errors) {
    const topLevel = topLevelFields2(rule);
    const escapedFields = escapedCommaFields(rule);
    const policy = topLevel?.length === 3 ? escapedFields.at(-1) : "";
    if (!topLevel || topLevel.length !== 3 || topLevel[0] !== type) {
      errors.add(`Malformed ${type} rule`);
      validatePolicy(type, "", groups, errors);
      return;
    }
    if (!isValidRuleLine(`${type},${topLevel[1]}`)) errors.add(`Malformed ${type} rule`);
    validatePolicy(type, policy, groups, errors);
  }
  function validateRules(lines, groups, errors) {
    const rules = (lines ?? []).filter((line) => line && !line.startsWith("#"));
    const geoipIndex = rules.indexOf("GEOIP,CN,DIRECT");
    const finalIndex = rules.findIndex((line) => line.startsWith("FINAL,"));
    if (geoipIndex === -1) errors.add("Missing exact GEOIP,CN,DIRECT rule");
    if (finalIndex === -1) errors.add("Missing FINAL rule");
    if (geoipIndex !== -1 && finalIndex !== -1 && geoipIndex > finalIndex) {
      errors.add("GEOIP,CN,DIRECT must appear before FINAL");
    }
    for (const rule of rules) {
      const fields = escapedCommaFields(rule);
      const type = fields[0];
      if (SIMPLE_RULE_TYPES.has(type)) {
        validateSimpleRule(type, fields, groups, errors);
      } else if (type === "RULE-SET" || type === "DOMAIN-SET") {
        if (fields.length < 3 || !fields[1]) errors.add(`Malformed ${type} rule`);
        validatePolicy(type, fields[2], groups, errors);
        if (fields.slice(3).some((field) => !field.includes("="))) errors.add(`Malformed ${type} rule`);
      } else if (type === "FINAL") {
        if (fields.length !== 2) errors.add("Malformed FINAL rule");
        validatePolicy("FINAL", fields[1], groups, errors);
      } else if (["AND", "OR", "NOT"].includes(type)) {
        validateLogicalRule(type, rule, groups, errors);
      } else {
        errors.add(`Unknown rule type: ${type || "(empty)"}`);
      }
    }
  }
  function validateProfile(profile) {
    const errors = /* @__PURE__ */ new Set();
    if (typeof profile !== "string") {
      return { valid: false, errors: ["Profile must be a string"] };
    }
    const sections = sectionsFrom(profile, errors);
    const groups = parseGroups(sections.get("Proxy Group"), errors);
    const graph = groupReferences(groups, errors);
    detectCycles(graph, errors);
    validateRules(sections.get("Rule"), groups, errors);
    const result = [...errors];
    return { valid: result.length === 0, errors: result };
  }

  // substore-profile-entry.js
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseOptions(context.arguments ?? {});
    if (options.output !== "config") throw new Error("output must be config");
    if (typeof context.produceArtifact !== "function") {
      throw new Error("produceArtifact is unavailable");
    }
    const nodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error("produceArtifact must return a non-empty node array");
    }
    const normalized = normalizeNodes(nodes, { clientChain: options.clientChain });
    const filtered = filterNodesForClient(normalized.nodes, CLIENT.shadowrocket);
    if (filtered.nodes.length === 0) {
      throw new Error("No compatible Shadowrocket nodes");
    }
    const profile = renderProfile(options, filtered.nodes, {
      ruleBaseUrl: ruleBaseUrlForChannel(options.channel)
    });
    if (!validateProfile(profile).valid) {
      throw new Error("Generated profile failed validation");
    }
    return { ...input, $content: profile };
  }
  return __toCommonJS(substore_profile_entry_exports);
})();

async function operator(input, targetPlatform) {
  return ShadowrocketProfileBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
