import config from './index.js'
import { generateJwt } from '@coinbase/cdp-sdk/auth'
import { declareDiscoveryExtension } from '@x402/extensions/bazaar'

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
  },
  payai: {
    name: 'PayAI',
    url: 'https://facilitator.payai.network',
    requiresAuth: false,
    authType: 'none'
  }
}

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
 * @param {string} apiPrefix Express API prefix (e.g., "/v6")
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

  const entry = {
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

  if (config.x402.bazaarEnabled) {
    entry.extensions = declareDiscoveryExtension({
      output: {
        example: {
          service: 'psf-bch-api',
          apiPrefix: prefixWithSlash,
          description: 'Bitcoin Cash full node, Fulcrum, and SLP indexer REST proxy (x402 USDC on Base)'
        }
      }
    })
  }

  return {
    [routeKey]: entry
  }
}

/**
 * Default facilitator order when ACTIVE_FACILITATORS lists CDP, Dexter, and PayAI (Bazaar-friendly multi-facilitator).
 */
export const DEFAULT_MULTI_FACILITATORS = ['cdp', 'dexter', 'payai']

/**
 * Per-facilitator HTTP base URL (no trailing slash). Used when multiple facilitators are active.
 * @param {string} key
 */
export function getFacilitatorHttpUrl (key) {
  const k = String(key || 'cdp').trim().toLowerCase()
  if (k === 'dexter') return 'https://x402.dexter.cash'
  if (k === 'payai') {
    return (process.env.PAYAI_FACILITATOR_URL || 'https://facilitator.payai.network')
      .trim()
      .replace(/\/$/, '')
  }
  return 'https://api.cdp.coinbase.com/platform/v2/x402'
}

/**
 * Resolved primary facilitator key (env PRIMARY_FACILITATOR, then config, then cdp).
 * @returns {string}
 */
export function resolvePrimaryFacilitatorKey () {
  const primaryRaw = (
    process.env.PRIMARY_FACILITATOR ||
    config.x402?.primaryFacilitator ||
    'cdp'
  ).trim().toLowerCase()
  return FACILITATORS[primaryRaw] ? primaryRaw : 'cdp'
}

/**
 * Active facilitator keys: PRIMARY_FACILITATOR is always first (x402 core gives earlier
 * facilitator clients precedence). Remaining keys follow ACTIVE_FACILITATORS order, deduped.
 * @returns {string[]}
 */
export function getActiveFacilitatorKeys () {
  const primary = resolvePrimaryFacilitatorKey()
  const raw = (process.env.ACTIVE_FACILITATORS || '').trim()
  if (!raw) {
    return [primary]
  }
  const fromEnv = raw.split(',').map(s => s.trim().toLowerCase()).filter(k => FACILITATORS[k])
  if (fromEnv.length === 0) {
    return [primary]
  }
  const rest = fromEnv.filter(k => k !== primary)
  return [primary, ...rest]
}

/**
 * Options for constructing one {@link import('@x402/core/server').HTTPFacilitatorClient} per facilitator.
 * When only one facilitator is active, `url` is `config.x402.facilitatorUrl` so `x402_FACILITATOR_URL` still applies.
 * @returns {{ key: string, name: string, url: string, requiresAuth: boolean }[]}
 */
export function getFacilitatorConnectionOptions () {
  const keys = getActiveFacilitatorKeys()
  return keys.map(key => {
    const cfg = getFacilitatorConfig(key)
    const url =
      keys.length === 1 ? config.x402.facilitatorUrl : getFacilitatorHttpUrl(key)
    return {
      key,
      name: cfg.name,
      url,
      requiresAuth: Boolean(cfg.requiresAuth)
    }
  })
}

export function getX402Settings () {
  return {
    enabled: Boolean(config.x402?.enabled),
    bazaarEnabled: Boolean(config.x402?.bazaarEnabled),
    activeFacilitatorKeys: getActiveFacilitatorKeys(),
    facilitatorUrl: config.x402?.facilitatorUrl,
    facilitatorKeyId: config.x402?.facilitatorKeyId,
    facilitatorSecretKey: config.x402?.facilitatorSecretKey,
    serverAddress: config.x402?.serverAddress,
    priceUSDC: config.x402?.priceUSDC,
    usdcAssetAddress: config.x402?.usdcAssetAddress,
    network: config.x402?.network,
    facilitators: FACILITATORS,
    primaryFacilitator: config.x402?.primaryFacilitator || 'cdp'
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

/**
 * Get facilitator configuration by name
 * @param {string} name - Facilitator name (`cdp`, `dexter`, or `payai`)
 * @returns {Object} Facilitator config
 */
export function getFacilitatorConfig (name = 'cdp') {
  const key = String(name || 'cdp').trim().toLowerCase()
  return FACILITATORS[key] || FACILITATORS.cdp
}

/**
 * Check if facilitator requires authentication
 * @param {string} name - Facilitator name
 * @returns {boolean}
 */
export function facilitatorRequiresAuth (name = 'cdp') {
  const key = String(name || 'cdp').trim().toLowerCase()
  const cfg = FACILITATORS[key]
  return cfg ? cfg.requiresAuth : false
}
