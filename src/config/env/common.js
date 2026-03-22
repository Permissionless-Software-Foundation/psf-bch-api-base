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

// By default, the price per API call is 200 satoshis.
// But the user can override this value by setting the X402_PRICE_SAT environment variable.
const parsedPrice = Number(process.env.X402_PRICE_USDC)
const priceUSDC = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 200

const x402Defaults = {
  enabled: normalizeBoolean(process.env.X402_ENABLED, true),
  facilitatorUrl: process.env.x402_FACILITATOR_URL || 'http://localhost:4022',
  serverAddress: process.env.SERVER_BASE_ADDRESS || 'bitcoincash:qqsrke9lh257tqen99dkyy2emh4uty0vky9y0z0lsr',
  facilitatorKeyId: process.env.FACILITATOR_KEY_ID || '',
  facilitatorSecretKey: process.env.FACILITATOR_SECRET_KEY || '',
  network: process.env.x402_NETWORK || 'base-sepolia',
  priceUSDC
}

const basicAuthDefaults = {
  enabled: normalizeBoolean(process.env.USE_BASIC_AUTH, false),
  token: process.env.BASIC_AUTH_TOKEN || ''
}

export default {
  // Server port
  port: parseInt(process.env.PORT, 10) || 5942,

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

  // Version
  version
}
