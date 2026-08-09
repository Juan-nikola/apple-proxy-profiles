import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChinaIpAudit,
  parseAuditCidrs,
  validateChinaIpAuditForPromotion,
} from "../src/china-ip-audit.js";

const NOW = "2026-08-09T00:00:00.000Z";
const PRIMARY = Object.freeze({
  repository: "https://github.com/17mon/china_ip_list",
  commit: "a".repeat(40),
  committedAt: "2026-08-08T00:00:00Z",
  sha256: "1".repeat(64),
});
const SECONDARY = Object.freeze({
  repository: "https://github.com/gaoyifan/china-operator-ip",
  commit: "b".repeat(40),
  committedAt: "2026-08-08T00:00:00Z",
  sha256: "2".repeat(64),
});

function entry(kind, value, sourceId = "ChinaIP") {
  return Object.freeze({ kind, value, noResolve: true, sourceId });
}

function audit({
  previousPrimaryEntries = [],
  currentPrimaryEntries = [],
  secondaryEntries = [],
  primary = PRIMARY,
  secondary = SECONDARY,
  now = NOW,
  calibrationStartedAt = "2026-07-25T00:00:00.000Z",
} = {}) {
  return buildChinaIpAudit({
    previousPrimaryEntries,
    currentPrimaryEntries,
    secondaryEntries,
    primary,
    secondary,
    now,
    calibrationStartedAt,
  });
}

