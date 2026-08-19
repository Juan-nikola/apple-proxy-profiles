# HAPP 与 OneXray 发布闭环设计

## 目标

在保留当前 HAPP 与 OneXray 私密 Sub-Store renderer 的前提下，补齐公开 GeoData、安装页、发布通道和验证契约，使两个适配器可以从同一份共享轻量规则快照生成确定性的 `edge` 候选，并通过现有 `current`、`previous` 和不可变 `versions/<manifestHash>` 机制安全回滚。

## 当前边界

- 节点、订阅 URL、业务覆盖和审计详情继续只存在于私密 Sub-Store 任务及其输出中。
- 公开页面只发布不含节点和凭据的 GeoData、哈希、来源元数据、安装深链和人工验证说明。
- HAPP 继续输出 Xray JSON 数组；OneXray 继续输出节点订阅和结构化 Profile。此次收尾不重写已经通过测试的节点协议转换逻辑。
- GeoData 只接受当前 `compileLightweightRules()` 的默认规则集，显式排除完整广告包；同一规则快照必须产生字节确定的 `geosite.dat`、`geoip.dat` 和 manifest。
- 平台状态可以是 `candidate`、`validated`、`rejected` 或 `rolled-back`。没有真机证据时不得伪造 `validated`。

## 架构

```text
共享规则快照
    ↓
紧凑化与来源校验
    ├─ HAPP Xray GeoSite/GeoIP 编译器
    └─ OneXray GeoSite/GeoIP 编译器
    ↓
channel-scoped manifest + credential-free import page
    ↓
buildClientArtifacts() 合并七个 client-manifest
    ↓
buildSite()/promoteClientRelease()
    └─ edge → current → previous → versions/<hash>
```

GeoData 编译器使用仓库内固定的 protobuf schema 和 `protobufjs`，不在构建时读取漂移的第三方 `latest` URL。每个来源使用稳定类别码，域名和 CIDR 先规范化、去重、排序，再编码。manifest 记录输入哈希、产物哈希、规则计数、上游提交和发布通道；安装页只引用同一 manifest 中的资产 URL。

发布层把 HAPP 与 OneXray 当作普通 active client 纳入现有 `client-manifest.json` 和根 manifest，不再维护一套旁路的 OneXray 专用 promotion。前沿平台清单扩展到两个 Xray 客户端的六个平台，但清单状态由人工 canary 输入决定。

## 公开安装层

- OneXray 页面提供 GeoSite、GeoIP 的 HTTPS 文件和 `onexray://` 安装深链；Profile/节点仍必须从私密入口导入。
- HAPP 页面提供 GeoData 下载、版本和校验信息，并明确 JSON 订阅与 GeoData 的私密/公开边界；页面不接受表单、不写本地持久化、不请求 Sub-Store。
- `edge` 页面明确“仅灰度候选”，`current` 页面明确“稳定发布”，`previous` 页面明确“回滚依赖”。
- 所有 URL 必须是无认证、无 query/hash 漂移的 HTTPS URL；页面内容禁止出现节点、密码、UUID、订阅 URL、policy override 和私密任务字段。

## 失败与回滚

- 规则来源、protobuf 编码、manifest 哈希或文件闭包失败：拒绝生成，不覆盖任何已发布通道。
- GeoData 标签、版本或 URL 与 manifest 不一致：拒绝构建/晋级。
- 单个平台 canary 失败：只把该平台标为 `rejected`，不移动其他客户端的 `current`。
- 发布失败：保留原 `current`、`previous` 和不可变版本；禁止手工编辑已发布二进制。
- 真机验证未完成时，文档与 dashboard 显示 `candidate`/待验收，而不是“已完成”。

## 测试策略

1. GeoData 编译器测试输入来源校验、类别码、域名/CIDR 去重、字节确定性、protobuf 解码和秘密边界。
2. 安装页测试深链规范化、channel 绑定、哈希闭包、无脚本静态 HTML 和私密字段拒绝。
3. 发布测试验证七个 client-manifest、root manifest、edge/current/previous 重写、版本快照和 frontier platform manifest。
4. 回归测试保持 HAPP/OneXray 当前节点、策略、Profile 和审计测试不变，并增加根验证入口。
5. 最终执行 `npm test`、`npm run build`、HAPP/OneXray workspace verify、`npm run check:secrets`、`npm run check:actions` 和 `git diff --check`。

## 验收标准

1. HAPP 和 OneXray 均能从当前共享规则快照生成合法、非空、可解码的 GeoData 二进制和闭合 manifest。
2. `buildClientArtifacts()` 生成包含 HAPP、OneXray 静态入口及其 client manifest 的完整发布树。
3. `edge`、`current`、`previous` 和不可变版本中的资产 URL、manifest 哈希和渠道名称始终一致。
4. 公开页面和清单不包含私密节点、订阅 URL、凭据或业务覆盖正文。
5. 平台清单覆盖六个平台，未提供真机证据的平台保持非 validated 状态。
6. 所有自动验证通过；真机 canary 的未完成部分在文档和 dashboard 中明确保留为人工步骤。
