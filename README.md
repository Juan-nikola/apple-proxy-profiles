# Apple Proxy Profiles · 新手完整教程

这个仓库帮你把“节点”和“规则”变成 5 个客户端（Shadowrocket、Surge、Egern、Anywhere、sing-box，以及 Android）可以直接导入的配置文件。你不需要会编程，只需要按本教程一步一步操作。全程大约需要 1–2 小时，之后日常使用只需几分钟。

本仓库**不保存你的任何节点信息**。你的节点、订阅链接、密码全部留在你自己的 Sub-Store 里；仓库只提供公开的“生成脚本”和“规则文件”。

Sub-Store 新部署为每个客户端维护独立 collection；精确名称、用户筛选、迁移顺序和旧入口回滚见 [Sub-Store 客户端节点池指南](docs/substore-client-pools.md)。

> 阅读建议：第一次使用请从第 0 节按顺序读到第 8 节，不要跳步。每一节都有“成功标志”，看到它再继续。

---

## 第 0 节：先搞懂几个词（3 分钟）

| 词 | 什么意思 |
| --- | --- |
| 节点 | 一台你能连上的境外服务器，例如 `🇯🇵 东京`、`🇺🇸 洛杉矶` |
| 订阅 | 一个网址，打开后返回“节点列表”。机场或自建服务器会给你一个订阅链接 |
| 代理客户端 | 装在你设备上的软件：Shadowrocket（小火箭）、Surge、Egern、Anywhere、sing-box |
| 分流规则 | 一组判断：这个网站走代理，那个网站直连。例如百度直连、Google 走代理 |
| 策略组 | 一个“选择器”，比如 `🚀 节点选择` 是你手动选节点的入口，`📺 YouTube` 自动选节点 |
| Sub-Store | 运行在你服务器/NAS 上的转换工具，把订阅 + 生成脚本 + 规则组合成客户端能用的最终配置 |
| GitHub Pages | GitHub 免费提供的静态网页空间，本仓库用它托管生成脚本和规则文件 |

一个请求的完整路径：

```text
你打开 App → 代理客户端 → 查分流规则
  ├─ 国内域名/IP → 直连（不走代理）
  └─ 境外域名 → 从策略组选一个节点 → 节点服务器 → 目标网站
```

本项目的分流顺序固定为：国内核心 → 常用服务规则 → 海外游戏 → 中国域名后缀 → 中国 IP → 兜底走节点。国内 App（微信、抖音、B 站等）直连，境外网站走代理，游戏按规则分流。

---

## 第 1 节：你需要准备什么（5 分钟）

1. **一个已经能用的节点来源**：机场订阅链接，或自建服务器（Snell、VLESS Reality 等）。你当前的 Sub-Store 里已有 `[自建]snell` 和 `[自建]Vlesshy2` 两个来源，说明你已经有了。
2. **一台能运行 Sub-Store 的机器**：你自己的 Sub-Store 已经部署在 `substore.sunyz.uk`，不需要再装。
3. **GitHub 账号**（免费）：用于复制本仓库到你的账号下、开启 Pages 部署。教程在第 7 节。
4. **一台测试设备**：建议先只用一台 Mac（Intel 或 Apple Silicon 都可以），跑通后再加 iPhone、iPad。

> 注意：本仓库不涉及 MITM/HTTPS 解密/安装证书/请求重写。所有相关开关请保持关闭。

---

## 第 2 节：认识你的 Sub-Store（10 分钟）

用浏览器打开你的 Sub-Store 管理页面。你会看到几个大区块：

- **订阅（Subs）**：原始节点来源。你的里面有 `[自建]snell`、`[自建]Vlesshy2`、`anytls`、`[realm]`、`xiaov` 等；`xiaov` 跳过不使用，不要加入总池或任何 client collection。
- **组合订阅（Collections）**：用户建立 `apple-proxy-all` 总池，再按节点池指南建立五个 client collection。旧 `apple-proxy-sources` 只保留作兼容/回滚入口。
- **文件（Files）**：最终输出的配置文件。本项目需要 16 个文件任务，你的 Sub-Store 里已经全部建好（见第 3 节清单）。
- **脚本（Scripts）**：不需要手动创建。本项目的脚本由 GitHub Pages 托管，Sub-Store 任务直接“引用”远程链接。

