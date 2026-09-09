# v2rayN client renderer

Generates importable Xray-compatible node subscriptions and Windows/macOS profiles from the user-owned `apple-proxy-v2rayn` Sub-Store collection. Public artifacts contain no node credentials or subscription URLs; fixture values are synthetic only.

Use the [Sub-Store client pool guide](../../docs/substore-client-pools.md) for the collection boundary and migration order. The node task accepts the full manually selected collection; configuration tasks use `platform=windows|macos`, default to `region=cn`, and reference the shared public GeoData assets.

## Business routing with Xray

The Xray profile generator reads the private `apple-proxy-policy` artifact. Each business target accepts `FOLLOW`, `DIRECT`, `REJECT`, an exact node reference (`NODE:<name>`), or a fuzzy reference (`NODE~<query>`). Add `|<protocol>` when names are duplicated, for example `NODE~美国 家宽|vless`.

`FOLLOW` routes through the default proxy node; an exact or fuzzy `NODE` target routes that business directly to the uniquely resolved node. Missing or ambiguous references fail generation instead of silently selecting a node.

Example policy values:

```json
{
  "targets": {
    "🤖 AI 专用": "NODE~美国 家宽|vless",
    "📺 YouTube": "NODE~日本",
    "💬 海外社交": "FOLLOW",
    "🐙 GitHub": "FOLLOW",
    "国内核心": "DIRECT"
  }
}
```

- v2rayN Xray routing task is published through Sub-Store as `v2rayn-xray-routing`.
