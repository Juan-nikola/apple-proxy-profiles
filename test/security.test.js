import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

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
import {
  containsSecret as containsSecretFromWorkspaceScript,
  sanitizeSyntheticPlaceholders as sanitizeSyntheticPlaceholdersFromWorkspaceScript,
  scanFiles as scanFilesFromWorkspaceScript,
} from "../clients/shadowrocket/scripts/check-secrets.mjs";
import { CLIENT } from "../shared/contracts.js";
import { parsePrivatePolicy } from "../shared/policies/private-policy.js";
import { resolveUnifiedPolicy } from "../shared/policies/resolve-unified.js";
import { parseIncyOptions } from "../clients/incy/src/options.js";
import { renderIncyRoutingProfile } from "../clients/incy/src/render-routing-profile.js";
import { renderIncySubscription } from "../clients/incy/src/render-subscription.js";
import { fixtureNodes, fixturePolicy } from "../clients/incy/test/fixtures.js";

const execFileAsync = promisify(execFile);
const repositoryRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const rootScanner = fileURLToPath(new URL("../scripts/check-secrets.mjs", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../clients/shadowrocket/", import.meta.url));
const workspaceScanner = fileURLToPath(new URL("../clients/shadowrocket/scripts/check-secrets.mjs", import.meta.url));

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
  assert.equal(containsSecretFromWorkspaceScript, containsSecret);
  assert.equal(sanitizeSyntheticPlaceholdersFromWorkspaceScript, sanitizeSyntheticPlaceholders);
  assert.equal(scanFilesFromWorkspaceScript, scanFiles);
});

test("detects every supported credential-bearing URI scheme and HTTP userinfo", () => {
  const credential = ["runtime", "constructed", "uri", "credential"].join("_");
  const uri = (scheme) => `${scheme}${"://"}${credential}@example.invalid:443`;

  for (const scheme of [
    "ss",
    "shadowsocks",
    "ssr",
    "snell",
    "vmess",
    "vless",
    "trojan",
    "anytls",
    "hysteria",
    "hysteria2",
    "hy2",
    "tuic",
    "socks",
    "socks5",
    "socks5+tls",
    "ssh",
    "sudoku",
    "wireguard",
    "wg",
  ]) {
    assert.deepEqual(scanText("public/subscription.txt", uri(scheme)), [
      { file: "public/subscription.txt", ruleId: "proxy-uri" },
    ], scheme);
  }

  for (const scheme of ["http", "https"]) {
    assert.deepEqual(scanText("public/subscription.txt", uri(scheme)), [
      { file: "public/subscription.txt", ruleId: "http-userinfo" },
    ], scheme);
  }

  assert.equal(containsSecret("https://juan-nikola.github.io/apple-proxy-profiles/current/rules/x.arrs"), false);
  assert.equal(containsSecret("password: TEST_ONLY_SYNTHETIC_PASSWORD"), false);
});

test("root and workspace scanner entrypoints use the same repository scope", async () => {
  const root = await execFileAsync(process.execPath, [rootScanner], { cwd: repositoryRoot });
  const workspace = await execFileAsync(process.execPath, [workspaceScanner], { cwd: workspaceRoot });

  assert.deepEqual(workspace, root);
  assert.match(root.stdout, /^OK \d+ files scanned; no secrets found\n$/);
});

