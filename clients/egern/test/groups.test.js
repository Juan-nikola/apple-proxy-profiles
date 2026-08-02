import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  buildPolicyGroups,
  GROUP_KIND,
  STRATEGY,
} from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { POLICY_GROUP_SCHEMA } from "../../../shared/policies/schema.js";
import { parseEgernOptions } from "../src/options.js";
import { renderEgernGroups } from "../src/render-groups.js";
import { renderYaml } from "../src/render-yaml.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes?key=TEST_ONLY_PRIVATE_QUERY";
const BUILTINS = new Set(["DIRECT", "REJECT"]);
const FOREIGN_GROUPS = Object.freeze([
  "🐙 GitHub",
  "📺 YouTube",
  "🎬 Netflix",
  "🏰 Disney+",
  "🎵 Spotify",
  "🌍 国际媒体",
  "✈️ Telegram",
  "💬 海外社交",
  "🎶 TikTok",
  "🕹️ 游戏平台",
]);
const DOMESTIC_GROUPS = Object.freeze([
  "🍎 Apple",
  "🪟 Microsoft",
  "📺 哔哩哔哩",
  "🎵 抖音",
  "📕 小红书",
  "🧣 微博",
]);

function normalizedNode(name, metadata = {}) {
  return {
    name,
    server: "192.0.2.10",
    password: "TEST_ONLY_RAW_NODE_CREDENTIAL",
    _profile: {
      continent: "asiaPacific",
      sourceKind: "airport",
      udp: false,
      p2p: false,
      entry: false,
      chained: false,
      ...metadata,
    },
  };
}

const INVENTORY = Object.freeze([
  normalizedNode("🇯🇵 [机场] TEST_ONLY_ASIA_NODE [UDP]", { udp: true, entry: true }),
  normalizedNode("🇩🇪 [自建] TEST_ONLY_EUROPE_NODE", {
    continent: "europe",
    sourceKind: "selfHosted",
    p2p: true,
  }),
  normalizedNode("🇺🇸 [Realm] TEST_ONLY_AMERICAS_NODE", {
    continent: "americas",
    sourceKind: "realm",
  }),
  normalizedNode("🇿🇦 [链式代理] TEST_ONLY_OTHER_NODE", {
    continent: "other",
    sourceKind: "serverChain",
    p2p: true,
  }),
  normalizedNode("🔗 🇯🇵 [落地] TEST_ONLY_CHAINED_NODE", {
    sourceKind: "landing",
    chained: true,
  }),
]);

function options(overrides = {}) {
  return {
    platform: "macos",
    blockMode: "balanced",
    autoGroupMode: "full",
    clientChain: "on",
    ...overrides,
  };
}

function privateUrl(value = PRIVATE_URL) {
  return parseEgernOptions({
    output: "config",
    type: "collection",
    name: "egern-groups",
    nodeSubscriptionUrl: value,
    platform: "macos",
  }).nodeSubscriptionUrl;
}

function renderedFields(rendered, name) {
  for (const record of rendered) {
    const type = Object.keys(record)[0];
    if (record[type].name === name) return { type, fields: record[type] };
  }
  return undefined;
}

function cloneGroup(group) {
  return {
    ...group,
    candidates: [...group.candidates],
    test: group.test === null ? null : { ...group.test },
  };
}

function assertSafeFailure(groups, url, pattern) {
  const forbidden = [
    "TEST_ONLY_PRIVATE_QUERY",
    "example.invalid",
    "TEST_ONLY_RAW_NODE",
    "TEST_ONLY_FILTER_PAYLOAD",
    "TEST_ONLY_CANDIDATE_PAYLOAD",
  ];
  assert.throws(
    () => renderEgernGroups(groups, url),
    (error) => {
      assert.match(error.message, pattern);
      assert.equal(/[\r\n]/u.test(error.message), false);
      for (const value of forbidden) assert.equal(error.message.includes(value), false, value);
      return true;
    },
  );
}