test("parses only CIDR data lines and canonicalizes mixed address families", () => {
  const parsed = parseAuditCidrs({
    ipv4Text: "\n# generated list\n  8.8.8.129/24  \n\n",
    ipv6Text: "# IPv6 follows\n2001:4860:0:0::1/32\n",
    sourceId: "ChinaIP-audit",
  });

  assert.deepEqual(parsed, [
    { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP-audit" },
    { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP-audit" },
  ]);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(parsed.every(Object.isFrozen));
});

test("rejects non-text input because UTF-8 decoding belongs to the fetch boundary", () => {
  assert.throws(() => parseAuditCidrs({
    ipv4Text: Buffer.from([0xc3, 0x28]),
    ipv6Text: "2001:4860::/32\n",
    sourceId: "ChinaIP-audit",
  }), /IPv4 audit input must be text/u);
});

test("rejects empty lists, HTML, non-CIDR data, and malformed prefixes", () => {
  const cases = [
    [{ ipv4Text: "\n# no data\n", ipv6Text: "2001:4860::/32\n" }, /IPv4 audit list is empty/u],
    [{ ipv4Text: "8.8.8.0/24\n", ipv6Text: "\n# no data\n" }, /IPv6 audit list is empty/u],
    [{ ipv4Text: "<!doctype html><title>error</title>", ipv6Text: "2001:4860::/32\n" }, /HTML/u],
    [{ ipv4Text: "8.8.8.8\n", ipv6Text: "2001:4860::/32\n" }, /CIDR/u],
    [{ ipv4Text: "8.8.8.0/33\n", ipv6Text: "2001:4860::/32\n" }, /prefix/u],
    [{ ipv4Text: "8.8.8.0/-1\n", ipv6Text: "2001:4860::/32\n" }, /prefix/u],
    [{ ipv4Text: "8.8.8.0/x\n", ipv6Text: "2001:4860::/32\n" }, /prefix/u],
    [{ ipv4Text: "8.8.8.0/24\n", ipv6Text: "2001:4860::/129\n" }, /prefix/u],
    [{ ipv4Text: "8.8.8.0/24 # comment\n", ipv6Text: "2001:4860::/32\n" }, /CIDR/u],
  ];

  for (const [input, expected] of cases) {
    assert.throws(() => parseAuditCidrs({ ...input, sourceId: "ChinaIP-audit" }), expected);
  }
});

test("rejects every forbidden IPv4 and IPv6 range", () => {
  const forbidden = [
    "0.0.0.0/8",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "224.0.0.0/4",
    "240.0.0.0/4",
    "::/128",
    "::1/128",
    "fc00::/7",
    "fe80::/10",
    "ff00::/8",
    "2001:db8::/32",
  ];

  for (const cidr of forbidden) {
    const ipv6 = cidr.includes(":");
    assert.throws(() => parseAuditCidrs({
      ipv4Text: ipv6 ? "8.8.8.0/24\n" : `${cidr}\n`,
      ipv6Text: ipv6 ? `${cidr}\n` : "2001:4860::/32\n",
      sourceId: "ChinaIP-audit",
    }), /forbidden range/u, cidr);
  }
});

test("uses compacted prefixes and exact decimal-string address coverage", () => {
  const report = audit({
    previousPrimaryEntries: [
      entry("ipv4Cidr", "8.8.8.0/25"),
      entry("ipv4Cidr", "8.8.8.128/25"),
      entry("ipv4Cidr", "8.8.8.64/26"),
      entry("ipv6Cidr", "2001:4860::/126"),
    ],
    currentPrimaryEntries: [
      entry("ipv4Cidr", "8.8.8.0/25"),
      entry("ipv4Cidr", "8.8.8.128/26"),
      entry("ipv6Cidr", "2001:4860::/127"),
      entry("ipv6Cidr", "2001:4860::2/128"),
    ],
    secondaryEntries: [
      entry("ipv4Cidr", "8.8.8.0/25", "ChinaIP-secondary"),
      entry("ipv6Cidr", "2001:4860::/127", "ChinaIP-secondary"),
    ],
  });

  assert.deepEqual(report.families, {
    ipv4: {
      previousPrefixes: 1,
      currentPrefixes: 2,
      secondaryPrefixes: 1,
      previousAddresses: "256",
      currentAddresses: "192",
      secondaryAddresses: "128",
      shrinkBasisPoints: "2500",
      divergenceBasisPoints: "3333",
    },
    ipv6: {
      previousPrefixes: 1,
      currentPrefixes: 2,
      secondaryPrefixes: 1,
      previousAddresses: "4",
      currentAddresses: "3",
      secondaryAddresses: "2",
      shrinkBasisPoints: "2500",
      divergenceBasisPoints: "3333",
    },
  });
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.blockers, [
    "ipv4:primary-shrink",
    "ipv4:secondary-divergence",
    "ipv6:primary-shrink",
    "ipv6:secondary-divergence",
  ]);
  assert.equal(typeof report.families.ipv6.currentAddresses, "string");
  assert.equal(typeof report.families.ipv6.divergenceBasisPoints, "string");
});

test("uses strict shrink and divergence thresholds", () => {
  const previousFive = [
    entry("ipv4Cidr", "8.8.8.0/30"),
    entry("ipv4Cidr", "8.8.8.4/32"),
  ];
  const currentFour = [entry("ipv4Cidr", "8.8.8.0/30")];
  const currentTwenty = [
    entry("ipv4Cidr", "8.8.8.0/28"),
    entry("ipv4Cidr", "8.8.8.16/30"),
  ];
  const secondaryNineteen = [
    entry("ipv4Cidr", "8.8.8.0/28", "ChinaIP-secondary"),
    entry("ipv4Cidr", "8.8.8.16/31", "ChinaIP-secondary"),
    entry("ipv4Cidr", "8.8.8.18/32", "ChinaIP-secondary"),
  ];
  const secondarySeventeen = [
    entry("ipv4Cidr", "8.8.8.0/28", "ChinaIP-secondary"),
    entry("ipv4Cidr", "8.8.8.16/32", "ChinaIP-secondary"),
  ];

  const exactShrink = audit({
    previousPrimaryEntries: previousFive,
    currentPrimaryEntries: currentFour,
    secondaryEntries: currentFour,
  });
  assert.equal(exactShrink.families.ipv4.shrinkBasisPoints, "2000");
  assert.deepEqual(exactShrink.blockers, []);

  const exactWarning = audit({
    previousPrimaryEntries: currentTwenty,
    currentPrimaryEntries: currentTwenty,
    secondaryEntries: secondaryNineteen,
  });
  assert.equal(exactWarning.families.ipv4.divergenceBasisPoints, "500");
  assert.deepEqual(exactWarning.warnings, []);

  const exactBlock = audit({
    previousPrimaryEntries: currentTwenty,
    currentPrimaryEntries: currentTwenty,
    secondaryEntries: secondarySeventeen,
  });
  assert.equal(exactBlock.families.ipv4.divergenceBasisPoints, "1500");
  assert.deepEqual(exactBlock.warnings, ["ipv4:secondary-divergence"]);
  assert.deepEqual(exactBlock.blockers, []);

  const overThresholds = audit({
    previousPrimaryEntries: previousFive,
    currentPrimaryEntries: [
      entry("ipv4Cidr", "8.8.8.0/31"),
      entry("ipv4Cidr", "8.8.8.2/32"),
    ],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/31", "ChinaIP-secondary")],
  });
  assert.equal(overThresholds.families.ipv4.shrinkBasisPoints, "4000");
  assert.equal(overThresholds.families.ipv4.divergenceBasisPoints, "3333");
  assert.deepEqual(overThresholds.blockers, [
    "ipv4:primary-shrink",
    "ipv4:secondary-divergence",
  ]);
});

test("uses the previous primary denominator for shrink and current primary for divergence", () => {
  const growth = audit({
    previousPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/31")],
    currentPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/31", "ChinaIP-secondary")],
  });
  assert.equal(growth.families.ipv4.shrinkBasisPoints, "0");
  assert.equal(growth.families.ipv4.divergenceBasisPoints, "5000");

  const oneSideZero = audit({
    previousPrimaryEntries: [entry("ipv6Cidr", "2001:4860::/128")],
    currentPrimaryEntries: [],
    secondaryEntries: [entry("ipv6Cidr", "2001:4860::/128", "ChinaIP-secondary")],
  });
  assert.equal(oneSideZero.families.ipv4.divergenceBasisPoints, "0");
  assert.equal(oneSideZero.families.ipv6.divergenceBasisPoints, "10000");
});

test("serializes arbitrarily large IPv6 divergence without precision loss", () => {
  const report = buildChinaIpAudit({
    previousPrimaryEntries: [entry("ipv6Cidr", "2001:4860::1/128")],
    currentPrimaryEntries: [entry("ipv6Cidr", "2001:4860::1/128")],
    secondaryEntries: [entry("ipv6Cidr", "2001:4000::/18", "ChinaIP-secondary")],
    primary: PRIMARY,
    secondary: SECONDARY,
    now: NOW,
  });

  assert.equal(report.families.ipv6.currentAddresses, "1");
  assert.equal(report.families.ipv6.secondaryAddresses, "1298074214633706907132624082305024");
  assert.equal(report.families.ipv6.shrinkBasisPoints, "0");
  assert.equal(
    report.families.ipv6.divergenceBasisPoints,
    "12980742146337069071326240823050230000",
  );
  assert.deepEqual(report.warnings, ["ipv6:secondary-divergence"]);
  assert.deepEqual(report.blockers, []);
  assert.equal(validateChinaIpAuditForPromotion(report, NOW), true);
});

test("starts a fourteen-day calibration and downgrades only numerical blockers", () => {
  const numerical = buildChinaIpAudit({
    previousPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    currentPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/31")],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/32", "ChinaIP-secondary")],
    primary: PRIMARY,
    secondary: SECONDARY,
    now: NOW,
  });
  assert.equal(numerical.generatedAt, NOW);
  assert.equal(numerical.calibrationStartedAt, NOW);
  assert.equal(numerical.calibrationEndsAt, "2026-08-23T00:00:00.000Z");
  assert.equal(numerical.reportOnly, true);
  assert.deepEqual(numerical.warnings, [
    "ipv4:primary-shrink",
    "ipv4:secondary-divergence",
  ]);
  assert.deepEqual(numerical.blockers, []);

  const staleDuringCalibration = buildChinaIpAudit({
    previousPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    currentPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/31")],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/32", "ChinaIP-secondary")],
    primary: PRIMARY,
    secondary: { ...SECONDARY, committedAt: "2026-08-01T23:59:59.999Z" },
    now: NOW,
  });
  assert.deepEqual(staleDuringCalibration.warnings, [
    "ipv4:primary-shrink",
    "ipv4:secondary-divergence",
  ]);
  assert.deepEqual(staleDuringCalibration.blockers, ["secondary:comparison-stale"]);
});

