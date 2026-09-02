import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseIncyOptions } from "../src/options.js";
import { renderIncyInbounds } from "../src/render-platform.js";

const root = resolve(import.meta.dirname, "..");
const examples = [
  ["incy-config-iphone.json", "iphone"],
  ["incy-config-ipad.json", "ipad"],
];

await mkdir(resolve(root, "examples"), { recursive: true });
for (const [filename, platform] of examples) {
  const options = parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform,
  });
  const config = {
    platform,
    options,
    inbounds: renderIncyInbounds(platform),
  };
  await writeFile(resolve(root, "examples", filename), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
