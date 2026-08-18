# Task 2 report — strict JSON and business targets

## Completed

- Added `parseStrictJson`, which accepts text or UTF-8 bytes; enforces byte and nesting limits; rejects malformed JSON, duplicate keys, and prototype-pollution keys without reflecting the input.
- Replaced the embedded override JSON scanner with the shared parser.
- Aligned configurable business targets to the approved twelve stable IDs. The published `国内平台`, `domestic`, and `🇨🇳 国内平台` aliases now resolve to `domesticPlatform`; `dnsAndRules` and `final` are no longer configurable IDs.
- Exported `canonicalBusinessTarget`, preserving node-name Unicode and case while normalizing only `FOLLOW` and `DIRECT`.
- Made routing precedence explicit for `domesticCore`, `domesticPlatform`, and `chinaIp`; retained explicit overseas routing before the China-IP fallback.
- Expanded cross-client assertions to check all twelve configurable business semantics across Shadowrocket, Surge, Egern, and sing-box.

## Tests

- Focused: `node --test test/strict-json.test.js test/business-targets.test.js test/semantic-intents.test.js test/cross-client-routing.test.js` — 20 passing tests.
- Full suite: `npm test` — 278 passing, 1 failing. The failure is `test/substore-docs.test.js` expecting the older five-client documentation set; Task 1's committed client catalog adds planned `happ` and `onexray`, so its expected list is stale. This Task 2 change does not touch those docs or client-catalog files.
- Secret scan: `node scripts/check-secrets.mjs` — clean.

## Self-review

- Confirmed the new parser has no input echo paths, duplicate aliases are rejected deterministically, and standard Base64 (`+`, `/`, `=`) remains rejected.
- Confirmed `git diff --check` passes.
