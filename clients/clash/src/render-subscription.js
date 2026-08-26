import { renderYaml } from "../../../shared/serialization/render-yaml.js";
import { prepareClashInventory } from "./render-profile.js";

export function renderClashSubscription(nodes, options = {}) {
  const prepared = prepareClashInventory(nodes, options);
  return renderYaml({ proxies: prepared.proxies });
}

