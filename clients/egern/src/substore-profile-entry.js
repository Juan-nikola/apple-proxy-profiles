import { parseEgernOptions } from "./options.js";
import { renderEgernProfileFromOptions } from "./render-profile.js";
import { installEgernRuntimeFallbacks } from "./runtime-fallbacks.js";
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
  const content = renderEgernProfileFromOptions(options, normalized.nodes, {
    onDiagnostics(value) { egernDiagnostics = value; },
  });
  const diagnostics = mergedEgernDiagnostics(normalized.diagnostics, egernDiagnostics);
  logEgernDiagnostics(context, diagnostics);
  return { ...input, $content: content };
}
