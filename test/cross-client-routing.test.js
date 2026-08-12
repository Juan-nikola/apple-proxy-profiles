import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LIGHTWEIGHT_CLIENTS, LIGHTWEIGHT_ROUTING_CASES } from "./fixtures/lightweight-routing-cases.js";
import { decodeXrayGeoData, renderXrayGeoData } from "../automation/src/render-xray-geodata.js";
import { RULE_KIND } from "../shared/rules/model.js";
import { BUSINESS_TARGETS } from "../shared/policies/business-targets.js";
import { orderedRoutingPlan } from "../shared/rules/lightweight-policy.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "../clients/onexray/src/geodata-contract.js";
import { renderOneXrayProfile } from "../clients/onexray/src/render-profile.js";
import { classifyOneXrayProfile } from "../clients/onexray/test/parity-helpers.js";

const root = new URL("../", import.meta.url);
const openAiNativePolicy = "🤖 AI 专用";
const ONEXRAY_CHANNEL = "edge";
const ONEXRAY_NAMES = oneXrayGeoNames(ONEXRAY_CHANNEL);

function oneXrayFixtureArtifacts() {
  const entries = new Map(BUSINESS_TARGETS.length > 0
    ? orderedRoutingPlan().map(({ id }) => [id, []])
    : []);
  for (const routingCase of LIGHTWEIGHT_ROUTING_CASES) {
    const sourceId = routingCase.sourceId ?? (routingCase.resolvedCountry === "CN" ? "ChinaIP" : null);
    const value = routingCase.ip ?? routingCase.resolvedIp;
    if (!sourceId || !value && !routingCase.domain) continue;
    if (!entries.has(sourceId)) continue;
    entries.get(sourceId).push(value !== undefined && sourceId === "ChinaIP"
      ? {
        kind: value.includes(":") ? RULE_KIND.ipv6Cidr : RULE_KIND.ipv4Cidr,
        value: `${value}/${value.includes(":") ? 128 : 32}`,
        noResolve: true,
        sourceId,
      }
      : {
        kind: RULE_KIND.domainSuffix,
        value: routingCase.domain,
        noResolve: false,
        sourceId,
      });
  }
  const geo = renderXrayGeoData(new Map([...entries].map(([id, sourceEntries]) => [id, { id, entries: sourceEntries }])), ONEXRAY_CHANNEL);
  const decoded = {
    domain: decodeXrayGeoData(geo.domain, "domain"),
    ip: decodeXrayGeoData(geo.ip, "ip"),
  };
  const options = {
    channel: ONEXRAY_CHANNEL,
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    clientChain: "off",
    clientChainTarget: "",
  };
  const targets = Object.fromEntries(BUSINESS_TARGETS.map(({ id, defaultTarget }) => [id, {
    configured: defaultTarget,
    resolvedTag: defaultTarget === "DIRECT" ? "direct" : "proxy",
    status: defaultTarget === "DIRECT" ? "direct" : "follow",
  }]));
  const resolution = { homepageNodes: [], fixedNodes: [], finalOutbound: null, targets, chain: { enabled: false, landingTag: null, entryCount: 0 } };
  const profileFor = (quicMode) => renderOneXrayProfile({
    options: { ...options, quicMode },
    resolution,
    routingPlan: orderedRoutingPlan(),
    geo: { siteName: ONEXRAY_NAMES.domain, code: oneXrayGeoCode },
  });
  return { decoded, profiles: Object.freeze({ allow: profileFor("allow"), "proxy-block": profileFor("proxy-block"), "all-block": profileFor("all-block") }) };
}

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
  assert.equal(sources.get("ChinaTLD")?.routing, 1, "Anywhere ChinaTLD must be DIRECT");
  assert.ok(
    sources.get("ChinaTLD").domains.some((suffix) => domainMatches("portal.ordinary-service.cn", suffix)),
    "Anywhere ChinaTLD must cover ordinary .cn domains",
  );
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
  const overseasGame = lines.findIndex((line) => /\/OverseasGame\.list,/u.test(line));
  const chinaTld = lines.findIndex((line) => /\/ChinaTLD\.list,/u.test(line));
  assert.ok(geoip >= 0 && final > geoip, `${client}: resolved CN must precede proxy final`);
  assert.ok(custom >= 0 && domestic > custom, `${client}: custom rules must precede DomesticCore`);
  assert.ok(
    overseasGame >= 0 && chinaTld > overseasGame && geoip > chinaTld,
    `${client}: ChinaTLD must follow OverseasGame and precede GEOIP CN`,
  );
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
  const overseasGame = yaml.lastIndexOf("/OverseasGame.yaml");
  const chinaTld = yaml.lastIndexOf("/ChinaTLD.yaml");
  const geoip = yaml.indexOf('match: "CN"');
  assert.ok(custom >= 0 && domestic > custom);
  assert.ok(
    overseasGame >= 0 && chinaTld > overseasGame && geoip > chinaTld,
    "Egern: ChinaTLD must follow OverseasGame and precede GEOIP CN",
  );
  return policies;
}