test("renders every shared catalog variant with exact names, order, and documented fields", () => {
  const typeMap = { select: "select", "auto-test": "auto_test", fallback: "fallback" };

  for (const platform of ["macos", "iphone", "ipad"]) {
    for (const blockMode of ["off", "security", "balanced", "strict"]) {
      for (const autoGroupMode of ["auto", "full", "balanced", "minimal"]) {
        for (const clientChain of ["off", "on"]) {
          const shared = buildPolicyGroups(
            options({ platform, blockMode, autoGroupMode, clientChain }),
            INVENTORY,
          );
          const rendered = renderEgernGroups(shared, privateUrl());
          assert.deepEqual(
            rendered.map((record) => record[Object.keys(record)[0]].name),
            shared.map((group) => group.name),
            `${platform}/${blockMode}/${autoGroupMode}/${clientChain}`,
          );
          assert.deepEqual(
            rendered.map((record) => Object.keys(record)[0]),
            shared.map((group) => typeMap[group.strategy]),
          );

          for (let index = 0; index < shared.length; index += 1) {
            const group = shared[index];
            const record = rendered[index];
            const [type] = Object.keys(record);
            const fields = record[type];
            assert.deepEqual(Object.keys(record), [type]);
            assert.equal(Object.hasOwn(fields, "flatten"), false);
            assert.equal(Object.hasOwn(fields, "kind"), false);
            assert.equal(Object.hasOwn(fields, "defaultChoice"), false);

            if (group.name === "🚀 节点选择") {
              assert.equal(type, "select");
              assert.deepEqual(fields, {
                name: group.name,
                urls: [PRIVATE_URL],
                update_interval: 21600,
              });
              continue;
            }

            const expectedPolicies = group.candidates.length === 0 ? undefined : group.candidates;
            assert.deepEqual(fields.policies, expectedPolicies, group.name);
            if (group.nodeFilter !== null) {
              assert.deepEqual(fields.urls, [PRIVATE_URL], group.name);
              assert.equal(fields.filter, group.nodeFilter, group.name);
              assert.equal(fields.update_interval, 21600, group.name);
            } else {
              assert.equal(Object.hasOwn(fields, "urls"), false, group.name);
              assert.equal(Object.hasOwn(fields, "filter"), false, group.name);
              assert.equal(Object.hasOwn(fields, "update_interval"), false, group.name);
            }
            assert.equal(fields.hidden, group.hidden);

            if (group.strategy === STRATEGY.autoTest) {
              assert.equal(fields.latency_test_url, group.test.url);
              assert.equal(fields.interval, group.test.interval);
              assert.equal(fields.timeout, group.test.timeout);
              assert.equal(fields.tolerance, group.test.tolerance);
            } else if (group.strategy === STRATEGY.fallback) {
              assert.equal(fields.latency_test_url, group.test.url);
              assert.equal(fields.interval, group.test.interval);
              assert.equal(fields.timeout, group.test.timeout);
              assert.equal(Object.hasOwn(fields, "tolerance"), false);
            } else {
              for (const field of ["latency_test_url", "interval", "timeout", "tolerance"]) {
                assert.equal(Object.hasOwn(fields, field), false, `${group.name}/${field}`);
              }
            }
          }
        }
      }
    }
  }
});

test("mounts the private subscription without leaking semantic or raw node values", () => {
  const shared = buildPolicyGroups(options(), INVENTORY);
  const rendered = renderEgernGroups(shared, privateUrl());
  const root = renderedFields(rendered, "🚀 节点选择");
  assert.deepEqual(root, {
    type: "select",
    fields: {
      name: "🚀 节点选择",
      urls: [PRIVATE_URL],
      update_interval: 21600,
    },
  });

  const serialized = JSON.stringify(rendered);
  assert.equal(serialized.includes("primary-proxy"), false);
  assert.equal(serialized.includes("PROXY"), false);
  assert.equal(serialized.includes("192.0.2.10"), false);
  assert.equal(serialized.includes("TEST_ONLY_RAW_NODE_CREDENTIAL"), false);
  for (const node of INVENTORY) assert.equal(serialized.includes(node.name), false, node.name);

  for (const group of shared.filter((item) => item.hidden === true)) {
    assert.equal(renderedFields(rendered, group.name).fields.hidden, true, group.name);
  }
});

