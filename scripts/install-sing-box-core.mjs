import { spawn } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Explicit callers can pin this version. CI resolves the newest published
// testing release from GitHub's official Atom feed before every build.
export const SING_BOX_VERSION = "1.14.0-beta.17";
const RELEASE_FEED_URL = "https://github.com/SagerNet/sing-box/releases.atom";
const RELEASE_ROOT = (version) => `https://github.com/SagerNet/sing-box/releases/download/v${version}`;
const RELEASE_ASSETS_URL = (version) => `https://github.com/SagerNet/sing-box/releases/expanded_assets/v${version}`;
const RELEASE_RETRY_DELAYS_MS = Object.freeze([1_000, 2_000]);
const PLATFORM_SUFFIXES = Object.freeze({
  "linux/x64": "linux-amd64",
  "linux/arm64": "linux-arm64",
  "linux/arm": "linux-armv7",
  "darwin/arm64": "darwin-arm64",
  "darwin/x64": "darwin-amd64",
});

function sleep(delayMs) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));
}

function retryableReleaseStatus(status) {
  return status === 429 || (Number.isInteger(status) && status >= 500 && status <= 599);
}

async function fetchWithRetry(url, init, {
  fetchImpl,
  sleepImpl,
  description,
}) {
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  if (typeof sleepImpl !== "function") throw new TypeError("A sleep implementation is required");
  let response;
  for (let attempt = 0; attempt <= RELEASE_RETRY_DELAYS_MS.length; attempt += 1) {
    response = await fetchImpl(url, init);
    if (response?.ok) break;
    const status = response?.status;
    if (!retryableReleaseStatus(status) || attempt === RELEASE_RETRY_DELAYS_MS.length) {
      throw new Error(`Failed to download ${description} (${status ?? "no response"})`);
    }
    await sleepImpl(RELEASE_RETRY_DELAYS_MS[attempt]);
  }
  return response;
}

function attribute(element, name) {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "u").exec(element);
  return match?.[1] ?? null;
}

export async function resolveSingBoxTestingRelease({ fetchImpl = fetch, sleepImpl = sleep } = {}) {
  const response = await fetchWithRetry(RELEASE_FEED_URL, {
    headers: {
      Accept: "application/atom+xml",
      "User-Agent": "apple-proxy-profiles-sing-box-installer",
    },
  }, {
    fetchImpl,
    sleepImpl,
    description: "official sing-box release feed",
  });
  const feed = await response.text();
  if (typeof feed !== "string") throw new Error("sing-box release feed is invalid");
  const entries = feed.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gu) ?? [];
  const candidates = [];
  for (const entry of entries) {
    const updatedMatch = /<updated>([^<]+)<\/updated>/u.exec(entry);
    const updatedAt = Date.parse(updatedMatch?.[1] ?? "");
    if (!Number.isFinite(updatedAt)) continue;
    const links = entry.match(/<link\b[^>]*>/gu) ?? [];
    for (const link of links) {
      if (attribute(link, "rel") !== "alternate" || attribute(link, "type") !== "text/html") continue;
      const href = attribute(link, "href") ?? "";
      const tagMatch = /^https:\/\/github\.com\/SagerNet\/sing-box\/releases\/tag\/(v\d+\.\d+\.\d+-[0-9A-Za-z.-]+)$/u.exec(href);
      if (!tagMatch) continue;
      candidates.push({ tag: tagMatch[1], updatedAt });
    }
  }
  candidates.sort((left, right) => right.updatedAt - left.updatedAt);
  const release = candidates[0];
  if (!release) throw new Error("No published sing-box testing release was found");
  const version = release.tag.slice(1);
  return Object.freeze({ version, tag: release.tag, commit: null });
}

export function releaseAsset(platform = process.platform, arch = process.arch, version = SING_BOX_VERSION) {
  const suffix = PLATFORM_SUFFIXES[`${platform}/${arch}`];
  if (!suffix) throw new Error(`Unsupported sing-box platform: ${platform}/${arch}`);
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) throw new Error("Invalid sing-box version");
  const archiveName = `sing-box-${version}-${suffix}.tar.gz`;
  return Object.freeze({
    version,
    suffix,
    archiveName,
    archiveUrl: `${RELEASE_ROOT(version)}/${archiveName}`,
    integrityUrl: RELEASE_ASSETS_URL(version),
  });
}

