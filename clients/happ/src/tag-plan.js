import { protocolDisplayLabel } from "../../../shared/nodes/protocol-registry.js";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\r\n\u2028\u2029]/gu;
const CONTROL_CHARACTER_TEST = /[\u0000-\u001f\u007f-\u009f\r\n\u2028\u2029]/u;
const DISPLAY_MARKS = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/gu;
const SOURCE_SUFFIX = /\s*[｜|]\s*(?:机场|自建|realm|链式代理|落地)(?=\s*[·|｜]|$)/giu;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/gu;
const URL = /\b(?:https?|ss|vmess|vless|trojan|hysteria2?):\/\/[^\s]+/giu;
const MAX_LABEL_LENGTH = 112;
const MAX_TAG_LENGTH = 180;

function fnv(value) {
  let hash = 2166136261;
  for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function nodeIdFor(node) {
  if (typeof node?._profile?.id === "string" && node._profile.id) return node._profile.id;
  const stable = JSON.stringify({ name: node?.name ?? "", type: node?.type ?? "" });
  return `h-${fnv(stable)}`;
}

function sensitiveValues(node) {
  const values = [];
  const add = (value) => {
    if (typeof value === "string" && value.length > 2) values.push(value);
  };
  for (const key of ["server", "uuid", "password", "psk", "token", "private-key", "private_key"]) add(node?.[key]);
  const reality = node?.["reality-opts"] ?? node?.reality;
  for (const key of ["public-key", "publicKey", "short-id", "shortId", "spider-x", "spiderX", "_spider-x"]) add(reality?.[key]);
  return values;
}

function safeDisplayLabel(node) {
  let value = String(node?.name ?? "未命名节点").normalize("NFKC");
  for (const secret of sensitiveValues(node)) value = value.replaceAll(secret, " ");
  value = value
    .replace(URL, " ")
    .replace(UUID, " ")
    .replace(IPV4, " ")
    .replace(DISPLAY_MARKS, " ")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/[\\/]+/gu, " ")
    .replace(/\s*\[\s*(?:udp|未标记|已有链)\s*\]/giu, " ")
    .replace(SOURCE_SUFFIX, " ")
    .replace(/\s*·\s*/gu, " · ")
    .replace(/\s+/gu, " ")
    .trim();

  const profile = node?._profile ?? {};
  const protocol = String(profile.protocolLabel ?? protocolDisplayLabel(node?.type)).trim();
  if (protocol && !new RegExp(`(?:^|[ ·｜|])${protocol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[ ·｜|])`, "iu").test(value)) {
    value = `${value} · ${protocol}`.trim();
  }
  if (profile.udp === true && !/(?:^|[ ·])U$/u.test(value)) value = `${value} · U`.trim();
  value = value.replace(/[·｜|\s]+$/gu, "").trim() || "未命名节点";
  return value.slice(0, MAX_LABEL_LENGTH).trim();
}

function shortId(nodeId) {
  return fnv(nodeId).slice(-7);
}

function validateTag(tag) {
  if (typeof tag !== "string" || tag.length === 0 || tag.length > MAX_TAG_LENGTH || tag !== tag.trim()) {
    throw new Error("Happ tag is empty or too long");
  }
  const separator = tag.indexOf("/");
  const label = separator === -1 ? "" : tag.slice(separator + 1);
  if (CONTROL_CHARACTER_TEST.test(tag)
    || tag.includes("\\")
    || label.includes("/")
    || !/^happ-[a-z0-9-]+(?:\/[\p{L}\p{N}\p{P}\p{S}\p{Zs}]+)?$/u.test(tag)) {
    throw new Error("Happ tag contains unsafe characters");
  }
  return tag;
}

export function validateHappTag(tag) {
  return validateTag(tag);
}

export function createHappTagPlan(nodes = []) {
  const entries = [];
  const seenIds = new Set();
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (!node || typeof node !== "object") continue;
    const id = nodeIdFor(node);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    entries.push({ id, node, label: safeDisplayLabel(node) });
  }
  const counts = new Map();
  for (const entry of entries) counts.set(entry.label, (counts.get(entry.label) ?? 0) + 1);
  const byId = new Map(entries.map((entry) => [entry.id, {
    ...entry,
    label: counts.get(entry.label) > 1 ? `${entry.label} #${shortId(entry.id)}` : entry.label,
  }]));
  const entryFor = (nodeId) => {
    const entry = byId.get(nodeId);
    if (!entry) throw new Error(`Unknown Happ node '${nodeId}'`);
    return entry;
  };
  return Object.freeze({
    follow(nodeId) { return validateTag(`happ-follow/${entryFor(nodeId).label}`); },
    fixedCandidate(nodeId) { return validateTag(`happ-fixed/${entryFor(nodeId).label} [candidate]`); },
    fixedBalancer(nodeId) { return validateTag(`happ-fixed/${entryFor(nodeId).label} [balancer]`); },
    nodeLabel(nodeId) { return entryFor(nodeId).label; },
    has(nodeId) { return byId.has(nodeId); },
  });
}
