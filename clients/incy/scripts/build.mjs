import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const entry = "src/substore-config-entry.js";
const outputs = ["dist/incy-config-generator.js", "dist/substore-config-generator.js"];
const result = await build({
  absWorkingDir: root,
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  globalName: "INCYConfigBundle",
  platform: "neutral",
  target: "es2022",
  legalComments: "none",
  minify: false,
  write: false,
});
if (result.outputFiles.length !== 1) throw new Error("Unexpected INCY bundle output count");
const content = `${result.outputFiles[0].text.trimEnd()}\nasync function operator(input, targetPlatform) {\n  return INCYConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, requestOptions: typeof $options === "undefined" ? undefined : $options, logger: console });\n}\n`;
for (const output of outputs) {
  const destination = resolve(root, output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}
