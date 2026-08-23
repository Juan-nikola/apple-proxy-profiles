import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildClientArtifacts as buildClientArtifactsImpl } from "../src/build-artifacts.js";
import { artifactSha256 } from "../src/artifact-content.js";
import { buildChinaIpAudit } from "../src/china-ip-audit.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";
import {
  buildSite,
  CLIENT_PUBLIC_PATHS,
  prepareCurrentRootFromEdge,
  PUBLIC_RETENTION,
  promoteClientRelease as promoteClientReleaseImpl,
  publishEdgeRelease,
  sealPreviousRelease,
  snapshotMatches,
  validateClientPublication,
} from "../src/build-site.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

const lightweightUpstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "d".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

function chinaIpAuditBytes({
  now = "2026-08-09T00:00:00Z",
  calibrationStartedAt = "2026-08-01T00:00:00Z",
  secondaryCommittedAt = "2026-08-08T00:00:00Z",
  divergent = false,
} = {}) {
  const primaryEntries = [
    { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP" },
    { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP" },
  ];
  const secondaryEntries = divergent ? [
    { kind: "ipv4Cidr", value: "8.8.8.0/25", noResolve: true, sourceId: "ChinaIP-audit" },
    { kind: "ipv6Cidr", value: "2001:4860::/33", noResolve: true, sourceId: "ChinaIP-audit" },
  ] : primaryEntries;
  return Buffer.from(canonicalJson(buildChinaIpAudit({
    previousPrimaryEntries: primaryEntries,
    currentPrimaryEntries: primaryEntries,
    secondaryEntries,
    primary: {
      repository: lightweightUpstream.repository,
      commit: lightweightUpstream.commit,
      committedAt: lightweightUpstream.committedAt,
      sha256: "1".repeat(64),
    },
    secondary: {
      repository: "https://github.com/gaoyifan/china-operator-ip",
      commit: "b".repeat(40),
      committedAt: secondaryCommittedAt,
      sha256: "2".repeat(64),
    },
    now,
    calibrationStartedAt,
  })));
}

function buildClientArtifacts(options) {
  return buildClientArtifactsImpl({
    ...options,
    additionalFiles: options.additionalFiles ?? new Map([
      ["onexray/scripts/onexray-node-generator.js", "native onexray generator\n"],
      ["happ/scripts/happ-config-generator.js", "native happ generator\n"],
    ]),
    chinaIpAudit: options.chinaIpAudit ?? chinaIpAuditBytes(),
  });
}

function promoteClientRelease(options) {
  return promoteClientReleaseImpl(options);
}

async function writeSnapshotForTest(directory, files) {
  for (const [path, content] of files) {
    const destination = join(directory, path);
    await mkdir(join(destination, ".."), { recursive: true });
    await writeFile(destination, content);
  }
}

async function readTreeBytesForTest(directory, current = "") {
  const entries = [];
  for (const entry of await readdir(join(directory, current), { withFileTypes: true })) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) entries.push(...await readTreeBytesForTest(directory, relative));
    else if (entry.isFile()) entries.push([relative, await readFile(join(directory, relative))]);
  }
  return entries.sort(([left], [right]) => left.localeCompare(right));
}

function artifact(hash, text, time = "2026-08-01T00:00:00Z") {
  const manifest = { manifestHash: hash.repeat(64), generatedAt: time, upstream: { commit: "d".repeat(40) } };
  return { manifest, files: new Map([["manifest.json", `${JSON.stringify(manifest)}\n`], ["rules/x.txt", `${text}\n`]]) };
}

