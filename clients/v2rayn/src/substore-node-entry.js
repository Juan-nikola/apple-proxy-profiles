import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { CLIENT } from "../../../shared/contracts.js";
import { parseV2rayNOptions } from "./options.js";
import { renderV2rayNSubscription } from "./render-node.js";
export async function operator(input, targetPlatform, context = {}) { void targetPlatform; const options = parseV2rayNOptions({ ...(context.arguments ?? {}), output: "nodes" }); if (typeof context.produceArtifact !== "function") throw new Error("v2rayN produceArtifact is unavailable"); const raw = await context.produceArtifact({ type: "collection", name: options.name, platform: "JSON", produceType: "internal" }); const normalized = normalizeNodes(raw, { clientChain: options.clientChain }); const filtered = filterNodesForClient(normalized.nodes, CLIENT.v2rayn); if (!filtered.nodes.length) throw new Error("v2rayN nodes: no compatible nodes"); return { ...input, $content: renderV2rayNSubscription({ nodes: filtered.nodes }) }; }
