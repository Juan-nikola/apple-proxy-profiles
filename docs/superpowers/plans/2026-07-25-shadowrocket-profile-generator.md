# Shadowrocket Profile Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, and document a Sub-Store-powered Shadowrocket node normalizer plus separate macOS, iPhone, and iPad configuration Profiles that implement the approved routing, DNS, grouping, privacy, safety, and rollback design.

**Architecture:** Keep all policy logic in small ESM pure-function modules, then expose two bundled Sub-Store scripts: a collection Script Operator that returns normalized internal nodes, and a File Script Operator that calls `produceArtifact()` and returns a Shadowrocket INI Profile. The Profile references the private normalized node subscription by name, while public rules, generated examples, tests, and diagnostics never contain node credentials.

**Tech Stack:** Node.js 22+, ESM JavaScript, Node built-in test runner and assertions, esbuild single-file bundles, Shadowrocket INI/Profile syntax, Sub-Store Script Operator API, Blackmatrix7 Shadowrocket rule lists.

## Global Constraints

- This is an independent Git project at `/Users/sunyuze/Documents/代理项目/shadowrocket-profile`; do not modify the neighboring sing-box project.
- Support the latest stable Shadowrocket on iPhone, iPad, Intel/Apple Silicon Mac; reserve `platform=appletv` without making Apple TV part of first deployment acceptance.
- Runtime code may not load npm dependencies; esbuild is build-only.
- Do not enable HTTPS decryption, install a root certificate, change request bodies, forge GPS, or promise that a proxy alone changes a platform's displayed comment region.
- Keep the node subscription and configuration Profile as separate Sub-Store files.
- Never write a real server, credential, UUID, PSK, private key, token, subscription URL, or Profile URL to source, examples, tests, snapshots, logs, or diagnostics.
- Source labels are case-insensitive and normalize to `[机场]`, `[自建]`, `[Realm]`, `[链式代理]`, and `[落地]`.
- Existing flags win, the leftmost flag wins conflicts, flags are never duplicated, and uncertain locations remain `🌐 其他/未分类`.
- Default parameters are `dnsMode=stable`, `blockMode=balanced`, `quicMode=allow`, `ipv6Mode=auto`, `autoGroupMode=auto`, and `clientChain=off`.
- Unknown or missing required parameters fail generation; empty or wholly invalid collections fail closed and never publish an empty subscription.
- Node refresh is every 6 hours; Profile and remote rules refresh every 24 hours.
- Remote rules use pinned catalog paths and runtime cache behavior; a failed first deployment stops rollout, while an installed client may keep its last usable cache.
- Deployment order is Intel Mac canary, iPhone, then iPad, with the old subscription and Profile retained for immediate rollback.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` | Node version, scripts, and build-only esbuild dependency |
| `src/contracts.js` | JSDoc types and shared frozen enums |
| `src/options.js` | Strict Sub-Store parameter parsing and platform presets |
| `src/source-labels.js` | Source metadata extraction and normalized source category |
| `src/regions.js` | Flag, text, city, airport-code, and continent classification |
| `src/node-validation.js` | Pseudo-node filtering, protocol field validation, TLS and UDP facts |
| `src/node-identity.js` | Sensitive in-memory fingerprinting, deduplication, stable display names |
| `src/normalize-nodes.js` | Normalization pipeline, safe diagnostics, P2P/game/entry metadata |
| `src/client-chain.js` | Optional `[落地]` clone generation with `underlying-proxy` |
| `src/group-catalog.js` | Visible and hidden group definitions and regex membership |
| `src/render-groups.js` | Shadowrocket `[Proxy Group]` lines |
| `src/custom-rules.js` | Four deliberately small user-maintained rule arrays |
| `src/rule-catalog.js` | Remote rule URL, policy, order, and minimum-size declarations |
| `src/render-rules.js` | LAN, custom, public, GEOIP, QUIC, and FINAL rule ordering |
| `src/dns.js` | DNS provider/mode mapping with non-circular bootstrap behavior |
| `src/general.js` | Platform, IPv6, QUIC, LAN, chain-failure, and resolver settings |
| `src/render-profile.js` | Deterministic complete INI rendering |
| `src/validate-profile.js` | Duplicate, missing-reference, cycle, order, and safety validation |
| `src/diagnostics.js` | Aggregate-only redacted diagnostics |
| `src/substore-node-entry.js` | Functional Sub-Store collection Script Operator entry |
| `src/substore-profile-entry.js` | Sub-Store File Script Operator entry using `produceArtifact()` |
| `scripts/build.mjs` | Two esbuild bundles and deterministic artifact checks |
| `scripts/check-rules.mjs` | HTTP/status/content/size/format health checks |
| `scripts/check-secrets.mjs` | High-signal secret scan over tracked and generated files |
| `scripts/render-fixtures.mjs` | Safe macOS/iPhone/iPad sample Profiles for inspection |
| `test/fixtures/nodes.js` | Entirely synthetic node fixtures for every relevant protocol/category |
| `test/*.test.js` | Unit, integration, regression, contract, and security tests |
| `examples/*.conf` | Generated credential-free example Profiles |
| `docs/deployment.md` | Zero-knowledge Sub-Store and per-device deployment walkthrough |
| `docs/maintenance.md` | One-page routine maintenance and switching reference |
| `docs/troubleshooting.md` | Failure diagnosis, redaction, and rollback |
| `THIRD_PARTY_NOTICES.md` | Rule-source URLs, licenses, and attribution |
| `dist/substore-node-operator.js` | Bundled node Script Operator |
| `dist/substore-profile-generator.js` | Bundled File Script Operator |

The Sub-Store contracts used here are the current upstream contracts:

```js
async function operator(proxies = [], targetPlatform, context) {
  return proxies;
}

const internal = await produceArtifact({
  type: "collection",
  name: "shadowrocket-sources",
  platform: "JSON",
  produceType: "internal",
});
async function operator(input = {}) {
  return { ...input, $content: "rendered profile text" };
}
```

Sub-Store internal node provenance fields are `_subName`, `_subDisplayName`, `_collectionName`, and `_collectionDisplayName`; client chaining uses the portable internal field `underlying-proxy`, which Sub-Store maps to Shadowrocket `chain`.

---

### Task 1: Establish executable contracts and strict options

**Files:**
- Create: `package.json`
- Create: `src/contracts.js`
- Create: `src/options.js`
- Create: `test/options.test.js`

**Interfaces:**
- Consumes: raw Sub-Store `$arguments` as `Record<string, unknown>`.
- Produces: `parseOptions(raw): GeneratorOptions`, `platformPreset(platform): PlatformPreset`, and frozen enums `OPTION_VALUES`, `SOURCE_KIND`, `CONTINENT`.

- [ ] **Step 1: Write the package manifest and failing option tests**

```json
{
  "name": "shadowrocket-profile",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test",
    "build": "node scripts/build.mjs",
    "fixtures": "node scripts/render-fixtures.mjs",
    "check:rules": "node scripts/check-rules.mjs",
    "check:secrets": "node scripts/check-secrets.mjs",
    "verify": "npm test && npm run build && npm run fixtures && npm run check:secrets"
  },
  "devDependencies": {
    "esbuild": "0.28.1"
  }
}
```

```js
// test/options.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { parseOptions, platformPreset } from "../src/options.js";

const required = {
  output: "config",
  type: "collection",
  name: "shadowrocket-sources",
  subscriptionName: "Shadowrocket-Nodes",
  platform: "macos",
};

test("applies approved defaults", () => {
  assert.deepEqual(parseOptions(required), {
    ...required,
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "allow",
    ipv6Mode: "auto",
    autoGroupMode: "auto",
    clientChain: "off",
  });
});

test("rejects a missing collection name and unknown values", () => {
  assert.throws(() => parseOptions({ ...required, name: "" }), /name/);
  assert.throws(() => parseOptions({ ...required, dnsMode: "fastest" }), /dnsMode/);
  assert.throws(() => parseOptions({ ...required, extra: "x" }), /extra/);
});

test("platform presets reduce mobile background testing", () => {
  assert.equal(platformPreset("macos").testInterval, 600);
  assert.equal(platformPreset("iphone").testInterval, 1800);
  assert.equal(platformPreset("ipad").testInterval, 1800);
  assert.equal(platformPreset("appletv").testInterval, 3600);
});
```

- [ ] **Step 2: Run the focused test and confirm the intended failure**

Run: `npm install && node --test test/options.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/options.js`.

- [ ] **Step 3: Implement frozen contracts and exact option parsing**

```js
// src/contracts.js
export const OPTION_VALUES = Object.freeze({
  output: ["nodes", "config"],
  type: ["collection"],
  platform: ["iphone", "ipad", "macos", "appletv"],
  dnsMode: ["stable", "privacy", "speed"],
  chinaDns: ["alidns", "dnspod", "system"],
  globalDns: ["cloudflare", "google", "quad9"],
  blockMode: ["balanced", "security", "strict", "off"],
  quicMode: ["allow", "proxy-block", "all-block"],
  ipv6Mode: ["auto", "ipv4-only"],
  autoGroupMode: ["auto", "full", "balanced", "minimal"],
  clientChain: ["off", "on"],
});

export const SOURCE_KIND = Object.freeze({
  airport: "airport",
  selfHosted: "selfHosted",
  realm: "realm",
  serverChain: "serverChain",
  landing: "landing",
  unknown: "unknown",
});

export const CONTINENT = Object.freeze({
  asiaPacific: "asiaPacific",
  europe: "europe",
  americas: "americas",
  other: "other",
});
```

```js
// src/options.js
import { OPTION_VALUES } from "./contracts.js";

const defaults = Object.freeze({
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "allow",
  ipv6Mode: "auto",
  autoGroupMode: "auto",
  clientChain: "off",
});

const required = ["output", "type", "name", "subscriptionName", "platform"];
const allowed = new Set([...required, ...Object.keys(defaults)]);

export function parseOptions(raw = {}) {
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key) && !key.startsWith("_")) {
      throw new Error(`Unknown option: ${key}`);
    }
  }
  const merged = { ...defaults, ...raw };
  for (const key of required) {
    if (typeof merged[key] !== "string" || merged[key].trim() === "") {
      throw new Error(`Missing required option: ${key}`);
    }
  }
  for (const [key, values] of Object.entries(OPTION_VALUES)) {
    if (key === "name" || key === "subscriptionName") continue;
    if (!values.includes(merged[key])) {
      throw new Error(`Invalid ${key}: ${String(merged[key])}`);
    }
  }
  return Object.fromEntries(
    [...allowed].map((key) => [key, String(merged[key]).trim()]),
  );
}

const presets = Object.freeze({
  macos: { testInterval: 600, timeout: 5, tolerance: 100 },
  iphone: { testInterval: 1800, timeout: 7, tolerance: 150 },
  ipad: { testInterval: 1800, timeout: 7, tolerance: 150 },
  appletv: { testInterval: 3600, timeout: 8, tolerance: 200 },
});

export function platformPreset(platform) {
  const preset = presets[platform];
  if (!preset) throw new Error(`Invalid platform: ${platform}`);
  return preset;
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --test test/options.test.js`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the contracts**

```bash
git add package.json package-lock.json src/contracts.js src/options.js test/options.test.js
git commit -m "feat: define strict generator options"
```

---

### Task 2: Classify sources, regions, and protocol validity

**Files:**
- Create: `src/source-labels.js`
- Create: `src/regions.js`
- Create: `src/node-validation.js`
- Create: `test/fixtures/nodes.js`
- Create: `test/classification.test.js`
- Create: `test/node-validation.test.js`

**Interfaces:**
- Consumes: Sub-Store internal node objects with `name`, `type`, `server`, `port`, and provenance fields.
- Produces: `classifySource(node): SourceInfo`, `classifyRegion(name): RegionInfo`, `validateNode(node): ValidationResult`, `hasExplicitUdp(node): boolean`.

- [ ] **Step 1: Add synthetic fixtures and failing classification tests**

```js
// test/fixtures/nodes.js
export const fakeNodes = Object.freeze([
  { name: "🇯🇵 Tokyo A", type: "ss", server: "198.51.100.10", port: 443, cipher: "2022-blake3-aes-128-gcm", password: "TEST_ONLY_NOT_A_SECRET", udp: true, _subDisplayName: "[机场]示例一" },
  { name: "US-LAX", type: "snell", server: "example.invalid", port: 443, psk: "TEST_ONLY_NOT_A_SECRET", version: 4, udp: false, _subName: "[自建]Snell" },
  { name: "DE Frankfurt", type: "vless", server: "203.0.113.20", port: 443, uuid: "00000000-0000-4000-8000-000000000001", tls: true, servername: "example.invalid", "client-fingerprint": "chrome", "reality-opts": { "public-key": "TEST_ONLY_PUBLIC_KEY", "short-id": "00000000" }, udp: true, _subName: "[REALM] EU" },
  { name: "SG landing", type: "hysteria2", server: "192.0.2.30", port: 8443, password: "TEST_ONLY_NOT_A_SECRET", tls: true, sni: "example.invalid", udp: true, _subName: "[落地] HY2" },
]);
```

```js
// test/classification.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { classifySource } from "../src/source-labels.js";
import { classifyRegion } from "../src/regions.js";

test("normalizes source labels without confusing server chains with landings", () => {
  assert.equal(classifySource({ _subName: "[REALM] X" }).label, "[Realm]");
  assert.equal(classifySource({ _subName: "[链式代理] X" }).kind, "serverChain");
  assert.equal(classifySource({ _subName: "[落地] X" }).kind, "landing");
  assert.equal(classifySource({ _subName: "No label" }).kind, "unknown");
});

test("keeps one leftmost flag and warns on conflicts", () => {
  const region = classifyRegion("🇯🇵 🇺🇸 US Tokyo");
  assert.equal(region.flag, "🇯🇵");
  assert.equal(region.continent, "asiaPacific");
  assert.equal(region.warning, "multiple-flags");
  assert.equal(classifyRegion("🇿🇦 Private 01").flag, "🇿🇦");
});

test("infers common names and keeps uncertain nodes unclassified", () => {
  assert.equal(classifyRegion("US-LAX").flag, "🇺🇸");
  assert.equal(classifyRegion("Frankfurt 01").flag, "🇩🇪");
  assert.equal(classifyRegion("Private Premium 01").continent, "other");
});
```

```js
// test/node-validation.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { validateNode, hasExplicitUdp } from "../src/node-validation.js";
import { fakeNodes } from "./fixtures/nodes.js";

test("accepts Shadowsocks/2022, Snell, VLESS Reality, and Hysteria2 fixtures", () => {
  for (const node of fakeNodes) assert.equal(validateNode(node).valid, true);
});

test("filters pseudo nodes and missing protocol credentials", () => {
  assert.equal(validateNode({ name: "剩余流量 100 GB", type: "ss", server: "x", port: 1, cipher: "x", password: "x" }).valid, false);
  assert.equal(validateNode({ name: "bad", type: "vless", server: "x", port: 443 }).reason, "missing-auth");
});

test("UDP eligibility is explicit and TLS warnings do not leak values", () => {
  assert.equal(hasExplicitUdp({ udp: true }), true);
  assert.equal(hasExplicitUdp({ type: "hysteria2" }), false);
  assert.deepEqual(
    validateNode({ name: "x", type: "vless", server: "x", port: 443, uuid: "00000000-0000-4000-8000-000000000001", tls: true }).warnings,
    ["tls-verification-unclear"],
  );
});
```

- [ ] **Step 2: Run the tests and confirm missing modules**

Run: `node --test test/classification.test.js test/node-validation.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement source, region, and node validation**

```js
// src/source-labels.js
import { SOURCE_KIND } from "./contracts.js";

const labels = Object.freeze([
  { pattern: "机场", kind: SOURCE_KIND.airport, label: "[机场]" },
  { pattern: "自建", kind: SOURCE_KIND.selfHosted, label: "[自建]" },
  { pattern: "realm", kind: SOURCE_KIND.realm, label: "[Realm]" },
  { pattern: "链式代理", kind: SOURCE_KIND.serverChain, label: "[链式代理]" },
  { pattern: "落地", kind: SOURCE_KIND.landing, label: "[落地]" },
]);

export function sourceName(node) {
  return [node._subDisplayName, node._subName, node._collectionDisplayName, node._collectionName]
    .find((value) => typeof value === "string" && value.trim()) ?? "";
}

export function classifySource(node) {
  const raw = sourceName(node);
  const match = raw.match(/^\s*\[([^\]]+)\]/u);
  const found = labels.find(({ pattern }) => match?.[1]?.toLocaleLowerCase() === pattern.toLocaleLowerCase());
  return found
    ? { kind: found.kind, label: found.label, warning: null }
    : { kind: SOURCE_KIND.unknown, label: "[未标记]", warning: "missing-source-label" };
}
```

```js
// src/regions.js
import { CONTINENT } from "./contracts.js";

const regions = Object.freeze([
  ["🇨🇳", CONTINENT.asiaPacific, /\b(?:cn|pek|pvg|can|china|beijing|shanghai|guangzhou|shenzhen)\b|中国|北京|上海|广州|深圳/iu],
  ["🇭🇰", CONTINENT.asiaPacific, /\b(?:hk|hkg|hong ?kong)\b|香港/iu],
  ["🇲🇴", CONTINENT.asiaPacific, /\b(?:mo|mfm|macao|macau)\b|澳门/iu],
  ["🇹🇼", CONTINENT.asiaPacific, /\b(?:tw|tpe|taiwan|taipei)\b|台湾|台北/iu],
  ["🇯🇵", CONTINENT.asiaPacific, /\b(?:jp|nrt|hnd|kix|japan|tokyo|osaka)\b|日本|东京|大阪/iu],
  ["🇰🇷", CONTINENT.asiaPacific, /\b(?:kr|icn|korea|seoul)\b|韩国|首尔/iu],
  ["🇸🇬", CONTINENT.asiaPacific, /\b(?:sg|sin|singapore)\b|新加坡/iu],
  ["🇲🇾", CONTINENT.asiaPacific, /\b(?:my|kul|malaysia|kuala ?lumpur)\b|马来西亚|吉隆坡/iu],
  ["🇹🇭", CONTINENT.asiaPacific, /\b(?:th|bkk|thailand|bangkok)\b|泰国|曼谷/iu],
  ["🇵🇭", CONTINENT.asiaPacific, /\b(?:ph|mnl|philippines|manila)\b|菲律宾|马尼拉/iu],
  ["🇮🇩", CONTINENT.asiaPacific, /\b(?:id|cgk|indonesia|jakarta)\b|印度尼西亚|雅加达/iu],
  ["🇦🇺", CONTINENT.asiaPacific, /\b(?:au|syd|mel|australia)\b|澳大利亚|悉尼|墨尔本/iu],
  ["🇮🇳", CONTINENT.asiaPacific, /\b(?:in|bom|del|india)\b|印度/iu],
  ["🇩🇪", CONTINENT.europe, /\b(?:de|fra|germany|frankfurt)\b|德国|法兰克福/iu],
  ["🇬🇧", CONTINENT.europe, /\b(?:uk|gb|lhr|britain|london)\b|英国|伦敦/iu],
  ["🇫🇷", CONTINENT.europe, /\b(?:fr|cdg|france|paris)\b|法国|巴黎/iu],
  ["🇳🇱", CONTINENT.europe, /\b(?:nl|ams|netherlands|amsterdam)\b|荷兰|阿姆斯特丹/iu],
  ["🇨🇭", CONTINENT.europe, /\b(?:ch|zrh|switzerland|zurich)\b|瑞士|苏黎世/iu],
  ["🇮🇹", CONTINENT.europe, /\b(?:it|mxp|italy|milan)\b|意大利|米兰/iu],
  ["🇪🇸", CONTINENT.europe, /\b(?:es|mad|spain|madrid)\b|西班牙|马德里/iu],
  ["🇸🇪", CONTINENT.europe, /\b(?:se|arn|sweden|stockholm)\b|瑞典|斯德哥尔摩/iu],
  ["🇺🇸", CONTINENT.americas, /\b(?:us|usa|lax|sjc|sea|iad|jfk|america)\b|美国|洛杉矶|圣何塞|西雅图|纽约/iu],
  ["🇨🇦", CONTINENT.americas, /\b(?:ca|yvr|yyz|canada)\b|加拿大|温哥华|多伦多/iu],
  ["🇧🇷", CONTINENT.americas, /\b(?:br|gru|brazil)\b|巴西|圣保罗/iu],
]);

const flagPattern = /\p{Regional_Indicator}{2}/gu;

export function classifyRegion(name = "") {
  const flags = [...name.matchAll(flagPattern)].map((match) => match[0]);
  const byFlag = flags.length ? regions.find(([flag]) => flag === flags[0]) : null;
  const byText = regions.find(([, , pattern]) => pattern.test(name));
  const chosen = byFlag ?? byText;
  return {
    flag: flags[0] ?? chosen?.[0] ?? "🌐",
    continent: byFlag?.[1] ?? (flags.length ? CONTINENT.other : byText?.[1] ?? CONTINENT.other),
    warning: flags.length > 1 ? "multiple-flags" : flags.length && byText && flags[0] !== byText[0] ? "flag-text-conflict" : null,
  };
}

export function removeFlags(name = "") {
  return name.replace(flagPattern, "").replace(/\s+/gu, " ").trim();
}
```

```js
// src/node-validation.js
const pseudo = /(?:剩余|流量|到期|套餐|官网|公告|通知|traffic|expire|website)/iu;
const authFields = Object.freeze({
  ss: ["cipher", "password"],
  shadowsocks: ["cipher", "password"],
  snell: ["psk", "version"],
  vless: ["uuid"],
  vmess: ["uuid"],
  trojan: ["password"],
  hysteria2: ["password"],
  hy2: ["password"],
  tuic: ["uuid", "password"],
});

export function hasExplicitUdp(node) {
  return node.udp === true;
}

export function validateNode(node) {
  if (!node || typeof node !== "object") return { valid: false, reason: "not-object", warnings: [] };
  if (typeof node.name !== "string" || pseudo.test(node.name)) return { valid: false, reason: "pseudo-node", warnings: [] };
  const port = Number(node.port);
  if (typeof node.type !== "string" || !node.server || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { valid: false, reason: "missing-endpoint", warnings: [] };
  }
  const required = authFields[node.type.toLocaleLowerCase()] ?? [];
  if (required.some((field) => node[field] === undefined || node[field] === "")) {
    return { valid: false, reason: "missing-auth", warnings: [] };
  }
  const tls = node.tls === true || ["trojan", "hysteria2", "hy2", "tuic"].includes(node.type.toLocaleLowerCase());
  const hasTlsIdentity = Boolean(node.sni || node.servername || node["skip-cert-verify"] === true || node["allow-insecure"] === true || node["reality-opts"]?.["public-key"]);
  return { valid: true, reason: null, warnings: tls && !hasTlsIdentity ? ["tls-verification-unclear"] : [] };
}
```

- [ ] **Step 4: Run focused tests**

Run: `node --test test/classification.test.js test/node-validation.test.js`

Expected: 6 tests PASS.

- [ ] **Step 5: Commit classification**

```bash
git add src/source-labels.js src/regions.js src/node-validation.js test/fixtures/nodes.js test/classification.test.js test/node-validation.test.js
git commit -m "feat: classify and validate source nodes"
```

---

### Task 3: Normalize, deduplicate, redact diagnostics, and build optional landing clones

**Files:**
- Create: `src/node-identity.js`
- Create: `src/diagnostics.js`
- Create: `src/client-chain.js`
- Create: `src/normalize-nodes.js`
- Create: `src/substore-node-entry.js`
- Create: `test/normalization.test.js`
- Create: `test/substore-node-entry.test.js`

**Interfaces:**
- Consumes: `normalizeNodes(nodes, { clientChain }): { nodes, diagnostics }`.
- Produces: normalized nodes carrying non-secret `_sr` metadata `{ sourceKind, continent, flag, udp, p2p, entry, chained }`; `operator(proxies, targetPlatform, context)` returns the normalized array.

- [ ] **Step 1: Write failing normalization and Sub-Store contract tests**

```js
// test/normalization.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNodes } from "../src/normalize-nodes.js";
import { fakeNodes } from "./fixtures/nodes.js";

test("keeps one flag, deduplicates exact nodes, and uses stable names", () => {
  const input = [fakeNodes[0], structuredClone(fakeNodes[0]), { ...fakeNodes[0], password: "DIFFERENT_TEST_VALUE" }];
  const a = normalizeNodes(input, { clientChain: "off" });
  const b = normalizeNodes([...input].reverse(), { clientChain: "off" });
  assert.equal(a.nodes.length, 2);
  assert.deepEqual(a.nodes.map((node) => node.name).sort(), b.nodes.map((node) => node.name).sort());
  assert.ok(a.nodes.every((node) => (node.name.match(/🇯🇵/gu) ?? []).length === 1));
  const spoofed = normalizeNodes([{ ...fakeNodes[1], name: "US false marker [UDP]" }], { clientChain: "off" });
  assert.doesNotMatch(spoofed.nodes[0].name, /\[UDP\]$/u);
});

test("never chains Realm/server-chain and excludes HY2 landing", () => {
  const input = [
    fakeNodes[2],
    { ...fakeNodes[2], _subName: "[链式代理] X", name: "DE chain" },
    fakeNodes[3],
    { ...fakeNodes[0], _subName: "[落地] SS", name: "JP landing" },
  ];
  const { nodes, diagnostics } = normalizeNodes(input, { clientChain: "on" });
  assert.equal(nodes.filter((node) => node._sr.chained).length, 1);
  assert.equal(nodes.find((node) => node._sr.chained)["underlying-proxy"], "🔗 入口节点");
  assert.equal(diagnostics.excluded["chain-protocol-unsupported"], 1);
});

test("does not create a chain clone when no eligible entry exists", () => {
  const landing = { ...fakeNodes[0], _subName: "[落地] SS", name: "JP landing" };
  const { nodes, diagnostics } = normalizeNodes([landing], { clientChain: "on" });
  assert.equal(nodes.some((node) => node._sr.chained), false);
  assert.equal(diagnostics.excluded["chain-entry-missing"], 1);
});

test("diagnostics contain counts but no endpoint or credential values", () => {
  const output = JSON.stringify(normalizeNodes(fakeNodes, { clientChain: "off" }).diagnostics);
  assert.doesNotMatch(output, /198\.51\.100\.10|TEST_ONLY_NOT_A_SECRET|00000000-0000-4000-8000-000000000001/);
});
```

```js
// test/substore-node-entry.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { operator } from "../src/substore-node-entry.js";
import { fakeNodes } from "./fixtures/nodes.js";

test("functional Script Operator returns an array and fails closed on empty input", async () => {
  const result = await operator(fakeNodes, "Shadowrocket", { arguments: { output: "nodes", clientChain: "off" } });
  assert.ok(Array.isArray(result));
  await assert.rejects(() => operator([], "Shadowrocket", { arguments: { output: "nodes", clientChain: "off" } }), /no valid nodes/i);
  await assert.rejects(() => operator(fakeNodes, "Shadowrocket", { arguments: { output: "nodes", clientChain: "off", extra: "x" } }), /extra/);
});
```

- [ ] **Step 2: Run tests and verify the missing-module failure**

Run: `node --test test/normalization.test.js test/substore-node-entry.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement sensitive in-memory identity and aggregate diagnostics**

```js
// src/node-identity.js
const secretKeys = new Set(["password", "psk", "uuid", "private-key", "private_key", "token"]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function identityKey(node) {
  const identity = Object.fromEntries(
    Object.entries(node).filter(([key]) => !key.startsWith("_") && key !== "name"),
  );
  return JSON.stringify(stable(identity));
}

export function fingerprint(node) {
  const text = identityKey(node);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function containsSecretKey(value) {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => secretKeys.has(key.toLocaleLowerCase()));
}
```

```js
// src/diagnostics.js
export function createDiagnostics() {
  return { total: 0, accepted: 0, protocol: {}, source: {}, region: {}, excluded: {}, warnings: {} };
}

export function increment(bucket, key, amount = 1) {
  bucket[key] = (bucket[key] ?? 0) + amount;
}
```

- [ ] **Step 4: Implement chain eligibility and normalization**

```js
// src/client-chain.js
const supported = new Set(["ss", "shadowsocks", "ssr", "snell", "vmess", "vless", "trojan", "socks5", "http"]);

export function addClientChainClones(nodes, diagnostics, enabled) {
  if (!enabled) return nodes;
  const landings = nodes.filter((item) => item._sr.sourceKind === "landing");
  if (!nodes.some((item) => item._sr.entry)) {
    if (landings.length) diagnostics.excluded["chain-entry-missing"] = landings.length;
    return nodes;
  }
  const clones = [];
  for (const node of landings) {
    if (!supported.has(node.type.toLocaleLowerCase())) {
      diagnostics.excluded["chain-protocol-unsupported"] = (diagnostics.excluded["chain-protocol-unsupported"] ?? 0) + 1;
      continue;
    }
    clones.push({
      ...structuredClone(node),
      name: `🔗 ${node.name}`,
      "underlying-proxy": "🔗 入口节点",
      _sr: { ...node._sr, chained: true },
    });
  }
  return [...nodes, ...clones];
}
```

```js
// src/normalize-nodes.js
import { classifySource } from "./source-labels.js";
import { classifyRegion, removeFlags } from "./regions.js";
import { validateNode, hasExplicitUdp } from "./node-validation.js";
import { fingerprint, identityKey } from "./node-identity.js";
import { createDiagnostics, increment } from "./diagnostics.js";
import { addClientChainClones } from "./client-chain.js";

const p2pKinds = new Set(["selfHosted", "realm", "serverChain"]);
const entryKinds = new Set(["airport", "selfHosted", "realm"]);

export function normalizeNodes(input, { clientChain = "off" } = {}) {
  const diagnostics = createDiagnostics();
  diagnostics.total = Array.isArray(input) ? input.length : 0;
  const byFingerprint = new Map();

  for (const original of Array.isArray(input) ? input : []) {
    const check = validateNode(original);
    if (!check.valid) {
      increment(diagnostics.excluded, check.reason);
      continue;
    }
    const key = identityKey(original);
    if (byFingerprint.has(key)) {
      increment(diagnostics.excluded, "exact-duplicate");
      continue;
    }
    const id = fingerprint(original);
    const source = classifySource(original);
    const region = classifyRegion(original.name);
    for (const warning of [source.warning, region.warning, ...check.warnings].filter(Boolean)) increment(diagnostics.warnings, warning);
    const cleanName = removeFlags(original.name).replace(/\[UDP\]/giu, "").replace(/[\r\n\t]/gu, " ").replace(/\s+/gu, " ").trim() || "未命名节点";
    const node = structuredClone(original);
    node.name = `${region.flag} ${source.label} ${cleanName}${hasExplicitUdp(original) ? " [UDP]" : ""}`.replace(/\s+/gu, " ").trim();
    node._sr = {
      id,
      sourceKind: source.kind,
      continent: region.continent,
      flag: region.flag,
      udp: hasExplicitUdp(original),
      p2p: p2pKinds.has(source.kind),
      entry: entryKinds.has(source.kind),
      chained: false,
    };
    byFingerprint.set(key, node);
  }

  const nodes = [...byFingerprint.values()];
  const nameCounts = new Map();
  for (const node of nodes) nameCounts.set(node.name, (nameCounts.get(node.name) ?? 0) + 1);
  for (const node of nodes) if (nameCounts.get(node.name) > 1) node.name = `${node.name} #${node._sr.id.slice(-5)}`;
  nodes.sort((a, b) => `${a._sr.continent}|${a._sr.flag}|${a.name}|${a._sr.id}`.localeCompare(`${b._sr.continent}|${b._sr.flag}|${b.name}|${b._sr.id}`, "zh-Hans-CN"));

  diagnostics.accepted = nodes.length;
  for (const node of nodes) {
    increment(diagnostics.protocol, node.type.toLocaleLowerCase());
    increment(diagnostics.source, node._sr.sourceKind);
    increment(diagnostics.region, node._sr.continent);
  }
  if (!nodes.length) throw new Error("No valid nodes; refusing to publish an empty subscription");
  return { nodes: addClientChainClones(nodes, diagnostics, clientChain === "on"), diagnostics };
}
```

- [ ] **Step 5: Implement the functional Sub-Store node operator**

```js
// src/substore-node-entry.js
import { normalizeNodes } from "./normalize-nodes.js";

export async function operator(proxies = [], targetPlatform, context = {}) {
  const argumentsObject = context.arguments ?? {};
  const unknown = Object.keys(argumentsObject).find((key) => !["output", "clientChain"].includes(key) && !key.startsWith("_"));
  if (unknown) throw new Error(`Unknown option: ${unknown}`);
  if (argumentsObject.output !== "nodes") throw new Error("Node operator requires output=nodes");
  const clientChain = argumentsObject.clientChain ?? "off";
  if (!["off", "on"].includes(clientChain)) throw new Error(`Invalid clientChain: ${clientChain}`);
  const { nodes, diagnostics } = normalizeNodes(proxies, { clientChain });
  if (typeof console?.log === "function") console.log(`[shadowrocket-profile] ${JSON.stringify(diagnostics)}`);
  return nodes;
}
```

- [ ] **Step 6: Run focused and full tests**

Run: `node --test test/normalization.test.js test/substore-node-entry.test.js`

Expected: 5 tests PASS and no fixture endpoint/credential in assertion output.

- [ ] **Step 7: Commit normalization**

```bash
git add src/node-identity.js src/diagnostics.js src/client-chain.js src/normalize-nodes.js src/substore-node-entry.js test/normalization.test.js test/substore-node-entry.test.js
git commit -m "feat: normalize nodes and create safe chain clones"
```

---

### Task 4: Generate concise manual, continent, source, service, and hidden helper groups

**Files:**
- Create: `src/group-catalog.js`
- Create: `src/render-groups.js`
- Create: `test/groups.test.js`

**Interfaces:**
- Consumes: `buildGroups(options, nodes): Group[]`, where nodes expose only the `_sr` metadata created in Task 3 and `Group={name,type,items,useSubscription,filter,hidden,url,interval,timeout,tolerance,select}`.
- Produces: `renderGroups(groups, subscriptionName): string[]` and `effectiveAutoMode(requested, nodeCount): "full"|"balanced"|"minimal"`.

- [ ] **Step 1: Write failing group tests**

```js
// test/groups.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { buildGroups, effectiveAutoMode } from "../src/group-catalog.js";
import { renderGroups } from "../src/render-groups.js";

function inventory(count, { chained = false } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    name: index === count - 1 && chained ? "🔗 🇯🇵 [落地] 示例" : `🇯🇵 [自建] 示例 ${index} [UDP]`,
    _sr: {
      sourceKind: index === count - 1 && chained ? "landing" : "selfHosted",
      continent: "asiaPacific",
      udp: index !== count - 1 || !chained,
      p2p: index !== count - 1 || !chained,
      entry: index !== count - 1,
      chained: index === count - 1 && chained,
    },
  }));
}

test("auto mode thresholds change helpers but never remove manual subscription access", () => {
  assert.equal(effectiveAutoMode("auto", 30), "full");
  assert.equal(effectiveAutoMode("auto", 31), "balanced");
  assert.equal(effectiveAutoMode("auto", 101), "minimal");
  for (const count of [10, 50, 300]) {
    const groups = buildGroups({ platform: "macos", autoGroupMode: "auto", blockMode: "balanced", clientChain: "off" }, inventory(count));
    assert.equal(groups.find((group) => group.name === "🚀 节点选择").useSubscription, true);
  }
});

test("uses continent groups with concrete subscription nodes and no country groups", () => {
  const lines = renderGroups(buildGroups({ platform: "iphone", autoGroupMode: "auto", blockMode: "balanced", clientChain: "off" }, inventory(40)), "Shadowrocket-Nodes");
  assert.ok(lines.some((line) => line.startsWith("🌏 亚太 = select,")));
  assert.equal(lines.some((line) => line.startsWith("🌍 欧洲 = select,")), false);
  assert.ok(lines.some((line) => line.includes("hidden=1")));
  assert.ok(lines.every((line) => !/日本组|美国组|德国组/u.test(line)));
});

test("service defaults and eligibility filters match the approved design", () => {
  const groups = buildGroups({ platform: "macos", autoGroupMode: "auto", blockMode: "balanced", clientChain: "on" }, inventory(20, { chained: true }));
  assert.equal(groups.find((group) => group.name === "🤖 AI 专用").useSubscription, true);
  assert.equal(groups.find((group) => group.name === "🍎 Apple").items[0], "DIRECT");
  assert.equal(groups.find((group) => group.name === "⬇️ 下载/P2P").filter, "^\\S+ \\[(?:自建|Realm|链式代理)\\] .+$");
  assert.equal(groups.find((group) => group.name === "🎮 游戏连接").filter, "^(?!🔗 )\\S+ .+ \\[UDP\\]$");
  assert.ok(groups.some((group) => group.name === "🔗 入口节点"));
});
```

- [ ] **Step 2: Run and verify missing-module failure**

Run: `node --test test/groups.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the complete group catalog**

```js
// src/group-catalog.js
import { platformPreset } from "./options.js";

const asiaFlags = "(?:🇨🇳|🇭🇰|🇲🇴|🇹🇼|🇯🇵|🇰🇷|🇸🇬|🇲🇾|🇹🇭|🇵🇭|🇮🇩|🇦🇺|🇮🇳)";
const europeFlags = "(?:🇩🇪|🇬🇧|🇫🇷|🇳🇱|🇨🇭|🇮🇹|🇪🇸|🇸🇪)";
const americasFlags = "(?:🇺🇸|🇨🇦|🇧🇷)";
const knownFlags = `(?:${asiaFlags}|${europeFlags}|${americasFlags})`;
const continents = Object.freeze([
  ["🌏 亚太", asiaFlags, "asiaPacific"],
  ["🌍 欧洲", europeFlags, "europe"],
  ["🌎 美洲", americasFlags, "americas"],
  ["🌐 其他/未分类", `(?!(?:🔗|${knownFlags}))\\S+`, "other"],
]);

export function effectiveAutoMode(requested, count) {
  if (requested !== "auto") return requested;
  if (count <= 30) return "full";
  if (count <= 100) return "balanced";
  return "minimal";
}

const select = (name, items, extra = {}) => ({ name, type: "select", items, ...extra });

export function buildGroups(options, nodes) {
  const nodeCount = nodes.length;
  const presentContinents = continents.filter(([, , key]) => nodes.some((node) => node._sr?.continent === key && !node._sr?.chained));
  const sourceKinds = new Set(nodes.filter((node) => !node._sr?.chained).map((node) => node._sr?.sourceKind));
  const hasUdp = nodes.some((node) => node._sr?.udp && !node._sr?.chained);
  const hasP2p = nodes.some((node) => node._sr?.p2p && !node._sr?.chained);
  const hasEntry = nodes.some((node) => node._sr?.entry && !node._sr?.chained);
  const hasChained = nodes.some((node) => node._sr?.chained);
  const preset = platformPreset(options.platform);
  const mode = effectiveAutoMode(options.autoGroupMode, nodeCount);
  const test = { url: "http://www.gstatic.com/generate_204", interval: preset.testInterval, timeout: preset.timeout, tolerance: preset.tolerance, hidden: true };
  const helpers = [
    { name: "⚡ 全部自动", type: "url-test", items: [], useSubscription: true, filter: "^(?!🔗 ).+$", ...test },
    { name: "🛟 全部故障转移", type: "fallback", items: [], useSubscription: true, filter: "^(?!🔗 ).+$", ...test },
  ];
  if (options.clientChain === "on" && hasEntry && hasChained) {
    helpers.push({ name: "⚡ 入口自动", type: "url-test", items: [], useSubscription: true, filter: "^\\S+ \\[(?:机场|自建|Realm)\\] .+$", ...test });
  }
  if (mode !== "minimal") {
    for (const [name, flagPattern] of presentContinents) {
      helpers.push({ name: `⚡ ${name.slice(3)}自动`, type: "url-test", items: [], useSubscription: true, filter: `^${flagPattern} .+$`, ...test });
      if (mode === "full") helpers.push({ name: `🛟 ${name.slice(3)}故障转移`, type: "fallback", items: [], useSubscription: true, filter: `^${flagPattern} .+$`, ...test });
    }
  }
  const continentGroups = presentContinents.map(([name, flagPattern]) => {
    const auto = mode === "minimal" ? [] : [`⚡ ${name.slice(3)}自动`];
    const fallback = mode === "full" ? [`🛟 ${name.slice(3)}故障转移`] : [];
    return select(name, [...auto, ...fallback], { useSubscription: true, filter: `^${flagPattern} .+$` });
  });
  const everyNode = { useSubscription: true, filter: "^.+$" };
  const sourceGroups = [
    ["selfHosted", "🏠 自建节点", "^\\S+ \\[自建\\] .+$"],
    ["airport", "🏢 机场节点", "^\\S+ \\[机场\\] .+$"],
    ["realm", "↪️ Realm 转发", "^\\S+ \\[Realm\\] .+$"],
    ["serverChain", "⛓️ 链式代理", "^\\S+ \\[链式代理\\] .+$"],
  ].filter(([kind]) => sourceKinds.has(kind)).map(([, name, filter]) => select(name, ["DIRECT"], { useSubscription: true, filter }));
  const groups = [
    ...helpers,
    select("🚀 节点选择", ["⚡ 全部自动", "🛟 全部故障转移", ...presentContinents.map(([name]) => name)], everyNode),
    ...continentGroups,
    ...sourceGroups,
    ...(hasChained ? [select("🎯 客户端落地", ["DIRECT"], { useSubscription: true, filter: "^🔗 .+$" })] : []),
    select("🤖 AI 专用", [], everyNode),
    select("🐙 GitHub", ["🚀 节点选择", "DIRECT"], everyNode),
    select("📺 YouTube", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🎬 Netflix", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🏰 Disney+", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🎵 Spotify", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🌍 国际媒体", ["🚀 节点选择", "DIRECT"], everyNode),
    select("✈️ Telegram", ["🚀 节点选择", "DIRECT"], everyNode),
    select("💬 海外社交", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🎶 TikTok", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🍎 Apple", ["DIRECT", "🚀 节点选择"], everyNode),
    select("🪟 Microsoft", ["DIRECT", "🚀 节点选择"], everyNode),
    select("📺 哔哩哔哩", ["DIRECT", "🚀 节点选择"], everyNode),
    select("🎵 抖音", ["DIRECT", "🚀 节点选择"], everyNode),
    select("📕 小红书", ["DIRECT", "🚀 节点选择"], everyNode),
    select("🧣 微博", ["DIRECT", "🚀 节点选择"], everyNode),
    select("🕹️ 游戏平台", ["🚀 节点选择", "DIRECT"], everyNode),
    select("🎮 游戏连接", ["DIRECT"], hasUdp ? { useSubscription: true, filter: "^(?!🔗 )\\S+ .+ \\[UDP\\]$" } : {}),
    select("⬇️ 下载/P2P", ["DIRECT"], hasP2p ? { useSubscription: true, filter: "^\\S+ \\[(?:自建|Realm|链式代理)\\] .+$" } : {}),
    select("🧭 DNS 与规则下载", ["🚀 节点选择", "DIRECT"]),
  ];
  const blockDefaults = {
    off: ["DIRECT", "DIRECT", "DIRECT"],
    security: ["REJECT", "DIRECT", "DIRECT"],
    balanced: ["REJECT", "REJECT", "DIRECT"],
    strict: ["REJECT", "REJECT", "REJECT"],
  }[options.blockMode];
  groups.push(
    select("☣️ 安全威胁", [blockDefaults[0], blockDefaults[0] === "REJECT" ? "DIRECT" : "REJECT"]),
    select("🧱 常见广告", [blockDefaults[1], blockDefaults[1] === "REJECT" ? "DIRECT" : "REJECT"]),
    select("🕵️ 严格跟踪", [blockDefaults[2], blockDefaults[2] === "REJECT" ? "DIRECT" : "REJECT"]),
  );
  if (options.clientChain === "on" && hasEntry && hasChained) groups.push(select("🔗 入口节点", ["⚡ 入口自动"], { useSubscription: true, filter: "^\\S+ \\[(?:机场|自建|Realm)\\] .+$" }));
  return groups;
}
```

The visible name remains flag-first and flag-sorted. `[UDP]` is added only when the source node explicitly sets `udp: true`; it is a deterministic selector for `🎮 游戏连接`, not a protocol guess.

- [ ] **Step 4: Implement deterministic Shadowrocket group rendering**

```js
// src/render-groups.js
function field(value) {
  return String(value).replaceAll(",", "\\,");
}

export function renderGroups(groups, subscriptionName) {
  return groups.map((group) => {
    const parts = [group.type, ...group.items.map(field)];
    if (group.useSubscription) parts.push(field(subscriptionName), "use=true");
    if (group.filter) parts.push(`policy-regex-filter=${field(group.filter)}`);
    if (group.url) parts.push(`url=${group.url}`);
    if (group.interval) parts.push(`interval=${group.interval}`);
    if (group.timeout) parts.push(`timeout=${group.timeout}`);
    if (group.tolerance) parts.push(`tolerance=${group.tolerance}`);
    if (group.hidden) parts.push("hidden=1");
    return `${group.name} = ${parts.join(",")}`;
  });
}
```

- [ ] **Step 5: Run tests and commit**

Run: `node --test test/groups.test.js test/normalization.test.js`

Expected: all group and normalization tests PASS.

```bash
git add src/group-catalog.js src/render-groups.js src/normalize-nodes.js test/groups.test.js test/normalization.test.js
git commit -m "feat: generate concise Shadowrocket policy groups"
```

---

### Task 5: Implement ordered routing, public rule catalog, and local corrections

**Files:**
- Create: `src/custom-rules.js`
- Create: `src/rule-catalog.js`
- Create: `src/render-rules.js`
- Create: `test/rules.test.js`
- Create: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: `renderRules(): string[]`.
- Produces: first-match ordered Shadowrocket `[Rule]` lines and `RULE_CATALOG` entries `{id,url,policy,minEntries}`.

- [ ] **Step 1: Write failing order and catalog tests**

```js
// test/rules.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { renderRules } from "../src/render-rules.js";
import { RULE_CATALOG } from "../src/rule-catalog.js";

test("LAN and local corrections precede services, China, GEOIP, and FINAL", () => {
  const rules = renderRules();
  const index = (text) => rules.findIndex((line) => line.includes(text));
  assert.ok(index("IP-CIDR,192.168.0.0/16") < index("CUSTOM_PROXY"));
  assert.ok(index("BiliBili.list") < index("China.list"));
  assert.ok(index("OpenAI.list") < index("Microsoft.list"));
  assert.ok(index("GitHub.list") < index("Microsoft.list"));
  assert.ok(index("PROTOCOL,UDP") < index("Game.list,🕹️ 游戏平台"));
  assert.ok(index("Download.list") < index("ChinaMax.list"));
  assert.ok(index("GEOIP,CN,DIRECT") < index("FINAL,🚀 节点选择"));
});

test("every remote catalog entry is HTTPS and has a positive floor", () => {
  for (const item of RULE_CATALOG) {
    assert.match(item.url, /^https:\/\/raw\.githubusercontent\.com\/blackmatrix7\/ios_rule_script\//u);
    assert.ok(item.minEntries > 0);
  }
});
```

- [ ] **Step 2: Run and verify missing-module failure**

Run: `node --test test/rules.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Add the exact rule catalog and four local arrays**

```js
// src/custom-rules.js
export const CUSTOM_BLOCK = Object.freeze([]);
export const CUSTOM_DIRECT = Object.freeze([]);
export const CUSTOM_PROXY = Object.freeze([]);
export const CUSTOM_AI = Object.freeze([
  "DOMAIN-SUFFIX,perplexity.ai",
  "DOMAIN-SUFFIX,pplx.ai",
  "DOMAIN-SUFFIX,x.ai",
  "DOMAIN-SUFFIX,grok.com",
  "DOMAIN-SUFFIX,poe.com",
  "DOMAIN-SUFFIX,poecdn.net",
]);
```

```js
// src/rule-catalog.js
const base = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";
const entry = (id, policy, minEntries) => Object.freeze({ id, policy, minEntries, url: `${base}/${id}/${id}.list` });

export const RULE_CATALOG = Object.freeze([
  entry("Hijacking", "☣️ 安全威胁", 150),
  entry("BlockHttpDNS", "☣️ 安全威胁", 40),
  entry("AdvertisingLite", "🧱 常见广告", 250),
  entry("Privacy", "🕵️ 严格跟踪", 15),
  entry("BiliBili", "📺 哔哩哔哩", 80),
  entry("DouYin", "🎵 抖音", 8),
  entry("XiaoHongShu", "📕 小红书", 3),
  entry("Weibo", "🧣 微博", 3),
  entry("OpenAI", "🤖 AI 专用", 20),
  entry("Claude", "🤖 AI 专用", 2),
  entry("Gemini", "🤖 AI 专用", 8),
  entry("Copilot", "🤖 AI 专用", 30),
  entry("GitHub", "🐙 GitHub", 20),
  entry("YouTube", "📺 YouTube", 120),
  entry("Netflix", "🎬 Netflix", 800),
  entry("Disney", "🏰 Disney+", 100),
  entry("Spotify", "🎵 Spotify", 20),
  entry("GlobalMedia", "🌍 国际媒体", 700),
  entry("Telegram", "✈️ Telegram", 25),
  entry("Facebook", "💬 海外社交", 350),
  entry("Instagram", "💬 海外社交", 3),
  entry("Twitter", "💬 海外社交", 20),
  entry("TikTok", "🎶 TikTok", 20),
  entry("Apple", "🍎 Apple", 25),
  entry("Microsoft", "🪟 Microsoft", 400),
  entry("Game", "🕹️ 游戏平台", 400),
  entry("Download", "⬇️ 下载/P2P", 5),
  entry("PrivateTracker", "⬇️ 下载/P2P", 150),
  entry("ChinaMax", "DIRECT", 8000),
]);
```

These conservative floors were checked against the upstream Shadowrocket lists on 2026-07-25. A future list shrinking below its floor is a review signal, not a reason to silently lower the floor.

- [ ] **Step 4: Implement exact first-match rule ordering**

```js
// src/render-rules.js
import { CUSTOM_AI, CUSTOM_BLOCK, CUSTOM_DIRECT, CUSTOM_PROXY } from "./custom-rules.js";
import { RULE_CATALOG } from "./rule-catalog.js";

const lan = Object.freeze([
  "DOMAIN-SUFFIX,local,DIRECT",
  "DOMAIN-SUFFIX,home.arpa,DIRECT",
  "DOMAIN-SUFFIX,lan,DIRECT",
  "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
  "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
  "IP-CIDR6,::1/128,DIRECT,no-resolve",
  "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
  "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
  "IP-CIDR6,ff00::/8,DIRECT,no-resolve",
]);

function local(list, policy, marker) {
  return [`# ${marker}`, ...list.map((rule) => `${rule},${policy}`)];
}

function remote(id) {
  const item = RULE_CATALOG.find((candidate) => candidate.id === id);
  return `RULE-SET,${item.url},${item.policy},update-interval=86400`;
}

export function renderRules() {
  const orderedIds = [
    "Hijacking", "BlockHttpDNS", "AdvertisingLite", "Privacy",
    "BiliBili", "DouYin", "XiaoHongShu", "Weibo",
    "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
    "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
    "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
    "Apple", "Microsoft",
  ];
  const game = RULE_CATALOG.find((item) => item.id === "Game");
  return [
    ...lan,
    ...local(CUSTOM_BLOCK, "REJECT", "CUSTOM_BLOCK"),
    ...local(CUSTOM_DIRECT, "DIRECT", "CUSTOM_DIRECT"),
    ...local(CUSTOM_PROXY, "🚀 节点选择", "CUSTOM_PROXY"),
    ...local(CUSTOM_AI, "🤖 AI 专用", "CUSTOM_AI"),
    ...orderedIds.map(remote),
    `AND,((PROTOCOL,UDP),(RULE-SET,${game.url})),🎮 游戏连接`,
    remote("Game"),
    remote("Download"),
    remote("PrivateTracker"),
    remote("ChinaMax"),
    "GEOIP,CN,DIRECT",
    "FINAL,🚀 节点选择",
  ];
}
```

Application QUIC is controlled only by the documented `[General] block-quic` mapping in Task 6. This avoids adding a traffic rule that could accidentally block Hysteria2/TUIC node transport.

- [ ] **Step 5: Add license attribution**

```markdown
# Third-Party Notices

## ios_rule_script

- Project: https://github.com/blackmatrix7/ios_rule_script
- Rule paths: `rule/Shadowrocket/*/*.list`
- License: GNU General Public License v2.0
- Use: remotely downloaded domain/IP rule lists; this project stores only the catalog URLs and health thresholds.

## Sub-Store

- Project: https://github.com/sub-store-org/Sub-Store
- Use: documented Script Operator and `produceArtifact` runtime contracts; no upstream source is copied into runtime bundles.
```

