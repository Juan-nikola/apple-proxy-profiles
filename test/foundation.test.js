import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { normalizeNodes } from "../shared/nodes/normalize-nodes.js";

test("monorepo exposes all client workspaces and root verification", async () => {
  await access(new URL("../clients/shadowrocket/package.json", import.meta.url));
  await access(new URL("../clients/egern/package.json", import.meta.url));
  await access(new URL("../clients/anywhere/package.json", import.meta.url));
  await access(new URL("../clients/surge/package.json", import.meta.url));
  await access(new URL("../clients/sing-box/package.json", import.meta.url));
  await access(new URL("../clients/happ/package.json", import.meta.url));
  const root = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(root.workspaces, ["clients/*"]);
  assert.equal(root.scripts["verify:shadowrocket"], "npm --workspace @apple-proxy-profiles/shadowrocket run verify");
  assert.equal(root.scripts["verify:egern"], "npm --workspace @apple-proxy-profiles/egern run verify");
  assert.equal(root.scripts["verify:anywhere"], "npm --workspace @apple-proxy-profiles/anywhere run verify");
  assert.equal(root.scripts["verify:surge"], "npm --workspace @apple-proxy-profiles/surge run verify");
  assert.equal(root.scripts["verify:singbox"], "npm --workspace @apple-proxy-profiles/sing-box run verify");
  assert.equal(root.scripts["verify:happ"], "npm --workspace @apple-proxy-profiles/happ run verify");
  assert.equal(root.scripts["verify:lightweight"], [
    "node --test test/lightweight-policy.test.js test/rule-model.test.js",
    "npm run verify:shadowrocket",
    "npm run verify:surge",
    "npm run verify:egern",
    "npm run verify:singbox",
    "npm run verify:anywhere",
    "npm run verify:happ",
    "node --test test/cross-client-routing.test.js test/rule-budgets.test.js",
  ].join(" && "));
  assert.equal(root.scripts.verify, "npm run verify:lightweight && node scripts/verify.mjs");
});

test("normalized nodes expose neutral metadata only", () => {
  const { nodes } = normalizeNodes([{
    name: "US Test", type: "ss", server: "192.0.2.10", port: 8388,
    cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD_1234", _subName: "[自建]Test",
    _resolved: true, _IPv4: "192.0.2.10", _parserMetadata: { provider: "fixture" }, _network: "tcp",
  }]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]._profile.sourceKind, "selfHosted");
  assert.deepEqual(Object.keys(nodes[0]).filter((key) => key.startsWith("_")), ["_profile"]);
});

test("normalized nodes omit undefined optional fields emitted by SubStore", () => {
  const { nodes } = normalizeNodes([{
    name: "Undefined options", type: "vless", server: "192.0.2.11", port: 443,
    uuid: "00000000-0000-4000-8000-000000000001", network: "tcp",
    tfo: undefined, "skip-cert-verify": undefined, "block-quic": undefined,
    "ip-version": undefined,
  }]);
  for (const key of ["tfo", "skip-cert-verify", "block-quic", "ip-version"]) {
    assert.equal(Object.hasOwn(nodes[0], key), false, key);
  }
});
