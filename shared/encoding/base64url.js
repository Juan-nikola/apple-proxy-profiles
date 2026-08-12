const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const REVERSE = new Map([...ALPHABET].map((character, index) => [character, index]));

function assertBase64Url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) {
    throw new TypeError("Base64URL value is invalid");
  }
}

/** Decodes canonical unpadded Base64URL without Node or browser globals. */
export function decodeBase64Url(value) {
  assertBase64Url(value);
  if (value.length === 0) return new Uint8Array();

  const remainder = value.length % 4;
  const last = REVERSE.get(value.at(-1));
  if (remainder === 2 && (last & 0x0f) !== 0 || remainder === 3 && (last & 0x03) !== 0) {
    throw new TypeError("Base64URL value is not canonical");
  }

  const bytes = new Uint8Array(Math.floor(value.length * 6 / 8));
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const character of value) {
    accumulator = (accumulator << 6) | REVERSE.get(character);
    bits += 6;
    if (bits < 8) continue;
    bits -= 8;
    bytes[offset] = (accumulator >> bits) & 0xff;
    offset += 1;
    accumulator &= (1 << bits) - 1;
  }
  if (bits !== 0 && accumulator !== 0) throw new TypeError("Base64URL value is not canonical");
  return bytes;
}

export function decodeBase64UrlUtf8(value) {
  const bytes = decodeBase64Url(value);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError("Base64URL value is not valid UTF-8");
  }
}

export function encodeBase64Url(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("Base64URL input must be bytes");
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    result += ALPHABET[first >> 2];
    result += ALPHABET[((first & 0x03) << 4) | (second >> 4)];
    if (index + 1 < bytes.length) result += ALPHABET[((second & 0x0f) << 2) | (third >> 6)];
    if (index + 2 < bytes.length) result += ALPHABET[third & 0x3f];
  }
  return result;
}

export function encodeBase64UrlUtf8(value) {
  if (typeof value !== "string") throw new TypeError("Base64URL text input must be a string");
  return encodeBase64Url(new TextEncoder().encode(value));
}
