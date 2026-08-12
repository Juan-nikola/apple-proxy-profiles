# Task 11 implementation report

## Result

Built deterministic browser/IIFE bundles for the private OneXray node and
Profile Sub-Store tasks. Each client-prefixed bundle and its compatibility alias
is written from the same esbuild result and remains byte-identical. Added
sanitized contract-only JSON examples for nodes, Profile, and routing audit;
these examples intentionally contain no importable node, credential, private
source, target name, Profile deep link, or subscription URL.

The generated Sub-Store wrapper snapshots own enumerable data arguments before
awaiting `produceArtifact`, so a producer cannot mutate the task configuration
while the private artifact is being rendered. Invalid argument descriptors are
mapped to stable OneXray errors. Bundle tests execute the IIFE in a mocked
Sub-Store VM, compare output to the pure processors, cover stable failures,
assert the Node/browser surface boundary, and prove deterministic rebuilds.

## Commits

- `f9da299 build: add OneXray generator bundles`
- `cde3308 fix: snapshot OneXray bundle arguments`
- `e6a575e chore: pin OneXray bundle tooling`

## Verification

- Initial RED: focused bundle/example tests failed because all build outputs and
  contract fixtures were absent.
- `npm --workspace @apple-proxy-profiles/onexray run build` — passed.
- `npm --workspace @apple-proxy-profiles/onexray run fixtures` — passed.
- `node --test clients/onexray/test/bundles.test.js clients/onexray/test/examples.test.js` — 9/9 passed.
- `npm --workspace @apple-proxy-profiles/onexray test` — 79/79 passed.
- `npm install --package-lock-only --ignore-scripts --offline` — passed.
- `git diff --check` — clean.

The bundle uses the host's `structuredClone` through the shared normalization
module; absence of that modern runtime API is treated as a stable inventory
failure and is not a Task 11 browser-surface finding.

