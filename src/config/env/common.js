/*
  This file is used to store unsecure, application-specific data common to all
  environments.
*/

// Hack to get __dirname back.
// https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/
import * as url from 'url'
import { readFileSync } from 'fs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const pkgInfo = JSON.parse(readFileSync(`${__dirname.toString()}/../../../package.json`))

const version = pkgInfo.version

export default {
  // Server port
  port: process.env.PORT || 5942,

  // Environment
  env: process.env.NODE_ENV || 'development',

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

  // Version
  version
}
