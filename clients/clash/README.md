# Clash Apple client renderer

Generates Mihomo/Clash YAML node subscriptions and complete profiles for macOS, iPhone, iPad, and Apple TV from the user-owned `apple-proxy-clash` Sub-Store collection. Public artifacts contain no node credentials or private subscription URL.

The profile renderer emits mixed-port, TUN, DNS with Fake-IP, automatic and fallback proxy groups, continent groups, business selectors, shared `rule-providers`, and an ordered `rules` list ending in `MATCH`. Default `adblockMode=off` keeps the large advertising pack out of the normal profile; use `full` only when the device can carry the optional pack.

Use `clash-nodes` for the private node YAML, then select the matching `clash-config-*` platform task. Keep `nodeSubscriptionUrl` and all generated output URLs private. Unsupported or malformed nodes are reported in count-only `renderFailures` rather than silently emitted.

Use the [Sub-Store client pool guide](../../docs/substore-client-pools.md) for collection boundaries and migration. See [deployment](docs/deployment.md) and [troubleshooting](docs/troubleshooting.md).
