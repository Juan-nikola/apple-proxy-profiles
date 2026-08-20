# HAPP Latest-Only User Contract

## Goal

Make HAPP expose one user-facing, always-latest published entry while leaving the repository's internal candidate and rollback machinery available to maintainers and other clients.

## Official Contract

HAPP's official routing documentation defines JSON subscriptions as Restricted Mode: a JSON subscription may have zero or one provider-supplied routing profile; the profile cannot be manually copied or edited; the profile supplies GeoData and Tunnel DNS while the JSON remains the routing control plane. Provider updates are delivered through `routing: happ://routing/onadd/<base64>` in the HTTP response header or subscription body, and take effect after reconnect.

## Design

- HAPP task URLs use the stable `/current/happ/` publication path, which is the repository's latest validated public snapshot.
- HAPP task fragments do not expose `channel`; the HAPP renderer rejects an explicit `channel` option instead of silently accepting `edge` or `previous`.
- The generated provider Profile always points to `/current/happ/geoip.dat` and `/current/happ/geosite.dat`.
- HAPP audit output records the fixed internal snapshot as `current` for diagnostics, but users do not select it.
- Other clients and the internal `edge`/`previous` publication workflow are unchanged.
- Documentation instructs users to delete the old JSON subscription and bound Profile, import the latest private File URL, wait for both GeoData files, and reconnect.

## Non-Goals

- Do not make HAPP's locked JSON routing UI editable.
- Do not replace complete Xray JSON with a standard URI-only subscription.
- Do not remove internal publication channels used by other clients or release verification.
