var OneXrayProfileBundle = (() => {
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

  // src/substore-profile-entry.js
  var substore_profile_entry_exports = {};
  __export(substore_profile_entry_exports, {
    buildPrivateOneXrayContext: () => buildPrivateOneXrayContext,
    runOneXrayProfileProcessor: () => runOneXrayProfileProcessor
  });

  // ../../shared/contracts.js
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
  var GENERATED_CHAIN_POLICY = "🔗 入口节点";
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
      clone.name = `🔗 ${clone.name}`;
      clone["underlying-proxy"] = "🔗 入口节点";
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
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).padStart(7, "0");
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
      flag: "🇨🇳",
      continent: CONTINENT.asiaPacific,
      terms: ["CN", "PEK", "PVG", "CAN", "China", "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "中国", "北京", "上海", "广州", "深圳"]
    },
    { flag: "🇭🇰", continent: CONTINENT.asiaPacific, terms: ["HK", "HKG", "Hong Kong", "香港"] },
    { flag: "🇲🇴", continent: CONTINENT.asiaPacific, terms: ["MO", "MFM", "Macau", "Macao", "澳门"] },
    { flag: "🇹🇼", continent: CONTINENT.asiaPacific, terms: ["TW", "TPE", "Taiwan", "Taipei", "台湾", "台北"] },
    { flag: "🇯🇵", continent: CONTINENT.asiaPacific, terms: ["JP", "NRT", "HND", "KIX", "Japan", "Tokyo", "Osaka", "日本", "东京", "大阪"] },
    { flag: "🇰🇷", continent: CONTINENT.asiaPacific, terms: ["KR", "ICN", "Korea", "Seoul", "韩国", "首尔"] },
    { flag: "🇸🇬", continent: CONTINENT.asiaPacific, terms: ["SG", "SIN", "Singapore", "新加坡"] },
    { flag: "🇲🇾", continent: CONTINENT.asiaPacific, terms: ["MY", "KUL", "Malaysia", "Kuala Lumpur", "马来西亚", "吉隆坡"] },
    { flag: "🇹🇭", continent: CONTINENT.asiaPacific, terms: ["TH", "BKK", "Thailand", "Bangkok", "泰国", "曼谷"] },
    { flag: "🇵🇭", continent: CONTINENT.asiaPacific, terms: ["PH", "MNL", "Philippines", "Manila", "菲律宾", "马尼拉"] },
    { flag: "🇮🇩", continent: CONTINENT.asiaPacific, terms: ["ID", "CGK", "Indonesia", "Jakarta", "印度尼西亚", "雅加达"] },
    { flag: "🇦🇺", continent: CONTINENT.asiaPacific, terms: ["AU", "SYD", "MEL", "Australia", "Sydney", "Melbourne", "澳大利亚", "悉尼", "墨尔本"] },
    { flag: "🇮🇳", continent: CONTINENT.asiaPacific, terms: ["IN", "BOM", "DEL", "India", "Mumbai", "Delhi", "印度", "孟买", "德里"] },
    { flag: "🇩🇪", continent: CONTINENT.europe, terms: ["DE", "FRA", "Germany", "Frankfurt", "德国", "法兰克福"] },
    { flag: "🇬🇧", continent: CONTINENT.europe, terms: ["GB", "UK", "LHR", "Britain", "United Kingdom", "London", "英国", "伦敦"] },
    { flag: "🇫🇷", continent: CONTINENT.europe, terms: ["FR", "CDG", "France", "Paris", "法国", "巴黎"] },
    { flag: "🇳🇱", continent: CONTINENT.europe, terms: ["NL", "AMS", "Netherlands", "Amsterdam", "荷兰", "阿姆斯特丹"] },
    { flag: "🇨🇭", continent: CONTINENT.europe, terms: ["CH", "ZRH", "Switzerland", "Zurich", "瑞士", "苏黎世"] },
    { flag: "🇮🇹", continent: CONTINENT.europe, terms: ["IT", "MXP", "Italy", "Milan", "意大利", "米兰"] },
    { flag: "🇪🇸", continent: CONTINENT.europe, terms: ["ES", "MAD", "Spain", "Madrid", "西班牙", "马德里"] },
    { flag: "🇸🇪", continent: CONTINENT.europe, terms: ["SE", "ARN", "Sweden", "Stockholm", "瑞典", "斯德哥尔摩"] },
    { flag: "🇺🇸", continent: CONTINENT.americas, terms: ["US", "USA", "LAX", "SJC", "SEA", "IAD", "JFK", "America", "United States", "美国", "洛杉矶", "圣何塞", "西雅图", "华盛顿", "纽约"] },
    { flag: "🇨🇦", continent: CONTINENT.americas, terms: ["CA", "YVR", "YYZ", "Canada", "加拿大", "温哥华", "多伦多"] },
    { flag: "🇧🇷", continent: CONTINENT.americas, terms: ["BR", "GRU", "Brazil", "巴西", "圣保罗"] }
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
    return { flag: "🌐", continent: CONTINENT.other, warning: null };
  }

  // ../../shared/nodes/source-labels.js
  var PROVENANCE_FIELDS = [
    "_subDisplayName",
    "_subName",
    "_collectionDisplayName",
    "_collectionName"
  ];
  var SOURCE_LABELS = /* @__PURE__ */ new Map([
    ["机场", { kind: SOURCE_KIND.airport, label: "机场" }],
    ["自建", { kind: SOURCE_KIND.selfHosted, label: "自建" }],
    ["realm", { kind: SOURCE_KIND.realm, label: "Realm" }],
    ["链式代理", { kind: SOURCE_KIND.serverChain, label: "链式代理" }],
    ["落地", { kind: SOURCE_KIND.landing, label: "落地" }]
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
      label: "未知",
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
    return cleaned || "未命名节点";
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
    for (const [baseName2, group] of groups) {
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
        const protocolBase = multipleProtocols && protocolLabel ? `${baseName2} ${protocolLabel}` : baseName2;
        if (protocolGroup.length === 1) {
          if (protocolBase !== baseName2) protocolGroup[0].name = protocolBase;
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
      const sourceSuffix = source.kind === SOURCE_KIND.unknown ? "" : "｜" + source.label;
      const capabilitySuffix = [
        existingChain ? "链" : "",
        udp ? "U" : ""
      ].filter(Boolean).join("·");
      cloned.name = region.flag + " " + cleanDisplayName(original.name, cloned.type) + sourceSuffix + (capabilitySuffix ? "·" + capabilitySuffix : "");
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
  function decodeBase64UrlUtf8(value) {
    const bytes = decodeBase64Url(value);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new TypeError("Base64URL value is not valid UTF-8");
    }
  }
  function encodeBase64Url(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new TypeError("Base64URL input must be bytes");
    let result = "";
    for (let index = 0; index < bytes.length; index += 3) {
      const first = bytes[index];
      const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
      const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
      result += ALPHABET[first >> 2];
      result += ALPHABET[(first & 3) << 4 | second >> 4];
      if (index + 1 < bytes.length) result += ALPHABET[(second & 15) << 2 | third >> 6];
      if (index + 2 < bytes.length) result += ALPHABET[third & 63];
    }
    return result;
  }
  function encodeBase64UrlUtf8(value) {
    if (typeof value !== "string") throw new TypeError("Base64URL text input must be a string");
    return encodeBase64Url(new TextEncoder().encode(value));
  }

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET = /^NODE:(.*)$/iu;
  var BASE64URL = /^[A-Za-z0-9_-]+$/u;
  var LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
  function frozenTarget(id, label, alias, defaultTarget) {
    return Object.freeze({
      id,
      label,
      aliases: Object.freeze([alias, id]),
      defaultTarget
    });
  }
  var BUSINESS_TARGETS = Object.freeze([
    frozenTarget("ai", "🤖 AI 专用", "AI 专用", "FOLLOW"),
    frozenTarget("github", "🐙 GitHub", "GitHub", "FOLLOW"),
    frozenTarget("youtube", "📺 YouTube", "YouTube", "FOLLOW"),
    frozenTarget("globalMedia", "🎬 海外流媒体", "海外流媒体", "FOLLOW"),
    frozenTarget("globalSocial", "💬 海外社交", "海外社交", "FOLLOW"),
    frozenTarget("apple", "🍎 Apple", "Apple", "DIRECT"),
    frozenTarget("microsoft", "🪟 Microsoft", "Microsoft", "DIRECT"),
    frozenTarget("domestic", "🇨🇳 国内平台", "国内平台", "DIRECT"),
    frozenTarget("overseasGame", "🌍 海外游戏", "海外游戏", "FOLLOW"),
    frozenTarget("download", "⬇️ 下载/P2P", "下载/P2P", "DIRECT"),
    frozenTarget("dnsAndRules", "🧭 DNS 与规则下载", "DNS 与规则下载", "FOLLOW"),
    frozenTarget("final", "最终兜底", "最终兜底", "FOLLOW")
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
  function assertUniqueJsonObjectKeys(text) {
    let index = 0;
    const syntaxError = () => {
      throw new SyntaxError("invalid JSON");
    };
    const skipWhitespace = () => {
      while (/[\u0020\t\r\n]/u.test(text[index])) index += 1;
    };
    const parseString = () => {
      if (text[index] !== '"') syntaxError();
      const start = index;
      index += 1;
      while (index < text.length) {
        const character = text[index++];
        if (character === '"') return JSON.parse(text.slice(start, index));
        if (character === "\\") {
          const escape = text[index++];
          if (escape === "u") {
            for (let count = 0; count < 4; count += 1) {
              if (!/[0-9a-f]/iu.test(text[index++])) syntaxError();
            }
          } else if (!'"\\/bfnrt'.includes(escape)) {
            syntaxError();
          }
        } else if (character.charCodeAt(0) < 32) {
          syntaxError();
        }
      }
      syntaxError();
    };
    const parseValue = () => {
      skipWhitespace();
      if (text[index] === "{") {
        index += 1;
        skipWhitespace();
        const keys = /* @__PURE__ */ new Set();
        if (text[index] === "}") {
          index += 1;
          return;
        }
        while (true) {
          skipWhitespace();
          const key = parseString();
          if (keys.has(key)) throw new SyntaxError("duplicate JSON key");
          keys.add(key);
          skipWhitespace();
          if (text[index++] !== ":") syntaxError();
          parseValue();
          skipWhitespace();
          if (text[index] === "}") {
            index += 1;
            return;
          }
          if (text[index++] !== ",") syntaxError();
        }
      }
      if (text[index] === "[") {
        index += 1;
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return;
        }
        while (true) {
          parseValue();
          skipWhitespace();
          if (text[index] === "]") {
            index += 1;
            return;
          }
          if (text[index++] !== ",") syntaxError();
        }
      }
      if (text[index] === '"') {
        parseString();
        return;
      }
      for (const literal of ["true", "false", "null"]) {
        if (text.startsWith(literal, index)) {
          index += literal.length;
          return;
        }
      }
      const number2 = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
      if (!number2) syntaxError();
      index += number2[0].length;
    };
    parseValue();
    skipWhitespace();
    if (index !== text.length) syntaxError();
  }
  function decodeBase64url(encoded) {
    if (typeof encoded !== "string") throw policyError("must be a Base64URL string");
    if (encoded === "") return Object.freeze({});
    if (!BASE64URL.test(encoded) || encoded.length % 4 === 1) {
      throw policyError("must be a Base64URL string");
    }
    let text;
    try {
      text = decodeBase64UrlUtf8(encoded);
    } catch {
      throw policyError("must contain UTF-8 JSON");
    }
    let parsed;
    try {
      assertUniqueJsonObjectKeys(text);
      parsed = JSON.parse(text);
    } catch {
      throw policyError("must contain JSON object");
    }
    if (parsed === null || Array.isArray(parsed) || Object.getPrototypeOf(parsed) !== Object.prototype) {
      throw policyError("must contain a JSON object");
    }
    return parsed;
  }
  function canonicalTarget(target, value) {
    if (typeof value !== "string") throw targetError(target, "target must be a string");
    if (TARGET_KEYWORD.test(value)) return value.toUpperCase();
    const node = NODE_TARGET.exec(value);
    if (!node || node[1].trim().length === 0 || LINE_TERMINATOR.test(node[1])) {
      throw targetError(target, "target must be FOLLOW, DIRECT, or NODE:<name>");
    }
    return `NODE:${node[1]}`;
  }
  function parseBusinessOverrides(encoded) {
    const values = decodeBase64url(encoded);
    const overrides = {};
    for (const [key, value] of Object.entries(values)) {
      const target = businessTargetByKey(key);
      if (!target) throw policyError("contains an unknown business key");
      const canonical = canonicalTarget(target, value);
      if (Object.hasOwn(overrides, target.id) && overrides[target.id] !== canonical) {
        throw targetError(target, "has conflicting aliases");
      }
      overrides[target.id] = canonical;
    }
    return Object.freeze(overrides);
  }

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
    defaultProxy: "🚀 节点选择",
    overseasGame: "🌍 海外游戏",
    reject: "REJECT"
  });
  var SOURCE_POLICIES = Object.freeze({
    Hijacking: POLICY_TARGETS.reject,
    BlockHttpDNS: POLICY_TARGETS.reject,
    Privacy: "🕵️ 严格跟踪",
    DomesticCore: POLICY_TARGETS.direct,
    DomesticGame: POLICY_TARGETS.direct,
    BiliBili: "🇨🇳 国内平台",
    ByteDance: "🇨🇳 国内平台",
    XiaoHongShu: "🇨🇳 国内平台",
    Weibo: "🇨🇳 国内平台",
    OpenAI: "🤖 AI 专用",
    Claude: "🤖 AI 专用",
    Gemini: "🤖 AI 专用",
    Copilot: "🤖 AI 专用",
    GitHub: "🐙 GitHub",
    YouTube: "📺 YouTube",
    Netflix: "🎬 海外流媒体",
    Disney: "🎬 海外流媒体",
    Spotify: "🎬 海外流媒体",
    GlobalMedia: "🎬 海外流媒体",
    Telegram: "💬 海外社交",
    Facebook: "💬 海外社交",
    Instagram: "💬 海外社交",
    Twitter: "💬 海外社交",
    TikTok: "🎬 海外流媒体",
    Apple: "🍎 Apple",
    Microsoft: "🪟 Microsoft",
    SteamCN: POLICY_TARGETS.direct,
    OverseasGame: POLICY_TARGETS.overseasGame,
    Download: "⬇️ 下载/P2P",
    PrivateTracker: "⬇️ 下载/P2P",
    ChinaTLD: POLICY_TARGETS.direct,
    ChinaIP: POLICY_TARGETS.direct,
    Advertising: "🧱 常见广告",
    Advertising_Domain: "🧱 常见广告"
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

  // src/geodata-contract.js
  var CHANNELS = Object.freeze(["current", "previous", "edge"]);
  var CHANNEL_SUFFIX = Object.freeze({
    current: "Current",
    previous: "Previous",
    edge: "Edge"
  });
  var SOURCE_ID = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/u;
  var CODE = /^APP-[A-Z0-9]+(?:-[A-Z0-9]+)*$/u;
  function requiredChannel(channel) {
    if (typeof channel !== "string" || !CHANNELS.includes(channel)) {
      throw new TypeError(`OneXray GeoData channel must be current, previous, or edge: ${String(channel)}`);
    }
    return channel;
  }
  function oneXrayGeoNames(channel) {
    const suffix = CHANNEL_SUFFIX[requiredChannel(channel)];
    const names = {
      domain: `AppleProxySite${suffix}`,
      ip: `AppleProxyIP${suffix}`
    };
    Object.defineProperties(names, {
      site: { value: names.domain, enumerable: false },
      geosite: { value: names.domain, enumerable: false },
      geoip: { value: names.ip, enumerable: false }
    });
    return Object.freeze(names);
  }
  function oneXrayGeoCode(sourceId) {
    if (typeof sourceId !== "string" || sourceId.trim() !== sourceId || !SOURCE_ID.test(sourceId)) {
      throw new TypeError("OneXray GeoData source ID is invalid");
    }
    const normalized = sourceId.toUpperCase().replaceAll("_", "-");
    const code = `APP-${normalized}`;
    if (!CODE.test(code)) throw new TypeError("OneXray GeoData source ID is invalid");
    return code;
  }
  function oneXrayGeoReference(channel, type, sourceId) {
    const names = oneXrayGeoNames(channel);
    if (type !== "domain" && type !== "ip") throw new TypeError("OneXray GeoData type is invalid");
    return `ext:${names[type]}.dat:${oneXrayGeoCode(sourceId)}`;
  }

  // src/options.js
  var REQUIRED_KEYS = Object.freeze(["output", "type", "name"]);
  var DEFAULTS = Object.freeze({
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    clientChain: "off",
    clientChainTarget: "",
    policyOverrides: "",
    policyFile: "",
    logLevel: "warning",
    dnsLog: "off"
  });
  var OUTPUTS = /* @__PURE__ */ new Set(["nodes", "profile", "audit"]);
  var CHANNELS2 = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var LOG_LEVELS = /* @__PURE__ */ new Set(["none", "error", "warning", "info", "debug"]);
  var DNS_LOG_MODES = /* @__PURE__ */ new Set(["on", "off"]);
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, "channel", ...Object.keys(DEFAULTS)]);
  var NODE_TARGET2 = /^NODE:(.*)$/iu;
  var LINE_TERMINATOR2 = /[\r\n\u2028\u2029]/u;
  function optionError(key, message) {
    return new Error(`OneXray option '${key}' ${message}`);
  }
  function ownDataOptions(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("OneXray options must be a plain object");
    }
    if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) {
      throw new TypeError("OneXray options must be a plain object");
    }
    const values = /* @__PURE__ */ new Map();
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string" || PROTOTYPE_KEYS.has(key)) {
        throw new Error("OneXray options must not contain a prototype option");
      }
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor) {
        throw new Error("OneXray options must not contain an accessor option");
      }
      if (!descriptor.enumerable) throw new Error("OneXray options must not contain a hidden option");
      if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown OneXray option '${key}'`);
      if (descriptor.value === void 0) throw optionError(key, "must not be undefined");
      values.set(key, descriptor.value);
    }
    return values;
  }
  function requiredSingleLine(values, key) {
    if (!values.has(key)) throw optionError(key, "is required");
    const value = values.get(key);
    if (typeof value !== "string" || value.length === 0 || LINE_TERMINATOR2.test(value)) {
      throw optionError(key, "must be a non-empty single-line string");
    }
    return value;
  }
  function enumValue(values, key, allowed, defaultValue) {
    const value = values.has(key) ? values.get(key) : defaultValue;
    if (typeof value !== "string" || !(allowed instanceof Set ? allowed.has(value) : allowed.includes(value))) {
      throw optionError(key, "has an unsupported value");
    }
    return value;
  }
  function chainTarget(values) {
    const value = values.has("clientChainTarget") ? values.get("clientChainTarget") : DEFAULTS.clientChainTarget;
    if (typeof value !== "string") throw optionError("clientChainTarget", "must be a string");
    if (value === "") return value;
    const match = NODE_TARGET2.exec(value);
    if (!match || match[1].trim().length === 0 || LINE_TERMINATOR2.test(match[1])) {
      throw optionError("clientChainTarget", "must be NODE:<name>");
    }
    return `NODE:${match[1]}`;
  }
  function parseOneXrayOptions(raw) {
    const values = ownDataOptions(raw);
    const output = requiredSingleLine(values, "output");
    if (!OUTPUTS.has(output)) throw optionError("output", "has an unsupported value");
    const type = requiredSingleLine(values, "type");
    if (type !== "collection") throw optionError("type", "must be collection");
    const rawName = requiredSingleLine(values, "name");
    const name = rawName.trim();
    if (name.length === 0) throw optionError("name", "must not be blank");
    const clientChain = enumValue(values, "clientChain", OPTION_VALUES.clientChain, DEFAULTS.clientChain);
    const clientChainTarget = chainTarget(values);
    if (clientChain === "on" && clientChainTarget === "") {
      throw optionError("clientChainTarget", "is required when clientChain is on");
    }
    if (clientChain === "off" && clientChainTarget !== "") {
      throw optionError("clientChainTarget", "must be blank when clientChain is off");
    }
    const policyOverrides = values.has("policyOverrides") ? values.get("policyOverrides") : DEFAULTS.policyOverrides;
    if (typeof policyOverrides !== "string") throw optionError("policyOverrides", "must be a string");
    const policyFile = values.has("policyFile") ? values.get("policyFile") : DEFAULTS.policyFile;
    if (typeof policyFile !== "string") throw optionError("policyFile", "must be a string");
    if (policyFile !== "" && (LINE_TERMINATOR2.test(policyFile) || /[\/\\]/u.test(policyFile) || policyFile.trim() !== policyFile)) {
      throw optionError("policyFile", "must be a plain single-line Sub-Store file name");
    }
    if (policyFile !== "" && policyOverrides !== "") {
      throw optionError("policyFile", "cannot be combined with policyOverrides");
    }
    const logLevel = enumValue(values, "logLevel", LOG_LEVELS, DEFAULTS.logLevel);
    const dnsLog = enumValue(values, "dnsLog", DNS_LOG_MODES, DEFAULTS.dnsLog);
    return Object.freeze({
      output,
      type,
      name,
      channel: enumValue(values, "channel", CHANNELS2, DEFAULTS.channel),
      dnsMode: enumValue(values, "dnsMode", OPTION_VALUES.dnsMode, DEFAULTS.dnsMode),
      chinaDns: enumValue(values, "chinaDns", OPTION_VALUES.chinaDns, DEFAULTS.chinaDns),
      globalDns: enumValue(values, "globalDns", OPTION_VALUES.globalDns, DEFAULTS.globalDns),
      blockMode: enumValue(values, "blockMode", OPTION_VALUES.blockMode, DEFAULTS.blockMode),
      quicMode: enumValue(values, "quicMode", OPTION_VALUES.quicMode, DEFAULTS.quicMode),
      ipv6Mode: enumValue(values, "ipv6Mode", OPTION_VALUES.ipv6Mode, DEFAULTS.ipv6Mode),
      clientChain,
      clientChainTarget,
      policyOverrides,
      policyFile,
      logLevel,
      dnsLog
    });
  }

  // src/profile-codec.js
  var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function canonicalValue(value, seen = /* @__PURE__ */ new Set()) {
    if (value === null || typeof value !== "object") {
      if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("OneXray Profile contains a non-finite number");
      if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol" || value === void 0) {
        throw new TypeError("OneXray Profile contains a non-JSON value");
      }
      return value;
    }
    if (seen.has(value)) throw new TypeError("OneXray Profile must not contain cycles");
    seen.add(value);
    let result;
    if (Array.isArray(value)) result = value.map((entry) => canonicalValue(entry, seen));
    else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new TypeError("OneXray Profile must contain plain objects");
      result = {};
      for (const key of Object.keys(value).sort()) result[key] = canonicalValue(value[key], seen);
    }
    seen.delete(value);
    return result;
  }
  function canonicalProfileJson(profile) {
    if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
      throw new TypeError("OneXray Profile must be an object");
    }
    return JSON.stringify(canonicalValue(profile));
  }
  function encodeStandardBase64(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new TypeError("OneXray Profile Base64 input must be bytes");
    let output = "";
    for (let index = 0; index < bytes.length; index += 3) {
      const first = bytes[index];
      const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
      const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
      output += BASE64[first >> 2];
      output += BASE64[(first & 3) << 4 | second >> 4];
      output += index + 1 < bytes.length ? BASE64[(second & 15) << 2 | third >> 6] : "=";
      output += index + 2 < bytes.length ? BASE64[third & 63] : "=";
    }
    return output;
  }

  // src/validate-profile.js
  var MAX_PROFILE_LINK_LENGTH = 32768;
  var CHANNELS3 = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var RESERVED_TAGS = /* @__PURE__ */ new Set([
    "proxy",
    "chainProxy",
    "direct",
    "fragment",
    "block",
    "dnsOut",
    "tunIn",
    "pingIn"
  ]);
  var DNS_TAGS = /* @__PURE__ */ new Set(["dns-global", "dns-china"]);
  var RUNTIME_OUTBOUND_TAGS = /* @__PURE__ */ new Set(["proxy"]);
  var INBOUND_TAGS = /* @__PURE__ */ new Set(["tunIn", "pingIn", "dnsOut"]);
  var TOP_LEVEL_KEYS = /* @__PURE__ */ new Set(["name", "log", "dns", "routing", "inbounds", "outbounds"]);
  var LOG_KEYS = /* @__PURE__ */ new Set(["loglevel", "dnsLog"]);
  var DNS_KEYS = /* @__PURE__ */ new Set(["servers"]);
  var DNS_SERVER_KEYS = /* @__PURE__ */ new Set(["tag", "address", "domains", "skipFallback"]);
  var ROUTING_KEYS = /* @__PURE__ */ new Set(["domainStrategy", "rules"]);
  var ROUTE_KEYS = /* @__PURE__ */ new Set(["type", "inboundTag", "domain", "ip", "network", "port", "outboundTag"]);
  var INBOUND_KEYS = /* @__PURE__ */ new Set(["tag", "protocol", "settings", "listen", "port"]);
  var OUTBOUND_KEYS = /* @__PURE__ */ new Set(["name", "protocol", "settings", "tag", "streamSettings", "mux"]);
  var STREAM_KEYS = /* @__PURE__ */ new Set([
    "network",
    "rawSettings",
    "wsSettings",
    "grpcSettings",
    "httpupgradeSettings",
    "xhttpSettings",
    "kcpSettings",
    "security",
    "tlsSettings",
    "realitySettings",
    "hysteriaSettings"
  ]);
  var TLS_KEYS = /* @__PURE__ */ new Set(["serverName", "alpn", "fingerprint"]);
  var REALITY_KEYS = /* @__PURE__ */ new Set(["fingerprint", "serverName", "publicKey", "shortId", "spiderX"]);
  var MUX_KEYS = /* @__PURE__ */ new Set(["enabled"]);
  var KNOWN_PROTOCOLS = /* @__PURE__ */ new Set(["vless", "vmess", "shadowsocks", "trojan", "socks", "http", "hysteria", "freedom", "blackhole", "dns"]);
  var CREDENTIAL_KEY = /(?:pass(?:word)?|token|secret|psk|private(?:[-_ ]?key)?|uuid|public(?:[-_ ]?key)?|auth|id)$/iu;
  var DIAGNOSTIC_KEY = /(?:diagnostic|debug|error|warning|excluded|accepted|subscription|policyoverride|policy_overrides)/iu;
  var PEM = /-----BEGIN [^-]+-----/u;
  var URL_SCHEME = /^(?:https?|vless|vmess|trojan|ss|socks(?:5)?|hysteria2?):\/\//iu;
  var EXT_REFERENCE = /^ext:([^./]+)\.(dat):([A-Z0-9]+(?:-[A-Z0-9]+)*)$/u;
  var APPROVED_DNS_URLS = /* @__PURE__ */ new Set([
    "https://dns.alidns.com/dns-query",
    "https://doh.pub/dns-query",
    "https://cloudflare-dns.com/dns-query",
    "https://dns.google/dns-query",
    "https://dns.quad9.net/dns-query"
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
      if (server.domains !== void 0 && !strings(server.domains, `${path}.domains`, errors)) continue;
      if (server.skipFallback !== void 0 && typeof server.skipFallback !== "boolean") add(errors, `${path}.skipFallback is invalid`);
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
        if (rule[key] !== void 0) strings(rule[key], `${path}.${key}`, errors);
      }
      if (rule.network !== void 0 && (typeof rule.network !== "string" || !/^(?:tcp|udp)(?:,(?:tcp|udp))*$/u.test(rule.network))) add(errors, `${path}.network is invalid`);
      if (rule.port !== void 0 && !(typeof rule.port === "string" && /^[0-9]+(?:-[0-9]+)?$/u.test(rule.port))) add(errors, `${path}.port must be a string`);
      if (typeof rule.outboundTag !== "string" || rule.outboundTag.length === 0) add(errors, `${path}.outboundTag is invalid`);
    }
  }
  function validateStream(stream, path, errors) {
    if (!keysOnly(stream, STREAM_KEYS, path, errors)) return;
    if (typeof stream.network !== "string") add(errors, `${path}.network is invalid`);
    if (stream.security !== void 0 && !["none", "tls", "reality"].includes(stream.security)) add(errors, `${path}.security is invalid`);
    if (stream.tlsSettings !== void 0) {
      if (!keysOnly(stream.tlsSettings, TLS_KEYS, `${path}.tlsSettings`, errors)) return;
      if (stream.tlsSettings.alpn !== void 0 && !strings(stream.tlsSettings.alpn, `${path}.tlsSettings.alpn`, errors)) return;
    }
    if (stream.realitySettings !== void 0) {
      if (!keysOnly(stream.realitySettings, REALITY_KEYS, `${path}.realitySettings`, errors)) return;
      if (typeof stream.realitySettings.fingerprint !== "string" || typeof stream.realitySettings.publicKey !== "string") add(errors, `${path}.realitySettings credentials are incomplete`);
    }
    for (const key of ["rawSettings", "wsSettings", "grpcSettings", "httpupgradeSettings", "xhttpSettings", "kcpSettings", "hysteriaSettings"]) {
      if (stream[key] !== void 0 && !object(stream[key])) add(errors, `${path}.${key} must be an object`);
    }
  }
  function validateSettings(protocol2, settings, path, errors) {
    if (!object(settings)) {
      if (!["freedom", "blackhole", "dns"].includes(protocol2)) add(errors, `${path} must be an object`);
      return;
    }
    const allowed = {
      vless: /* @__PURE__ */ new Set(["address", "port", "id", "flow", "encryption", "reverse"]),
      vmess: /* @__PURE__ */ new Set(["address", "port", "id", "security"]),
      shadowsocks: /* @__PURE__ */ new Set(["address", "port", "method", "password"]),
      trojan: /* @__PURE__ */ new Set(["address", "port", "password"]),
      socks: /* @__PURE__ */ new Set(["address", "port", "user", "pass"]),
      http: /* @__PURE__ */ new Set(["address", "port", "user", "pass", "headers"]),
      hysteria: /* @__PURE__ */ new Set(["version", "address", "port"]),
      freedom: /* @__PURE__ */ new Set(),
      blackhole: /* @__PURE__ */ new Set(),
      dns: /* @__PURE__ */ new Set()
    }[protocol2] ?? /* @__PURE__ */ new Set();
    if (!keysOnly(settings, allowed, path, errors)) return;
    if (protocol2 === "vless" && settings.reverse !== void 0 && (!object(settings.reverse) || Object.keys(settings.reverse).some((key) => key !== "tag") || typeof settings.reverse.tag !== "string")) add(errors, `${path}.reverse is invalid`);
    if (protocol2 === "http" && settings.headers !== void 0 && !object(settings.headers)) add(errors, `${path}.headers is invalid`);
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
      if (outbound.name !== void 0 && typeof outbound.name !== "string") add(errors, `${path}.name is invalid`);
      validateSettings(outbound.protocol, outbound.settings, `${path}.settings`, errors);
      if (outbound.streamSettings !== void 0) validateStream(outbound.streamSettings, `${path}.streamSettings`, errors);
      if (outbound.mux !== void 0 && (!keysOnly(outbound.mux, MUX_KEYS, `${path}.mux`, errors) || typeof outbound.mux.enabled !== "boolean")) add(errors, `${path}.mux.enabled is invalid`);
    }
  }
  function validateModel(profile, errors) {
    if (!keysOnly(profile, TOP_LEVEL_KEYS, "Profile", errors)) return;
    if (typeof profile.name !== "string" || profile.name.length === 0 || /[\r\n\u2028\u2029]/u.test(profile.name)) add(errors, "Profile.name is invalid");
    if (!keysOnly(profile.log, LOG_KEYS, "log", errors) || typeof profile.log.loglevel !== "string" || profile.log.dnsLog !== void 0 && typeof profile.log.dnsLog !== "boolean") add(errors, "log.loglevel is invalid");
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
    const all = /* @__PURE__ */ new Set();
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
    const required = /* @__PURE__ */ new Map([["direct", "freedom"], ["block", "blackhole"], ["dnsOut", "dns"]]);
    for (const [tag, protocol2] of required) {
      const matches = profile.outbounds.filter((outbound) => outbound?.tag === tag);
      if (matches.length !== 1) add(errors, `Profile requires exactly one ${tag} outbound`);
      else if (matches[0].protocol !== protocol2) add(errors, `${tag} outbound must use ${protocol2}`);
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
    const tags = /* @__PURE__ */ new Set([...inbounds.map((inbound) => inbound?.tag), ...INBOUND_TAGS]);
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
    const channel = CHANNELS3.has(context.channel) ? context.channel : "edge";
    const { names, codes } = geoCodes(context, channel);
    const allStrings = [];
    const seen = /* @__PURE__ */ new Set();
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
    if (context.chain?.landingTag !== void 0 && enabled && context.chain.landingTag !== "chainProxy") add(errors, "chain landing tag is invalid");
    try {
      const serialized = JSON.stringify(profile);
      if (serialized.includes("dialerProxy")) add(errors, "dialerProxy is not allowed in OneXray Profile");
    } catch {
      add(errors, "Profile contains a non-JSON value or cycle");
    }
  }
  function secretBoundary(profile, errors) {
    const seen = /* @__PURE__ */ new Set();
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
    const channel = CHANNELS3.has(context.channel) ? context.channel : "edge";
    const name = `Apple Proxy · OneXray · ${channel}`;
    const bytes = new TextEncoder().encode(canonical);
    const digest = "00000000";
    const encoded = encodeURIComponent(encodeStandardBase64(bytes));
    const fragment = encodeURIComponent(`${name} · ${digest}`);
    if (`onexray://onexray.com/config/add?type=profile&data=${encoded}#${fragment}`.length > MAX_PROFILE_LINK_LENGTH) add(errors, "OneXray Profile deep link exceeds 32 KiB");
  }
  function validateOneXrayProfile(profile, context = {}) {
    const errors = /* @__PURE__ */ new Set();
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
      const channel = CHANNELS3.has(context.channel) ? context.channel : "edge";
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
      encodedLengthAtMost: ![...errors].some((message) => /32 KiB|deep link/iu.test(message))
    };
    return Object.freeze({ valid: errors.size === 0, errors: [...errors], checks: Object.freeze(checks) });
  }

  // src/profile-link.js
  var CHANNELS4 = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var LINK_PREFIX = "onexray://onexray.com/config/add";
  var MAX_PROFILE_LINK_LENGTH2 = 32768;
  var NAME_PREFIX = "Apple Proxy · OneXray";
  var SHA256_K = Object.freeze([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function rotateRight(value, shift) {
    return value >>> shift | value << 32 - shift;
  }
  function sha256Hex(value) {
    const input = new TextEncoder().encode(value);
    const bitLength = input.length * 8;
    const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(input);
    padded[input.length] = 128;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296));
    view.setUint32(paddedLength - 4, bitLength >>> 0);
    const hash = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    const schedule = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let index = 0; index < 16; index += 1) schedule[index] = view.getUint32(offset + index * 4);
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotateRight(schedule[index - 15], 7) ^ rotateRight(schedule[index - 15], 18) ^ schedule[index - 15] >>> 3;
        const s1 = rotateRight(schedule[index - 2], 17) ^ rotateRight(schedule[index - 2], 19) ^ schedule[index - 2] >>> 10;
        schedule[index] = schedule[index - 16] + s0 + schedule[index - 7] + s1 >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choice = e & f ^ ~e & g;
        const temp1 = h + s1 + choice + SHA256_K[index] + schedule[index] >>> 0;
        const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = a & b ^ a & c ^ b & c;
        const temp2 = s0 + majority >>> 0;
        [h, g, f, e, d, c, b, a] = [g, f, e, d + temp1 >>> 0, c, b, a, temp1 + temp2 >>> 0];
      }
      hash[0] = hash[0] + a >>> 0;
      hash[1] = hash[1] + b >>> 0;
      hash[2] = hash[2] + c >>> 0;
      hash[3] = hash[3] + d >>> 0;
      hash[4] = hash[4] + e >>> 0;
      hash[5] = hash[5] + f >>> 0;
      hash[6] = hash[6] + g >>> 0;
      hash[7] = hash[7] + h >>> 0;
    }
    return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
  }
  function requiredChannel2(channel) {
    if (typeof channel !== "string" || !CHANNELS4.has(channel)) {
      throw new TypeError("OneXray Profile channel must be edge, current, or previous");
    }
    return channel;
  }
  function profileHash(profile) {
    return sha256Hex(canonicalProfileJson(profile)).slice(0, 8);
  }
  function baseName(channel) {
    return `${NAME_PREFIX} · ${requiredChannel2(channel)}`;
  }
  function buildOneXrayProfileLink(profile, channel) {
    requiredChannel2(channel);
    const expectedName = baseName(channel);
    if (profile?.name !== expectedName) throw new Error("OneXray Profile name must be the invariant channel base name");
    const validation = validateOneXrayProfile(profile, {
      channel,
      chain: { enabled: profile.outbounds?.some?.(({ tag }) => tag === "chainProxy") === true, landingTag: "chainProxy" }
    });
    if (!validation.valid) throw new Error(`OneXray Profile failed validation: ${validation.errors.join(", ")}`);
    const canonical = canonicalProfileJson(profile);
    const encoded = encodeURIComponent(encodeStandardBase64(new TextEncoder().encode(canonical)));
    const displayName = `${expectedName} · ${profileHash(profile)}`;
    const fragment = encodeURIComponent(displayName);
    const link = `${LINK_PREFIX}?type=profile&data=${encoded}#${fragment}`;
    if (link.length > MAX_PROFILE_LINK_LENGTH2) throw new RangeError("OneXray Profile deep link exceeds 32 KiB");
    return link;
  }

  // src/policy-sync.js
  function encodePolicyOverrides(policy) {
    if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
      throw new TypeError("OneXray policy must be a plain JSON object");
    }
    const text = JSON.stringify(policy);
    const encoded = encodeBase64UrlUtf8(text);
    parseBusinessOverrides(encoded);
    return encoded;
  }

  // src/render-audit.js
  var MAX_PROFILE_LINK_LENGTH3 = 32768;
  var HASH = /^[a-f0-9]{64}$/u;
  var AUDITED_PROTOCOLS = /* @__PURE__ */ new Set(["vless", "vmess", "ss", "trojan", "socks5", "http", "hysteria2"]);
  var SHA256_K2 = Object.freeze([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function rotateRight2(value, shift) {
    return value >>> shift | value << 32 - shift;
  }
  function sha256Hex2(value) {
    const input = new TextEncoder().encode(String(value));
    const bitLength = input.length * 8;
    const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(input);
    padded[input.length] = 128;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296));
    view.setUint32(paddedLength - 4, bitLength >>> 0);
    const hash = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    const schedule = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let index = 0; index < 16; index += 1) schedule[index] = view.getUint32(offset + index * 4);
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotateRight2(schedule[index - 15], 7) ^ rotateRight2(schedule[index - 15], 18) ^ schedule[index - 15] >>> 3;
        const s1 = rotateRight2(schedule[index - 2], 17) ^ rotateRight2(schedule[index - 2], 19) ^ schedule[index - 2] >>> 10;
        schedule[index] = schedule[index - 16] + s0 + schedule[index - 7] + s1 >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const s1 = rotateRight2(e, 6) ^ rotateRight2(e, 11) ^ rotateRight2(e, 25);
        const choice = e & f ^ ~e & g;
        const temp1 = h + s1 + choice + SHA256_K2[index] + schedule[index] >>> 0;
        const s0 = rotateRight2(a, 2) ^ rotateRight2(a, 13) ^ rotateRight2(a, 22);
        const majority = a & b ^ a & c ^ b & c;
        const temp2 = s0 + majority >>> 0;
        [h, g, f, e, d, c, b, a] = [g, f, e, d + temp1 >>> 0, c, b, a, temp1 + temp2 >>> 0];
      }
      hash[0] = hash[0] + a >>> 0;
      hash[1] = hash[1] + b >>> 0;
      hash[2] = hash[2] + c >>> 0;
      hash[3] = hash[3] + d >>> 0;
      hash[4] = hash[4] + e >>> 0;
      hash[5] = hash[5] + f >>> 0;
      hash[6] = hash[6] + g >>> 0;
      hash[7] = hash[7] + h >>> 0;
    }
    return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
  }
  function object2(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function number(value, fallback = 0) {
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  }
  function sortedCounts(value) {
    if (!object2(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, count]) => Number.isSafeInteger(count) && count >= 0).sort(([left], [right]) => left.localeCompare(right, "en")));
  }
  function mergeCounts(...buckets) {
    const result = {};
    for (const bucket of buckets) {
      for (const [key, count] of Object.entries(sortedCounts(bucket))) result[key] = (result[key] ?? 0) + count;
    }
    return sortedCounts(result);
  }
  function safeHash(value, fallback) {
    return typeof value === "string" && HASH.test(value) ? value : fallback;
  }
  function hashNodeName(name) {
    return sha256Hex2(typeof name === "string" ? name : "").slice(0, 12);
  }
  function safeNodeTarget(value) {
    if (typeof value !== "string" || !/^NODE:/u.test(value)) return null;
    const name = value.slice("NODE:".length);
    if (name.trim().length === 0 || /[\r\n\u2028\u2029]/u.test(name)) return null;
    return `NODE:<${hashNodeName(name)}>`;
  }
  function safeConfiguredTarget(value, fallback) {
    const candidate = value === void 0 ? fallback : value;
    if (candidate === "FOLLOW" || candidate === "DIRECT") return candidate;
    return safeNodeTarget(candidate) ?? "INVALID";
  }
  function publicTarget(target, fallback) {
    const configured = safeConfiguredTarget(target?.configured, fallback);
    const suppliedStatus = target?.status;
    const status = suppliedStatus === "follow" || suppliedStatus === "direct" || suppliedStatus === "fixed" ? suppliedStatus : "invalid";
    const resolved = typeof target?.resolvedTag === "string" ? target.resolvedTag : "";
    const resolvedFixed = /^ap-fixed-[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(resolved);
    return {
      configured,
      resolved: status === "fixed" && resolvedFixed ? `FIXED:<${hashNodeName(resolved)}>` : status === "direct" ? "DIRECT" : status === "follow" ? "FOLLOW" : "INVALID",
      status
    };
  }
  function businessSummary(resolution) {
    const targets = object2(resolution?.targets) ? resolution.targets : {};
    return BUSINESS_TARGETS.map((target) => ({
      id: target.id,
      label: target.label,
      ...publicTarget(targets[target.id], target.defaultTarget)
    }));
  }
  function fixedSummary(resolution) {
    const fixedNodes = Array.isArray(resolution?.fixedNodes) ? resolution.fixedNodes : [];
    const tags = fixedNodes.map((entry) => entry?.tag).filter((tag) => typeof tag === "string");
    const unique = tags.length === fixedNodes.length && new Set(tags).size === tags.length;
    const entries = fixedNodes.map((entry) => {
      let compatible = false;
      try {
        compatible = oneXrayNodeExclusionReason(entry?.node) === null;
      } catch {
        compatible = false;
      }
      return {
        protocol: AUDITED_PROTOCOLS.has(normalizeProtocol(entry?.node?.type)) ? normalizeProtocol(entry?.node?.type) : "unknown",
        tagHash: typeof entry?.tag === "string" ? hashNodeName(entry.tag) : null,
        unique: unique && typeof entry?.tag === "string",
        compatible
      };
    });
    return {
      count: entries.length,
      unique,
      compatible: entries.every(({ compatible }) => compatible),
      entries
    };
  }
  function protocolSummary(context) {
    if (object2(context.protocolCounts)) {
      return Object.fromEntries(Object.entries(context.protocolCounts).sort(([left], [right]) => left.localeCompare(right, "en")).map(([protocol2, value]) => [protocol2, {
        accepted: number(value?.accepted),
        excluded: number(value?.excluded)
      }]));
    }
    const normalized = Array.isArray(context.normalizedNodes) ? context.normalizedNodes : [];
    const eligible = new Set(Array.isArray(context.eligibleNodes) ? context.eligibleNodes : []);
    const values = {};
    for (const node of normalized) {
      const protocol2 = normalizeProtocol(node?.type) || "unknown";
      values[protocol2] ??= { accepted: 0, excluded: 0 };
      if (eligible.has(node)) values[protocol2].accepted += 1;
      else values[protocol2].excluded += 1;
    }
    return Object.fromEntries(Object.entries(values).sort(([left], [right]) => left.localeCompare(right, "en")));
  }
  function geoSummary(context, channel) {
    const names = oneXrayGeoNames(channel);
    const supplied = object2(context.geoHashes) ? context.geoHashes : object2(context.geoManifest?.hashes) ? context.geoManifest.hashes : {};
    const domain = safeHash(supplied.domain, null);
    const ip = safeHash(supplied.ip, null);
    return {
      domain,
      ip,
      available: domain !== null && ip !== null,
      domainName: names.domain,
      ipName: names.ip
    };
  }
  function profileSummary(context, fullHash) {
    const linkLength = typeof context.profileLink === "string" ? context.profileLink.length : 0;
    const channel = context.options?.channel;
    const ruleReleaseId = typeof context.ruleReleaseId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(context.ruleReleaseId) ? context.ruleReleaseId : `shared-lightweight-${channel}`;
    return {
      fullHash,
      shortVersion: fullHash.slice(0, 8),
      ruleReleaseId,
      geoData: geoSummary(context, channel),
      deepLink: {
        bytes: linkLength,
        limit: MAX_PROFILE_LINK_LENGTH3,
        withinBudget: linkLength > 0 && linkLength <= MAX_PROFILE_LINK_LENGTH3,
        budgetState: linkLength > 0 && linkLength <= MAX_PROFILE_LINK_LENGTH3 ? "within" : "exceeded"
      }
    };
  }
  function validateContext(context) {
    if (!object2(context) || !object2(context.options) || !object2(context.profile)) {
      throw new TypeError("OneXray audit context is incomplete");
    }
    if (typeof context.options.channel !== "string") throw new TypeError("OneXray audit channel is missing");
  }
  function renderOneXrayAuditUnsafe(context) {
    validateContext(context);
    let canonical;
    try {
      canonical = canonicalProfileJson(context.profile);
    } catch {
      throw new Error("OneXray audit: invalid-profile");
    }
    const fullHash = sha256Hex2(canonical);
    const normalized = context.normalizedDiagnostics ?? {};
    const eligible = context.eligibleDiagnostics ?? {};
    const accepted = number(eligible.accepted);
    const inputTotal = number(normalized.total, accepted + Object.values(mergeCounts(normalized.excluded, eligible.excluded)).reduce((sum, count) => sum + count, 0));
    const excluded = Math.max(0, inputTotal - accepted);
    const report = {
      schema: "onexray-routing-audit-v1",
      client: "OneXray",
      language: "zh-CN",
      nodes: {
        total: inputTotal,
        normalized: number(normalized.accepted),
        accepted,
        excluded,
        perProtocol: protocolSummary(context)
      },
      exclusionReasons: mergeCounts(normalized.excluded, eligible.excluded),
      policy: {
        businesses: businessSummary(context.resolution),
        fixed: fixedSummary(context.resolution),
        chain: {
          enabled: context.resolution?.chain?.enabled === true,
          entryCount: number(context.resolution?.chain?.entryCount),
          landingDisplayName: context.resolution?.chain?.enabled === true ? safeNodeTarget(`NODE:${context.resolution?.finalOutbound?.node?.name ?? ""}`) ?? "INVALID" : "未启用"
        }
      },
      runtime: {
        dns: {
          mode: context.options.dnsMode,
          chinaProvider: context.options.chinaDns,
          globalProvider: context.options.globalDns,
          routing: { china: "direct", global: "proxy" }
        },
        ipv6: context.options.ipv6Mode,
        quic: context.options.quicMode,
        block: context.options.blockMode
      },
      profile: profileSummary(context, fullHash)
    };
    return `${JSON.stringify(report, null, 2)}
`;
  }
  function renderOneXrayAudit(context = {}) {
    try {
      return renderOneXrayAuditUnsafe(context);
    } catch (error) {
      if (error instanceof Error && error.message === "OneXray audit: invalid-profile") throw error;
      throw new Error("OneXray audit: invalid-context");
    }
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

  // src/render-dns.js
  var DNS_INBOUND_TAG = "dnsOut";
  var TUN_INBOUND_TAG = "tunIn";
  function requiredObject(value, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`OneXray ${label} must be an object`);
    }
    return value;
  }
  function selectedProxySources(routingPlan) {
    if (!Array.isArray(routingPlan)) throw new TypeError("OneXray routing plan must be an array");
    return routingPlan.filter((entry) => entry?.dnsClass === "proxy").map((entry) => entry.id);
  }
  function geoSiteReference(geo, sourceId) {
    if (typeof geo.siteName !== "string" || geo.siteName.length === 0 || typeof geo.code !== "function") {
      throw new TypeError("OneXray GeoData must provide siteName and code");
    }
    const code = geo.code(sourceId);
    if (typeof code !== "string" || code.length === 0) throw new Error("OneXray GeoData returned an invalid code");
    return `ext:${geo.siteName}.dat:${code}`;
  }
  function dohHost(provider2) {
    return new URL(provider2.doh).hostname;
  }
  function resolverRule(provider2, outboundTag) {
    return [
      {
        type: "field",
        inboundTag: [DNS_INBOUND_TAG],
        domain: [`full:${provider2.serverName ?? dohHost(provider2)}`],
        outboundTag
      },
      { type: "field", inboundTag: [DNS_INBOUND_TAG], ip: [provider2.address], outboundTag }
    ];
  }
  function renderOneXrayDns({ options, routingPlan, geo } = {}) {
    requiredObject(options, "DNS options");
    requiredObject(geo, "GeoData");
    const china = chinaDnsProvider(options.chinaDns);
    const global = globalDnsProvider(options.globalDns);
    const explicitOverseas = selectedProxySources(routingPlan).map((sourceId) => geoSiteReference(geo, sourceId));
    const privacy = options.dnsMode === "privacy";
    const globalServer = {
      tag: "dns-global",
      address: global.doh,
      ...privacy ? {} : { domains: explicitOverseas },
      skipFallback: true
    };
    const chinaServer = {
      tag: "dns-china",
      address: china.doh,
      skipFallback: true
    };
    const rules = [
      { type: "field", inboundTag: [TUN_INBOUND_TAG], network: "tcp,udp", port: "53", outboundTag: DNS_INBOUND_TAG },
      ...options.chinaDns === "system" ? [] : resolverRule(china, "direct"),
      ...resolverRule(global, "proxy"),
      { type: "field", inboundTag: [DNS_INBOUND_TAG], outboundTag: "direct" }
    ];
    return { dns: { servers: [globalServer, chinaServer] }, rules };
  }

  // src/render-outbound.js
  var RESERVED_TAGS2 = /* @__PURE__ */ new Set([
    "proxy",
    "chainProxy",
    "direct",
    "fragment",
    "block",
    "dnsOut",
    "tunIn",
    "pingIn"
  ]);
  function optional(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target[key] = value;
  }
  function supportedNode(node) {
    const reason = oneXrayNodeExclusionReason(node);
    if (reason) throw new Error(reason);
  }
  function requiredTag(node, { tag, tags, allowDisplayTag = false } = {}) {
    if (typeof tag !== "string" || tag.length === 0 || tag.trim() !== tag || /[\r\n\u2028\u2029]/u.test(tag)) {
      throw new Error("invalid-onexray-tag");
    }
    if (RESERVED_TAGS2.has(tag)) throw new Error("reserved-onexray-tag");
    if (tag.includes(node.name) && !(allowDisplayTag === true && tag === node.name)) {
      throw new Error("duplicate-onexray-tag");
    }
    if (tags !== void 0) {
      if (!(tags instanceof Set)) throw new TypeError("OneXray tags must be a Set");
      if (tags.has(tag)) throw new Error("duplicate-onexray-tag");
      tags.add(tag);
    }
    return tag;
  }
  function tlsSettings(node) {
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) {
      throw new Error("unsupported-onexray-certificate-bypass");
    }
    const settings = {};
    optional(settings, "serverName", node.sni ?? node.servername);
    if (node.alpn !== void 0) settings.alpn = [...node.alpn];
    optional(settings, "fingerprint", node["client-fingerprint"]);
    return settings;
  }
  function realitySettings(node) {
    const reality = node["reality-opts"];
    if (!reality || typeof reality !== "object" || Array.isArray(reality)) {
      throw new Error("incomplete-onexray-reality");
    }
    const settings = {
      fingerprint: node["client-fingerprint"],
      publicKey: reality["public-key"] ?? reality["_public-key"]
    };
    optional(settings, "serverName", node.sni ?? node.servername);
    optional(settings, "shortId", reality["short-id"] ?? reality["_short-id"]);
    optional(settings, "spiderX", reality["spider-x"] ?? reality["_spider-x"]);
    return settings;
  }
  function transportSettings(node) {
    const network = String(node.network ?? "tcp").trim().toLowerCase();
    if (network === "tcp" || network === "raw") return { network: "raw", rawSettings: {} };
    if (network === "ws") {
      const options = node["ws-opts"] ?? {};
      const wsSettings = {};
      optional(wsSettings, "path", options.path);
      optional(wsSettings, "host", options.headers?.Host ?? options.headers?.host);
      return { network: "ws", wsSettings };
    }
    if (network === "grpc") {
      const grpcSettings = {};
      optional(grpcSettings, "serviceName", node["grpc-opts"]?.["grpc-service-name"]);
      return { network: "grpc", grpcSettings };
    }
    if (network === "httpupgrade") {
      const options = node["httpupgrade-opts"] ?? {};
      const httpupgradeSettings = {};
      optional(httpupgradeSettings, "host", options.host);
      optional(httpupgradeSettings, "path", options.path);
      return { network: "httpupgrade", httpupgradeSettings };
    }
    if (network === "xhttp") {
      const options = node["xhttp-opts"] ?? {};
      const xhttpSettings = {};
      optional(xhttpSettings, "host", options.host);
      optional(xhttpSettings, "path", options.path);
      optional(xhttpSettings, "mode", options.mode);
      optional(
        xhttpSettings,
        "packetEncoding",
        node["packet-encoding"] ?? options["packet-encoding"]
      );
      return { network: "xhttp", xhttpSettings };
    }
    if (network === "kcp") return { network: "kcp", kcpSettings: {} };
    throw new Error("unsupported-onexray-transport");
  }
  function streamSettings(node) {
    if (normalizeProtocol(node.type) === "hysteria2") {
      return {
        network: "hysteria",
        hysteriaSettings: { version: 2, auth: node.password },
        security: "tls",
        tlsSettings: tlsSettings(node)
      };
    }
    const stream = transportSettings(node);
    if (node.security === "reality" || node["reality-opts"] !== void 0) {
      stream.security = "reality";
      stream.realitySettings = realitySettings(node);
    } else if (node.tls === true || node.security === "tls") {
      stream.security = "tls";
      stream.tlsSettings = tlsSettings(node);
    } else {
      stream.security = "none";
    }
    return stream;
  }
  function endpoint(node) {
    return { address: node.server, port: node.port };
  }
  function renderVlessSettings(node) {
    const settings = { ...endpoint(node), id: node.uuid, encryption: node.encryption ?? "none" };
    optional(settings, "flow", node.flow);
    if (node.reverse !== void 0) settings.reverse = { tag: node.reverse.tag };
    return settings;
  }
  function renderVmessSettings(node) {
    return { ...endpoint(node), id: node.uuid, security: node.security ?? node.cipher ?? "auto" };
  }
  function renderShadowsocksSettings(node) {
    return { ...endpoint(node), method: node.cipher, password: node.password };
  }
  function renderTrojanSettings(node) {
    return { ...endpoint(node), password: node.password };
  }
  function renderSocksSettings(node) {
    const settings = endpoint(node);
    optional(settings, "user", node.username);
    optional(settings, "pass", node.password);
    return settings;
  }
  function renderHttpSettings(node) {
    const settings = renderSocksSettings(node);
    if (node.headers !== void 0) settings.headers = { ...node.headers };
    return settings;
  }
  function renderHysteriaSettings(node) {
    return { version: 2, ...endpoint(node) };
  }
  function protocolSettings(node) {
    switch (normalizeProtocol(node.type)) {
      case "vless":
        return ["vless", renderVlessSettings(node)];
      case "vmess":
        return ["vmess", renderVmessSettings(node)];
      case "ss":
        return ["shadowsocks", renderShadowsocksSettings(node)];
      case "trojan":
        return ["trojan", renderTrojanSettings(node)];
      case "socks5":
        return ["socks", renderSocksSettings(node)];
      case "http":
        return ["http", renderHttpSettings(node)];
      case "hysteria2":
        return ["hysteria", renderHysteriaSettings(node)];
      default:
        throw new Error("unsupported-onexray-protocol");
    }
  }
  function renderOneXrayOutbound(node, options) {
    supportedNode(node);
    const tag = requiredTag(node, options);
    const [protocol2, settings] = protocolSettings(node);
    return {
      name: node.name,
      protocol: protocol2,
      settings,
      tag,
      streamSettings: streamSettings(node),
      mux: { enabled: false }
    };
  }

  // ../../shared/rules/custom-rules.js
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

  // src/render-routing.js
  var RESERVED_RUNTIME_TAGS = /* @__PURE__ */ new Set([
    "proxy",
    "chainProxy",
    "direct",
    "fragment",
    "block",
    "dnsOut",
    "tunIn",
    "pingIn"
  ]);
  var BLOCK_MODES = /* @__PURE__ */ new Set(["balanced", "security", "strict", "off"]);
  var QUIC_MODES = /* @__PURE__ */ new Set(["allow", "proxy-block", "all-block"]);
  var DOMESTIC_SOURCES = /* @__PURE__ */ new Set([
    "DomesticCore",
    "DomesticGame",
    "SteamCN",
    "ChinaTLD",
    "ChinaIP"
  ]);
  var DOMESTIC_BUSINESS_SOURCES = /* @__PURE__ */ new Set(["BiliBili", "ByteDance", "XiaoHongShu", "Weibo"]);
  var SERVICE_INTENTS = Object.freeze({
    OpenAI: "ai",
    Claude: "ai",
    Gemini: "ai",
    Copilot: "ai",
    GitHub: "github",
    YouTube: "youtube",
    Netflix: "globalMedia",
    Disney: "globalMedia",
    Spotify: "globalMedia",
    GlobalMedia: "globalMedia",
    Telegram: "globalSocial",
    Facebook: "globalSocial",
    Instagram: "globalSocial",
    Twitter: "globalSocial",
    TikTok: "globalMedia",
    Apple: "apple",
    Microsoft: "microsoft",
    Download: "download",
    PrivateTracker: "download",
    OverseasGame: "overseasGame"
  });
  var SECURITY_CATEGORIES = Object.freeze({
    Hijacking: "threat",
    BlockHttpDNS: "threat",
    Advertising: "advertising",
    Advertising_Domain: "advertising",
    Privacy: "privacy"
  });
  var SECURITY_TARGETS = Object.freeze({
    off: Object.freeze({ threat: "direct", advertising: "direct", privacy: "direct" }),
    security: Object.freeze({ threat: "block", advertising: "direct", privacy: "direct" }),
    balanced: Object.freeze({ threat: "block", advertising: "block", privacy: "direct" }),
    strict: Object.freeze({ threat: "block", advertising: "block", privacy: "block" })
  });
  var PING_RULE = Object.freeze({ type: "field", inboundTag: ["pingIn"], outboundTag: "proxy" });
  var LOCAL_DOMAIN_RULE = Object.freeze({ type: "field", domain: ["geosite:private"], outboundTag: "direct" });
  var LOCAL_IP_RULE = Object.freeze({ type: "field", ip: ["geoip:private"], outboundTag: "direct" });
  function requiredObject2(value, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`OneXray ${label} must be an object`);
    }
    return value;
  }
  function requiredArray(value, label) {
    if (!Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an array`);
    return value;
  }
  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }
  function oneXrayPort(value) {
    if (value === void 0) return void 0;
    if (typeof value === "string") return value;
    if (Number.isSafeInteger(value) && value >= 1 && value <= 65535) return String(value);
    throw new TypeError(`OneXray routing port must be a string or a port number: ${String(value)}`);
  }
  function cloneRule(rule) {
    return { ...rule, ...rule.domain ? { domain: [...rule.domain] } : {}, ...rule.ip ? { ip: [...rule.ip] } : {}, ...rule.inboundTag ? { inboundTag: [...rule.inboundTag] } : {} };
  }
  function validateDnsRules(dnsRules) {
    const rules = requiredArray(dnsRules, "DNS rules");
    const seen = /* @__PURE__ */ new Set();
    let tunDnsCount = 0;
    for (const rule of rules) {
      requiredObject2(rule, "DNS rule");
      if (rule.type !== "field") throw new TypeError("OneXray DNS rule must use field type");
      for (const key2 of ["domain", "ip", "inboundTag"]) {
        if (rule[key2] !== void 0 && (!Array.isArray(rule[key2]) || rule[key2].length === 0)) {
          throw new Error(`OneXray DNS rule ${key2} payload must not be empty`);
        }
      }
      const key = stableStringify(rule);
      if (seen.has(key)) throw new Error("OneXray routing contains duplicate DNS prelude rule");
      seen.add(key);
      if (rule.inboundTag?.includes("tunIn") && rule.outboundTag === "dnsOut") tunDnsCount += 1;
    }
    if (tunDnsCount !== 1) throw new Error("OneXray routing requires exactly one TUN DNS hijack rule");
    return rules.map(cloneRule);
  }
  function validateOptions(options) {
    requiredObject2(options, "routing options");
    if (!BLOCK_MODES.has(options.blockMode)) throw new TypeError("OneXray blockMode is unsupported");
    if (!QUIC_MODES.has(options.quicMode)) throw new TypeError("OneXray quicMode is unsupported");
    return options;
  }
  function fixedTags(resolution) {
    const tags = /* @__PURE__ */ new Set(["proxy", "direct", "block"]);
    for (const fixed of requiredArray(resolution.fixedNodes ?? [], "fixed nodes")) {
      requiredObject2(fixed, "fixed node");
      if (typeof fixed.tag !== "string" || fixed.tag.length === 0) throw new TypeError("OneXray fixed node tag is invalid");
      if (RESERVED_RUNTIME_TAGS.has(fixed.tag)) throw new Error(`OneXray fixed node uses a reserved outbound tag: ${fixed.tag}`);
      tags.add(fixed.tag);
    }
    if (resolution.finalOutbound !== null && resolution.finalOutbound !== void 0) {
      requiredObject2(resolution.finalOutbound, "final outbound");
      if (typeof resolution.finalOutbound.tag !== "string" || resolution.finalOutbound.tag.length === 0) {
        throw new TypeError("OneXray final outbound tag is invalid");
      }
      if (RESERVED_RUNTIME_TAGS.has(resolution.finalOutbound.tag) && resolution.finalOutbound.tag !== "chainProxy") {
        throw new Error(`OneXray final outbound uses an invalid reserved tag: ${resolution.finalOutbound.tag}`);
      }
    }
    return tags;
  }
  function outboundTagForIntent(intent, resolution, tags = fixedTags(resolution)) {
    if (intent === "direct") return "direct";
    if (intent === "block") return "block";
    if (typeof intent !== "string" || !resolution.targets || !Object.hasOwn(resolution.targets, intent)) {
      throw new Error(`OneXray routing references unknown business intent: ${String(intent)}`);
    }
    const target = resolution.targets[intent];
    if (!target || typeof target.resolvedTag !== "string" || target.resolvedTag.length === 0) {
      throw new Error(`OneXray routing target is missing for business intent: ${intent}`);
    }
    if (!tags.has(target.resolvedTag)) {
      throw new Error(`OneXray routing target references a nonexistent outbound tag: ${target.resolvedTag}`);
    }
    return target.resolvedTag;
  }
  function sourceIntent(source, blockMode) {
    if (!source || typeof source.id !== "string") throw new TypeError("OneXray routing source is invalid");
    if (Object.hasOwn(SECURITY_CATEGORIES, source.id)) return SECURITY_TARGETS[blockMode][SECURITY_CATEGORIES[source.id]];
    if (DOMESTIC_BUSINESS_SOURCES.has(source.id)) return "domestic";
    if (DOMESTIC_SOURCES.has(source.id)) return "direct";
    if (Object.hasOwn(SERVICE_INTENTS, source.id)) return SERVICE_INTENTS[source.id];
    throw new Error(`OneXray routing source has unknown intent: ${source.id}`);
  }
  function sourceReference(channel, source) {
    const type = source.id === "ChinaIP" ? "ip" : "domain";
    return { type, value: oneXrayGeoReference(channel, type, source.id) };
  }
  function sourceRule(channel, source, outboundTag) {
    const reference = sourceReference(channel, source);
    return { type: "field", [reference.type]: [reference.value], outboundTag };
  }
  function customRuleField(entry) {
    if (typeof entry !== "string" || entry.length === 0) throw new TypeError("OneXray custom rule is invalid");
    const [kind, value, ...modifiers] = entry.split(",");
    if (!value || modifiers.some((modifier) => modifier !== "no-resolve")) throw new Error(`OneXray custom rule has an empty payload: ${entry}`);
    const fields = {
      DOMAIN: ["domain", `full:${value}`],
      "DOMAIN-SUFFIX": ["domain", `domain:${value}`],
      "DOMAIN-KEYWORD": ["domain", `keyword:${value}`],
      "IP-CIDR": ["ip", value],
      "IP-CIDR6": ["ip", value]
    };
    const field = fields[kind];
    if (!field) throw new Error(`OneXray custom rule has an unsupported kind: ${kind}`);
    return { type: "field", [field[0]]: [field[1]] };
  }
  function customRules(resolution, tags) {
    const rules = [];
    for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
      const intent = kind === "proxy" ? "final" : kind;
      const outboundTag = outboundTagForIntent(intent, resolution, tags);
      for (const entry of entries) {
        const rule = customRuleField(entry);
        rule.outboundTag = outboundTag;
        rules.push({ rule, proxyBound: outboundTag !== "direct" && outboundTag !== "block" });
      }
    }
    return rules;
  }
  function canCoalesce(left, right) {
    const leftKeys = Object.keys(left).filter((key) => key !== "domain" && key !== "ip");
    const rightKeys = Object.keys(right).filter((key) => key !== "domain" && key !== "ip");
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !rightKeys.includes(key))) return false;
    if (left.domain && right.domain) return leftKeys.every((key) => left[key] === right[key]);
    if (left.ip && right.ip) return leftKeys.every((key) => left[key] === right[key]);
    return false;
  }
  function appendRule(rules, rule) {
    const previous = rules.at(-1);
    if (previous && canCoalesce(previous, rule)) {
      const key = rule.domain ? "domain" : "ip";
      previous[key].push(...rule[key]);
      return;
    }
    rules.push(cloneRule(rule));
  }
  function quicRule(rule) {
    const matcher = rule.domain ? { domain: [...rule.domain] } : { ip: [...rule.ip] };
    return { type: "field", ...matcher, network: "udp", port: "443", outboundTag: "block" };
  }
  function addRouteRule(rules, rule, { quicMode, proxyBound }) {
    if (quicMode === "proxy-block" && proxyBound) rules.push(quicRule(rule));
    appendRule(rules, rule);
  }
  function validateRouteSemantics(rules) {
    for (const rule of rules) {
      if (rule.domain && rule.domain.length === 0) throw new Error("OneXray routing domain payload must not be empty");
      if (rule.ip && rule.ip.length === 0) throw new Error("OneXray routing IP payload must not be empty");
      if (rule.outboundTag === "" || rule.outboundTag === void 0) throw new Error("OneXray routing outbound target is empty");
    }
  }
  function renderOneXrayRouting({ options, resolution, dnsRules } = {}) {
    validateOptions(options);
    requiredObject2(resolution, "policy resolution");
    if (!resolution.targets || typeof resolution.targets !== "object" || Array.isArray(resolution.targets)) {
      throw new TypeError("OneXray policy resolution targets must be an object");
    }
    const tags = fixedTags(resolution);
    const rules = validateDnsRules(dnsRules);
    rules.push(cloneRule(PING_RULE));
    rules.push(cloneRule(LOCAL_DOMAIN_RULE));
    rules.push(cloneRule(LOCAL_IP_RULE));
    if (options.quicMode === "all-block") rules.push({ type: "field", network: "udp", port: "443", outboundTag: "block" });
    const plan = orderedRoutingPlan();
    const renderSource = (source) => {
      const intent = sourceIntent(source, options.blockMode);
      const outboundTag = outboundTagForIntent(intent, resolution, tags);
      const rule = sourceRule(options.channel, source);
      rule.outboundTag = outboundTag;
      addRouteRule(rules, rule, {
        quicMode: options.quicMode,
        proxyBound: outboundTag !== "direct" && outboundTag !== "block" && source.phase !== "security"
      });
    };
    for (const source of plan.filter(({ phase }) => phase === "security")) renderSource(source);
    for (const { rule, proxyBound } of customRules(resolution, tags)) {
      addRouteRule(rules, rule, { quicMode: options.quicMode, proxyBound });
    }
    for (const source of plan.filter(({ phase }) => phase !== "security")) renderSource(source);
    const finalTag = outboundTagForIntent("final", resolution, tags);
    if (options.quicMode === "proxy-block" && finalTag !== "direct" && finalTag !== "block") {
      rules.push({ type: "field", network: "udp", port: "443", outboundTag: "block" });
    }
    rules.push({ type: "field", network: "tcp,udp", outboundTag: finalTag });
    const normalizedRules = rules.map((rule) => rule.port === void 0 ? rule : { ...rule, port: oneXrayPort(rule.port) });
    validateRouteSemantics(normalizedRules);
    return { domainStrategy: "IPIfNonMatch", rules: normalizedRules };
  }

  // src/render-profile.js
  var CHANNELS5 = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  function requiredObject3(value, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an object`);
    return value;
  }
  function defaultGeo(channel) {
    const names = oneXrayGeoNames(channel);
    return {
      siteName: names.domain,
      code: oneXrayGeoCode
    };
  }
  function dnsResult(input, options, routingPlan, geo) {
    if (input.dnsResult && typeof input.dnsResult === "object") return input.dnsResult;
    if (input.dns && typeof input.dns === "object" && Object.hasOwn(input.dns, "dns") && Object.hasOwn(input.dns, "rules")) return input.dns;
    if (input.dns && typeof input.dns === "object" && Array.isArray(input.dns.servers)) {
      if (!Array.isArray(input.dnsRules)) throw new TypeError("OneXray Profile DNS rules are required");
      return { dns: input.dns, rules: input.dnsRules };
    }
    return renderOneXrayDns({ options, routingPlan, geo });
  }
  function routingResult(input, options, resolution, dnsRules) {
    if (input.routingResult && typeof input.routingResult === "object") return input.routingResult;
    if (input.routing && typeof input.routing === "object" && Array.isArray(input.routing.rules)) return input.routing;
    return renderOneXrayRouting({ options, resolution, dnsRules });
  }
  function systemOutbounds() {
    return [
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" },
      { protocol: "dns", tag: "dnsOut" }
    ];
  }
  function renderCustomOutbounds(resolution) {
    const fixedNodes = Array.isArray(resolution.fixedNodes) ? resolution.fixedNodes : [];
    const tags = /* @__PURE__ */ new Set();
    const fixed = fixedNodes.map((entry) => {
      requiredObject3(entry, "fixed outbound resolution");
      requiredObject3(entry.node, "fixed outbound node");
      return renderOneXrayOutbound(entry.node, { tag: entry.tag, tags, allowDisplayTag: true });
    });
    const chain = resolution.finalOutbound;
    if (chain !== null && chain !== void 0) {
      requiredObject3(chain, "chain landing resolution");
      requiredObject3(chain.node, "chain landing node");
      if (chain.tag !== "chainProxy") throw new Error("OneXray chain landing tag must be chainProxy");
      const landingTag = `ap-chain-${chain.node._profile?.id ?? "landing"}`;
      const landing = renderOneXrayOutbound(chain.node, { tag: landingTag, tags });
      landing.tag = "chainProxy";
      fixed.push(landing);
    }
    return fixed;
  }
  function validateChannel(channel) {
    if (typeof channel !== "string" || !CHANNELS5.has(channel)) throw new TypeError("OneXray Profile channel is invalid");
    return channel;
  }
  function renderOneXrayProfile(input = {}) {
    requiredObject3(input, "Profile input");
    const options = requiredObject3(input.options, "Profile options");
    const channel = validateChannel(options.channel);
    const resolution = requiredObject3(input.resolution, "policy resolution");
    const chainEnabled = resolution.chain?.enabled === true;
    if (options.clientChain === "on" !== chainEnabled) throw new Error("OneXray Profile chain option and policy resolution disagree");
    const routingPlan = input.routingPlan ?? orderedRoutingPlan();
    const geo = input.geo ?? defaultGeo(channel);
    const dns = dnsResult(input, options, routingPlan, geo);
    requiredObject3(dns, "DNS result");
    if (!dns.dns || !Array.isArray(dns.rules)) throw new TypeError("OneXray Profile DNS result is incomplete");
    const routing = routingResult(input, options, resolution, dns.rules);
    requiredObject3(routing, "routing result");
    if (!Array.isArray(routing.rules) || routing.domainStrategy !== "IPIfNonMatch") throw new TypeError("OneXray Profile routing result is incomplete");
    const profile = {
      name: `Apple Proxy · OneXray · ${channel}`,
      log: {
        loglevel: options.logLevel ?? "warning",
        ...options.dnsLog === "on" ? { dnsLog: true } : {}
      },
      dns: dns.dns,
      routing,
      // TUN and ping are materialized by OneXray's runtime, not the imported
      // profile. Keeping the section present makes this a native Profile while
      // avoiding platform-specific Raw Config fields.
      inbounds: [],
      outbounds: [...renderCustomOutbounds(resolution), ...systemOutbounds()]
    };
    const validation = validateOneXrayProfile(profile, {
      channel,
      geo,
      resolution,
      chain: resolution.chain
    });
    if (!validation.valid) throw new Error(`Generated OneXray Profile failed validation: ${validation.errors.join(", ")}`);
    return profile;
  }

  // src/resolve-policy.js
  var RESERVED_TAGS3 = /* @__PURE__ */ new Set([
    "proxy",
    "chainProxy",
    "direct",
    "fragment",
    "block",
    "dnsOut",
    "tunIn",
    "pingIn"
  ]);
  var GENERATED_TAG_PREFIXES = ["ap-fixed-"];
  var NODE_TARGET3 = /^NODE:(.*)$/u;
  var LINE_TERMINATOR3 = /[\r\n\u2028\u2029]/u;
  var STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
  function freezeTarget(target) {
    return Object.freeze(target);
  }
  function freezeFixedNode(fixed) {
    return Object.freeze(fixed);
  }
  function policyError2(message) {
    return new Error(`Invalid OneXray business policy: ${message}`);
  }
  function fixedTargetError(target, name, reason) {
    return policyError2(`${target.label}: ${name}: ${reason}`);
  }
  function chainError(name, reason) {
    return policyError2(`全局客户端链: ${name}: ${reason}`);
  }
  function nodeTargetName(value) {
    if (typeof value !== "string") return null;
    const match = NODE_TARGET3.exec(value);
    if (!match || match[1].trim().length === 0 || LINE_TERMINATOR3.test(match[1])) return null;
    return match[1];
  }
  function malformedTargetError(encoded) {
    if (typeof encoded !== "string" || !/^[A-Za-z0-9_-]+$/u.test(encoded)) return null;
    try {
      const parsed = JSON.parse(decodeBase64UrlUtf8(encoded));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      for (const [key, value] of Object.entries(parsed)) {
        const target = businessTargetByKey(key);
        if (!target || typeof value !== "string" || !/^NODE:/iu.test(value)) continue;
        const name = value.slice("NODE:".length).split(/[\r\n\u2028\u2029]/u, 1)[0];
        if (name.trim().length > 0) return fixedTargetError(target, name, "malformed fixed target");
      }
    } catch {
    }
    return null;
  }
  function parseOverrides(options) {
    try {
      return parseBusinessOverrides(options.policyOverrides);
    } catch (error) {
      const descriptive = malformedTargetError(options.policyOverrides);
      if (descriptive) throw descriptive;
      throw error;
    }
  }
  function inputNodes(value, label) {
    if (!Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an array`);
    return [...value];
  }
  function inspectNodes(allNodes, eligibleNodes) {
    const allIdentities = /* @__PURE__ */ new Set();
    for (const node of allNodes) {
      nodeMetadata(node);
      allIdentities.add(identityKey(node));
    }
    for (const node of eligibleNodes) {
      nodeMetadata(node);
      if (!allIdentities.has(identityKey(node))) {
        throw policyError2("compatible nodes must come from normalized nodes");
      }
    }
  }
  function candidatesByExactName(nodes, name) {
    return nodes.filter((node) => node.name === name);
  }
  function reservedNodeTag(name) {
    return RESERVED_TAGS3.has(name) || GENERATED_TAG_PREFIXES.some((prefix) => name.startsWith(prefix));
  }
  function fixedTag(node, target, name, assigned) {
    const id = nodeMetadata(node).id;
    if (typeof id !== "string" || !STABLE_ID.test(id)) {
      throw fixedTargetError(target, name, "missing stable normalized identity");
    }
    const tag = `ap-fixed-${id}`;
    if (RESERVED_TAGS3.has(tag)) throw fixedTargetError(target, name, "uses a reserved outbound tag");
    const prior = assigned.get(tag);
    if (prior && identityKey(prior) !== identityKey(node)) {
      throw fixedTargetError(target, name, "has a colliding stable outbound tag");
    }
    assigned.set(tag, node);
    return tag;
  }
  function resolveFixedTarget(target, configured, allNodes, eligibleNodes, assigned) {
    const name = nodeTargetName(configured);
    if (name === null) throw fixedTargetError(target, "", "malformed fixed target");
    if (reservedNodeTag(name)) throw fixedTargetError(target, name, "uses a reserved outbound tag");
    const allMatches = candidatesByExactName(allNodes, name);
    if (allMatches.length === 0) throw fixedTargetError(target, name, "normalized target is missing");
    if (allMatches.length !== 1) throw fixedTargetError(target, name, "normalized target is duplicated");
    const compatible = candidatesByExactName(eligibleNodes, name);
    if (compatible.length === 0) throw fixedTargetError(target, name, "normalized target is incompatible");
    if (compatible.length !== 1) throw fixedTargetError(target, name, "normalized target is duplicated");
    const node = compatible[0];
    const tag = fixedTag(node, target, name, assigned);
    return { node, tag };
  }
  function targetResolution(target, configured, allNodes, eligibleNodes, assigned, fixedByTag) {
    if (configured === "FOLLOW") return freezeTarget({ configured, resolvedTag: "proxy", status: "follow" });
    if (configured === "DIRECT") return freezeTarget({ configured, resolvedTag: "direct", status: "direct" });
    const fixed = resolveFixedTarget(target, configured, allNodes, eligibleNodes, assigned);
    if (!fixedByTag.has(fixed.tag)) fixedByTag.set(fixed.tag, freezeFixedNode(fixed));
    return freezeTarget({ configured, resolvedTag: fixed.tag, status: "fixed" });
  }
  function landingResolution(options, allNodes, eligibleNodes, homepageNodes) {
    if (options.clientChain === "off") {
      return { finalOutbound: null, chain: { enabled: false, landingTag: null, entryCount: homepageNodes.length } };
    }
    if (options.clientChain !== "on") throw policyError2("clientChain must be on or off");
    if (homepageNodes.length === 0) throw chainError("", "no compatible entry nodes");
    const name = nodeTargetName(options.clientChainTarget);
    if (name === null) throw chainError("", "malformed landing target");
    const allMatches = candidatesByExactName(allNodes, name);
    if (allMatches.length === 0) throw chainError(name, "normalized landing target is missing");
    const compatible = candidatesByExactName(eligibleNodes, name);
    if (compatible.length === 0) throw chainError(name, "normalized landing target is incompatible");
    if (compatible.length !== 1) throw chainError(name, "normalized landing target is duplicated");
    const node = compatible[0];
    const metadata = nodeMetadata(node);
    if (metadata.landing !== true && metadata.sourceKind !== "landing") {
      throw chainError(name, "normalized target is not a landing node");
    }
    if (metadata.chained === true || hasExistingChain(node)) {
      throw chainError(name, "landing target already has a chain");
    }
    if (homepageNodes.includes(node)) throw chainError(name, "landing target cannot be a homepage entry");
    return {
      finalOutbound: freezeFixedNode({ node, tag: "chainProxy" }),
      chain: { enabled: true, landingTag: "chainProxy", entryCount: homepageNodes.length }
    };
  }
  function resolveOneXrayPolicy({ options, allNodes, eligibleNodes } = {}) {
    if (!options || typeof options !== "object") throw new TypeError("OneXray options must be an object");
    const normalizedNodes = inputNodes(allNodes, "normalized nodes");
    const compatibleNodes = inputNodes(eligibleNodes, "compatible nodes");
    inspectNodes(normalizedNodes, compatibleNodes);
    const overrides = parseOverrides(options);
    const homepageNodes = options.clientChain === "on" ? compatibleNodes.filter((node) => nodeMetadata(node).entry === true) : compatibleNodes;
    const landing = landingResolution(options, normalizedNodes, compatibleNodes, homepageNodes);
    const assigned = /* @__PURE__ */ new Map();
    const fixedByTag = /* @__PURE__ */ new Map();
    const targets = {};
    for (const target of BUSINESS_TARGETS) {
      const configured = overrides[target.id] ?? target.defaultTarget;
      targets[target.id] = targetResolution(target, configured, normalizedNodes, compatibleNodes, assigned, fixedByTag);
    }
    return Object.freeze({
      homepageNodes: Object.freeze([...homepageNodes]),
      fixedNodes: Object.freeze([...fixedByTag.values()]),
      finalOutbound: landing.finalOutbound,
      targets: Object.freeze(targets),
      chain: Object.freeze(landing.chain)
    });
  }

  // src/substore-profile-entry.js
  var OUTPUTS2 = /* @__PURE__ */ new Set(["profile", "audit"]);
  var SHA256 = /^[a-f0-9]{64}$/u;
  function processorError(code) {
    return new Error(`OneXray profile: ${code}`);
  }
  function policyProcessorError(error) {
    let message = "";
    try {
      if (error && typeof error.message === "string") message = error.message;
    } catch {
      message = "";
    }
    const target = BUSINESS_TARGETS.find((entry) => message.includes(`${entry.label}:`));
    if (target) return processorError(`invalid-policy; 业务: ${target.label}`);
    if (message.includes("全局客户端链")) return processorError("invalid-policy; 全局客户端链");
    return processorError("invalid-policy");
  }
  function ownRequest(input) {
    try {
      if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error();
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) throw new Error();
      const values = {};
      for (const key of ["proxies", "arguments", "geoHashes", "geoManifest", "policy"]) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === void 0) continue;
        if ("get" in descriptor || "set" in descriptor) throw new Error();
        if (key === "policy" && descriptor.value !== void 0 && typeof descriptor.value !== "string") throw new Error();
        values[key] = descriptor.value;
      }
      const manifestHashes = readGeoHashes(values.geoManifest);
      const explicitHashes = readGeoHashes(values.geoHashes);
      values.geoHashes = Object.freeze({ ...manifestHashes, ...explicitHashes });
      delete values.geoManifest;
      return values;
    } catch {
      throw processorError("invalid-request");
    }
  }
  function readGeoHashes(value) {
    if (value === void 0) return {};
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error();
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    let source = value;
    if (Object.hasOwn(value, "hashes")) {
      source = value.hashes;
      if (source === null || typeof source !== "object" || Array.isArray(source)) throw new Error();
    }
    const result = {};
    for (const key of ["domain", "ip"]) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (descriptor === void 0) continue;
      if ("get" in descriptor || "set" in descriptor) throw new Error();
      if (typeof descriptor.value !== "string" || !SHA256.test(descriptor.value)) throw new Error();
      result[key] = descriptor.value;
    }
    return result;
  }
  function defaultGeo2(channel) {
    const names = oneXrayGeoNames(channel);
    return {
      siteName: names.domain,
      code: oneXrayGeoCode
    };
  }
  function copyCounts(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, count]) => Number.isSafeInteger(count) && count >= 0).sort(([left], [right]) => left.localeCompare(right, "en")));
  }
  function protocolCounts(normalizedNodes, eligibleNodes) {
    const eligible = new Set(eligibleNodes);
    const result = {};
    for (const node of normalizedNodes) {
      const protocol2 = typeof node?.type === "string" ? node.type.trim().toLowerCase() : "unknown";
      result[protocol2] ??= { accepted: 0, excluded: 0 };
      result[protocol2][eligible.has(node) ? "accepted" : "excluded"] += 1;
    }
    return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right, "en")));
  }
  function defineInternal(target, key, value) {
    Object.defineProperty(target, key, {
      value,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  function privateContext({ options, normalized, eligible, resolution, profile, profileLink, dns, routing, geo, geoHashes }) {
    const normalizedNodes = normalized.nodes;
    const eligibleNodes = eligible.nodes;
    const context = {
      normalizedDiagnostics: Object.freeze({
        total: normalized.diagnostics.total,
        accepted: normalized.diagnostics.accepted,
        protocol: Object.freeze(copyCounts(normalized.diagnostics.protocol)),
        excluded: Object.freeze(copyCounts(normalized.diagnostics.excluded))
      }),
      eligibleDiagnostics: Object.freeze({
        accepted: eligible.diagnostics.accepted,
        excluded: Object.freeze(copyCounts(eligible.diagnostics.excluded))
      }),
      protocolCounts: Object.freeze(protocolCounts(normalizedNodes, eligibleNodes)),
      ruleReleaseId: `shared-lightweight-${options.channel}`,
      geoHashes: Object.freeze({ ...geoHashes })
    };
    defineInternal(context, "options", options);
    defineInternal(context, "normalizedNodes", normalizedNodes);
    defineInternal(context, "eligibleNodes", eligibleNodes);
    defineInternal(context, "resolution", resolution);
    defineInternal(context, "profile", profile);
    defineInternal(context, "profileLink", profileLink);
    defineInternal(context, "dns", dns);
    defineInternal(context, "routing", routing);
    defineInternal(context, "geo", geo);
    return Object.freeze(context);
  }
  function resolvePolicyOverride(options, policyText) {
    if (policyText === void 0) {
      if (options.policyFile !== "") throw processorError("policy-file-unavailable");
      return options.policyOverrides;
    }
    if (options.policyFile === "") {
      throw processorError("policy-file-not-configured");
    }
    if (options.policyOverrides !== "") {
      throw processorError("policy-file-conflicts-with-policyOverrides");
    }
    let parsed;
    try {
      parsed = JSON.parse(policyText);
    } catch {
      throw processorError("invalid-policy-file-json");
    }
    try {
      return encodePolicyOverrides(parsed);
    } catch (error) {
      throw policyProcessorError(error);
    }
  }
  function buildPrivateOneXrayContext(rawArguments, proxies, { geoHashes = {}, policy } = {}) {
    let options;
    try {
      options = parseOneXrayOptions(rawArguments);
    } catch {
      throw processorError("invalid-arguments");
    }
    if (!OUTPUTS2.has(options.output)) throw processorError("unsupported-output");
    const policyOverrides = resolvePolicyOverride(options, policy);
    let normalized;
    try {
      normalized = normalizeNodes(proxies, { clientChain: options.clientChain });
    } catch {
      throw processorError("invalid-inventory");
    }
    let eligible;
    try {
      eligible = filterNodesForClient(normalized.nodes, CLIENT.onexray);
    } catch {
      throw processorError("invalid-inventory");
    }
    if (eligible.nodes.length === 0) throw processorError("no-compatible-nodes");
    let resolution;
    try {
      resolution = resolveOneXrayPolicy({
        options: { ...options, policyOverrides },
        allNodes: normalized.nodes,
        eligibleNodes: eligible.nodes
      });
    } catch (error) {
      throw policyProcessorError(error);
    }
    const routingPlan = orderedRoutingPlan();
    const geo = defaultGeo2(options.channel);
    let dns;
    let routing;
    let profile;
    let profileLink;
    try {
      dns = renderOneXrayDns({ options, routingPlan, geo });
      routing = renderOneXrayRouting({ options, resolution, dnsRules: dns.rules });
      profile = renderOneXrayProfile({
        options,
        resolution,
        routingPlan,
        geo,
        dns,
        routing
      });
      profileLink = buildOneXrayProfileLink(profile, options.channel);
    } catch {
      throw processorError("invalid-profile");
    }
    return privateContext({ options, normalized, eligible, resolution, profile, profileLink, dns, routing, geo, geoHashes });
  }
  function runOneXrayProfileProcessor(input = {}) {
    const { proxies, arguments: rawArguments, geoHashes, policy } = ownRequest(input);
    let context;
    try {
      context = buildPrivateOneXrayContext(rawArguments, proxies, { geoHashes, policy });
    } catch (error) {
      if (error instanceof Error && /^OneXray profile: /u.test(error.message)) throw error;
      throw processorError("invalid-profile");
    }
    const output = context.options.output;
    if (output === "profile") return `${context.profileLink}
`;
    if (output === "audit") {
      try {
        return renderOneXrayAudit(context);
      } catch {
        throw processorError("invalid-audit");
      }
    }
    throw processorError("unsupported-output");
  }
  return __toCommonJS(substore_profile_entry_exports);
})();
function snapshotArguments(raw) {
  try {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    const prototype = Object.getPrototypeOf(raw);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const snapshot = {};
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string") throw new Error();
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) throw new Error();
      Object.defineProperty(snapshot, key, {
        value: descriptor.value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return snapshot;
  } catch {
    throw new Error("OneXray profile: invalid-arguments");
  }
}

async function operator(input, targetPlatform) {
  void targetPlatform;
  const arguments_ = snapshotArguments($arguments);
  if (typeof produceArtifact !== "function") {
    throw new Error("OneXray profile: produce-artifact-unavailable");
  }
  const proxies = await produceArtifact({
    type: arguments_.type,
    name: arguments_.name,
    platform: "JSON",
    produceType: "internal",
  });

  let policy;
  if (typeof arguments_.policyFile === "string" && arguments_.policyFile.length > 0) {
    policy = await produceArtifact({
      type: "file",
      name: arguments_.policyFile,
      platform: "JSON",
      produceType: "internal",
    });
  }
  const content = OneXrayProfileBundle.runOneXrayProfileProcessor({
    proxies,
    arguments: arguments_,
    ...(policy === undefined ? {} : { policy }),
  });

  return { ...input, $content: content };
}
