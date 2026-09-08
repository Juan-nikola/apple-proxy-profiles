import { parseSingBoxOptions } from '../../sing-box/src/options.js';
import { renderSingBoxConfig } from '../../sing-box/src/render-config.js';
import { parseHiddifyOptions, isParsedHiddifyOptions } from './options.js';
import { renderHiddifyNode } from './render-node.js';
import { validateHiddifyConfig } from './validate-config.js';
import { globalDnsProvider } from '../../../shared/dns/providers.js';

function sourceBase(value) {
  if (typeof value !== 'string' || !/^https:\/\/[^\s]+$/u.test(value)) throw new Error('Hiddify rule base URL must be HTTPS');
  const base = value.replace(/\/+$/u, '');
  if (base.endsWith('/hiddify/rules')) return base;
  if (base.endsWith('/sing-box/rule-sets')) return base.replace(/\/sing-box\/rule-sets$/u, '/hiddify/rules');
  throw new Error('Hiddify rule base URL must end in /hiddify/rules');
}

function channelOf(base) {
  const match = /\/(edge|current|previous)\/hiddify\/rules$/u.exec(base);
  if (!match) throw new Error('Hiddify rule base URL must include a publication channel');
  return match[1];
}

function optionalSourceUrl(base, id) {
  return base.replace(/\/(edge|current|previous)\/hiddify\/rules$/u, `/optional/adblock-full/$1/hiddify/rules/${id}.json`);
}

/** Adapt the shared 1.14 semantic renderer to Hiddify 4.1.x's pinned 1.13 fork. */
export function renderHiddifyConfig(rawOptions, nodes, rendererOptions = {}) {
  const options = isParsedHiddifyOptions(rawOptions) ? rawOptions : parseHiddifyOptions(rawOptions);
  for (const node of nodes ?? []) renderHiddifyNode(node);
  const platform = options.platform === 'linux' ? 'macos' : options.platform;
  const base = sourceBase(rendererOptions.ruleBaseUrl);
  const singboxBase = base.replace(/\/hiddify\/rules$/u, '/sing-box/rule-sets');
  const config = renderSingBoxConfig(parseSingBoxOptions({ ...options, platform }), nodes, { ...rendererOptions, ruleBaseUrl: singboxBase });
  delete config.http_clients;
  delete config.route.default_http_client;
  channelOf(base);
  for (const rule of config.route.rule_set) {
    const id = rule.tag.replace(/^rule-/u, '');
    if (options.adblockMode === 'full' && ['Advertising', 'Advertising_Domain'].includes(id)) {
      rule.url = optionalSourceUrl(base, id);
    } else {
      rule.url = rule.url
        .replace(/\/sing-box\/mobile-rule-sets\//u, '/hiddify/mobile-rules/')
        .replace(/\/sing-box\/rule-sets\//u, '/hiddify/rules/')
        .replace(/\.srs$/u, '.json');
    }
    rule.format = 'source';
    rule.download_detour = '🧭 DNS 与规则下载';
    delete rule.http_client;
  }
  const mobile = ['iphone', 'ipad', 'android'].includes(options.platform);
  const probeRoot = `${base.replace(/\/rules$/u, '')}/${mobile ? 'mobile-rules' : 'rules'}`;
  const failover = config.outbounds.find(({ tag }) => tag === '🧭 规则下载故障转移');
  if (failover) failover.url = `${probeRoot}/${mobile ? 'Security' : 'Hijacking'}.json`;
  // The pinned fork has no evaluate/respond API. Keep known domain DNS rules,
  // then resolve unknown destinations only with the trusted proxy DoH server.
  config.dns.rules = config.dns.rules.filter((rule) => rule.action === 'route');
  // Hiddify cannot express sing-box's proxy-only QUIC condition: a rule-set
  // match runs before the selected outbound is known. Keeping those inherited
  // proxy-block rules would also reject traffic whose business group is set to
  // DIRECT. The safe representation is allow; all-block remains unconditional.
  if (options.quicMode === 'proxy-block') {
    config.route.rules = config.route.rules.filter((rule) => !(rule.network === 'udp' && rule.port === 443));
  }
  // Proxy DoH is always detoured through the selector below. Do not leave a
  // direct route to its resolver address in the bootstrap rules (notably in
  // dnsMode=speed, where the shared renderer adds both resolver addresses).
  const globalDnsAddress = globalDnsProvider(options.globalDns).address;
  const globalDnsCidr = globalDnsAddress.includes(':') ? `${globalDnsAddress}/128` : `${globalDnsAddress}/32`;
  config.route.rules = config.route.rules.filter((rule) => !(
    rule.outbound === 'DIRECT' && Array.isArray(rule.ip_cidr) && rule.ip_cidr.includes(globalDnsCidr)
  ));
  // Keep a tiny deterministic domestic guard available before remote rule sets finish downloading,
  // but place it after explicit service rules so overseas .cn domains retain precedence.
  if (!config.route.rules.some((rule) => rule.domain_suffix?.includes('cn') && rule.outbound === 'DIRECT')) {
    const resolveIndex = config.route.rules.findIndex((rule) => rule.action === 'resolve');
    const insertAt = resolveIndex < 0 ? config.route.rules.length : resolveIndex;
    config.route.rules.splice(insertAt, 0, { domain_suffix: ['cn'], action: 'route', outbound: 'DIRECT' });
  }
  config.dns.servers.find(({ tag }) => tag === 'dns-proxy').detour = '⚡ 全部自动';
  for (const inbound of config.inbounds) {
    delete inbound.dns_mode;
    delete inbound.dns_address;
    inbound.stack = ['iphone', 'ipad'].includes(options.platform) ? 'gvisor' : 'mixed';
  }
  delete config.experimental.cache_file.store_dns;
  config.experimental.cache_file.path = 'hiddify-cache.db';
  const validation = validateHiddifyConfig(config);
  if (!validation.valid) throw new Error(`Generated Hiddify config failed validation: ${validation.errors.join(',')}`);
  return config;
}
