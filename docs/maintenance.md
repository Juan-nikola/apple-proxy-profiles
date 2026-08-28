# 维护手册

项目保持 monorepo 分层：`shared/`、`clients/*`、`automation/`、`public/`。当前 active 客户端为 Anywhere、Egern、Shadowrocket、Surge、sing-box、V2Box、Clash Apple。

发布只生成 `public/current/`，由统一 policy、routing plan 和规则 manifest 驱动。节点渲染严格失败关闭，公开规则与私密节点分离。

常用命令：

```bash
npm test
npm run build
npm run check:actions
npm run check:secrets
npm run verify
```

Sub-Store 维护 8 个 collection、27 个 canonical task。V2Box 的 GeoData 位于 `public/current/geodata/<region>/`，URL 与文件名必须保持稳定。
