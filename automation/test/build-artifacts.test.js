import assert from "node:assert/strict";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";
import { artifactSha256 } from "../src/artifact-content.js";
import { buildChinaIpAudit } from "../src/china-ip-audit.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";
import {
  DEFAULT_PUBLISH_SOURCE_CATALOG,
  FETCH_SOURCE_CATALOG,
} from "../src/source-catalog.js";
import { DEFAULT_RULE_SOURCE_IDS } from "../../shared/rules/lightweight-policy.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";
import { renderRules as renderShadowrocketRules } from "../../clients/shadowrocket/src/render-rules.js";
import { renderSurgeRules } from "../../clients/surge/src/render-rules.js";
import { ruleClientCatalog } from "../../shared/rules/lightweight-policy.js";

const upstream = {
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
};

function chinaIpAuditBytes() {
  const entries = [
    { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP" },
    { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP" },
  ];
  return Buffer.from(canonicalJson(buildChinaIpAudit({
    previousPrimaryEntries: entries,
    currentPrimaryEntries: entries,
    secondaryEntries: entries,
    primary: {
      repository: upstream.repository,
      commit: upstream.commit,
      committedAt: upstream.committedAt,
      sha256: "1".repeat(64),
    },
    secondary: {
      repository: "https://github.com/gaoyifan/china-operator-ip",
      commit: "b".repeat(40),
      committedAt: "2026-08-08T00:00:00Z",
      sha256: "2".repeat(64),
    },
    now: "2026-08-09T00:00:00Z",
    calibrationStartedAt: "2026-08-01T00:00:00Z",
  })));
}
test("fans compiled lightweight defaults out without publishing input-only rules", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  assert.equal(result.defaults.has("shadowrocket/rules/DomesticCore.list"), true);
  assert.equal(result.defaults.has("surge/rules/OverseasGame.list"), true);
  assert.equal(result.defaults.has("egern/rules/ChinaIP.yaml"), true);
  assert.equal(result.defaults.has("sing-box/rules/ChinaIP.json"), true);
  assert.equal(result.defaults.has("anywhere/rules/DomesticCore-001.arrs"), true);
  assert.equal(result.defaults.has("manifest.json"), true);
  assert.equal(result.defaults.has("shadowrocket/rules/Advertising.list"), false);
  assert.equal(result.defaults.has("shadowrocket/rules/ChinaMax_Domain.list"), false);
  assert.deepEqual(result.diagnostics.defaultRuleIds, DEFAULT_RULE_SOURCE_IDS);
  assert.deepEqual([...result.optionalPacks.keys()], ["adblock-full"]);
  const chinaIp = result.defaults.get("surge/rules/ChinaIP.list");
  assert.match(chinaIp, /IP-CIDR,1\.0\.1\.0\/24,no-resolve/u);
  assert.match(chinaIp, /IP-CIDR6,2400:3200::\/32,no-resolve/u);
  assert.equal(chinaIp.includes("/25"), false);
  assert.equal(result.diagnostics.compaction.ChinaIP.removed, 2);
});

test("is byte deterministic for the same snapshot", () => {
  const options = { snapshot: lightweightFixtureSnapshots(), upstream };
  assert.deepEqual([...buildClientArtifacts(options).defaults], [...buildClientArtifacts(options).defaults]);
});

test("publishes exact ChinaIP audit bytes only as root evidence", () => {
  const baseline = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const chinaIpAudit = chinaIpAuditBytes();
  const result = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    chinaIpAudit,
  });

  assert.strictEqual(result.defaults.get("audit/china-ip-drift.json"), chinaIpAudit);
  const record = result.diagnostics.defaultManifest.files.find(({ path }) => (
    path === "audit/china-ip-drift.json"
  ));
  assert.deepEqual(record, {
    path: "audit/china-ip-drift.json",
    bytes: chinaIpAudit.length,
    sha256: artifactSha256(chinaIpAudit),
  });
  for (const client of Object.keys(result.diagnostics.defaultManifest.clients)) {
    assert.notEqual(
      result.diagnostics.defaultManifest.clients[client].manifestHash,
      baseline.diagnostics.defaultManifest.clients[client].manifestHash,
      client,
    );
    assert.equal(
      result.diagnostics.defaultManifest.clients[client].referencedDefaultBytes,
      baseline.diagnostics.defaultManifest.clients[client].referencedDefaultBytes,
      client,
    );
    const directory = client === "singbox" ? "sing-box" : client;
    const clientManifest = JSON.parse(result.defaults.get(`${directory}/client-manifest.json`));
    assert.equal(clientManifest.chinaIpAuditSha256, artifactSha256(chinaIpAudit), client);
  }
  const clientPaths = [...result.defaults.keys()].filter((path) => (
    /^(?:shadowrocket|surge|egern|sing-box|anywhere)\//u.test(path)
  ));
  assert.deepEqual(clientPaths, [...baseline.defaults.keys()].filter((path) => (
    /^(?:shadowrocket|surge|egern|sing-box|anywhere)\//u.test(path)
  )));
  assert.equal(canonicalJson(result.diagnostics.defaultManifest).includes("gaoyifan"), false);
  assert.equal(clientPaths.some((path) => (
    Buffer.from(result.defaults.get(path)).includes(Buffer.from("gaoyifan"))
  )), false);
  for (const catalog of [
    FETCH_SOURCE_CATALOG,
    DEFAULT_PUBLISH_SOURCE_CATALOG,
    ruleClientCatalog({ adblockMode: "off" }),
    ruleClientCatalog({ adblockMode: "full" }),
  ]) {
    assert.equal(JSON.stringify(catalog).includes("ChinaIP-audit"), false);
    assert.equal(JSON.stringify(catalog).includes("china-operator-ip"), false);
  }
});

