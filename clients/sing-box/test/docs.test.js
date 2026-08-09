import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sing-box docs cover all platforms, channels and transparent gateway canary", async () => {
  const paths = ["../README.md", "../docs/deployment.md", "../docs/canary.md", "../docs/openwrt.md", "../docs/troubleshooting.md"];
  const content = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  for (const value of ["sing-box-config-generator.js", "output=config", "edge", "current", "Mac", "Android", "iPhone", "iPad", "OpenWrt", "测试 VLAN", "私密 Sub-Store"]) {
    assert.match(content, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), value);
  }
  const canary = await readFile(new URL("../docs/canary.md", import.meta.url), "utf8");
  assert.match(canary, /DomesticCore[\s\S]*OverseasGame[\s\S]*ChinaTLD[\s\S]*ChinaIP/u);
  for (const phrase of ["explain:route", "HTTPDNS", "硬编码 IP", "resolve action", "分别测试 Wi‑Fi 与蜂窝"]) {
    assert.ok(canary.includes(phrase), `sing-box canary missing ${phrase}`);
  }
});
