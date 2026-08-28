function safeDeepLink(value) {
  if (typeof value !== "string" || !/^happ:\/\/routing\/onadd\/[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    throw new TypeError("Happ import deep link is invalid");
  }
  return value;
}

/** Render a self-contained public installer without private nodes or policy data. */
export function renderHappImportPage({ profile, deepLink, qrSvg }) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError("Happ import profile is invalid");
  const link = safeDeepLink(deepLink);
  if (typeof qrSvg !== "string" || !/^<svg[\s>]/u.test(qrSvg) || /<script\b/iu.test(qrSvg)) throw new TypeError("Happ QR SVG is invalid");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'"><title>HAPP 公共路由导入</title><style>body{max-width:52rem;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif;color:#172033;background:#f7f8fa}section{background:#fff;border:1px solid #dfe3e8;border-radius:.6rem;padding:1rem 1.25rem;margin:1rem 0}a{color:#0757b8}.qr svg{max-width:16rem;height:auto;background:#fff;padding:.5rem}code{word-break:break-all}</style></head><body><main><h1>HAPP 公共路由导入</h1><section><h2>安装公开 GeoData</h2><p>这个页面只安装公开的 geosite.dat 和 geoip.dat。节点订阅、业务节点选择和私密 policy 不会出现在页面或公开链接中。</p><p><a href="${link}">在 HAPP 中一键添加并启用路由 Profile</a></p><div class="qr" aria-label="HAPP 导入二维码">${qrSvg}</div></section><section><h2>生成私密配置</h2><p>在你的 Sub-Store 中手动选择 HAPP collection，然后使用 HAPP 的 macOS、iPhone 或 iPad 配置任务。业务默认节点统一由 apple-proxy-policy JSON 控制。</p><p>需要更换业务节点时，只修改私密 policy 中的 <code>NODE~查询词</code>，重新 Preview 后更新配置。</p></section></main></body></html>`;
}
