import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const profileFiles = [
  "../dist/surge-profile-generator.js",
  "../dist/substore-profile-generator.js",
  "../../../public/current/surge/scripts/surge-profile-generator.js",
  "../../../public/current/surge/scripts/substore-profile-generator.js",
];

const nodeFiles = [
  "../dist/surge-nodes-generator.js",
  "../dist/substore-nodes-generator.js",
  "../../../public/current/surge/scripts/surge-nodes-generator.js",
  "../../../public/current/surge/scripts/substore-nodes-generator.js",
];

test("Surge bundles expose the Sub-Store operator and remain public-URL closed", async () => {
  for (const file of profileFiles) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /async function operator\(/u, file);
    assert.match(content, /PUBLIC_RULE_BASE_URL|current\/surge\/rules/u, file);
    assert.doesNotMatch(content, /raw\.githubusercontent\.com\/blackmatrix7/iu, file);
    assert.doesNotMatch(content, /private-node\.example|password=secret/iu, file);
  }
  for (const file of nodeFiles) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /async function operator\(/u, file);
    assert.doesNotMatch(content, /raw\.githubusercontent\.com\/blackmatrix7/iu, file);
    assert.doesNotMatch(content, /private-node\.example|password=secret/iu, file);
  }
});

test("published Surge bundles include primary node filtering and compact naming", async () => {
  for (const file of profileFiles) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /nodeFilter:/u, file);
    assert.match(content, /\\uFF5C/u, file);
  }
});

test("published Surge node bundles expose a private provider operator", async () => {
  for (const file of nodeFiles) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /async function operator\(/u, file);
    assert.match(content, /No compatible Surge nodes|renderSurgeNodeResource/u, file);
    assert.doesNotMatch(content, /private-source\.example|EXAMPLE_TOKEN/iu, file);
  }
});
