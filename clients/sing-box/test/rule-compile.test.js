import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkConfigs, compileRules, main } from "../scripts/compile-rules.mjs";

async function fixtureCore(mode) {
  const root = await mkdtemp(join(tmpdir(), "sing-box-core-"));
  const core = join(root, "sing-box");
  const payload = {
    valid: "printf 'SRS\\0021234567890123' > \"$out\"",
    text: "printf '%s' '{\\\"fake\\\":true}' > \"$out\"",
    corrupt: "printf '\\000NOT-SRS-CORRUPT-BYTES' > \"$out\"",
  }[mode];
  if (!payload) throw new Error(`Unknown fixture core mode: ${mode}`);
  const output = `#!/bin/sh\nif [ "$1" = "check" ] || [ "$1" = "format" ]; then exit 0; fi\nout=''\nwhile [ $# -gt 0 ]; do if [ "$1" = "--output" ]; then shift; out=$1; fi; shift; done\n${payload}\n`;
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
  const core = await fixtureCore("valid");
  const result = await compileRules({ corePath: core, sourceDirectory, outputDirectory });
  assert.equal(result.version, 5);
  assert.equal(result.files.length, 1);
  assert.deepEqual(await readFile(join(outputDirectory, "Fixture.srs")), Buffer.from([83, 82, 83, 2, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 49, 50, 51]));
  await assert.rejects(() => compileRules({ sourceDirectory, outputDirectory: join(root, "missing-core") }), /corePath/iu);
});

test("compiles an artifact map to closed binary publication paths", async () => {
  const core = await fixtureCore("valid");
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
  const core = await fixtureCore("valid");
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
  const core = await fixtureCore("valid");
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
  const core = await fixtureCore("text");
  await assert.rejects(
    () => compileRules({ corePath: core, sourceDirectory, outputDirectory: join(root, "compiled") }),
    /SRS magic|valid SRS|minimum valid SRS/iu,
  );
});

test("rejects long NUL-containing output without the official SRS magic in both compiler APIs", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-rules-corrupt-"));
  const sourceDirectory = join(root, "source");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(join(sourceDirectory, "Fixture.json"), JSON.stringify({ version: 5, rules: [] }));
  const core = await fixtureCore("corrupt");
  await assert.rejects(
    () => compileRules({ corePath: core, sourceDirectory, outputDirectory: join(root, "compiled") }),
    /SRS magic|valid.*SRS|SRS.*header/iu,
  );
  await assert.rejects(
    () => compileRules({
      corePath: core,
      artifacts: new Map([["audit/sing-box/rules/Fixture.json", JSON.stringify({ version: 5, rules: [] })]]),
    }),
    /SRS magic|valid.*SRS|SRS.*header/iu,
  );
});

test("compile command names missing staged inputs independently of workspace state", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-missing-stage-"));
  const core = await fixtureCore("valid");
  await assert.rejects(
    () => main(["compile"], { env: {
      SING_BOX_CORE: core,
      SING_BOX_ARTIFACT_ROOT: join(root, "missing-stage"),
      SING_BOX_RULE_OUTPUT_ROOT: join(root, "compiled"),
    } }),
    /missing-stage|staged.*artifact|artifact.*missing/iu,
  );
});
