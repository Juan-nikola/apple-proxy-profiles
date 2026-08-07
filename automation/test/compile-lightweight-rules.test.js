import assert from "node:assert/strict";
import test from "node:test";

import { DOMESTIC_CORE_DOMAIN_SUFFIXES, DOMESTIC_GAME_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-core.js";
import { DEFAULT_RULE_SOURCE_IDS } from "../../shared/rules/lightweight-policy.js";
import { compileLightweightRules } from "../src/compile-lightweight-rules.js";
import { FETCH_SOURCE_CATALOG } from "../src/source-catalog.js";

function fetched(source, text) {
  return Object.freeze({
    text,
    source,
    rawUrl: `https://raw.githubusercontent.com/fixture/${source.id}`,
    sourceBytes: Buffer.byteLength(text),
    sourceSha256: "a".repeat(64),
  });
}

function fixtureSnapshots() {
  const records = FETCH_SOURCE_CATALOG.map((source) => {
    const fixtureSource = { ...source, minEntries: 0 };
    const text = source.inputFormat === "DOMAIN-SET"
      ? `.fixture-${source.id.toLowerCase()}.example\n`
      : `DOMAIN-SUFFIX,fixture-${source.id.toLowerCase()}.example\n`;
    return [source.id, fetched(fixtureSource, text)];
  });
  const snapshots = new Map(records);
  const replace = (id, text) => {
    const source = { ...FETCH_SOURCE_CATALOG.find((item) => item.id === id), minEntries: 0 };
    snapshots.set(id, fetched(source, text));
  };

  replace("Game", [
    "DOMAIN,portal.onlychina.cn",
    "DOMAIN-SUFFIX,api.tencentgames.com",
    "DOMAIN-SUFFIX,SteamPowered.COM",
    "DOMAIN-SUFFIX,steampowered.com",
    "IP-CIDR,203.0.113.9/24,no-resolve",
  ].join("\n"));
  replace("ChinaMax", [
    "IP-CIDR,1.0.1.9/24,no-resolve",
    "IP-CIDR6,2400:3200:0:0::1/32,no-resolve",
  ].join("\n"));
  replace("ChinaMax_Domain", ".discarded.example\n");
  replace("Advertising", "DOMAIN-SUFFIX,ADS.EXAMPLE\nDOMAIN-SUFFIX,ads.example\n");
  replace("Advertising_Domain", ".TRACKER.EXAMPLE\n.tracker.example\n");
  replace("SteamCN", "DOMAIN-SUFFIX,QQ.COM\nDOMAIN-SUFFIX,steamcontent.com\n");
  replace("OpenAI", "DOMAIN-SUFFIX,QQ.COM\nDOMAIN-SUFFIX,openai.com\n");
  return snapshots;
}

function values(compiled, id) {
  return compiled.get(id).entries.map(({ kind, value, noResolve }) => ({ kind, value, noResolve }));
}

function serializable(result) {
  return {
    defaults: [...result.defaultRuleSets].map(([id, set]) => [id, values(result.defaultRuleSets, id)]),
    ads: [...result.optionalPacks.adblockFull].map(([id]) => [id, values(result.optionalPacks.adblockFull, id)]),
    diagnostics: result.diagnostics,
  };
}

test("compiles only lightweight defaults and isolates the full advertising pack", () => {
  const result = compileLightweightRules({ snapshots: fixtureSnapshots() });

  assert.deepEqual([...result.defaultRuleSets.keys()], DEFAULT_RULE_SOURCE_IDS);
  assert.equal(result.defaultRuleSets.has("ChinaMax_Domain"), false);
  assert.equal(result.defaultRuleSets.has("Advertising"), false);
  assert.equal(result.defaultRuleSets.has("Advertising_Domain"), false);
  assert.deepEqual([...result.optionalPacks.adblockFull.keys()], ["Advertising", "Advertising_Domain"]);
  assert.deepEqual(values(result.optionalPacks.adblockFull, "Advertising"), [
    { kind: "domainSuffix", value: "ads.example", noResolve: false },
  ]);
  assert.deepEqual(values(result.optionalPacks.adblockFull, "Advertising_Domain"), [
    { kind: "domainSuffix", value: "tracker.example", noResolve: false },
  ]);
  assert.deepEqual(result.diagnostics.overlap, []);
  assert.equal(result.diagnostics.domesticCoreEntries, DOMESTIC_CORE_DOMAIN_SUFFIXES.length);
  assert.equal(result.diagnostics.defaultEntries,
    [...result.defaultRuleSets.values()].reduce((total, set) => total + set.entries.length, 0));
});

test("partitions games, canonicalizes Chinese IPv4 and IPv6, and removes only redundant direct domains", () => {
  const result = compileLightweightRules({ snapshots: fixtureSnapshots() });
  const domesticGame = values(result.defaultRuleSets, "DomesticGame");
  const overseasGame = values(result.defaultRuleSets, "OverseasGame");

  assert.ok(domesticGame.some(({ kind, value }) => kind === "domain" && value === "portal.onlychina.cn"));
  assert.ok(domesticGame.some(({ kind, value }) => kind === "domainSuffix" && value === "tencentgames.com"));
  assert.ok(domesticGame.some(({ kind, value }) => kind === "domainSuffix" && value === "api.tencentgames.com"));
  assert.deepEqual(overseasGame, [
    { kind: "domainSuffix", value: "steampowered.com", noResolve: false },
    { kind: "ipv4Cidr", value: "203.0.113.0/24", noResolve: true },
  ]);
  assert.deepEqual(values(result.defaultRuleSets, "ChinaIP"), [
    { kind: "ipv4Cidr", value: "1.0.1.0/24", noResolve: true },
    { kind: "ipv6Cidr", value: "2400:3200::/32", noResolve: true },
  ]);
  assert.equal(values(result.defaultRuleSets, "SteamCN").some(({ value }) => value === "qq.com"), false);
  assert.equal(values(result.defaultRuleSets, "OpenAI").some(({ value }) => value === "qq.com"), true);
  assert.ok(DOMESTIC_GAME_DOMAIN_SUFFIXES.every((suffix) => (
    domesticGame.some(({ kind, value }) => kind === "domainSuffix" && value === suffix)
  )));
});

test("produces byte-for-byte deterministic maps when upstream snapshot order changes", () => {
  const snapshots = fixtureSnapshots();
  const shuffled = new Map([...snapshots].reverse());
  assert.deepEqual(
    serializable(compileLightweightRules({ snapshots })),
    serializable(compileLightweightRules({ snapshots: shuffled })),
  );
});

test("rejects domain entries in the ChinaMax IP input", () => {
  const snapshots = fixtureSnapshots();
  const source = { ...FETCH_SOURCE_CATALOG.find(({ id }) => id === "ChinaMax"), minEntries: 0 };
  snapshots.set("ChinaMax", fetched(source, "DOMAIN-SUFFIX,example.cn\n"));
  assert.throws(() => compileLightweightRules({ snapshots }),
    /Rule source ChinaMax: domain rules are forbidden in ChinaIP/u);
});
