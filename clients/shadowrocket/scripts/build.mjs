import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..", "src");

const targets = Object.freeze([
  {
    entry: "substore-node-entry.js",
    outputs: Object.freeze([
      "../dist/shadowrocket-node-operator.js",
      "../dist/substore-node-operator.js",
    ]),
    globalName: "ShadowrocketNodeBundle",
    wrapper: `\nasync function operator(proxies, targetPlatform) {\n  return ShadowrocketNodeBundle.operator(proxies, targetPlatform, { arguments: $arguments, logger: console });\n}\n`,
  },
  {
    entry: "substore-profile-entry.js",
    outputs: Object.freeze([
      "../dist/shadowrocket-profile-generator.js",
      "../dist/substore-profile-generator.js",
    ]),
    globalName: "ShadowrocketProfileBundle",
    wrapper: `\nasync function operator(input, targetPlatform) {\n  return ShadowrocketProfileBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`,
  },
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
  const [output] = result.outputFiles;
  const content = `${output.text.trimEnd()}\n${target.wrapper}`;
  for (const destinationPath of target.outputs) {
    const destination = resolve(sourceRoot, destinationPath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}
