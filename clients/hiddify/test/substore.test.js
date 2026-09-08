import assert from 'node:assert/strict';
import test from 'node:test';
import { operator } from '../src/substore-config-entry.js';
const node = { name: '🇯🇵 Tokyo', type: 'ss', server: '198.51.100.10', port: 443, cipher: 'aes-256-gcm', password: 'TEST_ONLY_PASSWORD', udp: true,
  _profile: { id: 'tokyo', continent: 'asiaPacific', sourceKind: 'airport', flag: '🇯🇵', entry: true, chained: false, udp: true, p2p: false } };
const policy = { $content: JSON.stringify({ schemaVersion: 2, targets: {} }) };
test('Sub-Store Hiddify entry emits raw Hiddify core-compatible config', async () => {
  const calls = [];
  const result = await operator({ id: 'input' }, 'windows', { arguments: { output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'Hiddify-Nodes', platform: 'windows' }, async produceArtifact(request) { calls.push(request); return request.type === 'file' ? policy : [node]; } });
  const config = JSON.parse(result.$content);
  assert.equal(calls[0].platform, 'JSON');
  assert.equal(config.http_clients, undefined);
  assert.ok(config.route.rule_set.every(({ url, format }) => format === 'source' && url.includes('/hiddify/')));
  assert.equal(result.$content.endsWith('\n'), true);
});

test('Sub-Store resolves Hiddify-specific policy overrides', async () => {
  const ids = ['ai', 'github', 'youtube', 'overseasMedia', 'globalSocial', 'apple', 'microsoft', 'domesticPlatform', 'overseasGame', 'game', 'download', 'dnsAndRules', 'final'];
  const layer = (override = {}) => ({
    targets: Object.fromEntries(ids.map((id) => {
      const fallback = ['ai', 'github', 'youtube', 'overseasMedia', 'globalSocial', 'overseasGame'].includes(id) ? 'FOLLOW' : 'DIRECT';
      return [id, override[id] ?? fallback];
    })),
    schemaVersion: 2,
  });
  const policy = { $content: JSON.stringify({ schemaVersion: 3, clients: { anywhere: layer(), egern: layer(), shadowrocket: layer(), surge: layer(), singbox: layer({ ai: 'DIRECT' }), happ: layer(), v2rayn: layer(), v2box: layer(), clash: layer(), incy: layer(), hiddify: layer({ ai: 'DIRECT' }) } }) };
  const result = await operator({}, 'windows', { arguments: { output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'Hiddify-Nodes', platform: 'windows' }, async produceArtifact(request) { return request.type === 'file' ? policy : [node]; } });
  const config = JSON.parse(result.$content);
  const ai = config.outbounds.find(({ tag }) => tag === '🤖 AI 专用');
  assert.equal(ai.default, 'DIRECT');
});