test("builds current, previous, and immutable version snapshots atomically", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-"));
  const publicDirectory = join(root, "public");
  const first = artifact("a", "first");
  const second = artifact("b", "second", "2026-08-02T00:00:00Z");
  await buildSite({ publicDirectory, ...first });
  await buildSite({ publicDirectory, ...second });
  assert.equal(await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"), "second\n");
  assert.equal(await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"), "first\n");
  assert.equal(await snapshotMatches(join(publicDirectory, `versions/${first.manifest.manifestHash}`), first.files), true);
  assert.equal(await snapshotMatches(join(publicDirectory, `versions/${second.manifest.manifestHash}`), second.files), true);
});

test("rejects a client publication whose manifest-closed bytes cross channels", () => {
  const path = "edge/surge/rules.txt";
  const content = Buffer.from("https://site/current/surge/rules.txt\n");
  const base = {
    schemaVersion: 1,
    client: "surge",
    files: [{ path, bytes: content.length, sha256: artifactSha256(content) }],
  };
  const manifest = { ...base, manifestHash: artifactSha256(canonicalJson(base)) };
  const files = new Map([
    [path, content],
    ["edge/surge/client-manifest.json", canonicalJson(manifest)],
  ]);

  assert.throws(
    () => validateClientPublication({ files, client: "surge", basePrefix: "edge" }),
    /channel|current|edge/iu,
  );
});

test("rebinds shared region GeoData and the root manifest when preparing current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-current-root-rebind-"));
  const publicDirectory = join(root, "public");
  try {
    const domain = Buffer.from("edge-domain");
    const ip = Buffer.from("edge-ip");
    const regionManifest = {
      channel: "edge",
      domain: { name: "AppleProxySiteEdge", sha256: artifactSha256(domain) },
      ip: { name: "AppleProxyIPEdge", sha256: artifactSha256(ip) },
      names: { domain: "AppleProxySiteEdge", ip: "AppleProxyIPEdge" },
      urls: {
        domain: "https://example.test/edge/geodata/cn/AppleProxySiteEdge.dat",
        ip: "https://example.test/edge/geodata/cn/AppleProxyIPEdge.dat",
      },
    };
    const rootBase = {
      schemaVersion: 2,
      files: [{ path: "geodata/cn/AppleProxySiteEdge.dat", bytes: domain.length, sha256: artifactSha256(domain) }],
    };
    const rootManifest = {
      ...rootBase,
      manifestHash: artifactSha256(canonicalJson(rootBase)),
    };
    await mkdir(join(publicDirectory, "edge/geodata/cn"), { recursive: true });
    await writeFile(join(publicDirectory, "edge/geodata/cn/AppleProxySiteEdge.dat"), domain);
    await writeFile(join(publicDirectory, "edge/geodata/cn/AppleProxyIPEdge.dat"), ip);
    await writeFile(join(publicDirectory, "edge/geodata/cn/manifest.json"), canonicalJson(regionManifest));
    await writeFile(join(publicDirectory, "edge/manifest.json"), canonicalJson(rootManifest));

    await prepareCurrentRootFromEdge({ publicDirectory });

    assert.equal(await readFile(join(publicDirectory, "current/geodata/cn/AppleProxySiteCurrent.dat"), "utf8"), "edge-domain");
    assert.equal(await readFile(join(publicDirectory, "current/geodata/cn/AppleProxyIPCurrent.dat"), "utf8"), "edge-ip");
    await assert.rejects(
      () => readFile(join(publicDirectory, "current/geodata/cn/AppleProxySiteEdge.dat")),
      { code: "ENOENT" },
    );
    const currentRegion = JSON.parse(await readFile(join(publicDirectory, "current/geodata/cn/manifest.json"), "utf8"));
    assert.equal(currentRegion.channel, "current");
    assert.equal(currentRegion.names.domain, "AppleProxySiteCurrent");
    assert.match(currentRegion.urls.domain, /\/current\/geodata\/cn\/AppleProxySiteCurrent\.dat$/u);
    const currentRootBytes = await readFile(join(publicDirectory, "current/manifest.json"));
    const currentRoot = JSON.parse(currentRootBytes);
    assert.equal(currentRoot.files[0].path, "geodata/cn/AppleProxySiteCurrent.dat");
    assert.equal(currentRoot.manifestHash, artifactSha256(canonicalJson({
      schemaVersion: 2,
      files: currentRoot.files,
    })));
    assert.equal(currentRootBytes.equals(Buffer.from(canonicalJson(currentRoot))), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promotes without real-device canary evidence and rejects a mismatched native client", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-gates-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: lightweightUpstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.surge.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });

  await promoteClientReleaseImpl({
    publicDirectory,
    client: "surge",
    expectedHash: hash,
    now: "2026-08-09T01:00:00Z",
  });
  await assert.rejects(
    () => promoteClientReleaseImpl({
      publicDirectory,
      client: "happ",
      expectedHash: hash,
      canary: { device: "fixture", passed: true },
    }),
    /manifest|client|hash|unsupported/u,
  );
});

