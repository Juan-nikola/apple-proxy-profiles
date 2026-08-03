import { createHash } from "node:crypto";

import { RULE_SOURCE_CATALOG } from "../../shared/rules/catalog.js";

export const BLACKMATRIX7_BASELINE = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  owner: "blackmatrix7",
  name: "ios_rule_script",
  branch: "master",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

const DOMAIN_SET_DIRECTORIES = Object.freeze({
  Advertising_Domain: "Advertising",
  ChinaMax_Domain: "ChinaMax",
});

const REJECT_IDS = new Set(["Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain"]);
const DIRECT_IDS = new Set([
  "Privacy", "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "Apple", "Microsoft",
  "SteamCN", "ChinaMax_Domain", "Download", "PrivateTracker", "ChinaMax",
]);

function publishRecord(source, index) {
  const directory = DOMAIN_SET_DIRECTORIES[source.id] ?? source.id;
  const familyId = source.id === "Advertising_Domain" ? "Advertising" : source.id;
  const componentId = source.id.endsWith("_Domain") ? "domains" : "rules";
  const routing = REJECT_IDS.has(source.id) ? 2 : DIRECT_IDS.has(source.id) ? 1 : 0;
  return Object.freeze({
    id: source.id,
    familyId,
    componentId,
    order: index + 1,
    priority: (index + 1) * 10,
    canonicalPath: `rule/Surge/${directory}/${source.id}.list`,
    inputFormat: source.inputFormat,
    policy: source.policy,
    routing,
    intendedTarget: routing === 2 ? "reject" : routing === 1 ? "direct" : source.policy,
    minEntries: source.minEntries,
  });
}

export const PUBLISH_SOURCE_CATALOG = Object.freeze(RULE_SOURCE_CATALOG.map(publishRecord));

export const LOGICAL_RULE_SETS = Object.freeze(
  [...new Set(PUBLISH_SOURCE_CATALOG.map(({ familyId }) => familyId))].map((familyId) => Object.freeze({
    id: familyId,
    sourceIds: Object.freeze(PUBLISH_SOURCE_CATALOG
      .filter((source) => source.familyId === familyId)
      .map(({ id }) => id)),
    required: true,
  })),
);

export function canonicalCatalogJson(catalog = PUBLISH_SOURCE_CATALOG) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function catalogSha256(catalog = PUBLISH_SOURCE_CATALOG) {
  return createHash("sha256").update(canonicalCatalogJson(catalog)).digest("hex");
}

export function pinnedRawUrl(source, commit = BLACKMATRIX7_BASELINE.commit) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new TypeError("Blackmatrix7 commit must be a full SHA");
  if (!source || typeof source.canonicalPath !== "string") throw new TypeError("Source path is required");
  return `https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/${commit}/${source.canonicalPath}`;
}
