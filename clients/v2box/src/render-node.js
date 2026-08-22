import { renderXrayOutbound, renderXraySubscription, renderXrayNodeError } from "../../../shared/nodes/render-xray-outbound.js";
export { renderXrayOutbound, renderXraySubscription, renderXrayNodeError };
export function renderV2BoxSubscription({ nodes }) { return renderXraySubscription({ nodes, client: "v2box" }); }
export const renderV2rayNSubscription = renderV2BoxSubscription;
