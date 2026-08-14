import {
  GROUP_KIND,
  STRATEGY,
} from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { POLICY_GROUP_SCHEMA } from "../../../shared/policies/schema.js";
import { validateEgernNodeSubscriptionUrl } from "./options.js";

const PRIMARY_GROUP_NAME = "🚀 节点选择";
const UPDATE_INTERVAL = 21600;
const BUILTIN_POLICIES = new Set(["DIRECT", "REJECT"]);
const GROUP_KINDS = new Set(Object.values(GROUP_KIND));
const STRATEGIES = new Set(Object.values(STRATEGY));
const RESERVED_GROUP_NAMES = new Set([...POLICY_GROUP_SCHEMA.reservedNames, "PROXY"]);
const GROUP_FIELDS = new Set([
  "kind",
  "name",
  "strategy",
  "candidates",
  "nodeFilter",
  "test",
  "hidden",
  "defaultChoice",
]);
const TEST_FIELDS = new Set(["url", "interval", "timeout", "tolerance"]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;

function groupError(index, reason) {
  return new Error(`Policy group at index ${index} ${reason}`);
}

function graphError(reason) {
  return new Error(`Policy group graph ${reason}`);
}

function ownArrayValues(value, reason, index = null) {
  const error = (detail) => (
    index === null ? new TypeError(`${reason} ${detail}`) : groupError(index, `${reason} ${detail}`)
  );
  if (!Array.isArray(value)) throw error("must be an array");

  let keys;
  let lengthDescriptor;
  let prototype;
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch {
    throw error("must be an ordinary array");
  }
  if (
    prototype !== Array.prototype
    || !lengthDescriptor
    || "get" in lengthDescriptor
    || "set" in lengthDescriptor
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
  ) {
    throw error("must be an ordinary array");
  }
  const length = lengthDescriptor.value;
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string") throw error("must not contain symbol properties");
    const number = Number(key);
    if (!Number.isInteger(number) || number < 0 || number >= length || String(number) !== key) {
      throw error("must not contain extra properties");
    }
  }

  const values = [];
  for (let itemIndex = 0; itemIndex < length; itemIndex += 1) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(itemIndex));
    } catch {
      throw error("must be an ordinary array");
    }
    if (!descriptor) throw error("must not be sparse");
    if ("get" in descriptor || "set" in descriptor) throw error("must contain only data properties");
    if (!descriptor.enumerable) throw error("must contain only enumerable items");
    values.push(descriptor.value);
  }
  return values;
}

function ownPlainRecord(value, allowedFields, requiredFields, index, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw groupError(index, `${label} must be a plain object`);
  }

  let prototype;
  let keys;
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
  } catch {
    throw groupError(index, `${label} must be a plain object`);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw groupError(index, `${label} must be a plain object`);
  }

  const values = new Map();
  for (const key of keys) {
    if (typeof key !== "string" || !allowedFields.has(key)) {
      throw groupError(index, `${label} contains an unsupported field`);
    }
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      throw groupError(index, `${label} must contain only data properties`);
    }
    if (!descriptor || "get" in descriptor || "set" in descriptor) {
      throw groupError(index, `${label} must contain only data properties`);
    }
    if (!descriptor.enumerable) {
      throw groupError(index, `${label} must contain only enumerable fields`);
    }
    values.set(key, descriptor.value);
  }
  for (const field of requiredFields) {
    if (!values.has(field)) throw groupError(index, `${label} is missing a required field`);
  }
  return values;
}

function safeText(value, index, label) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.trim() !== value
    || CONTROL_CHARACTERS.test(value)
  ) {
    throw groupError(index, `${label} must be a non-blank single-line string`);
  }
  return value;
}

function safeTestUrl(value, index) {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value) || value.trim() !== value) {
    throw groupError(index, "has an invalid test URL");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw groupError(index, "has an invalid test URL");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol)
    || !parsed.hostname
    || parsed.username
    || parsed.password
    || value.includes("#")
  ) {
    throw groupError(index, "has an invalid test URL");
  }
  return value;
}

function integer(value, index, label, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw groupError(index, `has an invalid ${label}`);
  }
  return value;
}

function validateTest(value, strategy, index) {
  if (strategy === STRATEGY.select) {
    if (value !== null) throw groupError(index, "select strategy must not define test settings");
    return null;
  }
  const values = ownPlainRecord(value, TEST_FIELDS, TEST_FIELDS, index, "test settings");
  return {
    url: safeTestUrl(values.get("url"), index),
    interval: integer(values.get("interval"), index, "interval", { minimum: 1 }),
    timeout: integer(values.get("timeout"), index, "timeout", { minimum: 1, maximum: 60 }),
    tolerance: integer(values.get("tolerance"), index, "tolerance"),
  };
}

