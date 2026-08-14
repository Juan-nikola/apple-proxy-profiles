import test from "node:test";
import assert from "node:assert/strict";
import { CLIENT } from "../shared/contracts.js";
import { evaluateNodeForClient, filterNodesForClient, oneXrayNodeExclusionReason } from "../shared/nodes/capabilities.js";
import { diagnosticProtocol, protocolDisplayLabel } from "../shared/nodes/protocol-registry.js";
import { assertRenderableNodes } from "../shared/nodes/renderability.js";

const ALLOWED_PROTOCOLS = Object.freeze({
  [CLIENT.shadowrocket]: ["ss", "shadowsocks", "ssr", "snell", "vmess", "vless", "trojan", "hysteria2", "hy2", "tuic", "socks5", "http"],
  [CLIENT.egern]: ["ss", "shadowsocks", "snell", "vmess", "vless", "trojan", "anytls", "hysteria2", "hy2", "tuic", "socks5", "http", "ssh", "wireguard"],
  [CLIENT.anywhere]: ["ss", "shadowsocks", "vless", "trojan", "anytls", "hysteria2", "hy2", "socks5", "sudoku"],
  onexray: ["vless", "vmess", "ss", "trojan", "socks5", "http", "hysteria2"],
});

const ALL_PROTOCOLS = [...new Set(Object.values(ALLOWED_PROTOCOLS).flat())];

test("labels known protocols while preserving unknown diagnostics as count-only", () => {
  assert.equal(protocolDisplayLabel(" VLESS "), "VLESS");
  assert.equal(protocolDisplayLabel("anytls"), "AnyTLS");
  assert.equal(protocolDisplayLabel("quicx"), "quicx");
  assert.equal(protocolDisplayLabel(""), "unknown");
  assert.equal(protocolDisplayLabel(null), "unknown");
  assert.equal(diagnosticProtocol("quicx"), "unknown");
});

test("renderability preserves normalized unknown protocol counts without leaking node values", () => {
  const nodes = [
    {
      name: "PRIVATE_FUTURE_NODE_ONE",
      type: " Future-Proto ",
      server: "future-one.example.invalid",
      port: 443,
      password: "TEST_ONLY_FUTURE_PASSWORD_ONE",
    },
    {
      name: "PRIVATE_FUTURE_NODE_TWO",
      type: "future-proto",
      server: "future-two.example.invalid",
      port: 8443,
      password: "TEST_ONLY_FUTURE_PASSWORD_TWO",
    },
  ];
  let probes = 0;
  assert.throws(
    () => assertRenderableNodes(nodes, "TestClient", (node) => {
      probes += 1;
      throw new Error(`private renderer failure: ${node.name}`);
    }),
    (error) => {
      assert.equal(error.message, "TestClient cannot render selected protocols: future-proto=2");
      for (const node of nodes) {
        for (const value of [node.name, node.server, node.port, node.password]) {
          assert.equal(error.message.includes(String(value)), false);
        }
      }
      return true;
    },
  );
  assert.equal(probes, 2);
});

