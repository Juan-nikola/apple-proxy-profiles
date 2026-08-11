import assert from "node:assert/strict";
import test from "node:test";

import { parseOneXrayOptions } from "../src/options.js";

const REQUIRED = Object.freeze({ output: "profile", type: "collection", name: "OneXray 私密 Profile" });

test("parses the exact OneXray contract with pinned defaults and a trimmed display name", () => {
  const parsed = parseOneXrayOptions({ ...REQUIRED, name: "  OneXray 私密 Profile  " });
  assert.deepEqual(parsed, {
    output: "profile",
    type: "collection",
    name: "OneXray 私密 Profile",
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    clientChain: "off",
    clientChainTarget: "",
    policyOverrides: "",
  });
  assert.equal(Object.isFrozen(parsed), true);
});

test("accepts every supported OneXray output, channel, and shared option enum", () => {
  for (const output of ["nodes", "profile", "audit"]) {
    assert.equal(parseOneXrayOptions({ ...REQUIRED, output }).output, output);
  }
  for (const channel of ["edge", "current", "previous"]) {
    assert.equal(parseOneXrayOptions({ ...REQUIRED, channel }).channel, channel);
  }
  for (const [key, values] of Object.entries({
    dnsMode: ["stable", "privacy", "speed"],
    chinaDns: ["alidns", "dnspod", "system"],
    globalDns: ["cloudflare", "google", "quad9"],
    blockMode: ["balanced", "security", "strict", "off"],
    quicMode: ["allow", "proxy-block", "all-block"],
    ipv6Mode: ["auto", "ipv4-only"],
  })) {
    for (const value of values) assert.equal(parseOneXrayOptions({ ...REQUIRED, [key]: value })[key], value);
  }
});

test("requires explicit single-line output, type, and a collection name", () => {
  for (const raw of [
    { type: "collection", name: "Profile" },
    { output: "profile", name: "Profile" },
    { output: "profile", type: "collection" },
    { ...REQUIRED, output: "profile\n" },
    { ...REQUIRED, type: "collection\n" },
    { ...REQUIRED, type: "file" },
    { ...REQUIRED, name: "  \t  " },
    { ...REQUIRED, name: "Profile\nName" },
  ]) {
    assert.throws(() => parseOneXrayOptions(raw));
  }
});

test("rejects unknown, unsupported, removed, inherited, and accessor options", () => {
  for (const raw of [
    { ...REQUIRED, output: "config" },
    { ...REQUIRED, channel: "beta" },
    { ...REQUIRED, dnsMode: "fastest" },
    { ...REQUIRED, platform: "macos" },
    { ...REQUIRED, adblockMode: "full" },
    { ...REQUIRED, surprise: "value" },
    Object.assign(Object.create({ channel: "current" }), REQUIRED),
  ]) {
    assert.throws(() => parseOneXrayOptions(raw));
  }
  const getter = { ...REQUIRED };
  Object.defineProperty(getter, "channel", { enumerable: true, get: () => "current" });
  assert.throws(() => parseOneXrayOptions(getter), /accessor/i);
});

test("requires and canonicalizes a non-blank NODE chain target only when chaining is on", () => {
  const target = "node:🇺🇸 Los Angeles｜自建·U";
  assert.deepEqual(
    parseOneXrayOptions({ ...REQUIRED, clientChain: "on", clientChainTarget: target }),
    {
      ...parseOneXrayOptions(REQUIRED),
      clientChain: "on",
      clientChainTarget: "NODE:🇺🇸 Los Angeles｜自建·U",
    },
  );
  for (const raw of [
    { ...REQUIRED, clientChain: "on" },
    { ...REQUIRED, clientChain: "on", clientChainTarget: "NODE:" },
    { ...REQUIRED, clientChain: "on", clientChainTarget: "FOLLOW" },
    { ...REQUIRED, clientChainTarget: "NODE:Tokyo" },
  ]) assert.throws(() => parseOneXrayOptions(raw));
});

test("does not expose private target or override values in option errors", () => {
  const secret = "PRIVATE_ONEXRAY_POLICY_VALUE";
  for (const raw of [
    { ...REQUIRED, clientChain: "on", clientChainTarget: `NODE:${secret}\n` },
    { ...REQUIRED, policyOverrides: 7 },
  ]) {
    assert.throws(
      () => parseOneXrayOptions(raw),
      (error) => {
        assert.equal(error.message.includes(secret), false);
        return true;
      },
    );
  }
});
