import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNodes, resolveNameCollisions } from "../../../shared/nodes/normalize-nodes.js";
import { fakeNodes } from "./fixtures/nodes.js";

test("normalizes names, preserves credential-distinct nodes, and removes spoofed UDP labels", () => {
  const input = [
    fakeNodes[0],
    structuredClone(fakeNodes[0]),
    { ...fakeNodes[0], password: "TEST_ONLY_DIFFERENT_VALUE" },
  ];
  const result = normalizeNodes(input);
  const reversed = normalizeNodes([...input].reverse());

  assert.equal(result.nodes.length, 2);
  assert.deepEqual(
    result.nodes.map((node) => node.name),
    reversed.nodes.map((node) => node.name),
  );
  for (const node of result.nodes) {
    assert.equal((node.name.match(/🇯🇵/g) ?? []).length, 1);
  }
  const falseUdp = normalizeNodes([{ ...fakeNodes[0], name: "US false marker [UDP]", udp: false }]);
  assert.equal(falseUdp.nodes[0].name.endsWith("[UDP]"), false);
  assert.equal(result.diagnostics.excluded["exact-duplicate"], 1);
});

test("chooses exact-duplicate provenance deterministically with least privilege", () => {
  const airport = {
    ...fakeNodes[0],
    name: "Airport duplicate",
    _subDisplayName: "[机场] Airport",
  };
  const selfHosted = {
    ...fakeNodes[0],
    name: "Self duplicate",
    _subDisplayName: "[自建] Self",
  };
  const forward = normalizeNodes([selfHosted, airport]);
  const reversed = normalizeNodes([airport, selfHosted]);

  assert.deepEqual(forward, reversed);
  assert.equal(forward.nodes.length, 1);
  assert.equal(forward.nodes[0]._profile.sourceKind, "airport");
  assert.equal(forward.nodes[0]._profile.p2p, false);
  assert.equal(forward.nodes[0].name.includes("[机场]"), true);
  assert.equal(JSON.stringify(forward.diagnostics).includes("TEST_ONLY_NOT_A_SECRET"), false);
});

test("creates only supported landing client-chain clones", () => {
  const chain = { ...fakeNodes[0], name: "JP chain", password: "TEST_ONLY_CHAIN_PASSWORD", _subDisplayName: undefined, _subName: "[链式代理] Chain" };
  const landingSs = { ...fakeNodes[0], name: "JP SS landing", password: "TEST_ONLY_LANDING_PASSWORD", _subDisplayName: undefined, _subName: "[落地] SS" };
  const hy2Landing = { ...fakeNodes[3], _subName: "[落地] HY2" };
  const result = normalizeNodes([fakeNodes[2], chain, hy2Landing, landingSs], {
    clientChain: "on",
  });

  const clones = result.nodes.filter((node) => node._profile.chained);
  assert.equal(clones.length, 1);
  assert.equal(clones[0]["underlying-proxy"], "🔗 入口节点");
  assert.equal(result.diagnostics.excluded["chain-protocol-unsupported"], 1);
  assert.equal(result.nodes.some((node) => node._profile.sourceKind === "realm" && node._profile.chained), false);
  assert.equal(result.nodes.some((node) => node._profile.sourceKind === "serverChain" && node._profile.chained), false);
  assert.equal(result.nodes.some((node) => node.type === "hysteria2" && node._profile.chained), false);
});

test("reports landing nodes when an eligible chain entry is unavailable", () => {
  const landing = { ...fakeNodes[0], _subDisplayName: undefined, _subName: "[落地] SS" };
  const result = normalizeNodes([landing], { clientChain: "on" });

  assert.equal(result.nodes.some((node) => node._profile.chained), false);
  assert.equal(result.diagnostics.excluded["chain-entry-missing"], 1);
});

test("diagnostics never include fixture endpoints or credentials", () => {
  const { diagnostics } = normalizeNodes(fakeNodes);
  const json = JSON.stringify(diagnostics);

  for (const secret of ["198.51.100.10", "TEST_ONLY_NOT_A_SECRET", "00000000-0000-4000-8000-000000000001"]) {
    assert.equal(json.includes(secret), false);
  }
});

test("aggregates normalized nodes by continent instead of their display flags", () => {
  const { diagnostics } = normalizeNodes(fakeNodes);

  assert.deepEqual(diagnostics.region, {
    asiaPacific: 2,
    americas: 1,
    europe: 1,
  });
});

test("creates chain clones for supported protocol types with surrounding whitespace", () => {
  const landing = {
    ...fakeNodes[0],
    type: " SS ",
    password: "TEST_ONLY_LANDING_WHITESPACE_PASSWORD",
    _subDisplayName: undefined,
    _subName: "[落地] SS",
  };
  const result = normalizeNodes([fakeNodes[0], landing], { clientChain: "on" });

  assert.equal(result.nodes.filter((node) => node._profile.chained).length, 1);
});

