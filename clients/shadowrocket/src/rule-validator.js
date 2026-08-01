const ALLOWED_TYPES = new Set([
  "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-WILDCARD",
  "IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "USER-AGENT",
  "PROCESS-NAME", "URL-REGEX", "DST-PORT", "DEST-PORT", "SRC-IP-CIDR",
]);
const LOGICAL_TYPES = new Set(["AND", "OR", "NOT"]);
const LOGICAL_LEAF_TYPES = new Set([...ALLOWED_TYPES, "PROTOCOL", "RULE-SET"]);

function isNonEmptyField(value) {
  return typeof value === "string"
    && value.length > 0
    && value.trim() === value
    && !/[\r\n\0]/.test(value);
}

function isIpv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => (
    /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255
  ));
}

function ipv6PartCount(parts) {
  let count = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (/^[0-9a-f]{1,4}$/i.test(part)) {
      count += 1;
    } else if (index === parts.length - 1 && isIpv4(part)) {
      count += 2;
    } else {
      return -1;
    }
  }
  return count;
}

function isIpv6(value) {
  if (!value || value.includes("%") || (value.match(/::/g) ?? []).length > 1) return false;
  if (value.includes("::")) {
    const [left, right] = value.split("::");
    const leftParts = left ? left.split(":") : [];
    const rightParts = right ? right.split(":") : [];
    const count = ipv6PartCount(leftParts) + ipv6PartCount(rightParts);
    return ipv6PartCount(leftParts) >= 0 && ipv6PartCount(rightParts) >= 0 && count < 8;
  }
  const parts = value.split(":");
  return ipv6PartCount(parts) === 8;
}

function isDomainName(value) {
  if (!isNonEmptyField(value) || value.length > 253 || value.includes("..")) return false;
  return value.split(".").every((label) => (
    /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/i.test(label)
  ));
}

function isWildcardDomain(value) {
  if (!isNonEmptyField(value) || value.length > 253 || value.includes("..")) return false;
  return value.split(".").every((label) => (
    /^[a-z0-9_*?](?:[a-z0-9_*?-]{0,61}[a-z0-9_*?])?$/i.test(label)
  ));
}

function isCidr(value, family) {
  const parts = value.split("/");
  if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return false;
  const prefix = Number(parts[1]);
  if (family === 4) return isIpv4(parts[0]) && prefix >= 0 && prefix <= 32;
  return isIpv6(parts[0]) && prefix >= 0 && prefix <= 128;
}

function isPort(value) {
  const match = /^(\d+)(?:-(\d+))?$/.exec(value);
  if (!match) return false;
  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  return start >= 1 && end <= 65535 && start <= end;
}

function isValidRegex(value) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}

function isDnsHostname(value) {
  if (!value || value.length > 253 || value.includes("..")) return false;
  return value.split(".").every((label) => (
    label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  ));
}

function isUrlPort(value) {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}

