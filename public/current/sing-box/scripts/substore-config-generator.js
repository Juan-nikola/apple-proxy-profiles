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
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere",
    surge: "surge",
    singbox: "singbox",
    onexray: "onexray",
    happ: "happ"
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
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ], {
      requiredFields: ["cipher", "password"],
      clientNames: { [CLIENT.onexray]: ["ss"] }
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.onexray, CLIENT.happ], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ], {
      requiredFields: ["password"],
      tls: true,
      clientNames: { [CLIENT.onexray]: ["hysteria2"] }
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.onexray, CLIENT.happ]),
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
  var COUNTRY_FLAG_PATTERN = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
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
  function isCountryFlag(flag) {
    return typeof flag === "string" && COUNTRY_FLAG_PATTERN.test(flag);
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
  function countryLabelForFlag(flag) {
    const value = String(flag ?? "").trim();
    if (value === "\u{1F310}") return "\u{1F310} \u672A\u5206\u7C7B";
    return REGION_LABELS.get(value) ?? (isCountryFlag(value) ? value : "\u{1F310} \u672A\u5206\u7C7B");
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
  function assertRenderableNodes(nodes, clientName, renderOneNode) {
    if (!Array.isArray(nodes)) throw new TypeError("Renderable node inventory must be an array");
    if (typeof clientName !== "string" || !/^[A-Za-z][A-Za-z0-9 -]*$/u.test(clientName)) {
      throw new TypeError("Render client name is invalid");
    }
    if (typeof renderOneNode !== "function") throw new TypeError("Node renderer must be a function");
    const failures = {};
    for (const node of nodes) {
      try {
        renderOneNode(node);
      } catch {
        increment(failures, protocolOf(node));
      }
    }
    const counts = Object.keys(failures).sort((left, right) => left.localeCompare(right, "en")).map((protocol2) => `${protocol2}=${failures[protocol2]}`).join(",");
    if (counts) throw new Error(`${clientName} cannot render selected protocols: ${counts}`);
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
    profileMode: "light",
    adblockMode: "off"
  });
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad", "android", "openwrt"]);
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current"]);
  var PROFILE_MODES = /* @__PURE__ */ new Set(["light", "diagnostic"]);
  var ADBLOCK_MODES = /* @__PURE__ */ new Set(["off", "full"]);
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
    if (Object.hasOwn(raw, "ruleSetFormat")) {
      throw new Error("Option 'ruleSetFormat' was removed; migrate to profileMode and adblockMode");
    }
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
    const profileMode = raw.profileMode === void 0 ? DEFAULTS.profileMode : raw.profileMode;
    if (typeof profileMode !== "string" || !PROFILE_MODES.has(profileMode)) throw new Error("Option 'profileMode' has an unsupported value");
    const adblockMode = raw.adblockMode === void 0 ? DEFAULTS.adblockMode : raw.adblockMode;
    if (typeof adblockMode !== "string" || !ADBLOCK_MODES.has(adblockMode)) throw new Error("Option 'adblockMode' has an unsupported value");
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
      profileMode,
      adblockMode
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
    "alpn",
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
    "obfs-mode",
    "obfs_mode",
    "obfs-host",
    "obfs_host",
    "obfs-password",
    "obfs_password",
    "mode",
    "userkey",
    "user-key",
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
    "idle-session-check-interval",
    "idle-session-timeout",
    "min-idle-session",
    "underlying-proxy",
    "chain",
    "dialer-proxy",
    "detour",
    "prev_hop"
  ]);
  var CHAIN_ALIASES2 = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  var GENERATED_CHAIN_POLICY = "\u{1F517} \u5165\u53E3\u8282\u70B9";
  var ANYTLS_FIELDS = /* @__PURE__ */ new Set([
    "name",
    "type",
    "server",
    "port",
    "password",
    "tls",
    "security",
    "sni",
    "servername",
    "skip-cert-verify",
    "allow-insecure",
    "client-fingerprint",
    "alpn",
    "reality-opts",
    "network",
    "idle-session-check-interval",
    "idle-session-timeout",
    "min-idle-session",
    ...CHAIN_ALIASES2
  ]);
  var ANYTLS_REALITY_FIELDS = /* @__PURE__ */ new Set(["public-key", "short-id"]);
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
  function validateAnyTlsShape(node) {
    const unsupported = Object.keys(node).find((key) => !key.startsWith("_") && !ANYTLS_FIELDS.has(key));
    if (unsupported !== void 0) throw new Error(`Unsupported sing-box AnyTLS field: ${unsupported}`);
    if (hasOwn(node, "network") && node.network !== "tcp") {
      throw new Error("Unsupported sing-box AnyTLS field: network");
    }
    if (hasOwn(node, "tls") && (typeof node.tls !== "boolean" || node.tls === false)) {
      throw new Error("Unsupported sing-box AnyTLS field: tls");
    }
    if (hasOwn(node, "security") && !["tls", "reality"].includes(node.security)) {
      throw new Error(`Unsupported sing-box AnyTLS security: ${String(node.security)}`);
    }
    const reality = node["reality-opts"];
    if (node.security === "reality" && !hasOwn(node, "reality-opts")) {
      throw new Error("sing-box AnyTLS Reality options are required for Reality security");
    }
    if (node.security === "tls" && hasOwn(node, "reality-opts")) {
      throw new Error("sing-box AnyTLS security conflicts with Reality options");
    }
    for (const key of ["sni", "servername"]) {
      if (hasOwn(node, key) && (typeof node[key] !== "string" || node[key].length === 0 || node[key].trim() !== node[key])) {
        throw new Error(`sing-box AnyTLS field '${key}' is invalid`);
      }
    }
    if (hasOwn(node, "sni") && hasOwn(node, "servername") && node.sni !== node.servername) {
      throw new Error("Conflicting sing-box AnyTLS aliases: sni,servername");
    }
    for (const key of ["skip-cert-verify", "allow-insecure"]) {
      if (hasOwn(node, key) && typeof node[key] !== "boolean") {
        throw new Error(`sing-box AnyTLS field '${key}' is invalid`);
      }
    }
    if (hasOwn(node, "skip-cert-verify") && hasOwn(node, "allow-insecure") && node["skip-cert-verify"] !== node["allow-insecure"]) {
      throw new Error("Conflicting sing-box AnyTLS aliases: skip-cert-verify,allow-insecure");
    }
    if (hasOwn(node, "client-fingerprint") && (typeof node["client-fingerprint"] !== "string" || node["client-fingerprint"].length === 0 || node["client-fingerprint"].trim() !== node["client-fingerprint"])) {
      throw new Error("sing-box AnyTLS field 'client-fingerprint' is invalid");
    }
    if (hasOwn(node, "reality-opts")) {
      if (!reality || typeof reality !== "object" || Array.isArray(reality)) {
        throw new Error("sing-box AnyTLS Reality options are invalid");
      }
      const unsupportedReality = Object.keys(reality).find((key) => !ANYTLS_REALITY_FIELDS.has(key));
      if (unsupportedReality !== void 0) {
        throw new Error(`Unsupported sing-box AnyTLS Reality field: ${unsupportedReality}`);
      }
      if (typeof reality["public-key"] !== "string" || reality["public-key"].length === 0 || reality["public-key"].trim() !== reality["public-key"]) {
        throw new Error("sing-box AnyTLS Reality public key is invalid");
      }
      if (hasOwn(reality, "short-id") && (typeof reality["short-id"] !== "string" || !/^[0-9a-f]+$/iu.test(reality["short-id"]))) {
        throw new Error("sing-box AnyTLS Reality short ID is invalid");
      }
    }
  }
  function sanitizeSingBoxNode(node) {
    return Object.fromEntries(Object.entries(node).filter(([key]) => key.startsWith("_") || ALLOWED_KEYS2.has(key)));
  }
  function setIf(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target[key] = value;
  }
  function durationSeconds(node, key) {
    if (!hasOwn(node, key)) return void 0;
    const value = node[key];
    if (Number.isSafeInteger(value) && value >= 0) return `${value}s`;
    if (typeof value === "string" && value.length > 0 && value.trim() === value) return value;
    throw new Error(`sing-box AnyTLS node field '${key}' is invalid`);
  }
  function minIdleSession(node) {
    if (!hasOwn(node, "min-idle-session")) return void 0;
    const value = node["min-idle-session"];
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("sing-box AnyTLS node field 'min-idle-session' is invalid");
    return value;
  }
  function tlsFields(node, required = false) {
    const reality = node["reality-opts"];
    const enabled = required || node.tls === true || node.security === "tls" || node.security === "reality" || reality !== void 0;
    if (!enabled) return void 0;
    const tls = { enabled: true };
    setIf(tls, "server_name", node.sni ?? node.servername);
    if (node.alpn !== void 0) {
      if (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((value) => typeof value !== "string" || value.length === 0 || value.trim() !== value)) {
        throw new Error("sing-box TLS ALPN is invalid");
      }
      tls.alpn = [...node.alpn];
    }
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
    const aliases = CHAIN_ALIASES2.filter((key) => hasOwn(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
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
        {
          const version = Number(node.version);
          if (![4, 5, 6].includes(version)) throw new Error("Unsupported sing-box Snell version");
          const outputVersion = version === 5 ? 4 : version;
          outbound = { ...base(node, "snell"), psk: requiredString2(node, "psk"), version: outputVersion };
          if (node.network === "tcp" || node.network === "udp") outbound.network = node.network;
          if (outputVersion === 4) {
            setIf(outbound, "reuse", node.reuse);
            setIf(outbound, "obfs_mode", node.obfs_mode ?? node["obfs-mode"] ?? node.obfs);
            setIf(outbound, "obfs_host", node["obfs-host"] ?? node.obfs_host);
          } else {
            setIf(outbound, "userkey", node.userkey ?? node["user-key"]);
            setIf(outbound, "reuse", node.reuse);
            setIf(outbound, "mode", node.mode);
          }
        }
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
        validateAnyTlsShape(node);
        outbound = { ...base(node, "anytls"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        setIf(outbound, "idle_session_check_interval", durationSeconds(node, "idle-session-check-interval"));
        setIf(outbound, "idle_session_timeout", durationSeconds(node, "idle-session-timeout"));
        setIf(outbound, "min_idle_session", minIdleSession(node));
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
    if (continent.key === CONTINENT.other) {
      const knownFlags = CONTINENTS.flatMap((record) => record.flags).join("|");
      return `^(?!(?:\u{1F517}|${knownFlags})).+$`;
    }
    return `^(?:${continent.flags.join("|")}).+$`;
  }
  function escapeRegex3(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function flagFilter(flag) {
    return `^${escapeRegex3(flag)}(?: |$)`;
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
    flag: "flag",
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
  function fallbackHelperName(continent) {
    return `\u{1F6DF} ${continent.helperName}\u6545\u969C\u8F6C\u79FB`;
  }
  function flagGroupName(flag) {
    const label = countryLabelForFlag(flag);
    if (flag === "\u{1F310}" || label === flag) return label;
    return `${flag} ${label}`;
  }
  function continentHelperItems(continent, mode) {
    if (mode === "full") return [automaticHelperName(continent), fallbackHelperName(continent)];
    if (mode === "balanced") return [automaticHelperName(continent)];
    return [];
  }
  function compareFlags(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }
  function expectedFlagContinent(flag) {
    const catalogContinent = continentForFlag(flag);
    if (catalogContinent !== null) return catalogContinent;
    if (flag === "\u{1F310}" || isCountryFlag(flag)) return CONTINENT.other;
    return null;
  }
  function orderedPresentFlags(continent, flags) {
    for (const flag of flags) {
      if (expectedFlagContinent(flag) !== continent.key) {
        throw new Error("Normalized node flag does not match continent metadata");
      }
    }
    const ordered = CONTINENT_FLAGS[continent.key].filter((flag) => flags.has(flag));
    const orderedSet = new Set(ordered);
    ordered.push(...[...flags].filter((flag) => isCountryFlag(flag) && !orderedSet.has(flag)).sort(compareFlags));
    if (continent.key === CONTINENT.other && flags.has("\u{1F310}")) ordered.push("\u{1F310}");
    return ordered;
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
    const presentFlagsByContinent = new Map(presentContinents.map((continent) => {
      const flags = new Set(normalizedNodes.filter((node) => {
        const metadata = nodeMetadata(node);
        return metadata.continent === continent.key && !metadata.chained;
      }).map((node) => nodeMetadata(node).flag));
      return [continent.key, orderedPresentFlags(continent, flags)];
    }));
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
      candidates: presentContinents.map((continent) => continent.name)
    }));
    for (const continent of presentContinents) {
      const flags = presentFlagsByContinent.get(continent.key);
      groups.push(policyGroup({
        kind: GROUP_KIND.continent,
        name: continent.name,
        candidates: [
          ...continentHelperItems(continent, mode),
          ...flags.map(flagGroupName)
        ]
      }));
      for (const flag of flags) {
        groups.push(subscriptionGroup(
          GROUP_KIND.flag,
          flagGroupName(flag),
          flagFilter(flag),
          []
        ));
      }
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

  // ../../shared/policies/intents.js
  var POLICY_TARGET = Object.freeze({
    primaryProxy: "primary-proxy"
  });

  // src/render-groups.js
  var RULE_DOWNLOAD_GROUP = "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D";
  var RULE_DOWNLOAD_FAILOVER_GROUP = "\u{1F9ED} \u89C4\u5219\u4E0B\u8F7D\u6545\u969C\u8F6C\u79FB";
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
  function renderRuleDownloadGroups(inventory, ruleProbeUrl) {
    const nodeCandidates = filterNodes(NON_CHAINED_FILTER, inventory);
    const failover = {
      type: "urltest",
      tag: RULE_DOWNLOAD_FAILOVER_GROUP,
      outbounds: [...nodeCandidates, "DIRECT"],
      url: ruleProbeUrl,
      interval: "30s",
      tolerance: 0,
      interrupt_exist_connections: true
    };
    return [
      {
        type: "selector",
        tag: RULE_DOWNLOAD_GROUP,
        outbounds: [RULE_DOWNLOAD_FAILOVER_GROUP, "\u{1F680} \u8282\u70B9\u9009\u62E9", "DIRECT"],
        default: RULE_DOWNLOAD_FAILOVER_GROUP,
        interrupt_exist_connections: true
      },
      failover
    ];
  }
  function renderGroup(group, inventory) {
    if (group.name === "\u{1F680} \u8282\u70B9\u9009\u62E9") {
      const outbounds2 = [
        "\u26A1 \u5168\u90E8\u81EA\u52A8",
        "\u{1F6DF} \u5168\u90E8\u6545\u969C\u8F6C\u79FB",
        ...group.candidates.map(targetName)
      ].filter((item, index, all) => all.indexOf(item) === index);
      return {
        type: "selector",
        tag: group.name,
        outbounds: outbounds2.length > 0 ? outbounds2 : ["DIRECT"],
        interrupt_exist_connections: true
      };
    }
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
    const defaultChoice = group.defaultChoice;
    if (defaultChoice !== void 0) outbound.default = targetName(defaultChoice);
    return outbound;
  }
  function renderSingBoxGroups(options, nodes, { ruleProbeUrl = "https://www.gstatic.com/generate_204" } = {}) {
    const inventory = Array.isArray(nodes) ? nodes : [];
    const shared = buildPolicyGroups(options, inventory);
    const visible = [];
    const hidden = [];
    for (const group of shared) {
      if (group.name === RULE_DOWNLOAD_GROUP) {
        const [selector, failover] = renderRuleDownloadGroups(inventory, ruleProbeUrl);
        visible.push(selector);
        hidden.push(failover);
        continue;
      }
      const rendered = renderGroup(group, inventory);
      (group.hidden === true ? hidden : visible).push(rendered);
    }
    return [...visible, ...hidden];
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
    defaultProxy: "\u{1F680} \u8282\u70B9\u9009\u62E9",
    overseasGame: "\u{1F30D} \u6D77\u5916\u6E38\u620F",
    reject: "REJECT"
  });
  var SOURCE_POLICIES = Object.freeze({
    Hijacking: POLICY_TARGETS.reject,
    BlockHttpDNS: POLICY_TARGETS.reject,
    Privacy: "\u{1F575}\uFE0F \u4E25\u683C\u8DDF\u8E2A",
    DomesticCore: POLICY_TARGETS.direct,
    DomesticGame: POLICY_TARGETS.direct,
    BiliBili: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    ByteDance: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    XiaoHongShu: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    Weibo: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    OpenAI: "\u{1F916} AI \u4E13\u7528",
    Claude: "\u{1F916} AI \u4E13\u7528",
    Gemini: "\u{1F916} AI \u4E13\u7528",
    Copilot: "\u{1F916} AI \u4E13\u7528",
    GitHub: "\u{1F419} GitHub",
    YouTube: "\u{1F4FA} YouTube",
    Netflix: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    Disney: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    Spotify: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    GlobalMedia: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    Telegram: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    Facebook: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    Instagram: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    Twitter: "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    TikTok: "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
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

  // src/render-rules.js
  var RULE_DOWNLOAD_HTTP_CLIENT = "\u{1F9ED} \u89C4\u5219\u4E0B\u8F7D HTTP";
  var LOCAL_RULES = Object.freeze([
    { ip_is_private: true, action: "route", outbound: "DIRECT" },
    { domain_suffix: ["local", "lan", "home.arpa"], action: "route", outbound: "DIRECT" }
  ]);
  var QUIC_BLOCK_RULE = Object.freeze({ network: "udp", port: 443, action: "reject" });
  var CUSTOM_TARGETS = Object.freeze({ block: "REJECT", direct: "DIRECT", proxy: "\u{1F680} \u8282\u70B9\u9009\u62E9", ai: "\u{1F916} AI \u4E13\u7528" });
  var CUSTOM_FIELDS = Object.freeze({
    DOMAIN: "domain",
    "DOMAIN-SUFFIX": "domain_suffix",
    "DOMAIN-KEYWORD": "domain_keyword",
    "IP-CIDR": "ip_cidr",
    "IP-CIDR6": "ip_cidr"
  });
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
  function optionalAdblockBase(defaultBase) {
    const optional = defaultBase.replace(/\/sing-box\/(?:rule-sets|rules)$/u, "/optional/adblock-full/sing-box");
    if (optional === defaultBase) throw new Error("sing-box adblock rule base URL must end in /sing-box/rule-sets");
    return optional;
  }
  function renderCustomRules() {
    const rendered = [];
    for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
      for (const entry of entries) {
        const [type, value, ...modifiers] = entry.split(",");
        const field = CUSTOM_FIELDS[type];
        if (!field || !value || modifiers.some((modifier) => modifier !== "no-resolve")) {
          throw new Error(`Invalid sing-box custom rule: ${entry}`);
        }
        rendered.push({ [field]: [value], ...routeAction(CUSTOM_TARGETS[kind]) });
      }
    }
    return rendered;
  }
  function taggedRule(source) {
    return { rule_set: [`rule-${source.id}`], ...routeAction(source.policy) };
  }
  function renderSingBoxRuleSets({ ruleBaseUrl, profileMode = "light", adblockMode = "off" }) {
    const base2 = baseUrl(ruleBaseUrl);
    if (profileMode === "diagnostic") return [];
    if (profileMode !== "light") throw new Error("Unsupported sing-box profile mode");
    const sources = ruleClientCatalog({ adblockMode });
    const adblockBase = adblockMode === "full" ? optionalAdblockBase(base2) : null;
    return sources.map((source) => ({
      type: "remote",
      tag: `rule-${source.id}`,
      format: "binary",
      url: `${source.id === "Advertising" || source.id === "Advertising_Domain" ? adblockBase : base2}/${source.id}.srs`,
      http_client: RULE_DOWNLOAD_HTTP_CLIENT,
      update_interval: "24h"
    }));
  }
  function renderSingBoxRouteRules({
    ruleBaseUrl,
    profileMode = "light",
    adblockMode = "off",
    quicMode = "allow"
  }) {
    if (!["allow", "proxy-block", "all-block"].includes(quicMode)) {
      throw new Error(`Unsupported sing-box quicMode: ${quicMode}`);
    }
    const ruleSets = renderSingBoxRuleSets({ ruleBaseUrl, profileMode, adblockMode });
    const rules = [
      { inbound: "tun-in", action: "sniff" },
      { protocol: "dns", action: "hijack-dns" },
      ...LOCAL_RULES
    ];
    if (quicMode === "all-block") rules.push({ ...QUIC_BLOCK_RULE });
    if (profileMode === "light") {
      const plan2 = orderedRoutingPlan({ adblockMode });
      rules.push(...plan2.filter(({ phase }) => phase === "security").map(taggedRule));
    }
    rules.push(...renderCustomRules());
    if (profileMode === "diagnostic") return { ruleSets, rules, final: "\u{1F680} \u8282\u70B9\u9009\u62E9" };
    const plan = orderedRoutingPlan({ adblockMode });
    for (const phase of ROUTING_PHASES.filter((value) => value !== "security" && value !== "resolvedChinaIp")) {
      for (const source of plan.filter((candidate) => candidate.phase === phase)) {
        if (quicMode === "proxy-block" && source.dnsClass === "proxy") {
          rules.push({ ...QUIC_BLOCK_RULE, rule_set: [`rule-${source.id}`] });
        }
        rules.push(taggedRule(source));
      }
    }
    rules.push({ action: "resolve", server: "dns-direct" });
    rules.push(...plan.filter(({ phase }) => phase === "resolvedChinaIp").map(taggedRule));
    if (quicMode === "proxy-block") rules.push({ ...QUIC_BLOCK_RULE });
    return { ruleSets, rules, final: "\u{1F680} \u8282\u70B9\u9009\u62E9" };
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
  var proxyDnsSourceIds = Object.freeze(
    orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id)
  );
  function renderSingBoxDns(options) {
    const chinaDns = chinaDnsProvider(options.chinaDns);
    const chinaServer = options.chinaDns === "system" ? { type: "local", tag: "dns-direct" } : { type: "udp", tag: "dns-direct", server: chinaDns.address };
    const globalDns = globalDnsProvider(options.globalDns);
    const proxyServer = {
      type: "https",
      tag: "dns-proxy",
      server: globalDns.address,
      server_port: 443,
      path: "/dns-query",
      tls: { enabled: true, server_name: globalDns.serverName },
      detour: "\u{1F680} \u8282\u70B9\u9009\u62E9"
    };
    const proxyDnsRuleSets = proxyDnsSourceIds.map((id) => `rule-${id}`);
    return {
      servers: [chinaServer, proxyServer],
      rules: options.profileMode === "diagnostic" ? [] : [
        {
          rule_set: proxyDnsRuleSets,
          action: "evaluate",
          server: "dns-proxy"
        },
        {
          match_response: true,
          rule_set: proxyDnsRuleSets,
          action: "respond"
        },
        { action: "route", server: "dns-direct" }
      ],
      final: "dns-direct",
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
  function renderSingBoxTun(platform, ipv6Mode = "auto") {
    const ipv4Only = ipv6Mode === "ipv4-only";
    const base2 = {
      type: "tun",
      tag: "tun-in",
      interface_name: platform === "android" ? "sing-box" : "singtun0",
      address: ipv4Only ? ["172.18.0.1/30"] : ["172.18.0.1/30", "fdfe:dcba:9876::1/126"],
      auto_route: true,
      strict_route: true,
      route_exclude_address: [...COMMON_EXCLUDE]
    };
    if (platform === "openwrt") {
      return {
        ...base2,
        stack: "mixed",
        dns_mode: "hijack",
        dns_address: ipv4Only ? ["172.18.0.2"] : ["172.18.0.2", "fdfe:dcba:9876::2"],
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
        include_android_user: [0],
        route_exclude_address: [...COMMON_EXCLUDE]
      };
    }
    return {
      ...base2,
      dns_mode: "hijack",
      dns_address: ipv4Only ? ["172.18.0.2"] : ["172.18.0.2", "fdfe:dcba:9876::2"],
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
  function actionOutbound(rule) {
    if (rule?.action === "route" || rule?.action === "bypass") return rule.outbound;
    return void 0;
  }
  function validateDnsServerShape(server, errors) {
    if (server?.type !== "https") return;
    if (typeof server.server !== "string" || server.server.length === 0) {
      errors.push("HTTPS DNS server host missing");
    } else if (/^(?:https?|tls):\/\//iu.test(server.server) || /[/?#\s]/u.test(server.server)) {
      errors.push("HTTPS DNS server must be a host without scheme or path");
    }
    if (server.server_port !== void 0 && (!Number.isInteger(server.server_port) || server.server_port < 1 || server.server_port > 65535)) {
      errors.push("HTTPS DNS server_port must be between 1 and 65535");
    }
    if (server.path !== void 0 && (typeof server.path !== "string" || !server.path.startsWith("/") || /[\r\n]/u.test(server.path))) {
      errors.push("HTTPS DNS path must start with '/'");
    }
  }
  function validateSingBoxConfig(config) {
    const errors = [];
    if (!config || typeof config !== "object" || Array.isArray(config)) return { valid: false, errors: ["config must be an object"] };
    const outbounds = config.outbounds;
    const outboundTags = uniqueTags(outbounds, errors, "outbound");
    const httpClientTags = uniqueTags(config.http_clients, errors, "HTTP client");
    const ruleSets = uniqueTags(config.route?.rule_set, errors, "rule-set");
    const dnsServers = uniqueTags(config.dns?.servers, errors, "DNS server");
    const inboundTags = uniqueTags(config.inbounds, errors, "inbound");
    const groupTags = new Set(outbounds?.filter((item) => ["selector", "urltest"].includes(item.type)).map((item) => item.tag));
    for (const client of config.http_clients ?? []) {
      if (client.detour !== void 0 && !outboundTags.has(client.detour)) {
        errors.push("HTTP client references missing outbound tag");
      }
    }
    for (const outbound of outbounds ?? []) {
      for (const target of outbound.outbounds ?? []) if (!outboundTags.has(target)) errors.push("outbound references missing tag");
      if (outbound.default !== void 0 && !outboundTags.has(outbound.default)) errors.push("selector default references missing tag");
    }
    const routeRules = config.route?.rules;
    if (!Array.isArray(routeRules)) errors.push("route rules missing");
    else if (routeRules.length > RULE_BUDGETS.startupInlineEntries) errors.push("route inline rule budget exceeded");
    for (const rule of routeRules ?? []) {
      if (Object.hasOwn(rule, "geoip")) errors.push("route contains removed geoip");
      if (Object.hasOwn(rule, "geosite")) errors.push("route contains removed geosite");
      for (const tag of rule.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("route references missing rule-set tag");
      const target = actionOutbound(rule);
      if (target !== void 0 && !outboundTags.has(target)) errors.push("route references missing outbound tag");
      if (rule.action === "hijack-dns" && !dnsServers.size) errors.push("DNS hijack requires DNS servers");
      if (rule.action === "resolve" && (typeof rule.server !== "string" || !dnsServers.has(rule.server))) {
        errors.push("route resolve references missing DNS server");
      }
      if (rule.action !== void 0 && typeof rule.action !== "string") errors.push("route rule action must be a string");
    }
    const routeFinal = config.route?.final;
    if (typeof routeFinal !== "string" || !outboundTags.has(routeFinal)) errors.push("route final references missing outbound tag");
    const defaultHttpClient = config.route?.default_http_client;
    if (defaultHttpClient !== void 0 && (typeof defaultHttpClient !== "string" || !httpClientTags.has(defaultHttpClient))) {
      errors.push("route default_http_client references missing HTTP client tag");
    }
    for (const ruleSet of config.route?.rule_set ?? []) {
      if (Object.hasOwn(ruleSet, "download_detour")) errors.push("rule-set contains deprecated download_detour");
      if (ruleSet.type === "remote" && (typeof ruleSet.http_client !== "string" || !httpClientTags.has(ruleSet.http_client))) {
        errors.push("remote rule-set references missing http_client tag");
      }
      if (ruleSet.type === "remote" && (ruleSet.format !== "binary" || typeof ruleSet.url !== "string" || !/^https:\/\/[^\s]+\.srs$/u.test(ruleSet.url))) {
        errors.push("remote rule-set must use binary format and an HTTPS .srs URL");
      }
    }
    const dnsFinal = config.dns?.final;
    if (typeof dnsFinal !== "string" || !dnsServers.has(dnsFinal)) errors.push("DNS final references missing server");
    let seenAnonymousEvaluate = false;
    const evaluateTags = /* @__PURE__ */ new Set();
    for (const rule of config.dns?.rules ?? []) {
      for (const tag of rule.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("DNS references missing rule-set tag");
      if (typeof rule.action !== "string") errors.push("DNS rule action must be a string");
      if ((rule.action === "route" || rule.action === "evaluate") && typeof rule.server !== "string") {
        errors.push("DNS rule action server missing");
      }
      if (rule.action === "respond" && !seenAnonymousEvaluate) {
        errors.push("DNS respond rule requires a preceding anonymous evaluate rule");
      }
      if (rule.match_response === true && !seenAnonymousEvaluate) {
        errors.push("DNS match_response rule requires a preceding anonymous evaluate rule");
      }
      if (typeof rule.match_response === "string" && !evaluateTags.has(rule.match_response)) {
        errors.push("DNS match_response references missing evaluate tag");
      }
      if (rule.server !== void 0 && !dnsServers.has(rule.server)) errors.push("DNS rule references missing server");
      if (rule.detour !== void 0 && !outboundTags.has(rule.detour)) errors.push("DNS rule references missing outbound");
      if (rule.action === "evaluate") {
        if (rule.tag === void 0) {
          seenAnonymousEvaluate = true;
        } else if (typeof rule.tag === "string") {
          evaluateTags.add(rule.tag);
        }
      }
    }
    for (const server of config.dns?.servers ?? []) {
      validateDnsServerShape(server, errors);
      if (server.detour !== void 0 && !outboundTags.has(server.detour)) errors.push("DNS server references missing outbound");
      if (server.detour === server.tag || server.tag === dnsFinal && server.detour === "dns-proxy") errors.push("DNS server loop detected");
    }
    for (const inbound of config.inbounds ?? []) {
      if (inbound.type === "tun" && !inbound.auto_route) errors.push("TUN auto_route is required");
      if (inbound.type === "tun" && inbound.platform?.include_android_user && inbound.auto_redirect) errors.push("Android TUN cannot use auto_redirect");
    }
    if (Object.hasOwn(config.experimental?.cache_file ?? {}, "store_rdrc")) {
      errors.push("cache file contains deprecated store_rdrc");
    }
    if (!inboundTags.has("tun-in")) errors.push("tun-in inbound missing");
    if (!groupTags.has("\u{1F680} \u8282\u70B9\u9009\u62E9")) errors.push("primary selector missing");
    return { valid: errors.length === 0, errors: [...new Set(errors)] };
  }

  // src/render-config.js
  function renderSingBoxConfig(rawOptions, nodes, rendererOptions = {}) {
    if (Object.hasOwn(rendererOptions, "ruleSetFormat")) {
      throw new Error("Renderer option 'ruleSetFormat' was removed; migrate to profileMode and adblockMode");
    }
    const { ruleBaseUrl } = rendererOptions;
    const options = isParsedSingBoxOptions(rawOptions) ? rawOptions : parseSingBoxOptions(rawOptions);
    const inventory = Array.isArray(nodes) ? nodes : [];
    if (inventory.length === 0) throw new Error("sing-box refuses an empty node inventory");
    for (const node of inventory) nodeMetadata(node);
    const nodeOutbounds = inventory.map(renderSingBoxOutbound);
    const groups = renderSingBoxGroups(options, inventory, {
      ruleProbeUrl: `${ruleBaseUrl.replace(/\/+$/u, "")}/Hijacking.srs`
    });
    const { ruleSets, rules, final } = renderSingBoxRouteRules({
      ruleBaseUrl,
      profileMode: options.profileMode,
      adblockMode: options.adblockMode,
      quicMode: options.quicMode
    });
    const config = {
      log: { level: "info", timestamp: true },
      dns: renderSingBoxDns(options),
      http_clients: [{
        tag: RULE_DOWNLOAD_HTTP_CLIENT,
        version: 2,
        detour: "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D"
      }],
      inbounds: [renderSingBoxTun(options.platform, options.ipv6Mode)],
      outbounds: [
        { type: "direct", tag: "DIRECT" },
        { type: "block", tag: "REJECT" },
        ...groups,
        ...nodeOutbounds
      ],
      route: {
        auto_detect_interface: true,
        default_domain_resolver: "dns-direct",
        default_http_client: RULE_DOWNLOAD_HTTP_CLIENT,
        rule_set: ruleSets,
        rules,
        final
      },
      experimental: { cache_file: { enabled: true, path: "cache.db", store_dns: true } }
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
    assertRenderableNodes(normalized.nodes, "sing-box", renderSingBoxOutbound);
    logDiagnostics(context, options, normalized.nodes);
    const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/sing-box/rule-sets`;
    const config = renderSingBoxConfig(options, normalized.nodes.map(sanitizeSingBoxNode), { ruleBaseUrl });
    return { ...input, $content: `${JSON.stringify(config, null, 2)}
` };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return SingBoxConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });
}
