import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseOneXrayOptions } from "./options.js";
import { renderOneXrayProfile } from "./render-profile.js";
import { resolveOneXrayPolicy } from "./resolve-policy.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseOneXrayOptions({ ...(context.arguments ?? {}), output: "profile" });
  if (typeof context.produceArtifact !== "function") throw new Error("OneXray produceArtifact is unavailable");
  const raw = await context.produceArtifact({ type: options.type, name: options.name, platform: "JSON", produceType: "internal" });
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.onexray);
  if (filtered.nodes.length === 0) throw new Error("OneXray profile: no compatible nodes");
  const policy = await loadSubstorePolicyArtifact(context);
  const unified = policy === null ? null : resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.onexray,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
  });
  const resolution = resolveOneXrayPolicy({
    options,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
    policyResolution: unified,
  });
  const profile = renderOneXrayProfile({ options, nodes: filtered.nodes, resolution });
  return { ...input, $content: `${JSON.stringify(profile, null, 2)}\n` };
}
