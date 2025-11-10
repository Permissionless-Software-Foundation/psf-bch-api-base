import config from './index.js'

const DEFAULT_DESCRIPTION = 'Access to protected psf-bch-api resources'
const DEFAULT_TIMEOUT_SECONDS = 60
const NETWORK = 'bch'

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
      price: config.x402.priceSat,
      network: NETWORK,
      config: {
        description: `${DEFAULT_DESCRIPTION} (2000 satoshis)`,
        maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS
      }
    }
  }
}

export function getX402Settings () {
  return {
    enabled: Boolean(config.x402?.enabled),
    facilitatorUrl: config.x402?.facilitatorUrl,
    serverAddress: config.x402?.serverAddress,
    priceSat: config.x402?.priceSat
  }
}
