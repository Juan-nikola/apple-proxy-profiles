# Clash Apple deployment

1. Read the [Sub-Store client pool guide](../../../docs/substore-client-pools.md), then create the `apple-proxy-clash` collection in your own Sub-Store and manually select the nodes intended for Clash Apple.
2. Preview `clash-nodes`; the result must contain a non-empty `proxies:` list.
3. Use the platform task matching the device: `clash-config-macos`, `clash-config-iphone`, `clash-config-ipad`, or `clash-config-appletv`.
4. Keep `nodeSubscriptionUrl` pointed at the private `clash-nodes` output. Do not put that URL in GitHub, screenshots, or issue reports.
5. Import the generated YAML into the Clash/Mihomo client and enable Rule mode.

The default profile includes DNS, Fake-IP, TUN, automatic latency testing, fallback, continent groups, business selectors, shared `rule-providers`, and ordered rules. Leave `adblockMode=off` unless the optional full advertising pack is required.

Verify domestic sites, overseas services, LAN devices, DNS resolution, group switching, and a reconnect after changing networks. Keep the previous profile until the new one is confirmed.
