import assert from "node:assert/strict";
import test from "node:test";

import {
  SEMANTIC_INTENTS,
  semanticIntentForSource,
} from "../shared/rules/semantic-intents.js";

test("defines stable semantic intent IDs and source membership", () => {
  assert.deepEqual(SEMANTIC_INTENTS.map(({ id }) => id), [
    "security",
    "privacy",
    "domesticCore",
    "domesticPlatform",
    "ai",
    "github",
    "youtube",
    "overseasMedia",
    "globalSocial",
    "apple",
    "microsoft",
    "download",
    "overseasGame",
    "chinaIp",
  ]);
  assert.deepEqual(semanticIntentForSource("OpenAI").sourceIds, ["OpenAI", "Claude", "Gemini", "Copilot"]);
  assert.equal(semanticIntentForSource("Netflix").id, "overseasMedia");
  assert.equal(semanticIntentForSource("ChinaIP").defaultTarget, "DIRECT");
});

test("rejects unknown semantic sources without mutating the catalog", () => {
  assert.equal(semanticIntentForSource("UnknownSource"), undefined);
  assert.equal(Object.isFrozen(SEMANTIC_INTENTS), true);
  assert.equal(Object.isFrozen(SEMANTIC_INTENTS[0]), true);
});