- [ ] **Step 6: Run tests and commit**

Run: `node --test test/rules.test.js`

Expected: 2 tests PASS.

```bash
git add src/custom-rules.js src/rule-catalog.js src/render-rules.js test/rules.test.js THIRD_PARTY_NOTICES.md
git commit -m "feat: add ordered routing and rule catalog"
```

---

### Task 6: Render DNS, IPv6, QUIC, LAN, and platform-safe General settings

**Files:**
- Create: `src/dns.js`
- Create: `src/general.js`
- Create: `test/general.test.js`

**Interfaces:**
- Consumes: validated `GeneratorOptions`.
- Produces: `dnsSettings(options): string[]` and `generalSettings(options): string[]`.

- [ ] **Step 1: Write exhaustive failing option-matrix tests**

```js
// test/general.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { dnsSettings } from "../src/dns.js";
import { generalSettings } from "../src/general.js";

const base = { platform: "macos", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto", quicMode: "allow", clientChain: "off" };

test("stable DNS has direct China resolver and proxied global fallback", () => {
  const lines = dnsSettings(base).join("\n");
  assert.match(lines, /dns\.alidns\.com/);
  assert.match(lines, /cloudflare-dns\.com.*#proxy=🧭 DNS 与规则下载/);
  assert.match(lines, /dns-direct-fallback-proxy = true/);
});

test("every provider and DNS mode renders without a bootstrap loop", () => {
  for (const dnsMode of ["stable", "privacy", "speed"]) {
    for (const chinaDns of ["alidns", "dnspod", "system"]) {
      for (const globalDns of ["cloudflare", "google", "quad9"]) {
        const lines = dnsSettings({ ...base, dnsMode, chinaDns, globalDns });
        assert.equal(lines.filter((line) => line.startsWith("dns-server = ")).length, 1);
        assert.equal(lines.filter((line) => line.startsWith("fallback-dns-server = ")).length, 1);
      }
    }
  }
});

test("IPv6 and chain failure settings are explicit", () => {
  assert.ok(generalSettings(base).includes("ipv6 = true"));
  assert.ok(generalSettings(base).some((line) => line.startsWith("tun-excluded-routes = ")));
  assert.ok(generalSettings({ ...base, ipv6Mode: "ipv4-only" }).includes("ipv6 = false"));
  assert.ok(generalSettings({ ...base, clientChain: "on" }).includes("close-if-proxy-chain-missing = true"));
});

test("General block-quic maps only to documented values", () => {
  assert.ok(generalSettings(base).includes("block-quic = always-allow"));
  assert.ok(generalSettings({ ...base, quicMode: "proxy-block" }).includes("block-quic = all-proxy"));
  assert.ok(generalSettings({ ...base, quicMode: "all-block" }).includes("block-quic = all"));
});
```

