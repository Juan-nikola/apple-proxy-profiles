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
    incy: "incy",
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
    CLIENT.clash,
    CLIENT.incy
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
    adblockMode: Object.freeze(["off", "full"]),
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
  function increment(bucket, key, amount = 1) {
    const current = Object.hasOwn(bucket, key) ? bucket[key] : 0;
    Object.defineProperty(bucket, key, {
      value: current + amount,
      writable: true,
      enumerable: true,
      configurable: true
    });
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
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["cipher", "password"]
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge, CLIENT.clash], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy]),
    protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.v2box, CLIENT.clash, CLIENT.incy]),
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
    const port2 = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return Number.isInteger(port2) && port2 >= 1 && port2 <= 65535;
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
  var REGION_LABELS = new Map(RAW_REGIONS.map(({ flag, label: label2 }) => [flag, label2]));
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
        const label2 = protocolDisplayLabel(node.type);
        const protocolGroup = byProtocol.get(label2) ?? [];
        protocolGroup.push(node);
        byProtocol.set(label2, protocolGroup);
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

  // ../../shared/serialization/strict-json.js
  var DEFAULT_MAX_BYTES = 1 * 1024 * 1024;
  var DEFAULT_MAX_DEPTH = 32;
  var FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  var WHITESPACE = /* @__PURE__ */ new Set([" ", "	", "\r", "\n"]);
  function failure(label2, reason) {
    const prefix = typeof label2 === "string" && label2.length > 0 ? `${label2}: ` : "";
    return new SyntaxError(`${prefix}${reason}`);
  }
  function asText(value, label2) {
    if (typeof value === "string") {
      if (/[\uD800-\uDFFF]/u.test(value.replace(/[\uD800-\uDBFF](?=[\uDC00-\uDFFF])/gu, "").replace(/(?<=[\uD800-\uDBFF])[\uDC00-\uDFFF]/gu, ""))) {
        throw failure(label2, "invalid UTF-8 text");
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
        throw failure(label2, "invalid UTF-8 text");
      }
    }
    throw failure(label2, "input must be UTF-8 text");
  }
  function validateOptions(options, label2) {
    const { maxBytes = DEFAULT_MAX_BYTES, maxDepth = DEFAULT_MAX_DEPTH } = options ?? {};
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw failure(label2, "maxBytes must be a non-negative integer");
    if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) throw failure(label2, "maxDepth must be a non-negative integer");
    return { maxBytes, maxDepth };
  }
  function validateAndParse(text, { label: label2, maxDepth }) {
    let index = 0;
    const length = text.length;
    const error = (reason) => {
      throw failure(label2, reason);
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
    const label2 = options?.label;
    const { maxBytes, maxDepth } = validateOptions(options, label2);
    const { text, bytes } = asText(value, label2);
    if (bytes > maxBytes) throw failure(label2, "JSON exceeds byte limit");
    return validateAndParse(text, { label: label2, maxDepth });
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
  function frozenTarget(id, label2, aliases, defaultTarget) {
    return Object.freeze({ id, label: label2, aliases: Object.freeze([...aliases]), defaultTarget });
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
    ["final", "\u6F0F\u7F51\u4E4B\u9C7C", "FOLLOW"]
  ].map(([id, label2, defaultTarget]) => Object.freeze({ id, label: label2, defaultTarget }));
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
    "DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D": "dnsAndRules",
    "\u6700\u7EC8\u515C\u5E95": "final",
    "\u6F0F\u7F51\u4E4B\u9C7C": "final"
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
  var UNIFIED_POLICY_CLIENT_KEYS = /* @__PURE__ */ new Set([...PRIVATE_POLICY_CLIENTS, "sing-box"]);
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
  function normalizeUnifiedTargets(value, { complete }) {
    requireRecord(value.targets, "targets must be an object");
    const targets = complete ? {} : defaultUnifiedPolicyTargets();
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
    if (complete && Object.keys(value.targets).length !== UNIFIED_POLICY_TARGET_IDS.length) {
      throw invalid2("contains an incomplete business target map");
    }
    for (const id of UNIFIED_POLICY_TARGET_IDS) {
      if (!Object.hasOwn(targets, id)) throw invalid2("contains an incomplete business target map");
    }
    return targets;
  }
  function normalizeUnifiedPolicyLayer(value, { complete }) {
    requireRecord(value, "client policy must be an object");
    requireKeys(value, ["schemaVersion", "targets"], /* @__PURE__ */ new Set(["schemaVersion", "targets"]));
    if (value.schemaVersion !== 2) throw invalid2("client policy schemaVersion must be 2");
    return {
      schemaVersion: 2,
      targets: normalizeUnifiedTargets(value, { complete })
    };
  }
  function normalizeUnifiedPolicyObject(value) {
    requireRecord(value, "policy must be an object");
    requireKeys(value, ["schemaVersion", "targets"], /* @__PURE__ */ new Set(["schemaVersion", "targets"]));
    if (value.schemaVersion !== 2) throw invalid2("schemaVersion must be 2");
    return deepFreeze(normalizeUnifiedPolicyLayer(value, { complete: false }));
  }
  function normalizeUnifiedPolicyByClient(value) {
    requireRecord(value, "policy must be an object");
    requireKeys(value, ["schemaVersion", "clients"], /* @__PURE__ */ new Set(["schemaVersion", "clients"]));
    if (value.schemaVersion !== 3) throw invalid2("schemaVersion must be 3");
    requireRecord(value.clients, "clients must be an object");
    const clients = {};
    const seen = /* @__PURE__ */ new Set();
    for (const [key, layer] of Object.entries(value.clients)) {
      if (!UNIFIED_POLICY_CLIENT_KEYS.has(key)) throw invalid2("contains an unsupported policy client");
      const client = key === "sing-box" ? "singbox" : key;
      if (seen.has(client)) throw invalid2("contains conflicting policy client aliases");
      seen.add(client);
      clients[client] = normalizeUnifiedPolicyLayer(layer, { complete: true });
    }
    for (const client of PRIVATE_POLICY_CLIENTS) {
      if (!Object.hasOwn(clients, client)) throw invalid2("is missing a required policy client");
    }
    return deepFreeze({ schemaVersion: 3, clients });
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
    if (parsed?.schemaVersion === 3) return normalizeUnifiedPolicyByClient(parsed);
    if (parsed?.schemaVersion === 2) return normalizeUnifiedPolicyObject(parsed);
    return normalizePolicyObject(parsed);
  }
  function resolvePrivatePolicy({ policy, channel, client } = {}) {
    const normalized = typeof policy === "string" || policy instanceof Uint8Array ? parsePrivatePolicy(policy) : policy?.schemaVersion === 3 ? normalizeUnifiedPolicyByClient(policy) : policy?.schemaVersion === 2 ? normalizeUnifiedPolicyObject(policy) : normalizePolicyObject(policy);
    if (normalized.schemaVersion === 2 || normalized.schemaVersion === 3) {
      const targets = normalized.schemaVersion === 3 ? normalized.clients[client]?.targets : normalized.targets;
      if (normalized.schemaVersion === 3 && !CLIENT_SET.has(client)) {
        throw invalid2("contains an unsupported policy client");
      }
      return deepFreeze({
        targets: { ...targets },
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
    const defaults = defaultUnifiedPolicyTargets();
    if (!policy) return defaults;
    const parsed = typeof policy === "string" || policy instanceof Uint8Array ? parsePrivatePolicy(policy) : policy;
    const resolved = resolvePrivatePolicy({ policy: parsed, channel, client });
    if (parsed.schemaVersion === 2 || parsed.schemaVersion === 3) return { ...defaults, ...resolved.targets };
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
    },
    {
      id: CLIENT.incy,
      displayName: "INCY",
      state: "active",
      platforms: ["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"],
      configFormat: "xray-json-array",
      ruleFormat: "xray-geodata",
      nodeValidator: "incy",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "incy-v1",
      publicDirectory: "incy"
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
    CLIENT.singbox,
    CLIENT.clash
  ]);

  // ../../shared/release/frontier-manifest.js
  var FRONTIER_CHANNELS = Object.freeze(["current"]);
  var FRONTIER_PLATFORMS = Object.freeze({
    [CLIENT.surge]: Object.freeze(["macos", "iphone", "ipad"]),
    [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"])
  });

  // ../../shared/substore/collection-name.js
  var SAFE_COLLECTION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function validateCollectionName(value, label2 = "collection name") {
    if (typeof value !== "string" || !SAFE_COLLECTION_NAME.test(value) || PROTOTYPE_KEYS.has(value)) {
      throw new Error(`${label2} must be a safe collection slug`);
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
    clientChain: "off"
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
    "clientChain"
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
      clientChain: enumValue(values, "clientChain")
    };
    return Object.freeze(options);
  }

  // src/link-encoder.js
  var AUTOROUTING_BASE = "https://juan-nikola.github.io/apple-proxy-profiles";
  function assertString(value, label2) {
    if (typeof value !== "string") {
      throw new TypeError(`${label2} must be a string`);
    }
  }
  function incyAutoroutingUrl(channel = "current") {
    assertString(channel, "INCY autorouting channel");
    return `${AUTOROUTING_BASE}/${channel}/incy/routing.json`;
  }

  // ../../shared/nodes/render-xray-outbound.js
  var TAG = /^ap-[a-z0-9][a-z0-9/_-]{0,127}$/u;
  var label = (client) => String(client ?? "Xray");
  function required2(node, key, client) {
    const value = node[key];
    if (typeof value !== "string" || !value || value.trim() !== value) throw new Error(`${label(client)} node field '${key}' is invalid`);
    return value;
  }
  function port(node, client) {
    const value = Number(node.port);
    if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`${label(client)} node port is invalid`);
    return value;
  }
  function transport(node, client) {
    const network = String(node.network ?? "tcp").trim().toLowerCase();
    if (["tcp", "raw"].includes(network)) return network === "raw" ? { network: "raw", rawSettings: {} } : void 0;
    if (network === "ws") {
      const source = node["ws-opts"] ?? {};
      return { network: "ws", wsSettings: { path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/", ...source.headers ? { headers: { ...source.headers } } : {} } };
    }
    if (network === "grpc") {
      const source = node["grpc-opts"] ?? {};
      return { network: "grpc", grpcSettings: { serviceName: source["grpc-service-name"] ?? source.service_name ?? "" } };
    }
    if (["h2", "http2", "http"].includes(network)) {
      const source = node["h2-opts"] ?? node["http-opts"] ?? {};
      return { network: "http", httpSettings: { path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/", ...source.host ? { host: Array.isArray(source.host) ? source.host : [source.host] } : {} } };
    }
    if (network === "httpupgrade") {
      const source = node["httpupgrade-opts"] ?? {};
      return { network, httpupgradeSettings: { path: source.path ?? "/", ...source.host ? { host: source.host } : {} } };
    }
    if (network === "xhttp") {
      const source = node["xhttp-opts"] ?? {};
      return { network, xhttpSettings: { path: source.path ?? "/", ...source.mode ? { mode: source.mode } : {} } };
    }
    if (["kcp", "mkcp"].includes(network)) return { network: "kcp", kcpSettings: { ...node["kcp-opts"] ?? {} } };
    if (network === "hysteria") return { network, hysteriaSettings: { ...node["hysteria-opts"] ?? {} } };
    throw new Error(`unsupported-${client}-transport`);
  }
  function security(node, result, client) {
    const reality = node["reality-opts"];
    const name = node.security === "reality" || reality ? "reality" : node.tls === true || node.security === "tls" ? "tls" : "none";
    if (name === "none") return;
    result.security = name;
    if (name === "reality") {
      if (!reality || typeof reality["public-key"] !== "string" || !reality["public-key"]) throw new Error(`incomplete-${client}-reality`);
      result.realitySettings = { serverName: node.sni ?? node.servername ?? "", fingerprint: node["client-fingerprint"] ?? "chrome", publicKey: reality["public-key"], ...reality["short-id"] ? { shortId: reality["short-id"] } : {}, ...reality["spider-x"] || reality["_spider-x"] ? { spiderX: reality["spider-x"] ?? reality["_spider-x"] } : {} };
    } else result.tlsSettings = { serverName: node.sni ?? node.servername ?? "", allowInsecure: node["skip-cert-verify"] === true || node["allow-insecure"] === true, ...node.alpn ? { alpn: [...node.alpn] } : {}, ...node["client-fingerprint"] ? { fingerprint: node["client-fingerprint"] } : {} };
  }
  function renderXrayOutbound(node, { tag, client = "v2box" } = {}) {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError(`${label(client)} node is invalid`);
    if (typeof node.name !== "string" || !node.name || /[\r\n]/u.test(node.name)) throw new Error(`${label(client)} node name is invalid`);
    if (typeof tag !== "string" || !TAG.test(tag)) throw new Error(`${label(client)} outbound tag is invalid`);
    const protocol2 = normalizeProtocol(node.type);
    if (!protocolSupportsClient(protocol2, client)) throw new Error(`unsupported-${client}-protocol`);
    const out = { name: node.name, protocol: protocol2, tag, settings: {} };
    const server = { address: required2(node, "server", client), port: port(node, client) };
    if (protocol2 === "vless") out.settings.vnext = [{ ...server, users: [{ id: required2(node, "uuid", client), encryption: node.encryption ?? "none", ...node.flow ? { flow: node.flow } : {} }] }];
    else if (protocol2 === "vmess") out.settings.vnext = [{ ...server, users: [{ id: required2(node, "uuid", client), alterId: Number(node["alter-id"] ?? node.alterId ?? 0), security: node.security ?? node.cipher ?? "auto" }] }];
    else if (["ss", "shadowsocks"].includes(protocol2)) {
      out.protocol = "shadowsocks";
      out.settings.servers = [{ ...server, method: required2(node, "cipher", client), password: required2(node, "password", client) }];
    } else if (protocol2 === "trojan") out.settings.servers = [{ ...server, password: required2(node, "password", client), ...node.flow ? { flow: node.flow } : {} }];
    else if (protocol2 === "socks5") {
      out.protocol = "socks";
      out.settings.servers = [{ ...server, ...node.username ? { users: [{ user: node.username, pass: node.password ?? "" }] } : {} }];
    } else if (protocol2 === "http") out.settings.servers = [{ ...server, ...node.username ? { users: [{ user: node.username, pass: node.password ?? "" }] } : {}, ...node["http-opts"] ? { headers: node["http-opts"].headers ?? {} } : {} }];
    else if (["hysteria2", "hy2"].includes(protocol2)) {
      out.protocol = "hysteria";
      out.settings = { version: 2, ...server, ...node.password ? { auth: node.password } : {} };
    } else throw new Error(`unsupported-${client}-protocol`);
    const stream = transport(node, client);
    if (stream) out.streamSettings = stream;
    security(node, out.streamSettings ?? (out.streamSettings = {}), client);
    if (out.streamSettings && Object.keys(out.streamSettings).length === 0) delete out.streamSettings;
    return out;
  }

  // src/render-node.js
  var TAG_PATTERN = /^ap-incy-[a-z0-9/_-]{1,120}$/u;
  var FORBIDDEN_RAW_KEYS = /* @__PURE__ */ new Set([
    "inbounds",
    "routing",
    "dns",
    "api",
    "policy",
    "stats",
    "observatory",
    "reverse",
    "transport",
    "__proto__",
    "constructor",
    "prototype"
  ]);
  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function clonePlainValue(value, path = "value", seen = /* @__PURE__ */ new WeakSet()) {
    if (value === null) return value;
    const valueType = typeof value;
    if (valueType === "string" || valueType === "boolean") return value;
    if (valueType === "number") {
      if (!Number.isFinite(value)) throw new TypeError(`INCY raw outbound contains non-JSON value at ${path}`);
      return value;
    }
    if (valueType === "undefined" || valueType === "function" || valueType === "symbol" || valueType === "bigint") {
      throw new TypeError(`INCY raw outbound contains non-JSON value at ${path}`);
    }
    if (valueType !== "object") {
      throw new TypeError(`INCY raw outbound contains non-JSON value at ${path}`);
    }
    if (seen.has(value)) throw new Error(`INCY raw outbound contains a circular ${path}`);
    seen.add(value);
    if (Array.isArray(value)) {
      return value.map((item, index) => clonePlainValue(item, `${path}[${index}]`, seen));
    }
    if (!isPlainObject(value)) {
      throw new TypeError("INCY raw outbound must be a plain object");
    }
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_RAW_KEYS.has(key)) {
        throw new Error(`INCY raw outbound contains forbidden key '${key}'`);
      }
      output[key] = clonePlainValue(child, `${path}.${key}`, seen);
    }
    return output;
  }
  function rawSource(node) {
    return node?._incy?.xrayOutbound ?? node?.xrayOutbound ?? null;
  }
  function requiredTag(tag) {
    if (typeof tag !== "string" || !TAG_PATTERN.test(tag)) {
      throw new Error("INCY outbound tag is invalid");
    }
    return tag;
  }
  function validateRequiredFields(node) {
    const protocol2 = normalizeProtocol(node?.type);
    switch (protocol2) {
      case "vless":
      case "vmess":
        if (typeof node?.uuid !== "string" || node.uuid.length === 0 || node.uuid.trim() !== node.uuid) {
          throw new Error("INCY node field 'uuid' is invalid");
        }
        break;
      case "trojan":
      case "hy2":
      case "hysteria2":
        if (typeof node?.password !== "string" || node.password.length === 0 || node.password.trim() !== node.password) {
          throw new Error("INCY node field 'password' is invalid");
        }
        break;
      case "ss":
      case "shadowsocks":
        if (typeof node?.cipher !== "string" || node.cipher.length === 0 || node.cipher.trim() !== node.cipher) {
          throw new Error("INCY node field 'cipher' is invalid");
        }
        if (typeof node?.password !== "string" || node.password.length === 0 || node.password.trim() !== node.password) {
          throw new Error("INCY node field 'password' is invalid");
        }
        break;
      default:
        break;
    }
  }
  function validateRawOutboundShape(raw) {
    if (!isPlainObject(raw)) throw new TypeError("INCY raw outbound must be a plain object");
    if (typeof raw.protocol !== "string" || raw.protocol.trim().length === 0) {
      throw new Error("INCY raw outbound protocol is invalid");
    }
    if (!isPlainObject(raw.settings)) {
      throw new TypeError("INCY raw outbound settings must be a plain object");
    }
    return raw;
  }
  function parseRawXrayOutbound(node) {
    const source = rawSource(node);
    if (source === null) return null;
    return validateRawOutboundShape(clonePlainValue(source));
  }
  function renderIncyOutbound(node, { tag, rawOutbound = null } = {}) {
    const raw = rawOutbound === null ? parseRawXrayOutbound(node) : validateRawOutboundShape(clonePlainValue(rawOutbound));
    if (raw !== null) {
      requiredTag(tag);
      if (raw.tag !== void 0 && raw.tag !== tag) {
        throw new Error("INCY raw outbound tag does not match the caller-supplied tag");
      }
      return Object.freeze({ ...raw, tag });
    }
    validateRequiredFields(node);
    requiredTag(tag);
    return renderXrayOutbound({ ...node, name: node?.name ?? tag }, { tag, client: "incy" });
  }

  // src/render-platform.js
  var INCY_PLATFORMS2 = Object.freeze(["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);
  var PLATFORM_PRESETS = Object.freeze({
    iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150, ipv6Mode: "ipv4-only", resourceProfile: "mobile" }),
    ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150, ipv6Mode: "ipv4-only", resourceProfile: "mobile" }),
    android: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150, ipv6Mode: "ipv4-only", resourceProfile: "mobile" }),
    appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200, ipv6Mode: "ipv4-only", resourceProfile: "tv" }),
    androidtv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200, ipv6Mode: "ipv4-only", resourceProfile: "tv" }),
    macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100, ipv6Mode: "ipv4-only", resourceProfile: "desktop" }),
    windows: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100, ipv6Mode: "ipv4-only", resourceProfile: "desktop" }),
    linux: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100, ipv6Mode: "ipv4-only", resourceProfile: "desktop" })
  });
  var COMMON_SNIFFING = Object.freeze({
    enabled: true,
    destOverride: Object.freeze(["udp", "http", "tls", "quic"]),
    routeOnly: false
  });
  function ensurePlatform(platform) {
    if (typeof platform !== "string" || !Object.hasOwn(PLATFORM_PRESETS, platform)) {
      throw new Error(`Unsupported INCY platform '${platform}'`);
    }
  }
  function renderIncyInbounds(platform) {
    ensurePlatform(platform);
    return Object.freeze([
      Object.freeze({
        tag: "incy-in-socks",
        listen: "127.0.0.1",
        port: 10808,
        protocol: "socks",
        settings: Object.freeze({ auth: "noauth", udp: true }),
        sniffing: COMMON_SNIFFING
      }),
      Object.freeze({
        tag: "incy-in-http",
        listen: "127.0.0.1",
        port: 10809,
        protocol: "http",
        settings: Object.freeze({}),
        sniffing: COMMON_SNIFFING
      })
    ]);
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
  function provider(providers, id, label2) {
    const value = providers[id];
    if (!value) throw new Error(`Unsupported ${label2} DNS provider`);
    return value;
  }
  function chinaDnsProvider(id) {
    return provider(CHINA_DNS_PROVIDERS, id, "China");
  }
  function globalDnsProvider(id) {
    return provider(GLOBAL_DNS_PROVIDERS, id, "global");
  }

  // ../../shared/rules/semantic-intents.js
  var intent = ({ id, ruleId, label: label2, sourceIds, policy, defaultTarget, phase, dnsClass }) => Object.freeze({
    id,
    ruleId,
    label: label2,
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
  var CLASH_MOBILE_RULE_PLATFORMS = Object.freeze([
    "iphone",
    "ipad",
    "appletv"
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
    mobileEntries: 5e4,
    mobileBytes: 5e6,
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
  function uniqueMembership(id, memberships, label2) {
    const matches = Object.entries(memberships).filter(([, ids2]) => ids2.includes(id)).map(([name]) => name);
    if (matches.length !== 1) {
      throw new Error(`Lightweight rule source ${id} must have exactly one ${label2} membership`);
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
  var DEFAULT_OPTIONS = Object.freeze({
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    ipv6Mode: "ipv4-only"
  });
  function proxyDomains() {
    return orderedRoutingPlan({ adblockMode: "off" }).filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => `geosite:${HAPP_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`);
  }
  function domesticExpectIPs() {
    return Object.freeze(["geoip:PRIVATE", "geoip:CN"]);
  }
  function renderIncyDns(options = {}, { followTag, directTag, dnsRulesTag } = {}) {
    const value = { ...DEFAULT_OPTIONS, ...options };
    const china = chinaDnsProvider(value.chinaDns);
    const global = globalDnsProvider(value.globalDns);
    const privacyMode = value.dnsMode === "privacy";
    const speedMode = value.dnsMode === "speed";
    return Object.freeze({
      tag: dnsRulesTag,
      servers: [
        Object.freeze({
          tag: directTag,
          address: china.doh,
          domains: Object.freeze(privacyMode ? ["geosite:PRIVATE"] : ["geosite:CN", "geosite:PRIVATE"]),
          expectIPs: domesticExpectIPs()
        }),
        Object.freeze({
          tag: followTag,
          address: global.doh,
          domains: Object.freeze(privacyMode ? [] : proxyDomains()),
          skipFallback: !(privacyMode || speedMode),
          ...global.address ? { clientIp: global.address } : {}
        })
      ],
      disableFallback: privacyMode,
      queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP"
    });
  }

  // ../../shared/policies/platform-presets.js
  var POLICY_PLATFORM_PRESETS = Object.freeze({
    macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    android: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    androidtv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200 }),
    openwrt: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200 }),
    windows: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    linux: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 })
  });
  function platformPolicyPreset(platform) {
    if (typeof platform !== "string" || !Object.hasOwn(POLICY_PLATFORM_PRESETS, platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return POLICY_PLATFORM_PRESETS[platform];
  }

  // src/render-routing.js
  var PRIVATE_DOMAINS = Object.freeze(["localhost", "localhost.localdomain", "local", "localdomain", "lan", "home.arpa", "geosite:PRIVATE"]);
  var PRIVATE_IPS = Object.freeze(["geoip:PRIVATE"]);
  var DEFAULT_OPTIONS2 = Object.freeze({
    chinaDns: "alidns",
    globalDns: "cloudflare",
    adblockMode: "off",
    quicMode: "proxy-block",
    autoGroupMode: "auto"
  });
  function asMap(value) {
    if (value instanceof Map) return value;
    if (!value || typeof value !== "object") return /* @__PURE__ */ new Map();
    return new Map(Object.entries(value));
  }
  function routeTargetKey(record2) {
    return record2?.nodeId ?? record2?.resolved ?? record2?.configured ?? null;
  }
  function routeTargetForPolicy(record2, tags = {}) {
    const resolved = record2?.resolved ?? record2?.configured;
    if (resolved === "FOLLOW" || resolved === void 0 || resolved === null) return tags.followTag;
    if (resolved === "DIRECT") return tags.directTag;
    if (resolved === "REJECT") return tags.blockTag;
    const balancerTags = asMap(tags.balancerTags);
    const balancerTag = balancerTags.get(routeTargetKey(record2));
    if (balancerTag) return balancerTag;
    if (record2?.status === "fixed" || /^NODE[:~]/iu.test(record2?.configured ?? "")) {
      throw new Error("INCY policy target balancer tag is missing");
    }
    return tags.followTag;
  }
  function targetIdForSource(sourceId) {
    if (sourceId === "__final__") return "final";
    if (policyForRuleSource(sourceId) === "DIRECT") return "domesticPlatform";
    return unifiedPolicyTargetByKey(policyForRuleSource(sourceId))?.id ?? "final";
  }
  function buildDnsDirectRules(options) {
    const rules = [];
    const value = { ...DEFAULT_OPTIONS2, ...options };
    const providers = [
      chinaDnsProvider(value.chinaDns),
      ...value.dnsMode === "privacy" ? [] : [globalDnsProvider(value.globalDns)]
    ];
    const domains = /* @__PURE__ */ new Set();
    const ips = /* @__PURE__ */ new Set();
    for (const provider2 of providers) {
      if (provider2.doh === "system") continue;
      try {
        const url = new URL(provider2.doh);
        if (url.hostname) domains.add(url.hostname);
      } catch {
        throw new Error("INCY DNS provider has an invalid DoH endpoint");
      }
      if (typeof provider2.serverName === "string" && provider2.serverName.length > 0) domains.add(provider2.serverName);
      if (typeof provider2.address === "string" && provider2.address !== "local") ips.add(provider2.address);
    }
    if (domains.size > 0 || ips.size > 0) {
      rules.push({
        type: "field",
        ...domains.size > 0 ? { domain: [...domains] } : {},
        ...ips.size > 0 ? { ip: [...ips] } : {},
        outboundTag: options.directTag
      });
    }
    return rules;
  }
  function fixedPolicyNodes(policyResolution, fixedOutbounds) {
    const fixed = Array.isArray(policyResolution?.fixedNodes) ? policyResolution.fixedNodes : [];
    const outboundByKey = /* @__PURE__ */ new Map();
    for (const outbound of Array.isArray(fixedOutbounds) ? fixedOutbounds : []) {
      if (!outbound || typeof outbound !== "object") continue;
      const key = outbound.nodeId ?? outbound.resolved ?? outbound.name ?? null;
      const candidateTag = outbound.tag ?? outbound.outboundTag ?? null;
      if (key && candidateTag) outboundByKey.set(key, candidateTag);
      if (typeof outbound.nodeId === "string" && candidateTag) outboundByKey.set(outbound.nodeId, candidateTag);
      if (typeof outbound.resolved === "string" && candidateTag) outboundByKey.set(outbound.resolved, candidateTag);
    }
    return { fixed, outboundByKey };
  }
  function derivedBalancerTags(fixedOutbounds) {
    const tags = /* @__PURE__ */ new Map();
    for (const outbound of Array.isArray(fixedOutbounds) ? fixedOutbounds : []) {
      if (!outbound || typeof outbound !== "object") continue;
      const candidateTag = outbound.tag ?? outbound.outboundTag ?? null;
      if (!candidateTag) continue;
      const balancerTag = candidateTag.startsWith("balancer-") ? candidateTag : `balancer-${candidateTag}`;
      for (const key of [outbound.nodeId, outbound.resolved, outbound.name]) {
        if (typeof key === "string" && key.length > 0) tags.set(key, balancerTag);
      }
    }
    return tags;
  }
  function renderIncyBalancers(policyResolution, fixedOutbounds, followTag, options = {}) {
    const preset = platformPolicyPreset(options.platform ?? "iphone");
    const { fixed, outboundByKey } = fixedPolicyNodes(policyResolution, fixedOutbounds);
    const balancers = [];
    const subjectSelector = [followTag];
    for (const entry of fixed) {
      const candidateTag = outboundByKey.get(entry.nodeId) ?? outboundByKey.get(entry.name);
      if (!candidateTag) {
        throw new Error("INCY fixed policy target has no matching outbound");
      }
      const balancerTag = `balancer-${candidateTag}`;
      balancers.push({
        tag: balancerTag,
        selector: [candidateTag],
        strategy: { type: "leastPing" },
        fallbackTag: followTag
      });
      subjectSelector.push(candidateTag);
    }
    const subjectCount = subjectSelector.length;
    const requestedMode = options.autoGroupMode ?? "auto";
    const effectiveMode = requestedMode === "auto" ? subjectCount <= 30 ? "full" : subjectCount <= 100 ? "balanced" : "minimal" : requestedMode;
    if (!["full", "balanced", "minimal"].includes(effectiveMode)) {
      throw new Error(`INCY autoGroupMode is unsupported: ${requestedMode}`);
    }
    const scale = { full: 1, balanced: 2, minimal: 4 }[effectiveMode];
    const observatoryPreset = {
      testInterval: preset.testInterval * scale,
      timeout: preset.timeout,
      tolerance: preset.tolerance * scale
    };
    return {
      balancers,
      observatory: {
        subjectSelector,
        probeUrl: "https://www.gstatic.com/generate_204",
        ...observatoryPreset
      }
    };
  }
  function policyRuleForSource(sourceId, resolution, tags) {
    const targetId = targetIdForSource(sourceId);
    const record2 = resolution?.targets?.[targetId];
    if (!record2) return { outboundTag: tags.followTag };
    return { outboundTag: routeTargetForPolicy(record2, tags) };
  }
  var BLOCKED_SECURITY_SOURCES = /* @__PURE__ */ new Set(["Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain"]);
  function ruleForItem(item, resolution, tags, options) {
    const isChinaIp = item.id === "ChinaIP";
    const isChinaTld = item.id === "ChinaTLD";
    const source = isChinaIp ? `geoip:${HAPP_GEOIP_ALIASES[item.id] ?? "CN"}` : `geosite:${HAPP_GEOSITE_ALIASES[item.id] ?? item.id.toUpperCase()}`;
    const target = BLOCKED_SECURITY_SOURCES.has(item.id) ? { outboundTag: options.blockMode === "off" ? tags.directTag : tags.blockTag } : item.id === "Privacy" ? { outboundTag: tags.directTag } : item.policy === "REJECT" ? { outboundTag: tags.blockTag } : policyRuleForSource(item.id, resolution, tags);
    return {
      type: "field",
      ...isChinaIp ? { ip: [source] } : { domain: [source] },
      ...target
    };
  }
  function dnsProtectionRule(options) {
    return buildDnsDirectRules(options);
  }
  function renderIncyRouting({
    options = {},
    policyResolution = null,
    fixedOutbounds = [],
    followTag,
    directTag,
    blockTag,
    balancerTags = null
  } = {}) {
    const resolution = policyResolution ?? defaultUnifiedPolicyResolution();
    const value = { ...DEFAULT_OPTIONS2, ...options };
    if (!["allow", "proxy-block", "all-block"].includes(value.quicMode)) {
      throw new Error(`INCY quicMode is unsupported: ${value.quicMode}`);
    }
    const tags = {
      followTag,
      directTag,
      blockTag,
      balancerTags: balancerTags ?? derivedBalancerTags(fixedOutbounds)
    };
    const rules = [
      {
        type: "field",
        domain: [...PRIVATE_DOMAINS],
        ip: [...PRIVATE_IPS],
        outboundTag: directTag
      }
    ];
    let chinaIpRule = null;
    let quicRuleInserted = false;
    for (const item of orderedRoutingPlan({ adblockMode: value.adblockMode })) {
      if (!quicRuleInserted && item.phase !== "security" && value.quicMode !== "allow") {
        rules.push({
          type: "field",
          network: "udp",
          port: 443,
          outboundTag: value.quicMode === "all-block" ? blockTag : directTag
        });
        quicRuleInserted = true;
      }
      const rule = ruleForItem(item, resolution, tags, value);
      if (item.id === "ChinaIP") {
        chinaIpRule = rule;
        continue;
      }
      rules.push(rule);
      if (item.id === "ChinaTLD") {
        rules.push(...dnsProtectionRule({ ...value, directTag }));
      }
    }
    if (chinaIpRule) rules.push(chinaIpRule);
    if (!quicRuleInserted && value.quicMode !== "allow") {
      rules.push({
        type: "field",
        network: "udp",
        port: 443,
        outboundTag: value.quicMode === "all-block" ? blockTag : directTag
      });
    }
    rules.push({ type: "field", network: "tcp,udp", outboundTag: followTag });
    return {
      domainStrategy: "IPIfNonMatch",
      rules
    };
  }

  // src/validate-subscription.js
  var TAG_PATTERN2 = /^ap-incy-[a-z0-9/_-]{1,120}$/u;
  var VALID_CONFIG_KEYS = /* @__PURE__ */ new Set([
    "remarks",
    "log",
    "inbounds",
    "outbounds",
    "dns",
    "routing",
    "observatory",
    "meta"
  ]);
  var STANDARD_INBOUNDS = Object.freeze([
    Object.freeze({ tag: "incy-in-socks", port: 10808, protocol: "socks" }),
    Object.freeze({ tag: "incy-in-http", port: 10809, protocol: "http" })
  ]);
  var STANDARD_SNIFFING = Object.freeze({
    enabled: true,
    destOverride: Object.freeze(["udp", "http", "tls", "quic"]),
    routeOnly: false
  });
  var DIRECT_TAG = "ap-incy-direct";
  var BLOCK_TAG = "ap-incy-block";
  var FOLLOW_PREFIX = "ap-incy-follow/";
  var FIXED_PREFIX = "ap-incy-fixed/";
  var DNS_PREFIX = "ap-incy-dns/";
  var BALANCER_PREFIX = "balancer-ap-incy-fixed/";
  var SECRET_VALUE_PATTERNS = [
    /TEST_ONLY_/u,
    /https?:\/\/[^\s]+/iu,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/iu,
    /\bpassword\b/iu,
    /\buuid\b/iu
  ];
  function isPlainObject2(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function ensureContainerShape(container) {
    if (!isPlainObject2(container)) {
      throw new TypeError("INCY subscription must be a plain object");
    }
    for (const key of Object.keys(container)) {
      if (key === "inbounds" || key === "routing" || key === "dns" || key === "api" || key === "policy" || key === "stats" || key === "observatory" || key === "reverse" || key === "transport") {
        throw new Error(`INCY subscription contains forbidden key '${key}'`);
      }
    }
    if (!Array.isArray(container.outbounds) || container.outbounds.length === 0) {
      throw new Error("INCY subscription requires at least one outbound");
    }
    return container.outbounds;
  }
  function validateTag(tag, seen) {
    if (typeof tag !== "string" || !TAG_PATTERN2.test(tag)) {
      throw new Error("INCY outbound tag is invalid");
    }
    if (seen.has(tag)) {
      throw new Error("INCY subscription contains duplicate outbound tags");
    }
    seen.add(tag);
  }
  function validateSettingsShape(protocol2, settings) {
    if (!isPlainObject2(settings)) {
      throw new TypeError("INCY outbound settings must be a plain object");
    }
    switch (protocol2) {
      case "vless":
      case "vmess":
        if (!Array.isArray(settings.vnext)) {
          throw new Error("INCY outbound settings schema is invalid");
        }
        break;
      case "trojan":
      case "ss":
      case "shadowsocks":
      case "socks5":
      case "http":
        if (!Array.isArray(settings.servers)) {
          throw new Error("INCY outbound settings schema is invalid");
        }
        break;
      default:
        break;
    }
  }
  function validateOutbound(outbound, seen) {
    if (!isPlainObject2(outbound)) {
      throw new TypeError("INCY outbound must be a plain object");
    }
    for (const key of Object.keys(outbound)) {
      if (key !== "tag" && key !== "protocol" && key !== "name" && key !== "settings" && key !== "streamSettings" && key !== "mux" && key !== "sendThrough" && key !== "packetEncoding" && key !== "proxySettings" && key !== "dialerProxy" && key !== "domainStrategy") {
        throw new Error(`INCY outbound contains forbidden key '${key}'`);
      }
    }
    validateTag(outbound.tag, seen);
    if (typeof outbound.protocol !== "string" || outbound.protocol.trim().length === 0) {
      throw new Error("INCY outbound protocol is invalid");
    }
    validateSettingsShape(outbound.protocol, outbound.settings);
    for (const key of Object.keys(outbound)) {
      if (key === "password" || key === "uuid" || key === "cipher" || key === "psk" || key === "username" || key === "private-key" || key === "public-key" || key === "server" || key === "port" || key === "flow" || key === "security" || key === "auth" || key === "method" || key === "id" || key === "key" || key === "token" || key === "secret") {
        throw new Error("INCY outbound contains secret metadata");
      }
    }
  }
  function validateProxySettings(outbound, outboundTags) {
    if (!Object.hasOwn(outbound, "proxySettings")) return;
    if (!isPlainObject2(outbound.proxySettings)) {
      throw new TypeError("INCY outbound proxySettings are invalid");
    }
    const keys = Object.keys(outbound.proxySettings);
    if (keys.some((key) => key !== "tag" && key !== "transportLayer")) {
      throw new Error("INCY outbound proxySettings contain forbidden fields");
    }
    if (typeof outbound.proxySettings.tag !== "string" || !outboundTags.has(outbound.proxySettings.tag)) {
      throw new Error("INCY outbound proxySettings reference a missing outbound");
    }
    if (outbound.proxySettings.transportLayer !== void 0 && typeof outbound.proxySettings.transportLayer !== "boolean") {
      throw new Error("INCY outbound proxySettings transportLayer is invalid");
    }
  }
  function validateReservedOutbound(outbound, tag, protocol2) {
    if (outbound.tag !== tag) {
      throw new Error(`INCY reserved outbound '${tag}' is missing`);
    }
    if (outbound.protocol !== protocol2) {
      throw new Error(`INCY reserved outbound '${tag}' must use protocol '${protocol2}'`);
    }
    if (!isPlainObject2(outbound.settings) || Object.keys(outbound.settings).length !== 0) {
      throw new Error(`INCY reserved outbound '${tag}' has invalid settings`);
    }
  }
  function validateInboundShape(inbound, index) {
    if (!isPlainObject2(inbound)) {
      throw new TypeError("INCY inbound must be a plain object");
    }
    if (inbound.tag !== STANDARD_INBOUNDS[index].tag) {
      throw new Error("INCY inbound tag is invalid");
    }
    if (inbound.port !== STANDARD_INBOUNDS[index].port) {
      throw new Error("INCY inbound port is invalid");
    }
    if (inbound.protocol !== STANDARD_INBOUNDS[index].protocol) {
      throw new Error("INCY inbound protocol is invalid");
    }
    if (inbound.listen !== "127.0.0.1") {
      throw new Error("INCY inbound listen address is invalid");
    }
    if (!isPlainObject2(inbound.settings)) {
      throw new Error("INCY inbound settings are invalid");
    }
    if (!isPlainObject2(inbound.sniffing)) {
      throw new Error("INCY inbound sniffing is invalid");
    }
    if (index === 0) {
      if (inbound.settings.auth !== "noauth" || inbound.settings.udp !== true || Object.keys(inbound.settings).length !== 2) {
        throw new Error("INCY SOCKS inbound settings are invalid");
      }
    } else if (Object.keys(inbound.settings).length !== 0) {
      throw new Error("INCY HTTP inbound settings are invalid");
    }
    if (inbound.sniffing.enabled !== STANDARD_SNIFFING.enabled || inbound.sniffing.routeOnly !== STANDARD_SNIFFING.routeOnly || !Array.isArray(inbound.sniffing.destOverride) || inbound.sniffing.destOverride.length !== STANDARD_SNIFFING.destOverride.length || !STANDARD_SNIFFING.destOverride.every((value) => inbound.sniffing.destOverride.includes(value))) {
      throw new Error("INCY inbound sniffing is invalid");
    }
  }
  function validateDns(config, outboundTags, followTag) {
    if (!isPlainObject2(config.dns)) {
      throw new Error("INCY DNS config is invalid");
    }
    if (typeof config.dns.tag !== "string" || !config.dns.tag.startsWith(DNS_PREFIX)) {
      throw new Error("INCY DNS tag is invalid");
    }
    if (!Array.isArray(config.dns.servers) || config.dns.servers.length !== 2) {
      throw new Error("INCY DNS servers are invalid");
    }
    const [directServer, followServer] = config.dns.servers;
    if (directServer?.tag !== DIRECT_TAG || followServer?.tag !== followTag) {
      throw new Error("INCY DNS server tags are invalid");
    }
    if (typeof config.dns.queryStrategy !== "string" || !["UseIPv4", "UseIP"].includes(config.dns.queryStrategy)) {
      throw new Error("INCY DNS query strategy is invalid");
    }
    if (!outboundTags.has(DIRECT_TAG) || !outboundTags.has(followTag)) {
      throw new Error("INCY DNS references missing outbound tags");
    }
  }
  function validateRouting(config, outboundTags, balancerTags, followTag, observatorySelectors) {
    if (!isPlainObject2(config.routing)) {
      throw new Error("INCY routing config is invalid");
    }
    if (config.routing.domainStrategy !== "IPIfNonMatch") {
      throw new Error("INCY routing domainStrategy must be IPIfNonMatch");
    }
    if (!Array.isArray(config.routing.rules) || config.routing.rules.length === 0) {
      throw new Error("INCY routing rules are invalid");
    }
    const finalRule = config.routing.rules.at(-1);
    if (finalRule?.network !== "tcp,udp" || finalRule?.outboundTag !== followTag) {
      throw new Error("INCY routing final rule must target the follow outbound");
    }
    for (const rule of config.routing.rules) {
      if (rule?.outboundTag && !outboundTags.has(rule.outboundTag) && !balancerTags.has(rule.outboundTag)) {
        throw new Error(`INCY routing rule references missing outbound '${rule.outboundTag}'`);
      }
      if (rule?.balancerTag && !balancerTags.has(rule.balancerTag)) {
        throw new Error(`INCY routing rule references missing balancer '${rule.balancerTag}'`);
      }
    }
    if (!Array.isArray(config.routing.balancers)) {
      throw new Error("INCY routing balancers are invalid");
    }
    for (const balancer of config.routing.balancers) {
      if (!isPlainObject2(balancer)) {
        throw new Error("INCY balancer must be a plain object");
      }
      if (typeof balancer.tag !== "string" || !balancer.tag.startsWith(BALANCER_PREFIX)) {
        throw new Error("INCY balancer tag is invalid");
      }
      if (!balancerTags.has(balancer.tag)) {
        throw new Error("INCY balancer tag is missing from routing references");
      }
      if (!Array.isArray(balancer.selector) || balancer.selector.length !== 1 || !outboundTags.has(balancer.selector[0])) {
        throw new Error("INCY balancer selector is invalid");
      }
      if (balancer.fallbackTag !== followTag) {
        throw new Error("INCY balancer fallback must target the follow outbound");
      }
      if (!observatorySelectors.includes(followTag) || !observatorySelectors.includes(balancer.selector[0])) {
        throw new Error("INCY balancer selector is not observed");
      }
    }
  }
  function validateObservatory(config, followTag, fixedTags) {
    if (!isPlainObject2(config.observatory)) {
      throw new Error("INCY observatory config is invalid");
    }
    if (!Array.isArray(config.observatory.subjectSelector) || config.observatory.subjectSelector.length === 0) {
      throw new Error("INCY observatory selectors are invalid");
    }
    if (config.observatory.subjectSelector[0] !== followTag) {
      throw new Error("INCY observatory must prioritize the follow outbound");
    }
    for (const tag of fixedTags) {
      if (!config.observatory.subjectSelector.includes(tag)) {
        throw new Error("INCY observatory is missing a fixed selector");
      }
    }
    if (config.observatory.probeUrl !== "https://www.gstatic.com/generate_204") {
      throw new Error("INCY observatory probe URL is invalid");
    }
  }
  function validateMeta(config) {
    if (!isPlainObject2(config.meta)) {
      throw new Error("INCY meta is invalid");
    }
    const keys = Object.keys(config.meta).sort();
    if (keys.join(",") !== "platform,schemaVersion,serverDescription") {
      throw new Error("INCY meta contains forbidden fields");
    }
    if (typeof config.meta.platform !== "string" || config.meta.platform.length === 0) {
      throw new Error("INCY meta platform is invalid");
    }
    if (config.meta.schemaVersion !== 2) {
      throw new Error("INCY meta schemaVersion is invalid");
    }
    if (typeof config.meta.serverDescription !== "string" || config.meta.serverDescription.length === 0) {
      throw new Error("INCY meta serverDescription is invalid");
    }
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(config.meta.serverDescription))) {
      throw new Error("INCY meta contains secret values");
    }
  }
  function validateIncyConfig(config) {
    if (!isPlainObject2(config)) {
      throw new TypeError("INCY config must be a plain object");
    }
    for (const key of Object.keys(config)) {
      if (!VALID_CONFIG_KEYS.has(key)) {
        throw new Error(`INCY config contains forbidden key '${key}'`);
      }
    }
    if (typeof config.remarks !== "string" || config.remarks.length === 0) {
      throw new Error("INCY config remarks are invalid");
    }
    if (!isPlainObject2(config.log) || config.log.loglevel !== "info") {
      throw new Error("INCY config loglevel is invalid");
    }
    if (!Array.isArray(config.inbounds) || config.inbounds.length !== STANDARD_INBOUNDS.length) {
      throw new Error("INCY config requires the standard inbounds");
    }
    config.inbounds.forEach(validateInboundShape);
    const outboundContainer = { outbounds: config.outbounds };
    assertIncyOutbound(outboundContainer);
    const outboundTags = new Set(config.outbounds.map((outbound) => outbound.tag));
    config.outbounds.forEach((outbound) => validateProxySettings(outbound, outboundTags));
    const followTags = config.outbounds.filter((outbound) => typeof outbound.tag === "string" && outbound.tag.startsWith(FOLLOW_PREFIX)).map((outbound) => outbound.tag);
    const fixedTags = config.outbounds.filter((outbound) => typeof outbound.tag === "string" && outbound.tag.startsWith(FIXED_PREFIX)).map((outbound) => outbound.tag);
    const balancerTags = new Set((config.routing?.balancers ?? []).map((balancer) => balancer.tag));
    const directOutbound = config.outbounds.find((outbound) => outbound.tag === DIRECT_TAG);
    const blockOutbound = config.outbounds.find((outbound) => outbound.tag === BLOCK_TAG);
    if (followTags.length !== 1) {
      throw new Error("INCY config requires exactly one follow outbound");
    }
    if (!outboundTags.has(DIRECT_TAG) || !outboundTags.has(BLOCK_TAG)) {
      throw new Error("INCY config is missing direct or block outbounds");
    }
    validateReservedOutbound(directOutbound, DIRECT_TAG, "freedom");
    validateReservedOutbound(blockOutbound, BLOCK_TAG, "blackhole");
    validateDns(config, outboundTags, followTags[0]);
    validateRouting(config, outboundTags, balancerTags, followTags[0], config.observatory?.subjectSelector ?? []);
    validateObservatory(config, followTags[0], fixedTags);
    validateMeta(config);
  }
  function assertIncyOutbound(container) {
    const outbounds = ensureContainerShape(container);
    const seen = /* @__PURE__ */ new Set();
    for (const outbound of outbounds) {
      validateOutbound(outbound, seen);
    }
    return true;
  }
  function validateIncySubscription(configs) {
    if (!Array.isArray(configs) || configs.length === 0) {
      throw new Error("INCY subscription set must be a non-empty array");
    }
    for (const config of configs) {
      validateIncyConfig(config);
    }
    return true;
  }

  // src/render-subscription.js
  var DIRECT_TAG2 = "ap-incy-direct";
  var BLOCK_TAG2 = "ap-incy-block";
  var CHAIN_ENTRY_POLICY = "\u{1F517} \u5165\u53E3\u8282\u70B9";
  var CHAIN_ENTRY_PREFIX = "ap-incy-chain-entry/";
  function ensurePlainObject(value, label2) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(label2);
    }
  }
  function nodeIdFor(node) {
    const id = node?._profile?.id;
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("INCY normalized node is missing a stable id");
    }
    return id;
  }
  function isGeneratedChain(node) {
    return node?.["underlying-proxy"] === CHAIN_ENTRY_POLICY && node?._profile?.chained === true;
  }
  function summarizePolicy(resolution) {
    const entries = Object.values(resolution?.targets ?? {}).map((target) => `${target.configured}\u2192${target.resolved}`);
    const warnings = (resolution?.warnings ?? []).map((warning) => `\u8B66\u544A:${warning.warningCode}`);
    const summary = [...entries, ...warnings].join("\uFF1B");
    return summary.length > 0 ? `INCY \u5206\u6D41\uFF1A${summary}` : "INCY \u5206\u6D41";
  }
  function buildFixedOutbounds(policyResolution) {
    const fixedNodes = Array.isArray(policyResolution?.fixedNodes) ? policyResolution.fixedNodes : [];
    return fixedNodes.map((fixed) => {
      if (!fixed || typeof fixed !== "object" || !fixed.node || typeof fixed.node !== "object") {
        throw new Error("INCY fixed policy target is invalid");
      }
      const fixedNodeId = typeof fixed.nodeId === "string" && fixed.nodeId.length > 0 ? fixed.nodeId : nodeIdFor(fixed.node);
      const tag = `ap-incy-fixed/${fixedNodeId}`;
      const outbound = renderIncyOutbound(fixed.node, { tag });
      return {
        ...outbound,
        nodeId: fixedNodeId,
        resolved: fixed.name ?? fixed.node.name
      };
    });
  }
  function stripOutboundMetadata(outbound) {
    const { nodeId, resolved, ...rest } = outbound;
    return rest;
  }
  function buildConfig(node, options, policyResolution, allNodes) {
    const followTag = `ap-incy-follow/${nodeIdFor(node)}`;
    const dnsTag = `ap-incy-dns/${nodeIdFor(node)}`;
    const fixedOutbounds = buildFixedOutbounds(policyResolution);
    const chainEntries = isGeneratedChain(node) ? allNodes.filter((candidate) => candidate?._profile?.entry === true && candidate?._profile?.chained !== true) : [];
    if (isGeneratedChain(node) && chainEntries.length !== 1) {
      throw new Error("INCY generated chains require exactly one entry node");
    }
    const chainEntry = chainEntries[0] ?? null;
    const fixedChainEntry = chainEntry ? fixedOutbounds.find((outbound) => outbound.nodeId === nodeIdFor(chainEntry)) : null;
    const chainEntryTag = fixedChainEntry?.tag ?? (chainEntry ? `${CHAIN_ENTRY_PREFIX}${nodeIdFor(chainEntry)}` : null);
    if (isGeneratedChain(node) && !chainEntryTag) {
      throw new Error("INCY generated chain is missing an entry outbound");
    }
    const followOutbound = renderIncyOutbound(node, { tag: followTag });
    const renderedFollow = chainEntryTag ? Object.freeze({ ...followOutbound, proxySettings: { tag: chainEntryTag } }) : followOutbound;
    const chainEntryOutbound = chainEntry && !fixedChainEntry ? renderIncyOutbound(chainEntry, { tag: chainEntryTag }) : null;
    const route = renderIncyRouting({
      options,
      policyResolution,
      fixedOutbounds,
      followTag,
      directTag: DIRECT_TAG2,
      blockTag: BLOCK_TAG2
    });
    const { balancers, observatory } = renderIncyBalancers(policyResolution, fixedOutbounds, followTag, {
      platform: options.platform,
      autoGroupMode: options.autoGroupMode
    });
    return {
      remarks: node.name,
      log: { loglevel: "info" },
      inbounds: renderIncyInbounds(options.platform),
      outbounds: [
        renderedFollow,
        ...chainEntryOutbound ? [chainEntryOutbound] : [],
        ...fixedOutbounds.map(stripOutboundMetadata),
        { tag: DIRECT_TAG2, protocol: "freedom", settings: {} },
        { tag: BLOCK_TAG2, protocol: "blackhole", settings: {} }
      ],
      dns: renderIncyDns(options, { followTag, directTag: DIRECT_TAG2, dnsRulesTag: dnsTag }),
      routing: { ...route, balancers },
      observatory,
      meta: {
        platform: options.platform,
        schemaVersion: 2,
        serverDescription: summarizePolicy(policyResolution)
      }
    };
  }
  function renderIncySubscription({ nodes = [], options, policyResolution } = {}) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error("INCY subscription cannot be empty");
    }
    ensurePlainObject(options, "INCY options are required");
    const resolution = policyResolution ?? defaultUnifiedPolicyResolution();
    const configs = nodes.map((node) => buildConfig(node, options, resolution, nodes));
    validateIncySubscription(configs);
    return configs;
  }

  // src/substore-config-entry.js
  var BENIGN_NORMALIZATION_EXCLUSIONS = /* @__PURE__ */ new Set([
    "exact-duplicate",
    "chain-existing",
    "chain-entry-missing",
    "chain-protocol-unsupported"
  ]);
  function prepareRawNodes(raw) {
    return raw.map((node) => {
      const extension = node?._incy?.xrayOutbound;
      if (extension === void 0) return node;
      if (!node || typeof node !== "object" || Array.isArray(node)) return node;
      const { _incy: ignored, ...withoutPrivateMetadata } = node;
      return { ...withoutPrivateMetadata, xrayOutbound: extension };
    });
  }
  function assertNoInvalidInputNodes(normalized) {
    const invalid3 = Object.entries(normalized.diagnostics.excluded ?? {}).filter(([reason, count]) => count > 0 && !BENIGN_NORMALIZATION_EXCLUSIONS.has(reason));
    if (invalid3.length === 0) return;
    throw new Error(`INCY cannot render selected protocols: ${invalid3.map(([reason, count]) => `${reason}=${count}`).join(",")}`);
  }
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
  function attachResponseHeaders(input, context, options) {
    const requestOptions = requestOptionsFrom(input, context);
    if (!requestOptions) return;
    setResponseHeader(requestOptions, "content-type", "application/json; charset=utf-8");
    setResponseHeader(requestOptions, "content-disposition", `attachment; filename="incy-${options.platform}.json"`);
    setResponseHeader(
      requestOptions,
      "autorouting",
      `incy://autorouting/onadd/${encodeURIComponent(incyAutoroutingUrl("current"))}`
    );
  }
  function logDiagnostics(context, options, normalized, configs) {
    const logger = typeof context?.logger === "function" ? context.logger : typeof context?.logger?.info === "function" ? context.logger.info.bind(context.logger) : null;
    if (!logger) return;
    try {
      logger(`[incy-config] ${JSON.stringify({
        client: "incy",
        platform: options.platform,
        schemaVersion: 2,
        normalized: normalized.diagnostics.total,
        accepted: configs.length,
        protocol: normalized.diagnostics.protocol
      })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseIncyOptions(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") {
      throw new Error("INCY produceArtifact is unavailable");
    }
    const raw = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("INCY source collection is empty");
    }
    const normalized = normalizeNodes(prepareRawNodes(raw), { clientChain: options.clientChain });
    assertNoInvalidInputNodes(normalized);
    const orderedNodes = normalized.nodes;
    const policy = await loadSubstorePolicyArtifact(context);
    const policyResolution = resolveUnifiedPolicy({
      policy,
      channel: options.channel,
      client: CLIENT.incy,
      allNodes: orderedNodes,
      eligibleNodes: orderedNodes
    });
    const configs = renderIncySubscription({
      nodes: orderedNodes,
      options,
      policyResolution
    });
    validateIncySubscription(configs);
    logDiagnostics(context, options, normalized, configs);
    attachResponseHeaders(input, context, options);
    return { ...input, $content: `${JSON.stringify(configs, null, 2)}
` };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return INCYConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, requestOptions: typeof $options === "undefined" ? undefined : $options, logger: console });
}
