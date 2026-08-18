import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseOneXrayOptions } from "../src/options.js";
import { renderOneXrayProfile } from "../src/render-profile.js";
import { renderOneXraySubscription } from "../src/render-subscription.js";
import { validateOneXrayProfile } from "../src/validate-profile.js";

const root = resolve(import.meta.dirname, "..");
const nodes = [
  { name: "🇯🇵 Fixture Tokyo", type: "vless", server: "192.0.2.10", port: 443, uuid: "TEST_ONLY_FIXTURE_UUID", tls: true, sni: "fixture.example.invalid" },
  { name: "🇺🇸 Fixture Los Angeles", type: "ss", server: "192.0.2.11", port: 8388, cipher: "aes-256-gcm", password: "TEST_ONLY_FIXTURE_PASSWORD" },
];
const options = parseOneXrayOptions({ output: "profile", type: "collection", name: "onexray-fixture" });
await mkdir(resolve(root, "examples"), { recursive: true });
const profile = renderOneXrayProfile({ options, nodes });
if (!validateOneXrayProfile(profile).valid) throw new Error("OneXray fixture profile failed validation");
await writeFile(resolve(root, "examples/onexray-profile.json"), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
await writeFile(resolve(root, "examples/onexray-nodes.json"), renderOneXraySubscription({ nodes }), "utf8");
