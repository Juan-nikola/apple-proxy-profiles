import { CLIENT } from "../../../shared/contracts.js";
import { argumentsFrom, produceNormalizedNodes, mergedClashDiagnostics, logClashDiagnostics } from "./substore-runtime.js";
import { parseClashOptions } from "./options.js";
import { prepareClashInventory, renderClashProfileFromOptions } from "./render-profile.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseClashOptions(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  let renderDiagnostics;
  const prepared = prepareClashInventory(normalized.nodes, { onDiagnostics(value) { renderDiagnostics = value; } });
  const content = renderClashProfileFromOptions(options, normalized.nodes, { preparedInventory: prepared });
  const diagnostics = mergedClashDiagnostics(normalized.diagnostics, renderDiagnostics);
  logClashDiagnostics(context, { ...diagnostics, client: CLIENT.clash });
  return { ...input, $content: content };
}

