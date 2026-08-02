import test from "node:test";
import assert from "node:assert/strict";

import { evaluateNodeForClient } from "../../../shared/nodes/capabilities.js";
import { CLIENT } from "../../../shared/contracts.js";
import { toEgernProxy } from "../src/render-node.js";
import { renderEgernSubscription } from "../src/render-subscription.js";
import {
  allCompatibleNodes,
  anytls,
  fixture,
  http,
  https,
  hysteria2,
  shadowsocks2022,
  snellV4,
  socks5Tls,
  trojanReality,
  trojanWebsocket,
  tuic,
  vlessGrpcReality,
  vlessHttp2,
  vlessReality,
  vlessWss,
  vmessGrpc,
  vmessHttp1,
  vmessRaw,
  vmessTls,
  vmessWss,
  wireguardIpv4,
  wireguardIpv6,
} from "./fixtures/nodes.js";

test("maps exact representative Egern protocol objects", () => {
  assert.deepEqual(toEgernProxy(shadowsocks2022, { clientChain: "off" }), {
    shadowsocks: {
      name: "SS 2022",
      server: "ss-2022.example.invalid",
      port: 443,
      method: "2022-blake3-aes-128-gcm",
      password: "TEST_ONLY_SS_2022_KEY",
      udp_relay: true,
    },
  });
  assert.deepEqual(toEgernProxy(snellV4, { clientChain: "off" }), {
    snell: {
      name: "Snell V4",
      server: "snell-v4.example.invalid",
      port: 443,
      psk: "TEST_ONLY_SNELL_PSK",
      version: 4,
      udp_relay: true,
      reuse: true,
      obfs: "tls",
      obfs_host: "snell-obfs.example.invalid",
    },
  });
  assert.deepEqual(toEgernProxy(vlessReality, { clientChain: "off" }), {
    vless: {
      name: "VLESS Reality",
      server: "vless-reality.example.invalid",
      port: 443,
      user_id: "00000000-0000-4000-8000-000000000001",
      udp_relay: true,
      flow: "xtls-rprx-vision",
      transport: {
        tls: {
          sni: "www.example.com",
          reality: { public_key: "TEST_ONLY_REALITY_PUBLIC_KEY", short_id: "0123abcd" },
        },
      },
    },
  });
  assert.deepEqual(toEgernProxy(hysteria2, { clientChain: "off" }), {
    hysteria2: {
      name: "Hysteria2",
      server: "hysteria2.example.invalid",
      port: 443,
      auth: "TEST_ONLY_HYSTERIA2_AUTH",
      sni: "hysteria2.example.invalid",
      obfs: "salamander",
      obfs_password: "TEST_ONLY_HYSTERIA2_OBFS_PASSWORD",
      port_hopping: "20000-30000",
      port_hopping_interval: 30,
      bandwidth: 100,
    },
  });
  assert.deepEqual(toEgernProxy(wireguardIpv4, { clientChain: "off" }), {
    wireguard: {
      name: "WireGuard IPv4",
      server: "wireguard-ipv4.example.invalid",
      port: 443,
      private_key: "TEST_ONLY_WIREGUARD_PRIVATE_KEY",
      peer_public_key: "TEST_ONLY_WIREGUARD_PUBLIC_KEY",
      preshared_key: "TEST_ONLY_WIREGUARD_PRESHARED_KEY",
      reserved: [1, 2, 3],
      local_ipv4: "192.0.2.2/32",
      dns_servers: ["192.0.2.53"],
      mtu: 1280,
      keepalive: 25,
    },
  });
});

