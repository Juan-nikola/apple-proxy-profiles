const REQUIRED = ["proxies", "proxy-groups", "rule-providers", "dns", "rules"];

export function validateClashProfile(profile) {
  if (typeof profile !== "string" || !profile.endsWith("\n")) {
    return { valid: false, errors: ["profile is not YAML text"] };
  }
  const errors = [];
  for (const key of REQUIRED) {
    if (!new RegExp("^" + key + ":", "mu").test(profile)) errors.push("missing " + key);
  }
  if (!/^rules:\n[\s\S]*MATCH,漏网之鱼/mu.test(profile)) errors.push("missing terminal MATCH rule");
  if (!/^proxy-groups:\n[\s\S]*name: "🚀 节点选择"/mu.test(profile)) errors.push("missing primary proxy group");
  return { valid: errors.length === 0, errors };
}
