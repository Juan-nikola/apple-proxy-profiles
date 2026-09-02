# Task 7 Report: Publish INCY GeoData, Routing Profile, Scripts, and Manifests

## Outcome

INCY is now published as a first-class current-channel client. The current tree includes the INCY native scripts, routing profile, GeoData, sidecar hashes, and manifest entries, and the refresh pipeline now counts INCY publication bytes correctly without treating INCY like a text-rule client.

## What Changed

- `clients/incy/src/render-routing-profile.js`
  - Added `renderIncyRoutingProfile({ baseUrl, generatedAt, channel })`.
  - Added `renderIncyRoutingDeepLink(profile)`.
  - The published profile emits `Geoipurl`, `Geositeurl`, `LastUpdated`, `useChunkFiles`, `DomainStrategy: "IPIfNonMatch"`, and the DNS/Direct/Proxy/Block sections required by the task brief.

- `automation/src/render-incy-geodata.js`
  - Added a dedicated renderer that publishes exactly:
    - `incy/geoip.dat`
    - `incy/geosite.dat`
  - SHA-256 sidecars are produced by the artifact builder.

- `automation/src/build-artifacts.js`
  - Publishes INCY native scripts from `clients/incy/dist`.
  - Publishes the INCY routing profile and GeoData into the closed default tree.
  - Adds the SHA-256 sidecars for the INCY GeoData artifacts.
  - Treats INCY as a native-publication client, not as a legacy text-rule client.

- `automation/src/refresh-current.js`
  - Counts all bytes under `incy/` in current-manifest accounting.
  - Keeps INCY out of the legacy text-rule byte accounting path.

- `scripts/update-rules.mjs`
  - Publishes the INCY scripts through the native publication path.
  - Removes the duplicate staging path that had been colliding with the native INCY artifact builder.

- Tests
  - `automation/test/build-artifacts.test.js`
  - `automation/test/refresh-current.test.js`
  - `test/private-policy.test.js`
  - `test/rule-budgets.test.js`
  - `test/unified-policy.test.js`
  - `test/update-rules.test.js`
  - These now cover the INCY client roster, the widened policy schema, the current-manifest byte accounting, and the published INCY artifact set.

- Repo-local docs/examples
  - `clients/incy/docs/deployment.md`
  - `clients/incy/docs/troubleshooting.md`
  - `clients/incy/examples/incy-config-iphone.json`
  - `clients/incy/examples/incy-config-ipad.json`
  - `clients/incy/examples/incy-config-windows.json`
  - `clients/incy/scripts/render-fixtures.mjs`
  - `clients/incy/README.md`

## TDD Evidence

I started from the publication tests and used the failures to drive the fix order.

Red 1:

```bash
node scripts/update-rules.mjs --channel current
```

This failed with:

- `Duplicate public artifact path: incy/scripts/incy-config-generator.js`

Root cause: INCY scripts were being staged twice, once as static publication files and again as native INCY artifacts. I removed the extra static staging path so the native builder remained the single source of truth.

Red 2:

```bash
npm test
```

This later exposed stale assumptions in the wider test suite:

- `test/private-policy.test.js` and `test/unified-policy.test.js` still hard-coded the old eight-client roster.
- `test/update-rules.test.js` still expected the old client count.
- `test/rule-budgets.test.js` still treated the INCY generators as load-bearing legacy content.

I updated those tests to reflect the active nine-client roster and the new native INCY generators.

Green:

```bash
npm --workspace @apple-proxy-profiles/incy run build
node scripts/update-rules.mjs --channel current
node --test automation/test/build-artifacts.test.js automation/test/refresh-current.test.js
npm --workspace @apple-proxy-profiles/incy test
```

All of those passed on the cleaned worktree.

## Verification

Fresh verification on the final scoped tree:

- `npm --workspace @apple-proxy-profiles/incy run build` — passed
- `node scripts/update-rules.mjs --channel current` — passed
- `node --test automation/test/build-artifacts.test.js automation/test/refresh-current.test.js` — passed
- `npm --workspace @apple-proxy-profiles/incy test` — passed

## Notes

- I restored unrelated regenerated Anywhere/Egern artifacts so the worktree stayed scoped to Task 7.
- The current publication manifests changed as expected because INCY is now part of the published current tree.
- I did not merge or push anything.
