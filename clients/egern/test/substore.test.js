import assert from "node:assert/strict";
import test from "node:test";

import { operator as nodeOperator } from "../src/substore-nodes-entry.js";
import { operator as profileOperator } from "../src/substore-profile-entry.js";
import { validateEgernProfile } from "../src/validate-profile.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes";
const NODE_ARGUMENTS = Object.freeze({
  output: "nodes",
  type: "collection",
  name: "apple-proxy-egern",
  clientChain: "off",
});
const PROFILE_ARGUMENTS = Object.freeze({
  output: "config",
  type: "collection",
  name: "apple-proxy-egern",
  nodeSubscriptionUrl: PRIVATE_URL,
  platform: "macos",
});
const EMPTY_POLICY = { $content: JSON.stringify({ schemaVersion: 2, targets: {} }) };

function rawInventory() {
  return [
    {
      name: "Singapore Entry",
      type: "ss",
      server: "198.51.100.10",
      port: 443,
      cipher: "aes-128-gcm",
      password: "TEST_ONLY_OPERATOR_SS_PASSWORD",
      udp: true,
      _subName: "[自建] Singapore",
    },
    {
      name: "SSH Landing",
      type: "ssh",
      server: "192.0.2.22",
      port: 22,
      username: "TEST_ONLY_OPERATOR_SSH_USER",
      password: "TEST_ONLY_OPERATOR_SSH_PASSWORD",
      _subName: "[落地] SSH",
    },
  ];
}

function incompatibleInventory() {
  return [{
    name: "Private incompatible transport",
    type: "vless",
    server: "private-incompatible.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "TEST_ONLY_INCOMPATIBLE_TRANSPORT",
    password: "TEST_ONLY_INCOMPATIBLE_PASSWORD",
  }];
}

function anytlsInventory() {
  return [{
    name: "Tokyo AnyTLS",
    type: "anytls",
    server: "198.51.100.30",
    port: 443,
    password: "TEST_ONLY_EGERN_ANYTLS_PASSWORD",
    tls: true,
    sni: "anytls.example.invalid",
    udp: true,
    _subName: "[自建] Tokyo AnyTLS",
  }];
}

function logger(lines, { throwing = false } = {}) {
  return {
    info(line) {
      if (throwing) throw new Error("TEST_ONLY_LOGGER_FAILURE");
      lines.push(line);
    },
  };
}

function producer(nodes, calls = []) {
  return async (request) => {
    calls.push(request);
    return request.type === "file" ? EMPTY_POLICY : structuredClone(nodes);
  };
}

async function assertSafeRejection(promise, forbidden = []) {
  await assert.rejects(promise, (error) => {
    assert.equal(/[\r\n]/u.test(error.message), false);
    for (const value of forbidden) assert.equal(error.message.includes(value), false, value);
    return true;
  });
}

test("node File Operator produces one normalized Egern subscription and preserves input", async () => {
  const input = { url: "https://example.invalid/source", unchanged: true };
  const calls = [];
  const lines = [];
  const result = await nodeOperator(input, "Egern", {
    arguments: NODE_ARGUMENTS,
    produceArtifact: producer(rawInventory(), calls),
    logger: logger(lines),
  });

  assert.equal(nodeOperator.length, 2);
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-egern",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.deepEqual({ url: result.url, unchanged: result.unchanged }, input);
  assert.deepEqual(Object.keys(result).sort(), ["$content", "unchanged", "url"]);
  assert.match(result.$content, /^proxies:\n/u);
  assert.match(result.$content, /shadowsocks:/u);
  assert.match(result.$content, /ssh:/u);
  assert.doesNotMatch(result.$content, /_profile|_subName/u);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[egern-profile\] \{/u);
  const diagnostics = JSON.parse(lines[0].replace(/^\[egern-profile\] /u, ""));
  assert.equal(diagnostics.total, 2);
  assert.equal(diagnostics.accepted, 2);
  for (const secret of rawInventory().flatMap((node) => [node.name, node.server, node.password])) {
    if (secret !== undefined) assert.equal(lines[0].includes(secret), false, secret);
  }
});

