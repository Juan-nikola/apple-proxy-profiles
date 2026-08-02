import assert from "node:assert/strict";
import test from "node:test";

import { renderYaml } from "../src/render-yaml.js";

test("renders deterministic YAML with JSON-safe strings", () => {
  assert.equal(
    renderYaml({
      ipv6: false,
      proxies: [{ vless: { name: "🇺🇸 Node: 1", port: 443 } }],
    }),
    [
      "ipv6: false",
      "proxies:",
      "  - vless:",
      "      name: \"🇺🇸 Node: 1\"",
      "      port: 443",
      "",
    ].join("\n"),
  );
});

test("renders scalars, nested sequences, empty collections, and unsafe keys", () => {
  assert.equal(renderYaml(null), "null\n");
  assert.equal(renderYaml(true), "true\n");
  assert.equal(renderYaml(-12.5), "-12.5\n");
  assert.equal(renderYaml("null: no\nline"), '"null: no\\nline"\n');

  const value = Object.create(null);
  value.emptyArray = [];
  value.emptyObject = {};
  value["unsafe: key"] = ["first", [false], { child: null }];

  assert.equal(
    renderYaml(value),
    [
      "emptyArray: []",
      "emptyObject: {}",
      '"unsafe: key":',
      '  - "first"',
      "  -",
      "    - false",
      "  - child: null",
      "",
    ].join("\n"),
  );
});

test("preserves object insertion order and allows repeated acyclic references", () => {
  const repeated = { second: 2, first: 1 };
  assert.equal(
    renderYaml({ zed: repeated, alpha: repeated }),
    [
      "zed:",
      "  second: 2",
      "  first: 1",
      "alpha:",
      "  second: 2",
      "  first: 1",
      "",
    ].join("\n"),
  );
});

test("rejects unsupported primitive values without exposing their contents", () => {
  const secret = "TEST_ONLY_REJECTED_VALUE";
  const cases = [
    [{ token: undefined }, /Unsupported YAML value at token/],
    [{ token: () => secret }, /Unsupported YAML value at token/],
    [{ token: Symbol(secret) }, /Unsupported YAML value at token/],
    [{ token: 7n }, /Unsupported YAML value at token/],
    [{ value: Number.NaN }, /finite number at value/],
    [{ value: Number.POSITIVE_INFINITY }, /finite number at value/],
  ];

  for (const [value, pattern] of cases) {
    assert.throws(
      () => renderYaml(value),
      (error) => {
        assert.match(error.message, pattern);
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      },
    );
  }
});

test("rejects cyclic values and identifies their structural path", () => {
  const root = { nested: {} };
  root.nested.loop = root;

  assert.throws(() => renderYaml(root), /Cyclic YAML value at nested\.loop/);
});

test("rejects sparse arrays at the missing index", () => {
  const sparse = ["present", , "present"];
  assert.throws(() => renderYaml({ items: sparse }), /Sparse YAML array at items\[1\]/);
});

test("rejects symbol keys without exposing the symbol description", () => {
  const secret = "TEST_ONLY_SYMBOL_DESCRIPTION";
  const value = { safe: true, [Symbol(secret)]: false };

  assert.throws(
    () => renderYaml(value),
    (error) => {
      assert.match(error.message, /Symbol key at <root>/);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test("rejects accessors without invoking their getters", () => {
  let getterCalls = 0;
  const value = { nested: {} };
  Object.defineProperty(value.nested, "token", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "SENSITIVE_GETTER_VALUE";
    },
  });

  assert.throws(
    () => renderYaml(value),
    (error) => {
      assert.match(error.message, /Accessor property at nested\.token/);
      assert.doesNotMatch(error.message, /SENSITIVE_GETTER_VALUE/);
      return true;
    },
  );
  assert.equal(getterCalls, 0);
});

test("rejects non-plain objects at a safe structural path", () => {
  class SecretContainer {}
  const cases = [new Date(0), /x/, new Map(), new Set(), new SecretContainer()];

  for (const value of cases) {
    assert.throws(
      () => renderYaml({ payload: value }),
      /Expected plain object or array at payload/,
    );
  }
});
