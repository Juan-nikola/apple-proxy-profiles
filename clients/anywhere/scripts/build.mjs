import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..", "src");
const result = await build({
  absWorkingDir: sourceRoot,
  entryPoints: ["substore-nodes-entry.js"],
  bundle: true,
  format: "iife",
  globalName: "AnywhereNodeBundle",
  platform: "neutral",
  target: "es2022",
  minify: false,
  legalComments: "none",
  write: false,
});
if (result.outputFiles.length !== 1) throw new Error("Unexpected Anywhere bundle output count");
const wrapper = "\nasync function operator(input, targetPlatform) {\n  return AnywhereNodeBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n";
const content = `${result.outputFiles[0].text.trimEnd()}\n${wrapper}`;
for (const destinationPath of [
  "../dist/anywhere-node-generator.js",
  "../dist/substore-node-generator.js",
]) {
  const destination = resolve(sourceRoot, destinationPath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}
