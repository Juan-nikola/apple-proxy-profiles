# 不可变规则源限流恢复设计

## 目标

让规则更新在 `raw.githubusercontent.com` 返回临时 429/5xx 时按服务端冷却提示等待后重试，避免当前无等待的三连请求放大限流；同时保持所有规则来源、commit SHA、URL allowlist、内容类型、大小、UTF-8 和摘要验证不变。

## 根因证据

2026 年 8 月 17 日，`Update Rules` run `32042715999` 已成功完成：

- 官方 sing-box 核心发现、摘要校验和安装；
- Blackmatrix7 `master` head 的官方 Atom 解析。

随后在抓取第 24/33 个不可变规则源 TikTok 时失败：

```text
Rule source TikTok: HTTP status 429
```

当前 `fetch-snapshot.js` 把 429 标为可重试并默认重试两次，但重试之间没有等待，生产调用又使用 4 路并发。因此同一限流窗口内会立即重复请求。

独立请求同一 commit 的 TikTok raw URL 也返回 429。响应没有 `Retry-After`，但包含：

- `Date: Mon, 17 Aug 2026 15:37:40 GMT`
- `Expires: Mon, 17 Aug 2026 15:42:40 GMT`
- 正文说明服务因请求过多暂时不可用。

这提供了 5 分钟的官方冷却提示。GitHub Actions rerun API 同时返回 503，进一步说明不是规则文件损坏。

## 方案比较

### 方案 A：等待后手工重跑

优点是无需代码修改。缺点是自动更新仍会在下一次 429 时立即三连请求，不能自恢复。

### 方案 B：服务端冷却 + 单路节流（采用）

下载器在 429/5xx 前继续保留最多三次尝试，但每次重试前：

1. 优先解析 `Retry-After`；
2. 没有时解析 `Expires - Date`；
3. 没有有效提示时使用本地有界退避。

生产抓取改为单路，并在每个请求开始前保持 250 毫秒最小间隔，避免 33 个文件形成突发流量。

优点是仍逐文件使用不可变官方 raw URL，改动集中且可测试。缺点是上游明确要求 5 分钟冷却时，工作流会相应延长。

### 方案 C：下载整个上游仓库归档

优点是只请求一次。缺点是 `ios_rule_script` 仓库体积大，本项目只需要 33 个文件；归档会显著增加带宽、解压、磁盘和安全审计范围。

## 数据流

1. `fetchSnapshot()` 建立一个共享请求起始门，所有 worker 在真正 fetch 前经过该门。
2. 当 `requestIntervalMs > 0` 时，请求起始至少相隔指定毫秒；生产设置为 250 毫秒。
3. `fetchOne()` 对 200 响应继续执行现有闭包验证。
4. 对 408、425、429、500、502、503、504：
   - 取消未使用的响应体；
   - 计算冷却时间；
   - 调用可注入 `sleepImpl`；
   - 再进入下一次请求。
5. 冷却计算顺序：
   - `Retry-After` 整数秒或 HTTP 日期；
   - `Expires` 与响应 `Date` 的差值；
   - 429 默认 30 秒、60 秒；其他临时状态默认 1 秒、2 秒。
6. 任一单次冷却最大 5 分钟，负数、无效和超大值不会形成无边界等待。
7. 重试耗尽后仍报告精确 source ID 和最终 HTTP 状态。

## 接口

`fetchSnapshot()` 增加可选参数：

```js
sleepImpl = sleep
nowImpl = Date.now
requestIntervalMs = 0
```

测试和其他调用方保持原行为；生产 `buildArtifacts()` 显式使用：

```js
concurrency: 1,
requestIntervalMs: 250,
```

## 错误处理

- 3xx 继续立即失败，禁止重定向。
- 4xx 中除 408、425、429 外继续立即失败。
- 网络异常沿用有限尝试，但按 1 秒、2 秒退避。
- 重试前取消响应体，防止连接和内存泄漏。
- `sleepImpl`、`nowImpl`、`requestIntervalMs` 输入必须严格验证。
- 不打印规则内容、URL 查询、响应正文或私人信息。

## 测试设计

1. 429 带 `Date/Expires` 时，前两次失败、第三次成功，断言两次等待均为 300000 毫秒。
2. 503 无提示时使用 1000、2000 毫秒退避。
3. 404 不等待且只请求一次。
4. 并发 worker 开启 request interval 时，请求起始通过共享门串行节流并保持目录结果顺序。
5. 现有 redirect、HTML、UTF-8、大小、hash 和 URL allowlist 测试继续通过。
6. 生产 `update-rules.mjs` 的测试锁住 `concurrency: 1` 和 `requestIntervalMs: 250`。
7. 完整测试、verify、秘密扫描、Actions 检查、远端 Update Rules 和 Pages 全部通过。

## 实施范围

- 修改 `automation/src/fetch-snapshot.js`。
- 修改 `automation/test/fetch-snapshot.test.js`。
- 修改 `scripts/update-rules.mjs` 及对应行为测试。
- 不修改 33 个规则源、业务分组、规则内容、发布结构或权限。

## 验收标准

1. 合成 429 能按服务端 5 分钟提示等待，而不是立即重试。
2. 真实上游恢复后，Update Rules 能抓取全部 33 个不可变源并完成后续编译验证。
3. GitHub Pages 部署成功，公开站点与代表性 Manifest 返回 HTTP 200。
4. 真机 canary 与真实回滚演练继续作为唯一人工事项。
