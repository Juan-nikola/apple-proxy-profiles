# v2rayN Xray import and routing repair

Goal: import nodes and native routing independently; FOLLOW resolves to v2rayN's selected `proxy`, fixed businesses resolve by unique imported node remark.

Confirmed from official tag 7.24.9, `V2rayRoutingService.GenRoutingUserRuleOutbound`, `CoreConfigContextBuilder`, `RoutingRuleSettingViewModel`:
- Native rule import accepts a JSON array with camel-case RulesItem fields.
- proxy/direct/block are reserved outputs; other strings resolve by exact node remark.
- Missing fixed remarks fall back to proxy with an upstream warning. Generation must reject missing/ambiguous policy matches; import instructions must retain the required node subscription and refresh routing after renames. Do not claim runtime fail-closed protection from the native importer.
- Full custom JSON has no linkage to the selected UI node. Keep it explicitly standalone.
- Xray supports routing balancers. A balancer selector matches outbound tag prefixes, not nested balancers.

Tasks:
- [ ] Add native routing compiler with ordered 32-source catalog, separate domain/IP predicates, proxy-only QUIC guards and fixed/follow/direct policy resolution.
- [ ] Add Sub-Store routing generator using the existing private policy and node pipeline.
- [ ] Build a private self-contained import pack from the user's fetched policy/nodes and verified GeoData. Include node links, native rules, audit, instructions and refresh CLI.
- [ ] Repair standalone renderer's invalid rules/QUIC/inbound defaults, describe its static default honestly.
- [ ] Test missing/ambiguous/protocol-qualified policies, fixed/FOLLOW behavior and actual Xray forwarding before and after default changes.
- [ ] Rebuild affected bundles, run workspace/regression checks; keep private credentials outside git. Deliver files without claiming an unperformed deployment or GUI import.
