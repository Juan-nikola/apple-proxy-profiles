var SurgeNodesBundle = (() => {
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
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash]),
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
        for (const record of byIdentity) {
          const suffixGroup = suffixGroups.get(record.suffix) ?? [];
          suffixGroup.push(record);
          suffixGroups.set(record.suffix, suffixGroup);
        }
        for (const records2 of suffixGroups.values()) {
          records2.forEach((record, index) => {
            const suffix = records2.length > 1 ? `${record.suffix}-${index + 1}` : record.suffix;
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

  // ../../shared/release/client-catalog.js
  var freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
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
  ].map((record) => freeze(record));
  var byId = new Map(records.map((record) => [record.id, record]));
  var ids = freeze(records.map(({ id }) => id));
  var activeIds = freeze(records.filter(({ state }) => state === "active").map(({ id }) => id));
  var plannedIds = freeze(records.filter(({ state }) => state === "planned").map(({ id }) => id));
  var lightweightRuleIds = freeze([
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

  // ../../shared/policies/platform-presets.js
  var POLICY_PLATFORM_PRESETS = Object.freeze({
    macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    android: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    openwrt: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200 })
  });

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
  var PARSED_NODES = /* @__PURE__ */ new WeakSet();
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
  function parseSurgeNodeOptions(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Surge node options must be an object");
    for (const key of Object.keys(raw)) {
      if (!key.startsWith("_") && !NODE_ALLOWED_KEYS.has(key)) throw new Error(`Unknown Surge node option: ${key}`);
    }
    for (const key of NODE_REQUIRED_KEYS) {
      if (!Object.hasOwn(raw, key)) throw new Error(`Option '${key}' is required`);
    }
    if (requiredString(raw, "output") !== "nodes") throw new Error("Option 'output' must be nodes");
    if (requiredString(raw, "type") !== "collection") throw new Error("Option 'type' must be collection");
    const options = {
      output: "nodes",
      type: "collection",
      name: validateCollectionName(raw.name, "Option 'name'"),
      clientChain: enumValue(raw, "clientChain", DEFAULTS.clientChain)
    };
    Object.freeze(options);
    PARSED_NODES.add(options);
    return options;
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
  function renderSurgeNodeResource(nodes) {
    const inventory = Array.isArray(nodes) ? nodes : [];
    if (inventory.length === 0) throw new Error("Surge refuses an empty node resource");
    return [
      "# Generated by apple-proxy-profiles. Private Sub-Store output.",
      "[Proxy]",
      ...inventory.map((node) => renderSurgeProxy(sanitizeSurgeNode(node))),
      ""
    ].join("\n");
  }

  // src/substore-nodes-entry.js
  function logDiagnostics(context, options, normalized, renderFailures) {
    const logger = context?.logger;
    const method = typeof logger === "function" ? logger : typeof logger?.info === "function" ? logger.info.bind(logger) : typeof logger?.log === "function" ? logger.log.bind(logger) : null;
    if (!method) return;
    try {
      method(`[surge-nodes] ${JSON.stringify({
        client: "surge",
        collection: options.name,
        total: normalized.diagnostics.total,
        accepted: normalized.nodes.length - Object.values(renderFailures ?? {}).reduce((sum, count) => sum + count, 0),
        renderFailures
      })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseSurgeNodeOptions(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
    const rawNodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
      throw new Error("produceArtifact must return a non-empty node array");
    }
    const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
    const probe = (node) => renderSurgeProxy(sanitizeSurgeNode(node));
    const partitioned = partitionRenderableNodes(normalized.nodes, "Surge", probe);
    logDiagnostics(context, options, normalized, partitioned.failureProtocols);
    return { ...input, $content: renderSurgeNodeResource(partitioned.renderable) };
  }
  return __toCommonJS(substore_nodes_entry_exports);
})();
async function operator(input, targetPlatform) {
  return SurgeNodesBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
