import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import { containsSecret, sanitizeSyntheticPlaceholders } from "../../../shared/security/secret-scan.js";

const execFileAsync = promisify(execFile);
const root = new URL("../../../", import.meta.url);

test("the tracked workspace passes the secret scanner", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/check-secrets.mjs"], {
    cwd: root,
  });
  assert.equal(stderr, "");
  assert.match(stdout, /^OK \d+ files scanned; no secrets found\n$/);
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
  assert.equal(containsSecret(`uuid: "${realUuid}"`), true);
  assert.equal(containsSecret(`uuid: <${realUuid}>`), true);
  assert.equal(containsSecret("uuid=00000000-0000-4000-8000-000000000001"), false);
  assert.equal(containsSecret(`uuid: 00000000-0000-4000-8000-000000000001 uuid=${realUuid}`), true);
  assert.equal(containsSecret(`uuid: <00000000-0000-4000-8000-000000000001> uuid=<${realUuid}>`), true);
});
