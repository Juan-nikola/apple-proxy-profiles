import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  containsSecret,
  sanitizeSyntheticPlaceholders,
  scanFiles,
  scanText,
} from "../shared/security/secret-scan.js";
import {
  containsSecret as containsSecretFromScript,
  sanitizeSyntheticPlaceholders as sanitizeSyntheticPlaceholdersFromScript,
  scanFiles as scanFilesFromScript,
} from "../scripts/check-secrets.mjs";

test("public output rejects private URLs and endpoint credentials", () => {
  const credential = ["runtime", "constructed", "credential", "value"].join("_");
  const tokenKey = ["to", "ken"].join("");
  const passwordKey = ["pass", "word"].join("");

  assert.equal(containsSecret(`https://example.com/sub?${tokenKey}=${credential}`), true);
  assert.equal(containsSecret(`server: 192.0.2.20\n${passwordKey}: ${credential}`), true);
  assert.equal(containsSecret("https://juan-nikola.github.io/apple-proxy-profiles/current/rules/x.arrs"), false);
});

test("the CLI wrapper preserves the scanner's public exports", () => {
  assert.equal(containsSecretFromScript, containsSecret);
  assert.equal(sanitizeSyntheticPlaceholdersFromScript, sanitizeSyntheticPlaceholders);
  assert.equal(scanFilesFromScript, scanFiles);
});

test("secret scanning does not trust broad prose markers", () => {
  const realPassword = ["runtime", "constructed", "credential", "value"].join("_");
  assert.equal(containsSecret(`test fake fixture password: ${realPassword}`), true);
});

test("secret scanning removes only approved synthetic placeholders", () => {
  assert.equal(containsSecret("password: TEST_ONLY_SYNTHETIC_PASSWORD"), false);
  assert.equal(sanitizeSyntheticPlaceholders("password: DIFFERENT_TEST_VALUE"), "password: ");
});

test("a real secret beside TEST_ONLY remains detectable", () => {
  const realPassword = ["runtime", "constructed", "credential", "value"].join("_");
  assert.equal(containsSecret(`password: TEST_ONLY_FIXTURE password: ${realPassword}`), true);
});

test("angle brackets do not hide a credential", () => {
  const realToken = ["runtime", "constructed", "credential", "value"].join("_");
  assert.equal(containsSecret(`token: <${realToken}>`), true);
});

test("UUID credential assignments are detected without exempting real UUIDs", () => {
  const realUuid = ["123e4567", "e89b", "42d3", "a456", "426614174000"].join("-");
  assert.equal(containsSecret(`uuid: \"${realUuid}\"`), true);
  assert.equal(containsSecret(`uuid: <${realUuid}>`), true);
  assert.equal(containsSecret("uuid=00000000-0000-4000-8000-000000000001"), false);
  assert.equal(containsSecret(`uuid: 00000000-0000-4000-8000-000000000001 uuid=${realUuid}`), true);
  assert.equal(containsSecret(`uuid: <00000000-0000-4000-8000-000000000001> uuid=<${realUuid}>`), true);
});

test("high-entropy base64url credentials are detected only after credential keys", () => {
  const value = ["qwertyuiopASDFGHJKLzxcvbnm123456", "_-"].join("");
  const repeatedValue = "a".repeat(32);
  const base64Value = ["AbCdEfGhIjKlMnOpQrStUvWxYz012345", "+/="].join("");
  const privateKey = ["private", "_key"].join("");
  assert.equal(containsSecret(`auth: ${value}`), true);
  assert.equal(containsSecret(`auth: ${repeatedValue}`), true);
  assert.equal(scanText("profiles/public.conf", `${privateKey}: ${base64Value}`).some(
    (finding) => finding.ruleId === "credential-high-entropy",
  ), true);
  assert.equal(containsSecret(`public label ${value}`), false);
});

test("findings expose only paths and rule IDs", async () => {
  const credential = ["runtime", "constructed", "credential", "value"].join("_");
  const findings = scanText("profiles/public.conf", `password: ${credential}`);
  assert.deepEqual(findings, [
    { file: "profiles/public.conf", ruleId: "credential-assignment" },
    { file: "profiles/public.conf", ruleId: "credential-high-entropy" },
  ]);
  assert.equal(JSON.stringify(findings).includes(credential), false);

  const directory = await mkdtemp(join(tmpdir(), "apple-proxy-profiles-security-"));
  const file = join(directory, "profile.conf");
  await writeFile(file, `token: ${credential}\n`, "utf8");
  try {
    assert.deepEqual(await scanFiles([file]), [
      { file, ruleId: "credential-assignment" },
      { file, ruleId: "credential-high-entropy" },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