test("removes parser underscore metadata from output and identity", () => {
  const first = {
    ...fakeNodes[0],
    _resolved: true,
    _IPv4: "198.51.100.10",
    _parserMetadata: { provider: "first" },
  };
  const second = {
    ...fakeNodes[0],
    _resolved: false,
    _IPv4: "203.0.113.10",
    _parserMetadata: { provider: "second" },
  };
  const result = normalizeNodes([first, second]);

  assert.equal(result.nodes.length, 1);
  assert.equal(result.diagnostics.excluded["exact-duplicate"], 1);
  assert.deepEqual(Object.keys(result.nodes[0]).filter((key) => key.startsWith("_")), ["_profile"]);
  assert.equal(Object.hasOwn(result.nodes[0], "_resolved"), false);
  assert.equal(Object.hasOwn(result.nodes[0], "_IPv4"), false);
  assert.equal(Object.hasOwn(result.nodes[0], "_parserMetadata"), false);
});

test("keeps semantic underscore fields in identity without enumerating them", () => {
  const tcp = { ...fakeNodes[0], _network: "tcp" };
  const udp = { ...fakeNodes[0], _network: "udp" };
  const result = normalizeNodes([tcp, udp]);

  assert.equal(result.nodes.length, 2);
  assert.equal(result.diagnostics.excluded["exact-duplicate"], undefined);
  assert.deepEqual(result.nodes.map((node) => node._network).sort(), ["tcp", "udp"]);
  assert.equal(result.nodes.every((node) => Object.hasOwn(node, "_network")), true);
  assert.equal(result.nodes.every((node) => !Object.prototype.propertyIsEnumerable.call(node, "_network")), true);
});

test("canonicalizes protocol and port before identity and output", () => {
  const padded = { ...fakeNodes[0], type: " SS ", port: "0443" };
  const result = normalizeNodes([fakeNodes[0], padded]);

  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].type, "ss");
  assert.equal(result.nodes[0].port, 443);
  assert.equal(result.diagnostics.excluded["exact-duplicate"], 1);
});

test("does not use pre-chained nodes as entries or chain them again", () => {
  const preChainedEntry = {
    ...fakeNodes[0],
    password: "TEST_ONLY_PRE_CHAINED_ENTRY",
    "underlying-proxy": "existing-entry",
  };
  const preChainedLanding = {
    ...fakeNodes[0],
    password: "TEST_ONLY_PRE_CHAINED_LANDING",
    _subDisplayName: undefined,
    _subName: "[落地] SS",
    detour: "existing-detour",
  };
  const result = normalizeNodes([preChainedEntry, fakeNodes[1], preChainedLanding], { clientChain: "on" });

  assert.equal(result.nodes.filter((node) => node._profile.chained).length, 0);
  assert.equal(result.nodes.find((node) => node["underlying-proxy"] === "existing-entry")._profile.entry, false);
  assert.equal(result.nodes.find((node) => node.detour === "existing-detour").detour, "existing-detour");
});

test("strips spoofed existing-chain markers and re-derives them before the UDP suffix", () => {
  const spoofed = {
    ...fakeNodes[0],
    name: "JP [已有链] spoof [已有链]",
    password: "TEST_ONLY_SPOOFED_MARKER",
  };
  const preChained = {
    ...fakeNodes[0],
    name: "JP [已有链] real",
    password: "TEST_ONLY_REAL_MARKER",
    chain: "existing-hop",
  };
  const { nodes } = normalizeNodes([spoofed, preChained]);
  const eligible = nodes.find((node) => node._profile.entry);
  const restricted = nodes.find((node) => !node._profile.entry);

  assert.equal(eligible.name.includes("[已有链]"), false);
  assert.match(restricted.name, /\[已有链\] \[UDP\]$/);
  assert.equal((restricted.name.match(/\[已有链\]/g) ?? []).length, 1);
});

test("resolves colliding fingerprint suffixes by private identity order", () => {
  const nodes = [
    { name: "same", value: "b" },
    { name: "same", value: "a" },
  ];
  resolveNameCollisions(nodes, (node) => node.value, () => "abcdefg");

  assert.equal(nodes[0].name, "same #cdefg-2");
  assert.equal(nodes[1].name, "same #cdefg-1");
});

test("fails closed on malformed but present chain aliases", () => {
  const malformedEntry = {
    ...fakeNodes[0],
    password: "TEST_ONLY_MALFORMED_ENTRY",
    "underlying-proxy": [],
  };
  const malformedLanding = {
    ...fakeNodes[0],
    password: "TEST_ONLY_MALFORMED_LANDING",
    _subDisplayName: undefined,
    _subName: "[落地] SS",
    chain: {},
  };
  const result = normalizeNodes([malformedEntry, fakeNodes[1], malformedLanding], { clientChain: "on" });

  assert.equal(result.nodes.find((node) => node["underlying-proxy"] instanceof Array)._profile.entry, false);
  assert.equal(result.nodes.filter((node) => node._profile.chained).length, 0);
  assert.equal(result.diagnostics.excluded["chain-existing"], 1);
});
