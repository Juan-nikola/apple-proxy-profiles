import assert from "node:assert/strict";
import test from "node:test";

import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { renderOneXrayDns } from "../src/render-dns.js";
import { renderOneXrayRouting } from "../src/render-routing.js";

const OPTIONS = Object.freeze({
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
});

const TARGETS = Object.freeze({
  ai: "proxy",
  github: "proxy",
  youtube: "proxy",
  overseasMedia: "proxy",
  globalSocial: "proxy",
  apple: "direct",
  microsoft: "direct",
  domestic: "direct",
  overseasGame: "proxy",
  download: "direct",
  dnsAndRules: "proxy",
  final: "proxy",
});

function resolution(overrides = {}) {
  const targets = Object.fromEntries(Object.entries(TARGETS).map(([id, resolvedTag]) => [
    id,
    { configured: resolvedTag === "proxy" ? "FOLLOW" : "DIRECT", resolvedTag, status: resolvedTag === "proxy" ? "follow" : "direct" },
  ]));
  for (const [id, value] of Object.entries(overrides)) targets[id] = value;
  return {
    targets,
    fixedNodes: [],
    finalOutbound: null,
    chain: { enabled: false, landingTag: null, entryCount: 1 },
  };
}

function dnsPrelude() {
  return renderOneXrayDns({
    options: OPTIONS,
    routingPlan: orderedRoutingPlan(),
    geo: { siteName: "AppleProxySiteEdge", code: (id) => `APP-${id.toUpperCase()}` },
  }).rules;
}

function render(overrides = {}) {
  return renderOneXrayRouting({
    options: { ...OPTIONS, ...overrides },
    resolution: resolution(),
    dnsRules: dnsPrelude(),
  });
}

function refs(rule) {
  return [...(rule.domain ?? []), ...(rule.ip ?? [])];
}

test("renders system DNS/ping, local, shared phases, ChinaIP, and one final rule in order", () => {
  const { domainStrategy, rules } = render();

  assert.equal(domainStrategy, "IPIfNonMatch");
  assert.equal(rules.filter(({ inboundTag }) => inboundTag?.includes("tunIn")).length, 1);
  assert.deepEqual(rules.find(({ inboundTag }) => inboundTag?.includes("tunIn")), {
    type: "field", inboundTag: ["tunIn"], network: "tcp,udp", port: "53", outboundTag: "dnsOut",
  });
  assert.deepEqual(rules.find(({ inboundTag }) => inboundTag?.includes("pingIn")), {
    type: "field", inboundTag: ["pingIn"], outboundTag: "proxy",
  });
  assert.deepEqual(rules.find(({ domain }) => domain?.includes("full:localhost")), {
    type: "field",
    domain: ["full:localhost", "domain:local", "domain:lan", "domain:home.arpa"],
    outboundTag: "direct",
  });
  assert.deepEqual(rules.find(({ ip }) => ip?.includes("10.0.0.0/8")), {
    type: "field",
    ip: [
      "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
      "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4",
      "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
    ],
    outboundTag: "direct",
  });
  assert.equal(rules.flatMap(refs).some((ref) => /^(?:geosite|geoip):/u.test(ref)), false);

  const sourceOrder = rules.flatMap((rule) => refs(rule)
    .filter((ref) => ref.startsWith("ext:"))
    .filter(() => !(rule.network === "udp" && rule.port === "443" && rule.outboundTag === "block"))
    .map((ref) => ref.split(":").at(-1).replace(/^APP-/u, "")));
  const expectedOrder = orderedRoutingPlan().map(({ id }) => id.toUpperCase().replaceAll("_", "-"));
  assert.deepEqual(sourceOrder, expectedOrder);

  const customIndex = rules.findIndex(({ domain }) => domain?.includes("domain:perplexity.ai"));
  const domesticIndex = rules.findIndex(({ domain }) => domain?.some((ref) => ref.endsWith(":APP-DOMESTICCORE")));
  assert.ok(customIndex >= 0 && customIndex < domesticIndex);

  const chinaIpIndex = rules.findIndex(({ ip }) => ip?.some((ref) => ref.endsWith(":APP-CHINAIP")));
  assert.ok(chinaIpIndex > domesticIndex);
  const finalRules = rules.filter((rule) => rule.type === "field" && rule.outboundTag === "proxy" && rule.network === "tcp,udp" && !rule.domain && !rule.ip && !rule.inboundTag);
  assert.equal(finalRules.length, 1);
  assert.equal(rules.at(-1), finalRules[0]);
});

test("routes business sources through resolved target tags without inventing fixed tags", () => {
  const fixed = resolution({ ai: { configured: "NODE:fixed", resolvedTag: "ap-fixed-fixed", status: "fixed" } });
  fixed.fixedNodes = [{ node: {}, tag: "ap-fixed-fixed" }];
  const { rules } = renderOneXrayRouting({ options: OPTIONS, resolution: fixed, dnsRules: dnsPrelude() });
  const ai = rules.find(({ domain, network }) => domain?.some((ref) => ref.endsWith(":APP-OPENAI")) && network === undefined);
  assert.equal(ai.outboundTag, "ap-fixed-fixed");
  assert.equal(rules.some(({ outboundTag }) => outboundTag === "missing-fixed-tag"), false);
  assert.equal(rules.some(({ outboundTag }) => outboundTag === "🤖 AI 专用"), false);
});

