import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { compileRules } from "../scripts/compile-rules.mjs";

async function fixtureCore(binary) {
  const root = await mkdtemp(join(tmpdir(), "sing-box-core-"));
  const core = join(root, "sing-box");
  const output = binary
    ? "#!/bin/sh\nout=''\nwhile [ $# -gt 0 ]; do if [ \"$1\" = \"--output\" ]; then shift; out=$1; fi; shift; done\nprintf '\\000SRS-FIXTURE' > \"$out\"\n"
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
