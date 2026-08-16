const COMMON_EXCLUDE = Object.freeze([
  "192.168.0.0/16",
  "172.16.0.0/12",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "224.0.0.0/4",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
]);

export function renderSingBoxTun(platform, ipv6Mode = "auto") {
  if (!["macos", "iphone", "ipad", "android"].includes(platform)) {
    throw new Error(`Unsupported sing-box platform: ${platform}`);
  }
  const ipv4Only = ipv6Mode === "ipv4-only";
  return {
    type: "tun",
    tag: "tun-in",
    interface_name: platform === "android" ? "sing-box" : "singtun0",
    address: ipv4Only
      ? ["172.18.0.1/30"]
      : ["172.18.0.1/30", "fdfe:dcba:9876::1/126"],
    auto_route: true,
    strict_route: true,
    route_exclude_address: [...COMMON_EXCLUDE],
    dns_mode: "hijack",
    dns_address: ipv4Only ? ["172.18.0.2"] : ["172.18.0.2", "fdfe:dcba:9876::2"],
    ...(platform === "android"
      ? { include_android_user: [0] }
      : { platform: { http_proxy: { enabled: false } } }),
  };
}
