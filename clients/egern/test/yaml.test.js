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

test("escapes YAML-forbidden C1 controls and Unicode separators in values and keys", () => {
  const forbidden = "\u007f\u0085\u009f\u2028\u2029";
  const output = renderYaml({ [`key${forbidden}`]: `value${forbidden}` });

  assert.equal(
    output,
    '"key\\u007f\\u0085\\u009f\\u2028\\u2029": "value\\u007f\\u0085\\u009f\\u2028\\u2029"\n',
  );
  for (const character of forbidden) {
    assert.equal(output.includes(character), false);
  }
});

test("preserves valid surrogate pairs and astral Unicode", () => {
  assert.equal(renderYaml({ "🌐": "🚀" }), '"🌐": "🚀"\n');
});

test("rejects lone surrogate values at safe paths without leaking them", () => {
  const cases = [
    [{ payload: "\ud800" }, /Ill-formed UTF-16 string at payload/],
    [{ items: ["\udfff"] }, /Ill-formed UTF-16 string at items\[0\]/],
  ];

  for (const [value, pattern] of cases) {
    assert.throws(
      () => renderYaml(value),
      (error) => {
        assert.match(error.message, pattern);
        assert.doesNotMatch(error.message, /\\ud800|\\udfff/i);
        assert.equal(/[\ud800-\udfff]/u.test(error.message), false);
        return true;
      },
    );
  }
});

test("rejects lone surrogate keys without leaking key contents", () => {
  for (const surrogate of ["\ud800", "\udfff"]) {
    const privateKeyName = `TEST_ONLY_KEY_${surrogate}`;

    assert.throws(
      () => renderYaml({ [privateKeyName]: true }),
      (error) => {
        assert.match(error.message, /Ill-formed UTF-16 property key at <root>/);
        assert.doesNotMatch(error.message, /TEST_ONLY_KEY|\\ud800|\\udfff/i);
        assert.equal(/[\ud800-\udfff]/u.test(error.message), false);
        return true;
      },
    );
  }
});

test("renders negative zero without losing its sign", () => {
  assert.equal(renderYaml(-0), "-0\n");
  assert.equal(renderYaml({ offset: -0 }), "offset: -0\n");
});

test("keeps structural error paths single-line and escaped", () => {
  const unsafeControls = "\n\r\u007f\u0085\u009f\u2028\u2029";
  const key = `unsafe${unsafeControls}key`;

  assert.throws(
    () => renderYaml({ [key]: undefined }),
    (error) => {
      assert.equal(
        error.message,
        'Unsupported YAML value at ["unsafe\\n\\r\\u007f\\u0085\\u009f\\u2028\\u2029key"]',
      );
      assert.equal(error.message.split("\n").length, 1);
      for (const character of unsafeControls) {
        assert.equal(error.message.includes(character), false);
      }
      return true;
    },
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
