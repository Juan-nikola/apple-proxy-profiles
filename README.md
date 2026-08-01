# Shadowrocket 多平台配置生成器

这个项目生成两个彼此分离的东西：

1. `shadowrocket-nodes`：私密节点订阅，含节点凭据，只在自己的 Sub-Store 与设备之间使用。
2. `shadowrocket-config-*`：macOS、iPhone、iPad 的配置 Profile，不含节点凭据。

第一次使用请严格按 [零基础部署手册](docs/deployment.md) 操作。日常增加节点或切换 DNS、QUIC、IPv6 时看 [维护速查](docs/maintenance.md)。出现网络、局域网、AI、评论地区或更新异常时看 [故障排查与回滚](docs/troubleshooting.md)。

安全边界：保持 HTTPS 解密关闭；不要公开 Sub-Store 管理地址、订阅地址、Profile 地址、Token、节点二维码或带完整 URL 的截图。代理只能改变网络出口，不能保证改变哔哩哔哩、抖音、小红书或微博显示的评论地区。

公网 Sub-Store 风险：本项目不配置服务器端认证、TLS 或管理页面加固。公网中任何人都能打开的未认证管理页面，可能暴露订阅和节点；秘密 URL 不是访问控制。服务器加固明确不在本项目范围内。请根据自己的服务器文档或联系管理员，把 Sub-Store 放在私有网络/VPN 后面，或使用带认证和 TLS 的反向代理；完成保护前不要发布本项目生成的私密订阅。

## 你会得到什么

- 一份所有设备共用、每 6 小时更新的私密节点订阅 `shadowrocket-nodes`。
- 三份每天更新的平台 Profile：`shadowrocket-config-macos`、`shadowrocket-config-iphone`、`shadowrocket-config-ipad`。
- 默认跟随 Shadowrocket 首页节点、同时保留自动/故障转移/洲组/具体节点的主节点选择，以及 AI、流媒体、国内平台、游戏、下载/P2P 等策略组。
- Blackmatrix7 `ChinaMax_Domain + ChinaMax` 完整增强国内规则、抖音 `ByteDance` 和 SteamCN；其他未识别流量最终进入 `🚀 节点选择`。

Apple TV 已在生成器中预留参数，但不属于本轮部署范围。首轮顺序必须是 Intel Mac、iPhone、iPad；每台设备都保留原来的可用 Profile。

## 分组为什么不会再铺满节点

Profile 使用固定的两层结构：

1. `🚀 节点选择`第一项是 `PROXY`，表示跟随 Shadowrocket 首页当前节点；后面仍显示全部自动、全部故障转移、亚太、欧洲、美洲、其他/未分类及符合筛选条件的具体节点。
2. 点进某个洲组后才显示该洲的节点。洲顺序固定为亚太、欧洲、美洲、其他；没有节点的洲不会显示。

动态组通过 `include-all-proxies=true` 从 Shadowrocket 当前可用代理中筛选节点，因此节点订阅显示名可以任意填写，不再要求叫 `Shadowrocket-Nodes` 或 `shadowsocks-nodes`。GitHub、流媒体、社交、Apple、Microsoft 和国内平台仍可直接选择符合筛选条件的具体节点；`🤖 AI 专用`的独立洲组与主线路互不影响。

地区识别覆盖 ISO 3166-1 的 249 个国家和地区国旗。中东与大洋洲归入亚太，俄罗斯归入欧洲，美洲含加勒比，非洲、南极洲以及无法识别的国旗归入其他。不会因此生成任何国家策略组。节点已有国旗时以最左侧国旗为准；没有国旗时才使用内置的常见国家/地区、城市、机场代码和缩写推断，仍无法确认就进入 `🌐 其他/未分类`。

## 项目文件

- `dist/substore-node-operator.js`：粘贴到组合订阅的 Script Operator。
- `dist/substore-profile-generator.js`：粘贴到三个 File Script Operator。
- `examples/`：使用脱敏假节点生成的配置示例，只用于检查结构，不能当作节点订阅。
- `docs/canary-checklist.md`：Intel Mac 首轮灰度逐项验收表。

不要手工编辑 `dist/` 或生成后的 Profile。日常改动只应发生在 Sub-Store 来源、File 参数或 Shadowrocket 策略组选择中。

## 从 GitHub 同步新版生成器

更新代码不会自动改变你正在使用的 Sub-Store。安全更新顺序如下：

1. 在 GitHub 打开本仓库最新的 `dist/substore-node-operator.js`，复制完整内容，替换 Sub-Store 节点 Script Operator 的脚本正文，参数保持不变。
2. 预览节点输出，确认数量正常、国旗不重复、名称排序正常；异常就恢复旧脚本，不发布。
3. 打开最新的 `dist/substore-profile-generator.js`，复制完整内容，分别替换 macOS、iPhone、iPad 三个 File Script Operator 的脚本正文，并按部署手册更新 QUIC/IPv6 参数。
4. 先预览 macOS Profile，确认 `🚀 节点选择`第一项是 `PROXY`、动态组含 `include-all-proxies=true`、AI 洲组仍存在，再发布并只在 Intel Mac 更新测试。
5. Intel Mac 验收通过后，才按 iPhone、iPad 顺序更新。整个过程中保留旧 Profile 作为回滚入口。

完整页面操作与成功标志见[零基础部署手册](docs/deployment.md)，更新后的逐项检查见[Intel Mac 灰度清单](docs/canary-checklist.md)。

## 本地维护者命令

需要 Node.js 22 或更高版本：

```bash
npm ci
npm run verify
npm run check:rules
```

`npm run verify` 会运行测试、重新构建两个脚本、生成脱敏示例并扫描敏感信息。`npm run check:rules` 会联网检查 31 份远程规则；网络受限时它可能失败，这不等于本地代码错误，但首次部署时仍必须等规则检查全部通过。

## 部署入口

- [零基础部署](docs/deployment.md)
- [Intel Mac 灰度清单](docs/canary-checklist.md)
- [日常维护速查](docs/maintenance.md)
- [故障排查与回滚](docs/troubleshooting.md)
- [发布检查](RELEASE_CHECKLIST.md)
