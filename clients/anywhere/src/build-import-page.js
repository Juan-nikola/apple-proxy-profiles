import { ANYWHERE_LIGHTWEIGHT_MIGRATION } from "./shard-rules.js";
import { ROUTING_PHASES } from "../../../shared/rules/lightweight-policy.js";

const DEEP_LINK_BASE = "anywhere://add-rule-set";
const ADVERTISING_IDS = new Set(["Advertising", "Advertising_Domain"]);
const DNS_CLASSES = new Set(["china", "none", "proxy"]);
const SOURCE_ID = /^[A-Za-z0-9_]+$/u;
const SHARD_ID = /^[A-Za-z0-9_-]+$/u;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateRuleUrl(value) {
  if (typeof value !== "string" || /[\s\\?#]/u.test(value)) {
    throw new TypeError("Anywhere rule URL must be a canonical string");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("Anywhere rule URL must be absolute");
  }
  if (url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash
    || !url.pathname.endsWith(".arrs")) {
    throw new TypeError("Anywhere rule URL must be a plain HTTPS .arrs URL");
  }
  if (url.href !== value) throw new TypeError("Anywhere rule URL must already be canonical");
  return url.href;
}

function deepLink(urls) {
  return `${DEEP_LINK_BASE}?${urls.map((url) => `link=${encodeURIComponent(url)}`).join("&")}`;
}

function normalizeRuleUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) throw new TypeError("Anywhere rule URLs must be non-empty");
  const normalized = urls.map(validateRuleUrl);
  if (new Set(normalized).size !== normalized.length) throw new Error("Anywhere rule URLs must be unique");
  return normalized;
}

export function buildImportDeepLink(urls) {
  return deepLink(normalizeRuleUrls(urls));
}

