import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

import { operator as sourceNodeOperator } from "../src/substore-nodes-entry.js";
import { operator as sourceProfileOperator } from "../src/substore-profile-entry.js";
import { validateEgernProfile } from "../src/validate-profile.js";

const NODE_BUNDLE = new URL("../dist/substore-node-generator.js", import.meta.url);
const PROFILE_BUNDLE = new URL("../dist/substore-profile-generator.js", import.meta.url);
const BUILD_SCRIPT = new URL("../scripts/build.mjs", import.meta.url);
const FIXTURE_SCRIPT = new URL("../scripts/render-fixtures.mjs", import.meta.url);
const PRIVATE_URL = "https://example.invalid/private/egern-nodes";
const NODE_ARGUMENTS = { output: "nodes", type: "collection", name: "egern-sources", clientChain: "on" };
const PROFILE_ARGUMENTS = {
  output: "config",
  type: "collection",
  name: "egern-sources",
  nodeSubscriptionUrl: PRIVATE_URL,
  platform: "macos",
  clientChain: "on",
};

function rawInventory() {
  return [
    {
      name: "Tokyo Entry",
      type: "ss",
      server: "198.51.100.30",
      port: 443,
      cipher: "aes-128-gcm",
      password: "TEST_ONLY_BUNDLE_SS_PASSWORD",
      udp: true,
      _subName: "[自建] Tokyo",
    },
    {
      name: "SSH Landing",
      type: "ssh",
      server: "192.0.2.30",
      port: 22,
      username: "TEST_ONLY_BUNDLE_SSH_USER",
      password: "TEST_ONLY_BUNDLE_SSH_PASSWORD",
      _subName: "[落地] SSH",
    },
  ];
}

function incompatibleInventory() {
  return [{
    name: "Incompatible transport",
    type: "vless",
    server: "private-incompatible.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "TEST_ONLY_BUNDLE_PRIVATE_TRANSPORT",
  }];
}

function adapterInvalidInventory() {
  return [{
    name: "Invalid Egern method",
    type: "ss",
    server: "private-method.example.invalid",
    port: 443,
    cipher: "TEST_ONLY_BUNDLE_PRIVATE_METHOD",
    password: "TEST_ONLY_BUNDLE_PRIVATE_PASSWORD",
  }];
}

function loadBundle(source, { arguments: arguments_, produced, producerError } = {}) {
  const lines = [];
  const requests = [];
  const context = vm.createContext({
    URL,
    console: {
      info(value) { lines.push(String(value)); },
      log(value) { lines.push(String(value)); },
    },
  });
  context.__argumentsJson = JSON.stringify(arguments_);
  context.__producedJson = JSON.stringify(produced);
  vm.runInContext([
    "globalThis.$arguments = JSON.parse(__argumentsJson);",
    "globalThis.__produced = JSON.parse(__producedJson);",
    "globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));",
    "delete globalThis.__argumentsJson;",
    "delete globalThis.__producedJson;",
  ].join("\n"), context);
  context.produceArtifact = async (request) => {
    requests.push({ ...request });
    if (producerError) throw new Error(producerError);
    return context.__produced;
  };
  vm.runInContext(source, context, { timeout: 2_000 });
  return { context, lines, requests };
}

async function sourceRun(operator, arguments_, produced) {
  const lines = [];
  const requests = [];
  const result = await operator({ unchanged: true }, "Egern", {
    arguments: arguments_,
    async produceArtifact(request) {
      requests.push(request);
      return structuredClone(produced);
    },
    logger: { info(line) { lines.push(line); } },
  });
  return { result, lines, requests };
}

