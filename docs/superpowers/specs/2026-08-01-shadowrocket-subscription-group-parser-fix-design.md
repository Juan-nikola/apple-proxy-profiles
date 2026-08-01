# Shadowrocket Subscription Group Parser Fix Design

## Problem

The current Profile combines explicit policies with `include-all-proxies=true`, for example:

```ini
🍎 Apple = select,DIRECT,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,🌏 亚太,🌍 欧洲,🌎 美洲,include-all-proxies=true,policy-regex-filter=^.+$
```

The generated text and Shadowrocket's compiled configuration database contain every field, but the Shadowrocket policy menu exposes only concrete servers. `DIRECT`, `🚀 节点选择`, automatic groups, fallback groups, and continent groups disappear. This is a client parser compatibility issue, not a stale Profile.

The root group itself is already correct:

```ini
🚀 节点选择 = select,PROXY
```

`PROXY` is Shadowrocket's built-in homepage-selected proxy policy. A service group selecting `🚀 节点选择` therefore follows the node selected on the homepage.

## Chosen Design

Restore Shadowrocket's subscription-aware group syntax:

```ini
<explicit policies>,<subscription display name>,use=true,policy-regex-filter=<filter>
```

`subscriptionName` is no longer a compatibility placeholder. It is the exact Shadowrocket subscription display name used by every dynamic group. The name remains user-configurable and may be changed freely, but the same value must be supplied to each Sub-Store File operator.

Add `policy-select-name` to the 16 common service groups so a freshly compiled Profile declares the intended default explicitly:

- Ten proxy-first groups use `policy-select-name=🚀 节点选择`.
- Six direct-first groups use `policy-select-name=DIRECT`.

The root remains exactly `select,PROXY` and does not enumerate servers.

## Resulting Group Behavior

Proxy-first groups:

```ini
🐙 GitHub = select,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,<present continents>,DIRECT,<subscriptionName>,use=true,policy-regex-filter=^.+$,policy-select-name=🚀 节点选择
```

Direct-first groups:

```ini
🍎 Apple = select,DIRECT,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,<present continents>,<subscriptionName>,use=true,policy-regex-filter=^.+$,policy-select-name=DIRECT
```

Both categories expose concrete servers from the named subscription in the same menu. Automatic, fallback, continent, AI, source, game, and P2P groups use the same named-subscription mechanism when they enumerate servers.

## Data Flow

1. The user gives the Shadowrocket node subscription any display name.
2. The same exact text is supplied as `subscriptionName` in all three Sub-Store File operator arguments.
3. The Profile generator passes `subscriptionName` to `renderGroups`.
4. Dynamic groups render `<subscriptionName>,use=true` plus their filter.
5. Shadowrocket resolves concrete servers from that subscription while retaining the explicit policies in the group menu.
6. A service group selecting `🚀 节点选择` resolves to `PROXY`, which follows the homepage-selected node.

## Validation and Failure Handling

- `subscriptionName` remains required and nonblank.
- Generated Profile validation requires dynamic groups to have either `<subscriptionName>,use=true` or another supported dynamic source.
- Tests must reject a regression back to `include-all-proxies=true` for mixed service groups.
- Tests must assert the exact proxy-first and direct-first rendered prefixes, named subscription source, filter, and `policy-select-name` values.
- Generated macOS, iPhone, and iPad examples must use `Shadowrocket-Nodes` as the fixture display name.
- Documentation must state that capitalization and punctuation must match the Shadowrocket subscription display name exactly.
- If the subscription name does not match, explicit policies remain available but concrete servers from the subscription will be absent.
- After updating a real device, the user must verify one proxy-first group and one direct-first group. If Shadowrocket retains a prior manual choice despite `policy-select-name`, select the desired first policy once; this does not affect homepage following afterward.

## Unchanged Scope

- Blackmatrix7 rules and their order.
- Wendao/Leiting/G-Bits direct rules.
- DNS, QUIC, IPv6, TUN, and macOS stability settings.
- Node normalization, labels, UDP eligibility, P2P eligibility, and client-chain behavior.
- AI and continent group structure.
- `🚀 节点选择 = select,PROXY`.

## Rejected Alternatives

1. Keep `include-all-proxies=true` and reorder fields. This is insufficiently documented for Shadowrocket and risks another parser-dependent failure.
2. Put all concrete servers behind a nested `全部节点` group. This avoids the subscription-name binding but changes the requested original one-menu workflow.
3. Rename all service groups to clear cached selections. This would require widespread rule-policy renaming and would unnecessarily change the visible UI.

## Acceptance Criteria

- `🚀 节点选择` contains only `PROXY` and follows the homepage node.
- Ten proxy-first groups default to `🚀 节点选择`.
- Six direct-first groups default to `DIRECT`.
- All 16 groups show automatic, fallback, present-continent, and concrete-server choices.
- The configured subscription display name can be arbitrary, provided `subscriptionName` matches it exactly.
- Full tests, generated-artifact drift checks, secret scanning, and remote rule checks pass before publication.
