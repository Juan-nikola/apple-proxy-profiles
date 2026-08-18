import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT } from "../shared/contracts.js";

const EXPECTED_CLIENTS = ["anywhere", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge"];

test("the client contract contains the seven stable client identities", () => {
  assert.deepEqual(Object.keys(CLIENT).sort(), EXPECTED_CLIENTS);
});
