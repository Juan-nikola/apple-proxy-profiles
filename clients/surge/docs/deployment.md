# Surge 部署

1. 在私密 Sub-Store 中添加远程脚本 `surge-profile-generator.js`。
2. 设置 `output=config`、`type=collection`、`platform=macos`、`iphone` 或 `ipad`。
3. 设置 `name` 与 `subscriptionName`，让 `produceArtifact` 只读取你的私密节点集合。
4. 首次使用 `edge` 地址做小范围验证，确认无误后切换到 `current`。

Intel Mac 和 Apple Silicon Mac 共用 `macos` 配置；iPhone 和 iPad 分别使用自己的平台参数。Surge 的节点凭据只出现在 Sub-Store 返回的私有配置中，不进入公开脚本。

当前版脚本：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js`

测试版脚本：`https://juan-nikola.github.io/apple-proxy-profiles/edge/surge/scripts/surge-profile-generator.js`
