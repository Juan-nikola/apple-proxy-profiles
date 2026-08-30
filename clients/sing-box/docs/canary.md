# sing-box 上线后可选反馈与 testing 跟踪

自动化测试、规则预算、manifest 闭合和审计通过后即可使用 `current`。`edge` 跟踪官方 sing-box testing 最新 release，仅供维护者预览；设备检查是上线后的可选反馈，不阻塞 promotion。需要反馈时建议先在 macOS 观察，再测试 Android、iPhone、iPad；不要把 testing 配置一次导入所有设备。

## 路由顺序

路由顺序是：`DomesticCore` → 国内业务 → 明确海外服务 → `OverseasGame` → `ChinaTLD` → `resolve` → `ChinaIP` → `漏网之鱼`。

未知域名使用 DNS response matching，流程是：

1. 国内 DNS 返回中国 IP，直接返回该结果。
2. 国内 DNS 返回非中国 IP 或没有可用结果，再请求代理 DoH。
3. 路由层用 `ChinaIP` rule-set 判断目标地址；中国 IP 直连，其他地址进入 `漏网之鱼`，其默认出口由 `apple-proxy-policy.final` 控制。

`geoip`/`geosite` 顶层字段已经被 sing-box 移除，本项目使用编译后的 `rule-ChinaIP` `.srs`，这是 1.14 的兼容方式。

该机制不是按请求失败自动重试。硬编码 IP、无 SNI、HTTPDNS、CDN 地理漂移以及被墙的中国域名仍可能需要自定义规则。`漏网之鱼` 始终保留首页节点、`DIRECT`、`REJECT` 三个出口，`REJECT` 只用于手动排查。

## 诊断配置

诊断 profile 保留 TUN、DNS 和节点，但不加载远程规则集，适合区分规则下载问题与核心/TUN 问题：

- `examples/sing-box-macos-diagnostic.json`
- `examples/sing-box-iphone-diagnostic.json`
- `examples/sing-box-ipad-diagnostic.json`
- `examples/sing-box-android-diagnostic.json`

Android 默认只保留一个 `⚡ 全部自动` URLTest 图。iPhone/iPad 不生成 URLTest，`⚡ 全部自动` 使用选择器，并关闭规则缓存 DNS；这两个平台的验收应确认启动日志没有批量探测节点或 IPv6 `no route to host`。
