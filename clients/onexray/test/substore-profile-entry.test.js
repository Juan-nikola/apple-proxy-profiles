import assert from "node:assert/strict";
import test from "node:test";

import { runOneXrayProfileProcessor } from "../src/substore-profile-entry.js";

const UUID = "00000000-0000-4000-8000-000000000001";
const NODE = {
  name: "🇯🇵 Tokyo vless",
  type: "vless",
  server: "tokyo.example.invalid",
  port: 443,
  uuid: UUID,
  _subName: "[自建]",
};
const BASE = Object.freeze({ type: "collection", name: "OneXray 私密 Profile" });

function args(output, extra = {}) {
  return { ...BASE, output, ...extra };
}

test("Profile and audit modes share one private transaction and exact output framing", () => {
  const profile = runOneXrayProfileProcessor({ proxies: [NODE], arguments: args("profile") });
  assert.match(profile, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=.+\n$/u);
  assert.equal(profile.endsWith("\n\n"), false);

  const audit = runOneXrayProfileProcessor({ proxies: [NODE], arguments: args("audit") });
  assert.equal(audit.endsWith("\n"), true);
  assert.equal(audit.endsWith("\n\n"), false);
  assert.equal(JSON.parse(audit).profile.deepLink.withinBudget, true);
  assert.equal(JSON.parse(audit).profile.shortVersion, decodeURIComponent(profile.trim().split("#").at(-1)).split(" · ").at(-1));
});

test("rejects node output at the profile entry boundary", () => {
  assert.throws(
    () => runOneXrayProfileProcessor({ proxies: [NODE], arguments: args("nodes") }),
    (error) => error.message === "OneXray profile: unsupported-output",
  );
});

test("fixed policy and profile failures reject both modes with the same stable code", () => {
  const bad = { output: "profile", ...BASE, clientChain: "off", policyOverrides: "eyJnaXRodWIiOiJOT0RFOm1pc3Npbmctbm9kZSJ9" };
  for (const output of ["profile", "audit"]) {
    assert.throws(
      () => runOneXrayProfileProcessor({ proxies: [NODE], arguments: { ...bad, output } }),
      (error) => error.message === "OneXray profile: invalid-policy; 业务: 🐙 GitHub",
    );
  }
});

test("never places request or raw node secrets in profile errors", () => {
  const secret = "TEST_ONLY_PROFILE_ENTRY_SECRET";
  assert.throws(
    () => runOneXrayProfileProcessor({
      proxies: [{ ...NODE, name: secret, uuid: secret }],
      arguments: { ...args("profile"), policyOverrides: "not-base64" },
    }),
    (error) => {
      assert.match(error.message, /^OneXray profile: /u);
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test("contains Proxy request traps behind the stable invalid-request code", () => {
  const secret = "TEST_ONLY_PROXY_REQUEST_SECRET";
  const request = new Proxy({}, {
    getPrototypeOf() { throw new Error(secret); },
  });
  assert.throws(
    () => runOneXrayProfileProcessor(request),
    (error) => {
      assert.equal(error.message, "OneXray profile: invalid-request");
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});
