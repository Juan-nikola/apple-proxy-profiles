# HAPP Latest-Only User Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the HAPP user-facing channel parameter and bind every HAPP output to the latest validated public snapshot.

**Architecture:** HAPP uses a fixed `current` public path as the single latest user entry. Internal publication channels remain available to the release system and other clients. HAPP JSON continues to own Xray routing; the provider Profile only binds GeoData and Tunnel DNS according to the official Restricted Mode contract.

**Tech Stack:** Node.js ES modules, Node test runner, Sub-Store URL fragments, HAPP JSON, official HAPP routing Profile.

**Spec:** `docs/superpowers/specs/2026-08-20-happ-latest-only-design.md`

## Global Constraints

- HAPP task fragments must not expose `channel`.
- HAPP generated Profile URLs must always use `/current/happ/`.
- Other clients' channel contracts remain unchanged.
- Users must delete and re-import old HAPP subscriptions, then reconnect after GeoData download.

---

### Task 1: Fix HAPP parameter and Profile contract

**Files:** `clients/happ/src/options.js`, `clients/happ/src/substore-config-entry.js`, `clients/happ/src/substore-audit-entry.js`, `clients/happ/src/audit.js`

- [ ] Add failing tests that reject HAPP `channel` and assert fixed `current` Profile URLs.
- [ ] Run the HAPP tests and observe the failures.
- [ ] Remove `channel` from HAPP accepted options and use fixed `current` for Profile/audit metadata.
- [ ] Run the HAPP tests again.

### Task 2: Remove HAPP channel from generated Sub-Store tasks

**Files:** `scripts/configure-substore.mjs`, `scripts/check-substore-task.mjs`, `test/substore-task-check.test.js`, `test/private-substore-config.test.js`

- [ ] Add failing tests for channel-free HAPP task fragments and fixed current paths.
- [ ] Update only HAPP task construction and validation; preserve other clients' channel parameters.
- [ ] Run task-contract tests.

### Task 3: Update HAPP documentation and fixtures

**Files:** HAPP docs, root README, HAPP tests, generated HAPP scripts/examples as required.

- [ ] Add documentation assertions for one latest-only HAPP entry and official reconnect behavior.
- [ ] Replace stale HAPP edge instructions and expected URLs.
- [ ] Rebuild fixtures and public HAPP scripts.

### Task 4: Verify

- [ ] Run HAPP tests, task-contract tests, documentation tests, build, fixtures, secret/action checks, and `git diff --check`.
- [ ] Run official Xray runtime validation for all six HAPP platforms.
