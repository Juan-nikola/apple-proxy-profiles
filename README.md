# Apple Proxy Profiles

把你在 Sub-Store 中选择的私密节点，转换成 Apple 设备可以直接导入的配置。仓库仍采用 monorepo：共享策略和协议放在 `shared/`，各客户端 renderer 放在 `clients/*`，自动化发布放在 `automation/`，公开产物只发布到 `public/current/`。

## 新手推荐：先用 Surge

如果你主要使用 iPhone、iPad 和 macOS，建议从 Surge 开始。它使用同一份 Profile、同一个远程节点池和同一条 `current` 更新地址，日常只需要点击更新，不需要手动复制节点。

![Sub-Store 到 Surge 的三步流程](docs/assets/substore-to-surge.svg)

上图中的 URL、节点和数量都是安全示意值。实际使用时，私密节点只存在于你自己的 Sub-Store，不能提交到仓库或公开聊天。

### 5 分钟上手

#### 1. 在 Sub-Store 建立 8 个 collection

创建以下 collection，并从你的来源中手动选择节点：

```text
apple-proxy-all
apple-proxy-egern
apple-proxy-anywhere
apple-proxy-shadowrocket
apple-proxy-surge
apple-proxy-singbox
apple-proxy-v2box
apple-proxy-clash
```

第一次建议只配置 `apple-proxy-surge`。选择节点时保留你确认可用的协议；不要把真实订阅 URL、UUID、密码或私钥写进 GitHub。

![手动选择 collection 的界面示意](docs/assets/substore-collections-guide.svg)

图中绿色勾选框代表你在“手动选择的订阅”列表中实际勾选的来源。8 个 collection 都按这个方式配置；“标签”字段留空，保存后应看到“手动选择的订阅”，而不是“关联订阅标签”。

#### 2. 创建 Surge Profile File task

在 Sub-Store 新建 File，选择远程脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
```

参数填写：

```text
output=config
type=collection
name=apple-proxy-surge
subscriptionName=Apple-Proxy-Nodes
platform=iphone
dnsMode=stable
chinaDns=alidns
globalDns=cloudflare
blockMode=balanced
quicMode=proxy-block
ipv6Mode=auto
autoGroupMode=auto
clientChain=off
channel=current
```

![创建远程 File task 的界面示意](docs/assets/substore-file-task-guide.svg)

新版界面中选择“文件 → 远程”，把完整 generator URL 粘贴到“链接”框，再点击 Preview 和保存。仓库的 27 个 canonical task 已按同样字段组织；参数中的私密节点 URL 只填写在你自己的 Sub-Store，不要回填到 README 或 GitHub。

macOS 将 `platform` 改为 `macos`、`ipv6Mode` 改为 `ipv4-only`；iPad 使用 `platform=ipad`。旧版 Sub-Store 如果只有一个 URL 输入框，把参数放在 `#` 后并用 `&` 分隔，不能写成 `?output=config`。

#### 3. Preview，再导入 Surge

点击 Preview，确认输出包含 `[General]`、`[Proxy]`、`[Proxy Group]` 和 `[Rule]`，并且没有 `renderFailures` 阻断项。然后复制 Sub-Store 生成的私密 Profile URL，在 Surge 中选择从 URL 下载并安装。

导入后应看到：

- `Remote Node Pool`：由同一个远程节点池自动更新；
- 国内域名和解析到中国 IP 的目标直连；
- 未命中前两层的目标进入默认代理；
- 规则和节点凭据没有被发布到公开 Pages。

![统一路由顺序](docs/assets/routing-order.svg)

#### 4. 日常更新

Surge 中保留同一个 Profile URL，按客户端的更新按钮即可。公开规则更新不会改变你的 Sub-Store collection；节点变化只需要更新对应 collection 后再次 Preview。

#### 5. 出错时回滚

先在设备上切回本地旧 Profile，确认网络恢复；再回到同一个 Sub-Store task 修正不兼容节点并重新 Preview。不要临时改用未知脚本，也不要删除旧 Profile。

![更新失败时的回滚流程](docs/assets/rollback-flow.svg)

## 七个 active 客户端

| 推荐顺序 | 客户端 | 适合场景 |
| --- | --- | --- |
| 1 | Surge | iPhone、iPad、macOS，最无感的默认方案 |
| 2 | Shadowrocket | 轻量备用和快速节点订阅 |
| 3 | Egern | Apple 原生规则深度定制 |
| 4 | sing-box | 高级用户和跨平台 |
| 5 | Clash Apple | Mihomo/Clash 生态 |
| 6 | Anywhere | `.arrs` 规则和手动绑定 |
| 7 | V2Box | Xray 兼容路线；使用共享 GeoData |

HAPP、OneXray、v2rayN 已从源码、测试、发布物和注册表移除。V2Box 的 GeoData URL 保持为 `public/current/geodata/<region>/`，不会因为客户端收敛而断链。

## 统一行为

- unified policy 只输出 schema v2；schema v1 仅作为隔离迁移读取器。
- 所有客户端使用同一 routing plan：`ChinaTLD -> ChinaIP -> 默认代理`。
- Surge 使用单远程节点池，避免 Profile 和节点订阅漂移。
- 只发布 `current`，采用原子发布并保留 `previous` 回滚数据。
- 节点严格失败关闭；来源、哈希和规则审计写入 manifest。
- 公开规则与私密节点彻底分离。

## Sub-Store 规模

当前 canonical catalog 为 8 个 collection、27 个 File task：

| 客户端 | 任务数 | 输出 |
| --- | ---: | --- |
| Egern | 4 | 节点 + macOS/iPhone/iPad Profile |
| Anywhere | 2 | 节点 + strategy |
| Shadowrocket | 4 | 节点 + macOS/iPhone/iPad Profile |
| Surge | 4 | 节点资源 + macOS/iPhone/iPad Profile |
| sing-box | 4 | macOS/iPhone/iPad/Android Config |
| V2Box | 3 | 节点 + iPhone/iPad Config |
| Clash Apple | 5 | 节点 + 四个平台 Config |
| Unified policy | 1 | schema v2 私密 policy |

旧后台对象需要手动删除：collection `apple-proxy-happ`、`apple-proxy-onexray`、`apple-proxy-v2rayn`，以及对应的 13 个 `happ-*`、`onexray-*`、`v2rayn-*` File task。本地仓库不会再生成这些入口。

## 维护与验证

```bash
npm test
npm run build
npm run check:actions
npm run check:secrets
npm run verify
```

更多 Sub-Store 参数见 [`docs/substore-two-layer-setup.md`](docs/substore-two-layer-setup.md)，维护流程见 [`docs/maintenance.md`](docs/maintenance.md)。
