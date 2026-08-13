var OneXrayNodesBundle = (() => {
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

  // src/substore-nodes-entry.js
  var substore_nodes_entry_exports = {};
  __export(substore_nodes_entry_exports, {
    runOneXrayNodesProcessor: () => runOneXrayNodesProcessor
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
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var LOG_LEVELS = /* @__PURE__ */ new Set(["none", "error", "warning", "info", "debug"]);
  var DNS_LOG_MODES = /* @__PURE__ */ new Set(["on", "off"]);
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, "channel", ...Object.keys(DEFAULTS)]);
  var NODE_TARGET = /^NODE:(.*)$/iu;
  var LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
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
    if (typeof value !== "string" || value.length === 0 || LINE_TERMINATOR.test(value)) {
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
    const match = NODE_TARGET.exec(value);
    if (!match || match[1].trim().length === 0 || LINE_TERMINATOR.test(match[1])) {
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
    if (policyFile !== "" && (LINE_TERMINATOR.test(policyFile) || /[\/\\]/u.test(policyFile) || policyFile.trim() !== policyFile)) {
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
      channel: enumValue(values, "channel", CHANNELS, DEFAULTS.channel),
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

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET2 = /^NODE:(.*)$/iu;
  var BASE64URL = /^[A-Za-z0-9_-]+$/u;
  var LINE_TERMINATOR2 = /[\r\n\u2028\u2029]/u;
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
      const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
      if (!number) syntaxError();
      index += number[0].length;
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
    const node = NODE_TARGET2.exec(value);
    if (!node || node[1].trim().length === 0 || LINE_TERMINATOR2.test(node[1])) {
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

  // src/resolve-policy.js
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
  var GENERATED_TAG_PREFIXES = ["ap-fixed-"];
  var NODE_TARGET3 = /^NODE:(.*)$/u;
  var LINE_TERMINATOR3 = /[\r\n\u2028\u2029]/u;
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
    return RESERVED_TAGS.has(name) || GENERATED_TAG_PREFIXES.some((prefix) => name.startsWith(prefix));
  }
  function fixedTag(node, target, name, assigned) {
    if (typeof name !== "string" || name.length === 0 || name.trim() !== name || LINE_TERMINATOR3.test(name)) {
      throw fixedTargetError(target, String(name), "invalid display tag");
    }
    if (reservedNodeTag(name)) throw fixedTargetError(target, name, "uses a reserved outbound tag");
    const prior = assigned.get(name);
    if (prior && identityKey(prior) !== identityKey(node)) {
      throw fixedTargetError(target, name, "has a colliding stable outbound tag");
    }
    assigned.set(name, node);
    return name;
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

  // src/render-subscription.js
  function homepageNodesFrom(resolution) {
    if (!resolution || typeof resolution !== "object" || !Array.isArray(resolution.homepageNodes)) {
      throw new Error("Invalid OneXray homepage resolution");
    }
    if (resolution.homepageNodes.length === 0) {
      throw new Error("No compatible OneXray homepage nodes");
    }
    return resolution.homepageNodes;
  }
  function renderOneXraySubscription(resolution) {
    const tags = /* @__PURE__ */ new Set();
    const names = /* @__PURE__ */ new Set();
    const outbounds = homepageNodesFrom(resolution).map((node) => {
      if (typeof node?.name !== "string" || node.name.length === 0) {
        throw new Error("Invalid OneXray homepage node name");
      }
      if (names.has(node.name)) throw new Error("Duplicate OneXray homepage node name");
      names.add(node.name);
      return renderOneXrayOutbound(node, {
        tag: node.name,
        tags,
        allowDisplayTag: true
      });
    });
    return `${JSON.stringify({ outbounds })}
`;
  }

  // src/substore-nodes-entry.js
  function formatExcludedCounts(excluded) {
    return Object.keys(excluded).sort((left, right) => left.localeCompare(right, "en")).map((reason) => `${reason}=${excluded[reason]}`).join(",");
  }
  function nodeOptions(raw) {
    const options = parseOneXrayOptions(raw);
    if (options.output !== "nodes") throw new Error("OneXray node output must be nodes");
    return options;
  }
  function processorError(code) {
    return new Error(`OneXray nodes: ${code}`);
  }
  function processorInput(input) {
    try {
      if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error();
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) throw new Error();
      const values = {};
      for (const key of ["proxies", "arguments", "onDiagnostics"]) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === void 0) continue;
        if ("get" in descriptor || "set" in descriptor) throw new Error();
        values[key] = descriptor.value;
      }
      return values;
    } catch {
      throw processorError("invalid-request");
    }
  }
  function diagnosticSummary(diagnostics) {
    return {
      accepted: diagnostics.accepted,
      excluded: Object.fromEntries(
        Object.keys(diagnostics.excluded).sort((left, right) => left.localeCompare(right, "en")).map((reason) => [reason, diagnostics.excluded[reason]])
      )
    };
  }
  function emitDiagnostics(onDiagnostics, diagnostics) {
    if (onDiagnostics === void 0) return;
    if (typeof onDiagnostics !== "function") throw processorError("invalid-diagnostics-handler");
    try {
      onDiagnostics(diagnosticSummary(diagnostics));
    } catch {
    }
  }
  function runOneXrayNodesProcessor(input = {}) {
    const { proxies, arguments: rawArguments, onDiagnostics } = processorInput(input);
    let options;
    try {
      options = nodeOptions(rawArguments);
    } catch {
      throw processorError("invalid-arguments");
    }
    let normalized;
    try {
      normalized = normalizeNodes(proxies, { clientChain: options.clientChain });
    } catch {
      throw processorError("invalid-inventory");
    }
    const eligible = filterNodesForClient(normalized.nodes, CLIENT.onexray);
    emitDiagnostics(onDiagnostics, eligible.diagnostics);
    if (eligible.nodes.length === 0) {
      const counts = formatExcludedCounts(eligible.diagnostics.excluded);
      throw processorError(`no-compatible-nodes; excluded counts: ${counts || "none"}`);
    }
    let resolution;
    try {
      resolution = resolveOneXrayPolicy({
        options,
        allNodes: normalized.nodes,
        eligibleNodes: eligible.nodes
      });
    } catch (error) {
      void error;
      throw processorError("invalid-policy");
    }
    try {
      return renderOneXraySubscription(resolution);
    } catch (error) {
      void error;
      throw processorError("invalid-subscription");
    }
  }
  return __toCommonJS(substore_nodes_entry_exports);
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
    throw new Error("OneXray nodes: invalid-arguments");
  }
}

async function operator(input, targetPlatform) {
  void targetPlatform;
  const arguments_ = snapshotArguments($arguments);
  if (typeof produceArtifact !== "function") {
    throw new Error("OneXray nodes: produce-artifact-unavailable");
  }
  const proxies = await produceArtifact({
    type: arguments_.type,
    name: arguments_.name,
    platform: "JSON",
    produceType: "internal",
  });

  let diagnostics;
  const content = OneXrayNodesBundle.runOneXrayNodesProcessor({
    proxies,
    arguments: arguments_,
    onDiagnostics(value) { diagnostics = value; },
  });
  if (diagnostics !== undefined) {
    const logger = typeof console !== "undefined"
      ? typeof console.info === "function" ? console.info.bind(console)
        : typeof console.log === "function" ? console.log.bind(console)
          : null
      : null;
    if (logger) {
      try {
        logger("[onexray-nodes] " + JSON.stringify(diagnostics));
      } catch {
        // Diagnostics are optional and never change private output.
      }
    }
  }

  return { ...input, $content: content };
}
