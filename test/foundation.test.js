import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("monorepo exposes the Shadowrocket workspace and root verification", async () => {
  await access(new URL("../clients/shadowrocket/package.json", import.meta.url));
  const root = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(root.workspaces, ["clients/*"]);
  assert.equal(root.scripts["verify:shadowrocket"], "npm --workspace @apple-proxy-profiles/shadowrocket run verify");
});
