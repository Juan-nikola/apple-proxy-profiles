import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Surge docs provide private Sub-Store parameters and canary order", async () => {
  const paths = ["../README.md", "../docs/deployment.md", "../docs/canary.md", "../docs/troubleshooting.md"];
  const content = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  for (const value of ["surge-profile-generator.js", "surge-nodes-generator.js", "output=config", "output=nodes", "proxyPolicyUrl", "policy-path", "current", "edge", "Intel Mac", "iPhone", "iPad", "私密 Sub-Store"]) {
    assert.match(content, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), value);
  }
});
