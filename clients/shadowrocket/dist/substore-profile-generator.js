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

  // ../../../shared/contracts.js
  var CLIENT = Object.freeze({
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere"
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

  // options.js
  var REQUIRED_KEYS = Object.freeze([
    "output",
    "type",
    "name",
    "subscriptionName",
    "platform"
  ]);
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
  var ALLOWED_KEYS = /* @__PURE__ */ new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);
  var PLATFORM_PRESETS = Object.freeze({
    macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
    iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
    appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200 })
  });
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
      options[key] = key === "subscriptionName" ? subscriptionDisplayName(raw) : OPTION_VALUES[key] ? enumValue(raw, key) : requiredString(raw, key);
    }
    for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
      const platformDefault = key === "ipv6Mode" && options.platform === "macos" ? "ipv4-only" : defaultValue;
      options[key] = Object.hasOwn(raw, key) && raw[key] !== void 0 ? enumValue(raw, key) : platformDefault;
    }
    return options;
  }
  function platformPreset(platform) {
    if (typeof platform !== "string" || !Object.hasOwn(PLATFORM_PRESETS, platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return PLATFORM_PRESETS[platform];
  }

  // dns.js
  var CHINA_DNS = Object.freeze({
    alidns: "https://dns.alidns.com/dns-query",
    dnspod: "https://doh.pub/dns-query",
    system: "system"
  });
  var GLOBAL_DNS = Object.freeze({
    cloudflare: "https://cloudflare-dns.com/dns-query",
    google: "https://dns.google/dns-query",
    quad9: "https://dns.quad9.net/dns-query"
  });
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
    const chinaDns = optionValue(options, "chinaDns", new Set(Object.keys(CHINA_DNS)));
    const globalDns = optionValue(options, "globalDns", new Set(Object.keys(GLOBAL_DNS)));
    const privacySystemDns = dnsMode === "privacy" && chinaDns === "system";
    const globalUsesProxy = dnsMode !== "speed";
    return [
      `dns-server = ${privacySystemDns ? CHINA_DNS.alidns : CHINA_DNS[chinaDns]}`,
      `fallback-dns-server = ${GLOBAL_DNS[globalDns]}${globalUsesProxy ? DNS_PROXY : ""}`,
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

  // ../../../shared/policies/filters.js
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
    const preset = platformPreset(options.platform);
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
    groups.push(policyGroup({ kind: GROUP_KIND.primary, name: "\u{1F680} \u8282\u70B9\u9009\u62E9", candidates: ["PROXY"] }));
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

  // group-catalog.js
  function buildGroups(options, nodes) {
    return buildPolicyGroups(options, nodes).map((group) => ({
      name: group.name,
      type: group.strategy === "auto-test" ? "url-test" : group.strategy,
      items: group.candidates,
      useSubscription: group.nodeFilter === null ? void 0 : true,
      filter: group.nodeFilter ?? void 0,
      url: group.test?.url,
      interval: group.test?.interval,
      timeout: group.test?.timeout,
      tolerance: group.test?.tolerance,
      hidden: group.hidden,
      policySelectName: group.defaultChoice
    }));
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

  // ../../../shared/rules/custom-rules.js
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

  // custom-rules.js
  var {
    block: CUSTOM_BLOCK,
    direct: CUSTOM_DIRECT,
    proxy: CUSTOM_PROXY,
    ai: CUSTOM_AI
  } = CUSTOM_RULES;

  // ../../../shared/rules/catalog.js
  var RULE_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";
  function rule(id, policy, minEntries, inputFormat = "RULE-SET", directory = id) {
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
  var RULE_SOURCE_CATALOG = Object.freeze([
    rule("Hijacking", "\u2623\uFE0F \u5B89\u5168\u5A01\u80C1", 150),
    rule("BlockHttpDNS", "\u2623\uFE0F \u5B89\u5168\u5A01\u80C1", 40),
    rule("Advertising", "\u{1F9F1} \u5E38\u89C1\u5E7F\u544A", 1e4),
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
  function orderedRuleAssignments() {
    return RULE_SOURCE_CATALOG.map(({ id, policy }) => Object.freeze({ sourceId: id, policy }));
  }

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
      const expectedOperands = fields[0] === "NOT" ? 1 : 2;
      return fields.length === expectedOperands + 1 && fields.slice(1).every(isLogicalOperand);
    }
    if (!/^[A-Z][A-Z0-9-]*$/.test(fields[0]) || fields.length < 2) return false;
    return isValidLogicalLeaf(fields[0], fields.slice(1).join(","));
  }
  function isValidLogicalExpression(type, target) {
    if (type === "NOT" && isLogicalOperand(target)) return true;
    const inner = parenthesizedInner(target);
    if (!inner) return false;
    const operands = topLevelFields(inner);
    const expectedOperands = type === "NOT" ? 1 : 2;
    return operands?.length === expectedOperands && operands.every(isLogicalOperand);
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
  var CUSTOM_RULES2 = Object.freeze([
    Object.freeze(["CUSTOM_BLOCK", CUSTOM_BLOCK, "REJECT"]),
    Object.freeze(["CUSTOM_DIRECT", CUSTOM_DIRECT, "DIRECT"]),
    Object.freeze(["CUSTOM_PROXY", CUSTOM_PROXY, "\u{1F680} \u8282\u70B9\u9009\u62E9"]),
    Object.freeze(["CUSTOM_AI", CUSTOM_AI, "\u{1F916} AI \u4E13\u7528"])
  ]);
  var GAME_DIRECT_RULES = Object.freeze([
    "DOMAIN-SUFFIX,leiting.com,DIRECT",
    "DOMAIN-SUFFIX,leitingcn.com,DIRECT",
    "DOMAIN-SUFFIX,g-bits.com,DIRECT"
  ]);
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
      for (const rule2 of entry[1]) {
        if (typeof rule2 !== "string" || /[\r\n]/.test(rule2) || rule2.trim() !== rule2) {
          throw new Error("Invalid custom rule");
        }
        if (rule2.split(",").length !== 2 || !isValidRuleLine(rule2)) {
          throw new Error("Invalid custom rule");
        }
        if (seen.has(rule2)) throw new Error("Duplicate custom rule");
        seen.add(rule2);
      }
    }
  }
  function validatedCatalog(assignments) {
    const entriesById = /* @__PURE__ */ new Map();
    for (const entry of RULE_SOURCE_CATALOG) {
      const entries = entriesById.get(entry.id) ?? [];
      entries.push(entry);
      entriesById.set(entry.id, entries);
    }
    for (const { sourceId, policy } of assignments) {
      const entries = entriesById.get(sourceId);
      if (entries?.length !== 1 || entries[0].policy !== policy) {
        throw new Error(`Invalid rule catalog entry: ${sourceId}`);
      }
    }
    return entriesById;
  }
  function catalogRule(entriesById, assignment) {
    return entriesById.get(assignment.sourceId)[0];
  }
  function renderRuleSet(entry) {
    return `${entry.inputFormat},${entry.upstreamUrl},${entry.policy},update-interval=86400`;
  }
  function renderRules() {
    validateCustomRules(CUSTOM_RULES2);
    const assignments = orderedRuleAssignments();
    const entriesById = validatedCatalog(assignments);
    const steamIndex = assignments.findIndex(({ sourceId }) => sourceId === "SteamCN");
    const gameIndex = assignments.findIndex(({ sourceId }) => sourceId === "Game");
    if (steamIndex < 0 || gameIndex <= steamIndex) throw new Error("Invalid rule assignment order");
    const preGameAssignments = assignments.slice(0, steamIndex);
    const domesticBeforeGameAssignments = assignments.slice(steamIndex, gameIndex);
    const gameAssignment = assignments[gameIndex];
    const postGameAssignments = assignments.slice(gameIndex + 1);
    const lines = [...LOCAL_RULES, "# Custom rules"];
    for (const [name, rules, policy] of CUSTOM_RULES2) {
      lines.push(`# ${name}`);
      lines.push(...rules.map((rule2) => `${rule2},${policy}`));
    }
    lines.push(...preGameAssignments.map((assignment) => renderRuleSet(catalogRule(entriesById, assignment))));
    lines.push(...GAME_DIRECT_RULES);
    lines.push(...domesticBeforeGameAssignments.map((assignment) => renderRuleSet(catalogRule(entriesById, assignment))));
    const game = catalogRule(entriesById, gameAssignment);
    lines.push(`AND,((PROTOCOL,UDP),(RULE-SET,${game.upstreamUrl})),\u{1F3AE} \u6E38\u620F\u8FDE\u63A5`);
    lines.push(renderRuleSet(game));
    lines.push(...postGameAssignments.map((assignment) => renderRuleSet(catalogRule(entriesById, assignment))));
    lines.push("GEOIP,CN,DIRECT", "FINAL,\u{1F680} \u8282\u70B9\u9009\u62E9");
    return lines;
  }

  // render-profile.js
  var NODE_REFRESH_SECONDS = 21600;
  var RULE_REFRESH_SECONDS = 86400;
  function renderProfile(rawOptions, nodes) {
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
    const groups = renderGroups(buildGroups(options, inventory), options.subscriptionName).join("\n");
    return [
      header,
      `[General]
${generalSettings(options).join("\n")}`,
      `[Proxy Group]
${groups}`,
      `[Rule]
${renderRules().join("\n")}`
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
  function validateLogicalRule(type, rule2, groups, errors) {
    const topLevel = topLevelFields2(rule2);
    const escapedFields = escapedCommaFields(rule2);
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
    for (const rule2 of rules) {
      const fields = escapedCommaFields(rule2);
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
        validateLogicalRule(type, rule2, groups, errors);
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
    const profile = renderProfile(options, nodes);
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