test("ends calibration at exactly fourteen days and blocks secondary data only after seven days", () => {
  const atCalibrationEnd = audit({
    previousPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    currentPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/31")],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/32", "ChinaIP-secondary")],
    calibrationStartedAt: "2026-07-26T00:00:00.000Z",
  });
  assert.equal(atCalibrationEnd.reportOnly, false);
  assert.deepEqual(atCalibrationEnd.blockers, [
    "ipv4:primary-shrink",
    "ipv4:secondary-divergence",
  ]);

  const exactlySevenDays = audit({
    secondary: { ...SECONDARY, committedAt: "2026-08-02T00:00:00.000Z" },
  });
  assert.deepEqual(exactlySevenDays.blockers, []);

  const olderThanSevenDays = audit({
    secondary: { ...SECONDARY, committedAt: "2026-08-01T23:59:59.999Z" },
  });
  assert.deepEqual(olderThanSevenDays.blockers, ["secondary:comparison-stale"]);
});

test("produces deterministic metadata and diagnostic ordering", () => {
  const input = {
    previousPrimaryEntries: [
      entry("ipv6Cidr", "2001:4860::/126"),
      entry("ipv4Cidr", "8.8.8.0/30"),
    ],
    currentPrimaryEntries: [
      entry("ipv6Cidr", "2001:4860::/127"),
      entry("ipv4Cidr", "8.8.8.0/31"),
    ],
    secondaryEntries: [
      entry("ipv6Cidr", "2001:4860::/128", "ChinaIP-secondary"),
      entry("ipv4Cidr", "8.8.8.0/32", "ChinaIP-secondary"),
    ],
  };
  const forward = audit(input);
  const reversed = audit({
    previousPrimaryEntries: [...input.previousPrimaryEntries].reverse(),
    currentPrimaryEntries: [...input.currentPrimaryEntries].reverse(),
    secondaryEntries: [...input.secondaryEntries].reverse(),
  });

  assert.equal(JSON.stringify(forward), JSON.stringify(reversed));
  assert.deepEqual(Object.keys(forward), [
    "schemaVersion",
    "generatedAt",
    "calibrationStartedAt",
    "calibrationEndsAt",
    "reportOnly",
    "primary",
    "secondary",
    "families",
    "warnings",
    "blockers",
  ]);
  assert.deepEqual(forward.primary, PRIMARY);
  assert.deepEqual(forward.secondary, SECONDARY);
});