test("refreshes the public audit dashboard after independent client promotion", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-dashboard-"));
  const publicDirectory = join(root, "public");
  try {
    const currentArtifacts = buildClientArtifacts({
      snapshot: lightweightFixtureSnapshots(),
      upstream: lightweightUpstream,
      channel: "current",
    });
    const edgeArtifacts = buildClientArtifacts({
      snapshot: lightweightFixtureSnapshots(),
      upstream: lightweightUpstream,
      channel: "edge",
    });
    const surgeHash = edgeArtifacts.diagnostics.defaultManifest.clients.surge.manifestHash;
    const shadowrocketHash = edgeArtifacts.diagnostics.defaultManifest.clients.shadowrocket.manifestHash;
    await buildSite({
      publicDirectory,
      files: currentArtifacts.defaults,
      manifest: currentArtifacts.diagnostics.defaultManifest,
    });
    await publishEdgeRelease({
      publicDirectory,
      defaults: edgeArtifacts.defaults,
      optionalPacks: edgeArtifacts.optionalPacks,
      manifest: edgeArtifacts.diagnostics.defaultManifest,
    });

    await promoteClientReleaseImpl({
      publicDirectory,
      client: "surge",
      expectedHash: surgeHash,
      now: "2026-08-09T01:00:00Z",
    });
    let dashboard = JSON.parse(await readFile(join(publicDirectory, "current/audit/dashboard.json"), "utf8"));
    const promotedSurgeHash = JSON.parse(await readFile(join(publicDirectory, "current/surge/client-manifest.json"), "utf8")).manifestHash;
    const previousSurgeHash = JSON.parse(await readFile(join(publicDirectory, "previous/surge/client-manifest.json"), "utf8")).manifestHash;
    assert.equal(dashboard.channels.current.manifestCount, 9);
    assert.equal(dashboard.channels.previous.manifestCount, 9);
    assert.equal(dashboard.clients.surge.current.manifestHash, promotedSurgeHash);
    assert.equal(dashboard.clients.surge.previous.manifestHash, previousSurgeHash);

    await promoteClientReleaseImpl({
      publicDirectory,
      client: "shadowrocket",
      expectedHash: shadowrocketHash,
      now: "2026-08-09T01:00:00Z",
    });
    dashboard = JSON.parse(await readFile(join(publicDirectory, "current/audit/dashboard.json"), "utf8"));
    const promotedShadowrocketHash = JSON.parse(await readFile(join(publicDirectory, "current/shadowrocket/client-manifest.json"), "utf8")).manifestHash;
    const previousShadowrocketHash = JSON.parse(await readFile(join(publicDirectory, "previous/shadowrocket/client-manifest.json"), "utf8")).manifestHash;
    assert.equal(dashboard.channels.current.manifestCount, 9);
    assert.equal(dashboard.channels.previous.manifestCount, 9);
    assert.equal(dashboard.clients.surge.previous.manifestHash, previousSurgeHash);
    assert.equal(dashboard.clients.shadowrocket.previous.manifestHash, previousShadowrocketHash);
    assert.equal(dashboard.clients.shadowrocket.current.manifestHash, promotedShadowrocketHash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("seals current into an independently closed previous channel idempotently", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-seal-previous-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: lightweightUpstream,
    channel: "current",
  });
  await writeSnapshotForTest(join(publicDirectory, "current"), artifacts.defaults);
  const first = await sealPreviousRelease({ publicDirectory });
  const firstBytes = await readTreeBytesForTest(join(publicDirectory, "previous"));
  const previousScript = firstBytes.find(([path]) => path.endsWith("/client-manifest.json"));
  assert.ok(previousScript);
  assert.equal(first.channel, "previous");
  assert.doesNotMatch(firstBytes.map(([, value]) => value.toString("utf8")).join("\n"), /\/current\//u);
  assert.match(firstBytes.map(([, value]) => value.toString("utf8")).join("\n"), /\/previous\//u);

  const second = await sealPreviousRelease({ publicDirectory });
  const secondBytes = await readTreeBytesForTest(join(publicDirectory, "previous"));
  assert.deepEqual(second, first);
  assert.deepEqual(secondBytes, firstBytes);
});

test("rewrites quoted channel fields when sealing current into previous", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-seal-quoted-channel-"));
  const publicDirectory = join(root, "public");
  await mkdir(join(publicDirectory, "current/egern/scripts"), { recursive: true });
  await writeFile(join(publicDirectory, "current/manifest.json"), "{}\n");
  await writeFile(
    join(publicDirectory, "current/egern/scripts/egern-profile-generator.js"),
    'const defaults = { channel: "current" };\n',
  );

  await sealPreviousRelease({ publicDirectory });

  const previous = await readFile(
    join(publicDirectory, "previous/egern/scripts/egern-profile-generator.js"),
    "utf8",
  );
  assert.match(previous, /channel: "previous"/u);
  assert.doesNotMatch(previous, /channel: "current"/u);
});

test("rewrites channel URLs embedded in HAPP routing deep links", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-seal-happ-deeplink-"));
  const publicDirectory = join(root, "public");
  const profile = {
    Geoipurl: "https://juan-nikola.github.io/apple-proxy-profiles/current/happ/geoip.dat",
    Geositeurl: "https://juan-nikola.github.io/apple-proxy-profiles/current/happ/geosite.dat",
  };
  const deepLink = `happ://routing/onadd/${Buffer.from(JSON.stringify(profile), "utf8").toString("base64")}`;
  await mkdir(join(publicDirectory, "current/happ"), { recursive: true });
  await writeFile(join(publicDirectory, "current/manifest.json"), "{}\n");
  await writeFile(join(publicDirectory, "current/happ/index.html"), `<a href="${deepLink}">HAPP</a>\n`);

  await sealPreviousRelease({ publicDirectory });

  const previous = await readFile(join(publicDirectory, "previous/happ/index.html"), "utf8");
  const encoded = previous.match(/happ:\/\/routing\/onadd\/([A-Za-z0-9+/=]+)/u)?.[1];
  assert.ok(encoded);
  const rewritten = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  assert.equal(rewritten.Geoipurl, "https://juan-nikola.github.io/apple-proxy-profiles/previous/happ/geoip.dat");
  assert.equal(rewritten.Geositeurl, "https://juan-nikola.github.io/apple-proxy-profiles/previous/happ/geosite.dat");
});

