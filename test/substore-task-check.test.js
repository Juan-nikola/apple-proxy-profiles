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

test("accepts a valid previous-channel task and preserves its channel parameter", () => {
  const url = `${PUBLIC}/previous/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off&channel=previous`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
  assert.equal(parseTaskUrl(url).params.channel, "previous");
});

test("accepts the published previous Egern node URL from the rollback guide", () => {
  const url = `${PUBLIC}/previous/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off`;
  const result = checkSubstoreTaskUrl(url);
  assert.equal(result.ok, true, result.errors.join(", "));
});

test("accepts the active HAPP and OneXray generators and rejects unsupported channels", () => {
  const base = `${PUBLIC}/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(base.replace("/current/", "/beta/")).ok, false);
  assert.equal(checkSubstoreTaskUrl(`${base}&channel=edge`).ok, false);
  const happ = `${PUBLIC}/current/happ/scripts/happ-config-generator.js#output=config&type=collection&name=apple-proxy-happ&subscriptionName=Apple-Proxy-Happ&platform=macos`;
  assert.equal(checkSubstoreTaskUrl(happ).ok, true, checkSubstoreTaskUrl(happ).errors.join(", "));
  assert.equal(checkSubstoreTaskUrl(`${happ}&channel=current`).ok, false);
  assert.equal(checkSubstoreTaskUrl(happ.replace("/current/", "/edge/")).ok, false);
  assert.equal(checkSubstoreTaskUrl(happ.replace("/current/", "/previous/")).ok, false);
  const onexrayNodes = `${PUBLIC}/current/onexray/scripts/onexray-node-generator.js#output=nodes&type=collection&name=apple-proxy-onexray&clientChain=off&channel=current`;
  assert.equal(checkSubstoreTaskUrl(onexrayNodes).ok, true, checkSubstoreTaskUrl(onexrayNodes).errors.join(", "));
  const onexrayProfile = `${PUBLIC}/edge/onexray/scripts/onexray-profile-generator.js#output=profile&type=collection&name=apple-proxy-onexray&channel=edge&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(onexrayProfile).ok, true, checkSubstoreTaskUrl(onexrayProfile).errors.join(", "));
  const happAudit = `${PUBLIC}/current/happ/scripts/happ-routing-audit.js#output=audit&type=collection&name=apple-proxy-happ&subscriptionName=Apple-Proxy-Happ&platform=all`;
  assert.equal(checkSubstoreTaskUrl(happAudit).ok, true, checkSubstoreTaskUrl(happAudit).errors.join(", "));
});

test("accepts a client-specific collection slug and rejects unsafe collection names", () => {
  const safe = `${PUBLIC}/edge/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(safe).ok, true);
  for (const name of ["", "bad%2Fname", "bad%3Fname", "bad%23name", "%E4%B8%AD%E6%96%87", "bad%0Aname", "__proto__"]) {
    const url = `${PUBLIC}/edge/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=${name}&clientChain=off`;
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

test("accepts v2rayN and V2Box task schemas and validates region/platform", () => {
  const v2rayn = `${PUBLIC}/current/v2rayn/scripts/substore-config-generator.js#output=config&type=collection&name=apple-proxy-v2rayn&subscriptionName=Apple-Proxy-v2rayN&platform=windows&channel=current&region=cn&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off`;
  const v2box = `${PUBLIC}/current/v2box/scripts/substore-config-generator.js#output=config&type=collection&name=apple-proxy-v2box&subscriptionName=Apple-Proxy-V2Box&platform=ipad&channel=current&region=ru&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off`;
  assert.equal(checkSubstoreTaskUrl(v2rayn).ok, true, checkSubstoreTaskUrl(v2rayn).errors.join(", "));
  assert.equal(checkSubstoreTaskUrl(v2box).ok, true, checkSubstoreTaskUrl(v2box).errors.join(", "));
  assert.equal(checkSubstoreTaskUrl(v2box.replace("region=ru", "region=moon")).ok, false);
  assert.equal(checkSubstoreTaskUrl(v2rayn.replace("platform=windows", "platform=iphone")).ok, false);
  assert.equal(checkSubstoreTaskUrl(v2rayn.replace("channel=current", "unknown=value&channel=current")).ok, false);
  const v2raynNodes = `${PUBLIC}/edge/v2rayn/scripts/substore-node-generator.js#output=nodes&type=collection&name=apple-proxy-v2rayn&clientChain=off&channel=edge`;
  const v2boxNodes = `${PUBLIC}/previous/v2box/scripts/substore-node-generator.js#output=nodes&type=collection&name=apple-proxy-v2box&clientChain=off&channel=previous`;
  assert.equal(checkSubstoreTaskUrl(v2raynNodes).ok, true, checkSubstoreTaskUrl(v2raynNodes).errors.join(", "));
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
