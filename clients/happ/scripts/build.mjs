import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..");
const targets = [
  ["src/substore-config-entry.js", "HappConfigBundle", ["dist/happ-config-generator.js", "dist/substore-config-generator.js"]],
  ["src/substore-audit-entry.js", "HappAuditBundle", ["dist/happ-routing-audit.js", "dist/substore-routing-audit.js"]],
];

for (const [entry, globalName, outputs] of targets) {
  const result = await build({
    absWorkingDir: sourceRoot,
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    globalName,
    platform: "neutral",
    target: "es2022",
    minify: false,
    legalComments: "none",
    write: false,
  });
  if (result.outputFiles.length !== 1) throw new Error("Unexpected HAPP bundle output count");
  const wrapper = `\nasync function operator(input, targetPlatform) {\n  return ${globalName}.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`;
  const content = `${result.outputFiles[0].text.trimEnd()}${wrapper}`;
  for (const output of outputs) {
    const destination = resolve(sourceRoot, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}