test("rewrites percent-encoded channel URLs when sealing previous", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-seal-encoded-channel-"));
  const publicDirectory = join(root, "public");
  await mkdir(join(publicDirectory, "current/anywhere"), { recursive: true });
  await writeFile(join(publicDirectory, "current/manifest.json"), "{}\n");
  await writeFile(
    join(publicDirectory, "current/anywhere/import.html"),
    "https%3A%2F%2Fjuan-nikola.github.io%2Fapple-proxy-profiles%2Fcurrent%2Fanywhere%2Frules%2FAI-001.arrs\n",
  );

  await sealPreviousRelease({ publicDirectory });

  const previous = await readFile(join(publicDirectory, "previous/anywhere/import.html"), "utf8");
  assert.doesNotMatch(previous, /%2Fcurrent%2F/iu);
  assert.match(previous, /%2Fprevious%2F/iu);
});

test("leaves the last known-good rollback snapshot intact on an identical update", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-noop-"));
  const publicDirectory = join(root, "public");
  const first = artifact("a", "first");
  const second = artifact("b", "second", "2026-08-02T00:00:00Z");
  await buildSite({ publicDirectory, ...first });
  await buildSite({ publicDirectory, ...second });

  const before = {
    current: await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"),
    previous: await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"),
    version: await readFile(join(
      publicDirectory,
      `versions/${second.manifest.manifestHash}/rules/x.txt`,
    ), "utf8"),
  };
  const result = await buildSite({ publicDirectory, ...second });
  const after = {
    current: await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"),
    previous: await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"),
    version: await readFile(join(
      publicDirectory,
      `versions/${second.manifest.manifestHash}/rules/x.txt`,
    ), "utf8"),
  };

  assert.deepEqual(after, before);
  assert.equal(after.current, "second\n");
  assert.equal(after.previous, "first\n");
  assert.equal(result.versionCount, 2);
});

