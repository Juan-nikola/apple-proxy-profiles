import assert from "node:assert/strict";
import test from "node:test";

import { dnsSettings } from "../src/dns.js";
import { generalSettings } from "../src/general.js";

function options(overrides = {}) {
  return {
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    ipv6Mode: "auto",
    quicMode: "allow",
    clientChain: "off",
    ...overrides,
  };
}

function setting(lines, key) {
  return lines.filter((line) => line.startsWith(`${key} = `));
}

const GENERAL_KEYS = [
  "skip-proxy",
  "tun-excluded-routes",
  "bypass-system",
  "udp-policy-not-supported-behaviour",
  "allow-dns-svcb",
  "allow-dns-all",
  "proxy-dns-server",
  "ipv6",
  "prefer-ipv6",
  "ipv6-only-if-no-ipv4-dns",
  "block-quic",
  "close-if-proxy-chain-missing",
  "dns-server",
  "fallback-dns-server",
  "dns-direct-system",
  "dns-direct-fallback-proxy",
  "private-ip-answer",
  "hijack-dns",
];

test("renders stable DNS with a proxied global fallback", () => {
  const lines = dnsSettings(options());

  assert.deepEqual(lines, [
    "dns-server = https://dns.alidns.com/dns-query",
    "fallback-dns-server = https://cloudflare-dns.com/dns-query#proxy=%F0%9F%A7%AD%20DNS%20%E4%B8%8E%E8%A7%84%E5%88%99%E4%B8%8B%E8%BD%BD",
    "dns-direct-system = false",
    "dns-direct-fallback-proxy = true",
    "private-ip-answer = true",
    "hijack-dns = *:53",
  ]);
});

test("renders one direct and fallback DNS server for every supported DNS matrix", () => {
  const chinaDns = {
    alidns: "https://dns.alidns.com/dns-query",
    dnspod: "https://doh.pub/dns-query",
    system: "system",
  };
  const globalDns = {
    cloudflare: "https://cloudflare-dns.com/dns-query",
    google: "https://dns.google/dns-query",
    quad9: "https://dns.quad9.net/dns-query",
  };

  for (const dnsMode of ["stable", "privacy", "speed"]) {
    for (const [chinaName, chinaServer] of Object.entries(chinaDns)) {
      for (const [globalName, globalServer] of Object.entries(globalDns)) {
        const lines = dnsSettings(options({ dnsMode, chinaDns: chinaName, globalDns: globalName }));
        const direct = setting(lines, "dns-server");
        const fallback = setting(lines, "fallback-dns-server");

        assert.equal(direct.length, 1, `${dnsMode}/${chinaName}/${globalName} direct server count`);
        assert.equal(fallback.length, 1, `${dnsMode}/${chinaName}/${globalName} fallback server count`);
        assert.deepEqual(setting(lines, "private-ip-answer"), ["private-ip-answer = true"]);
        assert.equal(direct[0], `dns-server = ${dnsMode === "privacy" && chinaName === "system" ? chinaDns.alidns : chinaServer}`);
        assert.equal(
          fallback[0],
          `fallback-dns-server = ${globalServer}${dnsMode === "speed" ? "" : "#proxy=%F0%9F%A7%AD%20DNS%20%E4%B8%8E%E8%A7%84%E5%88%99%E4%B8%8B%E8%BD%BD"}`,
        );
        assert.equal(lines.includes("dns-server = undefined"), false);
        assert.equal(lines.includes("fallback-dns-server = undefined"), false);
      }
    }
  }
});

