# REST2NOSTR Proxy API Implementation Plan

## Overview

Build a REST API server in `/app` that proxies Nostr WebSocket protocol to REST endpoints, enabling JavaScript developers to interact with Nostr relays via familiar REST APIs instead of WebSockets.

## Architecture

Follow Clean Architecture pattern with these layers:

- **Entities** (`src/entities/`): Domain models (Event, Subscription, etc.)
- **Use Cases** (`src/use-cases/`): Business logic (PublishEvent, QueryEvents, ManageSubscription)
- **Adapters** (`src/adapters/`): External interfaces (NostrRelay WebSocket client, logger)
- **Controllers** (`src/controllers/rest-api/`): Express.js route handlers

## Directory Structure

```
/app
├── src/
│   ├── entities/
│   │   └── event.js
│   ├── use-cases/
│   │   ├── index.js
│   │   ├── publish-event.js
│   │   ├── query-events.js
│   │   └── manage-subscription.js
│   ├── adapters/
│   │   ├── index.js
│   │   ├── nostr-relay.js
│   │   └── wlogger.js
│   ├── controllers/
│   │   ├── index.js
│   │   └── rest-api/
│   │       ├── index.js
│   │       ├── event/
│   │       │   ├── controller.js
│   │       │   └── index.js
│   │       └── req/
│   │           ├── controller.js
│   │           └── index.js
│   └── config/
│       ├── index.js
│       └── env/
│           ├── common.js
│           ├── development.js
│           └── production.js
├── examples/
│   └── [refactored sandbox examples]
├── bin/
│   └── server.js
├── .env.example
├── .env
├── index.js
├── package.json
└── apidoc.json
```

## Core Endpoints

### POST /event

- Maps to: `["EVENT", <event>]`
- Publish a signed Nostr event to relay
- Body: JSON event object
- Response: `{"accepted": true/false, "message": ""}` (maps to `["OK", ...]`)

### GET /req/:subId

- Maps to: `["REQ", <sub_id>, <filters>]`
- Stateless query - returns events immediately
- Query params: filters (JSON encoded or separate params)
- Response: Array of events

### POST /req/:subId

- Maps to: `["REQ", <sub_id>, <filters>]`
- Establish subscription for Server-Sent Events (SSE)
- Body: filters object
- Response: SSE stream of events

### DELETE /req/:subId

- Maps to: `["CLOSE", <sub_id>]`
- Close an existing subscription
- Response: Confirmation

## Implementation Details

### 1. Package Dependencies

- `express`: REST API framework
- `dotenv`: Environment variable management
- `apidoc`: API documentation generation
- `ws` or `nostr-tools`: WebSocket client for Nostr relays
- `winston`: Logging (following example pattern)

### 2. Adapter Layer (`src/adapters/`)

- **nostr-relay.js**: WebSocket client wrapper
  - Connect to configured relay(s)
  - Send `EVENT`, `REQ`, `CLOSE` messages
  - Handle relay responses (`EVENT`, `OK`, `EOSE`, `CLOSED`, `NOTICE`)
  - Manage connection pooling for multiple relays
- **wlogger.js**: Winston-based logger

### 3. Use Cases (`src/use-cases/`)

- **publish-event.js**: Validate event, send to relay, return OK response
- **query-events.js**: Stateless query - send REQ, collect events until EOSE, return results
- **manage-subscription.js**: Create/close subscriptions, handle SSE streaming

### 4. Controllers (`src/controllers/rest-api/`)

- **event/controller.js**: Handle POST /event
- **req/controller.js**: Handle GET/POST/DELETE /req/:subId
- Express middleware for validation, error handling
- SSE support for subscription endpoint

### 5. Configuration (`src/config/`)

- Environment-based config (development, production, test)
- Default relay URL(s) from environment variables
- Port, logging level, etc.

### 6. Subscription Management

- Store active subscriptions in memory (Map with subId as key)
- Map subscription IDs to WebSocket connections
- Handle cleanup on DELETE /req/:subId
- Support SSE streaming for POST /req/:subId

### 7. Examples (`examples/`)

Refactor sandbox examples to use REST API:

- `01-create-account/` - Use REST API to publish kind 0 event
- `02-read-posts/` - Use GET /req/:subId for stateless query
- `03-write-post/` - Use POST /event
- `04-read-alice-posts/` - Use GET /req/:subId with author filter
- `14-get-follow-list/` - Use GET /req/:subId with kind 3 filter
- Additional examples as needed

### 8. API Documentation

- Use api-doc annotations in controller files
- Generate docs with `npm run docs`
- Follow pattern from clean-architecture example

## Environment Variables

- `NOSTR_RELAY_URL`: Default relay WebSocket URL (e.g., `wss://nostr-relay.psfoundation.info`)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development, production, test)
- `LOG_LEVEL`: Logging level (info, debug, error)

## Key Implementation Notes

- WebSocket connections: Maintain persistent connections to relay(s) in adapter
- Error handling: Map Nostr relay errors to appropriate HTTP status codes
- Validation: Validate Nostr events before forwarding (event structure, signature)
- SSE: Use Express response.write() for Server-Sent Events in subscription endpoint
- Stateless queries: For GET /req/:subId, collect events until EOSE, then close subscription automatically