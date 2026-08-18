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
    id: CLIENT.onexray,
    displayName: "OneXray",
    state: "planned",
    platforms: ["macos", "iphone", "ipad", "android", "windows", "linux"],
    configFormat: "xray-profile-json",
    ruleFormat: "xray-geodata",
    nodeValidator: "onexray",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "onexray-v1-planned",
    publicDirectory: "onexray",
  },
  {
    id: CLIENT.happ,
    displayName: "HAPP",
    state: "planned",
    platforms: ["iphone", "ipad", "macos", "android"],
    configFormat: "happ-json",
    ruleFormat: "happ-json",
    nodeValidator: "happ",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "happ-v4-planned",
    publicDirectory: "happ",
  },
].map((record) => freeze(record));

const byId = new Map(records.map((record) => [record.id, record]));
const ids = freeze(records.map(({ id }) => id));
const activeIds = freeze(records.filter(({ state }) => state === "active").map(({ id }) => id));
const plannedIds = freeze(records.filter(({ state }) => state === "planned").map(({ id }) => id));

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

export function publicDirectoryForClient(client) {
  return clientAdapter(client).publicDirectory;
}
