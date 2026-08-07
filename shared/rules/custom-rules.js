import { ROUTING_PRECEDENCE } from "./lightweight-policy.js";

export const CUSTOM_RULE_PRECEDENCE_INDEX = ROUTING_PRECEDENCE.indexOf("custom");

if (
  CUSTOM_RULE_PRECEDENCE_INDEX < 0
  || CUSTOM_RULE_PRECEDENCE_INDEX > ROUTING_PRECEDENCE.indexOf("domesticCore")
) {
  throw new Error("Custom rules must precede generated lightweight rules");
}

export const CUSTOM_RULES = Object.freeze({
  block: Object.freeze([]),
  direct: Object.freeze([]),
  proxy: Object.freeze([]),
  ai: Object.freeze([
    "DOMAIN-SUFFIX,perplexity.ai",
    "DOMAIN-SUFFIX,pplx.ai",
    "DOMAIN-SUFFIX,x.ai",
    "DOMAIN-SUFFIX,grok.com",
    "DOMAIN-SUFFIX,poe.com",
    "DOMAIN-SUFFIX,poecdn.net",
  ]),
});
