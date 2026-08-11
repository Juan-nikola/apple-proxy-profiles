import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";

const DNS_MODES = new Set(["stable", "privacy", "speed"]);
const DNS_PROXY = `#proxy=${encodeURIComponent("🧭 DNS 与规则下载")}`;

function optionValue(options, key, allowed) {
  const value = options?.[key];
  if (!allowed.has(value)) {
    throw new Error(`Unsupported ${key}: ${value}`);
  }
  return value;
}

/**
 * Render the DNS-related General section settings for Shadowrocket.
 *
 * @param {{dnsMode: string, chinaDns: string, globalDns: string}} options
 * @returns {string[]}
 */
export function dnsSettings(options) {
  const dnsMode = optionValue(options, "dnsMode", DNS_MODES);
  const chinaDns = optionValue(options, "chinaDns", new Set(["alidns", "dnspod", "system"]));
  const globalDns = optionValue(options, "globalDns", new Set(["cloudflare", "google", "quad9"]));
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
    "hijack-dns = *:53",
  ];
}
