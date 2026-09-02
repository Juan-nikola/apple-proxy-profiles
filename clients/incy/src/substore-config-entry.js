import { parseIncyOptions } from "./options.js";

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  void context;
  const options = parseIncyOptions({ ...(context.arguments ?? {}), output: "config", type: "collection" });
  return { ...input, $content: JSON.stringify({ options }, null, 2) + "\n" };
}
