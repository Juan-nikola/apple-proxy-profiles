import assert from "node:assert/strict";
import test from "node:test";

import { renderOneXraySubscription } from "../src/render-subscription.js";

const UUID = "00000000-0000-4000-8000-000000000001";

function node(name, id, overrides = {}) {
  return {
    name,
    type: "vless",
    server: `${id}.example.invalid`,
    port: 443,
    uuid: UUID,
    _profile: {
      id,
      sourceKind: "airport",
      continent: "asiaPacific",
      flag: "🇯🇵",
      udp: false,
      p2p: false,
      entry: true,
      chained: false,
    },
    ...overrides,
  };
}

test("renders homepage outbounds in the supplied normalized order with their exact display tags", () => {
  const tokyo = node("🇯🇵 Tokyo｜机场", "sr-tokyo");
  const berlin = node("🇩🇪 Berlin｜机场", "sr-berlin", {
    _profile: { ...tokyo._profile, id: "sr-berlin", continent: "europe", flag: "🇩🇪" },
  });
  const text = renderOneXraySubscription({ homepageNodes: [tokyo, berlin] });

  assert.equal(text.endsWith("\n"), true);
  assert.equal(text.endsWith("\n\n"), false);
  assert.deepEqual(JSON.parse(text), {
    outbounds: [
      {
        name: "🇯🇵 Tokyo｜机场",
        protocol: "vless",
        settings: { address: "sr-tokyo.example.invalid", port: 443, id: UUID, encryption: "none" },
        tag: "🇯🇵 Tokyo｜机场",
        streamSettings: { network: "raw", rawSettings: {}, security: "none" },
        mux: { enabled: false },
      },
      {
        name: "🇩🇪 Berlin｜机场",
        protocol: "vless",
        settings: { address: "sr-berlin.example.invalid", port: 443, id: UUID, encryption: "none" },
        tag: "🇩🇪 Berlin｜机场",
        streamSettings: { network: "raw", rawSettings: {}, security: "none" },
        mux: { enabled: false },
      },
    ],
  });
});

test("rejects duplicate normalized homepage names before emitting any subscription", () => {
  assert.throws(
    () => renderOneXraySubscription({ homepageNodes: [
      node("🇯🇵 Tokyo｜机场", "sr-tokyo-a"),
      node("🇯🇵 Tokyo｜机场", "sr-tokyo-b"),
    ] }),
    /Duplicate OneXray homepage node name/u,
  );
});

test("emits only entry homepage outbounds when a chain resolution also holds landing credentials", () => {
  const entry = node("🇯🇵 Tokyo｜机场", "sr-entry");
  const landingSecret = "TEST_ONLY_LANDING_PASSWORD";
  const landing = node("🇩🇪 Frankfurt｜落地", "sr-landing", {
    type: "trojan",
    password: landingSecret,
    _profile: { ...entry._profile, id: "sr-landing", sourceKind: "landing", entry: false },
  });
  const text = renderOneXraySubscription({
    homepageNodes: [entry],
    fixedNodes: [{ node: landing, tag: "ap-fixed-sr-landing" }],
    finalOutbound: { node: landing, tag: "chainProxy" },
    chain: { enabled: true, landingTag: "chainProxy", entryCount: 1 },
  });
  const output = JSON.parse(text);

  assert.deepEqual(Object.keys(output), ["outbounds"]);
  assert.deepEqual(output.outbounds.map((outbound) => outbound.tag), ["🇯🇵 Tokyo｜机场"]);
  assert.equal(text.includes(landingSecret), false);
  for (const key of ["profile", "dns", "routing", "finalOutbound", "fixedNodes"]) {
    assert.equal(Object.hasOwn(output, key), false, key);
  }
});
