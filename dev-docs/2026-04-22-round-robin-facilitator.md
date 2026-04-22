# Round-Robin Facilitator Settlement (2026-04-22)

## Why this change was made

The previous multi-facilitator behavior relied on `@x402/core` default precedence selection, which effectively routed `verify` and `settle` to the first matching facilitator for a kind (`x402Version + network + scheme`). This provided fallback, but did not distribute settlement load across facilitators.

The goal of this change was to:

- keep existing verify compatibility and fallback behavior
- distribute settlement requests across configured facilitators
- retain resiliency by failing over if the selected facilitator cannot settle

## What was changed

### 1) New wrapper client for round-robin settlement

Added:

- `src/lib/x402/round-robin-facilitator-client.js`

This wrapper implements the same surface used by `x402ResourceServer`:

- `getSupported()`
- `verify(paymentPayload, paymentRequirements)`
- `settle(paymentPayload, paymentRequirements)`

Behavior:

- `verify()` preserves ordered precedence with fallback on errors.
- `settle()` performs round-robin rotation per `(x402Version, network, scheme)`.
- `settle()` fails over to remaining facilitators in circular order if the selected one fails.
- `getSupported()` merges/deduplicates `kinds`, `extensions`, and `signers` across facilitators.

### 2) New facilitator factory

Added:

- `src/lib/x402/facilitator-client-factory.js`

Factory behavior:

- If only one facilitator is active, returns a single `HTTPFacilitatorClient` with strategy `single`.
- If multiple facilitators are active, returns `RoundRobinFacilitatorClient` with strategy `round-robin-failover`.
- Preserves per-facilitator auth configuration (CDP JWT headers still apply only to facilitators that require auth).

### 3) Server wiring update

Updated:

- `bin/server.js`

Changes:

- Replaced direct `HTTPFacilitatorClient[]` creation/injection with factory-based client creation.
- `x402ResourceServer` now receives the factory-produced client (single or wrapper).
- Startup logs now include settle strategy marker:
  - `settle strategy: single`
  - `settle strategy: round-robin-failover`

### 4) Documentation update

Updated:

- `README.md`

Added/updated docs for:

- `ACTIVE_FACILITATORS` behavior under the new strategy
- verify vs settle behavior differences
- round-robin configuration example
- quick runtime checks for confirming the strategy is active

## Tests added

Added:

- `test/unit/lib/x402/round-robin-facilitator-client-unit.js`
- `test/unit/lib/x402/facilitator-client-factory-unit.js`

Coverage intent:

- settle rotates across 3 facilitators
- settle failover works when selected facilitator errors
- aggregate error is returned when all facilitators fail
- verify still follows ordered precedence/fallback semantics
- merged/deduped `getSupported()` data shape is stable
- factory returns correct strategy/client type for single vs multi facilitator setups

## Validation performed

### Targeted unit test run

Command:

- `npm run test -- --grep "round-robin-facilitator-client|facilitator-client-factory"`

Result:

- Passing tests for wrapper + factory (`7 passing` at execution time)

### Local smoke simulation

Executed a local script using the new wrapper with three mocked facilitators to verify settle rotation sequence.

Observed order:

- `cdp-tx`
- `dexter-tx`
- `payai-tx`
- `cdp-tx`
- `dexter-tx`

## Operational notes for developers

- Round-robin cursor state is in-memory and process-local; it resets on restart.
- Rotation is keyed by payment kind (`x402Version + network + scheme`), not by endpoint or payer.
- In multi-facilitator mode, provider default URLs are used per facilitator; `x402_FACILITATOR_URL` remains a single-facilitator override.
- If one facilitator has intermittent settle failures, traffic still advances via failover and cursor updates on successful settlement.