function nodeForCapability(protocol, client) {
  if (client === "onexray") {
    const common = {
      name: `OneXray ${protocol}`,
      type: protocol,
      server: "onexray-capability.example.invalid",
      port: 443,
      _profile: { chained: false },
    };
    if (protocol === "ss" || protocol === "shadowsocks") {
      return { ...common, cipher: "aes-128-gcm", password: "TEST_ONLY_ONEXRAY_SS_PASSWORD" };
    }
    if (protocol === "vmess" || protocol === "vless") {
      return { ...common, uuid: "00000000-0000-4000-8000-000000000001", network: "raw" };
    }
    if (["trojan", "hysteria2", "hy2"].includes(protocol)) {
      return { ...common, password: "TEST_ONLY_ONEXRAY_PASSWORD" };
    }
    if (protocol === "socks5" || protocol === "http") return common;
    return common;
  }
  if (client === CLIENT.anywhere) {
    const common = {
      name: `Anywhere ${protocol}`,
      type: protocol,
      server: "anywhere-capability.example.invalid",
      port: 443,
    };
    if (protocol === "ss" || protocol === "shadowsocks") {
      return { ...common, cipher: "aes-128-gcm", password: "TEST_ONLY_ANYWHERE_SS_PASSWORD" };
    }
    if (protocol === "vless") {
      return { ...common, uuid: "00000000-0000-4000-8000-000000000001", network: "tcp" };
    }
    if (["trojan", "anytls"].includes(protocol)) {
      return { ...common, password: "TEST_ONLY_ANYWHERE_PASSWORD", network: "tcp" };
    }
    if (["hysteria2", "hy2"].includes(protocol)) {
      return { ...common, password: "TEST_ONLY_ANYWHERE_PASSWORD", network: "quic" };
    }
    if (protocol === "sudoku") return { ...common, key: "TEST_ONLY_ANYWHERE_SUDOKU_KEY" };
    return common;
  }
  if (client === CLIENT.egern) {
    const common = {
      name: `Capability ${protocol}`,
      type: protocol,
      server: "capability.example.invalid",
      port: 443,
    };
    if (protocol === "ss" || protocol === "shadowsocks") {
      return { ...common, cipher: "aes-128-gcm", password: "TEST_ONLY_CAPABILITY_PASSWORD" };
    }
    if (protocol === "snell") return { ...common, psk: "TEST_ONLY_CAPABILITY_PSK", version: 4 };
    if (protocol === "vmess" || protocol === "vless") {
      return { ...common, uuid: "00000000-0000-4000-8000-000000000001", network: "tcp" };
    }
    if (["trojan", "anytls", "hysteria2", "hy2"].includes(protocol)) {
      return { ...common, password: "TEST_ONLY_CAPABILITY_PASSWORD" };
    }
    if (protocol === "tuic") {
      return {
        ...common,
        uuid: "00000000-0000-4000-8000-000000000001",
        password: "TEST_ONLY_CAPABILITY_PASSWORD",
      };
    }
    if (protocol === "ssh") {
      return {
        ...common,
        username: "TEST_ONLY_CAPABILITY_USERNAME",
        password: "TEST_ONLY_CAPABILITY_PASSWORD",
      };
    }
    if (protocol === "wireguard") {
      return {
        ...common,
        "private-key": "TEST_ONLY_CAPABILITY_PRIVATE_KEY",
        "public-key": "TEST_ONLY_CAPABILITY_PUBLIC_KEY",
        ip: "192.0.2.2/32",
      };
    }
    return common;
  }
  return { type: protocol };
}

test("enforces the complete client protocol contracts including aliases", () => {
  for (const [client, allowed] of Object.entries(ALLOWED_PROTOCOLS)) {
    for (const protocol of ALL_PROTOCOLS) {
      assert.deepEqual(
        evaluateNodeForClient(nodeForCapability(protocol, client), client),
        allowed.includes(protocol)
          ? { supported: true, reason: null }
          : { supported: false, reason: client === "onexray" ? "unsupported-onexray-protocol" : "unsupported-protocol" },
        `${client} ${protocol}`,
      );
    }
  }

  assert.deepEqual(evaluateNodeForClient({ type: " SS " }, CLIENT.shadowrocket), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "SNELL" }, CLIENT.anywhere), { supported: false, reason: "unsupported-protocol" });
  assert.deepEqual(evaluateNodeForClient({ type: "ss" }, "unknown-client"), { supported: false, reason: "unsupported-client" });
});

test("filters protocol variants that the official client schemas cannot decode", () => {
  const common = { server: "capability-filter.example.invalid", port: 443 };
  const surgeVless = {
    ...common,
    name: "Surge VLESS",
    type: "vless",
    uuid: "00000000-0000-4000-8000-000000000001",
  };
  assert.deepEqual(evaluateNodeForClient(surgeVless, CLIENT.surge), {
    supported: false,
    reason: "unsupported-protocol",
  });

  const singBoxSnellV5 = {
    ...common,
    name: "sing-box Snell v5",
    type: "snell",
    psk: "TEST_ONLY_SNELL_PSK",
    version: 5,
  };
  assert.deepEqual(evaluateNodeForClient(singBoxSnellV5, CLIENT.singbox), {
    supported: true,
    reason: null,
  });
  for (const version of [4, 5, 6]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...singBoxSnellV5, version }, CLIENT.singbox),
      { supported: true, reason: null },
      `Snell v${version}`,
    );
  }
});

