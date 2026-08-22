import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseV2BoxOptions } from "../src/options.js";
import { renderV2BoxProfile } from "../src/render-profile.js";
import { renderV2BoxSubscription } from "../src/render-node.js";
const root = resolve(import.meta.dirname, ".."); const nodes = [{ name: "Fixture iPhone", type: "vless", server: "192.0.2.10", port: 443, uuid: "TEST_ONLY_UUID", tls: true }];
const options = parseV2BoxOptions({ output: "config", type: "collection", name: "v2box-fixture", platform: "iphone" }); await mkdir(resolve(root, "examples"), { recursive: true });
await writeFile(resolve(root, "examples/v2box-profile-iphone.json"), `${JSON.stringify(renderV2BoxProfile({ nodes, options }), null, 2)}\n`); await writeFile(resolve(root, "examples/v2box-nodes.json"), renderV2BoxSubscription({ nodes }));
