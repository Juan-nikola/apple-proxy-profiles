import { CLIENT } from "../contracts.js";

function protocol(names, clients, { requiredFields = [], tls = false } = {}) {
  return Object.freeze({
    names: Object.freeze(names),
    clients: Object.freeze(clients),
    requiredFields: Object.freeze(requiredFields),
    tls,
  });
}

const definitions = Object.freeze([
  protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
    requiredFields: ["cipher", "password"],
  }),
  protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge], {
    requiredFields: ["cipher", "password", "protocol", "obfs"],
  }),
  protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
    requiredFields: ["psk", "version"],
  }),
  protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
    requiredFields: ["uuid"],
  }),
  protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox], {
    requiredFields: ["uuid"],
  }),
  protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
    requiredFields: ["password"],
    tls: true,
  }),
  protocol(["anytls"], [CLIENT.egern, CLIENT.anywhere, CLIENT.singbox], {
    requiredFields: ["password"],
    tls: true,
  }),
  protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox], {
    requiredFields: ["password"],
    tls: true,
  }),
  protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox], {
    requiredFields: ["uuid", "password"],
    tls: true,
  }),
  protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox]),
  protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox]),
  protocol(["ssh"], [CLIENT.egern, CLIENT.singbox], {
    requiredFields: ["username"],
  }),
  protocol(["wireguard"], [CLIENT.egern, CLIENT.singbox], {
    requiredFields: ["private-key", "public-key"],
  }),
  protocol(["sudoku"], [CLIENT.anywhere], {
    requiredFields: ["key"],
  }),
]);

const registry = new Map();
for (const definition of definitions) {
  for (const name of definition.names) registry.set(name, definition);
}

const DISPLAY_PROTOCOL_NAMES = Object.freeze({
  ss: "SS",
  shadowsocks: "SS",
  ssr: "SSR",
  snell: "Snell",
  vmess: "VMess",
  vless: "VLESS",
  trojan: "Trojan",
  anytls: "AnyTLS",
  hysteria2: "Hy2",
  hy2: "Hy2",
  tuic: "Tuic",
  socks5: "SOCKS5",
  http: "HTTP",
  ssh: "SSH",
  wireguard: "WireGuard",
  sudoku: "Sudoku",
});

export function normalizeProtocol(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function protocolDefinition(value) {
  return registry.get(normalizeProtocol(value)) ?? null;
}

export function protocolSupportsClient(value, client) {
  return protocolDefinition(value)?.clients.includes(client) === true;
}

export function diagnosticProtocol(value) {
  const normalized = normalizeProtocol(value);
  return registry.has(normalized) ? normalized : "unknown";
}

export function displayProtocol(value) {
  return DISPLAY_PROTOCOL_NAMES[normalizeProtocol(value)] ?? "";
}
