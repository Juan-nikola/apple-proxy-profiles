import assert from "node:assert/strict";
import test from "node:test";

import { anywhereStructuredCloneFallback } from "../src/runtime-fallbacks.js";

test("Anywhere structured clone fallback preserves supported data and cycles", () => {
  const source = Object.create(null);
  source.array = [1, undefined, -0];
  source.self = source;
  const clone = anywhereStructuredCloneFallback(source);
  assert.equal(Object.getPrototypeOf(clone), null);
  assert.equal(clone.self, clone);
  assert.deepEqual(clone.array.slice(0, 2), [1, undefined]);
  assert.equal(Object.is(clone.array[2], -0), true);
});

test("Anywhere structured clone fallback rejects accessors without reflection", () => {
  const hostileMarker = "SHOULD_NOT_ESCAPE_ANYWHERE_CLONE";
  let invoked = false;
  const source = {};
  Object.defineProperty(source, "field", {
    enumerable: true,
    get() { invoked = true; throw new Error(hostileMarker); },
  });
  assert.throws(
    () => anywhereStructuredCloneFallback(source),
    (error) => error.message === "Anywhere structured clone fallback rejected unsupported data"
      && !error.message.includes(hostileMarker),
  );
  assert.equal(invoked, false);
});
