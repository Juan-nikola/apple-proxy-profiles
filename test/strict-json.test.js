import assert from "node:assert/strict";
import test from "node:test";

import { parseStrictJson } from "../shared/serialization/strict-json.js";

test("parses JSON while rejecting duplicate and prototype-pollution keys", () => {
  assert.deepEqual(parseStrictJson('{"ok":true,"nested":[1,null]}'), { ok: true, nested: [1, null] });
  assert.throws(() => parseStrictJson('{"ai":"FOLLOW","ai":"DIRECT"}'), /duplicate/i);
  for (const key of ["__proto__", "prototype", "constructor"]) {
    assert.throws(() => parseStrictJson(`{"${key}":{}}`), /prototype|unsupported/i);
  }
});

test("enforces UTF-8 byte and nesting limits without echoing input", () => {
  const sentinel = "NODE_SENTINEL_SHOULD_NOT_LEAK";
  assert.throws(
    () => parseStrictJson(JSON.stringify({ value: "😀" }), { label: "policy", maxBytes: 4 }),
    /policy|byte|size/i,
  );
  assert.throws(
    () => parseStrictJson(`{"value":{"marker":"${sentinel}"}}`, { maxDepth: 1 }),
    (error) => !error.message.includes(sentinel) && /depth|nested/i.test(error.message),
  );
  assert.throws(() => parseStrictJson("not JSON"), /JSON|invalid/i);
  assert.deepEqual(parseStrictJson("[1,2,3]"), [1, 2, 3]);
});

test("rejects malformed JSON and preserves valid Unicode", () => {
  assert.equal(parseStrictJson('{"text":"日本語｜🇯🇵"}').text, "日本語｜🇯🇵");
  for (const text of ["", "{", '{"x":}', "{\"x\":1}\u2028{\"y\":2}"]) {
    assert.throws(() => parseStrictJson(text));
  }
});
