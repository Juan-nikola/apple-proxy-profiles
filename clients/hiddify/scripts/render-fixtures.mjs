import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHiddifyOptions } from '../src/options.js';
import { renderHiddifyConfig } from '../src/render-config.js';
import { validateHiddifyConfig } from '../src/validate-config.js';
const root = resolve(import.meta.dirname, '..');
const nodes = [
  { name: '示例 · Tokyo', type: 'ss', server: 'example.invalid', port: 443, cipher: 'aes-256-gcm', password: 'TEST_ONLY_FIXTURE_PASSWORD', udp: true, _profile: { id: 'fixture-tokyo', sourceKind: 'airport', continent: 'asiaPacific', flag: '🇯🇵', entry: true, chained: false } },
  { name: '示例 · Frankfurt', type: 'vmess', server: 'fixture-vmess.example.invalid', port: 443, uuid: '00000000-0000-4000-8000-000000000001', security: 'auto', tls: true, sni: 'fixture-vmess.example.invalid', _profile: { id: 'fixture-frankfurt', sourceKind: 'airport', continent: 'europe', flag: '🇩🇪', entry: true, chained: false } },
];
await mkdir(resolve(root, 'examples'), { recursive: true });
for (const platform of ['android', 'iphone', 'ipad', 'macos', 'windows', 'linux']) for (const profileMode of ['light', 'diagnostic']) {
  const options = parseHiddifyOptions({ output: 'config', type: 'collection', name: 'hiddify-fixture', subscriptionName: 'Hiddify-Fixture', platform, profileMode });
  const config = renderHiddifyConfig(options, nodes, { ruleBaseUrl: 'https://juan-nikola.github.io/apple-proxy-profiles/current/hiddify/rules' });
  const check = validateHiddifyConfig(config); if (!check.valid) throw new Error(check.errors.join('; '));
  const suffix = profileMode === 'diagnostic' ? '-diagnostic' : '';
  await writeFile(resolve(root, `examples/hiddify-${platform}${suffix}.json`), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
