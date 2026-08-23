export const V2BOX_PUBLIC_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";

function isIpv4(host) {
  const parts = host.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

function privateIpv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const value = parts[0] * 0x1000000 + parts[1] * 0x10000 + parts[2] * 0x100 + parts[3];
  return value < 0x01000000 || value >= 0x0a000000 && value <= 0x0affffff || value >= 0x64400000 && value <= 0x647fffff || value >= 0x7f000000 && value <= 0x7fffffff || value >= 0xa9fe0000 && value <= 0xa9feffff || value >= 0xac100000 && value <= 0xac1fffff || value >= 0xc0000000 && value <= 0xc00000ff || value >= 0xc0000200 && value <= 0xc00002ff || value >= 0xc0a80000 && value <= 0xc0a8ffff || value >= 0xc6120000 && value <= 0xc613ffff || value >= 0xc6336400 && value <= 0xc63364ff || value >= 0xcb007100 && value <= 0xcb0071ff || value >= 0xe0000000;
}

function isReservedIpv6(host) {
  const normalized = host.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/u);
  if (mapped && isIpv4(mapped[1])) return privateIpv4(mapped[1]);
  const pieces = normalized.split("::");
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces[1] ? pieces[1].split(":") : [];
  if (pieces.length > 2 || left.length + right.length > 8) return true;
  const groups = [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    .map((part) => Number.parseInt(part || "0", 16));
  if (groups.length !== 8 || groups.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) return true;
  const first = groups[0];
  return groups.every((part) => part === 0)
    || normalized === "::1"
    || (first & 0xfe00) === 0xfc00
    || (first & 0xffc0) === 0xfe80
    || (first & 0xff00) === 0xff00
    || (groups[0] === 0x2001 && groups[1] === 0x0db8);
}

function isUnsafeHost(hostname) {
  const host = hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  if (isIpv4(host)) return privateIpv4(host);
  if (host.includes(":") && /^[0-9a-f:]+$/u.test(host)) return isReservedIpv6(host);
  return host === "localhost"
    || /(?:\.local|\.internal|\.invalid)$/u.test(host)
    || host.length === 0;
}

function hasExplicitPort(value) {
  const authority = value.match(/^https:\/\/([^/?#]*)/iu)?.[1] ?? "";
  return /^(?:[^/@]+@)?[^/]+:\d+$/u.test(authority);
}

export function validatePublicBase(value) {
  if (typeof value !== "string" || /[\x00-\x20\\]/u.test(value) || /(?:^|\/)\.\.(?:\/|$)/u.test(value)) {
    throw new Error("V2Box asset publicBase is invalid");
  }
  let url;
  try { url = new URL(value); } catch { throw new Error("V2Box asset publicBase is invalid"); }
  const expected = new URL(V2BOX_PUBLIC_ROOT);
  const normalizedPath = url.pathname.replace(/\/+$/u, "") || "/";
  if (url.protocol !== "https:"
    || url.origin !== expected.origin
    || normalizedPath !== expected.pathname
    || url.username || url.password || url.port || hasExplicitPort(value) || url.search || url.hash
    || isUnsafeHost(url.hostname)) {
    throw new Error("V2Box asset publicBase is invalid");
  }
  return Object.freeze({ origin: url.origin, root: normalizedPath });
}

export function validateAssetUrl(value, expectedPath, expectedOrigin = new URL(V2BOX_PUBLIC_ROOT).origin) {
  let url; try { url = new URL(value); } catch { throw new Error("V2Box asset URL is invalid"); }
  if (url.protocol !== "https:"
    || url.origin !== expectedOrigin
    || url.username || url.password || url.port || hasExplicitPort(value) || url.search || url.hash
    || isUnsafeHost(url.hostname)
    || url.pathname !== expectedPath
    || url.href !== `${url.origin}${expectedPath}`) {
    throw new Error("V2Box asset URL is invalid or unbound");
  }
  return url;
}