### 重要概念：引用而不是复制

Sub-Store 的每个文件任务都保存一个“远程 JS 链接”，例如：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-shadowrocket&platform=macos&...
```

`#` 后面是参数。Sub-Store 每次刷新任务时，会去下载这个 JS 并执行，生成你要的配置。**不要把 JS 内容复制到 Sub-Store，也不要修改链接里的公开部分**（除了你任务自己的参数）。

### 已经帮你建好的 16 个任务

| 客户端 | 任务名 | 输出 |
| --- | --- | --- |
| Egern | `egern-nodes`、`egern-config-macos/iphone/ipad` | 节点 YAML + 3 份 Profile |
| Anywhere | `anywhere-nodes` | Clash 节点 YAML |
| Shadowrocket | `shadowrocket-config-macos/iphone/ipad` | 3 份 Profile（读取 `apple-proxy-shadowrocket`） |
| Surge | `surge-nodes`、`surge-config-macos/iphone/ipad` | 节点资源 + 3 份 Profile |
| sing-box | `singbox-config-macos/iphone/ipad/android` | 4 份 JSON 配置 |

每个任务都已设置：节点类任务每 6 小时刷新，配置类任务每天刷新。你不需要在 Sub-Store 里再建任何东西。

---

## 第 3 节：检查你的 Sub-Store 是否正常（10 分钟）

按顺序做这几步，每步都有“成功标志”。这一步很重要：它决定你后面的客户端导入是否顺利。

1. 打开“组合订阅”，按节点池指南逐个 preview 六个 client collection。
   - 成功标志：每个 collection 的节点数量和协议计数符合用户自行筛选的预期。
2. 打开“文件/File”，逐个点开 16 个任务，点“预览”。
   - 成功标志：`egern-nodes` 预览顶层有 `proxies:`；`anywhere-nodes` 同样有 `proxies:`；Shadowrocket/Surge 的配置预览包含 `[General]`、`[Proxy Group]`、`[Rule]`；sing-box 的配置是合法 JSON，包含 `dns`、`inbounds`、`outbounds`、`route`。
   - 注意：Shadowrocket 三个配置的预览依赖 GitHub Pages 上的最新生成脚本，确认 URL 是 `current/shadowrocket/scripts/shadowrocket-profile-generator.js`。
3. 打开一个文件任务，找到它的“远程链接/输出 URL”，复制保存到自己的备忘录。这个 URL 是**私密的**，不要发给任何人、不要截图分享。
   - 成功标志：合成形式如 `https://example.invalid/private/client-output`；你自己的私密 URL 能直接下载到配置内容。

> 如果预览为空：先确认对应 client collection 非空，再确认该客户端任务的 `name=` 与节点池指南精确一致，最后刷新一次任务。

### 任务参数长什么样

以 Shadowrocket macOS 为例，任务里的远程链接是：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-shadowrocket&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off
```

`#` 后面每一对 `key=value` 都是一个参数；不同参数用 `&` 隔开。**不要使用 `?` 连接参数**。对应的生成器源码位置是 `clients/shadowrocket/dist/shadowrocket-profile-generator.js`（构建产物，不要手改）。

---

## 第 4 节：把配置装进你的客户端

每个客户端只导入“它自己的任务输出”。下面按客户端分开讲。**先只在一台 Mac 上做，全部通过后再做 iPhone/iPad。**

### 4.1 Shadowrocket（小火箭）· Mac / iPhone / iPad

