# SDD ledger — plan: docs/superpowers/plans/2026-09-02-incy-client.md

## Setup

- Worktree: `/Users/sunyuze/Documents/ChatGPT/代理开发/.worktrees/incy-adapter`
- Branch: `codex/incy-adapter`
- Base before Task 1: `1d92a58`
- Baseline: `npm install` followed by `npm test`; root and existing workspace suites pass. An earlier concurrent install/test run produced transient module-resolution errors and is disregarded.

## Plan Conflict Scan

### Shared file/interface rows

| Tasks | Shared file/interface | Check | Ruling |
| --- | --- | --- | --- |
| 1/2/5/6/8 | `shared/contracts.js`, `CLIENT.incy`, `OPTION_VALUES` | Task 1 consumes option enums; Task 2/6 register client and protocol support; Task 5 passes `CLIENT.incy`; Task 8 checker reads shared enums. | Add `CLIENT.incy` and `adblockMode` once; keep all consumers on exported constants. |
| 1/3/6 | `shared/policies/platform-presets.js`, `incyPlatformPreset`, `platformPolicyPreset` | Task 1 emits local render preset; Task 3 uses shared latency values; Task 6 adds missing Android TV/Windows/Linux keys. | Use shared policy preset as the source of test timing; local INCY record may add resource metadata only. |
| 2/4/6 | `shared/nodes/protocol-registry.js`, `renderIncyOutbound` | Task 2 adds exactly seven verified protocols; Task 4 renders every normalized node; Task 6 makes policy resolution aware of INCY. | No client capability prefilter; renderer remains fail-closed for unknown protocols without raw Xray extension. |
| 3/4/5 | DNS/routing/balancer tag interfaces | Task 3 produces tags; Task 4 composes them; Task 5 invokes through the subscription entry. | Tags are deterministic `ap-incy-*`; every routing/balancer target is validated before serialization. |
| 4/5 | `renderIncySubscription`, `validateIncySubscription`, `$content` | Task 4 returns complete arrays; Task 5 serializes them and must not expose partial output. | Validate the full array before setting `$content`; any node failure rejects the operator. |
| 5/7/8 | Public script paths and channel | Task 5 emits the autorouting URL; Task 7 publishes routing/profile assets; Task 8 builds task URLs. | Public autorouting is always `current/incy/routing.json`; task path channel and fragment channel must match. |
| 6/7/9 | active client catalog and publication manifests | Task 6 adds active client; Task 7 adds client bytes/manifests; Task 9 verifies active publication. | INCY is active but excluded from lightweight text-rule IDs; GeoData bytes are counted through its own client manifest. |
| 7/8 | `clients/incy/dist/*` native bundle | Task 1's build script creates bundle; Task 7 publishes it; Task 8 references it in task URLs. | Bundle names are fixed before publication: `incy-config-generator.js` and `substore-config-generator.js`. |
| 8/9 | Sub-Store catalog count and checker schema | Task 8 changes 30 tasks to 38 and adds one collection; Task 9 runs checks. | Update both builder and validator to 38; preserve existing task order and metadata semantics. |
| 9/10 | verification/docs/device matrix | Task 9 automates checks; Task 10 records real-client evidence. | Automated verification is required before device acceptance; runtime limitations are documented, not silently widened. |

### Per-task self-consistency rows

| Task | Files vs interfaces/tests | Result |
| --- | --- | --- |
| 1 | Workspace, parser, inbounds, platform presets and build/fixture scripts are all created and tested within the task. | Consistent. |
| 2 | Renderer, raw extension and validator names match the tests and later subscription consumer. | Consistent. |
| 3 | DNS/routing/balancer functions produce the exact inputs consumed by Task 4. | Consistent. |
| 4 | Array assembly calls Task 2/3 interfaces and validates before returning. | Consistent. |
| 5 | Operator calls the Task 1/4 interfaces and sets headers only after successful rendering. | Consistent. |
| 6 | Shared client/protocol/catalog changes match Task 2 and publication assumptions. | Consistent. |
| 7 | Routing profile, GeoData, bundle and manifest paths match Task 5/8 URLs. | Consistent. |
| 8 | Collection/task IDs, 38-task count and checker schema match generated URLs. | Consistent after count ruling above. |
| 9 | Fixtures exercise the exact routing/failure/security behaviors from the spec and wire into root verify. | Consistent. |
| 10 | Device acceptance checks the same array, routing, update and rollback contracts automated in Task 9. | Consistent. |

## Rulings

- Ruling: Treat the existing uncommitted README/Sub-Store documentation changes on `main` as user-owned and leave them untouched — they are outside the isolated feature branch and must not be reverted.
- Ruling: Treat the transient dependency errors from the concurrent baseline invocation as invalid evidence — the ordered rerun passed and no dependency source change is needed.
- Ruling: Use 38 canonical Sub-Store tasks after adding INCY's eight platform tasks — the existing catalog has 30 tasks and the new collection is not itself a task.

## Task Status

- Task 1: complete (`aa03f28`, `b5c9dcc`; review approved after UDP sniffing fix)
- Task 2: complete (`cb6786d`, `2d6b24b`; review approved after raw tag/value/test fixes)
- Task 3: complete (`f6b1600`, `69d6f41`, `dde15d0`; review approved after direct/system-DNS fixes)
- Task 4: complete (`b34218b`, `5a8edbb`; review approved after reserved/inbound validator fixes)
- Task 5: complete (`7275ff6`; review approved; wrapper forwarding residual risk tracked for later integration tests)
- Task 6: complete (`4dac975`; review approved)
- Task 7: complete (`55a5f92`, `7c2e219`; review approved after encoded deep-link fix)
- Task 8: complete (`b4b8a37`, `84ab21d`, `b81caee`, `0fea1c4`, `1a2028a`; review approved after checker/docs/platform fixes)
- Task 9: complete (`6c954eb`, `b352591`; review approved after route evaluator, task-catalog gate, manifest closure, and security target mapping fixes)
- Task 10: complete (`c0391aa`, `59a1861`; automated verification complete; real-device acceptance remains pending manual execution across the documented device matrix)
