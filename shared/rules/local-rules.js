/**
 * Private/local network rule lines shared across clients.
 *
 * These are the fixed "always direct" rules for private networks, link-local
 * addresses, and on-device/local domain suffixes. Every client emits the same
 * set, only the line syntax differs. Keeping them in one place prevents drift
 * between Shadowrocket and Surge (and gives other clients a single reference
 * point).
 */
export const LOCAL_RULES = Object.freeze([
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
  "IP-CIDR6,ff00::/8,DIRECT,no-resolve",
]);

