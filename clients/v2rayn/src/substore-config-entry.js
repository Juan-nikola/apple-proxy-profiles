import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { CLIENT } from "../../../shared/contracts.js";
import { parseV2rayNOptions } from "./options.js";
import { renderV2rayNProfile } from "./render-profile.js";
export async function operator(input, targetPlatform, context = {}) { void targetPlatform; const options = parseV2rayNOptions({ ...(context.arguments ?? {}), output: "config" }); if (typeof context.produceArtifact !== "function") throw new Error("v2rayN produceArtifact is unavailable"); const raw = await context.produceArtifact({ type: "collection", name: options.name, platform: "JSON", produceType: "internal" }); const normalized = normalizeNodes(raw, { clientChain: options.clientChain }); const filtered = filterNodesForClient(normalized.nodes, CLIENT.v2rayn); if (!filtered.nodes.length) throw new Error("v2rayN profile: no compatible nodes"); return { ...input, $content: `${JSON.stringify(renderV2rayNProfile({ options, nodes: filtered.nodes }), null, 2)}\n` }; }