1. 打开 Shadowrocket，进入“订阅/Subscription”页面，添加 `shadowrocket-nodes` 文件任务的私密输出 URL（该任务由排序节点生成器产生，节点按“洲 → 名称”排列）。
2. 给这个订阅起一个显示名，例如 `Apple-Proxy-Nodes`。**这个名字必须和三个配置任务的 `subscriptionName` 参数完全一致**（你现在已经统一为 `Apple-Proxy-Nodes`）。大小写、空格都要一模一样。
3. 手动更新订阅，确认节点数量 > 0。
4. 进入“配置/Config”页面，添加 `shadowrocket-config-macos` 的私密输出 URL（Mac 用 macOS 那份；iPhone 用 `shadowrocket-config-iphone`，iPad 用 `shadowrocket-config-ipad`）。
5. 选择新配置，打开连接。
6. 检查：打开 `🚀 节点选择` 组，摘要应显示 `SELECT > PROXY`；再打开 `🐙 GitHub` 和 `🍎 Apple`，确认两个组都存在、候选完整。
7. 分别测试：一个中国网站（如 baidu.com）、一个境外网站（如 google.com）、你家的路由器管理页（如 192.168.1.1）。

> 常见检查点：动态组只含与 `subscriptionName` 完全匹配的 `<subscriptionName>,use=true`。`🚀 节点选择`以 `PROXY` 为首页跟随入口；境外业务分组默认跟随它，国内业务分组默认 `DIRECT`，自动测速组和各洲手动节点组作为显式候选保留。若显示名不匹配，动态组不会列出该订阅的具体服务器（显式选择仍会出现）。

### 4.2 Egern · Mac / iPhone / iPad

1. 添加 `egern-nodes` 的私密输出 URL 作为节点订阅（Egern 里叫“节点/Proxies”）。
2. 添加 `egern-config-macos`（或 `iphone`/`ipad`）的私密输出 URL 作为 Profile。
3. 选择新 Profile 并连接。成功标志：Profile 包含 `policy_groups:`、`rules:`，且不含节点密码/UUID。
4. 测试同 4.1 第 7 步。

> Egern 的节点订阅和 Profile 是两层：更新节点不会自动更新 Profile，反之亦然。日常都手动刷新一次。

### 4.3 Anywhere · iPhone / iPad

Anywhere 没有“完整配置”概念，要分三层做：

1. **节点层**：添加 `anywhere-nodes` 的私密输出 URL 作为节点订阅，手动刷新，确认节点出现。
2. **规则层**：用浏览器打开公开规则导入页 <https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html>，点“全部导入”，按提示打开 Anywhere 确认。成功标志：出现 31 个默认规则分片。
3. **绑定层**：在 Anywhere 的规则列表里，把 `DomesticCore`、`DomesticGame`、`ChinaIP` 等国内分片绑定为 DIRECT；把 `OverseasGame`、境外服务分片绑定为当前代理；把 `Advertising`、`Advertising_Domain`（可选广告包）绑定为 REJECT。
4. 关闭 Global Mode，使用 Rule 模式。

> 注意：Anywhere 的 `Default` 不是停用开关，而是“跟随当前代理”。节点、规则、绑定是三层独立配置。

### 4.4 Surge · Mac / iPhone / iPad

1. 添加 `surge-nodes` 的私密输出 URL 作为节点资源（Surge 的 `[Proxy]` 池）。
2. 添加 `surge-config-macos`（或 `iphone`/`ipad`）的私密输出 URL 作为 Profile。
3. 选择新 Profile 并连接。成功标志：Profile 包含 `[General]`、`[Proxy]`、`[Proxy Group]`、`[Rule]`，`📦 远程节点池` 里有 `policy-path=<你的私密节点 URL>`。
4. 测试同 4.1 第 7 步。

> Surge 的 Profile 不含节点凭据，节点由 `policy-path` 动态加载。macOS 用 `platform=macos`，不要拿 Mac 的 Profile 导进 iPhone。

### 4.5 sing-box · Mac / iPhone / iPad / Android

