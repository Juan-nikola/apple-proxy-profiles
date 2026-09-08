import { normalizeProtocol } from '../../../shared/nodes/protocol-registry.js';
import { renderSingBoxNode, renderSingBoxOutbound } from '../../sing-box/src/render-node.js';

/** Validate fields accepted by sing-box 1.14 but rejected by Hiddify's pinned fork. */
function validateHiddifyNodeFields(node) {
  if (!node || typeof node !== 'object') return;
  const protocol = normalizeProtocol(node.type);
  if (protocol === 'anytls' && (node['client-metadata'] !== undefined || node.client_metadata !== undefined)) {
    throw new Error('Hiddify bundled core does not support AnyTLS client_metadata');
  }
  if ((protocol === 'hysteria2' || protocol === 'hy2') && node.hop_interval_max !== undefined) {
    throw new Error('Hiddify bundled core does not support Hysteria2 hop_interval_max');
  }
}

export function renderHiddifyNode(node) {
  if (normalizeProtocol(node?.type) === 'snell') throw new Error('Hiddify bundled core does not support Snell');
  validateHiddifyNodeFields(node);
  return renderSingBoxNode(node);
}
export function renderHiddifyOutbound(node) {
  renderHiddifyNode(node);
  return renderSingBoxOutbound(node);
}
