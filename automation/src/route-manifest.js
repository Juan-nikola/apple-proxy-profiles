import { createHash } from "node:crypto";

export function buildRouteManifest({ channel, sources = [], generatedAt = new Date().toISOString() } = {}) {
  if (!["edge", "current", "previous"].includes(channel)) throw new Error("Route manifest channel is invalid");
  const records = sources.map((source) => {
    if (!source || typeof source.id !== "string" || typeof source.content !== "string") throw new TypeError("Route manifest source is invalid");
    return { id: source.id, commit: source.commit ?? source.ref ?? null, sha256: source.sha256 ?? createHash("sha256").update(source.content).digest("hex"), license: source.license ?? "UNKNOWN", entries: Number(source.entries ?? 0), diagnostics: source.diagnostics ?? {} };
  });
  return Object.freeze({ schemaVersion: 1, channel, generatedAt, sources: Object.freeze(records) });
}
