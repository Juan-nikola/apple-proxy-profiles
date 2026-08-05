import { createHash } from "node:crypto";

import { createFrontierManifest, validateFrontierManifest } from "../../shared/release/frontier-manifest.js";

const CLIENT_DIRECTORY = Object.freeze({ surge: "surge", singbox: "sing-box" });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  return `${JSON.stringify(value, (key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map((entry) => [entry, item[entry]]));
  }, 2)}\n`;
}

function safePath(path) {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.includes("\\")
    && !path.split("/").includes("..")
    && !path.split("/").includes("");
}

function channelContent(content, channel) {
  if (typeof content !== "string") throw new TypeError("Frontier static file content must be text");
  if (channel === "current") return content;
  return content.replaceAll("/current/", `/${channel}/`);
}

export function buildFrontierArtifacts({ ruleBaseUrl, manifests, staticFiles }) {
  if (typeof ruleBaseUrl !== "string" || !/^https:\/\/[^\s]+$/u.test(ruleBaseUrl)) {
    throw new TypeError("Frontier rule base URL must be HTTPS");
  }
  if (!Array.isArray(manifests) || manifests.length === 0) throw new TypeError("Frontier manifests are required");
  if (!(staticFiles instanceof Map)) throw new TypeError("Frontier static files must be a Map");

  const records = manifests.map((input) => {
    const record = validateFrontierManifest(input) ? input : createFrontierManifest(input);
    if (!validateFrontierManifest(record)) throw new Error("Frontier manifest is invalid");
    return record;
  });
  const channels = [...new Set(records.map(({ channel }) => channel))];
  const files = new Map();
  for (const [path, content] of staticFiles) {
    if (!safePath(path) || typeof content !== "string") throw new TypeError("Frontier static file path/content is invalid");
    const client = Object.entries(CLIENT_DIRECTORY).find(([, directory]) => path === directory || path.startsWith(`${directory}/`))?.[0];
    if (!client) throw new Error(`Frontier static file has unknown client path: ${path}`);
    for (const channel of channels) {
      if (!records.some((record) => record.client === client && record.channel === channel && record.status !== "rejected")) continue;
      files.set(`${channel}/${path}`, channelContent(content, channel));
    }
  }
  for (const record of records) {
    files.set(`${record.channel}/${record.client}/${record.platform}/manifest.json`, canonicalJson(record));
  }
  for (const channel of channels) {
    const channelRecords = records.filter((record) => record.channel === channel);
    files.set(`${channel}/${channel === "current" ? "frontier-manifest" : "manifest"}.json`, canonicalJson({
      schemaVersion: 1,
      channel,
      ruleBaseUrl: ruleBaseUrl.replace(/\/current$/u, `/${channel}`),
      records: channelRecords,
      manifestSha256: sha256(canonicalJson(channelRecords)),
    }));
  }
  return files;
}
