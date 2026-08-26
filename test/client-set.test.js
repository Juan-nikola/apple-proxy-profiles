import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT, OPTION_VALUES } from "../shared/contracts.js";

const EXPECTED_CLIENTS = ["anywhere", "clash", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge", "v2box", "v2rayn"];

test("the client contract contains all stable client identities", () => {
  assert.deepEqual(Object.keys(CLIENT).sort(), EXPECTED_CLIENTS);
});

test("accepts the final region option set", () => {
  assert.deepEqual(OPTION_VALUES.region, ["cn", "global", "ru", "ir"]);
});
