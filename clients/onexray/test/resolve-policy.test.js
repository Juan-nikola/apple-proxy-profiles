import assert from "node:assert/strict";
import test from "node:test";

import { resolveOneXrayPolicy } from "../src/resolve-policy.js";

const OPTIONS = Object.freeze({
  clientChain: "off",
  clientChainTarget: "",
  policyOverrides: "",
});
const UUID = "00000000-0000-4000-8000-000000000001";
const SECRET = "TEST_ONLY_RESOLVER_SECRET";

function encoded(overrides) {
  return Buffer.from(JSON.stringify(overrides), "utf8").toString("base64url");
}

function node(name, id, metadata = {}) {
  return {
    name,
    type: "vless",
    server: `${id}.example.invalid`,
    port: 443,
    uuid: UUID,
    password: SECRET,
    _profile: {
      id,
      entry: false,
      landing: false,
      chained: false,
      ...metadata,
    },
  };
}

function resolve({ options = OPTIONS, allNodes = [], eligibleNodes = allNodes } = {}) {
  return resolveOneXrayPolicy({ options, allNodes, eligibleNodes });
}

function assertPrivateTargetError(action, label, target) {
  assert.throws(action, (error) => {
    assert.match(error.message, new RegExp(label, "u"));
    assert.match(error.message, new RegExp(target, "u"));
    assert.equal(error.message.includes(SECRET), false);
    assert.equal(error.message.includes("password"), false);
    assert.equal(error.message.includes("uuid"), false);
    assert.equal(error.message.includes("[object Object]"), false);
    return true;
  });
}

