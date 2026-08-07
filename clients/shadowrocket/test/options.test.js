import assert from "node:assert/strict";
import test from "node:test";

import { OPTION_VALUES } from "../../../shared/contracts.js";
import { parseOptions, platformPreset } from "../src/options.js";

const required = {
  output: "config",
  type: "collection",
  name: "shadowrocket-sources",
  subscriptionName: "Shadowrocket-Nodes",
  platform: "macos",
};

test("parseOptions applies the generator defaults", () => {
  assert.deepEqual(parseOptions(required), {
    ...required,
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "ipv4-only",
    autoGroupMode: "auto",
    clientChain: "off",
    adblockMode: "off",
  });
});

test("parseOptions accepts only supported publication and adblock modes", () => {
  assert.equal(parseOptions({ ...required, channel: "current" }).channel, "current");
  assert.equal(parseOptions({ ...required, adblockMode: "full" }).adblockMode, "full");
  for (const [key, value] of [["channel", "beta"], ["adblockMode", "balanced"]]) {
    assert.throws(() => parseOptions({ ...required, [key]: value }), new RegExp(key, "iu"));
  }
});

test("parseOptions derives stable network defaults by platform and preserves explicit overrides", () => {
  for (const platform of ["iphone", "ipad", "appletv"]) {
    const options = parseOptions({ ...required, platform });
    assert.equal(options.ipv6Mode, "auto", platform);
    assert.equal(options.quicMode, "proxy-block", platform);
  }
  assert.equal(parseOptions({ ...required, ipv6Mode: "auto", quicMode: "allow" }).ipv6Mode, "auto");
  assert.equal(parseOptions({ ...required, ipv6Mode: "auto", quicMode: "allow" }).quicMode, "allow");
});

test("parseOptions rejects a missing or empty collection name", () => {
  assert.throws(() => parseOptions({ ...required, name: "" }), /name/i);
  assert.throws(() => parseOptions({ ...required, name: "   " }), /name/i);
  const { name, ...withoutName } = required;
  assert.throws(() => parseOptions(withoutName), /name/i);
});

test("parseOptions preserves an exact subscription display name", () => {
  const subscriptionName = "中文 Nodes=Prod,主订阅\\";

  assert.equal(parseOptions({ ...required, subscriptionName }).subscriptionName, subscriptionName);
});

test("parseOptions rejects ambiguous subscription display names", () => {
  for (const subscriptionName of [" Shadowrocket-Nodes", "Shadowrocket-Nodes "]) {
    assert.throws(
      () => parseOptions({ ...required, subscriptionName }),
      /subscriptionName.*leading or trailing whitespace/i,
    );
  }
  for (const subscriptionName of ["Nodes\nInjected", "Nodes\rInjected"]) {
    assert.throws(
      () => parseOptions({ ...required, subscriptionName }),
      /subscriptionName.*CR or LF/i,
    );
  }
});

test("parseOptions rejects unknown enum values", () => {
  assert.throws(() => parseOptions({ ...required, dnsMode: "fastest" }), /dnsMode/i);
});

test("parseOptions rejects unknown non-internal options", () => {
  assert.throws(() => parseOptions({ ...required, extra: "x" }), /extra/i);
});

test("parseOptions accepts option values only from own properties", () => {
  const inheritedRequired = Object.create(required);
  assert.throws(() => parseOptions(inheritedRequired), /output/i);

  const inheritedOptional = Object.assign(Object.create({ dnsMode: "privacy" }), required, {
    _internal: "ignored",
  });
  const options = parseOptions(inheritedOptional);
  assert.equal(options.dnsMode, "stable");
  assert.equal("_internal" in options, false);
});

test("OPTION_VALUES enum arrays are immutable", () => {
  assert.equal(Object.isFrozen(OPTION_VALUES.dnsMode), true);
  assert.throws(() => OPTION_VALUES.dnsMode.push("fastest"), TypeError);
  assert.deepEqual(OPTION_VALUES.dnsMode, ["stable", "privacy", "speed"]);
});

test("platformPreset returns the expected test intervals", () => {
  assert.equal(platformPreset("macos").testInterval, 600);
  assert.equal(platformPreset("iphone").testInterval, 1800);
  assert.equal(platformPreset("ipad").testInterval, 1800);
  assert.equal(platformPreset("appletv").testInterval, 3600);
});

test("platformPreset rejects prototype property names", () => {
  for (const platform of ["__proto__", "constructor", "toString"]) {
    assert.throws(() => platformPreset(platform), /platform/i);
  }
});
