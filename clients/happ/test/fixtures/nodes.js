const uuid = "00000000-0000-4000-8000-000000000003";

export const vlessRealityRaw = {
  name: "🇯🇵 东京 VLESS",
  type: "vless",
  server: "vless-reality.example.invalid",
  port: 443,
  uuid,
  encryption: "none",
  flow: "xtls-rprx-vision",
  network: "raw",
  security: "reality",
  sni: "reality.example.invalid",
  "client-fingerprint": "chrome",
  "reality-opts": {
    "public-key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "short-id": "0123abcd",
    "spider-x": "/crawl?seed=1",
  },
};

export const vlessWebSocket = {
  name: "🇺🇸 WebSocket VLESS",
  type: "vless",
  server: "vless-ws.example.invalid",
  port: 8443,
  uuid,
  encryption: "none",
  network: "ws",
  tls: true,
  sni: "ws.example.invalid",
  "ws-opts": {
    path: ["/vless"],
    headers: { Host: ["edge.example.invalid"], "X-Test": ["fixture"] },
  },
};

export const vlessGrpc = {
  name: "🇩🇪 gRPC VLESS",
  type: "vless",
  server: "vless-grpc.example.invalid",
  port: 443,
  uuid,
  encryption: "none",
  network: "grpc",
  tls: true,
  "grpc-opts": { "grpc-service-name": "vless-edge" },
};

export const vmessTls = {
  name: "🇸🇬 VMess TLS",
  type: "vmess",
  server: "vmess.example.invalid",
  port: 443,
  uuid,
  cipher: "aes-128-gcm",
  "alter-id": 0,
  network: "ws",
  tls: true,
  servername: "vmess.example.invalid",
  alpn: ["http/1.1"],
  "client-fingerprint": "firefox",
  "skip-cert-verify": true,
  "ws-opts": { path: "/vmess", headers: { Host: "vmess-edge.example.invalid" } },
};

export const vmessGrpc = {
  name: "🇬🇧 VMess gRPC",
  type: "vmess",
  server: "vmess-grpc.example.invalid",
  port: 443,
  uuid,
  encryption: "auto",
  alterId: 0,
  network: "grpc",
  tls: true,
  "grpc-opts": { "grpc-service-name": "vmess-edge" },
};

export const trojanTls = {
  name: "🇫🇷 Trojan TLS",
  type: "trojan",
  server: "trojan.example.invalid",
  port: 443,
  password: "TEST_ONLY_TROJAN_PASSWORD",
  network: "raw",
  tls: true,
  sni: "trojan.example.invalid",
};

export const trojanWebSocket = {
  name: "🇨🇦 Trojan WebSocket",
  type: "trojan",
  server: "trojan-ws.example.invalid",
  port: 443,
  password: "TEST_ONLY_TROJAN_WS_PASSWORD",
  network: "ws",
  tls: true,
  "ws-opts": { path: "/trojan" },
};

export const trojanGrpc = {
  name: "🇨🇭 Trojan gRPC",
  type: "trojan",
  server: "trojan-grpc.example.invalid",
  port: 443,
  password: "TEST_ONLY_TROJAN_GRPC_PASSWORD",
  network: "grpc",
  tls: true,
  "grpc-opts": { "grpc-service-name": "trojan-edge" },
};

export const shadowsocksUdp = {
  name: "🇭🇰 Shadowsocks UDP",
  type: "ss",
  server: "ss.example.invalid",
  port: 8388,
  cipher: "aes-128-gcm",
  password: "TEST_ONLY_SS_PASSWORD",
  udp: true,
  tfo: true,
  network: "raw",
};

export const socks5Authenticated = {
  name: "🇳🇱 SOCKS5 Private",
  type: "socks5",
  server: "socks.example.invalid",
  port: 1080,
  username: "TEST_ONLY_SOCKS_USER",
  password: "TEST_ONLY_SOCKS_PASSWORD",
};

export const socks5Unauthenticated = {
  name: "🇸🇪 SOCKS5 Public",
  type: "socks5",
  server: "socks-public.example.invalid",
  port: 1080,
};

export const hysteria2 = {
  name: "🇰🇷 Hysteria2",
  type: "hysteria2",
  server: "hy2.example.invalid",
  port: 443,
  password: "TEST_ONLY_HYSTERIA_AUTH",
  network: "quic",
  tls: true,
  sni: "hy2.example.invalid",
  alpn: ["h3"],
  "client-fingerprint": "chrome",
  obfs: "salamander",
  "obfs-password": "TEST_ONLY_HYSTERIA_OBFS",
};
