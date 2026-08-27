# v2rayN client renderer

Generates an importable Xray node subscription and a v2rayN Full Config Template from the user-owned `apple-proxy-v2rayn` Sub-Store collection. The template contains DNS, TUN, routing, and explicitly fixed policy outbounds; ordinary proxy nodes remain managed by v2rayN so the active node can be changed in the main list. Public artifacts contain no node credentials or subscription URLs; fixture values are synthetic only.

Use the [Sub-Store client pool guide](../../docs/substore-client-pools.md) for the collection boundary and migration order. The node task accepts the full manually selected collection; configuration tasks use `platform=windows|macos`, default to `region=cn`, and reference the shared public GeoData assets.

## macOS usage

Use the two tasks as two parts of one v2rayN setup:

1. Preview `v2rayn-nodes` in Sub-Store. Add its URL to v2rayN as a subscription, update it, and select one ordinary node in the main server list.
2. Preview `v2rayn-config-macos` and copy the returned JSON. It is a Full Config Template, not a standalone `Custom` profile.
3. Open `Settings → Full Config Template Settings → v2ray Full Config Template`, enable the template, and paste the JSON into `xray tun config template json`.
4. Enable TUN in v2rayN, activate the selected node, and start the service. The template routes ordinary proxy traffic to v2rayN's current `proxy` outbound, so changing the selected node in the main list changes the proxy used by the rules.

Do not select the generated JSON as the `Custom` row in the profile list; that creates a separate configuration and cannot follow the node selected in the main list. Keep the old Custom row only as a rollback copy until the template setup has been verified.

When the `apple-proxy-v2rayn` collection or routing policy changes, preview both tasks again: update the node subscription and replace the Full Config Template. A normal node switch only requires selecting another node and restarting the service if v2rayN does not reload it immediately.