function parseSingBoxPolicies(config) {
  const policies = new Map();
  for (const rule of config.route.rules) {
    if (rule.network === "udp") continue;
    const tag = rule.rule_set?.[0];
    if (!tag?.startsWith("rule-")) continue;
    const sourceId = tag.slice("rule-".length);
    policies.set(sourceId, rule.action === "reject" ? "REJECT" : rule.outbound);
  }
  const resolve = config.route.rules.findIndex((rule) => rule.action === "resolve");
  const chinaIp = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaIP"));
  const custom = config.route.rules.findIndex((rule) => rule.domain_suffix?.includes("perplexity.ai"));
  const domestic = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-DomesticCore"));
  const overseasGame = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-OverseasGame"));
  const chinaTld = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaTLD"));
  assert.ok(resolve >= 0 && chinaIp > resolve);
  assert.ok(custom >= 0 && domestic > custom);
  assert.ok(
    overseasGame >= 0 && chinaTld > overseasGame && chinaIp > chinaTld,
    "sing-box: ChinaTLD must follow OverseasGame and precede ChinaIP",
  );
  assert.equal(config.route.final, "🚀 节点选择");
  return policies;
}

function expectedForCase(client, routingCase, policies, anywhere) {
  if (client === "onexray") {
    const profile = policies.profiles[routingCase.quicMode ?? "proxy-block"];
    const actual = classifyOneXrayProfile(profile, {
      domain: routingCase.domain,
      ip: routingCase.ip ?? routingCase.resolvedIp,
      network: routingCase.network,
      port: routingCase.port,
    }, policies.decoded);
    const expected = routingCase.oneXrayExpected
      ?? (routingCase.expected === "DIRECT" || routingCase.expected === "🇨🇳 国内平台" || routingCase.expected === "⬇️ 下载/P2P" || routingCase.expected === "🕵️ 严格跟踪"
        ? "direct"
        : routingCase.expected === "REJECT" ? "block" : "proxy");
    assert.equal(actual, expected, `onexray: ${routingCase.domain ?? routingCase.ip}`);
    return routingCase.expected;
  }
  if (["local-domain", "private-ipv4", "private-ipv6"].includes(routingCase.kind)) return "DIRECT";
  if (client === "anywhere" && routingCase.kind === "security-privacy") {
    const source = anywhere.sources.get(routingCase.sourceId);
    return routingCase.anywhereExpected ?? (source?.routing === 0 ? "🚀 节点选择" : source?.routing === 1 ? "DIRECT" : "REJECT");
  }
  if (client === "anywhere" && ["BiliBili", "ByteDance", "XiaoHongShu", "Weibo"].includes(routingCase.sourceId)) return "DIRECT";
  if (routingCase.customPolicy) {
    if (client !== "anywhere") return routingCase.customPolicy;
    return [...anywhere.sources.values()].some(({ routing }) => routing === 1) ? routingCase.customPolicy : undefined;
  }
  if (client === "anywhere" && routingCase.resolvedIp !== undefined) {
    assert.equal(anywhere.sources.get("ChinaIP")?.routing, 1, "Anywhere ChinaIP must stay DIRECT");
  }
  if (!routingCase.sourceId) {
    if (client === "anywhere") {
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

test("all six generated client formats implement the shared lightweight behavior cases", async (t) => {
  const anywhere = await anywhereArtifacts();
  const artifacts = {
    shadowrocket: parseTextPolicies(await readFile(new URL("clients/shadowrocket/examples/shadowrocket-macos.conf", root), "utf8"), "shadowrocket"),
    surge: parseTextPolicies(await readFile(new URL("clients/surge/examples/surge-macos.conf", root), "utf8"), "surge"),
    egern: parseEgernPolicies(await readFile(new URL("clients/egern/examples/egern-macos.yaml", root), "utf8")),
    singbox: parseSingBoxPolicies(JSON.parse(await readFile(new URL("clients/sing-box/examples/sing-box-macos.json", root), "utf8"))),
    anywhere: new Map(),
    onexray: oneXrayFixtureArtifacts(),
  };

  for (const client of LIGHTWEIGHT_CLIENTS) {
    await t.test(client, () => {
      for (const routingCase of LIGHTWEIGHT_ROUTING_CASES) {
        const expected = client === "anywhere" ? (routingCase.anywhereExpected ?? routingCase.expected) : routingCase.expected;
        assert.equal(expectedForCase(client, routingCase, artifacts[client], anywhere), expected, `${client}: ${routingCase.domain}`);
      }
    });
  }
});