test("node File Operator emits a non-empty AnyTLS inventory with its protocol label", async () => {
  const calls = [];
  const result = await nodeOperator({}, "Egern", {
    arguments: NODE_ARGUMENTS,
    produceArtifact: producer(anytlsInventory(), calls),
  });

  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-egern",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.match(result.$content, /^proxies:\n  - anytls:/u);
  assert.match(result.$content, / · AnyTLS｜自建·U/u);
});

test("node File Operator creates only the Egern SSH chain clone when enabled", async () => {
  const lines = [];
  const result = await nodeOperator({}, "Egern", {
    arguments: { ...NODE_ARGUMENTS, clientChain: "on" },
    produceArtifact: producer(rawInventory()),
    logger: logger(lines),
  });
  assert.match(result.$content, /name: "🔗 [^"]*Landing · SSH｜落地"/u);
  assert.match(result.$content, /prev_hop: "🔗 入口节点"/u);
  const diagnostics = JSON.parse(lines[0].replace(/^\[egern-profile\] /u, ""));
  assert.equal(diagnostics.accepted, 3);
  assert.equal(diagnostics.excluded["chain-protocol-unsupported"], 1);

  const disabled = await nodeOperator({}, "Egern", {
    arguments: NODE_ARGUMENTS,
    produceArtifact: producer(rawInventory()),
  });
  assert.doesNotMatch(disabled.$content, /prev_hop/u);
});

test("profile File Operator normalizes once and emits a validated credential-free Profile", async () => {
  const input = { unchanged: "yes" };
  const calls = [];
  const lines = [];
  const result = await profileOperator(input, "Egern", {
    arguments: PROFILE_ARGUMENTS,
    produceArtifact: producer(rawInventory(), calls),
    logger: logger(lines),
  });

  assert.equal(profileOperator.length, 2);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    type: "collection",
    name: "apple-proxy-egern",
    platform: "JSON",
    produceType: "internal",
  });
  assert.deepEqual(calls[1], {
    type: "file",
    name: "apple-proxy-policy",
    platform: "JSON",
    produceType: "internal",
  });
  assert.equal(result.unchanged, "yes");
  assert.deepEqual(Object.keys(result).sort(), ["$content", "unchanged"]);
  assert.match(result.$content, /^ipv6:/u);
  assert.doesNotMatch(result.$content, /^auto_update:/mu);
  assert.match(result.$content, /policy_groups:/u);
  assert.match(result.$content, /rules:/u);
  assert.doesNotMatch(result.$content, /^proxies:/mu);
  assert.deepEqual(validateEgernProfile(result.$content), { valid: true, errors: [] });
  for (const node of rawInventory()) {
    for (const value of [node.name, node.server, node.password, node.username]) {
      if (value !== undefined) assert.equal(result.$content.includes(value), false, value);
    }
  }
  const privateLines = result.$content.split("\n").filter((line) => line.includes(PRIVATE_URL));
  assert.ok(privateLines.length > 0);
  assert.equal(privateLines.every((line) => /^\s+- "https:\/\//u.test(line)), true);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes(PRIVATE_URL), false);
});

test("profile File Operator accepts every documented option and platform", async () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const result = await profileOperator({}, "Egern", {
      arguments: {
        ...PROFILE_ARGUMENTS,
        platform,
        dnsMode: "privacy",
        chinaDns: "dnspod",
        globalDns: "google",
        blockMode: "strict",
        quicMode: "allow",
        ipv6Mode: "auto",
        autoGroupMode: "full",
        clientChain: "on",
        _internal: "ignored",
      },
      produceArtifact: producer(rawInventory()),
    });
    assert.deepEqual(validateEgernProfile(result.$content), { valid: true, errors: [] }, platform);
  }
});

test("profile File Operator propagates publication channel and optional adblock selection", async () => {
  const result = await profileOperator({}, "Egern", {
    arguments: { ...PROFILE_ARGUMENTS, channel: "current", adblockMode: "full" },
    produceArtifact: producer(rawInventory()),
  });
  assert.match(result.$content, /current\/egern\/rules\/DomesticCore\.yaml/u);
  assert.match(result.$content, /current\/optional\/adblock-full\/egern\/rules\/Advertising\.yaml/u);
  assert.match(result.$content, /current\/optional\/adblock-full\/egern\/rules\/Advertising_Domain\.yaml/u);
  assert.deepEqual(validateEgernProfile(result.$content), { valid: true, errors: [] });
});

