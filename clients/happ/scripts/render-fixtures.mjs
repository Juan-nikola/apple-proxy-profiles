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
await mkdir(resolve(root, "examples"), { recursive: true });
const platforms = ["macos", "iphone", "ipad", "android", "windows", "linux"];
for (const platform of platforms) {
  const options = parseHappOptions({ output: "config", type: "collection", name: "happ-fixture", subscriptionName: "happ-fixture", platform });
  const configs = renderHappSubscription({ options, nodes });
  if (!validateHappSubscription(configs)) throw new Error(`HAPP ${platform} fixture subscription failed validation`);
  await writeFile(resolve(root, `examples/happ-config-${platform}.json`), `${JSON.stringify(configs, null, 2)}\n`, "utf8");
  if (platform === "macos") await writeFile(resolve(root, "examples/happ-config.json"), `${JSON.stringify(configs, null, 2)}\n`, "utf8");
}
const auditOptions = parseHappOptions({ output: "audit", type: "collection", name: "happ-fixture", subscriptionName: "happ-fixture", platform: "all" });
const audit = buildHappAudit({ options: auditOptions, eligibleNodes: nodes, policyResolution: { targets: {}, warnings: [] } });
await writeFile(resolve(root, "examples/happ-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
