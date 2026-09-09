import { normalizeNodes } from '../../../shared/nodes/normalize-nodes.js';
import { filterNodesForClient } from '../../../shared/nodes/capabilities.js';
import { loadSubstorePolicyArtifact } from '../../../shared/substore/policy-artifact.js';
import { resolveUnifiedPolicy } from '../../../shared/policies/resolve-unified.js';
import { parseV2rayNOptions } from './options.js';
import { renderV2rayNNativeRouting } from './render-native-routing.js';
import { parseV2rayNRuleSnapshot } from './parse-rule-snapshot.js';
import { renderV2rayNSubscription } from './render-node.js';

export async function operator(input, targetPlatform, context={}) {
  const options=parseV2rayNOptions({...context.arguments,output:'config'});
  if(options.core!=='xray') throw new Error('v2rayN native routing requires core=xray');
  if(targetPlatform!==undefined && !['JSON',options.platform].includes(targetPlatform)) throw new Error('v2rayN native routing target platform mismatch');
  if(options.clientChain!=='off') throw new Error('v2rayN native routing does not support client chain clones');
  if(options.policyOverrides) throw new Error('Use apple-proxy-policy for native routing overrides');
  if(typeof context.produceArtifact!=='function') throw new Error('v2rayN produceArtifact is unavailable');
  const ruleSources=parseV2rayNRuleSnapshot(input?.$content, {channel:options.channel});
  const raw=await context.produceArtifact({type:'collection',name:options.name,platform:'JSON',produceType:'internal'});
  const normalized=normalizeNodes(raw,{clientChain:options.clientChain});
  const filtered=filterNodesForClient(normalized.nodes,'v2rayn');
  // Assert that the matching names can actually be exported as share links.
  renderV2rayNSubscription({nodes:filtered.nodes});
  const policy=await loadSubstorePolicyArtifact(context);
  const policyResolution=resolveUnifiedPolicy({policy,channel:options.channel,client:'v2rayn',allNodes:normalized.nodes,eligibleNodes:filtered.nodes});
  const rules=renderV2rayNNativeRouting({nodes:filtered.nodes,options,policyResolution,ruleSources});
  return {...input,$content:JSON.stringify(rules,null,2)+'\n'};
}
