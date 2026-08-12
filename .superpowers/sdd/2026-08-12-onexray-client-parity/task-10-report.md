# Task 10 report — private OneXray Profile and audit tasks

## Implemented

- Added `runOneXrayProfileProcessor({ proxies, arguments })` with exactly `output=profile` and `output=audit` modes; `output=nodes` is rejected at the private Profile entry boundary.
- Added one internal `buildPrivateOneXrayContext()` transaction shared by both outputs. It performs option parsing, normalization, OneXray capability filtering, business/chain resolution, DNS rendering, routing rendering, Profile composition, validation and canonical deep-link generation once.
- Added deterministic Chinese `renderOneXrayAudit(context)` with node totals, protocol and exclusion counts, business configured/resolved targets, fixed-node compatibility summary, chain state, DNS/IPv6/QUIC/block settings, Profile hash/version, rule release ID, GeoData hashes and deep-link budget state.
- Audit is an explicit allowlist. Credential-bearing nodes, Profile JSON, deep links and encoded policy values remain in non-enumerated internal context slots and are never serialized into the report.
- Stable entry errors use `OneXray profile: <code>` and do not include raw request, node, policy or credential values.

## Tests

```text
node --test clients/onexray/test/audit.test.js clients/onexray/test/substore-profile-entry.test.js
6 passed, 0 failed

node --test clients/onexray/test/*.test.js
64 passed, 0 failed
```

Commit: `daa2633f49dba5f48cdb95c7016b84c077348ca9`

## Fix round 1

- Whitelisted audit configured/resolved target values and statuses; invalid or untrusted values now become stable `INVALID` markers, fixed tags become hashes, and no raw generated tag is emitted.
- Replaced the generic chain landing label with a credential-free hash of the resolved landing display name.
- Derived fixed compatibility from the audited OneXray capability check and restricted protocol names to the allowlisted protocol set.
- Added a pure shared Base64URL/UTF-8 decoder and removed Node `Buffer` dependencies from business override parsing and malformed-policy diagnostics.
- Wrapped request prototype/descriptor inspection in a catch boundary and added a Proxy-trap regression; policy failures preserve a stable code plus the approved Chinese business label without exposing target input.

Fix-round tests:

```text
node --test clients/onexray/test/audit.test.js clients/onexray/test/substore-profile-entry.test.js
9 passed, 0 failed

node --test clients/onexray/test/*.test.js test/business-targets.test.js
75 passed, 0 failed
```

## Fix round 2

- Added optional `geoManifest`/`geoHashes` request metadata. Only validated lowercase SHA-256 domain/IP hashes enter the private context; the audit reports `available: false` with null hashes when no compiled manifest is supplied instead of fabricating asset hashes.
- Wrapped direct audit rendering in a stable `OneXray audit: invalid-context` boundary for Proxy/getter failures.
- Added regression coverage for real hash pass-through, unavailable-hash behavior, and audit context traps.

Fix-round tests:

```text
node --test clients/onexray/test/audit.test.js clients/onexray/test/substore-profile-entry.test.js
12 passed, 0 failed

node --test clients/onexray/test/*.test.js test/business-targets.test.js
78 passed, 0 failed
```
