# Anywhere 真机 Canary

严格先 iPhone、后 iPad；前一台未通过时，后一台保持旧配置。每轮记录 stable/Beta/TestFlight、版本/build、Wi‑Fi/蜂窝和时间。

## 节点门槛

- 保留旧订阅，先用独立 canary URL 添加新订阅，不删除旧订阅。
- 核对 accepted 数量、协议和名称唯一性；测试单节点延迟与真实访问。
- 创建链时确认至少 2 个节点，入口在前、出口在后。
- Refresh 前后对比节点名称和数量；任何意外删除都先停止推广。

## 规则门槛

- 记录 schema-v2 Manifest hash；确认全部 31 个默认 shard 来自同一快照并完成导入。
- 同一逻辑规则集的所有 shard 绑定一致，App 处于 Rule 模式。
- 验证 DomesticCore/DomesticGame/ChinaIP DIRECT、普通境外流量走当前代理；仅在显式启用可选广告包时验证 Advertising REJECT 和内存余量。
- OpenAI、Claude、Gemini、Copilot 绑定同一个 AI 专用节点/链并分别实测。
- 验证 GitHub、YouTube/Netflix、Telegram/社交、DomesticGame/OverseasGame UDP，以及 Download/PrivateTracker 不误走不允许 P2P 的机场。
- 不把 Default 当停用；用 Requests 和可辨别出口证明它确实跟随当前节点/链。

## DNS、IPv6 与 QUIC

记录五类 DNS。Wi‑Fi 与蜂窝分别检查 DNS 泄漏、DIRECT、REJECT、代理和链出口。Advertise IPv6 to Apps 先 off，再在网络确认具有 IPv6 时 on；没有 IPv6 应记“未覆盖”，不能算通过。分别验证 QUIC 的 Blocked、Automatic、Unblocked；网页能打开不等于协议行为正确。Block UDP 开启时另记一轮。

## 每台设备必须做的真实回滚

1. 停止新连接并选回旧节点或链。
2. 恢复旧规则绑定，验证中国直连与境外代理。
3. 规则发布故障时，把服务端 `/current/` 恢复到 `/previous/` 或固定 `versions/<hash>` 内容，然后在现有规则集点 Update。
4. 不删除再重导。节点若曾删除或改名，旧 UUID 通常无法自动恢复，必须按记录重建链和绑定。

稳定版 iPhone、iPad 都通过并完成真实回滚后，才允许进入 Beta/TestFlight 的同序验证。Beta App 本身未必能即时降级，所以只放非关键设备。