test("admits only OneXray structured outbound shapes that the renderer preserves", () => {
  const common = {
    name: "OneXray structured fixture",
    server: "onexray.example.invalid",
    port: 443,
    _profile: { chained: false },
  };
  const uuid = "00000000-0000-4000-8000-000000000001";
  const realityPublicKey = "A".repeat(43);
  const accepted = [
    { ...common, type: "vless", uuid, network: "raw" },
    { ...common, type: "vmess", uuid, security: "auto", network: "raw" },
    { ...common, type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY_ONEXRAY_SS_PASSWORD" },
    { ...common, type: "trojan", password: "TEST_ONLY_ONEXRAY_TROJAN_PASSWORD", tls: true },
    { ...common, type: "socks5", username: "fixture-user", password: "TEST_ONLY_ONEXRAY_SOCKS_PASSWORD" },
    { ...common, type: "http", username: "fixture-user", password: "TEST_ONLY_ONEXRAY_HTTP_PASSWORD", headers: { Host: "proxy.example.invalid" } },
    {
      ...common,
      type: "hysteria2",
      password: "TEST_ONLY_ONEXRAY_HYSTERIA_PASSWORD",
      network: "quic",
    },
    { ...common, type: "vless", uuid, tls: true, sni: "tls.example.invalid", alpn: ["h2"], "client-fingerprint": "chrome" },
    { ...common, type: "vless", uuid, security: "reality", "reality-opts": { "public-key": realityPublicKey, "short-id": "0123abcd", "spider-x": "/" }, "client-fingerprint": "chrome" },
    {
      ...common,
      type: "vless",
      uuid,
      tls: true,
      "reality-opts": { "public-key": realityPublicKey, "short-id": "0123abcd", "_spider-x": "/" },
      "client-fingerprint": "chrome",
      network: "tcp",
      flow: "xtls-rprx-vision",
      udp: true,
      "skip-cert-verify": false,
      "packet-encoding": "xudp",
    },
    { ...common, type: "vless", uuid, network: "ws", "ws-opts": { path: "/ws", headers: { Host: "ws.example.invalid" } } },
    { ...common, type: "vless", uuid, network: "grpc", "grpc-opts": { "grpc-service-name": "grpc-service" } },
    { ...common, type: "vless", uuid, network: "httpupgrade", "httpupgrade-opts": { path: "/upgrade", host: "upgrade.example.invalid" } },
    { ...common, type: "vless", uuid, network: "xhttp", "xhttp-opts": { path: "/xhttp", host: "xhttp.example.invalid", mode: "auto", "packet-encoding": "xudp" } },
    { ...common, type: "vless", uuid, network: "kcp", "kcp-opts": {} },
  ];

  for (const node of accepted) {
    assert.deepEqual(evaluateNodeForClient(node, "onexray"), { supported: true, reason: null }, node.network ?? node.type);
  }
});

test("rejects OneXray protocols, chains, aliases, malformed credentials, and lossy fields with stable reasons", () => {
  const common = {
    name: "OneXray rejected fixture",
    server: "onexray.example.invalid",
    port: 443,
    _profile: { chained: false },
  };
  const uuid = "00000000-0000-4000-8000-000000000001";

  for (const type of ["snell", "ssr", "anytls", "tuic", "ssh", "wireguard", "hy2"]) {
    assert.deepEqual(evaluateNodeForClient({ ...common, type }, "onexray"), {
      supported: false,
      reason: "unsupported-onexray-protocol",
    }, type);
  }
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, _profile: { chained: true } }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-chain",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY", plugin: "v2ray-plugin" }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-shadowsocks-plugin",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, sni: "one.example.invalid", servername: "two.example.invalid" }, "onexray"), {
    supported: false,
    reason: "conflicting-onexray-alias",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, port: 0 }, "onexray"), {
    supported: false,
    reason: "invalid-onexray-node-shape",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "trojan", password: " " }, "onexray"), {
    supported: false,
    reason: "invalid-onexray-node-shape",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, security: "reality" }, "onexray"), {
    supported: false,
    reason: "incomplete-onexray-reality",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, security: "none", tls: true }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-tls-shape",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, network: "h2" }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-transport",
  });
  assert.deepEqual(evaluateNodeForClient({
    ...common,
    type: "vless",
    uuid,
    network: "ws",
    "ws-opts": { headers: { Foo: "bar" } },
  }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-transport",
  });
  assert.deepEqual(evaluateNodeForClient({
    ...common,
    type: "vless",
    uuid,
    network: "ws",
    "ws-opts": { headers: { Host: "one.example.invalid", host: "two.example.invalid" } },
  }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-transport",
  });
  for (const tlsOnlyField of [{ alpn: ["h2"] }, { "client-fingerprint": "chrome" }]) {
    assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, ...tlsOnlyField }, "onexray"), {
      supported: false,
      reason: "unsupported-onexray-tls-shape",
    });
  }
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vmess", uuid, cipher: {} }, "onexray"), {
    supported: false,
    reason: "invalid-onexray-node-shape",
  });
  for (const vmessSecurity of [
    { cipher: "tls" },
    { cipher: "reality" },
    { cipher: "unsupported" },
    { security: "tls" },
    { security: "reality" },
  ]) {
    assert.deepEqual(evaluateNodeForClient({ ...common, type: "vmess", uuid, ...vmessSecurity }, "onexray"), {
      supported: false,
      reason: "invalid-onexray-node-shape",
    });
  }
  for (const lossyField of [
    { tfo: true },
    { mux: true },
    { "ech-opts": { enable: true, config: "TEST_ONLY_ECH_CONFIG" } },
    { "obfs": "salamander" },
  ]) {
    assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, ...lossyField }, "onexray"), {
      supported: false,
      reason: "unsupported-onexray-option",
    });
  }
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, tls: true, "skip-cert-verify": true }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-option",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, network: "ws", "packet-encoding": "xudp" }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-transport",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, network: "raw", "packet-encoding": "unknown" }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-transport",
  });
  assert.deepEqual(evaluateNodeForClient({ ...common, type: "vless", uuid, network: "kcp", "kcp-opts": { mtu: 1350 } }, "onexray"), {
    supported: false,
    reason: "unsupported-onexray-transport",
  });
});

