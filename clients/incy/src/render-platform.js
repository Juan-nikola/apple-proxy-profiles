export const INCY_PLATFORMS = Object.freeze(["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);

const PLATFORM_PRESETS = Object.freeze({
  iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150, ipv6Mode: "ipv4-only", resourceProfile: "mobile" }),
  ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150, ipv6Mode: "ipv4-only", resourceProfile: "mobile" }),
  android: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150, ipv6Mode: "ipv4-only", resourceProfile: "mobile" }),
  appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200, ipv6Mode: "ipv4-only", resourceProfile: "tv" }),
  androidtv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200, ipv6Mode: "ipv4-only", resourceProfile: "tv" }),
  macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100, ipv6Mode: "ipv4-only", resourceProfile: "desktop" }),
  windows: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100, ipv6Mode: "ipv4-only", resourceProfile: "desktop" }),
  linux: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100, ipv6Mode: "ipv4-only", resourceProfile: "desktop" }),
});

const COMMON_SNIFFING = Object.freeze({
  enabled: true,
  destOverride: Object.freeze(["udp", "http", "tls", "quic"]),
  routeOnly: false,
});

function ensurePlatform(platform) {
  if (typeof platform !== "string" || !Object.hasOwn(PLATFORM_PRESETS, platform)) {
    throw new Error(`Unsupported INCY platform '${platform}'`);
  }
}

export function incyPlatformPreset(platform) {
  ensurePlatform(platform);
  return PLATFORM_PRESETS[platform];
}

export function renderIncyInbounds(platform) {
  ensurePlatform(platform);
  return Object.freeze([
    Object.freeze({
      tag: "incy-in-socks",
      listen: "127.0.0.1",
      port: 10808,
      protocol: "socks",
      settings: Object.freeze({ auth: "noauth", udp: true }),
      sniffing: COMMON_SNIFFING,
    }),
    Object.freeze({
      tag: "incy-in-http",
      listen: "127.0.0.1",
      port: 10809,
      protocol: "http",
      settings: Object.freeze({}),
      sniffing: COMMON_SNIFFING,
    }),
  ]);
}
