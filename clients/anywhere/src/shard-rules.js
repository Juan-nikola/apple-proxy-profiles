import { compareArrsEntries } from "./render-arrs.js";

export const DEFAULT_ARRS_SHARD_LIMIT = 95_000;

export const ANYWHERE_LIGHTWEIGHT_MIGRATION = Object.freeze({
  schemaVersion: 2,
  removed: Object.freeze([
    "Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain", "DomesticGame", "SteamCN",
    "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "OpenAI", "Claude", "Gemini", "Copilot",
    "Netflix", "Disney", "Spotify", "GlobalMedia", "Telegram", "Facebook", "Instagram", "Twitter",
    "TikTok", "PrivateTracker", "ChinaTLD", "ChinaMax_Domain", "Game",
  ]),
  replacements: Object.freeze({
    Security: Object.freeze(["Security"]),
    DomesticCore: Object.freeze(["DomesticCore"]),
    DomesticPlatform: Object.freeze(["DomesticPlatform"]),
    AI: Object.freeze(["AI"]),
    OverseasMedia: Object.freeze(["OverseasMedia"]),
    OverseasSocial: Object.freeze(["OverseasSocial"]),
    Download: Object.freeze(["Download"]),
    ChinaMax_Domain: Object.freeze(["DomesticCore"]),
    Game: Object.freeze(["DomesticCore", "OverseasGame"]),
  }),
  optionalPacks: Object.freeze({
    "adblock-full": "../../optional/adblock-full/manifest.json",
  }),
});

function ids(values, label) {
  if (!Array.isArray(values) || values.some((value) => {
    try {
      safeId(value);
      return false;
    } catch {
      return true;
    }
  }) || new Set(values).size !== values.length) {
    throw new TypeError(`${label} must contain unique safe IDs`);
  }
  return new Set(values);
}

function migrationJson(value) {
  if (Array.isArray(value)) return `[${value.map(migrationJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${migrationJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function validateShardMigration({ previousIds, currentIds, migration }) {
  if (migrationJson(migration) !== migrationJson(ANYWHERE_LIGHTWEIGHT_MIGRATION)) {
    throw new Error("Anywhere shard migration must match the explicit schema-v2 contract");
  }
  const previous = ids(previousIds, "Previous Anywhere shard IDs");
  const current = ids(currentIds, "Current Anywhere shard IDs");
  const allowedRemoved = new Set(ANYWHERE_LIGHTWEIGHT_MIGRATION.removed);
  for (const id of previous) {
    if (!current.has(id) && !allowedRemoved.has(id)) {
      throw new Error(`Anywhere shard ${id} was deleted or renamed without a migration`);
    }
  }
  for (const id of allowedRemoved) {
    if (previous.has(id) && current.has(id)) {
      throw new Error(`Removed Anywhere shard ${id} is still present`);
    }
  }
  for (const [legacyId, replacements] of Object.entries(ANYWHERE_LIGHTWEIGHT_MIGRATION.replacements)) {
    if (!previous.has(legacyId)) continue;
    for (const id of replacements) {
      if (!current.has(id)) throw new Error(`Anywhere replacement shard ${id} is missing`);
    }
  }
}

function safeId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(value)) {
    throw new TypeError("Anywhere rule-set id is unsafe");
  }
  return value;
}

export function shardRuleSet(ruleSet, maxEntries = DEFAULT_ARRS_SHARD_LIMIT) {
  if (!ruleSet || typeof ruleSet !== "object" || Array.isArray(ruleSet)) {
    throw new TypeError("Anywhere rule set must be an object");
  }
  const id = safeId(ruleSet.id);
  if (typeof ruleSet.name !== "string" || !ruleSet.name.trim() || /[\r\n]/u.test(ruleSet.name)) {
    throw new TypeError("Anywhere rule-set name is invalid");
  }
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100_000) {
    throw new RangeError("Anywhere shard limit must be between 1 and 100000");
  }
  if (!Array.isArray(ruleSet.entries)) throw new TypeError("Anywhere rule-set entries must be an array");
  if (ruleSet.entries.length === 0) {
    if (ruleSet.required === false) return Object.freeze([]);
    throw new Error(`Required Anywhere rule set ${id} has no entries`);
  }

  const sorted = [...ruleSet.entries].sort(compareArrsEntries);
  const total = Math.ceil(sorted.length / maxEntries);
  const shards = [];
  for (let index = 0; index < total; index += 1) {
    const number = index + 1;
    const suffix = String(number).padStart(3, "0");
    shards.push(Object.freeze({
      ...ruleSet,
      id: `${id}-${suffix}`,
      sourceId: ruleSet.sourceId ?? id,
      name: total === 1 ? ruleSet.name : `${ruleSet.name} (${number}/${total})`,
      shardIndex: number,
      shardTotal: total,
      entries: Object.freeze(sorted.slice(index * maxEntries, number * maxEntries)),
    }));
  }
  return Object.freeze(shards);
}
