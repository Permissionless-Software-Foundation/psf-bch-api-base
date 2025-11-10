/*
  Use case: Manage subscriptions for Server-Sent Events (SSE).
  This encapsulates the business logic for creating and managing subscriptions.
*/

import wlogger from '../adapters/wlogger.js'

class ManageSubscriptionUseCase {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters instance required')
    }
    if (!this.adapters.nostrRelays || !Array.isArray(this.adapters.nostrRelays) || this.adapters.nostrRelays.length === 0) {
      throw new Error('NostrRelay adapters array required')
    }
    // Map subscriptionId to { relaySubscriptions: Map<relayIndex, subscriptionId>, handlers, seenEventIds }
    this.activeSubscriptions = new Map()
  }

  /**
   * Create a subscription for SSE streaming across all relays
   * @param {string} subscriptionId - Unique subscription ID
   * @param {Array} filters - Array of filter objects
   * @param {Function} onEvent - Callback for events
   * @param {Function} onEose - Callback for EOSE
   * @param {Function} onClosed - Callback for CLOSED
   * @returns {Promise<void>}
   */
  async createSubscription (subscriptionId, filters, onEvent, onEose, onClosed) {
    try {
      if (this.activeSubscriptions.has(subscriptionId)) {
        throw new Error(`Subscription ${subscriptionId} already exists`)
      }

      wlogger.info(`Creating subscription ${subscriptionId} across ${this.adapters.nostrRelays.length} relay(s)`)

      // Track seen event IDs to de-duplicate across relays
      const seenEventIds = new Set()

      // Track EOSE and CLOSED status per relay
      const relayStatuses = this.adapters.nostrRelays.map(() => ({
        eoseReceived: false,
        closedReceived: false
      }))

      // Create unified handlers that merge events from all relays
      const handlers = {
        onEvent: (event) => {
          // De-duplicate events by ID across all relays
          if (event && event.id && !seenEventIds.has(event.id)) {
            seenEventIds.add(event.id)
            if (onEvent) {
              onEvent(event)
            }
          }
        },
        onEose: () => {
          // Call onEose only once when all relays have sent EOSE
          // This is called from the per-relay handler only when all relays have EOSE
          if (onEose) {
            onEose()
          }
        },
        onClosed: (message) => {
          if (onClosed) {
            onClosed(message)
          }
          // Clean up subscription if any relay closes it
          const subscriptionInfo = this.activeSubscriptions.get(subscriptionId)
          if (subscriptionInfo && subscriptionInfo.eoseTimeoutId) {
            clearTimeout(subscriptionInfo.eoseTimeoutId)
          }
          this.activeSubscriptions.delete(subscriptionId)
        }
      }

      // Create subscription per relay with unique subscription IDs
      const relaySubscriptions = new Map()
      const subscriptionPromises = this.adapters.nostrRelays.map(async (relay, index) => {
        const relaySubscriptionId = `${subscriptionId}-relay-${index}`
        relaySubscriptions.set(index, relaySubscriptionId)

        // Create per-relay handlers that update shared state
        const relayHandlers = {
          onEvent: (event) => {
            handlers.onEvent(event)
          },
          onEose: () => {
            relayStatuses[index].eoseReceived = true
            // Check if all relays have sent EOSE
            if (relayStatuses.every(s => s.eoseReceived)) {
              // Clear the timeout since we got EOSE from all relays
              const subscriptionInfo = this.activeSubscriptions.get(subscriptionId)
              if (subscriptionInfo && subscriptionInfo.eoseTimeoutId) {
                clearTimeout(subscriptionInfo.eoseTimeoutId)
                subscriptionInfo.eoseTimeoutId = null
              }
              handlers.onEose()
            }
          },
          onClosed: (message) => {
            relayStatuses[index].closedReceived = true
            handlers.onClosed(message)
          }
        }

        await relay.sendReq(relaySubscriptionId, filters, relayHandlers)
      })

      // Store subscription info
      this.activeSubscriptions.set(subscriptionId, {
        relaySubscriptions,
        handlers,
        seenEventIds,
        relayStatuses,
        eoseTimeoutId: null
      })

      // Subscribe to all relays concurrently
      const results = await Promise.allSettled(subscriptionPromises)

      // Check if any relay subscription failed and clean up if so
      const hasFailures = results.some(result => result.status === 'rejected')
      if (hasFailures) {
        const subscriptionInfo = this.activeSubscriptions.get(subscriptionId)
        if (subscriptionInfo && subscriptionInfo.eoseTimeoutId) {
          clearTimeout(subscriptionInfo.eoseTimeoutId)
        }
        this.activeSubscriptions.delete(subscriptionId)
        const errors = results
          .filter(result => result.status === 'rejected')
          .map(result => result.reason)
        throw new Error(`Failed to create subscription on some relays: ${errors.map(e => e.message).join(', ')}`)
      }

      // Set up EOSE timeout fallback - if not all relays send EOSE within 10 seconds, call onEose anyway
      const subscriptionInfo = this.activeSubscriptions.get(subscriptionId)
      const EOSE_TIMEOUT_MS = 10000 // 10 seconds
      subscriptionInfo.eoseTimeoutId = setTimeout(() => {
        // Check if subscription still exists and if all relays have sent EOSE
        if (this.activeSubscriptions.has(subscriptionId)) {
          const currentInfo = this.activeSubscriptions.get(subscriptionId)
          const allEoseReceived = currentInfo.relayStatuses.every(s => s.eoseReceived)
          if (!allEoseReceived) {
            wlogger.warn(`EOSE timeout reached for subscription ${subscriptionId} - calling onEose callback anyway`)
            if (handlers.onEose) {
              handlers.onEose()
            }
          }
        }
      }, EOSE_TIMEOUT_MS)
    } catch (err) {
      wlogger.error('Error creating subscription:', err)
      const subscriptionInfo = this.activeSubscriptions.get(subscriptionId)
      if (subscriptionInfo && subscriptionInfo.eoseTimeoutId) {
        clearTimeout(subscriptionInfo.eoseTimeoutId)
      }
      this.activeSubscriptions.delete(subscriptionId)
      throw err
    }
  }

  /**
   * Close a subscription across all relays
   * @param {string} subscriptionId - Subscription ID to close
   * @returns {Promise<void>}
   */
  async closeSubscription (subscriptionId) {
    try {
      if (!this.activeSubscriptions.has(subscriptionId)) {
        // Subscription doesn't exist - already closed, treat as success (idempotent)
        wlogger.info(`Subscription ${subscriptionId} already closed or does not exist`)
        return
      }

      wlogger.info(`Closing subscription ${subscriptionId} across all relays`)

      const subscriptionInfo = this.activeSubscriptions.get(subscriptionId)
      const { relaySubscriptions } = subscriptionInfo

      // Clear EOSE timeout if it exists
      if (subscriptionInfo.eoseTimeoutId) {
        clearTimeout(subscriptionInfo.eoseTimeoutId)
      }

      // Close subscriptions on all relays concurrently
      const closePromises = Array.from(relaySubscriptions.entries()).map(async ([relayIndex, relaySubscriptionId]) => {
        try {
          await this.adapters.nostrRelays[relayIndex].sendClose(relaySubscriptionId)
        } catch (err) {
          wlogger.warn(`Error closing subscription on relay ${relayIndex}:`, err.message)
        }
      })

      await Promise.allSettled(closePromises)
      this.activeSubscriptions.delete(subscriptionId)
    } catch (err) {
      wlogger.error('Error closing subscription:', err)
      // Clean up even if there's an error
      this.activeSubscriptions.delete(subscriptionId)
      throw err
    }
  }

  /**
   * Check if a subscription exists
   * @param {string} subscriptionId - Subscription ID
   * @returns {boolean}
   */
  hasSubscription (subscriptionId) {
    return this.activeSubscriptions.has(subscriptionId)
  }
}

export default ManageSubscriptionUseCase
