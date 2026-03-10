import config from './index.js'

const DEFAULT_DESCRIPTION = 'Access to protected psf-bch-api resources'
const DEFAULT_TIMEOUT_SECONDS = 60
const NETWORK = 'base-sepolia'

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
        maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS
      }
    }
  }
}

export function getX402Settings () {
  return {
    enabled: Boolean(config.x402?.enabled),
    facilitatorUrl: config.x402?.facilitatorUrl, // https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
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