test("fails a no-op update when its immutable version no longer matches", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-corrupt-"));
  const publicDirectory = join(root, "public");
  const first = artifact("a", "first");
  const second = artifact("b", "second", "2026-08-02T00:00:00Z");
  await buildSite({ publicDirectory, ...first });
  await buildSite({ publicDirectory, ...second });
  await writeFile(
    join(publicDirectory, `versions/${second.manifest.manifestHash}/rules/x.txt`),
    "corrupt\n",
    "utf8",
  );

  await assert.rejects(
    () => buildSite({ publicDirectory, ...second }),
    /Immutable public version bytes changed or are missing/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"), "second\n");
  assert.equal(await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"), "first\n");
});

test("pins a bounded online version window below the Pages capacity budget", () => {
  assert.deepEqual(PUBLIC_RETENTION, {
    maxBytes: 750 * 1024 * 1024,
    maxVersions: 8,
    minVersions: 2,
  });
});

test("retains the current immutable version when publication timestamps tie", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-tied-retention-"));
  const publicDirectory = join(root, "public");
  let latest;
  for (let index = 0; index < PUBLIC_RETENTION.maxVersions + 2; index += 1) {
    latest = artifact(index.toString(16), `snapshot-${index}`);
    await buildSite({ publicDirectory, ...latest });
  }

  assert.equal(
    await snapshotMatches(join(publicDirectory, `versions/${latest.manifest.manifestHash}`), latest.files),
    true,
  );
  const versions = await readdir(join(publicDirectory, "versions"));
  assert.equal(versions.length, PUBLIC_RETENTION.maxVersions);
});

test("publishes frontier channel files without overwriting the stable snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-frontier-"));
  const publicDirectory = join(root, "public");
  const stable = artifact("a", "stable");
  const frontierFiles = new Map([
    ["edge/surge/scripts/profile.js", "edge surge\n"],
    ["edge/sing-box/scripts/config.js", "edge sing-box\n"],
  ]);
  await buildSite({ publicDirectory, ...stable, frontierFiles });
  assert.equal(await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"), "stable\n");
  assert.equal(await readFile(join(publicDirectory, "edge/surge/scripts/profile.js"), "utf8"), "edge surge\n");
  assert.equal(await readFile(join(publicDirectory, "edge/sing-box/scripts/config.js"), "utf8"), "edge sing-box\n");
});

test("rejects frontier artifacts that reference another publication channel", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-frontier-closure-"));
  const publicDirectory = join(root, "public");
  const stable = artifact("a", "stable");
  const frontierFiles = new Map([
    ["edge/surge/scripts/profile.js", "const url = '/current/surge/rules/Fixture.list';\n"],
  ]);

  await assert.rejects(
    () => buildSite({ publicDirectory, ...stable, frontierFiles }),
    /channel|current|edge/iu,
  );
});

