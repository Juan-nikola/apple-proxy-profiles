import assert from "node:assert/strict";
import test from "node:test";

import { buildGroups, effectiveAutoMode } from "../src/group-catalog.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { renderGroups } from "../src/render-groups.js";
import { CONTINENTS, continentFilter } from "../../../shared/policies/filters.js";
import { fakeNodes } from "./fixtures/nodes.js";

function node(name, metadata = {}) {
  const flag = metadata.flag
    ?? name.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0]
    ?? "🌐";
  return {
    name,
    _profile: {
      continent: "asiaPacific",
      flag,
      sourceKind: "airport",
      udp: false,
      p2p: false,
      entry: false,
      chained: false,
      ...metadata,
    },
  };
}

function options(overrides = {}) {
  return {
    platform: "iphone",
    autoGroupMode: "auto",
    clientChain: "off",
    blockMode: "balanced",
    ...overrides,
  };
}

function named(groups, name) {
  return groups.find((group) => group.name === name);
}

function matches(group, node) {
  return new RegExp(group.filter).test(node.name);
}

function auditGroupGraph(groups, nodes) {
  const groupNames = new Set(groups.map((group) => group.name));
  const nodeNames = new Set(nodes.map((node) => node.name));
  const builtins = new Set(["DIRECT", "REJECT", "PROXY"]);
  const edges = new Map(groups.map((group) => [group.name, []]));

  for (const group of groups) {
    for (const item of group.items ?? []) {
      assert.ok(groupNames.has(item) || nodeNames.has(item) || builtins.has(item), `${group.name} references ${item}`);
      if (groupNames.has(item)) edges.get(group.name).push(item);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(name) {
    assert.equal(visiting.has(name), false, `cycle at ${name}`);
    if (visited.has(name)) return;
    visiting.add(name);
    for (const target of edges.get(name)) visit(target);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of groupNames) visit(name);
  assert.equal(groupNames.size, groups.length, "duplicate group names");
}

test("selects effective automatic group detail by normalized node count", () => {
  assert.equal(effectiveAutoMode("full", 500), "full");
  assert.equal(effectiveAutoMode("balanced", 1), "balanced");
  assert.equal(effectiveAutoMode("minimal", 1), "minimal");
  assert.equal(effectiveAutoMode("auto", 30), "full");
  assert.equal(effectiveAutoMode("auto", 31), "balanced");
  assert.equal(effectiveAutoMode("auto", 101), "minimal");

  for (const count of [10, 50, 300]) {
    const groups = buildGroups(options(), Array.from({ length: count }, (_, index) => node(`🇯🇵 JP ${index}｜机场`)));
    assert.equal(named(groups, "🚀 节点选择").useSubscription, undefined);
    assert.equal(named(groups, "🚀 节点选择").filter, undefined);
    assert.deepEqual(named(groups, "🚀 节点选择").items, [
      "PROXY",
      "⚡ 全部自动",
      "🛟 全部故障转移",
      "🌏 亚太",
    ]);
  }

  const fallback = named(buildGroups(options(), [node("🇯🇵 JP｜机场")]), "🛟 全部故障转移");
  assert.deepEqual(
    { url: fallback.url, interval: fallback.interval, timeout: fallback.timeout, tolerance: fallback.tolerance, hidden: fallback.hidden },
    { url: "http://www.gstatic.com/generate_204", interval: 1800, timeout: 7, tolerance: 150, hidden: true },
  );
});

test("preserves root-to-continent references while keeping helpers hidden", () => {
  const groups = buildGroups(options(), Array.from({ length: 40 }, (_, index) => node(`🇯🇵 JP ${index}｜机场`)));
  const lines = renderGroups(groups, "订阅,名称");
  const asiaPacific = CONTINENTS.find((continent) => continent.key === "asiaPacific");

  assert.match(lines.find((line) => line.startsWith("🌏 亚太 =")), /^🌏 亚太 = select,/);
  assert.deepEqual(named(groups, "🌏 亚太").items, ["⚡ 亚太自动"]);
  assert.deepEqual(named(groups, "🚀 节点选择").items, [
    "PROXY",
    "⚡ 全部自动",
    "🛟 全部故障转移",
    "🌏 亚太",
  ]);
  assert.equal(
    lines.find((line) => line.startsWith("🚀 节点选择 =")),
    "🚀 节点选择 = select,PROXY,⚡ 全部自动,🛟 全部故障转移,🌏 亚太",
  );
  assert.equal(
    lines.find((line) => line.startsWith("🌏 亚太 =")),
    `🌏 亚太 = select,⚡ 亚太自动,订阅\\,名称,use=true,policy-regex-filter=${continentFilter(asiaPacific)}`,
  );
  assert.equal(lines.some((line) => line.includes("订阅\\,名称,use=true")), true);
  assert.equal(named(groups, "🌍 欧洲"), undefined);
  assert.equal(groups.some((group) => group.hidden === true), true);
  assert.equal(named(groups, "🌏 亚太").type, "select");
  assert.equal(named(groups, "🌏 亚太").useSubscription, true);
});

test("keeps service manual access and gates special service groups by eligibility", () => {
  const nodes = [
    node("🇯🇵 JP｜机场", { entry: true }),
    node("🇺🇸 US｜自建", { continent: "americas", sourceKind: "selfHosted", p2p: true }),
    node("🇩🇪 DE｜Realm", { continent: "europe", sourceKind: "realm", p2p: true }),
    node("🔗 🇯🇵 clone｜落地", { sourceKind: "landing", chained: true }),
    node("🇭🇰 UDP｜机场·U", { udp: true }),
  ];
  const groups = buildGroups(options({ clientChain: "on" }), nodes);

  const ai = named(groups, "🤖 AI 专用");
  assert.equal(ai.useSubscription, true);
  assert.equal(ai.filter, "^.+$");
  assert.deepEqual(ai.items, ["🤖 AI 亚太", "🤖 AI 欧洲", "🤖 AI 美洲"]);
  assert.deepEqual(named(groups, "🤖 AI 亚太").items, ["⚡ 亚太自动", "🛟 亚太故障转移"]);
  assert.equal(named(groups, "🤖 AI 亚太").useSubscription, true);
  assert.equal(named(groups, "🤖 AI 亚太").hidden, true);
  assert.equal(named(groups, "🤖 AI 欧洲").useSubscription, true);
  assert.equal(named(groups, "🤖 AI 美洲").useSubscription, true);
  const foreignItems = [
    "🚀 节点选择",
    "⚡ 全部自动",
    "🛟 全部故障转移",
    "🌏 亚太",
    "🌍 欧洲",
    "🌎 美洲",
    "DIRECT",
  ];
  const foreignGroups = [
    "🐙 GitHub", "📺 YouTube", "🎬 海外流媒体", "💬 海外社交", "🌍 海外游戏",
  ];
  const domesticGroups = [
    "🍎 Apple", "🪟 Microsoft", "🇨🇳 国内平台",
  ];
  for (const name of foreignGroups) {
    const group = named(groups, name);
    assert.deepEqual(group.items, foreignItems, name);
    assert.equal(group.policySelectName, "🚀 节点选择", name);
  }
  for (const name of domesticGroups) {
    const group = named(groups, name);
    assert.deepEqual(group.items, [
      "DIRECT",
      "🚀 节点选择",
      "⚡ 全部自动",
      "🛟 全部故障转移",
      "🌏 亚太",
      "🌍 欧洲",
      "🌎 美洲",
    ], name);
    assert.equal(group.policySelectName, "DIRECT", name);
  }
  assert.deepEqual(named(groups, "🧭 DNS 与规则下载").items, ["🚀 节点选择", "DIRECT"]);
  assert.equal(named(groups, "🧭 DNS 与规则下载").useSubscription, undefined);
  assert.equal(named(groups, "🧭 DNS 与规则下载").filter, undefined);
  assert.equal(named(groups, "⬇️ 下载/P2P").filter, "^(?!🔗 ).+｜(?:自建|Realm|链式代理)(?:·.*)?$");
  assert.equal(named(groups, "🎮 游戏连接").filter, "^(?!🔗 ).+·U$");
  assert.ok(named(groups, "🔗 入口节点"));
  assert.deepEqual(named(groups, "🔗 入口节点").items, ["⚡ 入口自动"]);
  assert.deepEqual(named(groups, "⚡ 入口自动").items, []);
  assert.equal(named(groups, "🔗 入口节点").useSubscription, true);
  assert.equal(named(groups, "⚡ 入口自动").useSubscription, true);
  assert.equal(
    named(groups, "🔗 入口节点").filter,
    "^(?!🔗 )(?!.*·链).+｜(?:机场|自建|Realm)(?:·.*)?$",
  );
  assert.equal(named(groups, "⚡ 入口自动").filter, named(groups, "🔗 入口节点").filter);
  assert.ok(named(groups, "⚡ 入口自动"));
  assert.ok(groups.indexOf(named(groups, "🔗 入口节点")) > groups.indexOf(named(groups, "🕵️ 严格跟踪")));

  for (const name of [...foreignGroups, ...domesticGroups]) {
    const group = named(groups, name);
    assert.equal(group.useSubscription, true, group.name);
    assert.equal(group.filter, "^.+$", group.name);
  }

  const github = named(groups, "🐙 GitHub");
  const [githubLine] = renderGroups([github], "SHADOWROCKET-NODES");
  assert.match(githubLine, /,SHADOWROCKET-NODES,use=true,policy-regex-filter=\^\.\+\$,policy-select-name=🚀 节点选择$/);
  assert.doesNotMatch(githubLine, /include-all-proxies/);

  const ineligible = buildGroups(options(), [node("🇯🇵 TCP｜机场")]);
  for (const name of ["🎮 游戏连接", "⬇️ 下载/P2P"]) {
    const group = named(ineligible, name);
    assert.deepEqual(group.items, ["DIRECT"]);
    assert.equal(group.useSubscription, undefined);
    assert.equal(group.filter, undefined);
  }
});

test("excludes chained clones from continent and special-candidate eligibility", () => {
  const groups = buildGroups(options({ clientChain: "on" }), [
    node("🔗 🇯🇵 [落地] clone", { chained: true, udp: true, p2p: true }),
  ]);

  assert.equal(named(groups, "🌏 亚太"), undefined);
  assert.equal(named(groups, "⚡ 亚太自动"), undefined);
  assert.deepEqual(named(groups, "🎮 游戏连接").items, ["DIRECT"]);
  assert.deepEqual(named(groups, "⬇️ 下载/P2P").items, ["DIRECT"]);
});

test("keeps chained clones out of the other-continent subscription filter", () => {
  const groups = buildGroups(options(), [
    node("🌐 Other｜机场", { continent: "other" }),
    node("🔗 🇯🇵 clone｜落地", { chained: true }),
  ]);
  const filter = new RegExp(named(groups, "🌐 其他/未分类").filter);

  assert.equal(filter.test("🌐 Other｜机场"), true);
  assert.equal(filter.test("🔗 🇯🇵 clone｜落地"), false);
});

test("does not use an already chained entry to enable client-chain groups", () => {
  const groups = buildGroups(options({ clientChain: "on" }), [
    node("🔗 🇯🇵 chained entry｜机场", { entry: true, chained: true }),
    node("🔗 🇯🇵 clone｜落地", { chained: true }),
  ]);

  assert.equal(named(groups, "⚡ 入口自动"), undefined);
  assert.equal(named(groups, "🔗 入口节点"), undefined);
  assert.equal(named(groups, "🎯 客户端落地"), undefined);
});

test("filters entry candidates by a reserved eligibility marker without serializing node names", () => {
  const validEntry = {
    ...fakeNodes[0],
    name: "JP, valid entry",
    password: "TEST_ONLY_VALID_ENTRY_PASSWORD",
  };
  const preChained = {
    ...fakeNodes[0],
    name: "JP prechained",
    password: "TEST_ONLY_PRECHAINED_ENTRY_PASSWORD",
    chain: "existing-hop",
  };
  const landing = {
    ...fakeNodes[0],
    name: "JP landing",
    password: "TEST_ONLY_ENTRY_FILTER_LANDING_PASSWORD",
    _subDisplayName: undefined,
    _subName: "[落地] SS",
  };
  const { nodes } = normalizeNodes([validEntry, preChained, landing], { clientChain: "on" });
  const validName = nodes.find((node) => node.name.includes("valid entry")).name;
  const preChainedName = nodes.find((node) => node.name.includes("prechained")).name;
  const groups = buildGroups(options({ clientChain: "on" }), nodes);
  const helperGroup = named(groups, "⚡ 入口自动");
  const selectorGroup = named(groups, "🔗 入口节点");
  const rendered = renderGroups([helperGroup, selectorGroup], "Shadowrocket-Nodes").join("\n");

  assert.equal(matches(helperGroup, nodes.find((node) => node.name === validName)), true);
  assert.equal(matches(helperGroup, nodes.find((node) => node.name === preChainedName)), false);
  assert.deepEqual(helperGroup.items, []);
  assert.deepEqual(selectorGroup.items, ["⚡ 入口自动"]);
  assert.equal(rendered.includes(validName), false);
  assert.equal(rendered.includes(preChainedName), false);
  assert.match(rendered, /,Shadowrocket-Nodes,use=true/);
  assert.doesNotMatch(rendered, /include-all-proxies/);
  assert.match(rendered, /policy-regex-filter=\^\(\?!🔗 \)\(\?!\.\*·链\)/);
});

test("references every available continent helper from its visible selector", () => {
  const nodes = [node("🇯🇵 JP｜机场")];

  assert.deepEqual(named(buildGroups(options({ autoGroupMode: "full" }), nodes), "🌏 亚太").items, [
    "⚡ 亚太自动",
    "🛟 亚太故障转移",
  ]);
  assert.deepEqual(named(buildGroups(options({ autoGroupMode: "minimal" }), nodes), "🌏 亚太").items, [
    "⚡ 亚太自动",
  ]);
});

test("keeps root group as a PROXY selector while AI continent order stays stable", () => {
  const mixed = [
    node("🇿🇦 ZA｜自建", { continent: "other" }),
    node("🇺🇸 US｜自建", { continent: "americas" }),
    node("🇩🇪 DE｜自建", { continent: "europe" }),
    node("🇯🇵 JP｜自建", { continent: "asiaPacific" }),
  ];
  const groups = buildGroups(options(), mixed);

  assert.deepEqual(named(groups, "🚀 节点选择").items, [
    "PROXY",
    "⚡ 全部自动",
    "🛟 全部故障转移",
    "🌏 亚太",
    "🌍 欧洲",
    "🌎 美洲",
    "🌐 其他/未分类",
  ]);
  assert.equal(named(groups, "🚀 节点选择").useSubscription, undefined);
  assert.equal(named(groups, "🚀 节点选择").filter, undefined);
  assert.deepEqual(named(groups, "🤖 AI 专用").items, [
    "🤖 AI 亚太",
    "🤖 AI 欧洲",
    "🤖 AI 美洲",
    "🤖 AI 其他/未分类",
  ]);
});

test("renders policy groups deterministically and escapes comma-delimited values", () => {
  const [line] = renderGroups([{
    name: "测试组",
    type: "url-test",
    items: ["DIRECT", "节点,一"],
    useSubscription: true,
    filter: "^节点,一$",
    url: "https://example.invalid/a,b",
    interval: 600,
    timeout: 5,
    tolerance: 100,
    hidden: true,
  }], "订阅,名称");

  assert.equal(
    line,
    "测试组 = url-test,DIRECT,节点\\,一,订阅\\,名称,use=true,policy-regex-filter=^节点\\,一$,url=https://example.invalid/a\\,b,interval=600,timeout=5,tolerance=100,hidden=1",
  );
});

test("renders subscription display names as one safely encoded field", () => {
  const group = { name: "订阅测试", type: "select", useSubscription: true, filter: "^.+$" };
  const cases = [
    ["Nodes=Prod", "Nodes=Prod"],
    ["末尾反斜杠\\", "末尾反斜杠\\\\"],
    ["中文 内部 空格,普通=标点", "中文 内部 空格\\,普通=标点"],
    ["use=true", "use=true"],
  ];

  for (const [subscriptionName, encodedName] of cases) {
    assert.equal(
      renderGroups([group], subscriptionName)[0],
      `订阅测试 = select,${encodedName},use=true,policy-regex-filter=^.+$`,
      subscriptionName,
    );
  }
});

test("rejects CR/LF in every rendered field before an INI line can be injected", () => {
  const group = { name: "安全组", type: "select", items: ["DIRECT"], useSubscription: true, filter: "^.+$" };

  assert.throws(() => renderGroups([group], "Nodes\nInjected"), /CR or LF/);
  assert.throws(
    () => renderGroups([{ ...group, items: ["node\r\ninjected"] }], "Nodes"),
    /CR or LF/,
  );
  assert.throws(
    () => renderGroups([{ ...group, filter: "^node\n.+$", url: "https://example.invalid/\r" }], "Nodes"),
    /CR or LF/,
  );
});

test("matches group filters against real normalized edge-case node names", () => {
  const airportComma = { ...fakeNodes[0], name: "JP, comma", password: "TEST_ONLY_COMMA_PASSWORD" };
  const collisionA = { ...fakeNodes[0], name: "JP collision", password: "TEST_ONLY_COLLISION_A" };
  const collisionB = { ...fakeNodes[0], name: "JP collision", password: "TEST_ONLY_COLLISION_B" };
  const unknownFlag = { ...fakeNodes[0], name: "🇿🇦 Unknown", password: "TEST_ONLY_UNKNOWN_PASSWORD" };
  const landing = {
    ...fakeNodes[0],
    name: "JP landing",
    password: "TEST_ONLY_LANDING_PASSWORD",
    _subDisplayName: undefined,
    _subName: "[落地] SS",
  };
  const { nodes } = normalizeNodes([
    airportComma,
    collisionA,
    collisionB,
    unknownFlag,
    fakeNodes[1],
    landing,
  ], { clientChain: "on" });
  const groups = buildGroups(options({ clientChain: "on" }), nodes);
  const commaNode = nodes.find((node) => node.name.includes("JP, comma"));
  const collisions = nodes.filter((node) => node.name.includes("JP collision · SS｜机场·U #"));
  const unknown = nodes.find((node) => node.name.startsWith("🇿🇦"));
  const udp = nodes.find((node) => node.name.includes("JP, comma"));
  const clone = nodes.find((node) => node._profile.chained);

  assert.equal(collisions.length, 2);
  assert.equal(matches(named(groups, "🌏 亚太"), commaNode), true);
  assert.equal(matches(named(groups, "🌏 亚太"), unknown), false);
  assert.equal(matches(named(groups, "🏢 机场节点"), commaNode), true);
  assert.equal(collisions.every((node) => matches(named(groups, "🏢 机场节点"), node)), true);
  assert.equal(matches(named(groups, "🌐 其他/未分类"), unknown), true);
  assert.equal(matches(named(groups, "🎮 游戏连接"), udp), true);
  assert.equal(matches(named(groups, "⬇️ 下载/P2P"), nodes.find((node) => node._profile.p2p)), true);
  assert.equal(matches(named(groups, "🎯 客户端落地"), clone), true);
  assert.equal(matches(named(groups, "🎮 游戏连接"), clone), false);
  assert.equal(matches(named(groups, "🏢 机场节点"), clone), false);
});

test("keeps every catalog variant free of duplicates, dangling references, and cycles", () => {
  const plain = [node("🇯🇵 JP｜机场·U", { entry: true, udp: true }), node("🇿🇦 Other｜自建", { continent: "other", sourceKind: "selfHosted", p2p: true })];
  const chained = [...plain, node("🔗 🇯🇵 clone｜落地", { chained: true })];

  for (const inventory of [plain, chained]) {
    for (const autoGroupMode of ["full", "balanced", "minimal"]) {
      auditGroupGraph(buildGroups(options({ autoGroupMode, clientChain: "on" }), inventory), inventory);
    }
  }
});
