import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-nodes-entry.js";

const ARGUMENTS = Object.freeze({
  output: "nodes",
  type: "collection",
  name: "apple-proxy-anywhere",
  clientChain: "off",
});

function inventory() {
  return [{
    name: "Singapore SS",
    type: "ss",
    server: "198.51.100.20",
    port: 443,
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_ANYWHERE_OPERATOR_PASSWORD",
    _subName: "[机场] Singapore",
  }];
}

function mixedInventory() {
  return [
    {
      name: "Tokyo AnyTLS",
      type: "anytls",
      server: "198.51.100.30",
      port: 443,
      password: "TEST_ONLY_ANYWHERE_ANYTLS_PASSWORD",
      alpn: ["h2"],
      "client-fingerprint": "chrome",
      "idle-session-check-interval": 30,
      "idle-session-timeout": 60,
      "min-idle-session": 1,
      _subName: "[自建] Tokyo AnyTLS",
    },
    {
      name: "Unsupported Future Protocol",
      type: " Future-Proto ",
      server: "192.0.2.20",
      port: 443,
      password: "TEST_ONLY_ANYWHERE_FUTURE_PASSWORD",
      _subName: "[自建] Future",
    },
  ];
}

function producer(nodes, calls = []) {
  return async (request) => {
    calls.push(request);
    return structuredClone(nodes);
  };
}

test("Anywhere File Operator skips unrenderable nodes and logs render-failure counts", async () => {
  const calls = [];
  const lines = [];
  const input = { unchanged: true };
  const result = await operator(input, "Anywhere", {
    arguments: ARGUMENTS,
    produceArtifact: producer(mixedInventory(), calls),
    logger: { info(line) { lines.push(line); } },
  });
  assert.equal(operator.length, 2);
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-anywhere",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(result.unchanged, true);
  assert.match(result.$content, /^proxies:\n/u);
  assert.match(result.$content, /type: "anytls"/u);
  assert.match(result.$content, / · AnyTLS｜自建/u);
  for (const secret of ["Unsupported Future Protocol", "192.0.2.20", "TEST_ONLY_ANYWHERE_FUTURE_PASSWORD"]) {
    assert.equal(result.$content.includes(secret), false);
  }
  assert.equal(lines.length, 1);
  const diagnostics = JSON.parse(lines[0].slice("[anywhere-profile] ".length));
  assert.deepEqual(diagnostics.renderFailures, { "future-proto": 1 });
  assert.equal(lines[0].includes("Unsupported Future Protocol"), false);
});

test("Anywhere File Operator emits a non-empty AnyTLS list with its protocol label", async () => {
  const calls = [];
  const result = await operator({}, "Anywhere", {
    arguments: ARGUMENTS,
    produceArtifact: producer([mixedInventory()[0]], calls),
  });
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-anywhere",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.match(result.$content, /^proxies:\n/u);
  assert.match(result.$content, /type: "anytls"/u);
  assert.match(result.$content, / · AnyTLS｜自建/u);
});

test("Anywhere File Operator accepts an exact safe collection name and forwards it", async () => {
  const calls = [];
  await assert.doesNotReject(operator({}, "Anywhere", {
    arguments: { ...ARGUMENTS, name: "anywhere-canary" },
    produceArtifact: producer(inventory(), calls),
  }));
  assert.deepEqual(calls, [{
    type: "collection",
    name: "anywhere-canary",
    platform: "JSON",
    produceType: "internal",
  }]);
});

test("Anywhere File Operator accepts the current publication channel", async () => {
  await assert.doesNotReject(operator({}, "Anywhere", {
    arguments: { ...ARGUMENTS, channel: "current" },
    produceArtifact: producer(inventory()),
  }), "current");
  for (const channel of ["edge", "previous"]) {
    await assert.rejects(operator({}, "Anywhere", {
      arguments: { ...ARGUMENTS, channel },
      produceArtifact: producer(inventory()),
    }), /channel/iu);
  }
  await assert.rejects(operator({}, "Anywhere", {
    arguments: { ...ARGUMENTS, channel: "beta" },
    produceArtifact: producer(inventory()),
  }), /channel/iu);
});

test("Anywhere File Operator enforces the chain-off and safe collection contract", async () => {
  let producerCalls = 0;
  const rejected = [
    null,
    [],
    { ...ARGUMENTS, output: "config" },
    { ...ARGUMENTS, type: "subscription" },
    ...["", "中文", "anywhere/sources", "anywhere?sources", "anywhere#sources", " anywhere-sources", "anywhere-sources ", "anywhere\nsources", "__proto__"].map((name) => ({ ...ARGUMENTS, name })),
    { ...ARGUMENTS, clientChain: "on" },
    { output: "nodes", type: "collection", name: "apple-proxy-anywhere" },
    { ...ARGUMENTS, unknown: true },
  ];
  for (const arguments_ of rejected) {
    await assert.rejects(operator({}, "Anywhere", {
      arguments: arguments_,
      async produceArtifact() { producerCalls += 1; return inventory(); },
    }));
  }
  assert.equal(producerCalls, 0);
});

