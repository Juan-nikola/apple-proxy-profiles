import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { parseOneXrayOptions } from "./options.js";
import { renderOneXraySubscription } from "./render-subscription.js";
import { resolveOneXrayPolicy } from "./resolve-policy.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseOneXrayOptions({ ...(context.arguments ?? {}), output: "nodes" });
  if (typeof context.produceArtifact !== "function") throw new Error("OneXray produceArtifact is unavailable");
  const raw = await context.produceArtifact({ type: options.type, name: options.name, platform: "JSON", produceType: "internal" });
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.onexray);
  if (filtered.nodes.length === 0) throw new Error("OneXray nodes: no compatible nodes");
  const resolution = resolveOneXrayPolicy({ options, allNodes: normalized.nodes, eligibleNodes: filtered.nodes });
  return { ...input, $content: renderOneXraySubscription({ nodes: resolution.homepageNodes }) };
}
