import assert from "node:assert/strict";
import test from "node:test";

import {
  ANYWHERE_RULE_IMPORT_CONTRACT,
  ANYWHERE_SOURCE_BASELINE,
  ANYWHERE_SUBSCRIPTION_CONTRACT,
} from "../src/upstream-contract.js";

test("pins the exact user-supplied official Anywhere main source", () => {
  assert.deepEqual(ANYWHERE_SOURCE_BASELINE, {
    repository: "https://github.com/NodePassProject/Anywhere",
    branch: "main",
    commit: "e15518fde1f5d2652dfc1c234c89a68b87cecec0",
    archiveSha256: "1ad984f39e1191b83975884423bbe5cfcd38e46f6f7e061ee0e0f4e4cc503db7",
    archiveDate: "2026-07-30",
  });
});

test("pins the audited Clash subscription surface without widening it to app internals", () => {
  assert.deepEqual(ANYWHERE_SUBSCRIPTION_CONTRACT.protocols, [
    "vless", "hysteria2", "trojan", "anytls", "ss", "socks5", "sudoku",
  ]);
  assert.deepEqual(ANYWHERE_SUBSCRIPTION_CONTRACT.vlessNetworks, ["tcp", "ws"]);
  assert.deepEqual(ANYWHERE_SUBSCRIPTION_CONTRACT.trojanNetworks, ["tcp"]);
  assert.deepEqual(ANYWHERE_SUBSCRIPTION_CONTRACT.shadowsocksMethods, [
    "aes-128-gcm",
    "aes-256-gcm",
    "chacha20-ietf-poly1305",
    "chacha20-poly1305",
    "none",
    "plain",
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
  ]);
  assert.equal(ANYWHERE_SUBSCRIPTION_CONTRACT.remoteFullProfile, false);
  assert.equal(ANYWHERE_SUBSCRIPTION_CONTRACT.remoteChains, false);
  assert.equal(ANYWHERE_SUBSCRIPTION_CONTRACT.mitmRequired, false);
});

test("pins the actual arrs import and refresh contract", () => {
  assert.deepEqual(ANYWHERE_RULE_IMPORT_CONTRACT, {
    extension: ".arrs",
    maxRulesPerSet: 100000,
    ruleTypes: {
      0: "ipv4-cidr",
      1: "ipv6-cidr",
      2: "domain-suffix",
      3: "domain-keyword",
    },
    initialRouting: { 0: "default", 1: "direct", 2: "reject" },
    refreshPreservesLocalName: true,
    refreshPreservesLocalAssignment: true,
    remoteProxyAssignment: false,
    proxyDeepLink: "anywhere://add-proxy?link=",
    ruleSetDeepLink: "anywhere://add-rule-set",
  });
});
