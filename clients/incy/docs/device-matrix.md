# INCY 设备验收矩阵

记录日期：2026-09-02；适配器 schema：2；公开通道：`current`。

自动化测试已覆盖 options、八个平台 inbounds、七类协议、DNS、业务规则、`IPIfNonMatch`、固定节点回退、secret scan 和 manifest。当前开发环境只有 INCY Desktop 3.7.2，且没有可编程的真实 Sub-Store 导入接口；下表将手工真机验收标为待执行，不伪造通过结果。

| 平台 | canonical task | 数组导入/切换 | autorouting/GeoData | 路由、测速、回退 | 更新/离线/回滚 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone | `incy-config-iphone` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| iPad | `incy-config-ipad` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| Apple TV | `incy-config-appletv` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| Android | `incy-config-android` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| Android TV | `incy-config-androidtv` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| macOS | `incy-config-macos` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| Windows | `incy-config-windows` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |
| Linux | `incy-config-linux` | 待真机 | 待真机 | 待真机 | 待真机 | 自动化通过；手工待执行 |

## 手工验收顺序

1. 导入对应私密 URL，记录 App/Core 版本、数组元素数量和 `autorouting` 是否附加。
2. 验证国内域名直连、无域名规则但解析到中国 IP 的目标直连，以及 OpenAI、GitHub、YouTube、海外媒体、社交、游戏、下载和广告规则目标。
3. 验证 `blockMode=balanced` 的 `blackhole`、`quicMode=proxy-block`、`ipv6Mode=ipv4-only`、固定节点 least-ping 和固定节点故障回退。
4. 在已校验的发布流程中验证 edge/current/previous 的 manifest hash、离线刷新和旧数组元素保留。

每个平台补充 App/Core 版本、时间、task ID、元素数量、脱敏日志或截图路径。不要记录订阅 URL、节点地址或凭据。
