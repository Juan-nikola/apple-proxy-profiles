import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { UNIFIED_POLICY_TARGETS } from "../../../shared/policies/unified-policy.js";
import { renderEgernDns } from "./render-dns.js";
import { renderEgernGroups } from "./render-groups.js";
import { isParsedEgernOptions, parseEgernOptions } from "./options.js";
import { renderEgernRules } from "./render-rules.js";
import { prepareEgernInventory } from "./render-subscription.js";
import { renderYaml } from "./render-yaml.js";
import { assertValidEgernProfile } from "./validate-profile.js";

const BYPASS_TUNNEL_PROXY = Object.freeze([
  "localhost",
  "*.local",
  "*.lan",
  "*.home.arpa",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "224.0.0.0/4",
  "::1/128",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
]);

const REAL_IP_DOMAINS = Object.freeze([
  "*.local",
  "*.lan",
  "*.home.arpa",
  "*.push.apple.com",
]);

function proxyDefaultGroups(groups) {
  const byName = new Map(groups.map((group) => [group.name, group]));
  const visiting = new Set();
  const memo = new Map();

  const followsProxy = (name) => {
    if (name === POLICY_TARGET.primaryProxy) return true;
    if (name === "DIRECT" || name === "REJECT") return false;
    if (memo.has(name)) return memo.get(name);
    if (visiting.has(name)) throw new Error("Invalid Egern QUIC policy graph");
    const group = byName.get(name);
    if (!group) throw new Error("Invalid Egern QUIC policy graph");
    visiting.add(name);
    let result;
    if (group.defaultChoice !== undefined) {
      result = followsProxy(group.defaultChoice);
    } else if (group.candidates.length > 0) {
      result = followsProxy(group.candidates[0]);
    } else {
      result = group.nodeFilter !== null;
    }
    visiting.delete(name);
    memo.set(name, result);
    return result;
  };

  return new Set(groups.filter((group) => followsProxy(group.name)).map((group) => group.name));
}

function applyProxyQuicOverrides(rendered, shared, quicMode) {
  if (quicMode !== "proxy-block") return rendered;
  const proxyDefaults = proxyDefaultGroups(shared);
  return rendered.map((record) => {
    const type = Object.keys(record)[0];
    const fields = record[type];
    if (!proxyDefaults.has(fields.name)) return record;
    return { [type]: { ...fields, block_quic: true } };
  });
}

const POLICY_GROUP_BY_TARGET = Object.freeze(Object.fromEntries(UNIFIED_POLICY_TARGETS.map(({ id, label }) => [id, label])));

function policyValue(record) {
  if (!record || typeof record.resolved !== "string") return null;
  if (record.resolved === "FOLLOW") return "🚀 节点选择";
  return record.resolved;
}

function movePolicyToFront(policies, value) {
  const withoutValue = policies.filter((candidate) => candidate !== value);
  return [value, ...withoutValue];
}

function applyEgernPolicyResolution(rendered, resolution) {
  if (!resolution || typeof resolution !== "object") return rendered;
  const byName = new Map(rendered.map((record) => {
    const type = Object.keys(record)[0];
    return [record[type].name, type];
  }));
  return rendered.map((record) => {
    const type = Object.keys(record)[0];
    const fields = record[type];
    const target = UNIFIED_POLICY_TARGETS.find(({ id }) => POLICY_GROUP_BY_TARGET[id] === fields.name);
    if (!target || !byName.has(fields.name)) return record;
    const value = policyValue(resolution.targets?.[target.id]);
    if (value === null) return record;
    const baselinePolicies = [...(fields.policies ?? [])];
    if (baselinePolicies.length === 0 && value === "🚀 节点选择") return record;
    const policies = movePolicyToFront(baselinePolicies, value);
    return { [type]: { ...fields, policies } };
  });
}

export function renderEgernProfileFromOptions(options, nodes, {
  onDiagnostics,
  policyResolution = null,
  preparedInventory = null,
} = {}) {
  if (!isParsedEgernOptions(options)) throw new Error("Parsed Egern options are required");
  const prepared = preparedInventory ?? prepareEgernInventory(nodes, {
    clientChain: options.clientChain,
    onDiagnostics,
  });
  const sharedGroups = buildPolicyGroups(options, prepared.nodes);
  const renderedGroups = applyEgernPolicyResolution(
    renderEgernGroups(sharedGroups, options.nodeSubscriptionUrl),
    policyResolution,
  );
  const root = {
    ipv6: options.ipv6Mode === "auto",
    block_quic: options.quicMode === "all-block",
    close_connections_on_policy_change: true,
    bypass_tunnel_proxy: [...BYPASS_TUNNEL_PROXY],
    real_ip_domains: [...REAL_IP_DOMAINS],
    hijack_dns: ["*"],
    dns: renderEgernDns(options),
    policy_groups: applyProxyQuicOverrides(renderedGroups, sharedGroups, options.quicMode),
    rules: renderEgernRules({
      publicBaseUrl: options.publicBaseUrl,
      adblockMode: options.adblockMode,
    }),
    default_subscription_group: "🚀 节点选择",
  };
  const yaml = renderYaml(root);
  assertValidEgernProfile(yaml);
  return yaml;
}

export function renderEgernProfile(rawOptions, nodes, context = {}) {
  return renderEgernProfileFromOptions(parseEgernOptions(rawOptions), nodes, context);
}
