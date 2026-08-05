var SurgeProfileBundle = (() => {
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
    PUBLIC_RULE_BASE_URL: () => PUBLIC_RULE_BASE_URL,
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
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    autoGroupMode: "auto",
    clientChain: "off"
  });
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad"]);
  var PARSED = /* @__PURE__ */ new WeakSet();
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);
  function requiredString(raw, key) {
    const value = raw[key];
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
      throw new Error(`Option '${key}' must be a non-empty single-line string`);
    }
    return value;
  }
  function enumValue(raw, key, defaultValue) {
    const value = raw[key] === void 0 ? defaultValue : raw[key];
    if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
      throw new Error(`Option '${key}' has an unsupported value`);
    }
    return value;
  }
  function parseSurgeOptions(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Surge options must be an object");
    for (const key of Object.keys(raw)) {
      if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error(`Unknown Surge option: ${key}`);
    }
    for (const key of REQUIRED_KEYS) {
      if (!Object.hasOwn(raw, key)) throw new Error(`Option '${key}' is required`);
    }
    const platform = requiredString(raw, "platform");
    if (!PLATFORMS.has(platform)) throw new Error("Option 'platform' has an unsupported value");
    if (requiredString(raw, "output") !== "config") throw new Error("Option 'output' must be config");
    if (requiredString(raw, "type") !== "collection") throw new Error("Option 'type' must be collection");
    const options = {
      output: "config",
      type: "collection",
      name: requiredString(raw, "name"),
      subscriptionName: requiredString(raw, "subscriptionName"),
      platform,
      dnsMode: enumValue(raw, "dnsMode", DEFAULTS.dnsMode),
      chinaDns: enumValue(raw, "chinaDns", DEFAULTS.chinaDns),
      globalDns: enumValue(raw, "globalDns", DEFAULTS.globalDns),
      blockMode: enumValue(raw, "blockMode", DEFAULTS.blockMode),
      quicMode: enumValue(raw, "quicMode", DEFAULTS.quicMode),
      ipv6Mode: enumValue(raw, "ipv6Mode", platform === "macos" ? "ipv4-only" : DEFAULTS.ipv6Mode),
      autoGroupMode: enumValue(raw, "autoGroupMode", DEFAULTS.autoGroupMode),
      clientChain: enumValue(raw, "clientChain", DEFAULTS.clientChain)
    };
    platformPolicyPreset(platform);
    Object.freeze(options);
    PARSED.add(options);
    return options;
  }
  function isParsedSurgeOptions(value) {
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
  var COMMON_KEYS = /* @__PURE__ */ new Set([
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
    "network",
    "ws-opts",
    "grpc-opts",
    "h2-opts",
    "http-opts",
    "cipher",
    "password",
    "protocol",
    "obfs",
    "protocol-param",
    "obfs-param",
    "psk",
    "version",
    "uuid",
    "flow",
    "alter-id",
    "alterId",
    "username",
    "private-key",
    "public-key",
    "peers",
    "pre-shared-key",
    "local-address",
    "local_ipv4",
    "local-ipv4",
    "local_ipv6",
    "local-ipv6",
    "ip",
    "ipv6",
    "reality-opts"
  ]);
  function escapeValue(value) {
    const text = String(value);
    if (/[\r\n]/u.test(text)) throw new Error("Surge node value contains a line break");
    return text.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
  }
  function requiredString2(node, key) {
    const value = node[key];
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
      throw new Error(`Surge node field '${key}' is invalid`);
    }
    return value;
  }
  function requiredPort(node) {
    const port = Number(node.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Surge node port is invalid");
    return port;
  }
  function validateNodeShape(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError("Surge node is invalid");
    if (typeof node.name !== "string" || !node.name || /[\r\n=]/u.test(node.name)) throw new Error("Surge node name is invalid");
    requiredString2(node, "server");
    requiredPort(node);
    for (const key of Object.keys(node)) {
      if (key.startsWith("_")) continue;
      if (!COMMON_KEYS.has(key)) throw new Error(`Surge node contains unsupported field: ${key}`);
    }
  }
  function option(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target.push(`${key}=${escapeValue(value)}`);
  }
  function tlsOptions(node, target) {
    const tls = node.tls === true || node.security === "tls" || node.security === "reality" || node["reality-opts"] !== void 0;
    if (!tls) return;
    target.push("tls=true");
    option(target, "sni", node.sni ?? node.servername);
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) target.push("skip-cert-verify=true");
    option(target, "client-fingerprint", node["client-fingerprint"]);
    const reality = node["reality-opts"];
    if (reality !== void 0) {
      if (!reality || typeof reality !== "object" || typeof reality["public-key"] !== "string") throw new Error("Surge Reality options are invalid");
      target.push("reality=true");
      option(target, "public-key", reality["public-key"]);
      option(target, "short-id", reality["short-id"]);
    }
  }
  function transportOptions(node, target) {
    const network = String(node.network ?? "tcp").toLowerCase();
    if (network === "tcp" || network === "raw") return;
    if (network === "ws") {
      const ws = node["ws-opts"];
      if (!ws || typeof ws !== "object" || Array.isArray(ws)) throw new Error("Surge WebSocket options are invalid");
      target.push("ws=true");
      option(target, "ws-path", Array.isArray(ws.path) ? ws.path[0] : ws.path ?? "/");
      const headers = ws.headers;
      if (headers && typeof headers === "object") {
        const host = headers.Host ?? headers.host;
        option(target, "ws-headers", host === void 0 ? void 0 : `Host=${host}`);
      }
      return;
    }
    if (network === "grpc") {
      const grpc = node["grpc-opts"] ?? {};
      target.push("grpc=true");
      option(target, "grpc-service-name", grpc["grpc-service-name"]);
      return;
    }
    if (network === "h2" || network === "http2") {
      const h2 = node["h2-opts"] ?? {};
      target.push("h2=true");
      option(target, "h2-path", Array.isArray(h2.path) ? h2.path[0] : h2.path);
      return;
    }
    throw new Error(`Unsupported Surge transport: ${network}`);
  }
  function base(node, type) {
    return [escapeValue(node.name), type, escapeValue(node.server), String(requiredPort(node))];
  }
  function renderSurgeProxy(node) {
    validateNodeShape(node);
    const protocol2 = normalizeProtocol(node.type);
    let fields;
    switch (protocol2) {
      case "ss":
      case "shadowsocks":
        fields = base(node, "ss");
        option(fields, "encrypt-method", requiredString2(node, "cipher"));
        option(fields, "password", requiredString2(node, "password"));
        if (node.udp === true) fields.push("udp-relay=true");
        break;
      case "ssr":
        fields = base(node, "ssr");
        option(fields, "encrypt-method", requiredString2(node, "cipher"));
        option(fields, "password", requiredString2(node, "password"));
        option(fields, "protocol", requiredString2(node, "protocol"));
        option(fields, "obfs", requiredString2(node, "obfs"));
        option(fields, "protocol-param", node["protocol-param"]);
        option(fields, "obfs-param", node["obfs-param"]);
        break;
      case "snell":
        fields = base(node, "snell");
        option(fields, "psk", requiredString2(node, "psk"));
        option(fields, "version", node.version);
        break;
      case "vmess":
        fields = base(node, "vmess");
        option(fields, "username", requiredString2(node, "uuid"));
        option(fields, "encrypt-method", node.cipher ?? node.security ?? "auto");
        tlsOptions(node, fields);
        transportOptions(node, fields);
        break;
      case "vless":
        fields = base(node, "vless");
        option(fields, "username", requiredString2(node, "uuid"));
        option(fields, "flow", node.flow);
        tlsOptions(node, fields);
        transportOptions(node, fields);
        break;
      case "trojan":
        fields = base(node, "trojan");
        option(fields, "password", requiredString2(node, "password"));
        tlsOptions({ ...node, tls: true }, fields);
        transportOptions(node, fields);
        break;
      case "hysteria2":
      case "hy2":
        fields = base(node, "hysteria2");
        option(fields, "password", requiredString2(node, "password"));
        tlsOptions({ ...node, tls: true }, fields);
        option(fields, "obfs", node.obfs);
        option(fields, "obfs-password", node["obfs-password"] ?? node["obfs_password"]);
        break;
      case "tuic":
        fields = base(node, "tuic");
        option(fields, "uuid", requiredString2(node, "uuid"));
        option(fields, "password", requiredString2(node, "password"));
        tlsOptions({ ...node, tls: true }, fields);
        option(fields, "udp-relay-mode", node["udp-relay-mode"] ?? node["udp_relay_mode"]);
        break;
      case "socks5":
        fields = base(node, node.tls === true ? "socks5-tls" : "socks5");
        option(fields, "username", node.username);
        option(fields, "password", node.password);
        if (node.tls === true) tlsOptions(node, fields);
        break;
      case "http":
        fields = base(node, node.tls === true ? "https" : "http");
        option(fields, "username", node.username);
        option(fields, "password", node.password);
        if (node.tls === true) tlsOptions(node, fields);
        break;
      default:
        throw new Error(`Unsupported Surge protocol: ${protocol2 || "unknown"}`);
    }
    return `${fields[0]} = ${fields.slice(1).join(",")}`;
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
  function escapeValue2(value) {
    const text = String(value);
    if (/[\r\n]/u.test(text)) throw new Error("Surge group value contains a line break");
    return text.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
  }
  function targetName(value) {
    return value === POLICY_TARGET.primaryProxy ? "\u26A1 \u5168\u90E8\u81EA\u52A8" : value;
  }
  function matches(filter, node) {
    if (filter === null) return false;
    try {
      return new RegExp(filter, "u").test(node.name);
    } catch {
      throw new Error("Invalid Surge policy filter");
    }
  }
  function renderSurgeGroups(options, nodes) {
    const inventory = Array.isArray(nodes) ? nodes : [];
    const shared = buildPolicyGroups(options, inventory);
    const names = new Set(shared.map(({ name }) => name));
    return shared.map((group) => {
      const filteredNodes = inventory.filter((node) => matches(group.nodeFilter, node)).map(({ name }) => name);
      const items = [...group.candidates.map(targetName), ...filteredNodes].filter((item, index, all) => all.indexOf(item) === index);
      if (items.length === 0) items.push("DIRECT");
      const fields = [group.strategy === "auto-test" ? "url-test" : group.strategy, ...items.map(escapeValue2)];
      if (group.test?.url !== void 0) fields.push(`url=${escapeValue2(group.test.url)}`);
      if (group.test?.interval !== void 0) fields.push(`interval=${escapeValue2(group.test.interval)}`);
      if (group.test?.timeout !== void 0) fields.push(`timeout=${escapeValue2(group.test.timeout)}`);
      if (group.test?.tolerance !== void 0) fields.push(`tolerance=${escapeValue2(group.test.tolerance)}`);
      if (group.defaultChoice !== void 0) fields.push(`policy-select-name=${escapeValue2(group.defaultChoice)}`);
      if (group.hidden) fields.push("hidden=1");
      if (items.some((item) => item !== "DIRECT" && item !== "REJECT" && !names.has(item) && !inventory.some((node) => node.name === item))) {
        throw new Error("Surge group contains an unresolved policy reference");
      }
      return `${escapeValue2(group.name)} = ${fields.join(",")}`;
    });
  }

  // ../../shared/rules/custom-rules.js
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
  var GAME_DIRECT_RULES = Object.freeze([
    "DOMAIN-SUFFIX,leiting.com,DIRECT",
    "DOMAIN-SUFFIX,leitingcn.com,DIRECT",
    "DOMAIN-SUFFIX,g-bits.com,DIRECT"
  ]);
  function safeBaseUrl(value) {
    if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
      throw new Error("Surge rule base URL must be an HTTPS URL without commas");
    }
    return value.replace(/\/+$/u, "");
  }
  function renderSurgeRules({ ruleBaseUrl }) {
    const base2 = safeBaseUrl(ruleBaseUrl);
    const lines = [...LOCAL_RULES, "# Custom rules"];
    const custom = [
      ["CUSTOM_BLOCK", CUSTOM_RULES.block, "REJECT"],
      ["CUSTOM_DIRECT", CUSTOM_RULES.direct, "DIRECT"],
      ["CUSTOM_PROXY", CUSTOM_RULES.proxy, "\u{1F680} \u8282\u70B9\u9009\u62E9"],
      ["CUSTOM_AI", CUSTOM_RULES.ai, "\u{1F916} AI \u4E13\u7528"]
    ];
    for (const [name, rules, policy] of custom) {
      lines.push(`# ${name}`, ...rules.map((rule2) => `${rule2},${policy}`));
    }
    const assignments = RULE_CLIENT_CATALOG;
    const steamIndex = assignments.findIndex(({ id }) => id === "SteamCN");
    const gameIndex = assignments.findIndex(({ id }) => id === "Game");
    if (steamIndex < 0 || gameIndex <= steamIndex) throw new Error("Invalid Surge rule assignment order");
    const render = (source) => `${source.inputFormat},${base2}/${source.id}.list,${source.policy},update-interval=86400`;
    lines.push(...assignments.slice(0, steamIndex).map(render));
    lines.push(...GAME_DIRECT_RULES);
    lines.push(...assignments.slice(steamIndex, gameIndex).map(render));
    const game = assignments[gameIndex];
    lines.push(`AND,((PROTOCOL,UDP),(${game.inputFormat},${base2}/${game.id}.list)),${game.policy}`);
    lines.push(render(game));
    lines.push(...assignments.slice(gameIndex + 1).map(render));
    lines.push("GEOIP,CN,DIRECT", "FINAL,\u{1F680} \u8282\u70B9\u9009\u62E9");
    return lines;
  }

  // src/validate-profile.js
  function splitEscaped(line) {
    const fields = [];
    let current = "";
    let escaped = false;
    for (const character of line) {
      if (escaped) {
        current += character;
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === ",") {
        fields.push(current);
        current = "";
      } else {
        current += character;
      }
    }
    if (escaped) return null;
    fields.push(current);
    return fields;
  }
  function sectionRecords(profile) {
    if (typeof profile !== "string") return { sections: null, errors: ["Profile must be a string"] };
    const sections = /* @__PURE__ */ new Map();
    let current;
    for (const rawLine of profile.replace(/\r\n?/gu, "\n").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const header = /^\[([^\]]+)\]$/u.exec(line);
      if (header) {
        current = header[1];
        if (sections.has(current)) return { sections: null, errors: ["duplicate required section"] };
        sections.set(current, []);
        continue;
      }
      if (!current || !sections.has(current)) return { sections: null, errors: ["content outside section"] };
      sections.get(current).push(line);
    }
    return { sections, errors: [] };
  }
  function lineValue(line) {
    const index = line.indexOf(" = ");
    if (index < 1) return null;
    return [line.slice(0, index), line.slice(index + 3)];
  }
  function validateSurgeProfile(profile) {
    const parsed = sectionRecords(profile);
    if (parsed.errors.length > 0) return { valid: false, errors: parsed.errors };
    const required = ["General", "Proxy", "Proxy Group", "Rule"];
    const errors = required.filter((section) => !parsed.sections.has(section)).map((section) => `missing section: ${section}`);
    if (errors.length > 0) return { valid: false, errors };
    const proxyNames = /* @__PURE__ */ new Set();
    for (const line of parsed.sections.get("Proxy")) {
      const record = lineValue(line);
      if (!record || splitEscaped(record[1])?.length < 2) errors.push("malformed proxy line");
      else if (proxyNames.has(record[0])) errors.push("duplicate proxy name");
      else proxyNames.add(record[0]);
      if (line.includes("_profile") || line.includes("_subName")) errors.push("internal node metadata leaked");
    }
    const groups = /* @__PURE__ */ new Map();
    for (const line of parsed.sections.get("Proxy Group")) {
      const record = lineValue(line);
      const fields = record && splitEscaped(record[1]);
      if (!record || !fields || fields.length < 2) {
        errors.push("malformed group line");
        continue;
      }
      if (groups.has(record[0])) errors.push("duplicate group name");
      groups.set(record[0], { type: fields[0], items: fields.slice(1).filter((field) => !field.includes("=")) });
    }
    const allowed = /* @__PURE__ */ new Set(["DIRECT", "REJECT", ...proxyNames, ...groups.keys()]);
    for (const group of groups.values()) {
      for (const item of group.items) if (!allowed.has(item)) errors.push("missing group or proxy reference");
    }
    const visiting = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    const visit = (name) => {
      if (visiting.has(name)) {
        errors.push("group cycle");
        return;
      }
      if (visited.has(name)) return;
      visiting.add(name);
      for (const item of groups.get(name)?.items ?? []) if (groups.has(item)) visit(item);
      visiting.delete(name);
      visited.add(name);
    };
    for (const name of groups.keys()) visit(name);
    const rules = parsed.sections.get("Rule");
    const finals = rules.filter((line) => /^FINAL,/u.test(line));
    if (finals.length !== 1) errors.push("Rule must contain exactly one FINAL");
    if (finals.length === 1 && rules.at(-1) !== finals[0]) errors.push("rules after FINAL");
    const policies = /* @__PURE__ */ new Set(["DIRECT", "REJECT", ...proxyNames, ...groups.keys()]);
    const ipRuleTypes = /* @__PURE__ */ new Set(["IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR", "DEST-PORT", "DST-PORT", "IP-ASN", "GEOIP"]);
    for (const line of rules.filter((item) => !item.startsWith("#") && !/^FINAL,/u.test(item))) {
      const fields = splitEscaped(line);
      const policy = fields?.[0] === "RULE-SET" || fields?.[0] === "DOMAIN-SET" || ipRuleTypes.has(fields?.[0]) ? fields?.[2] : fields?.at(-1);
      if (!fields || fields.length < 2 || !policies.has(policy)) errors.push("rule references missing policy");
    }
    return { valid: errors.length === 0, errors: [...new Set(errors)] };
  }

  // src/render-profile.js
  var LOCAL_SKIP_PROXY = Object.freeze([
    "localhost",
    "*.local",
    "*.lan",
    "*.home.arpa",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "224.0.0.0/4",
    "::1/128",
    "fc00::/7",
    "fe80::/10",
    "ff00::/8"
  ]);
  function generalSettings(options) {
    const chinaDns = { alidns: "223.5.5.5", dnspod: "119.29.29.29", system: "system" }[options.chinaDns];
    const globalDns = { cloudflare: "1.1.1.1", google: "8.8.8.8", quad9: "9.9.9.9" }[options.globalDns];
    return [
      "loglevel = notify",
      `ipv6 = ${options.ipv6Mode === "auto" ? "true" : "false"}`,
      `dns-server = ${chinaDns},${globalDns}`,
      `skip-proxy = ${LOCAL_SKIP_PROXY.join(",")}`,
      "exclude-simple-hostnames = true",
      "internet-test-url = http://www.gstatic.com/generate_204",
      "proxy-test-url = http://www.gstatic.com/generate_204",
      `test-timeout = ${options.platform === "macos" ? 5 : 7}`,
      "suppress-warnings = true"
    ];
  }
  function renderSurgeProfile(rawOptions, nodes, { ruleBaseUrl } = {}) {
    const options = isParsedSurgeOptions(rawOptions) ? rawOptions : parseSurgeOptions(rawOptions);
    const inventory = Array.isArray(nodes) ? nodes : [];
    if (inventory.length === 0) throw new Error("Surge refuses an empty node inventory");
    for (const node of inventory) nodeMetadata(node);
    const proxyLines = inventory.map(renderSurgeProxy);
    const profile = [
      "# Generated by apple-proxy-profiles. Private Sub-Store output.",
      `[General]
${generalSettings(options).join("\n")}`,
      `[Proxy]
${proxyLines.join("\n")}`,
      `[Proxy Group]
${renderSurgeGroups(options, inventory).join("\n")}`,
      `[Rule]
${renderSurgeRules({ ruleBaseUrl }).join("\n")}`
    ].join("\n\n") + "\n";
    const validation = validateSurgeProfile(profile);
    if (!validation.valid) throw new Error(`Generated Surge profile failed validation: ${validation.errors.join(",")}`);
    return profile;
  }

  // src/substore-profile-entry.js
  var PUBLIC_RULE_BASE_URL = "https://juan-nikola.github.io/apple-proxy-profiles/current/surge/rules";
  function logDiagnostics(context, options, nodes) {
    const logger = context?.logger;
    const method = typeof logger === "function" ? logger : typeof logger?.info === "function" ? logger.info.bind(logger) : typeof logger?.log === "function" ? logger.log.bind(logger) : null;
    if (!method) return;
    try {
      method(`[surge-profile] ${JSON.stringify({ client: "surge", platform: options.platform, accepted: nodes.length })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseSurgeOptions(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
    const nodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
    logDiagnostics(context, options, nodes);
    const profile = renderSurgeProfile(options, nodes, { ruleBaseUrl: PUBLIC_RULE_BASE_URL });
    return { ...input, $content: profile };
  }
  return __toCommonJS(substore_profile_entry_exports);
})();
async function operator(input, targetPlatform) {
  return SurgeProfileBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
