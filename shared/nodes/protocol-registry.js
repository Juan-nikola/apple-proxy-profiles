import { CLIENT } from "../contracts.js";

function protocol(names, clients, { requiredFields = [], tls = false, clientNames = {} } = {}) {
  return Object.freeze({
    names: Object.freeze(names),
    clients: Object.freeze(clients),
    requiredFields: Object.freeze(requiredFields),
    tls,
    clientNames: Object.freeze(Object.fromEntries(
      Object.entries(clientNames).map(([client, supportedNames]) => [client, Object.freeze(supportedNames)]),
    )),
  });
}

const definitions = Object.freeze([
  protocol(["ss", "shadowsocks"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
    requiredFields: ["cipher", "password"],
  }),
  protocol(["ssr"], [CLIENT.shadowrocket, CLIENT.surge, CLIENT.clash], {
    requiredFields: ["cipher", "password", "protocol", "obfs"],
  }),
  protocol(["snell"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
    requiredFields: ["psk", "version"],
  }),
  protocol(["vmess"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
    requiredFields: ["uuid"],
  }),
  protocol(["vless"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
    requiredFields: ["uuid"],
  }),
  protocol(["trojan"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
    requiredFields: ["password"],
    tls: true,
  }),
  protocol(["anytls"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
    requiredFields: ["password"],
    tls: true,
  }),
  protocol(["hysteria2", "hy2"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy], {
    requiredFields: ["password"],
    tls: true,
  }),
  protocol(["tuic"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.clash], {
    requiredFields: ["uuid", "password"],
    tls: true,
  }),
  protocol(["socks5"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.anywhere, CLIENT.surge, CLIENT.singbox, CLIENT.happ, CLIENT.v2box, CLIENT.clash, CLIENT.incy]),
  protocol(["http"], [CLIENT.shadowrocket, CLIENT.egern, CLIENT.surge, CLIENT.singbox, CLIENT.v2box, CLIENT.clash, CLIENT.incy]),
  protocol(["ssh"], [CLIENT.egern, CLIENT.singbox, CLIENT.clash], {
    requiredFields: ["username"],
  }),
  protocol(["wireguard"], [CLIENT.egern, CLIENT.singbox, CLIENT.clash], {
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

export function canonicalProtocol(value) {
  const definition = protocolDefinition(value);
  return definition?.names[0] ?? null;
}

export function protocolSupportsClient(value, client) {
  const protocol = normalizeProtocol(value);
  const definition = protocolDefinition(protocol);
  return definition?.clients.includes(client) === true
    && (definition.clientNames[client] ?? definition.names).includes(protocol);
}

export function diagnosticProtocol(value) {
  const normalized = normalizeProtocol(value);
  return registry.has(normalized) ? normalized : "unknown";
}

export function protocolDisplayLabel(value) {
  const normalized = normalizeProtocol(value);
  return DISPLAY_PROTOCOL_NAMES[normalized] ?? (normalized || "unknown");
}

export function displayProtocol(value) {
  return protocolDisplayLabel(value);
}
