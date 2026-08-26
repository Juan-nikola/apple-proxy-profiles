# Clash Apple troubleshooting

See the [Sub-Store client pool guide](../../../docs/substore-client-pools.md) before changing collection membership or migration order.

If the node task is empty, preview `apple-proxy-clash` and check the collection name in the task fragment. If a profile has no usable proxies, inspect the private task diagnostic for `renderFailures`; remove or repair the incompatible node instead of forcing an empty profile.

If rules do not load, confirm the profile uses the same `current` channel as `current/clash/rules/` and the root `manifest.json`. Do not switch a production task to `edge` as a workaround.

If DNS or LAN access fails, test with the generated profile's DNS and TUN settings, then temporarily return to the previous profile. Do not enable MITM or disable certificate validation.

If logs show `dial DIRECT (match RuleSet/ChinaIP)` to a `2408:*`/other IPv6 address followed by `no route to host`, the device has no usable IPv6 route. Refresh the macOS profile so its default `ipv6: false` and DNS IPv6 setting take effect; do not change ChinaIP to proxy. Only override with `ipv6Mode=auto` after confirming the network can reach IPv6 destinations.

For rollback, restore the previous Clash profile or use the immutable version named by the public manifest. Keep the failing task and its count-only diagnostics for follow-up.
