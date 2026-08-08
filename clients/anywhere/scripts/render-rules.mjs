import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildClientArtifacts } from "../../../automation/src/build-artifacts.js";
import {
  BLACKMATRIX7_BASELINE,
  FETCH_SOURCE_CATALOG,
} from "../../../automation/src/source-catalog.js";
import { fetchSnapshot } from "../../../automation/src/fetch-snapshot.js";
import { validateShardMigration } from "../src/shard-rules.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = dirname(scriptDirectory);
const examplesDirectory = join(workspaceDirectory, "examples");
const baselinePath = join(workspaceDirectory, "compatibility", "rule-baseline.json");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function migrationFrom(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    removed: manifest.removed,
    replacements: manifest.replacements,
    optionalPacks: manifest.optionalPacks,
  };
}

function validateTopology(defaultManifest, optionalManifest, baseline) {
  if (baseline.schemaVersion !== 2 || baseline.upstreamCommit !== BLACKMATRIX7_BASELINE.commit) {
    throw new Error("Anywhere compatibility baseline identity is invalid");
  }
  const currentIds = defaultManifest.sources.map(({ id }) => id);
  const optionalIds = optionalManifest.sources.map(({ id }) => id);
  if (JSON.stringify(baseline.migration) !== JSON.stringify(migrationFrom(defaultManifest))) {
    throw new Error("Anywhere compatibility baseline migration changed");
  }
  validateShardMigration({
    previousIds: baseline.legacyManagedIds,
    currentIds,
    migration: migrationFrom(defaultManifest),
  });
  if (JSON.stringify(currentIds) !== JSON.stringify(baseline.currentIds)) {
    throw new Error("Anywhere default shard topology changed outside the schema-v2 migration");
  }
  if (JSON.stringify(optionalIds) !== JSON.stringify(baseline.optionalIds)) {
    throw new Error("Anywhere optional shard topology changed");
  }
  for (const id of baseline.retiredAuditOnlyIds) {
    if (currentIds.includes(id) || optionalIds.includes(id)) {
      throw new Error(`Retired audit-only Anywhere shard ${id} became active`);
    }
  }
}

function selectAnywhereExamples(defaults, optional) {
  const selected = new Map();
  for (const [path, content] of defaults) {
    if (path === "anywhere/import.html") selected.set("import.html", content);
    else if (path.startsWith("anywhere/rules/")) selected.set(path.slice("anywhere/".length), content);
  }
  const optionalPrefix = "optional/adblock-full/anywhere/";
  for (const [path, content] of optional) {
    if (path.startsWith(optionalPrefix)) selected.set(path, content);
  }
  return selected;
}

const expectedBaseline = JSON.parse(await readFile(baselinePath, "utf8"));
const snapshot = await fetchSnapshot({
  commit: BLACKMATRIX7_BASELINE.commit,
  catalog: FETCH_SOURCE_CATALOG,
  concurrency: 4,
});
const built = buildClientArtifacts({ snapshot, upstream: BLACKMATRIX7_BASELINE });
const optional = built.optionalPacks.get("adblock-full");
const defaultManifest = JSON.parse(built.defaults.get("anywhere/rules/manifest.json"));
const optionalManifest = JSON.parse(optional.get("optional/adblock-full/anywhere/manifest.json"));
validateTopology(defaultManifest, optionalManifest, expectedBaseline);
const selected = selectAnywhereExamples(built.defaults, optional);

const stagingDirectory = await mkdtemp(join(workspaceDirectory, ".examples-staging-"));
try {
  for (const [relativePath, content] of selected) {
    const destination = join(stagingDirectory, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  const backupDirectory = `${examplesDirectory}.backup-${randomUUID()}`;
  const hadPriorOutput = await exists(examplesDirectory);
  if (hadPriorOutput) await rename(examplesDirectory, backupDirectory);
  try {
    await rename(stagingDirectory, examplesDirectory);
  } catch (error) {
    if (hadPriorOutput) await rename(backupDirectory, examplesDirectory);
    throw error;
  }
  if (hadPriorOutput) await rm(backupDirectory, { recursive: true, force: true });
} catch (error) {
  await rm(stagingDirectory, { recursive: true, force: true });
  throw error;
}

process.stdout.write(
  `Anywhere rules: ${defaultManifest.totals.sourceCount} default sources, ${defaultManifest.totals.outputCount} entries, ${defaultManifest.totals.shardCount} shards; ${optionalManifest.totals.shardCount} optional ad shards\n`,
);
