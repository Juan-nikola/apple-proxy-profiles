import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..", "src");
async function buildBundle(entryPoint, globalName, wrapper, destinationPaths) {
  const result = await build({
    absWorkingDir: sourceRoot,
    entryPoints: [entryPoint],
    bundle: true,
    format: "iife",
    globalName,
    platform: "neutral",
    target: "es2022",
    minify: false,
    legalComments: "none",
    write: false,
  });
  if (result.outputFiles.length !== 1) throw new Error(`Unexpected ${globalName} output count`);
  const content = `${result.outputFiles[0].text.trimEnd()}\n${wrapper}`;
  for (const destinationPath of destinationPaths) {
    const destination = resolve(sourceRoot, destinationPath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}

await buildBundle(
  "substore-nodes-entry.js",
  "AnywhereNodeBundle",
  "\nasync function operator(input, targetPlatform) {\n  return AnywhereNodeBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n",
  ["../dist/anywhere-node-generator.js", "../dist/substore-node-generator.js"],
);

await buildBundle(
  "substore-strategy-entry.js",
  "AnywhereStrategyBundle",
  "\nasync function operator(input, targetPlatform) {\n  return AnywhereStrategyBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n",
  ["../dist/anywhere-strategy-generator.js", "../dist/substore-strategy-generator.js"],
);
