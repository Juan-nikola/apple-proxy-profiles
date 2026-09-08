import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHiddifyOptions } from '../src/options.js';
import { renderHiddifyConfig } from '../src/render-config.js';
import { validateHiddifyConfig } from '../src/validate-config.js';

const nodes = [
  { name: '🇯🇵 Tokyo', type: 'ss', server: '198.51.100.10', port: 443, cipher: 'aes-256-gcm', password: 'TEST_ONLY_PASSWORD', udp: true,
    _profile: { id: 'tokyo', continent: 'asiaPacific', sourceKind: 'airport', flag: '🇯🇵', entry: true, chained: false, udp: true, p2p: false } },
  { name: '🇩🇪 Frankfurt', type: 'vless', server: '198.51.100.20', port: 443, uuid: '00000000-0000-4000-8000-000000000001', tls: true, sni: 'fixture.example.invalid',
    _profile: { id: 'frankfurt', continent: 'europe', sourceKind: 'airport', flag: '🇩🇪', entry: true, chained: false, udp: true, p2p: false } },
];

for (const platform of ['android', 'iphone', 'ipad', 'macos', 'windows', 'linux']) {
  test(`renders Hiddify core-compatible config for ${platform}`, () => {
    const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'Hiddify-Nodes', platform });
    const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: `https://example.invalid/current/sing-box/rule-sets` });
    assert.deepEqual(validateHiddifyConfig(config), { valid: true, errors: [] });
    assert.equal(config.inbounds[0].type, 'tun');
    assert.equal(config.inbounds[0].tag, 'tun-in');
    assert.ok(config.route.rule_set.length > 0);
    assert.equal(config.http_clients, undefined);
    assert.equal(config.route.default_http_client, undefined);
    assert.equal(config.route.rule_set.every((rule) => rule.format === 'source' && rule.url.includes('/hiddify/')), true);
    assert.equal(config.dns.rules.some((rule) => rule.action === 'evaluate' || rule.match_response !== undefined), false);
    assert.equal(config.route.final, '漏网之鱼');
    if (platform === 'android') assert.equal(config.inbounds[0].interface_name, 'sing-box');
    if (platform === 'windows' || platform === 'linux') assert.equal(config.inbounds[0].interface_name, 'singtun0');
  });
}

test('rejects Snell because Hiddify bundled core has no Snell outbound', () => {
  assert.throws(() => renderHiddifyConfig(parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x', platform: 'macos' }), [{ name: 'Snell', type: 'snell', server: '198.51.100.1', port: 443, psk: 'TEST_ONLY', _profile: { id: 'snell', continent: 'asiaPacific', sourceKind: 'selfHosted', flag: '🇯🇵', entry: true, chained: false } }], { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' }), /does not support Snell/iu);
});

test('uses Hiddify JSON health probes and an inline China TLD guard', () => {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x', platform: 'android' });
  const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' });
  const failover = config.outbounds.find(({ tag }) => tag === '🧭 规则下载故障转移');
  assert.equal(failover.url, 'https://example.invalid/current/hiddify/mobile-rules/Security.json');
  assert.ok(config.route.rules.some((rule) => rule.domain_suffix?.includes('cn') && rule.outbound === 'DIRECT'));
});

test('maps full adblock URLs into the published Hiddify optional channel path', () => {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x', platform: 'macos', adblockMode: 'full' });
  const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' });
  const adblock = config.route.rule_set.filter(({ tag }) => ['rule-Advertising', 'rule-Advertising_Domain'].includes(tag));
  assert.ok(adblock.length > 0);
  assert.equal(adblock.every(({ url }) => url.includes('/optional/adblock-full/current/hiddify/rules/')), true);
});


test('places the cold-start ChinaTLD guard after explicit overseas service rules', () => {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'Hiddify-Nodes', platform: 'macos' });
  const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' });
  const openAi = config.route.rules.findIndex((rule) => rule.rule_set?.includes('rule-OpenAI'));
  const chinaTld = config.route.rules.findIndex((rule) => rule.domain_suffix?.includes('cn') && rule.outbound === 'DIRECT');
  assert.ok(openAi >= 0);
  assert.ok(chinaTld > openAi);
});

test('proxy-block does not reject UDP/443 before Hiddify knows the selected outbound', () => {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x', platform: 'macos', quicMode: 'proxy-block' });
  const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' });
  assert.equal(config.route.rules.some((rule) => rule.network === 'udp' && rule.port === 443), false);
});

test('Hiddify proxy DoH does not get a direct global DNS bootstrap route', () => {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x', platform: 'macos', dnsMode: 'speed' });
  const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' });
  assert.equal(config.route.rules.some((rule) => rule.outbound === 'DIRECT' && rule.ip_cidr?.includes('1.1.1.1/32')), false);
  assert.equal(config.dns.servers.find(({ tag }) => tag === 'dns-proxy').detour, '⚡ 全部自动');
});

test('rejects sing-box-only AnyTLS and Hysteria2 fields', () => {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-sources', subscriptionName: 'x', platform: 'macos' });
  assert.throws(() => renderHiddifyConfig(options, [{ ...nodes[0], type: 'anytls', password: 'x', 'client-metadata': {} }], { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' }), /client_metadata/iu);
  assert.throws(() => renderHiddifyConfig(options, [{ ...nodes[0], type: 'hysteria2', password: 'x', hop_interval_max: 10 }], { ruleBaseUrl: 'https://example.invalid/current/hiddify/rules' }), /hop_interval_max/iu);
});
