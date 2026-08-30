import {
  mobileRuleClientCatalog,
  orderedRoutingPlan,
  ruleClientCatalog,
  usesClashMobileRuleBundles,
} from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { LEAK_GROUP_NAME } from "../../../shared/policies/catalog.js";

const PRIVATE_RULES = [
  "DOMAIN-SUFFIX,local,DIRECT",
  "DOMAIN-SUFFIX,lan,DIRECT",
  "DOMAIN-SUFFIX,home.arpa,DIRECT",
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
  "IP-CIDR6,ff00::/8,DIRECT,no-resolve",
];

function validateBase(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s]+\/(?:edge|current|previous)$/u.test(value)) {
    throw new Error("Clash rule base must be a fixed public channel URL");
  }
  return value;
}

function activeRuleCatalog(platform, adblockMode) {
  if (usesClashMobileRuleBundles(platform)) {
    if (adblockMode === "full") {
      throw new Error("Option 'adblockMode=full' exceeds the mobile Clash memory budget");
    }
    return mobileRuleClientCatalog();
  }
  return ruleClientCatalog({ adblockMode });
}

function providerUrl(base, id, adblockMode, platform) {
  const root = adblockMode === "full" && ["Advertising", "Advertising_Domain"].includes(id)
    ? base.replace(/\/(?:edge|current|previous)$/u, "/optional/adblock-full")
    : base;
  const directory = usesClashMobileRuleBundles(platform) ? "mobile-rules" : "rules";
  return root + "/clash/" + directory + "/" + id + ".yaml";
}

export function renderClashRules({ publicBaseUrl, platform = "macos", adblockMode = "off" } = {}) {
  const base = validateBase(publicBaseUrl);
  if (adblockMode !== "off" && adblockMode !== "full") throw new Error("Clash adblockMode is unsupported");
  const mobile = usesClashMobileRuleBundles(platform);
  const plan = mobile ? activeRuleCatalog(platform, adblockMode) : orderedRoutingPlan({ adblockMode });
  const catalog = activeRuleCatalog(platform, adblockMode);
  const providers = {};
  for (const source of catalog) {
    providers[source.id] = {
      type: "http",
      behavior: "classical",
      format: "yaml",
      path: "./" + (mobile ? "mobile-rules/" : "rules/") + source.id + ".yaml",
      url: providerUrl(base, source.id, adblockMode, platform),
      interval: 86400,
    };
  }
  const rules = [
    ...PRIVATE_RULES,
    ...CUSTOM_RULES.block.map((rule) => `${rule},REJECT`),
    ...CUSTOM_RULES.direct.map((rule) => `${rule},DIRECT`),
    ...CUSTOM_RULES.proxy.map((rule) => `${rule},🚀 节点选择`),
    ...CUSTOM_RULES.ai.map((rule) => `${rule},🤖 AI 专用`),
  ];
  for (const source of plan) rules.push("RULE-SET," + source.id + "," + source.policy);
  rules.push("GEOIP,CN,DIRECT", "MATCH," + LEAK_GROUP_NAME);
  return Object.freeze({ providers: Object.freeze(providers), rules: Object.freeze(rules) });
}
