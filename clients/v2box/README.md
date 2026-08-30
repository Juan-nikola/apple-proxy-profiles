# V2Box client renderer

Generates importable Xray-compatible node subscriptions and iPhone/iPad profiles from the user-owned `apple-proxy-v2box` Sub-Store collection. Public artifacts contain no node credentials or subscription URLs; fixture values are synthetic only.

Use the [Sub-Store client pool guide](../../docs/substore-client-pools.md) for the collection boundary and migration order. The node task accepts the full manually selected collection; configuration tasks use `platform=iphone|ipad`, default to `region=cn`, and reference the shared public GeoData assets.

完整配置任务读取私密 `apple-proxy-policy`。V2Box 没有同一配置内的策略组，因此 `final=FOLLOW`、`DIRECT` 或 `NODE~查询词` 会在生成阶段分别绑定 `proxy`、`direct` 或唯一固定节点出口；固定节点不存在或不兼容时任务失败。节点任务只负责输出节点，不读取 policy。
