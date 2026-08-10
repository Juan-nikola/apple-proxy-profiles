import { nodeMetadata } from "../../../shared/contracts.js";
import { parseSingBoxOptions, isParsedSingBoxOptions } from "./options.js";
import { renderSingBoxOutbound } from "./render-node.js";
import { renderSingBoxGroups } from "./render-groups.js";
import { renderSingBoxRouteRules, RULE_DOWNLOAD_HTTP_CLIENT } from "./render-rules.js";
import { renderSingBoxDns } from "./render-dns.js";
import { renderSingBoxTun } from "./render-platform.js";
import { validateSingBoxConfig } from "./validate-config.js";

export function renderSingBoxConfig(rawOptions, nodes, rendererOptions = {}) {
  if (Object.hasOwn(rendererOptions, "ruleSetFormat")) {
    throw new Error("Renderer option 'ruleSetFormat' was removed; migrate to profileMode and adblockMode");
  }
  const { ruleBaseUrl } = rendererOptions;
  const options = isParsedSingBoxOptions(rawOptions) ? rawOptions : parseSingBoxOptions(rawOptions);
  const inventory = Array.isArray(nodes) ? nodes : [];
  if (inventory.length === 0) throw new Error("sing-box refuses an empty node inventory");
  for (const node of inventory) nodeMetadata(node);
  const nodeOutbounds = inventory.map(renderSingBoxOutbound);
  const groups = renderSingBoxGroups(options, inventory, {
    ruleProbeUrl: `${ruleBaseUrl.replace(/\/+$/u, "")}/Hijacking.srs`,
  });
  const { ruleSets, rules, final } = renderSingBoxRouteRules({
    ruleBaseUrl,
    profileMode: options.profileMode,
    adblockMode: options.adblockMode,
    quicMode: options.quicMode,
  });
  const config = {
    log: { level: "info", timestamp: true },
    dns: renderSingBoxDns(options),
    http_clients: [{
      tag: RULE_DOWNLOAD_HTTP_CLIENT,
      version: 2,
      detour: "🧭 DNS 与规则下载",
    }],
    inbounds: [renderSingBoxTun(options.platform, options.ipv6Mode)],
    outbounds: [
      { type: "direct", tag: "DIRECT" },
      { type: "block", tag: "REJECT" },
      ...nodeOutbounds,
      ...groups,
    ],
    route: {
      auto_detect_interface: true,
      default_domain_resolver: "dns-direct",
      default_http_client: RULE_DOWNLOAD_HTTP_CLIENT,
      rule_set: ruleSets,
      rules,
      final,
    },
    experimental: { cache_file: { enabled: true, path: "cache.db", store_dns: true } },
  };
  const validation = validateSingBoxConfig(config);
  if (!validation.valid) throw new Error(`Generated sing-box config failed validation: ${validation.errors.join(",")}`);
  return config;
}
