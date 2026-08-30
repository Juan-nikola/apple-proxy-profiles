# Clash Apple deployment

1. Read the [Sub-Store client pool guide](../../../docs/substore-client-pools.md), then create the `apple-proxy-clash` collection in your own Sub-Store and manually select the nodes intended for Clash Apple.
2. Preview `clash-nodes`; the result must contain a non-empty `proxies:` list.
3. Use the platform task matching the device: `clash-config-macos`, `clash-config-iphone`, `clash-config-ipad`, or `clash-config-appletv`.
4. Keep `nodeSubscriptionUrl` pointed at the private `clash-nodes` output. Do not put that URL in GitHub, screenshots, or issue reports.
5. Import the generated YAML into the Clash/Mihomo client and enable Rule mode.

The default profile includes DNS, Fake-IP, TUN, sing-box-compatible continent selectors (`🌏 亚太`, `🌍 欧洲`, `🌎 美洲` when populated), concrete node choices inside each continent, hidden automatic latency-test helpers at the end of the group list, business selectors, shared `rule-providers`, and ordered rules. iPhone, iPad, and Apple TV reference the compact `clash/mobile-rules` providers; macOS references the full `clash/rules` providers. Mobile tasks reject `adblockMode=full` to prevent the optional advertising pack from exhausting the Network Extension memory budget.

All current canonical Clash tasks use `ipv6Mode=ipv4-only`, which generates `ipv6: false` and disables DNS IPv6 to avoid failed direct connections when the local network advertises unreachable IPv6 addresses. The renderer still accepts `ipv6Mode=auto` for a separately tested network with working IPv6/NAT64; keep that override out of the production task unless it has been verified.

Verify domestic sites, overseas services, LAN devices, DNS resolution, group switching, and a reconnect after changing networks. Keep the previous profile until the new one is confirmed.
