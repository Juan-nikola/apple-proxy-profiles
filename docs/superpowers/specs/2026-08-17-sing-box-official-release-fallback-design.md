# sing-box 官方 Release 发现与校验回退设计

## 目标

修复 GitHub Actions 在安装官方 sing-box testing 核心时持续收到 `504` 的问题，同时保留以下供应链约束：

- 每次自动构建优先选择 GitHub 官方发布流中的最新 prerelease/testing 版本。
- 只下载 `SagerNet/sing-box` 官方 Release 的精确平台资产。
- 下载后必须与 GitHub 官方展示的 SHA-256 完全一致。
- 解压后必须执行二进制并核对其自报版本。
- 任何缺失、重复、格式错误、URL 不匹配或摘要不匹配都必须立即失败。

## 根因证据

2026 年 8 月 17 日，`Update Rules` run `32039966028` 在 `Install verified official sing-box core` 步骤失败。安装脚本已对 429 和 5xx 做 3 次有限重试，但 `releases?per_page=100` 连续返回 `504`。

独立复测显示：

- `releases?per_page=1`、`5`、`10`、`100` 都在约 12 秒后返回 `504`。
- 精确 `releases/tags/v1.14.0-beta.15` 与 Git tag API 同样返回 `504`。
- `https://github.com/SagerNet/sing-box/releases.atom` 正常返回最新发布流。
- `https://github.com/SagerNet/sing-box/releases/expanded_assets/<tag>` 正常返回资产文件名、官方下载路径和 GitHub 展示的 SHA-256。
- 官方资产下载 URL 正常返回归档。

因此根因不是分页过大或本仓库测试，而是该上游仓库的 GitHub Releases API 路径持续不可用。继续增加重试次数只会延长失败时间。

## 方案比较

### 方案 A：固定使用仓库内版本常量

优点是实现最简单且不依赖发布发现接口。缺点是自动构建会悄悄停留在旧 testing 版本，失去当前“每次构建选择最新 testing”的行为。

### 方案 B：GitHub Atom + expanded assets（采用）

使用 GitHub 官方 `releases.atom` 选择最新 prerelease 标签，再读取同一标签的官方 `expanded_assets` 页面，要求其中唯一出现预期资产路径及其 SHA-256。随后下载精确资产并进行本地摘要和版本校验。

优点是避开故障中的 Releases API，同时保留动态版本发现、官方下载闭包和摘要校验。缺点是需要对两个稳定但非 JSON 的 GitHub 官方格式做严格、最小化解析。

### 方案 C：把 sing-box 二进制或摘要镜像到本仓库

优点是发布时最不依赖上游。缺点是引入新的二进制托管、更新、容量和供应链责任，不符合本次最小修复范围。

## 数据流

1. 请求 `https://github.com/SagerNet/sing-box/releases.atom`。
2. 从每个 `<entry>` 的官方 release tag 链接中提取合法 prerelease 语义版本。
3. 按 `<updated>` 时间选择最新条目；当前仓库内固定版本常量只作为显式调用和测试默认值，不用于静默掩盖发布发现错误。
4. 根据版本构造精确归档 URL 和 `expanded_assets` URL。
5. 并行下载归档和官方资产页。
6. 在单个 `<li>` 资产行内同时要求：
   - 精确官方相对下载路径；
   - 精确归档文件名；
   - 该文件名对应的唯一 `sha256:<64 个小写十六进制字符>`。
7. 计算归档 SHA-256，使用 timing-safe 比较核对。
8. 解压、运行 `sing-box version`，要求输出与所选版本完全一致。

## 错误处理

- Atom 与资产页请求沿用有限重试：仅 HTTP 429 和 5xx 可重试，间隔 1 秒、2 秒，最多 3 次。
- 4xx、空响应、无 prerelease、XML/HTML 结构不符合约束、缺失资产、重复资产、摘要无效或下载失败都直接报错。
- 不把固定旧版本作为网络故障时的静默降级，以免构建在维护者不知情时长期落后。
- 错误消息明确指出失败阶段：发布流、资产页、归档下载、摘要或版本输出。

## 测试设计

回归测试必须覆盖真实生产函数的可观察行为：

1. Atom 中同时包含 stable 与多个 prerelease 时选择更新时间最新的 prerelease。
2. Atom 请求遇到临时 504 时按 1 秒、2 秒重试后成功。
3. 官方资产页中精确文件名与路径对应的 SHA-256 可被读取。
4. 缺失、重复、错误路径和错误摘要均被拒绝。
5. 安装集成测试使用完整的 Atom、expanded-assets HTML 和归档响应，证明选择版本、摘要校验、解压、版本核对和 `GITHUB_ENV` 输出形成闭环。
6. 完整 `npm test`、`npm run verify`、秘密扫描、Actions 静态检查和 `git diff --check` 通过后才能推送。

## 实施范围

- 修改 `scripts/install-sing-box-core.mjs`：以官方 Atom 和 expanded-assets 页面替代故障中的 Releases API。
- 修改 `test/actions.test.js`：先增加失败测试，再实现最小生产改动。
- 不修改客户端规则、业务分组、Sub-Store 任务、Pages 内容或发布权限。

## 验收标准

1. 本地真实网络安装能选择 `releases.atom` 当前最新 prerelease，并成功安装、校验官方核心。
2. `Update Rules` 能越过 `Install verified official sing-box core`，完成 edge 构建和后续流程。
3. 由成功更新触发的 `Deploy Pages` 完成发布，公开站点可访问。
4. 所有本地与远端验证均有明确退出码或工作流 conclusion，不以推测代替结果。
