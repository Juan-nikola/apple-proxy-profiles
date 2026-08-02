const CLONE_ERROR = "Egern structured clone fallback rejected unsupported data";
const URL_ERROR = "Invalid Egern fallback URL";
const RAW_URL_FORBIDDEN = /[\u0000-\u0020\u007f-\u009f\\\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/u;
const ENCODED_URL_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f|[89][0-9a-f])/iu;
const HEX = /^[0-9a-f]+$/iu;

function cloneFailure() {
  return new TypeError(CLONE_ERROR);
}

function arrayIndex(key, length) {
  if (!/^(?:0|[1-9]\d*)$/u.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index)
    && index >= 0
    && index < length
    && index <= 4_294_967_294
    && String(index) === key;
}

function cloneData(value, seen) {
  if (value === null || typeof value !== "object") {
    if (["undefined", "boolean", "string", "number", "bigint"].includes(typeof value)) return value;
    throw cloneFailure();
  }
  if (seen.has(value)) return seen.get(value);

  const prototype = Object.getPrototypeOf(value);
  const isArray = Array.isArray(value);
  if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    throw cloneFailure();
  }

  const keys = Reflect.ownKeys(value);
  const result = isArray ? [] : Object.create(prototype === null ? null : Object.prototype);
  seen.set(value, result);
  const length = isArray ? value.length : 0;

  for (const key of keys) {
    if (typeof key !== "string") throw cloneFailure();
    if (isArray && key === "length") continue;
    if (isArray && !arrayIndex(key, length)) throw cloneFailure();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
      throw cloneFailure();
    }
    Object.defineProperty(result, key, {
      value: cloneData(descriptor.value, seen),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  if (isArray) result.length = length;
  return result;
}

export function egernStructuredCloneFallback(value) {
  try {
    return cloneData(value, new WeakMap());
  } catch {
    throw cloneFailure();
  }
}

function wellFormed(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function validPercentEncoding(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "%") continue;
    if (!/^[0-9a-f]{2}$/iu.test(value.slice(index + 1, index + 3))) return false;
    index += 2;
  }
  return !ENCODED_URL_CONTROL.test(value);
}

function validIpv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => (
    /^(?:0|[1-9]\d{0,2})$/u.test(part) && Number(part) <= 255
  ));
}

function endsInNumber(value) {
  const parts = value.split(".");
  if (parts.at(-1) === "") parts.pop();
  const last = parts.at(-1) ?? "";
  return /^[0-9]+$/u.test(last) || /^0x[0-9a-f]*$/iu.test(last);
}

function ipv6Units(parts, allowIpv4) {
  let units = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.includes(".")) {
      if (!allowIpv4 || index !== parts.length - 1 || !validIpv4(part)) return -1;
      units += 2;
    } else {
      if (part.length < 1 || part.length > 4 || !HEX.test(part)) return -1;
      units += 1;
    }
  }
  return units;
}

function validIpv6(value) {
  if (value.length === 0 || value.includes("%") || value.includes(":::")) return false;
  const compression = value.indexOf("::");
  if (compression === -1) return ipv6Units(value.split(":"), true) === 8;
  if (compression !== value.lastIndexOf("::")) return false;
  const left = value.slice(0, compression);
  const right = value.slice(compression + 2);
  const leftParts = left === "" ? [] : left.split(":");
  const rightParts = right === "" ? [] : right.split(":");
  const leftUnits = ipv6Units(leftParts, false);
  const rightUnits = ipv6Units(rightParts, true);
  return leftUnits >= 0 && rightUnits >= 0 && leftUnits + rightUnits < 8;
}

