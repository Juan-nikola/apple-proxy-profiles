import { partitionRenderableNodes } from "../../../shared/nodes/renderability.js";
import { renderYaml } from "../../../shared/serialization/render-yaml.js";
import { renderClashDns } from "./render-dns.js";
import { isParsedClashOptions, parseClashOptions } from "./options.js";
import { renderClashRules } from "./render-rules.js";
import { toClashProxy } from "./render-node.js";
import { validateClashProfile } from "./validate-profile.js";

const TEST_URL = "http://www.gstatic.com/generate_204";
const CONTINENT_LABELS = Object.freeze({ asiaPacific: "🌏 亚太", europe: "🌍 欧洲", americas: "🌎 美洲", other: "🌐 其他" });

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

function namesFor(nodes) { return nodes.map((node) => toClashProxy(node).name); }

function group(name, type, proxies, extra = {}) {
  return { name, type, proxies, ...extra };
}

function renderGroups(nodes, options, policyResolution) {
  const names = namesFor(nodes);
  const byContinent = new Map();
  for (const node of nodes) {
    const continent = node?._profile?.continent || "other";
    if (!byContinent.has(continent)) byContinent.set(continent, []);
    byContinent.get(continent).push(toClashProxy(node).name);
  }
  const groups = [
    group("⚡ 全部自动", "url-test", names, { url: TEST_URL, interval: 600, tolerance: 100 }),
    group("🛟 全部故障转移", "fallback", ["⚡ 全部自动", ...names], { url: TEST_URL, interval: 600 }),
  ];
  for (const [key, values] of byContinent) {
    const label = CONTINENT_LABELS[key] || CONTINENT_LABELS.other;
    groups.push(group(label + "自动", "url-test", values, { url: TEST_URL, interval: 600, tolerance: 120 }));
  }
  const regional = [...byContinent.keys()].map((key) => (CONTINENT_LABELS[key] || CONTINENT_LABELS.other) + "自动");
  groups.unshift(group("🚀 节点选择", "select", ["⚡ 全部自动", "🛟 全部故障转移", ...regional, "DIRECT"]));

  const serviceDefaults = [
    ["🤖 AI 专用", "🚀 节点选择"], ["🐙 GitHub", "🚀 节点选择"], ["📺 YouTube", "🚀 节点选择"],
    ["🎬 海外流媒体", "🚀 节点选择"], ["💬 海外社交", "🚀 节点选择"], ["🌍 海外游戏", "🚀 节点选择"],
    ["🍎 Apple", "DIRECT"], ["🪟 Microsoft", "DIRECT"], ["🇨🇳 国内平台", "DIRECT"],
    ["⬇️ 下载/P2P", "DIRECT"], ["☣️ 安全威胁", options.blockMode === "off" ? "DIRECT" : "REJECT"],
    ["🧱 常见广告", options.blockMode === "strict" ? "REJECT" : "DIRECT"], ["🕵️ 严格跟踪", options.blockMode === "strict" ? "REJECT" : "DIRECT"],
  ];
  for (const [name, fallback] of serviceDefaults) {
    const resolved = policyResolution?.targets?.[name]?.resolved;
    groups.push(group(name, "select", [resolved || fallback, "🚀 节点选择", "DIRECT", "REJECT"].filter((value, index, all) => all.indexOf(value) === index)));
  }
  return groups;
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
    "proxy-groups": renderGroups(prepared.nodes, options, policyResolution),
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

