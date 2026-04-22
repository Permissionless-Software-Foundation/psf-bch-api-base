# psf-bch-api-base

[![License](https://img.shields.io/npm/l/@psf/bch-js)](https://github.com/Permissionless-Software-Foundation/psf-bch-api/blob/master/LICENSE.md)
[![js-standard-style](https://img.shields.io/badge/javascript-standard%20code%20style-green.svg?style=flat-square)](https://github.com/feross/standard)

This project is a fork of `psf-bch-api` with one major change: paid access now uses the `x402` protocol on the Base ecosystem, with pricing in USDC, instead of `x402-bch` on BCH.

The API surface remains focused on BCH infrastructure (BCH full node, Fulcrum, and SLP indexer), but monetization and payment verification are handled through x402-compatible middleware and facilitator endpoints.

## What Changed In This Fork

- Switched from `x402-bch` middleware to `x402-express`.
- Added Base/EVM payment support (`@x402/evm`) and `x402-axios` client example.
- Pricing is configured in `X402_PRICE_USDC` (USDC amount), not BCH satoshis.
- x402 network is configured using CAIP-2 format (for example `eip155:8453` for Base mainnet and `eip155:84532` for Base Sepolia).
- Facilitator auth headers are generated using Coinbase CDP JWT auth (`FACILITATOR_KEY_ID` and `FACILITATOR_SECRET_KEY`) when using CDP endpoints.
- Optional facilitators: **Dexter** (`PRIMARY_FACILITATOR=dexter`) and **PayAI** (`PRIMARY_FACILITATOR=payai`, default URL `https://facilitator.payai.network`, no API keys).
- **Bazaar** discovery metadata on payment requirements via `@x402/extensions/bazaar`, and optional **multi-facilitator** mode (`ACTIVE_FACILITATORS=cdp,dexter,payai`) with round-robin settle + failover across CDP, Dexter, and PayAI.

## Architecture

The server is a Node.js + Express REST API following a Clean Architecture style, and it still depends on:

- BCH full node JSON-RPC
- Fulcrum API
- SLP indexer API

The access-control layer now supports:

- open access (no auth, no payment)
- bearer-token auth
- x402 paid access on Base + USDC
- optional bearer bypass for trusted clients when x402 is enabled

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env-example .env
```

3. Edit `.env` for your infrastructure and access-control mode.

4. Start the server:

```bash
npm start
```

By default, the API runs on `http://localhost:5942` and controllers are mounted under `/v6`.

## Environment Variables

All configuration is loaded from environment variables (typically from `.env`).

### Core Server and BCH Infrastructure

- `PORT` (default: `5942`)
- `NODE_ENV` (default: `development`)
- `API_PREFIX` (default: `/v6`)
- `LOG_LEVEL` (default: `info`)
- `RPC_BASEURL` (default: `http://127.0.0.1:8332`)
- `RPC_USERNAME`
- `RPC_PASSWORD`
- `RPC_TIMEOUT_MS` (default: `15000`)
- `RPC_REQUEST_ID_PREFIX` (default: `psf-bch-api`)
- `FULCRUM_API`
- `FULCRUM_TIMEOUT_MS` (default: `15000`)
- `SLP_INDEXER_API`
- `SLP_INDEXER_TIMEOUT_MS` (default: `15000`)
- `REST_URL` or `LOCAL_RESTURL` (default fallback: `http://127.0.0.1:5942/v6/`)
- `IPFS_GATEWAY` (default: `p2wdb-gateway-678.fullstack.cash`)
- `SERVER_KEEPALIVE_TIMEOUT_MS` (default: `3000`)
- `SERVER_HEADERS_TIMEOUT_MS` (default: `65000`)
- `SERVER_REQUEST_TIMEOUT_MS` (default: `120000`)

### x402 + Base + USDC Settings

- `X402_ENABLED` (default: `true`)
- `SERVER_BASE_ADDRESS` (EVM address receiving x402 settlements)
- `X402_PRICE_USDC` (USDC charged per request)
- `x402_NETWORK` (CAIP-2 chain ID; e.g. `eip155:8453` or `eip155:84532`)
- `PRIMARY_FACILITATOR` (default: `cdp`) — one of `cdp`, `dexter`, or `payai`. Used for **single-facilitator** mode when `ACTIVE_FACILITATORS` is unset; selects the default facilitator base URL unless `x402_FACILITATOR_URL` is set.
- `ACTIVE_FACILITATORS` — optional comma-separated list (e.g. `dexter,payai`). When set with multi-facilitator mode, the server registers multiple facilitator backends. `PRIMARY_FACILITATOR` is always first in the active list; remaining names follow in listed order, deduped. Verify uses this order with fallback. Settle uses round-robin per `(x402Version, network, scheme)` with failover to remaining facilitators. Each facilitator uses its default base URL (`x402_FACILITATOR_URL` applies only in **single-facilitator** mode).
- `X402_BAZAAR_ENABLED` (default: `true`) — attach Bazaar **discovery** extension to protected route payment requirements (for facilitator catalogs). Set `false` to disable.
- `x402_FACILITATOR_URL` — optional override for the facilitator HTTP base URL (must expose `/verify`, `/settle`, and `/supported` like the x402 reference facilitator). When unset, the URL is derived from `PRIMARY_FACILITATOR`. **Ignored per-facilitator when `ACTIVE_FACILITATORS` lists more than one entry** (each entry uses its provider URL).
- `PAYAI_FACILITATOR_URL` — optional; when `PRIMARY_FACILITATOR=payai` and `x402_FACILITATOR_URL` is unset, defaults to `https://facilitator.payai.network`.
- `FACILITATOR_KEY_ID` (required for CDP facilitator auth)
- `FACILITATOR_SECRET_KEY` (required for CDP facilitator auth)

### Optional Bearer Auth

- `USE_BASIC_AUTH` (default: `false`)
- `BASIC_AUTH_TOKEN`

## Access Control Modes

Behavior is controlled by `X402_ENABLED` and `USE_BASIC_AUTH`.

### 1) Open Access

```bash
X402_ENABLED=false
USE_BASIC_AUTH=false
```

No payment and no auth checks.

### 2) Bearer Auth Only

```bash
X402_ENABLED=false
USE_BASIC_AUTH=true
BASIC_AUTH_TOKEN=my-secret-token
```

Requests (except `/` and `/health`) must send:

```text
Authorization: Bearer my-secret-token
```

### 3) x402 Payments on Base (USDC)

**Coinbase CDP facilitator**

```bash
X402_ENABLED=true
USE_BASIC_AUTH=false
SERVER_BASE_ADDRESS=0xYourBaseAddress
X402_PRICE_USDC=0.1
x402_NETWORK=eip155:8453
PRIMARY_FACILITATOR=cdp
FACILITATOR_KEY_ID=your_key_id
FACILITATOR_SECRET_KEY=your_secret
```

**PayAI facilitator** (no CDP keys; default URL `https://facilitator.payai.network`)

```bash
X402_ENABLED=true
USE_BASIC_AUTH=false
SERVER_BASE_ADDRESS=0xYourBaseAddress
X402_PRICE_USDC=0.1
x402_NETWORK=eip155:8453
PRIMARY_FACILITATOR=payai
```

Protected endpoints return `402 Payment Required` when no valid payment is attached. x402-capable clients can pay and retry automatically.

### 3b) Round-Robin Facilitator Mode (Settle)

Use this mode when you want settlement load distributed across multiple facilitators while preserving compatibility for verify calls.

```bash
X402_ENABLED=true
USE_BASIC_AUTH=false
SERVER_BASE_ADDRESS=0xYourBaseAddress
X402_PRICE_USDC=0.1
x402_NETWORK=eip155:8453
PRIMARY_FACILITATOR=cdp
ACTIVE_FACILITATORS=cdp,dexter,payai
FACILITATOR_KEY_ID=your_key_id
FACILITATOR_SECRET_KEY=your_secret
```

How it works:

- Verify path: tries facilitators in configured order (`PRIMARY_FACILITATOR` first), falling back on errors.
- Settle path: uses round-robin rotation per payment kind (`x402Version + network + scheme`), starting from the next facilitator each successful settlement.
- Settle failover: if the selected facilitator fails, the server tries the remaining facilitators in circular order for that request.
- URL behavior: with more than one active facilitator, per-provider default URLs are used; `x402_FACILITATOR_URL` is only for single-facilitator mode.

How to confirm it is active:

1. Start the server and check startup logs for `settle strategy: round-robin-failover`.
2. Send multiple paid requests to the same protected endpoint.
3. Confirm settlement calls alternate over `cdp -> dexter -> payai` (with failover if one is unavailable).

### 4) x402 + Bearer Bypass

When `X402_ENABLED=true`, the server also exposes machine-discovery endpoints:

- `/.well-known/x402` - x402-bch v2 payment discovery manifest
- `/openapi.json` - OpenAPI 3 projection generated from apiDoc annotations
- `/swagger.json` - Swagger 2.0 compatibility projection
- `/llms.txt` - LLM-oriented markdown index of service metadata
- `/.well-known/agent.json` - draft agent manifest describing API actions

When `X402_ENABLED=false`, these discovery endpoints return `404`.

#### Combined: x402 + Bearer Token

You can enable both at the same time:

```
X402_ENABLED=true
USE_BASIC_AUTH=true
BASIC_AUTH_TOKEN=my-secret-token
```

Bearer-authenticated requests bypass payment; all others must pay via x402.

## Client Example: Axios + x402

Use `examples/01-x402-axios-client.js` to test the payment flow end-to-end.

What it does:

1. Calls a protected endpoint without payment and expects `402`.
2. Repeats the call using `x402-axios` + an EVM wallet and expects success.

Run it with an EVM private key:

```bash
PRIVATE_KEY=0x... node examples/01-x402-axios-client.js
```

The script is configured for Base mainnet by default (`viem/chains` `base`). You can switch it to Base Sepolia by using the commented testnet import in the file.

## Coinbase CDP Credentials

When using Coinbase's hosted facilitator (`https://api.cdp.coinbase.com/platform/v2/x402`), you must provide:

- `FACILITATOR_KEY_ID`
- `FACILITATOR_SECRET_KEY`

These are CDP Secret API Key credentials from the Coinbase Developer Platform API Keys dashboard and are used to generate JWT auth headers for `/verify` and `/settle`.

## Development

Common commands:

```bash
npm start
npm test
npm run test:integration
npm run docs
```
X402_ENABLED=false
USE_BASIC_AUTH=false
```

5. Start the server:

`npm start`

The server will start on port `5942` by default (or whatever you set in `PORT`). API documentation is available at `http://localhost:5942/`.

### Generating API Docs

The API reference documentation is generated by [apiDoc](https://apidocjs.com/) from inline annotations in the source code. To regenerate:

`npm run docs`

The output is written to the `docs/` directory and served by the running server at its root URL.

To regenerate API docs plus discovery artifacts (`openapi.json`, `swagger.json`, `llms.txt`, and `agent.json` payload source):

`npm run docs:all`

This runs apiDoc first, then generates `docs/discovery-artifacts.json` from the same annotation source.

A live version can be found at [bch.fullstack.cash](https://bch.fullstack.cash/).

## Production (Docker)

A Docker setup is provided in the `production/docker/` directory for production deployments. The target OS is Ubuntu Linux.

1. Install [Docker and Docker Compose](https://docs.docker.com/engine/install/ubuntu/).

2. Navigate to the Docker directory:

`cd production/docker`

3. Create and configure the `.env` file. An example is provided:

`cp .env-example .env`

Edit `.env` to match your production infrastructure. Note that inside a Docker container, `localhost` refers to the container itself. Use `172.17.0.1` (the default Docker bridge gateway) to reach services running on the host machine:

```
RPC_BASEURL=http://172.17.0.1:8332
FULCRUM_API=http://172.17.0.1:3001/v1
SLP_INDEXER_API=http://172.17.0.1:5010
```

Set `APIDOC_URL` to the public base URL for your deployment (for example `https://api.example.com` or your subdomain). The container entrypoint applies this value to `apidoc.json` and the `apidoc` section of `package.json`, then runs `npm run docs` before starting the server so generated HTML matches each instance. The compose file mounts `./.env` to `/home/safeuser/psf-bch-api/.env` so it matches `dotenv.config()` in the app.

4. Build the Docker image:

`docker-compose build --no-cache`

5. Start the container:

`docker-compose up -d`

The container maps host port `5942` to container port `5942`. The `.env` file is mounted into the container as a volume, so you can update configuration without rebuilding.

To view logs:

`docker logs -f psf-bch-api`

To stop the container:

`docker-compose down`

A helper script `cleanup-images.sh` is provided to remove dangling Docker images after rebuilds.

## Testing

The project includes both unit tests and integration tests. Tests use [Mocha](https://mochajs.org/) as the test runner, [Chai](https://www.chaijs.com/) for assertions, and [Sinon](https://sinonjs.org/) for mocking. Code coverage is provided by [c8](https://github.com/bcoe/c8).

### Unit Tests

Unit tests are located in `test/unit/` and cover adapters, controllers, and use cases. They do not require any running infrastructure. To run:

`npm test`

This will first lint the code with [Standard](https://standardjs.com/), then execute all unit tests with code coverage.

To generate an HTML coverage report:

`npm run coverage`

The report is written to the `coverage/` directory.

### Integration Tests

Integration tests are located in `test/integration/` and require the back end infrastructure (full node, Fulcrum, SLP indexer) to be running. To run:

`npm run test:integration`

Integration tests have a 25-second timeout per test to accommodate network calls.

## Configuration Reference

All configuration values are read from environment variables (via the `.env` file). The complete list:

- `PORT` - Server listen port. Default: `5942`
- `NODE_ENV` - Environment (`development` or `production`). Default: `development`
- `API_PREFIX` - URL prefix for all REST endpoints. Default: `/v6`
- `LOG_LEVEL` - Winston logging level. Default: `info`
- `RPC_BASEURL` - Full node JSON-RPC URL. Default: `http://127.0.0.1:8332`
- `RPC_USERNAME` - Full node RPC username.
- `RPC_PASSWORD` - Full node RPC password.
- `RPC_TIMEOUT_MS` - Full node RPC request timeout in ms. Default: `15000`
- `FULCRUM_API` - Fulcrum indexer REST API URL.
- `FULCRUM_TIMEOUT_MS` - Fulcrum API request timeout in ms. Default: `15000`
- `SLP_INDEXER_API` - SLP Token Indexer REST API URL.
- `SLP_INDEXER_TIMEOUT_MS` - SLP Indexer API request timeout in ms. Default: `15000`
- `LOCAL_RESTURL` - Internal REST URL for wallet operations. Default: `http://127.0.0.1:5942/v6/`
- `IPFS_GATEWAY` - IPFS gateway hostname. Default: `p2wdb-gateway-678.fullstack.cash`
- `X402_ENABLED` - Enable x402-bch payment middleware. Default: `true`
- `SERVER_BCH_ADDRESS` - BCH address for x402 payments. Default: `bitcoincash:qqsrke9lh257tqen99dkyy2emh4uty0vky9y0z0lsr`
- `FACILITATOR_URL` - x402-bch facilitator service URL. Default: `http://localhost:4345/facilitator`
- `X402_PRICE_SAT` - Satoshis charged per API call via x402. Default: `200`
- `USE_BASIC_AUTH` - Enable Bearer token authentication. Default: `false`
- `BASIC_AUTH_TOKEN` - Expected Bearer token value.

## License

[MIT](./LICENSE.md)
