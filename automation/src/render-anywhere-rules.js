import { createHash } from "node:crypto";

import { ANYWHERE_SOURCE_BASELINE } from "../../clients/anywhere/src/upstream-contract.js";
import { compileAnywhereRuleSets } from "../../clients/anywhere/src/compile-priority.js";
import { renderArrs, ARRS_TYPE_ID } from "../../clients/anywhere/src/render-arrs.js";
import { shardRuleSet } from "../../clients/anywhere/src/shard-rules.js";
import { RULE_KIND } from "../../shared/rules/model.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-fallback.js";
import { parseSurgeRules } from "./parse-surge.js";
import {
  BLACKMATRIX7_BASELINE,
  LOGICAL_RULE_SETS,
  catalogSha256,
} from "./source-catalog.js";

const PUBLIC_BASE = "https://juan-nikola.github.io/apple-proxy-profiles/current";
const DOMESTIC_FALLBACK_SOURCE_ID = "DomesticFallback";

function domesticFallbackEntries(source) {
  if (source.id !== "ChinaMax_Domain") return [];
  return DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.map((value) => ({
    kind: RULE_KIND.domainSuffix,
    value,
    sourceId: DOMESTIC_FALLBACK_SOURCE_ID,
  }));
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

function addCounts(target, source) {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value;
}

function ruleSetName(source) {
  const displayId = source.id.replaceAll("_", " ");
  return `${source.policy} · ${displayId}`;
}

function verifyPinnedBaseline(parsedSources, snapshot, expected) {
  if (!expected) return;
  const totals = {
    sourceBytes: 0,
    comments: 0,
    blank: 0,
    candidateCount: 0,
    convertibleCount: 0,
    unsupportedCount: 0,
    ignoredModifiers: { noResolve: 0 },
  };
  for (const item of parsedSources) {
    totals.sourceBytes += snapshot.get(item.source.id).sourceBytes;
    for (const key of ["comments", "blank", "candidateCount", "convertibleCount", "unsupportedCount"]) {
      totals[key] += item.parsed.diagnostics[key];
    }
    totals.ignoredModifiers.noResolve += item.parsed.diagnostics.ignoredModifiers.noResolve;
    const actual = [
      item.parsed.diagnostics.candidateCount,
      item.parsed.diagnostics.convertibleCount,
      item.parsed.diagnostics.unsupportedCount,
    ];
    if (JSON.stringify(actual) !== JSON.stringify(expected.sources[item.source.id])) {
      throw new Error(`Pinned rule baseline changed for ${item.source.id}`);
    }
  }
  for (const key of ["sourceBytes", "comments", "blank", "candidateCount", "convertibleCount", "unsupportedCount"]) {
    if (totals[key] !== expected[key]) throw new Error(`Pinned rule baseline changed for ${key}`);
  }
  if (totals.ignoredModifiers.noResolve !== expected.ignoredModifiers.noResolve) {
    throw new Error("Pinned rule baseline changed for ignored modifiers");
  }
}

export function buildAnywhereRuleSnapshot({
  snapshot,
  catalog,
  upstream = BLACKMATRIX7_BASELINE,
  logicalRuleSets = LOGICAL_RULE_SETS,
  expectedBaseline = null,
}) {
  if (!(snapshot instanceof Map)) throw new TypeError("Anywhere snapshot must be a Map");
  if (!Array.isArray(catalog) || catalog.length === 0) throw new TypeError("Anywhere catalog is required");
  const parsedSources = catalog.map((source) => {
    const fetched = snapshot.get(source.id);
    if (!fetched) throw new Error(`Rule source ${source.id}: missing snapshot input`);
    return {
      source,
      fetched,
      parsed: parseSurgeRules(fetched.text, source),
      supplemental: domesticFallbackEntries(source),
    };
  });
  verifyPinnedBaseline(parsedSources, snapshot, expectedBaseline);

  const compiled = compileAnywhereRuleSets(parsedSources.map(({ source, parsed, supplemental }) => ({
    id: source.id,
    sourceId: source.id,
    familyId: source.familyId,
    name: ruleSetName(source),
    policy: source.policy,
    priority: source.priority,
    routing: source.routing,
    required: true,
    entries: [...parsed.entries, ...supplemental],
  })));

  const files = new Map();
  const shards = [];
  const sources = [];
  const totalUnsupportedByReason = {};
  const totalConvertibleByKind = {};
  let sourceBytes = 0;
  let physicalLineCount = 0;
  let commentCount = 0;
  let blankCount = 0;
  let candidateCount = 0;
  let parsedCount = 0;
  let convertibleCount = 0;
  let unsupportedCount = 0;
  let outputCount = 0;
  let noResolveCount = 0;
  let supplementalCount = 0;
  let supplementalOutputCount = 0;

  for (const [index, item] of parsedSources.entries()) {
    const { source, fetched, parsed, supplemental } = item;
    const compiledSet = compiled.ruleSets[index];
    const sourceShards = shardRuleSet({ ...compiledSet, required: false });
    const unsupportedByReason = { ...parsed.diagnostics.unsupportedByReason };
    addCounts(totalUnsupportedByReason, unsupportedByReason);
    for (const entry of parsed.entries) {
      if (Object.hasOwn(ARRS_TYPE_ID, entry.kind)) bumpCount(totalConvertibleByKind, entry.kind);
    }
    const shardIds = [];
    for (const shard of sourceShards) {
      const publicPath = `anywhere/rules/${shard.id}.arrs`;
      const provenance = {
        repository: upstream.repository,
        sourceId: source.id,
        commit: upstream.commit,
        committedAt: upstream.committedAt,
        license: upstream.license,
        changedBy: "Juan-nikola/apple-proxy-profiles",
      };
      const content = renderArrs({ ...shard, provenance });
      files.set(publicPath, content);
      const countsByType = {};
      for (const entry of shard.entries) bumpCount(countsByType, entry.kind);
      const record = {
        id: shard.id,
        sourceId: source.id,
        familyId: source.familyId,
        name: shard.name,
        index: shard.shardIndex,
        total: shard.shardTotal,
        path: publicPath,
        url: `${PUBLIC_BASE}/${publicPath}`,
        entryCount: shard.entries.length,
        sha256: sha256(content),
        countsByType,
      };
      shards.push(record);
      shardIds.push(shard.id);
    }
    const sourceOutputCount = compiledSet.entries.length;
    const sourceSupplementalOutputCount = compiledSet.entries
      .filter((entry) => entry.sourceId === DOMESTIC_FALLBACK_SOURCE_ID)
      .length;
    supplementalCount += supplemental.length;
    supplementalOutputCount += sourceSupplementalOutputCount;
    const sourceCounts = {
      candidate: parsed.diagnostics.candidateCount,
      parsed: parsed.diagnostics.parsedCount,
      convertible: parsed.diagnostics.convertibleCount,
      unsupported: parsed.diagnostics.unsupportedCount,
      duplicates: compiled.diagnostics.duplicates[source.id] ?? 0,
      shadowed: compiled.diagnostics.shadowed[source.id] ?? 0,
      unresolved: 0,
      output: sourceOutputCount,
    };
    if (supplemental.length > 0) {
      sourceCounts.supplemental = {
        input: supplemental.length,
        output: sourceSupplementalOutputCount,
        duplicates: compiled.diagnostics.duplicates[DOMESTIC_FALLBACK_SOURCE_ID] ?? 0,
        shadowed: compiled.diagnostics.shadowed[DOMESTIC_FALLBACK_SOURCE_ID] ?? 0,
      };
    }
    sources.push({
      id: source.id,
      familyId: source.familyId,
      componentId: source.componentId,
      order: source.order,
      priority: source.priority,
      canonicalPath: source.canonicalPath,
      inputFormat: source.inputFormat,
      policy: source.policy,
      intendedTarget: source.intendedTarget,
      routing: source.routing,
      minEntries: source.minEntries,
      sourceBytes: fetched.sourceBytes,
      sourceSha256: fetched.sourceSha256,
      counts: sourceCounts,
      unsupportedByReason,
      ignoredModifiers: parsed.diagnostics.ignoredModifiers,
      shardIds,
    });
    sourceBytes += fetched.sourceBytes;
    physicalLineCount += parsed.diagnostics.physicalLines;
    commentCount += parsed.diagnostics.comments;
    blankCount += parsed.diagnostics.blank;
    candidateCount += parsed.diagnostics.candidateCount;
    parsedCount += parsed.diagnostics.parsedCount;
    convertibleCount += parsed.diagnostics.convertibleCount;
    unsupportedCount += parsed.diagnostics.unsupportedCount;
    outputCount += sourceOutputCount;
    noResolveCount += parsed.diagnostics.ignoredModifiers.noResolve;
  }

  const duplicateCount = Object.values(compiled.diagnostics.duplicates).reduce((sum, count) => sum + count, 0);
  const shadowedCount = Object.values(compiled.diagnostics.shadowed).reduce((sum, count) => sum + count, 0);
  if (outputCount !== convertibleCount - duplicateCount - shadowedCount + supplementalCount) {
    throw new Error("Anywhere rule output accounting mismatch");
  }
  if (expectedBaseline?.compiled) {
    const actualCompiled = {
      duplicateCount,
      shadowedCount,
      outputCount,
      shardCount: shards.length,
      zeroOutputSources: sources.filter(({ counts }) => counts.output === 0).map(({ id }) => id),
    };
    if (canonicalJson(actualCompiled) !== canonicalJson(expectedBaseline.compiled)) {
      throw new Error("Pinned compiled rule baseline changed");
    }
  }
  const totals = {
    sourceCount: catalog.length,
    logicalRuleSetCount: logicalRuleSets.length,
    sourceBytes,
    physicalLineCount,
    commentCount,
    blankCount,
    candidateCount,
    parsedCount,
    convertibleCount,
    unsupportedCount,
    duplicateCount,
    shadowedCount,
    unresolvedCount: 0,
    outputCount,
    shardCount: shards.length,
    convertibleByKind: totalConvertibleByKind,
    unsupportedByReason: totalUnsupportedByReason,
    ignoredModifiers: { noResolve: noResolveCount },
  };
  if (supplementalCount > 0) {
    totals.supplementalCount = supplementalCount;
    totals.supplementalOutputCount = supplementalOutputCount;
  }

  const baseManifest = {
    schemaVersion: 1,
    generatorVersion: "0.1.0",
    clientCompatibility: {
      repository: ANYWHERE_SOURCE_BASELINE.repository,
      commit: ANYWHERE_SOURCE_BASELINE.commit,
    },
    upstream: {
      repository: upstream.repository,
      branch: upstream.branch,
      commit: upstream.commit,
      committedAt: upstream.committedAt,
      license: upstream.license,
    },
    generatedAt: upstream.committedAt,
    catalogSha256: catalogSha256(catalog),
    totals,
    logicalRuleSets,
    sources,
    shards,
  };
  const manifestSha256 = sha256(canonicalJson(baseManifest));
  const manifest = { ...baseManifest, manifestSha256 };
  files.set("anywhere/rules/manifest.json", canonicalJson(manifest));
  return Object.freeze({ files, manifest: Object.freeze(manifest) });
}

function bumpCount(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}