1. 按设备添加对应配置：
   - Mac：`singbox-config-macos`
   - iPhone：`singbox-config-iphone`
   - iPad：`singbox-config-ipad`
   - Android：`singbox-config-android`
2. 导入后确认系统 VPN 权限（iOS/Android 会弹出 VPN 授权），TUN 模式接管流量。
3. 成功标志：配置能通过 sing-box 校验，`dns`、`inbounds`、`outbounds`、`route` 都存在，节点不为空。
4. 本阶段不生成 OpenWrt 透明网关配置；后续需要单独确认 LAN、IPv6 和 fw4/nftables 参数后再实现。

> sing-box 默认使用远程 `.srs` 二进制规则集（轻量模式）。规则文件由 GitHub Pages 托管，客户端启动时自动下载。

---

## 第 5 节：验证与回滚（15 分钟）

### 验证清单（每台设备都做一遍）

- [ ] 中国网站秒开（baidu.com、bilibili.com）
- [ ] 境外网站能开（google.com、youtube.com）
- [ ] 局域网设备可达（路由器、NAS、打印机）
- [ ] 切换 `🚀 节点选择` 里的节点后，YouTube/Netflix 换出口
- [ ] 断开 Wi-Fi 用流量再连一次，配置自动恢复
- [ ] 关闭代理后，网络恢复正常

维护者还可以用仓库命令做规则级验证：

```bash
npm --workspace @apple-proxy-profiles/shadowrocket run check:rules
```

这条命令会联网核对 Shadowrocket 引用的 33 份固定提交规则输入是否与仓库一致，网络受限时可能失败，这不代表本地代码有错。

### 回滚（出问题时）

1. 在客户端里切回旧的 Profile/配置。**旧配置一定要保留，不要删除。**
2. 在 Sub-Store 里重新运行刚才失败的 File 任务，确认预览正常后再更新客户端。
3. 如果规则更新导致异常，可以在 Sub-Store 任务里把脚本 URL 的 `current` 临时改成 `previous`（公开规则回滚通道），修好后再改回 `current`。

> 本仓库的命令行验证：`npm run explain:route -- --channel current --domain <域名>` 可以离线查某个域名按当前规则会走代理还是直连。这个命令只读本地文件，不联网、不改配置。

---

## 第 6 节：日常维护（5 分钟/次）

| 我要做什么 | 改哪里 | 怎么做 |
| --- | --- | --- |
| 增加/删除节点来源 | Sub-Store 的 `apple-proxy-all` 总池与受影响 client collection | 用户更新筛选后 preview，再只刷新受影响客户端任务 |
| 修改某来源的参数 | Sub-Store 里那个来源对象 | 单独预览来源，再刷新组合 |
| 更新公开规则 | 本仓库（开发者） | 改 `automation/src/source-catalog.js` 等，跑 `npm run check:rules` |
| 修改客户端参数 | 对应任务的参数（例如 `dnsMode=privacy`） | 只改一个参数 → 预览 → 更新设备 |
| 换节点 | 客户端策略组 | 在 `🚀 节点选择` 或业务组里直接选 |

三个“不要”：

- 不要手工编辑 Sub-Store 生成的输出 URL 内容。
- 不要把私密 URL、节点密码、UUID 发到任何聊天、截图、Issue。
- 不要删除旧 Profile——它是你的回滚保险。

### 客户端更新频率

- 节点类任务：每 6 小时自动刷新（也可手动）。
- 配置类任务：每 24 小时自动刷新。
- Anywhere 特殊：节点和规则都要在 App 里手动点“更新/Refresh”。

---

## 第 7 节：GitHub 部署（Deploy Pages）零基础版（20 分钟）

本仓库已经在运行，但你可能会想“复制一份到我的账号”或“改了代码后怎么发布”。下面是最完整的操作。

### 7.1 复制仓库到你的账号

