const SHA1_COMMIT = /^[0-9a-f]{40}$/u;
const REGIONS = new Set(["cn", "global", "ru", "ir"]);
const SAFE_PATH = /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

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
    sourcePath: "dlc.dat_plain.yml",
    releaseTag: "20260819144818",
    retrievalUrl: "https://github.com/v2fly/domain-list-community/releases/download/20260819144818/dlc.dat_plain.yml",
    retrievedAt: "2026-08-22T00:00:00Z",
    sha256: "d74dc15311117fe983180bf3245e083633d14bb148ea5cd9db79b1d15a8533c2",
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
    sourcePath: "geosite.dat",
    releaseTag: "202608212217",
    retrievalUrl: "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/download/202608212217/geosite.dat",
    retrievedAt: "2026-08-22T00:00:00Z",
    sha256: "b392a98a323777deab59d8208e856df09cf96f3a76d2869eb7a8e5289bc5d9f4",
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
    releaseTag: "202608221547",
    retrievalUrl: "https://github.com/runetfreedom/russia-v2ray-rules-dat/releases/download/202608221547/geosite.dat",
    retrievedAt: "2026-08-22T00:00:00Z",
    sha256: "76fdbe01687a6cc7683b50c38ceea84941458e8371d215918daf555665a537cd",
  }),
  source({
    id: "iran-v2ray-rules",
    repository: "https://github.com/Chocolate4U/Iran-v2ray-rules",
    branch: "master",
    commit: "676695ea3b4c95d5cf48a7c4e2e718bac5b8a099",
    license: "MIT",
    format: "geosite-geoip-dat",
    region: "ir",
    adapter: "iran-v2ray-rules",
    minEntries: 1,
    sourcePath: "geosite.dat",
    releaseTag: "202608311106",
    retrievalUrl: "https://github.com/Chocolate4U/Iran-v2ray-rules/releases/download/202608311106/geosite.dat",
    retrievedAt: "2026-08-31T11:08:56Z",
    sha256: "994a6f6b725cfecfaa2c95593ae51cec2d4fafe5614f0797044020ce05bb0184",
  }),
  source({
    id: "loyalsoldier-clash-direct",
    repository: "https://github.com/Loyalsoldier/clash-rules",
    branch: "release",
    commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
    tree: "48f825328014eef805065de40be0a25bec604075",
    blob: "99e83b33316491bb4a312ffa6d2d96c321b7bc53",
    license: "GPL-3.0",
    format: "clash-rules-yaml",
    region: "global",
    adapter: "clash-rules-yaml",
    minEntries: 1,
    sourcePath: "direct.txt",
    releaseTag: "202608252255",
    retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/direct.txt",
    retrievedAt: "2026-08-26T00:00:00Z",
    sha256: "555003affe662bc61f668aaa4efba5ede7b43921efc0331faeda33dc8d0852cf",
  }),
  source({
    id: "loyalsoldier-clash-reject",
    repository: "https://github.com/Loyalsoldier/clash-rules",
    branch: "release",
    commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
    tree: "48f825328014eef805065de40be0a25bec604075",
    blob: "e2b569d2c601a0a48c1c3ea7c3d4cfc0d41a0e4b",
    license: "GPL-3.0",
    format: "clash-rules-yaml",
    region: "global",
    adapter: "clash-rules-yaml",
    minEntries: 1,
    sourcePath: "reject.txt",
    releaseTag: "202608252255",
    retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/reject.txt",
    retrievedAt: "2026-08-26T00:00:00Z",
    sha256: "106bc6dfae726634b21bd9112da80f679419b71009af8e6a376915404f6992a5",
  }),
  source({
    id: "loyalsoldier-clash-applications",
    repository: "https://github.com/Loyalsoldier/clash-rules",
    branch: "release",
    commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
    tree: "48f825328014eef805065de40be0a25bec604075",
    blob: "e409d8e43c33c3b82ca033825a6d6026ac8a9e6e",
    license: "GPL-3.0",
    format: "clash-rules-yaml",
    region: "global",
    adapter: "clash-rules-yaml",
    minEntries: 1,
    sourcePath: "applications.txt",
    releaseTag: "202608252255",
    retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/applications.txt",
    retrievedAt: "2026-08-26T00:00:00Z",
    sha256: "33bc8f07bacf74082fcb5f361eded1f6f9d3abcedcbe37ada2eb2ab4ae031732",
  }),
  source({
    id: "loyalsoldier-clash-google",
    repository: "https://github.com/Loyalsoldier/clash-rules",
    branch: "release",
    commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95",
    tree: "48f825328014eef805065de40be0a25bec604075",
    blob: "9766421c32efb5ff9442d9998c8b0dc561ab7b04",
    license: "GPL-3.0",
    format: "clash-rules-yaml",
    region: "global",
    adapter: "clash-rules-yaml",
    auditOnly: true,
    minEntries: 1,
    sourcePath: "google.txt",
    releaseTag: "202608252255",
    retrievalUrl: "https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/google.txt",
    retrievedAt: "2026-08-26T00:00:00Z",
    sha256: "21a04f287800943b3fdfdef1f843173086171d9a0b5c9c33c3f73e1ec77d4c9e",
  }),
  ...[
    ["private", "62c87f8501cb221de661dba97a17d3eaba4c9592", "3a04b128200ef8097d73b1496cbb23d24bc1e05d42fffb09f07c51699efb00b2"],
    ["apple", "3fbaf85c498ce62ec854a370b1919aeb7a6f4cbb", "70f9f77e0022fc1e79d597d2fca5a3bbfa8bfe0f7542694b455f8a70004f5ba3"],
    ["icloud", "0c0de8fb5b244eb4a24bee6452e255576ec8ab75", "f1fb7e9d17400071bf77d853b2a3148ccb6a13d785cb97e73f1693142682b23f"],
    ["gfw", "7d3951772d1c25862c4ddc76b999dc571f8c84cc", "841c83b1536777b9088bf879d9ea3516a7a70ea63a4066eeafa5ba2cdf601cbc"],
    ["tld-not-cn", "f3d8313d7d645c9044eefbce1cefecc32b12e90e", "330816293887779168d577a95f606c33702322654249e4c00051a3827830e310"],
    ["telegramcidr", "b3d48b7dc56c78089d701a44a86d5ab058a13403", "328fca88c675763111c7f7585ec504e5c21ab9afb7a8ce6df33b7ac01b8a3ee0"],
    ["lancidr", "43b23b5a34c37cdf3f69f714bd86f1fc6ac59e01", "82920b241dc328f1dc99849cf733ed8675a00a4ee0bdf64c892b332dfb7e1e2e"],
    ["cncidr", "1c2af0f2b98d4613b21e321558254e7ba44fdd54", "019b753c347b7b06ae8a9f9f74f2443d6b35bc9e4d6db70c134306503621b2d1"],
  ].map(([name, blob, sha256]) => source({
    id: `loyalsoldier-clash-${name}`, repository: "https://github.com/Loyalsoldier/clash-rules", branch: "release",
    commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95", tree: "48f825328014eef805065de40be0a25bec604075", blob, license: "GPL-3.0", format: "clash-rules-yaml", region: "global", adapter: "clash-rules-yaml", minEntries: 1, sourcePath: `${name}.txt`, releaseTag: "202608252255", retrievalUrl: `https://github.com/Loyalsoldier/clash-rules/releases/download/202608252255/${name}.txt`, retrievedAt: "2026-08-26T00:00:00Z", sha256,
  })),
]);

