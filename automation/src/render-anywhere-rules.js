import { ANYWHERE_SOURCE_BASELINE } from "../../clients/anywhere/src/upstream-contract.js";
import { compileAnywhereRuleSets } from "../../clients/anywhere/src/compile-priority.js";
import { renderArrs, ARRS_TYPE_ID } from "../../clients/anywhere/src/render-arrs.js";
import {
  ANYWHERE_LIGHTWEIGHT_MIGRATION,
  shardRuleSet,
} from "../../clients/anywhere/src/shard-rules.js";
import { RULE_KIND } from "../../shared/rules/model.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-fallback.js";
import { parseSurgeRules } from "./parse-surge.js";
import {
  BLACKMATRIX7_BASELINE,
  LOGICAL_RULE_SETS,
  catalogSha256,
} from "./source-catalog.js";
import { artifactSha256 } from "./artifact-content.js";

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

const POLICY_ROUTING = Object.freeze({
  REJECT: 2,
  DIRECT: 1,
  FOLLOW: 0,
  PROXY: 0,
});

function validateLogicalRuleSets(logicalRuleSets, catalog) {
  if (!Array.isArray(logicalRuleSets) || logicalRuleSets.length === 0) {
    throw new TypeError("Anywhere logical rule sets are required");
  }
  const catalogById = new Map(catalog.map((source) => [source.id, source]));
  const assigned = new Map();
  const normalized = logicalRuleSets.map((logical, index) => {
    if (!logical || typeof logical !== "object" || Array.isArray(logical)) {
      throw new TypeError(`Anywhere logical rule set ${index} must be an object`);
    }
    if (typeof logical.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(logical.id)) {
      throw new TypeError(`Anywhere logical rule set ${index} has an unsafe id`);
    }
    const sourceIds = logical.sourceIds ?? [logical.id];
    if (!Array.isArray(sourceIds) || sourceIds.length === 0
      || sourceIds.some((sourceId) => typeof sourceId !== "string" || !catalogById.has(sourceId))
      || new Set(sourceIds).size !== sourceIds.length) {
      throw new TypeError(`Anywhere logical rule set ${logical.id} has invalid sourceIds`);
    }
    for (const sourceId of sourceIds) {
      if (assigned.has(sourceId)) {
        throw new Error(`Anywhere source ${sourceId} is assigned to multiple logical rule sets`);
      }
      assigned.set(sourceId, logical.id);
    }
    const sources = sourceIds.map((sourceId) => catalogById.get(sourceId));
    const sourceRouting = new Set(sources.map(({ routing }) => routing));
    const explicitRouting = logical.routing;
    const policyRouting = POLICY_ROUTING[logical.policy];
    const routing = explicitRouting ?? policyRouting ?? (
      sourceRouting.size === 1 ? sources[0].routing : undefined
    );
    if (![0, 1, 2].includes(routing)) {
      throw new TypeError(`Anywhere logical rule set ${logical.id} needs an explicit routing`);
    }
    return Object.freeze({
      logical,
      id: logical.id,
      sourceIds: Object.freeze([...sourceIds]),
      sources: Object.freeze(sources),
      routing,
      policy: logical.policy ?? sources[0].policy,
      phase: logical.phase ?? sources[0].phase,
      dnsClass: logical.dnsClass ?? sources[0].dnsClass,
      intendedTarget: logical.intendedTarget ?? logical.defaultTarget ?? sources[0].intendedTarget,
      priority: Math.min(...sources.map(({ priority }) => priority)),
    });
  });
  if (assigned.size !== catalog.length) {
    const missing = catalog.map(({ id }) => id).filter((id) => !assigned.has(id));
    throw new Error(`Anywhere sources are not assigned to a logical rule set: ${missing.join(", ")}`);
  }
  return Object.freeze(normalized);
}

function countEntriesBySource(entries) {
  const counts = new Map();
  for (const entry of entries) counts.set(entry.sourceId, (counts.get(entry.sourceId) ?? 0) + 1);
  return counts;
}

function sumDiagnostics(items, field) {
  return items.reduce((total, item) => total + item.parsed.diagnostics[field], 0);
}

function sumUnsupportedByReason(items) {
  const result = {};
  for (const item of items) addCounts(result, item.parsed.diagnostics.unsupportedByReason);
  return result;
}

