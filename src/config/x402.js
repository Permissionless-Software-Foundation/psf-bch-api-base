import config from './index.js'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

const DEFAULT_DESCRIPTION = 'Access to protected psf-bch-api resources'
const DEFAULT_TIMEOUT_SECONDS = 120

/**
 * Resolve USDC contract + EIP-712 domain hints for the configured network.
 * @param {string} network CAIP-2
 */

/** x402 `exact` on EVM expects a checksummable 0x address for `payTo`. */
function assertEvmPayTo (payTo) {
  if (typeof payTo !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    throw new Error(
      'SERVER_BASE_ADDRESS must be a 0x-prefixed 40-hex EVM address (Base USDC settlement).'
    )
  }
}

/**
 * Builds x402 v2 RoutesConfig for @x402/express (CAIP-2 network + accepts[]).
 * Payment asset is explicitly USDC (ERC-20) via AssetAmount, not generic "money".
 * @see https://docs.x402.org/guides/migration-v1-to-v2
 */
export function buildX402Routes (apiPrefix = '/v6') {
  const normalizedPrefix = apiPrefix.endsWith('/')
    ? apiPrefix.slice(0, -1)
    : apiPrefix
  const prefixWithSlash = normalizedPrefix.startsWith('/')
    ? normalizedPrefix
    : `/${normalizedPrefix}`

  const routeKey = `* ${prefixWithSlash}/*`
  const network = config.x402.network
  if (!network) throw new Error('x402 network is required (set x402_NETWORK / X402_NETWORK).')

  const payTo = config.x402.serverAddress
  if (!payTo) throw new Error('SERVER_BASE_ADDRESS is required for x402 v2 payTo.')
  assertEvmPayTo(payTo)

  return {
    [routeKey]: {
      accepts: [
        {
          scheme: 'exact',
          payTo,
          price: config.x402.priceUSDC,
          network,
          maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS
        }
      ],
      description: `${DEFAULT_DESCRIPTION} (${config.x402.priceUSDC} USDC)`,
      mimeType: 'application/json'
    }
  }
}

export function getX402Settings () {
  return {
    enabled: Boolean(config.x402?.enabled),
    facilitatorUrl: config.x402?.facilitatorUrl,
    facilitatorKeyId: config.x402?.facilitatorKeyId,
    facilitatorSecretKey: config.x402?.facilitatorSecretKey,
    serverAddress: config.x402?.serverAddress,
    priceUSDC: config.x402?.priceUSDC,
    usdcAssetAddress: config.x402?.usdcAssetAddress,
    network: config.x402?.network
  }
}

/**
 * JSON for `GET /.well-known/x402` — matches `buildX402Routes` (Base USDC, exact scheme).
 * @param {string} [apiPrefix]
 */
export function getX402WellKnownManifest (apiPrefix = '/v6') {
  const normalizedPrefix = apiPrefix.endsWith('/')
    ? apiPrefix.slice(0, -1)
    : apiPrefix
  const prefixWithSlash = normalizedPrefix.startsWith('/')
    ? normalizedPrefix
    : `/${normalizedPrefix}`

  const network = config.x402.network
  if (!network) throw new Error('x402 network is required (set x402_NETWORK / X402_NETWORK).')

  const payTo = config.x402.serverAddress
  if (!payTo) throw new Error('SERVER_BASE_ADDRESS is required for x402 v2 payTo.')
  assertEvmPayTo(payTo)

  return {
    x402Version: 2,
    network,
    facilitator: {
      url: config.x402.facilitatorUrl
    },
    resources: [
      {
        resource: `${prefixWithSlash}/*`,
        type: 'http',
        x402Version: 2,
        accepts: [
          {
            scheme: 'exact',
            network,
            price: config.x402.priceUSDC,
            payTo,
            maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
            description: `${DEFAULT_DESCRIPTION} (${config.x402.priceUSDC} USDC)`,
            mimeType: 'application/json',
            extra: { }
          }
        ]
      }
    ]
  }
}

/**
 * Snapshot for `build-documents` agent manifest — Base USDC / exact scheme.
 * @returns {object|null} null when x402 is off or payTo/network invalid.
 */
export function getX402AgentAuthPricing () {
  const x402 = config.x402
  if (!x402?.enabled || !x402.serverAddress || !x402.network) return null
  try {
    assertEvmPayTo(x402.serverAddress)
  } catch {
    return null
  }
  return {
    scheme: 'exact',
    x402Version: 2,
    network: x402.network,
    payTo: x402.serverAddress,
    priceUSDC: x402.priceUSDC,
    facilitatorUrl: x402.facilitatorUrl
  }
}

export function getBasicAuthSettings () {
  return {
    enabled: Boolean(config.basicAuth?.enabled),
    token: config.basicAuth?.token || ''
  }
}

/**
 * CDP JWT auth for facilitator HTTPFacilitatorClient (verify / settle / supported).
 * @see https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication#javascript-2
 */
export async function createAuthHeader () {
  const id = config.x402?.facilitatorKeyId
  const secret = config.x402?.facilitatorSecretKey
  if (!id || !secret) {
    return {
      verify: {},
      settle: {},
      supported: {}
    }
  }

  const verifyToken = await generateJwt({
    apiKeyId: id,
    apiKeySecret: secret,
    requestMethod: 'POST',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/verify'
  })
  const settleToken = await generateJwt({
    apiKeyId: id,
    apiKeySecret: secret,
    requestMethod: 'POST',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/settle'
  })
  const supportedToken = await generateJwt({
    apiKeyId: id,
    apiKeySecret: secret,
    requestMethod: 'GET',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/supported'
  })

  return {
    verify: {
      Authorization: `Bearer ${verifyToken}`
    },
    settle: {
      Authorization: `Bearer ${settleToken}`
    },
    supported: {
      Authorization: `Bearer ${supportedToken}`
    }
  }
}
