import { encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";
import { parseBusinessOverrides } from "../../../shared/policies/business-targets.js";

/**
 * Turns a readable business policy object (e.g. { ai: "NODE:🇺🇸 ..." }) into
 * the canonical Base64URL value accepted by the OneXray Sub-Store task.
 */
export function encodePolicyOverrides(policy) {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    throw new TypeError("OneXray policy must be a plain JSON object");
  }
  const text = JSON.stringify(policy);
  const encoded = encodeBase64UrlUtf8(text);
  parseBusinessOverrides(encoded);
  return encoded;
}

export function policyOverrideParam(encoded) {
  if (typeof encoded !== "string" || !/^[A-Za-z0-9_-]+$/u.test(encoded)) {
    throw new TypeError("OneXray policyOverrides must be Base64URL text");
  }
  return `policyOverrides=${encoded}`;
}

function stripPolicyOverride(content) {
  return content
    .split("&")
    .filter((part) => !part.startsWith("policyOverrides="))
    .join("&");
}

/**
 * Returns a deep copy of a Sub-Store file task with the Script Operator URL and
 * parsed arguments updated to the given policyOverrides value.
 */
export function updateTaskPolicy(task, encoded) {
  if (task === null || typeof task !== "object" || Array.isArray(task)) {
    throw new TypeError("OneXray task must be an object");
  }
  const param = policyOverrideParam(encoded);
  const clone = JSON.parse(JSON.stringify(task));
  if (!Array.isArray(clone.process) || clone.process.length === 0) {
    throw new Error("OneXray task has no process list");
  }
  const operator = clone.process.find(
    (entry) =>
      entry?.type === "Script Operator" &&
      entry.args &&
      typeof entry.args.content === "string",
  );
  if (!operator) {
    throw new Error("OneXray task has no Script Operator with URL content");
  }
  const args = operator.args;
  args.content = `${stripPolicyOverride(args.content)}&${param}`;
  args.arguments = { ...args.arguments };
  delete args.arguments.policyOverrides;
  args.arguments.policyOverrides = encoded;
  return clone;
}
