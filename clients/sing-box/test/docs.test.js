import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sing-box docs cover all terminal platforms, channels and GeoIP canary", async () => {
  const paths = ["../README.md", "../docs/deployment.md", "../docs/canary.md", "../docs/openwrt.md", "../docs/troubleshooting.md"];
  const content = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  for (const value of ["sing-box-config-generator.js", "output=config", "edge", "current", "macOS", "Android", "iPhone", "iPad", "OpenWrt", "apple-proxy-singbox"]) {
    assert.match(content, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), value);
  }
  const canary = await readFile(new URL("../docs/canary.md", import.meta.url), "utf8");
  assert.match(canary, /DomesticCore[\s\S]*OverseasGame[\s\S]*ChinaTLD[\s\S]*ChinaIP/u);
  for (const phrase of ["ChinaIP", "HTTPDNS", "硬编码 IP", "resolve", "DNS response matching"]) {
    assert.ok(canary.includes(phrase), `sing-box canary missing ${phrase}`);
  }
});
