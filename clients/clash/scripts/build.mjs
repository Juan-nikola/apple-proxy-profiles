import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..", "src");
const targets = [
  ["substore-nodes-entry.js", "ClashNodeBundle", "clash-node-generator.js", "substore-node-generator.js"],
  ["substore-profile-entry.js", "ClashProfileBundle", "clash-profile-generator.js", "substore-profile-generator.js"],
];
for (const [entry, globalName, first, second] of targets) {
  const result = await build({ absWorkingDir: sourceRoot, entryPoints: [entry], bundle: true, format: "iife", globalName, platform: "neutral", target: "es2022", minify: false, legalComments: "none", write: false });
  if (result.outputFiles.length !== 1) throw new Error("Unexpected Clash bundle output count");
  const content = result.outputFiles[0].text.trimEnd() + "\nasync function operator(input, targetPlatform) { return " + globalName + ".operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console }); }\n";
  for (const relative of [first, second]) {
    const destination = resolve(sourceRoot, "../dist/" + relative);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}

