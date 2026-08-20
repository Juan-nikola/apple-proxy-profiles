# HAPP JSON Runtime Reliability Design

## Goal

Make the private HAPP subscription usable on macOS, iPhone, iPad, Android,
Windows, and Linux while preserving per-business `DIRECT`, `FOLLOW`, and
`NODE:<exact node name>` routing.

## Root Causes

The current implementation has two concrete contract breaks:

1. Generated Xray JSON references `geoip:PRIVATE`, while the HAPP routing
   profile enables chunked GeoData but does not list `geoip:PRIVATE` in any IP
   rule array. HAPP can therefore trim the label out before launching Xray.
2. The Sub-Store response attaches the provider-owned routing profile only for
   iPhone and iPad. The other four platforms receive JSON without the same
   GeoData contract.

The previous tests validated the generated `.dat` files and routing profile
independently. They did not validate the closure between every label referenced
by JSON, every label retained by HAPP's chunk profile, and every label contained
in the published GeoData.

## Architecture

### JSON Is The Routing Control Plane

Each HAPP JSON configuration remains a complete Xray configuration. It owns
DNS, routing rules, fixed-node outbounds, direct/block outbounds, balancers,
and the `FOLLOW` outbound. HAPP's routing UI is not used to change these rules.

The HAPP provider profile has a narrower job:

- bind the correct channel's `geoip.dat` and `geosite.dat` to the JSON
  subscription;
- retain every GeoData label referenced by the Xray JSON when HAPP chunking is
  enabled;
- configure tunnel DNS required by the operating system.

### One Contract For Six Platforms

All six platform outputs attach the same provider profile through the actual
Sub-Store File response. Platform differences are limited to the generated
Xray inbound/tunnel fields. The GeoData URLs, label set, routing semantics, and
policy resolution are identical.

### Derived GeoData Closure

The profile's Direct/Proxy/Block lists must be derived from the same exported
contract used by DNS and routing renderers. A closure validator collects every
`geosite:` and `geoip:` reference from generated configs and verifies that:

1. the label appears in a profile rule list and will survive HAPP chunking;
2. the corresponding label exists in the decoded published `.dat` file;
3. no obsolete `HAPP-*` label remains.

The build fails if any part of this closure is incomplete. `geoip:PRIVATE` and
`geoip:CN` are both mandatory profile IP labels.

### Runtime Validation

Generated Xray configurations are checked with the official Xray core matching
the current HAPP compatibility baseline. Validation runs with the generated
`geoip.dat` and `geosite.dat` available beside the config. Unknown fields,
invalid routing references, unsupported outbound structures, or missing
GeoData labels fail the release candidate.

Automated validation proves that the configuration parses and the core can
initialize. It does not replace device canaries. iOS and macOS must be tested
with a deleted-and-reimported `edge` subscription before promotion to
`current`; Android, Windows, Linux, and iPad remain unverified until their
device canaries pass.

## Publication

The user-facing channel remains `current`. `edge` is an internal candidate
channel only, and `previous` remains rollback-only. A candidate is not promoted
until:

- HAPP tests, root tests, build, fixtures, rule checks, secret checks, and
  action checks pass;
- official Xray runtime validation passes for every generated platform fixture;
- fresh iOS and macOS imports start and route traffic without GeoData errors.

## Non-Goals

- Replacing fixed-node JSON routing with a standard URI subscription.
- Making HAPP's locked JSON routing UI editable.
- Claiming untested platforms work based only on unit tests.
- Publishing private node names, subscription URLs, credentials, or policy
  overrides.
