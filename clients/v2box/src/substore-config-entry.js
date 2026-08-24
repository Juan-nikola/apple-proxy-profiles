import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { CLIENT } from "../../../shared/contracts.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseV2BoxOptions } from "./options.js";
import { renderV2BoxProfile } from "./render-profile.js";

export async function operator(input, targetPlatform, context = {}) {
  const options = parseV2BoxOptions({ ...(context.arguments ?? {}), output: "config" });
  if (targetPlatform !== undefined && targetPlatform !== "JSON" && targetPlatform !== options.platform) {
    throw new Error("V2Box target platform '" + targetPlatform + "' does not match " + options.platform);
  }
  if (typeof context.produceArtifact !== "function") throw new Error("V2Box produceArtifact is unavailable");
  const raw = await context.produceArtifact({ type: "collection", name: options.name, platform: "JSON", produceType: "internal" });
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.v2box);
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.v2box,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
  });
  const profile = renderV2BoxProfile({
    options,
    nodes: filtered.nodes,
    assetManifest: context.assetManifest,
    geoData: context.geoData,
    filterFailures: filtered.diagnostics.excluded,
    policyResolution,
  });
  return { ...input, $content: JSON.stringify(profile, null, 2) + "\n" };
}
