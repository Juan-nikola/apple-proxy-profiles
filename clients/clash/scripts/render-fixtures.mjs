import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { allCompatibleNodes } from "../../egern/test/fixtures/nodes.js";
import { renderClashProfile } from "../src/render-profile.js";

const baseOptions = { output: "config", type: "collection", name: "clash-fixture", nodeSubscriptionUrl: "https://example.invalid/clash-nodes?key=TEST_ONLY_FIXTURE", channel: "edge" };
await mkdir(resolve(import.meta.dirname, "../examples"), { recursive: true });
for (const platform of ["macos", "iphone", "ipad", "appletv"]) {
  const destination = resolve(import.meta.dirname, `../examples/clash-${platform}.yaml`);
  await writeFile(destination, renderClashProfile({ ...baseOptions, platform }, allCompatibleNodes), "utf8");
}
