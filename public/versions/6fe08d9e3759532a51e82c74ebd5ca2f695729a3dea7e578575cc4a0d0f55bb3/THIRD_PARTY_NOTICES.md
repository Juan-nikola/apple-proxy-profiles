# Third-Party Notices

本文件说明 `Juan-nikola/apple-proxy-profiles` 使用、转换或审计的第三方项目。根目录 [LICENSE](LICENSE) 是本仓库的 `GPL-2.0-only` 许可文本；每个第三方项目仍受其自己的许可、版权和商标条款约束。

## Blackmatrix7 ios_rule_script

- 项目：[blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)
- 上游分支：`master`
- 当前初始基线提交：`dab47069a30c4ae70f7f5f4c919d639d9aaf79dc`（每个已发布快照的权威来源提交以其 Manifest 为准）
- 上游提交时间：`2026-08-01T19:07:21Z`
- 上游许可：`GPL-2.0-only`
- 使用范围：允许清单中的 32 个 `rule/Surge/` 输入；同一固定提交被转换为 Shadowrocket、Egern 与 Anywhere 的公开规则产物。

本项目对上游规则做了修改和格式转换。转换包括语法解析、类型筛选、标准化、去重、跨来源优先级归并、目标客户端不支持类型的有据可查的省略，以及按客户端格式渲染；Anywhere 产物还会分片到每片不超过 95,000 条。完整 Advertising 由 `Advertising.list` 与 `Advertising_Domain.list` 两个输入共同组成，不是精简版 AdvertisingLite。

修改/转换声明日期：2026-08-03。为保证可复现性，生成文件中的 `generatedAt` 或转换时间固定为该快照的上游提交时间，不使用构建机器的墙上时钟；这不表示转换工作由上游作者完成。定时更新可以把后续快照提升到 Blackmatrix7 `master` 的新完整提交，因此不应把上面的初始 SHA 当成所有未来快照的永久值。每个公开规则产物和 Manifest 应继续保留上游仓库、完整提交 SHA、原始路径、许可、转换者和内容哈希。

这些转换结果不是 Blackmatrix7 官方发布物，Blackmatrix7 作者不对本项目的转换、策略选择、客户端兼容性或运行结果负责。本项目同样不提供适销性、特定用途适用性或无错误保证；完整免责声明见 GPL v2 第 11、12 节。

## NodePassProject Anywhere

- 项目：[NodePassProject/Anywhere](https://github.com/NodePassProject/Anywhere)
- 审计提交：`e15518fde1f5d2652dfc1c234c89a68b87cecec0`
- 审计来源归档 SHA-256：`1ad984f39e1191b83975884423bbe5cfcd38e46f6f7e061ee0e0f4e4cc503db7`
- 上游许可：GPL-3.0
- 使用范围：审计公开的节点订阅、`.arrs` 导入、deep link、刷新和本地绑定行为，建立互操作兼容性基线。

本仓库没有复制 Anywhere 的 Swift/C 源码、App 二进制、图标、Logo 或其他品牌资产。这里的 JavaScript 适配器是独立实现，只输出该 App 已有公开导入界面可读取的 Clash 节点订阅与 `.arrs` 文件。“Anywhere”仅用于标识兼容的第三方客户端，不表示官方合作、隶属或背书。详见 [兼容性说明](clients/anywhere/UPSTREAM_COMPATIBILITY.md)。

## esbuild

- 项目：[evanw/esbuild](https://github.com/evanw/esbuild)
- 使用版本：`0.28.1`（包含 npm 按平台选择的 `@esbuild/*` 可选二进制包）
- 许可：MIT
- 用途：将本项目的 Sub-Store 入口及其依赖打包为自包含 JavaScript 文件。

esbuild 是开发依赖；生成器源码不因此改用 MIT 许可。esbuild 的版权和 MIT 许可文本可在其上游仓库及安装包中取得。

## Sub-Store integration

本项目调用 Sub-Store Script Operator 与 `produceArtifact` 互操作接口，但不复制或再分发 Sub-Store 源码。Sub-Store 的名称、源码和许可仍属于其各自权利人。

## 商标

Shadowrocket、Egern、Anywhere、Sub-Store 及其图标、Logo 和其他标识属于各自权利人。本仓库使用名称仅为说明兼容目标，不授予商标许可，也不代表任何第三方对本项目的认可。
