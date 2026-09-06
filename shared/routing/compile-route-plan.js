import { buildOutboundGraph } from "./outbound-graph.js";
import { compileRouteIntents } from "./route-intent.js";
import { capabilityDiagnostics } from "./capability-diagnostics.js";

export function compileRoutePlan({ rules = [], nodes = [], policyResolution = null, options = {} } = {}) {
  const intents = compileRouteIntents({ rules, policyResolution, customRules: options.customRules ?? [] });
  const graph = buildOutboundGraph({ nodes, policyResolution, options });
  const diagnostics = capabilityDiagnostics({ core: options.core ?? "xray", detours: true });
  return Object.freeze({ intents, graph, diagnostics });
}
