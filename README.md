# Apple Proxy Profiles

把你在 Sub-Store 中选择的私密节点，转换成 Apple 设备可以直接导入的配置。仓库仍采用 monorepo：共享策略和协议放在 `shared/`，各客户端 renderer 放在 `clients/*`，自动化发布放在 `automation/`，公开产物只发布到 `public/current/`。

## 新手推荐：先用 Surge

如果你主要使用 iPhone、iPad 和 macOS，建议从 Surge 开始。它使用同一份 Profile、同一个远程节点池和同一条 `current` 更新地址，日常只需要点击更新，不需要手动复制节点。

![Sub-Store 到 Surge 的三步流程](docs/assets/substore-to-surge.svg)

上图中的 URL、节点和数量都是安全示意值。实际使用时，私密节点只存在于你自己的 Sub-Store，不能提交到仓库或公开聊天。

### 5 分钟上手

#### 1. 在 Sub-Store 建立 9 个手动 collection

创建以下 collection，并从你的来源中手动选择节点：

```text
apple-proxy-all
apple-proxy-egern
apple-proxy-anywhere
apple-proxy-shadowrocket
apple-proxy-surge
apple-proxy-singbox
apple-proxy-happ
apple-proxy-v2box
apple-proxy-clash
```

第一次建议只配置 `apple-proxy-surge`。选择节点时保留你确认可用的协议；不要把真实订阅 URL、UUID、密码或私钥写进 GitHub。

![手动选择 collection 的界面示意](docs/assets/substore-collections-guide.svg)

图中绿色勾选框代表你在“手动选择的订阅”列表中实际勾选的来源。所有 collection 都按这个方式配置；“标签”字段留空，保存后应看到“手动选择的订阅”，而不是“关联订阅标签”。另外建立一个私密 File task 输出 `apple-proxy-policy` JSON，这个任务不放节点。

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

新版界面中创建一个文件后，在“文件操作”里添加“脚本操作/Script Operator”，将 generator URL 填入脚本操作的“远程链接”；文件本身保持空内容，不要把 generator URL 填到“文件 → 远程”的源文件链接，否则 Preview 只会显示 JavaScript 源码。然后点击 Preview 和保存。仓库的 30 个 canonical task 已按同样字段组织；参数中的私密节点 URL 只填写在你自己的 Sub-Store，不要回填到 README 或 GitHub。

macOS 将 `platform` 改为 `macos`、`ipv6Mode` 改为 `ipv4-only`；iPad 使用 `platform=ipad`。旧版 Sub-Store 如果只有一个 URL 输入框，把参数放在 `#` 后并用 `&` 分隔，不能写成 `?output=config`。

#### 3. Preview，再导入 Surge

点击 Preview，确认输出包含 `[General]`、`[Proxy]`、`[Proxy Group]` 和 `[Rule]`，并且没有 `renderFailures` 阻断项。然后复制 Sub-Store 生成的私密 Profile URL，在 Surge 中选择从 URL 下载并安装。

导入后应看到：

- `Remote Node Pool`：由同一个远程节点池自动更新；
- 国内域名和解析到中国 IP 的目标直连；
- 未命中前两层的目标进入默认代理；
- 规则和节点凭据没有被发布到公开 Pages。

#### 4. 设置统一业务节点（可选）

在 `apple-proxy-policy` 的私密 JSON 文件中只写节点大致名称，不写凭据：

```json
{
  "ai": "NODE~美国 家宽|vless",
  "github": "NODE~东京",
  "youtube": "FOLLOW",
  "apple": "DIRECT",
  "final": "FOLLOW"
}
```

`NODE~` 必须唯一命中；零个或多个候选都会拒绝生成，不会自动猜节点。节点显示名中的地区旗帜、协议（例如 `· VLESS`）和 UDP 能力（例如 `·U`）由生成器自动追加，策略匹配的是原始节点名。节点原始名称相同但协议不同的时候，在查询词后加 `|协议`，例如 `NODE~qqpw家宽|vless`；协议限定大小写不敏感，但必须是项目支持的协议。Surge、sing-box、Egern、Shadowrocket、Clash、Anywhere 会把结果放在业务组默认位置，仍允许你在客户端内切换；HAPP 和 V2Box 会把结果写入生成后的 Xray 路由，修改后需要重新 Preview。

#### 5. HAPP 导入顺序（避免“无法解析配置”）

HAPP 必须通过真实订阅 URL 获取 JSON 数组和响应头。不要点击 Sub-Store 的 Preview 下载 JSON，再走“文件导入节点”；本地文件没有 `routing` 响应头，部分 HAPP 版本也不接受数组文件。

![HAPP 导入与固定业务出口](docs/assets/happ-import-guide.svg)

正确顺序：

1. 打开 `current/happ/index.html`，扫码或点击链接安装 GeoData。
2. 在 Sub-Store 复制对应平台的私密 **File URL**。
3. 在 HAPP 的“添加订阅/URL”中粘贴 URL，等待 `routing` Profile 和 GeoData 完成。
4. 重新连接。JSON 订阅设置里的路由开关显示锁定是正常的，路由由 JSON 和订阅响应头共同控制。

