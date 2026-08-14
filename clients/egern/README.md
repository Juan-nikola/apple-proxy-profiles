# Egern 配置生成器

Egern 新任务只读取 `apple-proxy-egern`。客户端 collection 边界、迁移与回滚以 [Sub-Store 客户端节点池指南](../../docs/substore-client-pools.md) 为准；已有 `apple-proxy-sources` collection、tasks 和旧 URL 保留作兼容/回滚，不要删除。

这里提供与项目规则体系一致的 Egern 配置生成器。它把已有 Sub-Store 节点集合转换为一份私密节点文件，再按 macOS、iPhone、iPad 分别生成 Egern Profile；节点不会写进仓库或公开示例。

## 从这里开始

1. 先按根目录的 [Sub-Store 外置 JS + 任务引用总指南](../../docs/substore-two-layer-setup.md)，再按[部署指南](docs/deployment.md)让四个私密 File 任务以链接模式直接引用两条 Egern Pages JS URL 并导入 Profile。
2. 按[灰度与回滚指南](docs/canary.md)严格以 Intel Mac、iPhone、iPad 的顺序逐台验证。
3. 遇到失败时按[排障指南](docs/troubleshooting.md)定位；第一原则是保留旧 Profile 并安全回滚。

可执行产物是[节点生成器](dist/egern-node-generator.js)和[配置生成器](dist/egern-profile-generator.js)。仓库中的 [macOS 结构示例](examples/egern-macos.yaml)、[iPhone 结构示例](examples/egern-iphone.yaml)及 [iPad 结构示例](examples/egern-ipad.yaml)只用于检查结构，使用 `example.invalid` 保留域名，不能直接联网或实际使用。实际使用必须来自你自己的私密 Sub-Store File 输出。

新任务统一使用 `egern-node-generator.js` 与 `egern-profile-generator.js`。旧 `substore-node-generator.js`、`substore-profile-generator.js` 文件和 Pages URL 保留为字节一致的兼容别名，既有 Sub-Store 任务无需仅为改名更换 URL；不要把新旧别名当成不同脚本重复导入。

Egern Node Generator 通过稳定 URL 复用：File `egern-nodes` 直接引用 `egern-node-generator.js` 的规范 Pages URL，并在自己的参数编辑器中保存参数。以后升级 JS 不复制脚本正文，`egern-nodes` 的脚本 URL、任务名、私密输出 URL和参数都不动。三个 Profile File 对 `egern-profile-generator.js` 采用相同方式。

## Sub-Store 两层创建清单（可直接照填）

仓库在 GitHub Pages 维护两条 Egern 外置 JS。Sub-Store 不需要先创建独立脚本记录；后面的 4 个 File 直接引用对应 URL。

| 外置 JS 文件名 | JavaScript URL |
| --- | --- |
| `egern-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` |
| `egern-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` |

按顺序创建 4 个 File。每个 File 选择“链接/远程脚本”，直接粘贴上表对应 URL，并在自己的可视化参数编辑器中填写下面参数；不要粘贴 JavaScript 正文。

| File 任务名 | 引用脚本 | Arguments |
| --- | --- | --- |
| `egern-nodes` | `egern-node-generator.js` | `output=nodes&type=collection&name=apple-proxy-egern&clientChain=off` |
| `egern-macos` | `egern-profile-generator.js` | `output=config&type=collection&name=apple-proxy-egern&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `egern-iphone` | `egern-profile-generator.js` | `output=config&type=collection&name=apple-proxy-egern&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `egern-ipad` | `egern-profile-generator.js` | `output=config&type=collection&name=apple-proxy-egern&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

先运行 `egern-nodes`，取得自己的私密输出 URL，再只在三个 Profile File 的参数编辑器里替换 `https://example.invalid/private/egern-nodes`。可视化参数编辑器填写原始 URL；旧版只有单行链接时，把真实 URL 当作一个参数值进行百分号编码。不要编码整条 JS URL，也不要把真实 URL 写入公开脚本、仓库或文档。

