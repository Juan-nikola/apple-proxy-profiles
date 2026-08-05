import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..");
const targets = Object.freeze([
  Object.freeze({
    entry: "src/substore-config-entry.js",
    outputs: Object.freeze(["dist/sing-box-config-generator.js", "dist/substore-config-generator.js"]),
    globalName: "SingBoxConfigBundle",
  }),
]);

for (const target of targets) {
  const result = await build({
    absWorkingDir: sourceRoot,
    entryPoints: [target.entry],
    bundle: true,
    format: "iife",
    globalName: target.globalName,
    platform: "neutral",
    target: "es2022",
    minify: false,
    legalComments: "none",
    write: false,
  });
  if (result.outputFiles.length !== 1) throw new Error("Unexpected sing-box bundle output count");
  const wrapper = `\nasync function operator(input, targetPlatform) {\n  return ${target.globalName}.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`;
  const content = `${result.outputFiles[0].text.trimEnd()}${wrapper}`;
  for (const output of target.outputs) {
    const destination = resolve(sourceRoot, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}
