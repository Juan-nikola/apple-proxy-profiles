import { OPTION_VALUES } from "../../../shared/contracts.js";
import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../../shared/rules/domestic-fallback.js";
import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { PUBLIC_RULE_ROOT } from "./options.js";

const proxyDnsSourceIds = Object.freeze(
  orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id),
);

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
  if (!FRONTIER_CHANNELS.some((channel) => value === `${PUBLIC_RULE_ROOT}/${channel}`)) {
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

function proxyRule(baseUrl, id) {
  return {
    proxy_rule_set: {
      match: `${baseUrl}/egern/rules/${id}.yaml`,
      value: "global",
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
  } else {
    forward = [
      ...proxyDnsSourceIds.map((id) => proxyRule(baseUrl, id)),
      ...domesticFallbackRules(),
      chinaRule(baseUrl),
      wildcard("china"),
    ];
  }

  return {
    bootstrap: ["system"],
    upstreams: {
      china: [chinaDnsProvider(chinaDns).doh],
      global: [globalDnsProvider(globalDns).doh],
    },
    forward,
    proxy_nameservers: ["system"],
  };
}