test("preserves binary artifact bytes in site emission and snapshot comparison", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-binary-"));
  const publicDirectory = join(root, "public");
  const binary = Buffer.from([0xd9, 0x9d, 0x73, 0x72]);
  const release = artifact("c", "text");
  release.files.set("sing-box/rule-sets/test.srs", binary);

  await buildSite({ publicDirectory, ...release });

  assert.deepEqual(await readFile(join(publicDirectory, "current/sing-box/rule-sets/test.srs")), binary);
  assert.equal(await snapshotMatches(join(publicDirectory, "current"), release.files), true);
});

test("publishes edge and immutable per-client bytes without replacing current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-edge-"));
  const publicDirectory = join(root, "public");
  await mkdir(join(publicDirectory, "current"), { recursive: true });
  await writeFile(join(publicDirectory, "current/stable.txt"), "stable\n");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: lightweightUpstream });
  const { defaults, optionalPacks } = artifacts;
  const manifest = artifacts.diagnostics.defaultManifest;

  await publishEdgeRelease({ publicDirectory, defaults, optionalPacks, manifest });

  assert.equal(await readFile(join(publicDirectory, "current/stable.txt"), "utf8"), "stable\n");
  assert.deepEqual(
    await readFile(join(publicDirectory, "edge/audit/china-ip-drift.json")),
    defaults.get("audit/china-ip-drift.json"),
  );
  await assert.rejects(
    () => readFile(join(
      publicDirectory,
      `edge/clients/singbox/${manifest.clients.singbox.manifestHash}/audit/china-ip-drift.json`,
    )),
    /ENOENT/u,
  );
  assert.deepEqual(await readFile(join(publicDirectory, "edge/sing-box/rules/ChinaIP.json")), Buffer.from(
    defaults.get("sing-box/rules/ChinaIP.json"),
  ));
  assert.deepEqual(await readFile(join(
    publicDirectory,
    `edge/clients/singbox/${manifest.clients.singbox.manifestHash}/sing-box/rules/ChinaIP.json`,
  )), Buffer.from(defaults.get("sing-box/rules/ChinaIP.json")));
  assert.deepEqual(await readFile(join(
    publicDirectory,
    `edge/optional-versions/adblock-full/${artifacts.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash}/sing-box/rules/Advertising.json`,
  )), Buffer.from(optionalPacks.get("adblock-full").get("optional/adblock-full/sing-box/rules/Advertising.json")));
  const clientManifest = JSON.parse(await readFile(join(
    publicDirectory,
    `edge/clients/singbox/${manifest.clients.singbox.manifestHash}/client-manifest.json`,
  ), "utf8"));
  assert.equal(
    clientManifest.optionalPacks["adblock-full"],
    artifacts.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );
});

test("binds optional client selections into the promoted client manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-edge-selection-tamper-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: lightweightUpstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  const immutable = join(publicDirectory, "edge/clients/singbox", hash);
  const clientManifest = JSON.parse(await readFile(join(immutable, "client-manifest.json"), "utf8"));
  clientManifest.optionalPacks["adblock-full"] = "f".repeat(64);
  const { manifestHash: ignored, ...baseManifest } = clientManifest;
  clientManifest.manifestHash = artifactSha256(canonicalJson(baseManifest));
  await writeFile(join(immutable, "client-manifest.json"), canonicalJson(clientManifest));

  await assert.rejects(
    () => promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash }),
    /manifest hash does not match promotion target/u,
  );
});

