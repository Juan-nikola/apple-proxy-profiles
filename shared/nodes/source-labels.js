import { SOURCE_KIND } from "../contracts.js";

const PROVENANCE_FIELDS = [
  "_subDisplayName",
  "_subName",
  "_collectionDisplayName",
  "_collectionName",
];

const SOURCE_LABELS = new Map([
  ["机场", { kind: SOURCE_KIND.airport, label: "机场" }],
  ["自建", { kind: SOURCE_KIND.selfHosted, label: "自建" }],
  ["realm", { kind: SOURCE_KIND.realm, label: "Realm" }],
  ["链式代理", { kind: SOURCE_KIND.serverChain, label: "链式代理" }],
  ["落地", { kind: SOURCE_KIND.landing, label: "落地" }],
]);

const SOURCE_MARKER_PATTERN = /\[(?:\s*未标记\s*|\s*机场\s*|\s*自建\s*|\s*realm\s*|\s*链式代理\s*|\s*落地\s*)\]/giu;

function sourceFromToken(token) {
  const source = SOURCE_LABELS.get(String(token).trim().toLowerCase());
  return source ? { ...source, warning: null } : null;
}

export function sourceFromMarkers(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  for (const match of value.matchAll(/\[([^\]]+)\]/gu)) {
    const source = sourceFromToken(match[1]);
    if (source) return source;
  }
  return null;
}

export function sourceName(node) {
  for (const field of PROVENANCE_FIELDS) {
    const value = node?.[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function classifySource(node) {
  for (const field of PROVENANCE_FIELDS) {
    const value = node?.[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const source = sourceFromMarkers(value);
    if (source) return { ...source, warning: null };
  }

  const source = sourceFromMarkers(node?.name);
  if (source) return { ...source, warning: null };

  return {
    kind: SOURCE_KIND.unknown,
    label: "未知",
    warning: "missing-source-label",
  };
}

export function stripSourceMarkers(name) {
  if (typeof name !== "string" || name.length === 0) return "";
  return name.replaceAll(SOURCE_MARKER_PATTERN, " ");
}