- [ ] **Step 2: Run and verify missing-module failure**

Run: `node --test test/general.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement DNS mappings and General settings**

```js
// src/dns.js
const china = Object.freeze({
  alidns: "https://dns.alidns.com/dns-query",
  dnspod: "https://doh.pub/dns-query",
  system: "system",
});
const global = Object.freeze({
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/dns-query",
  quad9: "https://dns.quad9.net/dns-query",
});

export function dnsSettings(options) {
  const direct = china[options.chinaDns];
  const overseas = `${global[options.globalDns]}#proxy=🧭 DNS 与规则下载`;
  if (options.dnsMode === "privacy") {
    return [
      `dns-server = ${direct === "system" ? "https://dns.alidns.com/dns-query" : direct}`,
      `fallback-dns-server = ${overseas}`,
      "dns-direct-system = false",
      "dns-direct-fallback-proxy = true",
      "private-ip-answer = true",
      "hijack-dns = *:53",
    ];
  }
  if (options.dnsMode === "speed") {
    return [
      `dns-server = ${direct}`,
      `fallback-dns-server = ${global[options.globalDns]}`,
      `dns-direct-system = ${direct === "system" ? "true" : "false"}`,
      "dns-direct-fallback-proxy = false",
      "private-ip-answer = true",
      "hijack-dns = *:53",
    ];
  }
  return [
    `dns-server = ${direct}`,
    `fallback-dns-server = ${overseas}`,
    `dns-direct-system = ${direct === "system" ? "true" : "false"}`,
    "dns-direct-fallback-proxy = true",
    "private-ip-answer = true",
    "hijack-dns = *:53",
  ];
}
```

```js
// src/general.js
import { dnsSettings } from "./dns.js";

