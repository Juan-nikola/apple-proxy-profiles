import { validateSingBoxConfig } from '../../sing-box/src/validate-config.js';

export function validateHiddifyConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { valid: false, errors: ['config must be an object'] };
  // Reuse structural reference checks, while validating Hiddify's supported
  // wire representation before translating a copy for the shared validator.
  const errors = [];
  if (config.http_clients !== undefined || config.route?.default_http_client !== undefined) errors.push('Hiddify does not support HTTP client objects');
  if (config.experimental?.hiddify_next !== undefined) errors.push('Unrecognized Hiddify experimental metadata');
  if (config.experimental?.cache_file?.store_dns !== undefined) errors.push('Hiddify does not support store_dns');
  for (const inbound of config.inbounds ?? []) if (inbound.dns_mode !== undefined || inbound.dns_address !== undefined) errors.push('Hiddify does not support TUN DNS mode fields');
  for (const rule of config.dns?.rules ?? []) if (['evaluate', 'respond'].includes(rule.action) || rule.match_response !== undefined) errors.push('Hiddify does not support DNS answer evaluation');
  for (const rule of config.route?.rule_set ?? []) {
    if (rule.type === 'remote' && (rule.format !== 'source' || !/^https:\/\/[^\s]+\.json$/u.test(rule.url ?? ''))) errors.push('Hiddify remote rule-set must use HTTPS source JSON');
    if (rule.type === 'remote' && typeof rule.download_detour !== 'string') errors.push('Hiddify remote rule-set download detour is missing');
    if (rule.http_client !== undefined) errors.push('Hiddify remote rule-set cannot use http_client');
  }
  const copy = structuredClone(config);
  const download = '__hiddify-validation-only__';
  copy.http_clients = [{ tag: download, detour: '🧭 DNS 与规则下载' }];
  for (const rule of copy.route?.rule_set ?? []) {
    if (rule.type !== 'remote') continue;
    rule.format = 'binary';
    rule.url = (rule.url ?? '').replace(/\.json$/u, '.srs');
    rule.http_client = download;
    delete rule.download_detour;
  }
  // Diagnostic configs still carry the selector; this reference is checked.
  errors.push(...validateSingBoxConfig(copy).errors);
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
