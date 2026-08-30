# Clash Apple client renderer

Generates Mihomo/Clash YAML node subscriptions and complete profiles for macOS, iPhone, iPad, and Apple TV from the user-owned `apple-proxy-clash` Sub-Store collection. Public artifacts contain no node credentials or private subscription URL.

The profile renderer emits mixed-port, TUN, DNS with Fake-IP, sing-box-compatible continent selectors, concrete node choices, hidden automatic helpers at the end of the group list, business selectors, a switchable `漏网之鱼` group, shared `rule-providers`, and an ordered `rules` list ending in `MATCH,漏网之鱼`. iPhone, iPad, and Apple TV use the compact semantic providers under `clash/mobile-rules`; macOS keeps the full source-level providers under `clash/rules`. Mobile tasks reject `adblockMode=full` because the optional advertising pack exceeds the Network Extension memory budget.

All current canonical Clash tasks use `ipv4-only` for stability on networks without a usable IPv6 route. The generator also accepts `auto` for networks where IPv6/NAT64 compatibility has been explicitly verified; change the private Sub-Store task parameter only after that test.

Domestic download endpoints include a small inline Baidu Cloud `DIRECT` safety net in addition to the remote `DomesticCore` provider. This prevents a newly published rule from waiting for the provider refresh interval before taking effect.

Every complete Clash task reads the private `apple-proxy-policy`; the separate node task only outputs nodes. Its `final` value controls the default of `漏网之鱼`: `FOLLOW` selects `🚀 节点选择`, `DIRECT` selects direct access, and `NODE~query` selects one matching node. The group always keeps `🚀 节点选择`, `DIRECT`, and manual `REJECT` as candidates; `REJECT` is not the default.

Use `clash-nodes` for the private node YAML, then select the matching `clash-config-*` platform task. Keep `nodeSubscriptionUrl` and all generated output URLs private. Unsupported or malformed nodes are reported in count-only `renderFailures` rather than silently emitted.

Use the [Sub-Store client pool guide](../../docs/substore-client-pools.md) for collection boundaries and migration. See [deployment](docs/deployment.md) and [troubleshooting](docs/troubleshooting.md).
