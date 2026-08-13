# Happ 六平台 Canary 与提升门槛

使用独立 `channel=edge` 的七任务完成本表；每台设备保留旧订阅，失败即回滚。随后才允许 edge-before-current：只有全部平台成功，edge 工件才可提升到 current。任一失败平台阻止所有 Happ current-channel promotion。

| 官方 Happ 应用 | App 版本 | 暴露的 Xray 版本 | 安装路由/geodata | 导入 JSON | 首页切换节点 | 国内/全球 DNS | 每个中文业务路由 | DIRECT | FOLLOW | 固定健康 | 固定失败回退 | 恢复 | IPv4/IPv6 | QUIC allow/block | 休眠/唤醒 | 网络切换 | Happ/Xray 日志证据 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS |  | 若 App 显示则填写 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| iPhone |  | 若 App 显示则填写 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| iPad |  | 若 App 显示则填写 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Android |  | 若 App 显示则填写 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Windows |  | 若 App 显示则填写 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Linux |  | 若 App 显示则填写 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

“每个中文业务路由”逐项记录 `🤖 AI 专用`、`🐙 GitHub`、`📺 YouTube`、`🎬 海外流媒体`、`💬 海外社交`、`🍎 Apple`、`🪟 Microsoft`、`🇨🇳 国内平台`、`🌍 海外游戏`、`⬇️ 下载/P2P`、`🧭 DNS 与规则下载` 和 `最终兜底`。日志须证明固定失败的 fallback 与恢复；生成期 `meta.serverDescription`/审计不替代此项。

每个平台先验证安装结果和节点切换，再验证 DNS、业务目标、`DIRECT`、`FOLLOW` 与固定健康；人为制造固定节点不可达后记录回退，恢复可达后记录恢复。分别在 IPv4 和可用 IPv6 网络测试，并比较 QUIC `allow`/阻止模式、一次休眠/唤醒和至少一次 Wi-Fi/蜂窝或其它网络切换。
