import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { partitionRenderableNodes } from "../../../shared/nodes/renderability.js";
import { renderYaml } from "../../../shared/serialization/render-yaml.js";
import { renderClashDns } from "./render-dns.js";
import { isParsedClashOptions, parseClashOptions } from "./options.js";
import { renderClashRules } from "./render-rules.js";
import { toClashProxy } from "./render-node.js";
import { validateClashProfile } from "./validate-profile.js";

const TEST_URL = "http://www.gstatic.com/generate_204";

export function prepareClashInventory(nodes, { onDiagnostics } = {}) {
  if (!Array.isArray(nodes)) throw new Error("Clash node inventory must be an array");
  const partitioned = partitionRenderableNodes(nodes, "Clash", toClashProxy);
  const seen = new Set();
  const proxies = partitioned.renderable.map((node) => {
    const proxy = toClashProxy(node);
    if (seen.has(proxy.name)) throw new Error("Duplicate Clash proxy name");
    seen.add(proxy.name);
    return proxy;
  });
  const diagnostics = { accepted: proxies.length, excluded: partitioned.failureProtocols };
  if (Object.keys(partitioned.failureProtocols).length > 0) diagnostics.renderFailures = partitioned.failureProtocols;
  onDiagnostics?.(structuredClone(diagnostics));
  return { nodes: partitioned.renderable, proxies, diagnostics };
}

function filterNodes(filter, nodes) {
  if (filter === null) return [];
  let pattern;
  try {
    pattern = new RegExp(filter, "u");
  } catch {
    throw new Error("Invalid Clash policy filter");
  }
  return nodes.filter((node) => pattern.test(node.name)).map((node) => toClashProxy(node).name);
}

function targetName(value) {
  return value === POLICY_TARGET.primaryProxy ? "⚡ 全部自动" : value;
}

function candidateList(policyGroup, nodes) {
  const candidates = [
    ...policyGroup.candidates.map(targetName),
    ...filterNodes(policyGroup.nodeFilter, nodes),
  ];
  return candidates.filter((item, index, all) => all.indexOf(item) === index);
}

function renderPolicyGroup(policyGroup, nodes) {
  let candidates = candidateList(policyGroup, nodes);
  if (policyGroup.kind === "ai" && candidates[0] !== "⚡ 全部自动") candidates.unshift("⚡ 全部自动");
  if (policyGroup.defaultChoice !== undefined) {
    const defaultChoice = targetName(policyGroup.defaultChoice);
    if (candidates.includes(defaultChoice)) {
      candidates = [defaultChoice, ...candidates.filter((candidate) => candidate !== defaultChoice)];
    }
  }
  if (candidates.length === 0) candidates = ["DIRECT"];

  if (policyGroup.strategy === "auto-test") {
    return {
      name: policyGroup.name,
      type: "url-test",
      proxies: candidates,
      url: policyGroup.test?.url || TEST_URL,
      interval: Number(policyGroup.test?.interval ?? 600),
      tolerance: Number(policyGroup.test?.tolerance ?? 100),
      ...(policyGroup.hidden ? { hidden: true } : {}),
    };
  }

  return {
    name: policyGroup.name,
    type: "select",
    proxies: candidates,
    ...(policyGroup.hidden ? { hidden: true } : {}),
  };
}

export function renderClashGroups(nodes, options, policyResolution = null) {
  return buildPolicyGroups(options, nodes, policyResolution).map((policyGroup) => renderPolicyGroup(policyGroup, nodes));
}

export function renderClashProfileFromOptions(options, nodes, { onDiagnostics, policyResolution = null, preparedInventory = null } = {}) {
  if (!isParsedClashOptions(options)) throw new Error("Parsed Clash options are required");
  const prepared = preparedInventory || prepareClashInventory(nodes, { onDiagnostics });
  if (prepared.proxies.length === 0) throw new Error("No compatible Clash nodes");
  const renderedRules = renderClashRules({ publicBaseUrl: options.publicBaseUrl, adblockMode: options.adblockMode });
  const root = {
    "mixed-port": 7890,
    "allow-lan": false,
    mode: "rule",
    "log-level": "warning",
    ipv6: options.ipv6Mode === "auto",
    "disable-quic": options.quicMode === "all-block",
    "unified-delay": true,
    "tcp-concurrent": true,
    profile: { "store-selected": true, "store-fake-ip": true },
    sniffer: { enable: true, "parse-pure-ip": true, "override-destination": true },
    tun: { enable: true, stack: "mixed", "auto-route": true, "auto-detect-interface": true },
    proxies: prepared.proxies,
    "proxy-groups": renderClashGroups(prepared.nodes, options, policyResolution),
    "rule-providers": renderedRules.providers,
    dns: renderClashDns(options),
    rules: renderedRules.rules,
  };
  const yaml = renderYaml(root);
  const validation = validateClashProfile(yaml);
  if (!validation.valid) throw new Error("Invalid generated Clash profile: " + validation.errors.join(", "));
  return yaml;
}

export function renderClashProfile(rawOptions, nodes, context = {}) {
  return renderClashProfileFromOptions(parseClashOptions(rawOptions), nodes, context);
}
