import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { CLIENT } from "../../../shared/contracts.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseOptions } from "./options.js";
import { partitionShadowrocketNodeSet } from "./render-node.js";
import { renderProfile } from "./render-profile.js";
import { ruleBaseUrlForChannel } from "./render-rules.js";
import { validateProfile } from "./validate-profile.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseOptions(context.arguments ?? {});
  if (options.output !== "config") throw new Error("output must be config");
  if (typeof context.produceArtifact !== "function") {
    throw new Error("produceArtifact is unavailable");
  }

  const nodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("produceArtifact must return a non-empty node array");
  }

  const normalized = normalizeNodes(nodes, { clientChain: options.clientChain });
  const partitioned = partitionShadowrocketNodeSet(normalized.nodes);
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.shadowrocket,
    allNodes: normalized.nodes,
    eligibleNodes: partitioned.renderable,
  });

  const profile = renderProfile(options, partitioned.renderable, {
    ruleBaseUrl: ruleBaseUrlForChannel(options.channel),
    policyResolution,
  });
  if (!validateProfile(profile).valid) {
    throw new Error("Generated profile failed validation");
  }
  return { ...input, $content: profile };
}
