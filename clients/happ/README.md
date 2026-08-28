# HAPP：三平台 Xray 配置

HAPP 的节点 JSON、Profile 和策略仍由私密 Sub-Store 任务生成。公开发布只提供无凭据的 GeoData、校验 manifest、静态安装页和无节点脚本。

日常使用只需要一套公开入口：打开稳定且持续晋级最新已验证产物的 [HAPP 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html)，安装 `geosite.dat` 与 `geoip.dat`；再从私密 Sub-Store 导入节点 JSON。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点，HAPP 路由开关锁定是正常行为。`edge` 仅供维护者灰度，`previous` 只在回滚时使用。

完整说明：[部署](docs/deployment.md) · [排障](docs/troubleshooting.md) · [三平台 canary](docs/canary.md)。自动化测试通过不等于设备验收完成。
