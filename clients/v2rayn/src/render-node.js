import { renderXrayOutbound, renderXraySubscription, renderXrayNodeError } from "../../../shared/nodes/render-xray-outbound.js";
export { renderXrayOutbound, renderXraySubscription, renderXrayNodeError };
export function renderV2rayNSubscription({ nodes }) { return renderXraySubscription({ nodes, client: "v2rayn" }); }
