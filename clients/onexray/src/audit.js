function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export function buildOneXrayAudit({ options = {}, normalized = null, filtered = null, resolution = null } = {}) {
  const targets = Object.fromEntries(Object.entries(resolution?.targets ?? {}).map(([id, target]) => [id, {
    status: target.status,
    configuredKind: target.configured === "DIRECT" ? "DIRECT" : target.configured === "FOLLOW" ? "FOLLOW" : "NODE",
    resolvedKind: target.resolvedTag === "direct" ? "DIRECT" : target.resolvedTag === "proxy" ? "FOLLOW" : "NODE",
  }]));
  return freeze({
    schemaVersion: 1,
    client: "onexray",
    output: "audit",
    channel: options.channel ?? "current",
    counts: {
      inputNodes: normalized?.diagnostics?.total ?? 0,
      eligibleNodes: filtered?.nodes?.length ?? 0,
      fixedNodes: resolution?.fixedNodes?.length ?? 0,
    },
    chain: { enabled: resolution?.chain?.enabled === true, entryCount: resolution?.chain?.entryCount ?? 0 },
    targets,
  });
}
