import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT } from "../../../shared/contracts.js";
import { identityKey } from "../../../shared/nodes/node-identity.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { parsePrivatePolicy } from "../../../shared/policies/private-policy.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseIncyOptions } from "../src/options.js";
import { operator as incyOperator } from "../src/substore-config-entry.js";
import { renderIncySubscription } from "../src/render-subscription.js";
import { validateIncySubscription } from "../src/validate-subscription.js";

const OPTIONS = parseIncyOptions({
  output: "config",
  type: "collection",
  name: "apple-proxy-incy",
  subscriptionName: "INCY",
  platform: "iphone",
});

const RAW_NODES = Object.freeze([
  {
    name: "Follow Node",
    type: "vless",
    server: "follow.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "follow.example.invalid",
    network: "ws",
    "ws-opts": { path: "/follow", headers: { Host: "follow.example.invalid" } },
  },
  {
    name: "Fixed Node",
    type: "trojan",
    server: "fixed.example.invalid",
    port: 443,
    password: "TEST_ONLY_FIXED_PASSWORD",
    tls: true,
    sni: "fixed.example.invalid",
  },
]);

function renderPolicy(nodes) {
  const fixedNode = nodes.find((node) => node._profile?.originalName === "Fixed Node");
  if (!fixedNode) {
    throw new Error("Missing fixed node in test fixture");
  }
  return resolveUnifiedPolicy({
    policy: parsePrivatePolicy(JSON.stringify({
      schemaVersion: 2,
      targets: {
        ai: `NODE:${fixedNode._profile.originalName}`,
        final: "FOLLOW",
      },
    })),
    client: CLIENT.incy,
    allNodes: nodes,
    eligibleNodes: nodes,
  });
}

function renderSubscription() {
  const normalized = normalizeNodes(RAW_NODES);
  const normalizedById = new Map(normalized.nodes.map((node) => [identityKey(node), node]));
  const nodes = RAW_NODES.map((raw) => normalizedById.get(identityKey(raw))).filter(Boolean);
  const policyResolution = renderPolicy(nodes);
  const configs = renderIncySubscription({
    nodes,
    options: OPTIONS,
    policyResolution,
  });
  return { nodes, configs, policyResolution };
}

test("renders a single official full-Xray config with every node in one observed balancer", () => {
  const { nodes, policyResolution } = renderSubscription();
  const singleOptions = parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "iphone",
    format: "single",
  });
  const config = renderIncySubscription({
    nodes,
    options: singleOptions,
    policyResolution,
  });

  assert.equal(Array.isArray(config), false);
  assert.equal(config.inbounds.length, 2);
  assert.equal(config.outbounds.filter(({ tag }) => tag.startsWith("ap-incy-follow/")).length, nodes.length);
  assert.ok(config.routing.balancers.some(({ tag, selector }) => tag === "balancer-ap-incy-follow" && selector.length === nodes.length));
  assert.equal(config.routing.rules.at(-1).balancerTag, "balancer-ap-incy-follow");
  assert.equal(config.dns.servers[1].tag, "balancer-ap-incy-follow");
  assert.ok(config.observatory.subjectSelector[0].startsWith("ap-incy-follow/"));
  assert.equal(validateIncySubscription(config), true);
});

