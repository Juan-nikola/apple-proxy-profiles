const PLATFORMS = new Set(["macos", "iphone", "ipad", "android", "windows", "linux"]);

export const HAPP_INBOUND_TAGS = Object.freeze({ socks: "happ-in-socks", http: "happ-in-http" });
export const HAPP_INBOUND_PORTS = Object.freeze({ socks: 10808, http: 10809 });

function validatePorts() {
  if (new Set(Object.values(HAPP_INBOUND_PORTS)).size !== Object.keys(HAPP_INBOUND_PORTS).length) {
    throw new Error("Happ inbound ports must be unique");
  }
}

function validatePlatform(platform) {
  if (typeof platform !== "string" || !PLATFORMS.has(platform)) {
    throw new Error("Happ platform is unsupported");
  }
}

function sniffing() {
  return { enabled: true, destOverride: ["http", "tls", "quic"], routeOnly: true };
}

/**
 * Happ hands this JSON directly to Xray on every supported platform. Its local
 * proxy adapter therefore remains deliberately identical: per-platform system
 * integration belongs to Happ, not to the portable Xray config.
 */
export function renderHappInbounds(platform) {
  validatePlatform(platform);
  validatePorts();
  return [
    {
      tag: HAPP_INBOUND_TAGS.socks,
      listen: "127.0.0.1",
      port: HAPP_INBOUND_PORTS.socks,
      protocol: "socks",
      settings: { auth: "noauth", udp: true },
      sniffing: sniffing(),
    },
    {
      tag: HAPP_INBOUND_TAGS.http,
      listen: "127.0.0.1",
      port: HAPP_INBOUND_PORTS.http,
      protocol: "http",
      settings: { allowTransparent: false },
      sniffing: sniffing(),
    },
  ];
}