test("OneXray filtering aggregates credential-free diagnostic reasons", () => {
  const accepted = {
    name: "ONE_XRAY_ACCEPTED_NODE",
    type: "vless",
    server: "accepted.onexray.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    _profile: { chained: false },
  };
  const chained = {
    name: "ONE_XRAY_CHAINED_NODE",
    type: "vless",
    server: "chained.onexray.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    password: "TEST_ONLY_ONEXRAY_CHAIN_PASSWORD",
    _profile: { chained: true },
  };
  const unsupported = {
    name: "ONE_XRAY_UNSUPPORTED_NODE",
    type: "snell",
    server: "unsupported.onexray.example.invalid",
    port: 443,
    psk: "TEST_ONLY_ONEXRAY_PSK",
    _profile: { chained: false },
  };
  const result = filterNodesForClient([accepted, chained, unsupported], "onexray");
  assert.deepEqual(result.nodes, [accepted]);
  assert.deepEqual(result.diagnostics, {
    accepted: 1,
    excluded: {
      "unsupported-onexray-chain": 1,
      "unsupported-onexray-protocol": 1,
    },
  });
  assert.equal(oneXrayNodeExclusionReason(accepted), null);
  const diagnosticsJson = JSON.stringify(result.diagnostics);
  for (const node of [accepted, chained, unsupported]) {
    assert.equal(diagnosticsJson.includes(node.name), false);
    assert.equal(diagnosticsJson.includes(node.server), false);
    for (const credential of [node.uuid, node.password, node.psk]) {
      if (credential) assert.equal(diagnosticsJson.includes(credential), false);
    }
  }
});

