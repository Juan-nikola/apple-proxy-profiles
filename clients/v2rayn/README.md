# v2rayN client renderer

Generates importable Xray-compatible node subscriptions and Windows/macOS profiles from the user-owned `apple-proxy-v2rayn` Sub-Store collection. Public artifacts contain no node credentials or subscription URLs; fixture values are synthetic only.

Use the [Sub-Store client pool guide](../../docs/substore-client-pools.md) for the collection boundary and migration order. The node task accepts the full manually selected collection; configuration tasks use `platform=windows|macos`, default to `region=cn`, and reference the shared public GeoData assets.
