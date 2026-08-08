import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LIGHTWEIGHT_CLIENTS, LIGHTWEIGHT_ROUTING_CASES } from "./fixtures/lightweight-routing-cases.js";

const root = new URL("../", import.meta.url);
const openAiNativePolicy = "🤖 AI 专用";

function normalizePolicy(sourceId, policy) {
  if (sourceId === "OpenAI" && policy === openAiNativePolicy) return "OpenAI policy";
  return policy;
}

function domainMatches(domain, candidate) {
  return domain === candidate || domain.endsWith(`.${candidate}`);
}

async function anywhereArtifacts() {
  const directory = new URL("clients/anywhere/examples/rules/", root);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));
  const sources = new Map(manifest.sources.map(({ id, routing }) => [id, { routing, domains: [] }]));
  for (const shard of manifest.shards) {
    const filename = shard.path.slice("anywhere/rules/".length);
    const source = sources.get(shard.sourceId);
    const content = await readFile(new URL(filename, directory), "utf8");
    for (const raw of content.split("\n")) {
      const match = /^2,\s*(\S+)$/u.exec(raw.trim());
      if (match) source.domains.push(match[1]);
    }
  }
  return { manifest, sources };
}

function parseRuleSection(profile) {
  const marker = "[Rule]\n";
  const offset = profile.indexOf(marker);
  assert.notEqual(offset, -1);
  return profile.slice(offset + marker.length).split("\n").filter((line) => line && !line.startsWith("#"));
}

function parseTextPolicies(profile, client) {
  const policies = new Map();
  const lines = parseRuleSection(profile);
  for (const line of lines) {
    const fields = line.split(",");
    if (fields[0] !== "RULE-SET") continue;
    const id = /\/([^/]+)\.list$/u.exec(fields[1])?.[1];
    if (id) policies.set(id, fields[2]);
  }
  const geoip = lines.findIndex((line) => line === "GEOIP,CN,DIRECT");
  const final = lines.findIndex((line) => line.startsWith("FINAL,🚀 节点选择"));
  const custom = lines.findIndex((line) => line === "DOMAIN-SUFFIX,perplexity.ai,🤖 AI 专用");
  const domestic = lines.findIndex((line) => /\/DomesticCore\.list,/u.test(line));
  assert.ok(geoip >= 0 && final > geoip, `${client}: resolved CN must precede proxy final`);
  assert.ok(custom >= 0 && domestic > custom, `${client}: custom rules must precede DomesticCore`);
  if (client === "surge") assert.match(lines[final], /,dns-failed$/u);
  return policies;
}

function parseEgernPolicies(yaml) {
  const policies = new Map();
  const pattern = /- rule_set:\n\s+match: "[^"]+\/([^/]+)\.yaml"\n\s+policy: "([^"]+)"/gu;
  for (const match of yaml.matchAll(pattern)) policies.set(match[1], match[2]);
  assert.match(yaml, /- geoip:\n\s+match: "CN"\n\s+policy: "DIRECT"\n\s+- default:\n\s+policy: "🚀 节点选择"/u);
  const custom = yaml.indexOf('match: "perplexity.ai"');
  const domestic = yaml.lastIndexOf("/DomesticCore.yaml");
  assert.ok(custom >= 0 && domestic > custom);
  return policies;
}

function parseSingBoxPolicies(config) {
  const policies = new Map();
  for (const rule of config.route.rules) {
    const tag = rule.rule_set?.[0];
    if (!tag?.startsWith("rule-")) continue;
    const sourceId = tag.slice("rule-".length);
    policies.set(sourceId, rule.action === "reject" ? "REJECT" : rule.outbound);
  }
  const resolve = config.route.rules.findIndex((rule) => rule.action === "resolve");
  const chinaIp = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaIP"));
  const custom = config.route.rules.findIndex((rule) => rule.domain_suffix?.includes("perplexity.ai"));
  const domestic = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-DomesticCore"));
  assert.ok(resolve >= 0 && chinaIp > resolve);
  assert.ok(custom >= 0 && domestic > custom);
  assert.equal(config.route.final, "🚀 节点选择");
  return policies;
}

function expectedForCase(client, routingCase, policies, anywhere) {
  if (routingCase.customPolicy) {
    if (client !== "anywhere") return routingCase.customPolicy;
    return [...anywhere.sources.values()].some(({ routing }) => routing === 1) ? routingCase.customPolicy : undefined;
  }
  if (!routingCase.sourceId) {
    if (client === "anywhere") {
      assert.equal(anywhere.sources.get("ChinaIP")?.routing, 1);
      assert.equal([...anywhere.sources.values()].some(({ routing }) => routing === 0), true);
    }
    return routingCase.resolvedCountry === "CN" ? "DIRECT" : "🚀 节点选择";
  }
  if (client !== "anywhere") return normalizePolicy(routingCase.sourceId, policies.get(routingCase.sourceId));
  const source = anywhere.sources.get(routingCase.sourceId);
  assert.ok(source.domains.some((suffix) => domainMatches(routingCase.domain, suffix)), `${routingCase.domain} missing from Anywhere ${routingCase.sourceId}`);
  if (routingCase.sourceId === "OpenAI") return source.routing === 0 ? "OpenAI policy" : undefined;
  if (routingCase.sourceId === "OverseasGame") return source.routing === 0 ? "🌍 海外游戏" : undefined;
  return { 0: "🚀 节点选择", 1: "DIRECT", 2: "REJECT" }[source.routing];
}

test("all five generated client formats implement the shared lightweight behavior cases", async (t) => {
  const anywhere = await anywhereArtifacts();
  const artifacts = {
    shadowrocket: parseTextPolicies(await readFile(new URL("clients/shadowrocket/examples/shadowrocket-macos.conf", root), "utf8"), "shadowrocket"),
    surge: parseTextPolicies(await readFile(new URL("clients/surge/examples/surge-macos.conf", root), "utf8"), "surge"),
    egern: parseEgernPolicies(await readFile(new URL("clients/egern/examples/egern-macos.yaml", root), "utf8")),
    singbox: parseSingBoxPolicies(JSON.parse(await readFile(new URL("clients/sing-box/examples/sing-box-macos.json", root), "utf8"))),
    anywhere: new Map(),
  };

  for (const client of LIGHTWEIGHT_CLIENTS) {
    await t.test(client, () => {
      for (const routingCase of LIGHTWEIGHT_ROUTING_CASES) {
        assert.equal(expectedForCase(client, routingCase, artifacts[client], anywhere), routingCase.expected, `${client}: ${routingCase.domain}`);
      }
    });
  }
});
