import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");

const targets = Object.freeze([
  {
    entry: "src/substore-node-entry.js",
    output: "dist/substore-node-operator.js",
    globalName: "ShadowrocketNodeBundle",
    wrapper: `\nasync function operator(proxies, targetPlatform) {\n  return ShadowrocketNodeBundle.operator(proxies, targetPlatform, { arguments: $arguments, logger: console });\n}\n`,
  },
  {
    entry: "src/substore-profile-entry.js",
    output: "dist/substore-profile-generator.js",
    globalName: "ShadowrocketProfileBundle",
    wrapper: `\nasync function operator(input, targetPlatform) {\n  return ShadowrocketProfileBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`,
  },
]);

for (const target of targets) {
  const result = await build({
    absWorkingDir: root,
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
  const destination = resolve(root, target.output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${output.text.trimEnd()}\n${target.wrapper}`, "utf8");
}