test("allows only verified Anywhere transports and Shadowsocks forms", () => {
  const common = { name: "Anywhere", server: "anywhere.example.invalid", port: 443 };
  const password = "TEST_ONLY_ANYWHERE_PASSWORD";
  const uuid = "00000000-0000-4000-8000-000000000001";

  for (const network of [undefined, "tcp", "ws"]) {
    const node = { ...common, type: "vless", uuid };
    if (network !== undefined) node.network = network;
    assert.deepEqual(evaluateNodeForClient(node, CLIENT.anywhere), { supported: true, reason: null });
  }
  for (const network of ["h2", "grpc", "xhttp", "unknown"]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, type: "vless", uuid, network }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-vless-network" },
    );
  }

  assert.deepEqual(
    evaluateNodeForClient({ ...common, type: "trojan", password }, CLIENT.anywhere),
    { supported: true, reason: null },
  );
  for (const mutation of [
    { network: "ws" },
    { network: "tcp", "grpc-opts": {} },
    { network: "tcp", "reality-opts": {} },
    { network: "tcp", "ss-opts": { enabled: true } },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, type: "trojan", password, ...mutation }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-trojan-shape" },
    );
  }

  for (const cipher of [
    "aes-128-gcm", "aes-256-gcm", "chacha20-ietf-poly1305", "chacha20-poly1305",
    "none", "plain", "2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, type: "ss", cipher, password }, CLIENT.anywhere),
      { supported: true, reason: null },
      cipher,
    );
  }
  for (const mutation of [
    { cipher: "aes-128-cfb" },
    { cipher: "aes-128-gcm", plugin: "v2ray-plugin" },
    { cipher: "aes-128-gcm", network: "udp" },
    { cipher: "aes-128-gcm", tls: true },
  ]) {
    assert.equal(
      evaluateNodeForClient({ ...common, type: "ss", password, ...mutation }, CLIENT.anywhere).supported,
      false,
    );
  }
});

test("rejects Anywhere fields that its Clash parser would silently weaken or discard", () => {
  const common = { name: "Anywhere", server: "anywhere.example.invalid", port: 443 };
  const password = "TEST_ONLY_ANYWHERE_PASSWORD";
  const uuid = "00000000-0000-4000-8000-000000000001";

  for (const type of ["vless", "trojan", "anytls", "hysteria2"]) {
    const auth = type === "vless" ? { uuid } : { password };
    assert.deepEqual(
      evaluateNodeForClient({ ...common, type, ...auth, "skip-cert-verify": true }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-tls-weakening" },
      type,
    );
    assert.deepEqual(
      evaluateNodeForClient({ ...common, type, ...auth, "allow-insecure": true }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-tls-weakening" },
      type,
    );
  }

  for (const mutation of [
    { obfs: "unknown", "obfs-password": password },
    { obfs: "salamander" },
    { ports: "443,8443" },
    { "port-hopping": "443-8443" },
    { alpn: ["h3"] },
  ]) {
    assert.equal(
      evaluateNodeForClient({ ...common, type: "hysteria2", password, ...mutation }, CLIENT.anywhere).supported,
      false,
    );
  }

  assert.deepEqual(
    evaluateNodeForClient({ ...common, type: "socks5", tls: true }, CLIENT.anywhere),
    { supported: false, reason: "unsupported-anywhere-socks5-tls" },
  );
  assert.deepEqual(
    evaluateNodeForClient({ ...common, type: "ss", cipher: "aes-128-gcm", password, "underlying-proxy": "hop" }, CLIENT.anywhere),
    { supported: false, reason: "unsupported-existing-chain" },
  );
});

test("validates Anywhere VLESS Reality, WebSocket, and post-quantum wire shapes", () => {
  const common = {
    name: "Anywhere VLESS",
    type: "vless",
    server: "vless.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
  };
  const publicKey = "A".repeat(43);
  const pqKey = "A".repeat(43);

  assert.deepEqual(evaluateNodeForClient({
    ...common,
    network: "ws",
    tls: true,
    "ws-opts": {
      path: "/proxy",
      headers: { Host: "edge.example.invalid" },
      "max-early-data": 2048,
      "early-data-header-name": "Sec-WebSocket-Protocol",
    },
  }, CLIENT.anywhere), { supported: true, reason: null });

  assert.deepEqual(evaluateNodeForClient({
    ...common,
    security: "reality",
    "reality-opts": { "public-key": publicKey, "short-id": "0123abcd" },
  }, CLIENT.anywhere), { supported: true, reason: null });
  for (const reality of [
    { "public-key": "TEST_ONLY_NOT_BASE64" },
    { "public-key": "A".repeat(42) },
    { "public-key": publicKey, "short-id": "abc" },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, security: "reality", "reality-opts": reality }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-reality" },
    );
  }

  const encryption = `mlkem768x25519plus.native.1rtt.100-200.${pqKey}`;
  assert.deepEqual(evaluateNodeForClient({ ...common, encryption }, CLIENT.anywhere), { supported: true, reason: null });
  for (const invalid of [
    "mlkem768x25519plus.bad.1rtt.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "mlkem768x25519plus.native.bad.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "mlkem768x25519plus.native.1rtt.short",
    "unsupported.native.1rtt.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, encryption: invalid }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-vless-encryption" },
    );
  }
});

