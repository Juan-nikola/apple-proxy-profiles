const SHA1_COMMIT = /^[0-9a-f]{40}$/u;
const REGIONS = new Set(["cn", "global", "ru", "ir"]);
const SAFE_PATH = /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;

function source(record) {
  return Object.freeze({ ...record });
}

/** Pinned, public inputs consumed by the external rule adapters. */
export const EXTERNAL_RULE_SOURCE_CATALOG = Object.freeze([
  source({
    id: "v2fly-domain-list",
    repository: "https://github.com/v2fly/domain-list-community",
    branch: "master",
    commit: "c975ccef9c19f005a3bfa7a33255d1b406deea64",
    license: "MIT",
    format: "domain-list-yaml",
    region: "global",
    adapter: "v2fly-domain-list",
    minEntries: 1,
    sourcePath: "data/geosite.dat",
  }),
  source({
    id: "loyalsoldier-rules-dat",
    repository: "https://github.com/Loyalsoldier/v2ray-rules-dat",
    branch: "release",
    commit: "5c20d2eb5a65b171816949010ede67a27326cbe6",
    license: "MIT",
    format: "geosite-geoip-dat",
    region: "global",
    adapter: "loyalsoldier-rules-dat",
    minEntries: 1,
    sourcePath: "geoip.dat",
  }),
  source({
    id: "russia-v2ray-rules",
    repository: "https://github.com/runetfreedom/russia-v2ray-rules-dat",
    branch: "master",
    commit: "f175e3f94891dbc1bb88edfc2d9d85f5a9051a23",
    license: "MIT",
    format: "geosite-geoip-dat",
    region: "ru",
    adapter: "russia-v2ray-rules",
    minEntries: 1,
    sourcePath: "geosite.dat",
  }),
  source({
    id: "iran-v2ray-rules",
    repository: "https://github.com/Chocolate4U/Iran-v2ray-rules",
    branch: "master",
    commit: "676695ea3b4c95d5cf48a7c4e2e718bac5b8a099",
    license: "MIT",
    format: "domain-list-text",
    region: "ir",
    adapter: "iran-v2ray-rules",
    minEntries: 1,
    sourcePath: "iran.dat",
  }),
]);

export function validateExternalSourceCatalog(catalog = EXTERNAL_RULE_SOURCE_CATALOG) {
  const ids = new Set();
  for (const record of catalog) {
    if (!record || typeof record !== "object") throw new TypeError("External source must be an object");
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(record.id) || ids.has(record.id)) {
      throw new TypeError(`Duplicate or unsafe external source ID: ${record.id}`);
    }
    ids.add(record.id);
    if (!SHA1_COMMIT.test(record.commit)) throw new TypeError(`External source ${record.id} is not pinned to a full commit`);
    if (typeof record.license !== "string" || record.license.trim() === "") throw new TypeError(`External source ${record.id} has no license`);
    if (!REGIONS.has(record.region)) throw new TypeError(`External source ${record.id} has invalid region`);
    if (typeof record.format !== "string" || record.format.trim() === "") throw new TypeError(`External source ${record.id} has no format`);
    if (typeof record.adapter !== "string" || record.adapter.trim() === "") throw new TypeError(`External source ${record.id} has no adapter`);
    if (!Number.isInteger(record.minEntries) || record.minEntries < 1) throw new TypeError(`External source ${record.id} has invalid minEntries`);
    if (record.sourcePath !== undefined
      && (!SAFE_PATH.test(record.sourcePath) || record.sourcePath.split("/").some((segment) => segment === "." || segment === ".."))) {
      throw new TypeError(`External source ${record.id} has unsafe source path`);
    }
  }
  return true;
}

validateExternalSourceCatalog();
