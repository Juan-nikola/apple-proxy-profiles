import assert from "node:assert/strict";
import test from "node:test";

import { prepareEgernInventory } from "../src/render-subscription.js";

const REALITY_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function common(name, type) {
  return {
    name,
    type,
    server: `${name.toLowerCase().replaceAll(" ", "-")}.example.invalid`,
    port: 443,
  };
}

function snell(index) {
  return {
    ...common(`Snell ${index}`, "snell"),
    psk: `TEST_ONLY_SNELL_PSK_${index}`,
    version: 5,
    udp: true,
    reuse: true,
    ...(index <= 6 ? { tfo: true } : {}),
  };
}

function vless(index) {
  return {
    ...common(`VLESS ${index}`, "vless"),
    uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    network: "tcp",
    tls: true,
    sni: "reality.example.invalid",
    flow: "xtls-rprx-vision",
    "client-fingerprint": "chrome",
    "reality-opts": {
      "public-key": REALITY_PUBLIC_KEY,
      "short-id": "0123abcd",
      ...(index === 13 ? { "_spider-x": "/TEST_ONLY_SPIDER_PATH" } : {}),
    },
    ...(index > 6 ? {
      encryption: "none",
      "packet-encoding": "xudp",
      "skip-cert-verify": false,
      _h2: false,
    } : {}),
  };
}

function hysteria2(index) {
  const fingerprint = String(index).padStart(2, "0").repeat(32);
  return {
    ...common(`Hysteria2 ${index}`, "hy2"),
    password: `TEST_ONLY_HYSTERIA2_PASSWORD_${index}`,
    tls: true,
    sni: "hysteria2.example.invalid",
    alpn: ["h3"],
    fingerprint,
    "tls-fingerprint": fingerprint,
    "skip-cert-verify": true,
    udp: true,
  };
}

test("adapts the complete current 28-node Sub-Store inventory without mutating it", () => {
  const input = [
    ...Array.from({ length: 10 }, (_, index) => snell(index + 1)),
    ...Array.from({ length: 13 }, (_, index) => vless(index + 1)),
    ...Array.from({ length: 5 }, (_, index) => hysteria2(index + 1)),
  ];
  const snapshot = structuredClone(input);

  const prepared = prepareEgernInventory(input, { clientChain: "off" });

  assert.deepEqual(input, snapshot);
  assert.equal(prepared.nodes.length, 28);
  assert.deepEqual(prepared.diagnostics, { accepted: 28, excluded: {} });

  const snellNodes = prepared.nodes.filter((node) => node.type === "snell");
  assert.equal(snellNodes.length, 10);
  assert.equal(snellNodes.every((node) => node.version === 4 && node.udp === true && node.reuse === true), true);

  const vlessProxies = prepared.proxies.filter((proxy) => proxy.vless).map((proxy) => proxy.vless);
  assert.equal(vlessProxies.length, 13);
  assert.equal(vlessProxies.every((proxy) => Object.keys(proxy.transport.tls.reality)
    .every((key) => ["public_key", "short_id"].includes(key))), true);

  const hysteria2Proxies = prepared.proxies.filter((proxy) => proxy.hysteria2).map((proxy) => proxy.hysteria2);
  assert.equal(hysteria2Proxies.length, 5);
  assert.equal(hysteria2Proxies.every((proxy) => /^[0-9a-f]{64}$/u.test(proxy.fingerprint_sha256)), true);
  assert.equal(hysteria2Proxies.every((proxy) => proxy.skip_tls_verify === true), true);
});

test("adaptation failures reject the full Sub-Store inventory", () => {
  const good = {
    ...common("Good Snell", "snell"),
    psk: "TEST_ONLY_GOOD_SNELL_PSK",
    version: 5,
    udp: true,
    reuse: true,
  };
  const hash = "ab".repeat(32);
  const invalid = [
    {
      ...common("Bad AnyTLS idle field", "anytls"),
      password: "TEST_ONLY_BAD_ANYTLS_PASSWORD",
      "idle-session-timeout": 60,
    },
    { ...vless(1), name: "Bad client fingerprint", "client-fingerprint": "firefox" },
    { ...vless(2), name: "Bad encryption", encryption: "auto" },
    { ...vless(3), name: "Bad packet encoding", "packet-encoding": "packetaddr" },
    { ...vless(4), name: "Bad h2 metadata", _h2: true },
    { ...vless(5), name: "Bad spider metadata", "reality-opts": { ...vless(5)["reality-opts"], "_spider-x": false } },
    { ...hysteria2(1), name: "Bad ALPN", alpn: ["h2"] },
    { ...hysteria2(2), name: "Bad fingerprint", fingerprint: "not-a-hash" },
    { ...hysteria2(3), name: "Mismatched fingerprint", fingerprint: hash, "tls-fingerprint": "cd".repeat(32) },
    { ...hysteria2(4), name: "Missing fingerprint alias", fingerprint: hash, "tls-fingerprint": undefined },
  ];

  assert.throws(
    () => prepareEgernInventory([good, ...invalid], { clientChain: "off" }),
    (error) => {
      assert.equal(error.message, "Egern cannot render selected protocols: anytls=1,hy2=4,vless=5");
      for (const secret of ["Bad AnyTLS idle field", "Bad client fingerprint", "bad-client-fingerprint.example.invalid", "TEST_ONLY_HYSTERIA2_PASSWORD_1"]) {
        assert.equal(error.message.includes(secret), false);
      }
      return true;
    },
  );
});

test("adapter traps become unknown render failures without reflecting private errors", () => {
  const privateTrap = "TEST_ONLY_PRIVATE_EGERN_ADAPTER_TRAP";
  const hostile = {};
  Object.defineProperty(hostile, "type", {
    enumerable: true,
    get() { throw new Error(privateTrap); },
  });
  assert.throws(
    () => prepareEgernInventory([snell(1), hostile], { clientChain: "off" }),
    (error) => error.message === "Egern cannot render selected protocols: unknown=1"
      && !error.message.includes(privateTrap),
  );
});
