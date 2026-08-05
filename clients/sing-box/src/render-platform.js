const COMMON_EXCLUDE = [
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
];

export function renderSingBoxTun(platform) {
  const base = {
    type: "tun",
    tag: "tun-in",
    interface_name: platform === "android" ? "sing-box" : "singtun0",
    address: ["172.18.0.1/30", "fdfe:dcba:9876::1/126"],
    auto_route: true,
    strict_route: true,
    route_exclude_address: [...COMMON_EXCLUDE],
  };
  if (platform === "openwrt") {
    return {
      ...base,
      stack: "mixed",
      dns_mode: "hijack",
      dns_address: ["172.18.0.2", "fdfe:dcba:9876::2"],
      auto_redirect: true,
      auto_redirect_input_mark: "0x2023",
      auto_redirect_output_mark: "0x2024",
      loopback_address: ["10.7.0.1"],
      route_exclude_address: [...COMMON_EXCLUDE, "192.168.1.0/24"],
    };
  }
  if (platform === "android") {
    return {
      ...base,
      dns_mode: "hijack",
      dns_address: ["172.18.0.2"],
      route_exclude_address: [...COMMON_EXCLUDE, "192.168.0.0/16"],
      platform: { include_android_user: [0] },
    };
  }
  return {
    ...base,
    dns_mode: "hijack",
    dns_address: ["172.18.0.2", "fdfe:dcba:9876::2"],
    platform: { http_proxy: { enabled: false } },
  };
}
