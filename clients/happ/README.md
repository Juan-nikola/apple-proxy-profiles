# Happ：六平台 Xray 配置

本目录为 Happ 的 macOS、iPhone、iPad、Android、Windows 与 Linux 官方应用生成 JSON 数组订阅。Happ 负责各平台的系统接入；每个数组项是可独立运行的 Xray 配置。节点和私密输出 URL 只保留在自己的 Sub-Store。

先在公开的 [Happ 助手](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/import.html) 安装路由/geodata Profile，再导入私密 JSON 数组订阅。这是两层导入，顺序不可倒置：**先导入路由/geodata，再导入 JSON**；后者不携带 `geosite.dat` 或 `geoip.dat`。

完整部署、排障和灰度记录见：[部署](docs/deployment.md) · [排障](docs/troubleshooting.md) · [六平台 canary](docs/canary.md)。