const quic = Object.freeze({ allow: "always-allow", "proxy-block": "all-proxy", "all-block": "all" });

export function generalSettings(options) {
  return [
    "skip-proxy = 127.0.0.1,localhost,*.local,*.lan,*.home.arpa,10.0.0.0/8,100.64.0.0/10,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,fc00::/7,fe80::/10",
    "tun-excluded-routes = 10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.168.0.0/16,224.0.0.0/4,::1/128,fc00::/7,fe80::/10,ff00::/8",
    "bypass-system = true",
    "udp-policy-not-supported-behaviour = REJECT",
    "allow-dns-svcb = false",
    "allow-dns-all = false",
    `ipv6 = ${options.ipv6Mode === "auto" ? "true" : "false"}`,
    "prefer-ipv6 = false",
    "ipv6-only-if-no-ipv4-dns = true",
    `block-quic = ${quic[options.quicMode]}`,
    `close-if-proxy-chain-missing = ${options.clientChain === "on" ? "true" : "false"}`,
    ...dnsSettings(options),
  ];
}
```

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/general.test.js`

Expected: 4 tests PASS.

```bash
git add src/dns.js src/general.js test/general.test.js
git commit -m "feat: render DNS IPv6 and QUIC settings"
```

---

### Task 7: Compose and structurally validate complete Profiles