export function validateExternalSourceCatalog(catalog = EXTERNAL_RULE_SOURCE_CATALOG) {
  if (!Array.isArray(catalog) || catalog.length === 0) throw new TypeError("External source catalog must not be empty");
  const ids = new Set();
  for (const record of catalog) {
    if (!record || typeof record !== "object") throw new TypeError("External source must be an object");
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(record.id) || ids.has(record.id)) {
      throw new TypeError(`Duplicate or unsafe external source ID: ${record.id}`);
    }
    ids.add(record.id);
    if (!SHA1_COMMIT.test(record.commit)) throw new TypeError(`External source ${record.id} is not pinned to a full commit`);
    if (typeof record.repository !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(record.repository)) throw new TypeError(`External source ${record.id} has invalid repository`);
    if (typeof record.branch !== "string" || record.branch.trim() === "") throw new TypeError(`External source ${record.id} has no branch metadata`);
    if (typeof record.retrievalUrl !== "string" || !record.retrievalUrl.startsWith("https://")) throw new TypeError(`External source ${record.id} has no retrieval URL`);
    if (typeof record.releaseTag !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(record.releaseTag)) throw new TypeError(`External source ${record.id} has invalid release tag`);
    if (typeof record.sourcePath !== "string"
      || record.sourcePath.length === 0
      || !SAFE_PATH.test(record.sourcePath)
      || record.sourcePath.split("/").some((segment) => segment === "." || segment === "..")) {
      throw new TypeError(`External source ${record.id} has unsafe source path`);
    }
    const expectedUrl = `${record.repository}/releases/download/${record.releaseTag}/${record.sourcePath}`;
    if (record.retrievalUrl !== expectedUrl) throw new TypeError(`External source ${record.id} has mismatched release asset URL`);
    if (typeof record.retrievedAt !== "string" || Number.isNaN(Date.parse(record.retrievedAt))) throw new TypeError(`External source ${record.id} has invalid retrieval timestamp`);
    if (typeof record.sha256 !== "string" || !SHA256.test(record.sha256)) throw new TypeError(`External source ${record.id} has invalid SHA-256`);
    if (typeof record.license !== "string" || record.license.trim() === "") throw new TypeError(`External source ${record.id} has no license`);
    if (!REGIONS.has(record.region)) throw new TypeError(`External source ${record.id} has invalid region`);
    if (typeof record.format !== "string" || record.format.trim() === "") throw new TypeError(`External source ${record.id} has no format`);
    if (typeof record.adapter !== "string" || record.adapter.trim() === "") throw new TypeError(`External source ${record.id} has no adapter`);
    if (!Number.isInteger(record.minEntries) || record.minEntries < 1) throw new TypeError(`External source ${record.id} has invalid minEntries`);
    if (record.tree !== undefined && !SHA1_COMMIT.test(record.tree)) throw new TypeError(`External source ${record.id} has invalid tree hash`);
    if (record.blob !== undefined && !SHA1_COMMIT.test(record.blob)) throw new TypeError(`External source ${record.id} has invalid blob hash`);
    if (record.auditOnly !== undefined && typeof record.auditOnly !== "boolean") throw new TypeError(`External source ${record.id} has invalid auditOnly flag`);
  }
  return true;
}

validateExternalSourceCatalog();
