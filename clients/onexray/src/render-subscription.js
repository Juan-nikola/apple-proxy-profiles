import { renderXraySubscription } from "../../../shared/nodes/render-xray-outbound.js";

export function renderOneXraySubscription(options = {}) {
  return renderXraySubscription({ ...options, client: "onexray" });
}
