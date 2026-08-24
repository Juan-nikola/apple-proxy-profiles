import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { buildHappAudit } from "./audit.js";
import { parseHappOptions } from "./options.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseHappOptions(context.arguments ?? {});
  if (options.output !== "audit") throw new Error("HAPP audit entry requires output=audit");
  if (typeof context.produceArtifact !== "function") throw new Error("HAPP produceArtifact is unavailable");
  const raw = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("HAPP source collection is empty");
  const normalized = normalizeNodes(raw, { clientChain: "off" });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.happ);
  if (filtered.nodes.length === 0) throw new Error("HAPP audit has no compatible nodes");
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: "current",
    client: CLIENT.happ,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
  });
  const audit = buildHappAudit({
    options,
    policyResolution,
    eligibleNodes: filtered.nodes,
    configs: [],
  });
  return { ...input, $content: `${JSON.stringify(audit, null, 2)}\n` };
}
