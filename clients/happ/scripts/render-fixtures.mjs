import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { HAPP_PRIVATE_TASKS, operator } from "../src/substore-config-entry.js";
import { validateHappSubscription } from "../src/validate-subscription.js";

const root = resolve(import.meta.dirname, "..");
const rawNodes = Object.freeze([
  Object.freeze({
    name: "Fixture Tokyo",
    type: "ss",
    server: "fixture-tokyo.example.invalid",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_FIXTURE_TOKYO_PASSWORD",
    udp: true,
  }),
  Object.freeze({
    name: "Fixture Frankfurt",
    type: "trojan",
    server: "fixture-frankfurt.example.invalid",
    port: 443,
    password: "TEST_ONLY_FIXTURE_FRANKFURT_PASSWORD",
    sni: "fixture-frankfurt.example.invalid",
  }),
]);

for (const task of HAPP_PRIVATE_TASKS) {
  const result = await operator({}, "Happ", {
    arguments: task,
    async produceArtifact() { return structuredClone(rawNodes); },
  });
  const value = JSON.parse(result.$content);
  if (task.output === "config") validateHappSubscription(value);
  const filename = task.output === "audit" ? "happ-routing-audit.json" : `happ-${task.platform}.json`;
  const destination = resolve(root, "examples", filename);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, result.$content, "utf8");
}
