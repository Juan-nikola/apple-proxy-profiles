# Surge 灰度顺序

建议按以下顺序做 canary：

1. 先在测试 Sub-Store 集合使用 `edge`。
2. 先验证 Intel Mac，再验证 Apple Silicon Mac。
3. 再验证一台 iPhone 和一台 iPad。
4. 检查国内 App、国际站点、DNS、UDP、切换节点和断网恢复。
5. 观察一个完整更新周期后，再把同一参数切换到 `current`。

只要出现配置解析失败、国内 App 变慢或规则下载失败，就回退到上一版 `current`，并保留失败时间、平台和生成参数用于排查。
