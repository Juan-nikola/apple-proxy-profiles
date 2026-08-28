import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeHappGeodata } from "../automation/src/render-happ-geodata.js";
import { renderHappRoutingProfile } from "../clients/happ/src/routing-profile-data.js";

const GEO_REFERENCE = /^(geoip|geosite):([^:]+)$/u;
const SUPPORTED_PLATFORMS = Object.freeze(["macos", "iphone", "ipad"]);

export function collectGeoDataReferences(value, output = new Set()) {
  if (typeof value === "string") {
    const match = value.match(GEO_REFERENCE);
    if (match) output.add(`${match[1]}:${match[2].toUpperCase()}`);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectGeoDataReferences(item, output));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectGeoDataReferences(item, output));
  }
  return output;
}

function profileReferences(profile) {
  return collectGeoDataReferences([
    profile?.DirectSites, profile?.ProxySites, profile?.BlockSites,
    profile?.DirectIp, profile?.ProxyIp, profile?.BlockIp,
  ]);
}

export function assertGeoDataClosure({ configs, profile, geositeCodes, geoipCodes }) {
  const references = collectGeoDataReferences(configs);
  const retained = profileReferences(profile);
  const missingFromProfile = [...references].filter((reference) => !retained.has(reference)).sort();
  const missingFromFile = [...references].filter((reference) => {
    const [kind, code] = reference.split(":");
    return !(kind === "geosite" ? geositeCodes : geoipCodes).has(code);
  }).sort();
  if (missingFromProfile.length || missingFromFile.length) {
    const parts = [];
    if (missingFromProfile.length) parts.push(`profile missing ${missingFromProfile.join(", ")}`);
    if (missingFromFile.length) parts.push(`GeoData missing ${missingFromFile.join(", ")}`);
    throw new Error(`HAPP GeoData closure failed: ${parts.join("; ")}`);
  }
  return Object.freeze({ references, retained });
}

function requiredArg(args, name) {
  const value = args.get(name);
  if (!value) throw new Error(`Missing required argument --${name}`);
  return value;
}

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument ${token}`);
    const [key, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) args.set(key, inline);
    else args.set(key, argv[++index]);
  }
  return args;
}

export function xrayEnvironment(cwd, baseEnv = process.env) {
  if (typeof cwd !== "string" || cwd.length === 0) throw new TypeError("HAPP Xray asset directory is required");
  return { ...baseEnv, "xray.location.asset": cwd };
}

function xrayTest(xrayBin, configPath, cwd) {
  const result = spawnSync(xrayBin, ["run", "-test", "-config", configPath], {
    cwd,
    env: xrayEnvironment(cwd),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw new Error(`Unable to execute Xray: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Xray rejected generated config (exit ${result.status ?? "signal"})`);
}

export async function checkHappXray({ xrayBin, configFile, geoipFile, geositeFile }) {
  if (!xrayBin) throw new Error("XRAY_BIN is required");
  const [rawConfig, geoip, geosite] = await Promise.all([
    readFile(configFile, "utf8"), readFile(geoipFile), readFile(geositeFile),
  ]);
  const parsed = JSON.parse(rawConfig);
  const configs = Array.isArray(parsed) ? parsed : [parsed];
  if (configs.length === 0) throw new Error("HAPP JSON config array is empty");
  const geodata = decodeHappGeodata(new Map([["happ/geosite.dat", geosite], ["happ/geoip.dat", geoip]]));
  const profile = renderHappRoutingProfile({ baseUrl: "https://example.invalid/current", generatedAt: "2026-08-20T00:00:00Z" });
  const geositeCodes = new Set(geodata.geosite.map((entry) => entry.countryCode));
  const geoipCodes = new Set(geodata.geoip.map((entry) => entry.countryCode));
  assertGeoDataClosure({ configs, profile, geositeCodes, geoipCodes });

  const tempDir = await mkdtemp(resolve(dirname(configFile), ".happ-xray-check-"));
  try {
    await writeFile(resolve(tempDir, "geoip.dat"), geoip);
    await writeFile(resolve(tempDir, "geosite.dat"), geosite);
    for (let index = 0; index < configs.length; index += 1) {
      const path = resolve(tempDir, `config-${index + 1}.json`);
      await writeFile(path, `${JSON.stringify(configs[index], null, 2)}\n`);
      try {
        xrayTest(xrayBin, path, tempDir);
      } catch (error) {
        throw new Error(`HAPP Xray config ${index + 1} failed: ${error.message}`);
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
  return Object.freeze({ configs: configs.length, geosite: geositeCodes.size, geoip: geoipCodes.size });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const platforms = args.get("platforms")?.split(",").filter(Boolean) ?? SUPPORTED_PLATFORMS;
  const config = requiredArg(args, "config");
  const geoip = requiredArg(args, "geoip");
  const geosite = requiredArg(args, "geosite");
  const xrayBin = process.env.XRAY_BIN;
  for (const platform of platforms) {
    if (!SUPPORTED_PLATFORMS.includes(platform)) throw new Error(`Unsupported HAPP platform ${platform}`);
    const result = await checkHappXray({ xrayBin, configFile: config.replace(/\{platform\}/gu, platform), geoipFile: geoip, geositeFile: geosite });
    console.log(`[happ-xray] ${platform}: ${result.configs} configs, ${result.geosite} geosite labels, ${result.geoip} geoip labels`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