test("maps all admitted protocol aliases and major verified transports", () => {
  const mapped = allCompatibleNodes.map((node) => toEgernProxy(node, { clientChain: "off" }));
  const protocols = mapped.map((proxy) => Object.keys(proxy)[0]);
  assert.deepEqual(protocols, [
    "shadowsocks", "shadowsocks", "snell",
    "vmess", "vmess", "vmess", "vmess", "vmess",
    "vless", "vless", "vless", "vless", "vless",
    "trojan", "trojan", "trojan", "anytls",
    "hysteria2", "hysteria2", "tuic",
    "socks5", "socks5_tls", "http", "https", "wireguard", "wireguard",
  ]);

  assert.deepEqual(toEgernProxy(vmessWss, { clientChain: "off" }).vmess.transport, {
    wss: {
      path: "/vmess",
      headers: { Host: "vmess-host.example.invalid" },
      sni: "vmess-wss.example.invalid",
    },
  });
  assert.equal(toEgernProxy(vmessRaw, { clientChain: "off" }).vmess.security, "auto");
  assert.equal(Object.hasOwn(toEgernProxy(vmessRaw, { clientChain: "off" }).vmess, "transport"), false);
  assert.deepEqual(toEgernProxy(vmessTls, { clientChain: "off" }).vmess.transport, {
    tls: { sni: "vmess-tls.example.invalid", skip_tls_verify: false },
  });
  assert.deepEqual(toEgernProxy(vmessGrpc, { clientChain: "off" }).vmess.transport, {
    grpc: { service_name: "VMessService", sni: "vmess-grpc.example.invalid" },
  });
  assert.deepEqual(toEgernProxy(vmessHttp1, { clientChain: "off" }).vmess.transport, {
    http1: {
      method: "GET",
      path: "/vmess-http",
      headers: { Host: "vmess-http.example.invalid" },
    },
  });
  assert.deepEqual(toEgernProxy(vlessHttp2, { clientChain: "off" }).vless.transport, {
    http2: {
      method: "GET",
      path: "/vless-h2",
      headers: { Accept: "*/*", Host: "vless-h2-host.example.invalid" },
      sni: "vless-h2.example.invalid",
    },
  });
  assert.deepEqual(toEgernProxy(vlessGrpcReality, { clientChain: "off" }).vless.transport, {
    grpc: {
      service_name: "VlessService",
      sni: "www.example.com",
      reality: { public_key: "TEST_ONLY_GRPC_REALITY_PUBLIC_KEY" },
    },
  });
  assert.deepEqual(toEgernProxy(vlessWss, { clientChain: "off" }).vless.transport, {
    wss: {
      path: "/vless",
      headers: { Host: "vless-host.example.invalid" },
      sni: "vless-wss.example.invalid",
    },
  });
  assert.deepEqual(toEgernProxy(trojanWebsocket, { clientChain: "off" }).trojan.websocket, {
    path: "/trojan",
    host: "trojan-host.example.invalid",
  });
  assert.deepEqual(toEgernProxy(trojanReality, { clientChain: "off" }).trojan.reality, {
    public_key: "TEST_ONLY_TROJAN_REALITY_PUBLIC_KEY",
    short_id: "abcd",
  });
  assert.equal(Object.keys(toEgernProxy(socks5Tls, { clientChain: "off" }))[0], "socks5_tls");
  assert.equal(Object.keys(toEgernProxy(http, { clientChain: "off" }))[0], "http");
  assert.deepEqual(toEgernProxy(https, { clientChain: "off" }).https.headers, {
    "User-Agent": "TEST_ONLY_HTTP_AGENT",
  });
  assert.equal(toEgernProxy(wireguardIpv6, { clientChain: "off" }).wireguard.local_ipv6, "2001:db8::2/128");
  assert.equal(toEgernProxy(anytls, { clientChain: "off" }).anytls.skip_tls_verify, false);
  assert.equal(toEgernProxy(tuic, { clientChain: "off" }).tuic.udp_relay_mode, "native");
});

