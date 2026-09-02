# INCY Single-Config Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the published INCY iPhone/macOS subscriptions start reliably on INCY 3.7.2 while retaining complete multi-node business routing.

**Architecture:** Keep the existing HAPP-style JSON-array renderer as the explicit `format=array` path. Add an official INCY full-Xray single-object path that aggregates every selected node into one config, uses an observed least-ping node balancer for the default route and DNS, and preserves fixed business-target balancers and domestic-first routing. Point the production Sub-Store INCY tasks at `format=single`.

**Tech Stack:** Node.js 22, native `node:test`, esbuild bundles, Sub-Store File tasks, Xray JSON configuration.

**Spec:** `clients/incy/docs/deployment.md` and official INCY full-Xray configuration contract.

## Global Constraints

- Follow official INCY full-Xray JSON detection: one object containing `inbounds` and `outbounds`.
- Preserve fail-closed handling for unsupported selected nodes.
- Preserve domain-first `IPIfNonMatch` routing and existing policy target resolution.
- Do not expose node credentials, private policy contents, or user tokens.

### Task 1: Add the single-object contract test

**Files:**
- Modify: `clients/incy/test/options.test.js`
- Modify: `clients/incy/test/subscription.test.js`
- Modify: `clients/incy/test/substore-entry.test.js`

- [ ] **Step 1: Write failing tests** for `format=single`, including one plain object output, all input nodes represented as follow outbounds, a default least-ping balancer, and a Sub-Store response whose parsed `$content` is an object rather than an array.
- [ ] **Step 2: Run the focused tests** and confirm they fail because `format` is currently rejected and the renderer always returns arrays.

### Task 2: Implement the aggregate renderer

**Files:**
- Modify: `clients/incy/src/options.js`
- Modify: `clients/incy/src/render-subscription.js`
- Modify: `clients/incy/src/validate-subscription.js`
- Modify: `clients/incy/src/substore-config-entry.js`
- Modify: `scripts/check-substore-task.mjs`

- [ ] **Step 1: Add `format` parsing** with values `array` and `single`, defaulting to `array` for backward compatibility.
- [ ] **Step 2: Build a single full-Xray object** with shared inbounds, all unique node outbounds, shared direct/block outbounds, one aggregate observed node balancer, fixed policy balancers with aggregate fallback, aggregate DNS, and the same routing plan.
- [ ] **Step 3: Validate both output forms** without weakening the existing per-config validation; validate the single object as one-element full-Xray content.
- [ ] **Step 4: Return either the array or object according to `options.format` and keep response headers/autorouting unchanged.
- [ ] **Step 5: Allow and self-check `format` in production task URLs.

### Task 3: Update documentation, tasks, and generated artifacts

**Files:**
- Modify: `scripts/configure-substore.mjs`
- Modify: `clients/incy/README.md`
- Modify: `clients/incy/docs/deployment.md`
- Modify: `clients/incy/docs/troubleshooting.md`
- Regenerate: `clients/incy/dist/*`, `public/current/incy/*`, publication manifests

- [ ] **Step 1: Point all INCY production File tasks to `format=single` and document `format=array` as the compatibility/advanced option.
- [ ] **Step 2: Rebuild the INCY bundles and site artifacts.
- [ ] **Step 3: Run focused and full verification suites.
- [ ] **Step 4: Preview and download the real remote iPhone/macOS tasks, verify each is a JSON object, and run Xray `run -test` against both.
- [ ] **Step 5: Publish the final artifacts and verify HTTP responses and hashes.

