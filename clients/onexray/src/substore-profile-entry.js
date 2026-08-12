import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { BUSINESS_TARGETS } from "../../../shared/policies/business-targets.js";
import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "./geodata-contract.js";
import { parseOneXrayOptions } from "./options.js";
import { buildOneXrayProfileLink } from "./profile-link.js";
import { renderOneXrayAudit } from "./render-audit.js";
import { renderOneXrayDns } from "./render-dns.js";
import { renderOneXrayProfile } from "./render-profile.js";
import { renderOneXrayRouting } from "./render-routing.js";
import { resolveOneXrayPolicy } from "./resolve-policy.js";

const OUTPUTS = new Set(["profile", "audit"]);
const SHA256 = /^[a-f0-9]{64}$/u;

function processorError(code) {
  return new Error(`OneXray profile: ${code}`);
}

function policyProcessorError(error) {
  let message = "";
  try {
    if (error && typeof error.message === "string") message = error.message;
  } catch {
    message = "";
  }
  const target = BUSINESS_TARGETS.find((entry) => message.includes(`${entry.label}:`));
  if (target) return processorError(`invalid-policy; 业务: ${target.label}`);
  if (message.includes("全局客户端链")) return processorError("invalid-policy; 全局客户端链");
  return processorError("invalid-policy");
}

function ownRequest(input) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error();
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const values = {};
    for (const key of ["proxies", "arguments", "geoHashes", "geoManifest"]) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined) continue;
      if ("get" in descriptor || "set" in descriptor) throw new Error();
      values[key] = descriptor.value;
    }
    const manifestHashes = readGeoHashes(values.geoManifest);
    const explicitHashes = readGeoHashes(values.geoHashes);
    values.geoHashes = Object.freeze({ ...manifestHashes, ...explicitHashes });
    delete values.geoManifest;
    return values;
  } catch {
    throw processorError("invalid-request");
  }
}

function readGeoHashes(value) {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error();
  let source = value;
  if (Object.hasOwn(value, "hashes")) {
    source = value.hashes;
    if (source === null || typeof source !== "object" || Array.isArray(source)) throw new Error();
  }
  const result = {};
  for (const key of ["domain", "ip"]) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor === undefined) continue;
    if ("get" in descriptor || "set" in descriptor) throw new Error();
    if (typeof descriptor.value !== "string" || !SHA256.test(descriptor.value)) throw new Error();
    result[key] = descriptor.value;
  }
  return result;
}

function defaultGeo(channel) {
  const names = oneXrayGeoNames(channel);
  return {
    siteName: names.domain,
    code: oneXrayGeoCode,
  };
}

function copyCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, count]) => Number.isSafeInteger(count) && count >= 0)
    .sort(([left], [right]) => left.localeCompare(right, "en")));
}

function protocolCounts(normalizedNodes, eligibleNodes) {
  const eligible = new Set(eligibleNodes);
  const result = {};
  for (const node of normalizedNodes) {
    const protocol = typeof node?.type === "string" ? node.type.trim().toLowerCase() : "unknown";
    result[protocol] ??= { accepted: 0, excluded: 0 };
    result[protocol][eligible.has(node) ? "accepted" : "excluded"] += 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right, "en")));
}

function defineInternal(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

function privateContext({ options, normalized, eligible, resolution, profile, profileLink, dns, routing, geo, geoHashes }) {
  const normalizedNodes = normalized.nodes;
  const eligibleNodes = eligible.nodes;
  const context = {
    normalizedDiagnostics: Object.freeze({
      total: normalized.diagnostics.total,
      accepted: normalized.diagnostics.accepted,
      protocol: Object.freeze(copyCounts(normalized.diagnostics.protocol)),
      excluded: Object.freeze(copyCounts(normalized.diagnostics.excluded)),
    }),
    eligibleDiagnostics: Object.freeze({
      accepted: eligible.diagnostics.accepted,
      excluded: Object.freeze(copyCounts(eligible.diagnostics.excluded)),
    }),
    protocolCounts: Object.freeze(protocolCounts(normalizedNodes, eligibleNodes)),
    ruleReleaseId: `shared-lightweight-${options.channel}`,
    geoHashes: Object.freeze({ ...geoHashes }),
  };

  // Credentials and encoded policy input stay in non-enumerated slots. Audit
  // output is explicitly assembled from the public summaries above.
  defineInternal(context, "options", options);
  defineInternal(context, "normalizedNodes", normalizedNodes);
  defineInternal(context, "eligibleNodes", eligibleNodes);
  defineInternal(context, "resolution", resolution);
  defineInternal(context, "profile", profile);
  defineInternal(context, "profileLink", profileLink);
  defineInternal(context, "dns", dns);
  defineInternal(context, "routing", routing);
  defineInternal(context, "geo", geo);
  return Object.freeze(context);
}

function buildPrivateOneXrayContext(rawArguments, proxies, { geoHashes = {} } = {}) {
  let options;
  try {
    options = parseOneXrayOptions(rawArguments);
  } catch {
    throw processorError("invalid-arguments");
  }
  if (!OUTPUTS.has(options.output)) throw processorError("unsupported-output");

  let normalized;
  try {
    normalized = normalizeNodes(proxies, { clientChain: options.clientChain });
  } catch {
    throw processorError("invalid-inventory");
  }

  let eligible;
  try {
    eligible = filterNodesForClient(normalized.nodes, CLIENT.onexray);
  } catch {
    throw processorError("invalid-inventory");
  }
  if (eligible.nodes.length === 0) throw processorError("no-compatible-nodes");

  let resolution;
  try {
    resolution = resolveOneXrayPolicy({
      options,
      allNodes: normalized.nodes,
      eligibleNodes: eligible.nodes,
    });
  } catch (error) {
    throw policyProcessorError(error);
  }

  const routingPlan = orderedRoutingPlan();
  const geo = defaultGeo(options.channel);
  let dns;
  let routing;
  let profile;
  let profileLink;
  try {
    dns = renderOneXrayDns({ options, routingPlan, geo });
    routing = renderOneXrayRouting({ options, resolution, dnsRules: dns.rules });
    profile = renderOneXrayProfile({
      options,
      resolution,
      routingPlan,
      geo,
      dns,
      routing,
    });
    profileLink = buildOneXrayProfileLink(profile, options.channel);
  } catch {
    throw processorError("invalid-profile");
  }

  return privateContext({ options, normalized, eligible, resolution, profile, profileLink, dns, routing, geo, geoHashes });
}

/**
 * Private Profile/audit Sub-Store processor. Both modes execute the same
 * normalization, capability, policy, DNS, routing, Profile and link stages;
 * only the final allowlisted serialization differs.
 */
export function runOneXrayProfileProcessor(input = {}) {
  const { proxies, arguments: rawArguments, geoHashes } = ownRequest(input);
  let context;
  try {
    context = buildPrivateOneXrayContext(rawArguments, proxies, { geoHashes });
  } catch (error) {
    if (error instanceof Error && /^OneXray profile: /u.test(error.message)) throw error;
    throw processorError("invalid-profile");
  }

  const output = context.options.output;
  if (output === "profile") return `${context.profileLink}\n`;
  if (output === "audit") {
    try {
      return renderOneXrayAudit(context);
    } catch {
      throw processorError("invalid-audit");
    }
  }
  throw processorError("unsupported-output");
}

export { buildPrivateOneXrayContext };
