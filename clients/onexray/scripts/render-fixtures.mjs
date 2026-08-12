import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// These files deliberately describe contracts rather than output that can be
// imported. They contain no node address, credential, deep link, subscription
// URL, policy target, or Profile payload. Runtime fixtures belong in tests and
// use TEST_ONLY values only there.
const fixtures = Object.freeze({
  "onexray-nodes-contract.json": {
    schema: "onexray-nodes-contract-v1",
    client: "OneXray",
    output: "nodes",
    redacted: true,
    schemaFields: ["outbounds", "name", "protocol", "settings", "streamSettings", "mux", "tag"],
    contract: {
      outbounds: "<redacted array of typed outbounds>",
      supportedProtocols: ["vless", "vmess", "shadowsocks", "trojan", "socks", "http", "hysteria"],
      address: "<synthetic non-routable fixture omitted>",
      credentialFields: "<redacted>",
      tagPolicy: "<redacted display or fixed tag>",
    },
    notes: [
      "This is a shape contract, not an importable node source.",
      "Synthetic non-routable addresses are used only in tests.",
    ],
  },
  "onexray-profile-contract.json": {
    schema: "onexray-profile-contract-v1",
    client: "OneXray",
    output: "profile",
    redacted: true,
    schemaFields: ["name", "log", "dns", "routing", "inbounds", "outbounds"],
    profile: {
      name: "<redacted channel display name>",
      log: "<native log settings>",
      dns: "<tagged China/global DNS servers and rules>",
      routing: "<ordered IPIfNonMatch routing rules>",
      inbounds: "<runtime-owned TUN and ping inbounds>",
      outbounds: "<redacted fixed outbounds plus direct/block/dnsOut>",
    },
    constraints: {
      import: "<deep link omitted>",
      credentials: "<redacted>",
      privateSource: "<omitted>",
      geoData: "<public channel assets referenced outside this contract>",
    },
  },
  "onexray-routing-audit.json": {
    schema: "onexray-routing-audit-v1",
    client: "OneXray",
    output: "audit",
    redacted: true,
    schemaFields: ["nodes", "exclusionReasons", "policy", "runtime", "profile"],
    audit: {
      nodes: "<count-only summary>",
      exclusionReasons: "<allowlisted reason counts>",
      policy: "<business target status without target names>",
      runtime: "<DNS, IPv6, QUIC, and block mode summary>",
      profile: "<hash, release, GeoData hash presence, and deep-link budget>",
    },
    prohibited: [
      "raw node objects",
      "sensitive authentication material",
      "private remote source URLs",
      "encoded policy data",
      "Profile JSON or deep links",
    ],
  },
});

export async function renderFixtures() {
  await mkdir(resolve(root, "examples"), { recursive: true });
  for (const [name, fixture] of Object.entries(fixtures)) {
    await writeFile(resolve(root, "examples", name), `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  await renderFixtures();
}
