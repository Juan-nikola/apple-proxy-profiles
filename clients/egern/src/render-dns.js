import { OPTION_VALUES } from "../../../shared/contracts.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../../shared/rules/domestic-fallback.js";
import { PUBLIC_RULE_ROOT } from "./options.js";

const CHINA_DNS = Object.freeze({
  alidns: "https://dns.alidns.com/dns-query",
  dnspod: "https://doh.pub/dns-query",
  system: "system",
});

const GLOBAL_DNS = Object.freeze({
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/dns-query",
  quad9: "https://dns.quad9.net/dns-query",
});

function safeOption(options, key) {
  const descriptor = Object.getOwnPropertyDescriptor(options, key);
  if (!descriptor || "get" in descriptor || "set" in descriptor) {
    throw new Error(`DNS option '${key}' must be an own data property`);
  }
  return descriptor.value;
}

function validatedEnum(options, key) {
  const value = safeOption(options, key);
  if (typeof value !== "string" || !OPTION_VALUES[key].includes(value)) {
    throw new Error(`DNS option '${key}' has an unsupported value`);
  }
  return value;
}

function publicBaseUrl(options) {
  if (!Object.hasOwn(options, "publicBaseUrl")) {
    throw new Error("DNS option 'publicBaseUrl' is required");
  }
  const value = safeOption(options, "publicBaseUrl");
  if (value !== `${PUBLIC_RULE_ROOT}/edge` && value !== `${PUBLIC_RULE_ROOT}/current`) {
    throw new Error("DNS option 'publicBaseUrl' must use the fixed public snapshot base");
  }
  return value;
}

function chinaRule(baseUrl) {
  return {
    proxy_rule_set: {
      match: `${baseUrl}/egern/rules/DomesticCore.yaml`,
      value: "china",
      update_interval: 86400,
    },
  };
}

function domesticFallbackRules(value = "china") {
  return DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.map((match) => ({
    domain_suffix: { match, value },
  }));
}

function wildcard(value) {
  return { domain_wildcard: { match: "*", value } };
}

export function renderEgernDns(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Egern DNS options must be an object");
  }

  const dnsMode = validatedEnum(options, "dnsMode");
  const chinaDns = validatedEnum(options, "chinaDns");
  const globalDns = validatedEnum(options, "globalDns");
  const baseUrl = publicBaseUrl(options);

  let forward;
  if (dnsMode === "privacy") {
    forward = [wildcard("global")];
  } else if (dnsMode === "speed") {
    forward = [...domesticFallbackRules(), chinaRule(baseUrl), wildcard("system")];
  } else {
    forward = [...domesticFallbackRules(), chinaRule(baseUrl), wildcard("global")];
  }

  return {
    bootstrap: ["system"],
    upstreams: {
      china: [CHINA_DNS[chinaDns]],
      global: [GLOBAL_DNS[globalDns]],
    },
    forward,
    proxy_nameservers: ["system"],
  };
}
