# Surge 配置生成器

这个目录提供面向官方 Surge 客户端的 Sub-Store 配置脚本，支持 Intel Mac、Apple Silicon Mac、iPhone 和 iPad。脚本只在私密 Sub-Store 内读取节点并生成私有配置；仓库公开的 bundle、示例和文档不包含真实节点。

## Sub-Store 参数

将 `clients/surge/dist/surge-profile-generator.js` 或同目录的 `substore-profile-generator.js` 配置为 Sub-Store 的远程脚本，输出选择 `config`，类型选择 `collection`，平台使用 `macos`、`iphone` 或 `ipad`。`name` 和 `subscriptionName` 填入你的私密节点集合名称。

规则地址固定指向 GitHub Pages 的 `current/surge/rules`。发布流程先在 `edge` 验证，再提升到 `current`。

## 远程地址

- 当前版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js`
- 测试版：`https://juan-nikola.github.io/apple-proxy-profiles/edge/surge/scripts/surge-profile-generator.js`

私密 Sub-Store 节点源不会写入 GitHub；不要把带账号、密码或订阅 token 的 URL 提交到仓库。
