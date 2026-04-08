import config from './index.js'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

const DEFAULT_DESCRIPTION = 'Access to protected psf-bch-api resources'
const DEFAULT_TIMEOUT_SECONDS = 120

/**
 * Facilitator configurations
 * Supports multiple facilitators for redundancy and market coverage
 */
const FACILITATORS = {
  cdp: {
    name: 'Coinbase CDP',
    url: 'https://api.cdp.coinbase.com/platform/v2/x402',
    requiresAuth: true,
    authType: 'jwt'
  },
  dexter: {
    name: 'Dexter',
    url: 'https://x402.dexter.cash',
    requiresAuth: false,
    authType: 'none'
  }
}

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

  // Get network from config (now supports CAIP-2 format: eip155:8453)
  const NETWORK = config.x402.network
  if (!NETWORK) throw new Error('x402_NETWORK env required!')

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
    facilitatorUrl: config.x402?.facilitatorUrl,
    facilitatorKeyId: config.x402?.facilitatorKeyId,
    facilitatorSecretKey: config.x402?.facilitatorSecretKey,
    serverAddress: config.x402?.serverAddress,
    priceUSDC: config.x402?.priceUSDC,
    // Support for multiple facilitators
    facilitators: FACILITATORS,
    primaryFacilitator: config.x402?.primaryFacilitator || 'cdp'
  }
}

export function getBasicAuthSettings () {
  return {
    enabled: Boolean(config.basicAuth?.enabled),
    token: config.basicAuth?.token || ''
  }
}

/**
 * Create auth headers for CDP facilitator
 * Dexter doesn't require auth
 */
export async function createAuthHeader () {
  // Only CDP requires JWT auth
  if (!config.x402?.facilitatorKeyId || !config.x402?.facilitatorSecretKey) {
    return null
  }

  // /verify endpoint jwt
  const verifyToken = await generateJwt({
    apiKeyId: config.x402.facilitatorKeyId,
    apiKeySecret: config.x402.facilitatorSecretKey,
    requestMethod: 'POST',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/verify'
  })
  // /settle endpoint jwt
  const settleToken = await generateJwt({
    apiKeyId: config.x402.facilitatorKeyId,
    apiKeySecret: config.x402.facilitatorSecretKey,
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

/**
 * Get facilitator configuration by name
 * @param {string} name - Facilitator name ('cdp' or 'dexter')
 * @returns {Object} Facilitator config
 */
export function getFacilitatorConfig (name = 'cdp') {
  return FACILITATORS[name] || FACILITATORS.cdp
}

/**
 * Check if facilitator requires authentication
 * @param {string} name - Facilitator name
 * @returns {boolean}
 */
export function facilitatorRequiresAuth (name = 'cdp') {
  const config = FACILITATORS[name]
  return config ? config.requiresAuth : false
}
