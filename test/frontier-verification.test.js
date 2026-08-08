import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("root verification exposes both frontier workspaces and the official-core compiler", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["verify:surge"], "npm --workspace @apple-proxy-profiles/surge run verify");
  assert.equal(packageJson.scripts["verify:singbox"], "npm --workspace @apple-proxy-profiles/sing-box run verify");
  await access(new URL("../clients/sing-box/scripts/compile-rules.mjs", import.meta.url));
});

test("public rule publication keeps auditable source JSON separate from binary output", async () => {
  const current = new URL("../public/current/sing-box/rules/Advertising.json", import.meta.url);
  const source = JSON.parse(await readFile(current, "utf8"));
  assert.equal(source.version, 5);
  assert.ok(Array.isArray(source.rules));
});