test("promotion validation accepts blocker-free reports during and after calibration", () => {
  const report = audit({
    previousPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    currentPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/30", "ChinaIP-secondary")],
  });
  assert.equal(validateChinaIpAuditForPromotion(report, NOW), true);

  const calibrationReport = buildChinaIpAudit({
    previousPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/30")],
    currentPrimaryEntries: [entry("ipv4Cidr", "8.8.8.0/31")],
    secondaryEntries: [entry("ipv4Cidr", "8.8.8.0/32", "ChinaIP-secondary")],
    primary: PRIMARY,
    secondary: SECONDARY,
    now: NOW,
  });
  assert.deepEqual(calibrationReport.warnings, [
    "ipv4:primary-shrink",
    "ipv4:secondary-divergence",
  ]);
  assert.deepEqual(calibrationReport.blockers, []);
  assert.equal(validateChinaIpAuditForPromotion(calibrationReport, NOW), true);
  assert.throws(
    () => validateChinaIpAuditForPromotion(calibrationReport, calibrationReport.calibrationEndsAt),
    /expired calibration report/u,
  );

  const blockedReport = audit({
    secondary: { ...SECONDARY, committedAt: "2026-08-01T23:59:59.999Z" },
  });
  assert.throws(() => validateChinaIpAuditForPromotion(blockedReport, NOW), /blocker/u);
});

test("promotion validation rechecks secondary age against its now argument", () => {
  const report = audit({
    now: "2026-08-09T00:00:00.000Z",
    secondary: { ...SECONDARY, committedAt: "2026-08-03T00:00:00.000Z" },
  });
  assert.equal(validateChinaIpAuditForPromotion(report, "2026-08-10T00:00:00.000Z"), true);
  assert.throws(
    () => validateChinaIpAuditForPromotion(report, "2026-08-10T00:00:00.001Z"),
    /secondary comparison is stale/u,
  );
});

test("promotion validation enforces a closed schema at every object level", () => {
  const valid = audit();
  const mutations = [
    (report) => { report.extra = true; },
    (report) => { report.primary.extra = true; },
    (report) => { report.secondary.extra = true; },
    (report) => { report.families.extra = true; },
    (report) => { report.families.ipv4.extra = true; },
    (report) => { report.families.ipv6.extra = true; },
  ];

  for (const mutate of mutations) {
    const report = structuredClone(valid);
    mutate(report);
    assert.throws(() => validateChinaIpAuditForPromotion(report, NOW), /unknown key/u);
  }

  const missing = structuredClone(valid);
  delete missing.families.ipv4.currentAddresses;
  assert.throws(() => validateChinaIpAuditForPromotion(missing, NOW), /missing key/u);

  const numericAddressCount = structuredClone(valid);
  numericAddressCount.families.ipv4.currentAddresses = 0;
  assert.throws(() => validateChinaIpAuditForPromotion(numericAddressCount, NOW), /decimal string/u);

  const numericBasisPoints = structuredClone(valid);
  numericBasisPoints.families.ipv4.shrinkBasisPoints = 0;
  assert.throws(() => validateChinaIpAuditForPromotion(numericBasisPoints, NOW), /decimal string/u);

  const numericTimestamp = structuredClone(valid);
  numericTimestamp.generatedAt = Date.parse(NOW);
  assert.throws(() => validateChinaIpAuditForPromotion(numericTimestamp, NOW), /timestamp string/u);

  const objectTimestamp = structuredClone(valid);
  objectTimestamp.secondary.committedAt = new Date(SECONDARY.committedAt);
  assert.throws(() => validateChinaIpAuditForPromotion(objectTimestamp, NOW), /timestamp string/u);
});
