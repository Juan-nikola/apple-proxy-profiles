# Implementation Status

| Milestone | Status | Final commit | Verification |
| --- | --- | --- | --- |
| Foundation and shared core | complete | 98311b3 | `npm run verify` — PASS |
| Shadowrocket migration | complete | f12910a | `npm run verify && npm --workspace @apple-proxy-profiles/shadowrocket run verify:compatibility && npm --workspace @apple-proxy-profiles/shadowrocket run check:rules` — PASS |
| Egern generator | complete | 7f9769a | `npm ci && npm --workspace @apple-proxy-profiles/egern run verify && npm --workspace @apple-proxy-profiles/egern run verify && npm run verify:shadowrocket && npm run check:secrets && npm run verify` — PASS |
| Anywhere generator | pending | — | `npm run verify:anywhere` |
| Publishing and GitHub | pending | — | `npm run verify && npm run check:rules` |

The Egern generator and deterministic artifact milestone is complete. Live public rule URLs still depend on the later Publishing and GitHub milestone. The Intel Mac → iPhone → iPad real-device canary remains a user-run release gate documented in the [Egern canary guide](../clients/egern/docs/canary.md) and is not claimed complete here.