test("validates Anywhere Hysteria2 fields that otherwise fall back silently", () => {
  const common = {
    name: "Anywhere Hysteria2",
    type: "hysteria2",
    server: "hysteria.example.invalid",
    port: 443,
    password: "TEST_ONLY_HYSTERIA_PASSWORD",
  };
  assert.deepEqual(evaluateNodeForClient({
    ...common,
    obfs: "salamander",
    "obfs-password": "TEST_ONLY_OBFS_PASSWORD",
    up: "30 Mbps",
    down: 100,
  }, CLIENT.anywhere), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({
    ...common,
    obfs: "gecko",
    "obfs-password": "TEST_ONLY_GECKO_PASSWORD",
    "obfs-min-packet-size": 64,
    "obfs-max-packet-size": 128,
  }, CLIENT.anywhere), { supported: true, reason: null });
  for (const network of [undefined, "udp", "quic"]) {
    const node = { ...common };
    if (network !== undefined) node.network = network;
    assert.deepEqual(
      evaluateNodeForClient(node, CLIENT.anywhere),
      { supported: true, reason: null },
      `Hysteria2 network ${network ?? "absent"}`,
    );
  }
  for (const mutation of [
    { network: "tcp" },
    { up: "fast" },
    { down: -1 },
    { obfs: "gecko", "obfs-password": "TEST_ONLY", "obfs-min-packet-size": 0 },
    { obfs: "gecko", "obfs-password": "TEST_ONLY", "obfs-max-packet-size": 2049 },
    { obfs: "gecko", "obfs-password": "TEST_ONLY", "obfs-min-packet-size": 1000, "obfs-max-packet-size": 500 },
    { "obfs-min-packet-size": "64" },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, ...mutation }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-hysteria2-shape" },
    );
  }
  assert.deepEqual(
    evaluateNodeForClient({
      ...common,
      obfs: "salamander",
      "obfs-password": "TEST_ONLY",
      "obfs-min-packet-size": 64,
    }, CLIENT.anywhere),
    { supported: false, reason: "unsupported-anywhere-hysteria2-obfs" },
  );
});

test("rejects Anywhere AnyTLS warm-pool values that its runtime would clamp", () => {
  const common = {
    name: "Anywhere AnyTLS",
    type: "anytls",
    server: "anytls.example.invalid",
    port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    udp: true,
  };
  assert.deepEqual(evaluateNodeForClient({
    ...common,
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 0,
  }, CLIENT.anywhere), { supported: true, reason: null });
  for (const mutation of [
    { "idle-session-check-interval": 29 },
    { "idle-session-timeout": -1 },
    { "min-idle-session": -1 },
    { udp: "yes" },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, ...mutation }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-anytls-shape" },
    );
  }
});

test("validates every admitted Anywhere Sudoku option without silent defaults", () => {
  const common = {
    name: "Anywhere Sudoku",
    type: "sudoku",
    server: "sudoku.example.invalid",
    port: 443,
    key: "TEST_ONLY_SUDOKU_KEY",
  };
  assert.deepEqual(evaluateNodeForClient({
    ...common,
    "aead-method": "aes-128-gcm",
    "table-type": "up_ascii_down_entropy",
    "custom-tables": ["table-one", "table-two"],
    "padding-min": 5,
    "padding-max": 20,
    "enable-pure-downlink": false,
    multiplex: "auto",
    httpmask: {
      disable: false,
      mode: "ws",
      tls: true,
      host: "mask.example.invalid",
      "path-root": "edge_path",
    },
  }, CLIENT.anywhere), { supported: true, reason: null });

  for (const mutation of [
    { "aead-method": "invalid" },
    { "table-type": "invalid" },
    { "padding-min": -1 },
    { "padding-min": 30, "padding-max": 20 },
    { multiplex: "invalid" },
    { "custom-tables": ["duplicate", "duplicate"] },
    { "custom-tables": ["valid"], "custom-table": "ignored" },
    { httpmask: { mode: "invalid" } },
    { httpmask: { mode: "ws", "path-root": "unsafe/path" } },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, ...mutation }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-sudoku-shape" },
    );
  }
});