test("renders one complete INCY config per normalized node in input order", () => {
  const { nodes, configs, policyResolution } = renderSubscription();

  assert.equal(configs.length, 2);
  assert.deepEqual(configs.map((config) => config.remarks), nodes.map((node) => node.name));

  for (const [index, config] of configs.entries()) {
    const followTag = `ap-incy-follow/${nodes[index]._profile.id}`;
    const directTag = "ap-incy-direct";
    const blockTag = "ap-incy-block";
    const fixedTag = `ap-incy-fixed/${policyResolution.fixedNodes[0].nodeId}`;
    const balancerTag = `balancer-${fixedTag}`;

    assert.deepEqual(config.inbounds.map(({ tag, port }) => [tag, port]), [
      ["incy-in-socks", 10808],
      ["incy-in-http", 10809],
    ]);
    assert.ok(config.outbounds.some((outbound) => outbound.tag === followTag));
    assert.ok(config.outbounds.some((outbound) => outbound.tag === directTag));
    assert.ok(config.outbounds.some((outbound) => outbound.tag === blockTag));
    assert.ok(config.outbounds.some((outbound) => outbound.tag === fixedTag));
    assert.equal(new Set(config.outbounds.map((outbound) => outbound.tag)).size, config.outbounds.length);
    assert.equal(config.dns.tag, `ap-incy-dns/${nodes[index]._profile.id}`);
    assert.equal(config.dns.servers[0].tag, directTag);
    assert.equal(config.dns.servers[1].tag, followTag);
    assert.equal(config.routing.domainStrategy, "IPIfNonMatch");
    assert.equal(config.routing.rules.at(-1).outboundTag, followTag);
    assert.equal(config.routing.balancers[0].tag, balancerTag);
    assert.equal(config.routing.balancers[0].fallbackTag, followTag);
    assert.ok(config.observatory.subjectSelector.includes(followTag));
    assert.ok(config.observatory.subjectSelector.includes(fixedTag));
    assert.deepEqual(Object.keys(config.meta).sort(), ["platform", "schemaVersion", "serverDescription"]);
    assert.equal(config.meta.platform, OPTIONS.platform);
    assert.equal(config.meta.schemaVersion, 2);
    assert.doesNotMatch(config.meta.serverDescription, /follow\.example\.invalid|fixed\.example\.invalid|TEST_ONLY_|uuid|password|https?:\/\//iu);
  }

  assert.equal(validateIncySubscription(configs), true);
});

test("rejects configs that violate inbound, routing, or metadata rules", () => {
  const { configs } = renderSubscription();
  const invalidPort = structuredClone(configs);
  invalidPort[0].inbounds[0].port = 1;
  assert.throws(() => validateIncySubscription(invalidPort), /10808|standard port|inbound/i);

  const invalidRouting = structuredClone(configs);
  invalidRouting[0].routing.domainStrategy = "AsIs";
  assert.throws(() => validateIncySubscription(invalidRouting), /IPIfNonMatch|domainStrategy/i);

  const invalidMeta = structuredClone(configs);
  invalidMeta[0].meta.serverDescription = `server ${RAW_NODES[0].server} password ${RAW_NODES[1].password}`;
  assert.throws(() => validateIncySubscription(invalidMeta), /meta|serverDescription|secret/i);
});

test("rejects mutations of the reserved direct and block outbounds", () => {
  const { configs } = renderSubscription();
  const mutated = structuredClone(configs);
  const direct = mutated[0].outbounds.find((outbound) => outbound.tag === "ap-incy-direct");
  const block = mutated[0].outbounds.find((outbound) => outbound.tag === "ap-incy-block");
  assert.ok(direct);
  assert.ok(block);
  direct.protocol = "vless";
  direct.settings = {
    vnext: [{
      address: "mutated.example.invalid",
      port: 443,
      users: [{ id: "00000000-0000-4000-8000-000000000001", encryption: "none" }],
    }],
  };
  block.protocol = "vless";
  block.settings = {
    vnext: [{
      address: "mutated.example.invalid",
      port: 443,
      users: [{ id: "00000000-0000-4000-8000-000000000001", encryption: "none" }],
    }],
  };

  assert.throws(() => validateIncySubscription(mutated), /direct|block|freedom|blackhole|protocol/i);
});

test("rejects mutations of the standard inbounds and sniffing contract", () => {
  const { configs } = renderSubscription();
  const mutated = structuredClone(configs);

  mutated[0].inbounds[0].settings.auth = "password";
  mutated[0].inbounds[0].settings.udp = false;
  mutated[0].inbounds[0].sniffing.enabled = false;

  mutated[0].inbounds[1].settings = { host: "127.0.0.1" };
  mutated[0].inbounds[1].sniffing.routeOnly = true;

  assert.throws(() => validateIncySubscription(mutated), /inbound|socks|http|sniffing|udp|auth|routeOnly/i);
});

test("fails closed when the source collection mixes valid and unsupported nodes", async () => {
  await assert.rejects(async () => incyOperator({}, "iphone", {
    arguments: {
      output: "config",
      type: "collection",
      name: "apple-proxy-incy",
      subscriptionName: "INCY",
      platform: "iphone",
    },
    produceArtifact: async (request) => {
      if (request.type === "file") return { schemaVersion: 2, targets: { final: "FOLLOW" } };
      return [
        ...RAW_NODES,
        {
          name: "Unsupported Node",
          type: "ssr",
          server: "unsupported.example.invalid",
          port: 443,
          password: "TEST_ONLY_UNSUPPORTED_PASSWORD",
        },
      ];
    },
    logger: { info() {} },
  }), /unsupported-incy-protocol|cannot render selected protocols/i);
});
