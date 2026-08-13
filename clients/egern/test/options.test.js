import assert from "node:assert/strict";
import test from "node:test";

import { OPTION_VALUES } from "../../../shared/contracts.js";
import {
  PUBLIC_SNAPSHOT_BASE_URL,
  parseEgernOptions,
} from "../src/options.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes";

const required = Object.freeze({
  output: "config",
  type: "collection",
  name: "egern-sources",
  nodeSubscriptionUrl: PRIVATE_URL,
  platform: "macos",
});

const defaults = Object.freeze({
  channel: "edge",
  adblockMode: "off",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  autoGroupMode: "auto",
  clientChain: "off",
});

test("parses exact Egern profile options with platform IPv6 defaults", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const parsed = parseEgernOptions({ ...required, platform });
    assert.deepEqual(parsed, {
      ...required,
      platform,
      publicBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/edge",
      ...defaults,
      ipv6Mode: platform === "macos" ? "ipv4-only" : "auto",
    });
    assert.equal(Object.isFrozen(parsed), true);
  }
});

test("accepts every shared option enum without cloning or widening the contracts", () => {
  const enumKeys = [
    "dnsMode",
    "chinaDns",
    "globalDns",
    "blockMode",
    "quicMode",
    "ipv6Mode",
    "autoGroupMode",
    "clientChain",
  ];

  for (const key of enumKeys) {
    for (const value of OPTION_VALUES[key]) {
      assert.equal(parseEgernOptions({ ...required, [key]: value })[key], value, `${key}=${value}`);
    }
    assert.equal(Object.isFrozen(OPTION_VALUES[key]), true, key);
  }
});

test("accepts only the two publication channels and explicit full ad blocking", () => {
  assert.equal(parseEgernOptions({ ...required, channel: "current" }).channel, "current");
  assert.equal(parseEgernOptions({ ...required, adblockMode: "full" }).adblockMode, "full");
  for (const [key, value] of [["channel", "beta"], ["adblockMode", "balanced"]]) {
    assert.throws(() => parseEgernOptions({ ...required, [key]: value }), new RegExp(key, "i"));
  }
});

test("requires exact profile discriminator values and supported platforms", () => {
  for (const [key, value] of [
    ["output", "nodes"],
    ["type", "file"],
    ["platform", "appletv"],
    ["platform", "android"],
  ]) {
    assert.throws(() => parseEgernOptions({ ...required, [key]: value }), new RegExp(key, "i"));
  }

  for (const key of ["output", "type", "name", "nodeSubscriptionUrl", "platform"]) {
    const missing = { ...required };
    delete missing[key];
    assert.throws(() => parseEgernOptions(missing), new RegExp(key, "i"));
  }
});

test("accepts safe collection slugs exactly and rejects unsafe collection names", () => {
  for (const name of ["apple-proxy-egern", "apple-proxy-sources"]) {
    assert.equal(parseEgernOptions({ ...required, name }).name, name);
  }
  for (const name of ["", " ", "中文", "egern/sources", "egern?sources", "egern#sources", " egern-sources", "egern-sources ", "egern\nsources", "__proto__"]) {
    assert.throws(() => parseEgernOptions({ ...required, name }), /name/i, JSON.stringify(name));
  }
});

test("rejects primitives, arrays, inherited options, accessors, and prototype tricks", () => {
  for (const raw of [null, undefined, [], "options", 7, true]) {
    assert.throws(() => parseEgernOptions(raw), /Options must be a plain object/);
  }

  const inherited = Object.assign(Object.create({ dnsMode: "privacy" }), required);
  assert.throws(() => parseEgernOptions(inherited), /inherited option/i);

  const getterInput = { ...required };
  let calls = 0;
  Object.defineProperty(getterInput, "dnsMode", {
    enumerable: true,
    get() {
      calls += 1;
      return "privacy";
    },
  });
  assert.throws(() => parseEgernOptions(getterInput), /accessor option/i);
  assert.equal(calls, 0);

  for (const poisoned of [
    JSON.parse('{"output":"config","type":"collection","name":"safe","nodeSubscriptionUrl":"https://example.invalid/private/egern-nodes","platform":"macos","__proto__":"x"}'),
    { ...required, constructor: "x" },
    { ...required, prototype: "x" },
  ]) {
    assert.throws(() => parseEgernOptions(poisoned), /prototype option/i);
  }
});

test("rejects unknown public options while ignoring inert internal metadata", () => {
  assert.throws(() => parseEgernOptions({ ...required, surprise: "value" }), /Unknown Egern option/);
  assert.deepEqual(
    parseEgernOptions({ ...required, _profile: "ignored" }),
    parseEgernOptions(required),
  );
});

