import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { HIDDIFY_PUBLIC_STATIC_FILE_PATHS } from '../scripts/build.mjs';

test('Hiddify bundles expose Sub-Store operator and source JSON rule URLs', async () => {
  for (const file of ['../dist/hiddify-config-generator.js', '../dist/substore-config-generator.js']) {
    const content = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.match(content, /async function operator\(/u);
    assert.match(content, /hiddify\/rules/u);
    assert.match(content, /\.json/u);
    assert.doesNotMatch(content, /TEST_ONLY_PASSWORD|private-node\.example/iu);
  }
});

test('public static map covers all six Hiddify platforms', () => {
  for (const platform of ['android', 'iphone', 'ipad', 'macos', 'windows', 'linux']) assert.ok(HIDDIFY_PUBLIC_STATIC_FILE_PATHS.includes(`hiddify/examples/hiddify-${platform}.json`));
});
