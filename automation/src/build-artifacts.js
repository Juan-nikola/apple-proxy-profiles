import { createHash } from "node:crypto";

import { buildAnywhereRuleSnapshot, canonicalJson } from "./render-anywhere-rules.js";
import { renderEgernRuleSource } from "./render-egern-rules.js";
import { renderShadowrocketRuleSource } from "./render-shadowrocket-rules.js";
import { parseSurgeRules } from "./parse-surge.js";
import { BLACKMATRIX7_BASELINE, catalogSha256 } from "./source-catalog.js";

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function buildClientArtifacts({
  snapshot,
  catalog,
  upstream = BLACKMATRIX7_BASELINE,
  expectedAnywhereBaseline = null,
  additionalFiles = null,
}) {
  if (!(snapshot instanceof Map) || !Array.isArray(catalog) || catalog.length === 0) {
    throw new TypeError("Complete rule snapshot and catalog are required");
  }
  const parsed = new Map(catalog.map((source) => {
    const fetched = snapshot.get(source.id);
    if (!fetched) throw new Error(`Rule source ${source.id}: missing snapshot input`);
    return [source.id, parseSurgeRules(fetched.text, source)];
  }));
  const files = new Map();
  const clientSources = { shadowrocket: [], egern: [] };
  for (const source of catalog) {
    const input = { source, parsed: parsed.get(source.id), fetched: snapshot.get(source.id), upstream };
    const shadowrocket = renderShadowrocketRuleSource(input);
    const egern = renderEgernRuleSource(input);
    files.set(`shadowrocket/rules/${source.id}.list`, shadowrocket.content);
    files.set(`egern/rules/${source.id}.yaml`, egern.content);
    clientSources.shadowrocket.push({ id: source.id, ...shadowrocket.counts });
    clientSources.egern.push({ id: source.id, ...egern.counts });
  }
  const anywhere = buildAnywhereRuleSnapshot({
    snapshot,
    catalog,
    upstream,
    logicalRuleSets: [...new Set(catalog.map(({ familyId }) => familyId))].map((familyId) => ({
      id: familyId,
      sourceIds: catalog.filter((source) => source.familyId === familyId).map(({ id }) => id),
      required: true,
    })),
    expectedBaseline: expectedAnywhereBaseline,
  });
  for (const [path, content] of anywhere.files) {
    if (files.has(path)) throw new Error(`Duplicate public artifact path: ${path}`);
    files.set(path, content);
  }
  const additions = typeof additionalFiles === "function"
    ? additionalFiles(anywhere.manifest)
    : additionalFiles;
  if (additions !== null) {
    if (!(additions instanceof Map)) throw new TypeError("Additional public files must be a Map");
    for (const [path, content] of additions) {
      if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("..") || typeof content !== "string") {
        throw new TypeError("Additional public file is invalid");
      }
      if (files.has(path)) throw new Error(`Duplicate public artifact path: ${path}`);
      files.set(path, content);
    }
  }

  const fileRecords = [...files].map(([path, content]) => ({
    path,
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
  })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const baseManifest = {
    schemaVersion: 1,
    generatedAt: upstream.committedAt,
    upstream: {
      repository: upstream.repository,
      branch: upstream.branch,
      commit: upstream.commit,
      committedAt: upstream.committedAt,
      license: upstream.license,
    },
    catalogSha256: catalogSha256(catalog),
    clients: {
      shadowrocket: { sourceCount: catalog.length, sources: clientSources.shadowrocket },
      egern: { sourceCount: catalog.length, sources: clientSources.egern },
      anywhere: { ...anywhere.manifest.totals, manifestSha256: anywhere.manifest.manifestSha256 },
    },
    files: fileRecords,
  };
  const manifestHash = sha256(canonicalJson(baseManifest));
  const manifest = { ...baseManifest, manifestHash };
  files.set("manifest.json", canonicalJson(manifest));
  return Object.freeze({ files, manifest: Object.freeze(manifest) });
}
