# Task 5 Report: INCY Sub-Store Full-Config Operator

## Outcome

Implemented the INCY Sub-Store config entry so it now:

- reads strict options from `context.arguments`;
- renders the full normalized collection without client-side capability filtering;
- loads the shared policy artifact with `CLIENT.incy`;
- validates the generated array before returning `$content`;
- sets the public response headers for JSON, download filename, and autorouting;
- logs only redacted counts and schema information;
- fails the whole task when any selected node cannot be rendered.

I also added the optional `crypt1` helper as a pure obfuscation round-trip and documented that it is not encryption.

## Files Changed

- `clients/incy/src/substore-config-entry.js`
- `clients/incy/src/link-encoder.js`
- `clients/incy/scripts/build.mjs`
- `clients/incy/README.md`
- `clients/incy/dist/incy-config-generator.js`
- `clients/incy/dist/substore-config-generator.js`
- `clients/incy/test/substore-entry.test.js`
- `clients/incy/test/link-encoder.test.js`

## Verification

Focused INCY tests:

- `node --test clients/incy/test/substore-entry.test.js`
- `node --test clients/incy/test/link-encoder.test.js`

Package verification:

- `npm --workspace @apple-proxy-profiles/incy test`
- `npm --workspace @apple-proxy-profiles/incy run build`

Shared policy/security checks:

- `node --test test/unified-policy.test.js test/private-policy.test.js test/security.test.js`

## Concerns

No open functional concerns at the moment. The generated INCY bundles were refreshed from the updated build script so the published wrapper now carries `requestOptions` through to the operator.
