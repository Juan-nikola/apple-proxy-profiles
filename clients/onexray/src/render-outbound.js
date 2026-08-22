import { renderXrayOutbound } from "../../../shared/nodes/render-xray-outbound.js";

export function renderOneXrayOutbound(node, options = {}) {
  return renderXrayOutbound(node, { ...options, client: "onexray" });
}