test("repairs stale optional previous channel links during client promotion", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-optional-previous-closure-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: lightweightUpstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.happ.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  const importText = "https%3A%2F%2Fjuan-nikola.github.io%2Fapple-proxy-profiles%2Fcurrent%2Fanywhere%2Frules%2FAI-001.arrs\n";
  await mkdir(join(publicDirectory, "optional/adblock-full/current/anywhere"), { recursive: true });
  await mkdir(join(publicDirectory, "optional/adblock-full/previous/anywhere"), { recursive: true });
  await writeFile(join(publicDirectory, "optional/adblock-full/current/anywhere/import.html"), importText);
  await writeFile(join(publicDirectory, "optional/adblock-full/previous/anywhere/import.html"), importText);

  await promoteClientRelease({
    publicDirectory,
    client: "happ",
    expectedHash: hash,
    now: new Date("2026-08-09T12:00:00Z"),
  });

  const previous = await readFile(
    join(publicDirectory, "optional/adblock-full/previous/anywhere/import.html"),
    "utf8",
  );
  assert.match(previous, /%2Fprevious%2F/iu);
  assert.doesNotMatch(previous, /%2Fcurrent%2F/iu);
});

test("promotes calibration warnings with the exact manifested audit bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-audit-calibration-"));
  const publicDirectory = join(root, "public");
  const chinaIpAudit = chinaIpAuditBytes({ divergent: true });
  const report = JSON.parse(chinaIpAudit);
  assert.equal(report.reportOnly, true);
  assert.ok(report.warnings.length > 0);
  assert.deepEqual(report.blockers, []);
  const artifacts = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: lightweightUpstream,
    chinaIpAudit,
  });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });

  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: hash,
    now: "2026-08-09T01:00:00Z",
  });

  assert.deepEqual(
    await readFile(join(publicDirectory, "current/audit/china-ip-drift.json")),
    chinaIpAudit,
  );
});

test("rejects a substituted audit even when client content and approval hash are unchanged", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-audit-substitution-"));
  const publicDirectory = join(root, "public");
  const approvedAudit = chinaIpAuditBytes();
  const substitutedAudit = chinaIpAuditBytes({ divergent: true });
  const artifacts = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: lightweightUpstream,
    chinaIpAudit: approvedAudit,
  });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  const manifestPath = join(publicDirectory, "edge/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const { manifestHash: ignored, ...base } = manifest;
  const auditRecord = base.files.find(({ path }) => path === "audit/china-ip-drift.json");
  auditRecord.bytes = substitutedAudit.length;
  auditRecord.sha256 = artifactSha256(substitutedAudit);
  await writeFile(join(publicDirectory, "edge/audit/china-ip-drift.json"), substitutedAudit);
  await writeFile(manifestPath, canonicalJson({
    ...base,
    manifestHash: artifactSha256(canonicalJson(base)),
  }));
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");

  await assert.rejects(
    () => promoteClientRelease({
      publicDirectory,
      client: "singbox",
      manifestHash: hash,
      now: "2026-08-09T01:00:00Z",
    }),
    /approved client manifest does not bind the edge ChinaIP audit/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/sing-box/old.txt"), "utf8"), "old\n");
});

test("rejects a client-bound audit whose primary provenance differs from the edge root", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-audit-primary-mismatch-"));
  const publicDirectory = join(root, "public");
  const report = JSON.parse(chinaIpAuditBytes());
  report.primary.commit = "c".repeat(40);
  const chinaIpAudit = Buffer.from(canonicalJson(report));
  const artifacts = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: lightweightUpstream,
    chinaIpAudit,
  });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });

  await assert.rejects(
    () => promoteClientRelease({
      publicDirectory,
      client: "singbox",
      manifestHash: hash,
      now: "2026-08-09T01:00:00Z",
    }),
    /primary provenance does not match the edge root upstream/u,
  );
});

test("treats backup cleanup failure as post-commit maintenance", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-cleanup-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: lightweightUpstream,
  });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");
  let cleanupCalls = 0;

  const result = await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: hash,
    now: "2026-08-09T01:00:00Z",
    cleanupBackupImpl: async () => {
      cleanupCalls += 1;
      throw new Error("simulated backup cleanup failure");
    },
  });

  assert.equal(cleanupCalls, 1);
  assert.equal(result.client, "singbox");
  assert.equal(result.backupCleanupPending, true);
  assert.deepEqual(
    await readFile(join(publicDirectory, "current/audit/china-ip-drift.json")),
    artifacts.defaults.get("audit/china-ip-drift.json"),
  );
  await assert.rejects(
    () => readFile(join(publicDirectory, "current/sing-box/old.txt")),
    /ENOENT/u,
  );
});

