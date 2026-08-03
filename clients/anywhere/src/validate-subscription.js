import { renderYaml } from "../../../shared/serialization/render-yaml.js";

const MAX_SUBSCRIPTION_BYTES = 8_000_000;

export function assertAnywhereSubscription(subscription, proxies) {
  if (typeof subscription !== "string"
    || subscription.length === 0
    || subscription.length > MAX_SUBSCRIPTION_BYTES
    || !Array.isArray(proxies)
    || proxies.length === 0
    || subscription !== renderYaml({ proxies })) {
    throw new Error("Invalid Anywhere subscription");
  }
  return { proxyCount: proxies.length };
}
