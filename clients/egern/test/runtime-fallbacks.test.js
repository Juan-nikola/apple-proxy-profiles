import assert from "node:assert/strict";
import test from "node:test";

import {
  EgernUrlFallback,
  egernStructuredCloneFallback,
} from "../src/runtime-fallbacks.js";

const CLONE_ERROR = "Egern structured clone fallback rejected unsupported data";
const URL_ERROR = "Invalid Egern fallback URL";
const httpsAuthority = (authority) => ["https:", "//", authority, "/"].join("");

test("structured clone fallback preserves supported data, cycles, null prototypes, undefined, and -0", () => {
  const nullPrototype = Object.create(null);
  nullPrototype.value = undefined;
  const source = {
    array: [undefined, -0, 1n, "value"],
    nullPrototype,
  };
  source.self = source;
  source.array.push(source.nullPrototype);

  const clone = egernStructuredCloneFallback(source);
  assert.notEqual(clone, source);
  assert.equal(clone.self, clone);
  assert.equal(clone.array[0], undefined);
  assert.equal(Object.is(clone.array[1], -0), true);
  assert.equal(clone.array[2], 1n);
  assert.equal(clone.array[4], clone.nullPrototype);
  assert.equal(Object.getPrototypeOf(clone.nullPrototype), null);
});

test("structured clone fallback rejects accessors and hostile proxy traps without leaking values", () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "secret", {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error("TEST_ONLY_CLONE_GETTER_SECRET");
    },
  });
  assert.throws(() => egernStructuredCloneFallback(accessor), { message: CLONE_ERROR });
  assert.equal(getterCalls, 0);

  const hostile = new Proxy({}, {
    ownKeys() { throw new Error("TEST_ONLY_PROXY_TRAP_SECRET"); },
  });
  assert.throws(() => egernStructuredCloneFallback(hostile), { message: CLONE_ERROR });
  assert.throws(() => egernStructuredCloneFallback({ value: () => "secret" }), { message: CLONE_ERROR });
});

test("URL fallback parses strict absolute HTTP(S) authorities and bracketed IPv6", () => {
  const https = new EgernUrlFallback("HTTPS://Example.Invalid:8443/private/nodes?q=%2F");
  assert.deepEqual({
    protocol: https.protocol,
    hostname: https.hostname,
    username: https.username,
    password: https.password,
    port: https.port,
  }, {
    protocol: "https:",
    hostname: "example.invalid",
    username: "",
    password: "",
    port: "8443",
  });
  const ipv6 = new EgernUrlFallback("http://[2001:DB8::2]:51820/");
  assert.equal(ipv6.hostname, "[2001:db8::2]");
  assert.equal(ipv6.port, "51820");
  const credentials = new EgernUrlFallback(httpsAuthority("user:password@example.invalid"));
  assert.equal(credentials.username, "user");
  assert.equal(credentials.password, "password");
});

test("URL fallback rejects malformed hosts, credentials, ports, brackets, controls, and percents", () => {
  const rejected = [
    "ftp://example.invalid/",
    "https://",
    "https://example.invalid:/",
    "https://example.invalid:65536/",
    httpsAuthority("user@@example.invalid"),
    httpsAuthority("user%40name@example.invalid"),
    httpsAuthority("example.invalid\\@attacker.invalid"),
    "https://example.invalid/%0a",
    "https://example.invalid/%80",
    "https://example.invalid/%zz",
    "https://[2001:db8:::2]/",
    "https://[2001:db8::gg]/",
    "https://[2001:db8::2/",
    "https://2001:db8::2/",
    "https://999.1.1.1/",
    "https://-invalid.example/",
  ];
  for (const value of rejected) {
    assert.throws(() => new EgernUrlFallback(value), { message: URL_ERROR }, value);
  }
});

test("URL fallback applies WHATWG ends-in-a-number classification generically", () => {
  for (const hostname of [
    "example.1",
    "example.0009",
    "example.0x",
    "example.0Xdeaf",
    "example.0177",
    "127.1",
    "2130706433",
    "0x7f000001",
    "0177.0.0.1",
    "4294967296",
  ]) {
    assert.throws(
      () => new EgernUrlFallback(`https://${hostname}/private/nodes`),
      { message: URL_ERROR },
      hostname,
    );
  }
  for (const hostname of ["example.1a", "example.0xg", "1.example", "192.0.2.1"]) {
    assert.doesNotThrow(() => new EgernUrlFallback(`https://${hostname}/private/nodes`), hostname);
  }
});
