# v2rayN JSON Business Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make v2rayN configuration output apply the unified `apple-proxy-policy` JSON to built-in Xray business categories even when Sub-Store does not provide external GeoData.

**Architecture:** Keep node subscription output unchanged. The v2rayN config renderer will add a compact built-in Xray category layer for the business sources that Xray ships, resolve each category through the already-loaded unified policy, and retain `proxy` only for `FOLLOW` and the ordinary overseas/final fallback. Fixed `NODE:<name>` policy targets remain separate `ap-fixed-*` outbounds and are not replaceable by the client’s active node.

**Tech Stack:** Node.js 22+, native `node:test`, ES modules, esbuild, Xray JSON routing.

**Spec:** `docs/superpowers/specs/2026-08-22-v2rayn-v2box-unified-rule-integration-design.md`

## Global Constraints

- The unified `apple-proxy-policy` JSON is the single source of business-target decisions.
- `NODE:<name>` targets are rendered as fixed `ap-fixed-*` outbounds; clients cannot override them.
- `FOLLOW` targets use v2rayN’s `proxy` active-node selector.
- The node-only v2rayN operator does not read the policy artifact.
- No private subscription URL, node server, UUID, port, or complete policy encoding may be written to public outputs or user-facing responses.
- Xray GeoData references must remain legal; do not reintroduce `ext:*` references when external GeoData is absent.

### Task 1: Complete failing regression coverage

**Files:**
- Modify: `clients/v2rayn/test/profile.test.js`
- Modify: `clients/v2rayn/test/substore-entry.test.js`

**Interfaces:**
- Consumes: `renderV2rayNProfile()` and the v2rayN Sub-Store config operator.
- Produces: assertions that `geosite:openai` and `geosite:github` are present without external GeoData and resolve to the policy target.

- [x] **Step 1: Write the failing tests**

  The tests assert that an AI target fixed in the unified resolution becomes `ap-fixed-0`, while a `FOLLOW` GitHub target remains `proxy`.

- [x] **Step 2: Run the focused tests to verify the correct failure**

  Run:

  ```bash
  node --test clients/v2rayn/test/profile.test.js clients/v2rayn/test/substore-entry.test.js
  ```

  Expected before implementation: the new AI assertions fail because no `geosite:openai` rule is emitted without GeoData.

### Task 2: Render policy-controlled built-in business categories

**Files:**
- Modify: `clients/v2rayn/src/render-profile.js`

**Interfaces:**
- Consumes: `policyResolution.targets`, `policyForRuleSource()`, `businessTargetByKey()`, and the existing fixed-node tag maps.
- Produces: routing rules using legal built-in Xray `geosite:` categories, with the same `direct`, `block`, fixed `ap-fixed-*`, and `proxy` target semantics already used by external GeoData rules.

- [ ] **Step 1: Add the built-in source/category mapping**

  Define a local immutable mapping for the supported Xray categories: `OpenAI → openai`, `Claude → anthropic`, `Gemini → google-gemini`, `Copilot → github-copilot`, `GitHub → github`, `YouTube → youtube`, the media categories, the social categories, and `OverseasGame → category-games-!cn`. Keep all source IDs passed through `actionForSource()`.

- [ ] **Step 2: Add built-in rules only when external GeoData is unavailable**

  When `geoReferences()` returns no external assets, emit the mapped built-in category rules before the ordinary `geosite:geolocation-!cn` fallback. Each rule must use the action returned by `actionForSource()` and a stable `ruleTag` such as `builtin-source-OpenAI`.

- [ ] **Step 3: Preserve external-asset behavior**

  When valid external GeoData is supplied, keep the existing `ext:<name>.dat:<code>` rules and do not duplicate the built-in source layer. Keep manifest validation unchanged.

- [ ] **Step 4: Run the focused tests to verify green**

  Run:

  ```bash
  node --test clients/v2rayn/test/profile.test.js clients/v2rayn/test/substore-entry.test.js
  ```

  Expected: all focused tests pass, including fixed AI routing and `FOLLOW` GitHub routing.

### Task 3: Verify, build, and inspect generated artifacts

**Files:**
- Modify: `clients/v2rayn/dist/substore-config-generator.js`
- Modify: `clients/v2rayn/dist/substore-node-generator.js` only if the build changes it
- Modify: generated v2rayN fixtures under `clients/v2rayn/examples/` only if the fixture renderer requires it

**Interfaces:**
- Consumes: the source renderer and existing build/fixture scripts.
- Produces: bundled Sub-Store generators and fixtures containing the new built-in routing layer.

- [ ] **Step 1: Run v2rayN verification**

  Run:

  ```bash
  npm run verify:v2rayn
  ```

- [ ] **Step 2: Run the full repository test suite**

  Run:

  ```bash
  npm test
  ```

- [ ] **Step 3: Validate a rendered config with the installed Xray core**

  Render a sanitized fixture config, run the local Xray config-check command used by the repository, and require exit code 0 with `Configuration OK`. Verify the config contains no `ext:AppleProxy...` references when GeoData is absent and contains the fixed outbound plus `geosite:openai` rule.

- [ ] **Step 4: Rebuild generated v2rayN outputs**

  Run:

  ```bash
  npm --workspace @apple-proxy-profiles/v2rayn run build
  npm --workspace @apple-proxy-profiles/v2rayn run fixtures
  ```

### Task 4: Publish and verify the task surface

**Files:**
- Modify: generated public v2rayN scripts only through the repository’s existing build/publish workflow.

**Interfaces:**
- Consumes: verified source and bundled generators.
- Produces: updated public generator hash and a private Sub-Store config that resolves the saved policy.

- [ ] **Step 1: Inspect the diff and secret scan**

  Run `git diff --check`, `git status --short`, and the existing v2rayN secret check. Confirm no private node material is staged.

- [ ] **Step 2: Commit and push only after verification**

  Use a focused commit message describing JSON-controlled built-in v2rayN business routing, then push the current branch according to the repository workflow.

- [ ] **Step 3: Re-fetch the private Sub-Store preview without exposing secrets**

  Confirm that the active policy resolves AI to the intended fixed node and that the generated v2rayN config has the fixed outbound and `geosite:openai` routing rule. Do not save external Sub-Store changes without a fresh user confirmation.

## Self-Review Checklist

- [x] Root cause traced to the missing no-GeoData business rule layer.
- [x] Regression tests fail for the missing `geosite:openai` behavior before production changes.
- [ ] `FOLLOW`, `DIRECT`, and fixed-node policy targets each have an executable assertion.
- [ ] Focused tests, v2rayN verification, full tests, build, and Xray config validation all produce fresh passing evidence.
- [ ] Generated artifacts contain no private subscription or node credentials.
