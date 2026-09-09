# v2rayN Xray Policy Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make v2rayN Xray output support business policy groups that follow the default proxy, fixed nodes, direct, block, and automatic selection.

**Architecture:** Keep node subscription generation separate from full JSON profile generation. Add Xray-compatible selector/balancer outbounds and route business GeoData rules to stable policy tags.

**Tech Stack:** Node.js ES modules, JSON, node:test, Xray JSON schema.

**Spec:** `docs/superpowers/specs/2026-08-22-v2rayn-v2box-unified-rule-integration-design.md`

## Global Constraints

- Preserve existing sing-box output and other client renderers.
- Keep fail-closed behavior for missing or incompatible nodes.
- Reuse the existing 12 unified business targets.

### Task 1: Inspect and extend Xray renderer

**Files:** `clients/v2rayn/src/render-profile.js`, `clients/v2rayn/test/profile.test.js`

- [ ] Add policy-group tags and node membership generation.
- [ ] Route business sources to policy tags by default.
- [ ] Preserve explicit fixed-node/direct/block overrides.
- [ ] Add tests for group creation and routing targets.

### Task 2: Wire policy defaults and rebuild bundles

**Files:** `clients/v2rayn/src/substore-config-entry.js`, generated `clients/v2rayn/dist/*`

- [ ] Pass policy resolution and group settings through the renderer.
- [ ] Rebuild workspace bundles.
- [ ] Run v2rayn and full test suites.

### Task 3: Verify generated Xray profiles

**Files:** existing verification scripts/tests

- [ ] Run targeted tests.
- [ ] Run `npm run verify:v2rayn` and full `npm test`.
- [ ] Run Xray `-test` when binary is available and report any environment limitation.