test("profile File Operator rejects unsupported publication and adblock values before producing nodes", async () => {
  for (const [key, value] of [["channel", "beta"], ["adblockMode", "balanced"]]) {
    let producerCalls = 0;
    await assertSafeRejection(profileOperator({}, "Egern", {
      arguments: { ...PROFILE_ARGUMENTS, [key]: value },
      async produceArtifact() {
        producerCalls += 1;
        return rawInventory();
      },
    }), [value]);
    assert.equal(producerCalls, 0, key);
  }
});

test("profile File Operator uses one immutable pre-await option snapshot", async () => {
  const arguments_ = {
    ...PROFILE_ARGUMENTS,
    nodeSubscriptionUrl: "https://initial.example.invalid/private/nodes",
    platform: "macos",
  };
  const mutatedSecret = "TEST_ONLY_MUTATED_OPTION_SECRET";
  const calls = [];
  const lines = [];
  const context = {
    arguments: arguments_,
    async produceArtifact(request) {
      calls.push(request);
      arguments_.platform = "iphone";
      arguments_.nodeSubscriptionUrl = `https://mutated.example.invalid/${mutatedSecret}`;
      arguments_.dnsMode = "privacy";
      arguments_.clientChain = "on";
      arguments_.name = mutatedSecret;
      context.arguments = {
        ...PROFILE_ARGUMENTS,
        platform: "ipad",
        nodeSubscriptionUrl: `https://replacement.example.invalid/${mutatedSecret}`,
      };
      return request.type === "file" ? EMPTY_POLICY : structuredClone(rawInventory());
    },
    logger: logger(lines),
  };
  const result = await profileOperator({}, "Egern", context);
  assert.match(result.$content, /^ipv6: false$/mu);
  assert.equal(result.$content.includes("https://initial.example.invalid/private/nodes"), true);
  assert.equal(result.$content.includes(mutatedSecret), false);
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-egern",
    platform: "JSON",
    produceType: "internal",
  }, {
    type: "file",
    name: "apple-proxy-policy",
    platform: "JSON",
    produceType: "internal",
  }]);
  const diagnostics = JSON.parse(lines[0].replace(/^\[egern-profile\] /u, ""));
  assert.equal(diagnostics.accepted, 2);
  assert.equal(lines[0].includes(mutatedSecret), false);
});

test("profile File Operator rejects option accessors before producer execution", async () => {
  let getterCalls = 0;
  let producerCalls = 0;
  const arguments_ = { ...PROFILE_ARGUMENTS };
  Object.defineProperty(arguments_, "dnsMode", {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error("TEST_ONLY_PROFILE_ACCESSOR_SECRET");
    },
  });
  await assertSafeRejection(profileOperator({}, "Egern", {
    arguments: arguments_,
    async produceArtifact() {
      producerCalls += 1;
      return rawInventory();
    },
  }), ["TEST_ONLY_PROFILE_ACCESSOR_SECRET"]);
  assert.equal(getterCalls, 0);
  assert.equal(producerCalls, 0);
});

