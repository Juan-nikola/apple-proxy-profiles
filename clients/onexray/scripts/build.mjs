import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..");
const targets = [
  ["src/substore-nodes-entry.js", "OneXrayNodesBundle", ["dist/onexray-node-generator.js", "dist/substore-node-generator.js"]],
  ["src/substore-profile-entry.js", "OneXrayProfileBundle", ["dist/onexray-profile-generator.js", "dist/substore-profile-generator.js"]],
  ["src/substore-audit-entry.js", "OneXrayAuditBundle", ["dist/onexray-routing-audit.js", "dist/substore-routing-audit.js"]],
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
  const wrapper = `\nasync function operator(input, targetPlatform) {\n  return ${globalName}.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`;
  const content = `${result.outputFiles[0].text.trimEnd()}${wrapper}`;
  for (const output of outputs) {
    const destination = resolve(sourceRoot, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}
