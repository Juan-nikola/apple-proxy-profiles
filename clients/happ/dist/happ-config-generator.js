var HappConfigBundle = (() => {
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
    HAPP_PRIVATE_TASKS: () => HAPP_PRIVATE_TASKS,
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

  // src/policy-overrides.js
  var POLICY_DEFAULTS = Object.freeze({
    "\u{1F916} AI \u4E13\u7528": "FOLLOW",
    "\u{1F419} GitHub": "FOLLOW",
    "\u{1F4FA} YouTube": "FOLLOW",
    "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53": "FOLLOW",
    "\u{1F4AC} \u6D77\u5916\u793E\u4EA4": "FOLLOW",
    "\u{1F34E} Apple": "DIRECT",
    "\u{1FA9F} Microsoft": "DIRECT",
    "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0": "DIRECT",
    "\u{1F30D} \u6D77\u5916\u6E38\u620F": "FOLLOW",
    "\u2B07\uFE0F \u4E0B\u8F7D/P2P": "DIRECT",
    "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D": "FOLLOW",
    "\u6700\u7EC8\u515C\u5E95": "FOLLOW"
  });
  var POLICY_KEYS = Object.freeze([
    ["\u{1F916} AI \u4E13\u7528", ["AI \u4E13\u7528", "ai"]],
    ["\u{1F419} GitHub", ["GitHub", "github"]],
    ["\u{1F4FA} YouTube", ["YouTube", "youtube"]],
    ["\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53", ["\u6D77\u5916\u6D41\u5A92\u4F53", "globalMedia"]],
    ["\u{1F4AC} \u6D77\u5916\u793E\u4EA4", ["\u6D77\u5916\u793E\u4EA4", "globalSocial"]],
    ["\u{1F34E} Apple", ["Apple", "apple"]],
    ["\u{1FA9F} Microsoft", ["Microsoft", "microsoft"]],
    ["\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0", ["\u56FD\u5185\u5E73\u53F0", "domestic"]],
    ["\u{1F30D} \u6D77\u5916\u6E38\u620F", ["\u6D77\u5916\u6E38\u620F", "overseasGame"]],
    ["\u2B07\uFE0F \u4E0B\u8F7D/P2P", ["\u4E0B\u8F7D/P2P", "download"]],
    ["\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D", ["DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D", "dnsAndRules"]],
    ["\u6700\u7EC8\u515C\u5E95", ["final"]]
  ]);
  var ALIASES = new Map(POLICY_KEYS.flatMap(([primary, aliases]) => [[primary, primary], ...aliases.map((alias) => [alias, primary])]));
  var BASE64URL = /^[A-Za-z0-9_-]*$/u;
  var PROTOTYPE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function plainObject(value, message) {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError(message);
    }
    return value;
  }
  function canonicalTarget(value) {
    if (typeof value !== "string") throw new TypeError("Policy override targets must be strings");
    const keyword = /^(direct|follow)$/iu.exec(value);
    if (keyword) return keyword[1].toUpperCase();
    const node = /^node:(.*)$/iu.exec(value);
    if (!node || node[1].trim().length === 0) throw new Error("Policy override target is invalid");
    return `NODE:${node[1]}`;
  }
  function decodePolicyOverrides(encoded) {
    if (encoded === "") return Object.freeze({});
    if (typeof encoded !== "string" || !BASE64URL.test(encoded) || encoded.includes("=")) {
      throw new Error("policyOverrides must be unpadded Base64URL");
    }
    let parsed;
    try {
      const base64 = encoded.replace(/-/gu, "+").replace(/_/gu, "/");
      const bytes = Uint8Array.from(atob(base64), (character) => character.codePointAt(0));
      const canonical = btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("")).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
      if (canonical !== encoded) throw new Error("policyOverrides must use canonical Base64URL");
      const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      parsed = JSON.parse(json);
    } catch {
      throw new Error("policyOverrides must encode UTF-8 JSON");
    }
    plainObject(parsed, "policyOverrides must encode a plain object");
    const overrides = {};
    for (const key of Reflect.ownKeys(parsed)) {
      if (typeof key !== "string" || PROTOTYPE_KEYS.has(key)) throw new Error("Unknown policy override key");
      const descriptor = Object.getOwnPropertyDescriptor(parsed, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) throw new Error("Policy overrides must contain data values");
      const primary = ALIASES.get(key);
      if (!primary) throw new Error(`Unknown policy override key: ${key}`);
      const target = canonicalTarget(descriptor.value);
      if (Object.hasOwn(overrides, primary) && overrides[primary] !== target) throw new Error(`Policy override conflict: ${primary}`);
      overrides[primary] = target;
    }
    return Object.freeze(overrides);
  }
  function nodeName(node) {
    return typeof node?.name === "string" ? node.name : "";
  }
  function nodeId(node) {
    const id = node?._profile?.id;
    if (typeof id !== "string" || id.length === 0) throw new Error("Normalized node is missing _profile.id");
    return id;
  }
  function resolvePolicyOverrides({ encoded = "", allNodes, eligibleNodes }) {
    if (!Array.isArray(allNodes) || !Array.isArray(eligibleNodes)) throw new TypeError("allNodes and eligibleNodes must be arrays");
    const overrides = decodePolicyOverrides(encoded);
    const targets = {};
    const warnings = [];
    const fixedNodes = [];
    for (const [businessKey, defaultTarget] of Object.entries(POLICY_DEFAULTS)) {
      const configured = overrides[businessKey] ?? defaultTarget;
      if (configured === "DIRECT" || configured === "FOLLOW") {
        targets[businessKey] = Object.freeze({ configured, resolved: configured, status: configured.toLowerCase(), warningCode: null, nodeId: null });
        continue;
      }
      const name = configured.slice("NODE:".length);
      const eligibleMatches = eligibleNodes.filter((node) => nodeName(node) === name);
      if (eligibleMatches.length === 1) {
        const id = nodeId(eligibleMatches[0]);
        targets[businessKey] = Object.freeze({ configured, resolved: configured, status: "fixed", warningCode: null, nodeId: id });
        if (!fixedNodes.includes(id)) fixedNodes.push(id);
        continue;
      }
      const status = eligibleMatches.length > 1 ? "duplicate-node-fallback" : allNodes.some((node) => nodeName(node) === name) ? "incompatible-node-fallback" : "missing-node-fallback";
      targets[businessKey] = Object.freeze({ configured, resolved: "FOLLOW", status, warningCode: status, nodeId: null });
      warnings.push(Object.freeze({ businessKey, code: status }));
    }
    return Object.freeze({ targets: Object.freeze(targets), fixedNodes: Object.freeze(fixedNodes), warnings: Object.freeze(warnings) });
  }

  // src/audit.js
  function nodeId2(node) {
    const id = node?._profile?.id;
    if (typeof id !== "string" || id.length === 0) throw new Error("Happ normalized node is missing _profile.id");
    return id;
  }
  function buildHappAudit({ nodes, allNodes = nodes, options }) {
    if (!Array.isArray(nodes) || !Array.isArray(allNodes)) throw new TypeError("Happ audit nodes must be arrays");
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Happ audit options are invalid");
    const resolution = resolvePolicyOverrides({ encoded: options.policyOverrides ?? "", allNodes, eligibleNodes: nodes });
    const names = new Map(nodes.map((node) => [nodeId2(node), node.name]));
    const targets = Object.fromEntries(Object.entries(resolution.targets).map(([businessKey, target]) => [businessKey, Object.freeze({
      configured: target.configured,
      resolved: target.resolved,
      status: target.status,
      warningCode: target.warningCode,
      nodeName: target.nodeId === null ? null : names.get(target.nodeId) ?? null
    })]));
    return Object.freeze({
      schemaVersion: 1,
      counts: Object.freeze({ eligibleNodes: nodes.length, fixedNodes: resolution.fixedNodes.length, warnings: resolution.warnings.length }),
      targets: Object.freeze(targets),
      warnings: Object.freeze(resolution.warnings.map(({ businessKey, code }) => Object.freeze({ businessKey, code })))
    });
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
    policyOverrides: "",
    adblockMode: "off"
  });
  var OUTPUTS = /* @__PURE__ */ new Set(["config", "audit"]);
  var CONFIG_PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad", "android", "windows", "linux"]);
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var ENUM_KEYS = Object.freeze(["dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, "channel", ...ENUM_KEYS, "policyOverrides"]);
  var PROTOTYPE_KEYS2 = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  function optionError(key, reason) {
    return new Error(`Option '${key}' ${reason}`);
  }
  function ownDataOptions(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("Happ options must be a plain object");
    }
    if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) {
      throw new TypeError("Happ options must be a plain object");
    }
    const values = /* @__PURE__ */ new Map();
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string" || PROTOTYPE_KEYS2.has(key)) throw new Error("Unknown Happ option");
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
        throw new Error("Happ options must contain only enumerable data options");
      }
      if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown Happ option: ${key}`);
      values.set(key, descriptor.value);
    }
    return values;
  }
  function requiredString(values, key) {
    if (!values.has(key)) throw optionError(key, "is required");
    const value = values.get(key);
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
      throw optionError(key, "must be a non-empty single-line string");
    }
    return value;
  }
  function enumValue(values, key) {
    const value = values.has(key) && values.get(key) !== void 0 ? values.get(key) : DEFAULTS[key];
    if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
      throw optionError(key, "has an unsupported value");
    }
    return value;
  }
  function parseHappOptions(raw) {
    const values = ownDataOptions(raw);
    for (const key of REQUIRED_KEYS) requiredString(values, key);
    const output = requiredString(values, "output");
    if (!OUTPUTS.has(output)) throw optionError("output", "has an unsupported value");
    if (requiredString(values, "type") !== "collection") throw optionError("type", "must be 'collection'");
    const platform = requiredString(values, "platform");
    if (output === "config" && !CONFIG_PLATFORMS.has(platform) || output === "audit" && platform !== "all") {
      throw optionError("platform", "is invalid for output mode");
    }
    const channel = values.has("channel") && values.get("channel") !== void 0 ? values.get("channel") : DEFAULTS.channel;
    if (typeof channel !== "string" || !CHANNELS.has(channel)) throw optionError("channel", "has an unsupported value");
    const policyOverrides = values.has("policyOverrides") && values.get("policyOverrides") !== void 0 ? values.get("policyOverrides") : DEFAULTS.policyOverrides;
    if (typeof policyOverrides !== "string") throw optionError("policyOverrides", "must be a string");
    return Object.freeze({
      output,
      type: "collection",
      name: requiredString(values, "name"),
      subscriptionName: requiredString(values, "subscriptionName"),
      platform,
      channel,
      dnsMode: enumValue(values, "dnsMode"),
      chinaDns: enumValue(values, "chinaDns"),
      globalDns: enumValue(values, "globalDns"),
      blockMode: enumValue(values, "blockMode"),
      quicMode: enumValue(values, "quicMode"),
      ipv6Mode: enumValue(values, "ipv6Mode"),
      policyOverrides,
      adblockMode: "off"
    });
  }

  // ../../shared/nodes/capabilities.js
  var EGERN_VMESS_SECURITY = /* @__PURE__ */ new Set(["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"]);
  var HAPP_SHADOWSOCKS_METHODS = /* @__PURE__ */ new Set([
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
    "aes-128-gcm",
    "aes-256-gcm",
    "chacha20-poly1305",
    "chacha20-ietf-poly1305",
    "xchacha20-poly1305",
    "xchacha20-ietf-poly1305"
  ]);
  var HAPP_REALITY_FINGERPRINTS = /* @__PURE__ */ new Set([
    "chrome",
    "firefox",
    "safari",
    "ios",
    "android",
    "edge",
    "360",
    "qq",
    "random",
    "randomized",
    "chrome_133",
    "chrome_120",
    "chrome_106",
    "firefox_148",
    "firefox_120",
    "safari_26",
    "edge_106"
  ]);
  var SHADOW_TLS_ALIASES = Object.freeze(["shadow-tls", "shadow-tls-opts", "shadow_tls"]);
  var BLOCK_QUIC_ALIASES = Object.freeze(["block-quic", "block_quic"]);
  var IP_VERSION_ALIASES = Object.freeze(["ip-version", "ip_version"]);
  var UDP_ALIASES = Object.freeze(["udp", "udp-relay", "udp_relay"]);
  var CHAIN_ALIASES2 = Object.freeze(["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"]);
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
  function isNonblankOpaqueString2(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isValidPort2(value) {
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
  function validOptionalString(node, key) {
    return !hasOption(node, key) || isNonblankString(node[key]);
  }
  function validOptionalOpaqueString(node, key) {
    return !hasOption(node, key) || isNonblankOpaqueString2(node[key]);
  }
  function isOptionalBoolean(node, key) {
    return !hasOption(node, key) || typeof node[key] === "boolean";
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
  function isRealityPublicKey(value) {
    return isNonblankString(value) && (value.startsWith("TEST_ONLY_") || /^[A-Za-z0-9_-]{43}=?$/.test(value));
  }
  function tlsRequestedForCapability(node) {
    return node.tls === true || node.security === "tls" || node.security === "reality" || hasOption(node, "reality-opts");
  }
  function normalizeTransport(node) {
    const network = node.network ?? "tcp";
    return typeof network === "string" ? network.trim().toLowerCase() : "";
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
  function validOptionalAuthentication(node) {
    return validOptionalString(node, "username") && validOptionalOpaqueString(node, "password");
  }
  function hasAnyChain(node) {
    return CHAIN_ALIASES2.some((key) => hasOption(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "") || node?._profile?.chained === true;
  }
  var HAPP_TRANSPORTS = /* @__PURE__ */ new Set(["tcp", "raw", "ws", "grpc"]);
  var HAPP_REALITY_KEYS = /* @__PURE__ */ new Set(["public-key", "short-id", "spider-x"]);
  var HAPP_COMMON_FIELDS = /* @__PURE__ */ new Set([
    "name",
    "type",
    "server",
    "port",
    "_profile",
    "network",
    "tls",
    "security",
    "sni",
    "servername",
    "skip-cert-verify",
    "allow-insecure",
    "alpn",
    "client-fingerprint",
    "reality-opts",
    "ws-opts",
    "grpc-opts"
  ]);
  function happTlsReason(node, { required = false, requiredReason = "unsupported-happ-tls-shape", allowReality = true } = {}) {
    if (!isOptionalBoolean(node, "tls") || !isOptionalBoolean(node, "skip-cert-verify") || !isOptionalBoolean(node, "allow-insecure") || hasConflictingAliases(node, ["sni", "servername"]) || hasConflictingAliases(node, ["skip-cert-verify", "allow-insecure"]) || !optionalStringAliasesAreValid(node, ["sni", "servername"]) || hasOption(node, "alpn") && (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((value) => !isNonblankString(value))) || hasOption(node, "client-fingerprint") && !isNonblankString(node["client-fingerprint"])) return "unsupported-happ-tls-shape";
    if (hasOption(node, "security") && !["none", "tls", "reality"].includes(node.security)) return "unsupported-happ-tls-shape";
    if (node.tls === false && ["tls", "reality"].includes(node.security)) return "unsupported-happ-tls-shape";
    const reality = node["reality-opts"];
    if (reality !== void 0 && (!allowReality || node.tls === false || !isPlainObject(reality) || Object.keys(reality).some((key) => !HAPP_REALITY_KEYS.has(key)) || !isRealityPublicKey(reality["public-key"]) || hasOption(reality, "short-id") && (!isNonblankString(reality["short-id"]) || !/^[0-9a-f]+$/i.test(reality["short-id"])) || hasOption(reality, "spider-x") && !isNonblankString(reality["spider-x"]))) return "unsupported-happ-reality";
    if (reality !== void 0 && node.security !== "reality" || node.security === "reality" && reality === void 0) return "unsupported-happ-reality";
    if (node.security === "reality" && (hasOption(node, "alpn") || node["skip-cert-verify"] === true || node["allow-insecure"] === true || !HAPP_REALITY_FINGERPRINTS.has(node["client-fingerprint"]) || !(/* @__PURE__ */ new Set(["tcp", "raw", "grpc"])).has(normalizeTransport(node)))) return "unsupported-happ-reality";
    const tls = node.tls === true || node.security === "tls" || node.security === "reality";
    if (required && !tls) return requiredReason;
    if (!tls && ["sni", "servername", "skip-cert-verify", "allow-insecure", "alpn", "client-fingerprint", "reality-opts"].some((key) => hasOption(node, key))) return "unsupported-happ-tls-shape";
    return null;
  }
  function happTransportReason(node, { tlsRequired = false } = {}) {
    const network = normalizeTransport(node);
    if (!HAPP_TRANSPORTS.has(network)) return "unsupported-happ-transport";
    const optionKeys = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "xhttp-opts"];
    if (network === "tcp" || network === "raw") return optionKeys.some((key) => hasOption(node, key)) ? "unsupported-happ-transport" : null;
    if (network === "ws") {
      const options2 = node["ws-opts"];
      if (!isPlainObject(options2) || Object.keys(options2).some((key) => !["path", "headers"].includes(key)) || !validPath(options2.path) || hasOption(options2, "headers") && !validHeaders(options2.headers) || optionKeys.some((key) => key !== "ws-opts" && hasOption(node, key))) return "unsupported-happ-transport";
      return null;
    }
    if (tlsRequired && !tlsRequestedForCapability(node)) return "unsupported-happ-transport";
    const options = node["grpc-opts"];
    if (options !== void 0 && (!isPlainObject(options) || Object.keys(options).some((key) => !["grpc-service-name", "grpc-mode"].includes(key)) || hasOption(options, "grpc-service-name") && !isNonblankString(options["grpc-service-name"]) || hasOption(options, "grpc-mode") && options["grpc-mode"] !== "gun")) return "unsupported-happ-transport";
    return optionKeys.some((key) => key !== "grpc-opts" && hasOption(node, key)) ? "unsupported-happ-transport" : null;
  }
  function happUnknownFieldReason(node, allowed) {
    return Object.keys(node).some((key) => !HAPP_COMMON_FIELDS.has(key) && !allowed.has(key)) ? "unsupported-happ-option" : null;
  }
  function happNodeExclusionReason(node) {
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort2(node.port)) return "invalid-happ-node-shape";
    if (hasAnyChain(node)) return "unsupported-happ-existing-chain";
    if (["sni", "servername", "skip-cert-verify", "allow-insecure"].some((key) => hasOption(node, key)) && (hasConflictingAliases(node, ["sni", "servername"]) || hasConflictingAliases(node, ["skip-cert-verify", "allow-insecure"]))) return "conflicting-happ-alias";
    const protocol2 = normalizeProtocol(node.type);
    if (protocol2 === "ss" || protocol2 === "shadowsocks") {
      const unknown = happUnknownFieldReason(node, /* @__PURE__ */ new Set(["cipher", "password", "udp", "tfo", "plugin", "plugin-opts"]));
      if (unknown) return unknown;
      if (!isNonblankString(node.cipher) || !isNonblankOpaqueString2(node.password)) return "invalid-happ-node-shape";
      if (!HAPP_SHADOWSOCKS_METHODS.has(node.cipher)) return "unsupported-happ-shadowsocks-method";
      if (hasShadowsocksPlugin(node) || hasTlsSettings(node) || !isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo") || node.udp === false) return "unsupported-happ-shadowsocks-shape";
      return happTransportReason(node);
    }
    if (protocol2 === "vless" || protocol2 === "vmess") {
      const unknown = happUnknownFieldReason(node, /* @__PURE__ */ new Set(["uuid", "encryption", "flow", "cipher", "alter-id", "alterId"]));
      if (unknown) return unknown;
      if (!isNonblankString(node.uuid)) return "invalid-happ-node-shape";
      if (protocol2 === "vless" && (hasOption(node, "encryption") && node.encryption !== "none" || hasOption(node, "flow") && !["", "xtls-rprx-vision"].includes(node.flow))) return "unsupported-happ-vless-shape";
      if (protocol2 === "vmess" && (hasOption(node, "flow") || hasOption(node, "cipher") && !EGERN_VMESS_SECURITY.has(node.cipher) || hasOption(node, "encryption") && !EGERN_VMESS_SECURITY.has(node.encryption) || hasConflictingAliases(node, ["cipher", "encryption"]) || hasOption(node, "alter-id") && (!Number.isInteger(node["alter-id"]) || node["alter-id"] !== 0) || hasOption(node, "alterId") && (!Number.isInteger(node.alterId) || node.alterId !== 0))) return "unsupported-happ-vmess-shape";
      return happTlsReason(node) || happTransportReason(node, { tlsRequired: normalizeTransport(node) === "grpc" });
    }
    if (protocol2 === "trojan") return happUnknownFieldReason(node, /* @__PURE__ */ new Set(["password"])) || (!isNonblankOpaqueString2(node.password) ? "invalid-happ-node-shape" : happTlsReason(node, { required: true }) || happTransportReason(node, { tlsRequired: normalizeTransport(node) === "grpc" }));
    if (protocol2 === "socks5") return happUnknownFieldReason(node, /* @__PURE__ */ new Set(["username", "password"])) || (!validOptionalAuthentication(node) || hasOption(node, "username") !== hasOption(node, "password") ? "invalid-happ-node-shape" : hasTlsSettings(node) ? "unsupported-happ-socks5-shape" : happTransportReason(node));
    if (protocol2 === "hysteria2") {
      const unknown = happUnknownFieldReason(node, /* @__PURE__ */ new Set(["password", "obfs", "obfs-password", "obfs_password"]));
      if (unknown || !isNonblankOpaqueString2(node.password)) return unknown ?? "invalid-happ-node-shape";
      if (hasOption(node, "network") && !["quic", "udp"].includes(normalizeTransport(node))) return "unsupported-happ-hysteria2-shape";
      const tlsReason = happTlsReason(node, { required: true, requiredReason: "unsupported-happ-hysteria2-tls", allowReality: false });
      const obfsPassword = firstAliasValue(node, ["obfs-password", "obfs_password"]);
      if (tlsReason || hasConflictingAliases(node, ["obfs-password", "obfs_password"]) || node.obfs !== void 0 && (node.obfs !== "salamander" || !isNonblankOpaqueString2(obfsPassword)) || node.obfs === void 0 && obfsPassword !== void 0) return tlsReason ?? "unsupported-happ-hysteria2-shape";
      return null;
    }
    return "unsupported-protocol";
  }

  // src/render-node.js
  function optional(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target[key] = value;
  }
  function requiredTag(node, tag) {
    if (typeof tag !== "string" || tag.length === 0 || tag.trim() !== tag) {
      throw new Error("Happ outbound tag is invalid");
    }
    const credentials = [
      node.uuid,
      node.password,
      node.username,
      node["obfs-password"],
      node.obfs_password,
      node["reality-opts"]?.["public-key"],
      node["reality-opts"]?.["short-id"]
    ];
    if (tag.includes(node.name) || tag.includes(node.server) || credentials.some((value) => typeof value === "string" && value.length > 0 && tag.includes(value))) {
      throw new Error("Happ outbound tag must be opaque");
    }
    return tag;
  }
  function supportedNode(node) {
    const reason = happNodeExclusionReason(node);
    if (reason) throw new Error(`Happ node cannot be rendered: ${reason}`);
  }
  function requestedTls(node) {
    return node.tls === true || node.security === "tls" || node.security === "reality";
  }
  function tlsSettings(node) {
    const settings = {};
    optional(settings, "serverName", node.sni ?? node.servername);
    if (node.alpn !== void 0) settings.alpn = [...node.alpn];
    optional(settings, "fingerprint", node["client-fingerprint"]);
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) settings.allowInsecure = true;
    return settings;
  }
  function realitySettings(node) {
    const reality = node["reality-opts"];
    if (!reality || typeof reality !== "object" || Array.isArray(reality)) {
      throw new Error("Happ REALITY options cannot be rendered");
    }
    if (node.alpn !== void 0 || node["skip-cert-verify"] === true || node["allow-insecure"] === true || node["client-fingerprint"] === void 0) {
      throw new Error("Happ REALITY options cannot be rendered");
    }
    const settings = {
      // Xray's current client-side name for the server's REALITY public key.
      password: reality["public-key"],
      fingerprint: node["client-fingerprint"]
    };
    optional(settings, "serverName", node.sni ?? node.servername);
    optional(settings, "shortId", reality["short-id"]);
    optional(settings, "spiderX", reality["spider-x"]);
    return settings;
  }
  function transportSettings(node) {
    const network = String(node.network ?? "tcp").trim().toLowerCase();
    if (network === "tcp" || network === "raw") return { method: "raw", rawSettings: {} };
    if (network === "ws") {
      const options = node["ws-opts"];
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw new Error("Happ WebSocket options cannot be rendered");
      }
      const wsSettings = { path: Array.isArray(options.path) ? options.path[0] : options.path };
      if (options.headers !== void 0) {
        wsSettings.headers = Object.fromEntries(Object.entries(options.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
      }
      return { method: "websocket", wsSettings };
    }
    if (network === "grpc") {
      const options = node["grpc-opts"] ?? {};
      const grpcSettings = {};
      optional(grpcSettings, "serviceName", options["grpc-service-name"]);
      return { method: "grpc", grpcSettings };
    }
    throw new Error("Happ transport cannot be rendered");
  }
  function hysteriaStreamSettings(node) {
    const settings = {
      method: "hysteria",
      hysteriaSettings: { version: 2, auth: node.password },
      security: "tls",
      tlsSettings: tlsSettings(node)
    };
    if (node.obfs === "salamander") {
      settings.finalmask = {
        udp: [{ type: "salamander", settings: { password: node["obfs-password"] ?? node.obfs_password } }]
      };
    } else if (node.obfs !== void 0 || node["obfs-password"] !== void 0 || node.obfs_password !== void 0) {
      throw new Error("Happ Hysteria obfuscation cannot be rendered");
    }
    return settings;
  }
  function renderHappStreamSettings(node) {
    supportedNode(node);
    if (normalizeProtocol(node.type) === "hysteria2") return hysteriaStreamSettings(node);
    const stream = transportSettings(node);
    if (node.security === "reality") {
      stream.security = "reality";
      stream.realitySettings = realitySettings(node);
    } else if (requestedTls(node)) {
      stream.security = "tls";
      stream.tlsSettings = tlsSettings(node);
    } else {
      stream.security = "none";
    }
    if (node.tfo === true) stream.sockopt = { tcpFastOpen: true };
    return stream;
  }
  function vnext(node, user) {
    return [{ address: node.server, port: node.port, users: [user] }];
  }
  function renderVless(node, tag) {
    const user = { id: node.uuid, encryption: node.encryption ?? "none" };
    optional(user, "flow", node.flow);
    return { tag, protocol: "vless", settings: { vnext: vnext(node, user) }, streamSettings: renderHappStreamSettings(node) };
  }
  function renderVmess(node, tag) {
    const user = {
      id: node.uuid,
      alterId: node["alter-id"] ?? node.alterId ?? 0,
      security: node.encryption ?? node.cipher ?? "auto"
    };
    return { tag, protocol: "vmess", settings: { vnext: vnext(node, user) }, streamSettings: renderHappStreamSettings(node) };
  }
  function renderTrojan(node, tag) {
    return {
      tag,
      protocol: "trojan",
      settings: { servers: [{ address: node.server, port: node.port, password: node.password }] },
      streamSettings: renderHappStreamSettings(node)
    };
  }
  function renderShadowsocks(node, tag) {
    if (node.udp === false) throw new Error("Happ Shadowsocks UDP disablement cannot be rendered");
    const server = { address: node.server, port: node.port, method: node.cipher, password: node.password };
    return { tag, protocol: "shadowsocks", settings: { servers: [server] }, streamSettings: renderHappStreamSettings(node) };
  }
  function renderSocks(node, tag) {
    const server = { address: node.server, port: node.port };
    if (node.username !== void 0 || node.password !== void 0) {
      server.users = [{ user: node.username, pass: node.password }];
    }
    return { tag, protocol: "socks", settings: { servers: [server] }, streamSettings: renderHappStreamSettings(node) };
  }
  function renderHysteria(node, tag) {
    return {
      tag,
      protocol: "hysteria",
      settings: { version: 2, address: node.server, port: node.port },
      streamSettings: renderHappStreamSettings(node)
    };
  }
  function renderHappOutbound(node, opaqueTag) {
    supportedNode(node);
    const tag = requiredTag(node, opaqueTag);
    switch (normalizeProtocol(node.type)) {
      case "vless":
        return renderVless(node, tag);
      case "vmess":
        return renderVmess(node, tag);
      case "trojan":
        return renderTrojan(node, tag);
      case "ss":
        return renderShadowsocks(node, tag);
      case "socks5":
        return renderSocks(node, tag);
      case "hysteria2":
        return renderHysteria(node, tag);
      default:
        throw new Error("Happ protocol cannot be rendered");
    }
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

  // src/render-dns.js
  var HAPP_DNS_TAG = "happ-dns";
  var HAPP_DIRECT_TAG = "happ-direct";
  var CHINA_DNS = Object.freeze({
    alidns: Object.freeze({ address: "223.5.5.5" }),
    dnspod: Object.freeze({ address: "119.29.29.29" }),
    system: Object.freeze({ address: "localhost" })
  });
  var GLOBAL_DNS = Object.freeze({
    cloudflare: Object.freeze({ address: "https://cloudflare-dns.com/dns-query", host: "cloudflare-dns.com", ip: "1.1.1.1" }),
    google: Object.freeze({ address: "https://dns.google/dns-query", host: "dns.google", ip: "8.8.8.8" }),
    quad9: Object.freeze({ address: "https://dns.quad9.net/dns-query", host: "dns.quad9.net", ip: "9.9.9.9" })
  });
  var DNS_CLASSES = Object.freeze(
    Object.fromEntries(["china", "proxy"].map((dnsClass) => [
      dnsClass,
      Object.freeze(orderedRoutingPlan().filter((source) => source.dnsClass === dnsClass).map(({ id }) => `geosite:HAPP-${id.toUpperCase()}`))
    ]))
  );
  function option(options, key) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Happ DNS options must be an object");
    }
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor) {
      throw new Error(`Happ DNS option '${key}' must be an own data property`);
    }
    return descriptor.value;
  }
  function enumOption(options, key) {
    const value = option(options, key);
    if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
      throw new Error(`Happ DNS option '${key}' has an unsupported value`);
    }
    return value;
  }
  function selectedResolvers(options) {
    const dnsMode = enumOption(options, "dnsMode");
    const chinaDns = enumOption(options, "chinaDns");
    const globalDns = enumOption(options, "globalDns");
    const ipv6Mode = enumOption(options, "ipv6Mode");
    return { dnsMode, china: CHINA_DNS[chinaDns], global: GLOBAL_DNS[globalDns], ipv6Mode };
  }
  function modeSettings(dnsMode) {
    switch (dnsMode) {
      case "stable":
        return { disableFallbackIfMatch: true, enableParallelQuery: false, defaultResolver: "domestic" };
      case "privacy":
        return { disableFallback: true, enableParallelQuery: false, defaultResolver: "global" };
      case "speed":
        return { disableFallbackIfMatch: false, enableParallelQuery: true, defaultResolver: "domestic" };
      default:
        throw new Error("Happ DNS mode is unsupported");
    }
  }
  function resolverServer({ tag, address, domains, skipFallback }) {
    const server = { tag, address, skipFallback };
    if (domains !== void 0) server.domains = [...domains];
    return server;
  }
  function renderHappDns(options) {
    const { dnsMode, china, global, ipv6Mode } = selectedResolvers(options);
    const mode = modeSettings(dnsMode);
    const defaultResolver = mode.defaultResolver === "domestic" ? china : global;
    const servers = [
      resolverServer({ tag: "happ-dns-domestic", address: china.address, domains: DNS_CLASSES.china, skipFallback: true }),
      resolverServer({ tag: "happ-dns-global", address: global.address, domains: DNS_CLASSES.proxy, skipFallback: true }),
      resolverServer({ tag: "happ-dns-default", address: defaultResolver.address, skipFallback: false })
    ];
    const dns = {
      hosts: { [global.host]: global.ip },
      servers,
      queryStrategy: ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
      tag: HAPP_DNS_TAG,
      enableParallelQuery: mode.enableParallelQuery
    };
    if (mode.disableFallback === true) dns.disableFallback = true;
    if (mode.disableFallbackIfMatch !== void 0) dns.disableFallbackIfMatch = mode.disableFallbackIfMatch;
    return dns;
  }
  function dnsOutboundTag(options) {
    const target = option(options, "dnsTarget");
    if (target === null || typeof target !== "object" || Array.isArray(target)) {
      throw new TypeError("Happ DNS target must be an object");
    }
    if (Object.hasOwn(target, "balancerTag")) {
      throw new Error("Happ DNS target must use an outboundTag, not a balancerTag");
    }
    const descriptor = Object.getOwnPropertyDescriptor(target, "outboundTag");
    if (!descriptor || "get" in descriptor || "set" in descriptor || typeof descriptor.value !== "string" || descriptor.value.length === 0) {
      throw new Error("Happ DNS target outboundTag is required");
    }
    if (descriptor.value.endsWith("/balancer")) {
      throw new Error("Happ DNS target cannot select a fixed-node balancer");
    }
    return descriptor.value;
  }
  function renderHappDnsRoutes(options) {
    const { china, global } = selectedResolvers(options);
    const routes = [];
    if (china.address !== "localhost") {
      routes.push({ inboundTag: [HAPP_DNS_TAG], ip: [china.address], outboundTag: HAPP_DIRECT_TAG });
    }
    routes.push({ inboundTag: [HAPP_DNS_TAG], ip: [global.ip], outboundTag: dnsOutboundTag(options) });
    return routes;
  }

  // src/render-platform.js
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "iphone", "ipad", "android", "windows", "linux"]);
  var HAPP_INBOUND_TAGS = Object.freeze({ socks: "happ-in-socks", http: "happ-in-http" });
  var HAPP_INBOUND_PORTS = Object.freeze({ socks: 10808, http: 10809 });
  function validatePorts() {
    if (new Set(Object.values(HAPP_INBOUND_PORTS)).size !== Object.keys(HAPP_INBOUND_PORTS).length) {
      throw new Error("Happ inbound ports must be unique");
    }
  }
  function validatePlatform(platform) {
    if (typeof platform !== "string" || !PLATFORMS.has(platform)) {
      throw new Error("Happ platform is unsupported");
    }
  }
  function sniffing() {
    return { enabled: true, destOverride: ["http", "tls", "quic"], routeOnly: true };
  }
  function renderHappInbounds(platform) {
    validatePlatform(platform);
    validatePorts();
    return [
      {
        tag: HAPP_INBOUND_TAGS.socks,
        listen: "127.0.0.1",
        port: HAPP_INBOUND_PORTS.socks,
        protocol: "socks",
        settings: { auth: "noauth", udp: true },
        sniffing: sniffing()
      },
      {
        tag: HAPP_INBOUND_TAGS.http,
        listen: "127.0.0.1",
        port: HAPP_INBOUND_PORTS.http,
        protocol: "http",
        settings: { allowTransparent: false },
        sniffing: sniffing()
      }
    ];
  }

  // happ-browser:node:crypto
  function sha256(bytes) {
    const K = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528719, 113926993, 338241895, 666307205, 773529912, 1294757379, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
    const bitLength = bytes.length * 8;
    const padded = new Uint8Array(bytes.length + 9 + 63 >> 6 << 6);
    padded.set(bytes);
    padded[bytes.length] = 128;
    for (let index = 0; index < 8; index += 1) padded[padded.length - 1 - index] = bitLength >>> index * 8 & 255;
    let h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762, h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225;
    const w = new Uint32Array(64);
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) w[index] = padded[offset + index * 4] << 24 | padded[offset + index * 4 + 1] << 16 | padded[offset + index * 4 + 2] << 8 | padded[offset + index * 4 + 3];
      for (let index = 16; index < 64; index += 1) {
        const a2 = w[index - 15], b2 = w[index - 2];
        w[index] = ((a2 >>> 7 | a2 << 25) ^ (a2 >>> 18 | a2 << 14) ^ a2 >>> 3) + w[index - 16] + ((b2 >>> 17 | b2 << 15) ^ (b2 >>> 19 | b2 << 13) ^ b2 >>> 10) + w[index - 7];
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g2 = h6, h = h7;
      for (let index = 0; index < 64; index += 1) {
        const s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
        const ch = e & f ^ ~e & g2;
        const t1 = h + s1 + ch + K[index] + w[index];
        const s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
        const maj = a & b ^ a & c ^ b & c;
        h = g2;
        g2 = f;
        f = e;
        e = d + t1 >>> 0;
        d = c;
        c = b;
        b = a;
        a = t1 + s0 + maj >>> 0;
      }
      h0 = h0 + a >>> 0;
      h1 = h1 + b >>> 0;
      h2 = h2 + c >>> 0;
      h3 = h3 + d >>> 0;
      h4 = h4 + e >>> 0;
      h5 = h5 + f >>> 0;
      h6 = h6 + g2 >>> 0;
      h7 = h7 + h >>> 0;
    }
    const output = new Uint8Array(32);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((word, index) => {
      output[index * 4] = word >>> 24;
      output[index * 4 + 1] = word >>> 16;
      output[index * 4 + 2] = word >>> 8;
      output[index * 4 + 3] = word;
    });
    return output;
  }
  function base64url(bytes) {
    let value = "";
    for (const byte of bytes) value += String.fromCharCode(byte);
    return btoa(value).replace(/\\+/g, "-").replace(/\\/ / g, "_").replace(/=+$/g, "");
  }
  function createHash(algorithm) {
    if (algorithm !== "sha256") throw new Error("Unsupported digest algorithm");
    let value = "";
    return { update(next) {
      value += next;
      return this;
    }, digest(format) {
      if (format !== "base64url") throw new Error("Unsupported digest format");
      return base64url(sha256(new TextEncoder().encode(value)));
    } };
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

  // src/render-routing.js
  var HAPP_BLOCK_TAG = "happ-block";
  var HAPP_OBSERVATORY = Object.freeze({
    probeUrl: "https://www.google.com/generate_204",
    probeInterval: "10m",
    enableConcurrency: true
  });
  var BUSINESS_KEY_BY_SOURCE_POLICY = Object.freeze({
    DIRECT: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0": "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    "\u{1F916} AI \u4E13\u7528": "\u{1F916} AI \u4E13\u7528",
    "\u{1F419} GitHub": "\u{1F419} GitHub",
    "\u{1F4FA} YouTube": "\u{1F4FA} YouTube",
    "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53": "\u{1F3AC} \u6D77\u5916\u6D41\u5A92\u4F53",
    "\u{1F4AC} \u6D77\u5916\u793E\u4EA4": "\u{1F4AC} \u6D77\u5916\u793E\u4EA4",
    "\u{1F34E} Apple": "\u{1F34E} Apple",
    "\u{1FA9F} Microsoft": "\u{1FA9F} Microsoft",
    "\u{1F30D} \u6D77\u5916\u6E38\u620F": "\u{1F30D} \u6D77\u5916\u6E38\u620F",
    "\u2B07\uFE0F \u4E0B\u8F7D/P2P": "\u2B07\uFE0F \u4E0B\u8F7D/P2P"
  });
  var CUSTOM_TARGET_KEYS = Object.freeze({
    block: null,
    direct: "\u{1F1E8}\u{1F1F3} \u56FD\u5185\u5E73\u53F0",
    proxy: "\u6700\u7EC8\u515C\u5E95",
    ai: "\u{1F916} AI \u4E13\u7528"
  });
  var SECURITY_TARGETS = Object.freeze({
    off: Object.freeze({ threat: HAPP_DIRECT_TAG, privacy: HAPP_DIRECT_TAG }),
    security: Object.freeze({ threat: HAPP_BLOCK_TAG, privacy: HAPP_DIRECT_TAG }),
    balanced: Object.freeze({ threat: HAPP_BLOCK_TAG, privacy: HAPP_DIRECT_TAG }),
    strict: Object.freeze({ threat: HAPP_BLOCK_TAG, privacy: HAPP_BLOCK_TAG })
  });
  var LOCAL_RULES = Object.freeze([
    Object.freeze({ domain: Object.freeze(["domain:local", "domain:home.arpa", "domain:lan"]), outboundTag: HAPP_DIRECT_TAG, ruleTag: "local-domains" }),
    Object.freeze({ ip: Object.freeze(["geoip:private"]), outboundTag: HAPP_DIRECT_TAG, ruleTag: "local-private" })
  ]);
  var CUSTOM_FIELDS = Object.freeze({
    DOMAIN: ["domain", "full:"],
    "DOMAIN-SUFFIX": ["domain", "domain:"],
    "DOMAIN-KEYWORD": ["domain", "keyword:"],
    "IP-CIDR": ["ip", ""],
    "IP-CIDR6": ["ip", ""]
  });
  function normalizedId(value, label) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value)) {
      throw new Error(`Happ ${label} must be a normalized identity ID`);
    }
    return value;
  }
  function happFollowTag(nodeId4) {
    return `happ-follow/${normalizedId(nodeId4, "FOLLOW node")}`;
  }
  function fixedTagPrefix(nodeId4) {
    const id = normalizedId(nodeId4, "fixed node");
    const hash = createHash("sha256").update(`happ-fixed\0${id}`, "utf8").digest("base64url");
    return `happ-fixed/${hash}`;
  }
  function fixedTopology(nodeId4, followNodeId) {
    if (nodeId4 === followNodeId) return null;
    const prefix = fixedTagPrefix(nodeId4);
    return Object.freeze({
      candidateTag: `${prefix}/candidate`,
      balancerTag: `${prefix}/balancer`
    });
  }
  function targetReference(target) {
    if (Object.hasOwn(target, "outboundTag")) return { outboundTag: target.outboundTag };
    return { balancerTag: target.balancerTag };
  }
  function requireResolution(resolution) {
    if (!resolution || typeof resolution !== "object" || Array.isArray(resolution) || !resolution.targets || typeof resolution.targets !== "object" || Array.isArray(resolution.targets) || !Array.isArray(resolution.fixedNodes)) {
      throw new TypeError("Happ policy resolution is invalid");
    }
    return resolution;
  }
  function policyTargets(resolution, followNodeId) {
    const followTag = happFollowTag(followNodeId);
    const topologyByNodeId = /* @__PURE__ */ new Map();
    for (const nodeId4 of resolution.fixedNodes) {
      const topology = fixedTopology(normalizedId(nodeId4, "fixed node"), followNodeId);
      if (topology) topologyByNodeId.set(nodeId4, topology);
    }
    const targets = {};
    for (const [businessKey, resolutionTarget] of Object.entries(resolution.targets)) {
      if (!resolutionTarget || typeof resolutionTarget !== "object") {
        throw new Error("Happ policy target is invalid");
      }
      if (resolutionTarget.resolved === "DIRECT") {
        targets[businessKey] = Object.freeze({ outboundTag: HAPP_DIRECT_TAG });
      } else if (resolutionTarget.resolved === "FOLLOW") {
        targets[businessKey] = Object.freeze({ outboundTag: followTag });
      } else if (typeof resolutionTarget.nodeId === "string") {
        const topology = topologyByNodeId.get(resolutionTarget.nodeId);
        if (topology) targets[businessKey] = Object.freeze({ ...topology, dnsOutboundTag: topology.candidateTag });
        else if (resolutionTarget.nodeId === followNodeId) targets[businessKey] = Object.freeze({ outboundTag: followTag });
        else throw new Error("Happ fixed policy target is invalid");
      } else {
        throw new Error("Happ policy target is invalid");
      }
    }
    return { followTag, topologyByNodeId, targets: Object.freeze(targets) };
  }
  function securityTarget(source, options) {
    const mode = SECURITY_TARGETS[options.blockMode];
    if (!mode) throw new Error("Happ block mode is unsupported");
    return source.id === "Privacy" ? mode.privacy : mode.threat;
  }
  function sourceTarget(source, targets, options) {
    if (source.phase === "security") return { outboundTag: securityTarget(source, options) };
    const businessKey = BUSINESS_KEY_BY_SOURCE_POLICY[source.policy];
    if (!businessKey || !targets[businessKey]) throw new Error(`Happ rule source policy is unsupported: ${source.id}`);
    return targetReference(targets[businessKey]);
  }
  function sourceMatch(source) {
    const tag = `HAPP-${source.id.toUpperCase()}`;
    return source.id === "ChinaIP" ? { ip: [`geoip:${tag}`] } : { domain: [`geosite:${tag}`] };
  }
  function renderSourceRule(source, targets, options) {
    return { ...sourceMatch(source), ...sourceTarget(source, targets, options), ruleTag: source.id };
  }
  function renderCustomRules(targets) {
    const rules = [];
    for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
      const businessKey = CUSTOM_TARGET_KEYS[kind];
      const target = businessKey ? targetReference(targets[businessKey]) : { outboundTag: HAPP_BLOCK_TAG };
      for (const [index, entry] of entries.entries()) {
        const [type, value, ...modifiers] = entry.split(",");
        const field = CUSTOM_FIELDS[type];
        if (!field || !value || modifiers.length > 0) throw new Error(`Happ custom rule cannot be rendered: ${entry}`);
        const [key, prefix] = field;
        rules.push({ [key]: [`${prefix}${value}`], ...target, ruleTag: `custom-${kind}-${index}` });
      }
    }
    return rules;
  }
  function quicRules(plan, options) {
    if (options.quicMode === "allow") return [];
    if (options.quicMode === "all-block") {
      return [{ network: "udp", port: "443", outboundTag: HAPP_BLOCK_TAG, ruleTag: "quic-block-all" }];
    }
    if (options.quicMode !== "proxy-block") throw new Error("Happ QUIC mode is unsupported");
    return plan.filter(({ dnsClass }) => dnsClass === "proxy").map((source) => ({
      ...sourceMatch(source),
      network: "udp",
      port: "443",
      outboundTag: HAPP_BLOCK_TAG,
      ruleTag: `quic-block-${source.id.toUpperCase()}`
    }));
  }
  function observatory(topologyByNodeId) {
    const subjectSelector = [...topologyByNodeId.values()].map(({ candidateTag }) => candidateTag).sort();
    return { subjectSelector, ...HAPP_OBSERVATORY };
  }
  function balancers(topologyByNodeId, followTag) {
    return [...topologyByNodeId.values()].sort((left, right) => left.balancerTag.localeCompare(right.balancerTag, "en")).map(({ candidateTag, balancerTag }) => ({
      tag: balancerTag,
      selector: [candidateTag],
      fallbackTag: followTag,
      strategy: { type: "leastPing" }
    }));
  }
  function dnsTarget(resolution, targets) {
    const key = "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D";
    const target = targets[key];
    if (!target) throw new Error("Happ DNS policy target is missing");
    return {
      resolved: resolution.targets[key]?.resolved,
      outboundTag: target.dnsOutboundTag ?? target.outboundTag
    };
  }
  function renderHappRouting({ options, policyResolution, followNodeId }) {
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Happ routing options are invalid");
    const resolution = requireResolution(policyResolution);
    const { followTag, topologyByNodeId, targets } = policyTargets(resolution, normalizedId(followNodeId, "FOLLOW node"));
    const plan = orderedRoutingPlan({ adblockMode: options.adblockMode ?? "off" });
    const rules = [
      ...renderHappDnsRoutes({ ...options, dnsTarget: dnsTarget(resolution, targets) }),
      ...LOCAL_RULES.map((rule) => structuredClone(rule)),
      ...plan.filter(({ phase }) => phase === "security").map((source) => renderSourceRule(source, targets, options)),
      ...quicRules(plan, options),
      ...renderCustomRules(targets),
      ...plan.filter(({ phase }) => phase !== "security").map((source) => renderSourceRule(source, targets, options)),
      { network: "tcp,udp", ...targetReference(targets["\u6700\u7EC8\u515C\u5E95"]), ruleTag: "\u6700\u7EC8\u515C\u5E95" }
    ];
    return {
      routing: { domainStrategy: "IPIfNonMatch", rules, balancers: balancers(topologyByNodeId, followTag) },
      observatory: observatory(topologyByNodeId),
      policyTargets: targets
    };
  }

  // src/render-subscription.js
  function nodeId3(node) {
    const id = node?._profile?.id;
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/u.test(id)) throw new Error("Happ normalized node is missing a valid _profile.id");
    return id;
  }
  function requireNodes(nodes, label) {
    if (!Array.isArray(nodes)) throw new TypeError(`Happ ${label} must be an array`);
    return nodes;
  }
  function describePolicy(resolution, nodes) {
    const names = new Map(nodes.map((node) => [nodeId3(node), node.name]));
    if (resolution.warnings.length > 0) {
      return resolution.warnings.map(({ businessKey, code }) => {
        const target = resolution.targets[businessKey].configured.slice("NODE:".length);
        const reason = code === "duplicate-node-fallback" ? "\u91CD\u590D" : code === "incompatible-node-fallback" ? "\u4E0D\u517C\u5BB9" : "\u672A\u627E\u5230";
        return `\u26A0\uFE0F ${businessKey}\uFF1A${reason}\u56FA\u5B9A\u8282\u70B9\u300C${target}\u300D\uFF0C\u5DF2\u56DE\u9000 FOLLOW`;
      }).join("\uFF1B");
    }
    return Object.entries(resolution.targets).map(([businessKey, target]) => {
      const value = target.resolved.startsWith("NODE:") ? names.get(target.nodeId) : target.resolved;
      return `${businessKey}\u2192${value}`;
    }).join("\uFF1B");
  }
  function fixedOutbounds({ resolution, routing, nodes }) {
    const byId = new Map(nodes.map((node) => [nodeId3(node), node]));
    const candidates = /* @__PURE__ */ new Map();
    for (const [businessKey, target] of Object.entries(routing.policyTargets)) {
      const id = resolution.targets[businessKey]?.nodeId;
      if (id && target.candidateTag) candidates.set(id, target.candidateTag);
    }
    return [...candidates.entries()].map(([id, candidate]) => {
      const node = byId.get(id);
      if (!candidate || !node) throw new Error("Happ fixed node cannot be composed");
      return renderHappOutbound(node, candidate);
    });
  }
  function configForNode({ followNode, nodes, options, resolution }) {
    const routing = renderHappRouting({ options, policyResolution: resolution, followNodeId: nodeId3(followNode) });
    return {
      remarks: followNode.name,
      log: { loglevel: "warning" },
      inbounds: renderHappInbounds(options.platform),
      outbounds: [
        renderHappOutbound(followNode, happFollowTag(nodeId3(followNode))),
        ...fixedOutbounds({ resolution, routing, nodes }),
        { tag: HAPP_DIRECT_TAG, protocol: "freedom" },
        { tag: HAPP_BLOCK_TAG, protocol: "blackhole" }
      ],
      dns: renderHappDns(options),
      routing: routing.routing,
      observatory: routing.observatory,
      meta: { serverDescription: describePolicy(resolution, nodes) }
    };
  }
  function renderHappSubscription({ nodes, allNodes = nodes, options }) {
    const eligibleNodes = requireNodes(nodes, "eligible nodes");
    const sourceNodes = requireNodes(allNodes, "all nodes");
    if (eligibleNodes.length === 0) throw new Error("\u6CA1\u6709\u53EF\u7528\u4E8E Happ \u7684\u8282\u70B9");
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Happ subscription options are invalid");
    const resolution = resolvePolicyOverrides({ encoded: options.policyOverrides ?? "", allNodes: sourceNodes, eligibleNodes });
    return eligibleNodes.map((followNode) => configForNode({ followNode, nodes: eligibleNodes, options, resolution }));
  }

  // src/validate-subscription.js
  var OPAQUE_FIXED_CANDIDATE = /^happ-fixed\/[A-Za-z0-9_-]{43}\/candidate$/u;
  var OPAQUE_FIXED_BALANCER = /^happ-fixed\/[A-Za-z0-9_-]{43}\/balancer$/u;
  function requireArray(value, label) {
    if (!Array.isArray(value)) throw new Error(`Happ subscription ${label} must be an array`);
    return value;
  }
  function uniqueTags(items, label) {
    const tags = /* @__PURE__ */ new Set();
    for (const item of requireArray(items, label)) {
      if (!item || typeof item !== "object" || typeof item.tag !== "string" || item.tag.length === 0) throw new Error(`Happ ${label} tag is invalid`);
      if (tags.has(item.tag)) throw new Error(`Happ duplicate ${label} tag`);
      tags.add(item.tag);
    }
    return tags;
  }
  function validateReferences(config, outboundTags, inboundTags, balancerTags) {
    const knownInboundTags = new Set(inboundTags);
    if (typeof config.dns?.tag === "string") knownInboundTags.add(config.dns.tag);
    for (const rule of requireArray(config.routing?.rules, "routing rules")) {
      if (rule.outboundTag !== void 0 && !outboundTags.has(rule.outboundTag)) throw new Error("Happ dangling route outbound reference");
      if (rule.balancerTag !== void 0 && !balancerTags.has(rule.balancerTag)) throw new Error("Happ dangling route balancer reference");
      if (rule.inboundTag !== void 0) {
        for (const tag of rule.inboundTag) if (!knownInboundTags.has(tag)) throw new Error("Happ dangling route inbound reference");
      }
    }
  }
  function validateFailover(config, outboundTags) {
    const observatory2 = config.observatory;
    if (!observatory2 || !Array.isArray(observatory2.subjectSelector)) throw new Error("Happ observatory is invalid");
    const observable = new Set(observatory2.subjectSelector);
    for (const balancer of requireArray(config.routing?.balancers, "balancers")) {
      if (!Array.isArray(balancer.selector) || balancer.selector.length !== 1) throw new Error("Happ balancer selector cardinality is invalid");
      if (!outboundTags.has(balancer.selector[0])) throw new Error("Happ balancer selector is dangling");
      if (!outboundTags.has(balancer.fallbackTag)) throw new Error("Happ balancer fallback outbound is missing");
      if (!observable.has(balancer.selector[0])) throw new Error("Happ fixed candidate is absent from observatory");
    }
    for (const tag of outboundTags) if (tag.startsWith("happ-fixed/") && tag.endsWith("/candidate") && !observable.has(tag)) {
      throw new Error("Happ fixed candidate is absent from observatory");
    }
  }
  function validateConfig(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Happ subscription config is invalid");
    const outboundTags = uniqueTags(config.outbounds, "outbound");
    const inboundTags = uniqueTags(config.inbounds, "inbound");
    const balancerTags = uniqueTags(config.routing?.balancers, "balancer");
    if (typeof config.remarks === "string") for (const tag of [...outboundTags, ...inboundTags, ...balancerTags]) {
      if (tag.includes(config.remarks)) throw new Error("Happ internal tag is not opaque");
    }
    for (const outbound of config.outbounds) {
      if (outbound.protocol === "snell") throw new Error("Happ Snell outbound is unsupported");
      if (outbound.tag.startsWith("happ-fixed/") && !OPAQUE_FIXED_CANDIDATE.test(outbound.tag)) {
        throw new Error("Happ internal tag is not opaque");
      }
    }
    for (const balancer of config.routing.balancers) {
      if (!OPAQUE_FIXED_BALANCER.test(balancer.tag)) throw new Error("Happ internal tag is not opaque");
    }
    validateReferences(config, outboundTags, inboundTags, balancerTags);
    validateFailover(config, outboundTags);
    const rules = requireArray(config.routing?.rules, "routing rules");
    if (rules.at(-1)?.ruleTag !== "\u6700\u7EC8\u515C\u5E95") throw new Error("Happ final rule must be last");
  }
  function validateHappSubscription(configs) {
    if (!Array.isArray(configs) || configs.length === 0) throw new Error("Happ subscription configs must be a non-empty array");
    for (const config of configs) validateConfig(config);
    return true;
  }

  // src/substore-config-entry.js
  var POLICY_OVERRIDES = "e30";
  var PLATFORMS2 = Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"]);
  var HAPP_PRIVATE_TASKS = Object.freeze([
    ...PLATFORMS2.map((platform) => Object.freeze({
      output: "config",
      type: "collection",
      name: `happ-config-${platform}`,
      subscriptionName: `happ-config-${platform}`,
      platform,
      policyOverrides: POLICY_OVERRIDES
    })),
    Object.freeze({
      output: "audit",
      type: "collection",
      name: "happ-routing-audit",
      subscriptionName: "happ-routing-audit",
      platform: "all",
      policyOverrides: POLICY_OVERRIDES
    })
  ]);
  function loggerMethod(context) {
    const logger = context?.logger;
    if (typeof logger === "function") return logger;
    if (typeof logger?.info === "function") return logger.info.bind(logger);
    if (typeof logger?.log === "function") return logger.log.bind(logger);
    return null;
  }
  function logDiagnostics(context, options, normalized) {
    const log = loggerMethod(context);
    if (!log) return;
    try {
      log(`[happ-config] ${JSON.stringify({ output: options.output, platform: options.platform, selected: normalized.nodes.length })}`);
    } catch {
    }
  }
  async function operator(input, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseHappOptions(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
    const rawNodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
    const normalized = normalizeNodes(rawNodes);
    assertRenderableNodes(normalized.nodes, "Happ", (node) => renderHappOutbound(node, "happ-render-probe"));
    logDiagnostics(context, options, normalized);
    const content = options.output === "audit" ? buildHappAudit({ nodes: normalized.nodes, allNodes: normalized.nodes, options }) : renderHappSubscription({ nodes: normalized.nodes, allNodes: normalized.nodes, options });
    if (options.output === "config") validateHappSubscription(content);
    return { ...input, $content: `${JSON.stringify(content, null, 2)}
` };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) {
  return HappConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger });
}
