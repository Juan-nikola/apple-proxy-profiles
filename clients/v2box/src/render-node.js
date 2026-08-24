import { renderXrayOutbound, renderXraySubscription, renderXrayNodeError } from "../../../shared/nodes/render-xray-outbound.js";
export { renderXrayOutbound, renderXraySubscription, renderXrayNodeError };

export function renderV2BoxOutbound(node, options = {}) {
  const outbound = renderXrayOutbound(node, { ...options, client: "v2box" });
  delete outbound.name;
  return outbound;
}

export function renderV2BoxSubscription({ nodes }) {
  const payload = JSON.parse(renderXraySubscription({ nodes, client: "v2box" }));
  payload.outbounds = payload.outbounds.map(({ name: _displayName, ...outbound }) => outbound);
  return JSON.stringify(payload) + "\n";
}