test("pins service defaults, AI order, security defaults, and special eligibility", () => {
  for (const blockMode of ["off", "security", "balanced", "strict"]) {
    const shared = buildPolicyGroups(options({ blockMode }), INVENTORY);
    const rendered = renderEgernGroups(shared, privateUrl());
    for (const name of FOREIGN_GROUPS) {
      assert.equal(renderedFields(rendered, name).fields.policies[0], "🚀 节点选择", name);
    }
    for (const name of DOMESTIC_GROUPS) {
      assert.equal(renderedFields(rendered, name).fields.policies[0], "DIRECT", name);
    }
    assert.deepEqual(renderedFields(rendered, "🤖 AI 专用").fields.policies, [
      "🤖 AI 亚太",
      "🤖 AI 欧洲",
      "🤖 AI 美洲",
      "🤖 AI 其他/未分类",
    ]);

    const expectedSecurity = {
      off: ["DIRECT", "DIRECT", "DIRECT"],
      security: ["REJECT", "DIRECT", "DIRECT"],
      balanced: ["REJECT", "REJECT", "DIRECT"],
      strict: ["REJECT", "REJECT", "REJECT"],
    }[blockMode];
    assert.deepEqual(
      ["☣️ 安全威胁", "🧱 常见广告", "🕵️ 严格跟踪"].map(
        (name) => renderedFields(rendered, name).fields.policies[0],
      ),
      expectedSecurity,
    );
  }

  const eligible = renderEgernGroups(buildPolicyGroups(options(), INVENTORY), privateUrl());
  assert.ok(renderedFields(eligible, "🎮 游戏连接").fields.filter);
  assert.ok(renderedFields(eligible, "⬇️ 下载/P2P").fields.filter);

  const ineligibleInventory = [normalizedNode("🇯🇵 [机场] TEST_ONLY_TCP_NODE", { entry: true })];
  const ineligible = renderEgernGroups(
    buildPolicyGroups(options({ clientChain: "off" }), ineligibleInventory),
    privateUrl(),
  );
  for (const name of ["🎮 游戏连接", "⬇️ 下载/P2P"]) {
    assert.deepEqual(renderedFields(ineligible, name).fields, { name, policies: ["DIRECT"] });
  }
});

test("pins minimal, balanced, full, and eligible chain group graphs", () => {
  for (const [mode, expectedContinentPolicies] of [
    ["minimal", []],
    ["balanced", ["⚡ 亚太自动"]],
    ["full", ["⚡ 亚太自动", "🛟 亚太故障转移"]],
  ]) {
    const rendered = renderEgernGroups(
      buildPolicyGroups(options({ autoGroupMode: mode, clientChain: "off" }), INVENTORY),
      privateUrl(),
    );
    const asia = renderedFields(rendered, "🌏 亚太").fields;
    assert.deepEqual(asia.policies ?? [], expectedContinentPolicies, mode);
    assert.equal(Boolean(renderedFields(rendered, "⚡ 亚太自动")), mode !== "minimal", mode);
    assert.equal(Boolean(renderedFields(rendered, "🛟 亚太故障转移")), mode === "full", mode);
  }

  const rendered = renderEgernGroups(buildPolicyGroups(options({ clientChain: "on" }), INVENTORY), privateUrl());
  assert.deepEqual(renderedFields(rendered, "⚡ 入口自动").fields.policies, undefined);
  assert.deepEqual(renderedFields(rendered, "🔗 入口节点").fields.policies, ["⚡ 入口自动"]);
  assert.ok(renderedFields(rendered, "🎯 客户端落地"));
  assert.ok(
    rendered.findIndex((record) => record[Object.keys(record)[0]].name === "🔗 入口节点")
      > rendered.findIndex((record) => record[Object.keys(record)[0]].name === "🕵️ 严格跟踪"),
  );
});

