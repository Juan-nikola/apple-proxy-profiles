var EgernNodeBundle = (() => {
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

  // substore-nodes-entry.js
  var substore_nodes_entry_exports = {};
  __export(substore_nodes_entry_exports, {
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
  function resolveEgernNodeOptions(node) {
    return Object.freeze({
      sni: firstAliasValue(node, ["sni", "servername"]),
      skipTlsVerify: firstAliasValue(node, ["skip-cert-verify", "allow-insecure"]),
      fingerprint: firstAliasValue(node, ["fingerprint-sha256", "fingerprint_sha256"]),
      udp: resolvedUdp(node),
      udpPort: firstAliasValue(node, ["udp-port", "udp_port"]),
      obfsHost: firstAliasValue(node, ["obfs-host", "obfs_host"]),
      obfsUri: firstAliasValue(node, ["obfs-uri", "obfs_uri"]),
      portHopping: firstAliasValue(node, ["port-hopping", "port_hopping", "ports"]),
      portHoppingInterval: firstAliasValue(node, ["port-hopping-interval", "port_hopping_interval", "hop-interval"]),
      bandwidth: firstAliasValue(node, ["bandwidth", "up"]),
      blockQuic: firstAliasValue(node, BLOCK_QUIC_ALIASES),
      ipVersion: firstAliasValue(node, IP_VERSION_ALIASES),
      shadowTls: firstAliasValue(node, SHADOW_TLS_ALIASES),
      sshPrivateKey: firstAliasValue(node, ["private-key", "private_key"]),
      sshHostKeys: firstAliasValue(node, ["host-keys", "host_keys"])
    });
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
    "reality-opts"
  ]);
  var ONEXRAY_TRANSPORT_FIELDS = /* @__PURE__ */ new Set([
    "network",
    "ws-opts",
    "grpc-opts",
    "httpupgrade-opts",
    "xhttp-opts",
    "kcp-opts"
  ]);
  var ONEXRAY_COMMON_FIELDS = /* @__PURE__ */ new Set(["name", "type", "server", "port", "_profile"]);
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
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort(node.port)) return "invalid-onexray-node-shape";
    return oneXrayAliasReason(node);
  }
  function oneXrayTlsReason(node, protocol2, { implicitTls = false, allowReality = protocol2 === "vless" } = {}) {
    if (!isOptionalBoolean(node, "tls") || !optionalStringAliasesAreValid(node, ["sni", "servername"])) {
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
    if (node.security === "reality" && !allowReality) return "unsupported-onexray-tls-shape";
    if (node.security === "reality" && !hasOption(node, "reality-opts")) return "incomplete-onexray-reality";
    if (node.tls === false && ["tls", "reality"].includes(node.security) || node.tls === true && node.security === "none") return "unsupported-onexray-tls-shape";
    const reality = node["reality-opts"];
    if (reality !== void 0) {
      if (!allowReality || node.tls === false || node.security !== "reality" || !isPlainObject(reality) || !isRealityPublicKey(reality["public-key"])) {
        return "incomplete-onexray-reality";
      }
      if (Object.keys(reality).some((key) => !["public-key", "short-id", "spider-x"].includes(key)) || hasOption(reality, "short-id") && (!isNonblankString(reality["short-id"]) || !/^[0-9a-f]*$/i.test(reality["short-id"])) || hasOption(reality, "spider-x") && !isNonblankString(reality["spider-x"])) {
        return "incomplete-onexray-reality";
      }
    }
    const tlsRequested2 = tlsRequestedForCapability(node);
    if (!implicitTls && !tlsRequested2 && (hasTlsSettings(node) || hasOption(node, "alpn") || hasOption(node, "client-fingerprint"))) return "unsupported-onexray-tls-shape";
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
    if (network === "tcp" || network === "raw") {
      return transportOptions.some((key) => hasOption(node, key)) ? "unsupported-onexray-transport" : null;
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
      const allowed = network === "httpupgrade" ? ["path", "host"] : ["path", "host", "mode"];
      return Object.keys(options).some((key) => !allowed.includes(key)) || hasOption(options, "path") && !isNonblankString(options.path) || hasOption(options, "host") && !isNonblankString(options.host) || hasOption(options, "mode") && !(/* @__PURE__ */ new Set(["auto", "packet-up", "stream-up", "stream-one"])).has(options.mode) ? "unsupported-onexray-transport" : null;
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

  // adapt-substore-nodes.js
  var CERTIFICATE_FINGERPRINT = /^[0-9a-f]{64}$/iu;
  function hasOwn(value, key) {
    return Object.hasOwn(value, key);
  }
  function isPlainObject2(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function cloneForUpdate(node, cloned) {
    return cloned ?? structuredClone(node);
  }
  function adaptSnell(node) {
    const version = typeof node.version === "string" && /^\d+$/u.test(node.version) ? Number(node.version) : node.version;
    if (version !== 5) return { value: node };
    const cloned = structuredClone(node);
    cloned.version = 4;
    return { value: cloned };
  }
  function adaptRealityVless(node) {
    if (!hasOwn(node, "reality-opts")) return { value: node };
    let cloned;
    if (hasOwn(node, "client-fingerprint")) {
      if (node["client-fingerprint"] !== "chrome") {
        return { reason: "unsupported-egern-tls-shape" };
      }
      cloned = cloneForUpdate(node, cloned);
      delete cloned["client-fingerprint"];
    }
    if (hasOwn(node, "encryption")) {
      if (node.encryption !== "none") return { reason: "unsupported-egern-security" };
      cloned = cloneForUpdate(node, cloned);
      delete cloned.encryption;
    }
    if (hasOwn(node, "packet-encoding")) {
      if (node["packet-encoding"] !== "xudp") return { reason: "unsupported-egern-option" };
      cloned = cloneForUpdate(node, cloned);
      delete cloned["packet-encoding"];
    }
    if (hasOwn(node, "_h2")) {
      if (node._h2 !== false) return { reason: "unsupported-egern-option" };
      cloned = cloneForUpdate(node, cloned);
      delete cloned._h2;
    }
    const reality = node["reality-opts"];
    if (isPlainObject2(reality) && hasOwn(reality, "_spider-x")) {
      if (typeof reality["_spider-x"] !== "string" || reality["_spider-x"].length === 0) {
        return { reason: "unsupported-egern-tls-shape" };
      }
      cloned = cloneForUpdate(node, cloned);
      delete cloned["reality-opts"]["_spider-x"];
    }
    return { value: cloned ?? node };
  }
  function adaptHysteria2(node) {
    let cloned;
    if (hasOwn(node, "alpn")) {
      if (!Array.isArray(node.alpn) || node.alpn.length !== 1 || node.alpn[0] !== "h3") {
        return { reason: "unsupported-egern-tls-shape" };
      }
      cloned = cloneForUpdate(node, cloned);
      delete cloned.alpn;
    }
    const hasFingerprint = hasOwn(node, "fingerprint");
    const hasTlsFingerprint = hasOwn(node, "tls-fingerprint");
    if (hasFingerprint || hasTlsFingerprint) {
      if (!hasFingerprint || !hasTlsFingerprint || typeof node.fingerprint !== "string" || typeof node["tls-fingerprint"] !== "string" || !CERTIFICATE_FINGERPRINT.test(node.fingerprint) || !CERTIFICATE_FINGERPRINT.test(node["tls-fingerprint"]) || node.fingerprint.toLowerCase() !== node["tls-fingerprint"].toLowerCase()) {
        return { reason: "unsupported-egern-tls-shape" };
      }
      const normalized = node.fingerprint.toLowerCase();
      for (const key of ["fingerprint-sha256", "fingerprint_sha256"]) {
        if (hasOwn(node, key) && (typeof node[key] !== "string" || node[key].toLowerCase() !== normalized)) {
          return { reason: "conflicting-egern-alias" };
        }
      }
      cloned = cloneForUpdate(node, cloned);
      delete cloned.fingerprint;
      delete cloned["tls-fingerprint"];
      delete cloned.fingerprint_sha256;
      cloned["fingerprint-sha256"] = normalized;
    }
    return { value: cloned ?? node };
  }
  function adaptNode(node) {
    if (!isPlainObject2(node)) return { value: node };
    const protocol2 = normalizeProtocol(node.type);
    if (protocol2 === "snell") return adaptSnell(node);
    if (protocol2 === "vless") return adaptRealityVless(node);
    if (protocol2 === "hysteria2" || protocol2 === "hy2") return adaptHysteria2(node);
    return { value: node };
  }
  function adaptEgernSubStoreNodes(nodes) {
    const adapted = [];
    const excluded = {};
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const result = adaptNode(node);
      if (result.reason) increment(excluded, result.reason);
      else adapted.push(result.value);
    }
    return { nodes: adapted, excluded };
  }

  // ../../../shared/serialization/render-yaml.js
  var INDENT_WIDTH = 2;
  var PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
  var YAML_BOOLEAN_OR_NULL = /^(?:false|null|true)$/i;
  var RAW_YAML_LINE_OR_C1_CHARACTER = /[\u007f-\u009f\u2028\u2029]/g;
  function displayPath(path) {
    return path || "<root>";
  }
  function encodeYamlDoubleQuotedString(value, path, { propertyKey = false } = {}) {
    for (let index = 0; index < value.length; index += 1) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit >= 55296 && codeUnit <= 56319) {
        const nextCodeUnit = value.charCodeAt(index + 1);
        if (nextCodeUnit >= 56320 && nextCodeUnit <= 57343) {
          index += 1;
          continue;
        }
      } else if (codeUnit < 56320 || codeUnit > 57343) {
        continue;
      }
      const subject = propertyKey ? "property key" : "string";
      throw new TypeError(`Ill-formed UTF-16 ${subject} at ${displayPath(path)}`);
    }
    return JSON.stringify(value).replace(
      RAW_YAML_LINE_OR_C1_CHARACTER,
      (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
    );
  }
  function propertyPath(path, key) {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
      return path ? `${path}.${key}` : key;
    }
    return `${path}[${encodeYamlDoubleQuotedString(key, path, { propertyKey: true })}]`;
  }
  function indexPath(path, index) {
    return `${path}[${index}]`;
  }
  function renderKey(key, path) {
    if (PLAIN_KEY.test(key) && !YAML_BOOLEAN_OR_NULL.test(key)) {
      return key;
    }
    return encodeYamlDoubleQuotedString(key, path, { propertyKey: true });
  }
  function scalarText(value, path) {
    if (value === null) {
      return "null";
    }
    switch (typeof value) {
      case "boolean":
        return value ? "true" : "false";
      case "number":
        if (!Number.isFinite(value)) {
          throw new TypeError(`Expected finite number at ${displayPath(path)}`);
        }
        return Object.is(value, -0) ? "-0" : JSON.stringify(value);
      case "string":
        return encodeYamlDoubleQuotedString(value, path);
      case "undefined":
      case "function":
      case "symbol":
      case "bigint":
        throw new TypeError(`Unsupported YAML value at ${displayPath(path)}`);
      default:
        return null;
    }
  }
  function isEmptyCollection(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return Reflect.ownKeys(value).length === 0;
  }
  function emptyCollectionText(value) {
    return Array.isArray(value) ? "[]" : "{}";
  }
  function inspectArray(value, path) {
    const keys = Reflect.ownKeys(value);
    for (const key of keys) {
      if (typeof key === "symbol") {
        throw new TypeError(`Symbol key at ${displayPath(path)}`);
      }
      if (key === "length") {
        continue;
      }
      const index = Number(key);
      const canonicalIndex = Number.isInteger(index) && index >= 0 && index < value.length && String(index) === key;
      if (!canonicalIndex) {
        throw new TypeError(`Unsupported YAML array property at ${propertyPath(path, key)}`);
      }
    }
    const descriptors = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      const itemPath = indexPath(path, index);
      if (!descriptor) {
        throw new TypeError(`Sparse YAML array at ${displayPath(itemPath)}`);
      }
      if ("get" in descriptor || "set" in descriptor) {
        throw new TypeError(`Accessor property at ${displayPath(itemPath)}`);
      }
      descriptors.push(descriptor);
    }
    return descriptors;
  }
  function inspectObject(value, path) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Expected plain object or array at ${displayPath(path)}`);
    }
    const descriptors = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        throw new TypeError(`Symbol key at ${displayPath(path)}`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      const childPath = propertyPath(path, key);
      if ("get" in descriptor || "set" in descriptor) {
        throw new TypeError(`Accessor property at ${displayPath(childPath)}`);
      }
      if (!descriptor.enumerable) {
        throw new TypeError(`Non-enumerable property at ${displayPath(childPath)}`);
      }
      descriptors.push([key, descriptor]);
    }
    return descriptors;
  }
  function renderNode(value, path, indent, active) {
    const scalar = scalarText(value, path);
    if (scalar !== null) {
      return [" ".repeat(indent) + scalar];
    }
    if (typeof value !== "object") {
      throw new TypeError(`Unsupported YAML value at ${displayPath(path)}`);
    }
    if (active.has(value)) {
      throw new TypeError(`Cyclic YAML value at ${displayPath(path)}`);
    }
    active.add(value);
    try {
      if (Array.isArray(value)) {
        const descriptors2 = inspectArray(value, path);
        if (descriptors2.length === 0) {
          return [" ".repeat(indent) + "[]"];
        }
        const lines2 = [];
        for (let index = 0; index < descriptors2.length; index += 1) {
          const item = descriptors2[index].value;
          const itemPath = indexPath(path, index);
          const itemScalar = scalarText(item, itemPath);
          if (itemScalar !== null) {
            lines2.push(`${" ".repeat(indent)}- ${itemScalar}`);
            continue;
          }
          const itemLines = renderNode(item, itemPath, indent + INDENT_WIDTH, active);
          if (isEmptyCollection(item)) {
            lines2.push(`${" ".repeat(indent)}- ${emptyCollectionText(item)}`);
          } else if (Array.isArray(item)) {
            lines2.push(`${" ".repeat(indent)}-`);
            for (const line of itemLines) lines2.push(line);
          } else {
            const itemIndent = " ".repeat(indent + INDENT_WIDTH);
            lines2.push(`${" ".repeat(indent)}- ${itemLines[0].slice(itemIndent.length)}`);
            for (let lineIndex = 1; lineIndex < itemLines.length; lineIndex += 1) {
              lines2.push(itemLines[lineIndex]);
            }
          }
        }
        return lines2;
      }
      const descriptors = inspectObject(value, path);
      if (descriptors.length === 0) {
        return [" ".repeat(indent) + "{}"];
      }
      const lines = [];
      for (const [key, descriptor] of descriptors) {
        const child = descriptor.value;
        const childPath = propertyPath(path, key);
        const childScalar = scalarText(child, childPath);
        const prefix = `${" ".repeat(indent)}${renderKey(key, path)}:`;
        if (childScalar !== null) {
          lines.push(`${prefix} ${childScalar}`);
          continue;
        }
        const childLines = renderNode(
          child,
          childPath,
          indent + INDENT_WIDTH,
          active
        );
        if (isEmptyCollection(child)) {
          lines.push(`${prefix} ${emptyCollectionText(child)}`);
        } else {
          lines.push(prefix);
          for (const line of childLines) lines.push(line);
        }
      }
      return lines;
    } finally {
      active.delete(value);
    }
  }
  function renderYaml(value) {
    return `${renderNode(value, "", 0, /* @__PURE__ */ new WeakSet()).join("\n")}
`;
  }

  // render-node.js
  var EGERN_CHAIN_POLICY = "\u{1F517} \u5165\u53E3\u8282\u70B9";
  var CHAIN_ALIASES2 = Object.freeze(["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"]);
  var REASON_MESSAGES = Object.freeze({
    "unsupported-existing-chain": "Unsupported existing Egern proxy chain",
    "unsupported-egern-transport": "Unsupported Egern transport",
    "incomplete-egern-reality": "Incomplete Egern Reality configuration",
    "unsupported-egern-security": "Unsupported Egern security",
    "unsupported-egern-method": "Unsupported Egern Shadowsocks method",
    "unsupported-egern-version": "Unsupported Egern Snell version",
    "unsupported-egern-flow": "Unsupported Egern VLESS flow",
    "unsupported-egern-http-shape": "Unsupported Egern HTTP shape",
    "unsupported-egern-wireguard-shape": "Unsupported Egern WireGuard shape",
    "unsupported-egern-obfs": "Unsupported Egern obfuscation",
    "unsupported-egern-udp-mode": "Unsupported Egern UDP mode",
    "unsupported-egern-tls-shape": "Unsupported Egern TLS shape",
    "unsupported-egern-shadowsocks-shape": "Unsupported Egern Shadowsocks shape",
    "unsupported-egern-snell-shape": "Unsupported Egern Snell shape",
    "unsupported-egern-vmess-shape": "Unsupported Egern VMess shape",
    "unsupported-egern-trojan-shape": "Unsupported Egern Trojan shape",
    "unsupported-egern-anytls-shape": "Unsupported Egern AnyTLS shape",
    "unsupported-egern-hysteria2-shape": "Unsupported Egern Hysteria2 shape",
    "unsupported-egern-tuic-shape": "Unsupported Egern TUIC shape",
    "unsupported-egern-socks5-shape": "Unsupported Egern SOCKS5 shape",
    "invalid-egern-node-shape": "Invalid Egern proxy shape",
    "conflicting-egern-alias": "Conflicting Egern proxy aliases",
    "unsupported-egern-option": "Unsupported Egern proxy option"
  });
  function hasOwn2(value, key) {
    return Object.hasOwn(value, key);
  }
  function copyOptional(target, outputKey, source, sourceKey = outputKey) {
    if (hasOwn2(source, sourceKey)) target[outputKey] = source[sourceKey];
  }
  function setCredentialField(target, key, value) {
    target[key] = value;
    return target;
  }
  function firstOwn(source, keys) {
    for (const key of keys) {
      if (hasOwn2(source, key)) return source[key];
    }
    return void 0;
  }
  function requiredString(value) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("Incomplete Egern proxy node");
    }
    return value;
  }
  function commonFields(node) {
    if (!node || typeof node !== "object" || Array.isArray(node) || typeof node.name !== "string" || node.name.length === 0 || typeof node.server !== "string" || node.server.length === 0 || !Number.isInteger(Number(node.port)) || Number(node.port) < 1 || Number(node.port) > 65535) {
      throw new Error("Incomplete Egern proxy node");
    }
    return { name: node.name, server: node.server, port: Number(node.port) };
  }
  function normalizedPath(value) {
    return Array.isArray(value) ? value[0] : value;
  }
  function normalizedHeaders(value) {
    if (value === void 0) return void 0;
    return normalizeEgernHeaders(value);
  }
  function tlsRequested(node) {
    return node.tls === true || node.security === "tls" || node.security === "reality" || hasOwn2(node, "reality-opts");
  }
  function realityFields(node) {
    const source = node["reality-opts"];
    if (source === void 0) return void 0;
    const reality = { public_key: source["public-key"] };
    copyOptional(reality, "short_id", source, "short-id");
    return reality;
  }
  function appendTlsFields(target, node, { includeReality = true } = {}) {
    const resolved = resolveEgernNodeOptions(node);
    const sni = resolved.sni;
    if (sni !== void 0) target.sni = sni;
    const skipTlsVerify = resolved.skipTlsVerify;
    if (skipTlsVerify !== void 0) target.skip_tls_verify = skipTlsVerify;
    const fingerprint2 = resolved.fingerprint;
    if (fingerprint2 !== void 0) target.fingerprint_sha256 = fingerprint2;
    if (includeReality) {
      const reality = realityFields(node);
      if (reality !== void 0) target.reality = reality;
    }
    return target;
  }
  function networkLabel(node) {
    return String(node.network ?? "tcp").trim().toLowerCase();
  }
  function httpTransportFields(options = {}) {
    const result = {};
    copyOptional(result, "method", options);
    if (hasOwn2(options, "path")) result.path = normalizedPath(options.path);
    if (hasOwn2(options, "headers")) result.headers = normalizedHeaders(options.headers);
    if (hasOwn2(options, "host")) {
      result.headers = { ...result.headers ?? {}, Host: normalizedPath(options.host) };
    }
    return result;
  }
  function renderVmessVlessTransport(node) {
    const network = networkLabel(node);
    if (network === "tcp" || network === "raw") {
      if (!tlsRequested(node)) return void 0;
      return { tls: appendTlsFields({}, node) };
    }
    if (network === "ws") {
      const source = node["ws-opts"];
      const fields = { path: normalizedPath(source.path) };
      if (hasOwn2(source, "headers")) fields.headers = normalizedHeaders(source.headers);
      if (tlsRequested(node)) appendTlsFields(fields, node, { includeReality: false });
      return { [tlsRequested(node) ? "wss" : "ws"]: fields };
    }
    if (network === "grpc") {
      const source = node["grpc-opts"] ?? {};
      const fields = {};
      copyOptional(fields, "service_name", source, "grpc-service-name");
      copyOptional(fields, "user_agent", source, "user-agent");
      appendTlsFields(fields, node);
      return { grpc: fields };
    }
    if (network === "h2" || network === "http2") {
      return { http2: appendTlsFields(httpTransportFields(node["h2-opts"]), node) };
    }
    if (network === "http" || network === "http1") {
      return { http1: httpTransportFields(node["http-opts"]) };
    }
    throw new Error("Unsupported Egern transport");
  }
  function appendCommonTcpOptions(target, node, { udp = false } = {}) {
    copyOptional(target, "tfo", node);
    const resolvedUdp2 = resolveEgernNodeOptions(node).udp;
    if (udp && resolvedUdp2 !== void 0) target.udp_relay = resolvedUdp2;
    return target;
  }
  function appendLatestCommonOptions(target, node) {
    const resolved = resolveEgernNodeOptions(node);
    if (resolved.blockQuic !== void 0) target.block_quic = resolved.blockQuic;
    if (resolved.shadowTls !== void 0) {
      const shadowTls = {};
      setCredentialField(shadowTls, "password", resolved.shadowTls.password);
      if (resolved.shadowTls.sni !== void 0) shadowTls.sni = resolved.shadowTls.sni;
      target.shadow_tls = shadowTls;
    }
    if (resolved.ipVersion !== void 0) target.ip_version = resolved.ipVersion;
    return target;
  }
  function renderShadowsocks(node) {
    const fields = {
      ...commonFields(node),
      method: requiredString(node.cipher)
    };
    setCredentialField(fields, "password", requiredString(node.password));
    appendCommonTcpOptions(fields, node, { udp: true });
    const resolved = resolveEgernNodeOptions(node);
    if (resolved.udpPort !== void 0) fields.udp_port = resolved.udpPort;
    copyOptional(fields, "obfs", node);
    if (resolved.obfsHost !== void 0) fields.obfs_host = resolved.obfsHost;
    if (resolved.obfsUri !== void 0) fields.obfs_uri = resolved.obfsUri;
    return { shadowsocks: fields };
  }
  function renderSnell(node) {
    const fields = commonFields(node);
    setCredentialField(fields, "psk", requiredString(node.psk));
    fields.version = Number(node.version);
    appendCommonTcpOptions(fields, node, { udp: true });
    copyOptional(fields, "reuse", node);
    copyOptional(fields, "obfs", node);
    const obfsHost = resolveEgernNodeOptions(node).obfsHost;
    if (obfsHost !== void 0) fields.obfs_host = obfsHost;
    return { snell: fields };
  }
  function renderVmess(node) {
    const security = ["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"].includes(node.security) ? node.security : node.cipher ?? "auto";
    const fields = appendCommonTcpOptions({
      ...commonFields(node),
      user_id: requiredString(node.uuid),
      security
    }, node, { udp: true });
    if (hasOwn2(node, "legacy")) fields.legacy = node.legacy;
    else if (node["alter-id"] === 0 || node.alterId === 0) fields.legacy = false;
    const transport = renderVmessVlessTransport(node);
    if (transport !== void 0) fields.transport = transport;
    return { vmess: fields };
  }
  function renderVless(node) {
    const fields = appendCommonTcpOptions({
      ...commonFields(node),
      user_id: requiredString(node.uuid)
    }, node, { udp: true });
    copyOptional(fields, "flow", node);
    const transport = renderVmessVlessTransport(node);
    if (transport !== void 0) fields.transport = transport;
    return { vless: fields };
  }
  function websocketFields(node) {
    const options = node["ws-opts"];
    const fields = { path: normalizedPath(options.path) };
    if (hasOwn2(options, "headers")) {
      const headers = normalizedHeaders(options.headers);
      if (hasOwn2(headers, "Host")) fields.host = headers.Host;
    }
    return fields;
  }
  function renderTrojan(node) {
    const fields = commonFields(node);
    setCredentialField(fields, "password", requiredString(node.password));
    appendCommonTcpOptions(fields, node, { udp: true });
    appendTlsFields(fields, node);
    if (networkLabel(node) === "ws") fields.websocket = websocketFields(node);
    return { trojan: fields };
  }
  function renderAnytls(node) {
    const fields = commonFields(node);
    setCredentialField(fields, "password", requiredString(node.password));
    appendCommonTcpOptions(fields, node, { udp: true });
    appendTlsFields(fields, node);
    return { anytls: fields };
  }
  function renderHysteria2(node) {
    const fields = commonFields(node);
    setCredentialField(fields, "auth", requiredString(node.password));
    appendTlsFields(fields, node, { includeReality: false });
    copyOptional(fields, "obfs", node);
    const resolved = resolveEgernNodeOptions(node);
    const obfsPassword = firstOwn(node, ["obfs-password", "obfs_password"]);
    if (obfsPassword !== void 0) fields.obfs_password = obfsPassword;
    const hopping = resolved.portHopping;
    if (hopping !== void 0) fields.port_hopping = hopping;
    const hoppingInterval = resolved.portHoppingInterval;
    if (hoppingInterval !== void 0) fields.port_hopping_interval = hoppingInterval;
    const bandwidth = resolved.bandwidth;
    if (bandwidth !== void 0) fields.bandwidth = bandwidth;
    return { hysteria2: fields };
  }
  function renderTuic(node) {
    const fields = {
      ...commonFields(node),
      uuid: requiredString(node.uuid)
    };
    setCredentialField(fields, "password", requiredString(node.password));
    const udpRelayMode = firstOwn(node, ["udp-relay-mode", "udp_relay_mode"]);
    if (udpRelayMode !== void 0) fields.udp_relay_mode = udpRelayMode;
    if (hasOwn2(node, "alpn")) fields.alpn = [...node.alpn];
    appendTlsFields(fields, node, { includeReality: false });
    const resolved = resolveEgernNodeOptions(node);
    if (resolved.portHopping !== void 0) fields.port_hopping = resolved.portHopping;
    if (resolved.portHoppingInterval !== void 0) fields.port_hopping_interval = resolved.portHoppingInterval;
    return { tuic: fields };
  }
  function renderSocks5(node) {
    const fields = appendCommonTcpOptions(commonFields(node), node, { udp: true });
    copyOptional(fields, "username", node);
    copyOptional(fields, "password", node);
    if (tlsRequested(node)) appendTlsFields(fields, node);
    return { [tlsRequested(node) ? "socks5_tls" : "socks5"]: fields };
  }
  function renderHttp(node) {
    const fields = appendCommonTcpOptions(commonFields(node), node);
    copyOptional(fields, "username", node);
    copyOptional(fields, "password", node);
    if (hasOwn2(node, "headers")) fields.headers = normalizedHeaders(node.headers);
    if (tlsRequested(node)) appendTlsFields(fields, node);
    return { [tlsRequested(node) ? "https" : "http"]: fields };
  }
  function renderSsh(node) {
    const resolved = resolveEgernNodeOptions(node);
    const fields = commonFields(node);
    fields.username = node.username;
    if (node.password !== void 0) setCredentialField(fields, "password", node.password);
    if (resolved.sshPrivateKey !== void 0) setCredentialField(fields, "private_key", resolved.sshPrivateKey);
    if (resolved.sshHostKeys !== void 0) fields.host_keys = [...resolved.sshHostKeys];
    copyOptional(fields, "tfo", node);
    return { ssh: fields };
  }
  function wireGuardAddresses(node) {
    const values = [];
    for (const key of ["local_ipv4", "local-ipv4", "local_ipv6", "local-ipv6", "ip", "ipv6", "local-address"]) {
      if (!hasOwn2(node, key)) continue;
      values.push(...Array.isArray(node[key]) ? node[key] : [node[key]]);
    }
    return {
      ipv4: values.find((value) => !String(value).includes(":")),
      ipv6: values.find((value) => String(value).includes(":"))
    };
  }
  function renderWireGuard(node) {
    const peer = node.peers?.[0] ?? {};
    const fields = {
      ...commonFields(node)
    };
    setCredentialField(fields, "private_key", requiredString(node["private-key"]));
    fields.peer_public_key = requiredString(peer["public-key"] ?? node["public-key"]);
    const presharedKey = peer["pre-shared-key"] ?? node["pre-shared-key"];
    if (presharedKey !== void 0) fields.preshared_key = presharedKey;
    const reserved = peer.reserved ?? node.reserved;
    if (reserved !== void 0) fields.reserved = [...reserved];
    const { ipv4, ipv6 } = wireGuardAddresses(node);
    if (ipv4 !== void 0) fields.local_ipv4 = ipv4;
    if (ipv6 !== void 0) fields.local_ipv6 = ipv6;
    const dns = node.dns_servers ?? node.dns;
    if (dns !== void 0) fields.dns_servers = [...dns];
    copyOptional(fields, "mtu", node);
    copyOptional(fields, "keepalive", node);
    return { wireguard: fields };
  }
  function appendClientChain(proxy, node, clientChain) {
    const presentAliases = CHAIN_ALIASES2.filter((key) => hasOwn2(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
    const generated = presentAliases.length === 1 && presentAliases[0] === "underlying-proxy" && node["underlying-proxy"] === EGERN_CHAIN_POLICY && node?._profile?.chained === true;
    if (presentAliases.length === 0) return proxy;
    if (!generated) throw new Error("Unsupported existing Egern proxy chain");
    if (clientChain === "off") throw new Error("Egern client chain is disabled");
    const fields = proxy[Object.keys(proxy)[0]];
    fields.prev_hop = EGERN_CHAIN_POLICY;
    return proxy;
  }
  function toEgernProxy(node, { clientChain = "off" } = {}) {
    if (clientChain !== "off" && clientChain !== "on") {
      throw new Error("clientChain must be off or on");
    }
    const reason = egernNodeExclusionReason(node ?? {});
    if (reason) throw new Error(REASON_MESSAGES[reason] ?? "Unsupported Egern proxy shape");
    const protocol2 = normalizeProtocol(node?.type);
    let proxy;
    switch (protocol2) {
      case "ss":
      case "shadowsocks":
        proxy = renderShadowsocks(node);
        break;
      case "snell":
        proxy = renderSnell(node);
        break;
      case "vmess":
        proxy = renderVmess(node);
        break;
      case "vless":
        proxy = renderVless(node);
        break;
      case "trojan":
        proxy = renderTrojan(node);
        break;
      case "anytls":
        proxy = renderAnytls(node);
        break;
      case "hysteria2":
      case "hy2":
        proxy = renderHysteria2(node);
        break;
      case "tuic":
        proxy = renderTuic(node);
        break;
      case "socks5":
        proxy = renderSocks5(node);
        break;
      case "http":
        proxy = renderHttp(node);
        break;
      case "ssh":
        proxy = renderSsh(node);
        break;
      case "wireguard":
        proxy = renderWireGuard(node);
        break;
      default:
        throw new Error("Unsupported Egern protocol");
    }
    const fields = proxy[Object.keys(proxy)[0]];
    appendLatestCommonOptions(fields, node);
    return appendClientChain(proxy, node, clientChain);
  }

  // render-subscription.js
  function isGeneratedChain(node) {
    return node?.["underlying-proxy"] === EGERN_CHAIN_POLICY && node?._profile?.chained === true;
  }
  function appendEgernSshChainClones(nodes, diagnostics, clientChain) {
    if (clientChain !== "on") return nodes;
    const hasEntry = nodes.some((node) => node?._profile?.entry === true && node?._profile?.chained !== true);
    if (!hasEntry) return nodes;
    const generatedNames = new Set(nodes.filter(isGeneratedChain).map((node) => node.name));
    const clones = [];
    for (const landing of nodes) {
      if (normalizeProtocol(landing.type) !== "ssh" || landing?._profile?.sourceKind !== "landing" || landing?._profile?.chained === true) continue;
      const name = `\u{1F517} ${landing.name}`;
      if (generatedNames.has(name)) continue;
      const clone = structuredClone(landing);
      clone.name = name;
      clone["underlying-proxy"] = EGERN_CHAIN_POLICY;
      clone._profile = { ...clone._profile, chained: true };
      clones.push(clone);
      generatedNames.add(name);
    }
    diagnostics.accepted += clones.length;
    return clones.length === 0 ? nodes : [...nodes, ...clones];
  }
  function formatExcludedCounts(excluded) {
    return Object.keys(excluded).sort((left, right) => left.localeCompare(right, "en")).map((reason) => `${reason}=${excluded[reason]}`).join(",");
  }
  function renderEgernSubscription(nodes, { clientChain = "off", onDiagnostics } = {}) {
    const prepared = prepareEgernInventory(nodes, { clientChain, onDiagnostics });
    return renderYaml({ proxies: prepared.proxies });
  }
  function prepareEgernInventory(nodes, { clientChain = "off", onDiagnostics } = {}) {
    if (clientChain !== "off" && clientChain !== "on") {
      throw new Error("clientChain must be off or on");
    }
    if (onDiagnostics !== void 0 && typeof onDiagnostics !== "function") {
      throw new Error("onDiagnostics must be a function");
    }
    const adapted = adaptEgernSubStoreNodes(nodes);
    const filtered = filterNodesForClient(adapted.nodes, CLIENT.egern);
    for (const [reason, count] of Object.entries(adapted.excluded)) {
      increment(filtered.diagnostics.excluded, reason, count);
    }
    const compatible = [];
    for (const node of filtered.nodes) {
      if (isGeneratedChain(node) && clientChain === "off") {
        increment(filtered.diagnostics.excluded, "client-chain-disabled");
        filtered.diagnostics.accepted -= 1;
      } else {
        compatible.push(node);
      }
    }
    const withEgernSshChains = appendEgernSshChainClones(compatible, filtered.diagnostics, clientChain);
    if (withEgernSshChains.length === 0) {
      const counts = formatExcludedCounts(filtered.diagnostics.excluded);
      throw new Error(`No compatible Egern nodes; excluded counts: ${counts || "none"}`);
    }
    const seenNames = /* @__PURE__ */ new Set();
    const proxies = withEgernSshChains.map((node) => {
      const proxy = toEgernProxy(node, { clientChain });
      const protocol2 = Object.keys(proxy)[0];
      const name = proxy[protocol2].name;
      if (seenNames.has(name)) throw new Error("Duplicate Egern proxy name");
      seenNames.add(name);
      return proxy;
    });
    onDiagnostics?.(structuredClone(filtered.diagnostics));
    return {
      nodes: withEgernSshChains,
      proxies,
      diagnostics: structuredClone(filtered.diagnostics)
    };
  }

  // runtime-fallbacks.js
  var CLONE_ERROR = "Egern structured clone fallback rejected unsupported data";
  var URL_ERROR = "Invalid Egern fallback URL";
  var RAW_URL_FORBIDDEN = /[\u0000-\u0020\u007f-\u009f\\\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/u;
  var ENCODED_URL_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f|[89][0-9a-f])/iu;
  var HEX = /^[0-9a-f]+$/iu;
  function cloneFailure() {
    return new TypeError(CLONE_ERROR);
  }
  function arrayIndex(key, length) {
    if (!/^(?:0|[1-9]\d*)$/u.test(key)) return false;
    const index = Number(key);
    return Number.isSafeInteger(index) && index >= 0 && index < length && index <= 4294967294 && String(index) === key;
  }
  function cloneData(value, seen) {
    if (value === null || typeof value !== "object") {
      if (["undefined", "boolean", "string", "number", "bigint"].includes(typeof value)) return value;
      throw cloneFailure();
    }
    if (seen.has(value)) return seen.get(value);
    const prototype = Object.getPrototypeOf(value);
    const isArray = Array.isArray(value);
    if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw cloneFailure();
    }
    const keys = Reflect.ownKeys(value);
    const result = isArray ? [] : Object.create(prototype === null ? null : Object.prototype);
    seen.set(value, result);
    const length = isArray ? value.length : 0;
    for (const key of keys) {
      if (typeof key !== "string") throw cloneFailure();
      if (isArray && key === "length") continue;
      if (isArray && !arrayIndex(key, length)) throw cloneFailure();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
        throw cloneFailure();
      }
      Object.defineProperty(result, key, {
        value: cloneData(descriptor.value, seen),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    if (isArray) result.length = length;
    return result;
  }
  function egernStructuredCloneFallback(value) {
    try {
      return cloneData(value, /* @__PURE__ */ new WeakMap());
    } catch {
      throw cloneFailure();
    }
  }
  function wellFormed(value) {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 55296 && code <= 56319) {
        const next = value.charCodeAt(index + 1);
        if (next < 56320 || next > 57343) return false;
        index += 1;
      } else if (code >= 56320 && code <= 57343) {
        return false;
      }
    }
    return true;
  }
  function validPercentEncoding(value) {
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== "%") continue;
      if (!/^[0-9a-f]{2}$/iu.test(value.slice(index + 1, index + 3))) return false;
      index += 2;
    }
    return !ENCODED_URL_CONTROL.test(value);
  }
  function validIpv4(value) {
    const parts = value.split(".");
    return parts.length === 4 && parts.every((part) => /^(?:0|[1-9]\d{0,2})$/u.test(part) && Number(part) <= 255);
  }
  function endsInNumber(value) {
    const parts = value.split(".");
    if (parts.at(-1) === "") parts.pop();
    const last = parts.at(-1) ?? "";
    return /^[0-9]+$/u.test(last) || /^0x[0-9a-f]*$/iu.test(last);
  }
  function ipv6Units(parts, allowIpv4) {
    let units = 0;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part.includes(".")) {
        if (!allowIpv4 || index !== parts.length - 1 || !validIpv4(part)) return -1;
        units += 2;
      } else {
        if (part.length < 1 || part.length > 4 || !HEX.test(part)) return -1;
        units += 1;
      }
    }
    return units;
  }
  function validIpv6(value) {
    if (value.length === 0 || value.includes("%") || value.includes(":::")) return false;
    const compression = value.indexOf("::");
    if (compression === -1) return ipv6Units(value.split(":"), true) === 8;
    if (compression !== value.lastIndexOf("::")) return false;
    const left = value.slice(0, compression);
    const right = value.slice(compression + 2);
    const leftParts = left === "" ? [] : left.split(":");
    const rightParts = right === "" ? [] : right.split(":");
    const leftUnits = ipv6Units(leftParts, false);
    const rightUnits = ipv6Units(rightParts, true);
    return leftUnits >= 0 && rightUnits >= 0 && leftUnits + rightUnits < 8;
  }
  function parsedCredentials(authority) {
    const marker = authority.indexOf("@");
    if (marker === -1) return { username: "", passcode: "", hostPort: authority };
    if (marker !== authority.lastIndexOf("@")) throw new TypeError(URL_ERROR);
    const userInfo = authority.slice(0, marker);
    if (!/^[A-Za-z0-9._~!$&'()*+,;=:-]*$/u.test(userInfo)) throw new TypeError(URL_ERROR);
    const separator = userInfo.indexOf(":");
    return {
      username: separator === -1 ? userInfo : userInfo.slice(0, separator),
      passcode: separator === -1 ? "" : userInfo.slice(separator + 1),
      hostPort: authority.slice(marker + 1)
    };
  }
  function parsedPort(value) {
    if (value === "") throw new TypeError(URL_ERROR);
    if (!/^\d{1,5}$/u.test(value) || Number(value) > 65535) throw new TypeError(URL_ERROR);
    return String(Number(value));
  }
  function validDnsName(value) {
    const comparable = value.endsWith(".") ? value.slice(0, -1) : value;
    if (comparable.length === 0 || comparable.length > 253) return false;
    if (validIpv4(comparable)) return true;
    if (endsInNumber(value)) return false;
    return comparable.split(".").every((label) => label.length >= 1 && label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label));
  }
  function parsedHost(hostPort) {
    if (hostPort.length === 0 || hostPort.includes("%")) throw new TypeError(URL_ERROR);
    if (hostPort.startsWith("[")) {
      const close = hostPort.indexOf("]");
      if (close === -1 || close !== hostPort.lastIndexOf("]")) throw new TypeError(URL_ERROR);
      const address = hostPort.slice(1, close);
      const remainder = hostPort.slice(close + 1);
      if (!validIpv6(address) || remainder !== "" && !remainder.startsWith(":")) {
        throw new TypeError(URL_ERROR);
      }
      return {
        hostname: `[${address.toLowerCase()}]`,
        port: remainder === "" ? "" : parsedPort(remainder.slice(1))
      };
    }
    if (hostPort.includes("[") || hostPort.includes("]")) throw new TypeError(URL_ERROR);
    const separators = hostPort.match(/:/gu)?.length ?? 0;
    if (separators > 1) throw new TypeError(URL_ERROR);
    const separator = hostPort.lastIndexOf(":");
    const hostname = separator === -1 ? hostPort : hostPort.slice(0, separator);
    const port = separator === -1 ? "" : parsedPort(hostPort.slice(separator + 1));
    if (!validDnsName(hostname)) throw new TypeError(URL_ERROR);
    return { hostname: hostname.toLowerCase(), port };
  }
  var EgernUrlFallback = class {
    constructor(value) {
      try {
        if (typeof value !== "string" || value.length === 0 || !wellFormed(value) || RAW_URL_FORBIDDEN.test(value) || !validPercentEncoding(value)) throw new TypeError(URL_ERROR);
        const match = /^(https?):\/\/([^/?#]+)([/?#].*)?$/iu.exec(value);
        if (!match) throw new TypeError(URL_ERROR);
        const credentials = parsedCredentials(match[2]);
        const host = parsedHost(credentials.hostPort);
        this.protocol = `${match[1].toLowerCase()}:`;
        this.hostname = host.hostname;
        this.username = credentials.username;
        Object.defineProperty(this, "password", {
          value: credentials.passcode,
          configurable: true,
          enumerable: true,
          writable: true
        });
        this.port = host.port;
      } catch {
        throw new TypeError(URL_ERROR);
      }
    }
  };
  function install(name, value) {
    try {
      Object.defineProperty(globalThis, name, {
        value,
        configurable: true,
        enumerable: false,
        writable: true
      });
    } catch {
      throw new Error("Egern runtime compatibility unavailable");
    }
  }
  function installEgernRuntimeFallbacks() {
    let cloneImplementation;
    let urlImplementation;
    try {
      cloneImplementation = globalThis.structuredClone;
      urlImplementation = globalThis.URL;
      if (cloneImplementation !== void 0 && typeof cloneImplementation !== "function") {
        throw new Error("Invalid structured clone global");
      }
      if (urlImplementation !== void 0 && typeof urlImplementation !== "function") {
        throw new Error("Invalid URL global");
      }
    } catch {
      throw new Error("Egern runtime compatibility unavailable");
    }
    if (cloneImplementation === void 0) {
      install("structuredClone", egernStructuredCloneFallback);
    }
    if (urlImplementation === void 0) {
      install("URL", EgernUrlFallback);
    }
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
  var CHAIN_ALIASES3 = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  function hasExistingChain(node) {
    return CHAIN_ALIASES3.some((key) => {
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

  // substore-runtime.js
  var DIAGNOSTIC_PREFIX = "[egern-profile] ";
  function argumentsFrom(context) {
    if (context === void 0) return {};
    if (context === null || typeof context !== "object") {
      throw new Error("Egern operator context is invalid");
    }
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(context, "arguments");
    } catch {
      throw new Error("Egern operator arguments are unavailable");
    }
    if (descriptor === void 0) return {};
    if ("get" in descriptor || "set" in descriptor) {
      throw new Error("Egern operator arguments are unavailable");
    }
    return descriptor.value;
  }
  function producerFrom(context) {
    let producer;
    try {
      producer = context?.produceArtifact;
    } catch {
      throw new Error("produceArtifact is unavailable");
    }
    if (typeof producer !== "function") throw new Error("produceArtifact is unavailable");
    return producer;
  }
  async function produceNormalizedNodes(options, context) {
    const producer = producerFrom(context);
    let rawNodes;
    try {
      rawNodes = await producer({
        type: options.type,
        name: options.name,
        platform: "JSON",
        produceType: "internal"
      });
    } catch {
      throw new Error("Egern node artifact production failed");
    }
    let nonEmptyArray;
    try {
      nonEmptyArray = Array.isArray(rawNodes) && rawNodes.length > 0;
    } catch {
      throw new Error("produceArtifact must return a non-empty node array");
    }
    if (!nonEmptyArray) throw new Error("produceArtifact must return a non-empty node array");
    try {
      return normalizeNodes(rawNodes, { clientChain: options.clientChain });
    } catch {
      throw new Error("Invalid Egern node inventory");
    }
  }
  function mergedEgernDiagnostics(normalizationDiagnostics, egernDiagnostics) {
    const diagnostics = structuredClone(normalizationDiagnostics);
    diagnostics.accepted = egernDiagnostics.accepted;
    for (const [reason, count] of Object.entries(egernDiagnostics.excluded)) {
      increment(diagnostics.excluded, reason, count);
    }
    return diagnostics;
  }
  function logEgernDiagnostics(context, diagnostics) {
    let logger;
    try {
      logger = context?.logger;
    } catch {
      return;
    }
    let method = null;
    try {
      method = typeof logger === "function" ? logger : typeof logger?.info === "function" ? logger.info.bind(logger) : typeof logger?.log === "function" ? logger.log.bind(logger) : null;
    } catch {
      return;
    }
    if (method === null) return;
    try {
      method(`${DIAGNOSTIC_PREFIX}${JSON.stringify(diagnostics)}`);
    } catch {
    }
  }

  // substore-nodes-entry.js
  var ALLOWED_KEYS = /* @__PURE__ */ new Set(["output", "type", "name", "clientChain"]);
  var AMBIGUOUS_WHITESPACE = /[\t\v\f\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/u;
  var CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function nodeArguments(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Egern node arguments must be a plain object");
    }
    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(raw);
      keys = Reflect.ownKeys(raw);
    } catch {
      throw new Error("Egern node arguments must be a plain object");
    }
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Egern node arguments must not contain inherited options");
    }
    const values = /* @__PURE__ */ new Map();
    for (const key of keys) {
      if (typeof key !== "string") throw new Error("Unknown Egern node option");
      if (PROTOTYPE_KEYS.has(key)) throw new Error("Egern node prototype option is forbidden");
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(raw, key);
      } catch {
        throw new Error("Invalid Egern node option descriptor");
      }
      if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
        throw new Error("Invalid Egern node option descriptor");
      }
      if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error("Unknown Egern node option");
      values.set(key, descriptor.value);
    }
    if (values.get("output") !== "nodes") throw new Error("Egern node output must be nodes");
    if (values.get("type") !== "collection") throw new Error("Egern node type must be collection");
    const name = values.get("name");
    if (typeof name !== "string" || name.length === 0 || name.trim() !== name || CONTROL_CHARACTERS.test(name) || AMBIGUOUS_WHITESPACE.test(name)) throw new Error("Egern node name is invalid");
    const clientChain = values.has("clientChain") ? values.get("clientChain") : "off";
    if (clientChain !== "off" && clientChain !== "on") {
      throw new Error("Egern node clientChain must be off or on");
    }
    return Object.freeze({ output: "nodes", type: "collection", name, clientChain });
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    installEgernRuntimeFallbacks();
    const options = nodeArguments(argumentsFrom(context));
    const normalized = await produceNormalizedNodes(options, context);
    let egernDiagnostics;
    const content = renderEgernSubscription(normalized.nodes, {
      clientChain: options.clientChain,
      onDiagnostics(value) {
        egernDiagnostics = value;
      }
    });
    const diagnostics = mergedEgernDiagnostics(normalized.diagnostics, egernDiagnostics);
    logEgernDiagnostics(context, diagnostics);
    return { ...input, $content: content };
  }
  return __toCommonJS(substore_nodes_entry_exports);
})();

async function operator(input, targetPlatform) {
  return EgernNodeBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
