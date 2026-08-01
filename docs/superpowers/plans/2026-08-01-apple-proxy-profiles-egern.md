# Egern Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a private Egern-native node subscription and structurally equivalent macOS, iPhone, and iPad Profile YAML files from the existing Sub-Store collection.

**Architecture:** A deterministic YAML encoder renders JSON-like ESM objects without a runtime package. A protocol adapter maps only verified Egern fields, a policy adapter consumes the shared catalog, and two Sub-Store File Operators produce the private node subscription and platform Profiles.

**Tech Stack:** Node.js 22+, ESM JavaScript, `node:test`, esbuild 0.28.1, Egern Profile YAML, Sub-Store File Script Operators.

## Global Constraints

- Complete the foundation and Shadowrocket plans first.
- Output strings must be deterministic and valid YAML 1.2.
- Use only fields documented by the current official Egern proxy, policy group, rule, DNS, and configuration references.
- Keep the private Egern node URL only in Sub-Store arguments and generated private Profiles.
- Match Shadowrocket group names, order, candidates, defaults, hidden helpers, and platform network intent except for the unavailable homepage `PROXY` UI mechanism.
- Default the Egern `🚀 节点选择` to a manual group that directly mounts the private node subscription.
- Filter unsupported nodes before rendering and fail if no compatible node remains.

---

## Target File Structure

```text
clients/egern/package.json
clients/egern/src/{options,render-yaml,render-node,render-subscription,render-groups,render-dns,render-rules,render-profile,validate-profile}.js
clients/egern/src/{substore-nodes-entry,substore-profile-entry}.js
clients/egern/scripts/{build,render-fixtures}.mjs
clients/egern/test/*.test.js
clients/egern/dist/{substore-node-generator,substore-profile-generator}.js
clients/egern/examples/egern-{macos,iphone,ipad}.yaml
clients/egern/docs/{deployment,canary,troubleshooting}.md
```

### Task 1: Build a Deterministic YAML Encoder

**Files:**
- Create: `clients/egern/package.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `clients/egern/src/render-yaml.js`
- Create: `clients/egern/test/yaml.test.js`

**Interfaces:**
- Produces: `renderYaml(value): string`.
- Accepts: `null`, booleans, finite numbers, strings, arrays, and plain objects.
- Rejects: `undefined`, functions, symbols, non-finite numbers, cyclic values, and non-plain objects.

- [ ] **Step 1: Write failing scalar, nesting, and rejection tests**

```js
test("renders deterministic YAML with JSON-safe strings", () => {
  assert.equal(renderYaml({ ipv6: false, proxies: [{ vless: { name: "🇺🇸 Node: 1", port: 443 } }] }), [
    "ipv6: false",
    "proxies:",
    "  - vless:",
    "      name: \"🇺🇸 Node: 1\"",
    "      port: 443",
    "",
  ].join("\n"));
});

