import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseV2rayNOptions } from "../src/options.js";
import { renderV2rayNProfile } from "../src/render-profile.js";
import { renderV2rayNSubscription } from "../src/render-node.js";
const root = resolve(import.meta.dirname, ".."); const nodes = [{ name: "Fixture Windows", type: "vless", server: "192.0.2.10", port: 443, uuid: "TEST_ONLY_UUID", tls: true }];
await mkdir(resolve(root, "examples"), { recursive: true });
for (const [platform, filename] of [["windows", "v2rayn-profile-windows.json"], ["macos", "v2rayn-profile-macos.json"]]) {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "v2rayn-fixture", platform });
  await writeFile(resolve(root, "examples", filename), `${JSON.stringify(renderV2rayNProfile({ nodes, options }), null, 2)}\n`);
}
await writeFile(resolve(root, "examples/v2rayn-nodes.json"), renderV2rayNSubscription({ nodes }));
