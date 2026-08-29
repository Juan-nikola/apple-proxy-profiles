# HAPP：三平台 Xray 配置

HAPP 的节点 JSON、Profile 和策略仍由私密 Sub-Store 任务生成。公开发布只提供无凭据的 GeoData、校验 manifest、静态安装页和无节点脚本。

日常使用只需要一套公开入口：打开稳定且持续晋级最新已验证产物的 [HAPP 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html)，安装 `geosite.dat` 与 `geoip.dat`；再从私密 Sub-Store 导入节点 JSON。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点，HAPP 路由开关锁定是正常行为。`edge` 仅供维护者灰度，`previous` 只在回滚时使用。

完整说明：[部署](docs/deployment.md) · [排障](docs/troubleshooting.md) · [三平台 canary](docs/canary.md)。自动化测试通过不等于设备验收完成。

## 可读日志

当前 HAPP 三个平台默认使用 `info` 日志，并在 HTTP、TLS、QUIC 嗅探成功时把目标域名写入访问记录。出站标签使用脱敏后的节点展示名，例如 `happ-follow/小秘书GEN2 · VLESS · U`；固定业务出口会显示为 `happ-fixed/<节点展示名> [candidate]` 或 `[balancer]`。标签不会包含服务器、端口、UUID、密码、Reality key 或订阅 URL。

纯 IP、未加密 TCP、ECH 隐藏域名或嗅探失败的请求仍可能只显示 IP，这是协议边界，不代表路由规则失效。macOS 还需要系统代理指向 HAPP 端口：HTTP/HTTPS `127.0.0.1:10809`、SOCKS `127.0.0.1:10808`；可运行 `scutil --proxy` 检查，避免 Surge、Shadowrocket 或其他 VPN 同时接管系统代理。
