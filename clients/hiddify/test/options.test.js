import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHiddifyOptions } from '../src/options.js';

test('accepts all Hiddify Next target platforms and applies safe defaults', () => {
  for (const platform of ['android', 'iphone', 'ipad', 'macos', 'windows', 'linux']) {
    const options = parseHiddifyOptions({
      output: 'config', type: 'collection', name: 'hiddify-sources',
      subscriptionName: 'Hiddify-Nodes', platform,
    });
    assert.equal(options.platform, platform);
    assert.equal(options.channel, 'current');
    assert.equal(options.profileMode, 'light');
    assert.equal(options.adblockMode, 'off');
  }
});

test('rejects mobile full adblock and unknown options', () => {
  assert.throws(() => parseHiddifyOptions({
    output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x',
    platform: 'android', adblockMode: 'full',
  }), /memory budget/iu);
  assert.throws(() => parseHiddifyOptions({
    output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x',
    platform: 'linux', unsupported: true,
  }), /unknown hiddify option/iu);
});
