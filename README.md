# psf-bch-api

This is a REST API for communicating with Bitcoin Cash infrastructure. It replaces [bch-api](https://github.com/Permissionless-Software-Foundation/bch-api), and it implements [x402-bch protocol](https://github.com/x402-bch/x402-bch) to handle payments to access the API.

![psf-bch-api software stack](./bch-api-dependency-graph.png)

## License

[MIT](./LICENSE.md)

## x402-bch Payments

All REST endpoints exposed under the `/v6` prefix are protected by the [`x402-bch-express`](https://www.npmjs.com/package/x402-bch-express) middleware. Each API call requires a BCH payment authorization for **200 satoshis**. The middleware advertises payment requirements via HTTP 402 responses and validates incoming `X-PAYMENT` headers with a configured Facilitator.

### Configuration

Environment variables control the payment flow:

- `X402_ENABLED` — set to `false` (case-insensitive) to disable the middleware. Defaults to enabled.
- `SERVER_BCH_ADDRESS` — BCH cash address that receives funding transactions. Defaults to `bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d`.
- `FACILITATOR_URL` — Root URL of the facilitator service (e.g., `http://localhost:4345/facilitator`).
- `X402_PRICE_SAT` — Optional; override the satoshi price per call (defaults to `200`).

When `X402_ENABLED=false`, the server continues to operate without payment headers for local development or trusted deployments.

### Manual Verification

1. Start or point to an `x402-bch` facilitator service (the example facilitator listens at `http://localhost:4345/facilitator`).
2. Run the API server with the default configuration: `npm start`.
3. Call a protected endpoint without an `X-PAYMENT` header, e.g. `curl -i http://localhost:5942/v6/full-node/control/getNetworkInfo`. The server will respond with HTTP `402` and include payment requirements.
4. Restart the server with `X402_ENABLED=false npm start` to confirm that the same request now bypasses the middleware (useful for local development without payments).