test("both scanner entrypoints include tracked package-lock files with redacted findings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "apple-proxy-profiles-scope-"));
  const credential = ["runtime", "constructed", "package", "credential"].join("_");
  const proxyUri = `${"anytls"}${"://"}${credential}@example.invalid:443`;
  await execFileAsync("git", ["init", "-q"], { cwd: directory });
  await writeFile(join(directory, "package-lock.json"), `${JSON.stringify({ resolved: proxyUri })}\n`, "utf8");
  await execFileAsync("git", ["add", "package-lock.json"], { cwd: directory });

  async function runFailingScanner(script) {
    try {
      await execFileAsync(process.execPath, [script], { cwd: directory });
    } catch (error) {
      assert.equal(error.code, 1);
      return { stdout: error.stdout, stderr: error.stderr };
    }
    assert.fail("scanner unexpectedly accepted package-lock credential");
  }

  try {
    const root = await runFailingScanner(rootScanner);
    const workspace = await runFailingScanner(workspaceScanner);
    assert.deepEqual(workspace, root);
    assert.equal(root.stdout, "");
    assert.equal(root.stderr, [
      "SECRET package-lock.json proxy-uri",
      "",
    ].join("\n"));
    assert.equal(JSON.stringify(root).includes(credential), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("secret scanning does not trust broad prose markers", () => {
  const realPassword = ["runtime", "constructed", "credential", "value"].join("_");
  assert.equal(containsSecret(`test fake fixture password: ${realPassword}`), true);
});

test("generator code that reads credential fields is not mistaken for a credential", () => {
  assert.equal(containsSecret('const outbound = { password: requiredString(node, "password") };'), false);
  assert.equal(containsSecret('const outbound = { uuid: requiredString(node, "uuid") };'), false);
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

test("INCY public metadata stays secret-free while private configs remain private", async () => {
  const nodes = fixtureNodes();
  const options = parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "macos",
  });
  const policyResolution = resolveUnifiedPolicy({
    policy: parsePrivatePolicy(JSON.stringify(fixturePolicy())),
    channel: "current",
    client: CLIENT.incy,
    allNodes: nodes,
    eligibleNodes: nodes,
  });
  const configs = renderIncySubscription({ nodes, options, policyResolution });
  const routingProfile = renderIncyRoutingProfile({
    baseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    generatedAt: "2026-09-02T00:00:00Z",
  });
  const manifest = await readFile(new URL("../public/current/incy/client-manifest.json", import.meta.url), "utf8");
  const routing = await readFile(new URL("../public/current/incy/routing.json", import.meta.url), "utf8");

  for (const [label, text] of [
    ["meta", JSON.stringify(configs[0].meta)],
    ["routing-profile", JSON.stringify(routingProfile)],
    ["client-manifest", manifest],
    ["routing-json", routing],
  ]) {
    assert.equal(scanText(label, text).length, 0, label);
  }
  assert.equal(JSON.stringify(configs[0]).includes("TEST_ONLY_INCY_AI_PASSWORD"), true);
  assert.equal(JSON.stringify(configs[0].meta).includes("TEST_ONLY_"), false);
  assert.equal(JSON.stringify(routingProfile).includes("TEST_ONLY_"), false);
  assert.equal(manifest.includes("TEST_ONLY_"), false);
  assert.equal(routing.includes("TEST_ONLY_"), false);
});

test("subscription paths reject only credential-bearing path segments", () => {
  const token = ["aB3dE5gH7jK9mN1pR3sT5vX7zY9", "_-Abc"].join("");
  const link = ["li", "nk"].join("");
  const subscription = ["su", "b"].join("");
  const subscribe = ["sub", "scribe"].join("");

  assert.equal(containsSecret(`https://example.com/${link}/${token}`), true);
  assert.equal(containsSecret(`https://example.com/${subscription}/${token}`), true);
  assert.equal(containsSecret(`https://example.com/${subscribe}/${token}`), true);
  assert.equal(containsSecret("https://juan-nikola.github.io/apple-proxy-profiles/current/rules/x.arrs"), false);
  assert.equal(containsSecret(`https://juan-nikola.github.io/apple-proxy-profiles/current/${token}`), false);
  assert.equal(containsSecret(`https://example.com/public/${token}`), false);
});

test("auth-like credential keys detect base64 and base64url values", () => {
  const base64url = ["aB3dE5gH7jK9mN1pR3sT5vX7zY9", "_-Abc"].join("");
  const base64 = ["QWxhZGRpbjpvcGVuIHNlc2FtZQ", "MTIz", "+/="].join("");
  const authorization = ["author", "ization"].join("");
  const bearer = ["Bea", "rer"].join("");
  const authToken = ["auth", "_token"].join("");
  const accessToken = ["access", "_token"].join("");

  assert.equal(containsSecret(`${authorization}: ${base64url}`), true);
  assert.equal(containsSecret(`${authorization}: ${bearer} ${base64}`), true);
  assert.equal(containsSecret(`${authToken}: ${base64url}`), true);
  assert.equal(containsSecret(`${accessToken}: ${base64url}`), true);
  assert.equal(containsSecret(`${authorization}: TEST_ONLY_AUTH_TOKEN`), false);
});

test("credential patterns do not cross line boundaries", () => {
  assert.equal(containsSecret("token\n================================"), false);
});
