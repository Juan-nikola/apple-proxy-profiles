import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { parseSingBoxOptions } from "../src/options.js";
import { renderSingBoxConfig } from "../src/render-config.js";
import { validateSingBoxConfig } from "../src/validate-config.js";

const root = resolve(import.meta.dirname, "..");
const ruleBaseUrl = "https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/rules";
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

for (const platform of ["macos", "iphone", "ipad", "android", "openwrt"]) {
  const options = parseSingBoxOptions({
    output: "config",
    type: "collection",
    name: "sing-box-fixture",
    subscriptionName: "sing-box-Fixture",
    platform,
    channel: "current",
    ipv6Mode: platform === "macos" ? "ipv4-only" : "auto",
  });
  const config = renderSingBoxConfig(options, nodes, { ruleBaseUrl, ruleSetFormat: "source" });
  const validation = validateSingBoxConfig(config);
  if (!validation.valid) throw new Error(`sing-box fixture failed validation for ${platform}: ${validation.errors.join("; ")}`);
  const destination = resolve(root, `examples/sing-box-${platform}.json`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
