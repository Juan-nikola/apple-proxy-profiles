# Anywhere 故障排查

## 节点导入失败

先看 Sub-Store count-only diagnostics：accepted=0 表示所有节点都不兼容；accepted>0 再检查私密 URL 的 HTTP/TLS/HTML 与 Anywhere 支持协议。不要通过打开 Allow Insecure 绕过证书问题。节点订阅使用专门的 Subscription DNS 路径，而 `.arrs` 使用系统 URLSession；一边成功不能证明另一边网络正确。

## 规则批次失败或数量不对

只接受 HTTPS、路径以 `.arrs` 结束、HTTP 2xx、严格 UTF‑8。源码上限是每个集合 100,000 条，本项目限制 95,000。解析器会静默丢弃非法行，所以不能把“能导入”当作完整；对照 Manifest 的 entryCount、SHA-256、34 个 shard 和 3 个批次。不要导入 `.amrs`，不要启用 MITM/HTTPS 解密。

## 分流错误

确认 Rule 模式、所有 shard、同一逻辑集绑定一致，并且没有混用 current/previous/version。看到规则被 reset to Default 时，不要理解为关闭：Default 可能直接走当前节点或链。Privacy 没有独立 shard 是优先级归并结果，不是缺文件。

国内 App 偶发慢、切换开关后暂时恢复时，先 Update 现有 `ChinaMax_Domain` 两个分片并确认仍为 `routing=1` / DIRECT；本版本已把 18 条常见国内 App/CDN 后缀合入该规则集，不需要新增导入项。大规则集未命中时，域名可能落到 Default、当前节点或旧 DNS/连接缓存；切换开关会重建这些状态，所以只能暂时缓解。

## 链消失或绑定变成孤儿

检查节点是否重命名、删除或改变同名顺序。Anywhere 仅按“名称 + 同名序号”复用 UUID；订阅删除会删除节点，规则绑定可能重置为 Default，链也会失效。不要反复删订阅，按部署记录手动重建链和绑定。

## 回滚

`.arrs` 原地 Update 是较安全的回滚：恢复旧的 current 内容后，对现有规则集点 Update，本地名称和 assignment 保留。删除并重新导入不会保留这些状态。节点若已经换 UUID，恢复旧订阅正文也不能承诺无损，必须手动复核当前节点、所有链和具体节点绑定。

iCloud 只同步部分 JSON 数据，不包括当前节点/链、规则绑定、DNS、IPv6、QUIC、Rule/Global 等完整状态，因此不是完整备份。灰度时不要用删除测试验证 iCloud。

## 安全求助信息

只提供 App 版本/build、stable 或 Beta、网络类型、公开 Manifest hash、计数和错误类别。不要发送私密订阅 URL、节点、UUID、密码、密钥或完整日志。
