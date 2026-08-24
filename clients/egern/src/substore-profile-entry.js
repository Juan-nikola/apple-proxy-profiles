import { parseEgernOptions } from "./options.js";
import { renderEgernProfileFromOptions } from "./render-profile.js";
import { prepareEgernInventory } from "./render-subscription.js";
import { installEgernRuntimeFallbacks } from "./runtime-fallbacks.js";
import { CLIENT } from "../../../shared/contracts.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import {
  argumentsFrom,
  logEgernDiagnostics,
  mergedEgernDiagnostics,
  produceNormalizedNodes,
} from "./substore-runtime.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  installEgernRuntimeFallbacks();
  const options = parseEgernOptions(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  let egernDiagnostics;
  const prepared = prepareEgernInventory(normalized.nodes, {
    clientChain: options.clientChain,
    onDiagnostics(value) { egernDiagnostics = value; },
  });
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = policy === null
    ? null
    : resolveUnifiedPolicy({
      policy,
      channel: options.channel,
      client: CLIENT.egern,
      allNodes: normalized.nodes,
      eligibleNodes: prepared.nodes,
    });
  const content = renderEgernProfileFromOptions(options, normalized.nodes, {
    preparedInventory: prepared,
    policyResolution,
  });
  const diagnostics = mergedEgernDiagnostics(normalized.diagnostics, egernDiagnostics);
  logEgernDiagnostics(context, diagnostics);
  return { ...input, $content: content };
}
