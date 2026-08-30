import { CLIENT } from "../../../shared/contracts.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { argumentsFrom, produceNormalizedNodes, mergedClashDiagnostics, logClashDiagnostics } from "./substore-runtime.js";
import { parseClashOptions } from "./options.js";
import { prepareClashInventory, renderClashProfileFromOptions } from "./render-profile.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseClashOptions(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  let renderDiagnostics;
  const prepared = prepareClashInventory(normalized.nodes, { onDiagnostics(value) { renderDiagnostics = value; } });
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.clash,
    allNodes: normalized.nodes,
    eligibleNodes: prepared.nodes,
  });
  const content = renderClashProfileFromOptions(options, normalized.nodes, {
    preparedInventory: prepared,
    policyResolution,
  });
  const diagnostics = mergedClashDiagnostics(normalized.diagnostics, renderDiagnostics);
  logClashDiagnostics(context, { ...diagnostics, client: CLIENT.clash });
  return { ...input, $content: content };
}
