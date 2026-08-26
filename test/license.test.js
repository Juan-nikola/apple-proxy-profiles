import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("repository license and third-party notices distinguish root and upstream licenses", async () => {
  const license = await readFile(new URL("../LICENSE", import.meta.url), "utf8");
  const notices = await readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");
  assert.match(license, /GNU GENERAL PUBLIC LICENSE[\s\S]*Version 3, 29 June 2007/u);
  assert.match(notices, /根目录[\s\S]*GPL-3\.0-or-later/iu);
  assert.match(notices, /Blackmatrix7[\s\S]*GPL-2\.0-only/iu);
  assert.match(notices, /Loyalsoldier[\s\S]*GPL-3\.0/iu);
});
