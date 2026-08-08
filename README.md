# Apple Proxy Profiles

这是 `Juan-nikola/apple-proxy-profiles` 的公开生成器仓库：从同一套节点能力、策略意图和公开规则，生成 Egern、Anywhere、小火箭（Shadowrocket）、Surge 和 sing-box 的客户端产物。

> 当前状态：生成器、公开脚本、确定性示例和自动验证已完成；真实设备仍需按各客户端 canary 清单逐台验收。本仓库没有保存任何真实节点或 Sub-Store 密钥。

## 先看哪一份文档

- 第一次部署：先看[五客户端 Sub-Store 总指南](docs/substore-two-layer-setup.md)。
- 想知道节点、规则或代码应该改哪里：看[维护与编译手册](docs/maintenance.md)。
- 只部署一个客户端：进入下面对应的 README 和 `docs/deployment.md`。
- 需要排错：进入对应客户端的 `docs/troubleshooting.md`。

本项目的“引用”指：Sub-Store 任务保存 GitHub Pages 的远程 JS URL，并通过 URL hash 传入参数；不把 JS 正文复制到任务，也不把私密节点 URL 写入 GitHub。

## 六步快速开始

1. 在自己的 Sub-Store 中确认已有来源 `snell` 与 `vlesshy2`。
2. 新建组合订阅 `apple-proxy-sources`，只引用这两个来源，先预览确认非空。
3. 再创建处理后的 `shadowrocket-nodes` 组合，只给它挂 Shadowrocket 节点 Operator；Shadowrocket 三个 Profile 使用 `name=shadowrocket-nodes`，Egern、Anywhere、Surge、sing-box 使用原始组合 `name=apple-proxy-sources`。
4. 先用 `edge` 建隔离测试任务，预览无误后生产任务使用 `current`。
5. 按 macOS → iPhone → iPad；Android 与 OpenWrt 分别按 sing-box 清单逐台导入，始终保留旧配置。
6. 新增节点只修改 Sub-Store 组合；新增公开规则或修改生成器才修改本仓库。

## 七个公开远程 JS 入口

下面是新任务应使用的稳定地址。不要将真实 Sub-Store 地址拼接在这里，也不要把 GitHub `blob` 页面当作 JS 地址。

| 客户端 | 远程 JS | 用途 |
| --- | --- | --- |
| Shadowrocket | [node operator](https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js) | 组合订阅节点处理 |
| Shadowrocket | [profile generator](https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js) | macOS/iPhone/iPad Profile |
| Egern | [node generator](https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js) | 私密节点 YAML |
| Egern | [profile generator](https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js) | macOS/iPhone/iPad Profile |
| Anywhere | [node generator](https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js) | 私密 Clash 节点 YAML |
| Surge | [profile generator](https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js) | macOS/iPhone/iPad Profile |
| sing-box | [config generator](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js) | macOS/iPhone/iPad/Android/OpenWrt JSON |

`edge/` 是测试/前沿通道；`current/` 是生产通道。旧的 `substore-*` URL 仍作为兼容别名保留，但不要在同一任务里重复添加新旧脚本。

## Sub-Store 任务总览

`apple-proxy-sources` 是保留来源标记的原始组合；Shadowrocket 另使用处理后的 `shadowrocket-nodes` 组合。总指南包含每个任务的远程 URL、hash 参数、可视化参数、预览成功标志和刷新顺序。

| 客户端 | 任务数量 | 任务结构 |
| --- | ---: | --- |
| Egern | 4 | 节点 File + macOS/iPhone/iPad Profile File |
| Anywhere | 1 | 节点 File；规则集和设备设置是独立层 |
| Shadowrocket | 4 | 节点 Script Operator + macOS/iPhone/iPad Profile File |
| Surge | 3 | macOS/iPhone/iPad Profile File |
| sing-box | 5 | macOS/iPhone/iPad/Android/OpenWrt Config File |

旧版 Sub-Store 只有一个脚本链接框时，格式是：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/<client>/scripts/<script>.js#output=config&type=collection&name=apple-proxy-sources&platform=iphone
```

`#` 后的 `&` 用来分隔脚本参数；不要使用 `?` 连接脚本参数。新版界面优先选择“远程链接”，再在参数编辑器逐项填写。五个客户端合计 17 个输出任务。

## 五个客户端

| 客户端 | 支持平台 | 主要入口 | 详细文档 |
| --- | --- | --- | --- |
| Egern | macOS、iPhone、iPad | 节点 YAML + 三份 Profile | [README](clients/egern/README.md) · [部署](clients/egern/docs/deployment.md) |
| Anywhere | iPhone、iPad 等官方客户端 | 节点 YAML + `.arrs` 规则导入 | [README](clients/anywhere/README.md) · [部署](clients/anywhere/docs/deployment.md) |
| Shadowrocket | macOS、iPhone、iPad | 节点订阅 + 三份 INI Profile | [README](clients/shadowrocket/README.md) · [部署](clients/shadowrocket/docs/deployment.md) |
| Surge | macOS、iPhone、iPad | 三份 Surge Profile | [README](clients/surge/README.md) · [部署](clients/surge/docs/deployment.md) |
| sing-box | macOS、iPhone、iPad、Android、OpenWrt | 五份 JSON 配置 | [README](clients/sing-box/README.md) · [部署](clients/sing-box/docs/deployment.md) |

## 私密与公开边界

公开仓库和 GitHub Pages 只允许包含源码、脱敏示例、公开规则、固定提交、哈希和聚合计数。以下内容只能保存在自己的 Sub-Store、设备或密码管理器中：

