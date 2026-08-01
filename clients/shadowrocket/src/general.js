import { dnsSettings } from "./dns.js";

const IPV6_MODES = new Set(["auto", "ipv4-only"]);
const QUIC_MODES = Object.freeze({
  allow: "always-allow",
  "proxy-block": "all-proxy",
  "all-block": "all",
});
const CLIENT_CHAIN_MODES = new Set(["off", "on"]);

const SKIP_PROXY = "127.0.0.1,localhost,*.local,*.lan,*.home.arpa,10.0.0.0/8,100.64.0.0/10,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,fc00::/7,fe80::/10";
const TUN_EXCLUDED_ROUTES = "10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,224.0.0.0/4,::1/128,fc00::/7,fe80::/10,ff00::/8";

function optionValue(options, key, allowed) {
  const value = options?.[key];
  if (!allowed.has(value)) {
    throw new Error(`Unsupported ${key}: ${value}`);
  }
  return value;
}

/**
 * Render General settings that are supported consistently across platforms.
 *
 * @param {{ipv6Mode: string, quicMode: string, clientChain: string}} options
 * @returns {string[]}
 */
export function generalSettings(options) {
  const ipv6Mode = optionValue(options, "ipv6Mode", IPV6_MODES);
  const quicMode = optionValue(options, "quicMode", new Set(Object.keys(QUIC_MODES)));
  const clientChain = optionValue(options, "clientChain", CLIENT_CHAIN_MODES);

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
    ...dnsSettings(options),
  ];
}