test("rejects Anywhere Hysteria2 TLS fields its parser ignores", () => {
  const common = {
    name: "Anywhere Hysteria2",
    type: "hysteria2",
    server: "hysteria.example.invalid",
    port: 443,
    password: "TEST_ONLY_HYSTERIA_PASSWORD",
  };
  for (const mutation of [
    { tls: false },
    { security: "none" },
    { security: "reality" },
    { "client-fingerprint": "chrome" },
    { "ech-opts": { enable: true } },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...common, ...mutation }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-hysteria2-shape" },
    );
  }
});

test("rejects ambiguous Anywhere TLS flags before mapping", () => {
  const common = { name: "Anywhere", server: "tls.example.invalid", port: 443 };
  const cases = [
    { ...common, type: "vless", uuid: "00000000-0000-4000-8000-000000000001", tls: "true" },
    { ...common, type: "vless", uuid: "00000000-0000-4000-8000-000000000001", tls: true, security: "none" },
    { ...common, type: "trojan", password: "TEST_ONLY", security: "reality" },
    { ...common, type: "anytls", password: "TEST_ONLY", security: "reality" },
    { ...common, type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY", security: "reality" },
    { ...common, type: "socks5", security: "reality" },
    { ...common, type: "sudoku", key: "TEST_ONLY", tls: true },
  ];
  for (const node of cases) assert.equal(evaluateNodeForClient(node, CLIENT.anywhere).supported, false);
});

test("preserves only effective Anywhere ECH and Sudoku values", () => {
  const common = { name: "Anywhere", server: "effective.example.invalid", port: 443 };
  const vless = { ...common, type: "vless", uuid: "00000000-0000-4000-8000-000000000001", tls: true };
  assert.deepEqual(
    evaluateNodeForClient({ ...vless, "client-fingerprint": "non_browser", "ech-opts": { enable: true } }, CLIENT.anywhere),
    { supported: true, reason: null },
  );
  for (const options of [
    { config: "TEST_ONLY_ECH_CONFIG" },
    { enable: false, config: "TEST_ONLY_ECH_CONFIG" },
    { enable: true, "query-server-name": "ignored.example.invalid" },
  ]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...vless, "ech-opts": options }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-tls-shape" },
    );
  }
  assert.deepEqual(
    evaluateNodeForClient({ ...common, type: "sudoku", key: "TEST_ONLY", "padding-max": 3 }, CLIENT.anywhere),
    { supported: false, reason: "unsupported-anywhere-sudoku-shape" },
  );
  const reality = { "public-key": "A".repeat(43), "short-id": "0123abcd" };
  for (const ignored of [{ alpn: ["h2"] }, { "ech-opts": { enable: true } }]) {
    assert.deepEqual(
      evaluateNodeForClient({ ...vless, "reality-opts": reality, ...ignored }, CLIENT.anywhere),
      { supported: false, reason: "unsupported-anywhere-reality" },
    );
  }
});

test("normalizes valid nodes before applying AnyTLS and WireGuard client capabilities", async () => {
  const { normalizeNodes } = await import("../shared/nodes/normalize-nodes.js");
  const common = { server: "integration.example.invalid", port: 443 };
  const nodes = [
    {
      ...common,
      name: "SAFE_BASE_NODE",
      type: "ss",
      cipher: "aes-128-gcm",
      password: "TEST_ONLY_BASE_PASSWORD",
    },
    {
      ...common,
      name: "VALID_ANYTLS_NODE",
      type: "anytls",
      password: "TEST_ONLY_ANYTLS_PASSWORD",
      sni: "tls.example.invalid",
    },
    {
      ...common,
      name: "INVALID_ANYTLS_NODE",
      type: "anytls",
    },
    {
      ...common,
      name: "VALID_WIREGUARD_NODE",
      type: "wireguard",
      "private-key": "TEST_ONLY_WIREGUARD_PRIVATE_KEY",
      "public-key": "TEST_ONLY_WIREGUARD_PUBLIC_KEY",
      ip: "192.0.2.2/32",
    },
    {
      ...common,
      name: "INVALID_WIREGUARD_NODE",
      type: "wireguard",
      "private-key": "TEST_ONLY_INCOMPLETE_PRIVATE_KEY",
    },
  ];

  const normalized = normalizeNodes(nodes);
  assert.deepEqual(normalized.nodes.map((node) => node.type).sort(), ["anytls", "ss", "wireguard"]);
  assert.equal(normalized.diagnostics.excluded["missing-auth"], 2);

  assert.deepEqual(
    filterNodesForClient(normalized.nodes, CLIENT.shadowrocket).nodes.map((node) => node.type),
    ["ss"],
  );
  assert.deepEqual(
    filterNodesForClient(normalized.nodes, CLIENT.egern).nodes.map((node) => node.type).sort(),
    ["anytls", "ss", "wireguard"],
  );
  assert.deepEqual(
    filterNodesForClient(normalized.nodes, CLIENT.anywhere).nodes.map((node) => node.type).sort(),
    ["anytls", "ss"],
  );

  const diagnosticsJson = JSON.stringify(normalized.diagnostics);
  for (const node of nodes) {
    assert.equal(diagnosticsJson.includes(node.name), false);
    assert.equal(diagnosticsJson.includes(node.server), false);
    for (const value of [node.password, node["private-key"], node["public-key"]]) {
      if (value) assert.equal(diagnosticsJson.includes(value), false);
    }
  }
});

