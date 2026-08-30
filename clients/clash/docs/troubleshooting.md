# Clash Apple troubleshooting

See the [Sub-Store client pool guide](../../../docs/substore-client-pools.md) before changing collection membership or migration order.

If the node task is empty, preview `apple-proxy-clash` and check the collection name in the task fragment. If a profile has no usable proxies, inspect the private task diagnostic for `renderFailures`; remove or repair the incompatible node instead of forcing an empty profile.

If iPhone, iPad, or Apple TV still reports insufficient memory after refreshing the profile, confirm that the generated YAML references `clash/mobile-rules/` and does not reference `clash/rules/Hijacking.yaml` or `clash/rules/DomesticCore.yaml`. Do not set `adblockMode=full` on mobile; the task checker and generator reject it by design. Keep the node collection to confirmed usable nodes and close older VPN profiles before retrying.

If rules do not load, confirm the profile uses the same `current` channel as `current/clash/rules/` and the root `manifest.json`. Do not switch a production task to `edge` as a workaround.

If DNS or LAN access fails, test with the generated profile's DNS and TUN settings, then temporarily return to the previous profile. Do not enable MITM or disable certificate validation.

If logs show `dial DIRECT (match RuleSet/ChinaIP)` to a `2408:*`/other IPv6 address followed by `no route to host`, the device has no usable IPv6 route. Refresh the macOS profile so its default `ipv6: false` and DNS IPv6 setting take effect; do not change ChinaIP to proxy. Only override with `ipv6Mode=auto` after confirming the network can reach IPv6 destinations.

If a Baidu Cloud download host such as `bd-cu22.baidupcs.com` appears under a proxy node, first refresh the profile and its rule providers. The public `DomesticCore` set contains `baidupcs.com`, and generated profiles also include a small inline `DIRECT` safety net for Baidu Cloud endpoints so a 24-hour provider cache cannot send them to the final proxy. Do not add Baidu Cloud to the overseas proxy group.

For a domestic host that is not present in the compact mobile rule providers, the final fallback is deliberate: explicit business rules and `DomesticCore`/`ChinaTLD`/`ChinaIP` rule sets are evaluated first, then `GEOIP,CN,DIRECT` resolves the destination and sends a Chinese IP direct. The final `MATCH,漏网之鱼` handles a non-Chinese IP, DNS failure, or a connection failure; its default is controlled by `apple-proxy-policy.final`, and Clash does not automatically retry a failed direct connection through the proxy. This is why a host such as `bdapi.youpin898.com` can use direct access without loading the full Chinese domain list on iPhone, iPad, or Apple TV.

Do not add `no-resolve` to the final `GEOIP,CN,DIRECT` rule: that modifier prevents a domain request from being resolved before the GeoIP decision and causes unknown domains to skip the Chinese-IP fallback. `no-resolve` remains intentional on the private/LAN CIDR rules, where the address is already the value being matched. Do not replace this behavior with an all-`.com` direct rule or an unconditional all-China-IP rule.

For rollback, restore the previous Clash profile or use the immutable version named by the public manifest. Keep the failing task and its count-only diagnostics for follow-up.
