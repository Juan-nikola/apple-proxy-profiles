import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..", "src");
const targets = Object.freeze([
  Object.freeze({
    entry: "substore-nodes-entry.js",
    output: "../dist/substore-node-generator.js",
    globalName: "EgernNodeBundle",
    wrapper: `\nasync function operator(input, targetPlatform) {\n  return EgernNodeBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`,
  }),
  Object.freeze({
    entry: "substore-profile-entry.js",
    output: "../dist/substore-profile-generator.js",
    globalName: "EgernProfileBundle",
    wrapper: `\nasync function operator(input, targetPlatform) {\n  return EgernProfileBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`,
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
  if (result.outputFiles.length !== 1) throw new Error("Unexpected Egern bundle output count");
  const destination = resolve(sourceRoot, target.output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    destination,
    `${result.outputFiles[0].text.trimEnd()}\n${target.wrapper}`,
    "utf8",
  );
}