export function digestForReleaseAssetPage(html, asset) {
  if (typeof html !== "string") throw new Error("Official sing-box release asset page is invalid");
  const version = asset?.version ?? SING_BOX_VERSION;
  const archiveName = asset?.archiveName ?? "";
  const expectedPath = `/SagerNet/sing-box/releases/download/v${version}/${archiveName}`;
  if (asset?.archiveUrl !== `https://github.com${expectedPath}`) {
    throw new Error(`Official release asset URL mismatch: ${archiveName || "missing"}`);
  }
  const digestLabel = `Copy to clipboard digest for ${archiveName}`;
  const rows = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gu) ?? [];
  const matches = rows.filter((row) => row.includes(`aria-label="${digestLabel}"`));
  if (matches.length === 0) throw new Error(`Official release asset is missing: ${archiveName}`);
  if (matches.length !== 1) throw new Error(`Official release asset is duplicate: ${archiveName}`);
  const [row] = matches;
  const hrefs = (row.match(/\bhref="[^"]+"/gu) ?? []).map((match) => attribute(match, "href"));
  if (hrefs.filter((href) => href === expectedPath).length !== 1) {
    throw new Error(`Official release asset URL mismatch: ${asset.archiveName}`);
  }
  const digestElements = (row.match(/<clipboard-copy\b[^>]*>/gu) ?? [])
    .filter((element) => attribute(element, "aria-label") === digestLabel);
  if (digestElements.length !== 1) throw new Error(`Official release asset digest is duplicate: ${archiveName}`);
  const digestMatch = /^sha256:([0-9a-f]{64})$/u.exec(attribute(digestElements[0], "value") ?? "");
  if (!digestMatch) throw new Error(`Official release asset digest is invalid: ${archiveName}`);
  return digestMatch[1];
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function equalDigest(actual, expected) {
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

async function download(url, fetchImpl, headers = {}) {
  const response = await fetchImpl(url, { redirect: "follow", headers });
  if (!response?.ok) throw new Error(`Failed to download official sing-box asset (${response?.status ?? "no response"}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function downloadIntegrityPage(url, fetchImpl, sleepImpl) {
  const response = await fetchWithRetry(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html",
      "User-Agent": "apple-proxy-profiles-sing-box-installer",
    },
  }, {
    fetchImpl,
    sleepImpl,
    description: "official sing-box release asset page",
  });
  return Buffer.from(await response.arrayBuffer());
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.once("error", (error) => reject(Object.assign(new Error(`Unable to execute ${command}`), { cause: error })));
    child.once("exit", (code) => {
      if (code === 0) return resolvePromise({ stdout, stderr });
      const detail = stderr.trim().replace(/[\r\n]+/gu, " ").slice(0, 240);
      reject(new Error(`${command} exited ${code ?? "by signal"}${detail ? `: ${detail}` : ""}`));
    });
  });
}

export async function installSingBoxCore({
  platform = process.platform,
  arch = process.arch,
  installRoot = join(process.env.RUNNER_TEMP || tmpdir(), "apple-proxy-profiles-toolchain"),
  githubEnvPath = process.env.GITHUB_ENV || null,
  fetchImpl = globalThis.fetch,
  sleepImpl = sleep,
  version = null,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  if (typeof sleepImpl !== "function") throw new TypeError("A sleep implementation is required");
  const release = version === null ? await resolveSingBoxTestingRelease({ fetchImpl, sleepImpl }) : { version };
  const asset = releaseAsset(platform, arch, release.version);
  const absoluteRoot = resolve(installRoot);
  if (/[\r\n]/u.test(absoluteRoot)) throw new Error("sing-box install path must not contain line breaks");
  await mkdir(absoluteRoot, { recursive: true });

  const [archive, integrityBytes] = await Promise.all([
    download(asset.archiveUrl, fetchImpl),
    downloadIntegrityPage(asset.integrityUrl, fetchImpl, sleepImpl),
  ]);
  const expected = digestForReleaseAssetPage(integrityBytes.toString("utf8"), asset);
  const actual = sha256(archive);
  if (!equalDigest(actual, expected)) throw new Error(`Official sing-box archive checksum mismatch: ${asset.archiveName}`);

  const archivePath = join(absoluteRoot, asset.archiveName);
  const integrityPath = join(absoluteRoot, `sing-box-${asset.version}-release-assets.html`);
  await writeFile(archivePath, archive, { mode: 0o600 });
  await writeFile(integrityPath, integrityBytes, { mode: 0o600 });
  await run("tar", ["-xzf", archivePath, "-C", absoluteRoot]);

  const corePath = resolve(absoluteRoot, `sing-box-${asset.version}-${asset.suffix}`, "sing-box");
  const versionResult = await run(corePath, ["version"]);
  const versionOutput = `${versionResult.stdout}\n${versionResult.stderr}`.trim();
  const expectedVersion = `sing-box version ${asset.version}`;
  if (!versionOutput.split(/\r?\n/u).includes(expectedVersion)) {
    throw new Error(`Installed sing-box version mismatch; expected ${expectedVersion}`);
  }
  if (githubEnvPath !== null) {
    if (typeof githubEnvPath !== "string" || !githubEnvPath || /[\r\n]/u.test(githubEnvPath)) {
      throw new Error("GITHUB_ENV must be a safe file path");
    }
    await appendFile(githubEnvPath, `SING_BOX_CORE=${corePath}\n`, "utf8");
  }
  return Object.freeze({ corePath, versionOutput: expectedVersion, asset, release });
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--print-path")) {
    throw new Error("Usage: install-sing-box-core.mjs [--print-path]");
  }
  const result = await installSingBoxCore();
  process.stderr.write(`${result.versionOutput}\n`);
  if (args[0] === "--print-path") process.stdout.write(`${result.corePath}\n`);
  else process.stdout.write(`Installed verified sing-box core: ${result.corePath}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