test("Anywhere arguments reject every hostile object shape", async () => {
  const inherited = Object.create({ output: "nodes" });
  Object.assign(inherited, { type: "collection", name: "apple-proxy-anywhere", clientChain: "off" });
  const symbol = { ...ARGUMENTS, [Symbol("hostile")]: true };
  const hidden = { ...ARGUMENTS };
  Object.defineProperty(hidden, "clientChain", { value: "off", enumerable: false });
  const polluted = ["__proto__", "constructor", "prototype"].map((key) => {
    const value = Object.create(null);
    Object.assign(value, ARGUMENTS);
    Object.defineProperty(value, key, { value: "TEST_ONLY_PROTOTYPE", enumerable: true });
    return value;
  });
  for (const arguments_ of [inherited, symbol, hidden, ...polluted]) {
    await assert.rejects(operator({}, "Anywhere", {
      arguments: arguments_,
      produceArtifact: producer(inventory()),
    }));
  }
});

test("Anywhere File Operator rejects hostile input without reflecting it", async () => {
  const hostileMarker = "SHOULD_NOT_ESCAPE_ANYWHERE_OPERATOR";
  const arguments_ = { ...ARGUMENTS };
  Object.defineProperty(arguments_, "clientChain", {
    enumerable: true,
    get() { throw new Error(hostileMarker); },
  });
  await assert.rejects(
    operator({}, "Anywhere", { arguments: arguments_, produceArtifact: producer(inventory()) }),
    (error) => !error.message.includes(hostileMarker) && !/[\r\n]/u.test(error.message),
  );

  await assert.rejects(operator({}, "Anywhere", {
    arguments: ARGUMENTS,
    async produceArtifact() { throw new Error(hostileMarker); },
  }), (error) => !error.message.includes(hostileMarker));

  await assert.rejects(operator({}, "Anywhere", {
    arguments: ARGUMENTS,
    produceArtifact: producer([{ ...mixedInventory()[1] }]),
  }), /Invalid Anywhere node inventory|cannot render selected protocols/);
});

test("logger failure never changes the generated artifact", async () => {
  const normal = await operator({}, "Anywhere", {
    arguments: ARGUMENTS,
    produceArtifact: producer(inventory()),
  });
  const throwing = await operator({}, "Anywhere", {
    arguments: ARGUMENTS,
    produceArtifact: producer(inventory()),
    logger: { info() { throw new Error("TEST_ONLY_LOGGER_FAILURE"); } },
  });
  assert.equal(throwing.$content, normal.$content);
});

test("operator keeps one immutable pre-await argument snapshot", async () => {
  const arguments_ = { ...ARGUMENTS };
  const calls = [];
  const context = {
    arguments: arguments_,
    async produceArtifact(request) {
      calls.push(request);
      arguments_.name = "TEST_ONLY_MUTATED_COLLECTION";
      arguments_.clientChain = "on";
      context.arguments = { ...ARGUMENTS, name: "TEST_ONLY_REPLACEMENT_COLLECTION" };
      return inventory();
    },
  };
  const result = await operator({}, "Anywhere", context);
  assert.match(result.$content, /^proxies:\n/u);
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-anywhere",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(result.$content.includes("TEST_ONLY_MUTATED_COLLECTION"), false);
});

test("operator rejects hostile context and producer accessors without invoking arguments getters", async () => {
  const hostileMarker = "SHOULD_NOT_ESCAPE_ANYWHERE_CONTEXT";
  let invoked = false;
  const context = { produceArtifact: producer(inventory()) };
  Object.defineProperty(context, "arguments", {
    enumerable: true,
    get() { invoked = true; throw new Error(hostileMarker); },
  });
  await assert.rejects(
    operator({}, "Anywhere", context),
    (error) => !error.message.includes(hostileMarker),
  );
  assert.equal(invoked, false);

  const producerContext = { arguments: ARGUMENTS };
  Object.defineProperty(producerContext, "produceArtifact", {
    enumerable: true,
    get() { throw new Error(hostileMarker); },
  });
  await assert.rejects(
    operator({}, "Anywhere", producerContext),
    (error) => !error.message.includes(hostileMarker),
  );

  const revoked = Proxy.revocable({ ...ARGUMENTS }, {});
  revoked.revoke();
  await assert.rejects(
    operator({}, "Anywhere", { arguments: revoked.proxy, produceArtifact: producer(inventory()) }),
    (error) => error.message === "Anywhere node arguments must be a plain object",
  );
});

test("operator rejects input artifact accessors without invoking them", async () => {
  const hostileMarker = "SHOULD_NOT_ESCAPE_ANYWHERE_INPUT";
  let invoked = false;
  const input = {};
  Object.defineProperty(input, "privateField", {
    enumerable: true,
    get() { invoked = true; throw new Error(hostileMarker); },
  });
  await assert.rejects(
    operator(input, "Anywhere", { arguments: ARGUMENTS, produceArtifact: producer(inventory()) }),
    (error) => error.message === "Invalid Anywhere input artifact" && !error.message.includes(hostileMarker),
  );
  assert.equal(invoked, false);
});
