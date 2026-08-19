# OneXray 部署

OneXray 的节点订阅和 Profile 必须在私密 Sub-Store 中生成。公开仓库只发布无凭据 GeoData、manifest 和安装页。

1. 打开同一通道的安装页：`https://juan-nikola.github.io/apple-proxy-profiles/current/onexray/index.html`。
2. 先安装 `geosite.dat` 和 `geoip.dat`，再导入私密 Profile；Profile 与 GeoData 必须使用相同的 `edge`、`current` 或 `previous` 通道。
3. 灰度只使用 `edge`；只有完成 canary 并明确 promotion 后才使用 `current`。
4. 保留 previous 的 Profile 和 GeoData，作为成对回滚依赖。

节点 URL、Profile deep link、policy file 和 policyOverrides 都属于私密输入，不要写入公开文档或仓库。
