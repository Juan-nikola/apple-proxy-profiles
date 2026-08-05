# 维护、编译与发布手册

这份手册回答三个问题：以后增加节点或规则要改哪里、每个文件负责什么、在 macOS/Linux/CI/OpenWrt 环境怎样构建和验证。公开仓库不保存节点；你的私密节点只在 Sub-Store 的 `apple-proxy-sources` 组合中维护。

## 1. 先判断你要改哪一层

| 你要做的事 | 修改位置 | 修改后需要做什么 |
| --- | --- | --- |
| 增加或删除节点来源 | 只在 Sub-Store 的 `apple-proxy-sources` 组合 | 重新预览组合，再按顺序刷新节点任务和客户端任务 |
| 修改某个来源的订阅参数 | 只在自己的 Sub-Store 来源对象 | 单独预览来源，确认非空，再刷新组合 |
| 增加公开规则 | `automation/src/source-catalog.js`、对应源目录或固定上游 SHA | 更新规则快照、运行规则检查、构建和秘密扫描 |
| 修改客户端默认 DNS/IPv6/QUIC | `clients/<client>/src/options.js`、策略/渲染文件和测试 | 先写测试，再构建对应 bundle 和 fixtures |
| 修改分组、路由或规则顺序 | 对应客户端 `src/render-*.js`、共享 `shared/policies/` 和测试 | 跑客户端测试、示例校验和全量 verify |
| 增加协议或传输 | `shared/contracts.js`、归一化/能力过滤、各客户端适配器和测试 | 逐客户端确认是否原生支持；不能静默丢字段 |
| 修改 Sub-Store 参数 | 私密任务参数编辑器；公开示例同步改总指南 | 先隔离任务预览，不把真实参数值写入 GitHub |
| 修改公开 JS 名称或 Pages 路径 | 对应 `clients/<client>/scripts/build.mjs`、发布脚本、文档和测试 | 保留旧兼容别名，验证新旧 bundle 字节契约 |
| 修改 sing-box `.srs` | `automation/src/render-sing-box-rules.js`、`clients/sing-box/scripts/compile-rules.mjs` 和测试 | 必须使用官方 core 产生二进制；无 core 必须失败 |

最重要的边界：**新增节点不改代码，新增公开规则不改生成后的 `public/`，修改代码不手工编辑 `dist/`。**

## 2. 目录和关键文件职责

```text
shared/
  contracts.js                 所有客户端共享的协议、选项和值域
  normalization/               节点规范化、身份、字段清理
  policies/                    客户端中立的服务、分组和规则意图

clients/egern/
  src/substore-nodes-entry.js  Egern 节点 File 的 Sub-Store 入口
  src/substore-profile-entry.js Egern Profile File 的 Sub-Store 入口
  src/render-node.js           Egern 节点对象和 YAML 节点
  src/render-profile.js        Egern Profile 结构
  src/render-dns.js            DNS 和网络默认值
  scripts/build.mjs            生成 dist bundle
  examples/                    脱敏 YAML 结构示例，只读生成物

clients/anywhere/
  src/substore-nodes-entry.js  Anywhere 节点 File 入口
  src/render-subscription.js   Clash YAML 订阅输出
  src/render-arrs.js           `.arrs` 规则转换
  src/build-import-page.js     全部规则导入页和 deep link
  scripts/render-rules.mjs     规则快照、分片和导入页生成
  examples/rules/              脱敏规则快照

clients/shadowrocket/
  src/substore-node-entry.js   组合订阅 Script Operator
  src/substore-profile-entry.js 三个平台 Profile File 入口
  src/render-profile.js        Shadowrocket INI Profile
  src/render-groups.js         策略组和订阅动态候选
  src/render-rules.js          规则顺序和公开规则 URL

clients/surge/
  src/substore-profile-entry.js Surge Profile File 入口
  src/render-profile.js        Surge INI Profile
  src/render-groups.js         Surge 策略组
  src/render-rules.js           Surge 规则和 Pages 地址

clients/sing-box/
  src/substore-config-entry.js sing-box Config File 入口
  src/render-config.js         JSON 根配置、路由和出站
  src/render-dns.js            DNS 服务器、引导和劫持保护
  src/render-platform.js       macOS/移动端/OpenWrt 平台差异
  src/render-rules.js          规则集引用
  scripts/compile-rules.mjs    官方 core `.srs` 编译边界

clients/*/scripts/
  build.mjs                    用 esbuild 生成 dist
  render-fixtures.mjs          生成脱敏 examples（有该脚本的客户端）

clients/*/test/                单元、bundle、文档、安全和示例测试
clients/*/dist/                自动生成的 Sub-Store bundle，禁止手工编辑
automation/                    固定上游、规则抓取、跨客户端 public 快照
public/                        GitHub Pages 自动生成树，禁止手工编辑
.github/workflows/              Actions 固定 SHA、规则更新和 Pages 发布
docs/                           总指南、维护、部署、canary 和排障
```

