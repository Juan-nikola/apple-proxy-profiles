import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  checkSubstoreTaskUrl,
  checkTaskOptions,
  getSubstoreTaskSchema,
  parseTaskUrl,
} from "../scripts/check-substore-task.mjs";

const PUBLIC = "https://juan-nikola.github.io/apple-proxy-profiles";

test("accepts a valid Shadowrocket config task", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
});

test("accepts a valid node task on current channel", () => {
  const url = `${PUBLIC}/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
});

test("checker schema marks policy readers and excludes node subscriptions", () => {
  for (const scriptPath of [
    "egern/scripts/egern-profile-generator.js",
    "shadowrocket/scripts/shadowrocket-profile-generator.js",
    "surge/scripts/surge-profile-generator.js",
    "sing-box/scripts/sing-box-config-generator.js",
    "v2box/scripts/substore-config-generator.js",
    "happ/scripts/happ-config-generator.js",
  ]) {
    assert.equal(getSubstoreTaskSchema(scriptPath).policyInput, "apple-proxy-policy", scriptPath);
  }
  assert.equal(getSubstoreTaskSchema("egern/scripts/egern-node-generator.js").policyInput, null);
  for (const scriptPath of [
    "anywhere/scripts/anywhere-strategy-generator.js",
    "anywhere/scripts/substore-strategy-generator.js",
  ]) {
    assert.equal(getSubstoreTaskSchema(scriptPath).policyInput, "apple-proxy-policy", scriptPath);
  }
});

test("accepts a valid HAPP Apple platform task", () => {
  const url = `${PUBLIC}/current/happ/scripts/happ-config-generator.js#output=config&type=collection&name=apple-proxy-happ&subscriptionName=Apple-Proxy-Happ&platform=ipad&channel=current&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
  assert.equal(checkSubstoreTaskUrl(url.replace("platform=ipad", "platform=android")).ok, false);
});

test("accepts the published Anywhere strategy task and rejects extra options", () => {
  const url = `${PUBLIC}/current/anywhere/scripts/anywhere-strategy-generator.js#output=strategy&type=collection&name=apple-proxy-anywhere&channel=current`;
  assert.equal(checkSubstoreTaskUrl(url).ok, true, checkSubstoreTaskUrl(url).errors.join(", "));
  assert.equal(checkSubstoreTaskUrl(url.replace("anywhere-strategy-generator", "substore-strategy-generator")).ok, true);
  assert.equal(checkSubstoreTaskUrl(`${url}&clientChain=off`).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("channel=current", "channel=beta")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("name=apple-proxy-anywhere", "name=bad%2Fname")).ok, false);
  assert.equal(getSubstoreTaskSchema("shadowrocket/scripts/shadowrocket-node-subscription.js").policyInput, null);
});

test("accepts INCY config tasks and rejects invalid INCY variants", () => {
  const url = `${PUBLIC}/current/incy/scripts/incy-config-generator.js#output=config&type=collection&name=apple-proxy-incy&subscriptionName=INCY&platform=androidtv&channel=current&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&adblockMode=off&autoGroupMode=auto&clientChain=off&format=array&selectionMode=both`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
  assert.equal(getSubstoreTaskSchema("incy/scripts/incy-config-generator.js").policyInput, "apple-proxy-policy");
  assert.equal(checkSubstoreTaskUrl(url.replace("platform=androidtv", "platform=tvos")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("name=apple-proxy-incy", "name=apple-proxy-egern")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("output=config", "output=nodes")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("&subscriptionName=INCY", "")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("&channel=current", "")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("&selectionMode=both", "&selectionMode=invalid")).ok, false);
  assert.equal(checkSubstoreTaskUrl(url.replace("&format=array", "&format=single")).ok, false);
});

test("accepts a client-specific collection slug and rejects unsafe collection names", () => {
  const safe = `${PUBLIC}/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(safe).ok, true);
  for (const name of ["", "bad%2Fname", "bad%3Fname", "bad%23name", "%E4%B8%AD%E6%96%87", "bad%0Aname", "__proto__"]) {
    const url = `${PUBLIC}/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=${name}&clientChain=off`;
    assert.equal(checkSubstoreTaskUrl(url).ok, false, name);
  }
});

test("rejects an unsupported dnsMode value", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=weird`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("dnsMode")), result.errors.join(", "));
});

test("rejects an unknown option key", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&foo=bar`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("Unknown option 'foo'")), result.errors.join(", "));
});

test("rejects a missing required platform", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("Missing required option 'platform'")), result.errors.join(", "));
});

test("rejects an unknown generator path", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/not-a-real-generator.js#output=config`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, false);
  assert.ok(result.errors[0].includes("Unknown generator"), result.errors.join(", "));
});

