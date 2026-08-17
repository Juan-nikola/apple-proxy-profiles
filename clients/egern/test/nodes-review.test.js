import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CLIENT } from "../../../shared/contracts.js";
import { evaluateNodeForClient, filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { validateNode } from "../../../shared/nodes/node-validation.js";
import { toEgernProxy } from "../src/render-node.js";
import { renderEgernSubscription } from "../src/render-subscription.js";
import { fixture, shadowsocks2022, vmessRaw } from "./fixtures/nodes.js";

const COMMON_RAW = Object.freeze({
  server: "review.example.invalid",
  port: 443,
  _subName: "[机场] TEST_ONLY_REVIEW_SOURCE",
});

function raw(name, type, fields = {}) {
  return { ...COMMON_RAW, name, type, ...fields };
}

function accepted(node) {
  assert.deepEqual(evaluateNodeForClient(node, CLIENT.egern), { supported: true, reason: null });
  return node;
}

test("raw optional-shape failures render the compatible subset with protocol counts", () => {
  const normalized = normalizeNodes([
    raw("Good SS", "ss", { cipher: "aes-128-gcm", password: "TEST_ONLY_GOOD_SS_PASSWORD" }),
    raw("Bad SOCKS auth", "socks5", { username: { nested: true } }),
    raw("Bad HTTP auth", "http", { password: ["TEST_ONLY_BAD_HTTP_PASSWORD"] }),
    raw("Bad Hysteria obfs auth", "hy2", {
      password: "TEST_ONLY_BAD_HY2_AUTH",
      obfs: "salamander",
      "obfs-password": { nested: true },
    }),
  ]);
  const seen = [];
  const yaml = renderEgernSubscription(normalized.nodes, {
    clientChain: "off",
    onDiagnostics(value) { seen.push(value); },
  });
  assert.match(yaml, /Good · SS/u);
  for (const secret of ["Bad SOCKS auth", "TEST_ONLY_BAD_HY2_AUTH"]) {
    assert.equal(yaml.includes(secret), false);
  }
  assert.deepEqual(seen, [{
    accepted: 1,
    excluded: {},
    renderFailures: { http: 1, hy2: 1, socks5: 1 },
  }]);
});

test("SubStore source entries do not import the compatibility filter", () => {
  const entries = [
    "../../egern/src/render-subscription.js",
    "../../anywhere/src/render-subscription.js",
    "../../shadowrocket/src/substore-node-entry.js",
    "../../shadowrocket/src/substore-node-subscription-entry.js",
    "../../shadowrocket/src/substore-profile-entry.js",
    "../../surge/src/substore-nodes-entry.js",
    "../../surge/src/substore-profile-entry.js",
    "../../sing-box/src/substore-config-entry.js",
  ];
  for (const entry of entries) {
    const source = readFileSync(new URL(entry, import.meta.url), "utf8");
    assert.equal(source.includes("filterNodesForClient"), false, entry);
  }
});

test("compatibility diagnostics stay total while malformed nodes are skipped", () => {
  const malformed = [
    { ...shadowsocks2022, name: { nested: true } },
    { ...shadowsocks2022, server: ["bad.example.invalid"] },
    { ...shadowsocks2022, port: { value: 443 } },
    { ...shadowsocks2022, tfo: [] },
    { ...shadowsocks2022, udp: {} },
    { ...fixture("Bad TUIC ALPN", "tuic", {
      uuid: "00000000-0000-4000-8000-000000000001",
      password: "TEST_ONLY_TUIC_AUTH",
      alpn: ["h3", {}],
    }) },
  ];
  for (const node of malformed) {
    assert.doesNotThrow(() => evaluateNodeForClient(node, CLIENT.egern));
    assert.deepEqual(evaluateNodeForClient(node, CLIENT.egern), {
      supported: false,
      reason: "invalid-egern-node-shape",
    });
  }
  const diagnostics = [];
  const yaml = renderEgernSubscription([shadowsocks2022, ...malformed], {
    clientChain: "off",
    onDiagnostics(value) { diagnostics.push(value); },
  });
  assert.match(yaml, /SS 2022/u);
  assert.deepEqual(diagnostics, [{
    accepted: 1,
    excluded: {},
    renderFailures: { ss: 5, tuic: 1 },
  }]);
});

test("validates every TUIC hopping alias before mapping a mixed inventory", () => {
  const good = fixture("TUIC aliases", "tuic", {
    uuid: "00000000-0000-4000-8000-000000000001",
    password: "TEST_ONLY_TUIC_ALIAS_PASSWORD",
    ports: "443,445-447",
    "hop-interval": 30,
  });
  const invalid = [
    fixture("TUIC bad ports", "tuic", {
      uuid: "00000000-0000-4000-8000-000000000001",
      password: "TEST_ONLY_TUIC_BAD_PORTS_PASSWORD",
      ports: { start: 443 },
    }),
    fixture("TUIC bad interval", "tuic", {
      uuid: "00000000-0000-4000-8000-000000000001",
      password: "TEST_ONLY_TUIC_BAD_INTERVAL_PASSWORD",
      "hop-interval": "30",
    }),
  ];
  const diagnostics = [];
  const yaml = renderEgernSubscription([good, ...invalid], {
    clientChain: "off",
    onDiagnostics(value) { diagnostics.push(value); },
  });
  assert.match(yaml, /TUIC aliases/u);
  assert.deepEqual(diagnostics, [{
    accepted: 1,
    excluded: {},
    renderFailures: { tuic: 2 },
  }]);
});

test("rejects semantic alias conflicts and case-insensitive HTTP header duplicates", () => {
  const conflicts = [
    { ...vmessRaw, cipher: "auto", security: "aes-128-gcm" },
    { ...vmessRaw, "ws-opts": undefined, network: "http", "http-opts": {
      headers: { Host: "one.example.invalid", host: "two.example.invalid" },
    } },
    { ...vmessRaw, sni: "one.example.invalid", servername: "two.example.invalid", tls: true },
    { ...vmessRaw, "skip-cert-verify": true, "allow-insecure": false, tls: true },
    fixture("Hopping conflict", "hy2", {
      password: "TEST_ONLY_HOPPING_AUTH",
      ports: "1000-2000",
      "port-hopping": "3000-4000",
    }),
    fixture("SSH key conflict", "ssh", {
      username: "TEST_ONLY_SSH_USERNAME",
      password: "TEST_ONLY_SSH_PASSWORD",
      "private-key": "TEST_ONLY_SSH_KEY_ONE",
      private_key: "TEST_ONLY_SSH_KEY_TWO",
    }),
  ];
  for (const node of conflicts) {
    assert.deepEqual(evaluateNodeForClient(node, CLIENT.egern), {
      supported: false,
      reason: "conflicting-egern-alias",
    });
  }

  const sameHostAliases = {
    ...vmessRaw,
    network: "http",
    "http-opts": {
      headers: {
        Host: "same.example.invalid",
        hOsT: "same.example.invalid",
      },
    },
  };
  assert.deepEqual(evaluateNodeForClient(sameHostAliases, CLIENT.egern), { supported: true, reason: null });
  assert.deepEqual(toEgernProxy(sameHostAliases, { clientChain: "off" }).vmess.transport, {
    http1: { headers: { Host: "same.example.invalid" } },
  });
});

test("accepts only URL-safe Base64 Reality public keys and hexadecimal short IDs", () => {
  const valid = {
    ...vmessRaw,
    tls: true,
    security: "reality",
    "reality-opts": {
      "public-key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "short-id": "0123abcd",
    },
  };
  assert.deepEqual(evaluateNodeForClient(valid, CLIENT.egern), { supported: true, reason: null });
  for (const reality of [
    { "public-key": "not+url/safe=" },
    { "public-key": "short" },
    { "public-key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "short-id": "not-hex" },
  ]) {
    assert.deepEqual(evaluateNodeForClient({ ...valid, "reality-opts": reality }, CLIENT.egern), {
      supported: false,
      reason: "incomplete-egern-reality",
    });
  }
});

test("raw WireGuard accepts one peer public key without a redundant top-level alias", () => {
  const source = raw("Peer-only WireGuard", "wireguard", {
    "private-key": "TEST_ONLY_PEER_ONLY_PRIVATE_KEY",
    ip: "192.0.2.8/32",
    peers: [{
      server: "review.example.invalid",
      port: 443,
      "public-key": "TEST_ONLY_PEER_ONLY_PUBLIC_KEY",
      "pre-shared-key": "TEST_ONLY_PEER_ONLY_PRESHARED_KEY",
    }],
  });
  assert.deepEqual(validateNode(source), { valid: true, reason: null, warnings: [] });
  const normalized = normalizeNodes([source]);
  const yaml = renderEgernSubscription(normalized.nodes, { clientChain: "off" });
  assert.match(yaml, /peer_public_key: "TEST_ONLY_PEER_ONLY_PUBLIC_KEY"/);
  assert.equal(yaml.includes("public-key"), false);
});

test("accepts equal WireGuard DNS aliases once and rejects unequal or malformed aliases", () => {
  const base = fixture("WireGuard DNS aliases", "wireguard", {
    "private-key": "TEST_ONLY_DNS_PRIVATE_KEY",
    "public-key": "TEST_ONLY_DNS_PUBLIC_KEY",
    ip: "192.0.2.10/32",
  });
  const equal = {
    ...base,
    dns_servers: ["192.0.2.53", "2001:db8::53"],
    dns: ["192.0.2.53", "2001:db8::53"],
  };
  assert.deepEqual(evaluateNodeForClient(equal, CLIENT.egern), { supported: true, reason: null });
  assert.deepEqual(toEgernProxy(equal, { clientChain: "off" }).wireguard.dns_servers, [
    "192.0.2.53",
    "2001:db8::53",
  ]);

  assert.deepEqual(evaluateNodeForClient({
    ...base,
    dns_servers: ["192.0.2.53"],
    dns: ["192.0.2.54"],
  }, CLIENT.egern), {
    supported: false,
    reason: "conflicting-egern-alias",
  });

  for (const node of [
    { ...base, dns: "192.0.2.53" },
    { ...base, dns: ["192.0.2.53", { nested: true }] },
    { ...base, dns_servers: ["192.0.2.53"], dns: ["192.0.2.53", {}] },
  ]) {
    assert.equal(evaluateNodeForClient(node, CLIENT.egern).supported, false);
  }
});

test("preserves opaque passwords and an inline SSH key byte-exact through the raw pipeline", () => {
  const opaquePassword = "  TEST_ONLY_OPAQUE_PASSWORD \n";
  const inlineKey = [
    ["-----BEGIN", "OPENSSH PRIVATE KEY-----"].join(" "),
    "TEST_ONLY_INLINE_SSH_KEY_MATERIAL",
    ["-----END", "OPENSSH PRIVATE KEY-----"].join(" "),
    "",
  ].join("\n");
  const source = [
    raw("Opaque Shadowsocks", "ss", {
      cipher: "aes-128-gcm",
      password: opaquePassword,
    }),
    raw("Opaque SSH", "ssh", {
      username: "TEST_ONLY_SSH_USERNAME",
      password: opaquePassword,
      "private-key": inlineKey,
    }),
  ];

  const normalized = normalizeNodes(source).nodes;
  const filtered = filterNodesForClient(normalized, CLIENT.egern);
  assert.equal(filtered.nodes.length, 2);
  const mapped = filtered.nodes.map((node) => toEgernProxy(node, { clientChain: "off" }));
  const shadowsocks = mapped.find((proxy) => proxy.shadowsocks)?.shadowsocks;
  const ssh = mapped.find((proxy) => proxy.ssh)?.ssh;
  assert.equal(shadowsocks.password, opaquePassword);
  assert.equal(ssh.password, opaquePassword);
  assert.equal(ssh.private_key, inlineKey);
  assert.equal(ssh.private_key.endsWith("\n"), true);

  for (const invalid of [
    { ...source[0], password: " \n\t " },
    { ...source[1], "private-key": "\n\t" },
    { ...source[1], username: " TEST_ONLY_SSH_USERNAME " },
    { ...source[1], server: " review.example.invalid " },
  ]) {
    assert.equal(evaluateNodeForClient({ ...invalid, _profile: undefined }, CLIENT.egern).supported, false);
  }
});

test("maps latest common Egern options and rejects unsupported appearances", () => {
  const latest = accepted({
    ...shadowsocks2022,
    "block-quic": true,
    "ip-version": "v4_prefer",
    "shadow-tls-opts": {
      password: "TEST_ONLY_SHADOW_TLS_PASSWORD",
      sni: "shadow-tls.example.invalid",
    },
  });
  assert.deepEqual(toEgernProxy(latest, { clientChain: "off" }).shadowsocks, {
    name: "SS 2022",
    server: "ss-2022.example.invalid",
    port: 443,
    method: "2022-blake3-aes-128-gcm",
    password: "TEST_ONLY_SS_2022_KEY",
    udp_relay: true,
    block_quic: true,
    shadow_tls: {
      password: "TEST_ONLY_SHADOW_TLS_PASSWORD",
      sni: "shadow-tls.example.invalid",
    },
    ip_version: "v4_prefer",
  });

  for (const node of [
    fixture("HY ShadowTLS", "hy2", { password: "TEST_ONLY_HY_AUTH", "shadow-tls": { password: "TEST_ONLY_SHADOW_AUTH" } }),
    fixture("HTTP block", "http", { "block-quic": true }),
    fixture("Bad IP enum", "socks5", { "ip-version": "ipv4" }),
    fixture("Bad ShadowTLS", "socks5", { "shadow-tls": { password: [] } }),
  ]) {
    assert.equal(evaluateNodeForClient(node, CLIENT.egern).supported, false);
  }
});

test("enforces the complete block QUIC, IP version, and ShadowTLS protocol matrices", () => {
  function matrixNode(protocol) {
    const common = {
      name: `Matrix ${protocol}`,
      type: protocol,
      server: "matrix.example.invalid",
      port: 443,
    };
    if (protocol === "ss" || protocol === "shadowsocks") {
      return { ...common, cipher: "aes-128-gcm", password: "TEST_ONLY_MATRIX_PASSWORD" };
    }
    if (protocol === "snell") return { ...common, psk: "TEST_ONLY_MATRIX_PSK", version: 4 };
    if (protocol === "vmess" || protocol === "vless") {
      return { ...common, uuid: "00000000-0000-4000-8000-000000000001", network: "tcp" };
    }
    if (["trojan", "anytls", "hysteria2", "hy2"].includes(protocol)) {
      return { ...common, password: "TEST_ONLY_MATRIX_PASSWORD" };
    }
    if (protocol === "tuic") {
      return {
        ...common,
        uuid: "00000000-0000-4000-8000-000000000001",
        password: "TEST_ONLY_MATRIX_PASSWORD",
      };
    }
    if (protocol === "ssh") {
      return {
        ...common,
        username: "TEST_ONLY_MATRIX_USERNAME",
        password: "TEST_ONLY_MATRIX_PASSWORD",
      };
    }
    if (protocol === "wireguard") {
      return {
        ...common,
        "private-key": "TEST_ONLY_MATRIX_PRIVATE_KEY",
        "public-key": "TEST_ONLY_MATRIX_PUBLIC_KEY",
        ip: "192.0.2.9/32",
      };
    }
    return common;
  }

  const protocols = [
    "ss", "shadowsocks", "snell", "vmess", "vless", "trojan", "anytls",
    "hysteria2", "hy2", "tuic", "socks5", "http", "ssh", "wireguard",
  ];
  const blockQuic = new Set(protocols.filter((protocol) => protocol !== "http"));
  const shadowTls = new Set(["ss", "shadowsocks", "vmess", "vless", "trojan", "anytls", "socks5", "http", "ssh"]);

  for (const protocol of protocols) {
    const ipNode = { ...matrixNode(protocol), "ip-version": "dual_stack" };
    assert.deepEqual(evaluateNodeForClient(ipNode, CLIENT.egern), { supported: true, reason: null }, `${protocol} ip_version`);
    const ipProxy = toEgernProxy(ipNode, { clientChain: "off" });
    assert.equal(ipProxy[Object.keys(ipProxy)[0]].ip_version, "dual_stack", `${protocol} ip_version mapping`);

    const blockNode = { ...matrixNode(protocol), "block-quic": true };
    assert.deepEqual(
      evaluateNodeForClient(blockNode, CLIENT.egern),
      blockQuic.has(protocol)
        ? { supported: true, reason: null }
        : { supported: false, reason: "unsupported-egern-option" },
      `${protocol} block_quic`,
    );
    if (blockQuic.has(protocol)) {
      const blockProxy = toEgernProxy(blockNode, { clientChain: "off" });
      assert.equal(blockProxy[Object.keys(blockProxy)[0]].block_quic, true, `${protocol} block_quic mapping`);
    }

    const shadowNode = {
      ...matrixNode(protocol),
      "shadow-tls": { password: "TEST_ONLY_MATRIX_SHADOW_TLS_PASSWORD" },
    };
    assert.deepEqual(
      evaluateNodeForClient(shadowNode, CLIENT.egern),
      shadowTls.has(protocol)
        ? { supported: true, reason: null }
        : { supported: false, reason: "unsupported-egern-option" },
      `${protocol} shadow_tls`,
    );
    if (shadowTls.has(protocol)) {
      const shadowProxy = toEgernProxy(shadowNode, { clientChain: "off" });
      assert.deepEqual(shadowProxy[Object.keys(shadowProxy)[0]].shadow_tls, {
        password: "TEST_ONLY_MATRIX_SHADOW_TLS_PASSWORD",
      }, `${protocol} shadow_tls mapping`);
    }
  }
});

test("supports current official SSH only for Egern with complete authentication", () => {
  const ssh = raw("SSH full", "ssh", {
    username: "TEST_ONLY_SSH_USERNAME",
    password: "TEST_ONLY_SSH_PASSWORD",
    "private-key": "TEST_ONLY_SSH_PRIVATE_KEY",
    "host-keys": ["ssh-ed25519 TEST_ONLY_SSH_HOST_KEY"],
    tfo: true,
    "block-quic": true,
    "ip-version": "v6_prefer",
    "shadow-tls": {
      password: "TEST_ONLY_SSH_SHADOW_TLS_PASSWORD",
      sni: "ssh-shadow.example.invalid",
    },
  });
  assert.deepEqual(validateNode(ssh), { valid: true, reason: null, warnings: [] });
  const normalized = normalizeNodes([ssh]).nodes[0];
  assert.deepEqual(evaluateNodeForClient(normalized, CLIENT.egern), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient(normalized, CLIENT.shadowrocket), { supported: false, reason: "unsupported-protocol" });
  assert.deepEqual(evaluateNodeForClient(normalized, CLIENT.anywhere), { supported: false, reason: "unsupported-protocol" });
  assert.deepEqual(toEgernProxy(normalized, { clientChain: "off" }).ssh, {
    name: normalized.name,
    server: "review.example.invalid",
    port: 443,
    username: "TEST_ONLY_SSH_USERNAME",
    password: "TEST_ONLY_SSH_PASSWORD",
    private_key: "TEST_ONLY_SSH_PRIVATE_KEY",
    host_keys: ["ssh-ed25519 TEST_ONLY_SSH_HOST_KEY"],
    tfo: true,
    block_quic: true,
    shadow_tls: {
      password: "TEST_ONLY_SSH_SHADOW_TLS_PASSWORD",
      sni: "ssh-shadow.example.invalid",
    },
    ip_version: "v6_prefer",
  });

  for (const invalid of [
    raw("SSH no auth", "ssh", { username: "TEST_ONLY_SSH_USERNAME" }),
    raw("SSH no username", "ssh", { password: "TEST_ONLY_SSH_PASSWORD" }),
  ]) {
    assert.deepEqual(validateNode(invalid), { valid: false, reason: "missing-auth", warnings: [] });
  }
  assert.deepEqual(evaluateNodeForClient({ ...normalized, "host-keys": {} }, CLIENT.egern), {
    supported: false,
    reason: "invalid-egern-node-shape",
  });
});

test("only Egern subscription rendering generates one eligible SSH landing chain", () => {
  const entry = raw("SSH chain entry", "ss", {
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_CHAIN_ENTRY_PASSWORD",
    _subName: "[自建] Entry",
  });
  const landing = raw("SSH landing", "ssh", {
    username: "TEST_ONLY_SSH_USERNAME",
    password: "TEST_ONLY_SSH_PASSWORD",
    _subName: "[落地] SSH",
  });
  const result = normalizeNodes([entry, landing], { clientChain: "on" });
  assert.equal(result.nodes.some((node) => node.type === "ssh" && node._profile.chained), false);
  assert.equal(result.diagnostics.excluded["chain-protocol-unsupported"], 1);

  const diagnostics = [];
  const yaml = renderEgernSubscription(result.nodes, {
    clientChain: "on",
    onDiagnostics(value) { diagnostics.push(value); },
  });
  assert.equal((yaml.match(/^  - ssh:$/gm) ?? []).length, 2);
  assert.equal((yaml.match(/prev_hop: "🔗 入口节点"/g) ?? []).length, 1);
  assert.deepEqual(diagnostics, [{ accepted: 3, excluded: {} }]);

  const noEntry = normalizeNodes([landing], { clientChain: "on" });
  const noEntryYaml = renderEgernSubscription(noEntry.nodes, { clientChain: "on" });
  assert.equal(noEntryYaml.includes("prev_hop"), false);

  const unsupportedEntry = raw("Unsupported entry", "sudoku", {
    key: "TEST_ONLY_SUDOKU_KEY",
    _subName: "[自建] Unsupported Entry",
  });
  const unsupported = normalizeNodes([unsupportedEntry, landing], { clientChain: "on" });
  const unsupportedDiagnostics = [];
  const unsupportedYaml = renderEgernSubscription(unsupported.nodes, {
    clientChain: "on",
    onDiagnostics(value) { unsupportedDiagnostics.push(value); },
  });
  assert.match(unsupportedYaml, /landing · SSH/u);
  assert.deepEqual(unsupportedDiagnostics, [{
    accepted: 1,
    excluded: {},
    renderFailures: { sudoku: 1 },
  }]);

  const arbitraryLanding = { ...landing, chain: "PRIVATE_EXISTING_CHAIN" };
  const arbitrary = normalizeNodes([entry, arbitraryLanding], { clientChain: "on" });
  const arbitraryDiagnostics = [];
  const arbitraryYaml = renderEgernSubscription(arbitrary.nodes, {
    clientChain: "on",
    onDiagnostics(value) { arbitraryDiagnostics.push(value); },
  });
  assert.match(arbitraryYaml, /chain entry/u);
  assert.equal(arbitraryYaml.includes("PRIVATE_EXISTING_CHAIN"), false);
  assert.deepEqual(arbitraryDiagnostics, [{
    accepted: 1,
    excluded: {},
    renderFailures: { ssh: 1 },
  }]);
});
