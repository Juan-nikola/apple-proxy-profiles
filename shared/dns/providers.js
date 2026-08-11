const CHINA_DNS_PROVIDERS = Object.freeze({
  alidns: Object.freeze({
    address: "223.5.5.5",
    doh: "https://dns.alidns.com/dns-query",
  }),
  dnspod: Object.freeze({
    address: "119.29.29.29",
    doh: "https://doh.pub/dns-query",
  }),
  system: Object.freeze({
    address: "local",
    doh: "system",
  }),
});

const GLOBAL_DNS_PROVIDERS = Object.freeze({
  cloudflare: Object.freeze({
    address: "1.1.1.1",
    serverName: "cloudflare-dns.com",
    doh: "https://cloudflare-dns.com/dns-query",
  }),
  google: Object.freeze({
    address: "8.8.8.8",
    serverName: "dns.google",
    doh: "https://dns.google/dns-query",
  }),
  quad9: Object.freeze({
    address: "9.9.9.9",
    serverName: "dns.quad9.net",
    doh: "https://dns.quad9.net/dns-query",
  }),
});

function provider(providers, id, label) {
  const value = providers[id];
  if (!value) throw new Error(`Unsupported ${label} DNS provider`);
  return value;
}

export function chinaDnsProvider(id) {
  return provider(CHINA_DNS_PROVIDERS, id, "China");
}

export function globalDnsProvider(id) {
  return provider(GLOBAL_DNS_PROVIDERS, id, "global");
}