test("filters every unrepresentable Egern shape before mapping with stable reasons", () => {
  const invalidCases = [
    [fixture("Unknown transport", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "quic" }), "unsupported-egern-transport"],
    [fixture("Incomplete reality", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "tcp", tls: true, "reality-opts": { "short-id": "abcd" } }), "incomplete-egern-reality"],
    [fixture("Bad VMess security", "vmess", { uuid: "00000000-0000-4000-8000-000000000001", network: "tcp", cipher: "unsupported" }), "unsupported-egern-security"],
    [fixture("Bad SS method", "ss", { cipher: "unsupported", password: "TEST_ONLY_BAD_SS_PASSWORD" }), "unsupported-egern-method"],
    [fixture("Bad Snell version", "snell", { psk: "TEST_ONLY_BAD_SNELL_PSK", version: 9 }), "unsupported-egern-version"],
    [fixture("Bad VLESS flow", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "tcp", flow: "unsupported" }), "unsupported-egern-flow"],
    [fixture("Lossy VLESS flow transport", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "ws", tls: true, flow: "xtls-rprx-vision", "ws-opts": { path: "/ws" } }), "unsupported-egern-flow"],
    [fixture("Lossy HTTP2 reality", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "h2", tls: true, "h2-opts": { path: "/h2" }, "reality-opts": { "public-key": "TEST_ONLY_H2_REALITY_KEY" } }), "unsupported-egern-transport"],
    [fixture("Lossy HTTP", "http", { headers: { Authorization: { nested: true } } }), "unsupported-egern-http-shape"],
    [fixture("Lossy Trojan", "trojan", { password: "TEST_ONLY_BAD_TROJAN_PASSWORD", network: "grpc", "grpc-opts": { "grpc-service-name": "bad" } }), "unsupported-egern-transport"],
    [fixture("No WireGuard local", "wireguard", { "private-key": "TEST_ONLY_WG_PRIVATE_KEY", "public-key": "TEST_ONLY_WG_PUBLIC_KEY" }), "unsupported-egern-wireguard-shape"],
    [fixture("Bad WireGuard reserved", "wireguard", { "private-key": "TEST_ONLY_WG_PRIVATE_KEY", "public-key": "TEST_ONLY_WG_PUBLIC_KEY", ip: "192.0.2.2/32", reserved: [1, 2, 999] }), "unsupported-egern-wireguard-shape"],
    [fixture("Bad WireGuard key", "wireguard", { "private-key": "not-base64", "public-key": "also-not-base64", ip: "192.0.2.2/32" }), "unsupported-egern-wireguard-shape"],
    [fixture("Bad WireGuard addresses", "wireguard", { "private-key": "TEST_ONLY_WG_PRIVATE_KEY", "public-key": "TEST_ONLY_WG_PUBLIC_KEY", ip: ["192.0.2.2/32", "192.0.2.3/32"] }), "unsupported-egern-wireguard-shape"],
    [fixture("Multi peer WireGuard", "wireguard", { "private-key": "TEST_ONLY_WG_PRIVATE_KEY", "public-key": "TEST_ONLY_WG_PUBLIC_KEY", ip: "192.0.2.2/32", peers: [{}, {}] }), "unsupported-egern-wireguard-shape"],
    [fixture("Reality label without keys", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "tcp", security: "reality" }), "incomplete-egern-reality"],
    [fixture("TLS identity on raw transport", "vmess", { uuid: "00000000-0000-4000-8000-000000000001", network: "tcp", sni: "private.example.invalid" }), "unsupported-egern-tls-shape"],
    [fixture("Bad Snell obfs", "snell", { psk: "TEST_ONLY_BAD_SNELL_OBFS_PSK", version: 4, obfs: "unsupported" }), "unsupported-egern-obfs"],
    [fixture("Bad TUIC UDP mode", "tuic", { uuid: "00000000-0000-4000-8000-000000000001", password: "TEST_ONLY_BAD_TUIC_PASSWORD", "udp-relay-mode": "unsupported" }), "unsupported-egern-udp-mode"],
    [fixture("Lossy Hysteria downstream", "hy2", { password: "TEST_ONLY_BAD_HY2_PASSWORD", down: 100 }), "unsupported-egern-hysteria2-shape"],
    [fixture("Lossy Trojan headers", "trojan", { password: "TEST_ONLY_BAD_TROJAN_HEADERS_PASSWORD", network: "ws", "ws-opts": { path: "/ws", headers: { Authorization: "TEST_ONLY_HEADER" } } }), "unsupported-egern-transport"],
    [fixture("Existing arbitrary chain", "vless", { uuid: "00000000-0000-4000-8000-000000000001", network: "tcp", chain: "PRIVATE_CHAIN_NAME" }), "unsupported-existing-chain"],
  ];

  for (const [node, reason] of invalidCases) {
    assert.deepEqual(
      evaluateNodeForClient(node, CLIENT.egern),
      { supported: false, reason },
      node.name,
    );
  }
});

test("maps a verified single WireGuard peer and rejects peer conflicts", () => {
  const singlePeer = fixture("WireGuard Peer", "wireguard", {
    "private-key": "TEST_ONLY_WG_PEER_PRIVATE_KEY",
    "public-key": "TEST_ONLY_WG_PEER_PUBLIC_KEY",
    ip: ["192.0.2.4/32", "2001:db8::4/128"],
    peers: [{
      server: "wireguard-peer.example.invalid",
      port: 443,
      "public-key": "TEST_ONLY_WG_PEER_PUBLIC_KEY",
      "pre-shared-key": "TEST_ONLY_WG_PEER_PRESHARED_KEY",
      reserved: [4, 5, 6],
    }],
  });
  assert.deepEqual(toEgernProxy(singlePeer, { clientChain: "off" }), {
    wireguard: {
      name: "WireGuard Peer",
      server: "wireguard-peer.example.invalid",
      port: 443,
      private_key: "TEST_ONLY_WG_PEER_PRIVATE_KEY",
      peer_public_key: "TEST_ONLY_WG_PEER_PUBLIC_KEY",
      preshared_key: "TEST_ONLY_WG_PEER_PRESHARED_KEY",
      reserved: [4, 5, 6],
      local_ipv4: "192.0.2.4/32",
      local_ipv6: "2001:db8::4/128",
    },
  });

  const conflict = {
    ...singlePeer,
    peers: [{ ...singlePeer.peers[0], server: "different.example.invalid" }],
  };
  assert.deepEqual(evaluateNodeForClient(conflict, CLIENT.egern), {
    supported: false,
    reason: "unsupported-egern-wireguard-shape",
  });
});

