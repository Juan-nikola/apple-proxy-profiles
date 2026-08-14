var OneXrayNodesBundle = (() => {
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
    runOneXrayNodesProcessor: () => runOneXrayNodesProcessor
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
      clone.name = `🔗 ${clone.name}`;
      clone["underlying-proxy"] = "🔗 入口节点";
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
      flag: "🇨🇳",
      label: "中国",
      continent: CONTINENT.asiaPacific,
      terms: ["CN", "PEK", "PVG", "CAN", "China", "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "中国", "北京", "上海", "广州", "深圳"]
    },
    { flag: "🇭🇰", label: "香港", continent: CONTINENT.asiaPacific, terms: ["HK", "HKG", "Hong Kong", "香港"] },
    { flag: "🇲🇴", label: "澳门", continent: CONTINENT.asiaPacific, terms: ["MO", "MFM", "Macau", "Macao", "澳门"] },
    { flag: "🇹🇼", label: "台湾", continent: CONTINENT.asiaPacific, terms: ["TW", "TPE", "Taiwan", "Taipei", "台湾", "台北"] },
    { flag: "🇯🇵", label: "日本", continent: CONTINENT.asiaPacific, terms: ["JP", "NRT", "HND", "KIX", "Japan", "Tokyo", "Osaka", "日本", "东京", "大阪"] },
    { flag: "🇰🇷", label: "韩国", continent: CONTINENT.asiaPacific, terms: ["KR", "ICN", "Korea", "Seoul", "韩国", "首尔"] },
    { flag: "🇸🇬", label: "新加坡", continent: CONTINENT.asiaPacific, terms: ["SG", "SIN", "Singapore", "新加坡"] },
    { flag: "🇲🇾", label: "马来西亚", continent: CONTINENT.asiaPacific, terms: ["MY", "KUL", "Malaysia", "Kuala Lumpur", "马来西亚", "吉隆坡"] },
    { flag: "🇹🇭", label: "泰国", continent: CONTINENT.asiaPacific, terms: ["TH", "BKK", "Thailand", "Bangkok", "泰国", "曼谷"] },
    { flag: "🇵🇭", label: "菲律宾", continent: CONTINENT.asiaPacific, terms: ["PH", "MNL", "Philippines", "Manila", "菲律宾", "马尼拉"] },
    { flag: "🇮🇩", label: "印度尼西亚", continent: CONTINENT.asiaPacific, terms: ["ID", "CGK", "Indonesia", "Jakarta", "印度尼西亚", "雅加达"] },
    { flag: "🇦🇺", label: "澳大利亚", continent: CONTINENT.asiaPacific, terms: ["AU", "SYD", "MEL", "Australia", "Sydney", "Melbourne", "澳大利亚", "悉尼", "墨尔本"] },
    { flag: "🇮🇳", label: "印度", continent: CONTINENT.asiaPacific, terms: ["IN", "BOM", "DEL", "India", "Mumbai", "Delhi", "印度", "孟买", "德里"] },
    { flag: "🇩🇪", label: "德国", continent: CONTINENT.europe, terms: ["DE", "FRA", "Germany", "Frankfurt", "德国", "法兰克福"] },
    { flag: "🇬🇧", label: "英国", continent: CONTINENT.europe, terms: ["GB", "UK", "LHR", "Britain", "United Kingdom", "London", "英国", "伦敦"] },
    { flag: "🇫🇷", label: "法国", continent: CONTINENT.europe, terms: ["FR", "CDG", "France", "Paris", "法国", "巴黎"] },
    { flag: "🇳🇱", label: "荷兰", continent: CONTINENT.europe, terms: ["NL", "AMS", "Netherlands", "Amsterdam", "荷兰", "阿姆斯特丹"] },
    { flag: "🇨🇭", label: "瑞士", continent: CONTINENT.europe, terms: ["CH", "ZRH", "Switzerland", "Zurich", "瑞士", "苏黎世"] },
    { flag: "🇮🇹", label: "意大利", continent: CONTINENT.europe, terms: ["IT", "MXP", "Italy", "Milan", "意大利", "米兰"] },
    { flag: "🇪🇸", label: "西班牙", continent: CONTINENT.europe, terms: ["ES", "MAD", "Spain", "Madrid", "西班牙", "马德里"] },
    { flag: "🇸🇪", label: "瑞典", continent: CONTINENT.europe, terms: ["SE", "ARN", "Sweden", "Stockholm", "瑞典", "斯德哥尔摩"] },
    { flag: "🇺🇸", label: "美国", continent: CONTINENT.americas, terms: ["US", "USA", "LAX", "SJC", "SEA", "IAD", "JFK", "America", "United States", "Los Angeles", "美国", "洛杉矶", "圣何塞", "西雅图", "华盛顿", "纽约"] },
    { flag: "🇨🇦", label: "加拿大", continent: CONTINENT.americas, terms: ["CA", "YVR", "YYZ", "Canada", "加拿大", "温哥华", "多伦多"] },
    { flag: "🇧🇷", label: "巴西", continent: CONTINENT.americas, terms: ["BR", "GRU", "Brazil", "巴西", "圣保罗"] }
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
    return { flag: "🌐", continent: CONTINENT.other, warning: null };
  }

  // ../../shared/nodes/source-labels.js
  var PROVENANCE_FIELDS = [
    "_subDisplayName",
    "_subName",
    "_collectionDisplayName",
    "_collectionName"
  ];
  var SOURCE_LABELS = /* @__PURE__ */ new Map([
    ["机场", { kind: SOURCE_KIND.airport, label: "机场" }],
    ["自建", { kind: SOURCE_KIND.selfHosted, label: "自建" }],
    ["realm", { kind: SOURCE_KIND.realm, label: "Realm" }],
    ["链式代理", { kind: SOURCE_KIND.serverChain, label: "链式代理" }],
    ["落地", { kind: SOURCE_KIND.landing, label: "落地" }]
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
      label: "未知",
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
      "\\s*·\\s*(?:" + protocolPattern + ")(?:\\s*｜(?:机场|自建|realm|链式代理|落地))?(?:·(?:链|U))*\\s*$",
      "giu"
    ), " ") : stripped;
    const withoutProtocol = protocolPattern ? withoutNormalizedSuffix.replace(new RegExp("(?:^|\\s)(?:[·｜]\\s*)?(?:" + protocolPattern + ")(?=\\s|｜|·|$)", "giu"), " ") : withoutNormalizedSuffix;
    const cleaned = withoutProtocol.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "未命名节点";
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
      const sourceSuffix = source.kind === SOURCE_KIND.unknown ? "" : "｜" + source.label;
      const capabilitySuffix = [
        existingChain ? "链" : "",
        udp ? "U" : ""
      ].filter(Boolean).join("·");
      cloned.name = region.flag + " " + displayName + " · " + protocolLabel + sourceSuffix + (capabilitySuffix ? "·" + capabilitySuffix : "");
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
  var REQUIRED_KEYS = Object.freeze(["output", "type", "name"]);
  var DEFAULTS = Object.freeze({
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    clientChain: "off",
    clientChainTarget: "",
    policyOverrides: "",
    policyFile: "",
    logLevel: "warning",
    dnsLog: "off"
  });
  var OUTPUTS = /* @__PURE__ */ new Set(["nodes", "profile", "audit"]);
  var CHANNELS = /* @__PURE__ */ new Set(["edge", "current", "previous"]);
  var LOG_LEVELS = /* @__PURE__ */ new Set(["none", "error", "warning", "info", "debug"]);
  var DNS_LOG_MODES = /* @__PURE__ */ new Set(["on", "off"]);
  var PROTOTYPE_KEYS2 = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, "channel", ...Object.keys(DEFAULTS)]);
  var NODE_TARGET = /^NODE:(.*)$/iu;
  var LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
  function optionError(key, message) {
    return new Error(`OneXray option '${key}' ${message}`);
  }
  function ownDataOptions(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("OneXray options must be a plain object");
    }
    if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) {
      throw new TypeError("OneXray options must be a plain object");
    }
    const values = /* @__PURE__ */ new Map();
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string" || PROTOTYPE_KEYS2.has(key)) {
        throw new Error("OneXray options must not contain a prototype option");
      }
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor) {
        throw new Error("OneXray options must not contain an accessor option");
      }
      if (!descriptor.enumerable) throw new Error("OneXray options must not contain a hidden option");
      if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown OneXray option '${key}'`);
      if (descriptor.value === void 0) throw optionError(key, "must not be undefined");
      values.set(key, descriptor.value);
    }
    return values;
  }
  function requiredSingleLine(values, key) {
    if (!values.has(key)) throw optionError(key, "is required");
    const value = values.get(key);
    if (typeof value !== "string" || value.length === 0 || LINE_TERMINATOR.test(value)) {
      throw optionError(key, "must be a non-empty single-line string");
    }
    return value;
  }
  function enumValue(values, key, allowed, defaultValue) {
    const value = values.has(key) ? values.get(key) : defaultValue;
    if (typeof value !== "string" || !(allowed instanceof Set ? allowed.has(value) : allowed.includes(value))) {
      throw optionError(key, "has an unsupported value");
    }
    return value;
  }
  function chainTarget(values) {
    const value = values.has("clientChainTarget") ? values.get("clientChainTarget") : DEFAULTS.clientChainTarget;
    if (typeof value !== "string") throw optionError("clientChainTarget", "must be a string");
    if (value === "") return value;
    const match = NODE_TARGET.exec(value);
    if (!match || match[1].trim().length === 0 || LINE_TERMINATOR.test(match[1])) {
      throw optionError("clientChainTarget", "must be NODE:<name>");
    }
    return `NODE:${match[1]}`;
  }
  function parseOneXrayOptions(raw) {
    const values = ownDataOptions(raw);
    const output = requiredSingleLine(values, "output");
    if (!OUTPUTS.has(output)) throw optionError("output", "has an unsupported value");
    const type = requiredSingleLine(values, "type");
    if (type !== "collection") throw optionError("type", "must be collection");
    const name = validateCollectionName(values.get("name"), "OneXray option 'name'");
    const clientChain = enumValue(values, "clientChain", OPTION_VALUES.clientChain, DEFAULTS.clientChain);
    const clientChainTarget = chainTarget(values);
    if (clientChain === "on" && clientChainTarget === "") {
      throw optionError("clientChainTarget", "is required when clientChain is on");
    }
    if (clientChain === "off" && clientChainTarget !== "") {
      throw optionError("clientChainTarget", "must be blank when clientChain is off");
    }
    const policyOverrides = values.has("policyOverrides") ? values.get("policyOverrides") : DEFAULTS.policyOverrides;
    if (typeof policyOverrides !== "string") throw optionError("policyOverrides", "must be a string");
    const policyFile = values.has("policyFile") ? values.get("policyFile") : DEFAULTS.policyFile;
    if (typeof policyFile !== "string") throw optionError("policyFile", "must be a string");
    if (policyFile !== "" && (LINE_TERMINATOR.test(policyFile) || /[\/\\]/u.test(policyFile) || policyFile.trim() !== policyFile)) {
      throw optionError("policyFile", "must be a plain single-line Sub-Store file name");
    }
    if (policyFile !== "" && policyOverrides !== "") {
      throw optionError("policyFile", "cannot be combined with policyOverrides");
    }
    const logLevel = enumValue(values, "logLevel", LOG_LEVELS, DEFAULTS.logLevel);
    const dnsLog = enumValue(values, "dnsLog", DNS_LOG_MODES, DEFAULTS.dnsLog);
    return Object.freeze({
      output,
      type,
      name,
      channel: enumValue(values, "channel", CHANNELS, DEFAULTS.channel),
      dnsMode: enumValue(values, "dnsMode", OPTION_VALUES.dnsMode, DEFAULTS.dnsMode),
      chinaDns: enumValue(values, "chinaDns", OPTION_VALUES.chinaDns, DEFAULTS.chinaDns),
      globalDns: enumValue(values, "globalDns", OPTION_VALUES.globalDns, DEFAULTS.globalDns),
      blockMode: enumValue(values, "blockMode", OPTION_VALUES.blockMode, DEFAULTS.blockMode),
      quicMode: enumValue(values, "quicMode", OPTION_VALUES.quicMode, DEFAULTS.quicMode),
      ipv6Mode: enumValue(values, "ipv6Mode", OPTION_VALUES.ipv6Mode, DEFAULTS.ipv6Mode),
      clientChain,
      clientChainTarget,
      policyOverrides,
      policyFile,
      logLevel,
      dnsLog
    });
  }

  // ../../shared/nodes/capabilities.js
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
  function validOptionalAuthentication(node) {
    return validOptionalString(node, "username") && validOptionalOpaqueString(node, "password");
  }
  function hasAnyChain(node) {
    return CHAIN_ALIASES2.some((key) => hasOption(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "") || node?._profile?.chained === true;
  }
  var ONEXRAY_TLS_FIELDS = /* @__PURE__ */ new Set([
    "tls",
    "security",
    "sni",
    "servername",
    "alpn",
    "client-fingerprint",
    "reality-opts",
    "skip-cert-verify",
    "allow-insecure"
  ]);
  var ONEXRAY_TRANSPORT_FIELDS = /* @__PURE__ */ new Set([
    "network",
    "packet-encoding",
    "ws-opts",
    "grpc-opts",
    "httpupgrade-opts",
    "xhttp-opts",
    "kcp-opts"
  ]);
  var ONEXRAY_COMMON_FIELDS = /* @__PURE__ */ new Set(["name", "type", "server", "port", "udp", "_profile"]);
  var ONEXRAY_PACKET_ENCODINGS = /* @__PURE__ */ new Set(["none", "xudp", "packet"]);
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
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort2(node.port) || !isOptionalBoolean(node, "udp")) return "invalid-onexray-node-shape";
    return oneXrayAliasReason(node);
  }
  function oneXrayTlsReason(node, protocol2, { implicitTls = false, allowReality = protocol2 === "vless" } = {}) {
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) {
      return "unsupported-onexray-option";
    }
    if (!isOptionalBoolean(node, "tls") || !optionalStringAliasesAreValid(node, ["sni", "servername"])) {
      return "invalid-onexray-node-shape";
    }
    if (!isOptionalBoolean(node, "skip-cert-verify") || !isOptionalBoolean(node, "allow-insecure")) {
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
    const realityRequested = node.security === "reality" || hasOption(node, "reality-opts");
    if (realityRequested && !allowReality) return "unsupported-onexray-tls-shape";
    if (node.security === "reality" && !hasOption(node, "reality-opts")) return "incomplete-onexray-reality";
    if (hasOption(node, "reality-opts") && hasOption(node, "security") && node.security !== "reality") {
      return "incomplete-onexray-reality";
    }
    if (node.tls === false && ["tls", "reality"].includes(node.security) || node.tls === true && node.security === "none") return "unsupported-onexray-tls-shape";
    const reality = node["reality-opts"];
    if (reality !== void 0) {
      const realityPublicKey = firstAliasValue(reality, ["public-key", "_public-key"]);
      const shortId = reality["short-id"] ?? reality["_short-id"];
      const spiderX = reality["spider-x"] ?? reality["_spider-x"];
      if (!allowReality || node.tls === false || !isPlainObject(reality) || !isRealityPublicKey(realityPublicKey)) {
        return "incomplete-onexray-reality";
      }
      if (Object.keys(reality).some((key) => !["public-key", "short-id", "spider-x", "_public-key", "_short-id", "_spider-x"].includes(key)) || (hasOption(reality, "short-id") || hasOption(reality, "_short-id")) && (!isNonblankString(shortId) || !/^[0-9a-f]*$/i.test(shortId)) || (hasOption(reality, "spider-x") || hasOption(reality, "_spider-x")) && !isNonblankString(spiderX)) {
        return "incomplete-onexray-reality";
      }
    }
    const tlsRequested = tlsRequestedForCapability(node);
    if (!implicitTls && !tlsRequested && (hasTlsSettings(node) || hasOption(node, "alpn") || hasOption(node, "client-fingerprint"))) return "unsupported-onexray-tls-shape";
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
    const packetEncoding = node["packet-encoding"];
    const hasPacketEncoding = hasOption(node, "packet-encoding");
    if (hasPacketEncoding && (!isNonblankString(packetEncoding) || !ONEXRAY_PACKET_ENCODINGS.has(packetEncoding))) {
      return "unsupported-onexray-transport";
    }
    if (network === "tcp" || network === "raw") {
      return transportOptions.some((key) => hasOption(node, key)) ? "unsupported-onexray-transport" : null;
    }
    if (hasPacketEncoding && network !== "xhttp") {
      return "unsupported-onexray-transport";
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
      const allowed = network === "httpupgrade" ? ["path", "host"] : ["path", "host", "mode", "packet-encoding"];
      return Object.keys(options).some((key) => !allowed.includes(key)) || hasOption(options, "path") && !isNonblankString(options.path) || hasOption(options, "host") && !isNonblankString(options.host) || hasOption(options, "mode") && !(/* @__PURE__ */ new Set(["auto", "packet-up", "stream-up", "stream-one"])).has(options.mode) || hasOption(options, "packet-encoding") && (!isNonblankString(options["packet-encoding"]) || !ONEXRAY_PACKET_ENCODINGS.has(options["packet-encoding"])) ? "unsupported-onexray-transport" : null;
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
      if (!isNonblankString(node.cipher) || !isNonblankOpaqueString2(node.password)) return "invalid-onexray-node-shape";
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
      if (!isNonblankOpaqueString2(node.password)) return "invalid-onexray-node-shape";
      return oneXrayTlsReason(node, protocol2, { implicitTls: true, allowReality: false });
    }
    if (protocol2 === "socks5" || protocol2 === "http") {
      if (!validOptionalAuthentication(node) || hasOption(node, "username") !== hasOption(node, "password")) {
        return "invalid-onexray-node-shape";
      }
      return protocol2 === "http" && hasOption(node, "headers") && !validOneXrayHeaders(node.headers) ? "invalid-onexray-node-shape" : null;
    }
    if (protocol2 === "hysteria2") {
      if (!isNonblankOpaqueString2(node.password)) return "invalid-onexray-node-shape";
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

  // src/render-outbound.js
  var RESERVED_TAGS = /* @__PURE__ */ new Set([
    "proxy",
    "chainProxy",
    "direct",
    "fragment",
    "block",
    "dnsOut",
    "tunIn",
    "pingIn"
  ]);
  function optional(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target[key] = value;
  }
  function supportedNode(node) {
    const reason = oneXrayNodeExclusionReason(node);
    if (reason) throw new Error(reason);
  }
  function requiredTag(node, { tag, tags, allowDisplayTag = false } = {}) {
    if (typeof tag !== "string" || tag.length === 0 || tag.trim() !== tag || /[\r\n\u2028\u2029]/u.test(tag)) {
      throw new Error("invalid-onexray-tag");
    }
    if (RESERVED_TAGS.has(tag)) throw new Error("reserved-onexray-tag");
    if (tag.includes(node.name) && !(allowDisplayTag === true && tag === node.name)) {
      throw new Error("duplicate-onexray-tag");
    }
    if (tags !== void 0) {
      if (!(tags instanceof Set)) throw new TypeError("OneXray tags must be a Set");
      if (tags.has(tag)) throw new Error("duplicate-onexray-tag");
      tags.add(tag);
    }
    return tag;
  }
  function tlsSettings(node) {
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) {
      throw new Error("unsupported-onexray-certificate-bypass");
    }
    const settings = {};
    optional(settings, "serverName", node.sni ?? node.servername);
    if (node.alpn !== void 0) settings.alpn = [...node.alpn];
    optional(settings, "fingerprint", node["client-fingerprint"]);
    return settings;
  }
  function realitySettings(node) {
    const reality = node["reality-opts"];
    if (!reality || typeof reality !== "object" || Array.isArray(reality)) {
      throw new Error("incomplete-onexray-reality");
    }
    const settings = {
      fingerprint: node["client-fingerprint"],
      publicKey: reality["public-key"] ?? reality["_public-key"]
    };
    optional(settings, "serverName", node.sni ?? node.servername);
    optional(settings, "shortId", reality["short-id"] ?? reality["_short-id"]);
    optional(settings, "spiderX", reality["spider-x"] ?? reality["_spider-x"]);
    return settings;
  }
  function transportSettings(node) {
    const network = String(node.network ?? "tcp").trim().toLowerCase();
    if (network === "tcp" || network === "raw") return { network: "raw", rawSettings: {} };
    if (network === "ws") {
      const options = node["ws-opts"] ?? {};
      const wsSettings = {};
      optional(wsSettings, "path", options.path);
      optional(wsSettings, "host", options.headers?.Host ?? options.headers?.host);
      return { network: "ws", wsSettings };
    }
    if (network === "grpc") {
      const grpcSettings = {};
      optional(grpcSettings, "serviceName", node["grpc-opts"]?.["grpc-service-name"]);
      return { network: "grpc", grpcSettings };
    }
    if (network === "httpupgrade") {
      const options = node["httpupgrade-opts"] ?? {};
      const httpupgradeSettings = {};
      optional(httpupgradeSettings, "host", options.host);
      optional(httpupgradeSettings, "path", options.path);
      return { network: "httpupgrade", httpupgradeSettings };
    }
    if (network === "xhttp") {
      const options = node["xhttp-opts"] ?? {};
      const xhttpSettings = {};
      optional(xhttpSettings, "host", options.host);
      optional(xhttpSettings, "path", options.path);
      optional(xhttpSettings, "mode", options.mode);
      optional(
        xhttpSettings,
        "packetEncoding",
        node["packet-encoding"] ?? options["packet-encoding"]
      );
      return { network: "xhttp", xhttpSettings };
    }
    if (network === "kcp") return { network: "kcp", kcpSettings: {} };
    throw new Error("unsupported-onexray-transport");
  }
  function streamSettings(node) {
    if (normalizeProtocol(node.type) === "hysteria2") {
      return {
        network: "hysteria",
        hysteriaSettings: { version: 2, auth: node.password },
        security: "tls",
        tlsSettings: tlsSettings(node)
      };
    }
    const stream = transportSettings(node);
    if (node.security === "reality" || node["reality-opts"] !== void 0) {
      stream.security = "reality";
      stream.realitySettings = realitySettings(node);
    } else if (node.tls === true || node.security === "tls") {
      stream.security = "tls";
      stream.tlsSettings = tlsSettings(node);
    } else {
      stream.security = "none";
    }
    return stream;
  }
  function endpoint(node) {
    return { address: node.server, port: node.port };
  }
  function renderVlessSettings(node) {
    const settings = { ...endpoint(node), id: node.uuid, encryption: node.encryption ?? "none" };
    optional(settings, "flow", node.flow);
    if (node.reverse !== void 0) settings.reverse = { tag: node.reverse.tag };
    return settings;
  }
  function renderVmessSettings(node) {
    return { ...endpoint(node), id: node.uuid, security: node.security ?? node.cipher ?? "auto" };
  }
  function renderShadowsocksSettings(node) {
    return { ...endpoint(node), method: node.cipher, password: node.password };
  }
  function renderTrojanSettings(node) {
    return { ...endpoint(node), password: node.password };
  }
  function renderSocksSettings(node) {
    const settings = endpoint(node);
    optional(settings, "user", node.username);
    optional(settings, "pass", node.password);
    return settings;
  }
  function renderHttpSettings(node) {
    const settings = renderSocksSettings(node);
    if (node.headers !== void 0) settings.headers = { ...node.headers };
    return settings;
  }
  function renderHysteriaSettings(node) {
    return { version: 2, ...endpoint(node) };
  }
  function protocolSettings(node) {
    switch (normalizeProtocol(node.type)) {
      case "vless":
        return ["vless", renderVlessSettings(node)];
      case "vmess":
        return ["vmess", renderVmessSettings(node)];
      case "ss":
        return ["shadowsocks", renderShadowsocksSettings(node)];
      case "trojan":
        return ["trojan", renderTrojanSettings(node)];
      case "socks5":
        return ["socks", renderSocksSettings(node)];
      case "http":
        return ["http", renderHttpSettings(node)];
      case "hysteria2":
        return ["hysteria", renderHysteriaSettings(node)];
      default:
        throw new Error("unsupported-onexray-protocol");
    }
  }
  function renderOneXrayOutbound(node, options) {
    supportedNode(node);
    const tag = requiredTag(node, options);
    const [protocol2, settings] = protocolSettings(node);
    return {
      name: node.name,
      protocol: protocol2,
      settings,
      tag,
      streamSettings: streamSettings(node),
      mux: { enabled: false }
    };
  }

  // ../../shared/encoding/base64url.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var REVERSE = new Map([...ALPHABET].map((character, index) => [character, index]));
  function assertBase64Url(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) {
      throw new TypeError("Base64URL value is invalid");
    }
  }
  function decodeBase64Url(value) {
    assertBase64Url(value);
    if (value.length === 0) return new Uint8Array();
    const remainder = value.length % 4;
    const last = REVERSE.get(value.at(-1));
    if (remainder === 2 && (last & 15) !== 0 || remainder === 3 && (last & 3) !== 0) {
      throw new TypeError("Base64URL value is not canonical");
    }
    const bytes = new Uint8Array(Math.floor(value.length * 6 / 8));
    let accumulator = 0;
    let bits = 0;
    let offset = 0;
    for (const character of value) {
      accumulator = accumulator << 6 | REVERSE.get(character);
      bits += 6;
      if (bits < 8) continue;
      bits -= 8;
      bytes[offset] = accumulator >> bits & 255;
      offset += 1;
      accumulator &= (1 << bits) - 1;
    }
    if (bits !== 0 && accumulator !== 0) throw new TypeError("Base64URL value is not canonical");
    return bytes;
  }
  function decodeBase64UrlUtf8(value) {
    const bytes = decodeBase64Url(value);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new TypeError("Base64URL value is not valid UTF-8");
    }
  }

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET2 = /^NODE:(.*)$/iu;
  var BASE64URL = /^[A-Za-z0-9_-]+$/u;
  var LINE_TERMINATOR2 = /[\r\n\u2028\u2029]/u;
  function frozenTarget(id, label, alias, defaultTarget) {
    return Object.freeze({
      id,
      label,
      aliases: Object.freeze([alias, id]),
      defaultTarget
    });
  }
  var BUSINESS_TARGETS = Object.freeze([
    frozenTarget("ai", "🤖 AI 专用", "AI 专用", "FOLLOW"),
    frozenTarget("github", "🐙 GitHub", "GitHub", "FOLLOW"),
    frozenTarget("youtube", "📺 YouTube", "YouTube", "FOLLOW"),
    frozenTarget("globalMedia", "🎬 海外流媒体", "海外流媒体", "FOLLOW"),
    frozenTarget("globalSocial", "💬 海外社交", "海外社交", "FOLLOW"),
    frozenTarget("apple", "🍎 Apple", "Apple", "DIRECT"),
    frozenTarget("microsoft", "🪟 Microsoft", "Microsoft", "DIRECT"),
    frozenTarget("domestic", "🇨🇳 国内平台", "国内平台", "DIRECT"),
    frozenTarget("overseasGame", "🌍 海外游戏", "海外游戏", "FOLLOW"),
    frozenTarget("download", "⬇️ 下载/P2P", "下载/P2P", "DIRECT"),
    frozenTarget("dnsAndRules", "🧭 DNS 与规则下载", "DNS 与规则下载", "FOLLOW"),
    frozenTarget("final", "最终兜底", "最终兜底", "FOLLOW")
  ]);
  var TARGET_BY_KEY = /* @__PURE__ */ new Map();
  for (const target of BUSINESS_TARGETS) {
    TARGET_BY_KEY.set(target.label, target);
    for (const alias of target.aliases) TARGET_BY_KEY.set(alias, target);
  }
  function businessTargetByKey(key) {
    return typeof key === "string" ? TARGET_BY_KEY.get(key) : void 0;
  }
  function policyError(message) {
    return new Error(`Invalid business policy overrides: ${message}`);
  }
  function targetError(target, message) {
    return policyError(`${target.label}: ${message}`);
  }
  function assertUniqueJsonObjectKeys(text) {
    let index = 0;
    const syntaxError = () => {
      throw new SyntaxError("invalid JSON");
    };
    const skipWhitespace = () => {
      while (/[\u0020\t\r\n]/u.test(text[index])) index += 1;
    };
    const parseString = () => {
      if (text[index] !== '"') syntaxError();
      const start = index;
      index += 1;
      while (index < text.length) {
        const character = text[index++];
        if (character === '"') return JSON.parse(text.slice(start, index));
        if (character === "\\") {
          const escape = text[index++];
          if (escape === "u") {
            for (let count = 0; count < 4; count += 1) {
              if (!/[0-9a-f]/iu.test(text[index++])) syntaxError();
            }
          } else if (!'"\\/bfnrt'.includes(escape)) {
            syntaxError();
          }
        } else if (character.charCodeAt(0) < 32) {
          syntaxError();
        }
      }
      syntaxError();
    };
    const parseValue = () => {
      skipWhitespace();
      if (text[index] === "{") {
        index += 1;
        skipWhitespace();
        const keys = /* @__PURE__ */ new Set();
        if (text[index] === "}") {
          index += 1;
          return;
        }
        while (true) {
          skipWhitespace();
          const key = parseString();
          if (keys.has(key)) throw new SyntaxError("duplicate JSON key");
          keys.add(key);
          skipWhitespace();
          if (text[index++] !== ":") syntaxError();
          parseValue();
          skipWhitespace();
          if (text[index] === "}") {
            index += 1;
            return;
          }
          if (text[index++] !== ",") syntaxError();
        }
      }
      if (text[index] === "[") {
        index += 1;
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return;
        }
        while (true) {
          parseValue();
          skipWhitespace();
          if (text[index] === "]") {
            index += 1;
            return;
          }
          if (text[index++] !== ",") syntaxError();
        }
      }
      if (text[index] === '"') {
        parseString();
        return;
      }
      for (const literal of ["true", "false", "null"]) {
        if (text.startsWith(literal, index)) {
          index += literal.length;
          return;
        }
      }
      const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
      if (!number) syntaxError();
      index += number[0].length;
    };
    parseValue();
    skipWhitespace();
    if (index !== text.length) syntaxError();
  }
  function decodeBase64url(encoded) {
    if (typeof encoded !== "string") throw policyError("must be a Base64URL string");
    if (encoded === "") return Object.freeze({});
    if (!BASE64URL.test(encoded) || encoded.length % 4 === 1) {
      throw policyError("must be a Base64URL string");
    }
    let text;
    try {
      text = decodeBase64UrlUtf8(encoded);
    } catch {
      throw policyError("must contain UTF-8 JSON");
    }
    let parsed;
    try {
      assertUniqueJsonObjectKeys(text);
      parsed = JSON.parse(text);
    } catch {
      throw policyError("must contain JSON object");
    }
    if (parsed === null || Array.isArray(parsed) || Object.getPrototypeOf(parsed) !== Object.prototype) {
      throw policyError("must contain a JSON object");
    }
    return parsed;
  }
  function canonicalTarget(target, value) {
    if (typeof value !== "string") throw targetError(target, "target must be a string");
    if (TARGET_KEYWORD.test(value)) return value.toUpperCase();
    const node = NODE_TARGET2.exec(value);
    if (!node || node[1].trim().length === 0 || LINE_TERMINATOR2.test(node[1])) {
      throw targetError(target, "target must be FOLLOW, DIRECT, or NODE:<name>");
    }
    return `NODE:${node[1]}`;
  }
  function parseBusinessOverrides(encoded) {
    const values = decodeBase64url(encoded);
    const overrides = {};
    for (const [key, value] of Object.entries(values)) {
      const target = businessTargetByKey(key);
      if (!target) throw policyError("contains an unknown business key");
      const canonical = canonicalTarget(target, value);
      if (Object.hasOwn(overrides, target.id) && overrides[target.id] !== canonical) {
        throw targetError(target, "has conflicting aliases");
      }
      overrides[target.id] = canonical;
    }
    return Object.freeze(overrides);
  }

  // src/resolve-policy.js
  var RESERVED_TAGS2 = /* @__PURE__ */ new Set([
    "proxy",
    "chainProxy",
    "direct",
    "fragment",
    "block",
    "dnsOut",
    "tunIn",
    "pingIn"
  ]);
  var GENERATED_TAG_PREFIXES = ["ap-fixed-"];
  var NODE_TARGET3 = /^NODE:(.*)$/u;
  var LINE_TERMINATOR3 = /[\r\n\u2028\u2029]/u;
  function freezeTarget(target) {
    return Object.freeze(target);
  }
  function freezeFixedNode(fixed) {
    return Object.freeze(fixed);
  }
  function policyError2(message) {
    return new Error(`Invalid OneXray business policy: ${message}`);
  }
  function fixedTargetError(target, name, reason) {
    return policyError2(`${target.label}: ${name}: ${reason}`);
  }
  function chainError(name, reason) {
    return policyError2(`全局客户端链: ${name}: ${reason}`);
  }
  function nodeTargetName(value) {
    if (typeof value !== "string") return null;
    const match = NODE_TARGET3.exec(value);
    if (!match || match[1].trim().length === 0 || LINE_TERMINATOR3.test(match[1])) return null;
    return match[1];
  }
  function malformedTargetError(encoded) {
    if (typeof encoded !== "string" || !/^[A-Za-z0-9_-]+$/u.test(encoded)) return null;
    try {
      const parsed = JSON.parse(decodeBase64UrlUtf8(encoded));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      for (const [key, value] of Object.entries(parsed)) {
        const target = businessTargetByKey(key);
        if (!target || typeof value !== "string" || !/^NODE:/iu.test(value)) continue;
        const name = value.slice("NODE:".length).split(/[\r\n\u2028\u2029]/u, 1)[0];
        if (name.trim().length > 0) return fixedTargetError(target, name, "malformed fixed target");
      }
    } catch {
    }
    return null;
  }
  function parseOverrides(options) {
    try {
      return parseBusinessOverrides(options.policyOverrides);
    } catch (error) {
      const descriptive = malformedTargetError(options.policyOverrides);
      if (descriptive) throw descriptive;
      throw error;
    }
  }
  function inputNodes(value, label) {
    if (!Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an array`);
    return [...value];
  }
  function inspectNodes(allNodes, eligibleNodes) {
    const allIdentities = /* @__PURE__ */ new Set();
    for (const node of allNodes) {
      nodeMetadata(node);
      allIdentities.add(identityKey(node));
    }
    for (const node of eligibleNodes) {
      nodeMetadata(node);
      if (!allIdentities.has(identityKey(node))) {
        throw policyError2("compatible nodes must come from normalized nodes");
      }
    }
  }
  function candidatesByExactName(nodes, name) {
    return nodes.filter((node) => node.name === name);
  }
  function reservedNodeTag(name) {
    return RESERVED_TAGS2.has(name) || GENERATED_TAG_PREFIXES.some((prefix) => name.startsWith(prefix));
  }
  function fixedTag(node, target, name, assigned) {
    if (typeof name !== "string" || name.length === 0 || name.trim() !== name || LINE_TERMINATOR3.test(name)) {
      throw fixedTargetError(target, String(name), "invalid display tag");
    }
    if (reservedNodeTag(name)) throw fixedTargetError(target, name, "uses a reserved outbound tag");
    const prior = assigned.get(name);
    if (prior && identityKey(prior) !== identityKey(node)) {
      throw fixedTargetError(target, name, "has a colliding stable outbound tag");
    }
    assigned.set(name, node);
    return name;
  }
  function resolveFixedTarget(target, configured, allNodes, eligibleNodes, assigned) {
    const name = nodeTargetName(configured);
    if (name === null) throw fixedTargetError(target, "", "malformed fixed target");
    if (reservedNodeTag(name)) throw fixedTargetError(target, name, "uses a reserved outbound tag");
    const allMatches = candidatesByExactName(allNodes, name);
    if (allMatches.length === 0) throw fixedTargetError(target, name, "normalized target is missing");
    if (allMatches.length !== 1) throw fixedTargetError(target, name, "normalized target is duplicated");
    const compatible = candidatesByExactName(eligibleNodes, name);
    if (compatible.length === 0) throw fixedTargetError(target, name, "normalized target is incompatible");
    if (compatible.length !== 1) throw fixedTargetError(target, name, "normalized target is duplicated");
    const node = compatible[0];
    const tag = fixedTag(node, target, name, assigned);
    return { node, tag };
  }
  function targetResolution(target, configured, allNodes, eligibleNodes, assigned, fixedByTag) {
    if (configured === "FOLLOW") return freezeTarget({ configured, resolvedTag: "proxy", status: "follow" });
    if (configured === "DIRECT") return freezeTarget({ configured, resolvedTag: "direct", status: "direct" });
    const fixed = resolveFixedTarget(target, configured, allNodes, eligibleNodes, assigned);
    if (!fixedByTag.has(fixed.tag)) fixedByTag.set(fixed.tag, freezeFixedNode(fixed));
    return freezeTarget({ configured, resolvedTag: fixed.tag, status: "fixed" });
  }
  function landingResolution(options, allNodes, eligibleNodes, homepageNodes) {
    if (options.clientChain === "off") {
      return { finalOutbound: null, chain: { enabled: false, landingTag: null, entryCount: homepageNodes.length } };
    }
    if (options.clientChain !== "on") throw policyError2("clientChain must be on or off");
    if (homepageNodes.length === 0) throw chainError("", "no compatible entry nodes");
    const name = nodeTargetName(options.clientChainTarget);
    if (name === null) throw chainError("", "malformed landing target");
    const allMatches = candidatesByExactName(allNodes, name);
    if (allMatches.length === 0) throw chainError(name, "normalized landing target is missing");
    const compatible = candidatesByExactName(eligibleNodes, name);
    if (compatible.length === 0) throw chainError(name, "normalized landing target is incompatible");
    if (compatible.length !== 1) throw chainError(name, "normalized landing target is duplicated");
    const node = compatible[0];
    const metadata = nodeMetadata(node);
    if (metadata.landing !== true && metadata.sourceKind !== "landing") {
      throw chainError(name, "normalized target is not a landing node");
    }
    if (metadata.chained === true || hasExistingChain(node)) {
      throw chainError(name, "landing target already has a chain");
    }
    if (homepageNodes.includes(node)) throw chainError(name, "landing target cannot be a homepage entry");
    return {
      finalOutbound: freezeFixedNode({ node, tag: "chainProxy" }),
      chain: { enabled: true, landingTag: "chainProxy", entryCount: homepageNodes.length }
    };
  }
  function resolveOneXrayPolicy({ options, allNodes, eligibleNodes } = {}) {
    if (!options || typeof options !== "object") throw new TypeError("OneXray options must be an object");
    const normalizedNodes = inputNodes(allNodes, "normalized nodes");
    const compatibleNodes = inputNodes(eligibleNodes, "compatible nodes");
    inspectNodes(normalizedNodes, compatibleNodes);
    const overrides = parseOverrides(options);
    const homepageNodes = options.clientChain === "on" ? compatibleNodes.filter((node) => nodeMetadata(node).entry === true) : compatibleNodes;
    const landing = landingResolution(options, normalizedNodes, compatibleNodes, homepageNodes);
    const assigned = /* @__PURE__ */ new Map();
    const fixedByTag = /* @__PURE__ */ new Map();
    const targets = {};
    for (const target of BUSINESS_TARGETS) {
      const configured = overrides[target.id] ?? target.defaultTarget;
      targets[target.id] = targetResolution(target, configured, normalizedNodes, compatibleNodes, assigned, fixedByTag);
    }
    return Object.freeze({
      homepageNodes: Object.freeze([...homepageNodes]),
      fixedNodes: Object.freeze([...fixedByTag.values()]),
      finalOutbound: landing.finalOutbound,
      targets: Object.freeze(targets),
      chain: Object.freeze(landing.chain)
    });
  }

  // src/render-subscription.js
  function homepageNodesFrom(resolution) {
    if (!resolution || typeof resolution !== "object" || !Array.isArray(resolution.homepageNodes)) {
      throw new Error("Invalid OneXray homepage resolution");
    }
    if (resolution.homepageNodes.length === 0) {
      throw new Error("No compatible OneXray homepage nodes");
    }
    return resolution.homepageNodes;
  }
  function renderOneXraySubscription(resolution) {
    const tags = /* @__PURE__ */ new Set();
    const names = /* @__PURE__ */ new Set();
    const outbounds = homepageNodesFrom(resolution).map((node) => {
      if (typeof node?.name !== "string" || node.name.length === 0) {
        throw new Error("Invalid OneXray homepage node name");
      }
      if (names.has(node.name)) throw new Error("Duplicate OneXray homepage node name");
      names.add(node.name);
      return renderOneXrayOutbound(node, {
        tag: node.name,
        tags,
        allowDisplayTag: true
      });
    });
    return `${JSON.stringify({ outbounds })}
`;
  }

  // src/substore-nodes-entry.js
  function nodeOptions(raw) {
    const options = parseOneXrayOptions(raw);
    if (options.output !== "nodes") throw new Error("OneXray node output must be nodes");
    return options;
  }
  function processorError(code) {
    return new Error(`OneXray nodes: ${code}`);
  }
  function processorInput(input) {
    try {
      if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error();
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) throw new Error();
      const values = {};
      for (const key of ["proxies", "arguments", "onDiagnostics"]) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === void 0) continue;
        if ("get" in descriptor || "set" in descriptor) throw new Error();
        values[key] = descriptor.value;
      }
      return values;
    } catch {
      throw processorError("invalid-request");
    }
  }
  function sortedCounts(counts) {
    return Object.fromEntries(
      Object.keys(counts ?? {}).sort((left, right) => left.localeCompare(right, "en")).map((key) => [key, counts[key]])
    );
  }
  function diagnosticSummary(diagnostics, renderFailures = {}) {
    return {
      normalization: {
        total: diagnostics.total,
        accepted: diagnostics.accepted,
        protocols: sortedCounts(diagnostics.protocol),
        excluded: sortedCounts(diagnostics.excluded)
      },
      renderFailures: sortedCounts(renderFailures)
    };
  }
  function emitDiagnostics(onDiagnostics, diagnostics, renderFailures) {
    if (onDiagnostics === void 0) return;
    if (typeof onDiagnostics !== "function") throw processorError("invalid-diagnostics-handler");
    try {
      onDiagnostics(diagnosticSummary(diagnostics, renderFailures));
    } catch {
    }
  }
  function runOneXrayNodesProcessor(input = {}) {
    const { proxies, arguments: rawArguments, onDiagnostics } = processorInput(input);
    let options;
    try {
      options = nodeOptions(rawArguments);
    } catch {
      throw processorError("invalid-arguments");
    }
    let normalized;
    try {
      normalized = normalizeNodes(proxies, { clientChain: "off" });
    } catch {
      throw processorError("invalid-inventory");
    }
    const partitioned = partitionRenderableNodes(normalized.nodes, "OneXray", (node) => renderOneXrayOutbound(node, {
      tag: node.name,
      allowDisplayTag: true
    }));
    emitDiagnostics(onDiagnostics, normalized.diagnostics, partitioned.failureProtocols);
    let resolution;
    try {
      resolution = resolveOneXrayPolicy({
        options,
        allNodes: normalized.nodes,
        eligibleNodes: partitioned.renderable
      });
    } catch (error) {
      void error;
      throw processorError("invalid-policy");
    }
    try {
      return renderOneXraySubscription(resolution);
    } catch (error) {
      void error;
      throw processorError("invalid-subscription");
    }
  }
  return __toCommonJS(substore_nodes_entry_exports);
})();
function snapshotArguments(raw) {
  try {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    const prototype = Object.getPrototypeOf(raw);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const snapshot = {};
    for (const key of Reflect.ownKeys(raw)) {
      if (typeof key !== "string") throw new Error();
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) throw new Error();
      Object.defineProperty(snapshot, key, {
        value: descriptor.value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return snapshot;
  } catch {
    throw new Error("OneXray nodes: invalid-arguments");
  }
}

async function operator(input, targetPlatform) {
  void targetPlatform;
  const arguments_ = snapshotArguments($arguments);
  if (typeof produceArtifact !== "function") {
    throw new Error("OneXray nodes: produce-artifact-unavailable");
  }
  const proxies = await produceArtifact({
    type: arguments_.type,
    name: arguments_.name,
    platform: "JSON",
    produceType: "internal",
  });

  let diagnostics;
  const content = OneXrayNodesBundle.runOneXrayNodesProcessor({
    proxies,
    arguments: arguments_,
    onDiagnostics(value) { diagnostics = value; },
  });
  if (diagnostics !== undefined) {
    const logger = typeof console !== "undefined"
      ? typeof console.info === "function" ? console.info.bind(console)
        : typeof console.log === "function" ? console.log.bind(console)
          : null
      : null;
    if (logger) {
      try {
        logger("[onexray-nodes] " + JSON.stringify(diagnostics));
      } catch {
        // Diagnostics are optional and never change private output.
      }
    }
  }

  return { ...input, $content: content };
}