test("routes domestic platform sources through their independent resolved targets and protects proxy QUIC", () => {
  const domesticProxy = resolution({
    domestic: { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" },
  });
  const { rules } = renderOneXrayRouting({ options: OPTIONS, resolution: domesticProxy, dnsRules: dnsPrelude() });
  const biliIndex = rules.findIndex(({ domain, network }) => domain?.some((ref) => ref.endsWith(":APP-BILIBILI")) && network === undefined);
  const biliQuicIndex = rules.findIndex(({ domain, network, port, outboundTag }) => (
    domain?.some((ref) => ref.endsWith(":APP-BILIBILI"))
    && network === "udp" && port === "443" && outboundTag === "block"
  ));
  assert.equal(rules[biliIndex].outboundTag, "proxy");
  assert.ok(biliQuicIndex >= 0 && biliQuicIndex < biliIndex);
});

test("security rules follow blockMode and cannot be overridden by business targets", () => {
  const expected = {
    off: ["direct", "direct", "direct"],
    security: ["block", "direct", "direct"],
    balanced: ["block", "block", "direct"],
    strict: ["block", "block", "block"],
  };
  for (const [blockMode, targets] of Object.entries(expected)) {
    const { rules } = renderOneXrayRouting({
      options: { ...OPTIONS, blockMode },
      resolution: resolution(),
      dnsRules: dnsPrelude(),
    });
    const outputFor = (id) => rules.find(({ domain, network }) => domain?.some((ref) => ref.endsWith(`:APP-${id}`)) && network === undefined)?.outboundTag;
    assert.deepEqual([
      outputFor("HIJACKING"),
      outputFor("PRIVACY"),
    ], [targets[0], targets[2]]);
    assert.equal(outputFor("HIJACKING").startsWith("ap-fixed-"), false);
  }
});

test("proxy-block protects only proxy-bound overseas UDP/443, while all-block protects every UDP/443", () => {
  const proxyBlocked = render({ quicMode: "proxy-block" }).rules;
  const proxyIndex = proxyBlocked.findIndex(({ domain, network }) => domain?.some((ref) => ref.endsWith(":APP-OPENAI")) && network === undefined);
  const proxyQuic = proxyBlocked.findIndex(({ domain, network, port, outboundTag }) => (
    domain?.some((ref) => ref.endsWith(":APP-OPENAI"))
    && network === "udp" && port === "443" && outboundTag === "block"
  ));
  const domesticIndex = proxyBlocked.findIndex(({ domain }) => domain?.some((ref) => ref.endsWith(":APP-DOMESTICGAME")));
  assert.ok(proxyQuic >= 0 && proxyQuic < proxyIndex);
  assert.ok(domesticIndex < proxyQuic);
  const lateQuic = proxyBlocked.findIndex(({ network, port, outboundTag, domain }) => network === "udp" && port === "443" && outboundTag === "block" && !domain);
  const finalIndex = proxyBlocked.length - 1;
  assert.ok(lateQuic > domesticIndex && lateQuic < finalIndex);

  const allBlocked = render({ quicMode: "all-block" }).rules;
  assert.equal(allBlocked.filter(({ network, port, outboundTag }) => network === "udp" && port === "443" && outboundTag === "block").length, 1);
  assert.equal(allBlocked.findIndex(({ network, port }) => network === "udp" && port === "443"), allBlocked.findIndex(({ ip }) => ip?.includes("10.0.0.0/8")) + 1);
  assert.equal(render({ quicMode: "allow" }).rules.some(({ network, port }) => network === "udp" && port === "443"), false);
});

test("does not add a proxy final QUIC catch-all when the final target is direct", () => {
  const directFinal = resolution({
    final: { configured: "DIRECT", resolvedTag: "direct", status: "direct" },
  });
  const { rules } = renderOneXrayRouting({ options: OPTIONS, resolution: directFinal, dnsRules: dnsPrelude() });
  assert.equal(rules.some(({ network, port, outboundTag, domain, ip }) => (
    network === "udp" && port === "443" && outboundTag === "block" && !domain && !ip
  )), false);
});

test("emits every routing port as a OneXray string", () => {
  const { rules } = render();
  const ports = rules.filter(({ port }) => port !== undefined).map(({ port }) => port);
  assert.ok(ports.length > 0);
  assert.ok(ports.every((port) => typeof port === "string"), ports.join(","));
  assert.equal(render({ quicMode: "all-block" }).rules.some(({ network, port }) => network === "udp" && port === "443"), true);
});

test("rejects malformed plans, empty payloads, missing targets, and duplicate DNS preludes", () => {
  assert.throws(
    () => renderOneXrayRouting({ options: OPTIONS, resolution: resolution(), dnsRules: [{ type: "field" }] }),
    /empty|payload|domain|ip|DNS/u,
  );
  assert.throws(
    () => renderOneXrayRouting({ options: OPTIONS, resolution: resolution({ ai: { configured: "FOLLOW", resolvedTag: "missing", status: "follow" } }), dnsRules: dnsPrelude() }),
    /missing|outbound|target/u,
  );
  assert.throws(
    () => renderOneXrayRouting({ options: OPTIONS, resolution: resolution(), dnsRules: [...dnsPrelude(), ...dnsPrelude()] }),
    /duplicate|DNS/u,
  );
});
