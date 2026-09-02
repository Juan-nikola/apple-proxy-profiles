import { renderXrayGeoData } from "./render-xray-geodata.js";

export function renderIncyGeoData(ruleSets, channel = "current") {
  if (!(ruleSets instanceof Map)) {
    throw new TypeError("INCY GeoData ruleSets must be a Map");
  }
  const rendered = renderXrayGeoData(ruleSets, channel);
  return new Map([
    ["incy/geosite.dat", Buffer.from(rendered.domain ?? rendered.geosite)],
    ["incy/geoip.dat", Buffer.from(rendered.ip ?? rendered.geoip)],
  ]);
}
