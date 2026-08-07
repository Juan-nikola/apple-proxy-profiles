import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkConfigs, compileRules } from "../scripts/compile-rules.mjs";

async function fixtureCore(binary) {
  const root = await mkdtemp(join(tmpdir(), "sing-box-core-"));
  const core = join(root, "sing-box");
  const output = binary
    ? "#!/bin/sh\nif [ \"$1\" = \"check\" ] || [ \"$1\" = \"format\" ]; then exit 0; fi\nout=''\nwhile [ $# -gt 0 ]; do if [ \"$1\" = \"--output\" ]; then shift; out=$1; fi; shift; done\nprintf '\\000SRS-FIXTURE' > \"$out\"\n"
    : "#!/bin/sh\nout=''\nwhile [ $# -gt 0 ]; do if [ \"$1\" = \"--output\" ]; then shift; out=$1; fi; shift; done\nprintf '%s' '{\\\"fake\\\":true}' > \"$out\"\n";
  await writeFile(core, output, { mode: 0o755 });
  await chmod(core, 0o755);
  return core;
}

test("compiles source rule sets only through an explicit official-core executable", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-rules-"));
  const sourceDirectory = join(root, "source");
  const outputDirectory = join(root, "compiled");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(join(sourceDirectory, "Fixture.json"), JSON.stringify({ version: 5, rules: [] }));
  const core = await fixtureCore(true);
  const result = await compileRules({ corePath: core, sourceDirectory, outputDirectory });
  assert.equal(result.version, 5);
  assert.equal(result.files.length, 1);
  assert.deepEqual(await readFile(join(outputDirectory, "Fixture.srs")), Buffer.from([0, 83, 82, 83, 45, 70, 73, 88, 84, 85, 82, 69]));
  await assert.rejects(() => compileRules({ sourceDirectory, outputDirectory: join(root, "missing-core") }), /corePath/iu);
});

test("compiles an artifact map to closed binary publication paths", async () => {
  const core = await fixtureCore(true);
  const artifacts = new Map([
    ["audit/sing-box/rules/DomesticCore.json", `${JSON.stringify({ version: 5, rules: [] })}\n`],
    ["optional/adblock-full/audit/sing-box/rules/Advertising.json", `${JSON.stringify({ version: 5, rules: [] })}\n`],
  ]);
  const compiled = await compileRules({
    corePath: core,
    artifacts,
    expectedPaths: [
      "sing-box/rule-sets/DomesticCore.srs",
      "optional/adblock-full/sing-box/Advertising.srs",
    ],
  });
  assert.ok(compiled instanceof Map);
  assert.deepEqual([...compiled.keys()], [
    "optional/adblock-full/sing-box/Advertising.srs",
    "sing-box/rule-sets/DomesticCore.srs",
  ]);
  assert.equal([...compiled.values()].every((value) => Buffer.isBuffer(value) && value.length > 0), true);
});

test("fails closed with the named missing rule-set artifact", async () => {
  const core = await fixtureCore(true);
  await assert.rejects(
    () => compileRules({
      corePath: core,
      artifacts: new Map([["audit/sing-box/rules/DomesticCore.json", JSON.stringify({ version: 5, rules: [] })]]),
      expectedPaths: ["sing-box/rule-sets/DomesticCore.srs", "sing-box/rule-sets/ChinaIP.srs"],
    }),
    /ChinaIP\.srs.*missing|missing.*ChinaIP\.srs/iu,
  );
});

test("checks light and diagnostic configs through the official core", async () => {
  const core = await fixtureCore(true);
  const result = await checkConfigs({
    corePath: core,
    configs: new Map([
      ["sing-box-macos.json", JSON.stringify({ route: { rule_set: [{ format: "binary", url: "https://example.invalid/a.srs" }] } })],
      ["sing-box-macos-diagnostic.json", JSON.stringify({ route: { rule_set: [] } })],
    ]),
  });
  assert.deepEqual(result.formatted, ["sing-box-macos-diagnostic.json", "sing-box-macos.json"]);
  assert.deepEqual(result.checked, ["sing-box-macos-diagnostic.json", "sing-box-macos.json"]);
  await assert.rejects(() => checkConfigs({ configs: new Map() }), /corePath/iu);
});

test("rejects a text file pretending to be a compiled .srs", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-rules-text-"));
  const sourceDirectory = join(root, "source");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(join(sourceDirectory, "Fixture.json"), JSON.stringify({ version: 5, rules: [] }));
  const core = await fixtureCore(false);
  await assert.rejects(
    () => compileRules({ corePath: core, sourceDirectory, outputDirectory: join(root, "compiled") }),
    /binary.*srs|compiled.*binary/iu,
  );
});
