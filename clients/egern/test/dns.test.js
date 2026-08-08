import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderEgernDns } from "../src/render-dns.js";
import { renderYaml } from "../src/render-yaml.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../../shared/rules/domestic-fallback.js";
import { EXPLICIT_OVERSEAS_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";
import {
  PUBLIC_SNAPSHOT_BASE_URL,
  parseEgernOptions,
} from "../src/options.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes";
const CHINA_RULE_URL = `${PUBLIC_SNAPSHOT_BASE_URL}/egern/rules/DomesticCore.yaml`;
const PUBLISHING_PLAN = readFileSync(
  new URL("../../../docs/superpowers/plans/2026-08-01-apple-proxy-profiles-publishing.md", import.meta.url),
  "utf8",
);

function options(overrides = {}) {
  return parseEgernOptions({
    output: "config",
    type: "collection",
    name: "egern-sources",
    nodeSubscriptionUrl: PRIVATE_URL,
    platform: "macos",
    channel: "current",
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

function domesticFallbackRules(value = "china") {
  return DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.map((match) => ({
    domain_suffix: { match, value },
  }));
}

function wildcard(value) {
  return { domain_wildcard: { match: "*", value } };
}

function proxyRule(id, value = "global") {
  return {
    proxy_rule_set: {
      match: `${PUBLIC_SNAPSHOT_BASE_URL}/egern/rules/${id}.yaml`,
      value,
      update_interval: 86400,
    },
  };
}

test("renders the exact stable DNS object in documented declaration order", () => {
  const dns = renderEgernDns(options());
  assert.deepEqual(dns.bootstrap, ["system"]);
  assert.deepEqual(dns.upstreams, {
    china: ["https://dns.alidns.com/dns-query"],
    global: ["https://cloudflare-dns.com/dns-query"],
  });
  assert.deepEqual(dns.forward.slice(0, 3), [
    proxyRule("OpenAI"),
    proxyRule("Claude"),
    proxyRule("Gemini"),
  ]);
  assert.deepEqual(
    dns.forward
      .filter((record) => record.proxy_rule_set && record.proxy_rule_set.match !== CHINA_RULE_URL)
      .map((record) => record.proxy_rule_set.match),
    EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((id) => `${PUBLIC_SNAPSHOT_BASE_URL}/egern/rules/${id}.yaml`),
  );
  assert.deepEqual(dns.forward.slice(-(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length + 2)), [
    ...domesticFallbackRules(),
    chinaRule(),
    wildcard("china"),
  ]);
  assert.deepEqual(dns.proxy_nameservers, ["system"]);
  assert.deepEqual(Object.keys(dns), ["bootstrap", "upstreams", "forward", "proxy_nameservers"]);
  assert.deepEqual(Object.keys(dns.upstreams), ["china", "global"]);
  const domesticRule = dns.forward.find((record) => record.proxy_rule_set?.match === CHINA_RULE_URL);
  assert.deepEqual(
    Object.keys(domesticRule.proxy_rule_set),
    ["match", "value", "update_interval"],
  );
});

test("closes the lightweight domestic DNS rule URL over the publishing snapshot contract", () => {
  assert.match(
    PUBLISHING_PLAN,
    /Egern uses `current\/egern\/rules\/\$\{id\}\.yaml`/,
  );
  assert.equal(CHINA_RULE_URL.endsWith("/egern/rules/DomesticCore.yaml"), true);

  for (const dnsMode of ["stable", "speed"]) {
    const serialized = JSON.stringify(renderEgernDns(options({ dnsMode })));
    assert.equal(serialized.includes(CHINA_RULE_URL), true, dnsMode);
    assert.equal(serialized.includes("ChinaMax"), false, dnsMode);
    assert.equal(serialized.includes("china-domains"), false, dnsMode);
  }
});

test("keeps DNS rule providers on the selected publication channel", () => {
  const edge = JSON.stringify(renderEgernDns(options({ channel: "edge" })));
  const current = JSON.stringify(renderEgernDns(options({ channel: "current" })));
  assert.match(edge, /\/edge\/egern\/rules\/DomesticCore\.yaml/u);
  assert.match(current, /\/current\/egern\/rules\/DomesticCore\.yaml/u);
});

test("renders privacy globally and stable/speed with China-first catch-all", () => {
  assert.deepEqual(renderEgernDns(options({ dnsMode: "privacy" })).forward, [wildcard("global")]);
  const speed = renderEgernDns(options({ dnsMode: "speed" })).forward;
  assert.deepEqual(speed.slice(0, 3), [
    proxyRule("OpenAI"),
    proxyRule("Claude"),
    proxyRule("Gemini"),
  ]);
  assert.deepEqual(speed.slice(-(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length + 2)), [
    ...domesticFallbackRules(),
    chinaRule(),
    wildcard("china"),
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