test("filters unrepresentable Egern shapes per node with aggregate stable reasons", () => {
  const common = {
    server: "capability-filter.example.invalid",
    port: 443,
  };
  const accepted = {
    ...common,
    name: "Accepted VLESS",
    type: "vless",
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "tcp",
  };
  const result = filterNodesForClient([
    accepted,
    {
      ...common,
      name: "Rejected VLESS",
      type: "vless",
      uuid: "00000000-0000-4000-8000-000000000001",
      network: "PRIVATE_TRANSPORT",
    },
    {
      ...common,
      name: "Rejected Shadowsocks",
      type: "ss",
      cipher: "PRIVATE_METHOD",
      password: "TEST_ONLY_REJECTED_PASSWORD",
    },
    {
      ...common,
      name: "Rejected WireGuard",
      type: "wireguard",
      "private-key": "TEST_ONLY_WG_PRIVATE_KEY",
      "public-key": "TEST_ONLY_WG_PUBLIC_KEY",
    },
  ], CLIENT.egern);

  assert.deepEqual(result.nodes, [accepted]);
  assert.deepEqual(result.diagnostics, {
    accepted: 1,
    excluded: {
      "unsupported-egern-transport": 1,
      "unsupported-egern-method": 1,
      "unsupported-egern-wireguard-shape": 1,
    },
  });
  assert.equal(JSON.stringify(result.diagnostics).includes("PRIVATE_"), false);
});

test("reports only accepted and excluded counts for client filtering", () => {
  const accepted = {
    name: "COUNT_SAFE_ACCEPTED_NODE",
    type: "vless",
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "tcp",
    server: "accepted.example.invalid",
    port: 443,
    password: "TEST_ONLY_ACCEPTED_PASSWORD",
  };
  const excludedProtocol = {
    name: "COUNT_SAFE_EXCLUDED_PROTOCOL",
    type: "snell",
    server: "excluded-protocol.example.invalid",
    port: 443,
    password: "TEST_ONLY_EXCLUDED_PROTOCOL_PASSWORD",
  };
  const excludedTransport = {
    name: "COUNT_SAFE_EXCLUDED_TRANSPORT",
    type: "trojan",
    network: "ws",
    server: "excluded-transport.example.invalid",
    port: 443,
    password: "TEST_ONLY_EXCLUDED_TRANSPORT_PASSWORD",
  };

  const result = filterNodesForClient(
    [accepted, excludedProtocol, excludedTransport],
    CLIENT.anywhere,
  );

  assert.deepEqual(result.nodes, [accepted]);
  assert.deepEqual(result.diagnostics, {
    accepted: 1,
    excluded: {
      "unsupported-protocol": 1,
      "unsupported-anywhere-trojan-shape": 1,
    },
  });
  const diagnosticsJson = JSON.stringify(result.diagnostics);
  for (const node of [accepted, excludedProtocol, excludedTransport]) {
    assert.equal(diagnosticsJson.includes(node.name), false);
    assert.equal(diagnosticsJson.includes(node.server), false);
    assert.equal(diagnosticsJson.includes(node.password), false);
  }
});
