# HAPP 六平台上线后可选 Canary

自动化测试、规则预算、manifest 闭合和审计是发布门禁；真机验收不再阻塞 `current`。本表只用于上线后的可选设备反馈，没有设备证据的平台仍可正常发布，`candidate` 仅表示尚未收集反馈。

| 平台 | GeoData 安装 | JSON 导入 | 连接/DNS | 业务路由 | 固定节点故障回退 | 网络切换/休眠 | 回滚 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| iPhone | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| iPad | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Android | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Windows | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Linux | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |

每个平台如需反馈，可记录：应用版本、通道、GeoData hash、Profile hash、DNS 结果、DIRECT/FOLLOW/NODE 路由、IPv4/IPv6、QUIC、网络切换、固定节点失败与恢复，以及 previous 回滚结果。未完成的设备反馈不影响对应客户端晋级 `current`。
