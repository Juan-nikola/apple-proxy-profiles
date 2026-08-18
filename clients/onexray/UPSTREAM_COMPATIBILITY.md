# OneXray upstream compatibility

The renderer follows the official OneXray URL scheme and structured Xray
settings model audited on 2026-08-18. The public upstream repository is
`OneXray/OneXray`; the compatibility surface used here is deliberately limited
to VLESS, VMess, Shadowsocks, Trojan, SOCKS5, HTTP, and Xray Hysteria v2.

The profile relies on OneXray's runtime `proxy` outbound injection. It emits
`direct`, `block`, DNS, TUN, and ordered routing rules, while the private node
subscription contains only homepage-selectable outbounds. Any upstream change
to reserved tags, profile insertion, GeoData names, or `proxy` injection must
be re-audited before promotion.
