import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { buildSite, snapshotMatches } from "../automation/src/build-site.js";
import { fetchSnapshot } from "../automation/src/fetch-snapshot.js";
import { resolveUpstreamCommit } from "../automation/src/resolve-upstream.js";
import { BLACKMATRIX7_BASELINE, PUBLISH_SOURCE_CATALOG } from "../automation/src/source-catalog.js";
import { buildImportBatches, renderImportPage } from "../clients/anywhere/src/build-import-page.js";
import { RULE_SOURCE_CATALOG } from "../shared/rules/catalog.js";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDirectory = join(repositoryRoot, "public");
const checkMode = process.argv.slice(2).includes("--check");
if (process.argv.slice(2).some((argument) => argument !== "--check")) {
  throw new Error("Unknown update-rules argument");
}

async function loadText(path) {
  return readFile(join(repositoryRoot, path), "utf8");
}

async function staticFiles() {
  const paths = [
    ["shadowrocket/scripts/substore-node-operator.js", "clients/shadowrocket/dist/substore-node-operator.js"],
    ["shadowrocket/scripts/substore-profile-generator.js", "clients/shadowrocket/dist/substore-profile-generator.js"],
    ["shadowrocket/examples/shadowrocket-macos.conf", "clients/shadowrocket/examples/shadowrocket-macos.conf"],
    ["shadowrocket/examples/shadowrocket-iphone.conf", "clients/shadowrocket/examples/shadowrocket-iphone.conf"],
    ["shadowrocket/examples/shadowrocket-ipad.conf", "clients/shadowrocket/examples/shadowrocket-ipad.conf"],
    ["egern/scripts/substore-node-generator.js", "clients/egern/dist/substore-node-generator.js"],
    ["egern/scripts/substore-profile-generator.js", "clients/egern/dist/substore-profile-generator.js"],
    ["egern/examples/egern-macos.yaml", "clients/egern/examples/egern-macos.yaml"],
    ["egern/examples/egern-iphone.yaml", "clients/egern/examples/egern-iphone.yaml"],
    ["egern/examples/egern-ipad.yaml", "clients/egern/examples/egern-ipad.yaml"],
    ["anywhere/scripts/substore-node-generator.js", "clients/anywhere/dist/substore-node-generator.js"],
    ["LICENSE", "LICENSE"],
    ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ];
  const loaded = new Map(await Promise.all(paths.map(async ([publicPath, localPath]) => [publicPath, await loadText(localPath)])));
  const shadowrocketBundlePath = "shadowrocket/scripts/substore-profile-generator.js";
  const rawRoot = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";
  const publicRoot = "https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/rules";
  for (const bundlePath of [
    shadowrocketBundlePath,
    "egern/scripts/substore-profile-generator.js",
  ]) {
    const bundle = loaded.get(bundlePath);
    const rewrittenBundle = bundle
      .replace(`var RULE_ROOT = "${rawRoot}";`, `var RULE_ROOT = "${publicRoot}";`)
      .replace("upstreamUrl: `${RULE_ROOT}/${sourcePath}`", "upstreamUrl: `${RULE_ROOT}/${id}.list`");
    if (rewrittenBundle === bundle
      || rewrittenBundle.includes(rawRoot)
      || !rewrittenBundle.includes("`${RULE_ROOT}/${id}.list`")) {
      throw new Error(`Public bundle URL closure failed for ${bundlePath}`);
    }
    loaded.set(bundlePath, rewrittenBundle);
  }

  for (const path of [
    "shadowrocket/examples/shadowrocket-macos.conf",
    "shadowrocket/examples/shadowrocket-iphone.conf",
    "shadowrocket/examples/shadowrocket-ipad.conf",
  ]) {
    let content = loaded.get(path);
    let replacements = 0;
    for (const source of RULE_SOURCE_CATALOG) {
      const next = content.replaceAll(
        source.upstreamUrl,
        `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/rules/${source.id}.list`,
      );
      if (next !== content) replacements += 1;
      content = next;
    }
    if (replacements !== RULE_SOURCE_CATALOG.length) {
      throw new Error(`Shadowrocket public snapshot URL closure failed for ${path}`);
    }
    loaded.set(path, content);
  }
  return loaded;
}

let commit;
let committedAt;
if (checkMode) {
  const currentManifest = JSON.parse(await readFile(join(publicDirectory, "current/manifest.json"), "utf8"));
  commit = currentManifest.upstream.commit;
  committedAt = currentManifest.upstream.committedAt;
} else {
  ({ sha: commit, committedAt } = await resolveUpstreamCommit());
}
const upstream = Object.freeze({ ...BLACKMATRIX7_BASELINE, commit, committedAt });
const snapshot = await fetchSnapshot({ commit, catalog: PUBLISH_SOURCE_CATALOG, concurrency: 4 });
const baseline = commit === BLACKMATRIX7_BASELINE.commit
  ? JSON.parse(await loadText("clients/anywhere/compatibility/rule-baseline.json"))
  : null;
const statics = await staticFiles();
const artifacts = buildClientArtifacts({
  snapshot,
  catalog: PUBLISH_SOURCE_CATALOG,
  upstream,
  expectedAnywhereBaseline: baseline,
  additionalFiles(anywhereManifest) {
    const additions = new Map(statics);
    additions.set("anywhere/import.html", renderImportPage(
      buildImportBatches(anywhereManifest.shards.map(({ url }) => url)),
      anywhereManifest,
    ));
    return additions;
  },
});

if (checkMode) {
  if (!await snapshotMatches(join(publicDirectory, "current"), artifacts.files)) {
    throw new Error("Tracked public/current does not reproduce from its immutable commit");
  }
  process.stdout.write(`Public snapshot verified: ${commit}\n`);
} else {
  try {
    const prior = JSON.parse(await readFile(join(publicDirectory, "current/anywhere/rules/manifest.json"), "utf8"));
    const next = JSON.parse(artifacts.files.get("anywhere/rules/manifest.json"));
    const priorIds = prior.shards.map(({ id }) => id);
    const nextIds = next.shards.map(({ id }) => id);
    if (JSON.stringify(priorIds) !== JSON.stringify(nextIds)) {
      throw new Error("Anywhere shard topology changed; manual migration and canary are required");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const retention = await buildSite({ publicDirectory, ...artifacts });
  process.stdout.write(
    `Public snapshot updated: ${commit}; ${artifacts.manifest.files.length} files; ${retention.versionCount} online version(s); ${retention.bytes} bytes\n`,
  );
}
