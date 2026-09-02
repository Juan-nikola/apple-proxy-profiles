import { decodeBase64UrlUtf8, encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";

const CRYPT1_PREFIX = "incy://crypt1/";
const AUTOROUTING_BASE = "https://juan-nikola.github.io/apple-proxy-profiles";

function assertString(value, label) {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
}

export function incyAutoroutingUrl(channel = "current") {
  assertString(channel, "INCY autorouting channel");
  return `${AUTOROUTING_BASE}/${channel}/incy/routing.json`;
}

export function encodeIncyCrypt1(value) {
  assertString(value, "INCY crypt1 payload");
  return `${CRYPT1_PREFIX}${encodeBase64UrlUtf8(value)}`;
}

export function decodeIncyCrypt1(value) {
  assertString(value, "INCY crypt1 payload");
  if (!value.startsWith(CRYPT1_PREFIX)) {
    throw new Error("INCY crypt1 payload is invalid");
  }
  const encoded = value.slice(CRYPT1_PREFIX.length);
  if (encoded.length === 0) {
    throw new Error("INCY crypt1 payload is invalid");
  }
  return decodeBase64UrlUtf8(encoded);
}
