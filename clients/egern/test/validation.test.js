import assert from "node:assert/strict";
import test from "node:test";

import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { CONTINENTS, continentFilter } from "../../../shared/policies/filters.js";
import { renderEgernGroups } from "../src/render-groups.js";
import { renderEgernProfile } from "../src/render-profile.js";
import { renderYaml } from "../src/render-yaml.js";
import {
  assertValidEgernProfile,
  validateEgernProfile,
} from "../src/validate-profile.js";
import { allCompatibleNodes } from "./fixtures/nodes.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes?key=TEST_ONLY_VALIDATION_QUERY";

function validProfile(overrides = {}) {
  return renderEgernProfile({
    output: "config",
    type: "collection",
    name: "egern-validation",
    nodeSubscriptionUrl: PRIVATE_URL,
    platform: "iphone",
    ...overrides,
  }, allCompatibleNodes);
}

function assertInvalid(profile, pattern = /./u, forbidden = []) {
  const first = validateEgernProfile(profile);
  const second = validateEgernProfile(profile);
  assert.equal(first.valid, false);
  assert.deepEqual(first, second);
  assert.ok(first.errors.length > 0);
  assert.match(first.errors.join("; "), pattern);
  for (const value of [PRIVATE_URL, "TEST_ONLY_VALIDATION_QUERY", ...forbidden]) {
    assert.equal(first.errors.join("; ").includes(value), false, value);
  }
}

function normalizedPolicyNode(flag, continent) {
  return {
    name: `${flag} TEST_ONLY_POLICY_NODE`,
    _profile: {
      continent,
      flag,
      sourceKind: "unknown",
      udp: false,
      p2p: false,
      entry: false,
      chained: false,
    },
  };
}

function renderedGroupFields(groups, name) {
  for (const record of groups) {
    const type = Object.keys(record)[0];
    if (record[type].name === name) return record[type];
  }
  return undefined;
}

function profileWithContinentFilter({ fromContinent, toContinent }) {
  const options = {
    platform: "iphone",
    autoGroupMode: "minimal",
    clientChain: "off",
    blockMode: "balanced",
  };
  const nodes = [
    normalizedPolicyNode("🇯🇵", "asiaPacific"),
    normalizedPolicyNode("🇩🇪", "europe"),
  ];
  const shared = buildPolicyGroups(options, [
    ...nodes,
  ]);
  const rendered = renderEgernGroups(shared, PRIVATE_URL);
  const source = renderedGroupFields(rendered, fromContinent);
  source.filter = continentFilter(toContinent);

  const base = validProfile({
    autoGroupMode: "minimal",
    clientChain: "off",
    quicMode: "allow",
  });
  return base.replace(
    /policy_groups:\n[\s\S]*?(?=rules:\n)/u,
    renderYaml({ policy_groups: rendered }),
  );
}

test("validates the actual deterministic YAML string", () => {
  const profile = validProfile();
  assert.equal(typeof profile, "string");
  assert.deepEqual(validateEgernProfile(profile), { valid: true, errors: [] });
  assertInvalid(null, /string/i);
  assertInvalid({ profile }, /string/i);
});

test("rejects a complete profile that assigns a documented continent filter to another continent", () => {
  assertInvalid(profileWithContinentFilter({
    fromContinent: "🌏 亚太",
    toContinent: CONTINENTS.find((continent) => continent.key === "europe"),
  }), /group|schema|semantic|continent/i);
});

test("rejects a complete profile whose continent group no longer matches canonical semantics", () => {
  assertInvalid(profileWithContinentFilter({
    fromContinent: "🌍 欧洲",
    toContinent: CONTINENTS.find((continent) => continent.key === "asiaPacific"),
  }), /group|schema|semantic|continent/i);
});

test("accepts only closed channel and optional-pack publication combinations", () => {
  for (const channel of ["edge", "current"]) {
    for (const adblockMode of ["off", "full"]) {
      assert.deepEqual(
        validateEgernProfile(validProfile({ channel, adblockMode })),
        { valid: true, errors: [] },
        `${channel}/${adblockMode}`,
      );
    }
  }

  const edgeOff = validProfile({ channel: "edge", adblockMode: "off" });
  assertInvalid(edgeOff.replace(
    "/edge/egern/rules/DomesticCore.yaml",
    "/current/egern/rules/DomesticCore.yaml",
  ), /DNS|rule|publication/i);
  assertInvalid(edgeOff.replaceAll("DomesticCore.yaml", "ChinaMax_Domain.yaml"), /DNS|rule|publication/i);

  const currentFull = validProfile({ channel: "current", adblockMode: "full" });
  assertInvalid(currentFull.replace(
    "/current/optional/adblock-full/egern/rules/Advertising.yaml",
    "/current/egern/rules/Advertising.yaml",
  ), /DNS|rule|publication/i);
});

