# Task 3 Report

Commit: `f6b1600` `feat(incy): add DNS routing and balancers`

## What Changed

- Added [`clients/incy/src/render-dns.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/src/render-dns.js) with:
  - domestic DNS server selection via the shared China DNS providers,
  - overseas DNS server selection via the shared global DNS providers,
  - `UseIPv4` / `UseIP` query strategy selection from `ipv6Mode`,
  - DNS server domain coverage for `geosite:CN`, `geosite:PRIVATE`, and the shared overseas service catalog,
  - direct DNS protection metadata for private/CN resolver IPs.
- Added [`clients/incy/src/render-routing.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/src/render-routing.js) with:
  - `routeTargetForPolicy()` for deterministic `FOLLOW`, `DIRECT`, `REJECT`, and fixed-node balancer mapping,
  - `renderIncyBalancers()` for one `leastPing` balancer per fixed policy node,
  - `renderIncyRouting()` for ordered `field` rules, `domainStrategy: "IPIfNonMatch"`, DNS protection hints, and final follow fallback.
- Expanded [`shared/policies/platform-presets.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/shared/policies/platform-presets.js) with the missing INCY platform presets:
  - `androidtv`
  - `windows`
  - `linux`
- Added focused contract tests:
  - [`clients/incy/test/dns.test.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/test/dns.test.js)
  - [`clients/incy/test/routing.test.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/test/routing.test.js)
- Regenerated the tracked INCY bundles:
  - [`clients/incy/dist/incy-config-generator.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/dist/incy-config-generator.js)
  - [`clients/incy/dist/substore-config-generator.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/dist/substore-config-generator.js)

## Behavior Notes

- DNS rendering uses the shared provider catalog instead of hard-coded resolver strings.
- Routing preserves the required sequence:
  - private / localhost protection,
  - security rules,
  - domestic and service policy rules,
  - `geosite:CN`,
  - DNS protection hints,
  - `geoip:CN`,
  - final follow fallback.
- Fixed policy targets now resolve through deterministic balancer tags with `balancer-ap-incy-...` prefixes.
- Observatory metadata reuses the shared platform preset timing values, including the new platform keys added for INCY.
- The tests were written so the repository secret scanner stays green; no real credentials or UUID-shaped fixtures are left in the route coverage.

## Verification

Passed:

- `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='dns|routing|balancer'`
- `npm --workspace @apple-proxy-profiles/incy test`
- `npm --workspace @apple-proxy-profiles/incy run build`
- `node --test test/security.test.js`

## Notes

- `renderIncyRouting()` can derive balancer tags from fixed outbounds if a caller does not pass an explicit balancer map, which should make the next task easier to wire up.
- The generated `dist/` bundles only changed for the shared preset expansion; the new source renderers live in `clients/incy/src/` and are covered by the package tests.

## Follow-Up Fix

Reviewed issues from the task 3 review and tightened the implementation:

- `renderIncyRouting()` now maps every source whose policy resolves to `DIRECT` onto the domestic direct target, so `DomesticCore`, `DomesticGame`, `SteamCN`, and the other direct domestic sources stay on `directTag` instead of falling through to `followTag`.
- The routing DNS hint path now treats `chinaDns: "system"` as a special resolver and skips URL parsing for it, which keeps the helper compatible with the literal `system` resolver form used elsewhere in the repo.

## Follow-Up Verification

Passed after the fix:

- `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='domestic core service|system China DNS'`
- `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='dns|routing|balancer'`
- `npm --workspace @apple-proxy-profiles/incy test`
- `node --test test/security.test.js`
