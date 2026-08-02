import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { orderedRuleAssignments } from "../../../shared/rules/catalog.js";
import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { parseEgernOptions, PUBLIC_SNAPSHOT_BASE_URL } from "../src/options.js";
import {
  prepareEgernInventory,
  renderEgernSubscription,
} from "../src/render-subscription.js";
import {
  renderEgernCustomRules,
  renderEgernRules,
} from "../src/render-rules.js";
import {
  renderEgernProfile,
  renderEgernProfileFromOptions,
} from "../src/render-profile.js";
import { validateEgernProfile } from "../src/validate-profile.js";
import {
  allCompatibleNodes,
  fixture,
  shadowsocks2022,
  ssh,
} from "./fixtures/nodes.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes?key=TEST_ONLY_PROFILE_QUERY";
const RULE_BASE = `${PUBLIC_SNAPSHOT_BASE_URL}/egern/rules`;

function rawOptions(overrides = {}) {
  return {
    output: "config",
    type: "collection",
    name: "egern-profile",
    nodeSubscriptionUrl: PRIVATE_URL,
    platform: "macos",
    ...overrides,
  };
}

function rubyParse(yaml) {
  const result = spawnSync(
    "ruby",
    ["-e", "require 'json'; require 'yaml'; puts JSON.generate(YAML.safe_load(STDIN.read, aliases: false))"],
    { input: yaml, encoding: "utf8" },
  );
  if (result.error?.code === "ENOENT") return null;
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function namedGroup(profile, name) {
  for (const record of profile.policy_groups) {
    const type = Object.keys(record)[0];
    if (record[type].name === name) return record[type];
  }
  return undefined;
}

test("parsed-options renderer rejects objects that did not pass the canonical parser", () => {
  const parsed = parseEgernOptions(rawOptions());
  assert.doesNotThrow(() => renderEgernProfileFromOptions(parsed, allCompatibleNodes));
  assert.throws(
    () => renderEgernProfileFromOptions({ ...parsed }, allCompatibleNodes),
    { message: "Parsed Egern options are required" },
  );
});

test("renders exact Egern-native rule parity and terminal ordering", () => {
  const rules = renderEgernRules({ publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL });
  const assignments = orderedRuleAssignments();
  const remote = rules.filter((record) => Object.hasOwn(record, "rule_set"));

  assert.equal(assignments.length, 32);
  assert.equal(remote.length, 32);
  assert.deepEqual(
    remote.map((record) => record.rule_set.match),
    assignments.map(({ sourceId }) => `${RULE_BASE}/${sourceId}.yaml`),
  );
  assert.deepEqual(rules.slice(-2), [
    { geoip: { match: "CN", policy: "DIRECT", no_resolve: true } },
    { default: { policy: "🚀 节点选择" } },
  ]);

  assert.deepEqual(rules.slice(0, 14), [
    { domain_suffix: { match: "local", policy: "DIRECT" } },
    { domain_suffix: { match: "home.arpa", policy: "DIRECT" } },
    { domain_suffix: { match: "lan", policy: "DIRECT" } },
    { ip_cidr: { match: "10.0.0.0/8", policy: "DIRECT", no_resolve: true } },
    { ip_cidr: { match: "100.64.0.0/10", policy: "DIRECT", no_resolve: true } },
    { ip_cidr: { match: "127.0.0.0/8", policy: "DIRECT", no_resolve: true } },
    { ip_cidr: { match: "169.254.0.0/16", policy: "DIRECT", no_resolve: true } },
    { ip_cidr: { match: "172.16.0.0/12", policy: "DIRECT", no_resolve: true } },
    { ip_cidr: { match: "192.168.0.0/16", policy: "DIRECT", no_resolve: true } },
    { ip_cidr: { match: "224.0.0.0/4", policy: "DIRECT", no_resolve: true } },
    { ip_cidr6: { match: "::1/128", policy: "DIRECT", no_resolve: true } },
    { ip_cidr6: { match: "fc00::/7", policy: "DIRECT", no_resolve: true } },
    { ip_cidr6: { match: "fe80::/10", policy: "DIRECT", no_resolve: true } },
    { ip_cidr6: { match: "ff00::/8", policy: "DIRECT", no_resolve: true } },
  ]);

  for (const domain of ["perplexity.ai", "pplx.ai", "x.ai", "grok.com", "poe.com", "poecdn.net"]) {
    assert.ok(rules.some((record) => record.domain_suffix?.match === domain
      && record.domain_suffix.policy === "🤖 AI 专用"), domain);
  }

  const steamIndex = rules.findIndex((record) => record.rule_set?.match.endsWith("/SteamCN.yaml"));
  const gameIndex = rules.findIndex((record) => record.rule_set?.match.endsWith("/Game.yaml"));
  for (const domain of ["leiting.com", "leitingcn.com", "g-bits.com"]) {
    const index = rules.findIndex((record) => record.domain_suffix?.match === domain);
    assert.ok(index < steamIndex, domain);
  }
  assert.deepEqual(rules[gameIndex - 1], {
    and: {
      match: [
        { protocol: { match: "udp" } },
        { rule_set: { match: `${RULE_BASE}/Game.yaml` } },
      ],
      policy: "🎮 游戏连接",
    },
  });
  assert.equal(rules[gameIndex].rule_set.policy, "🕹️ 游戏平台");

  const serialized = JSON.stringify(rules);
  assert.equal(serialized.match(/Advertising\.yaml/gu)?.length, 1);
  assert.equal(serialized.match(/Advertising_Domain\.yaml/gu)?.length, 1);
  assert.equal(serialized.match(/Game\.yaml/gu)?.length, 2);
});

test("strictly translates supported shared custom rules with safe failures", () => {
  assert.deepEqual(renderEgernCustomRules({
    block: ["DOMAIN,blocked.example"],
    direct: ["IP-CIDR,192.0.2.0/24"],
    proxy: ["DOMAIN-KEYWORD,proxy-keyword"],
    ai: ["DOMAIN-SUFFIX,ai.example"],
  }), [
    { domain: { match: "blocked.example", policy: "REJECT" } },
    { ip_cidr: { match: "192.0.2.0/24", policy: "DIRECT", no_resolve: true } },
    { domain_keyword: { match: "proxy-keyword", policy: "🚀 节点选择" } },
    { domain_suffix: { match: "ai.example", policy: "🤖 AI 专用" } },
  ]);

  const invalid = [
    null,
    { block: [], direct: [], proxy: [], ai: [], extra: [] },
    { block: ["DOMAIN-SUFFIX,duplicate.example"], direct: ["DOMAIN-SUFFIX,duplicate.example"], proxy: [], ai: [] },
    { block: ["UNKNOWN,shape"], direct: [], proxy: [], ai: [] },
    { block: ["DOMAIN-SUFFIX,too,many"], direct: [], proxy: [], ai: [] },
    { block: ["DOMAIN-SUFFIX,injected\nvalue"], direct: [], proxy: [], ai: [] },
    { block: ["DOMAIN-SUFFIX,-broken.example"], direct: [], proxy: [], ai: [] },
    { block: ["DOMAIN,bad..example"], direct: [], proxy: [], ai: [] },
    { block: ["DOMAIN-KEYWORD, ambiguous value"], direct: [], proxy: [], ai: [] },
    { block: [], direct: ["IP-CIDR,192.0.2.999/24"], proxy: [], ai: [] },
    { block: [], direct: ["IP-CIDR,192.0.2.0/33"], proxy: [], ai: [] },
    { block: [], direct: ["IP-CIDR6,2001:db8::/129"], proxy: [], ai: [] },
    { block: [], direct: ["IP-CIDR6,192.0.2.1::/64"], proxy: [], ai: [] },
  ];
  for (const custom of invalid) {
    assert.throws(() => renderEgernCustomRules(custom), /^Error: Invalid Egern custom rule configuration$/);
  }
});

test("rejects hostile custom-rule arrays without invoking getters or reflecting traps", () => {
  const fixed = /^Invalid Egern custom rule configuration$/;
  const config = (block) => ({ block, direct: [], proxy: [], ai: [] });
  const trapText = "TEST_ONLY_HOSTILE_ARRAY_TRAP";

  const hostile = [
    new Proxy([], {
      getPrototypeOf() { throw new Error(trapText); },
    }),
    new Proxy([], {
      ownKeys() { throw new Error(trapText); },
    }),
    new Proxy([], {
      getOwnPropertyDescriptor(target, key) {
        if (key === "length") throw new Error(trapText);
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    }),
    new Proxy(["DOMAIN,blocked.example"], {
      getOwnPropertyDescriptor(target, key) {
        if (key === "0") throw new Error(trapText);
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    }),
    new Array(1),
    Object.assign([], { extra: "DOMAIN,blocked.example" }),
    Object.assign([], { [Symbol("hostile")]: "DOMAIN,blocked.example" }),
    Object.setPrototypeOf([], null),
  ];
  const revoked = Proxy.revocable([], {});
  revoked.revoke();
  hostile.push(revoked.proxy);

  let getterInvoked = false;
  const accessor = [];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    configurable: true,
    get() {
      getterInvoked = true;
      throw new Error(trapText);
    },
  });
  hostile.push(accessor);
  const hiddenItem = [];
  Object.defineProperty(hiddenItem, "0", {
    value: "DOMAIN,blocked.example",
    enumerable: false,
    configurable: true,
  });
  hostile.push(hiddenItem);

  for (const value of hostile) {
    assert.throws(() => renderEgernCustomRules(config(value)), (error) => {
      assert.match(error.message, fixed);
      assert.equal(error.message.includes(trapText), false);
      return true;
    });
  }
  assert.equal(getterInvoked, false);

  let lengthGetterInvoked = false;
  const guardedLength = new Proxy(["DOMAIN,blocked.example"], {
    get(target, key, receiver) {
      if (key === "length") {
        lengthGetterInvoked = true;
        throw new Error(trapText);
      }
      return Reflect.get(target, key, receiver);
    },
  });
  assert.deepEqual(renderEgernCustomRules(config(guardedLength)), [
    { domain: { match: "blocked.example", policy: "REJECT" } },
  ]);
  assert.equal(lengthGetterInvoked, false);
  assert.deepEqual(renderEgernCustomRules(config(Object.freeze([
    "DOMAIN,blocked.example",
  ]))), [
    { domain: { match: "blocked.example", policy: "REJECT" } },
  ]);
});

test("renders the complete root without inline proxies or private node material", () => {
  const yaml = renderEgernProfile(rawOptions(), allCompatibleNodes);
  const validation = validateEgernProfile(yaml);
  assert.deepEqual(validation, { valid: true, errors: [] });
  const profile = rubyParse(yaml);
  if (profile === null) return;

  assert.deepEqual(Object.keys(profile), [
    "auto_update",
    "ipv6",
    "block_quic",
    "close_connections_on_policy_change",
    "bypass_tunnel_proxy",
    "real_ip_domains",
    "hijack_dns",
    "dns",
    "policy_groups",
    "rules",
    "default_subscription_group",
  ]);
  assert.deepEqual(profile.auto_update, {});
  assert.equal(profile.ipv6, false);
  assert.equal(profile.block_quic, false);
  assert.equal(profile.close_connections_on_policy_change, true);
  assert.deepEqual(profile.hijack_dns, ["*"]);
  assert.equal(profile.default_subscription_group, "🚀 节点选择");
  assert.deepEqual(profile.real_ip_domains, [
    "*.local",
    "*.lan",
    "*.home.arpa",
    "*.push.apple.com",
  ]);
  for (const value of [
    "localhost", "*.local", "*.lan", "*.home.arpa",
    "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
    "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4",
    "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
  ]) assert.ok(profile.bypass_tunnel_proxy.includes(value), value);

  for (const forbidden of [
    "proxies", "mitm", "modules", "scriptings", "url_rewrites", "http_captures",
  ]) assert.equal(Object.hasOwn(profile, forbidden), false, forbidden);
  for (const node of allCompatibleNodes) {
    assert.equal(yaml.includes(node.server), false, node.name);
  }
  assert.equal(yaml.includes("TEST_ONLY_SS_2022_KEY"), false);
});

test("maps platform IPv6 defaults and explicit ipv4-only mode", () => {
  for (const [platform, expected] of [
    ["macos", false],
    ["iphone", true],
    ["ipad", true],
  ]) {
    const automatic = rubyParse(renderEgernProfile(rawOptions({ platform }), allCompatibleNodes));
    const ipv4Only = rubyParse(renderEgernProfile(
      rawOptions({ platform, ipv6Mode: "ipv4-only" }),
      allCompatibleNodes,
    ));
    if (automatic === null || ipv4Only === null) return;
    assert.equal(automatic.ipv6, expected, `${platform} automatic IPv6`);
    assert.equal(ipv4Only.ipv6, false, `${platform} explicit IPv4-only`);
  }
});

test("maps all three QUIC modes at the correct global or semantic group layer", () => {
  const profiles = Object.fromEntries(["allow", "proxy-block", "all-block"].map((quicMode) => {
    const parsed = rubyParse(renderEgernProfile(rawOptions({ quicMode }), allCompatibleNodes));
    return [quicMode, parsed];
  }));
  if (Object.values(profiles).some((profile) => profile === null)) return;

  assert.equal(profiles.allow.block_quic, false);
  assert.equal(profiles["proxy-block"].block_quic, false);
  assert.equal(profiles["all-block"].block_quic, true);
  for (const profile of [profiles.allow, profiles["all-block"]]) {
    for (const record of profile.policy_groups) {
      const fields = record[Object.keys(record)[0]];
      assert.equal(Object.hasOwn(fields, "block_quic"), false, fields.name);
    }
  }

  const proxyBlock = profiles["proxy-block"];
  for (const name of [
    "🚀 节点选择", "⚡ 全部自动", "🌏 亚太", "🤖 AI 专用", "🐙 GitHub", "🧭 DNS 与规则下载",
  ]) assert.equal(namedGroup(proxyBlock, name).block_quic, true, name);
  for (const name of [
    "🍎 Apple", "🪟 Microsoft", "☣️ 安全威胁", "🧱 常见广告", "🕵️ 严格跟踪", "🏢 机场节点",
  ]) assert.equal(Object.hasOwn(namedGroup(proxyBlock, name), "block_quic"), false, name);
});

test("profile and subscription reuse one prepared Egern chain-adjusted inventory", () => {
  const landing = {
    ...ssh,
    name: "SSH Landing",
    _profile: { ...ssh._profile, sourceKind: "landing", entry: false, chained: false },
  };
  const nodes = [shadowsocks2022, landing];
  const diagnostics = [];
  const prepared = prepareEgernInventory(nodes, {
    clientChain: "on",
    onDiagnostics(value) { diagnostics.push(value); },
  });
  assert.equal(prepared.nodes.some((node) => node.name === "🔗 SSH Landing"), true);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].accepted, prepared.nodes.length);

  const subscription = renderEgernSubscription(nodes, { clientChain: "on" });
  assert.match(subscription, /"🔗 SSH Landing"/);
  const profileYaml = renderEgernProfile(rawOptions({ clientChain: "on" }), nodes);
  assert.match(profileYaml, /"🎯 客户端落地"/);
  assert.match(profileYaml, /"🔗 入口节点"/);
  assert.deepEqual(validateEgernProfile(profileYaml), { valid: true, errors: [] });

  const shared = buildPolicyGroups(parseEgernOptions(rawOptions({ clientChain: "on" })), prepared.nodes);
  assert.equal(shared.some((group) => group.name === "🎯 客户端落地"), true);
});

