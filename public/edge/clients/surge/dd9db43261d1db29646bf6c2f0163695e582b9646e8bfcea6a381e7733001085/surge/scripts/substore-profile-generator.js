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
    PUBLIC_RULE_ROOT: () => PUBLIC_RULE_ROOT,
    operator: () => operator
  });

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
  function increment(bucket, key, amount = 1) {
    const current = Object.hasOwn(bucket, key) ? bucket[key] : 0;
    Object.defineProperty(bucket, key, {
      value: current + amount,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  // ../../shared/contracts.js
  var CLIENT = Object.freeze({
    anywhere: "anywhere",
    egern: "egern",
    shadowrocket: "shadowrocket",
    surge: "surge",
    singbox: "singbox",
    onexray: "onexray",
    happ: "happ",
    v2rayn: "v2rayn",
    v2box: "v2box"
  });
  var PRIVATE_POLICY_CHANNELS = Object.freeze(["edge", "current", "previous"]);
  var PRIVATE_POLICY_CLIENTS = Object.freeze([CLIENT.happ, CLIENT.onexray]);
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
  var CHAIN_ALIASES = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  function hasExistingChain(node) {
    return CHAIN_ALIASES.some((key) => {
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
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box], {
      requiredFields: ["cipher", "password"]
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.onexray, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box]),
    protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.v2rayn, CLIENT.v2box]),
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

  // ../../shared/nodes/node-validation.js
  var PSEUDO_NODE_PATTERN = /剩余|流量|到期|套餐|官网|公告|通知|traffic|expire|website/i;
  function isNonblankOpaqueString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isNonblankIdentifier(value) {
    return isNonblankOpaqueString(value) && value.trim() === value;
  }
  var OPAQUE_AUTH_FIELDS = /* @__PURE__ */ new Set(["password", "psk", "private-key", "public-key", "key"]);
  function isValidPort(value) {
    const port = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }
  function isValidAuthField(field, value) {
    if (field === "version") {
      const version = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
      return Number.isInteger(version) && version >= 1;
    }
    return OPAQUE_AUTH_FIELDS.has(field) ? isNonblankOpaqueString(value) : isNonblankIdentifier(value);
  }
  function hasTlsIdentity(node) {
    return Boolean(
      isNonblankIdentifier(node.sni) || isNonblankIdentifier(node.servername) || node["skip-cert-verify"] === true || node["allow-insecure"] === true || isNonblankIdentifier(node["reality-opts"]?.["public-key"])
    );
  }
  function wireGuardPublicKey(node) {
    if (isNonblankOpaqueString(node["public-key"])) return node["public-key"];
    if (!Array.isArray(node.peers) || node.peers.length !== 1) return void 0;
    const peer = node.peers[0];
    return peer && typeof peer === "object" && !Array.isArray(peer) ? peer["public-key"] : void 0;
  }
  function hasSshAuthentication(node) {
    return isNonblankOpaqueString(node.password) || isNonblankOpaqueString(node["private-key"]) || isNonblankOpaqueString(node.private_key);
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
    if (typeof node.type !== "string" || !node.type.trim() || !isNonblankIdentifier(node.server) || !isValidPort(node.port)) {
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
        for (const records2 of suffixGroups.values()) {
          records2.forEach((record2, index) => {
            const suffix = records2.length > 1 ? `${record2.suffix}-${index + 1}` : record2.suffix;
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

  // ../../shared/nodes/renderability.js
  function protocolOf(node) {
    try {
      return normalizeProtocol(node?.type) || "unknown";
    } catch {
      return "unknown";
    }
  }
  function validateRenderableInvocation(nodes, clientName, renderOneNode) {
    if (!Array.isArray(nodes)) throw new TypeError("Renderable node inventory must be an array");
    if (typeof clientName !== "string" || !/^[A-Za-z][A-Za-z0-9 -]*$/u.test(clientName)) {
      throw new TypeError("Render client name is invalid");
    }
    if (typeof renderOneNode !== "function") throw new TypeError("Node renderer must be a function");
  }
  function failureSummary(failures) {
    return Object.keys(failures).sort((left, right) => left.localeCompare(right, "en")).map((protocol2) => `${protocol2}=${failures[protocol2]}`).join(",");
  }
  function partitionRenderableNodes(nodes, clientName, renderOneNode) {
    validateRenderableInvocation(nodes, clientName, renderOneNode);
    const failures = {};
    const renderable = [];
    for (const node of nodes) {
      try {
        renderOneNode(node);
        renderable.push(node);
      } catch {
        increment(failures, protocolOf(node));
      }
    }
    if (renderable.length === 0) {
      throw new Error(`${clientName} cannot render selected protocols: ${failureSummary(failures)}`);
    }
    return { renderable, failureProtocols: failures };
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
  function invalid(message) {
    return new Error(`Invalid node reference: ${message}`);
  }
  function freeze(value) {
    return Object.freeze(value);
  }
  function parseNodeReference(target) {
    if (typeof target !== "string" || !target.startsWith("NODE:")) {
      throw invalid("target must be NODE:<name> or NODE:<name>|<protocol>");
    }
    const body = target.slice("NODE:".length);
    if (body.length === 0 || body.trim() !== body || LINE_TERMINATOR.test(body)) {
      throw invalid("node name is empty or contains a line break");
    }
    const separator = body.lastIndexOf("|");
    let name = body;
    let protocol2 = null;
    if (separator > 0 && separator < body.length - 1) {
      const qualifier = body.slice(separator + 1);
      if (!PROTOCOL_QUALIFIER.test(qualifier)) throw invalid("protocol qualifier is invalid");
      protocol2 = canonicalProtocol(qualifier);
      if (!protocol2) throw invalid("protocol qualifier is unsupported");
      name = body.slice(0, separator);
    }
    if (name.length === 0 || name.trim() !== name || LINE_TERMINATOR.test(name)) {
      throw invalid("node name is empty or contains a line break");
    }
    return freeze({ name, protocol: protocol2 });
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
  function resolveNodeReference({ target, allNodes = [], eligibleNodes = [], client } = {}) {
    const reference = parseNodeReference(target);
    const all = (Array.isArray(allNodes) ? allNodes : []).filter(selectable);
    const eligible = (Array.isArray(eligibleNodes) ? eligibleNodes : []).filter(selectable);
    const matchingAll = all.filter((node) => originalName(node) === reference.name && (reference.protocol === null || nodeProtocol(node) === reference.protocol));
    const matchingEligible = eligible.filter((node) => originalName(node) === reference.name && (reference.protocol === null || nodeProtocol(node) === reference.protocol));
    if (client && matchingEligible.length === 0 && matchingAll.length > 0) {
      const supported = matchingAll.filter((node) => protocolSupportsClient(nodeProtocol(node), client));
      if (supported.length === 0) {
        throw new Error("Node reference is incompatible with this client");
      }
    }
    if (matchingEligible.length === 1) return matchingEligible[0];
    if (matchingEligible.length > 1) throw new Error("Node reference is ambiguous");
    if (matchingAll.length > 0) throw new Error("Node reference is incompatible with this client");
    throw new Error("Node reference is missing");
  }

  // ../../shared/encoding/base64url.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var REVERSE = new Map([...ALPHABET].map((character, index) => [character, index]));

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET = /^NODE:(.*)$/iu;
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
    if (!node || node[1].trim().length === 0 || LINE_TERMINATOR2.test(node[1])) {
      throw new TypeError("target must be FOLLOW, DIRECT, or NODE:<name>");
    }
    return `NODE:${node[1]}`;
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
  var CHANNEL_KEYS = /* @__PURE__ */ new Set(["revision", "defaults", "happ", "onexray"]);
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
  function requireKeys(value, required, allowed = required) {
    const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);
    for (const key of Object.keys(value)) {
      if (!allowedSet.has(key)) throw invalid2("contains an unsupported field");
    }
    for (const key of required) {
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
      throw invalid2("target must be FOLLOW, DIRECT, or NODE:<name>[|<protocol>]");
    }
    try {
      const canonical = canonicalUnifiedPolicyTarget(value);
      if (!canonical.startsWith("NODE:")) return canonical;
      const reference = parseNodeReference(canonical);
      return `NODE:${reference.name}${reference.protocol ? `|${reference.protocol}` : ""}`;
    } catch {
      throw invalid2("target must be FOLLOW, DIRECT, or NODE:<name>[|<protocol>]");
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
      requireKeys(record2, ["revision", "defaults", "happ", "onexray"], CHANNEL_KEYS);
      channels[channel] = {
        revision: normalizeRevision(record2.revision),
        defaults: normalizeDefaults(record2.defaults),
        happ: normalizeOverride(record2.happ),
        onexray: normalizeOverride(record2.onexray)
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
    const override = record2[client];
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
    const defaults = defaultUnifiedPolicyTargets();
    if (!policy) return defaults;
    const parsed = typeof policy === "string" || policy instanceof Uint8Array ? parsePrivatePolicy(policy) : policy;
    const resolved = resolvePrivatePolicy({ policy: parsed, channel, client });
    if (parsed.schemaVersion === 2) return { ...defaults, ...resolved.targets };
    const result = { ...defaults };
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
  function resolveUnifiedPolicy({
    policy = null,
    channel = "current",
    client = CLIENT.happ,
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
      if (configured.startsWith("NODE:")) {
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

  // ../../shared/release/client-catalog.js
  var freeze3 = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze3(child);
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
      id: CLIENT.onexray,
      displayName: "OneXray",
      state: "active",
      platforms: ["macos", "iphone", "ipad", "android", "windows", "linux"],
      configFormat: "xray-profile-json",
      ruleFormat: "xray-geodata",
      nodeValidator: "onexray",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "onexray-v1",
      publicDirectory: "onexray"
    },
    {
      id: CLIENT.happ,
      displayName: "HAPP",
      state: "active",
      platforms: ["iphone", "ipad", "macos", "android"],
      configFormat: "happ-json",
      ruleFormat: "happ-json",
      nodeValidator: "happ",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "happ-v4",
      publicDirectory: "happ"
    },
    {
      id: CLIENT.v2rayn,
      displayName: "v2rayN",
      state: "active",
      platforms: ["windows", "macos"],
      configFormat: "xray-profile-json",
      ruleFormat: "xray-geodata",
      nodeValidator: "v2rayn",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "v2rayn-v1",
      publicDirectory: "v2rayn"
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
    }
  ].map((record2) => freeze3(record2));
  var byId = new Map(records.map((record2) => [record2.id, record2]));
  var ids = freeze3(records.map(({ id }) => id));
  var activeIds = freeze3(records.filter(({ state }) => state === "active").map(({ id }) => id));
  var plannedIds = freeze3(records.filter(({ state }) => state === "planned").map(({ id }) => id));
  var lightweightRuleIds = freeze3([
    CLIENT.anywhere,
    CLIENT.egern,
    CLIENT.shadowrocket,
    CLIENT.surge,
    CLIENT.singbox
  ]);

  // ../../shared/release/frontier-manifest.js
  var FRONTIER_CHANNELS = Object.freeze(["edge", "current", "previous"]);
  var FRONTIER_PLATFORMS = Object.freeze({
    [CLIENT.surge]: Object.freeze(["macos", "iphone", "ipad"]),
    [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"]),
    [CLIENT.onexray]: Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"]),
    [CLIENT.happ]: Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"])
  });

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
  var REQUIRED_KEYS = Object.freeze(["output", "type", "name", "subscriptionName", "platform"]);
  var NODE_REQUIRED_KEYS = Object.freeze(["output", "type", "name"]);
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
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad"]);
  var CHANNELS = new Set(FRONTIER_CHANNELS);
  var ADBLOCK_MODES = /* @__PURE__ */ new Set(["off", "full"]);
  var PARSED = /* @__PURE__ */ new WeakSet();
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS), "proxyPolicyUrl"]);
  var NODE_ALLOWED_KEYS = /* @__PURE__ */ new Set([...NODE_REQUIRED_KEYS, "clientChain"]);
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
  function validatePolicyUrl(value, key) {
    if (value === void 0) return void 0;
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\u0000-\u001f\u007f\\]/u.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/iu.test(value)) {
      throw new Error(`Option '${key}' must be a safe absolute HTTPS URL`);
    }
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`Option '${key}' must be a safe absolute HTTPS URL`);
    }
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || value.includes("#")) {
      throw new Error(`Option '${key}' must be a safe absolute HTTPS URL`);
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
    const channel = raw.channel === void 0 ? DEFAULTS.channel : raw.channel;
    if (typeof channel !== "string" || !CHANNELS.has(channel)) throw new Error("Option 'channel' has an unsupported value");
    const adblockMode = raw.adblockMode === void 0 ? DEFAULTS.adblockMode : raw.adblockMode;
    if (typeof adblockMode !== "string" || !ADBLOCK_MODES.has(adblockMode)) {
      throw new Error("Option 'adblockMode' has an unsupported value");
    }
    const options = {
      output: "config",
      type: "collection",
      name: validateCollectionName(raw.name, "Option 'name'"),
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
      clientChain: enumValue(raw, "clientChain", DEFAULTS.clientChain),
      adblockMode,
      proxyPolicyUrl: validatePolicyUrl(raw.proxyPolicyUrl, "proxyPolicyUrl")
    };
    platformPolicyPreset(platform);
    Object.freeze(options);
    PARSED.add(options);
    return options;
  }
  function isParsedSurgeOptions(value) {
    return value !== null && typeof value === "object" && PARSED.has(value);
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
    "reality-opts",
    "reuse",
    "tfo",
    "udp_relay"
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
  function sanitizeSurgeNode(node) {
    return Object.fromEntries(Object.entries(node).filter(([key]) => key.startsWith("_") || COMMON_KEYS.has(key)));
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
      case "trojan":
        fields = base(node, "trojan");
        option(fields, "password", requiredString2(node, "password"));
        tlsOptions({ ...node, tls: true }, fields);
        transportOptions(node, fields);
        break;
      case "anytls":
        fields = base(node, "anytls");
        fields.push(escapeValue(requiredString2(node, "password")));
        option(fields, "sni", node.sni ?? node.servername);
        if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) {
          fields.push("skip-cert-verify=true");
        }
        if (node.udp === true) fields.push("udp-relay=true");
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

  // ../../shared/policies/filters.js
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
    const record2 = CONTINENTS.find((entry) => entry.key === continent.key) ?? continent;
    if (record2.key === CONTINENT.other) {
      const knownFlags = CONTINENTS.flatMap((record3) => record3.flags).join("|");
      return `^(?!(?:\u{1F517}|${knownFlags})).+$`;
    }
    return `^(?:${record2.flags.join("|")}).+$`;
  }

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
  function continentHelperItems(continent, mode) {
    void mode;
    return [automaticHelperName(continent)];
  }
  function serviceChoiceItems(defaults, presentContinentNames) {
    return [
      ...defaults.beforeCandidates,
      "\u26A1 \u5168\u90E8\u81EA\u52A8",
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
  function applyUnifiedPolicyDefaults(groups, resolution) {
    if (!resolution || typeof resolution !== "object") return groups;
    const byLabel = /* @__PURE__ */ new Map();
    const targetDefaults = {
      "\u{1F916} AI \u4E13\u7528": resolution.targets?.ai,
      "\u{1F419} GitHub": resolution.targets?.github,
      "\u{1F4FA} YouTube": resolution.targets?.youtube,
      "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53": resolution.targets?.overseasMedia,
      "\u{1F4AC} \u6D77\u5916\u793E\u4EA4": resolution.targets?.globalSocial,
      "\u{1F34E} Apple": resolution.targets?.apple,
      "\u{1FA9F} Microsoft": resolution.targets?.microsoft,
      "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0": resolution.targets?.domesticPlatform,
      "\u{1F30D} \u6D77\u5916\u6E38\u620F": resolution.targets?.overseasGame,
      "\u{1F3AE} \u6E38\u620F\u8FDE\u63A5": resolution.targets?.game,
      "\u2B07\uFE0F \u4E0B\u8F7D/P2P": resolution.targets?.download,
      "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D": resolution.targets?.dnsAndRules
    };
    for (const [name, record2] of Object.entries(targetDefaults)) {
      if (!record2) continue;
      const value = record2.resolved === "DIRECT" ? "DIRECT" : record2.resolved === "FOLLOW" ? "\u{1F680} \u8282\u70B9\u9009\u62E9" : record2.resolved;
      byLabel.set(name, value);
    }
    return groups.map((group) => {
      const defaultChoice = byLabel.get(group.name);
      if (defaultChoice === void 0) return group;
      return { ...group, defaultChoice };
    });
  }
  function buildPolicyGroups(options, nodes, policyResolution = null) {
    const normalizedNodes = Array.isArray(nodes) ? nodes : [];
    const preset = platformPolicyPreset(options.platform);
    const mode = effectiveAutoMode(options.autoGroupMode, normalizedNodes.length);
    const presentContinents = CONTINENTS.filter((continent) => normalizedNodes.some((node) => nodeMetadata(node).continent === continent.key && !nodeMetadata(node).chained));
    const chainEligible = options.clientChain === "on" && normalizedNodes.some((node) => nodeMetadata(node).entry === true && !nodeMetadata(node).chained) && normalizedNodes.some((node) => nodeMetadata(node).chained === true);
    const helpers = [
      helper(GROUP_KIND.helper, "\u26A1 \u5168\u90E8\u81EA\u52A8", STRATEGY.autoTest, preset, NON_CHAINED_FILTER)
    ];
    if (chainEligible) {
      helpers.push(helper(GROUP_KIND.chain, "\u26A1 \u5165\u53E3\u81EA\u52A8", STRATEGY.autoTest, preset, ENTRY_FILTER));
    }
    for (const continent of presentContinents) {
      helpers.push(helper(
        GROUP_KIND.helper,
        automaticHelperName(continent),
        STRATEGY.autoTest,
        preset,
        continentFilter(continent)
      ));
    }
    const groups = [];
    groups.push(policyGroup({
      kind: GROUP_KIND.primary,
      name: "\u{1F680} \u8282\u70B9\u9009\u62E9",
      candidates: [
        "\u26A1 \u5168\u90E8\u81EA\u52A8",
        ...presentContinents.map((continent) => continent.name)
      ]
    }));
    for (const continent of presentContinents) {
      groups.push(policyGroup({
        kind: GROUP_KIND.continent,
        name: continent.name,
        candidates: continentHelperItems(continent, mode),
        nodeFilter: continentFilter(continent)
      }));
    }
    if (chainEligible) {
      groups.push(subscriptionGroup(GROUP_KIND.chain, "\u{1F3AF} \u5BA2\u6237\u7AEF\u843D\u5730", "^\u{1F517} .+$"));
    }
    groups.push(subscriptionGroup(
      GROUP_KIND.ai,
      "\u{1F916} AI \u4E13\u7528",
      ALL_NODES_FILTER,
      []
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
    const result = [...groups, ...helpers];
    return applyUnifiedPolicyDefaults(result, policyResolution);
  }

  // ../../shared/policies/intents.js
  var POLICY_TARGET = Object.freeze({
    primaryProxy: "primary-proxy"
  });

  // src/render-groups.js
  var REMOTE_POLICY_POOL_NAME = "\u{1F4E6} \u8FDC\u7A0B\u8282\u70B9\u6C60";
  var REMOTE_POLICY_UPDATE_INTERVAL = 21600;
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
  function renderSurgeGroups(options, nodes, policyResolution = null) {
    const inventory = Array.isArray(nodes) ? nodes : [];
    const shared = buildPolicyGroups(options, inventory, policyResolution);
    const names = new Set(shared.map(({ name }) => name));
    const remotePolicy = typeof options.proxyPolicyUrl === "string" ? { name: REMOTE_POLICY_POOL_NAME, url: options.proxyPolicyUrl } : null;
    const remoteMode = remotePolicy !== null;
    const rendered = [];
    if (remotePolicy !== null) {
      rendered.push(`${escapeValue2(remotePolicy.name)} = select,policy-path=${escapeValue2(remotePolicy.url)},update-interval=${REMOTE_POLICY_UPDATE_INTERVAL},hidden=1`);
    }
    for (const group of shared) {
      const filteredNodes = remoteMode ? [] : inventory.filter((node) => matches(group.nodeFilter, node)).map(({ name }) => name);
      const items = [...group.candidates.map(targetName), ...filteredNodes].filter((item, index, all) => all.indexOf(item) === index);
      if (items.length === 0 && (!remoteMode || group.nodeFilter === null)) items.push("DIRECT");
      const fields = [group.strategy === "auto-test" ? "url-test" : group.strategy, ...items.map(escapeValue2)];
      if (remoteMode && group.nodeFilter !== null) {
        fields.push(`include-other-group=${escapeValue2(remotePolicy.name)}`);
        fields.push(`policy-regex-filter=${escapeValue2(group.nodeFilter)}`);
      }
      if (group.test?.url !== void 0) fields.push(`url=${escapeValue2(group.test.url)}`);
      if (group.test?.interval !== void 0) fields.push(`interval=${escapeValue2(group.test.interval)}`);
      if (group.test?.timeout !== void 0) fields.push(`timeout=${escapeValue2(group.test.timeout)}`);
      if (group.test?.tolerance !== void 0) fields.push(`tolerance=${escapeValue2(group.test.tolerance)}`);
      if (group.defaultChoice !== void 0) fields.push(`policy-select-name=${escapeValue2(group.defaultChoice)}`);
      if (group.hidden) fields.push("hidden=1");
      if (items.some((item) => item !== "DIRECT" && item !== "REJECT" && !names.has(item) && !inventory.some((node) => node.name === item))) {
        throw new Error("Surge group contains an unresolved policy reference");
      }
      rendered.push(`${escapeValue2(group.name)} = ${fields.join(",")}`);
    }
    return rendered;
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
  function uniqueMembership(id, memberships, label) {
    const matches2 = Object.entries(memberships).filter(([, ids2]) => ids2.includes(id)).map(([name]) => name);
    if (matches2.length !== 1) {
      throw new Error(`Lightweight rule source ${id} must have exactly one ${label} membership`);
    }
    return matches2[0];
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

  // ../../shared/rules/local-rules.js
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

  // src/render-rules.js
  var RULE_DOWNLOAD_POLICY = "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D";
  function safeBaseUrl(value) {
    if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
      throw new Error("Surge rule base URL must be an HTTPS URL without commas");
    }
    return value.replace(/\/+$/u, "");
  }
  function optionalAdblockBase(defaultBase) {
    const optional = defaultBase.replace(/\/surge\/rules$/u, "/optional/adblock-full/surge/rules");
    if (optional === defaultBase) throw new Error("Surge adblock rule base URL must end in /surge/rules");
    return optional;
  }
  function sourceUrl(source, base2, optionalBase) {
    const selectedBase = source.id === "Advertising" || source.id === "Advertising_Domain" ? optionalBase : base2;
    if (!selectedBase) throw new Error("Surge optional rule URL is unavailable");
    return `${selectedBase}/${source.id}.list`;
  }
  function selectedSources(ruleBaseUrl, adblockMode) {
    const base2 = safeBaseUrl(ruleBaseUrl);
    const plan = orderedRoutingPlan({ adblockMode });
    const optionalBase = adblockMode === "full" ? optionalAdblockBase(base2) : null;
    return { base: base2, plan, optionalBase };
  }
  function renderSurgeRules({ ruleBaseUrl, adblockMode = "off" }) {
    const { base: base2, plan, optionalBase } = selectedSources(ruleBaseUrl, adblockMode);
    const render = (source) => `${source.inputFormat},${sourceUrl(source, base2, optionalBase)},${source.policy},update-interval=86400`;
    const lines = [
      ...LOCAL_RULES,
      "# Security rules",
      ...plan.filter(({ phase }) => phase === "security").map(render),
      "# Custom rules"
    ];
    const custom = [
      ["CUSTOM_BLOCK", CUSTOM_RULES.block, "REJECT"],
      ["CUSTOM_DIRECT", CUSTOM_RULES.direct, "DIRECT"],
      ["CUSTOM_PROXY", CUSTOM_RULES.proxy, "\u{1F680} \u8282\u70B9\u9009\u62E9"],
      ["CUSTOM_AI", CUSTOM_RULES.ai, "\u{1F916} AI \u4E13\u7528"]
    ];
    for (const [name, rules, policy] of custom) {
      lines.push(`# ${name}`, ...rules.map((rule) => `${rule},${policy}`));
    }
    const ruleHost = new URL(base2).hostname;
    lines.push(
      "# Rule-download fallback transport",
      `DOMAIN,${ruleHost},${RULE_DOWNLOAD_POLICY}`
    );
    for (const phase of ROUTING_PHASES.filter((value) => value !== "security")) {
      lines.push(...plan.filter((source) => source.phase === phase).map(render));
    }
    lines.push("GEOIP,CN,DIRECT", "FINAL,\u{1F680} \u8282\u70B9\u9009\u62E9,dns-failed");
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
      const record2 = lineValue(line);
      if (!record2 || splitEscaped(record2[1])?.length < 2) errors.push("malformed proxy line");
      else if (proxyNames.has(record2[0])) errors.push("duplicate proxy name");
      else proxyNames.add(record2[0]);
      if (line.includes("_profile") || line.includes("_subName")) errors.push("internal node metadata leaked");
    }
    const groups = /* @__PURE__ */ new Map();
    for (const line of parsed.sections.get("Proxy Group")) {
      const record2 = lineValue(line);
      const fields = record2 && splitEscaped(record2[1]);
      if (!record2 || !fields || fields.length < 2) {
        errors.push("malformed group line");
        continue;
      }
      if (groups.has(record2[0])) errors.push("duplicate group name");
      const items = fields.slice(1).filter((field) => !field.includes("="));
      const remoteGroupReferences = fields.slice(1).filter((field) => field.startsWith("include-other-group=")).flatMap((field) => field.slice("include-other-group=".length).split(","));
      const policyPath = fields.find((field) => field.startsWith("policy-path="));
      const policyFilter = fields.find((field) => field.startsWith("policy-regex-filter="));
      if (policyPath) {
        const url = policyPath.slice("policy-path=".length);
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname) errors.push("invalid policy path");
        } catch {
          errors.push("invalid policy path");
        }
      }
      if (policyFilter && items.length === 0 && remoteGroupReferences.length === 0 && !policyPath) {
        errors.push("filtered group requires a policy source");
      }
      groups.set(record2[0], { type: fields[0], items, remoteGroupReferences, policyPath });
    }
    const allowed = /* @__PURE__ */ new Set(["DIRECT", "REJECT", ...proxyNames, ...groups.keys()]);
    for (const group of groups.values()) {
      for (const item of [...group.items, ...group.remoteGroupReferences]) {
        if (!allowed.has(item)) errors.push("missing group or proxy reference");
      }
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
      const group = groups.get(name);
      for (const item of [...group?.items ?? [], ...group?.remoteGroupReferences ?? []]) {
        if (groups.has(item)) visit(item);
      }
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
    const provider2 = chinaDnsProvider(options.chinaDns);
    const chinaDns = options.chinaDns === "system" ? "system" : provider2.address;
    return [
      "loglevel = notify",
      `ipv6 = ${options.ipv6Mode === "auto" ? "true" : "false"}`,
      `dns-server = ${chinaDns}`,
      `skip-proxy = ${LOCAL_SKIP_PROXY.join(",")}`,
      "exclude-simple-hostnames = true",
      "internet-test-url = http://www.gstatic.com/generate_204",
      "proxy-test-url = http://www.gstatic.com/generate_204",
      `test-timeout = ${options.platform === "macos" ? 5 : 7}`,
      "suppress-warnings = true"
    ];
  }
  function renderSurgeProfile(rawOptions, nodes, { ruleBaseUrl, policyResolution = null } = {}) {
    const options = isParsedSurgeOptions(rawOptions) ? rawOptions : parseSurgeOptions(rawOptions);
    const inventory = Array.isArray(nodes) ? nodes : [];
    if (inventory.length === 0) throw new Error("Surge refuses an empty node inventory");
    for (const node of inventory) nodeMetadata(node);
    const hasRemotePolicy = Boolean(options.proxyPolicyUrl);
    const proxyLines = hasRemotePolicy ? "# Nodes are loaded by the hidden Surge remote policy pool." : inventory.map(renderSurgeProxy).join("\n");
    const profile = [
      "# Generated by apple-proxy-profiles. Private Sub-Store output.",
      `[General]
${generalSettings(options).join("\n")}`,
      `[Proxy]
${proxyLines}`,
      `[Proxy Group]
${renderSurgeGroups(options, inventory, policyResolution).join("\n")}`,
      `[Rule]
${renderSurgeRules({ ruleBaseUrl, adblockMode: options.adblockMode }).join("\n")}`
    ].join("\n\n") + "\n";
    const validation = validateSurgeProfile(profile);
    if (!validation.valid) throw new Error(`Generated Surge profile failed validation: ${validation.errors.join(",")}`);
    return profile;
  }

  // src/substore-profile-entry.js
  var PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
  var PUBLIC_RULE_BASE_URL = `${PUBLIC_RULE_ROOT}/edge/surge/rules`;
  function logDiagnostics(context, options, nodes, renderFailures) {
    const logger = context?.logger;
    const method = typeof logger === "function" ? logger : typeof logger?.info === "function" ? logger.info.bind(logger) : typeof logger?.log === "function" ? logger.log.bind(logger) : null;
    if (!method) return;
    try {
      method(`[surge-profile] ${JSON.stringify({ client: "surge", platform: options.platform, channel: options.channel, accepted: nodes.length, renderFailures })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseSurgeOptions(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
    const rawNodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
    const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
    const probe = (node) => renderSurgeProxy(sanitizeSurgeNode(node));
    const partitioned = partitionRenderableNodes(normalized.nodes, "Surge", probe);
    const policy = await loadSubstorePolicyArtifact(context);
    const policyResolution = resolveUnifiedPolicy({
      policy,
      channel: options.channel,
      client: CLIENT.surge,
      allNodes: normalized.nodes,
      eligibleNodes: partitioned.renderable
    });
    logDiagnostics(context, options, partitioned.renderable, partitioned.failureProtocols);
    const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/surge/rules`;
    const profile = renderSurgeProfile(options, partitioned.renderable.map(sanitizeSurgeNode), { ruleBaseUrl, policyResolution });
    return { ...input, $content: profile };
  }
  return __toCommonJS(substore_profile_entry_exports);
})();
async function operator(input, targetPlatform) {
  return SurgeProfileBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
