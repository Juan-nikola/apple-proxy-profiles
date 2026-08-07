# OpenWrt 透明网关

OpenWrt 使用 `platform=openwrt` 的专用 File。它不是手机配置的放大版，而是为软路由生成 TUN、DNS hijack、`auto_redirect`、路由排除和 LAN 网段保护；不要把 OpenWrt 字段复制到 Android、iPhone 或 iPad。

## 部署步骤

1. 先创建并预览私密组合 `apple-proxy-sources`，确认 `snell`、`vlesshy2` 来源非空。
2. 创建 `sing-box-openwrt`，引用官方 Pages Config Generator，参数使用 `platform=openwrt`、`ipv6Mode=auto`、`channel=current`。
3. 把输出 JSON 保存到测试 VLAN 的 sing-box 配置位置；不要直接覆盖生产配置。
4. 先验证网关自身，再让一台测试 LAN 客户端接入；通过后逐步扩大范围。

## 必测项目

- 网关自身 DNS、DNS 劫持和规则集下载；
- LAN 客户端访问国内 App、国际站点、IPv4/IPv6、UDP；
- 局域网互访、打印机/NAS、旁路由与路由器管理地址；
- 节点切换、测速、规则更新、服务重启和断电恢复；
- 失败时恢复上一份 JSON，或将 Sub-Store Arguments 的 `channel` 改回 `current`。

`.srs` 规则集由官方 sing-box core 编译。开发机上准备与目标配置兼容的官方二进制后，在仓库根目录运行：

```bash
SING_BOX_CORE=/absolute/path/to/sing-box npm --workspace clients/sing-box run compile:rules
```

发布构建先把审计 JSON 放在 `clients/sing-box/build/rule-artifacts`：默认规则使用 `audit/sing-box/rules/<id>.json`，可选广告包使用 `optional/adblock-full/audit/sing-box/rules/<id>.json`。编译结果默认写入 `clients/sing-box/build/compiled-rule-artifacts`。自定义构建器可用 `SING_BOX_ARTIFACT_ROOT` 和 `SING_BOX_RULE_OUTPUT_ROOT` 覆盖这两个路径，但不是本地命令的必填参数。

命令会检查所有必需输入、源 JSON 版本一致性、官方 `SRS 02` 头和最小有效长度；任何输入缺失都会显示具体文件名并中止，不会用空文件覆盖已有规则。`SING_BOX_CORE` 必须指向官方 sing-box 可执行文件；不要把编译中间产物提交到仓库。完成后再运行 `check:config` 和 secret 扫描。
