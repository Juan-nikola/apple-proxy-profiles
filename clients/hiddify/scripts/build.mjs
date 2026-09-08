import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
const root = resolve(import.meta.dirname, '..');
export const HIDDIFY_PUBLIC_STATIC_FILE_PATHS = Object.freeze([
  'hiddify/scripts/hiddify-config-generator.js',
  'hiddify/scripts/substore-config-generator.js',
  ...['android', 'iphone', 'ipad', 'macos', 'windows', 'linux'].flatMap((platform) => [
    `hiddify/examples/hiddify-${platform}.json`,
    `hiddify/examples/hiddify-${platform}-diagnostic.json`,
  ]),
]);
export async function buildBundles() {
  const result = await build({ absWorkingDir: root, entryPoints: ['src/substore-config-entry.js'], bundle: true, format: 'iife', globalName: 'HiddifyConfigBundle', platform: 'neutral', target: 'es2022', minify: false, legalComments: 'none', write: false });
  if (result.outputFiles.length !== 1) throw new Error('Unexpected Hiddify bundle output count');
  const wrapper = `\nasync function operator(input, targetPlatform) {\n  return HiddifyConfigBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n`;
  const content = `${result.outputFiles[0].text.trimEnd()}${wrapper}`;
  for (const output of ['dist/hiddify-config-generator.js', 'dist/substore-config-generator.js']) {
    const destination = resolve(root, output); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, content, 'utf8');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) await buildBundles();
