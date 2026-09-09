import { orderedRoutingPlan } from '../../../shared/rules/lightweight-policy.js';
import { unifiedPolicyTargetByKey } from '../../../shared/policies/unified-policy.js';
import { defaultUnifiedPolicyResolution } from '../../../shared/policies/resolve-unified.js';
import { xrayGeoReference } from '../../../shared/xray-geodata-contract.js';

const PRIVATE_IPS = ['10.0.0.0/8','127.0.0.0/8','169.254.0.0/16','172.16.0.0/12','192.168.0.0/16','::1/128','fc00::/7','fe80::/10'];
const SOURCE_TARGET = { DomesticCore:'domesticPlatform', ChinaTLD:'domesticPlatform', ChinaIP:'domesticPlatform', DomesticGame:'game', SteamCN:'game' };

/** Native v2rayN RulesItem array. `proxy` is supplied by the selected GUI node. */
export function renderV2rayNNativeRouting({ nodes, options, policyResolution = defaultUnifiedPolicyResolution(), ruleSources = null }) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error('v2rayN native routing requires nodes');
  if (!['cn','global'].includes(options?.region)) throw new Error('v2rayN native routing currently supports cn/global regions');
  const byId = new Map();
  const names = new Set();
  for (const node of nodes) {
    if (!node.name || names.has(node.name) || ['proxy','direct','block'].includes(node.name)) throw new Error('v2rayN native routing requires unique non-reserved node names');
    names.add(node.name);
    byId.set(node._profile?.id, node.name);
  }
  function target(id) {
    const record = policyResolution.targets?.[id];
    if (!record || record.resolved === 'FOLLOW') return 'proxy';
    if (record.resolved === 'DIRECT') return 'direct';
    if (record.resolved === 'REJECT') return 'block';
    const name = byId.get(record.nodeId);
    if (!name) throw new Error('v2rayN fixed policy node is unavailable');
    return name;
  }
  // Validate every fixed reference, even one without a source in this region.
  for (const id of Object.keys(policyResolution.targets ?? {})) target(id);
  const rules = [];
  function add(remarks, match, outboundTag, guard = true) {
    const isProxy = !['direct','block'].includes(outboundTag);
    if (guard && (options.quicMode === 'all-block' || (options.quicMode === 'proxy-block' && isProxy))) {
      rules.push({type:'field',...match,network:'udp',port:'443',outboundTag:'block',enabled:true,remarks:`${remarks} / QUIC`});
    }
    rules.push({type:'field',...match,outboundTag,enabled:true,remarks});
  }
  add('Private IP', {ip:PRIVATE_IPS}, 'direct', false);
  add('Private domains', {domain:['full:localhost','domain:local','domain:lan','domain:home.arpa']}, 'direct', false);
  for (const entry of orderedRoutingPlan()) {
    const source = ruleSources?.[entry.id];
    if (ruleSources && (!source || (!Array.isArray(source.domain) && !Array.isArray(source.ip)))) throw new Error(`Missing v2rayN rule source: ${entry.id}`);
    if (options.region === 'global' && ['DomesticCore','DomesticGame','SteamCN','ChinaTLD','ChinaIP'].includes(entry.id)) continue;
    let outboundTag;
    const id = SOURCE_TARGET[entry.id] ?? unifiedPolicyTargetByKey(entry.policy)?.id;
    if (id) outboundTag = target(id);
    else if (entry.id === 'Privacy') outboundTag = options.blockMode === 'strict' ? 'block' : 'direct';
    else if (entry.policy === 'REJECT') outboundTag = options.blockMode === 'off' ? 'direct' : 'block';
    else throw new Error(`Unmapped v2rayN rule source: ${entry.id}`);
    // Xray combines fields with AND. Emit separate domain and IP rules.
    for (const kind of ['domain','ip']) {
      const values = ruleSources ? source[kind] : [xrayGeoReference(options.channel,kind,entry.id)];
      if (values.length) add(`${entry.id} / ${kind}`, {[kind]:values},outboundTag);
    }
  }
  add('Final', {network:'tcp,udp'}, target('final'));
  return rules;
}
