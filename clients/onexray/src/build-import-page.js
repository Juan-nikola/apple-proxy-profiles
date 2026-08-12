import { artifactSha256 } from "../../../automation/src/artifact-content.js";
import { compileLightweightRules } from "../../../automation/src/compile-lightweight-rules.js";
import { canonicalJson } from "../../../automation/src/render-anywhere-rules.js";
import { renderXrayGeoData } from "../../../automation/src/render-xray-geodata.js";
import { oneXrayGeoNames } from "./geodata-contract.js";

const CHANNELS = Object.freeze(["current", "previous", "edge"]);
const CHANNEL_LABELS = Object.freeze({ current: "Current", previous: "Previous", edge: "Edge" });
const PLATFORM_ORDER = Object.freeze(["macOS", "iPhone", "iPad", "Android", "Windows", "Linux"]);
const ONEXRAY_UPSTREAM_VERSION = "26.8.3";
const APP_LINK_BASE = "onexray://onexray.com/dat/add";
const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;

function requiredChannel(channel) {
  if (typeof channel !== "string" || !CHANNELS.includes(channel)) {
    throw new TypeError("OneXray GeoData channel must be current, previous, or edge");
  }
  return channel;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function publicRoot(value) {
  if (typeof value !== "string" || /[\r\n]/u.test(value)) {
    throw new TypeError("OneXray public base must be an HTTPS URL");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("OneXray public base must be an HTTPS URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) {
    throw new TypeError("OneXray public base must be an HTTPS URL without credentials or query");
  }
  url.pathname = url.pathname.replace(/\/+$/u, "");
  return url.href.replace(/\/$/u, "");
}

function channelRoot(base, channel) {
  const normalized = publicRoot(base);
  return normalized.endsWith(`/${channel}`) ? normalized : `${normalized}/${channel}`;
}

function requiredUpstream(upstream) {
  if (!upstream || typeof upstream !== "object" || Array.isArray(upstream)) {
    throw new TypeError("OneXray upstream metadata is required");
  }
  if (typeof upstream.repository !== "string" || !/^https:\/\/[^\s]+$/u.test(upstream.repository)
    || typeof upstream.branch !== "string" || upstream.branch.length === 0
    || typeof upstream.commit !== "string" || !COMMIT.test(upstream.commit)
    || typeof upstream.committedAt !== "string" || Number.isNaN(Date.parse(upstream.committedAt))) {
    throw new TypeError("OneXray upstream metadata is invalid");
  }
  let repository;
  try {
    repository = new URL(upstream.repository);
  } catch {
    throw new TypeError("OneXray upstream repository is invalid");
  }
  if (repository.protocol !== "https:" || repository.username || repository.password || repository.search || repository.hash) {
    throw new TypeError("OneXray upstream repository must be a credential-free HTTPS URL");
  }
  return Object.freeze({
    repository: repository.href,
    branch: upstream.branch,
    commit: upstream.commit,
    committedAt: upstream.committedAt,
    version: ONEXRAY_UPSTREAM_VERSION,
  });
}

function relativeRecord(path, content) {
  return Object.freeze({ path, bytes: content.byteLength, sha256: artifactSha256(content) });
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new TypeError("OneXray GeoData manifest is required");
  }
  if (manifest.schema !== "apple-proxy-onexray-geodata-v1"
    || !manifest.names || typeof manifest.names.domain !== "string" || typeof manifest.names.ip !== "string"
    || !manifest.upstream || typeof manifest.upstream.version !== "string"
    || !Array.isArray(manifest.files) || manifest.files.length !== 2
    || !SHA256.test(manifest.manifestHash ?? "")) {
    throw new TypeError("OneXray GeoData manifest or assets are invalid");
  }
  const channel = requiredChannel(manifest.channel);
  const expectedNames = oneXrayGeoNames(channel);
  if (manifest.names.domain !== expectedNames.domain || manifest.names.ip !== expectedNames.ip
    || manifest.upstream.version !== ONEXRAY_UPSTREAM_VERSION) {
    throw new TypeError("OneXray GeoData manifest channel names or upstream version are invalid");
  }
  const files = [...manifest.files].sort((left, right) => left.path.localeCompare(right.path));
  const expected = ["onexray/geodata/geoip.dat", "onexray/geodata/geosite.dat"];
  if (JSON.stringify(files.map(({ path }) => path)) !== JSON.stringify(expected)
    || files.some((record) => !Number.isSafeInteger(record.bytes) || record.bytes < 1 || !SHA256.test(record.sha256))) {
    throw new TypeError("OneXray GeoData manifest asset records are invalid");
  }
  const { manifestHash, ...base } = manifest;
  if (artifactSha256(canonicalJson(base)) !== manifestHash) {
    throw new Error("OneXray GeoData manifest hash is invalid");
  }
  return manifest;
}

function assetUrls(manifest, base) {
  const root = channelRoot(base, manifest.channel);
  return Object.freeze({
    domain: `${root}/onexray/geodata/geosite.dat`,
    ip: `${root}/onexray/geodata/geoip.dat`,
    manifest: `${root}/onexray/geodata/manifest.json`,
  });
}

function validateAssetUrl(url, suffix) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError("OneXray GeoData asset URL is invalid");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash
    || !parsed.pathname.endsWith(suffix) || parsed.href !== url) {
    throw new TypeError("OneXray GeoData asset URL must be canonical HTTPS");
  }
  return parsed.href;
}

