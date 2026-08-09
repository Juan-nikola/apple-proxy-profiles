import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import { explainRoute } from "../automation/src/routing-plan-audit.js";
import { orderedRoutingPlan } from "../shared/rules/lightweight-policy.js";
import { explainRouteMain } from "../scripts/explain-route.mjs";

const plan = orderedRoutingPlan({ adblockMode: "off" });

function targetedRuleSets() {
  return new Map([
    ["ChinaTLD", { entries: [{ kind: "domainSuffix", value: "cn" }] }],
    ["OpenAI", { entries: [{ kind: "domainSuffix", value: "openai.com" }] }],
    ["ChinaIP", {
      entries: [
        { kind: "ipv4Cidr", value: "1.0.1.0/24" },
        { kind: "ipv6Cidr", value: "2400:3200::/32" },
      ],
    }],
  ]);
}

async function writeFiles(directory, files) {
  for (const [path, content] of files) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

test("explains shared routing decisions deterministically", () => {
  const ruleSets = targetedRuleSets();
  const cases = [
    {
      domain: "portal.example.cn",
      expectedSource: "ChinaTLD",
      expectedPolicy: "DIRECT",
      expectedPhase: "lateDomestic",
      expectedDns: "china",
      needsResolution: false,
    },
    {
      domain: "chat.openai.com",
      expectedSource: "OpenAI",
      expectedPolicy: "🤖 AI 专用",
      expectedPhase: "serviceIntent",
      expectedDns: "proxy",
      needsResolution: false,
    },
    {
      domain: "unknown.example",
      ip: "1.0.1.1",
      expectedSource: "ChinaIP",
      expectedPolicy: "DIRECT",
      expectedPhase: "resolvedChinaIp",
      expectedDns: "none",
      needsResolution: false,
    },
    {
      domain: "unknown.example",
      ip: "8.8.8.8",
      expectedSource: null,
      expectedPolicy: "🚀 节点选择",
      expectedPhase: null,
      expectedDns: null,
      needsResolution: false,
    },
  ];
  for (const expected of cases) {
    const explanation = explainRoute({ domain: expected.domain, ip: expected.ip, plan, ruleSets });
    assert.equal(explanation.matchedSource, expected.expectedSource, expected.domain);
    assert.equal(explanation.expectedPolicy, expected.expectedPolicy, expected.domain);
    assert.equal(explanation.matchedPhase, expected.expectedPhase, expected.domain);
    assert.equal(explanation.dnsClass, expected.expectedDns, expected.domain);
    assert.equal(explanation.needsResolution, expected.needsResolution, expected.domain);
  }
});

test("returns the balanced final proxy instead of a guessed country without an IP", () => {
  const explanation = explainRoute({ domain: "unknown.example", plan, ruleSets: targetedRuleSets() });
  assert.equal(explanation.needsResolution, true);
  assert.equal(explanation.expectedPolicy, "🚀 节点选择");
  assert.equal(explanation.matchedSource, null);
  assert.equal(explanation.dnsClass, null);
});

test("applies domain and service intent before ChinaTLD and ChinaIP", () => {
  const ruleSets = targetedRuleSets();
  const serviceFirst = explainRoute({
    domain: "chat.openai.com",
    ip: "1.0.1.1",
    plan,
    ruleSets,
  });
  assert.equal(serviceFirst.matchedSource, "OpenAI");
  assert.equal(serviceFirst.expectedPolicy, "🤖 AI 专用");

  const tldBeforeIp = explainRoute({
    domain: "portal.example.cn",
    ip: "8.8.8.8",
    plan,
    ruleSets,
  });
  assert.equal(tldBeforeIp.matchedSource, "ChinaTLD");
  assert.equal(tldBeforeIp.expectedPolicy, "DIRECT");
});

test("rejects invalid domains, IPs, plans, and rule sets", () => {
  const ruleSets = targetedRuleSets();
  const credentialUrl = ["https://user", "pass@example.cn"].join(":");
  assert.throws(
    () => explainRoute({ domain: credentialUrl, plan, ruleSets }),
    /bare hostname/u,
  );
  assert.throws(
    () => explainRoute({ domain: "example.cn/path", plan, ruleSets }),
    /bare hostname/u,
  );
  assert.throws(
    () => explainRoute({ domain: "bad domain", plan, ruleSets }),
    /bare hostname/u,
  );
  assert.throws(
    () => explainRoute({ domain: "example.cn", ip: "not-an-ip", plan, ruleSets }),
    /valid IPv4 or IPv6/u,
  );
  assert.throws(
    () => explainRoute({ domain: "example.cn", plan: "nope", ruleSets }),
    /must be an array/u,
  );
  assert.throws(
    () => explainRoute({ domain: "example.cn", plan, ruleSets: [] }),
    /must be a Map/u,
  );
});

test("reports exact client expressions", () => {
  const explanation = explainRoute({
    domain: "unknown.example",
    ip: "8.8.8.8",
    plan,
    ruleSets: targetedRuleSets(),
  });
  assert.deepEqual(explanation.clientExpression, {
    shadowrocket: "shared rule plan plus native GEOIP CN",
    surge: "shared rule plan plus native GEOIP CN and dns-failed final",
    egern: "shared rule plan plus native GEOIP CN",
    singbox: "explicit dns-direct resolve before ChinaIP",
    anywhere: "shared ARRS plan; local assignment must be verified",
  });
});

async function fixtureChannelRoot() {
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots() });
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-explain-"));
  await writeFiles(join(root, "current"), artifacts.defaults);
  return root;
}