**Files:**
- Create: `src/render-profile.js`
- Create: `src/validate-profile.js`
- Create: `src/substore-profile-entry.js`
- Create: `test/profile.test.js`
- Create: `test/substore-profile-entry.test.js`

**Interfaces:**
- Consumes: `renderProfile(options, nodes): string`, `validateProfile(profile): ValidationReport`; only `_sr` inventory fields and names affect group generation.
- Produces: Sub-Store File Operator `operator(input, targetPlatform, context): {$content,$files,$options,$file}` and bundled global `$content` assignment.

- [ ] **Step 1: Write failing Profile and runtime contract tests**

```js
// test/profile.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { renderProfile } from "../src/render-profile.js";
import { validateProfile } from "../src/validate-profile.js";

const base = {
  output: "config", type: "collection", name: "shadowrocket-sources", subscriptionName: "Shadowrocket-Nodes",
  platform: "macos", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare",
  blockMode: "balanced", quicMode: "allow", ipv6Mode: "auto", autoGroupMode: "auto", clientChain: "off",
};

const inventory = (count) => Array.from({ length: count }, (_, index) => ({
  name: `🇯🇵 [自建] 示例 ${index} [UDP]`,
  _sr: { sourceKind: "selfHosted", continent: "asiaPacific", udp: true, p2p: true, entry: true, chained: false },
}));

test("renders all required sections and validates references/order", () => {
  const profile = renderProfile(base, inventory(25));
  assert.match(profile, /^\[General\]/u);
  assert.match(profile, /\[Proxy Group\]/u);
  assert.match(profile, /\[Rule\]/u);
  assert.deepEqual(validateProfile(profile), { valid: true, errors: [] });
});

test("renders all platforms and option values", () => {
  for (const platform of ["macos", "iphone", "ipad", "appletv"])
    for (const blockMode of ["off", "security", "balanced", "strict"])
      for (const quicMode of ["allow", "proxy-block", "all-block"])
        for (const ipv6Mode of ["auto", "ipv4-only"])
          assert.equal(validateProfile(renderProfile({ ...base, platform, blockMode, quicMode, ipv6Mode }, inventory(120))).valid, true);
});

test("validator rejects duplicate groups, missing references, cycles, and wrong fallback order", () => {
  assert.match(validateProfile("[Proxy Group]\nA = select,B\nB = select,A\nA = select,DIRECT\n[Rule]\nFINAL,Missing").errors.join("\n"), /duplicate|cycle|Missing/u);
  assert.match(validateProfile("[Proxy Group]\nA = select,DIRECT\n[Rule]\nFINAL,A\nGEOIP,CN,DIRECT").errors.join("\n"), /GEOIP/u);
});
```

