# Anywhere interoperability baseline

This client adapter targets the public import interfaces of the official
[NodePassProject/Anywhere](https://github.com/NodePassProject/Anywhere) app.
The audited baseline is official `main` commit
`e15518fde1f5d2652dfc1c234c89a68b87cecec0`, supplied in an archive whose
SHA-256 is
`1ad984f39e1191b83975884423bbe5cfcd38e46f6f7e061ee0e0f4e4cc503db7`.

The upstream source is GPL-3.0 and its names and visual assets are subject to
the upstream trademark notice. No upstream Swift/C source, app binary, icon,
logo, or other branding asset is copied into this repository. The adapter is
an original interoperability implementation that emits documented Clash node
subscriptions and `.arrs` routing files. “Anywhere” is used only to identify
the compatible third-party app.

## Audited import boundary

The app may implement more protocols internally than its Clash subscription
parser accepts. This adapter deliberately follows the parser rather than the
broader feature list. Its admitted subscription protocols are VLESS,
Hysteria2, Trojan, AnyTLS, Shadowsocks, SOCKS5, and Sudoku, with stricter
per-protocol checks that prevent unsupported fields from being silently
downgraded.

An Anywhere node subscription is not a remotely managed full Profile. DNS,
the default proxy, per-rule-set proxy/chain assignments, chains, and platform
settings remain local app state. The generated routing files do not require
MITM, HTTPS decryption, a CA certificate, scripts, rewrites, or captures.

The pinned machine-readable facts live in
[`src/upstream-contract.js`](src/upstream-contract.js). Update that contract
only after auditing a newer official commit and rerunning the compatibility,
determinism, privacy, and physical-device canary gates.
