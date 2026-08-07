import { parseSurgeRules } from "../src/parse-surge.js";
import { FETCH_SOURCE_CATALOG } from "../src/source-catalog.js";

function fetched(source, text) {
  const parsed = parseSurgeRules(text, { ...source, minEntries: 0 });
  return Object.freeze({
    text,
    source,
    entries: parsed.entries,
    rawUrl: `https://raw.githubusercontent.com/fixture/${source.id}`,
    sourceBytes: Buffer.byteLength(text),
    sourceSha256: "a".repeat(64),
  });
}

export function lightweightFixtureSnapshots() {
  const snapshots = new Map(FETCH_SOURCE_CATALOG.map((source) => {
    const text = source.inputFormat === "DOMAIN-SET"
      ? `.fixture-${source.id.toLowerCase()}.example\n`
      : `DOMAIN-SUFFIX,fixture-${source.id.toLowerCase()}.example\n`;
    return [source.id, fetched(source, text)];
  }));
  const replace = (id, text) => {
    const source = FETCH_SOURCE_CATALOG.find((item) => item.id === id);
    snapshots.set(id, fetched(source, text));
  };

  replace("Game", [
    "DOMAIN-SUFFIX,tencentgames.com",
    "DOMAIN-SUFFIX,steampowered.com",
    "IP-CIDR,203.0.113.0/24,no-resolve",
  ].join("\n"));
  replace("ChinaIPs", [
    "IP-CIDR,1.0.1.0/25,no-resolve",
    "IP-CIDR,1.0.1.128/25,no-resolve",
    "IP-CIDR6,2400:3200::/33,no-resolve",
    "IP-CIDR6,2400:3200:8000::/33,no-resolve",
  ].join("\n"));
  replace("ChinaMax", "IP-ASN,4134,no-resolve\n");
  replace("ChinaMax_Domain", ".discarded.example\n");
  replace("Advertising", "DOMAIN-SUFFIX,ads.example\n");
  replace("Advertising_Domain", ".tracker.example\n");
  return snapshots;
}
