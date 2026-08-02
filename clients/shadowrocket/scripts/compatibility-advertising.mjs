const LEGACY_ADVERTISING = "AdvertisingLite/AdvertisingLite.list";
const APPROVED_ADVERTISING = "Advertising/Advertising.list";
const APPROVED_ADVERTISING_DOMAIN = "Advertising/Advertising_Domain.list";

function occurrences(source, token) {
  return source.split(token).length - 1;
}

/**
 * Expand the one exact legacy RULE-SET line into the two approved adjacent
 * Shadowrocket lines. Every URL prefix, policy and trailing option is copied
 * byte-for-byte from the trusted baseline line.
 */
export function expandLegacyAdvertisingProfile(source) {
  if (typeof source !== "string") throw new TypeError("Compatibility profile must be text");
  const legacyCount = occurrences(source, LEGACY_ADVERTISING);
  const approvedCount = occurrences(source, APPROVED_ADVERTISING);
  const approvedDomainCount = occurrences(source, APPROVED_ADVERTISING_DOMAIN);
  if (legacyCount === 0 && approvedCount === 0 && approvedDomainCount === 0) return source;
  if (
    legacyCount !== 1
    || approvedCount !== 0
    || approvedDomainCount !== 0
  ) {
    throw new Error("Compatibility baseline has an invalid Advertising migration source");
  }

  const tokenIndex = source.indexOf(LEGACY_ADVERTISING);
  const previousLf = source.lastIndexOf("\n", tokenIndex);
  const lineStart = previousLf < 0 ? 0 : previousLf + 1;
  const nextLf = source.indexOf("\n", tokenIndex);
  const hasCrLf = nextLf > lineStart && source[nextLf - 1] === "\r";
  const lineEnd = nextLf < 0 ? source.length : nextLf - (hasCrLf ? 1 : 0);
  const lineEnding = nextLf < 0 ? "\n" : hasCrLf ? "\r\n" : "\n";
  const legacyLine = source.slice(lineStart, lineEnd);

  if (!legacyLine.startsWith("RULE-SET,") || occurrences(legacyLine, LEGACY_ADVERTISING) !== 1) {
    throw new Error("Compatibility baseline has an invalid Advertising migration line");
  }

  const advertisingLine = legacyLine.replace(LEGACY_ADVERTISING, APPROVED_ADVERTISING);
  const advertisingDomainLine = advertisingLine
    .replace(/^RULE-SET,/, "DOMAIN-SET,")
    .replace(APPROVED_ADVERTISING, APPROVED_ADVERTISING_DOMAIN);

  return `${source.slice(0, lineStart)}${advertisingLine}${lineEnding}${advertisingDomainLine}${source.slice(lineEnd)}`;
}
