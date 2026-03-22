import config from './index.js'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

const DEFAULT_DESCRIPTION = 'Access to protected psf-bch-api resources'
const DEFAULT_TIMEOUT_SECONDS = 120
const NETWORK = config.x402.network
if (!NETWORK) throw new Error('x402_NETWORK env required!')

/**
 * Builds a route configuration map for x402-bch middleware.
 *
 * @param {string} apiPrefix Express API prefix (e.g., "/v6")
 * @returns {Object} Routes configuration compatible with x402-bch-express
 */
export function buildX402Routes (apiPrefix = '/v6') {
  const normalizedPrefix = apiPrefix.endsWith('/')
    ? apiPrefix.slice(0, -1)
    : apiPrefix
  const prefixWithSlash = normalizedPrefix.startsWith('/')
    ? normalizedPrefix
    : `/${normalizedPrefix}`

  const routeKey = `${prefixWithSlash}/*`

  return {
    network: NETWORK,
    [routeKey]: {
      price: config.x402.priceUSDC,
      network: NETWORK,
      config: {
        description: `${DEFAULT_DESCRIPTION} (${config.x402.priceUSDC} USDC)`,
        maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
        mimeType: 'application/json',
        outputSchema: {
          input: {
            type: 'http',
            method: 'GET',
            discoverable: true
          }
        }
      }
    }
  }
}

export function getX402Settings () {
  return {
    enabled: Boolean(config.x402?.enabled),
    facilitatorUrl: config.x402?.facilitatorUrl, //  https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
    facilitatorKeyId: config.x402?.facilitatorKeyId,
    facilitatorSecretKey: config.x402?.facilitatorSecretKey,
    serverAddress: config.x402?.serverAddress,
    priceUSDC: config.x402?.priceUSDC
  }
}

export function getBasicAuthSettings () {
  return {
    enabled: Boolean(config.basicAuth?.enabled),
    token: config.basicAuth?.token || ''
  }
}

/**
 *
 * Auth headers for interact with mainnet coin base facilitator endpoints.
 *
 */
// https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication#javascript-2
// https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/verify-a-payment
export async function createAuthHeader () {
  // /verify endpoint jwt
  const verifyToken = await generateJwt({
    apiKeyId: config.x402?.facilitatorKeyId,
    apiKeySecret: config.x402?.facilitatorSecretKey,
    requestMethod: 'POST',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/verify'
  })
  // /settle endpoint jwt
  const settleToken = await generateJwt({
    apiKeyId: config.x402?.facilitatorKeyId,
    apiKeySecret: config.x402?.facilitatorSecretKey,
    requestMethod: 'POST',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/settle'
  })

  return {
    verify: {
      Authorization: `Bearer ${verifyToken}`
    },
    settle: {
      Authorization: `Bearer ${settleToken}`
    }
  }
}
