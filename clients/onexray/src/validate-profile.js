const RESERVED_RUNTIME_TAGS = new Set(["proxy", "direct", "block", "chainProxy"]);
const TOP_LEVEL_KEYS = new Set(["name", "dns", "inbounds", "outbounds", "routing"]);

export function validateOneXrayProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return { valid: false, errors: ["profile must be an object"] };
  const errors = [];
  if (typeof profile.name !== "string" || profile.name.length === 0 || /[\r\n]/u.test(profile.name)) errors.push("profile name is invalid");
  for (const key of Object.keys(profile)) if (!TOP_LEVEL_KEYS.has(key)) errors.push("profile contains an unsupported field");
  if (!Array.isArray(profile.inbounds) || profile.inbounds.length === 0) errors.push("at least one inbound is required");
  if (!Array.isArray(profile.outbounds) || profile.outbounds.length === 0) errors.push("at least one outbound is required");
  const tags = new Set();
  for (const item of [...(profile.inbounds ?? []), ...(profile.outbounds ?? [])]) {
    if (!item || typeof item !== "object" || typeof item.tag !== "string" || item.tag.length === 0) {
      errors.push("tag is required");
    } else if (tags.has(item.tag)) {
      errors.push(`duplicate tag: ${item.tag}`);
    } else {
      tags.add(item.tag);
    }
  }
  if (!tags.has("direct") || !tags.has("block")) errors.push("safety outbounds are required");
  if (profile.routing?.domainStrategy !== "IPIfNonMatch") errors.push("domainStrategy must be IPIfNonMatch");
  const rules = profile.routing?.rules;
  if (!Array.isArray(rules) || rules.length === 0) {
    errors.push("routing rules are required");
  } else {
    for (const rule of rules) {
      if (!rule || typeof rule !== "object") {
        errors.push("routing rule is invalid");
        continue;
      }
      const target = rule.outboundTag;
      if (typeof target !== "string" || (!tags.has(target) && !RESERVED_RUNTIME_TAGS.has(target))) errors.push("routing rule references an unknown outbound");
    }
    const finalTarget = rules.at(-1)?.outboundTag;
    if (finalTarget !== "proxy" && finalTarget !== "chainProxy") errors.push("final proxy rule is required");
  }
  if (!profile.dns || !Array.isArray(profile.dns.servers) || profile.dns.servers.length < 2) errors.push("china and global DNS servers are required");
  return { valid: errors.length === 0, errors };
}
