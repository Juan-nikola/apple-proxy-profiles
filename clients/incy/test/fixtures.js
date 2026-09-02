const FIXTURE_POLICY = Object.freeze({
  schemaVersion: 2,
  targets: Object.freeze({
    ai: "NODE~Fixed AI",
    github: "NODE:Fixed GitHub",
    youtube: "FOLLOW",
    overseasMedia: "NODE~Fixed Media",
    globalSocial: "FOLLOW",
    apple: "DIRECT",
    microsoft: "DIRECT",
    domesticPlatform: "DIRECT",
    overseasGame: "FOLLOW",
    game: "DIRECT",
    download: "DIRECT",
    dnsAndRules: "FOLLOW",
    final: "FOLLOW",
  }),
});

export function fixtureNodes() {
  return Object.freeze([
    Object.freeze({
      name: "Follow Node",
      type: "vless",
      server: "198.51.100.10",
      port: 443,
      uuid: "TEST_ONLY_INCY_FOLLOW_UUID",
      tls: true,
      sni: "follow.example.invalid",
      _profile: Object.freeze({ id: "follow-node" }),
    }),
    Object.freeze({
      name: "Fixed AI",
      type: "trojan",
      server: "203.0.113.10",
      port: 443,
      password: "TEST_ONLY_INCY_AI_PASSWORD",
      tls: true,
      sni: "ai.example.invalid",
      _profile: Object.freeze({ id: "fixed-ai" }),
    }),
    Object.freeze({
      name: "Fixed GitHub",
      type: "vless",
      server: "192.0.2.10",
      port: 443,
      uuid: "TEST_ONLY_INCY_GITHUB_UUID",
      tls: true,
      sni: "github.example.invalid",
      _profile: Object.freeze({ id: "fixed-github" }),
    }),
    Object.freeze({
      name: "Fixed Media",
      type: "hy2",
      server: "198.51.100.20",
      port: 443,
      password: "TEST_ONLY_INCY_MEDIA_PASSWORD",
      tls: true,
      sni: "media.example.invalid",
      _profile: Object.freeze({ id: "fixed-media" }),
    }),
  ]);
}

export function fixturePolicy() {
  return FIXTURE_POLICY;
}

