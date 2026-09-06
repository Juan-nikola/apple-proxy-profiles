import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { CLIENT } from "../../../shared/contracts.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseV2rayNOptions } from "./options.js";
import { renderV2rayNProfile } from "./render-profile.js";
import { renderSingBoxConfig } from "../../sing-box/src/render-config.js";

export async function operator(input, targetPlatform, context = {}) {
  const options = parseV2rayNOptions({ ...(context.arguments ?? {}), output: "config" });
  if (targetPlatform !== undefined && targetPlatform !== "JSON" && targetPlatform !== options.platform) {
    throw new Error("v2rayN target platform '" + targetPlatform + "' does not match " + options.platform);
  }
  if (typeof context.produceArtifact !== "function") throw new Error("v2rayN produceArtifact is unavailable");
  const raw = await context.produceArtifact({ type: "collection", name: options.name, platform: "JSON", produceType: "internal" });
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.v2rayn);
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.v2rayn,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
  });
  context.logger?.info?.("[v2rayn-config] " + JSON.stringify({ accepted: filtered.nodes.length, renderFailures: filtered.diagnostics.excluded }));
  if (options.core === "singbox") {
    const singboxOptions = {
      output: "config", type: "collection", name: options.name, subscriptionName: options.subscriptionName,
      platform: options.platform, channel: options.channel, dnsMode: options.dnsMode, chinaDns: options.chinaDns,
      globalDns: options.globalDns, blockMode: options.blockMode, quicMode: options.quicMode, ipv6Mode: options.ipv6Mode,
      autoGroupMode: "auto", clientChain: options.clientChain, profileMode: "light", adblockMode: "off", nodeErrorMode: "strict",
    };
    const config = renderSingBoxConfig(singboxOptions, filtered.nodes, {
      ruleBaseUrl: `https://juan-nikola.github.io/apple-proxy-profiles/${options.channel}/sing-box/rule-sets`,
      policyResolution,
    });
    return { ...input, $content: JSON.stringify(config, null, 2) + "\n" };
  }
  const profile = renderV2rayNProfile({
    options,
    nodes: filtered.nodes,
    geoData: context.geoData,
    filterFailures: filtered.diagnostics.excluded,
    policyResolution,
  });
  return { ...input, $content: JSON.stringify(profile, null, 2) + "\n" };
}
