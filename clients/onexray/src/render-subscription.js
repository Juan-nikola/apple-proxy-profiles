import { renderOneXrayOutbound } from "./render-outbound.js";

export function renderOneXraySubscription({ nodes } = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("OneXray subscription cannot be empty");
  const names = new Set();
  const outbounds = nodes.map((node, index) => {
    if (names.has(node.name)) throw new Error("OneXray subscription contains duplicate node names");
    names.add(node.name);
    const rendered = renderOneXrayOutbound(node, { tag: `ap-node-${index.toString(36)}` });
    return { ...rendered, tag: node.name };
  });
  return `${JSON.stringify({ outbounds })}\n`;
}
