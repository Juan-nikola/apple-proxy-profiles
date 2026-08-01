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
    "hijack-dns = *:53",
  ];
}

