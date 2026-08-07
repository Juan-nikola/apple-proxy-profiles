function splitEscaped(line) {
  const fields = [];
  let current = "";
  let escaped = false;
  for (const character of line) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === ",") {
      fields.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  if (escaped) return null;
  fields.push(current);
  return fields;
}

function sectionRecords(profile) {
  if (typeof profile !== "string") return { sections: null, errors: ["Profile must be a string"] };
  const sections = new Map();
  let current;
  for (const rawLine of profile.replace(/\r\n?/gu, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const header = /^\[([^\]]+)\]$/u.exec(line);
    if (header) {
      current = header[1];
      if (sections.has(current)) return { sections: null, errors: ["duplicate required section"] };
      sections.set(current, []);
      continue;
    }
    if (!current || !sections.has(current)) return { sections: null, errors: ["content outside section"] };
    sections.get(current).push(line);
  }
  return { sections, errors: [] };
}

function lineValue(line) {
  const index = line.indexOf(" = ");
  if (index < 1) return null;
  return [line.slice(0, index), line.slice(index + 3)];
}

export function validateSurgeProfile(profile) {
  const parsed = sectionRecords(profile);
  if (parsed.errors.length > 0) return { valid: false, errors: parsed.errors };
  const required = ["General", "Proxy", "Proxy Group", "Rule"];
  const errors = required.filter((section) => !parsed.sections.has(section)).map((section) => `missing section: ${section}`);
  if (errors.length > 0) return { valid: false, errors };
  const proxyNames = new Set();
  for (const line of parsed.sections.get("Proxy")) {
    const record = lineValue(line);
    if (!record || splitEscaped(record[1])?.length < 2) errors.push("malformed proxy line");
    else if (proxyNames.has(record[0])) errors.push("duplicate proxy name");
    else proxyNames.add(record[0]);
    if (line.includes("_profile") || line.includes("_subName")) errors.push("internal node metadata leaked");
  }
  const groups = new Map();
  for (const line of parsed.sections.get("Proxy Group")) {
    const record = lineValue(line);
    const fields = record && splitEscaped(record[1]);
    if (!record || !fields || fields.length < 2) {
      errors.push("malformed group line");
      continue;
    }
    if (groups.has(record[0])) errors.push("duplicate group name");
    const items = fields.slice(1).filter((field) => !field.includes("="));
    const remoteGroupReferences = fields.slice(1)
      .filter((field) => field.startsWith("include-other-group="))
      .map((field) => field.slice("include-other-group=".length));
    const policyPath = fields.find((field) => field.startsWith("policy-path="));
    const policyFilter = fields.find((field) => field.startsWith("policy-regex-filter="));
    if (policyPath) {
      const url = policyPath.slice("policy-path=".length);
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname) errors.push("invalid policy path");
      } catch {
        errors.push("invalid policy path");
      }
    }
    if (policyFilter && items.length === 0 && remoteGroupReferences.length === 0 && !policyPath) {
      errors.push("filtered group requires a policy source");
    }
    groups.set(record[0], { type: fields[0], items, remoteGroupReferences, policyPath });
  }
  const allowed = new Set(["DIRECT", "REJECT", ...proxyNames, ...groups.keys()]);
  for (const group of groups.values()) {
    for (const item of [...group.items, ...group.remoteGroupReferences]) {
      if (!allowed.has(item)) errors.push("missing group or proxy reference");
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (name) => {
    if (visiting.has(name)) {
      errors.push("group cycle");
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    const group = groups.get(name);
    for (const item of [...(group?.items ?? []), ...(group?.remoteGroupReferences ?? [])]) {
      if (groups.has(item)) visit(item);
    }
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of groups.keys()) visit(name);

  const rules = parsed.sections.get("Rule");
  const finals = rules.filter((line) => /^FINAL,/u.test(line));
  if (finals.length !== 1) errors.push("Rule must contain exactly one FINAL");
  if (finals.length === 1 && rules.at(-1) !== finals[0]) errors.push("rules after FINAL");
  const policies = new Set(["DIRECT", "REJECT", ...proxyNames, ...groups.keys()]);
  const ipRuleTypes = new Set(["IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR", "DEST-PORT", "DST-PORT", "IP-ASN", "GEOIP"]);
  for (const line of rules.filter((item) => !item.startsWith("#") && !/^FINAL,/u.test(item))) {
    const fields = splitEscaped(line);
    const policy = fields?.[0] === "RULE-SET" || fields?.[0] === "DOMAIN-SET" || ipRuleTypes.has(fields?.[0])
      ? fields?.[2]
      : fields?.at(-1);
    if (!fields || fields.length < 2 || !policies.has(policy)) errors.push("rule references missing policy");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
