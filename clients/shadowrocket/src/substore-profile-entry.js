import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { parseOptions } from "./options.js";
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
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.shadowrocket);
  if (filtered.nodes.length === 0) {
    throw new Error("No compatible Shadowrocket nodes");
  }

  const profile = renderProfile(options, filtered.nodes, {
    ruleBaseUrl: ruleBaseUrlForChannel(options.channel),
  });
  if (!validateProfile(profile).valid) {
    throw new Error("Generated profile failed validation");
  }
  return { ...input, $content: profile };
}
