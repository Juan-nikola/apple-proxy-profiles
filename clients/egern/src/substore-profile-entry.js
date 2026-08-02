import { parseEgernOptions } from "./options.js";
import { renderEgernProfile } from "./render-profile.js";
import {
  argumentsFrom,
  logEgernDiagnostics,
  mergedEgernDiagnostics,
  produceNormalizedNodes,
} from "./substore-runtime.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const rawArguments = argumentsFrom(context);
  const options = parseEgernOptions(rawArguments);
  const normalized = await produceNormalizedNodes(options, context);
  let egernDiagnostics;
  const content = renderEgernProfile(rawArguments, normalized.nodes, {
    onDiagnostics(value) { egernDiagnostics = value; },
  });
  const diagnostics = mergedEgernDiagnostics(normalized.diagnostics, egernDiagnostics);
  logEgernDiagnostics(context, diagnostics);
  return { ...input, $content: content };
}
