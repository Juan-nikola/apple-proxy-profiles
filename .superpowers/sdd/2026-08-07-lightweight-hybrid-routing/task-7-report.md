# Task 7 report — Egern lightweight semantic adapter

Status: implementation complete, pending independent review.

## Red evidence

The Egern semantic tests were changed before production code. They failed on the removed 32-source catalog assumption, missing `channel`/`adblockMode` options, the legacy `ChinaMax_Domain` DNS provider, the non-resolving CN GeoIP matcher, and absent optional-pack/Sub-Store propagation:

```text
node --test clients/egern/test/options.test.js clients/egern/test/dns.test.js clients/egern/test/profile.test.js clients/egern/test/substore.test.js clients/egern/test/validation.test.js
tests 51; pass 24; fail 27
```

The failures were for the intended missing behavior; the existing shared-catalog migration also made the old Egern renderer fail its hard-coded `assignments.length === 32` guard.

## Implementation

- Egern now renders the shared lightweight catalog as native typed-array YAML providers in deterministic precedence: local rules, security providers, validated custom rules, `DomesticCore`/`DomesticGame`/`SteamCN` direct, explicit service providers, `OverseasGame` to `🌍 海外游戏`, `ChinaIP` direct, resolving `geoip: CN` direct, then the proxy-selector default.
- Default profiles reference none of `Advertising`, `Advertising_Domain`, `ChinaMax_Domain`, `ChinaMax`, or the retired generic `Game` provider. Domestic DNS forwarding uses the selected channel's lightweight `DomesticCore` provider instead of `ChinaMax_Domain`.
- `channel=edge|current` and `adblockMode=off|full` are fail-closed and default to `edge`/`off`. Full mode adds exactly the two Egern optional providers under the same selected channel.
- The CN GeoIP rule intentionally omits `no_resolve`, allowing Egern to resolve an unmatched name before the CN test. An unresolved or non-CN name reaches `{ default: { policy: "🚀 节点选择" } }`.
- The shared policy graph supplies the new `🌍 海外游戏` proxy-first selector. Existing Egern native group rendering, QUIC behavior, typed arrays, deterministic YAML, and private node subscription boundaries remain unchanged.
- Profile validation accepts only the four canonical edge/current × off/full publications and requires DNS and rules to use the same channel. It rejects cross-channel mixtures, old `ChinaMax_Domain`, and old default-path advertising URLs while retaining all prior YAML, credential, group, URL, and tamper rejection gates.
- Sub-Store parses one immutable option snapshot and propagates channel/adblock through the source and restricted bundles. Both compatibility bundle aliases and all three platform examples were rebuilt reproducibly.
- README, deployment, canary, and troubleshooting guidance now describes lightweight defaults, optional full ads, domestic/game precedence, resolving GeoIP, and proxy fallback.

## Green evidence

Fresh complete Egern verification, including source, bundle VM, deterministic build/fixtures, docs, YAML, node/security, and validation tests:

```text
node --test clients/egern/test/*.test.js
tests 140; pass 140; fail 0

node clients/egern/scripts/build.mjs
node clients/egern/scripts/render-fixtures.mjs
```

Relevant monorepo publication, shared-policy, automation, and security tests passed:

```text
node --test test/*.test.js automation/test/*.test.js
exit 0; no failures

node scripts/check-secrets.mjs
OK 2401 files scanned; no secrets found
```

`git diff --check` passed. `git diff --name-only -- public` and `git status --short -- public` were empty; no live publication tree changed.
