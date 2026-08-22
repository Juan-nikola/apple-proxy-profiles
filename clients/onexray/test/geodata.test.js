import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";
import { RULE_KIND } from "../../../shared/rules/model.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "../src/geodata-contract.js";
import { buildOneXrayGeoDataArtifacts, renderOneXrayImportPage } from "../src/build-import-page.js";
import { artifactSha256 } from "../../../automation/src/artifact-content.js";
import { canonicalJson } from "../../../automation/src/render-anywhere-rules.js";
import { decodeXrayGeoData, renderXrayGeoData } from "../../../automation/src/render-xray-geodata.js";

function snapshot(reverse = false) {
  const entries = DEFAULT_RULE_SOURCE_IDS.map((id) => [id, {
    id,
    entries: id === "ChinaIP"
      ? [
        { kind: RULE_KIND.ipv4Cidr, value: "203.0.113.9/24", sourceId: id },
        { kind: RULE_KIND.ipv6Cidr, value: "2001:db8:0:1::9/64", sourceId: id },
      ]
      : [{ kind: RULE_KIND.domainSuffix, value: `${id.toLowerCase()}.example`, sourceId: id }],
  }]);
  entries.push(["Advertising", {
    id: "Advertising",
    entries: [{ kind: RULE_KIND.domainSuffix, value: "ads.example", sourceId: "Advertising" }],
  }]);
  return new Map(reverse ? entries.reverse() : entries);
}

test("OneXray GeoData uses stable channel names and deterministic category codes", () => {
  assert.deepEqual(oneXrayGeoNames("edge"), {
    domain: "AppleProxySiteEdge",
    ip: "AppleProxyIPEdge",
  });
  assert.equal(oneXrayGeoCode("DomesticCore"), "APP-DOMESTICCORE");
  const first = renderXrayGeoData(snapshot(), "edge");
  const second = renderXrayGeoData(snapshot(true), "edge");
  assert.deepEqual(first.domain, second.domain);
  assert.deepEqual(first.ip, second.ip);
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.channel, "edge");
  assert.equal(first.manifest.domain.name, "AppleProxySiteEdge");
  assert.equal(decodeXrayGeoData(first.domain, "domain").categoryCount, DEFAULT_RULE_SOURCE_IDS.length);
  assert.equal(decodeXrayGeoData(first.ip, "ip").ruleCount, 2);
  assert.equal(first.manifest.sources.some(({ id }) => id === "Advertising"), false);
});

test("OneXray GeoData rejects invalid channels and corrupt bytes", () => {
  assert.throws(() => oneXrayGeoNames("stable"), /channel/u);
  const result = renderXrayGeoData(snapshot(), "edge");
  assert.throws(() => decodeXrayGeoData(result.domain.subarray(0, -1), "domain"), /decode|schema|invalid/u);
  assert.throws(() => renderXrayGeoData(snapshot(), "stable"), /channel/u);
});

test("OneXray import pages describe current as automation-released and edge as optional feedback", () => {
  const edge = buildOneXrayGeoDataArtifacts({
    ruleSets: snapshot(),
    channel: "edge",
    upstream: {
      repository: "https://github.com/example/upstream",
      branch: "main",
      commit: "a".repeat(40),
      committedAt: "2026-08-21T18:35:15Z",
    },
  });
  const edgePage = renderOneXrayImportPage({
    manifest: edge.manifest,
    publicBase: "https://juan-nikola.github.io/apple-proxy-profiles",
    files: edge.files,
  });
  assert.match(edgePage, /上线后的可选反馈/u);
  assert.doesNotMatch(edgePage, /必须完成人工验证后再晋级/u);

  const currentBase = { ...edge.manifest, channel: "current", releaseId: "current-test", names: oneXrayGeoNames("current") };
  delete currentBase.manifestHash;
  const current = { ...currentBase, manifestHash: artifactSha256(canonicalJson(currentBase)) };
  const currentPage = renderOneXrayImportPage({
    manifest: current,
    publicBase: "https://juan-nikola.github.io/apple-proxy-profiles",
    files: edge.files,
  });
  assert.match(currentPage, /自动化发布门禁通过后的生产版本/u);
});