function validateFilter(value, index) {
  if (value === null) return null;
  if (
    typeof value !== "string"
    || value.length === 0
    || CONTROL_CHARACTERS.test(value)
  ) {
    throw groupError(index, "has an invalid filter");
  }
  return value;
}

function validateGroup(value, index) {
  const fields = ownPlainRecord(value, GROUP_FIELDS, GROUP_FIELDS, index, "record");
  const kind = fields.get("kind");
  if (typeof kind !== "string" || !GROUP_KINDS.has(kind)) {
    throw groupError(index, "has an unsupported kind");
  }
  const name = safeText(fields.get("name"), index, "name");
  const strategy = fields.get("strategy");
  if (typeof strategy !== "string" || !STRATEGIES.has(strategy)) {
    throw groupError(index, "has an unsupported strategy");
  }

  const candidates = ownArrayValues(fields.get("candidates"), "candidates", index).map(
    (candidate) => safeText(candidate, index, "candidate"),
  );
  if (new Set(candidates).size !== candidates.length) {
    throw groupError(index, "has a duplicate candidate");
  }

  const nodeFilter = validateFilter(fields.get("nodeFilter"), index);
  const groupTest = validateTest(fields.get("test"), strategy, index);
  const hidden = fields.get("hidden");
  if (hidden !== undefined && typeof hidden !== "boolean") {
    throw groupError(index, "has an invalid hidden value");
  }
  const defaultChoice = fields.get("defaultChoice");
  if (defaultChoice !== undefined) {
    safeText(defaultChoice, index, "default choice");
    if (!candidates.includes(defaultChoice) || candidates[0] !== defaultChoice) {
      throw groupError(index, "has an invalid default choice");
    }
  }

  return {
    kind,
    name,
    strategy,
    candidates,
    nodeFilter,
    test: groupTest,
    hidden,
    defaultChoice,
  };
}

function assertAcyclic(names, groups, candidateKey) {
  const state = new Map();
  const visit = (name) => {
    if (state.get(name) === "visiting") throw graphError("contains a cycle");
    if (state.get(name) === "visited") return;
    state.set(name, "visiting");
    const group = groups.get(name);
    for (const candidate of group[candidateKey] ?? []) {
      if (names.has(candidate)) visit(candidate);
    }
    state.set(name, "visited");
  };
  for (const name of names) visit(name);
}

function validateSharedGraph(input) {
  const values = ownArrayValues(input, "Policy groups");
  const groups = values.map(validateGroup);
  const names = new Set();
  for (const group of groups) {
    if (names.has(group.name)) throw graphError("contains a duplicate group name");
    names.add(group.name);
  }

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (RESERVED_GROUP_NAMES.has(group.name)) {
      throw groupError(index, "uses a reserved group name");
    }
    if (!Object.hasOwn(POLICY_GROUP_SCHEMA.groups, group.name)) {
      throw groupError(index, "has an undocumented group name");
    }
    const schema = POLICY_GROUP_SCHEMA.groups[group.name];
    if (group.kind !== schema.kind || group.strategy !== schema.strategy) {
      throw groupError(index, "does not match the shared kind and strategy schema");
    }
    if (!schema.nodeFilters.includes(group.nodeFilter)) {
      throw groupError(index, "does not use the exact shared filter");
    }
    if (group.hidden !== schema.hidden) {
      throw groupError(index, "does not match the shared hidden schema");
    }
    if (group.defaultChoice !== schema.defaultChoice) {
      throw groupError(index, "does not match the shared default choice schema");
    }
  }
  for (const requiredName of POLICY_GROUP_SCHEMA.requiredNames) {
    if (!names.has(requiredName)) throw graphError("is missing a required shared group");
  }
  for (const family of POLICY_GROUP_SCHEMA.continentFamilies) {
    const selectorPresent = names.has(family.selector);
    const automaticPresent = names.has(family.automatic);
    const fallbackPresent = names.has(family.fallback);
    if (
      (!selectorPresent && (automaticPresent || fallbackPresent))
      || (fallbackPresent && !automaticPresent)
    ) {
      throw graphError("contains an incomplete conditional continent family");
    }
  }
  const presentChainNames = POLICY_GROUP_SCHEMA.chainNames.filter((name) => names.has(name));
  if (presentChainNames.length !== 0 && presentChainNames.length !== POLICY_GROUP_SCHEMA.chainNames.length) {
    throw graphError("contains an incomplete conditional chain family");
  }
  const rootGroups = groups.filter((group) => group.name === PRIMARY_GROUP_NAME);
  if (rootGroups.length !== 1) throw graphError("must contain exactly one primary group");
  const root = rootGroups[0];
  if (
    root.kind !== GROUP_KIND.primary
    || root.strategy !== STRATEGY.select
    || root.nodeFilter !== null
    || root.test !== null
    || root.hidden !== undefined
    || root.defaultChoice !== undefined
  ) {
    throw graphError("has an invalid primary selector");
  }

  for (const group of groups) {
    if (group.kind === GROUP_KIND.primary && group !== root) {
      throw graphError("contains an unexpected primary group");
    }
    for (const candidate of group.candidates) {
      if (candidate === POLICY_TARGET.primaryProxy) {
        throw graphError("misuses the primary semantic target");
      }
      if (!names.has(candidate) && !BUILTIN_POLICIES.has(candidate)) {
        throw graphError("contains an unknown reference");
      }
    }
  }

  const byName = new Map(groups.map((group) => [group.name, group]));
  assertAcyclic(names, byName, "candidates");
  if (!POLICY_GROUP_SCHEMA.matchesCanonicalSemantics(groups)) {
    throw graphError("does not match canonical candidate order and semantics");
  }
  return groups;
}

