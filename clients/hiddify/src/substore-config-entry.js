import { normalizeNodes } from '../../../shared/nodes/normalize-nodes.js';
import { CLIENT } from '../../../shared/contracts.js';
import { assertRenderableNodes, partitionRenderableNodes } from '../../../shared/nodes/renderability.js';
import { loadSubstorePolicyArtifact } from '../../../shared/substore/policy-artifact.js';
import { resolveUnifiedPolicy } from '../../../shared/policies/resolve-unified.js';
import { parseHiddifyOptions } from './options.js';
import { renderHiddifyConfig } from './render-config.js';
import { renderHiddifyNode } from './render-node.js';
import { hiddifyCapabilityDiagnostics } from './diagnostics.js';

export const PUBLIC_RULE_ROOT = 'https://juan-nikola.github.io/apple-proxy-profiles';

function logDiagnostics(context, options, nodes, renderFailures) {
  const logger = context?.logger;
  const method = typeof logger === 'function' ? logger : typeof logger?.info === 'function' ? logger.info.bind(logger) : typeof logger?.log === 'function' ? logger.log.bind(logger) : null;
  if (!method) return;
  try { method(`[hiddify-config] ${JSON.stringify({ client: 'hiddify', platform: options.platform, channel: options.channel, accepted: nodes.length, ruleCount: renderFailures?.ruleCount ?? null, renderFailures, capability: hiddifyCapabilityDiagnostics() })}`); } catch { /* diagnostics are optional */ }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseHiddifyOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== 'function') throw new Error('produceArtifact is unavailable');
  const rawNodes = await context.produceArtifact({ type: options.type, name: options.name, platform: 'JSON', produceType: 'internal' });
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error('produceArtifact must return a non-empty node array');
  const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
  const invalidInputCount = Object.entries(normalized.diagnostics.excluded).filter(([reason]) => reason !== 'exact-duplicate').reduce((total, [, count]) => total + count, 0);
  if (options.nodeErrorMode === 'strict' && invalidInputCount > 0) throw new Error(`hiddify strict node inventory rejected ${invalidInputCount} invalid input node(s): ${JSON.stringify(normalized.diagnostics.excluded)}`);
  let renderable; let renderFailures;
  if (options.nodeErrorMode === 'compatible') {
    const partitioned = partitionRenderableNodes(normalized.nodes, 'hiddify', renderHiddifyNode);
    renderable = partitioned.renderable; renderFailures = partitioned.failureProtocols;
  } else {
    assertRenderableNodes(normalized.nodes, 'hiddify', renderHiddifyNode); renderable = normalized.nodes; renderFailures = {};
  }
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({ policy, channel: options.channel, client: CLIENT.hiddify, allNodes: normalized.nodes, eligibleNodes: renderable });
  const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/hiddify/rules`;
  const config = renderHiddifyConfig(options, renderable, { ruleBaseUrl, policyResolution });
  if (typeof context.logger === 'function' || typeof context.logger?.info === 'function' || typeof context.logger?.log === 'function') {
    logDiagnostics(context, options, renderable, { ...renderFailures, ruleCount: config.route?.rule_set?.length ?? 0 });
  }
  return { ...input, $content: `${JSON.stringify(config, null, 2)}\n` };
}
