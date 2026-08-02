# Egern 配置生成器

这里提供与项目规则体系一致的 Egern 配置生成器。它把已有 Sub-Store 节点集合转换为一份私密节点文件，再按 macOS、iPhone、iPad 分别生成 Egern Profile；节点不会写进仓库或公开示例。

## 从这里开始

1. 按[部署指南](docs/deployment.md)依次创建四个私密 Sub-Store File 任务并导入 Profile。
2. 按[灰度与回滚指南](docs/canary.md)严格以 Intel Mac、iPhone、iPad 的顺序逐台验证。
3. 遇到失败时按[排障指南](docs/troubleshooting.md)定位；第一原则是保留旧 Profile 并安全回滚。

可执行产物是[节点生成器](dist/substore-node-generator.js)和[配置生成器](dist/substore-profile-generator.js)。仓库中的 [macOS 结构示例](examples/egern-macos.yaml)、[iPhone 结构示例](examples/egern-iphone.yaml)及 [iPad 结构示例](examples/egern-ipad.yaml)只用于检查结构，使用 `example.invalid` 保留域名，不能直接联网或实际使用。实际使用必须来自你自己的私密 Sub-Store File 输出。

## 安全与更新边界

- 私密节点 URL、Profile URL、订阅 URL 只能保存在自己的 Sub-Store 与 Egern 中。不得公开、发布、粘贴或上传私密 URL 到 GitHub、Issue、截图、聊天或日志。
- 本项目不需要 HTTPS 解密或 MITM，CA 证书不要安装；也不得启用 MITM。脚本、重写和抓包不是此配置的运行依赖，不需要开启。
- 节点挂载组的刷新周期是 `21600` 秒，即 6 小时；公开规则的刷新周期是 `86400` 秒，即 24 小时。两者不是同一刷新源。
- 生成配置中的 `auto_update` 保持空的 `{}` 是有意设计：仓库不知道你的私密 Profile URL。参数变化后，应重新运行或刷新私密 Sub-Store Profile File 任务，再在 Egern 中更新。
- Egern 稳定版是默认发布基线。Beta 或 TestFlight 仅供主动选择的用户验证，并继续使用同一份 Profile；除非以后仓库提交明确的 feature flag（功能开关），不要假设测试版专属行为。

所有生成器都采用 fail-closed（失败即停止）校验。不得绕过或削弱 fail-closed 校验，也不得删除或覆盖旧 Profile 来“修复”导入问题。
