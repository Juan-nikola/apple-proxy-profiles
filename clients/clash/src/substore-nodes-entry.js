import { validateCollectionName } from "../../../shared/substore/collection-name.js";
import { argumentsFrom, produceNormalizedNodes, mergedClashDiagnostics, logClashDiagnostics } from "./substore-runtime.js";
import { renderClashSubscription } from "./render-subscription.js";

function nodeArguments(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Clash node arguments must be a plain object");
  const values = new Map(Object.entries(raw));
  if (values.get("output") !== "nodes" || values.get("type") !== "collection") throw new Error("Clash node output must be nodes/collection");
  const name = validateCollectionName(values.get("name"), "Clash node name");
  return Object.freeze({ output: "nodes", type: "collection", name });
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = nodeArguments(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  let renderDiagnostics;
  const content = renderClashSubscription(normalized.nodes, { onDiagnostics(value) { renderDiagnostics = value; } });
  const diagnostics = mergedClashDiagnostics(normalized.diagnostics, renderDiagnostics);
  logClashDiagnostics(context, diagnostics);
  return { ...input, $content: content };
}