export function buildImportBatches(urls, maxLength = 1_800) {
  if (!Number.isSafeInteger(maxLength) || maxLength < 100 || maxLength > 1_800) {
    throw new RangeError("Anywhere deep-link limit must be between 100 and 1800");
  }
  const normalized = normalizeRuleUrls(urls);
  const grouped = [];
  let current = [];
  for (const url of normalized) {
    const candidate = [...current, url];
    if (deepLink(candidate).length > maxLength) {
      if (current.length === 0) throw new Error("One Anywhere rule URL exceeds the deep-link limit");
      grouped.push(current);
      current = [url];
      if (deepLink(current).length > maxLength) {
        throw new Error("One Anywhere rule URL exceeds the deep-link limit");
      }
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) grouped.push(current);
  return Object.freeze(grouped.map((batch, index) => Object.freeze({
    label: `导入批次 ${index + 1}`,
    deepLink: deepLink(batch),
    urls: Object.freeze(batch),
  })));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateAssignmentSources(manifest) {
  if (!Array.isArray(manifest.sources)
    || manifest.sources.length !== manifest.totals.sourceCount) {
    throw new TypeError("Anywhere manifest sources must match the source total");
  }
  const ids = new Set();
  const orders = new Set();
  const shardOwners = new Map();
  for (const source of manifest.sources) {
    if (!source
      || typeof source !== "object"
      || typeof source.id !== "string"
      || !SOURCE_ID.test(source.id)
      || ids.has(source.id)
      || !Number.isSafeInteger(source.order)
      || source.order < 1
      || orders.has(source.order)
      || !ROUTING_PHASES.includes(source.phase)
      || !DNS_CLASSES.has(source.dnsClass)
      || typeof source.intendedTarget !== "string"
      || source.intendedTarget.length === 0
      || ![0, 1, 2].includes(source.routing)
      || !Array.isArray(source.shardIds)
      || new Set(source.shardIds).size !== source.shardIds.length
      || source.shardIds.some((id) => (
        typeof id !== "string" || !SHARD_ID.test(id) || shardOwners.has(id)
      ))) {
      throw new TypeError("Anywhere manifest sources contain invalid assignment metadata");
    }
    ids.add(source.id);
    orders.add(source.order);
    for (const id of source.shardIds) shardOwners.set(id, source.id);
  }
  const emittedShardIds = new Set();
  for (const shard of manifest.shards) {
    if (!shard
      || typeof shard !== "object"
      || typeof shard.id !== "string"
      || !SHARD_ID.test(shard.id)
      || emittedShardIds.has(shard.id)
      || typeof shard.sourceId !== "string"
      || !SOURCE_ID.test(shard.sourceId)
      || !ids.has(shard.sourceId)
      || shardOwners.get(shard.id) !== shard.sourceId) {
      throw new TypeError("Anywhere manifest sources do not close over shard ownership");
    }
    emittedShardIds.add(shard.id);
  }
  if (emittedShardIds.size !== shardOwners.size) {
    throw new TypeError("Anywhere manifest sources do not close over shard ownership");
  }
  return [...manifest.sources].sort((left, right) => left.order - right.order);
}

function assignmentTarget({ intendedTarget, routing }) {
  if (routing === 1) return "DIRECT";
  if (routing === 2) return "REJECT";
  return intendedTarget;
}

function validatePageMode(mode, manifest) {
  if (mode !== "default" && mode !== "adblock-full") {
    throw new TypeError("Anywhere import page mode must be default or adblock-full");
  }
  if (mode === "default" && manifest.schemaVersion === 2) {
    const migration = {
      schemaVersion: manifest.schemaVersion,
      removed: manifest.removed,
      replacements: manifest.replacements,
      optionalPacks: manifest.optionalPacks,
    };
    if (canonicalJson(migration) !== canonicalJson(ANYWHERE_LIGHTWEIGHT_MIGRATION)) {
      throw new Error("Anywhere import manifest has an invalid schema-v2 migration");
    }
  }
  if (mode === "adblock-full") {
    if (!Array.isArray(manifest.sources)
      || manifest.sources.length !== ADVERTISING_IDS.size
      || manifest.sources.some(({ id, routing }) => !ADVERTISING_IDS.has(id) || routing !== 2)
      || manifest.shards.some(({ sourceId }) => !ADVERTISING_IDS.has(sourceId))) {
      throw new Error("Anywhere full-adblock import must contain only REJECT advertising shards");
    }
  }
}

export function renderImportPage(batches, manifest, { mode = "default" } = {}) {
  if (!Array.isArray(batches) || batches.length === 0) throw new TypeError("Anywhere import batches are required");
  if (!manifest || typeof manifest !== "object" || typeof manifest.manifestSha256 !== "string") {
    throw new TypeError("Anywhere rule manifest is required");
  }
  if (!Array.isArray(manifest.shards)
    || !manifest.totals
    || !Number.isSafeInteger(manifest.totals.sourceCount)
    || !Number.isSafeInteger(manifest.totals.shardCount)
    || !Number.isSafeInteger(manifest.totals.outputCount)
    || manifest.totals.shardCount !== manifest.shards.length) {
    throw new TypeError("Anywhere rule manifest totals are invalid");
  }
  validatePageMode(mode, manifest);
  const assignmentSources = validateAssignmentSources(manifest);
  const expectedUrls = manifest.shards.map(({ url }) => validateRuleUrl(url));
  const actualUrls = batches.flatMap(({ urls }) => urls.map(validateRuleUrl));
  if (JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)) {
    throw new Error("Anywhere import batches do not close over the manifest");
  }
  const allDeepLink = buildImportDeepLink(expectedUrls);
  const checkedBatches = batches.map((batch, index) => {
    const expectedDeepLink = deepLink(batch.urls);
    if (batch.deepLink !== expectedDeepLink || expectedDeepLink.length > 1_800) {
      throw new Error("Anywhere import batch deep link is invalid");
    }
    return { label: `导入批次 ${index + 1}`, deepLink: expectedDeepLink, urls: batch.urls };
  });
  const buttons = checkedBatches.map((batch) => (
    `      <li><a class="button" href="${escapeHtml(batch.deepLink)}">${escapeHtml(batch.label)}</a> `
    + `<span>${escapeHtml(batch.urls.length)} 个规则分片</span></li>`
  )).join("\n");
  const manual = checkedBatches.flatMap(({ urls }) => urls).map((url) => (
    `      <li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`
  )).join("\n");
  const assignmentRows = assignmentSources.map((source) => (
    `      <tr><td><code>${escapeHtml(source.id)} | ${escapeHtml(source.phase)} | `
    + `${escapeHtml(assignmentTarget(source))} | ${escapeHtml(source.shardIds.length)} shard(s)</code></td></tr>`
  )).join("\n");
  const privacy = manifest.sources?.find?.(({ id }) => id === "Privacy");
  const privacyNote = privacy
    ? `Privacy 上游的 ${escapeHtml(privacy.counts.convertible)} 条可转换规则经优先级编译后，${escapeHtml(privacy.counts.duplicates)} 条为重复、${escapeHtml(privacy.counts.shadowed)} 条被更高优先规则完整覆盖，因此输出 ${escapeHtml(privacy.counts.output)} 条且不生成空分片。`
    : "Privacy 中被更高优先级完整覆盖的规则会保留审计计数，但不会生成会改变路由语义的空分片。";
  const isAdblock = mode === "adblock-full";
  const title = isAdblock ? "Anywhere 完整广告包（可选）" : "Anywhere 轻量规则导入";
  const migrationNotice = isAdblock ? "" : `
  <div class="warning"><strong>schema v2 迁移：</strong>如果你已导入旧版，请先在 Anywhere 中<strong>删除或禁用</strong>旧分片 <code>Advertising</code>、<code>Advertising_Domain</code>、<code>ChinaMax_Domain</code> 和通用 <code>Game</code>，再导入本轻量集。<code>ChinaMax_Domain</code> 由 <code>DomesticCore</code> 替代；<code>Game</code> 拆分为 <code>DomesticGame</code> 与 <code>OverseasGame</code>。</div>
  <p><code>OverseasGame</code> 首次导入使用 Anywhere 的 Default/代理路由；如当前版本支持专用组，请在 App 内手动将其绑定到海外游戏组。</p>`;
  const packNotice = isAdblock
    ? `
  <div class="warning"><strong>可选高内存包：</strong>本页只导入 <code>Advertising</code> 与 <code>Advertising_Domain</code>，路由目标均为 <strong>REJECT</strong>。完整广告分类体积很大，启用后可能使内存占用显著增长；仅在设备实测有余量时启用。</div>`
    : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; navigate-to 'self' https: anywhere:">
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.6;color:#172033;background:#f6f8fb}
    main{background:white;padding:28px;border-radius:18px;box-shadow:0 8px 30px #24324a18}h1{margin-top:0}.warning{padding:14px 18px;background:#fff4d6;border-left:4px solid #d98b00}.button{display:inline-block;padding:9px 14px;margin:5px 0;border-radius:10px;background:#315efb;color:white;text-decoration:none}code{word-break:break-all}li{margin:7px 0}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left;border-bottom:1px solid #d8deea}
  </style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>固定 Blackmatrix7 提交：<code>${escapeHtml(manifest.upstream.commit)}</code></p>
  <p>生成时间（上游提交时间）：<code>${escapeHtml(manifest.generatedAt)}</code>；Manifest：<code>${escapeHtml(manifest.manifestSha256)}</code></p>
  <p>共处理 ${escapeHtml(manifest.totals.sourceCount)} 个上游来源，生成 ${escapeHtml(manifest.totals.shardCount)} 个分片、${escapeHtml(manifest.totals.outputCount)} 条可导入规则，分为 ${escapeHtml(checkedBatches.length)} 个批次。</p>
${migrationNotice}${packNotice}
  <div class="warning"><strong>导入前须知：</strong>Anywhere 的 Default 不是可靠的“停用”开关。请先用测试设备导入，随后在 App 内逐个确认 DIRECT、REJECT 或目标节点/链；节点订阅、规则文件和本地设置是三层独立配置。导入公开规则不需要 HTTPS 解密/MITM，请保持它关闭。</div>
  <h2>路由分配表</h2>
  <p class="warning">同一来源的每个分片必须使用同一个路由分配；导入后请逐项确认。</p>
  <table>
    <thead><tr><th>来源 ID | 阶段 | 目标 | 分片数</th></tr></thead>
    <tbody>
${assignmentRows}
    </tbody>
  </table>
  <h2>一键导入全部规则</h2>
  <p>一次打开 Anywhere 的确认页，导入全部 ${escapeHtml(expectedUrls.length)} 个规则分片；导入后仍是独立规则集。</p>
  <p><a class="button" href="${escapeHtml(allDeepLink)}">全部导入 ${escapeHtml(expectedUrls.length)} 个规则分片</a></p>
  <p>如果系统未能打开总链接，请按下面的 ${escapeHtml(checkedBatches.length)} 个批次导入。</p>
  <h2>批量导入</h2>
  <ol>
${buttons}
  </ol>
  <p>每次点击都会打开 Anywhere 的确认界面；不会静默导入。若系统未响应，请使用下方 HTTPS 地址手动导入。</p>
  <h2>完整分片地址</h2>
  <ol>
${manual}
  </ol>
${isAdblock ? "" : `  <h2>已审计的平台差异</h2>\n  <p>${privacyNote}该来源仍从固定提交获取，并在 Manifest 中独立记录哈希和计数，这不是漏源。</p>`}
</main>
</body>
</html>
`;
}