test("subscription rendering is deterministic, metadata-free, and reports aggregate counts", () => {
  const diagnostics = [];
  const incompatible = [
    fixture("Secret transport node", "vless", {
      uuid: "00000000-0000-4000-8000-000000000001",
      network: "PRIVATE_SECRET_TRANSPORT",
      password: "TEST_ONLY_SECRET_TRANSPORT_PASSWORD",
    }),
    fixture("Secret method node", "ss", {
      cipher: "PRIVATE_SECRET_METHOD",
      password: "TEST_ONLY_SECRET_METHOD_PASSWORD",
    }),
  ];
  const nodes = [shadowsocks2022, ...incompatible];
  const first = renderEgernSubscription(nodes, {
    clientChain: "off",
    onDiagnostics(value) { diagnostics.push(value); },
  });
  const second = renderEgernSubscription(nodes, { clientChain: "off" });

  assert.equal(first, second);
  assert.match(first, /^proxies:\n/);
  assert.equal(first.includes("_profile"), false);
  assert.equal(first.includes("_subName"), false);
  assert.equal(first.includes("underlying-proxy"), false);
  assert.deepEqual(diagnostics, [{
    accepted: 1,
    excluded: {
      "unsupported-egern-transport": 1,
      "unsupported-egern-method": 1,
    },
  }]);
});

test("fails closed for duplicate names and all-incompatible inventories without leaking data", () => {
  const duplicate = { ...shadowsocks2022, password: "TEST_ONLY_DUPLICATE_PASSWORD" };
  assert.throws(
    () => renderEgernSubscription([shadowsocks2022, duplicate], { clientChain: "off" }),
    /^Error: Duplicate Egern proxy name$/,
  );

  const secretNode = fixture("PRIVATE_SECRET_NODE_NAME", "vless", {
    uuid: "00000000-0000-4000-8000-000000000001",
    server: "private-secret-endpoint.example.invalid",
    network: "PRIVATE_SECRET_TRANSPORT",
    password: "TEST_ONLY_PRIVATE_SECRET_PASSWORD",
  });
  let message = "";
  assert.throws(
    () => renderEgernSubscription([secretNode], { clientChain: "off" }),
    (error) => {
      message = error.message;
      return /No compatible Egern nodes/.test(message);
    },
  );
  for (const secret of [secretNode.name, secretNode.server, secretNode.network, secretNode.password]) {
    assert.equal(message.includes(secret), false);
  }
  assert.match(message, /unsupported-egern-transport=1/);
});

test("only generated chain markers map to the fixed Egern previous hop", () => {
  const chained = {
    ...vlessReality,
    name: "Generated chain",
    "underlying-proxy": "🔗 入口节点",
    _profile: { ...vlessReality._profile, chained: true },
  };
  assert.equal(
    toEgernProxy(chained, { clientChain: "on" }).vless.prev_hop,
    "🔗 入口节点",
  );
  assert.throws(
    () => toEgernProxy(chained, { clientChain: "off" }),
    /^Error: Egern client chain is disabled$/,
  );
  assert.throws(
    () => toEgernProxy({ ...vlessReality, chain: "PRIVATE_CHAIN_NAME" }, { clientChain: "on" }),
    /^Error: Unsupported existing Egern proxy chain$/,
  );
});

test("mapping failures use only stable allowlisted messages", () => {
  const bad = fixture("PRIVATE_SECRET_BAD_NODE", "vless", {
    uuid: "00000000-0000-4000-8000-000000000001",
    server: "private-secret-server.example.invalid",
    network: "PRIVATE_SECRET_NETWORK",
    password: "TEST_ONLY_PRIVATE_PASSWORD",
  });
  let message = "";
  assert.throws(() => toEgernProxy(bad, { clientChain: "off" }), (error) => {
    message = error.message;
    return message === "Unsupported Egern transport";
  });
  for (const value of [bad.name, bad.server, bad.port, bad.network, bad.password]) {
    assert.equal(message.includes(String(value)), false);
  }
});