```js
// test/substore-profile-entry.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { operator } from "../src/substore-profile-entry.js";

test("File Script Operator obtains internal nodes and returns Profile content", async () => {
  const calls = [];
  const input = { $files: [], $options: {} };
  const context = {
    arguments: { output: "config", type: "collection", name: "shadowrocket-sources", subscriptionName: "Shadowrocket-Nodes", platform: "iphone" },
    produceArtifact: async (request) => { calls.push(request); return [{ name: "fake" }]; },
  };
  const output = await operator(input, "Shadowrocket", context);
  assert.equal(calls[0].platform, "JSON");
  assert.equal(calls[0].produceType, "internal");
  assert.match(output.$content, /\[General\]/u);
});
```

- [ ] **Step 2: Run and verify missing-module failure**

Run: `node --test test/profile.test.js test/substore-profile-entry.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement deterministic Profile composition**

```js
// src/render-profile.js
import { buildGroups } from "./group-catalog.js";
import { renderGroups } from "./render-groups.js";
import { generalSettings } from "./general.js";
import { renderRules } from "./render-rules.js";

function section(name, lines) {
  return [`[${name}]`, ...lines, ""].join("\n");
}

export function renderProfile(options, nodes) {
  const groups = renderGroups(buildGroups(options, nodes), options.subscriptionName);
  return [
    "# Generated by shadowrocket-profile. Do not paste credentials into this file.",
    `# platform=${options.platform}; node-count=${nodes.length}; node-refresh=21600; rule-refresh=86400`,
    "",
    section("General", generalSettings(options)),
    section("Proxy Group", groups),
    section("Rule", renderRules()),
  ].join("\n").replace(/\n{3,}/gu, "\n\n").trimEnd() + "\n";
}
```

- [ ] **Step 4: Implement structural validation**

```js
// src/validate-profile.js
const builtins = new Set(["DIRECT", "REJECT"]);

function parseSections(profile) {
  const sections = new Map();
  let current = "";
  for (const raw of profile.split(/\r?\n/u)) {
    const line = raw.trim();
    const header = line.match(/^\[([^\]]+)\]$/u);
    if (header) {
      current = header[1];
      sections.set(current, []);
    } else if (line && !line.startsWith("#") && current) sections.get(current).push(line);
  }
  return sections;
}

export function validateProfile(profile) {
  const errors = [];
  const sections = parseSections(profile);
  for (const required of ["General", "Proxy Group", "Rule"]) if (!sections.has(required)) errors.push(`missing section: ${required}`);
  const groups = new Map();
  for (const line of sections.get("Proxy Group") ?? []) {
    const [left, right] = line.split(/\s*=\s*/u, 2);
    if (groups.has(left)) errors.push(`duplicate group: ${left}`);
    const tokens = right?.split(",") ?? [];
    const useIndex = tokens.indexOf("use=true");
    const firstControl = tokens.findIndex((item, index) => index > 0 && item.includes("="));
    const itemEnd = useIndex >= 0 ? useIndex - 1 : firstControl >= 0 ? firstControl : tokens.length;
    groups.set(left, tokens.slice(1, itemEnd).filter((item) => item && !["select", "url-test", "fallback", "load-balance", "random"].includes(item)));
  }
  for (const [name, refs] of groups) {
    for (const ref of refs) if (!builtins.has(ref) && !groups.has(ref)) errors.push(`missing reference from ${name}: ${ref}`);
  }
  const visiting = new Set();
  const visited = new Set();
  function walk(name) {
    if (visiting.has(name)) return errors.push(`group cycle: ${name}`);
    if (visited.has(name)) return;
    visiting.add(name);
    for (const ref of groups.get(name) ?? []) if (groups.has(ref)) walk(ref);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of groups.keys()) walk(name);
  const rules = sections.get("Rule") ?? [];
  const geo = rules.findIndex((line) => line === "GEOIP,CN,DIRECT");
  const final = rules.findIndex((line) => line === "FINAL,🚀 节点选择");
  if (geo < 0 || final < 0 || geo > final) errors.push("GEOIP CN must precede FINAL");
  for (const line of rules) {
    const parts = line.split(",");
    const target = parts[0] === "RULE-SET" ? parts[2] : parts[0] === "FINAL" ? parts[1] : null;
    if (target && !builtins.has(target) && !groups.has(target)) errors.push(`missing rule policy: ${target}`);
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
```

- [ ] **Step 5: Implement the File Script Operator adapter**

```js
// src/substore-profile-entry.js
import { parseOptions } from "./options.js";
import { renderProfile } from "./render-profile.js";
import { validateProfile } from "./validate-profile.js";

export async function operator(input = {}, targetPlatform, context = {}) {
  const raw = context.arguments ?? {};
  const produce = context.produceArtifact;
  if (typeof produce !== "function") throw new Error("Sub-Store produceArtifact is unavailable");
  const options = parseOptions(raw);
  if (options.output !== "config") throw new Error("Profile generator requires output=config");
  const nodes = await produce({ type: options.type, name: options.name, platform: "JSON", produceType: "internal" });
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("No valid nodes; refusing to generate Profile");
  const profile = renderProfile(options, nodes);
  const report = validateProfile(profile);
  if (!report.valid) throw new Error(`Generated Profile is invalid: ${report.errors.join("; ")}`);
  return { ...input, $content: profile };
}
```

Task 8 wraps this exported function in a plain global `operator()` function. The wrapper supplies Sub-Store's lexical `$arguments` and `produceArtifact` values without leaving `import` or `export` syntax in the paste-ready bundle:

```js
async function operator(input = {}, targetPlatform, context = {}) {
  return ShadowrocketProfileBundle.operator(input, targetPlatform, {
    ...context,
    arguments: typeof $arguments === "object" ? $arguments : {},
    produceArtifact: typeof produceArtifact === "function" ? produceArtifact : undefined,
  });
}
```

- [ ] **Step 6: Run tests and commit**

Run: `node --test test/profile.test.js test/substore-profile-entry.test.js`

Expected: all Profile matrix and contract tests PASS.

```bash
git add src/render-profile.js src/validate-profile.js src/substore-profile-entry.js test/profile.test.js test/substore-profile-entry.test.js
git commit -m "feat: render and validate complete Profiles"
```

---

### Task 8: Bundle runtime scripts and add offline, network, fixture, and secret checks

**Files:**
- Create: `scripts/build.mjs`
- Create: `scripts/check-rules.mjs`
- Create: `scripts/check-secrets.mjs`
- Create: `scripts/render-fixtures.mjs`
- Create: `test/bundles.test.js`
- Create: `test/security.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: source entries, safe fixtures, and `RULE_CATALOG`.
- Produces: two self-contained scripts, three safe sample Profiles, rule health output, and a nonzero exit on leakage or malformed artifacts.

- [ ] **Step 1: Write failing bundle and leakage tests**

```js
// test/bundles.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("both bundles are self-contained and expose the right runtime hooks", async () => {
  const node = await readFile("dist/substore-node-operator.js", "utf8");
  const profile = await readFile("dist/substore-profile-generator.js", "utf8");
  assert.match(node, /function operator/u);
  assert.doesNotMatch(node, /\b(?:import|export)\s/u);
  assert.match(profile, /produceArtifact/u);
  assert.match(profile, /\$content/u);
  assert.doesNotMatch(profile, /\b(?:import|export)\s/u);
  for (const source of [node, profile]) {
    const sandbox = { console: { log() {} }, $arguments: {} };
    vm.runInNewContext(source, sandbox);
    assert.equal(typeof sandbox.operator, "function");
  }
});
```

```js
// test/security.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("generated and tracked files pass the secret scan", () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, ["scripts/check-secrets.mjs"], { stdio: "pipe" }));
});
```

- [ ] **Step 2: Run and verify missing-artifact failures**

Run: `node --test test/bundles.test.js test/security.test.js`

Expected: FAIL because `dist/substore-node-operator.js` and the check scripts do not exist.

- [ ] **Step 3: Implement deterministic esbuild bundling**

```js
// scripts/build.mjs
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
const common = { bundle: true, format: "iife", platform: "neutral", target: "es2022", minify: false, legalComments: "none" };
await build({ ...common, globalName: "ShadowrocketNodeBundle", entryPoints: ["src/substore-node-entry.js"], outfile: "dist/substore-node-operator.js" });
await build({ ...common, globalName: "ShadowrocketProfileBundle", entryPoints: ["src/substore-profile-entry.js"], outfile: "dist/substore-profile-generator.js" });

const nodeRuntime = await readFile("dist/substore-node-operator.js", "utf8");
const nodeFooter = `
async function operator(proxies = [], targetPlatform, context = {}) {
  return ShadowrocketNodeBundle.operator(proxies, targetPlatform, {
    ...context,
    arguments: typeof $arguments === "object" ? $arguments : {},
  });
}
`;
await writeFile("dist/substore-node-operator.js", `${nodeRuntime.trimEnd()}\\n${nodeFooter}`, "utf8");

const profileRuntime = await readFile("dist/substore-profile-generator.js", "utf8");
const profileFooter = `
async function operator(input = {}, targetPlatform, context = {}) {
  return ShadowrocketProfileBundle.operator(input, targetPlatform, {
    ...context,
    arguments: typeof $arguments === "object" ? $arguments : {},
    produceArtifact: typeof produceArtifact === "function" ? produceArtifact : undefined,
  });
}
`;
await writeFile("dist/substore-profile-generator.js", `${profileRuntime.trimEnd()}\\n${profileFooter}`, "utf8");
```

- [ ] **Step 4: Implement safe fixture rendering**

```js
// scripts/render-fixtures.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { renderProfile } from "../src/render-profile.js";
import { validateProfile } from "../src/validate-profile.js";

const common = {
  output: "config", type: "collection", name: "shadowrocket-sources", subscriptionName: "Shadowrocket-Nodes",
  dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare",
  blockMode: "balanced", quicMode: "allow", ipv6Mode: "auto", autoGroupMode: "auto", clientChain: "off",
};
const inventory = Array.from({ length: 25 }, (_, index) => ({
  name: `🇯🇵 [自建] 示例 ${index} [UDP]`,
  _sr: { sourceKind: "selfHosted", continent: "asiaPacific", udp: true, p2p: true, entry: true, chained: false },
}));
await mkdir("examples", { recursive: true });
for (const platform of ["macos", "iphone", "ipad"]) {
  const profile = renderProfile({ ...common, platform }, inventory);
  const report = validateProfile(profile);
  if (!report.valid) throw new Error(report.errors.join("; "));
  await writeFile(`examples/shadowrocket-${platform}.conf`, profile, "utf8");
}
```

- [ ] **Step 5: Implement network rule health checks**

```js
// scripts/check-rules.mjs
import { RULE_CATALOG } from "../src/rule-catalog.js";

const failures = [];
for (const item of RULE_CATALOG) {
  try {
    const response = await fetch(item.url, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "shadowrocket-profile-rule-check/1" } });
    const text = await response.text();
    const entries = text.split(/\r?\n/u).filter((line) => line.trim() && !line.trim().startsWith("#"));
    if (!response.ok) failures.push(`${item.id}: HTTP ${response.status}`);
    else if (entries.length < item.minEntries) failures.push(`${item.id}: ${entries.length} < ${item.minEntries}`);
    else if (entries.some((line) => !/^(?:DOMAIN|DOMAIN-SUFFIX|DOMAIN-KEYWORD|IP-CIDR|IP-CIDR6|USER-AGENT|PROCESS-NAME|URL-REGEX|IP-ASN|GEOIP|AND|OR|NOT),/u.test(line))) failures.push(`${item.id}: invalid line format`);
  } catch (error) {
    failures.push(`${item.id}: ${error.name}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`OK ${RULE_CATALOG.length} rule sets`);
}
```

- [ ] **Step 6: Implement a high-signal tracked/generated secret scan**

```js
// scripts/check-secrets.mjs
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
  .split(/\r?\n/u)
  .filter((file) => file && !file.endsWith("package-lock.json"));
