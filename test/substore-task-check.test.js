import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  checkSubstoreTaskUrl,
  checkTaskOptions,
  parseTaskUrl,
} from "../scripts/check-substore-task.mjs";

const PUBLIC = "https://juan-nikola.github.io/apple-proxy-profiles";

test("accepts a valid Shadowrocket config task", () => {
  const url = `${PUBLIC}/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
});

test("accepts a valid node task on edge channel", () => {
  const url = `${PUBLIC}/edge/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
});

test("accepts a client-specific collection slug and rejects unsafe collection names", () => {
  const safe = `${PUBLIC}/edge/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(safe).ok, true);
  for (const name of ["", "bad%2Fname", "bad%3Fname", "bad%23name", "%E4%B8%AD%E6%96%87", "bad%0Aname", "__proto__"]) {
    const url = `${PUBLIC}/edge/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=${name}&clientChain=off`;
    assert.equal(checkSubstoreTaskUrl(url).ok, false, name);
  }
});

test("accepts OneXray node, profile, and audit generator schemas", () => {
  const urls = [
    `${PUBLIC}/edge/onexray/scripts/onexray-nodes-generator.js#output=nodes&type=collection&name=apple-proxy-onexray&channel=edge&clientChain=off`,
    `${PUBLIC}/edge/onexray/scripts/onexray-profile-generator.js#output=profile&type=collection&name=apple-proxy-onexray&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyFile=synthetic-policy&logLevel=info&dnsLog=on`,
    `${PUBLIC}/edge/onexray/scripts/onexray-profile-generator.js#output=audit&type=collection&name=apple-proxy-onexray&channel=edge&dnsMode=privacy&chinaDns=dnspod&globalDns=quad9&blockMode=security&quicMode=all-block&ipv6Mode=ipv4-only&clientChain=off&policyOverrides=e30&logLevel=warning&dnsLog=off`,
  ];
  for (const url of urls) {
    const result = checkSubstoreTaskUrl(url);
    assert.equal(result.ok, true, result.errors.join(", "));
  }
});

test("OneXray checker uses the shared safe collection slug boundary", () => {
  for (const name of ["apple-proxy-onexray", "apple-proxy-all", "a", `a${"b".repeat(127)}`]) {
    const url = `${PUBLIC}/edge/onexray/scripts/onexray-nodes-generator.js#output=nodes&type=collection&name=${name}&channel=edge&clientChain=off`;
    assert.equal(checkSubstoreTaskUrl(url).ok, true, name);
  }
  for (const name of ["", "bad%2Fname", "bad%3Fname", "bad%23name", "%E4%B8%AD%E6%96%87", "bad%0Aname", "__proto__", "constructor", "prototype", `a${"b".repeat(128)}`]) {
    const url = `${PUBLIC}/edge/onexray/scripts/onexray-nodes-generator.js#output=nodes&type=collection&name=${name}&channel=edge&clientChain=off`;
    assert.equal(checkSubstoreTaskUrl(url).ok, false, name);
  }
});

test("rejects unsupported OneXray generator options", () => {
  for (const suffix of [
    "output=config&type=collection&name=apple-proxy-onexray",
    "output=profile&type=collection&name=apple-proxy-onexray&platform=macos",
    "output=profile&type=collection&name=apple-proxy-onexray&dnsLog=yes",
  ]) {
    const result = checkSubstoreTaskUrl(`${PUBLIC}/edge/onexray/scripts/onexray-profile-generator.js#${suffix}`);
    assert.equal(result.ok, false, suffix);
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
