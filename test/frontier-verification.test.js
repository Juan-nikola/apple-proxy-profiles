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
  const current = new URL("../public/current/sing-box/", import.meta.url);
  const clientManifest = JSON.parse(await readFile(new URL("client-manifest.json", current), "utf8"));
  const ruleSetPaths = clientManifest.files
    .map(({ path }) => path)
    .filter((path) => path.startsWith("sing-box/rule-sets/") && path.endsWith(".srs"));
  assert.ok(ruleSetPaths.length > 0);
  for (const required of ["sing-box/rule-sets/DomesticCore.srs", "sing-box/rule-sets/ChinaIP.srs"]) {
    assert.ok(ruleSetPaths.includes(required), required);
  }
  for (const path of ruleSetPaths) {
    const bytes = await readFile(new URL(path.replace("sing-box/", ""), current));
    assert.ok(bytes.subarray(0, 4).equals(Buffer.from([0x53, 0x52, 0x53, 0x02])), path);
  }
});