test("rejects stale, unmanifested, and hash-mismatched audit evidence before promotion", async () => {
  const cases = [
    {
      name: "stale report",
      chinaIpAudit: chinaIpAuditBytes({
        now: "2026-08-01T00:00:00Z",
        calibrationStartedAt: "2026-07-01T00:00:00Z",
        secondaryCommittedAt: "2026-08-01T00:00:00Z",
      }),
      mutate: async () => {},
      pattern: /report is stale/u,
    },
    {
      name: "unmanifested report",
      chinaIpAudit: chinaIpAuditBytes(),
      mutate: async (publicDirectory) => {
        const path = join(publicDirectory, "edge/manifest.json");
        const manifest = JSON.parse(await readFile(path, "utf8"));
        const { manifestHash: ignored, ...base } = manifest;
        base.files = base.files.filter((record) => record.path !== "audit/china-ip-drift.json");
        await writeFile(path, canonicalJson({
          ...base,
          manifestHash: artifactSha256(canonicalJson(base)),
        }));
      },
      pattern: /not present in the edge root manifest/u,
    },
    {
      name: "changed report bytes",
      chinaIpAudit: chinaIpAuditBytes(),
      mutate: async (publicDirectory) => {
        await writeFile(join(publicDirectory, "edge/audit/china-ip-drift.json"), "{}\n");
      },
      pattern: /bytes differ from the edge root manifest/u,
    },
  ];

  for (const { name, chinaIpAudit, mutate, pattern } of cases) {
    const root = await mkdtemp(join(tmpdir(), "apple-proxy-audit-gate-"));
    const publicDirectory = join(root, "public");
    const artifacts = buildClientArtifacts({
      snapshot: lightweightFixtureSnapshots(),
      upstream: lightweightUpstream,
      chinaIpAudit,
    });
    const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
    await publishEdgeRelease({
      publicDirectory,
      defaults: artifacts.defaults,
      optionalPacks: artifacts.optionalPacks,
      manifest: artifacts.diagnostics.defaultManifest,
    });
    await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
    await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");
    await mutate(publicDirectory);

    await assert.rejects(
      () => promoteClientRelease({
        publicDirectory,
        client: "singbox",
        manifestHash: hash,
        now: "2026-08-09T01:00:00Z",
      }),
      pattern,
      name,
    );
    assert.equal(
      await readFile(join(publicDirectory, "current/sing-box/old.txt"), "utf8"),
      "old\n",
      name,
    );
  }
});

test("rejects cryptographically open edge candidates before swapping edge", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-edge-open-"));
  const publicDirectory = join(root, "public");
  await mkdir(join(publicDirectory, "current"), { recursive: true });
  await writeFile(join(publicDirectory, "current/stable.txt"), "stable\n");
  const defaults = new Map();
  const clients = {};
  let index = 1;
  for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
    const manifestHash = String(index).repeat(64);
    clients[client] = { manifestHash };
    defaults.set(`${directory}/rules.bin`, Buffer.from([index]));
    defaults.set(`${directory}/client-manifest.json`, `${JSON.stringify({ manifestHash, files: [] })}\n`);
    index += 1;
  }
  const manifest = { manifestHash: "a".repeat(64), clients };
  defaults.set("manifest.json", `${JSON.stringify(manifest)}\n`);
  const optionalPacks = new Map([["adblock-full", new Map([
    ["optional/adblock-full/manifest.json", "{}\n"],
  ])]]);

  await assert.rejects(
    () => publishEdgeRelease({ publicDirectory, defaults, optionalPacks, manifest }),
    /manifest|file records/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/stable.txt"), "utf8"), "stable\n");
});
