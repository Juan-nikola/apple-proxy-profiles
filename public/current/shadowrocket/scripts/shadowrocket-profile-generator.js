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
  function increment(bucket, key, amount = 1) {
    const current = Object.hasOwn(bucket, key) ? bucket[key] : 0;
    Object.defineProperty(bucket, key, {
      value: current + amount,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  // ../../../shared/contracts.js
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
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.v2box, CLIENT.clash]),
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

  // ../../../shared/nodes/node-validation.js
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

  // ../../../shared/serialization/strict-json.js
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

  // ../../../shared/nodes/node-reference.js
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

  // ../../../shared/encoding/base64url.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var REVERSE = new Map([...ALPHABET].map((character, index) => [character, index]));

  // ../../../shared/policies/business-targets.js
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

  // ../../../shared/policies/unified-policy.js
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

  // ../../../shared/policies/private-policy.js
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

  // ../../../shared/substore/policy-artifact.js
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

  // ../../../shared/policies/resolve-unified.js
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

  // ../../../shared/release/client-catalog.js
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

  // ../../../shared/release/frontier-manifest.js
  var FRONTIER_CHANNELS = Object.freeze(["current"]);
  var FRONTIER_PLATFORMS = Object.freeze({
    [CLIENT.surge]: Object.freeze(["macos", "iphone", "ipad"]),
    [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"])
  });

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

  // ../../../shared/substore/collection-name.js
  var SAFE_COLLECTION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function validateCollectionName(value, label = "collection name") {
    if (typeof value !== "string" || !SAFE_COLLECTION_NAME.test(value) || PROTOTYPE_KEYS.has(value)) {
      throw new Error(`${label} must be a safe collection slug`);
    }
    return value;
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
    channel: "current",
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
  var CHANNELS = new Set(FRONTIER_CHANNELS);
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
      options[key] = key === "subscriptionName" ? subscriptionDisplayName(raw) : key === "name" ? validateCollectionName(raw.name, "Option 'name'") : OPTION_VALUES[key] ? enumValue(raw, key) : requiredString(raw, key);
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

  // ../../../shared/nodes/renderability.js
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

  // render-node.js
  var SHADOWROCKET_PROXY_KEYS = Object.freeze([
    "name",
    "type",
    "server",
    "port",
    "udp",
    "tls",
    "sni",
    "servername",
    "flow",
    "network",
    "encryption",
    "packet-encoding",
    "alpn",
    "client-fingerprint",
    "idle-session-check-interval",
    "idle-session-timeout",
    "min-idle-session",
    "skip-cert-verify",
    "psk",
    "version",
    "reuse",
    "tfo",
    "uuid",
    "cipher",
    "password",
    "protocol",
    "obfs",
    "obfs-host",
    "obfs-opts",
    "plugin",
    "plugin-opts",
    "underlying-proxy",
    "chain"
  ]);
  var SHADOWROCKET_RECORD_FIELDS = /* @__PURE__ */ new Set([
    ...SHADOWROCKET_PROXY_KEYS,
    "reality-opts",
    "_profile"
  ]);
  var SHADOWROCKET_PROTOCOLS = /* @__PURE__ */ new Set([
    "ss",
    "shadowsocks",
    "ssr",
    "snell",
    "vmess",
    "vless",
    "trojan",
    "anytls",
    "hysteria2",
    "hy2",
    "tuic",
    "socks5",
    "http"
  ]);
  function protocolForError(node) {
    try {
      return normalizeProtocol(node?.type) || "unknown";
    } catch {
      return "unknown";
    }
  }
  function hasRecordValue(value) {
    return value !== void 0 && value !== null && value !== "";
  }
  function renderRecord(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      throw new Error("Unsupported Shadowrocket node");
    }
    const protocol2 = normalizeProtocol(node.type);
    if (!SHADOWROCKET_PROTOCOLS.has(protocol2)) {
      throw new Error("Unsupported Shadowrocket protocol");
    }
    if (Object.keys(node).some((key) => !SHADOWROCKET_RECORD_FIELDS.has(key))) {
      throw new Error("Unsupported Shadowrocket proxy field");
    }
    const record2 = {};
    for (const key of SHADOWROCKET_PROXY_KEYS) {
      if (hasRecordValue(node[key])) record2[key] = node[key];
    }
    if (hasRecordValue(node["reality-opts"])) record2["reality-opts"] = node["reality-opts"];
    if (Object.keys(record2).length === 0) throw new Error("Empty Shadowrocket proxy record");
    return record2;
  }
  function renderShadowrocketProxyRecord(node) {
    const protocol2 = protocolForError(node);
    try {
      return renderRecord(node);
    } catch {
      throw new Error(`Shadowrocket cannot render protocol: ${protocol2}`);
    }
  }
  function partitionShadowrocketNodeSet(nodes) {
    return partitionRenderableNodes(nodes, "Shadowrocket", renderShadowrocketProxyRecord);
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
    const record2 = CONTINENTS.find((entry) => entry.key === continent.key) ?? continent;
    if (record2.key === CONTINENT.other) {
      const knownFlags = CONTINENTS.flatMap((record3) => record3.flags).join("|");
      return `^(?!(?:\u{1F517}|${knownFlags})).+$`;
    }
    return `^(?:${record2.flags.join("|")}).+$`;
  }

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

  // group-catalog.js
  function buildGroups(options, nodes, policyResolution = null) {
    const groups = buildPolicyGroups(options, nodes, policyResolution).map((group) => ({
      name: group.name,
      type: group.strategy === "auto-test" ? "url-test" : group.strategy,
      items: [...group.candidates],
      useSubscription: group.nodeFilter === null ? void 0 : true,
      filter: group.nodeFilter ?? void 0,
      url: group.test?.url,
      interval: group.test?.interval,
      timeout: group.test?.timeout,
      tolerance: group.test?.tolerance,
      hidden: group.hidden,
      policySelectName: group.defaultChoice
    }));
    return groups.map((group) => {
      if (group.name !== "\u{1F680} \u8282\u70B9\u9009\u62E9") return group;
      return {
        ...group,
        items: ["PROXY", ...group.items],
        useSubscription: void 0,
        filter: void 0
      };
    });
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

  // ../../../shared/rules/semantic-intents.js
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
  function uniqueMembership(id, memberships, label) {
    const matches = Object.entries(memberships).filter(([, ids2]) => ids2.includes(id)).map(([name]) => name);
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

  // ../../../shared/rules/critical-domestic.js
  var CRITICAL_DOMESTIC_DOMAIN_SUFFIXES = Object.freeze([
    "baidupcs.com",
    "baidupcs.net",
    "baiduyun.com",
    "baiduyuncdn.com",
    "baidubce.com",
    "bcebos.com",
    "bdstatic.com"
  ]);
  var CRITICAL_DOMESTIC_RULES = Object.freeze(
    CRITICAL_DOMESTIC_DOMAIN_SUFFIXES.map((suffix) => `DOMAIN-SUFFIX,${suffix}`)
  );

  // ../../../shared/rules/custom-rules.js
  var CUSTOM_RULE_PRECEDENCE_INDEX = ROUTING_PRECEDENCE.indexOf("custom");
  if (CUSTOM_RULE_PRECEDENCE_INDEX < 0 || CUSTOM_RULE_PRECEDENCE_INDEX > ROUTING_PRECEDENCE.indexOf("domesticCore")) {
    throw new Error("Custom rules must precede generated lightweight rules");
  }
  var CUSTOM_RULES = Object.freeze({
    block: Object.freeze([]),
    direct: CRITICAL_DOMESTIC_RULES,
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

  // ../../../shared/rules/local-rules.js
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
    if (!FRONTIER_CHANNELS.includes(channel)) {
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
  function renderProfile(rawOptions, nodes, { ruleBaseUrl, policyResolution = null } = {}) {
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
    const groups = renderGroups(buildGroups(options, inventory, policyResolution), options.subscriptionName).join("\n");
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
    const partitioned = partitionShadowrocketNodeSet(normalized.nodes);
    const policy = await loadSubstorePolicyArtifact(context);
    const policyResolution = resolveUnifiedPolicy({
      policy,
      channel: options.channel,
      client: CLIENT.shadowrocket,
      allNodes: normalized.nodes,
      eligibleNodes: partitioned.renderable
    });
    const profile = renderProfile(options, partitioned.renderable, {
      ruleBaseUrl: ruleBaseUrlForChannel(options.channel),
      policyResolution
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