## 3. 从零安装开发环境

### macOS/Linux 开发机

安装 Node.js 22 或更高版本，然后在仓库根目录执行：

```bash
node --version
npm --version
npm ci
```

仓库的 `package-lock.json` 是依赖边界；日常不要使用 `npm install` 改写锁文件。Windows/WSL 也使用同样的 npm workspace 命令，但发布前最好在 Linux CI 或 macOS 再复跑一次。

### OpenWrt 软路由

OpenWrt 不是在本仓库中编译客户端。推荐在 macOS/Linux/CI 生成 JSON，在软路由上安装与配置匹配的官方 sing-box 二进制，然后导入 JSON。只有明确在路由器上开发时，才在 OpenWrt 安装 Node.js 22+ 和 npm；设备资源不足时不要在路由器上运行完整 `npm ci`。

## 4. 根目录构建和验证

### 4.1 生成所有客户端 bundle

```bash
npm run build
npm run fixtures
```

`npm run build` 调用每个 workspace 的 `scripts/build.mjs`，把 `src/` 入口打包到 `clients/*/dist/`；`npm run fixtures` 生成脱敏示例。不要手改这些输出，修改源文件后重新生成。

### 4.2 运行完整门禁

```bash
npm test
npm run verify
npm run check:secrets
npm run check:actions
npm run check:rules
```

区别如下：

- `npm test`：根测试加所有 workspace 测试。
- `npm run verify`：测试、构建、fixtures、秘密扫描和工作流检查。
- `npm run check:secrets`：扫描仓库范围，结果只报告路径和规则 ID，不应输出秘密内容。
- `npm run check:actions`：检查 Actions 是否固定到允许的完整 SHA、权限是否最小。
- `npm run check:rules`：按不可变 Manifest 提交逐字节复现当前公开规则快照。

发布前还应执行：

```bash
git diff --check
git status --short
git diff --stat
```

确认没有私密 API、节点值、生成后的私密订阅 URL 或意外的大型临时文件。

## 5. 单个客户端怎样编译

每个 workspace 都要求 Node.js 22+。通用的四步是：测试 → build → fixtures（如果有）→ secret scan。

### Egern

```bash
npm --workspace @apple-proxy-profiles/egern run test
npm --workspace @apple-proxy-profiles/egern run build
npm --workspace @apple-proxy-profiles/egern run fixtures
npm --workspace @apple-proxy-profiles/egern run check:secrets
npm --workspace @apple-proxy-profiles/egern run verify
```

生成 `clients/egern/dist/egern-node-generator.js`、`egern-profile-generator.js` 和兼容别名；示例在 `clients/egern/examples/`。

### Anywhere

```bash
npm --workspace @apple-proxy-profiles/anywhere run test
npm --workspace @apple-proxy-profiles/anywhere run build
npm --workspace @apple-proxy-profiles/anywhere run check:secrets
npm --workspace @apple-proxy-profiles/anywhere run verify
```

更新公开规则时使用：

```bash
npm --workspace @apple-proxy-profiles/anywhere run rules
```

生成器在 `clients/anywhere/dist/`；公开规则和全部导入页最终进入 `public/current/anywhere/`，由根规则发布流程控制。

### Shadowrocket

```bash
npm --workspace @apple-proxy-profiles/shadowrocket run test
npm --workspace @apple-proxy-profiles/shadowrocket run build
npm --workspace @apple-proxy-profiles/shadowrocket run fixtures
npm --workspace @apple-proxy-profiles/shadowrocket run check:secrets
npm --workspace @apple-proxy-profiles/shadowrocket run verify
npm --workspace @apple-proxy-profiles/shadowrocket run verify:compatibility
npm --workspace @apple-proxy-profiles/shadowrocket run check:rules
```

`check:rules` 需要联网检查 Shadowrocket 上游，不替代根目录的不可变规则检查。

### Surge

```bash
npm --workspace @apple-proxy-profiles/surge run test
npm --workspace @apple-proxy-profiles/surge run build
npm --workspace @apple-proxy-profiles/surge run fixtures
npm --workspace @apple-proxy-profiles/surge run check:secrets
npm --workspace @apple-proxy-profiles/surge run verify
```

生成 `clients/surge/dist/surge-profile-generator.js` 和兼容别名；三个官方平台共用同一入口，通过 `platform=macos|iphone|ipad` 选择输出。

