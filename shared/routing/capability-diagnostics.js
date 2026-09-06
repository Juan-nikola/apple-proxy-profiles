export function capabilityDiagnostics({ core = "xray", selectors = true, urlTests = true, detours = true, dynamicRuleSet = true } = {}) {
  const singbox = core === "singbox";
  return Object.freeze({
    core,
    schemaVersion: 1,
    fullGroupSemantics: singbox,
    supported: Object.freeze(["business-routing", "china-ip", "fixed-node"]),
    degraded: Object.freeze(singbox ? [] : ["runtime-selector", "urltest", "dynamic-rule-set"].filter((name) => ({ selectors, urlTests, dynamicRuleSet })[name === "runtime-selector" ? "selectors" : name === "urltest" ? "urlTests" : "dynamicRuleSet"])),
    unsupported: Object.freeze(singbox ? [] : [detours ? null : "detour"].filter(Boolean)),
  });
}