const patterns = [
  /(?:ss|ssr|vmess|vless|trojan|snell|hysteria2):\/\/[A-Za-z0-9+/=_?&.%:@-]{16,}/iu,
  /(?:password|passwd|psk|private[-_ ]?key|token)\s*[:=]\s*(?!["']?TEST_ONLY)[^\s,}"']{12,}/iu,
  /https?:\/\/[^\s"'<>]+\/(?:download|share|api\/file)\/[^\s"'<>?]+[?&](?:token|key)=/iu,
];
const failures = [];
for (const file of files) {
  const text = await readFile(file, "utf8").catch(() => "");
  if (patterns.some((pattern) => pattern.test(text))) failures.push(file);
}
if (failures.length) {
  console.error(`Potential secret in: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`OK ${files.length} files scanned`);
}
```

- [ ] **Step 7: Update ignore rules, build, and run checks**

Append these exact lines to `.gitignore`:

```gitignore
node_modules/
coverage/
*.local
*.secret
diagnostics/private/
```

Run: `npm run build && npm run fixtures && node --test test/bundles.test.js test/security.test.js`

Expected: build succeeds; 2 tests PASS; both bundles contain no ESM imports.

Run: `npm run check:rules`

Expected: `OK 29 rule sets`. Treat transient network failure as a release gate, not as permission to lower thresholds.

- [ ] **Step 8: Commit build and checks**

```bash
git add .gitignore scripts test/bundles.test.js test/security.test.js examples dist
git commit -m "build: bundle and verify Sub-Store artifacts"
```

---

### Task 9: Write the zero-knowledge deployment, maintenance, diagnostics, and rollback manuals

**Files:**
- Create: `README.md`
- Create: `docs/deployment.md`
- Create: `docs/maintenance.md`
- Create: `docs/troubleshooting.md`
- Create: `docs/canary-checklist.md`
- Create: `test/docs.test.js`

**Interfaces:**
- Consumes: the exact names, parameters, filenames, defaults, and commands established above.
- Produces: a user can deploy without understanding Shadowrocket syntax and can return to the old Profile without editing generated files.

- [ ] **Step 1: Write a failing documentation completeness test**

```js
// test/docs.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("beginner docs contain every operational checkpoint and warning", async () => {
  const files = await Promise.all(["README.md", "docs/deployment.md", "docs/maintenance.md", "docs/troubleshooting.md", "docs/canary-checklist.md"].map((file) => readFile(file, "utf8")));
  const text = files.join("\n");
  for (const phrase of [
    "shadowrocket-nodes", "shadowrocket-config-macos", "shadowrocket-config-iphone", "shadowrocket-config-ipad",
    "每 6 小时", "每天", "Intel Mac", "iPhone", "iPad", "回滚", "HTTPS 解密", "iCloud",
    "私密转送", "AirPlay", "HomeKit", "NAS", "打印机", "7 天", "clientChain",
    "dnsMode", "quicMode", "ipv6Mode", "blockMode", "autoGroupMode", "评论地区",
  ]) assert.ok(text.includes(phrase), `missing documentation phrase: ${phrase}`);
});
```

- [ ] **Step 2: Run and verify missing-file failure**

Run: `node --test test/docs.test.js`

Expected: FAIL with `ENOENT` for `README.md`.

- [ ] **Step 3: Write `README.md` as the single entry point**

Use this exact navigation and safety copy:

```markdown
# Shadowrocket 多平台配置生成器

这个项目生成两个彼此分离的东西：

1. `shadowrocket-nodes`：私密节点订阅，含节点凭据，只在自己的 Sub-Store 与设备之间使用。
2. `shadowrocket-config-*`：macOS、iPhone、iPad 的配置 Profile，不含节点凭据。

第一次使用请严格按 [零基础部署手册](docs/deployment.md) 操作。日常增加节点或切换 DNS、QUIC、IPv6 时看 [维护速查](docs/maintenance.md)。出现网络、局域网、AI、评论地区或更新异常时看 [故障排查与回滚](docs/troubleshooting.md)。

安全边界：保持 HTTPS 解密关闭；不要公开 Sub-Store 管理地址、订阅地址、Profile 地址、Token、节点二维码或带完整 URL 的截图。代理只能改变网络出口，不能保证改变哔哩哔哩、抖音、小红书或微博显示的评论地区。
```

- [ ] **Step 4: Write `docs/deployment.md` with numbered UI actions and success signals**

The document must contain these exact sections and concrete values:

```markdown
# 零基础部署手册

## 0. 部署前备份
保留当前能用的节点订阅和 Profile，不重命名、不删除。记录在每台设备上切回旧 Profile 的位置。首次只在 Intel Mac 灰度。

## 1. 准备 Sub-Store 来源
把每个机场、自建、Realm、服务端链式和客户端落地订阅加入组合 `shadowrocket-sources`。显示名前缀分别使用 `[机场]`、`[自建]`、`[realm]`、`[链式代理]`、`[落地]`。只有确实需要 Shadowrocket 再套一层入口的节点才标 `[落地]`。

## 2. 创建节点 Script Operator
新建脚本，粘贴 `dist/substore-node-operator.js` 全文；把它放到 `shadowrocket-sources` 的脚本操作中。参数先填 `output=nodes&clientChain=off`。目标平台选 Shadowrocket。输出文件命名 `shadowrocket-nodes`，更新间隔设为每 6 小时。

成功标志：预览得到至少一个节点；国旗不重复；名称含统一来源标签；没有服务器地址、密码或 UUID 出现在日志统计中。预览为空时停止，不发布。

## 3. 创建三个配置 File Script Operator
分别创建 `shadowrocket-config-macos`、`shadowrocket-config-iphone`、`shadowrocket-config-ipad`，脚本都粘贴 `dist/substore-profile-generator.js` 全文。三份参数只改变 `platform`：

`output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=allow&ipv6Mode=auto&autoGroupMode=auto&clientChain=off`

把 `platform=macos` 分别改成 `iphone`、`ipad`。配置更新间隔设为每天。成功标志：预览首行附近出现 `[General]`，随后出现 `[Proxy Group]` 和 `[Rule]`，且没有节点密码。

## 4. Intel Mac 灰度
先导入 `shadowrocket-nodes`，在 Shadowrocket 中把这个远程订阅显示名设为 `Shadowrocket-Nodes`；再导入 `shadowrocket-config-macos`。不要覆盖旧 Profile。保持 HTTPS 解密关闭。

逐项执行 `docs/canary-checklist.md`。全部通过并稳定使用后再继续。

## 5. iPhone 与 iPad
按相同顺序导入共同的 `shadowrocket-nodes`，再分别导入 `shadowrocket-config-iphone` 和 `shadowrocket-config-ipad`。每台设备都保留旧 Profile。

## 6. 必须手工设置的客户端选项
开启始终连接和异常断开后恢复；开启连接、规则和 DNS 日志；设置自动删除 7 天前日志；关闭 Shadowrocket iCloud 节点自动同步；Shadowrocket 运行时不要叠加 iCloud 私密转送；节点订阅每 6 小时更新；Profile 每天更新；HTTPS 解密保持关闭。

## 7. 页面名称不完全相同时怎么找
Sub-Store 中先找“订阅/组合订阅”，再找“脚本操作/Script Operator”，最后找“文件/File”。Shadowrocket 中先找“数据/订阅”添加 `shadowrocket-nodes`，再找“配置/Config”添加平台 Profile。最新版本如果文字略有不同，只进入具有同一用途的页面，不点击“证书”“HTTPS 解密”“重写”。

每次只做一个动作并立即核对：订阅成功应看到节点数量；节点预览应看到统一标签；Profile 预览应看到三个 INI 段；Shadowrocket 更新成功应显示新的更新时间；策略组页应只看到洲组而没有大量国家组。任何一步看不到对应结果，停在当前设备，不继续到下一台。
```

- [ ] **Step 5: Write exact maintenance, troubleshooting, and canary content**

`docs/maintenance.md` must include:

```markdown
# 日常维护速查

- 新增机场：加入 `shadowrocket-sources`，名称以 `[机场]` 开头，不改生成器源码。
- 新增自建：使用 `[自建]协议名`；Realm 用 `[realm]`；服务器已完成链路用 `[链式代理]`。
- 协议：Snell 和 Shadowsocks 是两种独立协议；Shadowrocket 可使用两者，订阅中不要把 Snell 写成 Shadowsocks。
- 客户端链式：只有落地标 `[落地]`，把两份文件参数同时改为 `clientChain=on`；Hysteria2 不生成链式副本。
- DNS：修改 `dnsMode`、`chinaDns`、`globalDns` 后重新生成并更新 Profile，不是热切换。
- QUIC：修改 `quicMode=allow|proxy-block|all-block` 后更新 Profile，不是热切换。
- IPv6：正常使用 `ipv6Mode=auto`；只在排障时临时改 `ipv4-only`。
- 广告：`☣️ 安全威胁`、`🧱 常见广告`、`🕵️ 严格跟踪`可在客户端热切换；`blockMode`只决定首次默认值。
- HTTPS 解密：始终关闭；广告规则中的域名/IP 项仍会工作，需要解密 HTTPS 路径的 URL 正则不会生效，不为提高拦截率安装证书。
- AI：在 `🤖 AI 专用`里手动选一个稳定具体节点；更新后确认选择仍保留。
- 四个国内平台：各自策略组默认 DIRECT，需要时单独选节点；代理不能保证评论地区改变。
- 游戏连接：默认 DIRECT，只显示明确 `[UDP]` 节点；游戏网页由 `🕹️ 游戏平台`控制。
- 下载/P2P：默认 DIRECT，候选不含 `[机场]`。
```

Write `docs/troubleshooting.md` with this exact decision tree:

```markdown
# 故障排查与回滚

固定顺序：切回旧 Profile → 判断节点/规则/DNS/局域网/IPv6 → 生成脱敏统计 → 只分享统计。先恢复可用网络，再排查；不要删除旧 Profile。

## 节点更新失败
在 Sub-Store 预览 `shadowrocket-sources`。原始来源为空就检查来源；原始有节点而 `shadowrocket-nodes` 为空就查看排除原因计数。不要截图节点详情。恢复前一次可用订阅，节点数量正常后再更新设备。

## 规则下载失败
运行 `npm run check:rules`。首次部署有任何规则失败就停止灰度；已安装设备先保留 Shadowrocket 上一次可用缓存和旧 Profile。不要用空规则覆盖现有配置。

## DNS 污染或网站指向异常
先确认命中的规则和 DNS 日志；把 `dnsMode` 保持或改回 `stable`，分别测试 `chinaDns=alidns|dnspod` 和 `globalDns=cloudflare|google|quad9`，每次重新生成并更新 Profile。不要同时改 QUIC、IPv6 和 DNS。

## AirPlay、HomeKit、NAS、打印机或路由器失效
先切旧 Profile 验证设备本身；再确认目标是 `.local`、私有 IPv4/IPv6 或 mDNS，规则命中必须是 DIRECT。不要给局域网地址强制主代理。确认同一 Wi-Fi、系统本地网络权限和访客网络隔离。

## IPv6 异常
在 IPv4、双栈、可取得的 IPv6-only 网络分别测试。仅为定位问题临时设 `ipv6Mode=ipv4-only`；如果 IPv6-only 网络因此无法工作，这是预期排障结果，应恢复 `auto`，检查 DNS AAAA 和节点 IPv6 可达性。

## AI 登录或风控
在 `🤖 AI 专用`固定一个地区和节点，不频繁更换；核对账号地区、付款地区和服务条款。代理只能改变网络出口，不能保证解除账号风控。

## 评论地区没有变化
分别切换哔哩哔哩、抖音、小红书或微博对应策略组，确认规则日志命中该组。即使出口已改变，账号、手机号、GPS、缓存和平台风控仍可能决定评论地区；本项目不伪造 GPS，也不承诺显示变化。

## 可以分享什么
只分享平台、节点总数、协议计数、地区计数、来源计数、排除原因计数和规则健康状态。绝不能分享服务器、端口与凭据组合、密码、PSK、UUID、私钥、订阅 URL、Profile URL、Token、二维码或包含完整地址栏的截图。
```

Write `docs/canary-checklist.md` with these exact checks:

```markdown
# Intel Mac 灰度清单

- [ ] 旧节点订阅和旧 Profile 均可立即选回。
- [ ] `shadowrocket-nodes` 手动更新成功，节点数量不是 0。
- [ ] 常用中国网站直连，常用境外网站经 `🚀 节点选择`。
- [ ] 一个未列规则但解析为中国 IP 的测试目标命中 `GEOIP,CN,DIRECT`。
- [ ] 一个未列规则的境外目标命中 `FINAL,🚀 节点选择`。
- [ ] `🤖 AI 专用`固定具体节点，OpenAI、Claude、Gemini、Copilot 与常用其他 AI 分流正确。
- [ ] GitHub 命中 `🐙 GitHub`，早于 Microsoft 规则。
- [ ] 哔哩哔哩、抖音、小红书、微博各自能在 DIRECT 与具体节点间单独切换。
- [ ] `☣️ 安全威胁`、`🧱 常见广告`、`🕵️ 严格跟踪`各自能在 REJECT 与 DIRECT 间热切换。
- [ ] 连接、规则和 DNS 日志可查看，且自动删除 7 天前日志。
- [ ] IPv4 网络正常。
- [ ] 双栈网络的 IPv4 和 IPv6 都不绕过规则。
- [ ] 有条件时验证 IPv6-only 网络；无条件时保留未勾选并注明网络不可用。
- [ ] `quicMode=allow` 正常；另存测试 Profile 验证 `proxy-block` 与 `all-block` 后切回 `allow`。
- [ ] 路由器管理页和其他局域网目标 DIRECT。
- [ ] AirPlay 正常。
- [ ] HomeKit 正常。
- [ ] NAS 正常。
- [ ] 打印机正常。
- [ ] `⬇️ 下载/P2P`候选没有 `[机场]`。
- [ ] `🎮 游戏连接`只出现明确带 `[UDP]` 的节点，默认 DIRECT。
- [ ] 更新一次 Profile 后，AI 和其他手动策略选择仍保留；若未保留，在推广前记录并处理。
- [ ] 实际切回旧 Profile 一次，确认回滚无需删除新 Profile。
```

- [ ] **Step 6: Run docs test and commit**

Run: `node --test test/docs.test.js`

Expected: 1 test PASS.

```bash
git add README.md docs/deployment.md docs/maintenance.md docs/troubleshooting.md docs/canary-checklist.md test/docs.test.js
git commit -m "docs: add beginner deployment and rollback guides"
```

---

### Task 10: Perform release verification and prepare the canary handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/canary-checklist.md`
- Create: `RELEASE_CHECKLIST.md`

**Interfaces:**
- Consumes: all code, artifacts, tests, health checks, and manuals from Tasks 1–9.
- Produces: a reproducible local release candidate ready for the user to paste into Sub-Store and test on Intel Mac.

- [ ] **Step 1: Write the release checklist**

```markdown
# Release Checklist

- [ ] `node --version` is 22 or newer.
- [ ] `npm ci` succeeds from a clean dependency directory.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds twice with byte-identical `dist/` output.
- [ ] `npm run fixtures` succeeds twice with byte-identical `examples/` output.
- [ ] `npm run check:rules` reports every catalog rule healthy.
- [ ] `npm run check:secrets` reports no potential secret.
- [ ] Node bundle executes through a Sub-Store functional Script Operator preview.
- [ ] Profile bundle executes through a Sub-Store File Script Operator preview.
- [ ] Preview diagnostics contain only totals and category counts.
- [ ] macOS, iPhone, and iPad Profiles contain `[General]`, `[Proxy Group]`, and `[Rule]`.
- [ ] No Profile contains a server, port/credential pair, UUID, PSK, key, Token, subscription URL, or Profile URL.
- [ ] Old Intel Mac subscription and Profile remain available before canary import.
- [ ] User, not the build process, confirms the Intel Mac canary checklist.
```

- [ ] **Step 2: Run complete offline verification**

Run: `npm ci && npm run verify`

Expected: all tests PASS; both bundles and three examples are regenerated; secret scan prints `OK`.

- [ ] **Step 3: Verify deterministic artifacts**

Run:

```bash
shasum -a 256 dist/*.js examples/*.conf > /tmp/shadowrocket-profile-before.sha256
npm run build
npm run fixtures
shasum -a 256 dist/*.js examples/*.conf > /tmp/shadowrocket-profile-after.sha256
diff -u /tmp/shadowrocket-profile-before.sha256 /tmp/shadowrocket-profile-after.sha256
```

Expected: `diff` exits 0 with no output.

- [ ] **Step 4: Run the online release gate**

Run: `npm run check:rules`

Expected: `OK 29 rule sets`. If the network is unavailable, do not claim the release candidate is ready; rerun when network access is restored.

- [ ] **Step 5: Inspect generated output without exposing private data**

Run:

```bash
node --test
grep -nE '^\[(General|Proxy Group|Rule)\]$|^FINAL,|^GEOIP,CN' examples/shadowrocket-macos.conf
git diff --check
git status --short
```

Expected: tests pass; the three section headers appear once; `GEOIP,CN,DIRECT` appears before `FINAL,🚀 节点选择`; `git diff --check` is silent; only intended release files are modified or untracked.

- [ ] **Step 6: Add the handoff links and commit the release candidate**

Append to `README.md`:

```markdown
## 部署入口

- [零基础部署](docs/deployment.md)
- [Intel Mac 灰度清单](docs/canary-checklist.md)
- [日常维护速查](docs/maintenance.md)
- [故障排查与回滚](docs/troubleshooting.md)
- [发布检查](RELEASE_CHECKLIST.md)
```

Run:

```bash
git add README.md RELEASE_CHECKLIST.md docs/canary-checklist.md dist examples
git commit -m "chore: prepare Shadowrocket canary release"
git status --short
```

Expected: commit succeeds and final `git status --short` has no output.

---

## Execution Notes

- At execution time, create an isolated worktree with `superpowers:using-git-worktrees` before Task 1.
- Use `superpowers:test-driven-development` for every implementation task and preserve the red/green evidence stated above.
- Use `superpowers:verification-before-completion` before reporting any task, bundle, or release candidate as successful.
- Do not perform the Intel Mac, iPhone, or iPad UI acceptance on the user's behalf without the user present; code completion ends at a verified canary candidate, and product acceptance ends only after the user checks `docs/canary-checklist.md`.
- The public Sub-Store admin interface remains an acknowledged out-of-scope risk. Do not broaden this implementation into server hardening.

