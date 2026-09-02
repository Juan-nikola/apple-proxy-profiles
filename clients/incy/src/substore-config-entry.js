import { CLIENT } from "../../../shared/contracts.js";
import { identityKey } from "../../../shared/nodes/node-identity.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseIncyOptions } from "./options.js";
import { renderIncySubscription } from "./render-subscription.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseIncyOptions({ ...(context.arguments ?? {}), output: "config", type: "collection" });
  if (typeof context.produceArtifact !== "function") {
    throw new Error("INCY produceArtifact is unavailable");
  }
  const raw = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("INCY source collection is empty");
  }
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  if (normalized.nodes.length !== raw.length) {
    const excluded = Object.entries(normalized.diagnostics.excluded ?? {})
      .map(([reason, count]) => `${reason}=${count}`)
      .join(",");
    throw new Error(`INCY cannot render selected protocols: ${excluded || "unknown"}`);
  }
  const normalizedById = new Map(normalized.nodes.map((node) => [identityKey(node), node]));
  const orderedNodes = raw.map((node) => normalizedById.get(identityKey(node))).filter(Boolean);
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.incy,
    allNodes: orderedNodes,
    eligibleNodes: orderedNodes,
  });
  const configs = renderIncySubscription({
    nodes: orderedNodes,
    options,
    policyResolution,
  });
  return { ...input, $content: `${JSON.stringify(configs, null, 2)}\n` };
}
