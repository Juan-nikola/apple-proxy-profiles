const PLATFORM_METADATA = Object.freeze({
  macos: { tun: false, proxy: "desktop" }, iphone: { tun: true, proxy: "network-extension" }, ipad: { tun: true, proxy: "network-extension" },
});
const PORTS = Object.freeze({ socks: 10808, http: 10809 });
export function renderHappInbounds(platform) {
  if (!PLATFORM_METADATA[platform]) throw new Error(`Unsupported Happ platform '${platform}'`);
  const common = { listen: "127.0.0.1", sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], routeOnly: true } };
  return [
    { tag: "happ-in-socks", port: PORTS.socks, protocol: "socks", settings: { auth: "noauth", udp: true }, ...common },
    { tag: "happ-in-http", port: PORTS.http, protocol: "http", settings: {}, ...common },
  ].map((entry) => Object.freeze(entry));
}
export function happPlatformMetadata(platform) { if (!PLATFORM_METADATA[platform]) throw new Error(`Unsupported Happ platform '${platform}'`); return PLATFORM_METADATA[platform]; }
export { PORTS as HAPP_INBOUND_PORTS };
