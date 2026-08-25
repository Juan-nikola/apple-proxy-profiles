# 完整业务分组与跨客户端默认策略

## Goal

让私密 `apple-proxy-policy` 显式列出全部 13 个统一业务目标，并验证交互客户端保留候选节点、受限客户端按同一策略生成路由。

## Global Constraints

- 使用 `schemaVersion: 2` 单层 `targets`。
- 默认值为 `FOLLOW`、`DIRECT`，不默认固定任意节点。
- 安全组继续由 `blockMode` 控制，不进入业务目标 JSON。
- 节点订阅任务不读取 `apple-proxy-policy`。
- 保留旧 `schemaVersion: 1` 读取兼容。

### Task 1: Complete policy contract and documentation

Add tests that assert the documented complete JSON example contains exactly these 13 label/value pairs: `🤖 AI 专用=FOLLOW`, `🐙 GitHub=FOLLOW`, `📺 YouTube=FOLLOW`, `🎬 海外流媒体=FOLLOW`, `💬 海外社交=FOLLOW`, `🍎 Apple=DIRECT`, `🪟 Microsoft=DIRECT`, `🇨🇳 国内平台=DIRECT`, `🌍 海外游戏=FOLLOW`, `🎮 游戏连接=DIRECT`, `⬇️ 下载/P2P=DIRECT`, `🧭 DNS 与规则下载=FOLLOW`, and `最终兜底=FOLLOW`. Keep the existing exact-node resolver, interactive candidate pools, non-interactive mappings, and schema-v1 compatibility unchanged.

### Task 2: Update the private Sub-Store policy

In the authenticated Sub-Store editor, replace only the content of `apple-proxy-policy` with the complete 13-target schema-v2 JSON. Preserve the existing File name and task bindings. Preview the policy and all dependent configuration/audit tasks before saving.

### Task 3: Verify the published task surface

Run the focused policy/client tests and full `npm run verify`. Confirm all 35 private task outputs remain HTTP 200 and non-empty, configuration readers use the same policy, and node-only tasks remain policy-free.