### sing-box

```bash
npm --workspace @apple-proxy-profiles/sing-box run test
npm --workspace @apple-proxy-profiles/sing-box run build
npm --workspace @apple-proxy-profiles/sing-box run fixtures
npm --workspace @apple-proxy-profiles/sing-box run check:secrets
npm --workspace @apple-proxy-profiles/sing-box run verify
```

生成 `clients/sing-box/dist/sing-box-config-generator.js` 和兼容别名；平台由 `platform=macos|iphone|ipad|android|openwrt` 选择。

## 6. sing-box 官方 core 和 `.srs` 编译

`clients/sing-box/scripts/compile-rules.mjs` 只接受一个可执行的官方 sing-box core，调用：

```text
sing-box rule-set compile --output <output.srs> <source.json>
```

它会检查输出存在、非空、不是 JSON/纯文本，并记录大小和 SHA-256。源码没有提供一个把任意路径写入仓库的默认 CLI，因此用 Node 直接调用导出的编译函数：

```bash
node --input-type=module -e 'import { compileRules } from "./clients/sing-box/scripts/compile-rules.mjs"; await compileRules({ corePath: process.argv[1], sourceDirectory: "./public/current/sing-box/rules", outputDirectory: "./public/current/sing-box/rule-sets" });' /absolute/path/to/sing-box
```

实际源目录应使用本次构建产生的 sing-box JSON 源规则目录；如果目录布局发生变化，以 `clients/sing-box/test/rule-compile.test.js` 和 `scripts/compile-rules.mjs` 为准。没有官方 core、core 返回非零、或输出不是二进制时都必须停止发布，不能创建一个后缀为 `.srs` 的文本文件冒充编译结果。

## 7. 规则、节点和代码的修改流程

### 7.1 增加节点

1. 只在 Sub-Store 新建来源或把来源加入 `apple-proxy-sources`。
2. 单独预览新增来源，再预览组合。
3. 依次刷新节点输出和平台输出。
4. 一台设备 canary 通过后再推广，不修改仓库文件。

### 7.2 增加公开规则

1. 在 `automation/src/source-catalog.js` 或对应规则源目录声明允许来源和格式。
2. 更新固定上游提交和许可/来源说明。
3. 运行规则渲染和 `npm run check:rules`。
4. 检查 Anywhere `.arrs`、Shadowrocket/Surge 规则和 sing-box rule-set 引用都闭合。
5. 通过全量 verify 和秘密扫描后再提交 `public/` 生成差异。

不要直接编辑 `public/current/`，也不要只手工替换一个客户端的规则文件；公开规则必须由固定源快照产生。

### 7.3 修改客户端行为

先写或修改对应测试，再改 `src/`：

1. 共享协议或字段：`shared/`、规范化和能力过滤。
2. 节点映射：目标客户端的 `src/render-node.js`、验证和测试。
3. Profile/Config：目标客户端的 `src/render-profile.js` 或 `render-config.js`、选项和测试。
4. 分组/路由/DNS：对应 `render-groups.js`、`render-rules.js`、`render-dns.js` 和安全测试。
5. Sub-Store 入口：对应 `src/substore-*.js`、bundle 测试、文档测试。
6. 重新 build/fixtures，检查 dist 与示例只包含脱敏内容。

## 8. 发布、Pages 和回滚

发布前：

```bash
npm ci
npm run verify
npm run check:actions
npm run check:rules
```

提交到 `main` 后，Pages 工作流会从 `public/` 构建。上线后检查：

```bash
curl -L --fail --silent --show-error --head https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
curl -L --fail --silent --show-error --head https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js
curl -L --fail --silent --show-error --head https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html
```

生产使用 `current/`，测试使用 `edge/`；公开规则回滚可使用 `previous/` 或 Manifest 中的 `versions/<manifestHash>/`。Sub-Store 任务通常不需要换 URL：修复后重新运行同一远程任务即可。设备侧失败先切回旧 Profile/Config，不要用更新脚本覆盖唯一可用配置。

## 9. 真机 canary 顺序

- Egern：Intel Mac → iPhone → iPad。
- Shadowrocket：Intel Mac → iPhone → iPad。
- Surge：Mac → iPhone → iPad。
- sing-box：Mac → iPhone → iPad → Android → OpenWrt；OpenWrt 还要单独验证透明网关、DNS 劫持、IPv4/IPv6 和重启恢复。
- Anywhere：iPhone → iPad；节点、规则导入和本地绑定分别验证。

每台设备保留旧配置并实际做一次回滚演练。自动测试通过不代表 App Store、TestFlight、Android 或 OpenWrt 真机行为已经通过。
