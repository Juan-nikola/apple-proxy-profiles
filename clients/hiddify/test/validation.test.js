import assert from 'node:assert/strict';
import test from 'node:test';
import { validateHiddifyConfig } from '../src/validate-config.js';

test('reports sing-box structural errors through Hiddify validator', () => {
  const result = validateHiddifyConfig({ outbounds: [], route: { rules: [], final: 'missing' } });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /outbound|final|DNS|tun/iu);
});

test('exposes honest pinned-core capability diagnostics', async () => {
  const { hiddifyCapabilityDiagnostics, hiddifyDnsPolicy } = await import('../src/diagnostics.js');
  assert.equal(hiddifyCapabilityDiagnostics().fullGroupSemantics, true);
  assert.equal(hiddifyCapabilityDiagnostics().coreRawModeRequirement, 'StartRequest.enable_raw_config=true');
  assert.equal(hiddifyCapabilityDiagnostics().appImportPreservesFullConfig, false);
  assert.equal(hiddifyDnsPolicy().compareResolverAnswers, false);
});

test('documents raw config requirement for stock Hiddify app behavior', async () => {
  const { readFile } = await import('node:fs/promises');
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /raw\/full-config|raw.*配置|full-config/iu);
  assert.match(readme, /普通配置导入|raw\/full-config/iu);
});
