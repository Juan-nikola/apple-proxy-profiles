# HAPP：六平台 Xray 配置

HAPP 的节点 JSON、Profile 和策略仍由私密 Sub-Store 任务生成。公开发布只提供无凭据的 GeoData、校验 manifest、静态安装页和无节点脚本。

安装顺序固定为：先打开对应通道的 [HAPP 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html)，安装 `geosite.dat` 与 `geoip.dat`；再从私密 Sub-Store 导入节点 JSON。`edge` 只用于灰度，`current` 是稳定通道，`previous` 是回滚依赖。

完整说明：[部署](docs/deployment.md) · [排障](docs/troubleshooting.md) · [六平台 canary](docs/canary.md)。自动化测试通过不等于设备验收完成。