test("generated-profile assertion uses one fixed non-reflective error", () => {
  const secret = "TEST_ONLY_INVALID_GENERATED_PROFILE_SECRET";
  assert.throws(
    () => assertValidEgernProfile(`password: "${secret}"\n`),
    (error) => {
      assert.equal(error.message, "Generated Egern profile failed validation");
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test("rejects missing, extra, duplicate, forbidden, and credential root keys", () => {
  const profile = validProfile();
  assertInvalid(`auto_update: {}\n${profile}`, /root|field|auto_update/i);
  assertInvalid(profile.replace(/^ipv6:.*\n/mu, ""), /root|ipv6|required/i);
  assertInvalid(`${profile}unexpected: true\n`, /root|field/i);
  assertInvalid(`${profile}ipv6: false\n`, /duplicate|YAML/i);
  assertInvalid(`${profile}proxies: []\n`, /proxies|forbidden|root/i);
  assertInvalid(`${profile}mitm: {}\n`, /mitm|forbidden|root/i);
  assertInvalid(`${profile}password: "TEST_ONLY_VALIDATION_SECRET"\n`, /credential|forbidden|root|field/i, [
    "TEST_ONLY_VALIDATION_SECRET",
  ]);
  assertInvalid(`${profile}private_key: "TEST_ONLY_VALIDATION_KEY"\n`, /credential|forbidden|root|field/i, [
    "TEST_ONLY_VALIDATION_KEY",
  ]);
});

test("rejects malformed YAML and every anchor, alias, tag, and merge form", () => {
  const profile = validProfile();
  for (const suffix of [
    "bad: &anchor {}\n",
    "bad: *anchor\n",
    "bad: !custom {}\n",
    "<<: {}\n",
    "  unexpected_indent: true\n",
    "bad: [unterminated\n",
  ]) assertInvalid(`${profile}${suffix}`, /YAML|root|unsupported|malformed|merge/i);

  for (const raw of ["\u0080", "\u009f", "\u2028", "\u2029"]) {
    assertInvalid(`${profile}bad: "raw${raw}character"\n`, /YAML|malformed|unsupported/i);
  }
  assertInvalid(profile.replace('"system"', '"\\u0073ystem"'), /YAML|canonical/i);
});

test("rejects group record swaps, duplicates, dangling policies, and private URL drift", () => {
  const profile = validProfile();
  const helperA = [
    "  - auto_test:",
    "      name: \"⚡ 全部自动\"",
  ].join("\n");
  const helperB = [
    "  - auto_test:",
    "      name: \"⚡ 亚太自动\"",
  ].join("\n");
  assertInvalid(profile.replace(helperA, "TEST_ONLY_HELPER_A").replace(helperB, helperA).replace("TEST_ONLY_HELPER_A", helperB), /group|order|schema/i);
  assertInvalid(profile.replace('name: "⚡ 亚太自动"', 'name: "⚡ 全部自动"'), /group|duplicate|schema/i);
  assertInvalid(profile.replace('policy: "🚀 节点选择"', 'policy: "TEST_ONLY_MISSING_POLICY"'), /rule|policy|group|schema/i, [
    "TEST_ONLY_MISSING_POLICY",
  ]);

  const privateDrift = "https://example.invalid/private/TEST_ONLY_VALIDATION_QUERY";
  assertInvalid(profile.replace(PRIVATE_URL, privateDrift), /group|URL|subscription/i, [privateDrift]);
  assertInvalid(profile.replace("interval: 1800", "interval: 601"), /group|platform|schema/i);
});

test("rejects unknown, swapped, duplicate, non-terminal, and URL-mutated rules", () => {
  const profile = validProfile();
  assertInvalid(profile.replace("  - domain_suffix:", "  - unknown_rule:"), /rule/i);

  const geo = [
    "  - geoip:",
    "      match: \"CN\"",
    "      policy: \"DIRECT\"",
  ].join("\n");
  const final = [
    "  - default:",
    "      policy: \"🚀 节点选择\"",
  ].join("\n");
  assertInvalid(profile.replace(geo, "TEST_ONLY_GEO_RULE").replace(final, geo).replace("TEST_ONLY_GEO_RULE", final), /rule|terminal|order/i);
  assertInvalid(profile.replace(final, `${final}\n${final}`), /rule|default|duplicate/i);

  const alternate = "https://example.invalid/edge/egern/rules/DomesticCore.yaml";
  assertInvalid(profile.replace(/https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/edge\/egern\/rules\/DomesticCore\.yaml/u, alternate), /rule|URL|catalog/i, [alternate]);
  const credentialed = `https://${["us", "er"].join("")}@juan-nikola.github.io/apple-proxy-profiles/edge/egern/rules/OverseasGame.yaml`;
  assertInvalid(profile.replace("https://juan-nikola.github.io/apple-proxy-profiles/edge/egern/rules/OverseasGame.yaml", credentialed), /rule|URL|catalog/i, [credentialed]);
});

test("rejects DNS drift and inline proxy-bearing content", () => {
  const profile = validProfile();
  assertInvalid(profile.replace("DomesticCore.yaml", "TEST_ONLY_WRONG_DNS_RULE.yaml"), /DNS|rule|URL/i, [
    "TEST_ONLY_WRONG_DNS_RULE",
  ]);
  assertInvalid(profile.replace('  proxy_nameservers:\n    - "system"', '  proxy_nameservers:\n    - "https://example.invalid/TEST_ONLY_VALIDATION_QUERY"'), /DNS/i);
  assertInvalid(`${profile}server: "private-node.example.invalid"\nport: 443\npassword: "TEST_ONLY_INLINE_PASSWORD"\n`, /root|credential|forbidden/i, [
    "private-node.example.invalid",
    "TEST_ONLY_INLINE_PASSWORD",
  ]);
});
