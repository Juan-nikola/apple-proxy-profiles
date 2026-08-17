import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT } from "../shared/contracts.js";

const EXPECTED_CLIENTS = ["anywhere", "egern", "shadowrocket", "singbox", "surge"];

test("the maintained client contract contains only the five supported clients", () => {
  assert.deepEqual(Object.keys(CLIENT).sort(), EXPECTED_CLIENTS);
});
