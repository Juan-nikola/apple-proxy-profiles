var V2rayNConfigBundle = (() => {
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

  // ../../shared/contracts.js
  var CLIENT = Object.freeze({
    anywhere: "anywhere",
    egern: "egern",
    incy: "incy",
    shadowrocket: "shadowrocket",
    surge: "surge",
    singbox: "singbox",
    happ: "happ",
    v2rayn: "v2rayn",
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
    CLIENT.v2rayn,
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
    protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["cipher", "password"]
    }),
    protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge, CLIENT.clash], {
      requiredFields: ["cipher", "password", "protocol", "obfs"]
    }),
    protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["psk", "version"]
    }),
    protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["uuid"]
    }),
    protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["uuid"]
    }),
    protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["anytls"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
      requiredFields: ["password"],
      tls: true
    }),
    protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
      requiredFields: ["uuid", "password"],
      tls: true
    }),
    protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy]),
    protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.v2rayn, CLIENT.v2box, CLIENT.clash, CLIENT.incy]),
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
    const source2 = SOURCE_LABELS.get(String(token).trim().toLowerCase());
    return source2 ? { ...source2, warning: null } : null;
  }
  function sourceFromMarkers(value) {
    if (typeof value !== "string" || value.length === 0) return null;
    for (const match of value.matchAll(/\[([^\]]+)\]/gu)) {
      const source2 = sourceFromToken(match[1]);
      if (source2) return source2;
    }
    return null;
  }
  function classifySource(node) {
    for (const field of PROVENANCE_FIELDS) {
      const value = node?.[field];
      if (typeof value !== "string" || !value.trim()) continue;
      const source3 = sourceFromMarkers(value);
      if (source3) return { ...source3, warning: null };
    }
    const source2 = sourceFromMarkers(node?.name);
    if (source2) return { ...source2, warning: null };
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
      const source2 = classifySource(original);
      const region = classifyRegion(original.name);
      const group = candidatesByIdentity.get(identity) ?? [];
      group.push({
        original,
        cloned,
        source: source2,
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
      const { original, cloned, source: source2, region, validation, existingChain } = group[0];
      if (group.length > 1) increment(diagnostics.excluded, "exact-duplicate", group.length - 1);
      increment(diagnostics.protocol, diagnosticProtocol(cloned.type));
      increment(diagnostics.source, source2.kind);
      increment(diagnostics.region, region.continent);
      for (const warning of [...validation.warnings, source2.warning, region.warning]) {
        if (warning) increment(diagnostics.warnings, warning);
      }
      const udp = hasExplicitUdp(original);
      const id = `sr-${fingerprint(cloned)}`;
      const protocolLabel = protocolDisplayLabel(cloned.type);
      const displayName = cleanDisplayName(original.name, cloned.type);
      const sourceSuffix = source2.kind === SOURCE_KIND.unknown ? "" : "\uFF5C" + source2.label;
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
        sourceKind: source2.kind,
        continent: region.continent,
        flag: region.flag,
        udp,
        p2p: isP2pSource(source2.kind),
        entry: isEntrySource(source2.kind) && !existingChain,
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

  // ../../shared/nodes/capabilities.js
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
  var XRAY_VMESS_SECURITY = EGERN_VMESS_SECURITY;
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
  var CHAIN_ALIASES2 = Object.freeze(["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"]);
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
    return isPlainObject(value) && Object.keys(value).every((key) => key === "password" || key === "sni") && isNonblankOpaqueString2(value.password) && (!hasOption(value, "sni") || isNonblankString(value.sni));
  }
  function validOptionalString(node, key) {
    return !hasOption(node, key) || isNonblankString(node[key]);
  }
  function validOptionalOpaqueString(node, key) {
    return !hasOption(node, key) || isNonblankOpaqueString2(node[key]);
  }
  function resolvedUdp(node) {
    return firstAliasValue(node, UDP_ALIASES);
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
  function egernTlsReason(node, {
    allowReality = true,
    allowAlpn = false,
    allowClientFingerprint = false,
    implicitTls = false
  } = {}) {
    if (!isOptionalBoolean(node, "tls") || !isOptionalBoolean(node, "skip-cert-verify") || !isOptionalBoolean(node, "allow-insecure") || hasConflictingAliases(node, ["skip-cert-verify", "allow-insecure"]) || !optionalStringAliasesAreValid(node, ["sni", "servername"]) || hasConflictingAliases(node, ["fingerprint-sha256", "fingerprint_sha256"])) {
      return "unsupported-egern-tls-shape";
    }
    for (const key of ["fingerprint-sha256", "fingerprint_sha256"]) {
      if (hasOption(node, key) && !isCertificateFingerprint(node[key])) {
        return "unsupported-egern-tls-shape";
      }
    }
    if (hasOption(node, "client-fingerprint") && !allowClientFingerprint || hasOption(node, "alpn") && !allowAlpn) {
      return "unsupported-egern-tls-shape";
    }
    if (hasOption(node, "security")) {
      const security2 = node.security;
      const vmessSecurity = normalizeProtocol(node.type) === "vmess" && EGERN_VMESS_SECURITY.has(security2);
      if (!vmessSecurity && !["none", "tls", "reality"].includes(security2)) {
        return "unsupported-egern-tls-shape";
      }
      if (security2 === "reality" && !hasOption(node, "reality-opts")) {
        return "incomplete-egern-reality";
      }
      if (node.tls === false && (security2 === "tls" || security2 === "reality")) {
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
    const dns2 = node.dns_servers ?? node.dns;
    if (dns2 !== void 0 && (!Array.isArray(dns2) || dns2.length === 0 || dns2.some((value) => ipFamily(value) === 0)) || !isOptionalPositiveInteger(node, "mtu") || !isOptionalPositiveInteger(node, "keepalive", { allowZero: true })) {
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
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort2(node.port)) return "invalid-egern-node-shape";
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
    if (!validOptionalOpaqueString(node, "password") || sshKeyMaterial !== void 0 && !isNonblankOpaqueString2(sshKeyMaterial) || !isNonblankOpaqueString2(node.password) && !isNonblankOpaqueString2(sshKeyMaterial)) {
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
    const present = CHAIN_ALIASES2.filter((key) => hasOption(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
    if (present.length === 0) return node?._profile?.chained === true;
    return !(present.length === 1 && present[0] === GENERATED_CHAIN_FIELD && node[GENERATED_CHAIN_FIELD] === GENERATED_CHAIN_POLICY && node?._profile?.chained === true);
  }
  function egernNodeExclusionReason(node) {
    const protocol2 = normalizeProtocol(node?.type);
    const commonReason = egernCommonReason(node, protocol2);
    if (commonReason) return commonReason;
    if (hasArbitraryChain(node)) return "unsupported-existing-chain";
    if (protocol2 === "ss" || protocol2 === "shadowsocks") {
      if (!isNonblankString(node.cipher) || !isNonblankOpaqueString2(node.password)) return "invalid-egern-node-shape";
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
      if (!isNonblankOpaqueString2(node.psk)) return "invalid-egern-node-shape";
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
        const security2 = EGERN_VMESS_SECURITY.has(node.security) ? node.security : node.cipher ?? "auto";
        if (!EGERN_VMESS_SECURITY.has(security2)) return "unsupported-egern-security";
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
      if (!isNonblankOpaqueString2(node.password)) return "invalid-egern-node-shape";
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
      if (!isNonblankOpaqueString2(node.password)) return "invalid-egern-node-shape";
      if (node.tls === false || node.security === "none") return "unsupported-egern-tls-shape";
      if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
      return egernTlsReason(node, { implicitTls: true, allowAlpn: true, allowClientFingerprint: true }) || (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo") ? "unsupported-egern-anytls-shape" : null);
    }
    if (protocol2 === "hysteria2" || protocol2 === "hy2") {
      if (!isNonblankOpaqueString2(node.password)) return "invalid-egern-node-shape";
      const tlsReason = egernTlsReason(node, { allowReality: false, implicitTls: true });
      if (tlsReason) return tlsReason;
      if (unsupportedPlainTransport(node, /* @__PURE__ */ new Set(["udp", "quic"]))) return "unsupported-egern-transport";
      if (hasOption(node, "obfs") && node.obfs !== "salamander") return "unsupported-egern-obfs";
      const obfsPassword = firstAliasValue(node, ["obfs-password", "obfs_password"]);
      if (obfsPassword !== void 0 && (!isNonblankOpaqueString2(obfsPassword) || node.obfs !== "salamander")) {
        return isNonblankOpaqueString2(obfsPassword) ? "unsupported-egern-obfs" : "invalid-egern-node-shape";
      }
      const hopping = firstAliasValue(node, ["port-hopping", "port_hopping", "ports"]);
      if (hopping !== void 0 && !isPortHopping(hopping) || hasConflictingAliases(node, ["port-hopping", "port_hopping", "ports"]) || hasConflictingAliases(node, ["port-hopping-interval", "port_hopping_interval", "hop-interval"]) || !isOptionalPositiveInteger(node, "port-hopping-interval") || !isOptionalPositiveInteger(node, "port_hopping_interval") || !isOptionalPositiveInteger(node, "hop-interval") || !isOptionalPositiveInteger(node, "bandwidth") || !isOptionalPositiveInteger(node, "up") || hasConflictingAliases(node, ["bandwidth", "up"]) || hasOption(node, "down") || resolvedUdp(node) === false) {
        return "unsupported-egern-hysteria2-shape";
      }
      return null;
    }
    if (protocol2 === "tuic") {
      if (!isNonblankString(node.uuid) || !isNonblankOpaqueString2(node.password)) return "invalid-egern-node-shape";
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
    return CHAIN_ALIASES2.some((key) => hasOption(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "") || node?._profile?.chained === true;
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
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort2(node.port)) return "invalid-anywhere-node-shape";
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
    const transportFields2 = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "xhttp-opts"];
    if (protocol2 === "ss" || protocol2 === "shadowsocks") {
      if (!isNonblankOpaqueString2(node.password) || !isNonblankString(node.cipher)) return "invalid-anywhere-node-shape";
      if (!ANYWHERE_SHADOWSOCKS_METHODS.has(node.cipher.toLowerCase())) return "unsupported-anywhere-shadowsocks-method";
      if (network !== "tcp" || hasShadowsocksPlugin(node) || node.tls === true || hasOption(node, "security") && node.security !== "none" || transportFields2.some((key) => hasOption(node, key))) {
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
        if (hasOption(node, "ws-opts") && !validAnywhereWsOptions(node["ws-opts"]) || transportFields2.some((key) => key !== "ws-opts" && hasOption(node, key))) {
          return "unsupported-anywhere-vless-transport";
        }
      } else if (transportFields2.some((key) => hasOption(node, key))) {
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
      if (!isNonblankOpaqueString2(node.password)) return "invalid-anywhere-node-shape";
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      const ssOptions = node["ss-opts"];
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields2.some((key) => hasOption(node, key)) || hasOption(node, "ss-opts") && (!isPlainObject(ssOptions) || ssOptions.enabled === true)) {
        return "unsupported-anywhere-trojan-shape";
      }
      return null;
    }
    if (protocol2 === "anytls") {
      if (!isNonblankOpaqueString2(node.password)) return "invalid-anywhere-node-shape";
      const tlsReason = anywhereTlsShapeReason(node);
      if (tlsReason) return tlsReason;
      if (network !== "tcp" || node.tls === false || hasOption(node, "security") && node.security !== "tls" || hasOption(node, "reality-opts") || transportFields2.some((key) => hasOption(node, key)) || !isOptionalBoolean(node, "udp") || ["idle-session-check-interval", "idle-session-timeout"].some((key) => hasOption(node, key) && (!Number.isInteger(node[key]) || node[key] < 30)) || hasOption(node, "min-idle-session") && (!Number.isInteger(node["min-idle-session"]) || node["min-idle-session"] < 0)) {
        return "unsupported-anywhere-anytls-shape";
      }
      return null;
    }
    if (protocol2 === "hysteria2" || protocol2 === "hy2") {
      if (!isNonblankOpaqueString2(node.password)) return "invalid-anywhere-node-shape";
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
      if (obfs !== void 0 && (!ANYWHERE_HYSTERIA_OBFS.has(String(obfs).toLowerCase()) || !isNonblankOpaqueString2(obfsPassword)) || obfs === void 0 && obfsPassword !== void 0 || String(obfs).toLowerCase() !== "gecko" && (obfsMin !== void 0 || obfsMax !== void 0)) {
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
  function evaluateNodeForClient(node, client) {
    if (!Object.values(CLIENT).includes(client)) return { supported: false, reason: "unsupported-client" };
    if (client === CLIENT.v2box || client === CLIENT.v2rayn || client === CLIENT.happ) {
      const reason = evaluateXrayNodeExclusionReason(node ?? {}, client);
      return reason ? { supported: false, reason } : { supported: true, reason: null };
    }
    const protocol2 = normalizeProtocol(node?.type);
    if (!protocolSupportsClient(protocol2, client)) {
      return { supported: false, reason: "unsupported-protocol" };
    }
    let transportReason = null;
    if (client === CLIENT.anywhere) transportReason = anywhereNodeExclusionReason(node ?? {});
    else if (client === CLIENT.egern) transportReason = egernNodeExclusionReason(node ?? {});
    else if (client === CLIENT.singbox) transportReason = singBoxNodeExclusionReason(node ?? {});
    return transportReason ? { supported: false, reason: transportReason } : { supported: true, reason: null };
  }
  var XRAY_TRANSPORTS = /* @__PURE__ */ new Set([
    "tcp",
    "raw",
    "ws",
    "grpc",
    "h2",
    "http2",
    "http",
    "httpupgrade",
    "xhttp",
    "kcp",
    "mkcp",
    "hysteria"
  ]);
  var XRAY_CHAIN_REASON = Object.freeze({
    v2rayn: "unsupported-v2rayn-chain",
    v2box: "unsupported-v2box-chain",
    happ: "unsupported-happ-chain"
  });
  var XRAY_PROTOCOL_REASON = Object.freeze({
    v2rayn: "unsupported-v2rayn-protocol",
    v2box: "unsupported-v2box-protocol",
    happ: "unsupported-happ-protocol"
  });
  var XRAY_TRANSPORT_REASON = Object.freeze({
    v2rayn: "unsupported-v2rayn-transport",
    v2box: "unsupported-v2box-transport",
    happ: "unsupported-happ-transport"
  });
  function xrayCommonReason(node, client) {
    if (!isPlainObject(node) || !isNonblankString(node.name) || !isNonblankString(node.server) || !isValidPort2(node.port)) {
      return `invalid-${client}-node-shape`;
    }
    if (hasAnyChain(node)) return XRAY_CHAIN_REASON[client];
    const protocol2 = normalizeProtocol(node.type);
    if (!protocolSupportsClient(protocol2, client)) return XRAY_PROTOCOL_REASON[client];
    return null;
  }
  function xrayTlsReason(node, client) {
    const reality = node["reality-opts"];
    if (Object.hasOwn(node, "reality")) return `unsupported-${client}-tls`;
    const vmessCipherSecurity = normalizeProtocol(node.type) === "vmess" && typeof node.security === "string" && XRAY_VMESS_SECURITY.has(node.security.toLowerCase());
    const security2 = node.security === void 0 || vmessCipherSecurity ? reality !== void 0 ? "reality" : node.tls === true ? "tls" : "none" : String(node.security).toLowerCase();
    if (!["none", "tls", "reality"].includes(security2)) return `unsupported-${client}-tls`;
    if (!vmessCipherSecurity && (node.security === "none" && node.tls === true || node.tls === false && security2 !== "none")) {
      return `unsupported-${client}-tls`;
    }
    if (normalizeProtocol(node.type) === "vmess" && hasOption(node, "cipher") && vmessCipherSecurity && String(node.cipher).toLowerCase() !== String(node.security).toLowerCase()) {
      return `unsupported-${client}-tls`;
    }
    if (security2 !== "reality" && reality !== void 0) return `unsupported-${client}-tls`;
    if (security2 === "reality") {
      if (!isPlainObject(reality) || !isNonblankOpaqueString2(reality["public-key"])) {
        return `incomplete-${client}-reality`;
      }
      if (Object.keys(reality).some((key) => !["public-key", "short-id", "spider-x", "_spider-x"].includes(key))) {
        return `unsupported-${client}-tls`;
      }
    }
    if (hasOption(node, "skip-cert-verify") && typeof node["skip-cert-verify"] !== "boolean" || hasOption(node, "allow-insecure") && typeof node["allow-insecure"] !== "boolean") {
      return `unsupported-${client}-tls`;
    }
    return null;
  }
  function xrayTransportReason(node, client, protocol2) {
    if (protocol2 === "hysteria2" || protocol2 === "hy2") {
      const network2 = normalizeTransport(node);
      return network2 !== "tcp" && network2 !== "udp" && network2 !== "quic" ? XRAY_TRANSPORT_REASON[client] : null;
    }
    const network = normalizeTransport(node);
    const allowed = XRAY_TRANSPORTS;
    if (!allowed.has(network)) return XRAY_TRANSPORT_REASON[client];
    if (protocol2 === "socks5" && network !== "tcp" && network !== "raw") return XRAY_TRANSPORT_REASON[client];
    if ((protocol2 === "ss" || protocol2 === "shadowsocks") && (hasShadowsocksPlugin(node) || network !== "tcp" && network !== "raw")) {
      return XRAY_TRANSPORT_REASON[client];
    }
    const optionKeys = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "httpupgrade-opts", "xhttp-opts", "kcp-opts", "hysteria-opts"];
    const present = optionKeys.filter((key) => hasOption(node, key));
    const expected = network === "ws" ? "ws-opts" : network === "grpc" ? "grpc-opts" : network === "h2" || network === "http2" || network === "http" ? "h2-opts" : network === "httpupgrade" ? "httpupgrade-opts" : network === "xhttp" ? "xhttp-opts" : network === "kcp" || network === "mkcp" ? "kcp-opts" : null;
    if (present.some((key) => key !== expected && !(expected === "h2-opts" && key === "http-opts"))) return XRAY_TRANSPORT_REASON[client];
    for (const key of present) if (!isPlainObject(node[key])) return XRAY_TRANSPORT_REASON[client];
    return null;
  }
  function evaluateXrayNodeExclusionReason(node, client) {
    const common = xrayCommonReason(node, client);
    if (common) return common;
    const protocol2 = normalizeProtocol(node.type);
    const tls = xrayTlsReason(node, client);
    if (tls) return tls;
    const transport2 = xrayTransportReason(node, client, protocol2);
    if (transport2) return transport2;
    if ((client === "v2box" || client === "v2rayn" || client === "happ") && protocol2 === "socks5" && (node.tls === true || node.security === "tls" || node.security === "reality")) {
      return `unsupported-${client}-tls`;
    }
    return null;
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
    const { text, bytes: bytes2 } = asText(value, label2);
    if (bytes2 > maxBytes) throw failure(label2, "JSON exceeds byte limit");
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
    const bytes2 = new Uint8Array(Math.floor(value.length * 6 / 8));
    let accumulator = 0;
    let bits = 0;
    let offset = 0;
    for (const character of value) {
      accumulator = accumulator << 6 | REVERSE.get(character);
      bits += 6;
      if (bits < 8) continue;
      bits -= 8;
      bytes2[offset] = accumulator >> bits & 255;
      offset += 1;
      accumulator &= (1 << bits) - 1;
    }
    if (bits !== 0 && accumulator !== 0) throw new TypeError("Base64URL value is not canonical");
    return bytes2;
  }

  // ../../shared/policies/business-targets.js
  var TARGET_KEYWORD = /^(FOLLOW|DIRECT)$/iu;
  var NODE_TARGET = /^(NODE:|NODE~)(.*)$/iu;
  var BASE64URL = /^[A-Za-z0-9_-]+$/u;
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
  function businessTargetByKey(key) {
    return typeof key === "string" ? TARGET_BY_KEY.get(key) : void 0;
  }
  function policyError(message) {
    return new Error(`Invalid business policy overrides: ${message}`);
  }
  function targetError(target, message) {
    return policyError(`${target.label}: ${message}`);
  }
  function decodePolicy(encoded) {
    if (typeof encoded !== "string" || encoded !== "" && !BASE64URL.test(encoded) || encoded.length % 4 === 1) {
      throw policyError("must be a Base64URL string");
    }
    if (encoded === "") return Object.freeze({});
    let bytes2;
    try {
      bytes2 = decodeBase64Url(encoded);
    } catch {
      throw policyError("must be a Base64URL string");
    }
    let values;
    try {
      values = parseStrictJson(bytes2, { label: "business overrides", maxBytes: 64 * 1024, maxDepth: 8 });
    } catch {
      throw policyError("must contain JSON object");
    }
    if (values === null || Array.isArray(values) || typeof values !== "object" || Object.getPrototypeOf(values) !== Object.prototype) {
      throw policyError("must contain a JSON object");
    }
    return values;
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
  function parseBusinessOverrides(encoded) {
    const values = decodePolicy(encoded);
    const overrides = {};
    for (const [key, value] of Object.entries(values)) {
      const target = businessTargetByKey(key);
      if (!target) throw policyError("contains an unknown business key");
      let canonical;
      try {
        canonical = canonicalBusinessTarget(value);
      } catch {
        throw targetError(target, "target must be FOLLOW, DIRECT, or NODE:<name>");
      }
      if (Object.hasOwn(overrides, target.id) && overrides[target.id] !== canonical) {
        throw targetError(target, "has conflicting aliases");
      }
      overrides[target.id] = canonical;
    }
    return Object.freeze(overrides);
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
      id: CLIENT.v2rayn,
      displayName: "v2rayN",
      state: "active",
      platforms: ["windows", "macos"],
      configFormat: "xray-or-singbox-json",
      ruleFormat: "xray-geodata-or-srs",
      nodeValidator: "v2rayn",
      separatesProfile: false,
      supportsPolicyOverrides: false,
      adapterSchema: "v2rayn-v2",
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
    [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"]),
    [CLIENT.v2rayn]: Object.freeze(["windows", "macos"]),
    [CLIENT.v2box]: Object.freeze(["iphone", "ipad"])
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

  // ../../shared/rules/region-values.js
  var VALID_REGIONS = OPTION_VALUES.region;
  function parseRegion(value) {
    if (value === void 0 || value === null || value === "") return "cn";
    if (!VALID_REGIONS.includes(value)) throw new RangeError(`Unsupported region: ${value}`);
    return value;
  }

  // src/options.js
  var DEFAULTS = Object.freeze({ channel: "current", region: "cn", core: "xray", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", clientChain: "off", clientChainTarget: "", policyOverrides: "" });
  var ALLOWED = /* @__PURE__ */ new Set(["output", "type", "name", "subscriptionName", "platform", ...Object.keys(DEFAULTS)]);
  var required = (raw, key) => {
    const value = raw[key];
    if (typeof value !== "string" || !value || value.trim() !== value || /[\r\n]/u.test(value)) throw new Error(`v2rayN option '${key}' is invalid`);
    return value;
  };
  function parseV2rayNOptions(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("v2rayN options must be an object");
    for (const key of Object.keys(raw)) if (!key.startsWith("_") && !ALLOWED.has(key)) throw new Error(`Unknown v2rayN option: ${key}`);
    for (const key of ["output", "type", "name"]) if (!Object.hasOwn(raw, key)) throw new Error(`v2rayN option '${key}' is required`);
    const output = required(raw, "output");
    if (!["nodes", "config"].includes(output)) throw new Error("v2rayN option 'output' is unsupported");
    if (required(raw, "type") !== "collection") throw new Error("v2rayN option 'type' must be collection");
    const platform = raw.platform === void 0 ? void 0 : required(raw, "platform");
    if (output === "config" && platform === void 0) throw new Error("v2rayN option 'platform' is required");
    if (platform !== void 0 && !["windows", "macos"].includes(platform)) throw new Error("v2rayN option 'platform' is unsupported");
    const options = { output, type: "collection", name: validateCollectionName(raw.name, "v2rayN option 'name'"), subscriptionName: raw.subscriptionName === void 0 ? "" : required(raw, "subscriptionName"), platform, channel: raw.channel ?? DEFAULTS.channel, region: parseRegion(raw.region ?? DEFAULTS.region), core: raw.core ?? DEFAULTS.core, dnsMode: raw.dnsMode ?? DEFAULTS.dnsMode, chinaDns: raw.chinaDns ?? DEFAULTS.chinaDns, globalDns: raw.globalDns ?? DEFAULTS.globalDns, blockMode: raw.blockMode ?? DEFAULTS.blockMode, quicMode: raw.quicMode ?? DEFAULTS.quicMode, ipv6Mode: raw.ipv6Mode ?? DEFAULTS.ipv6Mode, clientChain: raw.clientChain ?? DEFAULTS.clientChain, clientChainTarget: raw.clientChainTarget ?? DEFAULTS.clientChainTarget, policyOverrides: raw.policyOverrides ?? DEFAULTS.policyOverrides };
    if (!FRONTIER_CHANNELS.includes(options.channel)) throw new Error("v2rayN option 'channel' is unsupported");
    if (!["singbox", "xray"].includes(options.core)) throw new Error("v2rayN option 'core' is unsupported");
    for (const key of ["dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode", "clientChain"]) if (!OPTION_VALUES[key]?.includes(options[key])) throw new Error(`v2rayN option '${key}' is unsupported`);
    if (options.clientChain === "off" && options.clientChainTarget !== "") throw new Error("v2rayN clientChainTarget requires clientChain=on");
    if (options.clientChain === "on" && !/^NODE:.+$/u.test(options.clientChainTarget)) throw new Error("v2rayN clientChainTarget is required when clientChain=on");
    if (typeof options.policyOverrides !== "string" || /[\r\n]/u.test(options.policyOverrides)) throw new Error("v2rayN policyOverrides is invalid");
    parseBusinessOverrides(options.policyOverrides);
    return Object.freeze(options);
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
      const source2 = node["ws-opts"] ?? {};
      return { network: "ws", wsSettings: { path: Array.isArray(source2.path) ? source2.path[0] : source2.path ?? "/", ...source2.headers ? { headers: { ...source2.headers } } : {} } };
    }
    if (network === "grpc") {
      const source2 = node["grpc-opts"] ?? {};
      return { network: "grpc", grpcSettings: { serviceName: source2["grpc-service-name"] ?? source2.service_name ?? "" } };
    }
    if (["h2", "http2", "http"].includes(network)) {
      const source2 = node["h2-opts"] ?? node["http-opts"] ?? {};
      return { network: "http", httpSettings: { path: Array.isArray(source2.path) ? source2.path[0] : source2.path ?? "/", ...source2.host ? { host: Array.isArray(source2.host) ? source2.host : [source2.host] } : {} } };
    }
    if (network === "httpupgrade") {
      const source2 = node["httpupgrade-opts"] ?? {};
      return { network, httpupgradeSettings: { path: source2.path ?? "/", ...source2.host ? { host: source2.host } : {} } };
    }
    if (network === "xhttp") {
      const source2 = node["xhttp-opts"] ?? {};
      return { network, xhttpSettings: { path: source2.path ?? "/", ...source2.mode ? { mode: source2.mode } : {} } };
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
  function renderXrayNodeError(error, client = "v2box") {
    const reason = error?.message?.match(/^unsupported-[a-z0-9-]+/u)?.[0] ?? `render-failure-${client}`;
    return Object.freeze({ client, excluded: Object.freeze({ [reason]: 1 }) });
  }

  // ../../shared/xray-geodata-contract.js
  var CHANNELS = Object.freeze(["current", "previous", "edge"]);
  var CHANNEL_SUFFIX = Object.freeze({
    current: "Current",
    previous: "Previous",
    edge: "Edge"
  });
  var SOURCE_ID = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/u;
  var CODE = /^APP-[A-Z0-9]+(?:-[A-Z0-9]+)*$/u;
  function requiredChannel(channel) {
    if (typeof channel !== "string" || !CHANNELS.includes(channel)) {
      throw new TypeError(`Xray GeoData channel must be current, previous, or edge: ${String(channel)}`);
    }
    return channel;
  }
  function xrayGeoNames(channel) {
    const suffix = CHANNEL_SUFFIX[requiredChannel(channel)];
    const names = {
      domain: `AppleProxySite${suffix}`,
      ip: `AppleProxyIP${suffix}`
    };
    Object.defineProperties(names, {
      site: { value: names.domain, enumerable: false },
      geosite: { value: names.domain, enumerable: false },
      geoip: { value: names.ip, enumerable: false }
    });
    return Object.freeze(names);
  }
  function xrayGeoCode(sourceId) {
    if (typeof sourceId !== "string" || sourceId.trim() !== sourceId || !SOURCE_ID.test(sourceId)) {
      throw new TypeError("Xray GeoData source ID is invalid");
    }
    const normalized = sourceId.toUpperCase().replaceAll("_", "-");
    const code = `APP-${normalized}`;
    if (!CODE.test(code)) throw new TypeError("Xray GeoData source ID is invalid");
    return code;
  }
  function xrayGeoReference(channel, type, sourceId) {
    const names = xrayGeoNames(channel);
    if (type !== "domain" && type !== "ip") throw new TypeError("Xray GeoData type is invalid");
    return `ext:${names[type]}.dat:${xrayGeoCode(sourceId)}`;
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
  function usesMobileRuleBundles(platform) {
    return MOBILE_RULE_PLATFORMS.includes(platform);
  }
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
  function mobileRuleClientCatalog() {
    return MOBILE_RULE_CLIENT_CATALOG;
  }
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
  var UPSTREAM_RULE_SOURCE_DEFINITIONS = Object.freeze([
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

  // ../../shared/rules/catalog.js
  var RULE_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/dab47069a30c4ae70f7f5f4c919d639d9aaf79dc/rule/Shadowrocket";
  function rule2(id, policy, minEntries, inputFormat = "RULE-SET", directory = id) {
    const sourcePath = `${directory}/${id}.list`;
    return Object.freeze({
      id,
      sourcePath,
      upstreamUrl: `${RULE_ROOT}/${sourcePath}`,
      policy,
      minEntries,
      inputFormat
    });
  }
  var UPSTREAM_RULE_SOURCE_CATALOG = Object.freeze(UPSTREAM_RULE_SOURCE_DEFINITIONS.map((source2) => rule2(source2.id, source2.policy, source2.minEntries, source2.inputFormat, source2.sourcePath.slice(0, source2.sourcePath.lastIndexOf("/")))));
  var UPSTREAM_BY_ID = new Map(UPSTREAM_RULE_SOURCE_CATALOG.map((source2) => [source2.id, source2]));
  var COMPILED_SOURCE_INPUTS = Object.freeze({
    DomesticCore: Object.freeze({ sourcePath: "DomesticCore/DomesticCore.list", minEntries: 1 }),
    DomesticGame: Object.freeze({ sourcePath: "DomesticGame/DomesticGame.list", minEntries: 1 }),
    OverseasGame: Object.freeze({ sourceId: "Game" }),
    ChinaTLD: Object.freeze({ sourcePath: "ChinaTLD/ChinaTLD.list", minEntries: 1 }),
    ChinaIP: Object.freeze({ sourceId: "ChinaMax" })
  });
  function compiledRule(source2) {
    const mapping = COMPILED_SOURCE_INPUTS[source2.id];
    const upstream = mapping?.sourceId ? UPSTREAM_BY_ID.get(mapping.sourceId) : UPSTREAM_BY_ID.get(source2.id);
    if (upstream) {
      return Object.freeze({
        ...upstream,
        ...source2
      });
    }
    if (!mapping) throw new Error(`Missing compiled rule source mapping: ${source2.id}`);
    return Object.freeze({
      ...mapping,
      ...source2
    });
  }
  var RULE_SOURCE_CATALOG = Object.freeze(DEFAULT_RULE_CLIENT_CATALOG.map(compiledRule));

  // ../../shared/rules/external-sources.js
  var SHA1_COMMIT = /^[0-9a-f]{40}$/u;
  var REGIONS2 = /* @__PURE__ */ new Set(["cn", "global", "ru", "ir"]);
  var SAFE_PATH = /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;
  var SHA256 = /^[0-9a-f]{64}$/u;
  function source(record2) {
    return Object.freeze({ ...record2 });
  }
  var EXTERNAL_RULE_SOURCE_CATALOG = Object.freeze([
    source({
      id: "v2fly-domain-list",
      repository: "https://github.com/v2fly/domain-list-community",
      branch: "master",
      commit: "c975ccef9c19f005a3bfa7a33255d1b406deea64",
      license: "MIT",
      format: "domain-list-yaml",
      region: "global",
      adapter: "v2fly-domain-list",
      minEntries: 1,
      sourcePath: "dlc.dat_plain.yml",
      releaseTag: "20260819144818",
      retrievalUrl: "https://github.com/v2fly/domain-list-community/releases/download/20260819144818/dlc.dat_plain.yml",
      retrievedAt: "2026-08-22T00:00:00Z",
      sha256: "d74dc15311117fe983180bf3245e083633d14bb148ea5cd9db79b1d15a8533c2"
    }),
    source({
      id: "loyalsoldier-rules-dat",
      repository: "https://github.com/Loyalsoldier/v2ray-rules-dat",
      branch: "release",
      commit: "5c20d2eb5a65b171816949010ede67a27326cbe6",
      license: "MIT",
      format: "geosite-geoip-dat",
      region: "global",
      adapter: "loyalsoldier-rules-dat",
      minEntries: 1,
      sourcePath: "geosite.dat",
      releaseTag: "202608212217",
      retrievalUrl: "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/download/202608212217/geosite.dat",
      retrievedAt: "2026-08-22T00:00:00Z",
      sha256: "b392a98a323777deab59d8208e856df09cf96f3a76d2869eb7a8e5289bc5d9f4"
    }),
    source({
      id: "russia-v2ray-rules",
      repository: "https://github.com/runetfreedom/russia-v2ray-rules-dat",
      branch: "master",
      commit: "f175e3f94891dbc1bb88edfc2d9d85f5a9051a23",
      license: "MIT",
      format: "geosite-geoip-dat",
      region: "ru",
      adapter: "russia-v2ray-rules",
      minEntries: 1,
      sourcePath: "geosite.dat",
      releaseTag: "202608221547",
      retrievalUrl: "https://github.com/runetfreedom/russia-v2ray-rules-dat/releases/download/202608221547/geosite.dat",
      retrievedAt: "2026-08-22T00:00:00Z",
      sha256: "76fdbe01687a6cc7683b50c38ceea84941458e8371d215918daf555665a537cd"
    }),
    source({
      id: "iran-v2ray-rules",
      repository: "https://github.com/Chocolate4U/Iran-v2ray-rules",
      branch: "master",
      commit: "676695ea3b4c95d5cf48a7c4e2e718bac5b8a099",
      license: "MIT",
      format: "geosite-geoip-dat",
      region: "ir",
      adapter: "iran-v2ray-rules",
      minEntries: 1,
      sourcePath: "geosite.dat",
      releaseTag: "202608311106",
      retrievalUrl: "https://github.com/Chocolate4U/Iran-v2ray-rules/releases/download/202608311106/geosite.dat",
      retrievedAt: "2026-08-31T11:08:56Z",
      sha256: "994a6f6b725cfecfaa2c95593ae51cec2d4fafe5614f0797044020ce05bb0184"
    }),
    source({
      id: "loyalsoldier-clash-direct",
      repository: "https://github.com/Loyalsoldier/clash-rules",
      branch: "release",
      commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
      tree: "48f825328014eef805065de40be0a25bec604075",
      blob: "99e83b33316491bb4a312ffa6d2d96c321b7bc53",
      license: "GPL-3.0",
      format: "clash-rules-yaml",
      region: "global",
      adapter: "clash-rules-yaml",
      minEntries: 1,
      sourcePath: "direct.txt",
      releaseTag: "202608252255",
      retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/direct.txt",
      retrievedAt: "2026-08-26T00:00:00Z",
      sha256: "555003affe662bc61f668aaa4efba5ede7b43921efc0331faeda33dc8d0852cf"
    }),
    source({
      id: "loyalsoldier-clash-reject",
      repository: "https://github.com/Loyalsoldier/clash-rules",
      branch: "release",
      commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
      tree: "48f825328014eef805065de40be0a25bec604075",
      blob: "e2b569d2c601a0a48c1c3ea7c3d4cfc0d41a0e4b",
      license: "GPL-3.0",
      format: "clash-rules-yaml",
      region: "global",
      adapter: "clash-rules-yaml",
      minEntries: 1,
      sourcePath: "reject.txt",
      releaseTag: "202608252255",
      retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/reject.txt",
      retrievedAt: "2026-08-26T00:00:00Z",
      sha256: "106bc6dfae726634b21bd9112da80f679419b71009af8e6a376915404f6992a5"
    }),
    source({
      id: "loyalsoldier-clash-applications",
      repository: "https://github.com/Loyalsoldier/clash-rules",
      branch: "release",
      commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
      tree: "48f825328014eef805065de40be0a25bec604075",
      blob: "e409d8e43c33c3b82ca033825a6d6026ac8a9e6e",
      license: "GPL-3.0",
      format: "clash-rules-yaml",
      region: "global",
      adapter: "clash-rules-yaml",
      minEntries: 1,
      sourcePath: "applications.txt",
      releaseTag: "202608252255",
      retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/applications.txt",
      retrievedAt: "2026-08-26T00:00:00Z",
      sha256: "33bc8f07bacf74082fcb5f361eded1f6f9d3abcedcbe37ada2eb2ab4ae031732"
    }),
    source({
      id: "loyalsoldier-clash-google",
      repository: "https://github.com/Loyalsoldier/clash-rules",
      branch: "release",
      commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
      tree: "48f825328014eef805065de40be0a25bec604075",
      blob: "9766421c32efb5ff9442d9998c8b0dc561ab7b04",
      license: "GPL-3.0",
      format: "clash-rules-yaml",
      region: "global",
      adapter: "clash-rules-yaml",
      auditOnly: true,
      minEntries: 1,
      sourcePath: "google.txt",
      releaseTag: "202608252255",
      retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/google.txt",
      retrievedAt: "2026-08-26T00:00:00Z",
      sha256: "21a04f287800943b3fdfdef1f843173086171d9a0b5c9c33c3f73e1ec77d4c9e"
    }),
    ...[
      ["private", "62c87f8501cb221de661dba97a17d3eaba4c9592", "3a04b128200ef8097d73b1496cbb23d24bc1e05d42fffb09f07c51699efb00b2"],
      ["apple", "3fbaf85c498ce62ec854a370b1919aeb7a6f4cbb", "70f9f77e0022fc1e79d597d2fca5a3bbfa8bfe0f7542694b455f8a70004f5ba3"],
      ["icloud", "0c0de8fb5b244eb4a24bee6452e255576ec8ab75", "f1fb7e9d17400071bf77d853b2a3148ccb6a13d785cb97e73f1693142682b23f"],
      ["gfw", "7d3951772d1c25862c4ddc76b999dc571f8c84cc", "841c83b1536777b9088bf879d9ea3516a7a70ea63a4066eeafa5ba2cdf601cbc"],
      ["tld-not-cn", "f3d8313d7d645c9044eefbce1cefecc32b12e90e", "330816293887779168d577a95f606c33702322654249e4c00051a3827830e310"],
      ["telegramcidr", "b3d48b7dc56c78089d701a44a86d5ab058a13403", "328fca88c675763111c7f7585ec504e5c21ab9afb7a8ce6df33b7ac01b8a3ee0"],
      ["lancidr", "43b23b5a34c37cdf3f69f714bd86f1fc6ac59e01", "82920b241dc328f1dc99849cf733ed8675a00a4ee0bdf64c892b332dfb7e1e2e"],
      ["cncidr", "1c2af0f2b98d4613b21e321558254e7ba44fdd54", "019b753c347b7b06ae8a9f9f74f2443d6b35bc9e4d6db70c134306503621b2d1"]
    ].map(([name, blob, sha2562]) => source({
      id: `loyalsoldier-clash-${name}`,
      repository: "https://github.com/Loyalsoldier/clash-rules",
      branch: "release",
      commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
      tree: "48f825328014eef805065de40be0a25bec604075",
      blob,
      license: "GPL-3.0",
      format: "clash-rules-yaml",
      region: "global",
      adapter: "clash-rules-yaml",
      minEntries: 1,
      sourcePath: `${name}.txt`,
      releaseTag: "202608252255",
      retrievalUrl: `https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/${name}.txt`,
      retrievedAt: "2026-08-26T00:00:00Z",
      sha256: sha2562
    }))
  ]);
  function validateExternalSourceCatalog(catalog = EXTERNAL_RULE_SOURCE_CATALOG) {
    if (!Array.isArray(catalog) || catalog.length === 0) throw new TypeError("External source catalog must not be empty");
    const ids2 = /* @__PURE__ */ new Set();
    for (const record2 of catalog) {
      if (!record2 || typeof record2 !== "object") throw new TypeError("External source must be an object");
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(record2.id) || ids2.has(record2.id)) {
        throw new TypeError(`Duplicate or unsafe external source ID: ${record2.id}`);
      }
      ids2.add(record2.id);
      if (!SHA1_COMMIT.test(record2.commit)) throw new TypeError(`External source ${record2.id} is not pinned to a full commit`);
      if (typeof record2.repository !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(record2.repository)) throw new TypeError(`External source ${record2.id} has invalid repository`);
      if (typeof record2.branch !== "string" || record2.branch.trim() === "") throw new TypeError(`External source ${record2.id} has no branch metadata`);
      if (typeof record2.retrievalUrl !== "string" || !record2.retrievalUrl.startsWith("https://")) throw new TypeError(`External source ${record2.id} has no retrieval URL`);
      if (typeof record2.releaseTag !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(record2.releaseTag)) throw new TypeError(`External source ${record2.id} has invalid release tag`);
      if (typeof record2.sourcePath !== "string" || record2.sourcePath.length === 0 || !SAFE_PATH.test(record2.sourcePath) || record2.sourcePath.split("/").some((segment) => segment === "." || segment === "..")) {
        throw new TypeError(`External source ${record2.id} has unsafe source path`);
      }
      const expectedUrl = `${record2.repository}/releases/download/${record2.releaseTag}/${record2.sourcePath}`;
      if (record2.retrievalUrl !== expectedUrl) throw new TypeError(`External source ${record2.id} has mismatched release asset URL`);
      if (typeof record2.retrievedAt !== "string" || Number.isNaN(Date.parse(record2.retrievedAt))) throw new TypeError(`External source ${record2.id} has invalid retrieval timestamp`);
      if (typeof record2.sha256 !== "string" || !SHA256.test(record2.sha256)) throw new TypeError(`External source ${record2.id} has invalid SHA-256`);
      if (typeof record2.license !== "string" || record2.license.trim() === "") throw new TypeError(`External source ${record2.id} has no license`);
      if (!REGIONS2.has(record2.region)) throw new TypeError(`External source ${record2.id} has invalid region`);
      if (typeof record2.format !== "string" || record2.format.trim() === "") throw new TypeError(`External source ${record2.id} has no format`);
      if (typeof record2.adapter !== "string" || record2.adapter.trim() === "") throw new TypeError(`External source ${record2.id} has no adapter`);
      if (!Number.isInteger(record2.minEntries) || record2.minEntries < 1) throw new TypeError(`External source ${record2.id} has invalid minEntries`);
      if (record2.tree !== void 0 && !SHA1_COMMIT.test(record2.tree)) throw new TypeError(`External source ${record2.id} has invalid tree hash`);
      if (record2.blob !== void 0 && !SHA1_COMMIT.test(record2.blob)) throw new TypeError(`External source ${record2.id} has invalid blob hash`);
      if (record2.auditOnly !== void 0 && typeof record2.auditOnly !== "boolean") throw new TypeError(`External source ${record2.id} has invalid auditOnly flag`);
    }
    return true;
  }
  validateExternalSourceCatalog();

  // ../../shared/rules/region-profiles.js
  var BASELINE_IDS = Object.freeze(RULE_SOURCE_CATALOG.map(({ id }) => id));
  var CHINA_LOCAL_IDS = /* @__PURE__ */ new Set(["DomesticCore", "DomesticGame", "SteamCN", "ChinaTLD", "ChinaIP", "ChinaMax", "ChinaMax_Domain"]);
  var GLOBAL_BASELINE_IDS = Object.freeze(BASELINE_IDS.filter((id) => !CHINA_LOCAL_IDS.has(id)));
  var COMMON_EXTERNAL_IDS = Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region, auditOnly }) => region === "global" && !auditOnly).map(({ id }) => id));
  var OVERLAY_IDS = Object.freeze({
    ru: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ru").map(({ id }) => id)),
    ir: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ir").map(({ id }) => id))
  });
  var REGION_PROFILES = Object.freeze({
    cn: Object.freeze({ region: "cn", sourceIds: Object.freeze([...BASELINE_IDS, ...COMMON_EXTERNAL_IDS]), overlays: Object.freeze([]) }),
    global: Object.freeze({ region: "global", sourceIds: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS]), overlays: Object.freeze([]) }),
    ru: Object.freeze({ region: "ru", sourceIds: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ru]), overlays: OVERLAY_IDS.ru }),
    ir: Object.freeze({ region: "ir", sourceIds: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ir]), overlays: OVERLAY_IDS.ir })
  });
  function sourcesForRegion(region, { adblockMode = "off" } = {}) {
    if (adblockMode !== "off" && adblockMode !== "full") throw new TypeError("adblockMode must be either off or full");
    const profile = REGION_PROFILES[parseRegion(region)];
    const sourceIds = adblockMode === "full" ? [...profile.sourceIds, ...FULL_ADBLOCK_SOURCE_IDS] : profile.sourceIds;
    const ids2 = sourceIds.filter((id) => adblockMode === "full" || !FULL_ADBLOCK_SOURCE_IDS.includes(id));
    return Object.freeze([...new Set(ids2)]);
  }
  for (const profile of Object.values(REGION_PROFILES)) {
    if (new Set(profile.sourceIds).size !== profile.sourceIds.length) throw new TypeError(`Duplicate source in ${profile.region} profile`);
    if (profile.region === "cn" && profile.sourceIds.some((id) => OVERLAY_IDS.ru.includes(id) || OVERLAY_IDS.ir.includes(id))) {
      throw new TypeError("Default cn profile cannot include regional overlays");
    }
  }

  // src/render-profile.js
  function bytes(value, label2) {
    if (!(Buffer.isBuffer(value) || value instanceof Uint8Array)) throw new TypeError(`v2rayN GeoData ${label2} asset is missing or invalid`);
    return Buffer.from(value);
  }
  function sha256(input) {
    const bytes2 = new Uint8Array(input);
    const words = new Uint32Array(64);
    const state = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
    const constants = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
    const padded = new Uint8Array(bytes2.length + 9 + 63 >> 6 << 6);
    padded.set(bytes2);
    padded[bytes2.length] = 128;
    const bitLength = bytes2.length * 8;
    new DataView(padded.buffer).setUint32(padded.length - 4, bitLength, false);
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let i = 0; i < 16; i++) words[i] = new DataView(padded.buffer, offset + i * 4, 4).getUint32(0, false);
      for (let i = 16; i < 64; i++) {
        const x = words[i - 15];
        const y = words[i - 2];
        words[i] = ((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ x >>> 3) + words[i - 16] + ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ y >>> 10) + words[i - 7] | 0;
      }
      let [a, b, c, d, e, f, g, h] = state;
      for (let i = 0; i < 64; i++) {
        const s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
        const ch = e & f ^ ~e & g;
        const t1 = h + s1 + ch + constants[i] + words[i] | 0;
        const s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
        const maj = a & b ^ a & c ^ b & c;
        const t2 = s0 + maj | 0;
        [h, g, f, e, d, c, b, a] = [g, f, e, d + t1 | 0, c, b, a, t1 + t2 | 0];
      }
      state[0] = state[0] + a | 0;
      state[1] = state[1] + b | 0;
      state[2] = state[2] + c | 0;
      state[3] = state[3] + d | 0;
      state[4] = state[4] + e | 0;
      state[5] = state[5] + f | 0;
      state[6] = state[6] + g | 0;
      state[7] = state[7] + h | 0;
    }
    return [...state].map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
  }
  function geoReferences(geoData, options) {
    const names = xrayGeoNames(options.channel);
    if (geoData === null || geoData === void 0) {
      const sources = sourcesForRegion(options.region).map((id) => ({ id, code: xrayGeoCode(id) }));
      return {
        sources,
        domain: sources.map(({ id }) => xrayGeoReference(options.channel, "domain", id)),
        ip: sources.map(({ id }) => xrayGeoReference(options.channel, "ip", id))
      };
    }
    if (!geoData || typeof geoData !== "object" || Array.isArray(geoData) || !geoData.manifest) throw new TypeError("v2rayN GeoData manifest is required");
    const manifest = geoData.manifest;
    if (manifest.schemaVersion !== 1 || manifest.region !== options.region || manifest.channel !== options.channel) throw new Error("v2rayN GeoData manifest region/channel mismatch");
    if (!manifest.names || manifest.names.domain !== names.domain || manifest.names.ip !== names.ip) throw new Error("v2rayN GeoData manifest names mismatch");
    const domain = bytes(geoData.geosite ?? geoData.domain, "domain");
    const ip = bytes(geoData.geoip ?? geoData.ip, "ip");
    for (const type of ["domain", "ip"]) {
      const asset = type === "domain" ? domain : ip;
      const record2 = manifest[type];
      if (!record2 || record2.name !== names[type] || record2.byteLength !== asset.byteLength || record2.sha256 !== sha256(asset) || manifest.hashes?.[type] !== sha256(asset)) {
        throw new Error(`v2rayN GeoData ${type} manifest hash or byteLength mismatch`);
      }
    }
    if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) throw new Error("v2rayN GeoData manifest sources are missing");
    const codes = manifest.sources.map((source2) => {
      if (!source2 || typeof source2.id !== "string" || source2.code !== xrayGeoCode(source2.id)) throw new Error("v2rayN GeoData manifest source code mismatch");
      return source2.code;
    });
    if (Array.isArray(manifest.sourceCodes) && JSON.stringify(manifest.sourceCodes.map(({ code }) => code)) !== JSON.stringify(codes)) throw new Error("v2rayN GeoData sourceCodes mismatch");
    return { sources: manifest.sources, domain: codes.map((code) => `ext:${names.domain}.dat:${code}`), ip: codes.map((code) => `ext:${names.ip}.dat:${code}`) };
  }
  function unifiedTargetId(id) {
    if (id === "domesticCore" || id === "chinaIp") return "domesticPlatform";
    return id;
  }
  function actionForSource(sourceId, overrides, nodeTags, nodeTagsById, blockMode, policyResolution, proxyTag) {
    const configured = policyForRuleSource(sourceId);
    const target = configured ? businessTargetByKey(configured) : void 0;
    const domestic = /* @__PURE__ */ new Set(["DomesticCore", "DomesticGame", "SteamCN", "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "Apple", "Microsoft", "Download", "PrivateTracker", "ChinaTLD", "ChinaIP"]);
    const security2 = /* @__PURE__ */ new Set(["Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain"]);
    const defaultValue = security2.has(sourceId) ? "REJECT" : sourceId === "Privacy" || domestic.has(sourceId) ? "DIRECT" : "FOLLOW";
    const unified = target ? policyResolution?.targets?.[unifiedTargetId(target.id)] : void 0;
    if (unified) {
      if (unified.resolved === "DIRECT") return "direct";
      if (unified.resolved === "FOLLOW") return proxyTag;
      const fixedTag = nodeTagsById.get(unified.nodeId);
      if (!fixedTag) throw new Error("v2rayN policy target node is unavailable");
      return fixedTag;
    }
    const value = overrides[target?.id] ?? defaultValue;
    if (value === "DIRECT") return "direct";
    if (value === "FOLLOW") return proxyTag;
    if (value === "NODE:".concat(value.slice(5)) && nodeTags.has(value.slice(5))) return nodeTags.get(value.slice(5));
    if (value === "NODE:".concat(value.slice(5))) throw new Error("v2rayN policy target node is unavailable");
    return value === "REJECT" ? blockMode === "off" ? "direct" : "block" : proxyTag;
  }
  function dns(options) {
    const queryStrategy = options.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP";
    const china = options.chinaDns === "system" ? "localhost" : options.chinaDns === "dnspod" ? "119.29.29.29" : "223.5.5.5";
    const global = options.globalDns === "google" ? "8.8.8.8" : options.globalDns === "quad9" ? "9.9.9.9" : "1.1.1.1";
    return { servers: [{ tag: "china-dns", address: china, domains: ["geosite:cn", "geosite:private"], queryStrategy }, { tag: "global-dns", address: global, queryStrategy }], queryStrategy, tag: "dnsQuery", mode: options.dnsMode };
  }
  function inbound(options) {
    if (options.platform === "macos") return {
      tag: "socks-in",
      listen: "127.0.0.1",
      port: 10808,
      protocol: "socks",
      settings: { auth: "noauth", udp: true },
      sniffing: { enabled: true, destOverride: ["http", "tls"], routeOnly: true }
    };
    return { tag: "tun", protocol: "tun", settings: { mtu: 1500 }, sniffing: { enabled: true, routeOnly: true } };
  }
  function renderV2rayNProfile({ nodes, options, geoData = null, filterFailures = {}, policyResolution = null } = {}) {
    if (!options || options.output !== "config") throw new Error("v2rayN profile options are required");
    if (!Array.isArray(nodes)) throw new Error("v2rayN profile requires compatible nodes");
    const outbounds = [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }];
    const failures = { ...filterFailures };
    const nodeTags = /* @__PURE__ */ new Map();
    const nodeTagsById = /* @__PURE__ */ new Map();
    nodes.forEach((node, index) => {
      const tag = `ap-node-${index.toString(36)}`;
      try {
        outbounds.push(renderXrayOutbound(node, { tag, client: "v2rayn" }));
        nodeTags.set(node.name, tag);
        if (node?._profile?.id) nodeTagsById.set(node._profile.id, tag);
      } catch (error) {
        const diagnostic = renderXrayNodeError(error, "v2rayn");
        Object.entries(diagnostic.excluded).forEach(([key, count]) => {
          failures[key] = (failures[key] ?? 0) + count;
        });
      }
    });
    const proxyTag = outbounds[2]?.tag ?? "block";
    const overrides = policyResolution === null ? parseBusinessOverrides(options.policyOverrides ?? "") : {};
    if (Object.values(overrides).some((value) => value.startsWith("NODE:") && !nodeTags.has(value.slice(5)))) throw new Error("v2rayN policy target node is unavailable");
    const references = geoReferences(geoData, options);
    const rules = [{ domain: ["geosite:private"], outboundTag: "direct", ruleTag: "private-direct" }];
    const sourceRules = references.sources.map((source2) => ({ source: source2, outboundTag: actionForSource(source2.id, overrides, nodeTags, nodeTagsById, options.blockMode, policyResolution, proxyTag) }));
    const rank = (item) => ["Hijacking", "BlockHttpDNS", "Privacy"].includes(item.source.id) ? 0 : policyForRuleSource(item.source.id) ? 1 : 2;
    sourceRules.sort((a, b) => rank(a) - rank(b));
    for (const { source: source2, outboundTag } of sourceRules) rules.push({ domain: [`ext:${xrayGeoNames(options.channel).domain}.dat:${source2.code}`], ip: [`ext:${xrayGeoNames(options.channel).ip}.dat:${source2.code}`], outboundTag, ruleTag: `source-${source2.id}` });
    if (options.quicMode !== "allow") rules.push({ network: "quic", outboundTag: options.quicMode === "all-block" ? "block" : "direct", ruleTag: "quic-policy" });
    const finalRecord = policyResolution?.targets?.final;
    let finalOutboundTag = proxyTag;
    if (finalRecord?.resolved === "DIRECT") finalOutboundTag = "direct";
    else if (finalRecord?.resolved && finalRecord.resolved !== "FOLLOW") {
      finalOutboundTag = nodeTagsById.get(finalRecord.nodeId);
      if (!finalOutboundTag) throw new Error("v2rayN policy target node is unavailable");
    }
    rules.push({ domain: [`geosite:${options.region}`], outboundTag: "direct", ruleTag: "china-domain-direct" }, { ip: [`geoip:${options.region}`], outboundTag: "direct", ruleTag: "china-ip-direct" }, { network: "tcp,udp", outboundTag: finalOutboundTag, ruleTag: "final-fail-closed" });
    return { name: options.name, dns: dns(options), inbounds: [inbound(options)], outbounds, routing: { domainStrategy: "IPIfNonMatch", rules }, ...Object.keys(failures).length ? { renderFailures: failures } : {} };
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

  // ../sing-box/src/options.js
  var REQUIRED_KEYS = Object.freeze(["output", "type", "name", "subscriptionName", "platform"]);
  var DEFAULTS2 = Object.freeze({
    channel: "current",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    autoGroupMode: "auto",
    clientChain: "off",
    profileMode: "light",
    adblockMode: "off",
    nodeErrorMode: "strict"
  });
  var PLATFORMS = /* @__PURE__ */ new Set(["macos", "windows", "iphone", "ipad", "android"]);
  var CHANNELS2 = new Set(FRONTIER_CHANNELS);
  var PROFILE_MODES = /* @__PURE__ */ new Set(["light", "diagnostic"]);
  var ADBLOCK_MODES = /* @__PURE__ */ new Set(["off", "full"]);
  var NODE_ERROR_MODES = /* @__PURE__ */ new Set(["strict", "compatible"]);
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS2)]);
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
    const channel = raw.channel === void 0 ? DEFAULTS2.channel : raw.channel;
    if (typeof channel !== "string" || !CHANNELS2.has(channel)) throw new Error("Option 'channel' has an unsupported value");
    const profileMode = raw.profileMode === void 0 ? DEFAULTS2.profileMode : raw.profileMode;
    if (typeof profileMode !== "string" || !PROFILE_MODES.has(profileMode)) throw new Error("Option 'profileMode' has an unsupported value");
    const adblockMode = raw.adblockMode === void 0 ? DEFAULTS2.adblockMode : raw.adblockMode;
    if (typeof adblockMode !== "string" || !ADBLOCK_MODES.has(adblockMode)) throw new Error("Option 'adblockMode' has an unsupported value");
    if (usesMobileRuleBundles(platform) && adblockMode === "full") {
      throw new Error("Option 'adblockMode=full' exceeds the mobile client memory budget");
    }
    const nodeErrorMode = raw.nodeErrorMode === void 0 ? DEFAULTS2.nodeErrorMode : raw.nodeErrorMode;
    if (typeof nodeErrorMode !== "string" || !NODE_ERROR_MODES.has(nodeErrorMode)) throw new Error("Option 'nodeErrorMode' has an unsupported value");
    const options = {
      output: "config",
      type: "collection",
      name: validateCollectionName(raw.name, "Option 'name'"),
      subscriptionName: requiredString(raw, "subscriptionName"),
      platform,
      channel,
      dnsMode: enumValue(raw, "dnsMode", DEFAULTS2.dnsMode),
      chinaDns: enumValue(raw, "chinaDns", DEFAULTS2.chinaDns),
      globalDns: enumValue(raw, "globalDns", DEFAULTS2.globalDns),
      blockMode: enumValue(raw, "blockMode", DEFAULTS2.blockMode),
      quicMode: enumValue(raw, "quicMode", DEFAULTS2.quicMode),
      ipv6Mode: enumValue(
        raw,
        "ipv6Mode",
        ["macos", "iphone", "ipad"].includes(platform) ? "ipv4-only" : DEFAULTS2.ipv6Mode
      ),
      autoGroupMode: enumValue(raw, "autoGroupMode", DEFAULTS2.autoGroupMode),
      clientChain: enumValue(raw, "clientChain", DEFAULTS2.clientChain),
      profileMode,
      adblockMode,
      nodeErrorMode
    };
    platformPolicyPreset(platform);
    Object.freeze(options);
    PARSED.add(options);
    return options;
  }
  function isParsedSingBoxOptions(value) {
    return value !== null && typeof value === "object" && PARSED.has(value);
  }

  // ../sing-box/src/render-node.js
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
    "httpupgrade-opts",
    "xhttp-opts",
    "cipher",
    "password",
    "uuid",
    "flow",
    "encryption",
    "packet-encoding",
    "packetEncoding",
    "xudp",
    "packet-addr",
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
    "reserved",
    "address",
    "allowed-ips",
    "allowed_ips",
    "persistent-keepalive",
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
    "congestion-control",
    "congestion_control",
    "heartbeat",
    "ports",
    "server-ports",
    "server_ports",
    "port-hopping",
    "port_hopping",
    "port-hopping-interval",
    "port_hopping_interval",
    "hop-interval",
    "hop_interval",
    "hop_interval_max",
    "bandwidth",
    "up",
    "down",
    "up_mbps",
    "down_mbps",
    "reuse",
    "tfo",
    "udp_relay",
    "idle-session-check-interval",
    "idle-session-timeout",
    "min-idle-session",
    "client-metadata",
    "client_metadata",
    "underlying-proxy",
    "chain",
    "dialer-proxy",
    "detour",
    "prev_hop"
  ]);
  var CHAIN_ALIASES3 = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
  var GENERATED_CHAIN_POLICY2 = "\u{1F517} \u5165\u53E3\u8282\u70B9";
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
    "udp",
    "idle-session-check-interval",
    "idle-session-timeout",
    "min-idle-session",
    "client-metadata",
    "client_metadata",
    ...CHAIN_ALIASES3
  ]);
  var ANYTLS_REALITY_FIELDS = /* @__PURE__ */ new Set(["public-key", "short-id", "_spider-x"]);
  function hasOwn(value, key) {
    return Object.hasOwn(value, key);
  }
  function requiredString2(node, key) {
    const value = node[key];
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
      throw new Error(`sing-box node field '${key}' is invalid`);
    }
    return value;
  }
  function requiredPort(node) {
    const port2 = Number(node.port);
    if (!Number.isInteger(port2) || port2 < 1 || port2 > 65535) throw new Error("sing-box node port is invalid");
    return port2;
  }
  function validateNodeShape(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError("sing-box node is invalid");
    if (typeof node.name !== "string" || node.name.length === 0 || /[\r\n]/u.test(node.name)) {
      throw new Error("sing-box node name is invalid");
    }
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
    if (node.network !== void 0 && node.network !== "tcp") throw new Error("Unsupported sing-box AnyTLS network");
    if (node.tls !== void 0 && node.tls !== true) throw new Error("sing-box AnyTLS requires TLS");
    if (node.security !== void 0 && !["tls", "reality"].includes(node.security)) {
      throw new Error(`Unsupported sing-box AnyTLS security: ${String(node.security)}`);
    }
    for (const key of ["sni", "servername"]) {
      if (hasOwn(node, key) && (typeof node[key] !== "string" || node[key].length === 0 || node[key].trim() !== node[key])) {
        throw new Error(`sing-box AnyTLS field '${key}' is invalid`);
      }
    }
    if (hasOwn(node, "sni") && hasOwn(node, "servername") && node.sni !== node.servername) {
      throw new Error("Conflicting sing-box AnyTLS server name aliases");
    }
    for (const key of ["skip-cert-verify", "allow-insecure"]) {
      if (hasOwn(node, key) && typeof node[key] !== "boolean") throw new Error(`sing-box AnyTLS field '${key}' is invalid`);
    }
    if (hasOwn(node, "skip-cert-verify") && hasOwn(node, "allow-insecure") && node["skip-cert-verify"] !== node["allow-insecure"]) {
      throw new Error("Conflicting sing-box AnyTLS certificate verification aliases");
    }
    if (hasOwn(node, "udp") && typeof node.udp !== "boolean") throw new Error("sing-box AnyTLS field 'udp' is invalid");
    if (hasOwn(node, "client-fingerprint") && (typeof node["client-fingerprint"] !== "string" || node["client-fingerprint"].length === 0 || node["client-fingerprint"].trim() !== node["client-fingerprint"])) {
      throw new Error("sing-box AnyTLS field 'client-fingerprint' is invalid");
    }
    const reality = node["reality-opts"];
    if (node.security === "reality" && !reality) throw new Error("sing-box AnyTLS Reality options are required");
    if (node.security === "tls" && reality) throw new Error("sing-box AnyTLS TLS conflicts with Reality options");
    if (!reality) return;
    const unsupportedReality = Object.keys(reality).find((key) => !ANYTLS_REALITY_FIELDS.has(key));
    if (unsupportedReality !== void 0) throw new Error(`Unsupported sing-box AnyTLS Reality field: ${unsupportedReality}`);
    if (typeof reality["public-key"] !== "string" || reality["public-key"].length === 0 || reality["public-key"].trim() !== reality["public-key"]) {
      throw new Error("sing-box AnyTLS Reality public key is invalid");
    }
    if (reality["short-id"] !== void 0 && (typeof reality["short-id"] !== "string" || !/^[0-9a-f]+$/iu.test(reality["short-id"]))) {
      throw new Error("sing-box AnyTLS Reality short ID is invalid");
    }
  }
  function setIf(target, key, value) {
    if (value !== void 0 && value !== null && value !== "") target[key] = value;
  }
  function durationSeconds(node, key) {
    if (!hasOwn(node, key)) return void 0;
    const value = node[key];
    if (Number.isSafeInteger(value) && value >= 0) return `${value}s`;
    if (typeof value === "string" && value.trim() === value && value.length > 0) return value;
    throw new Error(`sing-box node field '${key}' is invalid`);
  }
  function tlsFields(node, required3 = false) {
    const reality = node["reality-opts"];
    const enabled = required3 || node.tls === true || node.security === "tls" || node.security === "reality" || reality !== void 0;
    if (!enabled) return void 0;
    const tls = { enabled: true };
    setIf(tls, "server_name", node.sni ?? node.servername);
    if (node.alpn !== void 0) {
      if (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((value) => typeof value !== "string" || !value)) {
        throw new Error("sing-box TLS ALPN is invalid");
      }
      tls.alpn = [...node.alpn];
    }
    if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) tls.insecure = true;
    if (node["client-fingerprint"] !== void 0) {
      tls.utls = { enabled: true, fingerprint: requiredString2(node, "client-fingerprint") };
    }
    if (reality !== void 0) {
      if (!reality || typeof reality !== "object" || typeof reality["public-key"] !== "string") {
        throw new Error("sing-box Reality options are invalid");
      }
      tls.reality = { enabled: true, public_key: reality["public-key"] };
      setIf(tls.reality, "short_id", reality["short-id"]);
    }
    return tls;
  }
  function transportFields(node) {
    const network = String(node.network ?? "tcp").trim().toLowerCase();
    if (["tcp", "raw"].includes(network)) return void 0;
    if (network === "ws") {
      const source2 = node["ws-opts"];
      if (!source2 || typeof source2 !== "object" || Array.isArray(source2)) throw new Error("sing-box WebSocket options are invalid");
      const transport2 = { type: "ws", path: Array.isArray(source2.path) ? source2.path[0] : source2.path ?? "/" };
      if (source2.headers !== void 0) transport2.headers = { ...source2.headers };
      return transport2;
    }
    if (network === "grpc") {
      const source2 = node["grpc-opts"] ?? {};
      const transport2 = { type: "grpc" };
      setIf(transport2, "service_name", source2["grpc-service-name"] ?? source2.service_name);
      return transport2;
    }
    if (["h2", "http2", "http"].includes(network)) {
      const source2 = node["h2-opts"] ?? node["http-opts"] ?? {};
      const transport2 = { type: "http" };
      setIf(transport2, "method", source2.method);
      setIf(transport2, "path", Array.isArray(source2.path) ? source2.path[0] : source2.path);
      if (source2.headers !== void 0) transport2.headers = { ...source2.headers };
      if (source2.host !== void 0) transport2.host = Array.isArray(source2.host) ? source2.host : [source2.host];
      return transport2;
    }
    if (network === "httpupgrade") {
      const source2 = node["httpupgrade-opts"] ?? {};
      const transport2 = { type: "httpupgrade", path: source2.path ?? "/" };
      setIf(transport2, "host", source2.host);
      return transport2;
    }
    throw new Error(`Unsupported sing-box transport: ${network}`);
  }
  function packetEncoding(node, outbound) {
    const raw = node["packet-encoding"] ?? node.packetEncoding ?? (node.xudp === true ? "xudp" : node["packet-addr"] === true ? "packetaddr" : void 0);
    if (raw === void 0 || raw === "") return;
    const encoding = String(raw).trim().toLowerCase();
    if (!["xudp", "packetaddr", "packet"].includes(encoding)) throw new Error(`Unsupported sing-box packet encoding: ${encoding}`);
    outbound.packet_encoding = encoding === "packet" ? "packetaddr" : encoding;
  }
  function base(node, type) {
    return { type, tag: node.name, server: node.server, server_port: requiredPort(node) };
  }
  function appendChain(outbound, node) {
    const aliases = CHAIN_ALIASES3.filter((key) => hasOwn(node, key) && node[key] !== void 0 && node[key] !== null && node[key] !== "");
    if (aliases.length === 0) return outbound;
    if (aliases.length !== 1 || aliases[0] !== "underlying-proxy" || node["underlying-proxy"] !== GENERATED_CHAIN_POLICY2 || node?._profile?.chained !== true) {
      throw new Error("Unsupported existing sing-box proxy chain");
    }
    outbound.detour = GENERATED_CHAIN_POLICY2;
    return outbound;
  }
  function renderWireGuardEndpoint(node) {
    validateNodeShape(node);
    const peers = Array.isArray(node.peers) && node.peers.length > 0 ? node.peers : [{}];
    const localAddress = node["local-address"] ?? node.local_ipv4 ?? node["local-ipv4"] ?? node.ip;
    if (localAddress === void 0) throw new Error("sing-box WireGuard local address is required");
    const endpointPeers = peers.map((peer) => {
      const publicKey = peer["public-key"] ?? node["public-key"];
      if (typeof publicKey !== "string" || !publicKey) throw new Error("sing-box WireGuard peer public key is required");
      return {
        address: peer.address ?? node.server,
        port: Number(peer.port ?? node.port),
        public_key: publicKey,
        allowed_ips: peer["allowed-ips"] ?? peer.allowed_ips ?? ["0.0.0.0/0", "::/0"],
        ...peer["pre-shared-key"] ?? node["pre-shared-key"] ? { pre_shared_key: peer["pre-shared-key"] ?? node["pre-shared-key"] } : {},
        ...peer["persistent-keepalive"] ?? node.keepalive ? { persistent_keepalive_interval: Number(peer["persistent-keepalive"] ?? node.keepalive) } : {},
        ...peer.reserved ?? node.reserved ? { reserved: peer.reserved ?? node.reserved } : {}
      };
    });
    return {
      type: "wireguard",
      tag: node.name,
      system: false,
      mtu: Number(node.mtu ?? 1408),
      address: Array.isArray(localAddress) ? localAddress : [localAddress],
      private_key: requiredString2(node, "private-key"),
      peers: endpointPeers
    };
  }
  function renderSingBoxOutbound(node) {
    validateNodeShape(node);
    const protocol2 = normalizeProtocol(node.type);
    if (protocol2 === "wireguard") throw new Error("WireGuard is rendered as a sing-box endpoint");
    let outbound;
    switch (protocol2) {
      case "ss":
      case "shadowsocks":
        outbound = { ...base(node, "shadowsocks"), method: requiredString2(node, "cipher"), password: requiredString2(node, "password") };
        if (["tcp", "udp"].includes(node.network)) outbound.network = node.network;
        break;
      case "vmess":
        outbound = { ...base(node, "vmess"), uuid: requiredString2(node, "uuid"), security: node.security ?? node.cipher ?? "auto" };
        if (node["alter-id"] !== void 0 || node.alterId !== void 0) outbound.alter_id = Number(node["alter-id"] ?? node.alterId);
        outbound.tls = tlsFields(node);
        outbound.transport = transportFields(node);
        packetEncoding(node, outbound);
        break;
      case "snell": {
        const version = Number(node.version);
        if (![4, 5, 6].includes(version)) throw new Error("Unsupported sing-box Snell version");
        const outputVersion = version === 5 ? 4 : version;
        outbound = { ...base(node, "snell"), psk: requiredString2(node, "psk"), version: outputVersion };
        if (["tcp", "udp"].includes(node.network)) outbound.network = node.network;
        if (outputVersion === 4) {
          setIf(outbound, "reuse", node.reuse);
          setIf(outbound, "obfs_mode", node.obfs_mode ?? node["obfs-mode"] ?? node.obfs);
          setIf(outbound, "obfs_host", node["obfs-host"] ?? node.obfs_host);
        } else {
          setIf(outbound, "userkey", node.userkey ?? node["user-key"]);
          setIf(outbound, "reuse", node.reuse);
          setIf(outbound, "mode", node.mode);
        }
        break;
      }
      case "vless":
        if (node.encryption !== void 0 && !["", "none"].includes(node.encryption)) throw new Error("Unsupported sing-box VLESS encryption");
        outbound = { ...base(node, "vless"), uuid: requiredString2(node, "uuid") };
        setIf(outbound, "flow", node.flow);
        if (["tcp", "udp"].includes(node.network)) outbound.network = node.network;
        outbound.tls = tlsFields(node);
        outbound.transport = transportFields(node);
        packetEncoding(node, outbound);
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
        if (node["min-idle-session"] !== void 0) outbound.min_idle_session = Number(node["min-idle-session"]);
        setIf(outbound, "client_metadata", node["client-metadata"] ?? node.client_metadata);
        break;
      case "hysteria2":
      case "hy2":
        outbound = { ...base(node, "hysteria2"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        setIf(outbound, "server_ports", node.server_ports ?? node["server-ports"] ?? node.ports);
        setIf(outbound, "hop_interval", node.hop_interval ?? node["hop-interval"] ?? node["port-hopping-interval"]);
        setIf(outbound, "hop_interval_max", node.hop_interval_max);
        setIf(outbound, "up_mbps", node.up_mbps ?? node.up);
        setIf(outbound, "down_mbps", node.down_mbps ?? node.down);
        if (node.obfs !== void 0) {
          const type = typeof node.obfs === "string" ? node.obfs : node.obfs.type;
          outbound.obfs = { type };
          setIf(outbound.obfs, "password", node["obfs-password"] ?? node["obfs_password"] ?? node.obfs.password);
        }
        break;
      case "tuic":
        outbound = { ...base(node, "tuic"), uuid: requiredString2(node, "uuid"), password: requiredString2(node, "password"), tls: tlsFields(node, true) };
        setIf(outbound, "udp_relay_mode", node["udp-relay-mode"] ?? node.udp_relay_mode);
        setIf(outbound, "congestion_control", node["congestion-control"] ?? node.congestion_control);
        setIf(outbound, "heartbeat", node.heartbeat);
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
      default:
        throw new Error(`Unsupported sing-box protocol: ${protocol2 || "unknown"}`);
    }
    for (const key of ["tls", "transport"]) if (outbound[key] === void 0) delete outbound[key];
    return appendChain(outbound, node);
  }
  function renderSingBoxNode(node) {
    const protocol2 = normalizeProtocol(node?.type);
    if (protocol2 === "wireguard") return { endpoint: renderWireGuardEndpoint(node) };
    return { outbound: renderSingBoxOutbound(node) };
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
  var LEAK_GROUP_NAME = "\u6F0F\u7F51\u4E4B\u9C7C";
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
      "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D": resolution.targets?.dnsAndRules,
      [LEAK_GROUP_NAME]: resolution.targets?.final
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
    groups.push(subscriptionGroup(
      GROUP_KIND.special,
      LEAK_GROUP_NAME,
      ALL_NODES_FILTER,
      ["\u{1F680} \u8282\u70B9\u9009\u62E9", "DIRECT", "REJECT"]
    ));
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

  // ../sing-box/src/render-groups.js
  var RULE_DOWNLOAD_GROUP = "\u{1F9ED} DNS \u4E0E\u89C4\u5219\u4E0B\u8F7D";
  var RULE_DOWNLOAD_FAILOVER_GROUP = "\u{1F9ED} \u89C4\u5219\u4E0B\u8F7D\u6545\u969C\u8F6C\u79FB";
  var PRIMARY_GROUP = "\u{1F680} \u8282\u70B9\u9009\u62E9";
  var AUTO_GROUP = "\u26A1 \u5168\u90E8\u81EA\u52A8";
  var FALLBACK_GROUP_PATTERN = /故障转移/u;
  var MOBILE_MEMORY_PLATFORMS = /* @__PURE__ */ new Set(["iphone", "ipad", "android"]);
  var IOS_MEMORY_PLATFORMS = /* @__PURE__ */ new Set(["iphone", "ipad"]);
  var TEST_URL2 = "https://www.gstatic.com/generate_204";
  function isMobileMemoryConstrained(options) {
    return MOBILE_MEMORY_PLATFORMS.has(options.platform);
  }
  function isIosMemoryConstrained(options) {
    return IOS_MEMORY_PLATFORMS.has(options.platform);
  }
  function isDisabledFallback(name) {
    return typeof name === "string" && FALLBACK_GROUP_PATTERN.test(name);
  }
  function targetName(value) {
    if (value === POLICY_TARGET.primaryProxy) return AUTO_GROUP;
    return value;
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
  function candidateList(group, nodes, { compact = false, ios = false } = {}) {
    const candidates = [
      ...group.candidates.filter((candidate) => !isDisabledFallback(candidate)).map(targetName),
      ...filterNodes(group.nodeFilter, nodes)
    ];
    return candidates.filter((item, index, all) => all.indexOf(item) === index);
  }
  function renderRuleDownloadGroups(inventory, ruleProbeUrl, defaultChoice) {
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
    const selectedDefault = defaultChoice && defaultChoice !== PRIMARY_GROUP ? defaultChoice : RULE_DOWNLOAD_FAILOVER_GROUP;
    const candidates = [
      RULE_DOWNLOAD_FAILOVER_GROUP,
      PRIMARY_GROUP,
      "DIRECT",
      ...selectedDefault === RULE_DOWNLOAD_FAILOVER_GROUP || [PRIMARY_GROUP, "DIRECT"].includes(selectedDefault) ? [] : [selectedDefault]
    ].filter((item, index, all) => all.indexOf(item) === index);
    const selector = {
      type: "selector",
      tag: RULE_DOWNLOAD_GROUP,
      outbounds: candidates,
      default: selectedDefault,
      interrupt_exist_connections: true
    };
    return [selector, failover];
  }
  function renderGroup(group, nodes, { compact = false, ios = false, ruleProbeUrl } = {}) {
    if (group.name === RULE_DOWNLOAD_GROUP) {
      return renderRuleDownloadGroups(nodes, ruleProbeUrl, group.defaultChoice);
    }
    let candidates = candidateList(group, nodes, { compact, ios });
    if (group.kind === "ai" && candidates[0] !== AUTO_GROUP) candidates.unshift(AUTO_GROUP);
    if (group.defaultChoice !== void 0 && !isDisabledFallback(group.defaultChoice)) {
      const defaultChoice = targetName(group.defaultChoice);
      if (!candidates.includes(defaultChoice)) candidates.unshift(defaultChoice);
      else candidates = [defaultChoice, ...candidates.filter((candidate) => candidate !== defaultChoice)];
    }
    const outbounds = candidates.length > 0 ? candidates : ["DIRECT"];
    if (group.name === PRIMARY_GROUP) {
      const primary = outbounds.filter((candidate) => candidate !== "DIRECT");
      return {
        type: "selector",
        tag: group.name,
        outbounds: primary.length > 0 ? primary : ["DIRECT"],
        default: primary[0] ?? "DIRECT",
        interrupt_exist_connections: true
      };
    }
    if (group.strategy === "auto-test") {
      return {
        type: "urltest",
        tag: group.name,
        outbounds,
        url: TEST_URL2,
        interval: `${Number(group.test?.interval ?? 600)}s`,
        tolerance: group.test?.tolerance ?? 100,
        interrupt_exist_connections: true
      };
    }
    const selector = {
      type: "selector",
      tag: group.name,
      outbounds,
      interrupt_exist_connections: true
    };
    if (group.defaultChoice !== void 0 && !isDisabledFallback(group.defaultChoice)) {
      selector.default = targetName(group.defaultChoice);
    }
    return selector;
  }
  function renderSingBoxGroups(options, nodes, { policyResolution = null, ruleProbeUrl = "https://www.gstatic.com/generate_204" } = {}) {
    const inventory = Array.isArray(nodes) ? nodes : [];
    const compact = isMobileMemoryConstrained(options);
    const shared = buildPolicyGroups(options, inventory, policyResolution);
    const rendered = [];
    for (const group of shared) {
      if (group.strategy === "fallback") continue;
      const groupOutbounds = renderGroup(group, inventory, {
        compact,
        ios: isIosMemoryConstrained(options),
        ruleProbeUrl
      });
      rendered.push(...Array.isArray(groupOutbounds) ? groupOutbounds : [groupOutbounds]);
    }
    return rendered;
  }

  // ../../shared/rules/critical-domestic.js
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

  // ../../shared/rules/custom-rules.js
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

  // ../../shared/rules/overseas-dns.js
  var PROXY_DNS_DOMAIN_SUFFIXES = Object.freeze([
    "google.com",
    "googleapis.com",
    "googleusercontent.com",
    "gstatic.com",
    "ggpht.com",
    "gvt1.com",
    "googlevideo.com",
    "youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
    "ytimg.com"
  ]);

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

  // ../sing-box/src/render-rules.js
  var RULE_DOWNLOAD_HTTP_CLIENT = "\u{1F9ED} \u89C4\u5219\u4E0B\u8F7D HTTP";
  var MOBILE_RULE_SOURCE_ID_SET = new Set(MOBILE_RULE_SOURCE_IDS);
  function activeRuleCatalog(platform, adblockMode) {
    const catalog = ruleClientCatalog({ adblockMode });
    return usesMobileRuleBundles(platform) ? mobileRuleClientCatalog().filter(({ id }) => MOBILE_RULE_SOURCE_ID_SET.has(id)) : catalog;
  }
  function activeRoutingPlan(platform, adblockMode) {
    const activeIds2 = new Set(activeRuleCatalog(platform, adblockMode).map(({ id }) => id));
    if (usesMobileRuleBundles(platform)) return mobileRuleClientCatalog();
    return orderedRoutingPlan({ adblockMode }).filter(({ id }) => activeIds2.has(id));
  }
  var LOCAL_RULES = Object.freeze([
    { ip_is_private: true, action: "route", outbound: "DIRECT" },
    { domain_suffix: ["local", "lan", "home.arpa"], action: "route", outbound: "DIRECT" }
  ]);
  var QUIC_BLOCK_RULE = Object.freeze({ network: "udp", port: 443, action: "reject", method: "drop" });
  var OVERSEAS_DNS_FALLBACK_RULE = Object.freeze({
    domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES,
    action: "route",
    outbound: "\u{1F680} \u8282\u70B9\u9009\u62E9"
  });
  var CUSTOM_TARGETS = Object.freeze({
    block: "REJECT",
    direct: "DIRECT",
    proxy: "\u{1F680} \u8282\u70B9\u9009\u62E9",
    ai: "\u{1F916} AI \u4E13\u7528"
  });
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
  function route(outbound) {
    return { action: "route", outbound };
  }
  function reject() {
    return { action: "reject", method: "default" };
  }
  function dnsAddressCidr(address) {
    if (typeof address !== "string" || address === "local") return null;
    return address.includes(":") ? `${address}/128` : `${address}/32`;
  }
  function renderDnsBootstrapRules({ chinaDns = "alidns", globalDns = "cloudflare", dnsMode = "stable" } = {}) {
    const addresses = [chinaDnsProvider(chinaDns).address];
    if (dnsMode === "speed") addresses.push(globalDnsProvider(globalDns).address);
    return [...new Set(addresses.map(dnsAddressCidr).filter(Boolean))].map((address) => ({ ip_cidr: [address], action: "route", outbound: "DIRECT" }));
  }
  function optionalAdblockBase(defaultBase) {
    const optional = defaultBase.replace(/\/sing-box\/rule-sets$/u, "/optional/adblock-full/sing-box");
    if (optional === defaultBase) throw new Error("sing-box adblock rule base URL must end in /sing-box/rule-sets");
    return optional;
  }
  function mobileRuleBase(defaultBase) {
    if (!defaultBase.endsWith("/rule-sets")) throw new Error("sing-box mobile rule base URL must end in /rule-sets");
    return `${defaultBase.slice(0, -"/rule-sets".length)}/mobile-rule-sets`;
  }
  function customRuleFields(entry) {
    const [type, value, ...modifiers] = entry.split(",");
    const field = CUSTOM_FIELDS[type];
    if (!field || !value || modifiers.some((modifier) => modifier !== "no-resolve")) {
      throw new Error(`Invalid sing-box custom rule: ${entry}`);
    }
    return { [field]: [value] };
  }
  function renderCustomRules(quicMode) {
    const grouped = /* @__PURE__ */ new Map();
    for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
      for (const entry of entries) {
        const fields = customRuleFields(entry);
        const [field] = Object.keys(fields);
        const key = `${kind}:${field}`;
        const values = grouped.get(key) ?? { kind, field, values: [] };
        values.values.push(...fields[field]);
        grouped.set(key, values);
      }
    }
    const rendered = [];
    for (const { kind, field, values } of grouped.values()) {
      const fields = { [field]: [...new Set(values)] };
      if (quicMode === "proxy-block" && ["proxy", "ai"].includes(kind) && field !== "ip_cidr") {
        rendered.push({ ...fields, ...QUIC_BLOCK_RULE });
      }
      rendered.push({ ...fields, ...kind === "block" ? reject() : route(CUSTOM_TARGETS[kind]) });
    }
    return rendered;
  }
  function taggedRule(source2) {
    if (source2.policy === "REJECT") return { rule_set: [`rule-${source2.id}`], ...reject() };
    return { rule_set: [`rule-${source2.id}`], ...route(source2.policy) };
  }
  function renderSingBoxRuleSets({ ruleBaseUrl, profileMode = "light", adblockMode = "off", platform }) {
    const base2 = baseUrl(ruleBaseUrl);
    if (profileMode === "diagnostic") return [];
    if (profileMode !== "light") throw new Error("Unsupported sing-box profile mode");
    const sources = activeRuleCatalog(platform, adblockMode);
    const sourceBase = usesMobileRuleBundles(platform) ? mobileRuleBase(base2) : base2;
    const adblockBase = adblockMode === "full" ? optionalAdblockBase(base2) : null;
    return sources.map((source2) => ({
      type: "remote",
      tag: `rule-${source2.id}`,
      format: "binary",
      url: `${source2.id === "Advertising" || source2.id === "Advertising_Domain" ? adblockBase : sourceBase}/${source2.id}.srs`,
      http_client: RULE_DOWNLOAD_HTTP_CLIENT,
      update_interval: "24h"
    }));
  }
  function renderSingBoxRouteRules({
    ruleBaseUrl,
    profileMode = "light",
    adblockMode = "off",
    blockMode = "balanced",
    quicMode = "allow",
    platform,
    chinaDns = "alidns",
    globalDns = "cloudflare",
    dnsMode = "stable"
  }) {
    if (!["allow", "proxy-block", "all-block"].includes(quicMode)) {
      throw new Error(`Unsupported sing-box quicMode: ${quicMode}`);
    }
    const ruleSets = renderSingBoxRuleSets({ ruleBaseUrl, profileMode, adblockMode, platform });
    const rules = [
      { inbound: "tun-in", action: "sniff" },
      { protocol: "dns", action: "hijack-dns" },
      ...LOCAL_RULES,
      ...renderDnsBootstrapRules({ chinaDns, globalDns, dnsMode })
    ];
    if (quicMode === "all-block") rules.push({ ...QUIC_BLOCK_RULE });
    if (profileMode === "diagnostic") {
      rules.push(...renderCustomRules(quicMode));
      return { ruleSets, rules, final: LEAK_GROUP_NAME };
    }
    const plan = activeRoutingPlan(platform, adblockMode);
    const securityIds = new Set({
      off: [],
      security: ["Hijacking", "BlockHttpDNS"],
      balanced: ["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"],
      strict: ["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"]
    }[blockMode] ?? []);
    if (usesMobileRuleBundles(platform)) {
      securityIds.clear();
      if (blockMode === "security") securityIds.add("Security");
      if (["balanced", "strict"].includes(blockMode)) {
        securityIds.add("Security");
        securityIds.add("Privacy");
      }
    }
    rules.push(...plan.filter(({ phase, id }) => phase === "security" && securityIds.has(id)).map(taggedRule));
    rules.push(...renderCustomRules(quicMode));
    if (quicMode === "proxy-block") {
      const proxyRuleSets = plan.filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => `rule-${id}`);
      if (proxyRuleSets.length > 0) rules.push({ network: "udp", port: 443, rule_set: proxyRuleSets, ...reject() });
    }
    for (const phase of ROUTING_PHASES.filter((value) => value !== "security" && value !== "resolvedChinaIp")) {
      for (const source2 of plan.filter((candidate) => candidate.phase === phase)) {
        rules.push(taggedRule(source2));
      }
      if (phase === "serviceIntent") {
        if (quicMode === "proxy-block") rules.push({ ...OVERSEAS_DNS_FALLBACK_RULE, ...QUIC_BLOCK_RULE });
        rules.push({ ...OVERSEAS_DNS_FALLBACK_RULE });
        if (usesMobileRuleBundles(platform)) {
          rules.push({ domain_suffix: ["cn"], action: "route", outbound: "DIRECT" });
        }
      }
    }
    rules.push({ action: "resolve", strategy: "prefer_ipv4" });
    rules.push(...plan.filter(({ phase }) => phase === "resolvedChinaIp").map(taggedRule));
    if (quicMode === "proxy-block") rules.push({ ...QUIC_BLOCK_RULE });
    return { ruleSets, rules, final: LEAK_GROUP_NAME };
  }

  // ../sing-box/src/render-dns.js
  var DNS_DIRECT = "dns-direct";
  var DNS_PROXY = "dns-proxy";
  var LOCAL_DNS_SUFFIXES = Object.freeze(["local", "lan", "home.arpa"]);
  var PROXY_DNS_SOURCE_IDS = Object.freeze(
    orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id)
  );
  var CHINA_DNS_SOURCE_IDS = Object.freeze(
    orderedRoutingPlan().filter(({ id, dnsClass }) => dnsClass === "china" && id !== "ChinaIP").map(({ id }) => id)
  );
  var MOBILE_PROXY_DNS_SOURCE_IDS = Object.freeze(
    mobileRuleClientCatalog().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id)
  );
  var MOBILE_CHINA_DNS_SOURCE_IDS = Object.freeze(
    mobileRuleClientCatalog().filter(({ dnsClass }) => dnsClass === "china").map(({ id }) => id)
  );
  function activeSourceIds(options, sourceIds, mobileSourceIds) {
    return usesMobileRuleBundles(options.platform) ? mobileSourceIds : sourceIds;
  }
  function customDnsRules() {
    const rules = [];
    const targetByKind = /* @__PURE__ */ new Map([
      ["direct", DNS_DIRECT],
      ["proxy", DNS_PROXY],
      ["ai", DNS_PROXY]
    ]);
    for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
      const server = targetByKind.get(kind);
      if (!server) continue;
      for (const entry of entries) {
        const [type, value, ...modifiers] = entry.split(",");
        if (modifiers.some((modifier) => modifier !== "no-resolve")) {
          throw new Error(`Invalid sing-box custom DNS rule: ${entry}`);
        }
        if (type === "DOMAIN") rules.push({ domain: [value], action: "route", server });
        else if (type === "DOMAIN-SUFFIX") rules.push({ domain_suffix: [value], action: "route", server });
        else if (type === "DOMAIN-KEYWORD") rules.push({ domain_keyword: [value], action: "route", server });
        else if (!["IP-CIDR", "IP-CIDR6"].includes(type)) {
          throw new Error(`Invalid sing-box custom DNS rule: ${entry}`);
        }
      }
    }
    return rules;
  }
  function renderUnknownDnsRules(chinaIpRuleTag) {
    return [
      { action: "evaluate", server: DNS_DIRECT, tag: "direct-answer" },
      {
        rule_set: [chinaIpRuleTag],
        match_response: "direct-answer",
        action: "respond"
      },
      { action: "evaluate", server: DNS_PROXY, tag: "proxy-answer" },
      {
        match_response: "proxy-answer",
        ip_accept_any: true,
        action: "respond"
      },
      { action: "route", server: DNS_PROXY }
    ];
  }
  function dnsRules(options) {
    const rules = [
      { domain_suffix: LOCAL_DNS_SUFFIXES, action: "route", server: DNS_DIRECT },
      { domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES, action: "route", server: DNS_PROXY },
      ...customDnsRules()
    ];
    if (options.profileMode !== "diagnostic") {
      for (const [sourceIds, mobileSourceIds, server] of [
        [PROXY_DNS_SOURCE_IDS, MOBILE_PROXY_DNS_SOURCE_IDS, DNS_PROXY],
        [CHINA_DNS_SOURCE_IDS, MOBILE_CHINA_DNS_SOURCE_IDS, DNS_DIRECT]
      ]) {
        const ruleSet = activeSourceIds(options, sourceIds, mobileSourceIds).map((id) => `rule-${id}`);
        if (ruleSet.length > 0) rules.push({ rule_set: ruleSet, action: "route", server });
      }
      rules.push(
        ...options.dnsMode === "privacy" ? [{ action: "route", server: DNS_PROXY }] : renderUnknownDnsRules("rule-ChinaIP")
      );
    } else {
      rules.push({ action: "route", server: DNS_PROXY });
    }
    return rules;
  }
  function renderSingBoxDns(options) {
    const chinaDns = chinaDnsProvider(options.chinaDns);
    const chinaServer = options.chinaDns === "system" ? { type: "local", tag: DNS_DIRECT } : { type: "udp", tag: DNS_DIRECT, server: chinaDns.address };
    const globalDns = globalDnsProvider(options.globalDns);
    const proxyServer = {
      type: "https",
      tag: DNS_PROXY,
      server: globalDns.address,
      server_port: 443,
      path: "/dns-query",
      tls: { enabled: true, server_name: globalDns.serverName },
      // DNS proxying must never depend on a selector that contains DIRECT.
      ...options.dnsMode === "speed" ? {} : { detour: "\u26A1 \u5168\u90E8\u81EA\u52A8" }
    };
    return {
      servers: [chinaServer, proxyServer],
      rules: dnsRules(options),
      final: DNS_PROXY,
      strategy: options.ipv6Mode === "ipv4-only" ? "ipv4_only" : "prefer_ipv4",
      cache_capacity: 4096
    };
  }

  // ../sing-box/src/render-platform.js
  var COMMON_EXCLUDE = Object.freeze([
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
  ]);
  function renderSingBoxTun(platform, ipv6Mode = "auto") {
    if (!["macos", "windows", "iphone", "ipad", "android"].includes(platform)) {
      throw new Error(`Unsupported sing-box platform: ${platform}`);
    }
    const ipv4Only = ipv6Mode === "ipv4-only";
    return {
      type: "tun",
      tag: "tun-in",
      interface_name: platform === "android" ? "sing-box" : "singtun0",
      address: ipv4Only ? ["172.18.0.1/30"] : ["172.18.0.1/30", "fdfe:dcba:9876::1/126"],
      auto_route: true,
      strict_route: true,
      route_exclude_address: [...COMMON_EXCLUDE],
      dns_mode: "hijack",
      dns_address: ipv4Only ? ["172.18.0.2"] : ["172.18.0.2", "fdfe:dcba:9876::2"],
      ...platform === "android" ? { include_android_user: [0] } : { platform: { http_proxy: { enabled: false } } }
    };
  }

  // ../sing-box/src/validate-config.js
  function uniqueTags(records2, errors, label2) {
    const tags = /* @__PURE__ */ new Set();
    for (const record2 of records2 ?? []) {
      if (!record2 || typeof record2.tag !== "string" || record2.tag.length === 0) {
        errors.push(`${label2} tag missing`);
      } else if (tags.has(record2.tag)) {
        errors.push(`duplicate ${label2} tag`);
      } else {
        tags.add(record2.tag);
      }
    }
    return tags;
  }
  function actionOutbound(rule3) {
    return rule3?.action === "route" || rule3?.action === "bypass" ? rule3.outbound : void 0;
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
  function validateDnsRule(rule3, dnsServers, ruleSets, outboundTags, evaluateTags, errors) {
    if (!rule3 || typeof rule3 !== "object" || typeof rule3.action !== "string") {
      errors.push("DNS rule action must be a string");
      return;
    }
    for (const tag of rule3.rule_set ?? []) {
      if (!ruleSets.has(tag)) errors.push("DNS references missing rule-set tag");
    }
    if (rule3.action === "route" || rule3.action === "evaluate") {
      if (typeof rule3.server !== "string" || !dnsServers.has(rule3.server)) errors.push("DNS rule references missing server");
    }
    if (rule3.action === "respond" && rule3.server !== void 0) errors.push("DNS respond must not specify a server");
    if (rule3.action === "evaluate" && rule3.tag !== void 0) {
      if (typeof rule3.tag !== "string" || evaluateTags.has(rule3.tag)) errors.push("duplicate DNS evaluate tag");
      else evaluateTags.add(rule3.tag);
    }
    if (rule3.match_response !== void 0) {
      if (rule3.match_response !== true && (typeof rule3.match_response !== "string" || !evaluateTags.has(rule3.match_response))) {
        errors.push("DNS match_response references missing evaluate tag");
      }
      if (rule3.action === "route" && (typeof rule3.server !== "string" || !dnsServers.has(rule3.server))) {
        errors.push("DNS response route references missing server");
      }
    }
    if (rule3.ip_accept_any === true && rule3.match_response === void 0) errors.push("DNS ip_accept_any requires match_response");
    if (rule3.race === true && rule3.action !== "evaluate") errors.push("DNS race requires evaluate action");
    if (rule3.detour !== void 0 && !outboundTags.has(rule3.detour)) errors.push("DNS rule references missing outbound");
  }
  function validateSingBoxConfig(config) {
    const errors = [];
    if (!config || typeof config !== "object" || Array.isArray(config)) return { valid: false, errors: ["config must be an object"] };
    const outbounds = config.outbounds;
    const outboundTags = uniqueTags(outbounds, errors, "outbound");
    const endpointTags = uniqueTags(config.endpoints, errors, "endpoint");
    for (const tag of endpointTags) outboundTags.add(tag);
    const httpClientTags = uniqueTags(config.http_clients, errors, "HTTP client");
    const ruleSets = uniqueTags(config.route?.rule_set, errors, "rule-set");
    const dnsServers = uniqueTags(config.dns?.servers, errors, "DNS server");
    const groupTags = new Set((outbounds ?? []).filter((item) => ["selector", "urltest"].includes(item?.type)).map((item) => item.tag));
    for (const client of config.http_clients ?? []) {
      if (client.detour !== void 0 && !outboundTags.has(client.detour)) errors.push("HTTP client references missing outbound tag");
    }
    for (const outbound of outbounds ?? []) {
      for (const target of outbound.outbounds ?? []) if (!outboundTags.has(target)) errors.push("outbound references missing tag");
      if (outbound.default !== void 0) {
        if (!outboundTags.has(outbound.default)) errors.push("selector default references missing tag");
        else if (outbound.type === "selector" && !outbound.outbounds?.includes(outbound.default)) {
          errors.push("selector default is not an outbound candidate");
        }
      }
      if (outbound.type === "urltest" && typeof outbound.url !== "string") errors.push("urltest URL is missing");
    }
    for (const endpoint of config.endpoints ?? []) {
      if (endpoint.type === "wireguard" && (!Array.isArray(endpoint.address) || endpoint.address.length === 0)) {
        errors.push("WireGuard endpoint address is missing");
      }
    }
    const routeRules = config.route?.rules;
    if (!Array.isArray(routeRules)) errors.push("route rules missing");
    else if (routeRules.length > RULE_BUDGETS.startupInlineEntries) errors.push("route inline rule budget exceeded");
    for (const rule3 of routeRules ?? []) {
      if (Object.hasOwn(rule3, "geoip")) errors.push("route contains removed geoip");
      if (Object.hasOwn(rule3, "geosite")) errors.push("route contains removed geosite");
      for (const tag of rule3.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("route references missing rule-set tag");
      const target = actionOutbound(rule3);
      if (target !== void 0 && !outboundTags.has(target)) errors.push("route references missing outbound tag");
      if (rule3.action === "resolve" && rule3.server !== void 0 && (typeof rule3.server !== "string" || !dnsServers.has(rule3.server))) {
        errors.push("route resolve references missing DNS server");
      }
      if (rule3.action !== void 0 && typeof rule3.action !== "string") errors.push("route rule action must be a string");
    }
    const routeFinal = config.route?.final;
    if (typeof routeFinal !== "string" || !outboundTags.has(routeFinal)) errors.push("route final references missing outbound tag");
    if (config.route?.default_domain_resolver !== void 0) {
      const resolver = typeof config.route.default_domain_resolver === "string" ? config.route.default_domain_resolver : config.route.default_domain_resolver?.server;
      if (typeof resolver !== "string" || !dnsServers.has(resolver)) errors.push("default domain resolver references missing DNS server");
    }
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
    const evaluateTags = /* @__PURE__ */ new Set();
    for (const rule3 of config.dns?.rules ?? []) validateDnsRule(rule3, dnsServers, ruleSets, outboundTags, evaluateTags, errors);
    for (const server of config.dns?.servers ?? []) {
      validateDnsServerShape(server, errors);
      if (server.detour !== void 0 && !outboundTags.has(server.detour)) errors.push("DNS server references missing outbound");
      if (server.detour === server.tag) errors.push("DNS server loop detected");
      if (server.detour === "DIRECT") errors.push("DNS server must not detour through the empty DIRECT outbound");
    }
    for (const inbound2 of config.inbounds ?? []) {
      if (inbound2.type === "tun" && !inbound2.auto_route) errors.push("TUN auto_route is required");
      if (inbound2.type === "tun" && inbound2.platform?.include_android_user && inbound2.auto_redirect) errors.push("Android TUN cannot use auto_redirect");
    }
    if (Object.hasOwn(config.experimental?.cache_file ?? {}, "store_rdrc")) errors.push("cache file contains deprecated store_rdrc");
    if (!groupTags.has("\u{1F680} \u8282\u70B9\u9009\u62E9")) errors.push("primary selector missing");
    if (!new Set(config.inbounds?.map((item) => item.tag)).has("tun-in")) errors.push("tun-in inbound missing");
    return { valid: errors.length === 0, errors: [...new Set(errors)] };
  }

  // ../sing-box/src/render-config.js
  function renderSingBoxConfig(rawOptions, nodes, rendererOptions = {}) {
    if (Object.hasOwn(rendererOptions, "ruleSetFormat")) {
      throw new Error("Renderer option 'ruleSetFormat' was removed; migrate to profileMode and adblockMode");
    }
    const { ruleBaseUrl, policyResolution = null } = rendererOptions;
    const options = isParsedSingBoxOptions(rawOptions) ? rawOptions : parseSingBoxOptions(rawOptions);
    const inventory = Array.isArray(nodes) ? nodes : [];
    if (inventory.length === 0) throw new Error("sing-box refuses an empty node inventory");
    for (const node of inventory) nodeMetadata(node);
    const renderedNodes = inventory.map(renderSingBoxNode);
    const groups = renderSingBoxGroups(options, inventory, {
      policyResolution,
      ruleProbeUrl: `${ruleBaseUrl.replace(/\/+$/u, "")}/Hijacking.srs`
    });
    const { ruleSets, rules, final } = renderSingBoxRouteRules({
      ruleBaseUrl,
      profileMode: options.profileMode,
      adblockMode: options.adblockMode,
      blockMode: options.blockMode,
      quicMode: options.quicMode,
      platform: options.platform,
      chinaDns: options.chinaDns,
      globalDns: options.globalDns,
      dnsMode: options.dnsMode
    });
    const config = {
      log: {
        level: ["iphone", "ipad"].includes(options.platform) ? "warn" : "info",
        timestamp: true
      },
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
        ...renderedNodes.flatMap(({ outbound }) => outbound ? [outbound] : [])
      ],
      route: {
        auto_detect_interface: true,
        default_domain_resolver: "dns-direct",
        default_http_client: RULE_DOWNLOAD_HTTP_CLIENT,
        rule_set: ruleSets,
        rules,
        final
      },
      experimental: {
        cache_file: {
          enabled: !["iphone", "ipad"].includes(options.platform),
          path: "cache.db",
          store_dns: !["iphone", "ipad"].includes(options.platform)
        }
      }
    };
    const endpoints = renderedNodes.flatMap(({ endpoint }) => endpoint ? [endpoint] : []);
    if (endpoints.length > 0) config.endpoints = endpoints;
    const validation = validateSingBoxConfig(config);
    if (!validation.valid) throw new Error(`Generated sing-box config failed validation: ${validation.errors.join(",")}`);
    return config;
  }

  // src/substore-config-entry.js
  async function operator(input, targetPlatform, context = {}) {
    const options = parseV2rayNOptions({ ...context.arguments ?? {}, output: "config" });
    if (targetPlatform !== void 0 && targetPlatform !== "JSON" && targetPlatform !== options.platform) {
      throw new Error("v2rayN target platform '" + targetPlatform + "' does not match " + options.platform);
    }
    if (typeof context.produceArtifact !== "function") throw new Error("v2rayN produceArtifact is unavailable");
    const raw = await context.produceArtifact({ type: "collection", name: options.name, platform: "JSON", produceType: "internal" });
    const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
    const filtered = filterNodesForClient(normalized.nodes, CLIENT.v2rayn);
    const policy = await loadSubstorePolicyArtifact(context);
    const policyResolution = resolveUnifiedPolicy({
      policy,
      channel: options.channel,
      client: CLIENT.v2rayn,
      allNodes: normalized.nodes,
      eligibleNodes: filtered.nodes
    });
    context.logger?.info?.("[v2rayn-config] " + JSON.stringify({ accepted: filtered.nodes.length, renderFailures: filtered.diagnostics.excluded }));
    if (options.core === "singbox") {
      const singboxOptions = {
        output: "config",
        type: "collection",
        name: options.name,
        subscriptionName: options.subscriptionName,
        platform: options.platform,
        channel: options.channel,
        dnsMode: options.dnsMode,
        chinaDns: options.chinaDns,
        globalDns: options.globalDns,
        blockMode: options.blockMode,
        quicMode: options.quicMode,
        ipv6Mode: options.ipv6Mode,
        autoGroupMode: "auto",
        clientChain: options.clientChain,
        profileMode: "light",
        adblockMode: "off",
        nodeErrorMode: "strict"
      };
      const config = renderSingBoxConfig(singboxOptions, filtered.nodes, {
        ruleBaseUrl: `https://juan-nikola.github.io/apple-proxy-profiles/${options.channel}/sing-box/rule-sets`,
        policyResolution
      });
      return { ...input, $content: JSON.stringify(config, null, 2) + "\n" };
    }
    const profile = renderV2rayNProfile({
      options,
      nodes: filtered.nodes,
      geoData: context.geoData,
      filterFailures: filtered.diagnostics.excluded,
      policyResolution
    });
    return { ...input, $content: JSON.stringify(profile, null, 2) + "\n" };
  }
  return __toCommonJS(substore_config_entry_exports);
})();
async function operator(input, targetPlatform) { return V2rayNConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console }); }
