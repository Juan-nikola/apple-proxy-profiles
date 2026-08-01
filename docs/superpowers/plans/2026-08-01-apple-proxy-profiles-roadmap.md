# Apple Multi-Client Proxy Profiles Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `Juan-nikola/apple-proxy-profiles` as a public, tested monorepo that preserves Shadowrocket behavior, adds structurally equivalent Egern profiles, adds functionally equivalent Anywhere subscriptions and rules, and publishes one validated Blackmatrix7 snapshot through GitHub Pages.

**Architecture:** A shared ESM core owns node normalization, policy intent, rule semantics, client capability checks, diagnostics, and secret boundaries. Three client renderers produce native outputs, while a scheduled GitHub Actions pipeline compiles the same upstream rule snapshot into atomic versioned Pages artifacts.

**Tech Stack:** Node.js 22+, ESM JavaScript, `node:test`, esbuild 0.28.1, GitHub Actions, GitHub Pages, Sub-Store File Script Operators.

## Global Constraints

- Preserve the complete existing Git history and leave `/Users/sunyuze/Documents/代理软件/shadowrocket-profile` intact as rollback.
- Work in `/Users/sunyuze/Documents/代理软件/apple-proxy-profiles` after the foundation migration task creates it.
- Use the latest stable Shadowrocket, Egern, and Anywhere as the minimum compatibility baseline; beta-only syntax is opt-in.
- Keep existing Sub-Store source, label, combination, Shadowrocket output names, and private URLs unchanged.
- Never commit or log a real subscription URL, token, server, port, password, UUID, PSK, private key, certificate, or node-derived fingerprint.
- Keep MITM, HTTPS decryption, root certificates, rewrites, and body scripts out of every output.
- Use `ChinaMax_Domain + ChinaMax`, full `Advertising`, Hijacking, BlockHttpDNS, Privacy, and every approved independent service rule.
- Publish node subscriptions every 6 hours through private Sub-Store outputs; publish profiles and public rules daily.
- Default client chain to `off`, macOS IPv6 to `ipv4-only`, iPhone/iPad IPv6 to `auto`, QUIC to `proxy-block`, DNS to AliDNS plus proxied Cloudflare, and blocking to `balanced`.
- License the repository as `GPL-2.0-only` and preserve Blackmatrix7 attribution and modification metadata.
- Do not modify, compile, redistribute, or brand a fork of the Anywhere application.

---

## Plan Suite and Required Order

1. [Foundation and Shared Core](2026-08-01-apple-proxy-profiles-foundation.md)
2. [Shadowrocket Migration and Regression](2026-08-01-apple-proxy-profiles-shadowrocket.md)
3. [Egern Generator](2026-08-01-apple-proxy-profiles-egern.md)
4. [Anywhere Subscription and Rules](2026-08-01-apple-proxy-profiles-anywhere.md)
5. [Rule Automation, Pages, Documentation, and GitHub Publication](2026-08-01-apple-proxy-profiles-publishing.md)

Each plan produces a reviewable, independently testable milestone. Do not start a later plan until the previous plan's final verification command passes and its review findings are resolved.

### Task 1: Establish Milestone Tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-08-01-apple-proxy-profiles-roadmap.md`
- Create during execution: `docs/implementation-status.md`

**Interfaces:**
- Consumes: the five linked detailed plans.
- Produces: a checked milestone ledger with commit hashes and verification commands.

- [ ] **Step 1: Create the milestone ledger in the new repository**

```markdown
# Implementation Status

| Milestone | Status | Final commit | Verification |
| --- | --- | --- | --- |
| Foundation and shared core | pending | — | `npm run verify` |
| Shadowrocket migration | pending | — | `npm run verify:shadowrocket` |
| Egern generator | pending | — | `npm run verify:egern` |
| Anywhere generator | pending | — | `npm run verify:anywhere` |
| Publishing and GitHub | pending | — | `npm run verify && npm run check:rules` |
```

- [ ] **Step 2: Commit the ledger with the migrated plan suite**

Run:

```bash
git add docs/implementation-status.md docs/superpowers/plans
git commit -m "docs: add multi-client implementation roadmap"
```

Expected: one commit containing only planning and status files.

### Task 2: Execute Milestones Through Review Gates

**Files:**
- Modify after each milestone: `docs/implementation-status.md`

**Interfaces:**
- Consumes: each milestone's final commit and verification output.
- Produces: an auditable status row before the next milestone starts.

- [ ] **Step 1: After each detailed plan passes, replace its `pending` row with `complete`, the exact commit hash, and the exact command run**

The implementation must obtain the short hash from `git rev-parse --short HEAD`, replace the row's status with `complete`, populate the final-commit cell with that command's output, and append `— PASS` to the command already present in the verification cell.

- [ ] **Step 2: Run the full local gate after all five milestones**

Run:

```bash
npm ci
npm run verify
npm run check:rules
git status --short
```

Expected: all commands pass and `git status --short` prints nothing.

- [ ] **Step 3: Commit the completed ledger**

```bash
git add docs/implementation-status.md
git commit -m "docs: record multi-client implementation completion"
```
