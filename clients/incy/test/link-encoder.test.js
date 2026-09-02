import assert from "node:assert/strict";
import test from "node:test";

import { decodeIncyCrypt1, encodeIncyCrypt1, incyAutoroutingUrl } from "../src/link-encoder.js";

test("INCY crypt1 helper round-trips an autorouting URL without mutating the payload", () => {
  const value = incyAutoroutingUrl();
  const encoded = encodeIncyCrypt1(value);
  const decoded = decodeIncyCrypt1(encoded);

  assert.equal(decoded, value);
  assert.notEqual(encoded, value);
  assert.equal(/\s/u.test(encoded), false);
});

test("INCY crypt1 helper rejects malformed payloads", () => {
  assert.throws(() => decodeIncyCrypt1("not-a-crypt1-payload"), /crypt1|malformed|invalid/i);
});
