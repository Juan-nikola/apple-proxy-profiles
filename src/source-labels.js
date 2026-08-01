import { SOURCE_KIND } from "./contracts.js";

const PROVENANCE_FIELDS = [
  "_subDisplayName",
  "_subName",
  "_collectionDisplayName",
  "_collectionName",
];

const SOURCE_LABELS = new Map([
  ["机场", { kind: SOURCE_KIND.airport, label: "[机场]" }],
  ["自建", { kind: SOURCE_KIND.selfHosted, label: "[自建]" }],
  ["realm", { kind: SOURCE_KIND.realm, label: "[Realm]" }],
  ["链式代理", { kind: SOURCE_KIND.serverChain, label: "[链式代理]" }],
  ["落地", { kind: SOURCE_KIND.landing, label: "[落地]" }],
]);

export function sourceName(node) {
  for (const field of PROVENANCE_FIELDS) {
    const value = node?.[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function classifySource(node) {
  const match = sourceName(node).match(/^\s*\[([^\]]+)\]/i);
  const source = match && SOURCE_LABELS.get(match[1].trim().toLowerCase());

  if (source) return { ...source, warning: null };

  return {
    kind: SOURCE_KIND.unknown,
    label: "[未标记]",
    warning: "missing-source-label",
  };
}