test("generated bundles are self-contained two-argument IIFEs with exact globals", async () => {
  for (const [url, globalName] of [
    [NODE_BUNDLE, "EgernNodeBundle"],
    [PROFILE_BUNDLE, "EgernProfileBundle"],
  ]) {
    const source = await readFile(url, "utf8");
    assert.match(source, new RegExp(`^var ${globalName} = \\(\\(\\) => \\{`, "u"));
    assert.doesNotMatch(source, /^\s*(?:import|export)\s/mu);
    assert.doesNotMatch(source, /\bprocess\.env\b|\bnode:|\brequire\s*\(/u);
    assert.equal(source.endsWith("\n"), true);
    assert.equal(source.includes("\r"), false);
    assert.doesNotMatch(source, /\/Users\/|\\\\Users\\|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:/u);
    assert.doesNotMatch(source, /TEST_ONLY_BUNDLE_(?:SS|SSH)_/u);
    const wrapper = `\nasync function operator(input, targetPlatform) {\n  return ${globalName}.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`;
    assert.equal(source.endsWith(wrapper), true);
    assert.equal(source.match(/^async function operator\(input, targetPlatform\)/gmu)?.length, 1);
    const { context } = loadBundle(source, {
      arguments: globalName === "EgernNodeBundle" ? NODE_ARGUMENTS : PROFILE_ARGUMENTS,
      produced: rawInventory(),
    });
    assert.equal(typeof context[globalName], "object");
    assert.equal(typeof context.operator, "function");
    assert.equal(context.operator.length, 2);
  }
});

test("node bundle matches source for normalization, Egern SSH chaining, and diagnostics", async () => {
  const source = await readFile(NODE_BUNDLE, "utf8");
  const expected = await sourceRun(sourceNodeOperator, NODE_ARGUMENTS, rawInventory());
  const bundled = loadBundle(source, { arguments: NODE_ARGUMENTS, produced: rawInventory() });
  const actual = await bundled.context.operator({ unchanged: true }, "Egern");

  assert.equal(actual.$content, expected.result.$content);
  assert.equal(actual.unchanged, true);
  assert.match(actual.$content, /prev_hop: "🔗 入口节点"/u);
  assert.deepEqual(bundled.lines, expected.lines);
  assert.deepEqual(bundled.requests, expected.requests);
});

test("chain-off bundle parity omits every generated previous hop", async () => {
  const arguments_ = { ...NODE_ARGUMENTS, clientChain: "off" };
  const source = await readFile(NODE_BUNDLE, "utf8");
  const expected = await sourceRun(sourceNodeOperator, arguments_, rawInventory());
  const bundled = loadBundle(source, { arguments: arguments_, produced: rawInventory() });
  const actual = await bundled.context.operator({ unchanged: true }, "Egern");
  assert.equal(actual.$content, expected.result.$content);
  assert.doesNotMatch(actual.$content, /prev_hop/u);
  assert.deepEqual(bundled.lines, expected.lines);
});

test("profile bundle matches source and never inlines nodes or private diagnostics", async () => {
  const source = await readFile(PROFILE_BUNDLE, "utf8");
  const expected = await sourceRun(sourceProfileOperator, PROFILE_ARGUMENTS, rawInventory());
  const bundled = loadBundle(source, { arguments: PROFILE_ARGUMENTS, produced: rawInventory() });
  const actual = await bundled.context.operator({ unchanged: true }, "Egern");

  assert.equal(actual.$content, expected.result.$content);
  assert.deepEqual(validateEgernProfile(actual.$content), { valid: true, errors: [] });
  assert.doesNotMatch(actual.$content, /^proxies:/mu);
  assert.equal(bundled.lines.some((line) => line.includes(PRIVATE_URL)), false);
  for (const node of rawInventory()) {
    for (const value of [node.server, node.password, node.username]) {
      if (value !== undefined) assert.equal(actual.$content.includes(value), false, value);
    }
  }
});

test("bundle failures match source and never reflect producer or node values", async () => {
  for (const [url, operator, arguments_] of [
    [NODE_BUNDLE, sourceNodeOperator, NODE_ARGUMENTS],
    [PROFILE_BUNDLE, sourceProfileOperator, PROFILE_ARGUMENTS],
  ]) {
    const source = await readFile(url, "utf8");
    const producerSecret = "TEST_ONLY_PRIVATE_PRODUCER_FAILURE";
    const bundled = loadBundle(source, {
      arguments: arguments_,
      produced: [],
      producerError: producerSecret,
    });
    let bundleMessage = "";
    await assert.rejects(bundled.context.operator({}, "Egern"), (error) => {
      bundleMessage = error.message;
      return !error.message.includes(producerSecret);
    });
    let sourceMessage = "";
    await assert.rejects(operator({}, "Egern", {
      arguments: arguments_,
      async produceArtifact() { throw new Error(producerSecret); },
    }), (error) => {
      sourceMessage = error.message;
      return true;
    });
    assert.equal(bundleMessage, sourceMessage);

    for (const produced of [null, [], incompatibleInventory(), adapterInvalidInventory()]) {
      const bundleCase = loadBundle(source, { arguments: arguments_, produced });
      let actualMessage = "";
      await assert.rejects(bundleCase.context.operator({}, "Egern"), (error) => {
        actualMessage = error.message;
        return true;
      });
      const sourceLines = [];
      let expectedMessage = "";
      await assert.rejects(operator({}, "Egern", {
        arguments: arguments_,
        async produceArtifact() { return structuredClone(produced); },
        logger: { info(line) { sourceLines.push(line); } },
      }), (error) => {
        expectedMessage = error.message;
        return true;
      });
      assert.equal(actualMessage, expectedMessage);
      assert.deepEqual(bundleCase.lines, []);
      assert.deepEqual(sourceLines, []);
      for (const value of JSON.stringify(produced).match(/TEST_ONLY_[A-Z_]+/gu) ?? []) {
        assert.equal(actualMessage.includes(value), false, value);
      }
    }
  }
});

test("raw duplicates and display-name collisions stay unique with source and bundle parity", async () => {
  const source = await readFile(NODE_BUNDLE, "utf8");
  const first = rawInventory()[0];
  const collision = { ...first, server: "198.51.100.31", password: "TEST_ONLY_COLLISION_PASSWORD" };
  const produced = [first, structuredClone(first), collision];
  const expected = await sourceRun(sourceNodeOperator, { ...NODE_ARGUMENTS, clientChain: "off" }, produced);
  const bundled = loadBundle(source, {
    arguments: { ...NODE_ARGUMENTS, clientChain: "off" },
    produced,
  });
  const actual = await bundled.context.operator({}, "Egern");
  assert.equal(actual.$content, expected.result.$content);
  const names = [...actual.$content.matchAll(/^\s+name: "([^"]+)"$/gmu)].map((match) => match[1]);
  assert.equal(names.length, 2);
  assert.equal(new Set(names).size, names.length);
  const diagnostics = JSON.parse(bundled.lines[0].replace(/^\[egern-profile\] /u, ""));
  assert.equal(diagnostics.excluded["exact-duplicate"], 1);
});

test("build and fixture outputs are byte deterministic", async () => {
  const run = (url) => spawnSync(process.execPath, [fileURLToPath(url)], { encoding: "utf8" });
  const first = run(BUILD_SCRIPT);
  assert.equal(first.status, 0, first.stderr);
  const firstOutputs = await Promise.all([NODE_BUNDLE, PROFILE_BUNDLE].map((url) => readFile(url, "utf8")));
  const second = run(BUILD_SCRIPT);
  assert.equal(second.status, 0, second.stderr);
  const secondOutputs = await Promise.all([NODE_BUNDLE, PROFILE_BUNDLE].map((url) => readFile(url, "utf8")));
  assert.deepEqual(secondOutputs, firstOutputs);

  const exampleUrls = ["macos", "iphone", "ipad"]
    .map((platform) => new URL(`../examples/egern-${platform}.yaml`, import.meta.url));
  const fixtureFirst = run(FIXTURE_SCRIPT);
  assert.equal(fixtureFirst.status, 0, fixtureFirst.stderr);
  const firstExamples = await Promise.all(exampleUrls.map((url) => readFile(url, "utf8")));
  const fixtureSecond = run(FIXTURE_SCRIPT);
  assert.equal(fixtureSecond.status, 0, fixtureSecond.stderr);
  const secondExamples = await Promise.all(exampleUrls.map((url) => readFile(url, "utf8")));
  assert.deepEqual(secondExamples, firstExamples);
});

test("tracked examples are deterministic complete platform Profiles", async () => {
  for (const [platform, ipv6] of [["macos", false], ["iphone", true], ["ipad", true]]) {
    const url = new URL(`../examples/egern-${platform}.yaml`, import.meta.url);
    const profile = await readFile(url, "utf8");
    assert.equal(profile.endsWith("\n"), true);
    assert.equal(profile.includes("\r"), false);
    assert.match(profile, new RegExp(`^ipv6: ${ipv6}$`, "mu"));
    assert.match(profile, /policy_groups:/u);
    assert.match(profile, /rules:/u);
    assert.match(profile, /https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/current\/egern\/rules\/Advertising\.yaml/u);
    assert.doesNotMatch(profile, /^proxies:/mu);
    assert.doesNotMatch(profile, /TEST_ONLY_|198\.51\.100\.|192\.0\.2\./u);
    assert.doesNotMatch(profile, /\/Users\/|\\\\Users\\|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:/u);
    assert.deepEqual(validateEgernProfile(profile), { valid: true, errors: [] }, platform);
    const ruby = spawnSync(
      "ruby",
      ["-e", "require %q(yaml); value=YAML.safe_load(STDIN.read, aliases: false); abort unless value.is_a?(Hash)"],
      { input: profile, encoding: "utf8" },
    );
    if (ruby.error?.code !== "ENOENT") assert.equal(ruby.status, 0, ruby.stderr);
  }
});
