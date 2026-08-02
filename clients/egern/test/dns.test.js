import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { renderEgernDns } from "../src/render-dns.js";
import { renderYaml } from "../src/render-yaml.js";
import {
  PUBLIC_SNAPSHOT_BASE_URL,
  parseEgernOptions,
} from "../src/options.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes";
const CHINA_RULE_URL = `${PUBLIC_SNAPSHOT_BASE_URL}/egern/china-domains.yaml`;

function options(overrides = {}) {
  return parseEgernOptions({
    output: "config",
    type: "collection",
    name: "egern-sources",
    nodeSubscriptionUrl: PRIVATE_URL,
    platform: "macos",
    ...overrides,
  });
}

function chinaRule(value = "china") {
  return {
    proxy_rule_set: {
      match: CHINA_RULE_URL,
      value,
      update_interval: 86400,
    },
  };
}

function wildcard(value) {
  return { domain_wildcard: { match: "*", value } };
}

test("renders the exact stable DNS object in documented declaration order", () => {
  const dns = renderEgernDns(options());
  assert.deepEqual(dns, {
    bootstrap: ["system"],
    upstreams: {
      china: ["https://dns.alidns.com/dns-query"],
      global: ["https://cloudflare-dns.com/dns-query"],
    },
    forward: [chinaRule(), wildcard("global")],
    proxy_nameservers: ["system"],
  });
  assert.deepEqual(Object.keys(dns), ["bootstrap", "upstreams", "forward", "proxy_nameservers"]);
  assert.deepEqual(Object.keys(dns.upstreams), ["china", "global"]);
  assert.deepEqual(Object.keys(dns.forward[0].proxy_rule_set), ["match", "value", "update_interval"]);
});

test("renders privacy without a China exception and speed with a direct system catch-all", () => {
  assert.deepEqual(renderEgernDns(options({ dnsMode: "privacy" })).forward, [wildcard("global")]);
  assert.deepEqual(renderEgernDns(options({ dnsMode: "speed" })).forward, [
    chinaRule(),
    wildcard("system"),
  ]);
});

test("maps every documented China and global provider", () => {
  const china = {
    alidns: "https://dns.alidns.com/dns-query",
    dnspod: "https://doh.pub/dns-query",
    system: "system",
  };
  const global = {
    cloudflare: "https://cloudflare-dns.com/dns-query",
    google: "https://dns.google/dns-query",
    quad9: "https://dns.quad9.net/dns-query",
  };

  for (const [chinaDns, chinaUrl] of Object.entries(china)) {
    for (const [globalDns, globalUrl] of Object.entries(global)) {
      for (const dnsMode of ["stable", "privacy", "speed"]) {
        const dns = renderEgernDns(options({ chinaDns, globalDns, dnsMode }));
        assert.deepEqual(dns.upstreams, { china: [chinaUrl], global: [globalUrl] });
      }
    }
  }
});

test("never emits private inputs or unrequested DNS weakening and experimental fields", () => {
  const dns = renderEgernDns(options());
  const serialized = JSON.stringify(dns);
  assert.equal(serialized.includes(PRIVATE_URL), false);
  assert.equal(serialized.includes("egern-nodes"), false);
  for (const forbidden of ["skip_tls_verify", "public_ip_lookup_url", "quic://", "h3://", "ecs"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(dns.bootstrap, ["system"]);
  assert.deepEqual(dns.proxy_nameservers, ["system"]);
});

test("rejects mutated DNS and public-base options without exposing rejected values", () => {
  const secret = "TEST_ONLY_PRIVATE_DNS_VALUE";
  for (const [key, value] of [
    ["dnsMode", secret],
    ["chinaDns", secret],
    ["globalDns", secret],
    ["publicBaseUrl", `https://example.invalid/${secret}`],
  ]) {
    assert.throws(
      () => renderEgernDns({ ...options(), [key]: value }),
      (error) => {
        assert.match(error.message, new RegExp(key, "i"));
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      },
    );
  }
});

test("renders deterministic YAML that independently round-trips to the DNS object", (t) => {
  const dns = renderEgernDns(options({ chinaDns: "dnspod", globalDns: "quad9" }));
  const first = renderYaml(dns);
  const second = renderYaml(renderEgernDns(options({ chinaDns: "dnspod", globalDns: "quad9" })));
  assert.equal(first, second);
  assert.match(first, /proxy_rule_set:/);
  assert.match(first, /domain_wildcard:/);

  const probe = spawnSync("ruby", ["-e", "require 'json'; require 'yaml'; puts JSON.generate(YAML.safe_load(STDIN.read, aliases: false))"], {
    input: first,
    encoding: "utf8",
  });
  if (probe.error?.code === "ENOENT") {
    t.skip("Ruby/Psych independent YAML parser is unavailable");
    return;
  }
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout), dns);
});
