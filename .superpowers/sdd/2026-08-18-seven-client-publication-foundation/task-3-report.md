# Task 3 report — private three-channel policy contract

## Completed

- Added the strict `apple-proxy-policy` schema for independent `edge`, `current`, and `previous` snapshots.
- Validated the complete twelve-target defaults, optional HAPP/OneXray overrides, DNS providers, adblock mode, and `clientChain` structure.
- Rejected duplicate/unknown fields, invalid targets, protected routing/security overrides, secret-shaped fields, URLs, and credential-like node values without echoing input values.
- Added deep-frozen policy parsing and defaults-before-client-override resolution.
- Added private task bindings containing only client/channel, policy revision, public Manifest SHA-256, GeoData SHA-256, and `readsPolicy`.
- Tightened bindings to HAPP and OneXray only; active five-client IDs are rejected.
- Kept the existing `manifestSha256` compatibility input and channel/GeoData consistency checks.

## Verification

- `node --test test/private-policy.test.js test/private-task-binding.test.js` — 9 passing.
- `node scripts/check-secrets.mjs` — clean (`3018` files scanned).
- `git diff --check` — clean before commit.

## Commits

- `cee0a20 feat: add private three-channel policy contract`
- `bd53ac5 fix: tighten private task client boundary`

The full repository suite still contains the previously known stale five-client documentation assertion; no public generated files or external private services were changed.
