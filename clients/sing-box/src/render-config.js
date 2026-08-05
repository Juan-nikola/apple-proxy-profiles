import { nodeMetadata } from "../../../shared/contracts.js";
import { parseSingBoxOptions, isParsedSingBoxOptions } from "./options.js";
import { renderSingBoxOutbound } from "./render-node.js";
import { renderSingBoxGroups } from "./render-groups.js";
import { renderSingBoxRouteRules } from "./render-rules.js";
import { renderSingBoxDns } from "./render-dns.js";
import { renderSingBoxTun } from "./render-platform.js";
import { validateSingBoxConfig } from "./validate-config.js";

export function renderSingBoxConfig(rawOptions, nodes, { ruleBaseUrl, ruleSetFormat = "source" } = {}) {
  const options = isParsedSingBoxOptions(rawOptions) ? rawOptions : parseSingBoxOptions(rawOptions);
  const inventory = Array.isArray(nodes) ? nodes : [];
  if (inventory.length === 0) throw new Error("sing-box refuses an empty node inventory");
  for (const node of inventory) nodeMetadata(node);
  const nodeOutbounds = inventory.map(renderSingBoxOutbound);
  const groups = renderSingBoxGroups(options, inventory);
  const { ruleSets, rules, final } = renderSingBoxRouteRules({ ruleBaseUrl, ruleSetFormat });
  const config = {
    log: { level: "info", timestamp: true },
    dns: renderSingBoxDns(options),
    inbounds: [renderSingBoxTun(options.platform)],
    outbounds: [
      { type: "direct", tag: "DIRECT" },
      { type: "block", tag: "REJECT" },
      ...nodeOutbounds,
      ...groups,
    ],
    route: {
      auto_detect_interface: true,
      rule_set: ruleSets,
      rules,
      final,
    },
    experimental: { cache_file: { enabled: true, path: "cache.db", store_rdrc: true } },
  };
  const validation = validateSingBoxConfig(config);
  if (!validation.valid) throw new Error(`Generated sing-box config failed validation: ${validation.errors.join(",")}`);
  return config;
}
