import { renderHappGeodata } from "./render-happ-geodata.js";

export function renderIncyGeoData(ruleSets, channel = "current") {
  if (!(ruleSets instanceof Map)) {
    throw new TypeError("INCY GeoData ruleSets must be a Map");
  }
  if (channel !== "current" && channel !== "previous" && channel !== "edge") {
    throw new TypeError("INCY GeoData channel must be current, previous, or edge");
  }
  const rendered = renderHappGeodata(ruleSets).files;
  return new Map([
    ["incy/geosite.dat", Buffer.from(rendered.get("happ/geosite.dat"))],
    ["incy/geoip.dat", Buffer.from(rendered.get("happ/geoip.dat"))],
  ]);
}