test("rejects malformed group containers and fields without invoking accessors", () => {
  const valid = buildPolicyGroups(options(), INVENTORY);
  for (const input of [null, undefined, {}, "groups", 3]) {
    assertSafeFailure(input, privateUrl(), /array/i);
  }

  const accessor = cloneGroup(valid[0]);
  let calls = 0;
  Object.defineProperty(accessor, "name", {
    enumerable: true,
    get() {
      calls += 1;
      return "TEST_ONLY_RAW_NODE_ACCESSOR";
    },
  });
  assertSafeFailure([accessor, ...valid.slice(1)], privateUrl(), /accessor|data propert/i);
  assert.equal(calls, 0);

  const inherited = Object.assign(Object.create({ inherited: true }), cloneGroup(valid[0]));
  assertSafeFailure([inherited, ...valid.slice(1)], privateUrl(), /plain object/i);

  const customOuter = valid.map(cloneGroup);
  Object.setPrototypeOf(customOuter, Object.create(Array.prototype));
  assertSafeFailure(customOuter, privateUrl(), /ordinary array|Array\.prototype/i);

  const customCandidates = valid.map(cloneGroup);
  Object.setPrototypeOf(customCandidates[0].candidates, Object.create(Array.prototype));
  assertSafeFailure(customCandidates, privateUrl(), /candidate.*ordinary array|candidate.*Array\.prototype/i);

  const accessorCandidates = cloneGroup(valid[0]);
  let candidateCalls = 0;
  Object.defineProperty(accessorCandidates.candidates, "0", {
    enumerable: true,
    get() {
      candidateCalls += 1;
      return "TEST_ONLY_RAW_NODE_ACCESSOR";
    },
  });
  assertSafeFailure([accessorCandidates, ...valid.slice(1)], privateUrl(), /candidate.*data propert/i);
  assert.equal(candidateCalls, 0);

  const accessorTest = cloneGroup(valid[0]);
  let testCalls = 0;
  Object.defineProperty(accessorTest.test, "url", {
    enumerable: true,
    get() {
      testCalls += 1;
      return "https://example.invalid/TEST_ONLY_RAW_NODE_ACCESSOR";
    },
  });
  assertSafeFailure([accessorTest, ...valid.slice(1)], privateUrl(), /test.*data propert/i);
  assert.equal(testCalls, 0);

  const cases = [
    [{ ...cloneGroup(valid[0]), extra: "TEST_ONLY_RAW_NODE_EXTRA" }, /field/i],
    [{ ...cloneGroup(valid[0]), kind: "unknown" }, /kind/i],
    [{ ...cloneGroup(valid[0]), strategy: "round-robin" }, /strategy/i],
    [{ ...cloneGroup(valid[0]), name: "" }, /name/i],
    [{ ...cloneGroup(valid[0]), name: "injected\r\nname" }, /name/i],
    [{ ...cloneGroup(valid[0]), candidates: "DIRECT" }, /candidate/i],
    [{ ...cloneGroup(valid[0]), candidates: ["DIRECT", "DIRECT"] }, /duplicate candidate/i],
    [{ ...cloneGroup(valid[0]), candidates: [""] }, /candidate/i],
    [{ ...cloneGroup(valid[0]), candidates: ["injected\nvalue"] }, /candidate/i],
    [{ ...cloneGroup(valid[0]), nodeFilter: "[TEST_ONLY_FILTER_PAYLOAD" }, /filter/i],
    [{ ...cloneGroup(valid[0]), nodeFilter: "" }, /filter/i],
    [{ ...cloneGroup(valid[0]), hidden: "true" }, /hidden/i],
    [{ ...cloneGroup(valid[0]), defaultChoice: false }, /default/i],
    [{ ...cloneGroup(valid[0]), test: "test" }, /test/i],
    [{ ...cloneGroup(valid[0]), test: { ...valid[0].test, surprise: true } }, /test.*field/i],
    [{ ...cloneGroup(valid[0]), test: { ...valid[0].test, url: "file:///TEST_ONLY_RAW_NODE" } }, /test URL/i],
    [{ ...cloneGroup(valid[0]), test: { ...valid[0].test, interval: 1.5 } }, /interval/i],
    [{ ...cloneGroup(valid[0]), test: { ...valid[0].test, timeout: 61 } }, /timeout/i],
    [{ ...cloneGroup(valid[0]), test: { ...valid[0].test, tolerance: -1 } }, /tolerance/i],
  ];
  for (const [first, pattern] of cases) {
    assertSafeFailure([first, ...valid.slice(1)], privateUrl(), pattern);
  }
});

