# sing-box 配置生成器

本目录生成 macOS、iPhone、iPad 和 Android 的 sing-box 配置。节点仍由你在 Sub-Store 的独立组合 `apple-proxy-singbox` 维护；`sing-box-client` 不是必需标签，可以删除标签筛选后手动勾选节点。生成器不会按机场、来源或地区静默删节点，默认 `nodeErrorMode=strict`，无法完整表达的节点会直接让预览失败。更多迁移和回滚说明见 [Sub-Store 客户端节点池指南](../../docs/substore-client-pools.md)。

手动组合顺序：移除 `sing-box-client` 筛选条件 → 手动选择节点 → Preview `apple-proxy-singbox` → Preview 四个平台任务 → 通过后刷新客户端。collection slug 和任务参数中的 `name=apple-proxy-singbox` 必须保持原样。

## 分流模型

配置使用 sing-box 1.14 testing 的新式 rule action 和 `.srs` rule-set：

1. 私网、局域网和明确国内规则直连。
2. OpenAI、YouTube、GitHub、流媒体、社交、海外游戏等明确海外规则走对应策略组。
3. `.cn` 等中国域名直连。
4. 其他域名执行 `resolve`，用 `ChinaIP` rule-set 判断解析结果；中国 IP 直连，其他地址进入 `🚀 节点选择`。
5. 未知 DNS 查询先使用国内 DNS；若返回结果不是中国 IP，再使用经代理的 DoH。这样可以利用 GeoIP 判断未收录域名，同时避免把所有域名交给污染风险较高的直连 DNS。

这不是“请求失败后透明重试”：sing-box 路由不能安全地把已经失败的 TCP/UDP 请求重放到另一个出口。被墙的中国域名需要加入 `shared/rules/custom-rules.js` 的 proxy/ai 集合，或在服务策略组中手动切换。

## 策略组

- `🚀 节点选择`：主选择器。
- `⚡ 全部自动`：只对实际节点做 URLTest，选择健康且延迟较低的节点。
- `🌏 亚太`、`🌍 欧洲`、`🌎 美洲`：地区选择器及地区自动组。
- `🤖 AI 专用`、`🐙 GitHub`、`📺 YouTube`、`🎬 海外流媒体`、`💬 海外社交`、`🍎 Apple`、`🪟 Microsoft`、`🇨🇳 国内平台`、`🌍 海外游戏`：统一业务策略组；另有 `🎮 游戏连接`、`⬇️ 下载/P2P`、`🧭 DNS 与规则下载` 和三类安全组。各业务组保留首页跟随、自动测速、各洲组和手动节点候选；自动测速组排在手动组之后。
- `🧭 DNS 与规则下载`：规则下载可手动切换，但代理 DNS 永远绕过它并经 `⚡ 全部自动`，避免启动环路。

sing-box 不生成伪造的 fallback 组。原生 `urltest` 只负责健康测速选择，不是有序请求重试。

iPhone/iPad 为 NetworkExtension 低内存配置：保留低频 URLTest（1800 秒）、不持久化 DNS 缓存、日志级别为 `warn`，并只加载 14 个合并规则集；完整广告规则在这两个平台被拒绝。

## Sub-Store 参数

四个平台共用同一套参数，只改变 `platform` 和 `ipv6Mode`：

```text
output=config&type=collection&name=apple-proxy-singbox&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off&nodeErrorMode=strict&channel=current
```

| File | `platform` | 推荐 `ipv6Mode` |
| --- | --- | --- |
| sing-box-macos | `macos` | `ipv4-only` |
| sing-box-iphone | `iphone` | `ipv4-only` |
| sing-box-ipad | `ipad` | `ipv4-only` |
| sing-box-android | `android` | `auto` |

公开发布只保留唯一的 `current` 指针；更新时工作流会解析并验证官方 testing release，再原子替换已验证的 `current` 快照。当前阶段不生成 OpenWrt 配置，避免把终端 TUN 配置误当透明网关配置。

## 构建与检查

```bash
npm ci
npm --workspace @apple-proxy-profiles/sing-box test
npm --workspace @apple-proxy-profiles/sing-box run build
npm --workspace @apple-proxy-profiles/sing-box run fixtures
SING_BOX_CORE=/path/to/sing-box npm --workspace @apple-proxy-profiles/sing-box run check:config
```

`.srs` 必须由官方 sing-box core 编译。节点凭据、真实订阅 URL 和 Sub-Store API 不得进入仓库；`dist/` 和 `public/` 下的生成文件只由构建流程更新。
