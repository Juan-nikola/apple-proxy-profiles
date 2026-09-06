import { createHash } from "node:crypto";
import { parseLoyalsoldierRulesDat } from "./loyalsoldier-rules-dat.js";

export const LOYALSOLDIER_SOURCE = Object.freeze({
  id: "loyalsoldier-rules-dat",
  repository: "https://github.com/Loyalsoldier/v2ray-rules-dat",
  ref: "master",
  license: "MIT",
});

export function parseLoyalsoldierV2rayRules({ content, sourceId = LOYALSOLDIER_SOURCE.id } = {}) {
  if (!(typeof content === "string" || Buffer.isBuffer(content) || content instanceof Uint8Array)) throw new TypeError("Loyalsoldier source content is required");
  const parsed = parseLoyalsoldierRulesDat({ text: content, sourceId });
  return Object.freeze({ ...parsed, source: LOYALSOLDIER_SOURCE, sha256: createHash("sha256").update(content).digest("hex") });
}
