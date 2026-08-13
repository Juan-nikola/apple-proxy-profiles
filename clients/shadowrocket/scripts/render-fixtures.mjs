import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { renderProfile } from "../src/render-profile.js";
import { validateProfile } from "../src/validate-profile.js";

const root = resolve(import.meta.dirname, "..");
const platforms = Object.freeze(["macos", "iphone", "ipad"]);
const fixtureFlags = Object.freeze({
  asiaPacific: "🇯🇵",
  europe: "🇩🇪",
  americas: "🇺🇸",
});
const inventory = Object.freeze(Array.from({ length: 25 }, (_, index) => Object.freeze({
  name: `Synthetic ${String(index + 1).padStart(2, "0")}`,
  _profile: Object.freeze({
    continent: ["asiaPacific", "americas", "europe"][index % 3],
    flag: fixtureFlags[["asiaPacific", "americas", "europe"][index % 3]],
    sourceKind: index % 4 === 0 ? "selfHosted" : "airport",
    udp: index % 2 === 0,
    p2p: index % 5 === 0,
    entry: index % 6 !== 0,
    chained: false,
  }),
})));

for (const platform of platforms) {
  const profile = renderProfile({
    output: "config",
    type: "collection",
    name: "shadowrocket-sources",
    subscriptionName: "Shadowrocket-Nodes",
    platform,
  }, inventory);
  const validation = validateProfile(profile);
  if (!validation.valid) {
    throw new Error(`Fixture validation failed for ${platform}: ${validation.errors.join("; ")}`);
  }
  const destination = resolve(root, `examples/shadowrocket-${platform}.conf`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, profile, "utf8");
}
