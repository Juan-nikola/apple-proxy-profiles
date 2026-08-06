# sing-box DNS and client-source boundary fix

## Goal

Make the generated sing-box configurations start on current sing-box clients and make every client render the same compact source-aware node names without exposing a client-specific processed inventory to another generator.

## Observed failures

1. The sing-box error contains `https://https:%2F%2F1.1.1.1%2Fdns-query/dns-query`. The generator puts a complete DoH URL in the structured `type=https` DNS server `server` field, while current sing-box expects a host/address in `server` and a separate `path`.
2. Shadowrocket receives the raw source inventory and normalizes it once, so its node names are correct. Egern, Surge, sing-box, and Anywhere read the same combination after the Shadowrocket node operator has already rewritten names and removed source provenance. Their second normalization classifies the source as `unknown`, retains the first pass's source text, and can duplicate capability suffixes.

## Architecture

`apple-proxy-sources` becomes the canonical raw combination. It contains only the selected Snell and VLESS/Hysteria2 subscriptions and no client operation. A separate `shadowrocket-nodes` combination selects the same two sources and owns the Shadowrocket node operator. Shadowrocket profiles read `shadowrocket-nodes`; Egern, Anywhere, Surge, and sing-box read `apple-proxy-sources` and normalize the raw inventory once.

The two combinations should use one shared Sub-Store source tag where the UI supports tag-based selection, so adding or removing a source does not silently diverge between raw and Shadowrocket outputs. During migration, the existing Shadowrocket subscription remains available until the new processed combination and profiles pass canary checks.

## sing-box contract

The global DNS provider table will describe structured HTTPS servers (`server`, `server_port`, `path`, and TLS identity where needed), not URL strings. The validator will reject a structured HTTPS server whose `server` contains a scheme or path. Tests will exercise every configured provider and the generated rule-set download HTTP client.

## Naming contract

For a raw source node such as `[未标记] [自建] Boil-HKT [UDP]`, one normalization produces `🇭🇰 Boil-HKT｜自建·U`. The contract forbids `未知`, repeated flags, repeated source labels, and repeated capability suffixes in all client outputs. A regression test will run the same inventory through each client boundary and will explicitly prove that a second normalization is not part of the production data flow.

## Migration and safety

1. Create and preview `shadowrocket-nodes` while the existing combination remains untouched.
2. Update the three Shadowrocket Profile tasks to use `name=shadowrocket-nodes`, import the new node subscription under the unchanged display name `Shadowrocket-Nodes`, and verify dynamic groups.
3. Remove the Shadowrocket operator from `apple-proxy-sources` only after the new Shadowrocket path passes.
4. Re-preview the Egern, Anywhere, Surge, and sing-box tasks against the now-raw `apple-proxy-sources` combination.
5. Keep old private URLs and old Profiles until every platform has passed its canary; rollback is selecting the previous Profile or restoring the previous Sub-Store operation.

## Verification

- Current sing-box core checks all five generated platform configurations and downloads at least one remote rule-set.
- Client test suites cover DNS structure, source classification, compact naming, and the raw/processed combination boundary.
- Public rule/action/secret checks and generated artifact determinism pass before publishing.
- The `edge` Pages scripts are used for canary validation before changing the Sub-Store tasks back to `current`.
