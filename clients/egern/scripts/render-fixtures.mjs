import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { operator } from "../src/substore-profile-entry.js";
import { validateEgernProfile } from "../src/validate-profile.js";

const root = resolve(import.meta.dirname, "..");
const privateNodeUrl = "https://example.invalid/private/egern-nodes";
const publicRuleUrl = "https://juan-nikola.github.io/apple-proxy-profiles/current/egern/rules/DomesticCore.yaml";
const platforms = Object.freeze([
  Object.freeze(["macos", false]),
  Object.freeze(["iphone", true]),
  Object.freeze(["ipad", true]),
]);
const rawNodes = Object.freeze([
  Object.freeze({
    name: "Tokyo Entry",
    type: "ss",
    server: "198.51.100.10",
    port: 443,
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_FIXTURE_TOKYO_PASSWORD",
    udp: true,
    _subName: "[自建] Tokyo",
  }),
  Object.freeze({
    name: "Berlin Airport",
    type: "ss",
    server: "198.51.100.20",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_FIXTURE_BERLIN_PASSWORD",
    _subName: "[机场] Berlin",
  }),
  Object.freeze({
    name: "Los Angeles Realm",
    type: "hysteria2",
    server: "192.0.2.30",
    port: 443,
    password: "TEST_ONLY_FIXTURE_REALM_PASSWORD",
    sni: "fixture-realm.example.invalid",
    _subName: "[Realm] Los Angeles",
  }),
  Object.freeze({
    name: "Singapore SSH Landing",
    type: "ssh",
    server: "192.0.2.40",
    port: 22,
    username: "TEST_ONLY_FIXTURE_SSH_USER",
    password: "TEST_ONLY_FIXTURE_SSH_PASSWORD",
    _subName: "[落地] Singapore",
  }),
]);
const EMPTY_POLICY = Object.freeze({
  $content: JSON.stringify({ schemaVersion: 2, targets: {} }),
});

function independentlyParse(profile) {
  const result = spawnSync(
    "ruby",
    ["-e", "require %q(yaml); value=YAML.safe_load(STDIN.read, aliases: false); abort unless value.is_a?(Hash)"],
    { input: profile, encoding: "utf8" },
  );
  if (result.error?.code === "ENOENT") return;
  if (result.status !== 0) throw new Error("Ruby/Psych rejected an Egern fixture");
}

for (const [platform, expectedIpv6] of platforms) {
  const result = await operator({}, "Egern", {
    arguments: {
      output: "config",
      type: "collection",
      name: "egern-sources",
      nodeSubscriptionUrl: privateNodeUrl,
      platform,
      channel: "current",
      adblockMode: "off",
    },
    async produceArtifact(request) {
      return request.type === "file" ? EMPTY_POLICY : structuredClone(rawNodes);
    },
  });
  const profile = result.$content;
  const validation = validateEgernProfile(profile);
  if (!validation.valid) throw new Error("Generated Egern fixture failed validation");
  independentlyParse(profile);
  if (
    !new RegExp(`^ipv6: ${expectedIpv6}$`, "mu").test(profile)
    || !profile.includes(publicRuleUrl)
    || profile.includes("Advertising.yaml")
    || profile.includes("ChinaMax_Domain.yaml")
    || !profile.includes("policy_groups:\n")
    || !profile.includes("rules:\n")
    || /^proxies:/mu.test(profile)
    || rawNodes.some((node) => [node.name, node.server, node.password, node.username]
      .some((value) => value !== undefined && profile.includes(value)))
  ) throw new Error("Generated Egern fixture violated its public structure");

  const destination = resolve(root, `examples/egern-${platform}.yaml`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, profile, "utf8");
}
