/*
  This is a top-level library that encapsulates all the additional Adapters.
  The concept of Adapters comes from Clean Architecture:
  https://troutsblog.com/blog/clean-architecture
*/

// Load individual adapter libraries.
// import NostrRelayAdapter from './nostr-relay.js'
import FullNodeRPCAdapter from './full-node-rpc.js'
import config from '../config/index.js'

class Adapters {
  constructor (localConfig = {}) {
    // Encapsulate dependencies
    this.config = config

    // Determine relay URLs: prefer localConfig, fall back to config
    // let relayUrls = []
    // if (localConfig.relayUrls && Array.isArray(localConfig.relayUrls)) {
    //   relayUrls = localConfig.relayUrls
    // } else if (localConfig.relayUrl) {
    //   // Backward compatibility: single relay URL
    //   relayUrls = [localConfig.relayUrl]
    // } else {
    //   relayUrls = config.nostrRelayUrls
    // }

    // Create one adapter per relay URL
    // this.nostrRelays = relayUrls.map(relayUrl => new NostrRelayAdapter({ relayUrl }))

    // Maintain backward compatibility: expose first relay as nostrRelay
    // This allows existing code to work during transition
    // this.nostrRelay = this.nostrRelays[0]

    this.fullNode = new FullNodeRPCAdapter({ config: this.config })
  }

  async start () {
    // try {
    // Connect to all Nostr relays concurrently
    // const connectPromises = this.nostrRelays.map(async (relay, index) => {
    //   try {
    //     await relay.connect()
    //     console.log(`Nostr relay adapter ${index + 1}/${this.nostrRelays.length} started: ${relay.relayUrl}`)
    //     return { success: true, relay }
    //   } catch (err) {
    //     console.error(`Failed to connect to relay ${relay.relayUrl}:`, err.message)
    //     return { success: false, relay, error: err }
    //   }
    // })

    // const results = await Promise.allSettled(connectPromises)

    // const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    // const failed = results.length - successful

    // if (successful === 0) {
    //   throw new Error('Failed to connect to any Nostr relay')
    // }

    // if (failed > 0) {
    //   console.warn(`Connected to ${successful}/${this.nostrRelays.length} relays. Some relays failed to connect.`)
    // } else {
    //   console.log(`All ${successful} Nostr relay adapters started successfully.`)
    // }

    return true
    // } catch (err) {
    //   console.error('Error in adapters/index.js/start()')
    //   throw err
    // }
  }

  /**
   * Get all relay adapters
   * @returns {Array<NostrRelayAdapter>}
   */
  getRelays () {
    return this.nostrRelays
  }

  /**
   * Broadcast an event to all relays
   * @param {Object} event - Event object to broadcast
   * @returns {Promise<Array>} Array of results from each relay: { accepted, message, relayUrl }
   */
  async broadcastEvent (event) {
    const broadcastPromises = this.nostrRelays.map(async (relay) => {
      try {
        const result = await relay.sendEvent(event)
        return {
          accepted: result.accepted,
          message: result.message || '',
          relayUrl: relay.relayUrl,
          success: true
        }
      } catch (err) {
        return {
          accepted: false,
          message: err.message || 'Error broadcasting to relay',
          relayUrl: relay.relayUrl,
          success: false,
          error: err
        }
      }
    })

    return Promise.allSettled(broadcastPromises).then(results => {
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return {
            accepted: false,
            message: result.reason?.message || 'Unknown error',
            relayUrl: this.nostrRelays[index].relayUrl,
            success: false,
            error: result.reason
          }
        }
      })
    })
  }

  /**
   * Query all relays concurrently and merge results
   * @param {Array} filters - Array of filter objects
   * @param {string} subscriptionId - Unique subscription ID (will be modified per relay)
   * @returns {Promise<Array>} Merged and de-duplicated array of events
   */
  async queryAllRelays (filters, subscriptionId) {
    // Create unique subscription IDs for each relay
    const subscriptionIds = this.nostrRelays.map((relay, index) =>
      `${subscriptionId}-relay-${index}`
    )

    // Collect events from all relays
    const allEvents = []
    const relayStatuses = this.nostrRelays.map(() => ({
      eoseReceived: false,
      closedReceived: false,
      closedMessage: ''
    }))

    // Query all relays concurrently
    const queryPromises = this.nostrRelays.map(async (relay, index) => {
      const subscriptionIdForRelay = subscriptionIds[index]
      const status = relayStatuses[index]

      // Create handlers for this relay
      const handlers = {
        onEvent: (event) => {
          allEvents.push(event)
        },
        onEose: () => {
          status.eoseReceived = true
        },
        onClosed: (message) => {
          status.closedReceived = true
          status.closedMessage = message
        }
      }

      try {
        await relay.sendReq(subscriptionIdForRelay, filters, handlers)

        // Wait for EOSE or CLOSED with timeout
        const timeout = 30000 // 30 seconds
        const startTime = Date.now()

        while (!status.eoseReceived && !status.closedReceived && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Clean up subscription - always try to close, even if EOSE didn't come
        try {
          await relay.sendClose(subscriptionIdForRelay)
        } catch (err) {
          // Ignore close errors
        }

        if (status.closedReceived) {
          throw new Error(`Subscription closed on ${relay.relayUrl}: ${status.closedMessage}`)
        }

        // If EOSE never came but timeout expired, that's OK - we proceed with what we got
        if (!status.eoseReceived && (Date.now() - startTime) >= timeout) {
          // Timeout reached without EOSE - proceed anyway with events collected so far
        }
      } catch (err) {
        // Ensure cleanup even on error
        try {
          await relay.sendClose(subscriptionIdForRelay)
        } catch (closeErr) {
          // Ignore close errors
        }
        // Log error but don't fail the entire query
        console.warn(`Query failed for relay ${relay.relayUrl}:`, err.message)
      }
    })

    // Wait for all queries to complete
    await Promise.allSettled(queryPromises)

    // Merge and de-duplicate events by event ID
    const eventMap = new Map()
    allEvents.forEach(event => {
      if (event && event.id && !eventMap.has(event.id)) {
        eventMap.set(event.id, event)
      }
    })

    return Array.from(eventMap.values())
  }
}

export default Adapters
