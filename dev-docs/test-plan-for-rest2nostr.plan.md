# Test Plan for REST2NOSTR Application

## Overview

Create unit and integration tests for the REST2NOSTR Express.js application following patterns from `tests/testing-example-code/`. Tests will use mocha, chai, and sinon, and cover all code paths exercised by the examples in `/app/examples/`.

## Test Structure

Create test directory structure:

- `app/test/unit/` - Unit tests with mocked dependencies
- `app/test/integration/` - Integration tests with real dependencies
- `app/test/unit/mocks/` - Mock data for unit tests

## Unit Tests

### 1. Entity Tests (`test/unit/entities/`)

- **event-unit.js**: Test Event entity validation and serialization
- Test `isValid()` with valid events
- Test `isValid()` with invalid events (missing fields, wrong types, wrong lengths)
- Test `toJSON()` serialization
- Use mock event data from `mocks/event-mocks.js`

### 2. Use Case Tests (`test/unit/use-cases/`)

- **publish-event-unit.js**: Test PublishEventUseCase
- Mock NostrRelayAdapter.sendEvent()
- Test successful event publishing
- Test invalid event rejection
- Test adapter error handling
- Use mocks from `mocks/nostr-relay-mocks.js`

- **query-events-unit.js**: Test QueryEventsUseCase
- Mock NostrRelayAdapter.sendReq() and sendClose()
- Test successful query with events returned
- Test query timeout handling
- Test CLOSED message handling
- Test EOSE handling

- **manage-subscription-unit.js**: Test ManageSubscriptionUseCase
- Mock NostrRelayAdapter.sendReq() and sendClose()
- Test subscription creation
- Test subscription closure
- Test duplicate subscription prevention
- Test handler callbacks (onEvent, onEose, onClosed)

### 3. Controller Tests (`test/unit/controllers/`)

- **event-controller-unit.js**: Test EventRESTControllerLib
- Mock UseCases.publishEvent.execute()
- Test POST /event with valid event data
- Test POST /event with missing event data
- Test error handling
- Use Express request/response mocks

- **req-controller-unit.js**: Test ReqRESTControllerLib
- Mock UseCases.queryEvents.execute() and manageSubscription methods
- Test GET /req/:subId with filters (JSON string and parsed)
- Test GET /req/:subId with individual query params
- Test POST /req/:subId for SSE subscription
- Test DELETE /req/:subId for closing subscription
- Test error handling for invalid filters
- Test missing subscription ID validation

### 4. Adapter Tests (`test/unit/adapters/`)

- **nostr-relay-unit.js**: Test NostrRelayAdapter
- Mock WebSocket connections
- Test connection establishment
- Test sendEvent() and OK response handling
- Test sendReq() and EVENT/EOSE/CLOSED message handling
- Test sendClose()
- Test message queuing when disconnected
- Test reconnection logic
- Test error handling

### 5. Server Tests (`test/unit/bin/`)

- **server-unit.js**: Test Server class
- Mock Express app, Controllers, and adapters
- Test server initialization
- Test middleware attachment
- Test route attachment
- Test error handling
- Test health check endpoint

## Integration Tests

### 1. API Endpoint Tests (`test/integration/api/`)

- **event-integration.js**: Test POST /event endpoint
- Create a test server instance
- Test publishing kind 0 event (profile metadata) - covers example 01
- Test publishing kind 1 event (text post) - covers example 03
- Test publishing kind 3 event (follow list) - covers example 06
- Test publishing kind 7 event (reaction/like) - covers example 07
- Test invalid event rejection
- Use real Nostr relay connection (may need test relay or mock relay)

- **req-integration.js**: Test GET /req/:subId endpoint
- Create a test server instance
- Test querying kind 1 events (posts) - covers examples 02, 04
- Test querying kind 3 events (follow list) - covers example 05
- Test with various filter combinations
- Test with filters as JSON string query param
- Test with individual query params
- Test error handling

- **subscription-integration.js**: Test POST /req/:subId SSE subscription
- Create a test server instance
- Test SSE subscription creation
- Test event streaming
- Test EOSE handling
- Test subscription closure
- Test DELETE /req/:subId endpoint

### 2. Use Case Integration Tests (`test/integration/use-cases/`)

- **publish-event-integration.js**: Test PublishEventUseCase with real adapter
- **query-events-integration.js**: Test QueryEventsUseCase with real adapter
- **manage-subscription-integration.js**: Test ManageSubscriptionUseCase with real adapter

## Mock Data Files

Create mock data files in `test/unit/mocks/`:

- **event-mocks.js**: Mock event data for various event kinds (0, 1, 3, 7)
- **nostr-relay-mocks.js**: Mock responses from Nostr relay (OK, EVENT, EOSE, CLOSED)
- **controller-mocks.js**: Mock Express request/response objects

## Key Considerations

1. **ES Modules**: The app uses ES modules (import/export) while the example uses CommonJS. Tests should use ES modules with `.js` extension and proper import syntax.

2. **Test Environment**: Integration tests will need a running Nostr relay. Consider:

- Using a test relay URL from config
- Or creating a mock WebSocket server for integration tests
- Or documenting that tests require a relay URL in environment

3. **Test Coverage**: Ensure tests cover:

- All endpoints used by examples (POST /event, GET /req/:subId)
- All event kinds (0, 1, 3, 7)
- Error paths and edge cases
- Validation logic

4. **Test Data**: Use the same test keys and data patterns from examples where applicable (e.g., Alice's private key, Bob's public key)

5. **Async Handling**: Properly handle async/await in tests, especially for WebSocket operations and SSE streams

6. **Cleanup**: Ensure proper cleanup of WebSocket connections and subscriptions in tests

## Test Execution

Tests will run using existing npm scripts:

- `npm test` - Runs unit tests with linting and coverage
- `npm run test:integration` - Runs integration tests with extended timeout
- `npm run coverage` - Generates coverage report