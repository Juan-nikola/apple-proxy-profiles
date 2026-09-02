import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-config-entry.js";

const POLICY = Object.freeze({
  schemaVersion: 2,
  targets: {
    final: "FOLLOW",
  },
});

const COLLECTION = Object.freeze([
  {
    name: "Follow Node",
    type: "vless",
    server: "follow.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "follow.example.invalid",
  },
  {
    name: "Fixed Node",
    type: "trojan",
    server: "fixed.example.invalid",
    port: 443,
    password: "TEST_ONLY_FIXED_PASSWORD",
    tls: true,
    sni: "fixed.example.invalid",
  },
]);

function makeContext(overrides = {}) {
  const requestOptions = overrides.requestOptions ?? { _res: { headers: { "x-keep": "yes" } } };
  const calls = [];
  return {
    calls,
    requestOptions,
    context: {
      arguments: {
        output: "config",
        type: "collection",
        name: "apple-proxy-incy",
        subscriptionName: "INCY",
        platform: "iphone",
        ...overrides.arguments,
      },
      requestOptions,
      logger: { info() {} },
      async produceArtifact(request) {
        calls.push(request);
        if (request.type === "file") return { $content: JSON.stringify(POLICY) };
        return COLLECTION;
      },
    },
  };
}

test("Sub-Store INCY config entry returns a JSON array and sets the public response headers", async () => {
  const { calls, requestOptions, context } = makeContext();

  const result = await operator({ marker: "keep" }, "JSON", context);
  const configs = JSON.parse(result.$content);

  assert.equal(result.marker, "keep");
  assert.equal(Array.isArray(configs), true);
  assert.equal(configs.length, 2);
  assert.deepEqual(calls, [
    {
      type: "collection",
      name: "apple-proxy-incy",
      platform: "JSON",
      produceType: "internal",
    },
    {
      type: "file",
      name: "apple-proxy-policy",
      platform: "JSON",
      produceType: "internal",
    },
  ]);
  assert.equal(requestOptions._res.headers["x-keep"], "yes");
  assert.equal(requestOptions._res.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(requestOptions._res.headers["content-disposition"], 'attachment; filename="incy-iphone.json"');
  assert.equal(
    requestOptions._res.headers.autorouting,
    "incy://autorouting/onadd/https%3A%2F%2Fjuan-nikola.github.io%2Fapple-proxy-profiles%2Fcurrent%2Fincy%2Frouting.json",
  );
  assert.match(result.$content, /\n$/u);
});

test("Sub-Store INCY config entry keeps nodes whose source uses string ports and padded protocol names", async () => {
  const { context } = makeContext();
  context.produceArtifact = async (request) => request.type === "file"
    ? { $content: JSON.stringify(POLICY) }
    : [{
      ...COLLECTION[0],
      type: " VLESS ",
      port: "443",
    }];

  const result = await operator({}, "JSON", context);
  const configs = JSON.parse(result.$content);

  assert.equal(configs.length, 1);
  assert.equal(configs[0].outbounds[0].protocol, "vless");
});

test("Sub-Store INCY config entry preserves the private raw Xray outbound extension", async () => {
  const { context } = makeContext();
  context.produceArtifact = async (request) => request.type === "file"
    ? { $content: JSON.stringify(POLICY) }
    : [{
      name: "Raw Extension Node",
      type: "customxray",
      server: "raw.example.invalid",
      port: 443,
      _incy: {
        xrayOutbound: {
          protocol: "vless",
          settings: {
            vnext: [{
              address: "raw.example.invalid",
              port: 443,
              users: [{ id: "00000000-0000-4000-8000-000000000001", encryption: "none" }],
            }],
          },
        },
      },
    }];

  const result = await operator({}, "JSON", context);
  const configs = JSON.parse(result.$content);

  assert.equal(configs.length, 1);
  assert.equal(configs[0].outbounds[0].protocol, "vless");
  assert.equal(configs[0].outbounds[0].settings.vnext[0].address, "raw.example.invalid");
});

test("Sub-Store INCY config entry accepts duplicate source nodes after normalization", async () => {
  const { context } = makeContext();
  context.produceArtifact = async (request) => request.type === "file"
    ? { $content: JSON.stringify(POLICY) }
    : [COLLECTION[0], { ...COLLECTION[0] }];

  const result = await operator({}, "JSON", context);
  assert.equal(JSON.parse(result.$content).length, 1);
});

test("Sub-Store INCY config entry supports client-chain normalization without rejecting generated clones", async () => {
  const { context } = makeContext({ arguments: { clientChain: "on" } });
  context.produceArtifact = async (request) => request.type === "file"
    ? { $content: JSON.stringify(POLICY) }
    : [
      { ...COLLECTION[0], name: "[机场] Entry Node", _subName: "[机场] Entry Node" },
      { ...COLLECTION[1], name: "[落地] Landing Node", _subName: "[落地] Landing Node" },
    ];

  const result = await operator({}, "JSON", context);
  const configs = JSON.parse(result.$content);
  assert.equal(configs.length, 3);

  const chained = configs.find((config) => config.remarks.includes("🔗"));
  assert.ok(chained);
  const follow = chained.outbounds.find((outbound) => outbound.tag.startsWith("ap-incy-follow/"));
  const chainEntry = chained.outbounds.find((outbound) => outbound.tag.startsWith("ap-incy-chain-entry/"));
  assert.ok(chainEntry);
  assert.deepEqual(follow.proxySettings, { tag: chainEntry.tag });
});

test("Sub-Store INCY config entry rejects ambiguous generated chains", async () => {
  const { context } = makeContext({ arguments: { clientChain: "on" } });
  context.produceArtifact = async (request) => {
    if (request.type === "file") return { $content: JSON.stringify(POLICY) };
    const entryB = { ...COLLECTION[0], name: "[机场] Entry B", _subName: "[机场] Entry B", server: "entry-b.example.invalid" };
    Object.defineProperty(entryB, "uuid", {
      value: COLLECTION[0].uuid.replace(/1$/u, "2"),
      enumerable: true,
      writable: true,
      configurable: true,
    });
    return [
      { ...COLLECTION[0], name: "[机场] Entry A", _subName: "[机场] Entry A" },
      entryB,
      { ...COLLECTION[1], name: "[落地] Landing Node", _subName: "[落地] Landing Node" },
    ];
  };

  await assert.rejects(() => operator({}, "JSON", context), /exactly one entry|ambiguous/iu);
});

test("Sub-Store INCY autorouting header round-trips an encoded public routing URL", async () => {
  const { requestOptions, context } = makeContext();

  await operator({}, "JSON", context);

  const header = requestOptions._res.headers.autorouting;
  const prefix = "incy://autorouting/onadd/";
  assert.equal(header.startsWith(prefix), true);
  const encodedUrl = header.slice(prefix.length);
  const routingUrl = decodeURIComponent(encodedUrl);
  assert.equal(routingUrl, "https://juan-nikola.github.io/apple-proxy-profiles/current/incy/routing.json");
  assert.equal(encodedUrl, encodeURIComponent(routingUrl));
});

test("Sub-Store INCY config entry fails the whole task for an unsupported selected node", async () => {
  const requestOptions = { _res: { headers: {} } };
  let collectionCalled = false;

  await assert.rejects(
    () => operator({}, "JSON", {
      arguments: {
        output: "config",
        type: "collection",
        name: "apple-proxy-incy",
        subscriptionName: "INCY",
        platform: "iphone",
      },
      requestOptions,
      logger: { info() {} },
      async produceArtifact(request) {
        if (request.type === "file") {
          return { $content: JSON.stringify(POLICY) };
        }
        collectionCalled = true;
        return [
          ...COLLECTION,
          {
            name: "Unsupported Node",
            type: "ssr",
            server: "unsupported.example.invalid",
            port: 443,
            password: "TEST_ONLY_UNSUPPORTED_PASSWORD",
          },
        ];
      },
    }),
    /unsupported-incy-protocol|cannot render selected protocols|empty/i,
  );

  assert.equal(collectionCalled, true);
  assert.deepEqual(requestOptions._res.headers, {});
});
