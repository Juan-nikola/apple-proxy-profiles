import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { buildOneXrayAudit } from "./audit.js";
import { parseOneXrayOptions } from "./options.js";
import { resolveOneXrayPolicy } from "./resolve-policy.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseOneXrayOptions(context.arguments ?? {});
  if (options.output !== "audit") throw new Error("OneXray audit entry requires output=audit");
  if (typeof context.produceArtifact !== "function") throw new Error("OneXray produceArtifact is unavailable");
  const raw = await context.produceArtifact({ type: options.type, name: options.name, platform: "JSON", produceType: "internal" });
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("OneXray source collection is empty");
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.onexray);
  if (filtered.nodes.length === 0) throw new Error("OneXray audit has no compatible nodes");
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
  const audit = buildOneXrayAudit({ options, normalized, filtered, resolution });
  return { ...input, $content: `${JSON.stringify(audit, null, 2)}\n` };
}
