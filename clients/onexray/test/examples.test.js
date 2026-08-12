import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { scanText } from "../../../shared/security/secret-scan.js";

const EXAMPLES = Object.freeze([
  "../examples/onexray-nodes-contract.json",
  "../examples/onexray-profile-contract.json",
  "../examples/onexray-routing-audit.json",
]);

test("OneXray contract examples are valid, deterministic JSON", async () => {
  for (const relative of EXAMPLES) {
    const text = await readFile(new URL(relative, import.meta.url), "utf8");
    assert.equal(text.endsWith("\n"), true, relative);
    assert.equal(text.endsWith("\n\n"), false, relative);
    assert.doesNotMatch(text, /\r/u, relative);
    const value = JSON.parse(text);
    assert.equal(typeof value, "object", relative);
    assert.equal(value.client, "OneXray", relative);
    assert.match(value.schema, /^onexray-[a-z-]+-v\d+$/u, relative);
    assert.deepEqual(scanText(relative, text), [], relative);
  }
});
test("contract examples contain only redacted schema shapes", async () => {
  const nodes = JSON.parse(await readFile(new URL(EXAMPLES[0], import.meta.url), "utf8"));
  const profile = JSON.parse(await readFile(new URL(EXAMPLES[1], import.meta.url), "utf8"));
  const audit = JSON.parse(await readFile(new URL(EXAMPLES[2], import.meta.url), "utf8"));

  assert.equal(nodes.output, "nodes");
  assert.ok(Array.isArray(nodes.schemaFields));
  assert.equal(nodes.redacted, true);
  assert.equal(profile.output, "profile");
  assert.equal(profile.redacted, true);
  assert.deepEqual(profile.schemaFields, ["name", "log", "dns", "routing", "inbounds", "outbounds"]);
  assert.equal(audit.output, "audit");
  assert.equal(audit.redacted, true);
  assert.equal(audit.schema, "onexray-routing-audit-v1");

  const all = JSON.stringify({ nodes, profile, audit });
  assert.doesNotMatch(all, /onexray:\/\/|https?:\/\//iu);
  assert.doesNotMatch(all, /(?:password|passwd|psk|uuid|private.?key|public.?key|token|secret|subscription|policyOverrides)/iu);
  assert.doesNotMatch(all, /(?:NODE:|ap-fixed-|chainProxy|PRIVATE_|TEST_ONLY_)/u);
  assert.doesNotMatch(all, /198\.51\.100\.|192\.0\.2\./u);
});