test("rejects duplicate, missing, cyclic, and semantic-token graph mutations", () => {
  const valid = buildPolicyGroups(options(), INVENTORY);
  const duplicate = valid.map(cloneGroup);
  duplicate[1].name = duplicate[0].name;
  assertSafeFailure(duplicate, privateUrl(), /duplicate group/i);

  const missing = valid.map(cloneGroup);
  missing.find((group) => group.name === "🐙 GitHub").candidates.push("TEST_ONLY_CANDIDATE_PAYLOAD");
  assertSafeFailure(missing, privateUrl(), /unknown reference/i);

  const cyclic = valid.map(cloneGroup);
  cyclic.find((group) => group.name === "⚡ 全部自动").candidates.push("🛟 全部故障转移");
  cyclic.find((group) => group.name === "🛟 全部故障转移").candidates.push("⚡ 全部自动");
  assertSafeFailure(cyclic, privateUrl(), /cycle/i);

  const misuse = valid.map(cloneGroup);
  misuse.find((group) => group.name === "🐙 GitHub").candidates.push(POLICY_TARGET.primaryProxy);
  assertSafeFailure(misuse, privateUrl(), /semantic|primary/i);

  const wrongRoot = valid.map(cloneGroup);
  wrongRoot.find((group) => group.name === "🚀 节点选择").candidates.push("DIRECT");
  assertSafeFailure(wrongRoot, privateUrl(), /sole|primary/i);
});

test("enforces the finite shared policy name, kind, and unconditional-group schema", () => {
  const valid = buildPolicyGroups(options(), INVENTORY);

  assert.equal(Object.isFrozen(POLICY_GROUP_SCHEMA), true);
  assert.equal(Object.isFrozen(POLICY_GROUP_SCHEMA.groups), true);
  assert.equal(Object.isFrozen(POLICY_GROUP_SCHEMA.requiredNames), true);

  const relabeled = valid.map(cloneGroup);
  relabeled.find((group) => group.name === "🐙 GitHub").kind = GROUP_KIND.ai;
  assertSafeFailure(relabeled, privateUrl(), /kind|schema/i);

  const missingRequired = valid
    .filter((group) => group.name !== "🐙 GitHub")
    .map(cloneGroup);
  assertSafeFailure(missingRequired, privateUrl(), /required|schema/i);

  const renamed = valid.map(cloneGroup);
  renamed.find((group) => group.name === "☣️ 安全威胁").name = "TEST_ONLY_RAW_NODE_RENAMED_GROUP";
  assertSafeFailure(renamed, privateUrl(), /name|schema|documented/i);

  for (const reserved of ["PROXY", POLICY_TARGET.primaryProxy, "DIRECT", "REJECT"]) {
    const mutation = valid.map(cloneGroup);
    mutation.find((group) => group.name === "☣️ 安全威胁").name = reserved;
    assertSafeFailure(mutation, privateUrl(), /reserved|name|schema/i);
  }
});

