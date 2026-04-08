/*
  This file is used to store unsecure, application-specific data common to all
  environments.
*/

import dotenv from 'dotenv'

// Hack to get __dirname back.
// https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/
import * as url from 'url'
import { readFileSync } from 'fs'
dotenv.config()

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const pkgInfo = JSON.parse(readFileSync(`${__dirname.toString()}/../../../package.json`))

const version = pkgInfo.version

// This function is used to convert the string input of an environment variable to a boolean value.
const normalizeBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') return defaultValue

  const normalized = String(value).trim().toLowerCase()
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  return defaultValue
}

// Default price per API call in USDC (x402 on Base). Override with X402_PRICE_USDC.
const parsedPrice = Number(process.env.X402_PRICE_USDC)
const priceUSDC = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 200

// x402 v2 uses CAIP-2 network ids (see https://docs.x402.org/guides/migration-v1-to-v2).
// Accept legacy short names from env for convenience. Also accept X402_NETWORK or x402_NETWORK.
function toV2Caip2Network (raw) {
  const s = String(raw ?? '').trim()
  if (!s) return 'eip155:8453'
  const lower = s.toLowerCase()
  if (lower === 'base' || lower === 'eip155:8453') return 'eip155:8453'
  if (lower === 'base-sepolia' || lower === 'eip155:84532') return 'eip155:84532'
  if (lower.startsWith('eip155:')) return s
  return s
}

const x402NetworkRaw =
  process.env.x402_NETWORK ||
  process.env.X402_NETWORK ||
  'eip155:8453'
const x402Network = toV2Caip2Network(x402NetworkRaw)

const x402Defaults = {
  enabled: normalizeBoolean(process.env.X402_ENABLED, true),
  // CDP Facilitator: https://api.cdp.coinbase.com/platform/v2/x402
  // Custom/Local Facilitator: http://localhost:4022
  facilitatorUrl: process.env.x402_FACILITATOR_URL || 'https://api.cdp.coinbase.com/platform/v2/x402',
  // EVM 0x… address for USDC settlement; required for x402 exact scheme (no legacy BCH default).
  serverAddress: (process.env.SERVER_BASE_ADDRESS || '').trim(),
  facilitatorKeyId: process.env.FACILITATOR_KEY_ID || '',
  facilitatorSecretKey: process.env.FACILITATOR_SECRET_KEY || '',
  primaryFacilitator: process.env.PRIMARY_FACILITATOR || 'cdp',
  network: x402Network,
  priceUSDC,
  // Optional: USDC token contract (0x…). If unset, Base / Base Sepolia use built-in USDC addresses.
  usdcAssetAddress: (process.env.X402_USDC_ASSET || '').trim()
}

const basicAuthDefaults = {
  enabled: normalizeBoolean(process.env.USE_BASIC_AUTH, false),
  token: process.env.BASIC_AUTH_TOKEN || ''
}

const psfLiquidityUrlEnv = process.env.PSF_LIQUIDITY_URL
const psfLiquidityProxyBaseUrl =
  psfLiquidityUrlEnv !== undefined &&
  psfLiquidityUrlEnv !== null &&
  String(psfLiquidityUrlEnv).trim() !== ''
    ? String(psfLiquidityUrlEnv).trim().replace(/\/$/, '')
    : 'http://192.168.0.126:5000'

const psfLiquidityProxyDefaults = {
  enabled: normalizeBoolean(process.env.PSF_LIQUIDITY_PROXY_ENABLED, false),
  baseUrl: psfLiquidityProxyBaseUrl
}

export default {
  // Server port
  port: parseInt(process.env.PORT, 10) || 5942,

  // HTTP server connection lifecycle configuration.
  serverKeepAliveTimeoutMs: Number(process.env.SERVER_KEEPALIVE_TIMEOUT_MS || 3000),
  serverHeadersTimeoutMs: Number(process.env.SERVER_HEADERS_TIMEOUT_MS || 65000),
  serverRequestTimeoutMs: Number(process.env.SERVER_REQUEST_TIMEOUT_MS || 120000),

  // Environment
  env: process.env.NODE_ENV || 'development',

  // API prefix for REST controllers
  apiPrefix: process.env.API_PREFIX || '/v6',

  // Logging level
  logLevel: process.env.LOG_LEVEL || 'info',

  // Full node RPC configuration
  fullNode: {
    rpcBaseUrl: process.env.RPC_BASEURL || 'http://127.0.0.1:8332',
    rpcUsername: process.env.RPC_USERNAME || '',
    rpcPassword: process.env.RPC_PASSWORD || '',
    rpcTimeoutMs: Number(process.env.RPC_TIMEOUT_MS || 15000),
    rpcRequestIdPrefix: process.env.RPC_REQUEST_ID_PREFIX || 'psf-bch-api'
  },

  // Fulcrum API configuration
  fulcrumApi: {
    baseUrl: process.env.FULCRUM_API || '',
    timeoutMs: Number(process.env.FULCRUM_TIMEOUT_MS || 15000)
  },

  // SLP Indexer API configuration
  slpIndexerApi: {
    baseUrl: process.env.SLP_INDEXER_API || '',
    timeoutMs: Number(process.env.SLP_INDEXER_TIMEOUT_MS || 15000)
  },

  // REST API URL for wallet operations
  restURL: process.env.REST_URL || process.env.LOCAL_RESTURL || 'http://127.0.0.1:5942/v6/',

  // IPFS Gateway URL
  ipfsGateway: process.env.IPFS_GATEWAY || 'p2wdb-gateway-678.fullstack.cash',

  x402: x402Defaults,

  basicAuth: basicAuthDefaults,

  psfLiquidityProxy: psfLiquidityProxyDefaults,

  // Version
  version
}