1. 打开 <https://github.com/Juan-nikola/apple-proxy-profiles>。
2. 点右上角 **Fork** → 选你自己的账号 → Create fork。
3. 复制完成后，你会得到一个 `https://github.com/你的用户名/apple-proxy-profiles`。

### 7.2 开启 GitHub Pages

1. 进入你的 Fork 仓库页面，点 **Settings（设置）**。
2. 左侧点 **Pages**。
3. **Build and deployment** 区域：Source 选 **GitHub Actions**（本仓库已自带部署工作流，不需要选 “Deploy from a branch”）。
4. 完成后，Pages 会自动用仓库里的 `.github/workflows/deploy-pages.yml` 构建并发布 `public/` 目录。

### 7.3 手动触发一次部署

1. 进入仓库 **Actions** 页。
2. 左侧点 **Deploy Pages**。
3. 右侧点 **Run workflow** → 绿色的 Run workflow 按钮。
4. 等待几分钟，工作流全部打绿勾。发布地址变成：

```text
https://你的用户名.github.io/apple-proxy-profiles/
```

> 注意：只有 `public/**` 目录变化才会自动触发部署；如果你只改了 `README.md` 或源码，需要手动 Run workflow（或按第 7.4 节由规则工作流触发）。

### 7.4 规则更新工作流（自动）

仓库里有第二个工作流 **Update Rules**：

- 每天 03:23（UTC）自动运行：拉取最新公开规则 → 构建 edge 候选 → 提交到 main。
- 你可以手动运行它：Actions → Update Rules → Run workflow。
- 规则候选先进入 `edge/`，只有人工确认后才推进到 `current/`（生产）。这是安全设计：**定时任务永远不会自动动你的生产配置。**

### 7.5 修改代码后怎么发布

1. 在本地克隆你的 Fork：

```bash
git clone https://github.com/你的用户名/apple-proxy-profiles.git
cd apple-proxy-profiles
npm ci
```

2. 改代码（例如改 `clients/shadowrocket/src/` 里的生成器）。
3. 构建和验证：

```bash
npm run build
npm run fixtures
npm test
npm run check:secrets
```

4. 提交并推送：

```bash
git add .
git commit -m "描述你的修改"
git push origin main
```

5. 到 Actions 页确认 Deploy Pages 成功（改到 `public/` 时自动触发；只改源码时手动 Run 一次）。
6. 打开 `https://你的用户名.github.io/apple-proxy-profiles/current/<client>/scripts/<script>.js` 确认能下载到新脚本。

> 小知识：GitHub Pages 的地址与仓库名绑定，`juan-nikola.github.io/apple-proxy-profiles/` 对应仓库 `Juan-nikola/apple-proxy-profiles`。Fork 后你的地址会变成 `你的用户名.github.io/apple-proxy-profiles/`，Sub-Store 任务里的 JS URL 也要跟着改成你的地址。

---

## 第 8 节：常见问题（FAQ）

**Q1：国内 App 还是走了代理/变慢？**
检查分流规则：先用 `npm run explain:route -- --channel current --domain baidu.com` 确认预期结果；再确认客户端确实在用新 Profile（`🚀 节点选择` 摘要应为 `SELECT > PROXY`）；最后确认没有开启全局模式。

**Q2：某境外网站打不开？**
在 `🚀 节点选择` 换个节点；再在对应业务组（如 `📺 YouTube`）里切换自动测速/具体节点。仍不行就切回旧 Profile 排查是规则还是节点问题。

**Q3：国内游戏连不上/延迟高？**
本项目把游戏连接默认设为 DIRECT。`OverseasGame` 规则只处理明确境外游戏；国内游戏平台（如腾讯、网易）直连。

**Q4：更新后配置失效？**
先切回旧 Profile；再到 Sub-Store 重新运行对应 File 任务看预览是否正常；检查 `subscriptionName` 是否与客户端订阅显示名一致。

