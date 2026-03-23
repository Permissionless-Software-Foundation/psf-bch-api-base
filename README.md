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
- `x402_FACILITATOR_URL` (default: `https://api.cdp.coinbase.com/platform/v2/x402`)
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

```bash
X402_ENABLED=true
USE_BASIC_AUTH=false
SERVER_BASE_ADDRESS=0xYourBaseAddress
X402_PRICE_USDC=0.1
x402_NETWORK=eip155:8453
x402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
FACILITATOR_KEY_ID=your_key_id
FACILITATOR_SECRET_KEY=your_secret
```

Protected endpoints return `402 Payment Required` when no valid payment is attached. x402-capable clients can pay and retry automatically.

### 4) x402 + Bearer Bypass

```bash
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

## License

[MIT](./LICENSE.md)