test("replaces audit JSON with the exact compiled sing-box binaries before manifest accounting", () => {
  const singBoxBinaries = new Map();
  for (const { id } of ruleClientCatalog({ adblockMode: "off" })) {
    singBoxBinaries.set(`sing-box/rule-sets/${id}.srs`, Buffer.from(`SRS\u0002default-${id}`));
  }
  for (const { id } of ruleClientCatalog({ adblockMode: "full" })) {
    if (id === "Advertising" || id === "Advertising_Domain") {
      singBoxBinaries.set(`optional/adblock-full/sing-box/${id}.srs`, Buffer.from(`SRS\u0002optional-${id}`));
    }
  }

  const result = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    singBoxBinaries,
  });
  for (const [path, bytes] of singBoxBinaries) {
    const files = path.startsWith("optional/") ? result.optionalPacks.get("adblock-full") : result.defaults;
    assert.deepEqual(files.get(path), bytes, path);
  }
  assert.equal([...result.defaults.keys()].some((path) => /^sing-box\/rules\/.*\.json$/u.test(path)), false);
  assert.equal(
    [...result.optionalPacks.get("adblock-full").keys()].some((path) => /sing-box\/rules\/.*\.json$/u.test(path)),
    false,
  );
  assert.equal(
    result.diagnostics.defaultManifest.files.some(({ path }) => /^sing-box\/rule-sets\/.*\.srs$/u.test(path)),
    true,
  );
  const expectedDefaultBytes = [...singBoxBinaries]
    .filter(([path]) => path.startsWith("sing-box/rule-sets/"))
    .reduce((sum, [, bytes]) => sum + bytes.length, 0);
  assert.equal(
    result.diagnostics.defaultManifest.clients.singbox.referencedDefaultBytes,
    expectedDefaultBytes,
  );
});

test("Shadowrocket and Surge profile provider types match every emitted rule body", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const clients = [
    {
      name: "shadowrocket",
      lines: renderShadowrocketRules({
        ruleBaseUrl: "https://example.invalid/current/shadowrocket/rules",
        adblockMode: "full",
      }),
    },
    {
      name: "surge",
      lines: renderSurgeRules({
        ruleBaseUrl: "https://example.invalid/current/surge/rules",
        adblockMode: "full",
      }),
    },
  ];

  for (const client of clients) {
    for (const profileLine of client.lines.filter((line) => /^(?:RULE-SET|DOMAIN-SET),/u.test(line))) {
      const [providerType, url] = profileLine.split(",", 2);
      const path = new URL(url).pathname
        .replace(/^\/current\//u, "")
        .replace(/^optional\/adblock-full\//u, "optional/adblock-full/");
      const files = path.startsWith("optional/")
        ? result.optionalPacks.get("adblock-full")
        : result.defaults;
      const content = files.get(path);
      assert.equal(typeof content, "string", `${client.name}: missing ${path}`);
      const bodyLine = content.split("\n").find((line) => line && !line.startsWith("#"));
      assert.ok(bodyLine, `${client.name}: empty ${path}`);
      if (providerType === "DOMAIN-SET") {
        assert.doesNotMatch(bodyLine, /,/u, `${client.name}: DOMAIN-SET body ${path}`);
      } else {
        assert.match(
          bodyLine,
          /^(?:DOMAIN|DOMAIN-SUFFIX|DOMAIN-KEYWORD|IP-CIDR|IP-CIDR6),/u,
          `${client.name}: RULE-SET body ${path}`,
        );
      }
    }
  }
});
