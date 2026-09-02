import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { scanText } from "../../../shared/security/secret-scan.js";
import { parsePrivatePolicy } from "../../../shared/policies/private-policy.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { renderIncyRoutingProfile } from "../src/render-routing-profile.js";
import { renderIncySubscription } from "../src/render-subscription.js";
import { parseIncyOptions } from "../src/options.js";
import { operator } from "../src/substore-config-entry.js";
import { fixtureNodes, fixturePolicy } from "./fixtures.js";

const PUBLIC_ROOT = new URL("../../../public/current/incy/", import.meta.url);

function renderOptions(overrides = {}) {
  return parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "macos",
    ...overrides,
  });
}

function policyResolution(nodes = fixtureNodes()) {
  return resolveUnifiedPolicy({
    policy: parsePrivatePolicy(JSON.stringify(fixturePolicy())),
    channel: "current",
    client: "incy",
    allNodes: nodes,
    eligibleNodes: nodes,
  });
}

test("fixture secrets never leak into public INCY metadata or published JSON", async () => {
  const nodes = fixtureNodes();
  const resolution = policyResolution(nodes);
  const configs = renderIncySubscription({
    nodes,
    options: renderOptions(),
    policyResolution: resolution,
  });
  const profile = renderIncyRoutingProfile({
    baseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    generatedAt: "2026-09-02T00:00:00Z",
  });
  const manifest = await readFile(new URL("client-manifest.json", PUBLIC_ROOT), "utf8");
  const routing = await readFile(new URL("routing.json", PUBLIC_ROOT), "utf8");
  const publicProfile = JSON.stringify(profile);
  const meta = JSON.stringify(configs[0].meta);

  for (const [label, text] of [
    ["meta", meta],
    ["routing-profile", publicProfile],
    ["client-manifest", manifest],
    ["routing-json", routing],
  ]) {
    assert.equal(scanText(label, text).length, 0, label);
  }
  assert.equal(JSON.stringify(configs[0]).includes("TEST_ONLY_INCY_AI_PASSWORD"), true);
  assert.equal(meta.includes("TEST_ONLY_"), false);
  assert.equal(publicProfile.includes("TEST_ONLY_"), false);
  assert.equal(manifest.includes("TEST_ONLY_"), false);
  assert.equal(routing.includes("TEST_ONLY_"), false);
});

test("unsupported nodes abort before any response body is written", async () => {
  const requestOptions = { _res: { headers: {} } };
  const calls = [];

  await assert.rejects(
    operator({}, "JSON", {
      arguments: renderOptions(),
      requestOptions,
      logger: { info() {} },
      async produceArtifact(request) {
        calls.push(request);
        if (request.type === "collection") {
          return [
            ...fixtureNodes(),
            {
              name: "Unsupported Node",
              type: "ssr",
              server: "203.0.113.250",
              port: 443,
              password: "TEST_ONLY_INCY_UNSUPPORTED_PASSWORD",
            },
          ];
        }
        return { $content: JSON.stringify(fixturePolicy()) };
      },
    }),
    /unsupported-incy-protocol|cannot render selected protocols/i,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "collection");
  assert.equal(requestOptions._res.headers["content-type"], undefined);
  assert.deepEqual(requestOptions._res.headers, {});
});

test("operator diagnostics expose only counts and protocol categories", async () => {
  const lines = [];
  const requestOptions = { _res: { headers: {} } };

  await operator({}, "JSON", {
    arguments: renderOptions(),
    requestOptions,
    logger: { info(line) { lines.push(line); } },
    async produceArtifact(request) {
      if (request.type === "file") return { $content: JSON.stringify(fixturePolicy()) };
      return fixtureNodes();
    },
  });

  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[incy-config\] /u);
  const payload = JSON.parse(lines[0].slice("[incy-config] ".length));
  assert.deepEqual(Object.keys(payload).sort(), ["accepted", "client", "normalized", "platform", "protocol", "schemaVersion"]);
  assert.equal(payload.client, "incy");
  assert.equal(payload.platform, "macos");
  assert.equal(payload.schemaVersion, 2);
  assert.equal(JSON.stringify(payload).includes("TEST_ONLY_"), false);
  assert.equal(JSON.stringify(payload).includes("203.0.113."), false);
});