test("accepts only the exact shared filter assigned to each documented group", () => {
  const valid = buildPolicyGroups(options(), INVENTORY);
  const mutations = [];

  for (const filter of ["^(a+)+$", " ^(?!🔗 ).+$", "(?<TEST_ONLY_FILTER_PAYLOAD>a)"]) {
    const groups = valid.map(cloneGroup);
    groups.find((group) => group.name === "⚡ 全部自动").nodeFilter = filter;
    mutations.push(groups);
  }

  const swapped = valid.map(cloneGroup);
  const asia = swapped.find((group) => group.name === "🌏 亚太");
  const europe = swapped.find((group) => group.name === "🌍 欧洲");
  [asia.nodeFilter, europe.nodeFilter] = [europe.nodeFilter, asia.nodeFilter];
  mutations.push(swapped);

  const ineligible = buildPolicyGroups(
    options({ clientChain: "off" }),
    [normalizedNode("🇯🇵 [机场] TEST_ONLY_TCP_NODE")],
  ).map(cloneGroup);
  ineligible.find((group) => group.name === "🎮 游戏连接").nodeFilter = "^.+$";
  mutations.push(ineligible);

  for (const groups of mutations) assertSafeFailure(groups, privateUrl(), /filter/i);
});

test("accepts every generated conditional subset in canonical shared order", () => {
  const continents = ["asiaPacific", "europe", "americas", "other"];
  const sources = ["airport", "selfHosted", "realm", "serverChain"];

  for (let mask = 0; mask < 2 ** continents.length; mask += 1) {
    const nodes = continents
      .filter((_, index) => (mask & (1 << index)) !== 0)
      .map((continent, index) => normalizedNode(`TEST_ONLY_CONTINENT_${index}`, {
        continent,
        sourceKind: "unknown",
      }));
    for (const autoGroupMode of ["full", "balanced", "minimal"]) {
      renderEgernGroups(
        buildPolicyGroups(options({ autoGroupMode, clientChain: "off" }), nodes),
        privateUrl(),
      );
    }
  }

  for (let mask = 0; mask < 2 ** sources.length; mask += 1) {
    const nodes = [normalizedNode("TEST_ONLY_SOURCE_BASE", { sourceKind: "unknown" })];
    sources.forEach((sourceKind, index) => {
      if ((mask & (1 << index)) !== 0) {
        nodes.push(normalizedNode(`TEST_ONLY_SOURCE_${index}`, { sourceKind }));
      }
    });
    renderEgernGroups(buildPolicyGroups(options({ clientChain: "off" }), nodes), privateUrl());
  }

  for (const udp of [false, true]) {
    for (const p2p of [false, true]) {
      const base = normalizedNode("TEST_ONLY_SPECIAL_BASE", { udp, p2p, entry: true });
      for (const clientChain of ["off", "on"]) {
        const nodes = clientChain === "on"
          ? [base, normalizedNode("TEST_ONLY_SPECIAL_CHAIN", { chained: true, sourceKind: "landing" })]
          : [base];
        for (const blockMode of ["off", "security", "balanced", "strict"]) {
          renderEgernGroups(
            buildPolicyGroups(options({ blockMode, clientChain }), nodes),
            privateUrl(),
          );
        }
      }
    }
  }
});