test("node argument parser rejects hostile and undocumented shapes without access", async () => {
  const accepted = [
    { output: "nodes", type: "collection", name: "apple-proxy-egern" },
    { ...NODE_ARGUMENTS, clientChain: "on", _internal: "ignored" },
  ];
  for (const arguments_ of accepted) {
    await assert.doesNotReject(nodeOperator({}, "Egern", {
      arguments: arguments_,
      produceArtifact: producer(rawInventory()),
    }));
  }

  let invoked = false;
  const accessor = { output: "nodes", type: "collection", name: "apple-proxy-egern" };
  Object.defineProperty(accessor, "clientChain", {
    enumerable: true,
    get() { invoked = true; throw new Error("TEST_ONLY_OPTION_GETTER"); },
  });
  const hidden = { output: "nodes", type: "collection", name: "apple-proxy-egern" };
  Object.defineProperty(hidden, "clientChain", { value: "off", enumerable: false });
  const inherited = Object.create({ output: "nodes" });
  inherited.type = "collection";
  inherited.name = "apple-proxy-egern";
  const polluted = ["__proto__", "constructor", "prototype"].map((key) => {
    const value = Object.create(null);
    Object.assign(value, NODE_ARGUMENTS);
    Object.defineProperty(value, key, {
      value: "TEST_ONLY_PROTOTYPE_PAYLOAD",
      enumerable: true,
    });
    return value;
  });
  const rejected = [
    null,
    [],
    { ...NODE_ARGUMENTS, output: "config" },
    { ...NODE_ARGUMENTS, type: "subscription" },
    { ...NODE_ARGUMENTS, name: " ambiguous" },
    { ...NODE_ARGUMENTS, clientChain: "invalid" },
    { ...NODE_ARGUMENTS, unexpected: "TEST_ONLY_OPTION_VALUE" },
    accessor,
    hidden,
    inherited,
    ...polluted,
  ];
  for (const arguments_ of rejected) {
    await assertSafeRejection(nodeOperator({}, "Egern", {
      arguments: arguments_,
      produceArtifact: producer(rawInventory()),
    }), ["TEST_ONLY_OPTION_GETTER", "TEST_ONLY_OPTION_VALUE", "TEST_ONLY_PROTOTYPE_PAYLOAD"]);
  }
  assert.equal(invoked, false);
});

test("operators reject hostile context argument descriptors without invoking them", async () => {
  for (const [operator, arguments_] of [
    [nodeOperator, NODE_ARGUMENTS],
    [profileOperator, PROFILE_ARGUMENTS],
  ]) {
    let invoked = false;
    const context = { produceArtifact: producer(rawInventory()) };
    Object.defineProperty(context, "arguments", {
      enumerable: true,
      get() {
        invoked = true;
        throw new Error("TEST_ONLY_ARGUMENTS_GETTER");
      },
    });
    await assertSafeRejection(operator({}, "Egern", context), ["TEST_ONLY_ARGUMENTS_GETTER"]);
    assert.equal(invoked, false);

    const revoked = Proxy.revocable({ arguments: arguments_ }, {});
    revoked.revoke();
    await assertSafeRejection(operator({}, "Egern", revoked.proxy));
  }
});

test("operators fail closed on producer, normalization, and final Egern gate failures", async () => {
  const operators = [
    [nodeOperator, NODE_ARGUMENTS],
    [profileOperator, PROFILE_ARGUMENTS],
  ];
  for (const [operator, arguments_] of operators) {
    await assertSafeRejection(operator({}, "Egern", { arguments: arguments_ }));
    await assertSafeRejection(operator({}, "Egern", {
      arguments: arguments_,
      async produceArtifact() { throw new Error("TEST_ONLY_PRODUCER_PRIVATE_VALUE"); },
    }), ["TEST_ONLY_PRODUCER_PRIVATE_VALUE"]);
    for (const produced of [null, {}, []]) {
      await assertSafeRejection(operator({}, "Egern", {
        arguments: arguments_,
        async produceArtifact() { return produced; },
      }));
    }
    const incompatible = incompatibleInventory();
    await assertSafeRejection(operator({}, "Egern", {
      arguments: arguments_,
      produceArtifact: producer(incompatible),
    }), incompatible.flatMap((node) => [node.name, node.server, node.network, node.password]));
  }
});

test("count-only diagnostics are deterministic and logger failures do not change artifacts", async () => {
  for (const [operator, arguments_] of [
    [nodeOperator, NODE_ARGUMENTS],
    [profileOperator, PROFILE_ARGUMENTS],
  ]) {
    const firstLines = [];
    const first = await operator({}, "Egern", {
      arguments: arguments_,
      produceArtifact: producer(rawInventory()),
      logger: logger(firstLines),
    });
    const second = await operator({}, "Egern", {
      arguments: arguments_,
      produceArtifact: producer(rawInventory()),
      logger: logger([], { throwing: true }),
    });
    const third = await operator({}, "Egern", {
      arguments: arguments_,
      produceArtifact: producer(rawInventory()),
    });
    assert.equal(first.$content, second.$content);
    assert.equal(first.$content, third.$content);
    assert.equal(firstLines.length, 1);
    assert.match(firstLines[0], /^\[egern-profile\] \{"total":2,"accepted":2,/u);
  }
});