生成器会同时发送 `routing: happ://routing/onadd/...` 和 `routing-enable: 1`：前者绑定并自动激活 Profile，后者明确保持路由开启。macOS 任务还发送 HAPP 官方 `proxy-enable: 1`，导入/更新时自动打开桌面 Proxy 模式；iPhone/iPad 使用 Network Extension。若使用本地文件，只能作为离线兜底，不能保证自动绑定或自动启用。

HAPP 对 JSON 订阅会把路由显示为“开”并锁定，点击时提示“无法手动启用/禁用路由”属于正常限制。请以日志中的 `happ-direct`、`happ-follow/<节点展示名>` 和 `happ-fixed/<节点展示名> [candidate]` 判断路由结果；`proxy-block` 会让应用 UDP/443（QUIC）直连回落，避免送入仅支持 TCP 的 Reality。

HAPP 日志默认级别为 `info`。入口会嗅探 `http`、`tls`、`quic` 并以 `routeOnly:false` 写回目标，因此嗅探成功时可看到 `chat.openai.com` 等域名；纯 IP、未加密 TCP、ECH 或嗅探失败时显示 IP 属于正常边界。出站会显示脱敏节点名，例如 `happ-follow/小秘书GEN2 · VLESS · U`，重复名称才追加短 ID。macOS 需将系统 HTTP/HTTPS 代理设为 `127.0.0.1:10809` 或 SOCKS `127.0.0.1:10808`，可用 `scutil --proxy` 检查；其他代理软件抢占系统代理时，应用不走 HAPP 不属于路由规则故障。

#### 6. 日常更新与回滚

HAPP 首先打开 `current/happ/index.html` 扫码或点击链接安装 GeoData，再通过 HAPP 的“添加订阅/URL”导入对应平台的私密 File URL。macOS 导入最新任务后会自动启用桌面 Proxy；旧任务需删除后重新导入。固定节点故障时仅 balancer 在运行时回退到 FOLLOW；若 policy 解析失败，生成器直接失败并保留上一份可用配置。

![统一路由顺序](docs/assets/routing-order.svg)

#### 7. 日常更新

Surge 中保留同一个 Profile URL，按客户端的更新按钮即可。公开规则更新不会改变你的 Sub-Store collection；节点变化只需要更新对应 collection 后再次 Preview。

#### 8. 出错时回滚

先在设备上切回本地旧 Profile，确认网络恢复；再回到同一个 Sub-Store task 修正不兼容节点并重新 Preview。不要临时改用未知脚本，也不要删除旧 Profile。

![更新失败时的回滚流程](docs/assets/rollback-flow.svg)

## 八个 active 客户端

| 推荐顺序 | 客户端 | 适合场景 |
| --- | --- | --- |
| 1 | Surge | iPhone、iPad、macOS，最无感的默认方案 |
| 2 | Shadowrocket | 轻量备用和快速节点订阅 |
| 3 | Egern | Apple 原生规则深度定制 |
| 4 | sing-box | 高级用户和跨平台 |
| 5 | Clash Apple | Mihomo/Clash 生态 |
| 6 | Anywhere | `.arrs` 规则和手动绑定 |
| 7 | HAPP | macOS、iPhone、iPad，Xray JSON 固定业务出口 |
| 8 | V2Box | Xray 兼容路线；使用共享 GeoData |

OneXray、v2rayN 保持移除。HAPP 的稳定 GeoData URL 为 `public/current/happ/geoip.dat` 和 `public/current/happ/geosite.dat`；V2Box 的 GeoData URL 继续保持 `public/current/geodata/<region>/`。

## 统一行为

- unified policy 只输出 schema v2；schema v1 仅作为隔离迁移读取器。
- 所有客户端使用同一 routing plan：`ChinaTLD -> ChinaIP -> 默认代理`。
- Surge 使用单远程节点池，避免 Profile 和节点订阅漂移。
- 只发布 `current`，采用原子发布并保留 `previous` 回滚数据。
- 节点严格失败关闭；来源、哈希和规则审计写入 manifest。
- 公开规则与私密节点彻底分离。

## Sub-Store 规模

当前 canonical catalog 为 9 个手动 collection、30 个 File task：

| 客户端 | 任务数 | 输出 |
| --- | ---: | --- |
| Egern | 4 | 节点 + macOS/iPhone/iPad Profile |
| Anywhere | 2 | 节点 + strategy |
| Shadowrocket | 4 | 节点 + macOS/iPhone/iPad Profile |
| Surge | 4 | 节点资源 + macOS/iPhone/iPad Profile |
| sing-box | 4 | macOS/iPhone/iPad/Android Config |
| HAPP | 3 | macOS/iPhone/iPad JSON Config |
| V2Box | 3 | 节点 + iPhone/iPad Config |
| Clash Apple | 5 | 节点 + 四个平台 Config |
| Unified policy | 1 | schema v2 私密 policy |

后台只保留上述 9 个手动 collection 和 30 个 canonical task；删除旧的 OneXray/v2rayN 对象及其任务。不要在 Sub-Store 使用 `subscriptionTags` 自动识别，所有节点来源通过 collection 手动勾选。

## 维护与验证

```bash
npm test
npm run build
npm run check:actions
npm run check:secrets
npm run verify
```

更多 Sub-Store 参数见 [`docs/substore-two-layer-setup.md`](docs/substore-two-layer-setup.md)，维护流程见 [`docs/maintenance.md`](docs/maintenance.md)。
