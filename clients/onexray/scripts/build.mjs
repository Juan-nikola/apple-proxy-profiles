import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..");

const targets = Object.freeze([
  Object.freeze({
    entry: "src/substore-nodes-entry.js",
    outputs: Object.freeze([
      "dist/onexray-nodes-generator.js",
      "dist/substore-nodes-generator.js",
    ]),
    globalName: "OneXrayNodesBundle",
    processor: "runOneXrayNodesProcessor",
    errorPrefix: "OneXray nodes",
  }),
  Object.freeze({
    entry: "src/substore-profile-entry.js",
    outputs: Object.freeze([
      "dist/onexray-profile-generator.js",
      "dist/substore-profile-generator.js",
    ]),
    globalName: "OneXrayProfileBundle",
    processor: "runOneXrayProfileProcessor",
    errorPrefix: "OneXray profile",
  }),
]);

function wrapperFor(target) {
  const diagnostics = target.processor === "runOneXrayNodesProcessor"
    ? `
  let diagnostics;
  const content = ${target.globalName}.${target.processor}({
    proxies,
    arguments: arguments_,
    onDiagnostics(value) { diagnostics = value; },
  });
  if (diagnostics !== undefined) {
    const logger = typeof console !== "undefined"
      ? typeof console.info === "function" ? console.info.bind(console)
        : typeof console.log === "function" ? console.log.bind(console)
          : null
      : null;
    if (logger) {
      try {
        logger("[onexray-nodes] " + JSON.stringify(diagnostics));
      } catch {
        // Diagnostics are optional and never change private output.
      }
    }
  }
`
    : `
  const content = ${target.globalName}.${target.processor}({
    proxies,
    arguments: arguments_,
  });
`;
  return `
async function operator(input, targetPlatform) {
  void targetPlatform;
  const arguments_ = $arguments;
  if (arguments_ === null || typeof arguments_ !== "object" || Array.isArray(arguments_)) {
    throw new Error("${target.errorPrefix}: invalid-arguments");
  }
  if (typeof produceArtifact !== "function") {
    throw new Error("${target.errorPrefix}: produce-artifact-unavailable");
  }
  const proxies = await produceArtifact({
    type: arguments_.type,
    name: arguments_.name,
    platform: "JSON",
    produceType: "internal",
  });
${diagnostics}
  return { ...input, $content: content };
}
`;
}

async function buildTarget(target) {
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
    charset: "utf8",
    sourcemap: false,
    write: false,
  });
  if (result.outputFiles.length !== 1) throw new Error("Unexpected OneXray bundle output count");
  const generated = result.outputFiles[0].text.replace(/\r\n?/gu, "").trimEnd();
  const content = `${generated}${wrapperFor(target)}`.replace(/\r\n?/gu, "");
  if (!content.endsWith("\n")) throw new Error("OneXray bundle must end in one newline");
  for (const output of target.outputs) {
    const destination = resolve(sourceRoot, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}

export async function buildBundles() {
  for (const target of targets) await buildTarget(target);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  await buildBundles();
}
