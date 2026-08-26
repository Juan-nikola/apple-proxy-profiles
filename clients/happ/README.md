# HAPP：六平台 Xray 配置

HAPP 的节点 JSON、Profile 和策略仍由私密 Sub-Store 任务生成。公开发布只提供无凭据的 GeoData、校验 manifest、静态安装页和无节点脚本。

日常使用只需要一套公开入口：打开稳定且持续晋级最新已验证产物的 [HAPP 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html)，安装 `geosite.dat` 与 `geoip.dat`；再从私密 Sub-Store 导入节点 JSON。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点，HAPP 路由开关锁定是正常行为。公开 HAPP 入口只保留 current；设备侧回滚使用本地保留的旧 JSON/Profile。

HAPP 没有可视化业务组。需要把 AI、GitHub、YouTube 等业务固定到某个节点时，在私密任务中设置同一个 `policyOverrides` Base64URL；`FOLLOW` 跟随 HAPP 首页节点，`DIRECT` 直连，`NODE:<完整节点名>` 固定节点。完整设置步骤见[部署文档中的业务组说明](docs/deployment.md#业务组节点设置)。

完整说明：[部署](docs/deployment.md) · [排障](docs/troubleshooting.md) · [六平台上线后可选反馈](docs/canary.md)。自动化门禁通过即可发布；设备反馈只用于实践观察和排障。
