# OneXray 部署

OneXray 的 Profile 内含节点、固定目标和策略，因此必须在自己的 Sub-Store 中生成，不能通过公开 URL 分发。公开仓库只提供 GeoData 数据与安装页。

## 1. 使用 edge Pages 脚本

OneXray 的两个 Sub-Store bundle 已随 edge 发布到 GitHub Pages，文件名是 `onexray-nodes-generator.js` 和 `onexray-profile-generator.js`：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js
```

OneXray 脚本只发布在 edge；current 与 previous 不发布脚本，避免未验证版本被当成稳定入口。公开仓库中的真实 Sub-Store 输出 URL 一律不提交，示例继续使用 `example.invalid`。

## 2. 安装顺序

### 2.1 预发布 canary（edge）

1. 打开 `https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/index.html`。
2. 先安装 edge 的 `geosite`（domain）和 `geoip`（ip）两个 GeoData 数据。
3. 创建 `onexray-nodes` 任务并生成节点订阅，再创建 `onexray-profile` 任务并生成 edge Profile。
4. 在 OneXray 中导入 edge Profile，选择“Rule 模式”，选一个主节点，重启 VPN，再执行 `docs/canary.md` 的 edge 清单。

edge 仅用于灰度 canary；未晋级时不能直接当作 current 使用。

### 2.2 生产安装（current，仅限 promotion 之后）

1. 打开 `https://juan-nikola.github.io/apple-proxy-profiles/current/onexray/index.html`，先安装 current 的 `geosite` 和 `geoip`。
2. 再打开 previous 安装页，安装 previous 的 `geosite` 和 `geoip`，作为回滚依赖。previous 只是回滚配套资源，不自动保留；保留 previous Profile 也不会自动保留其 GeoData。
3. 创建 `onexray-nodes`、`onexray-profile` 任务，生成 current Profile。
4. 在 OneXray 中选择“Rule 模式”，选一个主节点，重启 VPN，再执行生产清单。

current 与 previous 必须同名配对：使用 previous Profile 时，必须同时使用 previous GeoData；使用 current Profile 时，必须同时使用 current GeoData。

## 3. 私有任务参数

所有示例只使用合成名称。`name` 必须指向你自己的原始组合（例如 `apple-proxy-sources`）；脚本地址直接使用上面的 edge Pages URL。

### 3.1 `onexray-nodes`

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js#output=nodes&type=collection&name=apple-proxy-sources&channel=edge&clientChain=off
```

预览成功标志：输出包含 OneXray 可导入的节点列表，节点数量大于 0。

节点列表只保留 OneXray 支持的协议（VLESS、VMess、SS、Trojan、Socks、HTTP、Hysteria2）；Snell 等 Xray 内核不支持的协议会被自动排除，因此这里的节点数量可能小于其他客户端。

### 3.2 `onexray-profile`

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js#output=profile&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyOverrides=
```

每次生成的 Profile 名称都会插入 8 位 Profile 版本号（内容哈希），例如：

```text
Apple Proxy · OneXray · edge · 3f2a91c4
```

版本号变化代表 Profile 内容变化；同一个 channel 的 Profile 版本号应保持稳定，除非节点、策略或规则真的变了。

### 3.3 `onexray-routing-audit`

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js#output=audit&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyOverrides=
```

审计输出是脱敏报告，不包含节点凭据、Policy 原文或 Profile deep link。

### 3.4 复制即用的完整任务链接

以下三条是跳过验证、直接使用 edge 的完整引用。`name=apple-proxy-sources` 必须改成你自己 Sub-Store 中的真实组合名：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js#output=nodes&type=collection&name=apple-proxy-sources&channel=edge&clientChain=off
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js#output=profile&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyOverrides=
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js#output=audit&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyOverrides=
```

## 4. 固定业务节点

固定业务通过 `policyOverrides` 指定为 `NODE:<精确节点名>`。固定节点写死在生成时的 Profile 快照里：

- 更换固定节点的凭据后，必须重新生成并重新导入 Profile。
- 仅刷新节点订阅不会更新固定业务使用的节点。
- 一个固定节点只允许匹配一个节点；重复或歧义会在生成阶段失败。

主节点可以在 App 内随时切换，主节点切换只影响 FOLLOW 与最终兜底路径，不影响 DIRECT、BLOCK 和固定节点路径。

## 5. 参数边界

- Profile deep link 上限为 32 KiB。
- `policyOverrides` 是 Base64URL 编码，不是加密；编码后的值仍属于私密输入。
- `channel` 必须与你要安装的 GeoData 通道一致，否则 Profile 与数据不配对。
