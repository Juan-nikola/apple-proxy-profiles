import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sing-box docs cover all platforms, channels and transparent gateway canary", async () => {
  const paths = ["../README.md", "../docs/deployment.md", "../docs/canary.md", "../docs/openwrt.md", "../docs/troubleshooting.md"];
  const content = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  for (const value of ["sing-box-config-generator.js", "output=config", "edge", "current", "Mac", "Android", "iPhone", "iPad", "OpenWrt", "测试 VLAN", "私密 Sub-Store"]) {
    assert.match(content, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), value);
  }
});