test("resolves shared fixed targets by exact normalized name and reuses a stable identity tag", () => {
  const fixed = node("🇺🇸 Los Angeles｜自建·U", "4c1a2e9d");
  const homepage = node("🇯🇵 Tokyo｜机场", "70d3c2e1", { entry: true });
  const resolution = resolve({
    options: {
      ...OPTIONS,
      policyOverrides: encoded({
        "🤖 AI 专用": "NODE:🇺🇸 Los Angeles｜自建·U",
        YouTube: "NODE:🇺🇸 Los Angeles｜自建·U",
        Apple: "DIRECT",
      }),
    },
    allNodes: [fixed, homepage],
  });

  assert.deepEqual(resolution.homepageNodes, [fixed, homepage]);
  assert.deepEqual(resolution.fixedNodes, [{ node: fixed, tag: "🇺🇸 Los Angeles｜自建·U" }]);
  assert.equal(resolution.finalOutbound, null);
  assert.deepEqual(resolution.targets.ai, {
    configured: "NODE:🇺🇸 Los Angeles｜自建·U",
    resolvedTag: "🇺🇸 Los Angeles｜自建·U",
    status: "fixed",
  });
  assert.deepEqual(resolution.targets.youtube, {
    configured: "NODE:🇺🇸 Los Angeles｜自建·U",
    resolvedTag: "🇺🇸 Los Angeles｜自建·U",
    status: "fixed",
  });
  assert.deepEqual(resolution.targets.apple, { configured: "DIRECT", resolvedTag: "direct", status: "direct" });
  assert.deepEqual(resolution.targets.github, { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" });
  assert.deepEqual(resolution.chain, { enabled: false, landingTag: null, entryCount: 2 });
  assert.equal(Object.isFrozen(resolution), true);
  assert.equal(Object.isFrozen(resolution.targets), true);
  assert.equal(Object.isFrozen(resolution.fixedNodes), true);
});

test("rejects every fixed target that cannot resolve to exactly one compatible normalized node without leaking node data", () => {
  const fixedName = "🇺🇸 Los Angeles｜自建·U";
  const fixed = node(fixedName, "4c1a2e9d");
  const incompatible = node(fixedName, "7a1f3d02");
  const cases = [
    [[fixed], [], "NODE:🇺🇸 los angeles｜自建·U"],
    [[], [], `NODE:${fixedName}`],
    [[fixed, incompatible], [fixed, incompatible], `NODE:${fixedName}`],
    [[incompatible], [], `NODE:${fixedName}`],
    [[fixed], [fixed], "NODE:🇺🇸 Los Angeles｜旧名"],
    [[fixed], [fixed], "NODE:proxy"],
    [[fixed], [fixed], "NODE:chainProxy"],
  ];

  for (const [allNodes, eligibleNodes, configured] of cases) {
    const target = configured.slice("NODE:".length);
    assertPrivateTargetError(
      () => resolve({
        options: { ...OPTIONS, policyOverrides: encoded({ "🤖 AI 专用": configured }) },
        allNodes,
        eligibleNodes,
      }),
      "🤖 AI 专用",
      target,
    );
  }
});

test("rejects duplicated normalized fixed targets even when capability filtering keeps one copy", () => {
  const name = "🇺🇸 Los Angeles｜自建·U";
  const compatible = node(name, "4c1a2e9d");
  const incompatible = node(name, "7a1f3d02");
  assertPrivateTargetError(
    () => resolve({
      options: { ...OPTIONS, policyOverrides: encoded({ "🤖 AI 专用": `NODE:${name}` }) },
      allNodes: [compatible, incompatible],
      eligibleNodes: [compatible],
    }),
    "🤖 AI 专用",
    name,
  );
  assert.throws(
    () => resolve({
      options: { ...OPTIONS, policyOverrides: encoded({ "🤖 AI 专用": `NODE:${name}` }) },
      allNodes: [compatible, incompatible],
      eligibleNodes: [compatible],
    }),
    /duplicated/u,
  );
});

test("rejects a matching fixed target in the generated ap-fixed namespace", () => {
  const name = "ap-fixed-reserved";
  const reserved = node(name, "4c1a2e9d");
  assertPrivateTargetError(
    () => resolve({
      options: { ...OPTIONS, policyOverrides: encoded({ "🤖 AI 专用": `NODE:${name}` }) },
      allNodes: [reserved],
      eligibleNodes: [reserved],
    }),
    "🤖 AI 专用",
    name,
  );
  assert.throws(
    () => resolve({
      options: { ...OPTIONS, policyOverrides: encoded({ "🤖 AI 专用": `NODE:${name}` }) },
      allNodes: [reserved],
      eligibleNodes: [reserved],
    }),
    /reserved/u,
  );
});

test("rejects malformed fixed target values with the business label and normalized target name", () => {
  assertPrivateTargetError(
    () => resolve({
      options: { ...OPTIONS, policyOverrides: encoded({ "🤖 AI 专用": "NODE:Tokyo\nSecret" }) },
    }),
    "🤖 AI 专用",
    "Tokyo",
  );
});

test("uses only entry nodes for chained homepage selection and keeps fixed routes outside the chain", () => {
  const entry = node("🇯🇵 Tokyo｜机场", "entry100", { entry: true });
  const nonEntry = node("🇸🇬 Singapore｜机场", "other200");
  const fixed = node("🇺🇸 Los Angeles｜自建·U", "fixed300");
  const landing = node("🇩🇪 Frankfurt｜落地", "land400", { landing: true });
  const resolution = resolve({
    options: {
      ...OPTIONS,
      clientChain: "on",
      clientChainTarget: "NODE:🇩🇪 Frankfurt｜落地",
      policyOverrides: encoded({ "🤖 AI 专用": "NODE:🇺🇸 Los Angeles｜自建·U" }),
    },
    allNodes: [entry, nonEntry, fixed, landing],
    eligibleNodes: [entry, nonEntry, fixed, landing],
  });

  assert.deepEqual(resolution.homepageNodes, [entry]);
  assert.deepEqual(resolution.finalOutbound, { node: landing, tag: "chainProxy" });
  assert.deepEqual(resolution.fixedNodes, [{ node: fixed, tag: "🇺🇸 Los Angeles｜自建·U" }]);
  assert.deepEqual(resolution.targets.ai, {
    configured: "NODE:🇺🇸 Los Angeles｜自建·U",
    resolvedTag: "🇺🇸 Los Angeles｜自建·U",
    status: "fixed",
  });
  assert.deepEqual(resolution.targets.github, { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" });
  assert.deepEqual(resolution.chain, { enabled: true, landingTag: "chainProxy", entryCount: 1 });
});

test("rejects chain activation without an entry node or exactly one compatible unchained landing target", () => {
  const entry = node("🇯🇵 Tokyo｜机场", "entry100", { entry: true });
  const landing = node("🇩🇪 Frankfurt｜落地", "land400", { landing: true });
  const chainOptions = (target) => ({ ...OPTIONS, clientChain: "on", clientChainTarget: `NODE:${target}` });
  assert.throws(
    () => resolve({ options: chainOptions("🇩🇪 Frankfurt｜落地"), allNodes: [], eligibleNodes: [] }),
    /全局客户端链/u,
  );

  const cases = [
    [[entry], [entry], "🇩🇪 Frankfurt｜落地"],
    (() => {
      const duplicateLanding = node(landing.name, "land401", { landing: true });
      return [[entry, landing, duplicateLanding], [entry, landing, duplicateLanding], landing.name];
    })(),
    [[entry, landing], [entry], landing.name],
    (() => {
      const nonLanding = node(landing.name, "land401");
      return [[entry, nonLanding], [entry, nonLanding], landing.name];
    })(),
    (() => {
      const chainedLanding = node(landing.name, "land401", { landing: true, chained: true });
      return [[entry, chainedLanding], [entry, chainedLanding], landing.name];
    })(),
  ];

  for (const [allNodes, eligibleNodes, target] of cases) {
    assert.throws(
      () => resolve({ options: chainOptions(target), allNodes, eligibleNodes }),
      new RegExp(target.replace(/[|\\{}()[\]^$+*?.-]/gu, "\\$&"), "u"),
    );
  }
});