test("rejects ambiguous whitespace, CR/LF, and unsupported enum values without echoing values", () => {
  const secret = "TEST_ONLY_REJECTED_OPTION_VALUE";
  for (const [key, value] of [
    ["name", " eg​​ern"],
    ["name", "eg​ern"],
    ["name", "egern\nprofile"],
    ["dnsMode", `stable ${secret}`],
    ["chinaDns", "alidns\r"],
    ["globalDns", " cloudflare"],
    ["blockMode", "balanced\t"],
    ["quicMode", "proxy-block\n"],
    ["ipv6Mode", "auto "],
    ["autoGroupMode", "full\r"],
    ["clientChain", "off\n"],
    ["channel", `edge ${secret}`],
    ["adblockMode", `off ${secret}`],
  ]) {
    assert.throws(
      () => parseEgernOptions({ ...required, [key]: value }),
      (error) => {
        assert.match(error.message, new RegExp(key, "i"));
        assert.doesNotMatch(error.message, new RegExp(secret));
        assert.equal(error.message.includes("\n"), false);
        assert.equal(error.message.includes("\r"), false);
        return true;
      },
    );
  }
});

test("validates the private node URL without normalizing its path or query token", () => {
  const queryKey = ["to", "ken"].join("");
  const exact = `https://example.invalid:8443/private/%65gern-nodes?${queryKey}=TEST_ONLY_TOKEN%2Fvalue&v=1`;
  assert.equal(parseEgernOptions({ ...required, nodeSubscriptionUrl: exact }).nodeSubscriptionUrl, exact);

  const rejected = [
    "http://example.invalid/private/egern-nodes",
    "//example.invalid/private/egern-nodes",
    `https://${["us", "er"].join("")}@example.invalid/private/egern-nodes`,
    `https://%75${["se", "r"].join("")}@example.invalid/private/egern-nodes`,
    "https://example.invalid/private/egern-nodes#fragment",
    "https://example.invalid/private/%0degern-nodes",
    `https://example.invalid/private/egern-nodes?${queryKey}=%0Avalue`,
    String.raw`https://example.invalid/private\egern-nodes`,
    ["https://example.invalid", "\\", "@evil.invalid/private/egern-nodes"].join(""),
    " https://example.invalid/private/egern-nodes",
    "https://例子.invalid/private/egern-nodes",
    "https://127.1/private/egern-nodes",
    "https://example.invalid/private/%zz",
    "https://example.invalid:65536/private/egern-nodes",
  ];

  for (const nodeSubscriptionUrl of rejected) {
    assert.throws(
      () => parseEgernOptions({ ...required, nodeSubscriptionUrl }),
      (error) => {
        assert.match(error.message, /nodeSubscriptionUrl/);
        assert.equal(error.message.includes(nodeSubscriptionUrl), false);
        assert.doesNotMatch(error.message, /example\.invalid|egern-nodes|TEST_ONLY|%0d|%0a|token=/i);
        return true;
      },
    );
  }
});

test("rejects every raw and percent-encoded ASCII C0 or DEL URL control", () => {
  const queryKey = ["to", "ken"].join("");
  const codes = [...Array.from({ length: 0x20 }, (_, code) => code), 0x7f];

  for (const code of codes) {
    const rawControl = String.fromCharCode(code);
    const encodedControl = `%${code.toString(16).padStart(2, "0")}`;
    const cases = [
      `https://example.invalid/private/${rawControl}egern-nodes`,
      `https://example.invalid/private/egern-nodes?${queryKey}=before${rawControl}after`,
      `https://example.invalid/private/${encodedControl}egern-nodes`,
      `https://example.invalid/private/egern-nodes?${queryKey}=before${encodedControl}after`,
    ];

    for (const nodeSubscriptionUrl of cases) {
      assert.throws(
        () => parseEgernOptions({ ...required, nodeSubscriptionUrl }),
        (error) => {
          assert.match(error.message, /nodeSubscriptionUrl/);
          assert.equal(error.message.includes(nodeSubscriptionUrl), false);
          assert.equal(/[\u0000-\u001f\u007f]/u.test(error.message), false);
          assert.doesNotMatch(error.message, /example\.invalid|egern-nodes|before|after/i);
          return true;
        },
        `control U+${code.toString(16).padStart(4, "0")}`,
      );
    }
  }
});

test("returns an immutable snapshot independent of later input mutation", () => {
  const raw = { ...required };
  const parsed = parseEgernOptions(raw);
  raw.name = "changed";
  raw.nodeSubscriptionUrl = "https://example.invalid/private/changed";

  assert.equal(parsed.name, required.name);
  assert.equal(parsed.nodeSubscriptionUrl, PRIVATE_URL);
  assert.throws(() => {
    parsed.dnsMode = "privacy";
  }, TypeError);
});