test("rejects values that cannot be represented safely", () => {
  assert.throws(() => renderYaml({ token: undefined }), /Unsupported YAML value at token/);
  assert.throws(() => renderYaml({ value: Number.NaN }), /finite number/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/yaml.test.js`

Expected: FAIL because `renderYaml` does not exist.

- [ ] **Step 3: Implement the encoder**

Render every string with `JSON.stringify`, plain object keys in insertion order, arrays as block sequences, empty arrays as `[]`, and empty objects as `{}`. Track the active object stack with `WeakSet` and include a dotted property path in every error.

- [ ] **Step 4: Define workspace scripts and update the lockfile**

Set `clients/egern/package.json` to:

```json
{
  "name": "@apple-proxy-profiles/egern",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test test",
    "build": "node scripts/build.mjs",
    "fixtures": "node scripts/render-fixtures.mjs",
    "verify": "npm run test && npm run build && npm run fixtures"
  }
}
```

Add root script `"verify:egern": "npm --workspace @apple-proxy-profiles/egern run verify"`, then run `npm install --package-lock-only` so the workspace is recorded without changing dependency versions.

- [ ] **Step 5: Run tests**

Run: `node --test clients/egern/test/yaml.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json clients/egern/package.json clients/egern/src/render-yaml.js clients/egern/test/yaml.test.js
git commit -m "feat: add deterministic Egern YAML rendering"
```

### Task 2: Map Verified Proxy Protocols

**Files:**
- Create: `clients/egern/src/render-node.js`
- Create: `clients/egern/src/render-subscription.js`
- Create: `clients/egern/test/nodes.test.js`
- Create: `clients/egern/test/fixtures/nodes.js`
- Modify: `shared/nodes/capabilities.js`

**Interfaces:**
- Consumes: normalized, Egern-compatible nodes.
- Produces: `toEgernProxy(node, { clientChain }): object` with one top-level protocol key.
- Produces: `renderEgernSubscription(nodes, options): string` whose root is `{ proxies: [...] }`.

- [ ] **Step 1: Add explicit protocol fixtures and failing tests**

Create fake reserved-address fixtures for Shadowsocks 2022, Snell v4, VLESS TCP+Reality, VLESS WSS, VLESS gRPC+Reality, Trojan, AnyTLS, Hysteria2, TUIC, SOCKS5, and one unsupported VLESS transport.

```js
test("maps VLESS Reality into Egern TLS transport", () => {
  assert.deepEqual(toEgernProxy(vlessReality, { clientChain: "off" }), {
    vless: {
      name: vlessReality.name,
      server: "vless.example.invalid",
      port: 443,
      user_id: "00000000-0000-4000-8000-000000000001",
      udp_relay: true,
      flow: "xtls-rprx-vision",
      transport: { tls: { sni: "www.example.com", reality: { public_key: "TEST_ONLY_PUBLIC_KEY", short_id: "0123abcd" } } },
    },
  });
});
```

Also assert Shadowsocks maps `cipher` to `method`, Hysteria2 maps `password` to `auth`, and no output includes `_profile` or Sub-Store provenance keys.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/nodes.test.js`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement common and protocol fields**

Common output fields are `name`, `server`, and numeric `port`. Map:

- `ss|shadowsocks` → `shadowsocks` with `method`, `password`, `udp_relay`.
- `snell` → `snell` with `psk`, numeric `version`, `udp_relay`, `reuse`, `obfs`, `obfs_host` when present.
- `trojan` → `trojan` with `password`, `sni`, `udp_relay`, `skip_tls_verify`, `reality`, `websocket` only when the corresponding verified source fields exist.
- `anytls` → `anytls` with `password`, `sni`, `udp_relay`, `skip_tls_verify`.
- `hysteria2|hy2` → `hysteria2` with `auth`, `sni`, `obfs=salamander`, `obfs_password`, `skip_tls_verify`, `port_hopping`, `port_hopping_interval`, `bandwidth`.
- `tuic` → `tuic` with `uuid`, `password`, `udp_relay_mode`, `alpn`, `sni`, `skip_tls_verify`, hopping fields.
- `socks5` → `socks5` with optional `username`, `password`, `udp_relay`.
- `vless` → `vless` with `user_id`, `flow`, `udp_relay`, and transport mapping below.

- [ ] **Step 4: Implement VLESS transports without downgrades**

Map `tcp` plus TLS/Reality to `transport.tls`; raw TCP omits `transport`. Map `ws` to `transport.ws` without TLS and `transport.wss` with TLS. Map `grpc` to `transport.grpc` with `service_name`, SNI, certificate settings, and optional Reality. Map `h2` to `transport.http2`. Reject any unrecognized network with `Unsupported Egern VLESS transport: ${network}` while ensuring the interpolated value is an allowlisted transport label, never endpoint data.

- [ ] **Step 5: Render the subscription and run tests**

`renderEgernSubscription` must call `filterNodesForClient(nodes, CLIENT.egern)`, map accepted nodes, enforce unique names, and render `{ proxies }`.

Run:

```bash
node --test clients/egern/test/nodes.test.js test/capabilities.test.js
npm run check:secrets
```

Expected: PASS; the secret scanner only scans tracked fake fixtures and reports no real secret.

- [ ] **Step 6: Commit**

```bash
git add clients/egern/src clients/egern/test shared/nodes/capabilities.js
git commit -m "feat: render Egern proxy subscriptions"
```

### Task 3: Parse Egern Options and Render Platform Networking

**Files:**
- Create: `clients/egern/src/options.js`
- Create: `clients/egern/src/render-dns.js`
- Create: `clients/egern/test/options.test.js`
- Create: `clients/egern/test/dns.test.js`

**Interfaces:**
- Produces: `parseEgernOptions(raw): EgernOptions`.
- Produces: `renderEgernDns(options): object`.
- Required profile fields: `output=config`, `type=collection`, `name`, `nodeSubscriptionUrl`, `platform`.

- [ ] **Step 1: Write the option matrix tests**

Assert macOS defaults to `ipv4-only`, iPhone/iPad to `auto`, all platforms default to `stable`, AliDNS, Cloudflare, balanced, proxy-block, automatic group mode, and chain off. Reject an HTTP `nodeSubscriptionUrl`; require HTTPS and reject credentials in the authority.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/options.test.js clients/egern/test/dns.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement strict option parsing**

Reuse shared enum arrays, reject unknown non-internal keys, preserve the private URL only in returned options, and never include it in an error message.

- [ ] **Step 4: Render DNS mode objects**

For stable mode render:

```js
{
  bootstrap: ["system"],
  upstreams: {
    china: ["https://dns.alidns.com/dns-query"],
    global: ["https://cloudflare-dns.com/dns-query"],
  },
  forward: [
    { proxy_rule_set: { match: `${publicBaseUrl}/egern/china-domains.yaml`, value: "china" } },
    { wildcard: { match: "*", value: "global" } },
  ],
}
```

Privacy forces the global upstream for the catch-all; speed uses system/china first. Always render the stable documented `proxy_nameservers: ["system"]` bootstrap so proxy hostnames resolve outside the proxied DoH path and cannot create a DNS loop.

- [ ] **Step 5: Run tests and commit**

```bash
node --test clients/egern/test/options.test.js clients/egern/test/dns.test.js
git add clients/egern/src/options.js clients/egern/src/render-dns.js clients/egern/test
git commit -m "feat: add Egern platform network options"
```

### Task 4: Render Structurally Equivalent Policy Groups

**Files:**
- Create: `clients/egern/src/render-groups.js`
- Create: `clients/egern/test/groups.test.js`

**Interfaces:**
- Consumes: `PolicyGroup[]` and `nodeSubscriptionUrl`.
- Produces: `renderEgernGroups(groups, nodeSubscriptionUrl): object[]`.

- [ ] **Step 1: Write failing structure tests**

Assert:

- `🚀 节点选择` is `select` with `urls: [nodeSubscriptionUrl]`.
- Auto groups use `auto_test`; fallback groups use `fallback`.
- Node-filtered groups include the URL and `filter`.
- Hidden helpers set `hidden: true`.
- The 10 foreign service groups begin with `🚀 节点选择`; the six domestic groups begin with `DIRECT`.
- Every referenced policy name exists or is `DIRECT`/`REJECT`.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/groups.test.js`

Expected: FAIL because the renderer is missing.

- [ ] **Step 3: Map shared strategies**

Render each item as `{ [egernType]: fields }`, mapping `select`, `auto-test → auto_test`, and `fallback`. Add `policies` only when non-empty, `urls` only for node-filtered groups, and `filter`, `interval`, `tolerance`, `timeout`, `hidden` only when defined.

- [ ] **Step 4: Validate names and references**

Reject duplicate names, missing references, cycles, CR/LF, and a node subscription URL that differs from the already validated option value.

- [ ] **Step 5: Run and commit**

```bash
node --test clients/egern/test/groups.test.js
git add clients/egern/src/render-groups.js clients/egern/test/groups.test.js
git commit -m "feat: render Egern policy group hierarchy"
```

### Task 5: Compose and Validate Egern Profiles

**Files:**
- Create: `clients/egern/src/render-rules.js`
- Create: `clients/egern/src/render-profile.js`
- Create: `clients/egern/src/validate-profile.js`
- Create: `clients/egern/test/profile.test.js`
- Create: `clients/egern/test/validation.test.js`

**Interfaces:**
- Produces: `renderEgernRules({ publicBaseUrl }): object[]`.
- Produces: `renderEgernProfile(rawOptions, nodes): string`.
- Produces: `validateEgernProfile(profile): { valid: boolean, errors: string[] }`.

- [ ] **Step 1: Write failing complete-profile tests**

Assert the root contains `auto_update`, `ipv6`, `block_quic`, `close_connections_on_policy_change`, `bypass_tunnel_proxy`, `real_ip_domains`, `hijack_dns`, `dns`, `policy_groups`, `rules`, and `default_subscription_group`. Assert it does not contain `proxies`, `mitm`, private node values, or unsupported platforms.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/profile.test.js clients/egern/test/validation.test.js`

Expected: FAIL because composition and validation are absent.

- [ ] **Step 3: Render ordered rule-set references**

For each shared rule assignment render:

```js
{ rule_set: { match: `${publicBaseUrl}/egern/rules/${sourceId}.yaml`, policy, update_interval: 86400 } }
```

Append `{ geoip: { match: "CN", policy: "DIRECT", no_resolve: true } }` and `{ default: { policy: "🚀 节点选择" } }` in that order.

- [ ] **Step 4: Compose platform settings and validate references**

Use `ipv6: options.ipv6Mode === "auto"`, `block_quic: false`, and set `block_quic: true` on proxy-first groups when `quicMode=proxy-block`. The validator must parse the deterministic subset, check unique proxy group names, group references, rule policies, required DNS keys, HTTPS URLs, and absence of inline proxy credentials.

- [ ] **Step 5: Run tests and commit**

```bash
node --test clients/egern/test/profile.test.js clients/egern/test/validation.test.js
git add clients/egern/src clients/egern/test
git commit -m "feat: compose validated Egern profiles"
```

### Task 6: Bundle Sub-Store File Operators and Fixtures

**Files:**
- Create: `clients/egern/src/substore-nodes-entry.js`
- Create: `clients/egern/src/substore-profile-entry.js`
- Create: `clients/egern/scripts/build.mjs`
- Create: `clients/egern/scripts/render-fixtures.mjs`
- Create: `clients/egern/test/substore.test.js`
- Create: `clients/egern/test/bundles.test.js`
- Create: `clients/egern/dist/substore-node-generator.js`
- Create: `clients/egern/dist/substore-profile-generator.js`
- Create: `clients/egern/examples/egern-{macos,iphone,ipad}.yaml`

**Interfaces:**
- Both operators use `context.produceArtifact({ type, name, platform: "JSON", produceType: "internal" })`.
- Both return `{ ...input, $content }`.
- Node args: `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off|on`.
- Profile args add `nodeSubscriptionUrl`, `platform`, and the shared network options.

- [ ] **Step 1: Write failing integration tests**

Use fake `produceArtifact` nodes and assert the node operator returns a `proxies:` YAML file, the profile operator returns `policy_groups:` without credentials, empty compatible inventories fail closed, and diagnostics contain counts only.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/substore.test.js clients/egern/test/bundles.test.js`

Expected: FAIL because entries and bundles are absent.

- [ ] **Step 3: Implement entries and esbuild targets**

Use two IIFE globals, `EgernNodeBundle` and `EgernProfileBundle`, and wrappers named `operator(input, targetPlatform)`. Inject `$arguments`, `produceArtifact`, and `console` exactly as the Shadowrocket File bundle does.

- [ ] **Step 4: Generate fixtures with a reserved private URL**

Use `https://example.invalid/private/egern-nodes` and synthetic nodes only. Generate all three platform examples and validate each before writing.

- [ ] **Step 5: Run workspace verification**

Add scripts `test`, `build`, `fixtures`, and `verify` to the Egern package, then run:

```bash
npm --workspace @apple-proxy-profiles/egern run verify
npm run check:secrets
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add clients/egern/package.json clients/egern/src clients/egern/scripts clients/egern/test clients/egern/dist clients/egern/examples
git commit -m "build: bundle Egern Sub-Store generators"
```

### Task 7: Write Egern Deployment and Canary Documentation

**Files:**
- Create: `clients/egern/README.md`
- Create: `clients/egern/docs/deployment.md`
- Create: `clients/egern/docs/canary.md`
- Create: `clients/egern/docs/troubleshooting.md`
- Create: `clients/egern/test/docs.test.js`

**Interfaces:**
- Produces beginner-safe steps for `egern-nodes`, three platform Profiles, private URL handling, Intel Mac first rollout, and rollback.

- [ ] **Step 1: Write failing documentation tests**

Assert docs contain exact output names, 6-hour/24-hour intervals, macOS/iPhone/iPad order, HTTPS decryption warning, old Profile retention, node count check, policy group check, DNS/IPv6/QUIC tests, and the `egern:/profiles/new` import pattern.

- [ ] **Step 2: Run and verify failure**

Run: `node --test clients/egern/test/docs.test.js`

Expected: FAIL because docs are absent.

- [ ] **Step 3: Write the docs with copy-safe parameter examples**

Use `https://example.invalid/private/egern-nodes` in examples and explicitly tell users to replace it only inside private Sub-Store arguments. Never show the shape of a real subscription token.

- [ ] **Step 4: Verify and commit**

```bash
node --test clients/egern/test/docs.test.js
npm --workspace @apple-proxy-profiles/egern run verify
git add clients/egern/README.md clients/egern/docs clients/egern/test/docs.test.js
git commit -m "docs: add Egern deployment and canary guide"
```

### Task 8: Verify the Egern Milestone

**Files:**
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: a complete Egern generator ready for live rule URLs and device canary.

- [ ] **Step 1: Run the milestone gate**

```bash
npm ci
npm --workspace @apple-proxy-profiles/egern run verify
npm run verify:shadowrocket
npm run check:secrets
git diff --check
git status --short
```

Expected: PASS and empty status.

- [ ] **Step 2: Record and commit the milestone**

```bash
git add docs/implementation-status.md
git commit -m "docs: record Egern generator milestone"
```
