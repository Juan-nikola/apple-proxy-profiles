import { isValidRuleLine, isValidRuleTarget } from "./rule-validator.js";

const BUILTIN_POLICIES = new Set(["DIRECT", "REJECT"]);
const GROUP_TYPES = new Set(["select", "url-test", "fallback", "load-balance", "random"]);
const REQUIRED_SECTIONS = new Set(["General", "Proxy Group", "Rule"]);
const SIMPLE_RULE_TYPES = new Set([
  "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-WILDCARD",
  "IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR", "IP-ASN", "GEOIP",
  "USER-AGENT", "PROCESS-NAME", "URL-REGEX", "DST-PORT", "DEST-PORT",
]);
const IP_RULE_TYPES = new Set(["IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR"]);

function escapedCommaFields(value) {
  const fields = [];
  let field = "";
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      field += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  if (escaped) field += "\\";
  fields.push(field);
  return fields;
}

function sectionsFrom(profile, errors) {
  const sections = new Map();
  let active;
  for (const line of profile.replaceAll("\r\n", "\n").split("\n")) {
    const match = /^\[([^\]]+)\]$/.exec(line);
    if (match) {
      active = match[1];
      if (!REQUIRED_SECTIONS.has(active)) errors.add(`Unrecognized section: ${active}`);
      if (!sections.has(active)) {
        sections.set(active, []);
      } else if (REQUIRED_SECTIONS.has(active)) {
        errors.add(`Duplicate required section: ${active}`);
      } else {
        errors.add(`Duplicate section: ${active}`);
      }
      continue;
    }
    if (active) sections.get(active).push(line);
  }
  for (const required of REQUIRED_SECTIONS) {
    if (!sections.has(required)) errors.add(`Missing required section: ${required}`);
  }
  return sections;
}

function parseGroups(lines, errors) {
  const groups = new Map();
  for (const line of lines ?? []) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      errors.add(`Invalid proxy group: ${line}`);
      continue;
    }
    const nameFields = escapedCommaFields(line.slice(0, separator).trim());
    const name = nameFields[0];
    const fields = escapedCommaFields(line.slice(separator + 1).trim());
    if (nameFields.length !== 1 || !name || !GROUP_TYPES.has(fields[0])) {
      errors.add(`Invalid proxy group: ${name || line}`);
      continue;
    }
    if (groups.has(name)) {
      errors.add(`Duplicate group: ${name}`);
      continue;
    }
    groups.set(name, fields);
  }
  return groups;
}

function groupReferences(groups, errors) {
  const graph = new Map([...groups.keys()].map((name) => [name, []]));
  for (const [name, fields] of groups) {
    const useIndex = fields.findIndex((field) => field === "use=true");
    // The field immediately before use=true is the subscription source, not a
    // selectable group. Every preceding non-control item is structural.
    const staticEnd = useIndex > 1 ? useIndex - 1 : fields.length;
    const staticItems = [];
    for (let index = 1; index < staticEnd; index += 1) {
      const item = fields[index];
      if (!item || item.includes("=")) continue;
      staticItems.push(item);
      if (BUILTIN_POLICIES.has(item)) continue;
      if (groups.has(item)) {
        graph.get(name).push(item);
      } else {
        errors.add(`Missing group reference: ${name} -> ${item}`);
      }
    }
    const subscriptionSource = useIndex > 1 ? fields[useIndex - 1] : "";
    const hasSubscription = subscriptionSource.length > 0 && !subscriptionSource.includes("=");
    if (staticItems.length === 0 && !hasSubscription) {
      errors.add(`Group requires a selectable item or subscription source: ${name}`);
    }
  }
  return graph;
}

function detectCycles(graph, errors) {
  const visiting = new Set();
  const visited = new Set();
  function visit(name) {
    if (visiting.has(name)) {
      errors.add(`Group cycle: ${[...visiting, name].join(" -> ")}`);
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const reference of graph.get(name) ?? []) visit(reference);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of graph.keys()) visit(name);
}

function validPolicy(policy, groups) {
  return BUILTIN_POLICIES.has(policy) || groups.has(policy);
}

