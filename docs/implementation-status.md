# Implementation Status

| Milestone | Status | Final commit | Verification |
| --- | --- | --- | --- |
| Foundation and shared core | complete | 98311b3 | `npm run verify` — PASS |
| Shadowrocket migration | complete | f12910a | `npm run verify && npm --workspace @apple-proxy-profiles/shadowrocket run verify:compatibility && npm --workspace @apple-proxy-profiles/shadowrocket run check:rules` — PASS |
| Egern generator | complete | 7f9769a | `npm ci && npm --workspace @apple-proxy-profiles/egern run verify && npm --workspace @apple-proxy-profiles/egern run verify && npm run verify:shadowrocket && npm run check:secrets && npm run verify` — PASS |
| Anywhere generator | complete | 3b3bdb4 | `npm run verify:anywhere && npm run check:secrets` — PASS |
| Publishing and GitHub | pending | — | `npm run verify && npm run check:rules` |

Shadowrocket、Egern 与 Anywhere 生成器及确定性产物里程碑均已完成。Live public rule URLs still depend on the later Publishing and GitHub milestone. 真机 canary 仍是用户执行的发布门槛，不能在没有设备证据时声称完成。
