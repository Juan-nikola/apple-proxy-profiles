# Task 2 Report: Strict INCY Xray Rendering and Raw Outbound Extension

Commit: `cb6786d`

## What Changed

- Added `CLIENT.incy` in [`shared/contracts.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/shared/contracts.js).
- Registered INCY support for the seven verified Xray protocol families in [`shared/nodes/protocol-registry.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/shared/nodes/protocol-registry.js):
  - `vless`
  - `vmess`
  - `trojan`
  - `ss` / `shadowsocks`
  - `hy2` / `hysteria2`
  - `socks5`
  - `http`
- Created [`clients/incy/src/render-node.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/src/render-node.js) with:
  - strict protocol rendering via the shared Xray outbound renderer,
  - stable `ap-incy-*` outbound tags,
  - a safe raw outbound escape hatch,
  - plain-object deep cloning for raw outbounds,
  - forbidden escape-key rejection for raw outbound payloads.
- Created [`clients/incy/src/validate-subscription.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/src/validate-subscription.js) with:
  - `assertIncyOutbound`,
  - duplicate tag detection,
  - tag format enforcement,
  - outbound shape checks,
  - top-level secret metadata rejection.
- Added focused contract tests:
  - [`clients/incy/test/render-node.test.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/test/render-node.test.js)
  - [`clients/incy/test/raw-outbound.test.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/clients/incy/test/raw-outbound.test.js)
- Updated the root client identity expectation in [`test/client-set.test.js`](/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/client-set.test.js) so the repo-level contract matches the new `CLIENT.incy` export.

## Implementation Notes

- Supported protocols are rendered through the shared Xray outbound path so server, port, transport, and credential semantics stay consistent with the existing clients.
- Raw outbound parsing only accepts plain objects from `node._incy?.xrayOutbound` or `node.xrayOutbound`, deep-clones them, rejects escape keys, and preserves the caller-supplied tag contract.
- The renderer uses the provided tag as the outbound tag and falls back to that tag as a synthetic `name` when the source node does not provide one. That keeps the shared renderer happy without requiring extra name fields in the new tests.
- The validator is intentionally strict about top-level outbound fields so secret-shaped metadata cannot leak outside the credential-bearing `settings` payload.

## Verification

Ran and passed:

- `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='render|raw'`
- `npm --workspace @apple-proxy-profiles/incy test`
- `node --test /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/client-set.test.js /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/client-catalog.test.js /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/security.test.js`
- `node --test /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/*.test.js /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/automation/test/*.test.js`

## Concerns

- I did not expand the broader INCY client catalog registration in this task. That boundary is left for the later registration/task-6 work in the design plan.
- The raw outbound validator is deliberately conservative about unknown top-level outbound fields. If future INCY raw payloads need extra Xray keys, that validator will need to be widened with a corresponding contract test.

## Follow-Up Fix

Applied a second pass after review to tighten the raw outbound and assertion contract:

- Removed any requirement for an inner raw `tag`; the caller-supplied tag is now authoritative.
- Raw outbounds now reject non-JSON values recursively, including `undefined`, functions, symbols, and other unsupported scalar forms.
- The INCY renderer tests now assert the actual outbound protocol shape for VMess, Trojan, Shadowsocks, Hy2, SOCKS5, and HTTP instead of only checking successful render completion.

### Follow-Up Verification

Passed after the fix:

- `npm --workspace @apple-proxy-profiles/incy test -- --test-name-pattern='render|raw'`
- `npm --workspace @apple-proxy-profiles/incy test`
- `node --test /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/client-set.test.js /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/client-catalog.test.js`
- `node --test /Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter/test/security.test.js`
