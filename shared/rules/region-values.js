import { OPTION_VALUES } from "../contracts.js";

export const VALID_REGIONS = OPTION_VALUES.region;

export function parseRegion(value) {
  if (value === undefined || value === null || value === "") return "cn";
  if (!VALID_REGIONS.includes(value)) throw new RangeError(`Unsupported region: ${value}`);
  return value;
}
