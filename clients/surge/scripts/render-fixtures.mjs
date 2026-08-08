import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { parseSurgeOptions } from "../src/options.js";
import { renderSurgeProfile } from "../src/render-profile.js";
import { validateSurgeProfile } from "../src/validate-profile.js";

const root = resolve(import.meta.dirname, "..");
const ruleBaseUrl = "https://juan-nikola.github.io/apple-proxy-profiles/current/surge/rules";
const nodes = Object.freeze([
  Object.freeze({
    name: "示例 · Tokyo",
    type: "ss",
    server: "example.invalid",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_FIXTURE_PASSWORD",
    udp: true,
    _profile: Object.freeze({ id: "fixture-tokyo", sourceKind: "airport", continent: "asiaPacific", entry: true, chained: false }),
  }),
  Object.freeze({
    name: "示例 · Frankfurt",
    type: "vmess",
    server: "fixture-vmess.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    security: "auto",
    tls: true,
    sni: "fixture-vmess.example.invalid",
    _profile: Object.freeze({ id: "fixture-frankfurt", sourceKind: "airport", continent: "europe", entry: true, chained: false }),
  }),
]);

for (const platform of ["macos", "iphone", "ipad"]) {
  const options = parseSurgeOptions({
    output: "config",
    type: "collection",
    name: "surge-fixture",
    subscriptionName: "Surge-Fixture",
    platform,
    ipv6Mode: platform === "macos" ? "ipv4-only" : "auto",
    proxyPolicyUrl: "https://example.invalid/surge-nodes",
  });
  const profile = renderSurgeProfile(options, nodes, { ruleBaseUrl });
  const validation = validateSurgeProfile(profile);
  if (!validation.valid) throw new Error(`Surge fixture failed validation for ${platform}: ${validation.errors.join("; ")}`);
  const destination = resolve(root, `examples/surge-${platform}.conf`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, profile, "utf8");
}
