# Anywhere 上线后可选 Canary

本页是上线后的可选实践反馈清单，不是发布门禁。`current` 由自动化测试、规则预算、manifest 闭合和审计通过后发布；如需收集设备反馈，可按 iPhone、iPad 顺序记录 stable/Beta/TestFlight、版本/build、Wi‑Fi/蜂窝和时间。

## 节点门槛

- 保留旧订阅，先用独立 canary URL 添加新订阅，不删除旧订阅。
- 核对 accepted 数量、协议和名称唯一性；测试单节点延迟与真实访问。
- 创建链时确认至少 2 个节点，入口在前、出口在后。
- Refresh 前后对比节点名称和数量；任何意外删除都先停止推广。

## 规则门槛

- 记录 schema-v2 Manifest hash；确认全部 14 个稳定业务包来自同一快照并完成导入。
- 同一逻辑规则集的所有 shard 绑定一致，App 处于 Rule 模式。
- 验证 Privacy/DomesticCore/DomesticPlatform/Apple/Microsoft/Download/ChinaIP DIRECT、Security REJECT，普通境外流量走当前代理；仅在显式启用可选广告包时验证 Advertising REJECT 和内存余量。
- 把 `AI` 业务包绑定到一个 AI 专用节点/链，再分别实测 OpenAI、Claude、Gemini、Copilot。
- 验证 GitHub、YouTube/海外媒体、海外社交、DomesticCore 中的国内游戏/OverseasGame UDP，以及 Download 中的私有 Tracker 不误走不允许 P2P 的机场。
- 预览 `anywhere-strategy`，确认 `final`、各业务目标和 `localAssignments` 完整记录，并与私密 `apple-proxy-policy` 一致；`localAssignments.importable` 应为 `false`，它只是核对表，不会自动导入本地绑定。`final=FOLLOW`、`DIRECT`、`NODE~查询词` 分别对应当前节点/链、直连和唯一固定节点；随后在 App 内手动设置 `localAssignments.leakGroup.default` 和需要固定出口的业务组。
- 不把 Default 当停用；用 Requests 和可辨别出口证明它确实跟随当前节点/链。

## DNS、IPv6 与 QUIC

记录五类 DNS。Wi‑Fi 与蜂窝分别检查 DNS 泄漏、DIRECT、REJECT、代理和链出口。Advertise IPv6 to Apps 先 off，再在网络确认具有 IPv6 时 on；没有 IPv6 应记“未覆盖”，不能算通过。分别验证 QUIC 的 Blocked、Automatic、Unblocked；网页能打开不等于协议行为正确。Block UDP 开启时另记一轮。

## 分流顺序、残余风险与离线解释

共享分流顺序固定为：`DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → `漏网之鱼`。稳定 DNS 优先国内解析；普通 `.cn` 域名应命中 `ChinaTLD`/DIRECT，未知国内 IPv4/IPv6 应命中 `ChinaIP` 直连，未知境外与 DNS 失败进入 `漏网之鱼`。Anywhere 本身没有同一配置内的 selector，实际默认出口由本地 assignment 按 `anywhere-strategy` 的 `final` 结果设置。HTTPDNS、硬编码 IP、IPv6、QUIC 和手动服务组选择仍是残余风险。`npm run explain:route -- --channel current --domain <域名>` 只读取本地已发布规则、不执行 DNS，可用于离线核对预期分流；Anywhere 的本地 assignment 可在需要时人工核对。支持蜂窝的设备可分别测试 Wi‑Fi 与蜂窝；保留旧配置便于回滚。

## 需要设备反馈时的真实回滚

1. 停止新连接并选回旧节点或链。
2. 恢复旧规则绑定，验证中国直连与境外代理。
3. 规则发布故障时，不切换不存在的公开回滚目录；保留设备上的旧规则集，在服务端修复后重新生成同一 `current` 内容，再在现有规则集点 Update。
4. 不删除再重导。节点若曾删除或改名，旧 UUID 通常无法自动恢复，必须按记录重建链和绑定。

稳定版 iPhone、iPad 都通过并完成真实回滚后，才允许进入 Beta/TestFlight 的同序验证。Beta App 本身未必能即时降级，所以只放非关键设备。
