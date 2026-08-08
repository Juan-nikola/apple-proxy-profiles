# 最新客户端兼容与节点命名设计

日期：2026-08-06  
状态：实施中  
基线：远程 \`main@4dae4da\`

## 目标

本次变更解决三个设备端问题：

1. sing-box 生成配置跟随官方最新 release，当前验证版本为
   \`1.14.0-beta.8\`；
2. Surge 的“🚀 节点选择”实际包含可用节点；
3. 五个客户端共享紧凑、可筛选、无重复来源标记的节点显示名。

版本策略是每次发布时解析官方最新 release，记录实际验证版本，并在新
release 出现时先通过 schema 与官方 \`sing-box check\` 再更新产物。

## 范围边界

- 不恢复回退前的 Surge \`policy-path\` 远程节点池和新的 Sub-Store 任务；
- Surge 继续生成包含节点明细的私密 Profile；
- sing-box 继续生成完整私密 JSON；
- 不把真实节点、订阅 Token、私密 URL 或凭据写入仓库；
- 不修改规则源内容，只修复规则引用 schema 和生成流程；
- 共享命名同步影响 Shadowrocket、Egern、Anywhere、Surge、sing-box。

## sing-box 方案

针对 1.14 schema：

- 删除已移除的 \`geoip\` 与 \`geosite\` 路由字段；
- 中国直连继续由现有 \`ChinaMax\` 与 \`ChinaMax_Domain\` rule-set 完成；
- 为远程 rule-set 配置显式顶层 \`http_clients\`；
- 通过 \`route.default_http_client\` 和每个 rule-set 的 \`http_client\`
  引用同一个 HTTP client；
- 将规则下载出站语义迁移到 HTTP client 的 \`detour\`；
- 删除 \`store_rdrc\`，改用 1.14 推荐的 \`store_dns\`；
- 校验器拒绝旧字段和悬空 HTTP client 引用。

配置生成后必须通过官方 \`sing-box check\`，并验证 macOS、iPhone、iPad、
Android、OpenWrt 五个平台示例。

## Surge 方案

主组保留 \`NON_CHAINED_FILTER\`。渲染器把语义候选
\`primary-proxy\` 映射为“⚡ 全部自动”，再追加匹配过滤器的节点名。

测试同时检查源码渲染结果和重建后的 \`dist/\`、\`public/\` bundle，避免
源码已经修复而设备仍下载旧脚本。

## 命名方案

规范格式：

\`\`\`text
<地区旗帜> <短名称>｜<来源>·<能力>
\`\`\`

示例：

\`\`\`text
🇭🇰 Boil-HKT｜自建·U
🇯🇵 奶爸｜自建·U
🇸🇬 小秘书｜自建·U
\`\`\`

约定：

- \`U\` 仅表示 UDP 能力，已有链使用 \`·链\`；
- 不输出 \`[未标记]\`、\`[自建]\`、\`[UDP]\` 等重复方括号；
- provenance 字段中的已知来源优先，其次读取原始节点名中的来源标记；
- 没有来源时不在显示名中打印“未知”，但保留诊断计数；
- 仅在明确可识别时删除重复地区代码和协议 token；
- 名称冲突继续使用稳定 fingerprint 后缀；
- 来源和能力仍出现在显示名中，以保持远程策略筛选能力。

## 失败与回滚

官方 core \`check\` 失败、生成结果含旧字段、引用悬空、Surge 主组缺少节点、
bundle 与源码不一致或秘密扫描失败时，阻止发布并保留上一份 public snapshot。

## 验收

自动化验收覆盖 sing-box schema、五平台 check、Surge 主组和策略筛选、
provenance 回退、紧凑命名、确定性构建、秘密扫描和 Actions 检查。
设备验收只需要用户刷新私密 Sub-Store 任务并导入最新公开脚本或配置 URL。