function validatePolicy(kind, policy, groups, errors) {
  if (!policy) {
    errors.add(`${kind} policy is missing`);
  } else if (!validPolicy(policy, groups)) {
    errors.add(`${kind} policy references missing group: ${policy}`);
  }
}

function isControlTail(field) {
  return field === "no-resolve" || field.includes("=");
}

function validateSimpleRule(type, fields, groups, errors) {
  if (fields.length < 3 || !fields[1]) {
    errors.add(`Malformed ${type} rule`);
    return;
  }
  if (!isValidRuleTarget(type, fields[1])) errors.add(`Malformed ${type} rule`);
  validatePolicy(type, fields[2], groups, errors);
  const tail = fields.slice(3);
  if ((!IP_RULE_TYPES.has(type) && tail.length > 0) || (IP_RULE_TYPES.has(type) && tail.some((field) => !isControlTail(field)))) {
    errors.add(`Malformed ${type} rule`);
  }
}

function topLevelFields(value) {
  const fields = [];
  let field = "";
  let depth = 0;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      field += character;
      escaped = false;
    } else if (character === "\\") {
      field += character;
      escaped = true;
    } else if (character === "(") {
      depth += 1;
      field += character;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) return null;
      field += character;
    } else if (character === "," && depth === 0) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  if (escaped || depth !== 0) return null;
  fields.push(field);
  return fields;
}

function validateLogicalRule(type, rule, groups, errors) {
  const topLevel = topLevelFields(rule);
  const escapedFields = escapedCommaFields(rule);
  const policy = topLevel?.length === 3 ? escapedFields.at(-1) : "";
  if (!topLevel || topLevel.length !== 3 || topLevel[0] !== type) {
    errors.add(`Malformed ${type} rule`);
    validatePolicy(type, "", groups, errors);
    return;
  }

  if (!isValidRuleLine(`${type},${topLevel[1]}`)) errors.add(`Malformed ${type} rule`);
  validatePolicy(type, policy, groups, errors);
}

function validateRules(lines, groups, errors) {
  const rules = (lines ?? []).filter((line) => line && !line.startsWith("#"));
  const geoipIndex = rules.indexOf("GEOIP,CN,DIRECT");
  const finalIndex = rules.findIndex((line) => line.startsWith("FINAL,"));
  if (geoipIndex === -1) errors.add("Missing exact GEOIP,CN,DIRECT rule");
  if (finalIndex === -1) errors.add("Missing FINAL rule");
  if (geoipIndex !== -1 && finalIndex !== -1 && geoipIndex > finalIndex) {
    errors.add("GEOIP,CN,DIRECT must appear before FINAL");
  }

  for (const rule of rules) {
    const fields = escapedCommaFields(rule);
    const type = fields[0];
    if (SIMPLE_RULE_TYPES.has(type)) {
      validateSimpleRule(type, fields, groups, errors);
    } else if (type === "RULE-SET") {
      if (fields.length < 3 || !fields[1]) errors.add("Malformed RULE-SET rule");
      validatePolicy("RULE-SET", fields[2], groups, errors);
      if (fields.slice(3).some((field) => !field.includes("="))) errors.add("Malformed RULE-SET rule");
    } else if (type === "FINAL") {
      if (fields.length !== 2) errors.add("Malformed FINAL rule");
      validatePolicy("FINAL", fields[1], groups, errors);
    } else if (["AND", "OR", "NOT"].includes(type)) {
      validateLogicalRule(type, rule, groups, errors);
    } else {
      errors.add(`Unknown rule type: ${type || "(empty)"}`);
    }
  }
}

/** Return structural validation results without mutating or normalizing input. */
export function validateProfile(profile) {
  const errors = new Set();
  if (typeof profile !== "string") {
    return { valid: false, errors: ["Profile must be a string"] };
  }
  const sections = sectionsFrom(profile, errors);
  const groups = parseGroups(sections.get("Proxy Group"), errors);
  const graph = groupReferences(groups, errors);
  detectCycles(graph, errors);
  validateRules(sections.get("Rule"), groups, errors);
  const result = [...errors];
  return { valid: result.length === 0, errors: result };
}

