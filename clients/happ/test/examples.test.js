import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateHappSubscription } from "../src/validate-subscription.js";

for (const platform of ["macos", "iphone", "ipad", "android", "windows", "linux"]) {
  test(`Happ ${platform} example is a sanitized valid JSON subscription`, async () => {
    const content = await readFile(new URL(`../examples/happ-${platform}.json`, import.meta.url), "utf8");
    const configs = JSON.parse(content);
    assert.equal(validateHappSubscription(configs), true);
    assert.equal(content.endsWith("\n"), true);
    assert.match(content, /example\.invalid/u);
    assert.match(content, /TEST_ONLY_/u);
    assert.doesNotMatch(content, /198\.51\.100\.|192\.0\.2\./u);
  });
}

test("Happ routing audit example is a sanitized private audit object", async () => {
  const content = await readFile(new URL("../examples/happ-routing-audit.json", import.meta.url), "utf8");
  const audit = JSON.parse(content);
  assert.equal(audit.schemaVersion, 1);
  assert.equal(typeof audit.counts.eligibleNodes, "number");
  assert.doesNotMatch(content, /example\.invalid|TEST_ONLY_/u);
});

test("Happ operator documentation covers the six-platform setup and diagnostics contract", async () => {
  const root = new URL("../../../", import.meta.url);
  const read = (path) => readFile(new URL(path, root), "utf8");
  const [readme, deployment, troubleshooting, canary] = await Promise.all([
    read("clients/happ/README.md"),
    read("clients/happ/docs/deployment.md"),
    read("clients/happ/docs/troubleshooting.md"),
    read("clients/happ/docs/canary.md"),
  ]);
  const content = [readme, deployment, troubleshooting, canary].join("\n");

  for (const platform of ["macOS", "iPhone", "iPad", "Android", "Windows", "Linux"]) assert.match(content, new RegExp(platform, "u"));
  for (const task of [
    "happ-config-macos", "happ-config-iphone", "happ-config-ipad", "happ-config-android", "happ-config-windows", "happ-config-linux", "happ-routing-audit",
  ]) assert.ok(content.includes(`\`${task}\``), `missing Happ task ${task}`);
  assert.match(content, /七个任务[\s\S]{0,240}同一.{0,20}`policyOverrides`/u);
  assert.match(content, /大小写.{0,80}完全一致|完全一致.{0,80}大小写/u);
  assert.match(content, /`DIRECT`.*`FOLLOW`.*`NODE:/us);
  assert.match(content, /missing-node-fallback/u);
  assert.match(content, /duplicate-node-fallback/u);
  assert.match(content, /renderFailures|不兼容协议/u);
  assert.match(content, /meta\.serverDescription/u);
  assert.match(content, /Happ\/Xray 日志/u);
  assert.match(content, /Base64URL/u);
  assert.match(content, /先导入.*路由.*geodata[\s\S]{0,180}再导入.*JSON/u);
  assert.match(content, /edge[\s\S]{0,180}current/u);
});
