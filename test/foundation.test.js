import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { normalizeNodes } from "../shared/nodes/normalize-nodes.js";

test("monorepo exposes the Shadowrocket workspace and root verification", async () => {
  await access(new URL("../clients/shadowrocket/package.json", import.meta.url));
  const root = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(root.workspaces, ["clients/*"]);
  assert.equal(root.scripts["verify:shadowrocket"], "npm --workspace @apple-proxy-profiles/shadowrocket run verify");
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
