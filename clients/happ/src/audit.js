const unsafe = /password|passwd|uuid|token|secret|credential|server|address|port|subscriptionurl|publickey|header/i;
function safeTarget(target) { return { configured: target.configured, resolved: target.resolved, status: target.status, warningCode: target.warningCode ?? null, ...(target.nodeId ? { nodeId: target.nodeId } : {}) }; }
export function buildHappAudit({ options = {}, policyResolution = {}, configs = [], eligibleNodes = null } = {}) {
  const targets = Object.fromEntries(Object.entries(policyResolution.targets ?? {}).map(([key, value]) => [key, safeTarget(value)]));
  const count = Array.isArray(eligibleNodes) ? eligibleNodes.length : configs.length;
  const audit = { schemaVersion: 1, client: "happ", output: "audit", platform: options.platform ?? "all", channel: "current", counts: { configs: configs.length || count, eligibleNodes: count, fixedNodes: (policyResolution.fixedNodes ?? []).length, warnings: (policyResolution.warnings ?? []).length }, targets, warnings: (policyResolution.warnings ?? []).map(({ businessKey, warningCode }) => ({ businessKey, warningCode })) };
  if (unsafe.test(JSON.stringify(audit))) throw new Error("Happ audit contains sensitive field");
  return Object.freeze(audit);
}
