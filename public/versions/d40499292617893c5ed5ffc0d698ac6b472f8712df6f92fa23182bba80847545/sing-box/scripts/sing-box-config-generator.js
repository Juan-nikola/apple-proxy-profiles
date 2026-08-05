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
  var CHAIN_ALIASES = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  var GENERATED_CHAIN_POLICY = "\u{1F517} \u5165\u53E3\u8282\u70B9";
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
    const aliases = CHAIN_ALIASES.filter((key) => hasOwn(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
    if (aliases.length === 0) return outbound;
    if (aliases.length !== 1 || aliases[0] !== "underlying-proxy" || node["underlying-proxy"] !== GENERATED_CHAIN_POLICY || node?._profile?.chained !== true) {
      throw new Error("Unsupported existing sing-box proxy chain");
    }
    outbound.detour = GENERATED_CHAIN_POLICY;
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
    const nodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
    logDiagnostics(context, options, nodes);
    const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/sing-box/rules`;
    const config = renderSingBoxConfig(options, nodes, { ruleBaseUrl, ruleSetFormat: "source" });
    return { ...input, $content: `${JSON.stringify(config, null, 2)}
` };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return SingBoxConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
