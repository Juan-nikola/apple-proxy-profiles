import { renderXrayOutbound, renderXrayNodeError } from "../../../shared/nodes/render-xray-outbound.js";
import { oneXrayGeoCode, oneXrayGeoNames, oneXrayGeoReference } from "../../onexray/src/geodata-contract.js";

function bytes(value, label) {
  if (!(Buffer.isBuffer(value) || value instanceof Uint8Array)) throw new TypeError(`v2rayN GeoData ${label} asset is missing or invalid`);
  return Buffer.from(value);
}

// Small synchronous SHA-256 verifier keeps the Sub-Store bundle platform-neutral.
function sha256(input) {
  const bytes = new Uint8Array(input); const words = new Uint32Array(64); const state = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const constants = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6); padded.set(bytes); padded[bytes.length] = 0x80; const bitLength = bytes.length * 8;
  new DataView(padded.buffer).setUint32(padded.length - 4, bitLength, false);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = new DataView(padded.buffer, offset + i * 4, 4).getUint32(0, false);
    for (let i = 16; i < 64; i++) { const x = words[i - 15]; const y = words[i - 2]; words[i] = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + words[i - 16] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + words[i - 7] | 0; }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i++) { const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)); const ch = (e & f) ^ (~e & g); const t1 = (h + s1 + ch + constants[i] + words[i]) | 0; const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)); const maj = (a & b) ^ (a & c) ^ (b & c); const t2 = (s0 + maj) | 0; [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0]; }
    state[0] = (state[0] + a) | 0; state[1] = (state[1] + b) | 0; state[2] = (state[2] + c) | 0; state[3] = (state[3] + d) | 0; state[4] = (state[4] + e) | 0; state[5] = (state[5] + f) | 0; state[6] = (state[6] + g) | 0; state[7] = (state[7] + h) | 0;
  }
  return [...state].map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
}

function geoReferences(geoData, options) {
  const names = oneXrayGeoNames(options.channel);
  if (geoData === null || geoData === undefined) {
    const source = `REGION-${options.region.toUpperCase()}`;
    return { domain: [oneXrayGeoReference(options.channel, "domain", source)], ip: [oneXrayGeoReference(options.channel, "ip", source)] };
  }
  if (!geoData || typeof geoData !== "object" || Array.isArray(geoData) || !geoData.manifest) throw new TypeError("v2rayN GeoData manifest is required");
  const manifest = geoData.manifest;
  if (manifest.schemaVersion !== 1 || manifest.region !== options.region || manifest.channel !== options.channel) throw new Error("v2rayN GeoData manifest region/channel mismatch");
  if (!manifest.names || manifest.names.domain !== names.domain || manifest.names.ip !== names.ip) throw new Error("v2rayN GeoData manifest names mismatch");
  const domain = bytes(geoData.geosite ?? geoData.domain, "domain");
  const ip = bytes(geoData.geoip ?? geoData.ip, "ip");
  for (const type of ["domain", "ip"]) {
    const asset = type === "domain" ? domain : ip;
    const record = manifest[type];
    if (!record || record.name !== names[type] || record.byteLength !== asset.byteLength || record.sha256 !== sha256(asset) || manifest.hashes?.[type] !== sha256(asset)) {
      throw new Error(`v2rayN GeoData ${type} manifest hash or byteLength mismatch`);
    }
  }
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) throw new Error("v2rayN GeoData manifest sources are missing");
  const codes = manifest.sources.map((source) => {
    if (!source || typeof source.id !== "string" || source.code !== oneXrayGeoCode(source.id)) throw new Error("v2rayN GeoData manifest source code mismatch");
    return source.code;
  });
  if (Array.isArray(manifest.sourceCodes) && JSON.stringify(manifest.sourceCodes.map(({ code }) => code)) !== JSON.stringify(codes)) throw new Error("v2rayN GeoData sourceCodes mismatch");
  return { domain: codes.map((code) => `ext:${names.domain}.dat:${code}`), ip: codes.map((code) => `ext:${names.ip}.dat:${code}`) };
}

function dns(options) { return { servers: [{ tag: "china-dns", address: options.chinaDns === "system" ? "localhost" : "223.5.5.5", domains: ["geosite:cn", "geosite:private"] }, { tag: "global-dns", address: options.globalDns === "google" ? "8.8.8.8" : "1.1.1.1", domains: ["geosite:apple-proxy-overseas"] }], queryStrategy: options.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP", tag: "dnsQuery" }; }
export function renderV2rayNProfile({ nodes, options, geoData = null, filterFailures = {} } = {}) {
  if (!options || options.output !== "config") throw new Error("v2rayN profile options are required");
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("v2rayN profile requires compatible nodes");
  const outbounds = [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }]; const failures = { ...filterFailures };
  nodes.forEach((node, index) => { try { outbounds.push(renderXrayOutbound(node, { tag: `ap-node-${index.toString(36)}`, client: "v2rayn" })); } catch (error) { const diagnostic = renderXrayNodeError(error, "v2rayn"); Object.entries(diagnostic.excluded).forEach(([key, count]) => { failures[key] = (failures[key] ?? 0) + count; }); } });
  if (outbounds.length === 2) throw new Error("v2rayN profile: no compatible nodes");
  const references = geoReferences(geoData, options);
  const rules = [{ domain: ["geosite:private"], outboundTag: "direct" }, { domain: [`geosite:${options.region}`, ...references.domain], outboundTag: "direct" }, { ip: [`geoip:${options.region}`, ...references.ip], outboundTag: "direct" }];
  if (options.blockMode !== "off") rules.unshift({ domain: ["geosite:apple-proxy-security"], outboundTag: "block" });
  rules.push({ network: "tcp,udp", outboundTag: "proxy" });
  return { name: options.name, dns: dns(options), inbounds: [{ tag: "tun", protocol: "tun", settings: { mtu: 1500 }, sniffing: { enabled: true, routeOnly: true } }], outbounds: [...outbounds, { protocol: "selector", tag: "proxy", settings: { selectors: outbounds.slice(2).map(({ tag }) => tag) } }], routing: { domainStrategy: "IPIfNonMatch", rules }, ...(Object.keys(failures).length ? { renderFailures: failures } : {}) };
}
