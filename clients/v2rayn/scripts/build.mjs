import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
const root = resolve(import.meta.dirname, "..");
for (const [entry, name, output] of [["src/substore-node-entry.js", "V2rayNNodesBundle", "dist/substore-node-generator.js"], ["src/substore-config-entry.js", "V2rayNConfigBundle", "dist/substore-config-generator.js"]]) {
  const result = await build({ absWorkingDir: root, entryPoints: [entry], bundle: true, format: "iife", globalName: name, platform: "neutral", target: "es2022", write: false, legalComments: "none" });
  const content = `${result.outputFiles[0].text.trimEnd()}\nasync function operator(input, targetPlatform) { return ${name}.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console }); }\n`;
  await mkdir(resolve(root, "dist"), { recursive: true }); await writeFile(resolve(root, output), content);
}
