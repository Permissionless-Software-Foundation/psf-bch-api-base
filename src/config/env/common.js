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

const normalizeBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') return defaultValue

  const normalized = String(value).trim().toLowerCase()
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  return defaultValue
}

const parsedPriceSat = Number(process.env.X402_PRICE_SAT)
const priceSat = Number.isFinite(parsedPriceSat) && parsedPriceSat > 0 ? parsedPriceSat : 2000

const x402Defaults = {
  enabled: normalizeBoolean(process.env.X402_ENABLED, true),
  facilitatorUrl: process.env.FACILITATOR_URL || 'http://localhost:4345/facilitator',
  serverAddress: process.env.SERVER_BCH_ADDRESS || 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d',
  priceSat
}

export default {
  // Server port
  port: process.env.PORT || 5942,

  // Environment
  env: process.env.NODE_ENV || 'development',

  // API prefix for REST controllers
  apiPrefix: process.env.API_PREFIX || '/v6',

  // Logging level
  logLevel: process.env.LOG_LEVEL || 'info',

  // Nostr relay configuration (array of relay URLs)
  nostrRelayUrls: (() => {
    // Support NOSTR_RELAY_URLS (plural) as comma-separated string or JSON array
    if (process.env.NOSTR_RELAY_URLS) {
      try {
        // Try parsing as JSON array first
        const parsed = JSON.parse(process.env.NOSTR_RELAY_URLS)
        if (Array.isArray(parsed)) {
          return parsed.filter(url => url && typeof url === 'string')
        }
      } catch (e) {
        // Not JSON, treat as comma-separated string
        return process.env.NOSTR_RELAY_URLS.split(',').map(url => url.trim()).filter(url => url.length > 0)
      }
    }
    // Backward compatibility: support NOSTR_RELAY_URL (singular)
    if (process.env.NOSTR_RELAY_URL) {
      return [process.env.NOSTR_RELAY_URL]
    }

    // Default
    return ['wss://nostr-relay.psfoundation.info', 'wss://relay.damus.io']
  })(),

  // Full node RPC configuration
  fullNode: {
    rpcBaseUrl: process.env.RPC_BASEURL || 'http://127.0.0.1:8332',
    rpcUsername: process.env.RPC_USERNAME || '',
    rpcPassword: process.env.RPC_PASSWORD || '',
    rpcTimeoutMs: Number(process.env.RPC_TIMEOUT_MS || 15000),
    rpcRequestIdPrefix: process.env.RPC_REQUEST_ID_PREFIX || 'psf-bch-api'
  },

  x402: x402Defaults,

  // Version
  version
}