test("CLI explains a published channel without network or mutation", async () => {
  const root = await fixtureChannelRoot();
  const before = await readdir(root, { recursive: true });
  try {
    const chinaTld = await explainRouteMain(
      ["--channel", "current", "--domain", "example.cn"],
      { publicRoot: root },
    );
    assert.equal(chinaTld.matchedSource, "ChinaTLD");
    assert.equal(chinaTld.expectedPolicy, "DIRECT");

    const service = await explainRouteMain(
      ["--channel", "current", "--domain", "fixture-openai.example"],
      { publicRoot: root },
    );
    assert.equal(service.matchedSource, "OpenAI");
    assert.equal(service.expectedPolicy, "🤖 AI 专用");

    const chinaIp = await explainRouteMain(
      ["--channel", "current", "--domain", "unknown.example", "--ip", "1.0.1.1"],
      { publicRoot: root },
    );
    assert.equal(chinaIp.matchedSource, "ChinaIP");
    assert.equal(chinaIp.expectedPolicy, "DIRECT");

    const overseas = await explainRouteMain(
      ["--channel", "current", "--domain", "unknown.example", "--ip", "8.8.8.8"],
      { publicRoot: root },
    );
    assert.equal(overseas.matchedSource, null);
    assert.equal(overseas.expectedPolicy, "🚀 节点选择");

    const unresolved = await explainRouteMain(
      ["--channel", "current", "--domain", "unknown.example"],
      { publicRoot: root },
    );
    assert.equal(unresolved.needsResolution, true);
    assert.equal(unresolved.expectedPolicy, "🚀 节点选择");
  } finally {
    const after = await readdir(root, { recursive: true });
    assert.deepEqual(after, before);
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI rejects invalid arguments, channels, and noncanonical trees", async () => {
  const root = await fixtureChannelRoot();
  const credentialUrl = ["https://user", "pass@example.cn"].join(":");
  try {
    await assert.rejects(
      () => explainRouteMain(["--channel", "edge", "--domain", "example.cn"], { publicRoot: root }),
      /Missing channel tree/u,
    );
    await assert.rejects(
      () => explainRouteMain(["--bogus", "x", "--domain", "example.cn"], { publicRoot: root }),
      /Invalid explain-route arguments/u,
    );
    await assert.rejects(
      () => explainRouteMain(["--channel", "current", "--domain", credentialUrl], { publicRoot: root }),
      /bare hostname/u,
    );
    await assert.rejects(
      () => explainRouteMain(["--channel", "current", "--domain", "example.cn", "--ip", "1.2.3"], { publicRoot: root }),
      /valid IPv4 or IPv6/u,
    );

    const tampered = await mkdtemp(join(tmpdir(), "apple-proxy-explain-tampered-"));
    await writeFiles(join(tampered, "current"), (await buildClientArtifacts({ snapshot: lightweightFixtureSnapshots() })).defaults);
    const chinaIpPath = join(tampered, "current/surge/rules/ChinaIP.list");
    await writeFile(chinaIpPath, "IP-CIDR,9.9.9.0/24,no-resolve\n");
    await assert.rejects(
      () => explainRouteMain(["--channel", "current", "--domain", "example.cn"], { publicRoot: tampered }),
      /[Nn]oncanonical/u,
    );
    await rm(tampered, { recursive: true, force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
