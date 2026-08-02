export const ANYWHERE_SOURCE_BASELINE = Object.freeze({
  repository: "https://github.com/NodePassProject/Anywhere",
  branch: "main",
  commit: "e15518fde1f5d2652dfc1c234c89a68b87cecec0",
  archiveSha256: "1ad984f39e1191b83975884423bbe5cfcd38e46f6f7e061ee0e0f4e4cc503db7",
  archiveDate: "2026-07-30",
});

export const ANYWHERE_SUBSCRIPTION_CONTRACT = Object.freeze({
  protocols: Object.freeze([
    "vless", "hysteria2", "trojan", "anytls", "ss", "socks5", "sudoku",
  ]),
  vlessNetworks: Object.freeze(["tcp", "ws"]),
  trojanNetworks: Object.freeze(["tcp"]),
  shadowsocksMethods: Object.freeze([
    "aes-128-gcm",
    "aes-256-gcm",
    "chacha20-ietf-poly1305",
    "chacha20-poly1305",
    "none",
    "plain",
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
  ]),
  remoteFullProfile: false,
  remoteChains: false,
  mitmRequired: false,
});

export const ANYWHERE_RULE_IMPORT_CONTRACT = Object.freeze({
  extension: ".arrs",
  maxRulesPerSet: 100_000,
  ruleTypes: Object.freeze({
    0: "ipv4-cidr",
    1: "ipv6-cidr",
    2: "domain-suffix",
    3: "domain-keyword",
  }),
  initialRouting: Object.freeze({ 0: "default", 1: "direct", 2: "reject" }),
  refreshPreservesLocalName: true,
  refreshPreservesLocalAssignment: true,
  remoteProxyAssignment: false,
  proxyDeepLink: "anywhere://add-proxy?link=",
  ruleSetDeepLink: "anywhere://add-rule-set",
});
