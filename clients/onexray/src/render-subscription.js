import { renderOneXrayOutbound } from "./render-outbound.js";

function homepageNodesFrom(resolution) {
  if (!resolution || typeof resolution !== "object" || !Array.isArray(resolution.homepageNodes)) {
    throw new Error("Invalid OneXray homepage resolution");
  }
  if (resolution.homepageNodes.length === 0) {
    throw new Error("No compatible OneXray homepage nodes");
  }
  return resolution.homepageNodes;
}

export function renderOneXraySubscription(resolution) {
  const tags = new Set();
  const names = new Set();
  const outbounds = homepageNodesFrom(resolution).map((node) => {
    if (typeof node?.name !== "string" || node.name.length === 0) {
      throw new Error("Invalid OneXray homepage node name");
    }
    if (names.has(node.name)) throw new Error("Duplicate OneXray homepage node name");
    names.add(node.name);
    return renderOneXrayOutbound(node, {
      tag: node.name,
      tags,
      allowDisplayTag: true,
    });
  });
  return `${JSON.stringify({ outbounds })}\n`;
}
