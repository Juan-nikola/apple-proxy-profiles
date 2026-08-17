# Blackmatrix7 不可变提交解析设计

## 目标

修复规则更新在解析 `blackmatrix7/ios_rule_script` 的 `master` 当前提交时持续收到 GitHub API `504` 的问题，同时保持后续所有规则下载都绑定到一个经过验证的 40 位不可变 commit SHA。

## 根因证据

2026 年 8 月 17 日，`Update Rules` run `32042006282` 已成功安装并验证 sing-box `1.14.0-beta.17`，随后在 `Fetch immutable ChinaIP audit and stage lightweight rules` 失败：

```text
Error: Blackmatrix7 resolver HTTP status 504
```

独立复测显示：

- `https://api.github.com/repos/blackmatrix7/ios_rule_script/commits/master` 在约 12 秒后持续返回 `504`。
- `https://github.com/blackmatrix7/ios_rule_script/commits/master.atom` 正常返回 `200`。
- 官方 Atom 的首个 entry 同时包含当前 head SHA、同一 SHA 的官方 commit 链接和更新时间。

当前 head 为 `538b8a79532c44dfbcb8e694d2f43e753c60b157`，更新时间为 `2026-08-15T18:26:29Z`。因此失败点是 GitHub commits API 路径，而不是源仓库、分支或规则文件不存在。

## 方案比较

### 方案 A：只给 commits API 增加重试

优点是代码改动最小。缺点是当前 API 持续 504，有限重试只会延长失败，不能恢复构建。

### 方案 B：官方 branch commit Atom（采用）

直接读取 GitHub 官方 `commits/master.atom`，以首个 `<entry>` 作为分支 head，并交叉核对：

- `<id>` 中的 40 位 SHA；
- official commit link 中的 40 位 SHA；
- `<updated>` 中的有效时间。

只有两个 SHA 完全一致、时间不晚于当前时间 5 分钟以上时才返回结果。

优点是保持当前接口的 `{ sha, committedAt }` 语义，避免故障 API，且不增加依赖。缺点是需要严格解析一个最小 Atom 子集。

### 方案 C：调用 `git ls-remote`

优点是直接读取分支 ref。缺点是引入外部进程、协议和 PATH 依赖，且无法从同一响应获得提交时间，不适合当前纯 fetch 模块。

## 数据流

1. 请求 `https://github.com/blackmatrix7/ios_rule_script/commits/master.atom`，禁止自动重定向。
2. 对 HTTP 429 和 5xx 使用 1 秒、2 秒两次退避，最多请求 3 次。
3. 读取首个完整 `<entry>...</entry>`，而不是按时间重新排序；branch feed 的首条就是当前 head，即使提交时间非单调也不能改选历史 commit。
4. 从 `<id>` 提取 `tag:github.com,2008:Grit::Commit/<sha>`。
5. 从 `rel="alternate" type="text/html"` 的官方链接提取同一仓库的 `/commit/<sha>`。
6. 要求 ID SHA 与链接 SHA 完全一致。
7. 解析 `<updated>`，拒绝无效时间和超过调用方 `now + 5 分钟` 的未来时间。
8. 返回冻结的 `{ sha, committedAt }`；后续 source catalog 继续把该 SHA 写入 `raw.githubusercontent.com` 不可变 URL。

## 错误处理

- 404、403 等永久状态立即失败，不重试。
- 429 和 5xx 最多重试两次，最终保留准确 HTTP 状态。
- fetch 抛错保持 `Blackmatrix7 resolver network failure`。
- 非字符串响应、缺少 entry、缺少或非法 SHA、ID/链接不一致均报无效 commit。
- 缺少、非法或未来时间报无效 commit time。
- 不回退到 `master` 原始 URL，也不重用旧 SHA 静默继续，以免失去本次构建的不可变输入闭包。

## 测试设计

1. 字面量 Atom fixture 能解析 head SHA 与更新时间，并验证请求 URL、Accept 和 manual redirect。
2. 前两次 504、第三次成功时，断言请求 3 次并等待 `[1000, 2000]`。
3. 404 只请求一次。
4. 无 entry、错误 SHA、ID/链接 SHA 不一致和无效 XML 都被拒绝。
5. 未来时间继续被拒绝。
6. 真实网络 smoke test 返回 40 位 SHA，并能被现有 source catalog 构造成不可变 raw URL。
7. 完整测试、verify、秘密扫描、Actions 静态检查和远端工作流必须全部通过。

## 实施范围

- 修改 `automation/src/resolve-upstream.js`。
- 修改 `automation/test/resolve-upstream.test.js`。
- 不修改规则来源清单、阈值、业务分组、客户端生成器或发布权限。

## 验收标准

1. 真实 resolver 返回官方 Atom 首条 commit 的 SHA 和 UTC 时间。
2. Update Rules 越过 Blackmatrix7 commit 解析与规则暂存步骤。
3. 后续编译、验证、edge 更新、Pages 部署完整成功。
4. 任何新失败都使用精确工作流日志重新定位，不以增加无边界重试代替根因分析。
