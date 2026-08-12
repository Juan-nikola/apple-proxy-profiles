const CHANNELS = Object.freeze(["current", "previous", "edge"]);
const CHANNEL_SUFFIX = Object.freeze({
  current: "Current",
  previous: "Previous",
  edge: "Edge",
});
const SOURCE_ID = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/u;
const CODE = /^APP-[A-Z0-9]+(?:-[A-Z0-9]+)*$/u;

function requiredChannel(channel) {
  if (typeof channel !== "string" || !CHANNELS.includes(channel)) {
    throw new TypeError(`OneXray GeoData channel must be current, previous, or edge: ${String(channel)}`);
  }
  return channel;
}

/** Returns the stable Xray geosite/geoip names for one release channel. */
export function oneXrayGeoNames(channel) {
  const suffix = CHANNEL_SUFFIX[requiredChannel(channel)];
  const names = {
    domain: `AppleProxySite${suffix}`,
    ip: `AppleProxyIP${suffix}`,
  };
  // The canonical public keys are domain/ip. Non-enumerable aliases make the
  // contract convenient for callers that use Xray's geosite/geoip vocabulary
  // without changing its serialized shape.
  Object.defineProperties(names, {
    site: { value: names.domain, enumerable: false },
    geosite: { value: names.domain, enumerable: false },
    geoip: { value: names.ip, enumerable: false },
  });
  return Object.freeze(names);
}

/** Maps an internal source ID to a stable, display-label-independent code. */
export function oneXrayGeoCode(sourceId) {
  if (typeof sourceId !== "string" || sourceId.trim() !== sourceId || !SOURCE_ID.test(sourceId)) {
    throw new TypeError("OneXray GeoData source ID is invalid");
  }
  const normalized = sourceId.toUpperCase().replaceAll("_", "-");
  const code = `APP-${normalized}`;
  if (!CODE.test(code)) throw new TypeError("OneXray GeoData source ID is invalid");
  return code;
}

/** Returns a stable `ext:<Name>.dat:<APP-CODE>` reference for Profile rules. */
export function oneXrayGeoReference(channel, type, sourceId) {
  const names = oneXrayGeoNames(channel);
  if (type !== "domain" && type !== "ip") throw new TypeError("OneXray GeoData type is invalid");
  return `ext:${names[type]}.dat:${oneXrayGeoCode(sourceId)}`;
}

export const ONE_XRAY_GEO_CHANNELS = CHANNELS;
export const ONE_XRAY_GEO_CODE_PATTERN = CODE;
