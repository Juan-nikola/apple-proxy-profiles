import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseHappOptions } from "../src/options.js";
import { renderHappSubscription } from "../src/render-subscription.js";
import { validateHappSubscription } from "../src/validate-subscription.js";
import { buildHappAudit } from "../src/audit.js";

const root = resolve(import.meta.dirname, "..");
const nodes = [
  { name: "🌐 Fixture Tokyo · VLESS", type: "vless", server: "192.0.2.10", port: 443, uuid: "TEST_ONLY_FIXTURE_UUID", tls: true, sni: "fixture.example.invalid" },
  { name: "🌐 Fixture Los Angeles · SS", type: "ss", server: "192.0.2.11", port: 8388, cipher: "aes-256-gcm", password: "TEST_ONLY_FIXTURE_PASSWORD" },
];
const options = parseHappOptions({ output: "config", type: "collection", name: "happ-fixture", subscriptionName: "happ-fixture", platform: "macos" });
const configs = renderHappSubscription({ options, nodes });
if (!validateHappSubscription(configs)) throw new Error("HAPP fixture subscription failed validation");
const audit = buildHappAudit({ options: { ...options, output: "audit", platform: "all" }, eligibleNodes: nodes, policyResolution: { targets: {}, warnings: [] } });
await mkdir(resolve(root, "examples"), { recursive: true });
await writeFile(resolve(root, "examples/happ-config.json"), `${JSON.stringify(configs, null, 2)}\n`, "utf8");
await writeFile(resolve(root, "examples/happ-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
