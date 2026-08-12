const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function canonicalValue(value, seen = new Set()) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("OneXray Profile contains a non-finite number");
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol" || value === undefined) {
      throw new TypeError("OneXray Profile contains a non-JSON value");
    }
    return value;
  }
  if (seen.has(value)) throw new TypeError("OneXray Profile must not contain cycles");
  seen.add(value);
  let result;
  if (Array.isArray(value)) result = value.map((entry) => canonicalValue(entry, seen));
  else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("OneXray Profile must contain plain objects");
    result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalValue(value[key], seen);
  }
  seen.delete(value);
  return result;
}

export function canonicalProfileJson(profile) {
  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
    throw new TypeError("OneXray Profile must be an object");
  }
  return JSON.stringify(canonicalValue(profile));
}

export function encodeStandardBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("OneXray Profile Base64 input must be bytes");
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    output += BASE64[first >> 2];
    output += BASE64[((first & 0x03) << 4) | (second >> 4)];
    output += index + 1 < bytes.length ? BASE64[((second & 0x0f) << 2) | (third >> 6)] : "=";
    output += index + 2 < bytes.length ? BASE64[third & 0x3f] : "=";
  }
  return output;
}

export function decodeStandardBase64(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value)) {
    throw new TypeError("OneXray Profile link data is not standard Base64");
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((value.length / 4) * 3 - padding);
  let outputIndex = 0;
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64.indexOf(value[index]);
    const b = BASE64.indexOf(value[index + 1]);
    const c = value[index + 2] === "=" ? 0 : BASE64.indexOf(value[index + 2]);
    const d = value[index + 3] === "=" ? 0 : BASE64.indexOf(value[index + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new TypeError("OneXray Profile link data is not standard Base64");
    if (value[index + 2] === "=" && value[index + 3] !== "=") throw new TypeError("OneXray Profile link data has invalid padding");
    if (index + 4 !== value.length && (value[index + 2] === "=" || value[index + 3] === "=")) throw new TypeError("OneXray Profile link data has invalid padding");
    if (value[index + 2] === "=" && (b & 0x0f) !== 0) throw new TypeError("OneXray Profile link data is not canonical Base64");
    if (value[index + 3] === "=" && (c & 0x03) !== 0) throw new TypeError("OneXray Profile link data is not canonical Base64");
    if (outputIndex < bytes.length) bytes[outputIndex] = (a << 2) | (b >> 4);
    outputIndex += 1;
    if (outputIndex < bytes.length) bytes[outputIndex] = ((b & 0x0f) << 4) | (c >> 2);
    outputIndex += 1;
    if (outputIndex < bytes.length) bytes[outputIndex] = ((c & 0x03) << 6) | d;
    outputIndex += 1;
  }
  if (encodeStandardBase64(bytes) !== value) throw new TypeError("OneXray Profile link data is not canonical Base64");
  return bytes;
}

export function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError("OneXray Profile link JSON is not valid UTF-8");
  }
}