function sumIgnoredModifiers(items) {
  return {
    noResolve: items.reduce((total, item) => total + item.parsed.diagnostics.ignoredModifiers.noResolve, 0),
  };
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
  pathPrefix = "anywhere/rules",
  urlPathPrefix = pathPrefix,
  publicBase = PUBLIC_BASE,
  migration = null,
}) {
  if (!(snapshot instanceof Map)) throw new TypeError("Anywhere snapshot must be a Map");
  if (!Array.isArray(catalog) || catalog.length === 0) throw new TypeError("Anywhere catalog is required");
  const logicalDescriptors = validateLogicalRuleSets(logicalRuleSets, catalog);
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
  const parsedById = new Map(parsedSources.map((item) => [item.source.id, item]));
  const compiledById = new Map(compiled.ruleSets.map((ruleSet) => [ruleSet.id, ruleSet]));

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

  for (const item of parsedSources) {
    const { source, fetched, parsed, supplemental } = item;
    addCounts(totalUnsupportedByReason, parsed.diagnostics.unsupportedByReason);
    for (const entry of parsed.entries) {
      if (Object.hasOwn(ARRS_TYPE_ID, entry.kind)) bumpCount(totalConvertibleByKind, entry.kind);
    }
    sourceBytes += fetched.sourceBytes;
    physicalLineCount += parsed.diagnostics.physicalLines;
    commentCount += parsed.diagnostics.comments;
    blankCount += parsed.diagnostics.blank;
    candidateCount += parsed.diagnostics.candidateCount;
    parsedCount += parsed.diagnostics.parsedCount;
    convertibleCount += parsed.diagnostics.convertibleCount;
    unsupportedCount += parsed.diagnostics.unsupportedCount;
    noResolveCount += parsed.diagnostics.ignoredModifiers.noResolve;
    supplementalCount += supplemental.length;
  }

  for (const descriptor of logicalDescriptors) {
    const items = descriptor.sourceIds.map((sourceId) => parsedById.get(sourceId));
    const sourceRuleSets = descriptor.sourceIds.map((sourceId) => compiledById.get(sourceId));
    const entries = sourceRuleSets.flatMap(({ entries: sourceEntries }) => sourceEntries);
    const supplementalItems = items.filter(({ supplemental }) => supplemental.length > 0);
    const supplementalOutput = entries.filter(({ sourceId }) => sourceId === DOMESTIC_FALLBACK_SOURCE_ID).length;
    supplementalOutputCount += supplementalOutput;
    const aggregateSet = {
      id: descriptor.id,
      name: descriptor.logical.name ?? `${descriptor.policy} · ${descriptor.id.replaceAll("_", " ")}`,
      policy: descriptor.policy,
      priority: descriptor.priority,
      routing: descriptor.routing,
      required: descriptor.logical.required,
      entries,
    };
    const sourceShards = shardRuleSet(aggregateSet);
    const shardIds = [];
    for (const shard of sourceShards) {
      const publicPath = `${pathPrefix}/${shard.id}.arrs`;
      const provenance = {
        repository: upstream.repository,
        sourceId: descriptor.id,
        commit: upstream.commit,
        committedAt: upstream.committedAt,
        license: upstream.license,
        changedBy: "Juan-nikola/apple-proxy-profiles",
      };
      const content = renderArrs({ ...shard, provenance });
      files.set(publicPath, content);
      const countsByType = {};
      for (const entry of shard.entries) bumpCount(countsByType, entry.kind);
      shards.push({
        id: shard.id,
        sourceId: descriptor.id,
        sourceIds: descriptor.sourceIds,
        familyId: descriptor.id,
        name: shard.name,
        index: shard.shardIndex,
        total: shard.shardTotal,
        path: publicPath,
        url: `${publicBase}/${urlPathPrefix}/${shard.id}.arrs`,
        entryCount: shard.entries.length,
        sha256: artifactSha256(content),
        countsByType,
      });
      shardIds.push(shard.id);
    }
    const entryCounts = countEntriesBySource(entries);
    const sourceCounts = {
      candidate: sumDiagnostics(items, "candidateCount"),
      parsed: sumDiagnostics(items, "parsedCount"),
      convertible: sumDiagnostics(items, "convertibleCount"),
      unsupported: sumDiagnostics(items, "unsupportedCount"),
      duplicates: descriptor.sourceIds.reduce((total, sourceId) => total + (compiled.diagnostics.duplicates[sourceId] ?? 0), 0),
      shadowed: descriptor.sourceIds.reduce((total, sourceId) => total + (compiled.diagnostics.shadowed[sourceId] ?? 0), 0),
      unresolved: 0,
      output: entries.length,
    };
    if (descriptor.sourceIds.length > 1) sourceCounts.inputSources = descriptor.sourceIds.length;
    if (supplementalItems.length > 0) {
      sourceCounts.supplemental = {
        input: supplementalItems.reduce((total, { supplemental: values }) => total + values.length, 0),
        output: supplementalOutput,
        duplicates: compiled.diagnostics.duplicates[DOMESTIC_FALLBACK_SOURCE_ID] ?? 0,
        shadowed: compiled.diagnostics.shadowed[DOMESTIC_FALLBACK_SOURCE_ID] ?? 0,
      };
    }
    const inputSources = descriptor.sourceIds.map((sourceId) => {
      const { source, fetched, parsed: inputParsed } = parsedById.get(sourceId);
      return {
        id: source.id,
        sourceBytes: fetched.sourceBytes,
        sourceSha256: fetched.sourceSha256,
        candidate: inputParsed.diagnostics.candidateCount,
        parsed: inputParsed.diagnostics.parsedCount,
        convertible: inputParsed.diagnostics.convertibleCount,
        unsupported: inputParsed.diagnostics.unsupportedCount,
        output: entryCounts.get(source.id) ?? 0,
      };
    });
    const firstSource = descriptor.sources[0];
    sources.push({
      id: descriptor.id,
      sourceIds: descriptor.sourceIds,
      inputSources,
      familyId: descriptor.sourceIds.length === 1 ? firstSource.familyId : descriptor.id,
      componentId: descriptor.sourceIds.length === 1 ? firstSource.componentId : "rules",
      order: Math.min(...descriptor.sources.map(({ order }) => order)),
      priority: descriptor.priority,
      canonicalPath: descriptor.sourceIds.length === 1
        ? firstSource.canonicalPath
        : `compiled/Anywhere/${descriptor.id}.arrs`,
      inputFormat: "RULE-SET",
      policy: descriptor.policy,
      phase: descriptor.phase,
      dnsClass: descriptor.dnsClass,
      intendedTarget: descriptor.intendedTarget,
      routing: descriptor.routing,
      minEntries: Math.min(...descriptor.sources.map(({ minEntries }) => minEntries ?? 0)),
      sourceBytes: inputSources.reduce((total, input) => total + input.sourceBytes, 0),
      sourceSha256: descriptor.sourceIds.length === 1
        ? inputSources[0].sourceSha256
        : artifactSha256(canonicalJson(inputSources.map(({ id, sourceSha256 }) => ({ id, sourceSha256 })))),
      provenance: {
        repository: upstream.repository,
        commit: upstream.commit,
        committedAt: upstream.committedAt,
        license: upstream.license,
      },
      counts: sourceCounts,
      unsupportedByReason: sumUnsupportedByReason(items),
      ignoredModifiers: sumIgnoredModifiers(items),
      shardIds,
    });
    outputCount += entries.length;
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
    sourceCount: logicalDescriptors.length,
    inputSourceCount: catalog.length,
    logicalRuleSetCount: logicalDescriptors.length,
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

  if (migration !== null && canonicalJson(migration) !== canonicalJson(ANYWHERE_LIGHTWEIGHT_MIGRATION)) {
    throw new Error("Anywhere migration must match the explicit schema-v2 contract");
  }
  const baseManifest = {
    ...(migration === null ? { schemaVersion: 1 } : migration),
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
    logicalRuleSets: Object.freeze(logicalRuleSets.map((logical) => Object.freeze({
      ...logical,
      sourceIds: Object.freeze([...(logical.sourceIds ?? [logical.id])]),
    }))),
    sources,
    shards,
  };
  const manifestSha256 = artifactSha256(canonicalJson(baseManifest));
  const manifest = { ...baseManifest, manifestSha256 };
  files.set(`${pathPrefix}/manifest.json`, canonicalJson(manifest));
  return Object.freeze({ files, manifest: Object.freeze(manifest) });
}

function bumpCount(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}
