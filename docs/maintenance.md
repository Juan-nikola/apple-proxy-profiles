# 维护手册

项目保持 monorepo 分层：`shared/`、`clients/*`、`automation/`、`public/`。当前 active 客户端为 Anywhere、Egern、Shadowrocket、Surge、sing-box、HAPP、V2Box、Clash Apple，共 8 个。

发布只生成 `public/current/`，由统一 policy、routing plan 和规则 manifest 驱动。节点渲染严格失败关闭，公开规则与私密节点分离。

常用命令：

```bash
npm test
npm run build
npm run check:actions
npm run check:secrets
npm run verify
```

Sub-Store 维护 9 个手动 collection、30 个 canonical task，不使用 `subscriptionTags`。HAPP 的 GeoData 位于 `public/current/happ/geoip.dat` 和 `public/current/happ/geosite.dat`；V2Box 的 GeoData 位于 `public/current/geodata/<region>/`，URL 与文件名必须保持稳定。

policy JSON 是默认值中心。交互客户端把 `NODE~` 结果放在业务组首位并允许手动切换；HAPP 和 V2Box 把固定出口写入生成的 Xray 路由。`NODE~` 解析必须唯一命中，否则生成失败，不发布半成品。
