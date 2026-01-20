# REST2NOSTR Examples

This directory contains examples refactored from the `nostr-sandbox/` directory to use the REST API instead of WebSocket connections.

## Prerequisites

1. Install dependencies:
```bash
npm install nostr-tools @noble/hashes
```

2. Start the REST2NOSTR proxy server:
```bash
npm start
```

3. Set the API_URL environment variable if the server is not running on localhost:3000:
```bash
export API_URL=http://localhost:3000
```

## Examples

### 01-create-account.js
Creates a new Nostr account keypair and publishes profile metadata (kind 0 event).

```bash
node examples/01-create-account.js
```

### 02-read-posts.js
Reads posts (kind 1 events) from a specific author using GET /req/:subId.

```bash
node examples/02-read-posts.js
```

### 03-write-post.js
Publishes a text post (kind 1 event) using POST /event.

```bash
node examples/03-write-post.js
```

### 04-read-alice-posts.js
Reads posts from Alice's account using GET /req/:subId with author filter.

```bash
node examples/04-read-alice-posts.js
```

### 14-get-follow-list.js
Retrieves a user's follow list (kind 3 event) using GET /req/:subId.

```bash
node examples/05-get-follow-list.js
```

### 15-update-follow-list.js
Updates a user's follow list (kind 3 event) using POST /event.

```bash
node examples/06-update-follow-list.js
```

### 17-liking-event.js
Adds a reaction/like to an event (kind 7 event) using POST /event.

```bash
node examples/07-liking-event.js
```

## API Endpoints Used

- **POST /event**: Publish events to the relay
- **GET /req/:subId**: Stateless query for events (returns immediately)

## Differences from WebSocket Examples

1. **No WebSocket connections**: All communication is via HTTP REST API
2. **Stateless queries**: GET /req/:subId returns events immediately rather than streaming
3. **Event publishing**: POST /event returns immediately with acceptance status
4. **No subscription management**: For stateless queries, subscriptions are automatically closed after EOSE

## Notes

- These examples use the same private keys as the original sandbox examples for consistency
- The REST API handles WebSocket connections to relays internally
- For real-time streaming, use POST /req/:subId which supports Server-Sent Events (SSE)

