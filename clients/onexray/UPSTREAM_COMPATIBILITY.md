# OneXray structured Profile compatibility audit

## Pinned baseline

- Upstream: [`OneXray/OneXray`](https://github.com/OneXray/OneXray)
- Commit: [`a7415277f3c9fb6a6af3ef29101517fac731d029`](https://github.com/OneXray/OneXray/commit/a7415277f3c9fb6a6af3ef29101517fac731d029)
- Verified release baseline: OneXray 26.8.3
- Audit scope: official OneXray applications only. This adapter emits native
  structured Xray Profile objects; it does not treat Raw JSON as an escape
  hatch for unsupported node fields.

## Audited upstream sources

The following files at the pinned commit establish the adapter contract:

- `lib/core/model/xray_json.dart` — structured `XrayOutbound`, protocol
  settings, stream/TLS/REALITY/transports, DNS, routing, and Profile models.
- `lib/service/xray/outbound/state_normalizer.dart` and
  `lib/service/xray/outbound/state_validator.dart` — imported outbound
  normalization and validation boundary.
- `lib/service/xray/profile/outbounds_state.dart`,
  `lib/pages/core/xray/profile/outbounds/final_outbound_section.dart` — custom
  Profile outbounds and Final Outbound UI/state.
- `lib/service/xray/profile/state_writer.dart`, `state_reader.dart`, and
  `state_validator.dart` — Profile persistence and validation.
- `lib/service/xray/runtime_inbounds.dart` and `lib/service/xray/tun_route.dart`
  — runtime-owned TUN, Ping, and desktop route behavior.
- `lib/service/xray/json_importer.dart`, `json_writer.dart`, and
  `lib/core/db/dao/subscription.dart` — JSON/subscription import boundary.
- `lib/pages/core/log/config_file_viewer/*` and
  `lib/pages/core/log/log_file_viewer/*` — local configuration/log visibility.

## Supported structured node boundary

Only these models are emitted: VLESS, VMess, Shadowsocks, Trojan, SOCKS5,
HTTP, and Hysteria2. The pinned model has structured settings for VLESS
`{ address, port, id, flow, encryption, reverse }`, VMess
`{ address, port, id, security }`, Shadowsocks
`{ address, port, method, password }`, Trojan `{ address, port, password }`,
SOCKS `{ address, port, user, pass }`, HTTP
`{ address, port, user, pass, headers }`, and Hysteria
`{ version, address, port }`.

The audited stream model supports TLS/REALITY, raw, WebSocket, gRPC,
HTTPUpgrade, XHTTP, KCP, and Hysteria settings. The capability filter admits
only the normalized field shapes the later renderer can write to those typed
objects. In particular, unsupported protocol aliases, plugin forms, chained
nodes, ambiguous aliases, malformed credentials, bypass flags, mux/socket
options, and unknown supplied fields are rejected rather than silently
dropped.

## Runtime-owned behavior and reserved tags

OneXray composes the selected Home node into runtime `proxy` in Rule mode.
The adapter reserves `proxy`, `chainProxy`, `direct`, `fragment`, `block`,
`dnsOut`, `tunIn`, and `pingIn`; generated custom outbound tags must never
collide with them. `FOLLOW` therefore targets runtime `proxy`, while fixed
business targets use only generated custom outbound tags.

OneXray owns TUN and `pingIn` inbounds, random ports, GeoData paths, mobile
TUN descriptors, and Windows/Linux route/interface fields. It also rewrites
global and DNS-server `queryStrategy` to match the device TUN IPv6 setting.
Profile rendering must not attempt to preserve or override those runtime
values.

The Profile Final Outbound is the only audited mechanism for the optional
single global entry-to-landing chain. It is not a balancer, health check, or
fallback facility. Runtime node failures remain failures: no automatic
fallback, notification, or emergency Profile is introduced.

## Import and operational caveats

A normal HTTPS subscription imports outbound nodes only. It does not create
or replace a Profile, its DNS/routing/GeoData, or a full runtime config. Use
the private Profile deep link for the structured Profile, and use HTTPS only
for homepage-selectable nodes.

The Profile deep link is `onexray://onexray.com/config/add?type=profile&data=`.
Importing the same Profile name inserts another Profile rather than overwriting
the old one. Keep only the newest verified Profile and one verified previous
Profile manually; Profile names include a content hash for that reason.

Node/GeoData refreshes can be automatic, but a running VPN keeps its
start-time Final Config until it is restarted. On macOS System Extension
builds, Xray access/error file logs can be unavailable; diagnose through
OneXray status, Ping, client-visible errors, and any logs the client exposes.

## Mandatory re-audit checklist

Before changing the pin, protocol boundary, renderer, or publication claim:

1. Pin the new upstream commit and released OneXray version here.
2. Re-read every audited source above, including generated JSON annotations
   where model field names changed.
3. Re-verify all seven outbound shapes and every admitted TLS/REALITY/raw/WS/
   gRPC/HTTPUpgrade/XHTTP/KCP/Hysteria fixture on the official client.
4. Re-check runtime-owned TUN, IPv6/DNS, GeoData, Final Outbound, tag, and
   same-name import behavior on all six supported platforms.
5. Reconfirm HTTPS subscription scope and the no-fallback/no-notification
   contract.
6. Run the capability, outbound, Profile, secret-scan, deterministic build,
   and platform-canary checks before advancing any channel.