test("URL-encodes the named DNS proxy fragment", () => {
  const rendered = generalSettings(options()).join("\n");
  assert.match(rendered, /#proxy=%F0%9F%A7%AD%20DNS%20%E4%B8%8E%E8%A7%84%E5%88%99%E4%B8%8B%E8%BD%BD/);
  assert.doesNotMatch(rendered, /#proxy=🧭 DNS 与规则下载/);
});

test("configures DNS mode-specific system, privacy, and bootstrap behavior", () => {
  const privacySystem = dnsSettings(options({ dnsMode: "privacy", chinaDns: "system" }));
  assert.ok(privacySystem.includes("dns-server = https://dns.alidns.com/dns-query"));
  assert.ok(privacySystem.includes("dns-direct-system = false"));
  assert.ok(privacySystem.includes("dns-direct-fallback-proxy = true"));

  const speedSystem = dnsSettings(options({ dnsMode: "speed", chinaDns: "system" }));
  assert.ok(speedSystem.includes("dns-direct-system = true"));
  assert.ok(speedSystem.includes("dns-direct-fallback-proxy = false"));
});

test("renders IPv6, client-chain, and platform-safe general settings", () => {
  const auto = generalSettings(options({ clientChain: "on" }));
  assert.ok(auto.includes("ipv6 = true"));
  assert.ok(auto.includes("tun-excluded-routes = 10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,224.0.0.0/4,::1/128,fc00::/7,fe80::/10,ff00::/8"));
  assert.ok(auto.includes("close-if-proxy-chain-missing = true"));
  assert.ok(auto.includes("skip-proxy = 127.0.0.1,localhost,*.local,*.lan,*.home.arpa,10.0.0.0/8,100.64.0.0/10,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,fc00::/7,fe80::/10"));
  assert.ok(auto.includes("bypass-system = true"));
  assert.ok(auto.includes("udp-policy-not-supported-behaviour = REJECT"));
  assert.ok(auto.includes("allow-dns-svcb = false"));
  assert.ok(auto.includes("allow-dns-all = false"));
  assert.ok(auto.includes("proxy-dns-server = system"));
  assert.ok(auto.includes("prefer-ipv6 = false"));
  assert.ok(auto.includes("ipv6-only-if-no-ipv4-dns = true"));

  const ipv4Only = generalSettings(options({ ipv6Mode: "ipv4-only" }));
  assert.ok(ipv4Only.includes("ipv6 = false"));
  assert.ok(ipv4Only.includes("close-if-proxy-chain-missing = false"));
});

test("renders each general key once across the DNS, IPv6, QUIC, and chain matrix", () => {
  for (const dnsMode of ["stable", "privacy", "speed"]) {
    for (const chinaDns of ["alidns", "dnspod", "system"]) {
      for (const globalDns of ["cloudflare", "google", "quad9"]) {
        for (const ipv6Mode of ["auto", "ipv4-only"]) {
          for (const quicMode of ["allow", "proxy-block", "all-block"]) {
            for (const clientChain of ["off", "on"]) {
              const lines = generalSettings(options({ dnsMode, chinaDns, globalDns, ipv6Mode, quicMode, clientChain }));
              const scenario = `${dnsMode}/${chinaDns}/${globalDns}/${ipv6Mode}/${quicMode}/${clientChain}`;

              assert.equal(lines.length, GENERAL_KEYS.length, scenario);
              for (const key of GENERAL_KEYS) {
                assert.equal(setting(lines, key).length, 1, `${scenario} ${key}`);
              }
              assert.deepEqual(setting(lines, "proxy-dns-server"), ["proxy-dns-server = system"], scenario);

              const privateNetworks = lines.filter((line) => line.startsWith("skip-proxy = ") || line.startsWith("tun-excluded-routes = "));
              for (const publicIpv6Prefix of ["2000::/3", "2001:", "2400:", "2600:"]) {
                assert.equal(privateNetworks.some((line) => line.includes(publicIpv6Prefix)), false, `${scenario} ${publicIpv6Prefix}`);
              }
            }
          }
        }
      }
    }
  }
});

test("maps each QUIC choice to the corresponding general setting", () => {
  assert.ok(generalSettings(options({ quicMode: "allow" })).includes("block-quic = always-allow"));
  assert.ok(generalSettings(options({ quicMode: "proxy-block" })).includes("block-quic = all-proxy"));
  assert.ok(generalSettings(options({ quicMode: "all-block" })).includes("block-quic = all"));
});

test("rejects unsupported DNS and general values defensively", () => {
  assert.throws(() => dnsSettings(options({ dnsMode: "invalid" })), /dnsMode/i);
  assert.throws(() => dnsSettings(options({ chinaDns: "invalid" })), /chinaDns/i);
  assert.throws(() => dnsSettings(options({ globalDns: "invalid" })), /globalDns/i);
  assert.throws(() => generalSettings(options({ ipv6Mode: "invalid" })), /ipv6Mode/i);
  assert.throws(() => generalSettings(options({ quicMode: "invalid" })), /quicMode/i);
  assert.throws(() => generalSettings(options({ clientChain: "invalid" })), /clientChain/i);
});

