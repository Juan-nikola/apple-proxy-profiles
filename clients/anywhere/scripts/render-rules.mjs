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

import {
  BLACKMATRIX7_BASELINE,
  PUBLISH_SOURCE_CATALOG,
} from "../../../automation/src/source-catalog.js";
import { fetchSnapshot } from "../../../automation/src/fetch-snapshot.js";
import { buildAnywhereRuleSnapshot } from "../../../automation/src/render-anywhere-rules.js";
import { buildImportBatches, renderImportPage } from "../src/build-import-page.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = dirname(scriptDirectory);
const examplesDirectory = join(workspaceDirectory, "examples");
const outputDirectory = join(examplesDirectory, "rules");
const importPagePath = join(examplesDirectory, "import.html");
const baselinePath = join(workspaceDirectory, "compatibility", "rule-baseline.json");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const expectedBaseline = JSON.parse(await readFile(baselinePath, "utf8"));
const snapshot = await fetchSnapshot({
  commit: BLACKMATRIX7_BASELINE.commit,
  catalog: PUBLISH_SOURCE_CATALOG,
  concurrency: 4,
});
const built = buildAnywhereRuleSnapshot({
  snapshot,
  catalog: PUBLISH_SOURCE_CATALOG,
  expectedBaseline,
});

await mkdir(examplesDirectory, { recursive: true });
const stagingDirectory = await mkdtemp(join(examplesDirectory, ".rules-staging-"));
try {
  for (const [publicPath, content] of built.files) {
    const prefix = "anywhere/rules/";
    if (!publicPath.startsWith(prefix)) throw new Error("Unexpected Anywhere artifact path");
    const relativePath = publicPath.slice(prefix.length);
    const destination = join(stagingDirectory, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }

  const backupDirectory = `${outputDirectory}.backup-${randomUUID()}`;
  const hadPriorOutput = await exists(outputDirectory);
  if (hadPriorOutput) await rename(outputDirectory, backupDirectory);
  try {
    await rename(stagingDirectory, outputDirectory);
  } catch (error) {
    if (hadPriorOutput) await rename(backupDirectory, outputDirectory);
    throw error;
  }
  if (hadPriorOutput) await rm(backupDirectory, { recursive: true, force: true });
  const importPage = renderImportPage(
    buildImportBatches(built.manifest.shards.map(({ url }) => url)),
    built.manifest,
  );
  const importPageStagingPath = `${importPagePath}.staging-${randomUUID()}`;
  await writeFile(importPageStagingPath, importPage, "utf8");
  await rename(importPageStagingPath, importPagePath);
} catch (error) {
  await rm(stagingDirectory, { recursive: true, force: true });
  throw error;
}

process.stdout.write(
  `Anywhere rules: ${built.manifest.totals.sourceCount} sources, ${built.manifest.totals.outputCount} entries, ${built.manifest.totals.shardCount} shards\n`,
);
