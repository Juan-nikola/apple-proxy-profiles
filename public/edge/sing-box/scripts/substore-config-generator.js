var SingBoxConfigBundle = (() => {
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
    PUBLIC_RULE_ROOT: () => PUBLIC_RULE_ROOT,
    operator: () => operator
  });

  // ../../shared/contracts.js
  var CLIENT = Object.freeze({
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere",
    surge: "surge",
    singbox: "singbox"
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
  function protocol(names, clients, { requiredFields = [], tls = false } = {}) {
    return Object.freeze({
      names: Object.freeze(names),
      clients: Object.freeze(clients),
      requiredFields: Object.freeze(requiredFields),
      tls
    });
  }
  var definitions = Object.freeze([
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["cipher", "password"]
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.egern, CLIENT.anywhere, CLIENT.singbox], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox]),
    protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox]),
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
  function normalizeProtocol(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }
  function protocolDefinition(value) {
    return registry.get(normalizeProtocol(value)) ?? null;
  }
  function protocolSupportsClient(value, client) {
    return protocolDefinition(value)?.clients.includes(client) === true;
  }
  function diagnosticProtocol(value) {
    const normalized = normalizeProtocol(value);
    return registry.has(normalized) ? normalized : "unknown";
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
    const transportFields2 = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "xhttp-opts"];
    if (protocol2 === "ss" || protocol2 === "shadowsocks") {
      if (!isNonblankOpaqueString(node.password) || !isNonblankString(node.cipher)) return "invalid-anywhere-node-shape";
      if (!ANYWHERE_SHADOWSOCKS_METHODS.has(node.cipher.toLowerCase())) return "unsupported-anywhere-shadowsocks-method";
      if (network !== "tcp" || hasShadowsocksPlugin(node) || node.tls === true || hasOption(node, "security") && node.security !== "none" || transportFields2.some((key) => hasOption(node, key))) {
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
        if (hasOption(node, "ws-opts") && !validAnywhereWsOptions(node["ws-opts"]) || transportFields2.some((key) => key !== "ws-opts" && hasOption(node, key))) {
          return "unsupported-anywhere-vless-transport";
        }
      } else if (transportFields2.some((key) => hasOption(node, key))) {
        return "unsupported-anywhere-vless-transport";
      }
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      const reality = node["reality-opts"];
      if (reality !== void 0) {
        if (!isPlainObject(reality) || Object.keys(reality).some((key) => !["public-key", "short-id"].includes(key)) || !isAnywhereRealityPublicKey(reality["public-key"]) || hasOption(reality, "short-id") && !/^(?:[0-9A-Fa-f]{2}){1,8}$/u.test(reality["short-id"]) || hasOption(node, "alpn") || hasOption(node, "ech-opts")) {
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
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields2.some((key) => hasOption(node, key)) || hasOption(node, "ss-opts") && (!isPlainObject(ssOptions) || ssOptions.enabled === true)) {
        return "unsupported-anywhere-trojan-shape";
      }
      return null;
    }
    if (protocol2 === "anytls") {
      if (!isNonblankOpaqueString(node.password)) return "invalid-anywhere-node-shape";
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields2.some((key) => hasOption(node, key)) || ["idle-session-check-interval", "idle-session-timeout"].some((key) => hasOption(node, key) && (!Number.isInteger(node[key]) || node[key] < 30)) || hasOption(node, "min-idle-session") && (!Number.isInteger(node["min-idle-session"]) || node["min-idle-session"] < 0)) {
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
    const protocol2 = normalizeProtocol(node?.type);
    if (!protocolSupportsClient(protocol2, client)) return { supported: false, reason: "unsupported-protocol" };
    const transportReason = client === CLIENT.anywhere ? anywhereNodeExclusionReason(node ?? {}) : client === CLIENT.egern ? egernNodeExclusionReason(node ?? {}) : null;
    return transportReason ? { supported: false, reason: transportReason } : { supported: true, reason: null };
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

  // ../../shared/nodes/source-labels.js
  var PROVENANCE_FIELDS = [
    "_subDisplayName",
    "_subName",
    "_collectionDisplayName",
    "_collectionName"
  ];
  var SOURCE_LABELS = /* @__PURE__ */ new Map([
    ["\u673A\u573A", { kind: SOURCE_KIND.airport, label: "[\u673A\u573A]" }],
    ["\u81EA\u5EFA", { kind: SOURCE_KIND.selfHosted, label: "[\u81EA\u5EFA]" }],
    ["realm", { kind: SOURCE_KIND.realm, label: "[Realm]" }],
    ["\u94FE\u5F0F\u4EE3\u7406", { kind: SOURCE_KIND.serverChain, label: "[\u94FE\u5F0F\u4EE3\u7406]" }],
    ["\u843D\u5730", { kind: SOURCE_KIND.landing, label: "[\u843D\u5730]" }]
  ]);
  function sourceName(node) {
    for (const field of PROVENANCE_FIELDS) {
      const value = node?.[field];
      if (typeof value === "string" && value.trim()) return value;
    }
    return "";
  }
  function classifySource(node) {
    const match = sourceName(node).match(/^\s*\[([^\]]+)\]/i);
    const source = match && SOURCE_LABELS.get(match[1].trim().toLowerCase());
    if (source) return { ...source, warning: null };
    return {
      kind: SOURCE_KIND.unknown,
      label: "[\u672A\u6807\u8BB0]",
      warning: "missing-source-label"
    };
  }

  // ../../shared/nodes/normalize-nodes.js
  var CONTINENT_ORDER = /* @__PURE__ */ new Map([
    [CONTINENT.asiaPacific, 0],
    [CONTINENT.europe, 1],
    [CONTINENT.americas, 2],
    [CONTINENT.other, 3]
  ]);
  var EXISTING_CHAIN_MARKER = "[\u5DF2\u6709\u94FE]";
  function cleanDisplayName(name) {
    const withoutMarkers = removeFlags(name).replace(/\[\s*udp\s*\]/gi, " ").replace(/\[\s*已有链\s*\]/g, " ");
    const cleaned = withoutMarkers.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "\u672A\u547D\u540D\u8282\u70B9";
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
      const byIdentity = group.map((node) => ({ node, identity: getIdentity(node), suffix: getFingerprint(node).slice(-5) })).sort((left, right) => left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0);
      const suffixGroups = /* @__PURE__ */ new Map();
      for (const record of byIdentity) {
        const suffixGroup = suffixGroups.get(record.suffix) ?? [];
        suffixGroup.push(record);
        suffixGroups.set(record.suffix, suffixGroup);
      }
      for (const records of suffixGroups.values()) {
        records.forEach((record, index) => {
          const suffix = records.length > 1 ? `${record.suffix}-${index + 1}` : record.suffix;
          record.node.name = `${baseName} #${suffix}`;
        });
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
      const cloned = structuredClone(original);
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
      cloned.name = `${region.flag} ${source.label} ${cleanDisplayName(original.name)}${existingChain ? ` ${EXISTING_CHAIN_MARKER}` : ""}${udp ? " [UDP]" : ""}`;
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

  // ../../shared/policies/platform-presets.js
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

  // src/options.js
  var REQUIRED_KEYS = Object.freeze(["output", "type", "name", "subscriptionName", "platform"]);
  var DEFAULTS = Object.freeze({
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    autoGroupMode: "auto",
    clientChain: "off"
  });
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad", "android", "openwrt"]);
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);
  var PARSED = /* @__PURE__ */ new WeakSet();
  function requiredString(raw, key) {
    const value = raw[key];
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
      throw new Error(`Option '${key}' must be a non-empty single-line string`);
    }
    return value;
  }
  function enumValue(raw, key, defaultValue) {
    const value = raw[key] === void 0 ? defaultValue : raw[key];
    if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) throw new Error(`Option '${key}' has an unsupported value`);
    return value;
  }
  function parseSingBoxOptions(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("sing-box options must be an object");
    for (const key of Object.keys(raw)) {
      if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error(`Unknown sing-box option: ${key}`);
    }
    for (const key of REQUIRED_KEYS) if (!Object.hasOwn(raw, key)) throw new Error(`Option '${key}' is required`);
    const platform = requiredString(raw, "platform");
    if (!PLATFORMS.has(platform)) throw new Error("Option 'platform' has an unsupported value");
    if (requiredString(raw, "output") !== "config") throw new Error("Option 'output' must be config");
    if (requiredString(raw, "type") !== "collection") throw new Error("Option 'type' must be collection");
    const channel = raw.channel === void 0 ? DEFAULTS.channel : raw.channel;
    if (typeof channel !== "string" || !CHANNELS.has(channel)) throw new Error("Option 'channel' has an unsupported value");
    const options = {
      output: "config",
      type: "collection",
      name: requiredString(raw, "name"),
      subscriptionName: requiredString(raw, "subscriptionName"),
      platform,
      channel,
      dnsMode: enumValue(raw, "dnsMode", DEFAULTS.dnsMode),
      chinaDns: enumValue(raw, "chinaDns", DEFAULTS.chinaDns),
      globalDns: enumValue(raw, "globalDns", DEFAULTS.globalDns),
      blockMode: enumValue(raw, "blockMode", DEFAULTS.blockMode),
      quicMode: enumValue(raw, "quicMode", DEFAULTS.quicMode),
      ipv6Mode: enumValue(raw, "ipv6Mode", platform === "macos" ? "ipv4-only" : DEFAULTS.ipv6Mode),
      autoGroupMode: enumValue(raw, "autoGroupMode", DEFAULTS.autoGroupMode),
      clientChain: enumValue(raw, "clientChain", DEFAULTS.clientChain)
    };
    platformPolicyPreset(platform === "openwrt" ? "macos" : platform);
    Object.freeze(options);
    PARSED.add(options);
    return options;
  }
  function isParsedSingBoxOptions(value) {
    return value !== null && typeof value === "object" && PARSED.has(value);
  }

  // src/render-node.js
  var ALLOWED_KEYS2 = /* @__PURE__ */ new Set([
    "name",
    "type",
    "server",
    "port",
    "udp",
    "tls",
    "security",
    "sni",
    "servername",
    "skip-cert-verify",
    "allow-insecure",
    "client-fingerprint",
    "reality-opts",
    "network",
    "ws-opts",
    "grpc-opts",
    "h2-opts",
    "http-opts",
    "cipher",
    "password",
    "uuid",
    "flow",
    "alter-id",
    "alterId",
    "psk",
    "version",
    "username",
    "private-key",
    "private_key",
    "public-key",
    "pre-shared-key",
    "peers",
    "local-address",
    "local_ipv4",
    "local-ipv4",
    "local_ipv6",
    "local-ipv6",
    "ip",
    "ipv6",
    "dns",
    "dns_servers",
    "mtu",
    "keepalive",
    "obfs",
    "obfs-host",
    "obfs_host",
    "obfs-password",
    "obfs_password",
    "udp-relay-mode",
    "udp_relay_mode",
    "ports",
    "port-hopping",
    "port_hopping",
    "port-hopping-interval",
    "port_hopping_interval",
    "bandwidth",
    "up",
    "down",
    "reuse",
    "tfo",
    "udp_relay",
    "underlying-proxy",
    "chain",
    "dialer-proxy",
    "detour",
    "prev_hop"
  ]);
  var CHAIN_ALIASES3 = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  var GENERATED_CHAIN_POLICY2 = "\u{1F517} \u5165\u53E3\u8282\u70B9";
  function hasOwn(value, key) {
    return Object.hasOwn(value, key);
  }
  function requiredString2(node, key) {
    const value = node[key];
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) throw new Error(`sing-box node field '${key}' is invalid`);
    return value;
  }
  function requiredPort(node) {
    const port = Number(node.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("sing-box node port is invalid");
    return port;
  }
  function validateNodeShape(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError("sing-box node is invalid");
    if (typeof node.name !== "string" || node.name.length === 0 || /[\r\n]/u.test(node.name)) throw new Error("sing-box node name is invalid");
    requiredString2(node, "server");
    requiredPort(node);
    for (const key of Object.keys(node)) {
      if (key.startsWith("_")) continue;
      if (!ALLOWED_KEYS2.has(key)) throw new Error(`sing-box node contains unsupported field: ${key}`);
    }
  }
  function sanitizeSingBoxNode(node) {
    return Object.fromEntries(Object.entries(node).filter(([key]) => key.startsWith("_") || ALLOWED_KEYS2.has(key)));
  }
  function setIf(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target[key] = value;
  }
  function tlsFields(node, required = false) {
    const reality = node["reality-opts"];
    const enabled = required || node.tls === true || node.security === "tls" || node.security === "reality" || reality !== void 0;
    if (!enabled) return void 0;
    const tls = { enabled: true };
    setIf(tls, "server_name", node.sni ?? node.servername);
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) tls.insecure = true;
    if (node["client-fingerprint"] !== void 0) {
      tls.utls = { enabled: true, fingerprint: node["client-fingerprint"] };
    }
    if (reality !== void 0) {
      if (!reality || typeof reality !== "object" || Array.isArray(reality) || typeof reality["public-key"] !== "string") {
        throw new Error("sing-box Reality options are invalid");
      }
      tls.reality = { enabled: true, public_key: reality["public-key"] };
      setIf(tls.reality, "short_id", reality["short-id"]);
    }
    return tls;
  }
  function transportFields(node) {
    const network = String(node.network ?? "tcp").trim().toLowerCase();
    if (network === "tcp" || network === "raw") return void 0;
    if (network === "ws") {
      const source = node["ws-opts"];
      if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("sing-box WebSocket options are invalid");
      const transport = { type: "ws", path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/" };
      if (source.headers !== void 0) transport.headers = { ...source.headers };
      return transport;
    }
    if (network === "grpc") {
      const source = node["grpc-opts"] ?? {};
      const transport = { type: "grpc" };
      setIf(transport, "service_name", source["grpc-service-name"]);
      return transport;
    }
    if (network === "h2" || network === "http2" || network === "http") {
      const source = node["h2-opts"] ?? node["http-opts"] ?? {};
      const transport = { type: "http" };
      setIf(transport, "method", source.method);
      setIf(transport, "path", Array.isArray(source.path) ? source.path[0] : source.path);
      if (source.headers !== void 0) transport.headers = { ...source.headers };
      if (source.host !== void 0) transport.host = Array.isArray(source.host) ? source.host : [source.host];
      return transport;
    }
    throw new Error(`Unsupported sing-box transport: ${network}`);
  }
  function base(node, type) {
    return { type, tag: node.name, server: node.server, server_port: requiredPort(node) };
  }
  function appendChain(outbound, node) {
    const aliases = CHAIN_ALIASES3.filter((key) => hasOwn(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
    if (aliases.length === 0) return outbound;
    if (aliases.length !== 1 || aliases[0] !== "underlying-proxy" || node["underlying-proxy"] !== GENERATED_CHAIN_POLICY2 || node?._profile?.chained !== true) {
      throw new Error("Unsupported existing sing-box proxy chain");
    }
    outbound.detour = GENERATED_CHAIN_POLICY2;
    return outbound;
  }
  function renderSingBoxOutbound(node) {
    validateNodeShape(node);
    const protocol2 = normalizeProtocol(node.type);
    let outbound;
    switch (protocol2) {
      case "ss":
      case "shadowsocks":
        outbound = { ...base(node, "shadowsocks"), method: requiredString2(node, "cipher"), password: requiredString2(node, "password") };
        if (node.network === "tcp" || node.network === "udp") outbound.network = node.network;
        break;
      case "vmess":
        outbound = { ...base(node, "vmess"), uuid: requiredString2(node, "uuid"), security: node.security ?? node.cipher ?? "auto" };
        if (node["alter-id"] !== void 0 || node.alterId !== void 0) outbound.alter_id = Number(node["alter-id"] ?? node.alterId);
        outbound.tls = tlsFields(node);
        outbound.transport = transportFields(node);
        break;
      case "snell":
        outbound = { ...base(node, "snell"), psk: requiredString2(node, "psk"), version: Number(node.version) };
        setIf(outbound, "obfs", node.obfs);
        setIf(outbound, "obfs_host", node["obfs-host"] ?? node.obfs_host);
        break;
      case "vless":
        outbound = { ...base(node, "vless"), uuid: requiredString2(node, "uuid") };
        setIf(outbound, "flow", node.flow);
        if (node.network === "tcp" || node.network === "udp") outbound.network = node.network;
        outbound.tls = tlsFields(node);
        outbound.transport = transportFields(node);
        break;
      case "trojan":
        outbound = { ...base(node, "trojan"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        outbound.transport = transportFields(node);
        break;
      case "anytls":
        outbound = { ...base(node, "anytls"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        break;
      case "hysteria2":
      case "hy2":
        outbound = { ...base(node, "hysteria2"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        if (node.obfs !== void 0) {
          outbound.obfs = { type: node.obfs };
          setIf(outbound.obfs, "password", node["obfs-password"] ?? node["obfs_password"]);
        }
        break;
      case "tuic":
        outbound = { ...base(node, "tuic"), uuid: requiredString2(node, "uuid"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        setIf(outbound, "udp_relay_mode", node["udp-relay-mode"] ?? node["udp_relay_mode"]);
        break;
      case "socks5":
        outbound = base(node, "socks");
        setIf(outbound, "username", node.username);
        setIf(outbound, "password", node.password);
        break;
      case "http":
        outbound = base(node, "http");
        setIf(outbound, "username", node.username);
        setIf(outbound, "password", node.password);
        outbound.tls = tlsFields(node);
        break;
      case "ssh":
        outbound = { ...base(node, "ssh"), user: requiredString2(node, "username") };
        setIf(outbound, "password", node.password);
        setIf(outbound, "private_key", node["private-key"] ?? node.private_key);
        break;
      case "wireguard": {
        const peer = node.peers?.[0] ?? {};
        outbound = {
          ...base(node, "wireguard"),
          private_key: requiredString2(node, "private-key"),
          peer_public_key: requiredString2({ "public-key": peer["public-key"] ?? node["public-key"] }, "public-key")
        };
        const address = node["local-address"] ?? node.local_ipv4 ?? node["local-ipv4"] ?? node.ip;
        if (address !== void 0) outbound.local_address = Array.isArray(address) ? address : [address];
        setIf(outbound, "pre_shared_key", peer["pre-shared-key"] ?? node["pre-shared-key"]);
        break;
      }
      default:
        throw new Error(`Unsupported sing-box protocol: ${protocol2 || "unknown"}`);
    }
    for (const key of ["tls", "transport"]) if (outbound[key] === void 0) delete outbound[key];
    return appendChain(outbound, node);
  }

  // ../../shared/policies/filters.js
  var ALL_NODES_FILTER = "^.+$";
  var NON_CHAINED_FILTER = "^(?!\u{1F517} ).+$";
  var ENTRY_FILTER = "^(?!.*\\[\u5DF2\u6709\u94FE\\])\\S+ \\[(?:\u673A\u573A|\u81EA\u5EFA|Realm)\\] .+$";
  var P2P_FILTER = "^\\S+ \\[(?:\u81EA\u5EFA|Realm|\u94FE\u5F0F\u4EE3\u7406)\\] .+$";
  var GAME_FILTER = "^(?!\u{1F517} )\\S+ .+ \\[UDP\\]$";
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
    Object.freeze({ kind: SOURCE_KIND.selfHosted, name: "\u{1F3E0} \u81EA\u5EFA\u8282\u70B9", filter: "^\\S+ \\[\u81EA\u5EFA\\] .+$" }),
    Object.freeze({ kind: SOURCE_KIND.airport, name: "\u{1F3E2} \u673A\u573A\u8282\u70B9", filter: "^\\S+ \\[\u673A\u573A\\] .+$" }),
    Object.freeze({ kind: SOURCE_KIND.realm, name: "\u21AA\uFE0F Realm \u8F6C\u53D1", filter: "^\\S+ \\[Realm\\] .+$" }),
    Object.freeze({ kind: SOURCE_KIND.serverChain, name: "\u26D3\uFE0F \u94FE\u5F0F\u4EE3\u7406", filter: "^\\S+ \\[\u94FE\u5F0F\u4EE3\u7406\\] .+$" })
  ]);
  function continentFilter(continent) {
    if (continent.key === CONTINENT.other) {
      const knownFlags = CONTINENTS.flatMap((record) => record.flags).join("|");
      return `^(?!(?:\u{1F517}|${knownFlags}))\\S+ .+$`;
    }
    return `^(?:${continent.flags.join("|")}) .+$`;
  }

  // ../../shared/policies/intents.js
  var POLICY_TARGET = Object.freeze({
    primaryProxy: "primary-proxy"
  });

  // ../../shared/policies/catalog.js
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
    Object.freeze(["\u{1F3AC} Netflix", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F3F0} Disney+", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F3B5} Spotify", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F30D} \u56FD\u9645\u5A92\u4F53", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u2708\uFE0F Telegram", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F4AC} \u6D77\u5916\u793E\u4EA4", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F3B6} TikTok", PROXY_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F34E} Apple", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1FA9F} Microsoft", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F4FA} \u54D4\u54E9\u54D4\u54E9", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F3B5} \u6296\u97F3", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F4D5} \u5C0F\u7EA2\u4E66", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F9E3} \u5FAE\u535A", DIRECT_FIRST_SERVICE_DEFAULTS]),
    Object.freeze(["\u{1F579}\uFE0F \u6E38\u620F\u5E73\u53F0", PROXY_FIRST_SERVICE_DEFAULTS])
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
      candidates: [POLICY_TARGET.primaryProxy]
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

  // src/render-groups.js
  function targetName(value) {
    return value === POLICY_TARGET.primaryProxy ? "\u26A1 \u5168\u90E8\u81EA\u52A8" : value;
  }
  function filterNodes(filter, nodes) {
    if (filter === null) return [];
    let pattern;
    try {
      pattern = new RegExp(filter, "u");
    } catch {
      throw new Error("Invalid sing-box policy filter");
    }
    return nodes.filter((node) => pattern.test(node.name)).map((node) => node.name);
  }
  function duration(seconds) {
    return `${Number(seconds)}s`;
  }
  function renderSingBoxGroups(options, nodes) {
    const inventory = Array.isArray(nodes) ? nodes : [];
    const shared = buildPolicyGroups(options, inventory);
    return shared.map((group) => {
      const candidates = [
        ...group.candidates.map(targetName),
        ...filterNodes(group.nodeFilter, inventory)
      ].filter((item, index, all) => all.indexOf(item) === index);
      const outbounds = candidates.length > 0 ? candidates : ["DIRECT"];
      if (group.strategy === "auto-test" || group.strategy === "fallback") {
        return {
          type: "urltest",
          tag: group.name,
          outbounds,
          url: "https://www.gstatic.com/generate_204",
          interval: duration(group.test?.interval ?? 600),
          tolerance: group.test?.tolerance ?? 100,
          interrupt_exist_connections: true
        };
      }
      const outbound = {
        type: "selector",
        tag: group.name,
        outbounds,
        interrupt_exist_connections: true
      };
      if (group.defaultChoice !== void 0) outbound.default = targetName(group.defaultChoice);
      return outbound;
    });
  }

  // ../../shared/rules/catalog-data.js
  function rule(id, policy, minEntries, inputFormat = "RULE-SET", directory = id) {
    return Object.freeze({
      id,
      sourcePath: `${directory}/${id}.list`,
      policy,
      minEntries,
      inputFormat
    });
  }
  var RULE_SOURCE_DEFINITIONS = Object.freeze([
    rule("Hijacking", "\u2623\uFE0F \u5B89\u5168\u5A01\u80C1", 150),
    rule("BlockHttpDNS", "\u2623\uFE0F \u5B89\u5168\u5A01\u80C1", 40),
    rule("Advertising", "\u{1F9F1} \u5E38\u89C1\u5E7F\u544A", 700),
    rule("Advertising_Domain", "\u{1F9F1} \u5E38\u89C1\u5E7F\u544A", 25e4, "DOMAIN-SET", "Advertising"),
    rule("Privacy", "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A", 15),
    rule("BiliBili", "\u{1F4FA} \u54D4\u54E9\u54D4\u54E9", 80),
    rule("ByteDance", "\u{1F3B5} \u6296\u97F3", 300),
    rule("XiaoHongShu", "\u{1F4D5} \u5C0F\u7EA2\u4E66", 3),
    rule("Weibo", "\u{1F9E3} \u5FAE\u535A", 3),
    rule("OpenAI", "\u{1F916} AI \u4E13\u7528", 20),
    rule("Claude", "\u{1F916} AI \u4E13\u7528", 2),
    rule("Gemini", "\u{1F916} AI \u4E13\u7528", 8),
    rule("Copilot", "\u{1F916} AI \u4E13\u7528", 30),
    rule("GitHub", "\u{1F419} GitHub", 20),
    rule("YouTube", "\u{1F4FA} YouTube", 120),
    rule("Netflix", "\u{1F3AC} Netflix", 800),
    rule("Disney", "\u{1F3F0} Disney+", 100),
    rule("Spotify", "\u{1F3B5} Spotify", 20),
    rule("GlobalMedia", "\u{1F30D} \u56FD\u9645\u5A92\u4F53", 700),
    rule("Telegram", "\u2708\uFE0F Telegram", 25),
    rule("Facebook", "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", 350),
    rule("Instagram", "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", 3),
    rule("Twitter", "\u{1F4AC} \u6D77\u5916\u793E\u4EA4", 20),
    rule("TikTok", "\u{1F3B6} TikTok", 20),
    rule("Apple", "\u{1F34E} Apple", 25),
    rule("Microsoft", "\u{1FA9F} Microsoft", 400),
    rule("SteamCN", "DIRECT", 10),
    rule("ChinaMax_Domain", "DIRECT", 1e5, "DOMAIN-SET", "ChinaMax"),
    rule("Game", "\u{1F579}\uFE0F \u6E38\u620F\u5E73\u53F0", 400),
    rule("Download", "\u2B07\uFE0F \u4E0B\u8F7D/P2P", 5),
    rule("PrivateTracker", "\u2B07\uFE0F \u4E0B\u8F7D/P2P", 150),
    rule("ChinaMax", "DIRECT", 8e3)
  ]);

  // ../../shared/rules/client-catalog.js
  var RULE_CLIENT_CATALOG = Object.freeze(RULE_SOURCE_DEFINITIONS.map(({ id, policy, inputFormat }) => Object.freeze({ id, policy, inputFormat })));

  // src/render-rules.js
  var LOCAL_RULES = Object.freeze([
    { ip_is_private: true, action: { action: "route", outbound: "DIRECT" } },
    { domain_suffix: ["local", "lan", "home.arpa"], action: { action: "route", outbound: "DIRECT" } }
  ]);
  function baseUrl(value) {
    if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n]/u.test(value)) {
      throw new Error("sing-box rule base URL must be an HTTPS URL");
    }
    return value.replace(/\/+$/u, "");
  }
  function routeAction(outbound) {
    if (outbound === "REJECT") return { action: "reject", method: "default" };
    return { action: "route", outbound };
  }
  function renderSingBoxRuleSets({ ruleBaseUrl, ruleSetFormat = "source" }) {
    const base2 = baseUrl(ruleBaseUrl);
    if (!(/* @__PURE__ */ new Set(["source", "binary"])).has(ruleSetFormat)) throw new Error("Unsupported sing-box rule-set format");
    return RULE_CLIENT_CATALOG.map((source) => ({
      type: "remote",
      tag: `rule-${source.id}`,
      format: ruleSetFormat,
      url: `${base2}/${source.id}.${ruleSetFormat === "binary" ? "srs" : "json"}`,
      download_detour: "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D",
      update_interval: "24h"
    }));
  }
  function renderSingBoxRouteRules({ ruleBaseUrl, ruleSetFormat = "source" }) {
    const rules = [...LOCAL_RULES];
    for (const source of RULE_CLIENT_CATALOG) {
      rules.push({ rule_set: [`rule-${source.id}`], ...routeAction(source.policy) });
    }
    rules.push({ geoip: ["cn"], ...routeAction("DIRECT") });
    return { ruleSets: renderSingBoxRuleSets({ ruleBaseUrl, ruleSetFormat }), rules, final: "\u{1F680} \u8282\u70B9\u9009\u62E9" };
  }

  // src/render-dns.js
  var CHINA_DNS = Object.freeze({
    alidns: "223.5.5.5",
    dnspod: "119.29.29.29",
    system: "local"
  });
  var GLOBAL_DNS = Object.freeze({
    cloudflare: "https://1.1.1.1/dns-query",
    google: "https://dns.google/dns-query",
    quad9: "https://dns.quad9.net/dns-query"
  });
  function renderSingBoxDns(options) {
    const chinaServer = options.chinaDns === "system" ? { type: "local", tag: "dns-direct" } : { type: "udp", tag: "dns-direct", server: CHINA_DNS[options.chinaDns] };
    const proxyServer = { type: "https", tag: "dns-proxy", server: GLOBAL_DNS[options.globalDns], detour: "\u{1F680} \u8282\u70B9\u9009\u62E9" };
    return {
      servers: [chinaServer, proxyServer],
      rules: [
        { rule_set: ["rule-ChinaMax", "rule-ChinaMax_Domain"], action: { action: "route", server: "dns-direct" } },
        { rule_set: ["rule-Advertising", "rule-Privacy", "rule-Hijacking"], action: { action: "route", server: "dns-proxy" } }
      ],
      final: "dns-proxy",
      strategy: options.ipv6Mode === "ipv4-only" ? "ipv4_only" : "prefer_ipv4",
      cache_capacity: 4096
    };
  }

  // src/render-platform.js
  var COMMON_EXCLUDE = [
    "192.168.0.0/16",
    "172.16.0.0/12",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "224.0.0.0/4",
    "fc00::/7",
    "fe80::/10",
    "ff00::/8"
  ];
  function renderSingBoxTun(platform) {
    const base2 = {
      type: "tun",
      tag: "tun-in",
      interface_name: platform === "android" ? "sing-box" : "singtun0",
      address: ["172.18.0.1/30", "fdfe:dcba:9876::1/126"],
      auto_route: true,
      strict_route: true,
      route_exclude_address: [...COMMON_EXCLUDE]
    };
    if (platform === "openwrt") {
      return {
        ...base2,
        stack: "mixed",
        dns_mode: "hijack",
        dns_address: ["172.18.0.2", "fdfe:dcba:9876::2"],
        auto_redirect: true,
        auto_redirect_input_mark: "0x2023",
        auto_redirect_output_mark: "0x2024",
        loopback_address: ["10.7.0.1"],
        route_exclude_address: [...COMMON_EXCLUDE, "192.168.1.0/24"]
      };
    }
    if (platform === "android") {
      return {
        ...base2,
        dns_mode: "hijack",
        dns_address: ["172.18.0.2"],
        route_exclude_address: [...COMMON_EXCLUDE, "192.168.0.0/16"],
        platform: { include_android_user: [0] }
      };
    }
    return {
      ...base2,
      dns_mode: "hijack",
      dns_address: ["172.18.0.2", "fdfe:dcba:9876::2"],
      platform: { http_proxy: { enabled: false } }
    };
  }

  // src/validate-config.js
  function uniqueTags(records, errors, label) {
    const tags = /* @__PURE__ */ new Set();
    for (const record of records ?? []) {
      if (!record || typeof record.tag !== "string" || !record.tag) errors.push(`${label} tag missing`);
      else if (tags.has(record.tag)) errors.push(`duplicate ${label} tag`);
      else tags.add(record.tag);
    }
    return tags;
  }
  function actionOutbound(rule2) {
    if (rule2?.action?.action === "route") return rule2.action.outbound;
    if (rule2?.action?.action === "bypass") return rule2.action.outbound;
    return void 0;
  }
  function validateSingBoxConfig(config) {
    const errors = [];
    if (!config || typeof config !== "object" || Array.isArray(config)) return { valid: false, errors: ["config must be an object"] };
    const outbounds = config.outbounds;
    const outboundTags = uniqueTags(outbounds, errors, "outbound");
    const ruleSets = uniqueTags(config.route?.rule_set, errors, "rule-set");
    const dnsServers = uniqueTags(config.dns?.servers, errors, "DNS server");
    const inboundTags = uniqueTags(config.inbounds, errors, "inbound");
    const groupTags = new Set(outbounds?.filter((item) => ["selector", "urltest"].includes(item.type)).map((item) => item.tag));
    for (const outbound of outbounds ?? []) {
      for (const target of outbound.outbounds ?? []) if (!outboundTags.has(target)) errors.push("outbound references missing tag");
      if (outbound.default !== void 0 && !outboundTags.has(outbound.default)) errors.push("selector default references missing tag");
    }
    const routeRules = config.route?.rules;
    if (!Array.isArray(routeRules)) errors.push("route rules missing");
    for (const rule2 of routeRules ?? []) {
      for (const tag of rule2.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("route references missing rule-set tag");
      const target = actionOutbound(rule2);
      if (target !== void 0 && !outboundTags.has(target)) errors.push("route references missing outbound tag");
      if (rule2.action?.action === "hijack-dns" && !dnsServers.size) errors.push("DNS hijack requires DNS servers");
    }
    const routeFinal = config.route?.final;
    if (typeof routeFinal !== "string" || !outboundTags.has(routeFinal)) errors.push("route final references missing outbound tag");
    const dnsFinal = config.dns?.final;
    if (typeof dnsFinal !== "string" || !dnsServers.has(dnsFinal)) errors.push("DNS final references missing server");
    for (const rule2 of config.dns?.rules ?? []) {
      for (const tag of rule2.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("DNS references missing rule-set tag");
      if (rule2.action?.server !== void 0 && !dnsServers.has(rule2.action.server)) errors.push("DNS rule references missing server");
      if (rule2.action?.detour !== void 0 && !outboundTags.has(rule2.action.detour)) errors.push("DNS rule references missing outbound");
    }
    for (const server of config.dns?.servers ?? []) {
      if (server.detour !== void 0 && !outboundTags.has(server.detour)) errors.push("DNS server references missing outbound");
      if (server.detour === server.tag || server.tag === dnsFinal && server.detour === "dns-proxy") errors.push("DNS server loop detected");
    }
    for (const inbound of config.inbounds ?? []) {
      if (inbound.type === "tun" && !inbound.auto_route) errors.push("TUN auto_route is required");
      if (inbound.type === "tun" && inbound.platform?.include_android_user && inbound.auto_redirect) errors.push("Android TUN cannot use auto_redirect");
    }
    if (!inboundTags.has("tun-in")) errors.push("tun-in inbound missing");
    if (!groupTags.has("\u{1F680} \u8282\u70B9\u9009\u62E9")) errors.push("primary selector missing");
    return { valid: errors.length === 0, errors: [...new Set(errors)] };
  }

  // src/render-config.js
  function renderSingBoxConfig(rawOptions, nodes, { ruleBaseUrl, ruleSetFormat = "source" } = {}) {
    const options = isParsedSingBoxOptions(rawOptions) ? rawOptions : parseSingBoxOptions(rawOptions);
    const inventory = Array.isArray(nodes) ? nodes : [];
    if (inventory.length === 0) throw new Error("sing-box refuses an empty node inventory");
    for (const node of inventory) nodeMetadata(node);
    const nodeOutbounds = inventory.map(renderSingBoxOutbound);
    const groups = renderSingBoxGroups(options, inventory);
    const { ruleSets, rules, final } = renderSingBoxRouteRules({ ruleBaseUrl, ruleSetFormat });
    const config = {
      log: { level: "info", timestamp: true },
      dns: renderSingBoxDns(options),
      inbounds: [renderSingBoxTun(options.platform)],
      outbounds: [
        { type: "direct", tag: "DIRECT" },
        { type: "block", tag: "REJECT" },
        ...nodeOutbounds,
        ...groups
      ],
      route: {
        auto_detect_interface: true,
        rule_set: ruleSets,
        rules,
        final
      },
      experimental: { cache_file: { enabled: true, path: "cache.db", store_rdrc: true } }
    };
    const validation = validateSingBoxConfig(config);
    if (!validation.valid) throw new Error(`Generated sing-box config failed validation: ${validation.errors.join(",")}`);
    return config;
  }

  // src/substore-config-entry.js
  var PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
  function logDiagnostics(context, options, nodes) {
    const logger = context?.logger;
    const method = typeof logger === "function" ? logger : typeof logger?.info === "function" ? logger.info.bind(logger) : typeof logger?.log === "function" ? logger.log.bind(logger) : null;
    if (!method) return;
    try {
      method(`[sing-box-config] ${JSON.stringify({ client: "singbox", platform: options.platform, channel: options.channel, accepted: nodes.length })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseSingBoxOptions(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
    const rawNodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
    const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
    const filtered = filterNodesForClient(normalized.nodes, CLIENT.singbox);
    if (filtered.nodes.length === 0) throw new Error("No compatible sing-box nodes");
    logDiagnostics(context, options, filtered.nodes);
    const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/sing-box/rules`;
    const config = renderSingBoxConfig(options, filtered.nodes.map(sanitizeSingBoxNode), { ruleBaseUrl, ruleSetFormat: "source" });
    return { ...input, $content: `${JSON.stringify(config, null, 2)}
` };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return SingBoxConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