/** Returns the exact OneXray GeoData deep link for one validated public asset. */
export function buildOneXrayGeoDataDeepLink(type, url, channelName) {
  if (type !== "domain" && type !== "ip") throw new TypeError("OneXray GeoData link type is invalid");
  if (typeof channelName !== "string" || !/^[A-Za-z0-9._-]+$/u.test(channelName)) {
    throw new TypeError("OneXray GeoData link fragment is invalid");
  }
  const suffix = type === "domain" ? "/geosite.dat" : "/geoip.dat";
  const asset = validateAssetUrl(url, suffix);
  return `${APP_LINK_BASE}?type=${type}&url=${encodeURIComponent(asset)}#${channelName}`;
}

function inputMap(snapshot, ruleSets) {
  if (ruleSets instanceof Map) return ruleSets;
  if (snapshot instanceof Map) return compileLightweightRules({ snapshots: snapshot }).defaultRuleSets;
  throw new TypeError("OneXray GeoData snapshot or rule sets are required");
}

/**
 * Compiles one validated rule snapshot into a channel-scoped public artifact
 * set. The returned map is intentionally rooted at `onexray/`; publication
 * code decides whether that candidate is staged under edge/current/previous.
 */
export function buildOneXrayGeoDataArtifacts({
  snapshot = null,
  ruleSets = null,
  upstream,
  channel,
  publicBase = "https://juan-nikola.github.io/apple-proxy-profiles",
} = {}) {
  const selectedChannel = requiredChannel(channel);
  const safeUpstream = requiredUpstream(upstream);
  const base = publicRoot(publicBase);
  const geo = renderXrayGeoData(inputMap(snapshot, ruleSets), selectedChannel);
  const domain = Buffer.from(geo.domain);
  const ip = Buffer.from(geo.ip);
  const files = [
    relativeRecord("onexray/geodata/geosite.dat", domain),
    relativeRecord("onexray/geodata/geoip.dat", ip),
  ];
  const manifestBase = {
    schema: geo.manifest.schema,
    schemaVersion: 1,
    channel: selectedChannel,
    releaseId: `${selectedChannel}-${safeUpstream.commit.slice(0, 8)}`,
    generatedAt: safeUpstream.committedAt,
    upstream: safeUpstream,
    upstreamVersion: ONEXRAY_UPSTREAM_VERSION,
    names: geo.manifest.names,
    provenance: geo.manifest.provenance,
    sourceCount: geo.manifest.sourceCount,
    sources: geo.manifest.sources,
    inputHashes: geo.manifest.inputHashes,
    hashes: geo.manifest.hashes,
    counts: geo.manifest.counts,
    domain: geo.manifest.domain,
    ip: geo.manifest.ip,
    files,
  };
  const manifest = Object.freeze({
    ...manifestBase,
    manifestHash: artifactSha256(canonicalJson(manifestBase)),
  });
  const urls = assetUrls(manifest, base);
  const page = renderOneXrayImportPage({ manifest, files: new Map([[files[0].path, domain], [files[1].path, ip]]), publicBase: base });
  const artifactFiles = new Map([
    [files[0].path, domain],
    [files[1].path, ip],
    ["onexray/geodata/manifest.json", Buffer.from(canonicalJson(manifest), "utf8")],
    ["onexray/index.html", Buffer.from(page, "utf8")],
  ]);
  return Object.freeze({
    channel: selectedChannel,
    publicBase: base,
    publicRoot: channelRoot(base, selectedChannel),
    manifest,
    assets: urls,
    files: artifactFiles,
    page,
  });
}

function modeNotice(channel) {
  if (channel === "edge") {
    return "Edge 是仅供灰度验证的 canary 候选；不可直接作为 current，必须完成人工验证后再晋级。";
  }
  if (channel === "previous") {
    return "Previous 是回滚依赖，只应在 deliberate promotion 产生后与对应 Profile 一起使用。";
  }
  return "Current 是稳定发布；Edge 只有在 deliberate promotion 后才能成为 current，Previous 才是独立的回滚依赖。";
}

