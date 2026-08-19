# OneXray 六平台 Canary

自动化测试不等于真机验收。未提供设备证据时，平台状态必须保持 `candidate`；不能因为构建成功就标记 `validated`。

| 平台 | GeoData | Profile 导入 | Rule 模式 | DNS/路由 | IPv4/IPv6/QUIC | 固定节点故障 | previous 回滚 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| iPhone | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| iPad | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Android | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Windows | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |
| Linux | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | 待执行 | candidate |

每个平台记录应用版本、Profile/GeoData hash、主节点切换、DIRECT/FOLLOW/NODE、DNS、网络切换、固定节点失败与恢复，以及 previous 回滚结果。完成后才可单独晋级对应平台，未完成的平台不阻塞其他平台的候选记录，但不能被宣称已验证。