function strategyType(strategy) {
  if (strategy === STRATEGY.autoTest) return "auto_test";
  return strategy;
}

function renderGroup(group, nodeSubscriptionUrl) {
  const type = strategyType(group.strategy);
  const fields = { name: group.name };

  if (group.candidates.length > 0) fields.policies = [...group.candidates];
  if (group.nodeFilter !== null) {
    fields.urls = [nodeSubscriptionUrl];
    fields.filter = group.nodeFilter;
    fields.update_interval = UPDATE_INTERVAL;
  }
  if (group.strategy === STRATEGY.autoTest) {
    fields.latency_test_url = group.test.url;
    fields.interval = group.test.interval;
    fields.timeout = group.test.timeout;
    fields.tolerance = group.test.tolerance;
  } else if (group.strategy === STRATEGY.fallback) {
    fields.latency_test_url = group.test.url;
    fields.interval = group.test.interval;
    fields.timeout = group.test.timeout;
  }
  if (group.hidden !== undefined) fields.hidden = group.hidden;
  return { [type]: fields };
}

function validateRenderedGraph(rendered, sharedGroups, nodeSubscriptionUrl) {
  if (rendered.length !== sharedGroups.length) throw graphError("changed group count after mapping");
  const names = new Set();
  const groups = new Map();

  for (let index = 0; index < rendered.length; index += 1) {
    const record = rendered[index];
    const keys = Object.keys(record);
    if (keys.length !== 1 || !["select", "auto_test", "fallback"].includes(keys[0])) {
      throw graphError("has an invalid rendered strategy");
    }
    const fields = record[keys[0]];
    if (fields.name !== sharedGroups[index].name || names.has(fields.name)) {
      throw graphError("changed or duplicated a rendered group name");
    }
    names.add(fields.name);
    groups.set(fields.name, fields);

    if (fields.name === PRIMARY_GROUP_NAME) {
      if (
        fields.urls !== undefined
        || fields.filter !== undefined
        || fields.update_interval !== undefined
      ) {
        throw graphError("has a rendered primary group with a subscription");
      }
    } else if (fields.urls !== undefined) {
      if (
        fields.urls.length !== 1
        || fields.urls[0] !== nodeSubscriptionUrl
        || typeof fields.filter !== "string"
        || fields.update_interval !== UPDATE_INTERVAL
      ) {
        throw graphError("has an invalid rendered subscription group");
      }
    }
  }

  for (const fields of groups.values()) {
    for (const policy of fields.policies ?? []) {
      if (!names.has(policy) && !BUILTIN_POLICIES.has(policy)) {
        throw graphError("contains an unknown rendered reference");
      }
    }
  }
  assertAcyclic(names, groups, "policies");
}

export function renderEgernGroups(groups, nodeSubscriptionUrl) {
  const validatedUrl = validateEgernNodeSubscriptionUrl(nodeSubscriptionUrl);
  const sharedGroups = validateSharedGraph(groups);
  const rendered = sharedGroups.map((group) => renderGroup(group, validatedUrl));
  validateRenderedGraph(rendered, sharedGroups, validatedUrl);
  return rendered;
}
