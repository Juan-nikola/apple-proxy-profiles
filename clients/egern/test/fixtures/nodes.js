const TEST_PROFILE = Object.freeze({
  id: "sr-test-only",
  sourceKind: "airport",
  continent: "asiaPacific",
  flag: "🇸🇬",
  udp: true,
  p2p: false,
  entry: true,
  chained: false,
});

function fixture(name, type, fields = {}) {
  return Object.freeze({
    name,
    type,
    server: `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.example.invalid`,
    port: 443,
    ...fields,
    _profile: TEST_PROFILE,
    _subName: "TEST_ONLY_SOURCE_PROVENANCE",
  });
}

export const shadowsocks2022 = fixture("SS 2022", "ss", {
  cipher: "2022-blake3-aes-128-gcm",
  password: "TEST_ONLY_SS_2022_KEY",
  udp: true,
});

export const shadowsocksAlias = fixture("SS Alias", "shadowsocks", {
  cipher: "aes-256-gcm",
  password: "TEST_ONLY_SS_ALIAS_PASSWORD",
  udp: false,
});

export const snellV4 = fixture("Snell V4", "snell", {
  psk: "TEST_ONLY_SNELL_PSK",
  version: 4,
  udp: true,
  reuse: true,
  obfs: "tls",
  "obfs-host": "snell-obfs.example.invalid",
});

export const vmessRaw = fixture("VMess Raw", "vmess", {
  uuid: "00000000-0000-4000-8000-000000000001",
  cipher: "auto",
  network: "tcp",
  udp: true,
});

export const vmessTls = fixture("VMess TLS", "vmess", {
  uuid: "00000000-0000-4000-8000-000000000001",
  cipher: "aes-128-gcm",
  network: "tcp",
  tls: true,
  servername: "vmess-tls.example.invalid",
  "skip-cert-verify": false,
});

export const vmessWss = fixture("VMess WSS", "vmess", {
  uuid: "00000000-0000-4000-8000-000000000001",
  cipher: "chacha20-poly1305",
  network: "ws",
  tls: true,
  servername: "vmess-wss.example.invalid",
  "ws-opts": {
    path: "/vmess",
    headers: { Host: "vmess-host.example.invalid" },
  },
});

export const vmessGrpc = fixture("VMess gRPC", "vmess", {
  uuid: "00000000-0000-4000-8000-000000000001",
  cipher: "none",
  network: "grpc",
  tls: true,
  sni: "vmess-grpc.example.invalid",
  "grpc-opts": { "grpc-service-name": "VMessService" },
});

export const vmessHttp1 = fixture("VMess HTTP1", "vmess", {
  uuid: "00000000-0000-4000-8000-000000000001",
  cipher: "zero",
  network: "http",
  "http-opts": {
    method: "GET",
    path: ["/vmess-http"],
    headers: { Host: ["vmess-http.example.invalid"] },
  },
});

export const vlessRaw = fixture("VLESS Raw", "vless", {
  uuid: "00000000-0000-4000-8000-000000000001",
  network: "tcp",
  udp: false,
});

export const vlessReality = fixture("VLESS Reality", "vless", {
  uuid: "00000000-0000-4000-8000-000000000001",
  network: "tcp",
  tls: true,
  servername: "www.example.com",
  flow: "xtls-rprx-vision",
  udp: true,
  "reality-opts": {
    "public-key": "TEST_ONLY_REALITY_PUBLIC_KEY",
    "short-id": "0123abcd",
  },
});

export const vlessWss = fixture("VLESS WSS", "vless", {
  uuid: "00000000-0000-4000-8000-000000000001",
  network: "ws",
  tls: true,
  sni: "vless-wss.example.invalid",
  "ws-opts": { path: "/vless", headers: { Host: "vless-host.example.invalid" } },
});

export const vlessGrpcReality = fixture("VLESS gRPC Reality", "vless", {
  uuid: "00000000-0000-4000-8000-000000000001",
  network: "grpc",
  tls: true,
  servername: "www.example.com",
  "grpc-opts": { "grpc-service-name": "VlessService" },
  "reality-opts": { "public-key": "TEST_ONLY_GRPC_REALITY_PUBLIC_KEY" },
});

export const vlessHttp2 = fixture("VLESS HTTP2", "vless", {
  uuid: "00000000-0000-4000-8000-000000000001",
  network: "h2",
  tls: true,
  servername: "vless-h2.example.invalid",
  "h2-opts": {
    method: "GET",
    path: "/vless-h2",
    host: ["vless-h2-host.example.invalid"],
    headers: { Accept: "*/*" },
  },
});

export const trojanTls = fixture("Trojan TLS", "trojan", {
  password: "TEST_ONLY_TROJAN_PASSWORD",
  sni: "trojan.example.invalid",
  udp: true,
  "skip-cert-verify": false,
});