- Sub-Store 管理地址、API key、原始订阅 URL 和生成后的私密输出 URL；
- 节点服务器、端口、UUID、密码、PSK、私钥、证书和完整 YAML/URI/JSON；
- 带秘密查询参数的 deep link、二维码、抓包、日志和截图。

本项目不需要 MITM、HTTPS 解密、根证书、请求重写或“不验证证书”。公开 JS 在私密 Sub-Store 运行时读取节点；诊断只输出平台、协议和排除原因计数，不回传节点值。

## 维护时改哪里

| 需求 | 只改这里 | 不要改这里 |
| --- | --- | --- |
| 增加/删除节点订阅 | Sub-Store 的 `apple-proxy-sources` 原始组合（并同步 `shadowrocket-nodes`） | GitHub、README、公开 JS |
| 修改公开规则 | `automation/src/source-catalog.js`、对应允许清单或上游固定 SHA | `public/`、`clients/*/dist/` |
| 修改某客户端行为 | 对应 `clients/<client>/src/`、测试和文档 | 生成后的 bundle |
| 修改共享协议能力 | `shared/`、各适配器、测试和 fixtures | 只在某一客户端静默丢字段 |
| 修改 Sub-Store 参数 | 私密任务的参数编辑器或总指南中的公开示例 | 私密 API 或输出 URL |
| 修改 sing-box 规则编译 | 官方 core 编译边界、脚本和测试 | 用文本伪造 `.srs` |

完整的目录地图、文件职责、每个平台编译命令、测试矩阵、发布和回滚规则见[维护与编译手册](docs/maintenance.md)。

## 本地构建与验证

要求 Node.js 22+ 和 npm：

```bash
npm ci
npm run build
npm run fixtures
npm run verify
npm run check:actions
npm run check:rules
```

只验证一个客户端：

```bash
npm --workspace @apple-proxy-profiles/egern run verify
npm --workspace @apple-proxy-profiles/anywhere run verify
npm --workspace @apple-proxy-profiles/shadowrocket run verify
npm --workspace @apple-proxy-profiles/surge run verify
npm --workspace @apple-proxy-profiles/sing-box run verify
```

官方客户端本身不从本仓库编译；本仓库生成它们导入的配置。OpenWrt 使用生成的 JSON 和官方 sing-box 二进制。sing-box `.srs` 规则集必须由显式官方 core 编译器产生；缺少 core 时构建失败是安全行为。

CI 和本地可用同一个安装器获取固定的官方 `sing-box 1.14.0-beta.9`。安装器只支持 Linux x64、macOS Apple Silicon 和 macOS Intel，会使用该固定 tag 的 GitHub Release 官方 `sha256` asset digest 校验压缩包，并返回绝对路径：

```bash
TASK_SING_BOX_CORE="$(node scripts/install-sing-box-core.mjs --print-path)"
SING_BOX_CORE="$TASK_SING_BOX_CORE" node scripts/stage-rule-artifacts.mjs --channel current
SING_BOX_CORE="$TASK_SING_BOX_CORE" npm --workspace @apple-proxy-profiles/sing-box run compile:rules
SING_BOX_CORE="$TASK_SING_BOX_CORE" npm --workspace @apple-proxy-profiles/sing-box run check:config
```

sing-box 有两种配置模式：`profileMode=light` 使用远程二进制 `.srs`；`profileMode=diagnostic` 保留节点、DNS、TUN 和平台设置，但不加载任何远程规则，用于判断启动失败是否来自规则集。默认 `adblockMode=off`；只有显式选择 `adblockMode=full` 才会引用隔离的 `optional/adblock-full` 广告包，它会增加下载量和内存占用。

默认发布的硬限额是：`DomesticCore` 最多 2,000 条、默认规则最多 25,000 条，单个客户端引用的默认规则文件合计最多 5,000,000 字节。`audit/sing-box/rules/*.json` 只是审计和可复现编译输入，不是生产配置可以远程加载的规则；生产路由只能引用经官方 core 验证的 `.srs`。

## 规则与 Anywhere 全部导入

公开规则 Manifest：<https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/rules/manifest.json>

Anywhere 全部规则导入页：<https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html>

导入规则后仍需在 App 内逐个确认 DIRECT、REJECT 或目标节点/链的绑定。节点刷新、规则更新和本地绑定是三层独立操作；Anywhere 的 `Default` 不是可靠的停用开关。

## 发布、升级与回滚

提交到 `main` 后由 GitHub Actions 构建并发布 `public/`。上线前必须通过官方 core 安装/校验、`.srs` 编译、两种 sing-box 配置检查、全客户端轻量语义与预算门禁、fixtures、秘密扫描、Actions 固定检查和不可变规则检查；上线后再检查公开 URL 返回 200 和 Manifest 哈希。定时任务只更新 `edge`，绝不自动推进 `current`；生产推进必须在 `canary-approval` 环境中指定已真机测试的客户端和其 64 位 client-manifest 哈希，然后复用该不可变字节，不重新构建。

生产任务保持 `/current/`，隔离测试任务可使用 `/edge/`。升级前保留旧 Profile 和旧输出；失败时先在设备切回旧 Profile，再将测试任务改回已验证的旧版 URL。`previous/` 和 Manifest 的不可变版本用于公开规则回滚。真实设备必须按客户端 canary 清单逐台推广，不能把自动测试当作真机验收。

## 许可

本仓库整体以 [GNU GPL v2.0 only](LICENSE) 发布。Blackmatrix7 规则的来源、固定提交、转换说明和免责声明随衍生产物保留；各客户端名称和商标属于各自权利人。
