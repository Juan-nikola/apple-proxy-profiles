import assert from "node:assert/strict";
import test from "node:test";

import {
  encodePolicyOverrides,
  policyOverrideParam,
  updateTaskPolicy,
} from "../src/policy-sync.js";

const POLICY = Object.freeze({
  ai: "NODE:🇺🇸 大妈尔湾｜自建·U VLESS",
  github: "FOLLOW",
});

const TASK = Object.freeze({
  name: "onexray-profile",
  type: "file",
  process: [
    {
      type: "Script Operator",
      args: {
        mode: "link",
        content:
          "https://example.invalid/onexray-profile-generator.js?v=4#output=profile&type=collection&name=apple-proxy-sources",
        arguments: {
          output: "profile",
          type: "collection",
          name: "apple-proxy-sources",
        },
      },
    },
  ],
});

test("encodes a readable policy into canonical Base64URL and validates it", () => {
  const encoded = encodePolicyOverrides(POLICY);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/u);
  assert.equal(policyOverrideParam(encoded), `policyOverrides=${encoded}`);
  assert.equal(encodePolicyOverrides({}), "e30");
  assert.throws(() => encodePolicyOverrides({ unknown: "NODE:x" }), /unknown business key/u);
  assert.throws(() => encodePolicyOverrides({ ai: "BLOCK" }), /FOLLOW|DIRECT|NODE/u);
  assert.throws(() => encodePolicyOverrides({ ai: "NODE:" }), /FOLLOW|DIRECT|NODE/u);
});

test("updates the task URL and parsed arguments without mutating the input", () => {
  const encoded = encodePolicyOverrides(POLICY);
  const updated = updateTaskPolicy(TASK, encoded);
  assert.notEqual(updated, TASK);
  assert.equal(TASK.process[0].args.content.includes("policyOverrides="), false);
  const content = updated.process[0].args.content;
  assert.equal(content.startsWith("https://example.invalid/onexray-profile-generator.js?v=4#output=profile"), true);
  assert.equal(content.endsWith(`&policyOverrides=${encoded}`), true);
  assert.equal(updated.process[0].args.arguments.policyOverrides, encoded);
  assert.equal(updated.process[0].args.arguments.output, "profile");
});

test("replaces an existing policyOverrides instead of duplicating it", () => {
  const encoded = encodePolicyOverrides(POLICY);
  const first = updateTaskPolicy(TASK, encoded);
  const second = updateTaskPolicy(first, encodePolicyOverrides({ ai: "FOLLOW" }));
  const matches = second.process[0].args.content.match(/policyOverrides=/gu) ?? [];
  assert.equal(matches.length, 1);
  assert.equal(second.process[0].args.arguments.ai, undefined);
});
