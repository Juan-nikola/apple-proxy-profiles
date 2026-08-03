const DEEP_LINK_BASE = "anywhere://add-rule-set";

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

export function buildImportBatches(urls, maxLength = 1_800) {
  if (!Array.isArray(urls) || urls.length === 0) throw new TypeError("Anywhere rule URLs must be non-empty");
  if (!Number.isSafeInteger(maxLength) || maxLength < 100 || maxLength > 1_800) {
    throw new RangeError("Anywhere deep-link limit must be between 100 and 1800");
  }
  const normalized = urls.map(validateRuleUrl);
  if (new Set(normalized).size !== normalized.length) throw new Error("Anywhere rule URLs must be unique");
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

export function renderImportPage(batches, manifest) {
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
  const expectedUrls = manifest.shards.map(({ url }) => validateRuleUrl(url));
  const actualUrls = batches.flatMap(({ urls }) => urls.map(validateRuleUrl));
  if (JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)) {
    throw new Error("Anywhere import batches do not close over the manifest");
  }
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
  const privacy = manifest.sources?.find?.(({ id }) => id === "Privacy");
  const privacyNote = privacy
    ? `Privacy 上游的 ${escapeHtml(privacy.counts.convertible)} 条可转换规则经优先级编译后，${escapeHtml(privacy.counts.duplicates)} 条为重复、${escapeHtml(privacy.counts.shadowed)} 条被更高优先规则完整覆盖，因此输出 ${escapeHtml(privacy.counts.output)} 条且不生成空分片。`
    : "Privacy 中被更高优先级完整覆盖的规则会保留审计计数，但不会生成会改变路由语义的空分片。";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; navigate-to 'self' https: anywhere:">
  <title>Anywhere 完整规则导入</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.6;color:#172033;background:#f6f8fb}
    main{background:white;padding:28px;border-radius:18px;box-shadow:0 8px 30px #24324a18}h1{margin-top:0}.warning{padding:14px 18px;background:#fff4d6;border-left:4px solid #d98b00}.button{display:inline-block;padding:9px 14px;margin:5px 0;border-radius:10px;background:#315efb;color:white;text-decoration:none}code{word-break:break-all}li{margin:7px 0}
  </style>
</head>
<body>
<main>
  <h1>Anywhere 完整规则导入</h1>
  <p>固定 Blackmatrix7 提交：<code>${escapeHtml(manifest.upstream.commit)}</code></p>
  <p>生成时间（上游提交时间）：<code>${escapeHtml(manifest.generatedAt)}</code>；Manifest：<code>${escapeHtml(manifest.manifestSha256)}</code></p>
  <p>共处理 ${escapeHtml(manifest.totals.sourceCount)} 个上游来源，生成 ${escapeHtml(manifest.totals.shardCount)} 个分片、${escapeHtml(manifest.totals.outputCount)} 条可导入规则，分为 ${escapeHtml(checkedBatches.length)} 个批次。</p>
  <div class="warning"><strong>导入前须知：</strong>Anywhere 的 Default 不是可靠的“停用”开关。请先用测试设备导入，随后在 App 内逐个确认 DIRECT、REJECT 或目标节点/链；节点订阅、规则文件和本地设置是三层独立配置。导入公开规则不需要 HTTPS 解密/MITM，请保持它关闭。</div>
  <h2>批量导入</h2>
  <ol>
${buttons}
  </ol>
  <p>每次点击都会打开 Anywhere 的确认界面；不会静默导入。若系统未响应，请使用下方 HTTPS 地址手动导入。</p>
  <h2>完整分片地址</h2>
  <ol>
${manual}
  </ol>
  <h2>已审计的平台差异</h2>
  <p>${privacyNote}该来源仍从固定提交获取，并在 Manifest 中独立记录哈希和计数，这不是漏源。</p>
</main>
</body>
</html>
`;
}
