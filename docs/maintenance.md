# 维护手册

项目保持 monorepo 分层：`shared/`、`clients/*`、`automation/`、`public/`。当前 active 客户端为 Anywhere、Egern、Shadowrocket、Surge、sing-box、HAPP、v2rayN、V2Box、Clash Apple、INCY、Hiddify Next，共 11 个；v2rayN 同时提供 sing-box 和 Xray core 任务。

发布只生成 `public/current/`，由统一 policy、routing plan 和规则 manifest 驱动。节点渲染严格失败关闭，公开规则与私密节点分离。

常用命令：

```bash
npm test
npm run build
npm run check:actions
npm run check:secrets
npm run verify
npm run verify:hiddify
```

Sub-Store 维护 12 个手动 collection、49 个 canonical task（40 个配置任务），不使用 `subscriptionTags`。HAPP 的 GeoData 位于 `public/current/happ/geoip.dat` 和 `public/current/happ/geosite.dat`；V2Box 与 v2rayN 的 GeoData 位于 `public/current/geodata/<region>/`，URL 与文件名必须保持稳定。

policy JSON 是默认值中心。交互客户端把 `NODE~` 结果放在业务组首位并允许手动切换；HAPP 和 V2Box 把固定出口写入生成的 Xray 路由。`NODE~` 解析必须唯一命中，否则生成失败，不发布半成品。

Hiddify Next 使用自己的 hiddify-sing-box fork。v4.1.1 应用固定到 hiddify-core `c9d6f0f00b2eda34e4fb71863e4e0a62b3e931a0`，其 fork commit 为 `0a02b7729f6a211436bb8bdcd8696c283eb27767`。该内核的 `.srs` 读取边界是 rule-set version 1–4，且没有 sing-box 1.14 的 `http_clients` 字段；Hiddify 生成器因此发布 source JSON 规则并使用兼容字段。首次远程规则下载在该 fork 中是异步启动，完整性要求高的设备应等待规则状态完成后再测试。

Hiddify 的 DNS 分流按配置的域名规则、DNS 出站和解析结果执行。未知域名先通过代理 DoH 解析，再执行 ChinaIP 回落；没有国内/国外两套 DNS 答案比较功能。请以 `ChinaTLD`、`ChinaIP` 和最终策略的顺序检查命中结果。当前仓库完成的是离线 schema、规则和 renderer 验证，尚未宣称在真实 Hiddify 设备上通过。

Hiddify 普通订阅导入会抽取节点并重新生成路由。完整 JSON 需要 raw config 运行路径，导入触发机制和六个平台真机验收仍需确认；core schema 校验通过不代表 App 保留了配置。新增 Hiddify 前保留原有十层 schema v3 policy；为 Hiddify 单独补齐 13 个 target，固定节点必须在其独立池中重新核对。

兼容依据为官方固定版本源码：[应用 v4.1.1](https://github.com/hiddify/hiddify-app/tree/v4.1.1)、[hiddify-core](https://github.com/hiddify/hiddify-core/tree/c9d6f0f00b2eda34e4fb71863e4e0a62b3e931a0)、[规则集格式](https://github.com/hiddify/hiddify-sing-box/blob/0a02b7729f6a211436bb8bdcd8696c283eb27767/option/rule_set.go) 与 [远程规则集初始化](https://github.com/hiddify/hiddify-sing-box/blob/0a02b7729f6a211436bb8bdcd8696c283eb27767/route/rule/rule_set_remote.go)。
