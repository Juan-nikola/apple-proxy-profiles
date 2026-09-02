# INCY deployment

INCY 公开发布只包含三类内容：

- `clients/incy/dist/` 编译出来的两个脚本
- `public/current/incy/routing.json`
- `public/current/incy/geoip.dat`、`public/current/incy/geosite.dat` 及其 `.sha256` sidecar

公开树不包含私密节点、私密 policy 或任何业务节点选择信息。

## 推荐导入顺序

1. 先确认当前发布频道是 `current`。
2. 在 Sub-Store 或导入器里加载 `incy/scripts/incy-config-generator.js`，生成本地配置。
3. 如果设备需要自动路由，使用公开导入链接指向 `public/current/incy/routing.json`。
4. 需要检查缓存时，先比对 `geoip.dat` 和 `geosite.dat` 的 SHA-256 sidecar，再刷新本地配置。

## 公共链接

- `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/scripts/incy-config-generator.js`
- `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/scripts/substore-config-generator.js`
- `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/routing.json`
- `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/geoip.dat`
- `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/geosite.dat`

## 发布后检查

- `routing.json` 只应指向公开 `current/incy` 资源。
- `useChunkFiles` 必须保持开启。
- `DomainStrategy` 必须是 `IPIfNonMatch`。
- `client-manifest.json` 应该包含当前 tree 的所有公开文件记录。
