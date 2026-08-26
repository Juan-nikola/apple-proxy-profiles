import assert from "node:assert/strict";
import test from "node:test";

import { parseClashRulesYaml } from "../src/rule-sources/clash-rules-yaml.js";
import { renderClashRuleSource } from "../src/render-clash-rules.js";
import { RULE_KIND } from "../../shared/rules/model.js";

test("parses Loyalsoldier payload YAML into canonical domain and CIDR entries", () => {
  const result = parseClashRulesYaml({
    sourceId: "loyalsoldier-direct",
    text: [
      "payload:",
      "  - 'example.com'",
      "  - '+.suffix.example'",
      "  - '192.0.2.9/24'",
      "  - '2001:db8::1/32'",
      "  - 'example.com'",
    ].join("\n"),
  });

  assert.deepEqual(result.entries.map(({ kind, value }) => ({ kind, value })), [
    { kind: RULE_KIND.domainSuffix, value: "example.com" },
    { kind: RULE_KIND.domainSuffix, value: "suffix.example" },
    { kind: RULE_KIND.ipv4Cidr, value: "192.0.2.0/24" },
    { kind: RULE_KIND.ipv6Cidr, value: "2001:db8::/32" },
    { kind: RULE_KIND.domainSuffix, value: "example.com" },
  ]);
  assert.equal(result.diagnostics.candidateCount, 5);
  assert.equal(result.diagnostics.parsedCount, 5);
  assert.equal(result.diagnostics.duplicates, 1);
});

test("parses applications as classical process rules without widening unsupported syntax", () => {
  const result = parseClashRulesYaml({
    sourceId: "loyalsoldier-applications",
    text: [
      "payload:",
      "  - 'PROCESS-NAME,frpc'",
      "  - 'PROCESS-NAME,frpc.exe'",
      "  - 'DOMAIN,example.com'",
      "  - 'DST-PORT,443'",
    ].join("\n"),
  });

  assert.deepEqual(result.entries.map(({ kind, value }) => ({ kind, value })), [
    { kind: RULE_KIND.processName, value: "frpc" },
    { kind: RULE_KIND.processName, value: "frpc.exe" },
    { kind: RULE_KIND.domain, value: "example.com" },
  ]);
  assert.equal(result.diagnostics.unsupportedCount, 1);
  assert.equal(result.diagnostics.unsupportedByReason["unsupported-dst-port"], 1);
});

test("rejects malformed payload YAML and non-list payloads", () => {
  assert.throws(() => parseClashRulesYaml({ sourceId: "loyalsoldier-test", text: "payload: nope" }), /payload/u);
  assert.throws(() => parseClashRulesYaml({ sourceId: "loyalsoldier-test", text: "not-payload:\n  - example.com" }), /payload/u);
  assert.throws(() => parseClashRulesYaml({ sourceId: "loyalsoldier-test", text: "payload:\n  - 'example.com\n" }), /malformed/u);
});

test("preserves PROCESS-NAME only when the target capability supports it", () => {
  const parsed = parseClashRulesYaml({ sourceId: "loyalsoldier-clash-applications", text: "payload:\n  - 'PROCESS-NAME,frpc'\n" });
  const source = { id: "loyalsoldier-clash-applications", canonicalPath: "rule/Surge/loyalsoldier-clash-applications/applications.txt" };
  const fetched = { text: "payload:\n  - 'PROCESS-NAME,frpc'\n" };
  const upstream = { repository: "https://github.com/Loyalsoldier/clash-rules", commit: "6f188ab71421eb1dc5094f8877cd467b256c1a95", committedAt: "2026-08-26T00:00:00Z", license: "GPL-2.0-only" };
  const supported = renderClashRuleSource({ source, parsed, fetched, upstream, capabilities: { processName: true } });
  assert.match(supported.content, /PROCESS-NAME,frpc/u);
  assert.equal(supported.counts.omitted, 0);
  const omitted = renderClashRuleSource({ source, parsed, fetched, upstream, capabilities: { processName: false } });
  assert.doesNotMatch(omitted.content, /PROCESS-NAME,frpc/u);
  assert.equal(omitted.counts.omittedByKind.processName, 1);
  assert.equal(omitted.counts.unsupportedByReason["unsupported-process-name"], 1);
});