test("rejects query-string parameters", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js?output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos`;
  assert.throws(() => parseTaskUrl(url), /must not use '\?'/u);
});

test("rejects duplicate parameters", () => {
  const url = `${PUBLIC}/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-sources&name=other`;
  assert.throws(() => parseTaskUrl(url), /duplicated/u);
});

test("rejects an unsupported sing-box platform", () => {
  const url = `${PUBLIC}/current/sing-box/scripts/sing-box-config-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=watch&dnsMode=stable`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("platform")), result.errors.join(", "));
});

test("accepts valid sing-box output safety modes", () => {
  const url = `${PUBLIC}/current/sing-box/scripts/sing-box-config-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&profileMode=light&nodeErrorMode=strict`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
});

test("accepts V2Box task schemas and validates region/platform", () => {
  const v2box = `${PUBLIC}/current/v2box/scripts/substore-config-generator.js#output=config&type=collection&name=apple-proxy-v2box&subscriptionName=Apple-Proxy-V2Box&platform=ipad&channel=current&region=ru&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(v2box).ok, true, checkSubstoreTaskUrl(v2box).errors.join(", "));
  assert.equal(checkSubstoreTaskUrl(v2box.replace("region=ru", "region=moon")).ok, false);
  const v2boxNodes = `${PUBLIC}/current/v2box/scripts/substore-node-generator.js#output=nodes&type=collection&name=apple-proxy-v2box&clientChain=off&channel=current`;
  assert.equal(checkSubstoreTaskUrl(v2boxNodes).ok, true, checkSubstoreTaskUrl(v2boxNodes).errors.join(", "));
});

test("rejects full adblock for mobile sing-box tasks before preview", () => {
  for (const platform of ["iphone", "ipad", "android"]) {
    const url = `${PUBLIC}/current/sing-box/scripts/sing-box-config-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=${platform}&adblockMode=full`;
    const result = checkSubstoreTaskUrl(url);
    assert.equal(result.ok, false, platform);
    assert.match(result.errors.join(", "), /adblockMode=full.*mobile.*memory/iu);
  }
  const macos = `${PUBLIC}/current/sing-box/scripts/sing-box-config-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&adblockMode=full`;
  assert.equal(checkSubstoreTaskUrl(macos).ok, true);
});

test("rejects full adblock for Clash mobile tasks before preview", () => {
  for (const platform of ["iphone", "ipad", "appletv"]) {
    const url = `${PUBLIC}/current/clash/scripts/clash-profile-generator.js#output=config&type=collection&name=apple-proxy-clash&subscriptionName=Apple-Proxy-Clash&nodeSubscriptionUrl=https%3A%2F%2Fexample.invalid%2Fclash-nodes&platform=${platform}&adblockMode=full`;
    const result = checkSubstoreTaskUrl(url);
    assert.equal(result.ok, false, platform);
    assert.match(result.errors.join(", "), /adblockMode=full.*mobile.*memory/iu);
  }
  const macos = `${PUBLIC}/current/clash/scripts/clash-profile-generator.js#output=config&type=collection&name=apple-proxy-clash&subscriptionName=Apple-Proxy-Clash&nodeSubscriptionUrl=https%3A%2F%2Fexample.invalid%2Fclash-nodes&platform=macos&adblockMode=full`;
  assert.equal(checkSubstoreTaskUrl(macos).ok, true);
});

test("rejects an unsupported sing-box nodeErrorMode", () => {
  const url = `${PUBLIC}/current/sing-box/scripts/sing-box-config-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&nodeErrorMode=partial`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("nodeErrorMode")), result.errors.join(", "));
});

test("checkTaskOptions returns no errors for a full valid config", () => {
  const url = `${PUBLIC}/current/surge/scripts/surge-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off`;
  const parsed = parseTaskUrl(url);
  const scriptPath = parsed.scriptPath.replace(/^.*?\/(current|edge|previous)\//u, "");
  const schema = { scriptPath };
  const errors = checkTaskOptions(
    { allowed: ["output","type","name","subscriptionName","platform","channel","adblockMode","dnsMode","chinaDns","globalDns","blockMode","quicMode","ipv6Mode","autoGroupMode","clientChain"], required: ["output","type","name","subscriptionName","platform"], outputValues: ["config"], platforms: ["macos","iphone","ipad"], enums: { dnsMode:["stable","privacy","speed"], chinaDns:["alidns","dnspod","system"], globalDns:["cloudflare","google","quad9"], blockMode:["balanced","security","strict","off"], quicMode:["allow","proxy-block","all-block"], ipv6Mode:["auto","ipv4-only"], autoGroupMode:["auto","full","balanced","minimal"], clientChain:["off","on"] } },
    parsed.params,
  );
  assert.deepEqual(errors, []);
});

test("runs from the command line", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos`;
  const run = spawnSync(process.execPath, ["scripts/check-substore-task.mjs", url], { encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /^OK:/u);
});

test("runs from the command line without arguments by validating the configured task catalog", () => {
  const run = spawnSync(process.execPath, ["scripts/check-substore-task.mjs"], { encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.equal((run.stdout.match(/^OK:/gmu) ?? []).length, 38);
  assert.match(run.stdout, /validated 38 configured tasks \(37 URL tasks\)/u);
});
