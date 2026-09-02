# Task 4 Report

Date: 2026-09-02

## What I changed

- Added `clients/incy/src/render-subscription.js` to render one full Xray JSON config per normalized input node.
- Updated `clients/incy/src/substore-config-entry.js` so the Sub-Store operator:
  - loads the source collection,
  - normalizes it,
  - fails closed when normalization drops any node,
  - resolves unified policy,
  - restores original collection order before rendering,
  - and returns the rendered JSON array in `$content`.
- Expanded `clients/incy/src/validate-subscription.js` to validate complete INCY configs, including:
  - standard inbounds,
  - unique outbound tags,
  - direct/block safety outbounds,
  - DNS shape,
  - routing domainStrategy and final rule,
  - balancer references,
  - observatory selectors,
  - and non-secret metadata.
- Added `clients/incy/test/subscription.test.js` covering:
  - full config rendering,
  - validation failures,
  - and fail-closed behavior when mixed valid and unsupported nodes are supplied.
- Rebuilt the checked-in INCY bundle outputs in `clients/incy/dist/`.

## Behavior delivered

- Each normalized node now renders to one complete INCY config.
- Input order is preserved in the final array.
- Fixed-node policy targets render as balancers with deterministic `ap-incy-*` tags.
- `direct` and `block` outbounds are always present.
- DNS, routing, observatory, and metadata are emitted as part of each config.
- Any unsupported or malformed node causes the whole render to fail before a partial array is returned.

## Verification

- `npm --workspace @apple-proxy-profiles/incy test`
- `npm --workspace @apple-proxy-profiles/incy run build`

## Notes

- The final implementation keeps the existing shared normalization and policy-resolution helpers intact and only consumes their outputs.
- No known functional concerns remain after the full test suite passed.

## Follow-up hardening

- Added semantic validation for the reserved safety outbounds:
  - `ap-incy-direct` must be `freedom` with an empty settings object.
  - `ap-incy-block` must be `blackhole` with an empty settings object.
- Added semantic validation for the standard inbounds:
  - SOCKS inbound must be `127.0.0.1:10808`, protocol `socks`, `settings.auth=noauth`, `settings.udp=true`, and sniffing enabled with the standard `destOverride` set and `routeOnly=false`.
  - HTTP inbound must be `127.0.0.1:10809`, protocol `http`, have an empty settings object, and the same sniffing shape.
- Added mutation tests that fail if the reserved outbounds or inbound/sniffing contract are altered.

## Verification output

- `node --test /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/test/subscription.test.js`
  - Result: 5 tests passed, 0 failed.
- `npm --workspace @apple-proxy-profiles/incy test`
  - Result: 35 tests passed, 0 failed.
- `npm --workspace @apple-proxy-profiles/incy run build`
  - Result: exited 0.