**Q5：Pages 部署失败？**
进入 Actions 页点开失败的运行，看红色步骤的日志。常见原因：`npm ci` 网络问题、sing-box 核心下载失败、规则检查不通过（上游固定提交变化）。修好后重新 Run workflow。

**Q6：Anywhere 导入规则后没有生效？**
确认三个层都做了：节点订阅已刷新、规则已导入、每个分片已绑定目标（DIRECT/REJECT/代理）。`Default` 不是停用。

**Q7：这些安全提示是什么意思？**
你的 Sub-Store 管理页面如果暴露在公网且无登录，任何人都可能看到你的订阅和节点。本项目不配置服务器端认证、TLS 或管理页面加固；秘密 URL 不是访问控制，也不能替代登录认证。请确认你的 Sub-Store 只在私有网络/VPN 后访问，或前面已有带认证和 TLS 的反向代理。不要把含 Token、订阅 URL 或节点二维码的内容放入公开网盘、聊天群或截图。

**Q8：广告拦截怎么开？**
默认 `adblockMode=off`，不加载完整广告包，也不下载 `Advertising.list` 与 `Advertising_Domain.list`。只有明确需要时，才在任务参数里设置 `adblockMode=full`，让它从独立的 optional 发布加载两份广告规则并绑定 REJECT。历史版本曾使用 `AdvertisingLite` 轻量广告分片，后来迁移为完整的 `Advertising`/`Advertising_Domain` 拆分；当前默认配置既不加载旧分片也不加载新分片，只有显式开启 `adblockMode=full` 才会出现规则命中。

---

## 附录 A：项目文件地图

| 路径 | 作用 |
| --- | --- |
| `clients/<client>/src/` | 各客户端生成器源码（改这里，不改 dist） |
| `clients/<client>/dist/` | 构建产物，自动生成，禁止手改 |
| `public/current/` | 生产通道（稳定） |
| `public/edge/` | 测试通道（每日规则候选） |
| `public/previous/` | 回滚通道 |
| `automation/src/source-catalog.js` | 公开规则来源清单 |
| `scripts/update-rules.mjs` | 规则更新与发布脚本 |
| `.github/workflows/deploy-pages.yml` | Pages 部署工作流 |
| `.github/workflows/update-rules.yml` | 每日规则更新工作流 |

## 附录 B：常用命令速查

```bash
npm ci                       # 安装依赖
npm run build                # 构建所有客户端 bundle
npm run fixtures             # 生成脱敏示例
npm test                     # 跑全部测试
npm run verify               # 完整验证（测试+构建+秘密扫描+工作流检查）
npm run check:rules          # 校验公开规则与固定上游一致
npm run check:secrets        # 扫描仓库是否混入私密信息
npm run explain:route -- --channel current --domain baidu.com   # 查某域名预期分流
```

## 附录 C：继续阅读

- [五客户端 Sub-Store 总指南](docs/substore-two-layer-setup.md)：每个任务的参数和刷新顺序
- [Sub-Store 客户端节点池指南](docs/substore-client-pools.md)：五个 collection 的边界、迁移和回滚
- [维护与编译手册](docs/maintenance.md)：开发者视角的完整维护流程
- Shadowrocket：[零基础部署](clients/shadowrocket/docs/deployment.md) · [灰度清单](clients/shadowrocket/docs/canary-checklist.md) · [维护](clients/shadowrocket/docs/maintenance.md) · [排障](clients/shadowrocket/docs/troubleshooting.md)
- Surge：[部署](clients/surge/docs/deployment.md) · [排障](clients/surge/docs/troubleshooting.md)
- Egern：[部署](clients/egern/docs/deployment.md)
- Anywhere：[部署](clients/anywhere/docs/deployment.md)
- sing-box：[部署](clients/sing-box/docs/deployment.md)

## 许可

本仓库整体以 [GNU GPL v2.0 only](LICENSE) 发布。Blackmatrix7 规则的来源、固定提交、转换说明和免责声明随衍生产物保留；各客户端名称和商标属于各自权利人。
