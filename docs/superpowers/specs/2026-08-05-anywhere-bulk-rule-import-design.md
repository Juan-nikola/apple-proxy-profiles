# Anywhere 一键导入全部规则设计

## 目标

在现有 GitHub Pages 的 Anywhere 规则导入页增加一个“全部导入”链接。用户点击一次后，Anywhere 打开原生导入确认页，并同时加载当前快照的全部 34 个 `.arrs` 分片；现有按 URL 长度拆分的 3 个批次继续保留，作为兼容性备用入口。

本功能只修改本仓库的导入页生成器、生成产物和文档，不修改 Anywhere App 源码、Sub-Store 任务或规则文件内容。

## 约束与依据

用户提供的 Anywhere 源码提交为 `e15518fde1f5d2652dfc1c234c89a68b87cecec0`。其中：

- `DeepLinkManager.handleAddRuleSet` 会读取 `anywhere://add-rule-set` URL 中全部名为 `link` 的查询参数；
- 每个链接会在 `ImportRuleSetsView` 中独立解析和导入，因此总深链不会把不同规则集揉成一个动作；
- 订阅规则集 URL 仍要求单个 HTTP(S) `.arrs` 文件，单个自定义规则集最多 100,000 条规则；
- 现有快照共有 375,375 条输出规则、34 个分片，且不同分片需要分别保持 `DIRECT`、`REJECT`、`Default` 和本地节点/链绑定。

因此不生成一个聚合 `.arrs` 订阅文件，也不提供 manifest 伪装成 `.arrs`。总链接使用原生多 `link` 深链，导入后仍是多个可单独更新和绑定的规则集。

## 方案

### 生成器

在 `clients/anywhere/src/build-import-page.js` 内复用现有 URL 校验和深链编码逻辑，新增一个构造全部链接的纯函数，输入为已经校验过的规则 URL 数组，输出：

```text
anywhere://add-rule-set?link=<encoded-url-1>&link=<encoded-url-2>...
```

该函数不使用 1,800 字符的批次上限，因为批次上限只服务于兼容性拆分；总深链由当前 manifest 的全部分片组成，并继续拒绝非 HTTPS、非 `.arrs`、带凭据/查询/片段或重复 URL。

`renderImportPage` 在批次按钮之前渲染一个总入口，显示“全部导入”和分片数量。总入口不自动执行脚本，只是一个 `anywhere:` 锚点；现有批次按钮和手动 HTTPS URL 列表保持不变。

### 生成产物与文档

- 更新 Anywhere 导入页模板产物和对应的 `public/current`、版本快照产物；
- 更新 Anywhere 部署文档，说明总入口会打开一次确认页，完成后仍需在 App 内核对每个规则集的目标绑定；
- 明确总深链是导入快捷方式，不是一个可粘贴到“订阅规则集”输入框的 `.arrs` 订阅地址；
- 保留 3 个批次和手动分片 URL，作为系统、浏览器或旧版 App 无法处理约 3.9 KB 自定义 URL 时的回退路径。

### 测试

新增和调整测试覆盖：

1. 全部 URL 会按顺序编码为多个 `link` 参数，并能被 `URL` 解析回原始 34 个 URL；
2. 总深链不会改变批次拆分结果，也不会引入重复或不安全 URL；
3. 生成页面包含一个总入口、3 个批次入口和 34 个手动 HTTPS URL；
4. 页面继续无脚本、无 `javascript:` 和事件处理器；
5. 现有规则文件、manifest 哈希和分片计数不因导入页改动而变化。

## 数据流

```text
固定规则 manifest
  -> 34 个 canonical .arrs URL
  -> 总 deep link（一次打开）
  -> Anywhere Import Rule Sets（34 个独立项目）
  -> 用户确认
  -> 34 个独立 CustomRoutingRuleSet
  -> 各自保留 subscriptionURL、名称和本地目标绑定
```

## 风险与回退

总深链预计约 3.9 KB。用户提供的 App 源码没有对 `link` 数量或 URL 长度做应用层限制，但系统、浏览器或旧版 App 可能限制自定义 scheme 的可传递长度。因此总入口只作为快捷路径，原有 3 批次入口不能删除；如果总入口没有成功打开，用户按批次导入即可得到完全相同的规则结果。

## 验收标准

- Pages 导入页出现一个“全部导入”入口；
- 总入口包含当前 manifest 的全部 34 个唯一分片 URL；
- 3 个批次入口仍可用，批次内容和顺序不变；
- 生成器、Anywhere 测试和全仓库验证通过；
- 合并并部署后，远程 `current/anywhere/import.html` 与本地生成产物一致；
- 不需要修改 Sub-Store 参数，也不需要重新创建已有规则集订阅。
