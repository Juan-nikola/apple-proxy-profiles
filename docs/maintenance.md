# 维护手册

项目保持 monorepo 分层：`shared/`、`clients/*`、`automation/`、`public/`。当前 active 客户端为 Anywhere、Egern、Shadowrocket、Surge、sing-box、HAPP、v2rayN、V2Box、Clash Apple、INCY，共 10 个；v2rayN 同时提供 sing-box 和 Xray core 任务。

发布只生成 `public/current/`，由统一 policy、routing plan 和规则 manifest 驱动。节点渲染严格失败关闭，公开规则与私密节点分离。

常用命令：

```bash
npm test
npm run build
npm run check:actions
npm run check:secrets
npm run verify
```

Sub-Store 维护 11 个手动 collection、43 个 canonical task（34 个配置任务），不使用 `subscriptionTags`。HAPP 的 GeoData 位于 `public/current/happ/geoip.dat` 和 `public/current/happ/geosite.dat`；V2Box 与 v2rayN 的 GeoData 位于 `public/current/geodata/<region>/`，URL 与文件名必须保持稳定。

policy JSON 是默认值中心。交互客户端把 `NODE~` 结果放在业务组首位并允许手动切换；HAPP 和 V2Box 把固定出口写入生成的 Xray 路由。`NODE~` 解析必须唯一命中，否则生成失败，不发布半成品。
