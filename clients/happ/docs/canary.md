# HAPP 六平台 Canary

自动化测试只能证明构建和发布闭包正确，不能替代真机验收。没有设备证据的平台必须保持 `candidate`，不得填写 `validated`。

| 平台 | GeoData 安装 | JSON 导入 | 连接/DNS | 业务路由 | 固定节点故障回退 | 网络切换/休眠 | 回滚 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| iPhone | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| iPad | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Android | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Windows | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Linux | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |

每个平台至少记录：应用版本、通道、GeoData hash、Profile hash、DNS 结果、DIRECT/FOLLOW/NODE 路由、IPv4/IPv6、QUIC、网络切换、固定节点失败与恢复、以及 previous 回滚结果。全部平台完成后才允许把对应候选晋级 current。
