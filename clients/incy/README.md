# INCY 配置生成器

INCY 适配器把 Sub-Store collection 转成完整的 Xray JSON 数组。它沿用现有客户端的严格参数解析和 fail-closed 约定，但输出面向 INCY 导入的本地配置与平台元数据。

`incy://crypt1` 只是一个可选的 URL 混淆辅助，不是加密，也不应当用来保护订阅凭据或敏感信息。

当前这一步只完成 workspace、参数和平台基础。后续任务会补齐节点渲染、路由、订阅数组和 Sub-Store operator。

公开入口和导入说明会在后续任务补充到 `dist/` 和 `examples/`。