远程链接模式必须使用 `JS_URL#arg1=value1&arg2=value2`，不能使用 `?` 连接脚本参数。当前 Sub-Store 后端从 URL 的 `#...` 读取 `$arguments`；即使界面显示了独立 key/value 参数行，也要确认远程链接本身保留相同的 hash 参数，不能只保存无 hash 的 JS URL。创建、预览、导入、可选参数和回滚的完整步骤见[部署指南](docs/deployment.md)。

## 新手部署：按 Sub-Store 界面逐项填写

下面以当前 Sub-Store 中文界面为准。开始前先在 Egern 保留一份能联网的旧 Profile，并备份 Sub-Store；新任务不要覆盖旧任务。真实订阅、节点及 File 输出 URL 只允许留在自己的 Sub-Store 和设备中。

### 1. 确认公共节点来源

1. 打开 Sub-Store 的“订阅”页面，找到“组合订阅”中的 `apple-proxy-egern`。
2. 确认它包含你的全部私密来源，并且预览节点数大于 0。
3. 不要把来源 URL、节点服务器、UUID、密码或预览内容贴到 GitHub、Issue、截图或聊天。

成功标志：组合名逐字等于 `apple-proxy-egern`，预览非空，原有 sing-box 或其他客户端组合没有被改动。

### 2. 创建 `egern-nodes`

1. 进入“文件”→左上角“+”→“文件”。
2. 依次填写：

   | 字段 | 填写内容 |
   | --- | --- |
   | 名称 | `egern-nodes` |
   | 显示名称 | `Egern 节点订阅` |
   | 来源 | `本地` |
   | 本地内容 | 保留默认占位内容即可，最终会由脚本替换 |

3. 打开“操作”，点击“脚本操作”。脚本来源选“远程链接”，填入：

   ```text
   https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js
   ```

4. 展开参数并添加四行：

   | key | value |
   | --- | --- |
   | `output` | `nodes` |
   | `type` | `collection` |
   | `name` | `apple-proxy-egern` |
   | `clientChain` | `off` |

5. 单条脚本右侧的“启用”和“预览”都要勾选。“关闭缓存”和“不验证服务器证书”保持未勾选。标题“文件操作”旁的开关图标只用于全部展开/收起，不是运行总开关。
6. 点击“即时预览”。成功输出必须包含顶层 `proxies:`，且至少有一个节点；如果仍显示“填入文件内容”，先确认单条脚本已启用，再看[排障指南](docs/troubleshooting.md)。
7. 保存，回到文件列表，复制 `egern-nodes` 的私密直链。后文把它记作 `<EGERN_NODES_PRIVATE_URL>`；不要把真实值写入仓库。

### 3. 创建三个 Egern Profile File