export const trojanWebsocket = fixture("Trojan WebSocket", "trojan", {
  password: "TEST_ONLY_TROJAN_WS_PASSWORD",
  sni: "trojan-ws.example.invalid",
  network: "ws",
  "ws-opts": { path: "/trojan", headers: { Host: "trojan-host.example.invalid" } },
});

export const trojanReality = fixture("Trojan Reality", "trojan", {
  password: "TEST_ONLY_TROJAN_REALITY_PASSWORD",
  sni: "www.example.com",
  "reality-opts": { "public-key": "TEST_ONLY_TROJAN_REALITY_PUBLIC_KEY", "short-id": "abcd" },
});

export const anytls = fixture("AnyTLS", "anytls", {
  password: "TEST_ONLY_ANYTLS_PASSWORD",
  sni: "anytls.example.invalid",
  udp: true,
  "skip-cert-verify": false,
});

export const hysteria2 = fixture("Hysteria2", "hysteria2", {
  password: "TEST_ONLY_HYSTERIA2_AUTH",
  sni: "hysteria2.example.invalid",
  obfs: "salamander",
  "obfs-password": "TEST_ONLY_HYSTERIA2_OBFS_PASSWORD",
  ports: "20000-30000",
  "hop-interval": 30,
  up: 100,
});

export const hysteria2Alias = fixture("Hysteria2 Alias", "hy2", {
  password: "TEST_ONLY_HY2_AUTH",
  sni: "hy2.example.invalid",
});

export const tuic = fixture("TUIC", "tuic", {
  uuid: "00000000-0000-4000-8000-000000000001",
  password: "TEST_ONLY_TUIC_PASSWORD",
  "udp-relay-mode": "native",
  alpn: ["h3"],
  sni: "tuic.example.invalid",
  "skip-cert-verify": true,
  "port-hopping": "443,445,447",
  "port-hopping-interval": 30,
});

export const socks5 = fixture("SOCKS5", "socks5", {
  username: "TEST_ONLY_SOCKS_USERNAME",
  password: "TEST_ONLY_SOCKS_PASSWORD",
  udp: true,
});

export const socks5Tls = fixture("SOCKS5 TLS", "socks5", {
  username: "TEST_ONLY_SOCKS_TLS_USERNAME",
  password: "TEST_ONLY_SOCKS_TLS_PASSWORD",
  tls: true,
  sni: "socks-tls.example.invalid",
  "skip-cert-verify": false,
});

export const http = fixture("HTTP", "http", {
  username: "TEST_ONLY_HTTP_USERNAME",
  password: "TEST_ONLY_HTTP_PASSWORD",
});

export const https = fixture("HTTPS", "http", {
  username: "TEST_ONLY_HTTPS_USERNAME",
  password: "TEST_ONLY_HTTPS_PASSWORD",
  tls: true,
  sni: "https.example.invalid",
  "skip-cert-verify": false,
  headers: { "User-Agent": "TEST_ONLY_HTTP_AGENT" },
});

export const ssh = fixture("SSH", "ssh", {
  username: "TEST_ONLY_SSH_USERNAME",
  password: "TEST_ONLY_SSH_PASSWORD",
  "private-key": "TEST_ONLY_SSH_PRIVATE_KEY",
  "host-keys": ["ssh-ed25519 TEST_ONLY_SSH_HOST_KEY"],
  tfo: true,
});

export const wireguardIpv4 = fixture("WireGuard IPv4", "wireguard", {
  "private-key": "TEST_ONLY_WIREGUARD_PRIVATE_KEY",
  "public-key": "TEST_ONLY_WIREGUARD_PUBLIC_KEY",
  "pre-shared-key": "TEST_ONLY_WIREGUARD_PRESHARED_KEY",
  reserved: [1, 2, 3],
  ip: "192.0.2.2/32",
  dns: ["192.0.2.53"],
  mtu: 1280,
  keepalive: 25,
});

export const wireguardIpv6 = fixture("WireGuard IPv6", "wireguard", {
  "private-key": "TEST_ONLY_WIREGUARD_V6_PRIVATE_KEY",
  "public-key": "TEST_ONLY_WIREGUARD_V6_PUBLIC_KEY",
  ipv6: "2001:db8::2/128",
});

export const allCompatibleNodes = Object.freeze([
  shadowsocks2022,
  shadowsocksAlias,
  snellV4,
  vmessRaw,
  vmessTls,
  vmessWss,
  vmessGrpc,
  vmessHttp1,
  vlessRaw,
  vlessReality,
  vlessWss,
  vlessGrpcReality,
  vlessHttp2,
  trojanTls,
  trojanWebsocket,
  trojanReality,
  anytls,
  hysteria2,
  hysteria2Alias,
  tuic,
  socks5,
  socks5Tls,
  http,
  https,
  ssh,
  wireguardIpv4,
  wireguardIpv6,
]);

export { fixture };