/** Renders a static, credential-free GeoData installation page. */
export function renderOneXrayImportPage(input = {}) {
  const manifest = validateManifest(input.manifest);
  const base = input.publicRoot ?? input.publicBase;
  if (typeof base !== "string") throw new TypeError("OneXray public base is required");
  const expectedUrls = assetUrls(manifest, base);
  const urls = input.assets ?? expectedUrls;
  if (!urls || typeof urls !== "object"
    || canonicalJson(urls) !== canonicalJson(expectedUrls)) {
    throw new TypeError("OneXray GeoData asset URLs do not match the validated public channel");
  }
  const domainUrl = validateAssetUrl(urls.domain, "/geosite.dat");
  const ipUrl = validateAssetUrl(urls.ip, "/geoip.dat");
  const files = input.files instanceof Map ? input.files : null;
  if (files) {
    for (const record of manifest.files) {
      const content = files.get(record.path);
      if (content === undefined || Buffer.from(content).byteLength !== record.bytes || artifactSha256(content) !== record.sha256) {
        throw new Error(`OneXray GeoData asset bytes do not match manifest: ${record.path}`);
      }
    }
  }
  const channel = manifest.channel;
  const channelName = manifest.names.domain;
  const domainLink = buildOneXrayGeoDataDeepLink("domain", domainUrl, channelName);
  const ipLink = buildOneXrayGeoDataDeepLink("ip", ipUrl, manifest.names.ip);
  const manifestUrl = validateAssetUrl(urls.manifest, "/manifest.json");
  const record = (path) => manifest.files.find((item) => item.path === path);
  const domainRecord = record("onexray/geodata/geosite.dat");
  const ipRecord = record("onexray/geodata/geoip.dat");
  const row = (label, asset, link, item) => `    <tr><th>${escapeHtml(label)}</th><td><a href="${escapeHtml(link)}">安装到 OneXray</a> · <a href="${escapeHtml(asset)}">HTTPS 文件</a><br><code>${escapeHtml(item.sha256)}</code> · ${escapeHtml(item.bytes)} bytes</td></tr>`;
  const platformRows = PLATFORM_ORDER.map((platform) => `    <li><strong>${platform}</strong>：先安装匹配的 GeoData，再导入私有 Profile。</li>`).join("\n");
  const pageTitle = `Apple Proxy GeoData · ${CHANNEL_LABELS[channel]}`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; navigate-to 'self' https: onexray:">
  <title>${escapeHtml(pageTitle)}</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.6;color:#172033;background:#f6f8fb}main{background:#fff;padding:28px;border-radius:18px;box-shadow:0 8px 30px #24324a18}h1{margin-top:0}.warning{padding:14px 18px;background:#fff4d6;border-left:4px solid #d98b00}a{color:#1456c7}code{word-break:break-all}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border-bottom:1px solid #d8deea}</style>
</head>
<body>
<main>
  <h1>${escapeHtml(pageTitle)}</h1>
  <p class="warning"><strong>发布状态：</strong>${escapeHtml(modeNotice(channel))}</p>
  <p>这是无凭据的 Xray GeoData 数据页，只包含共享轻量规则的域名/IP 数据，不包含节点、固定目标、策略覆盖或配置。</p>
  <p><strong>OneXray ${escapeHtml(manifest.upstream.version)}</strong> · schema <code>${escapeHtml(manifest.schema)}</code> · release <code>${escapeHtml(manifest.releaseId)}</code></p>
  <p>上游版本：<code>${escapeHtml(manifest.upstream.commit)}</code> · 提交时间：<code>${escapeHtml(manifest.generatedAt)}</code> · Manifest hash：<code>${escapeHtml(manifest.manifestHash)}</code></p>
  <p>域名分类 <code>domainCategories</code> ${escapeHtml(manifest.counts.domainCategories)} / 规则 <code>domainRules</code> ${escapeHtml(manifest.counts.domainRules)}；IP 分类 <code>ipCategories</code> ${escapeHtml(manifest.counts.ipCategories)} / 规则 <code>ipRules</code> ${escapeHtml(manifest.counts.ipRules)}。</p>
  <table><thead><tr><th>数据</th><th>安装与校验</th></tr></thead><tbody>
${row("Domain / geosite", domainUrl, domainLink, domainRecord)}
${row("IP / geoip", ipUrl, ipLink, ipRecord)}
  </tbody></table>
  <h2>六个平台安装顺序</h2>
  <ol>
${platformRows}
  </ol>
  <div class="warning"><strong>隐私边界：</strong>节点订阅（subscription）与 Profile 保持私有；安装 GeoData 不会创建 Profile，也不会导入节点或业务分组。Profile 链接必须从私有管理入口获取。</div>
  <p>Current、Previous 与 Edge 的数据必须与同名 Profile 配对。保留 Previous 只是回滚依赖，不会自动保留其配套资源；只有 deliberate promotion 后才建立新的 current/previous 关系。</p>
  <p><a href="${escapeHtml(manifestUrl)}">查看 credential-free manifest</a></p>
</main>
</body>
</html>
`;
}

export const renderOneXrayGeoDataPage = renderOneXrayImportPage;
export const buildOneXrayChannelArtifacts = buildOneXrayGeoDataArtifacts;
export const ONEXRAY_GEODATA_UPSTREAM_VERSION = ONEXRAY_UPSTREAM_VERSION;
