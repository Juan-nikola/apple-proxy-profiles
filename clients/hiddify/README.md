# Hiddify Next 客户端适配

本目录生成 Hiddify Next 可供固定内核解析的 Sing-box JSON 候选配置，复用项目统一的国内直连、海外代理、业务分组、自动测速、DNS 防泄漏和规则更新策略。

Hiddify Next 4.1.1 的普通配置导入会经过内核重建流程，源码中没有可由订阅 URL 开启的 raw/full-config 开关；重建会保留节点出站，但丢弃完整 route、DNS 和业务 selector。因此这里的输出不能作为“普通订阅导入后完整分流”的承诺。要保留完整分流，必须通过调用 Hiddify core 的 `StartRequest.enable_raw_config=true` 的集成入口或独立 raw 配置运行器使用，并先执行内核 canary 校验。

适配层针对固定 Hiddify 4.1.x / Sing-box 1.13 fork：规则使用 source JSON（`/hiddify/rules`、`/hiddify/mobile-rules`），移除较新内核的 `http_clients` 与 DNS response evaluation 字段；未知域名交给可信代理 DNS，国内 TLD 有首载内联直连保护。Snell 不在该内核协议边界内，会被明确拒绝。

支持 Android、iOS、iPadOS、macOS、Windows、Linux。移动端使用精简规则集；Windows/Linux 使用桌面 TUN 配置并默认 IPv4-only。