test("rejects record swaps and every known-reference candidate semantic drift", () => {
  const valid = buildPolicyGroups(options({ blockMode: "security" }), INVENTORY);
  const mutations = [];

  const helperSwap = valid.map(cloneGroup);
  [helperSwap[0], helperSwap[1]] = [helperSwap[1], helperSwap[0]];
  mutations.push(helperSwap);

  const securityNameSwap = valid.map(cloneGroup);
  const threat = securityNameSwap.find((group) => group.name === "☣️ 安全威胁");
  const advertising = securityNameSwap.find((group) => group.name === "🧱 常见广告");
  [threat.name, advertising.name] = [advertising.name, threat.name];
  mutations.push(securityNameSwap);

  const impossibleSecurityMode = valid.map(cloneGroup);
  impossibleSecurityMode.find((group) => group.name === "🕵️ 严格跟踪").candidates = [
    "REJECT",
    "DIRECT",
  ];
  mutations.push(impossibleSecurityMode);

  const reversedDns = valid.map(cloneGroup);
  reversedDns.find((group) => group.name === "🧭 DNS 与规则下载").candidates.reverse();
  mutations.push(reversedDns);

  const reorderedService = valid.map(cloneGroup);
  const github = reorderedService.find((group) => group.name === "🐙 GitHub");
  [github.candidates[1], github.candidates[2]] = [github.candidates[2], github.candidates[1]];
  mutations.push(reorderedService);

  const removedCandidate = valid.map(cloneGroup);
  removedCandidate.find((group) => group.name === "🐙 GitHub").candidates.pop();
  mutations.push(removedCandidate);

  const addedCandidate = valid.map(cloneGroup);
  addedCandidate.find((group) => group.name === "🐙 GitHub").candidates.push("REJECT");
  mutations.push(addedCandidate);

  const defaultDrift = valid.map(cloneGroup);
  defaultDrift.find((group) => group.name === "🐙 GitHub").defaultChoice = "DIRECT";
  mutations.push(defaultDrift);

  for (const groups of mutations) {
    assertSafeFailure(groups, privateUrl(), /candidate|default|order|schema|semantic/i);
  }
});

test("reuses the strict private HTTPS URL validator and never exposes rejected URLs", () => {
  const valid = buildPolicyGroups(options(), INVENTORY);
  const rejected = [
    "http://example.invalid/private/egern-nodes?key=TEST_ONLY_PRIVATE_QUERY",
    `https://${["us", "er"].join("")}@example.invalid/private/egern-nodes?key=TEST_ONLY_PRIVATE_QUERY`,
    "https://example.invalid/private/egern-nodes#TEST_ONLY_PRIVATE_QUERY",
    "https://example.invalid/private/%0aTEST_ONLY_PRIVATE_QUERY",
    String.raw`https://example.invalid/private\TEST_ONLY_PRIVATE_QUERY`,
    " https://example.invalid/private/TEST_ONLY_PRIVATE_QUERY",
  ];
  for (const url of rejected) assertSafeFailure(valid, url, /nodeSubscriptionUrl/);
});

test("renders deterministic YAML and independently parses the policy group graph", (t) => {
  const rendered = renderEgernGroups(buildPolicyGroups(options(), INVENTORY), privateUrl());
  const yaml = renderYaml({ policy_groups: rendered });
  assert.equal(yaml, renderYaml({ policy_groups: renderEgernGroups(buildPolicyGroups(options(), INVENTORY), privateUrl()) }));

  const probe = spawnSync(
    "ruby",
    ["-e", "require 'json'; require 'yaml'; puts JSON.generate(YAML.safe_load(STDIN.read, aliases: false))"],
    { input: yaml, encoding: "utf8" },
  );
  if (probe.error?.code === "ENOENT") {
    t.skip("Ruby/Psych independent YAML parser is unavailable");
    return;
  }
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout), { policy_groups: rendered });

  const names = new Set(rendered.map((record) => record[Object.keys(record)[0]].name));
  for (const record of rendered) {
    const fields = record[Object.keys(record)[0]];
    for (const policy of fields.policies ?? []) {
      assert.ok(names.has(policy) || BUILTINS.has(policy), `${fields.name} -> ${policy}`);
    }
  }
});

test("shared semantic and strategy constants stay client-neutral", () => {
  assert.equal(POLICY_TARGET.primaryProxy, "primary-proxy");
  assert.notEqual(POLICY_TARGET.primaryProxy, "PROXY");
  assert.deepEqual(STRATEGY, { select: "select", autoTest: "auto-test", fallback: "fallback" });
  assert.equal(GROUP_KIND.primary, "primary");
});
