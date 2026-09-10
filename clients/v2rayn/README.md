# v2rayN：节点订阅与 Xray 业务分流

这里为 v2rayN 生成两类可导入内容：节点订阅和 Xray 原生路由。节点来自私有 Sub-Store 集合 `apple-proxy-v2rayn`，各业务的去向由私有文件 `apple-proxy-policy` 决定。

## Sub-Store 中的三个对象

| 对象 | 用途 | 在哪里使用 |
| --- | --- | --- |
| `apple-proxy-policy` | 保存每个客户端、每个业务的目标策略 | 在 Sub-Store 中编辑 |
| `v2rayn-nodes` | 输出 v2rayN 可识别的节点订阅 | 添加到 v2rayN 的订阅分组 |
| `v2rayn-xray-routing` | 输出 v2rayN 可导入的 Xray 路由规则 | 在 v2rayN 的路由设置中从 URL 导入 |

旧的 `v2rayn-rule-03`、`v2rayn-rule-04` 属于生成过程留下的空文件，不参与节点或路由生成，可以删除。

## 首次导入

节点订阅 URL 的格式是：

```text
https://<你的 Sub-Store 地址和访问路径>/api/file/v2rayn-nodes
```

在 v2rayN 中新建订阅分组，填入这个 URL，然后更新订阅。选中一个普通节点作为当前活动服务器。

路由 URL 的格式是：

```text
https://<你的 Sub-Store 地址和访问路径>/api/file/v2rayn-xray-routing
```

在 v2rayN 中打开“设置 → 路由设置”，新建一组路由并完成以下设置：

1. 路由名称可填写 `Apple Proxy Xray`。
2. 域名解析策略选择 `IPIfNonMatch`。
3. 打开规则编辑，选择“从 URL 导入规则”，填入路由 URL。
4. v2rayN 询问追加还是替换时，选择“否”或“替换”。不要追加，否则多次导入会积累重复规则。
5. 保存并将这组路由设为当前路由。

普通节点使用 Xray 内核。不要同时启用会覆盖原生路由的旧自定义完整配置。

## 设置业务走向

编辑 Sub-Store 的 `apple-proxy-policy` 文件，只修改 `clients.v2rayn.targets` 中对应业务的值。例如：

```json
{
  "clients": {
    "v2rayn": {
      "schemaVersion": 2,
      "targets": {
        "🤖 AI 专用": "NODE~美国 家宽|vless",
        "🐙 GitHub": "FOLLOW",
        "📺 YouTube": "FOLLOW",
        "🎬 海外流媒体": "FOLLOW",
        "💬 海外社交": "FOLLOW",
        "🍎 Apple": "DIRECT",
        "🪟 Microsoft": "DIRECT",
        "🇨🇳 国内平台": "DIRECT",
        "🌍 海外游戏": "FOLLOW",
        "🎮 游戏连接": "DIRECT",
        "⬇️ 下载/P2P": "DIRECT",
        "🧭 DNS 与规则下载": "FOLLOW",
        "漏网之鱼": "FOLLOW"
      }
    }
  }
}
```

可用值：

| 写法 | 行为 |
| --- | --- |
| `FOLLOW` | 跟随 v2rayN 主界面当前选择的默认节点 |
| `DIRECT` | 直连 |
| `REJECT` | 拒绝连接 |
| `NODE:<完整节点名>` | 固定到名称完全相同的节点 |
| `NODE~<关键词>` | 按节点名模糊匹配 |
| `NODE~<关键词>\|vless` | 模糊匹配，并限制协议；同名节点推荐使用这种写法 |

固定节点必须在 `apple-proxy-v2rayn` 集合中。模糊匹配必须得到唯一结果；没有匹配或匹配到多个节点时，生成器会报错，避免静默走错节点。

## 修改策略后的更新方式

Sub-Store 会在访问 `v2rayn-xray-routing` 时按最新 policy 重新生成路由，但 v2rayN 不会自动刷新已保存的路由规则。因此每次修改 `apple-proxy-policy` 后，需要再次进入路由编辑：

1. 选择“从 URL 导入规则”。
2. 使用原来的 `v2rayn-xray-routing` URL。
3. 选择替换。
4. 保存并重新启动服务。

只更新 `v2rayn-nodes` 节点订阅，不会更新业务分流。

`FOLLOW` 业务不需要重新导入路由来切换节点。直接在 v2rayN 主界面切换当前活动服务器，YouTube、GitHub 等设置为 `FOLLOW` 的业务会立即跟随新节点；固定为 `NODE~...` 的业务仍走指定节点。

## 当前策略的实际含义

当前 v2rayN 策略中，AI 固定到指定的美国 VLESS 节点；YouTube、GitHub、海外流媒体、海外社交和海外游戏使用 `FOLLOW`；Apple、Microsoft、国内平台、游戏连接和下载/P2P 使用 `DIRECT`；最后未命中的流量使用 `FOLLOW`。

## YouTube 慢时怎么判断

先查看 v2rayN 日志。以下形式表示 YouTube 已按规则走默认节点：

```text
www.youtube.com:443 [socks -> proxy]
googlevideo.com:443 [socks -> proxy]
```

如果规则是 `FOLLOW`，YouTube 的速度主要取决于当前活动节点到 Google 视频 CDN 的线路和持续吞吐，节点延迟低不代表视频吞吐一定高。先在 v2rayN 主界面换一个节点重试；这一步不需要修改 policy 或重新导入路由。

当前生成器默认使用 `quicMode=proxy-block`，会阻止代理业务的 UDP/443，让 YouTube 回退到 TCP。这样兼容性更稳定，但部分线路的视频速度可能降低。只有确认所用节点和网络能稳定转发 UDP 后，才适合把路由任务参数改为 `quicMode=allow`，再重新替换导入路由。

如果希望 YouTube 永远使用某个节点，可把 `📺 YouTube` 改为类似：

```json
"📺 YouTube": "NODE~日本 高速|vless"
```

保存 policy 后，重新从路由 URL 替换导入。

## 排障

如果导入后 Xray 无法启动，先查看启动日志中的第一条 `failed to build routing configuration` 错误。当前生成器会把 Surge/Clash 规则中的 `,no-resolve` 转换为 Xray 支持的 CIDR 格式；正常启动时可以看到 `Configuration OK` 或 Xray 成功开始监听。

若网络完全中断，可以先关闭系统代理或切回可用的备用路由，再检查是否选择了可连接的默认节点。固定节点被重命名或从集合删除后，应同步修改 policy 并重新导入路由。

## 开发与验证

公开仓库只保存生成器和合成测试数据，不保存真实节点、订阅 URL 或 Sub-Store 访问路径。

```bash
npm --workspace @apple-proxy-profiles/v2rayn test
npm --workspace @apple-proxy-profiles/v2rayn run build
npm --workspace @apple-proxy-profiles/v2rayn run verify
```