function isHttpUrl(value) {
  if (typeof value !== "string" || /[\s\0]/.test(value)) return false;
  const scheme = /^https?:\/\//i.exec(value);
  if (!scheme) return false;
  const remainder = value.slice(scheme[0].length);
  const boundary = remainder.search(/[/?#]/);
  const authority = boundary === -1 ? remainder : remainder.slice(0, boundary);
  if (!authority || authority.includes("@")) return false;

  if (authority.startsWith("[")) {
    const close = authority.indexOf("]");
    if (close < 0 || !isIpv6(authority.slice(1, close))) return false;
    const suffix = authority.slice(close + 1);
    return suffix === "" || (suffix.startsWith(":") && isUrlPort(suffix.slice(1)));
  }
  if (authority.includes("[") || authority.includes("]")) return false;

  const firstColon = authority.indexOf(":");
  const lastColon = authority.lastIndexOf(":");
  if (firstColon !== lastColon) return false;
  const host = firstColon === -1 ? authority : authority.slice(0, firstColon);
  const port = firstColon === -1 ? null : authority.slice(firstColon + 1);
  if (port !== null && !isUrlPort(port)) return false;
  if (/^[0-9.]+$/.test(host)) return isIpv4(host);
  return isDnsHostname(host);
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

function parenthesizedInner(value) {
  if (!value.startsWith("(") || !value.endsWith(")")) return null;
  const fields = topLevelFields(value);
  if (!fields || fields.length !== 1) return null;
  return value.slice(1, -1);
}

function isValidLogicalLeaf(type, target) {
  if (!LOGICAL_LEAF_TYPES.has(type)) return false;
  if (ALLOWED_TYPES.has(type)) return isValidRuleLine(`${type},${target}`);
  if (type === "PROTOCOL") return /^(?:TCP|UDP)$/.test(target);
  return isHttpUrl(target);
}

function isLogicalOperand(value) {
  const inner = parenthesizedInner(value);
  if (!inner) return false;
  const fields = topLevelFields(inner);
  if (!fields || fields.some((field) => !isNonEmptyField(field))) return false;
  if (LOGICAL_TYPES.has(fields[0])) {
    const expectedOperands = fields[0] === "NOT" ? 1 : 2;
    return fields.length === expectedOperands + 1 && fields.slice(1).every(isLogicalOperand);
  }
  if (!/^[A-Z][A-Z0-9-]*$/.test(fields[0]) || fields.length < 2) return false;
  return isValidLogicalLeaf(fields[0], fields.slice(1).join(","));
}

function isValidLogicalExpression(type, target) {
  if (type === "NOT" && isLogicalOperand(target)) return true;
  const inner = parenthesizedInner(target);
  if (!inner) return false;
  const operands = topLevelFields(inner);
  const expectedOperands = type === "NOT" ? 1 : 2;
  return operands?.length === expectedOperands && operands.every(isLogicalOperand);
}

export function isValidRuleTarget(type, target) {
  if (!ALLOWED_TYPES.has(type) || !isNonEmptyField(target)) return false;
  if (type === "DOMAIN" || type === "DOMAIN-SUFFIX") return isDomainName(target);
  if (type === "DOMAIN-WILDCARD") return isWildcardDomain(target);
  if (type === "IP-CIDR") return isCidr(target, 4) || isCidr(target, 6);
  if (type === "IP-CIDR6") return isCidr(target, 6);
  if (type === "SRC-IP-CIDR") return isCidr(target, 4) || isCidr(target, 6);
  if (type === "IP-ASN") return /^[1-9]\d*$/.test(target);
  if (type === "DST-PORT" || type === "DEST-PORT") return isPort(target);
  if (type === "GEOIP") return /^(?:[A-Z]{2}|LAN|PRIVATE)$/.test(target);
  if (type === "URL-REGEX") return isValidRegex(target);
  return true;
}

export function isValidRuleLine(line) {
  if (!isNonEmptyField(line)) return false;
  const separator = line.indexOf(",");
  if (separator <= 0) return false;
  const type = line.slice(0, separator);
  const rawTarget = line.slice(separator + 1);
  if (!/^[A-Z][A-Z0-9-]*$/.test(type) || !isNonEmptyField(rawTarget)) return false;
  if (LOGICAL_TYPES.has(type)) return isValidLogicalExpression(type, rawTarget);
  if (!ALLOWED_TYPES.has(type)) return false;

  const [target, ...tail] = rawTarget.split(",");
  const hasValidIpTail = tail.length === 0 || (tail.length === 1 && tail[0] === "no-resolve");
  if (["IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR", "IP-ASN"].includes(type)) {
    return hasValidIpTail && isValidRuleTarget(type, target);
  }
  if (type === "URL-REGEX") return isValidRuleTarget(type, rawTarget);
  return tail.length === 0 && isValidRuleTarget(type, target);
}

