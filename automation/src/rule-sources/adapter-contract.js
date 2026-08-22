import { parseLoyalsoldierRulesDat } from "./loyalsoldier-rules-dat.js";
import { parseV2flyDomainList } from "./v2fly-domain-list.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "../../../shared/rules/external-sources.js";

const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const ADAPTERS = Object.freeze({
  "v2fly-domain-list": parseV2flyDomainList,
  "loyalsoldier-rules-dat": parseLoyalsoldierRulesDat,
});
const ADAPTER_IDS = Object.freeze({
  "v2fly-domain-list": "v2fly-domain-list",
  "loyalsoldier-rules-dat": "loyalsoldier-rules-dat",
});

function validateRequest({ source, text, sourceSha256, retrievedAt }) {
  if (!source || typeof source !== "object" || typeof source.id !== "string") throw new TypeError("External source identity is required");
  if (!COMMIT.test(source.commit ?? "")) throw new TypeError(`External source ${source.id}: full commit is required`);
  if (typeof sourceSha256 !== "string" || !SHA256.test(sourceSha256)) throw new TypeError(`External source ${source.id}: SHA-256 is invalid`);
  if (sourceSha256 !== source.sha256) throw new Error(`External source ${source.id}: SHA-256 does not match catalog`);
  if (typeof retrievedAt !== "string" || Number.isNaN(Date.parse(retrievedAt))) throw new TypeError(`External source ${source.id}: retrieval timestamp is invalid`);
  if (retrievedAt !== source.retrievedAt) throw new Error(`External source ${source.id}: retrieval timestamp does not match catalog`);
  if (!(typeof text === "string" || Buffer.isBuffer(text))) throw new TypeError(`External source ${source.id}: source text is required`);
  if (typeof source.adapter !== "string" || !ADAPTERS[source.adapter]) throw new Error(`External source ${source.id}: unsupported adapter`);
  if (ADAPTER_IDS[source.adapter] !== source.id) throw new Error(`External source ${source.id}: adapter identity does not match catalog`);
  if (source.format !== (source.adapter === "v2fly-domain-list" ? "domain-list-yaml" : "geosite-geoip-dat")) {
    throw new Error(`External source ${source.id}: format does not match adapter`);
  }
  const catalog = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === source.id);
  if (!catalog) throw new Error(`External source ${source.id}: unknown catalog identity`);
  for (const field of ["id", "repository", "branch", "commit", "releaseTag", "sourcePath", "retrievalUrl", "sha256", "retrievedAt", "format", "adapter", "minEntries", "region"]) {
    if (source[field] !== catalog[field]) throw new Error(`External source ${source.id}: catalog metadata mismatch for ${field}`);
  }
}

export function parseExternalRuleSource(request = {}) {
  validateRequest(request);
  const parsed = ADAPTERS[request.source.adapter]({ ...request, sourceId: request.source.id });
  const diagnostics = {
    candidateCount: 0,
    parsedCount: 0,
    unsupportedCount: 0,
    unsupportedByReason: {},
    minEntries: request.source.minEntries,
    sourceSha256: request.sourceSha256,
    ...parsed.diagnostics,
  };
  const seen = new Set();
  let duplicates = 0;
  for (const entry of parsed.entries) {
    const key = `${entry.kind}\0${entry.value}`;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  diagnostics.duplicates = parsed.diagnostics.duplicates ?? duplicates;
  if (diagnostics.candidateCount < request.source.minEntries) throw new Error(`External source ${request.source.id}: entry count below minimum`);
  if (diagnostics.parsedCount + diagnostics.unsupportedCount !== diagnostics.candidateCount) throw new Error(`External source ${request.source.id}: diagnostics accounting mismatch`);
  return Object.freeze({
    sourceId: request.source.id,
    entries: Object.freeze(parsed.entries),
    categories: Object.freeze(parsed.categories ?? []),
    diagnostics: Object.freeze({ ...diagnostics, unsupportedByReason: Object.freeze(diagnostics.unsupportedByReason) }),
    provenance: Object.freeze({
      sourceId: request.source.id,
      repository: request.source.repository,
      branch: request.source.branch,
      commit: request.source.commit,
      releaseTag: request.source.releaseTag,
      retrievalUrl: request.source.retrievalUrl,
      retrievedAt: request.retrievedAt,
      sha256: request.sourceSha256,
    }),
  });
}