test("fails closed with count-only diagnostics when no Egern node is compatible", () => {
  const secretNode = fixture("TEST_ONLY_PRIVATE_PROFILE_NODE", "vless", {
    server: "private-profile-endpoint.example.invalid",
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "TEST_ONLY_PRIVATE_PROFILE_TRANSPORT",
    password: "TEST_ONLY_PRIVATE_PROFILE_PASSWORD",
  });
  assert.throws(
    () => renderEgernProfile(rawOptions(), [secretNode]),
    (error) => {
      assert.match(error.message, /No compatible Egern nodes/);
      for (const value of [secretNode.name, secretNode.server, secretNode.network, secretNode.password]) {
        assert.equal(error.message.includes(value), false);
      }
      return true;
    },
  );
});

test("profile and subscription share final adapter and duplicate-name gates", () => {
  const duplicate = { ...shadowsocks2022, password: "TEST_ONLY_DUPLICATE_PROFILE_PASSWORD" };
  for (const render of [
    () => renderEgernSubscription([shadowsocks2022, duplicate]),
    () => renderEgernProfile(rawOptions(), [shadowsocks2022, duplicate]),
  ]) {
    assert.throws(render, (error) => {
      assert.equal(error.message, "Duplicate Egern proxy name");
      assert.equal(error.message.includes(duplicate.password), false);
      return true;
    });
  }

  function adapterMalformedSsh() {
    let reads = 0;
    const node = { ...ssh };
    Object.defineProperty(node, "host-keys", {
      enumerable: true,
      get() {
        reads += 1;
        return reads <= 2 ? ["ssh-ed25519 TEST_ONLY_ADAPTER_HOST_KEY"] : 7;
      },
    });
    return node;
  }
  for (const render of [
    () => renderEgernSubscription([adapterMalformedSsh()]),
    () => renderEgernProfile(rawOptions(), [adapterMalformedSsh()]),
  ]) assert.throws(render);
});

test("rejects alternate public rule bases without exposing their values", () => {
  const rejected = [
    "https://example.invalid/current",
    `https://${["us", "er"].join("")}@juan-nikola.github.io/apple-proxy-profiles/current`,
    `${PUBLIC_SNAPSHOT_BASE_URL}#fragment`,
    `${PUBLIC_SNAPSHOT_BASE_URL}/%0aTEST_ONLY_PRIVATE_PROFILE_QUERY`,
  ];
  for (const publicBaseUrl of rejected) {
    assert.throws(
      () => renderEgernRules({ publicBaseUrl }),
      (error) => {
        assert.equal(error.message, "Invalid Egern public rule base");
        assert.equal(error.message.includes(publicBaseUrl), false);
        return true;
      },
    );
  }
});