依次新建 `egern-macos`、`egern-iphone`、`egern-ipad`。三个任务的“来源”都选“本地”，各添加一条已启用且参与预览的“脚本操作”，远程链接统一填写：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js
```

任务基础字段：

| 名称 | 显示名称 | 用途 |
| --- | --- | --- |
| `egern-macos` | `Egern macOS Profile` | Intel Mac 首轮灰度 |
| `egern-iphone` | `Egern iPhone Profile` | Mac 通过后部署 |
| `egern-ipad` | `Egern iPad Profile` | 最后部署 |

参数按下表逐行添加：

| key | macOS | iPhone | iPad |
| --- | --- | --- | --- |
| `output` | `config` | `config` | `config` |
| `type` | `collection` | `collection` | `collection` |
| `name` | `apple-proxy-egern` | `apple-proxy-egern` | `apple-proxy-egern` |
| `nodeSubscriptionUrl` | `<EGERN_NODES_PRIVATE_URL>` | `<EGERN_NODES_PRIVATE_URL>` | `<EGERN_NODES_PRIVATE_URL>` |
| `platform` | `macos` | `iphone` | `ipad` |
| `channel` | `current` | `current` | `current` |
| `adblockMode` | `off` | `off` | `off` |
| `dnsMode` | `stable` | `stable` | `stable` |
| `chinaDns` | `alidns` | `alidns` | `alidns` |
| `globalDns` | `cloudflare` | `cloudflare` | `cloudflare` |
| `blockMode` | `balanced` | `balanced` | `balanced` |
| `quicMode` | `proxy-block` | `proxy-block` | `proxy-block` |
| `ipv6Mode` | `ipv4-only` | `auto` | `auto` |
| `autoGroupMode` | `auto` | `auto` | `auto` |
| `clientChain` | `off` | `off` | `off` |

`nodeSubscriptionUrl` 直接填第 2 步复制的原始私密 URL。只有旧版“单行脚本 URL”界面才需要百分号编码这个参数值；不能编码整条 JS URL，也不能把参数之间的 `&`、`=` 一起编码。

三个任务都保持“关闭缓存”未勾选、“不验证服务器证书”未勾选。逐个即时预览：输出应以 `ipv6:` 开头，并包含 `dns:`、`policy_groups:`、`rules:` 和 `default_subscription_group:`。Profile 通过私密 URL 挂载 `egern-nodes`，因此顶层不出现 `proxies:` 是正确结构；没有自更新 URL 时也不会输出 `auto_update:`，这是为了避免 Egern 将空对象判定为缺少必填的 `url`。任何一个仍显示占位内容或错误时都不要导入设备。

`adblockMode=off` 是轻量默认，不下载完整广告分类。只有明确改为 `full` 时，才从与 `channel` 一致的独立 optional 发布加载 `Advertising` 与 `Advertising_Domain`。默认路由使用 `DomesticCore`/`DomesticGame`/`SteamCN` 直连、`OverseasGame` 进入 `🌍 海外游戏`、`ChinaIP` 和可解析的 `GEOIP CN` 国内回退，未识别或 DNS 失败流量最终进入 `🚀 节点选择`。

### 4. 导入、灰度与回滚

1. 复制三个 Profile File 各自的私密直链；不要把 `egern-nodes` 节点文件当成完整 Profile 导入。
2. 先在 Intel Mac 的 Egern 新增远程 Profile，粘贴 `egern-macos` 的私密直链，旧 Profile 保留并排可选。
3. 按[灰度清单](docs/canary.md)验证 DNS、规则、自动选择、节点切换和真实联网；通过后才依次导入 iPhone、iPad 对应的 Profile。
4. 任一步失败，立即切回旧 Profile；Sub-Store 中保留失败任务供排查，不改任务名、不改私密直链。修复后从 Intel Mac 重新开始。

升级公开 `/current/` JS 时，四个任务名、参数和私密直链都不用改变；只需重新预览并按 Intel Mac → iPhone → iPad 的顺序更新。正式任务默认关闭 `noCache`；只有排查发布缓存时才临时开启，验收结束后恢复关闭。

## 安全与更新边界

- 私密节点 URL、Profile URL、订阅 URL 只能保存在自己的 Sub-Store 与 Egern 中。不得公开、发布、粘贴或上传私密 URL 到 GitHub、Issue、截图、聊天或日志。
- 本项目不需要 HTTPS 解密或 MITM，CA 证书不要安装；也不得启用 MITM。脚本、重写和抓包不是此配置的运行依赖，不需要开启。
- 节点挂载组的刷新周期是 `21600` 秒，即 6 小时；公开规则的刷新周期是 `86400` 秒，即 24 小时。两者不是同一刷新源。
- 生成配置默认省略 `auto_update`：仓库不知道你的私密 Profile URL，而 Egern 不接受缺少 `url` 的空 `auto_update` 对象。参数变化后，应重新运行或刷新私密 Sub-Store Profile File 任务，再在 Egern 中手动更新对应的远程 Profile。
- Egern 稳定版是默认发布基线。Beta 或 TestFlight 仅供主动选择的用户验证，并继续使用同一份 Profile；除非以后仓库提交明确的 feature flag（功能开关），不要假设测试版专属行为。

所有生成器对校验错误和全部节点不可渲染都采用 fail-closed（失败即停止）；renderer 无法表示的单个节点会跳过并计入 `renderFailures`。不得绕过或削弱 fail-closed 校验，也不得删除或覆盖旧 Profile 来“修复”导入问题。
