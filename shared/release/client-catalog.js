import { CLIENT } from "../contracts.js";

const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

const records = [
  {
    id: CLIENT.anywhere,
    displayName: "Anywhere",
    state: "active",
    platforms: ["iphone", "ipad", "macos", "appletv"],
    configFormat: "clash-yaml",
    ruleFormat: "clash-yaml",
    nodeValidator: "anywhere",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "anywhere-v1",
    publicDirectory: "anywhere",
  },
  {
    id: CLIENT.egern,
    displayName: "Egern",
    state: "active",
    platforms: ["iphone", "ipad", "macos"],
    configFormat: "yaml",
    ruleFormat: "yaml",
    nodeValidator: "egern",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "egern-v1",
    publicDirectory: "egern",
  },
  {
    id: CLIENT.shadowrocket,
    displayName: "Shadowrocket",
    state: "active",
    platforms: ["iphone", "ipad", "macos"],
    configFormat: "ini",
    ruleFormat: "list",
    nodeValidator: "shadowrocket",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "shadowrocket-v1",
    publicDirectory: "shadowrocket",
  },
  {
    id: CLIENT.surge,
    displayName: "Surge",
    state: "active",
    platforms: ["macos", "iphone", "ipad"],
    configFormat: "ini",
    ruleFormat: "list",
    nodeValidator: "surge",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "surge-v1",
    publicDirectory: "surge",
  },
  {
    id: CLIENT.singbox,
    displayName: "sing-box",
    state: "active",
    platforms: ["macos", "iphone", "ipad", "android"],
    configFormat: "json",
    ruleFormat: "srs",
    nodeValidator: "singbox",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "singbox-v1",
    publicDirectory: "sing-box",
  },
  {
    id: CLIENT.happ,
    displayName: "HAPP",
    state: "active",
    platforms: ["macos", "iphone", "ipad"],
    configFormat: "happ-json",
    ruleFormat: "xray-geodata",
    nodeValidator: "happ",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "happ-v1",
    publicDirectory: "happ",
  },
  {
    id: CLIENT.v2box,
    displayName: "V2Box",
    state: "active",
    platforms: ["iphone", "ipad"],
    configFormat: "xray-profile-json",
    ruleFormat: "xray-geodata",
    nodeValidator: "v2box",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "v2box-v1",
    publicDirectory: "v2box",
  },
  {
    id: CLIENT.clash,
    displayName: "Clash Apple",
    state: "active",
    platforms: ["iphone", "ipad", "macos", "appletv"],
    configFormat: "mihomo-yaml",
    ruleFormat: "mihomo-classical-yaml",
    nodeValidator: "clash",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "clash-v1",
    publicDirectory: "clash",
  },
].map((record) => freeze(record));

const byId = new Map(records.map((record) => [record.id, record]));
const ids = freeze(records.map(({ id }) => id));
const activeIds = freeze(records.filter(({ state }) => state === "active").map(({ id }) => id));
const plannedIds = freeze(records.filter(({ state }) => state === "planned").map(({ id }) => id));
const lightweightRuleIds = freeze([
  CLIENT.anywhere,
  CLIENT.egern,
  CLIENT.shadowrocket,
  CLIENT.surge,
  CLIENT.singbox,
  CLIENT.clash,
]);

export function allClientIds() {
  return ids;
}

export function clientAdapter(client) {
  const adapter = byId.get(client);
  if (!adapter) throw new Error(`Unknown client: ${client}`);
  return adapter;
}

export function activeClientIds() {
  return activeIds;
}

export function plannedClientIds() {
  return plannedIds;
}

export function lightweightRuleClientIds() {
  return lightweightRuleIds;
}

export function publicDirectoryForClient(client) {
  return clientAdapter(client).publicDirectory;
}