function parsedCredentials(authority) {
  const marker = authority.indexOf("@");
  if (marker === -1) return { username: "", passcode: "", hostPort: authority };
  if (marker !== authority.lastIndexOf("@")) throw new TypeError(URL_ERROR);
  const userInfo = authority.slice(0, marker);
  if (!/^[A-Za-z0-9._~!$&'()*+,;=:-]*$/u.test(userInfo)) throw new TypeError(URL_ERROR);
  const separator = userInfo.indexOf(":");
  return {
    username: separator === -1 ? userInfo : userInfo.slice(0, separator),
    passcode: separator === -1 ? "" : userInfo.slice(separator + 1),
    hostPort: authority.slice(marker + 1),
  };
}

function parsedPort(value) {
  if (value === "") throw new TypeError(URL_ERROR);
  if (!/^\d{1,5}$/u.test(value) || Number(value) > 65_535) throw new TypeError(URL_ERROR);
  return String(Number(value));
}

function validDnsName(value) {
  const comparable = value.endsWith(".") ? value.slice(0, -1) : value;
  if (comparable.length === 0 || comparable.length > 253) return false;
  if (validIpv4(comparable)) return true;
  if (endsInNumber(value)) return false;
  return comparable.split(".").every((label) => (
    label.length >= 1
    && label.length <= 63
    && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label)
  ));
}

function parsedHost(hostPort) {
  if (hostPort.length === 0 || hostPort.includes("%")) throw new TypeError(URL_ERROR);
  if (hostPort.startsWith("[")) {
    const close = hostPort.indexOf("]");
    if (close === -1 || close !== hostPort.lastIndexOf("]")) throw new TypeError(URL_ERROR);
    const address = hostPort.slice(1, close);
    const remainder = hostPort.slice(close + 1);
    if (!validIpv6(address) || remainder !== "" && !remainder.startsWith(":")) {
      throw new TypeError(URL_ERROR);
    }
    return {
      hostname: `[${address.toLowerCase()}]`,
      port: remainder === "" ? "" : parsedPort(remainder.slice(1)),
    };
  }
  if (hostPort.includes("[") || hostPort.includes("]")) throw new TypeError(URL_ERROR);
  const separators = hostPort.match(/:/gu)?.length ?? 0;
  if (separators > 1) throw new TypeError(URL_ERROR);
  const separator = hostPort.lastIndexOf(":");
  const hostname = separator === -1 ? hostPort : hostPort.slice(0, separator);
  const port = separator === -1 ? "" : parsedPort(hostPort.slice(separator + 1));
  if (!validDnsName(hostname)) throw new TypeError(URL_ERROR);
  return { hostname: hostname.toLowerCase(), port };
}

export class EgernUrlFallback {
  constructor(value) {
    try {
      if (
        typeof value !== "string"
        || value.length === 0
        || !wellFormed(value)
        || RAW_URL_FORBIDDEN.test(value)
        || !validPercentEncoding(value)
      ) throw new TypeError(URL_ERROR);
      const match = /^(https?):\/\/([^/?#]+)([/?#].*)?$/iu.exec(value);
      if (!match) throw new TypeError(URL_ERROR);
      const credentials = parsedCredentials(match[2]);
      const host = parsedHost(credentials.hostPort);
      this.protocol = `${match[1].toLowerCase()}:`;
      this.hostname = host.hostname;
      this.username = credentials.username;
      Object.defineProperty(this, "password", {
        value: credentials.passcode,
        configurable: true,
        enumerable: true,
        writable: true,
      });
      this.port = host.port;
    } catch {
      throw new TypeError(URL_ERROR);
    }
  }
}

function install(name, value) {
  try {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    throw new Error("Egern runtime compatibility unavailable");
  }
}

export function installEgernRuntimeFallbacks() {
  let cloneImplementation;
  let urlImplementation;
  try {
    cloneImplementation = globalThis.structuredClone;
    urlImplementation = globalThis.URL;
    if (cloneImplementation !== undefined && typeof cloneImplementation !== "function") {
      throw new Error("Invalid structured clone global");
    }
    if (urlImplementation !== undefined && typeof urlImplementation !== "function") {
      throw new Error("Invalid URL global");
    }
  } catch {
    throw new Error("Egern runtime compatibility unavailable");
  }
  if (cloneImplementation === undefined) {
    install("structuredClone", egernStructuredCloneFallback);
  }
  if (urlImplementation === undefined) {
    install("URL", EgernUrlFallback);
  }
}
