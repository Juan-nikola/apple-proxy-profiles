# INCY troubleshooting

## 导入失败

先检查：

- 公开链接是否仍然是 `current/incy/...`
- 设备是否拿到了最新的 `routing.json`
- 旧缓存里是否还保留了旧的 GeoData 文件

如果 `routing.json` 和 `geoip.dat` / `geosite.dat` 的内容不一致，先重新下载三者，再重新导入。

## 路由异常

如果流量没有按预期进入 `Direct`、`Proxy` 或 `Block`，先确认：

- `DomainStrategy` 仍然是 `IPIfNonMatch`
- `useChunkFiles` 仍然开启
- `routing.json` 只引用公开的 `current/incy` 资源

如果问题只在个别平台上出现，优先对照对应的 `clients/incy/examples/incy-config-*.json`，确认本地 inbounds 和平台参数没有被手工改坏。

## 文件哈希不匹配

如果 `geoip.dat.sha256` 或 `geosite.dat.sha256` 和实际文件不一致，重新运行发布构建，再刷新 `current` 目录。

## 仍然失败

保留当前 `current` 目录，不要手工删除公有文件。先对照 `client-manifest.json` 和 `routing.json` 里的路径，确认问题是缓存、旧链接，还是发布产物缺失。
